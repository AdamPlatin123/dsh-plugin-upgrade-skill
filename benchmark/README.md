# dsh 插件迁移 benchmark（v1）

这个 benchmark 评测一件事：**agent 使用本仓库 `plugin-upgrade` skill 做 dsh 插件
迁移，到底比不用 skill 强多少**。六道题覆盖静态扫描、真实迁移、平面陷阱、baseline
归因与客户端平面契约，全部考点都来自卡片走廊和 2026-08-30 容器验证报告里被
证明过的真坑。

## 题目一览

| 题号 | 类型 | 考什么 |
|---|---|---|
| S1-static-scan | 静态 | 七类触点全埋的只读扫描：命中完整性 + 卡片映射 + 只读纪律（含 A1-02↔A2-01 走廊折叠） |
| S2-negative-scan | 静态 | 负向扫描：只命中 1 类触点时，能否说出「零命中 ≠ 兼容，须逐卡核对 + 真实验证」 |
| M1-host-migration | 容器 | 基础迁移：apiProxy 插件迁到 0.1.2-alpha.2 并真实激活（宿主平面直连领域服务） |
| H1-plane-trap | 容器 | 平面陷阱：源码里的误导注释诱导 `inject: ["remote"]`，正解是 `inject: ["llm"]` |
| H2-baseline-trap | 容器 | baseline 归因（R-06）：预存红测试要记录、要豁免，不许偷偷修掉 |
| H3-client-plane | 容器 | 客户端平面契约：浏览器插件必须补 `dsh.client` 声明才会进浏览器名册（症状静默） |

每题目录统一为：`task.md`（给 agent 的题面）、`fixture/`（插件源码夹具，含误导性
内容）、`judge.mjs`（程序判分）、`solution/`（参考解法 + 考点一句话）。

## 前置条件

- Docker 容器 `dsh-verify`（`node:24-bookworm`，dsh 0.1.2-alpha.2 全局安装）
  处于运行状态——M1/H1/H2/H3 的 judge 会真实进去装插件、冷启动、读日志。
  复现方式见 `docs/validation-report-2026-08-30.md` 第六节。
- 本机有 `git`、`node`（judge 零 npm 依赖）。

## 怎么跑

```sh
# 全部题目（无 agent 输出时全部 0 分，用于自测判分器本身）
node benchmark/run.mjs --all

# 单题
node benchmark/run.mjs --task M1-host-migration --agent-output benchmark/agent-output

# 判分结果：控制台表格 + benchmark/scorecard.json
```

## 怎么给 agent 用（评测协议）

1. **给 agent 的输入**：`benchmark/tasks/<题号>/task.md` 就是用户对 agent 说的话，
   按题面原样投喂即可；题面里已指明工作目录指向 `fixture/`。
2. **agent 的落点约定**（题面里也已写明）：
   - 静态题（S1/S2）：agent 只读 fixture，把报告写到
     `benchmark/agent-output/<题号>/` 下（文件名随意，.md/.txt/.json 均可）；
   - 容器题（M1/H1/H2/H3）：agent 直接修改 `tasks/<题号>/fixture/` 里的文件；
     H2 另需把迁移报告写到 `benchmark/agent-output/H2-baseline-trap/` 下。
3. **判分**：`node benchmark/run.mjs --all`，各题 judge 输出一行 JSON
   `{"score": 0-100, "max": 100, "reasons": [...]}`，run.mjs 汇总成表格并写
   `benchmark/scorecard.json`。

### with-skill vs without-skill 对照（隔离 skill 效果）

同一批 agent、同一批题，跑两轮：

- **with-skill 轮**：把本仓库 `skills/plugin-upgrade/` 作为 skill 挂给 agent
  （题面不变）；
- **without-skill 轮**：裸 agent，只给题面。

两轮分差即 skill 的净效果。建议每轮跑 3 次取中位数（容器题有环境噪声）；
判分前用 `git checkout -- benchmark/tasks/` 恢复 fixture 到基准态。评分细则与
题号 → 卡片/R 配方对照见 [docs/scoring.md](docs/scoring.md)。

## 判分设计要点

- **真激活才算过**：容器题 judge 把 agent 改后的 fixture 推进 `dsh-verify`，
  建独立 profile（`bench-m1`…）与独立 `/tmp` 插件目录，冷启动后以
  `pending (waiting for service: …)` / `plugin tree failed` / 启动推进到应用层
  作为判活信号；judge 跑完清理自建资产，不动容器里已有的 `/tmp/demo-plugin*`。
- **不依赖固定输出文本**：agent 的插件日志措辞不限，判据是宿主侧信号（如无 key
  时 headless 必输出 `MISSING_CREDENTIAL`，证明插件树已整体激活）。
- **错误容忍**：缺 `--agent-output`、容器不在、git 异常都按 0 分处理并在
  reasons 里说明，judge 自身永远 exit 0。

## 维护注意

- `fixture/` 一律 `"private": true`，README 注明「测试夹具，不得发布」。
- 新增 Markdown 里的卡片引用必须用完整 ID（如 `DSH-0.1.2-A1-01`），仓库
  `node scripts/validate.mjs` 会校验引用真实存在与相对链接有效性。
