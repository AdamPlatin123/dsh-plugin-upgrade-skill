# legacy-plugin · 六类触点测试夹具

一个**故意停留在 0.1.1 时代写法**的最小插件，覆盖 pre-flight 清单的六类触点，
供 plugin-upgrade skill 自测与演示：

- 在 `examples/legacy-plugin/` 上跑 [pre-flight.md](../../references/pre-flight.md) 的
  六类 ripgrep 检出，应当**六类全命中**；
- 再按 [references/](../../references/) 的版本卡片走一遍「套卡片 → 分层验证」流程，
  每类触点都有对应卡片可套（ALPHA1-01/03/04/05、ALPHA2-01/02 等）。

> ⚠️ 代码为示意复原：API 按 0.1.1 → 0.1.2 迁移知识库（#1）中的旧写法编写，
> **不能编译是设计使然**——它存在的意义就是"被检出、被迁移"。

## 触点对照

| 触点类 | 命中位置 |
| --- | --- |
| #1 源码 patch | [cordis.yml](cordis.yml) · [patch.yml](patch.yml) · [scripts/apply-patch.mjs](scripts/apply-patch.mjs) |
| #2 内部事件名 | [src/index.ts](src/index.ts) · `session/event` 订阅 + `SessionEvent.ignorable` |
| #3 内部服务探测 | [src/index.ts](src/index.ts) · `ctx.get('apiProxy')` |
| #4 直接读写宿主目录 | [src/index.ts](src/index.ts) · `~/.dsh/profiles/default` |
| #5 内部 UI / 命令注册 | [src/index.ts](src/index.ts) · 内部路径 import + `registerCommand` |
| #6 子进程 / stdout 解析 | [src/index.ts](src/index.ts) · [scripts/apply-patch.mjs](scripts/apply-patch.mjs) · spawn `dsh headless` 解析 stdout |
