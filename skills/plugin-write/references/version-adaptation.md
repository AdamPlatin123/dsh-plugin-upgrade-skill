# DSH 版本适配实施参考

在编写或修改插件时，用本文件独立完成 Harness 版本适配。不把历史示例当成
目标合约；精确目标 tag 的源码、类型声明、发行说明和可复现运行行为才是依据。

## 1. 锁定基线与目标

1. 读取仓库规则，确认工作区、分支和未提交改动；不自动
   stash、reset 或 clean。
2. 记录精确的 from/to tag、当前解析版本、Node 版本、包管理器和 lockfile。
3. 记录安装轨：registry、Git checkout、workspace/junction 或复制安装。
4. 分开包清单、社区 manifest 与 Profile composition；不整对象回写未知字段。

## 2. 建立版本迁移账本

按真实的版本先后关系逐边阅读发行说明和目标源码，禁止按文件名排序猜测。先读完
全走廊，再折叠中间版本的删除、恢复和重命名，只实施目标版本的最终净状态。

| from → to | 类型 | 证据 | 触点 | 目标状态 | 验证 |
|---|---|---|---|---|---|
|  | `breaking` / `behavior` / `capability` | tag、源码或发行说明 | #1–#7 |  |  |

- `breaking`：必须改；用户尚未授权写入时，先展示计划、风险与回滚路径。
- `behavior`：代码可能继续构建，但必须添加针对新语义的回归测试。
- `capability`：只作建议，不自动引入新能力。
- 任一版本边或 API 坐标缺失时，标记「待确认」，不凭记忆修改。

## 3. 扫描七类触点

扫描受跟踪的源码、测试、脚本、CI 和根配置，排除生成物、vendor 和 `node_modules`。

| 触点 | 关注内容 | 建议搜索 |
|---|---|---|
| #1 源码 patch | 宿主路径、monkey patch、补丁目标 | `cordis.patch.yml|patchedDependencies|patch-package|monkey` |
| #2 事件 | 内部事件名、持久化、reload 和 transport | `SessionEvent|session/event|ctx.on|subscribe` |
| #3 服务与 Remote | Host/Web Client/Plugin 不同 face 的包入口与错误语义 | `ctx.remote|ctx.get|@Remote|/internal` |
| #4 宿主文件系统 | 直接读写 `DSH_HOME`、Profile 或会话数据 | `DSH_HOME|profiles|homedir|readFile|writeFile` |
| #5 UI、命令与工具 | 注册入口、Schema、渲染器、卸载与 HMR | `registerCommand|registerView|ctx.tools|ctx.effect` |
| #6 自建通道 | HTTP、WS、RPC、DOM/CSS 通道的认证、端口和 teardown | `createServer|WebSocket|MutationObserver|localhost` |
| #7 子进程与输出 | argv、cwd、env、取消、退出码、stdout/stderr 归属 | `child_process|spawn|execa|headless|--profile` |

另外单独检查权限/审批、打包/依赖以及隐私/数据出境。七类零命中只是启发式结果，
仍要检查依赖与导入，并运行 build、真实挂载和功能烟雾测试。

## 4. 实施与验证

1. 按 seam 分组修改，每组记录命中文件、证据、目标行为和回归测试。
2. 只修改插件拥有的路径；不修改 Harness core 来掩盖兼容问题。
3. 核对依赖图和 lockfile，确保 DSH 包不混用 cohort。
4. 运行 typecheck、build 和命中触点的回归测试。
5. 将构建产物安装到隔离的精确目标版本 Profile，验证冷启动、entry activate、
   Cordis service 不 pending，并完成一次消息→工具→回复或等价核心流程。
6. 若声称跨 cohort 兼容，用同一份产物分别在每个声称版本上重复运行时验证。

最终报告已完成、跳过项、未验证边界、回滚基线与残留风险；不把静态绿灯表述为
精确目标版本已可运行。
