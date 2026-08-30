# dsh-plugin-upgrade-skill

DSH 插件生态的 **skill 合集仓库**，社区共建。

[DSH（DeepSeek Harness）](https://github.com/LaplaceYoung/oh-my-dsh) 是"一切皆插件"的 agent harness。本仓库收集与 DSH 插件相关的各种 agent skill——升级、审计、迁移、开发脚手架……欢迎贡献。

## 特色

- **持续更新**: 支持 DSH 所有版本的升级迁移指导
- **社区共建**: 基于真实迁移实践，不断完善
- **结构化数据**: 版本卡片 + 触点检查清单 + 典型示例
- **即用即走**: 按需加载版本数据，不必一次读完整个文档

## 目录结构

## 快速开始

### 1. 使用 skill（推荐）

如果你的 agent 支持 skills：

```bash
# 使用 Vercel skills CLI
npx skills add oh-my-dsh/dsh-plugin-upgrade-skill

# 或直接在你的 agent 中引用
# 例如在 Claude Code 中："/skill plugin-upgrade"
```

### 2. 手动使用

1. 浏览 [skills/plugin-upgrade/](skills/plugin-upgrade/) 目录
2. 阅读 [SKILL.md](skills/plugin-upgrade/SKILL.md) 了解通用升级流程
3. 根据你的版本区间查看 [references/](skills/plugin-upgrade/references/) 中的版本卡片
4. 参考 [examples/](skills/plugin-upgrade/examples/) 中的典型示例

### 3. 升级流程示例

**场景**: 从 DSH 0.1.1 升级到 0.1.2

1. **检查触点**: 运行 [pre-flight 检查清单](skills/plugin-upgrade/references/pre-flight.md)
   ```sh
   rg -n "APIProxy|apiProxy" .
   rg -n "dsh-client-runtime" .
   # ... 其他检查
   ```

2. **加载版本卡片**: 阅读 [v0.1.2.md](skills/plugin-upgrade/references/v0.1.2.md)
   - 8 个破坏性变更
   - 4 个行为变更
   - 4 个新能力

3. **执行迁移**: 按卡片中的迁移配方修改代码
   - SDK 包迁移
   - APIProxy → Gateway
   - 错误处理更新
   - ...

4. **验证**: 运行测试和构建
   ```sh
   pnpm run build
   pnpm run test
   pnpm dsh --profile test
   ```

5. **参考示例**: 如遇问题，查看 [examples/](skills/plugin-upgrade/examples/)
   - [简单客户端插件](skills/plugin-upgrade/examples/01-simple-client-plugin.md)
   - [宿主侧插件](skills/plugin-upgrade/examples/02-host-side-plugin.md)
   - ...

## Skill 索引

| Skill | 版本覆盖 | 说明 |
| --- | --- | --- |
| [plugin-upgrade](skills/plugin-upgrade/) | 0.1.1 → 0.1.2 | 升级 DSH 插件：盘点版本 → 评估 changelog → 迁移 cordis.yml → 执行升级 → 验证；含宿主版本迁移分支（触点自查 + 版本数据卡片 + 典型示例） |

## 如何贡献

我们欢迎社区贡献新版本的迁移数据！

### 添加新版本迁移指南

1. 查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解格式规范
2. 在 [Issues](https://github.com/oh-my-dsh/dsh-plugin-upgrade-skill/issues) 中认领版本
3. 在 `skills/plugin-upgrade/references/` 下创建新版本卡片
4. 提交 PR，格式：`feat: add DSH vX.Y.Z migration guide`

### 添加新 skill

1. 在 `skills/` 下新建文件夹，kebab-case 命名（如 `plugin-audit`）
2. 按 [skills/README.md](skills/README.md) 的规范编写 `SKILL.md`
3. 在 `skills/README.md` 的清单表格里登记你的 skill
4. 提 PR

## 版本数据现状

| DSH 版本 | 状态 | 卡片数 | 贡献者 |
| --- | --- | --- | --- |
| 0.1.1 → 0.1.2-alpha.1 | ✅ 完成 | 12 张 | [@ccch1mneyyy](https://github.com/ccch1mneyyy) |
| 0.1.2-alpha.1 → 0.1.2-alpha.2 | ✅ 完成 | 4 张 | [@ccch1mneyyy](https://github.com/ccch1mneyyy) |
| 0.1.1 → 0.1.2 整合指南 | ✅ 完成 | 8 BC + 实战经验 | 社区贡献 |
| 0.1.2 正式版 | 🔄 待官方发布 tag | - | - |
| 0.1.2 → 0.1.3 | 🔄 待认领 | - | - |

[认领新版本跟踪 →](https://github.com/oh-my-dsh/dsh-plugin-upgrade-skill/issues/new)

## 参考资源

- [DSH 官方仓库](https://github.com/deepseek-ai/deepseek-harness)
- [Oh My DSH 插件库](https://github.com/LaplaceYoung/oh-my-dsh)
- [DSH 社区标准](https://github.com/oh-my-dsh/dsh-community-standard)
- [GitHub Discussion #5120](https://github.com/deepseek-ai/deepseek-harness/discussions/5120) - 社区迁移实践

## License

MIT
