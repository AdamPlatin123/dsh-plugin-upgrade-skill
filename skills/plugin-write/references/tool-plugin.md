# 工具插件参考

工具是注册在 `ctx.tools` 上的模型可调用能力。在提供该合约的目标版本中，其 Schema 会自动加入系统提示词组装。如果目标版本包含 `packages/bash/tool-bash`，可将它作为参考实现。

> 目标版本守卫：本文档是形态参考，不是版本迁移权威。必须根据精确的目标 Harness 检出版本验证工具注册表、Schema、事件、渲染器和代码模式（Code Mode）桥接。升级时，先按 [`version-adaptation.md`](version-adaptation.md) 建立迁移账本，再以实际观测到的目标行为为准。

## 形态

```ts
import { readFile } from 'node:fs/promises'
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'my-tool'
export const inject = ['tools']

export function apply(ctx: Context) {
  ctx.tools.register(defineTool({
    name: 'read_file',
    description: '从磁盘读取文件。',
    parameters: {
      path: { type: 'string', required: true, description: '绝对路径' },
      limit: { type: 'number' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args, exec) {
      return readFile(args.path, { encoding: 'utf8', signal: exec.signal })
    },
  }))
}
```

也可以直接接收原始 JSON Schema `ToolDefinition`，MCP 来源的工具就以这种方式进入。`defineTool` 是类型化辅助函数：它在 `execute` 运行前，根据统一参数 Schema 验证 `arguments`，并从 Schema 推导 `execute` 类型。

## `execute()` 合约

- **参数已代为验证。** `defineTool` 在 `execute` 运行前验证模型生成的 `arguments`，包括类型、必填键、字面量约束、精确单选联合和嵌套值，因此 `execute` 内的参数符合推导类型。仍要手动检查 DSL 无法表达的约束，例如非空字符串、正数和跨字段规则。直接注册的原始 JSON Schema 工具需要自行负责输入验证。
- **注册借用只读定义。** 注册后不要修改 Schema 或替换回调。如需热替换工具，释放所属 effect，再注册替代项。回调闭包内的可变状态仍是普通插件状态。
- **执行身份受保护。** 注册表将 `arguments` 实例化为独立的无损 JSON，在策略开始前冻结，并分配不透明的 `exec.token`。`callId`、`name`、`arguments`、`agent`、`token`、调用方必须拥有的 `signal` 和可选外层传输 `parent` token，在整个分发过程中都不可变。将 `args` 视为只读输入。只有环绕分发包装器能获得可变视图；它可以替换并恢复必需的 `exec.signal` 以施加截止时间，但不能移除。
- **只声明并返回一个规范 JSON 值。** `output.schema` 使用值 Schema，根可以是对象、数组、标量或 null。`execute` 只返回推导出的值。注册表将其快照为无损 JSON，验证并冻结，再传给 `output.render(args, value)`。不要从主体返回内容块，也不要让调用方从散文中解析 ID 和字段。
- **抛出异常或返回无效值都意味着 `isError`。** 注册表捕获异常，并在观测者运行前限制 Schema、渲染器、元数据投影器和无损 JSON 失败。基础设施失败应抛出异常。成功的领域结果使用规范值表示，即使渲染器需要说明非理想状态，例如进程非零退出。
- **遵守 `exec.signal`。** signal 触发时取消进行中的工作。
- **通过可选的 `output.presentationMeta` 投影持久化卡片数据。** 它从同一个规范值派生可重放 JSON。核心将其持久化到 `tool/result` 上并传给 `presentResult`，使需要结果阶段事实的卡片无需持久化规范值也能通过重放。
- **异步通知使用 `exec.agent`。** `agent.inject({ content, source: { kind: 'plugin', plugin: '<name>' } })` 追加下一次模型请求才会看到的持久化上下文；它不会唤醒 Agent，空闲 Agent 仍然保持空闲。使用 try/catch 防护已释放的 Agent。

## 长时间运行的工作

使用提供方配置控制 `run_in_background`，然后通过 `ctx.tasks.start({ kind, label, owner: exec.agent, run })` 注册。在提供方主体运行前，注册表会拒绝预先中止的调用；运行时验证所有权和控制面可用性，再启动 `run()`，并提供 ID、会话栅栏、通用控制工具、通知和所有者清理。成功的后台分支返回类型化的规范句柄，例如 `{ kind: 'background', taskId }`。渲染器可以保留人类可读说明，但代码模式绝不能从该说明中解析 ID。提供方要提供同步 `cancel`、在资源清理后完成且永不被拒绝的 `done`，以及可选的消费型 `readOutput`，其输出必须有界。`ctx.tasks.start()` 发布 ID 后，使用任务所有的取消 signal，不再使用 `exec.signal`：此后外层调用取消只会停止等待，不会杀死已发布工作。`task_kill`、所有者释放和服务拆除负责该生命周期。前台工作仍与 `exec.signal` 绑定。

## 策略与观测

优先不要把部署策略写进工具。选择规则：可扩展的允许、拒绝或询问策略使用 `tools/pre-execute`，返回类型化决策；`ask` 通过 `ctx.approval` 发起一次性询问，审批缺失或无法回答时一律拒绝。后续监听器无法撤销的最终单调拒绝使用 `ctx.tools.guard()`。使用 `tools/execute` 包装分发以添加截止时间、重试或指标采集。使用 `tools/post-execute` 替换展示内容或返回值、阻断结果或附加模型可见上下文。使用 `tools/result` 观测不可变的规范化结果。替换内容后，规范 `value` 的编程式访问仍保留；保密策略会阻断或替换值。执行顺序是：先运行 `tools/pre-execute` waterfall，再运行单调守卫，然后是 `tools/execute` 和 `tools/post-execute` waterfall；之后执行工具定义拥有的 `finalizeContent` 和 `tools/result`。

## 用户界面（UI）渲染

UI 卡片与模型结果是两个独立关注点，通过纯展示投影声明。`presentCall(args)` 返回进行中卡片，`presentResult(args, { content, isError, meta? })` 返回已完成卡片。没有 UI 展示的工具回退到通用卡片：标题是工具名，原始参数是输入。卡片类型：

- `{ card: 'generic', title, kind?, rawInput?, content?, locations? }` —— 默认类型。设置 `kind` 以选择图标，例如 `read` 或 `search`。对工具接触的每个文件设置 `locations: [{ path, line? }]`，使编辑器可以跟踪。
- `{ card: 'terminal', title, description?, cwd? }` —— 调用本身就是 Shell 命令，`title` 是该命令。
- `{ card: 'diff', title, diffs, locations? }` —— 调用会创建或修改文件。`diffs: [{ path, oldText, newText }]`；新文件使用 `oldText: null`，以内联差异渲染。
- `search` —— 从持久化的 `result.meta` 重建的完成发现结果：可以是按文件分组的匹配（`shape: 'matches'`），也可以是平铺路径列表（`shape: 'paths'`）。还要包含 `truncated` 和 `total`，防止 UI 把被截断的结果展示为完整结果。`search` 没有调用视图；发现调用的进行中状态保持为通用卡片。
- `web` —— 已完成的 Web 检索，通过 `kind: 'search' | 'fetch'` 区分，从 `result.meta` 派生，不携带正文副本。

必须遵守的硬规则：

- **纯函数性。** 这些投影会在实时流和会话日志重放中运行，因此必须是 `args`（加结果）的纯函数：不执行 I/O，不读取会话状态，不使用时钟或随机数。差异从参数派生；会话上下文由 UI 适配器提供，不由工具提供。
- **UI 专用格式不能进入模型结果。** 仅为服务 UI，不要把带围栏的 `console` 块、差异或相对化路径放进规范值或 Native 内容。`output.render` 负责模型可见文本，`presentationMeta` 和卡片展示器负责可重放 UI 状态。
- **`defineTool` 对展示路径实行软验证。** 当日志中的参数异常或来自旧版本时，包装器返回 `undefined` 以使用通用回退，而不是抛出异常。展示绝不能使重放崩溃。

中立语汇位于 `dsh-tools`。工具绝不导入 UI 或传输类型。`dsh-tool-fs`（通用卡片和差异卡片）以及 `dsh-tool-bash`（终端卡片）是参考实现。

## 代码模式（Code Mode）

在代码模式中，每个可见的已注册工具无需额外集成，即可通过 `await tools.<name>(args)` 调用。生成的 `ToolArgsMap` 和 `ToolOutputMap` 从同一组 Schema 派生精确参数类型和规范返回类型，调用会重新进入正常执行管线。成功调用在策略处理后解析为最终规范 JSON 值，而不是渲染后的 Native 内容。失败调用会以真实 `ToolCallError` 拒绝，程序只能检查其 `name`、`toolName` 和人类可读的 `message`。将 `output.schema` 设计为实用的编程 API：直接返回句柄和字段；当标量、数组或 null 是真实值时，允许其作为根；将人类说明保留在 `output.render` 中。

## 验证

对 execute 和 render 逻辑执行单元测试。对用户可见工具，执行通过 `cordis.yml` 启动插件的真实组合测试。当工具改变模型可见行为（提示词 Schema、工具输出）或 UI 可见行为（卡片）时，在同一次变更中添加无密钥快照。在 Harness 单仓内，满足其逐文件覆盖率门槛；在外部仓库中，满足所属仓库声明的覆盖率门槛。
