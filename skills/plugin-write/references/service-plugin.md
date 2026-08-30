# 服务插件参考

服务是一个插件通过 `ctx` 暴露给其他插件的能力；`tools`、`llm` 和 `agents` 是常见示例。

> 目标版本守卫：本文档是形态参考，不是版本迁移权威。必须根据精确的目标 Harness 检出版本验证服务名称、生命周期行为、事件和 Agent 作用域。升级时，先按 [`version-adaptation.md`](version-adaptation.md) 建立迁移账本，再以实际观测到的目标行为为准。

## 形态

```ts
import { Service, type Context } from '@deepseek-ai/cordis'

declare module '@deepseek-ai/cordis' {
  interface Context {
    metrics: MetricsService
  }
}

export default class MetricsService extends Service {
  static inject = ['llm']  // 服务可以依赖其他服务。

  constructor(ctx: Context) {
    super(ctx, 'metrics')  // 'metrics' 是服务名。
  }

  record(event: string, value: number) { /* … */ }
}
```

加载后，消费者通过 `ctx.metrics` 访问服务；它们声明 `inject: ['metrics']`，并在 `apply` 中使用。插件向其他插件提供服务时使用类形态；只消费服务的插件使用函数形态即可。公开服务方法要使用 JSDoc `@param`/`@returns` 说明参数和非 void 返回值。服务名是传给 `super(ctx, ...)` 的字符串。生成的子系统页面会记录服务名、公开方法和源码位置；不要维护第二份静态列表。

## 依赖

`inject` 列出必需服务。服务缺失时，插件不会加载，而是等待所有已声明服务就绪；因此在 `apply` 中，`ctx.tools` 已存在且就绪。可选依赖不声明 `inject`，而是在使用点通过 `ctx.get('name')` 查询，并对可能缺失的结果做保护。如果必需服务在运行时消失（提供方卸载），依赖插件会自动释放，服务恢复后再重新加载，从而避免调用不再存在的服务。`cordis.yml` 可以按插件分组隔离服务，例如在分组行上使用 `isolate: { bash: true }`，使不同插件分组看到同一服务的不同实例，且 effect 不跨组传播。

## 类型化事件

事件是插件之间的松耦合扩展 API。通过精确目标 Cordis `Events` 接口的 TypeScript 声明合并定义，事件名使用 `namespace/action`，并用 `@mode` 说明分发模式：

```ts
import '@deepseek-ai/cordis'

declare module '@deepseek-ai/cordis' {
  interface Events {
    'my-plugin/ready': (payload: { id: string }) => void
    'my-plugin/check': (input: string) => boolean | undefined
    'my-plugin/transform': (input: string, next: () => Promise<string>) => Promise<string>
  }
}
```

分发模式：`emit`（广播，所有监听器同步运行，忽略返回值）、`bail`（短路，监听器按顺序运行，第一个非 `undefined` 结果成为最终结果）、`serial`（顺序执行，第一个非空值会停止后续执行）、`waterfall`（管线，每个监听器可以包装下游结果，但必须调用 `next()` 才会委派；省略就会按设计短路）。通过 `ctx.on()` 注册的监听器是一项 effect，插件卸载时会自动移除。Harness 事件名使用 `namespace/action`，例如 `agent/step`、`agent/request`、`agent/request-error`、`tools/result` 和 `session/event`。`turn/*`、`step/*`、`tool/call`、`tool/result` 和 `compact/*` 是持久化会话事件类型，不是同名 Cordis 事件。如需观测它们，监听 `session/event` 并检查 `event.type`。

## 生命周期

加载由依赖驱动。通过 `ctx` 注册的所有内容，包括事件监听器、工具和计时器，都会在插件卸载时清理，无需手动调用 `removeListener` 或 `clearInterval`。对需要显式拆除的资源，例如网络连接，通过 `ctx.effect()` 提供 disposer。如果拆除顺序很重要，将相关工作放在同一个 effect 中，使释放按预期顺序撤销。修改配置会热替换插件：框架卸载旧实例并撤销其注册，然后加载新实例。

## 智能体（Agent）作用域

每个 Agent 都有一个带作用域的 `agent.ctx`。在其上完成的注册会进入该 Agent 的层，并在 Agent 释放时按照等待完成的清理顺序撤销。有作用域的监听器会过滤分发，共享存储会在保留领域视图的同时，将其条目覆盖到全局注册表上。`CreateAgentOptions.setup(agentCtx)` 在发布前完成组装。如需将注册范围限定到单个 Agent，使用其 `agent.ctx` 而非根 Context。必须存活于 Agent 预设中的服务行需要 `isolate` realm。

## 能力接缝

可替换能力包含三个角色：服务定义（接口）、服务提供方（实现）和消费者（使用该服务的模型可见代码或集成代码）。只有这些角色会独立演进时，才将它们拆成多个包；bash 三包组（定义、提供方、消费者）是模板。单一用途服务保持一个包。只有三个角色都齐全，能力接缝才完整；只有角色确实独立演进时才拆包。

## 验证

执行单元测试，包括 HMR 安全性测试：释放贡献该注册的 fiber，并断言资源已清理。对用户可见插件，还要执行非单元级的真实组合测试：通过 Loader 启动 `cordis.yml`，并断言模型可见请求或日志、持久化状态或用户可见输出。在 Harness 单仓内，满足其逐文件覆盖率门槛；在外部仓库中，满足所属仓库声明的覆盖率门槛。模型、协议或用户可见行为变更，必须在同一次变更中添加无密钥快照。
