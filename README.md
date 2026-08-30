# dsh-plugin-upgrade-skill

一个用于**升级 DSH 插件**的 agent skill。

[DSH（DeepSeek Harness）](https://github.com/LaplaceYoung/oh-my-dsh) 是"一切皆插件"的 agent harness，插件生态迭代很快。本 skill 让 agent 帮你把已安装的 DSH 插件安全地升级到新版本：从检查更新、阅读 changelog，到迁移配置、验证升级结果，一条龙完成。

## 能做什么

- **检查更新**：盘点当前 `cordis.yml` 中挂载的插件与本地版本，对照上游 registry / git 仓库找出可升级项
- **评估风险**：拉取目标版本的 changelog 与 release notes，总结 breaking changes，判断升级影响面
- **迁移配置**：插件 manifest（`cordis.yml`）变更时自动改写，配置项重命名/废弃时给出迁移建议
- **执行升级**：git pull / 包管理器升级，必要时按 changelog 指导修复接口（seam）层面的 breaking changes
- **验证结果**：升级后运行插件自带的测试 / typecheck / e2e 注册检查，确认插件在 DSH 中正常挂载

## 使用方式

把本仓库放到 agent 的 skills 目录即可被自动加载（例如 `~/.agents/skills/` 或项目级 `.agents/skills/`），然后在会话中直接提出需求：

```
帮我检查有哪些 DSH 插件可以升级
把 @oh-my-dsh/deep-research 升级到最新版
```

agent 会按「盘点 → 风险评估 → 迁移 → 升级 → 验证」的流程执行，breaking change 会停下来等你确认。

## 背景

- 上游生态：[oh-my-dsh](https://github.com/LaplaceYoung/oh-my-dsh) —— DSH 的能力插件库
- DSH 插件约定：ESM 包，通过 `ctx.effect()` / `ctx.on()` 注册，经 `cordis.yml` 挂载，遵循 interface / implementation / consumer 三段式接缝
- 升级插件时最需要小心的就是接缝（seam）API 的变更——本 skill 的评估环节重点覆盖这一点

## License

MIT
