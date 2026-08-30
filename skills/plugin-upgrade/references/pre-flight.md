# Pre-flight 清单 · 升级前触点自查

> 用途：升级 DSH 宿主版本前，先弄清插件与宿主的接触面有多大。
> 六类触点与 [dsh-community-standard 迁移指南](https://github.com/oh-my-dsh/dsh-community-standard/blob/main/guides/migration.md)
> 的调研分类对齐。检出模式以 ripgrep 示意，等效 grep 即可。

## 使用方法

1. 先确定版本区间（from → to），到本目录（references/）按文件名序取版本卡片；
2. 对插件源码逐类跑检出，记录命中（文件 + 行）；
3. 按每类末尾的「去查哪张卡」索引，把命中的卡片集合汇总成迁移任务清单；
4. 六类全零命中 → 插件只经公共契约耦合，跑一遍烟测即可收工。

---

## #1 源码 patch / monkey patch

**查什么**: 改写宿主文件或函数的一切手段。

```sh
rg -n "cordis\.patch|patch\.yml|monkeypatch|monkey-patch" .
rg -n "DSH_HARNESS_SOURCE_ROOT|patch-surface" .
```

**命中意味着**: 宿主文件一旦移动/拆分/重命名，patch 直接失效——通常是最痛的
一类。

**去查哪张卡**: ALPHA1-03（会话视图拆分）；每版 release notes 的「其他变更」
节里出现「工程拆分/迁移」字样时必有新卡。

---

## #2 内部事件名

**查什么**: 硬编码订阅宿主内部事件字符串。

```sh
rg -n "SessionEvent|session/event|\.on\(['\"]|subscribe\(" src/
```

**命中意味着**: 事件字段增删波动会直接改变插件行为。

**去查哪张卡**: ALPHA1-02 / ALPHA2-01（`ignorable` 一删一复）。

---

## #3 内部服务探测（APIProxy / Remote / ctx.get）

**查什么**: 反射、结构探测、旧代理接口调用。

```sh
rg -n "APIProxy|apiProxy" .
rg -n "ctx\.get\(|ctx\.remote" src/
```

**命中意味着**: APIProxy 已整体移除（ALPHA1-01），这是 0.1.1 → 0.1.2 最大的
一个坑；Remote 调用则要按 RemoteError 重写错误处理（ALPHA2-02）。

**去查哪张卡**: ALPHA1-01（含 17 条操作映射表）、ALPHA2-02。

---

## #4 直接读写宿主目录

**查什么**: 往 profile、工作区、宿主配置目录写文件或读内部结构。

```sh
rg -n "DSH_HOME|\.dsh|profiles[/\\\\]" src/ scripts/
rg -n "(readFile|writeFile|mkdir).*profile" src/
```

**命中意味着**: 启动链路统一经 Profile 后（ALPHA1-04），目录解析假设可能
失配。

**去查哪张卡**: ALPHA1-04。

---

## #5 内部 UI / 命令注册

**查什么**: 注册视图、组件、命令到宿主内部结构。

```sh
rg -n "registerCommand|registerView|contributes" src/
```

**命中意味着**: 宿主 UI 工程拆分时注册路径失效；同时也是新能力的接入点
（提供方登录控件、第三方语言、子代理参数）。

**去查哪张卡**: ALPHA1-03（破坏面）、ALPHA1-08/09/10（机会面）。

---

## #6 子进程 / stdout 解析

**查什么**: spawn 宿主进程、解析其输出、包装启动。

```sh
rg -n "spawn|execFile|fork\(" src/
rg -n "headless|--profile" src/ scripts/
```

**命中意味着**: headless 输出语义变了（ALPHA1-05）、启动统一走 Profile
（ALPHA1-04）、平台级 workaround 可能过期（ALPHA1-12、ALPHA2-04）。

**去查哪张卡**: ALPHA1-04 / 05 / 06 / 12、ALPHA2-04。

---

## 特殊类别

**权限/审批类插件**（挂钩子到审批流的，跨 #2/#3）: 另查 ALPHA1-07——公网
WebFetch 默认开启后审批钩子的触发集合会变。

---

## 汇总模板

```markdown
## 触点体检结果（<插件名>，<from> → <to>）

| 触点类 | 命中数 | 代表文件 | 待查卡片 |
|---|---|---|---|
| #1 patch | | | |
| #2 事件名 | | | |
| #3 服务探测 | | | |
| #4 文件读写 | | | |
| #5 UI/命令 | | | |
| #6 子进程 | | | |

结论：迁移工作量预估 = <零命中=烟测 / 1-2 类=点改 / ≥3 类或含 #1=分支单独迁>
```
