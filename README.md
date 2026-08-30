# dsh-plugin-upgrade-skill

DSH 插件生态的 **skill 合集仓库**，社区共建。

[DSH（DeepSeek Harness）](https://github.com/LaplaceYoung/oh-my-dsh) 是"一切皆插件"的 agent harness。本仓库收集与 DSH 插件相关的各种 agent skill——升级、审计、迁移、开发脚手架……欢迎贡献。

## 目录结构

```
.
├── README.md          # 本文件：仓库总览与贡献指南
└── skills/            # 所有 skill 都在这个目录下
    ├── README.md      # skill 编写规范与收录清单
    └── <skill-name>/  # 一个 skill 一个文件夹
        └── SKILL.md   # skill 主体（必须）
```

## Skill 索引

| Skill | 说明 |
| --- | --- |
| [plugin-upgrade](skills/plugin-upgrade/) | 升级 DSH 插件：盘点版本 → 评估 changelog → 迁移 cordis.yml → 执行升级 → 验证 |

## 如何贡献

1. 在 `skills/` 下新建文件夹，kebab-case 命名（如 `plugin-audit`）
2. 按 [skills/README.md](skills/README.md) 的规范编写 `SKILL.md`
3. 在 `skills/README.md` 的清单表格里登记你的 skill
4. 提 PR

## License

MIT
