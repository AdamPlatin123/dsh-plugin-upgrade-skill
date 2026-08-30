# 大语言模型（LLM）适配器插件参考

通过实现 `LlmAdapter` 并在 `ctx.llm` 上注册，连接新的模型供应商。如果目标版本包含 `packages/llm/llm-deepseek` 和 `packages/llm/llm-pi-ai`，可将它们作为参考实现。

> 目标版本守卫：本文档是形态参考，不是版本迁移权威。必须根据精确的目标 Harness 检出版本验证适配器接口、流式语汇、请求字段、源码路径和供应商钩子。升级时，以 `plugin-upgrade` 的版本卡片和实际观测到的目标行为为准。

## 形态

```ts ignore-check
class MyAdapter extends LlmAdapter {
  async * stream(options: GenerateOptions): AsyncIterable<StreamChunk> { … }
}

export const name = 'llm-myprovider'
export const inject = ['llm']
export const Config: z<Config> = z.object({ apiKey: z.string(), … })

export function apply(ctx: Context, config: Config) {
  ctx.llm.registerAdapter(['my-provider'], new MyAdapter(…))
}
```

注册基于 effect，且对 HMR 安全。每个供应商路由只能有一个适配器；重复注册会抛出异常，多路由注册要么全部成功，要么全部失败。`options.provider` 选择适配器，`options.model` 是供应商模型 ID，因此动态目录适配器无需重新配置生命周期，就能支持新模型。`registerAdapter()` 返回操作句柄：包含 disposer，以及为同一适配器实例原子替换路由集合的 `replace(providers)`。替换时允许空数组，初始注册时不允许；句柄释放后调用会抛出异常。密钥使用 Cordis 原生机制：在 Schemastery Config 中声明环境变量回退，再通过 `cordis.yml` 的 `!!js process.env.MY_KEY` 传入。绝不在代码中随意读取密钥文件。

## 流式语汇

`stream()` 发出一个封闭的 chunk 联合。对 `type` 的 switch 要以 `assertNever` 结尾，使新增变体会在每个必须处理它的消费者处导致编译失败：

```ts
type StreamChunk =
  | { type: 'block-start'; index: number; blockType: ContentBlockType }   // 'text' | 'reasoning' | 'image' | 'tool-call' | 'tool-result'
  | { type: 'text-delta'; index: number; text: string }
  | { type: 'reasoning-delta'; index: number; text: string }
  | { type: 'tool-call-delta'; index: number; id: CallId; name?: string; argumentsDelta: string }
  | { type: 'block-end'; index: number; block: ContentBlock }
  | { type: 'usage'; usage: TokenUsage }
  | { type: 'finish'; reason: FinishReason; replayState?: unknown }
```

`TokenUsage` 的各项计数互不重叠：`inputTokens` 只包含未命中缓存的输入；缓存输入分别记在 `cacheReadTokens` 和 `cacheWriteTokens` 中，计费输入是三者之和。`reasoningTokens` 如果存在，只是已包含在 `outputTokens` 中的信息性细分；计算总量时不能再加一次。当供应商把缓存命中合并进单一提示词总量（如 DeepSeek 的 `prompt_tokens`）时，要从中减去缓存部分。

## 接收的请求

`GenerateOptions` 包含：`provider`（选择适配器的已注册路由）、`model`（供应商模型 ID）、`reasoningEffort?`（适配器所有的思考强度 ID）、`messages`（系统槽之后按顺序排列，与供应商实际所见完全一致的对话）、`system?`（系统提示词文本）、`tools?`（JSON Schema 工具说明）、`temperature?`、`maxTokens?`、`stop?`（停止序列）、`signal?`（AbortSignal，必须遵守）、`sessionId?`（由循环标记，用于重放路由；适配器忽略）和 `purpose?`（辅助调用使用 `'compaction' | 'session-title'`）。`packages/llm/llm/src/assembler.ts` 中的 `BlockAssembler` 将 chunk 流折叠回内容块、用量、结束原因和重放状态。消费者应使用它，不要重新实现折叠；适配器自身不进行组装。

## 协议义务

- 在 `finish` **之前**发出 `usage`；`finish` 之后不得再发出任何内容。在供应商的流结束标记到达前缓冲 finish 和 usage，然后一并刷出，避免尾部只含 usage 的 chunk 破坏顺序。
- 工具调用 `arguments` 在端到端流程中始终保持原始 JSON 字符串，分片通过 `argumentsDelta` 传输。如果供应商返回已解析对象，在 `block-end` 时重新序列化。
- 按内容块在流中首次出现的顺序分配 `index`；同一内容块的每个 delta 都复用同一个 index。
- 错误只有两条允许的路径：传输和协议失败从 `stream()` 中抛出，使用带稳定错误码的 `LlmError`；供应商带内失败通过 `finish { kind: 'error' | 'aborted', failure }` 结束流。两条路径都要规范化为同一个可序列化的 `LlmFailure`：`message`（人类可读）、`code`（稳定、与供应商无关的机器路由码）、`status?`（HTTP 状态码）、`providerRetryAfterMs?`（经验证的供应商正数延迟要求，不是重试决策）和 `requestId?`（供应商签发的不透明诊断 ID）。消费者必须处理两条路径；按失败类型选择并写入文档。空完成是可重试错误，不是静默成功：将不含任何内容块的终止 `stop` finish 映射为带规范 `EMPTY_RESPONSE` 码的 `finish { kind: 'error' }`。
- 遵守 `options.signal`，将它传给 fetch 或 SDK。
- 如果供应商无法遵守某个 `GenerateOptions` 字段，例如不支持停止序列的供应商收到 `stop` 列表，应抛出 `LlmError(..., 'UNSUPPORTED')`，不能默默丢弃。
- 如果供应商在后续调用中需要响应 ID、签名或其他原生元数据，将最小无损 JSON 投影发出为 `finish.replayState`，并在重建历史时验证。只有历史供应商路由和目标供应商路由当前归属于同一个适配器实例时，`LlmService` 才传递该状态。适配器自行决定是否允许同模型、跨模型或跨供应商恢复。状态缺失时，绝不根据供应商或模型名称推断原生重放。
- 上下文溢出只有一个规范错误码：通过 `isContextWindowExceededError()` 对供应商的明确细节进行分类，并向上层提供 `CONTEXT_WINDOW_EXCEEDED`，无论失败是抛出的 `LlmError` 还是流内 finish 错误。
- 供应商特定的思考模式开关保留在适配器 Config 中。精确模型元数据使用与供应商无关的能力接缝：实现 `resolveModel()`，提供供应商或模型标识，以及可选的 `context`（供应商所有的 `contextWindow`）和 `reasoning`（有序 `efforts`、可选 `defaultEffort`）。只有默认强度确实存在时才声明已配置的 `defaultEffort`。遵守解析器的可选 `AbortSignal`，实现必须在中止后迅速完成。思考强度是适配器映射到供应商请求的有序不透明 ID。保留适配器权威的可选列表，包括受支持时由适配器定义的 `off`；不要暴露最终线上拼写，也不要将不支持的值强行截断到范围内。
- 每个供应商 HTTP 请求都要携带应用归属请求头：发送 `attributionHeaders()`，包含 `User-Agent` 基线和从包清单（manifest）读取的 `{ product, version, url }`，并用传输线级测试证明它已发送。
- 一次适配器调用只对应一次供应商尝试：禁用库自带重试。Agent 级恢复会打开另一个持久化编号轮次；直接的 `ctx.llm.stream()` 调用方仍然只尝试一次。
- 在传输层限制供应商停滞：暴露正数且有限的 `streamIdleTimeoutMs`（已发布适配器的默认值为五分钟），仅在迭代器 `next()` 尚未完成时计时，整个请求使用同一个稳定 signal，将自身过期映射为 `TIMEOUT`，并保留更早发生的调用方中止为 `ABORTED`。

## 实现结构

将线上类型、请求序列化、传输解析、chunk 转换和适配器类分离为独立职责；`llm-deepseek` 是参考布局。可选触面包括：`providerRetryPolicy()`（每路由不可变策略，省略时使用常规默认值）、`providerInfo()` 和异步 `listModels()`（只是建议性选择器元数据，目录绝不是请求白名单），以及用于声明设置页可激活的休眠路由的 `registerConfigurableProviders()`。

## 验证

对 chunk 转换和错误分类执行单元测试；通过传输线级测试证明 `attributionHeaders()`；当供应商密钥已可用且已授权执行时，运行真实 API 端到端测试，无密钥时测试套件自动跳过；如果包发布运行时入口，执行构建入口烟雾测试。在 Harness 单仓内，满足其逐文件覆盖率门槛；在外部仓库中，满足所属仓库声明的覆盖率门槛，并报告无法覆盖的真实供应商边界。
