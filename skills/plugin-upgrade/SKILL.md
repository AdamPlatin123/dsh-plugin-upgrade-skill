---
name: plugin-upgrade
description: 升级 DSH（DeepSeek Harness）插件的 skill。当用户想检查已安装插件的更新、升级某个插件到新版、或处理插件升级带来的 breaking changes 时使用。
---

# plugin-upgrade

把已安装的 DSH 插件安全地升级到新版本：从检查更新、阅读 changelog，到迁移配置、验证升级结果。

## 流程

1. **盘点**：读取 `cordis.yml`，列出已挂载插件与本地版本，对照上游 registry / git 仓库找出可升级项
2. **评估**：拉取目标版本的 changelog 与 release notes，总结 breaking changes，判断升级影响面
3. **迁移**：manifest（`cordis.yml`）有变更时改写；配置项重命名/废弃时给出迁移建议
4. **升级**：git pull / 包管理器升级；必要时按 changelog 指导修复接缝（seam）层面的 breaking changes
5. **验证**：运行插件自带的测试 / typecheck / e2e 注册检查，确认插件在 DSH 中正常挂载

## 原则

- 有 breaking change 必须停下来向用户说明影响并等待确认，不要直接升级
- 重点检查接缝（seam）API 变更：DSH 插件通过 `ctx.tools` / `ctx.effect()` / `ctx.on()` 注册，接口变更最容易导致挂载失败

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
