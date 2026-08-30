---
name: plugin-upgrade
description: 升级 DSH（DeepSeek Harness）插件的 skill。当用户想检查已安装插件的更新、升级某个插件到新版、处理插件升级带来的 breaking changes，或 DSH 宿主升级后需要适配插件源码时使用。
---

# plugin-upgrade

把已安装的 DSH 插件安全地升级到新版本：从检查更新、阅读 changelog，到迁移配置、验证升级结果。也覆盖「DSH 宿主升级后插件挂掉」的场景——用 [references/](references/) 里的版本变更卡片做源码级迁移。

## 流程

1. **盘点**：读取 `cordis.yml`，列出已挂载插件与本地版本，对照上游 registry / git 仓库找出可升级项
2. **评估**：拉取目标版本的 changelog 与 release notes，总结 breaking changes，判断升级影响面
3. **迁移**：manifest（`cordis.yml`）有变更时改写；配置项重命名/废弃时给出迁移建议
4. **升级**：git pull / 包管理器升级；必要时按 changelog 指导修复接缝（seam）层面的 breaking changes
5. **验证**：运行插件自带的测试 / typecheck / e2e 注册检查，确认插件在 DSH 中正常挂载

### 宿主版本迁移（插件随 DSH 升级适配）

当升级的是 **DSH 宿主本身**（如 0.1.1 → 0.1.2），或插件因宿主升级而挂载失败时，第 2–4 步改走本节：

1. **定走廊**：确认 from → to 版本区间，按序取 `references/` 下的版本卡片；区间内有版本缺卡片时，先按 [references/README.md](references/README.md) 的格式补卡，**不要凭记忆猜变更**
2. **测触点**：按 [pre-flight 清单](references/pre-flight.md) 把插件与宿主的接触面分成六类（源码 patch / 内部事件名 / 服务探测 / 文件读写 / UI·命令注册 / 子进程·stdout 解析）；六类全零命中 → 插件只经公共契约耦合，跑一遍烟测即可收工
3. **套卡片**：只应用命中触点的卡片，一次迁一类；卡片没写的 API 不臆造，查不到的调用点标「待确认」；跨 alpha 版本存在字段波动（删了又恢复），走廊读完再删防御代码；`capability` 类卡片是机会不是义务，向用户建议、不自动应用
4. **分层验证**：typecheck / build → 卡片级单测（如错误码分支）→ 真实冷启动 + 完整一轮对话（发消息 → 工具调用 → 回复）；headless 包装要比对 stdout/stderr 内容分类
5. **报告**：已迁移（触点类 → 卡片 → 验证结果）/ 跳过（未命中及原因）/ 待确认 / 建议采纳的新能力，四档列清

## 原则

- 有 breaking change 必须停下来向用户说明影响并等待确认，不要直接升级
- 重点检查接缝（seam）API 变更：DSH 插件通过 `ctx.tools` / `ctx.effect()` / `ctx.on()` 注册，接口变更最容易导致挂载失败
- 诚实优先：未知标「待确认」，不编造迁移配方；卡片与实际行为冲突时信实际行为，并把差异回馈到卡片的「实战批注」
- 在独立分支上迁移，不把迁移改动和功能改动混在一个提交里

## 安全边界

- 修改插件前先检查 Git working tree；如果存在用户未提交的修改，不得覆盖或改动无关内容
- 升级前记录当前版本和目标版本
- 能先 dry-run、生成 diff 或预览修改时，优先不要直接做破坏性修改
- 不允许通过修改 DSH core 来掩盖插件本身的兼容性问题
- 如果某个 breaking change 的迁移方式不能高置信确定，就停止自动修改，并明确标记需要人工检查

## 运行时验证

仅仅 npm/pnpm install 成功、build 通过、typecheck 通过，并不能证明插件升级成功。完整的插件迁移至少应验证：

1. 依赖安装成功
2. build / typecheck / 插件自身测试通过
3. 使用真实 DSH profile 启动
4. 插件 entry 成功 activate
5. 插件依赖或提供的 Cordis service 没有停留在 pending 状态

如果真实 DSH 启动失败，保留原始报错，并尽量区分问题属于：

- 插件代码兼容问题
- dependency / package resolution 问题
- profile 配置问题
- DSH runtime 问题

## 背景

- 上游生态：[oh-my-dsh](https://github.com/LaplaceYoung/oh-my-dsh) —— DSH 的能力插件库
- DSH 插件约定：ESM 包，经 `cordis.yml` 挂载，遵循 interface / implementation / consumer 三段式接缝
- 插件规范：[dsh-community-standard](https://github.com/oh-my-dsh/dsh-community-standard) —— manifest / 契约坐标 / 协商；本 skill 的触点分类与其迁移指南对齐，引用其概念、不重复定义

## references/

| 文件 | 内容 |
| --- | --- |
| [README.md](references/README.md) | 卡片索引 + 新增一版卡片的格式规范 |
| [pre-flight.md](references/pre-flight.md) | 六类触点自查清单（含 ripgrep 检出模式与汇总模板） |
| [v0.1.2-alpha.1.md](references/v0.1.2-alpha.1.md) | 0.1.1 → alpha.1：12 张卡（含 APIProxy→`@Remote` 17 条操作映射表） |
| [v0.1.2-alpha.2.md](references/v0.1.2-alpha.2.md) | alpha.1 → alpha.2：4 张卡（`ignorable` 恢复、`RemoteError` 封装等） |

自测夹具：[examples/legacy-plugin/](examples/legacy-plugin/) —— 一个停留在 0.1.1 写法的
最小插件，覆盖六类触点；在上面跑 pre-flight 检出应六类全命中，再走一遍
「套卡片 → 分层验证」即可验证本 skill 是否好使。
