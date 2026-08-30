# references/ · 按需加载的参考材料

> SKILL.md 保持精简，详细材料都在这里按需引用（见
> [skills/README.md](../../README.md) 编写规范）。

## 版本卡片索引

| 卡片文件 | 版本区间 | 卡数 | 要点 |
|---|---|---|---|
| [v0.1.2-alpha.1.md](v0.1.2-alpha.1.md) | 0.1.1(-rc.2) → alpha.1 | 12 | APIProxy→`@Remote`（17 条操作映射表）、`SessionEvent.ignorable` 移除、会话视图拆分、headless 输出语义、Profile 统一启动、WebFetch 默认开、4 张新能力卡 |
| [v0.1.2-alpha.2.md](v0.1.2-alpha.2.md) | alpha.1 → alpha.2 | 4 | `ignorable` 恢复（与 alpha.1 卡交叉引用）、`RemoteError` 统一封装、peer deps 裁剪、Node 24 修复 |
| **[v0.1.2.md](v0.1.2.md)** | **0.1.1 → 0.1.2 整合** | **8 BC + 4 行为 + 4 能力** | **完整迁移指南**：整合 alpha.1/2 + 社区实战（跨 cohort 共存、preview cohort 安装、完整验证清单） |

配套：[pre-flight.md](pre-flight.md)（升级前六类触点自查，含 ripgrep 检出模式）。

## 新增一版卡片的格式

DSH 每发一个版本，这里就需要一份新卡片（`vX.Y.Z-<suffix>.md`）：

1. 从官方 release notes + 上游架构笔记（`.agents/notes/`）提炼**插件相关**变更；
   对插件无触点的宿主内部变化收进文件尾注，不建卡，控制信噪比；
2. 每条变更一张卡，字段如下：

```markdown
### <RELEASE>-NN · 标题
- **类型**: breaking | behavior | capability | fix
- **影响触点**: #<触点编号，对应 pre-flight.md 的六类>
- **症状**: 升级后什么会坏/变
- **迁移配方**: 具体步骤；旧→新映射表（如适用）
- **验证**: 怎么确认迁移成功
- **来源**: 上游 release notes / 架构笔记链接
- **实战批注**（可选）: 真实迁移中观察到的与笔记不符的行为，注明日期与插件名
```

3. 规则：
   - ID 为 `<RELEASE>-NN` 顺序编号，不复用；
   - 每张卡至少一条一手来源；
   - 跨版本的波动（如字段删了又恢复）用卡片交叉引用记录；
   - 提 PR 时标题带版本号。
