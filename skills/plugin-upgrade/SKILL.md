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

## 背景

- 上游生态：[oh-my-dsh](https://github.com/LaplaceYoung/oh-my-dsh) —— DSH 的能力插件库
- DSH 插件约定：ESM 包，经 `cordis.yml` 挂载，遵循 interface / implementation / consumer 三段式接缝
