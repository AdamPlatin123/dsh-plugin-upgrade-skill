# S1–S4 Oracle / Codex Luna 的LLM裁判验证 · 2026-09-06

四份原始Oracle与四份新生成的Luna报告均完成真实LLM评分，没有将模拟响应、
基础设施错误或Harbor未启用评分时显示的零分作为结果。Oracle均分**84.375/100**，
Codex + gpt-5.6-luna（未注入plugin-upgrade）均分**46.25/100**。

本报告保留首次评分时的答案和 rubric；后续修改及仅重评 Oracle 的结果见
[R2 报告](validation-report-2026-09-06-s1-s4-oracle-regrade-r2.md)。

这次能观察到语义评分的实际区别：S4的Luna报告列出了正确卡号，旧机制给100分，
新机制因迁移动作不完整给50分；S2虽然卡片和迁移说明有缺陷，但负向扫描和边界说明
仍获得部分分数，新评分从旧机制的40分升到60分。分数降低本身不构成质量证明。

## 对照结果

旧分数也来自本次相同报告，使用原judge的临时副本重算，仅替换本机测试目录。
它不是另一次历史Luna运行。两套评分代表不同标准，不混入原benchmark榜单。

| Task | Oracle旧评分 | Oracle LLM评分 | Luna旧评分 | Luna LLM评分 |
|---|---:|---:|---:|---:|
| S1-static-scan | 100 | 80 | 67 | 45 |
| S2-negative-scan | 100 | 90 | 40 | 60 |
| S3-snapshot-migration | 100 | 80 | 40 | 30 |
| S4-legacy-client-imports | 100 | 87.5 | 100 | 50 |
| **平均** | **100** | **84.375** | **61.75** | **46.25** |

Oracle是原始`solution/solve.sh`生成的报告，与原`solution/report.md`逐字节相同。
没有使用另行修正的calibration答案，也没有修改Oracle来追求满分。

| Task | Oracle主要扣分 | Luna主要扣分 |
|---|---|---|
| S1 | patch目标/组合区别、事件语义、公共UI入口核对及stderr说明不够完整 | 七类触点基本找到，但多张卡片映射错误，迁移与验证说明缺项 |
| S2 | “no patch file/declaration”没有区分实际存在的组合patch与源码patch | 未落实apiProxy已移除及正确服务迁移；未充分说明pending验收 |
| S3 | 错把ConversationSnapshot也指向cordis；slot示例缺少原scope生命周期说明 | 缺少chat legacy与Session生命周期分流、slot迁移及卡片映射 |
| S4 | 未给出Context的具体归属包 | 四张卡都列出，但类型替换、内容读取、激活验证及Remote方向均不完整 |

扣分是裁判按冻结rubric作出的判断。已核对其中提及的原报告内容；本次没有另做独立
专家标注或上游API复核，不能把裁判判断直接视为无争议的ground truth。
原始引用及逐项判分保留在本机，仓库仅保留本报告的结果汇总。

## 执行条件

- 基础源码commit：`2977e8fee1a3252c619fc98aa8f8192c28ddf1a6`；工作区已有pilot改动，实际材料以SHA-256为准。
- Harbor 0.22.0，Docker Desktop engine 29.7.2，Node 24.20.0，Codex CLI 0.153.3。
- Solver：`openai/gpt-5.6-luna`，`xhigh`，四题各一次有效运行；最大两个solver同时执行。
- 未传`--skill`，Harbor lock中每个agent的skills为空；关闭skill指令、bundled skill、记忆和网页搜索，并添加不读skill的指令。
- 保留原题提示与fixture；S1–S3各600秒，S4为1200秒，即原agent时限的2倍。四题均正常完成，没有超时。
- 原题网络策略保留：S1–S3为public；S4在no-network基础上仅为模型连接允许`chatgpt.com`。不声称四题都有网络层closed-book限制。
- 裁判：用户明确授权的OpenAI `gpt-6-astra`，`high`，复用Codex登录。每份报告只有一次有效评分，最多两个裁判并行。
- 两组使用相同`report-judge-v1`的packet、rubric、system prompt、计分代码和Codex适配层；全部八份通过引用校验，裁判轨迹均无工具调用。
- 评分在Host端独立执行：Harbor阶段关闭verifier，只收集`artifacts/app/fixture`和报告，再用冻结packet评分。不是容器内Chat Completions API verifier的端到端验证。

Codex适配层按[官方非交互运行文档](https://learn.chatgpt.com/docs/non-interactive-mode)
使用JSON事件和结构化输出。它替换调用方式，沿用已有引用校验和确定性计分；没有把
Codex写出的“总分”直接当作结果。CLI turn context确认实际配置为`gpt-6-astra`，
但CLI不暴露独立的服务端model字段，因此记录`resolved`并保留`returned: null`。

## Skill边界

本次满足**未注入plugin-upgrade**，不能称为严格零skill。Codex登录仍同步了原生插件
缓存：S2的一次广泛`rg -l`返回若干原生SKILL.md文件名；S3的一次广泛搜索实际返回
`product-design/audit/SKILL.md:61`的一行DOM snapshot操作说明，随后还读到了自身日志。
没有提供或读取plugin-upgrade及其迁移references，也没有在初始提示中发现skill目录。

这条原生skill读取是需要披露的执行偏差，不能声称本组完全没有skill文本。
若后续要做严格零skill对照，应进一步禁用插件同步，并在隔离环境中验证不存在可读的
原生skill文件后重新运行；本报告没有悄悄用补跑最高分替换某题。

## 时间与用量

以下只统计四次有效Luna运行及八次有效裁判评分，不包含废弃的基础设施尝试。
cache是input的子集，不重复相加。ChatGPT登录方式的实际账单不可从这些数据推出。

| Luna Task | Trial总耗时/秒 | Agent耗时/秒 | Input tokens | Cached input | Output tokens | Harbor成本估算/USD |
|---|---:|---:|---:|---:|---:|---:|
| S1 | 187.573 | 179.884 | 171,372 | 141,568 | 7,901 | 0.01827336 |
| S2 | 195.339 | 188.648 | 207,906 | 174,592 | 8,269 | 0.02007744 |
| S3 | 430.813 | 244.393 | 951,222 | 861,440 | 11,097 | 0.04850160 |
| S4 | 302.283 | 107.080 | 110,300 | 76,032 | 4,776 | 0.01410544 |
| **合计** | **1,116.008** | **720.005** | **1,440,800** | **1,253,632** | **32,043** | **0.10095784** |

Luna有效job墙钟耗时430.896秒（约7分11秒），与并行agent耗时之和不同。
八次裁判合计input 97,138、cached input 0、output 18,132 tokens；其中记录的reasoning
output为2,698，属于output，不另加。没有可核实的裁判实际费用。

Trial 总耗时按 Harbor `started_at` / `finished_at` 计算，包含环境准备、排队与产物收集，
与 agent 执行耗时和并行 job 墙钟时间分开。四次 Oracle trial 总耗时依次为
9.679、9.768、6.268、13.020 秒；Oracle 只复制报告，不调用 solver 模型，Harbor token
字段均为 null。Oracle 组最早开始至最后完成共 29.211 秒。原始时间戳与使用量已在本机
Harbor trial 记录中核对。

## 异常处理

1. 初次Luna使用`CODEX_FORCE_AUTH_JSON=true`。Harbor把这个值视作敏感信息，将导出的
   报告、fixture以及JSON里的字面量`true`全部替换为`[REDACTED]`，破坏了结果与只读验证。
   这不是模型修改fixture。该批四次Luna尝试排除；Oracle没有这个认证变量，产物完整。
   改为`CODEX_AUTH_JSON_PATH`后重跑四题，原提示、fixture、模型与时限不变。
2. Codex将启动warning也发成`item.completed/error`。适配层前两次启动S1 Oracle时误把它
   当成工具动作并终止，没有有效分数。修正事件分类后，用同一最终适配层完成八份评分；
   fatal error、tool call、截断和无效引用仍会失败，不产生默认零分。
3. 自动审批最初要求明确授权GPT-6 Astra接收评分材料。用户明确授权后才继续调用。

## 记录与验证边界

仓库只保留结果报告。冻结材料、候选报告、请求/响应、逐项评分及日志保留在本机，
未打包或纳入本次 PR。原始运行目录为 `/private/tmp/s1-s4-live-20260906/`，
有效 Luna job 为 `jobs/luna-no-skill-clean/`，最终裁判输出为 `grades-v3/`。
使用方法见[评分试点说明](../docs/report-judge-pilot.md)。

请求未额外提供候选模型、skill条件或参考答案；S3 Oracle原文标题自带“Reference Answer”，
为保持原文而保留，因此本次并非完全盲评。

验证：`npm test`通过，包含19项report-judge测试；任务注册表与execution-contract验证均
通过，仍为54道题；八份报告哈希、冻结packet、最终裁判实现和计分结果均复核一致。

本次证明流程可运行，并给出了有证据的具体评分差异。要判断它是否普遍优于关键词
匹配，仍需真实运行关键词堆砌、错误答案、同义改写和注入样本，再做重复评分及独立
人工标注对照；此前离线构造样本与协议mock不能替代这一步。
