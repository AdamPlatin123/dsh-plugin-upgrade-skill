# DSH 版本迁移测试参考

用本文件独立设计 Harness 版本迁移的回归测试。目标是证明「发布产物在精确目标版本上
可用」，而不是只证明源码能通过类型检查。

## 1. 建立迁移测试账本

1. 记录精确的 from/to tag、插件已声明与实际解析的 DSH/Node 版本、lockfile 和安装轨。
2. 按真实版本先后关系阅读每个中间版本的发行说明、源码和类型声明，折叠为目标版本净状态。
3. 将变更分为 `breaking`、`behavior` 和 `capability`。前两类必须进入回归矩阵；
   `capability` 只在插件实际采用时测试。
4. 一手证据或版本边缺失时标记「待确认」，不用模拟结果补成兼容结论。

| 版本边 | 变更 | 类型 | 命中文件 | 回归断言 | 运行时证明 |
|---|---|---|---|---|---|
|  |  |  |  |  |  |

## 2. 扫描触点并映射断言

扫描受跟踪的源码、测试、脚本、CI 和根配置，排除生成物、vendor 和 `node_modules`。

| 触点 | 建议搜索 | 最少回归断言 |
|---|---|---|
| #1 源码 patch | `cordis.patch.yml|patchedDependencies|patch-package|monkey` | patch 在目标上游文件可应用，或已被公开 seam 替代；上游坐标漂移必须使测试变红。 |
| #2 事件 | `SessionEvent|session/event|ctx.on|subscribe` | producer、持久化、reload、transport 与 observer 对新语义一致；未知 required 事件不被静默丢弃。 |
| #3 服务与 Remote | `ctx.remote|ctx.get|@Remote|/internal` | 覆盖成功、已知业务错误、未知错误、取消和装配缺陷；不用同进程替身代替线上 face。 |
| #4 宿主文件系统 | `DSH_HOME|profiles|homedir|readFile|writeFile` | 只读写隔离的目标 Profile，路径与数据归属正确，未授权文件字节不变。 |
| #5 UI、命令与工具 | `registerCommand|registerView|ctx.tools|ctx.effect` | 通过真实 Loader 验证注册可见、Schema/渲染正确、卸载清理和 HMR 不重复注册。 |
| #6 自建通道 | `createServer|WebSocket|MutationObserver|localhost` | 验证认证、Host/Origin、端口生命周期、断线/重连和 teardown；loopback 不豁免认证。 |
| #7 子进程与输出 | `child_process|spawn|execa|headless|--profile` | 断言 argv、cwd、env、取消、退出码、stdout/stderr 分类和 teardown，不只检查进程能启动。 |

另外单独覆盖权限/审批、peer dependency 与打包产物、隐私/数据出境。七类零命中不等于兼容；
仍必须验证依赖解析、build、真实挂载和核心功能。

## 3. 按证明强度逐层验证

1. **依赖与静态**：lockfile 与依赖图无意外 cohort；typecheck、build 和静态检查通过。
2. **变更级回归**：每个 `breaking` / `behavior` 条目至少有一条能在回归时变红的断言。
3. **真实组合**：通过真实 Loader 启动测试 Profile，只模拟高成本或不确定的边界。
4. **精确目标运行时**：安装已打包产物，冷启动，确认 entry activate 且服务不 pending，
   完成一次消息→工具→回复或等价专用流程。
5. **发布入口**：在原生 Node 下运行构建后的 `bin` 或非默认入口，覆盖模块解析、退出码和关闭竞态。
6. **跨 cohort 声明**：若声称一份产物支持多个宿主版本，在每个声称版本上重复第 3–5 层。

类型检查、配置解析、模拟 Context 或无密钥管线都不是运行时兼容证明。无法获取的供应商
密钥、操作系统、浏览器、PTY 或破坏性数据迁移必须列为未验证边界。
