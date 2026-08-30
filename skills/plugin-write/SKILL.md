---
name: plugin-write
description: 当需要创建 DeepSeek Harness 插件、外部 DSH 插件包，或 deepseek-harness 仓库内的工作区包时使用，覆盖从形态选择到验证的全流程。将工具、LLM 适配器、钩子、服务和配置等形态路由到对应参考文件，并区分上游单仓规则与外部包规则。对跨 Harness 版本的现有插件，使用本 Skill 内置的版本适配流程，再按精确的目标合约实施。
---

# 编写 DeepSeek Harness 插件

创建一个插件包。先分类仓库模式和插件形态，再阅读对应的参考文件，最后使用能覆盖变更的最小门槛集合验证发布入口。

## 先选择仓库模式

| 目标 | 适用规则 |
|---|---|
| 官方 `deepseek-harness` 单仓内的包 | 使用下文的仓内包、tsconfig、文档和根门槛规则。 |
| 外部可安装 DSH 插件 | 保留该仓库的包布局和脚本。只使用精确目标 DSH 版本公开的包和导出；不要复制 `private`、workspace 版本、根 tsconfig 注册或单仓专用 README 门槛。 |
| 适配新 DSH 宿主的现有插件 | 阅读 [`references/version-adaptation.md`](references/version-adaptation.md)，确定完整版本走廊，并执行七类触点预检。如果变更类型为 `breaking`，而用户尚未明确授权实施，先展示迁移计划并等待确认；获得授权后先完成版本适配，再使用本 Skill 的形态参考。形态示例绝不能覆盖目标源码、类型声明或发行说明。 |

从精确目标版本的清单（manifest）中确定 Cordis、Schemastery 和 DSH 的包名与版本范围。当前示例使用带作用域的 `@deepseek-ai/*` 标识；旧版目标可能不同，必须遵循其自身的发布合约。

## 再分类插件形态

| 所需能力 | 形态 | 参考文件 |
|---|---|---|
| 模型可调用的工具：读写文件、运行命令、搜索 Web | 工具插件 | `references/tool-plugin.md` |
| 新的模型供应商 | LLM 适配器插件 | `references/llm-adapter-plugin.md` |
| 拦截请求、工具或轮次：权限、策略、指标、遥测 | 钩子插件 | `references/hook-plugin.md` |
| 供其他插件通过 `ctx` 消费的能力 | 服务插件 | `references/service-plugin.md` |
| 通过 `cordis.yml` 提供用户可配置行为 | 配置插件 | `references/config-plugin.md` |

一个插件可以自由组合多种形态，例如带 Config 的工具插件，或同时注册工具的服务；每种形态的合约仍然全部适用。当需求不属于上述五种形态时，将其映射到已有扩展点，编写在该扩展点注册的插件；绝不直接修改 Agent 循环。

| 目标 | 机制 |
|---|---|
| 添加模型可调用能力 | 在 `ctx.tools` 上注册 |
| 添加模型供应商 | 在 `ctx.llm` 上注册适配器 |
| 为某个会话提供不同的能力集 | 在 Agent 预设中组装 |
| 添加 Shell 执行 | 实现并注册 `ctx.bash` 后端 |
| 添加持久终端执行 | 注册 `ctx.pty` 后端并加载 `dsh-tool-pty` |
| 添加人类命令 | 在 `ctx.commands` 上注册 |
| 添加后台任务 | 在 `ctx.tasks` 上注册 |
| 添加文件系统访问或策略 | 实现 `ctx.fs` 提供方，或监听 `fs/*` 策略事件 |
| 约束所启动的进程 | 使用 `ctx.sandbox` 后端 |
| 拦截请求、工具或轮次 | 使用 `agent/*` 或 `tools/*` 事件；`agent/turn-stopping` 是停止轮次的事件 |
| 添加模型可见上下文 | 调用 `agent.inject()` |
| 添加 UI 或编辑器集成 | 驱动 `ctx.agents`，并从 `session/event` 渲染 |
| 添加 Web 客户端聊天节点 | 注册 `ConversationNodeDefinition` 和带键渲染器 |
| 添加持久化会话状态 | 扩展 `SessionEventMap`，并从日志渲染和重放 |
| 分叉实时会话 | 调用 `ctx.sessions.fork(source, boundary?, childSessionId?)` |
| 将注册范围限定到单个 Agent | 使用该 Agent 的 `agent.ctx` |

## 包检查清单

1. **创建仓内包** —— 只在官方单仓内，创建包含 `package.json`、`tsconfig.json`、`src/index.ts` 和 `README.md` 的 `packages/<group>/<pkg>/`。复制目标检出版本的 `packages/core/tools/package.json`，再调整名称、说明和依赖；保留目标版本的不变式：`private: true`、与根包一致的 `version`、`type: module`、`main: "lib/index.js"`、`types: "lib/types/index.d.ts"`、同时将 `exports["."]` 的 `types` 和 `default` 指向 `lib`，在对等依赖和开发依赖（peer/dev）中使用相同范围的目标 Cordis 包，在开发依赖中镜像所有 DSH 对等依赖，在 `dependencies` 中声明目标 Schemastery 包，并保留目标的 `files` 布局和包特定运行时产物。CLI 应用包要包含构建后的 `bin`。不要发布未声明的源码或过期产物。遵循目标检出版本的相对导入约定。优先选择角色匹配的现有分组；新分组只是纯容器，包必须正好位于其下一层。

2. **注册仓内包** —— 只在官方单仓内，按目标检出版本当前开发指南的精确要求，将包加入 Host 或 Client 聚合。普通包只属于一个聚合；不要在未检查目标版本的情况下复制历史特例或文件列表。外部插件绝不修改 Harness 根配置。

3. **创建外部包** —— 保留现有包管理器和构建系统。保持 `main`、`types`、`exports`、`files`、可选 `bin`、打包组合/Profile 元数据与打包后的 tarball 一致。显式声明每个运行时依赖；在开发依赖中镜像编译所需的 DSH 对等依赖。不要仅因仓内模板如此，就把可发布的外部插件设为 `private` 或赋予 workspace 版本范围。

4. **决定包拓扑** —— 对可替换能力，只在服务定义、服务提供方和消费者会独立演进时才拆分为多个包；单一用途插件保持一个包。

5. **编写仓内包 README** —— 只在目标单仓要求时，将包特定的服务 API、配置、事件、扩展点和设计说明放在前面。在 README 末尾使用目标检出版本的规范“模型体验”顺序和“已知限制”章节。根据实现填写模型体验：每个直接、条件式、受上限约束、生命周期或辅助模型触面使用一个 H3，其下依次放置下述三个 H4，且每个标题下都要有一段正文。引用包自身拥有的稳定文本；工具 Schema 触面只描述生成工具目录中尚未包含的差异。在“KV 缓存影响”中，区分仅追加增长、稳定重复前缀、替换早期请求 token 和独立模型请求，然后列出包自身哪些变更会使复用失效。

   ````markdown
   ## 模型体验

   ### 请求触面与生效条件

   #### 模型看到的内容

   写明精确的数据依赖字段、带锚点的生成目录链接，或引出下方逐字文本。

   ##### 需要时，在此放置该字段的逐字文本

   ```markdown
   从源码精确复制任意长度的稳定系统提示词正文，或其他长篇非生成字面量。
   ```

   #### Token 影响

   说明影响是固定、条件式、保留、替换、受上限约束，还是零直接 token 影响。

   #### KV 缓存影响

   说明仅追加、前缀稳定、替换或独立行为，包括可能使复用失效的精确条件。

   ## 已知限制与延后工作

   - **消费者可见缺口** —— 写明缺失的精确操作或情况、其后果以及任何维护者约束。
   ````

6. **验证** —— 执行下文适用的验证块，再运行变更行为所需的专项检查和覆盖率门槛。

## 编写时的规则

- 每次注册都是一项 effect：通过 `ctx` 辅助方法或带 disposer 的 `ctx.effect()` 注册，并让插件卸载清理事件监听器、工具和计时器等所有资源。
- 在有文档的扩展点上添加新行为；不要修改 `agent-loop`。
- 公开服务方法和类型化事件要有带 `@param`/`@returns` 的 JSDoc；类型化事件通过目标 Cordis `Events` 接口的声明合并定义，并用 `@mode` 说明分发模式。
- 不要硬编码可调参数：不同部署可能改变的值，必须是经验证且可通过 `cordis.yml` 修改的 `Config` 字段。
- 模型看到的所有内容都必须可以从会话日志重建。
- 配置错误必须明确失败：绝不默默跳过缺失的引用对象；在解析器、配置、连线和进程边界验证，不要信任同进程中经类型化的调用方。

## 验证

对官方 Harness 单仓内的包，使用目标检出版本当前的根命令；下列名称只是示例，执行前必须确认它们存在：

```sh
pnpm install            # 注册工作区
pnpm run doc-sync
pnpm run constraints && pnpm run typecheck && pnpm run lint
pnpm run build && pnpm run hygiene
```

对外部插件，使用其自身的安装、类型检查、测试、静态检查和构建命令；打包可发布产物，检查内容，并将该产物加载到运行精确目标 DSH 的隔离 Profile 中。当任务是升级时，完成冷启动和一次完整的消息→工具→回复或等价核心流程，并报告所有无法覆盖的供应商、操作系统、UI 或凭据边界。

根据变更触面选择测试：逻辑使用单元测试；执行所属仓库的覆盖率门槛；当供应商密钥已可用且在授权范围内时，执行真实 API 端到端测试；对模型、协议或用户可见行为使用无密钥快照；对用户可见插件使用真实组合测试。包的 `bin` 入口还需要在原生 Node 下运行的构建产物烟雾测试。按上述规则完成最小充分测试集合，不要为此加载其他 Skill。

参考文件入口见 [`references/README.md`](references/README.md)。
