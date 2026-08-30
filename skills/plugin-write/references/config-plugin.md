# 配置插件参考

接收用户通过 `cordis.yml` 提供的配置。

> 目标版本守卫：本文档是形态参考，不是版本迁移权威。必须根据精确的目标 Harness 检出版本验证每个包标识、导出、Loader 规则和配置功能。升级时，先按 [`version-adaptation.md`](version-adaptation.md) 建立迁移账本，再以实际观测到的目标行为为准。

## 形态

导出 `Config` 类型和一个同名的 Schemastery Schema；直接在 Schema 字段上声明默认值：

```ts
import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'

export interface Config {
  greeting: string
  maxRetries: number
  verbose?: boolean
}

export const Config: Schema<Config> = Schema.object({
  greeting: Schema.string().default('你好'),
  maxRetries: Schema.number().default(3),
  verbose: Schema.boolean().default(false),
})

export function apply(ctx: Context, config: Config) {
  // 使用经验证且类型安全的用户值或 Schema 默认值。
}
```

消费者在 `cordis.yml` 的插件行 `config` 中提供值。加载时，Cordis 根据已导出的 Schema 验证用户值并填充默认值。不要把普通对象导出为 `Config`，因为它没有实现 Cordis 要求的 Standard Schema 接口。使用 Schemastery 进行更严格的验证：`Schema.string().required()`、`Schema.number().default(30000)`、`Schema.union(['fast', 'accurate']).default('fast')`。Schema 在插件加载时执行；无效配置必须通过可操作的错误使加载失败。

## 规则

- **不要硬编码可调参数。** 两个部署可能希望设置不同的值，必须是配置字段。判定方法是：是否可以不修改代码，只通过 `cordis.yml` 改变该值。`DEFAULT_*` 常量或测试钩子都不算可配置。协议常量、外部规范和安全不变式保持固定。
- **无效配置必须明确失败。** 在 Schema 中表达自包含约束，使无效配置在插件加载时就失败。对服务或已注册资源的引用要使用依赖注入（`inject`），不能交给 Schema。
- **`!!js`（绝不是 `!js`）只能用在插件 `config` 下。** Loader 元数据是静态的：`id`、`name`、`group`、`disabled`、`inject`、`intercept` 和 `isolate` 必须保持字面量。因此 `disabled: !!js ...` 是一个真值对象，会始终禁用该条目。当环境选择会改变挂载的插件时，使用显式配置覆盖。
- **密钥不能进入配置值。** 使用目标 Schemastery 包的环境变量回退，再通过 `cordis.yml` 中的 `!!js process.env.MY_KEY` 传入；或使用通过 `ctx.credentials` 按操作解析的具名密钥引用。绝不内联凭据，也不在代码中随意读取密钥文件。
- **包边界优先显式行为。** 默认值处理是所属实现中显式的 `resolve(request): Spec` 步骤，绝不能隐藏在 `run()` 中的 `?? default` 后面。
- **HMR 自动生效。** 修改配置会热替换插件：框架卸载旧实例并加载新实例。因为注册都是 effect，旧实例的注册会自动清理。

## 验证

对 Schema 的接受与拒绝情况执行单元测试：有效值、无效值、缺失必填字段、应用默认值。断言错误配置会使加载明确失败，而不是被默默跳过。Schema 位于包的发布入口中，因此需要构建入口和真实组合检查：包的 `bin` 在原生 Node 下运行构建入口，且配置确实缺失时必须非零退出。在 Harness 单仓内，满足其逐文件覆盖率门槛；在外部仓库中，满足所属仓库声明的覆盖率门槛。
