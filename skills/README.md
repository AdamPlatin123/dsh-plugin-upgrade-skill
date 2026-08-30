# skills/

所有 skill 都放这里。**一个 skill 一个文件夹**，文件夹名用 kebab-case，见名知意。

## 编写规范

每个 skill 文件夹至少包含一个 `SKILL.md`：

```
skills/<skill-name>/
├── SKILL.md          # 必须。skill 主体
├── scripts/          # 可选。skill 可调用的脚本
├── references/       # 可选。参考文档，按需加载
└── examples/         # 可选。示例
```

`SKILL.md` 格式：

```markdown
---
name: skill-name          # 与文件夹名一致
description: 一句话说明这个 skill 做什么、什么时候触发。agent 靠它决定何时加载，写清楚触发场景。
---

# 标题

（正文：skill 的具体指令、流程、注意事项）
```

注意：

- `description` 是最重要的字段——它决定 agent 什么时候会用到这个 skill，务必写清触发场景
- 正文保持精简，详细参考材料放 `references/` 按需引用，不要一次性全塞进 `SKILL.md`
- skill 聚焦单一职责；一个 skill 做太多事就拆成多个

## 收录清单

| Skill | 说明 | 作者 |
| --- | --- | --- |
| [plugin-upgrade](plugin-upgrade/) | 升级 DSH 插件：盘点版本 → 评估 changelog → 迁移 cordis.yml → 执行升级 → 验证 | [@oh-my-dsh](https://github.com/oh-my-dsh) |
