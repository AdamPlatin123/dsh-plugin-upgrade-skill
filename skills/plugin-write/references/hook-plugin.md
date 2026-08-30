# 钩子插件参考

钩子插件在不修改 Agent 循环的情况下拦截已有文档的扩展点，例如权限门、沙箱或计划模式策略、截止时间、重试、指标、遥测和请求路由。“原生钩子”是拦截点上的普通 Cordis 插件，不需要外部协议。

> 目标版本守卫：本文档是形态参考，不是版本迁移权威。必须根据精确的目标 Harness 检出版本验证每个事件名、分发模式、类型和 Loader 规则。升级时，以 `plugin-upgrade` 的版本卡片和实际观测到的目标行为为准。

## 瀑布式（Waterfall）语义

`ctx.waterfall` 是环绕型中间件。监听器接收 `(...args, next)`；调用 `next()` 将可能已包装的结果委派给下一个服务，不调用 `next()` 就返回则会短路。值通过 `next()` 的返回值传递。协作型监听器通常修改共享请求或决策对象，然后继续委派；监听器也可以完全替换结果，下游监听器只能看到替换后的结果。只有监听器必须早于普通注册执行时，才使用 `prepend: true`。对单决策事件，短路属于设计行为：策略监听器拥有决策时可以不调用 `next()` 而返回；仅做标注或观测的监听器必须继续委派。遗漏 `next()` 会在无提示的情况下接管流程，因此绝不能误省略。分发模式是事件公开合约的一部分；还有 `emit`（广播）、`bail`（首个非 `undefined` 值）和 `serial`（顺序执行）等模式，但拦截点使用 waterfall。

## 选择扩展点

| 目标 | 扩展点 |
|---|---|
| 对工具调用执行允许、拒绝或询问策略 | `tools/pre-execute`，返回类型化的 `PreToolDecision` |
| 执行后续监听器无法撤销的最终单调拒绝 | `ctx.tools.guard()` |
| 包装分发生命周期：超时、重试、指标 | `tools/execute`（只能替换 `exec.signal`） |
| 转换结果、替换展示、阻断结果、附加模型可见上下文 | `tools/post-execute` |
| 观测不可变的规范化结果：审计、捕获 | `tools/result` |
| 拦截请求、步骤或轮次 | `agent/*` 事件；`agent/turn-stopping` 是停止轮次的事件 |
| 短路或路由模型调用 | `llm/stream` waterfall |
| 强制单调的终止轮次策略 | 从终止工具调用 `ToolExecution.concludeTurn()` |

工具管线的执行顺序：先运行 `tools/pre-execute` waterfall，再运行单调守卫，然后是 `tools/execute` 和 `tools/post-execute` waterfall；之后才执行工具定义拥有的 `finalizeContent` 和 `tools/result`。被拒绝或审批未通过的调用会跳过工具主体。`tools/result` 观测已冻结的无损 JSON 结果；`tools/post-execute` 在规范化前执行，可以转换结果或附加上下文。

## 权限门模板

```ts
import type { Context } from '@deepseek-ai/cordis'
import type { PreToolDecision, ToolExecution } from '@deepseek-ai/dsh-tools'

declare function isAllowed(exec: ToolExecution): Promise<boolean>

export const name = 'permission-gate'

export function apply(ctx: Context) {
  ctx.on('tools/pre-execute', async (exec, next): Promise<PreToolDecision> => {
    if (!(await isAllowed(exec))) {
      return { kind: 'deny', reason: '被策略拒绝。' }
    }
    return next()
  })
}
```

类型化决策包括 `{ kind: 'allow' }`、`{ kind: 'deny', reason }` 和 `{ kind: 'ask', ... }`。`ask` 通过 `ctx.approval` 发起一次性询问；审批缺失或无法回答时一律拒绝。该 waterfall 是可重排序的策略层，供沙箱、权限和计划模式插件使用。当不变式需要后续监听器无法撤销的最终单调拒绝时，使用 `ctx.tools.guard()`；插件需要包装实际分发生命周期时，使用 `tools/execute`（超时、重试、指标，只能替换 `exec.signal`）；显式转换结果时使用 `tools/post-execute`；受控观测不可变的最终结果时使用 `tools/result`。

## 规则

- 通过 `ctx.on()` 注册的监听器是一项 effect：插件卸载时会自动移除。所有注册和释放都必须基于 effect。
- 拦截和策略优先使用事件；直接能力调用优先使用服务方法。
- 不要把部署策略写进工具。将策略放在钩子插件中，使其可重排序并覆盖多个工具家族，避免工具耦合到某个策略服务。
- 有作用域的监听器会过滤分发。在 `agent.ctx` 上注册，将策略限定到单个 Agent。Agent 释放时，`agent.ctx` 贡献按照等待完成的清理顺序撤销。
- 类型化事件通过目标 Cordis `Events` 接口的声明合并定义，并用 `@mode` 说明分发模式。Harness 事件名使用 `namespace/action`，例如 `tools/pre-execute`、`agent/request` 和 `agent/turn-stopping`。

## 验证

对决策逻辑执行单元测试，覆盖每种决策类型、短路路径和委派路径。通过真实组合测试证明权限门确实会阻断调用，且被拒绝的调用不会产生副作用。只有引入回归时守卫测试确实失败，该守卫才有意义。当精确的目标合约要求无 `inject` 的打包或组合模块使用具名导出时，添加 `expect('default' in mod).toBe(false)` 和 `unwrapExports` 往返断言，并通过人为引入回归证明它会失败。不要对目标版本支持的默认插件对象或 `Service` 类应用该守卫。模型或用户可见行为变更必须在同一次变更中添加无密钥快照。
