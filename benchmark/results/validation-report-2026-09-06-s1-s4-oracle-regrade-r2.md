# S1–S4 Oracle 定向修正与重评（2026-09-06，R2）

按要求修改 S1、S3 的 Oracle，修改 S2、S4 的评分 rubric，然后仅重评四份 Oracle。GPT-6 Astra 本次均给出 100 分；每份报告调用一次，没有为获得满分追加重试。**Luna 未重跑，也未重评。**

| 任务 | 本次改动 | 原 Oracle LLM 分数 | 本次 Oracle LLM 分数 | 原关键词 verifier 复核 |
|---|---|---:|---:|---:|
| S1-static-scan | Oracle | 80 | 100 | 100 |
| S2-negative-scan | Rubric | 90 | 100 | 100 |
| S3-snapshot-migration | Oracle | 80 | 100 | 100 |
| S4-legacy-client-imports | Rubric | 87.5 | 100 | 100 |
| 平均 | — | 84.375 | 100 | 100 |

原分数来自[首次 Oracle/Luna 验证](validation-report-2026-09-06-s1-s4-oracle-luna-llm-judge.md)。S1、S3 是答案修正，S2、S4 是评分口径修正；这张表用于记录校准变化。S2、S4 的新分数不能与旧 Luna 分数作为同一 rubric 下的成绩直接比较。

## 修改内容与裁判反馈

- **S1 Oracle**：补全源码 patch 的声明、目标路径及替换关系；说明事件 `ignorable` 的移除与恢复、可忽略事件的边界；修正固定 home/profile 路径、私有 UI 入口、未被调用的桥接服务及子进程输出解析的判断。明确两个 stdout 解析问题在 rc.2 已存在，以及静态检查与后续运行验证的边界。原 rubric 不变，本次九项均通过。见[修正答案](../tasks/S1-static-scan/solution/report.md)和[逐项裁决](s1-s4-oracle-regrade-2026-09-06-r2/grades/oracle/S1-static-scan.json)。
- **S2 rubric**：修正 `negative-coverage` 的语境解释。“无 patch 文件/声明”处于源码 patch 类别时，可以表示没有宿主源码 patch；不能仅因普通 composition 文件名含 `patch` 而扣分。明确否认实际文件存在、错误分类、缺乏扫描证据仍应扣分。Oracle 原文未改，裁判接受其类别结论与扫描范围，四项均通过。见[逐项裁决](s1-s4-oracle-regrade-2026-09-06-r2/grades/oracle/S2-negative-scan.json)。
- **S3 Oracle**：将 Cordis 的 `Context` 与 Session/Chat 领域快照类型分开；定位 manifest 中已经删除的注入依赖；补充 Chat legacy 的阶段性迁移、Session `running` 的归属，以及保留原有依赖 scope、slot 标识、顺序和销毁生命周期的 `slots.inject` 方案。原 rubric 不变，本次五项均通过。见[修正答案](../tasks/S3-snapshot-migration/solution/report.md)和[逐项裁决](s1-s4-oracle-regrade-2026-09-06-r2/grades/oracle/S3-snapshot-migration.json)。
- **S4 rubric**：统一 `runtime-removal`、`session-content`、`connection-face` 三项的闭卷边界。准确定位问题、匹配卡号、提出有依据的迁移方向，并将材料中缺失的精确包名、符号或签名留待目标版本核验，可以获得满分；单纯写“待确认”或编造替代 API 仍不合格。注册 ID 项及错误迁移断言的 70 分上限不变。Oracle 原文未改，四项均通过。见[逐项裁决](s1-s4-oracle-regrade-2026-09-06-r2/grades/oracle/S4-legacy-client-imports.json)。

评分文本的完整前后差异保存在 [rubric-changes.json](s1-s4-oracle-regrade-2026-09-06-r2/rubric-changes.json)。

## 执行条件与验证

- 继续复用用户授权的 Codex 登录；裁判为 `gpt-6-astra`、`high`，Codex CLI `0.153.3`，协议 `report-judge-v1`、传输 `codex-exec-v1`。四次调用均成功，工具调用总数为 0。模型名称由 CLI turn context 确认，事件流没有独立的服务端返回模型标识。
- 沿用首次成功评分的 `judge.mjs` 和 `codex-judge.mjs`，两个文件字节完全一致。本次按各题 `solve.sh` 的复制语义，将当前 Oracle 与原始 fixture 放入临时 app 目录，在宿主机评分；没有新增 Harbor/容器 trial。
- 四题 instruction、fixture、冻结参考摘录均未变。S1、S3 的整个评分 packet 哈希与首次一致；S2、S4 的 Oracle 字节一致。所有评分项 ID、权重、源码证据要求及 cap 均未改动。
- 已核对 packet、报告、请求、原始响应与评分实现的哈希，并从原始裁决重新计算分数；`reward.txt` 中的归一化奖励均为 `1`。原归档中的 51 份文件逐一通过哈希核验，包括全部 Luna 答案及评分。
- `npm run test:report-judge` 的 19 项测试通过，完整 `npm test` 通过。四份当前 Oracle 的原关键词 verifier 均为 100 分。

## 时间与用量

本轮只调用裁判，没有新增 Harbor trial，Harbor 的 solver token 和 trial 耗时不适用。
下表耗时来自本机 Codex native 轨迹的 `task_started` / `task_complete`，token 来自归档评分详情。

| Oracle | 裁判耗时/秒 | Input tokens | Output tokens |
|---|---:|---:|---:|
| S1 | 112.924 | 15,475 | 3,564 |
| S2 | 56.138 | 9,058 | 1,717 |
| S3 | 68.667 | 11,236 | 2,071 |
| S4 | 49.790 | 12,038 | 1,474 |
| 合计 | 287.519 | 47,807 | 8,826 |

四次调用从首次开始到最后完成共 267.517 秒（UTC 03:18:10.423–03:22:37.940，包含调度间隔）。
Cached input 为 0；reasoning output 为 623，已包含在 output 中，不重复相加。实际费用未提供。

## 证据与边界

本次证据独立归档，未覆盖首次结果：

- [评分汇总与使用量](s1-s4-oracle-regrade-2026-09-06-r2/summary.json)
- [一致性核验记录](s1-s4-oracle-regrade-2026-09-06-r2/verification.json)
- [文件 SHA-256 清单](s1-s4-oracle-regrade-2026-09-06-r2/manifest.json)
- [完整测试日志](s1-s4-oracle-regrade-2026-09-06-r2/checks/npm-test.log)

归档还包含四份候选答案、完整 packet、原始裁判请求/响应、逐项判分及冻结评分实现。更完整的本机 CLI/native 轨迹保留在 `/private/tmp/s1-s4-oracle-regrade-20260906-r2`；登录凭据未归档。

这次验证说明修正后的 Oracle 与对应 rubric 在一次实评分中一致。它没有测量重复评分稳定性或独立样本上的人工一致率，也没有验证真实上游 API、迁移代码运行效果或容器内 API verifier 路径。
