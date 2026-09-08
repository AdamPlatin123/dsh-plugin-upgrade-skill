# PR 草稿（人工审查用——此文件不提交、不推送）

## PR 标题

feat(plugin-upgrade): add runtime verification runner with signature-based verdicts

## PR 描述正文（复制以下全部内容）

## 变更摘要

- 新增 `scripts/verify-runtime.mjs`：把 SKILL.md「验证与报告」第 3 级（真实 DSH profile 冷启动、entry activate、Cordis service 不停在 pending）落成可执行的一键检查
- 新增 `scripts/verify-runtime.check.mjs`：离线自检（签名优先级链夹具断言），无需 dsh 环境，CI/本地可跑
- SKILL.md 验证清单第 3 级与 README 目录各加一处引用

## 方法：死端点确定性启动探测

在隔离的临时 `$DSH_HOME`（绝不触碰用户环境）里完成三级判定：

1. **安装**：`dsh plugin --profile verify add <spec>`（支持 npm 名 / git URL / 本地目录；npm 名先向官方 registry 查权威 `dist-tags.latest` 再装 pinned 版本）
2. **在列**：`dsh plugin --profile verify list` 输出含插件标识
3. **启动探测**：以 `DEEPSEEK_BASE_URL=http://127.0.0.1:9/v1`（端口 9，无监听）冷启动。依据：**DSH 在任何模型调用之前先断言插件树激活**——坏插件 ~1s 内报激活失败，好插件直到模型阶段才报传输错误。因此「传输错误」是「插件树已完整加载激活」的确定性通过签名：零 token、零密钥、判定与模型可用性完全解耦

失败按全量日志（非尾部窗口）签名分诊，优先级：宿主服务等待（仅 `webServer`，须换 web 宿主）> 模块解析崩溃 > 激活失败 > 传输签名（=通过），并输出四类归因：`plugin-code` / `dependency-resolution` / `profile-config` / `dsh-runtime`。声明了 `dsh.client.platform=web` 的客户端平面插件自动改走 web 宿主流（`dsh web` + 日志扫描）。

一个语义细节：插件等待一个**已被新宿主删除的服务**（如 `apiProxy`，discussion #5120 的核心症状）归因为 `plugin-code`（正是迁移要解决的问题）；只有等待 `webServer`（当前环境未启用的宿主服务）才归为环境问题。

## 与既有工作的一致性

- 本仓库 `docs/validation-report-2026-08-30.md` 的手工四幕验证中「第四幕：迁移后验证」正是本脚本自动化的环节；其复现指南为 4 步手工 shell，本脚本将其固化
- 与 #25（plugin-release skill + validate 加固）不重叠：那是发布流程与仓库校验；本 PR 是插件运行时验证
- 与 #12（dsh-upgrade-audit skill）不重叠：那是文档型审计 skill，无执行工具
- 与 [dsh-compat-guard](https://github.com/Shizuku-keop/dsh-compat-guard) 的 CI 矩阵互补：其 boot 冒烟用 `--dump-config`（配置组装级通过）；本脚本做真实启动 + 激活断言 + 失败归因，覆盖「静态检查全绿、运行时才炸」的场景（pending waiting for service 属运行时服务解析，`--dump-config` 不触发）

## 使用示例

```sh
node scripts/verify-runtime.mjs @scope/dsh-plugin     # npm 名（自动 pin 权威 latest）
node scripts/verify-runtime.mjs https://github.com/u/p.git
node scripts/verify-runtime.mjs ./my-plugin --json    # 机器可读输出
echo $?   # 0=pass 1=fail 2=inconclusive 3=skipped
node scripts/verify-runtime.check.mjs                 # 离线自检
```

## 已运行的验证

- `npm test`（= validate + manifests + verify-runtime.check 三连）：全绿——自检已接入 CI 路径，含 CLI 负例校验（NaN/越权 profile/未知 flag 均 exit 2）
- **五路对抗审查**（专项测试/可维护性/安全/红队/独立对抗子代理，约 26 项独立发现）驱动了一轮语义加固（见审查修复 commit）：
  - web 探测曾漏传 `--profile`（该路径全为假通过）——已修复并回归
  - 超时判定收紧为仅 `spawnSync ETIMEDOUT`；日志溢出（ENOBUFS）单独归为 inconclusive，绝不当作存活
  - 传输签名加否决条件（存在非传输 Error 行时不构成 pass，防插件自行打印传输词伪造）
  - 非 webServer 的服务等待与混合错误签名 → inconclusive（不再落入存活判过）；激活断言优先于普通等待（等待**已删除服务**仍是 `plugin-code`，即 #5120 迁移信号）
  - 破损插件 overlay（loader patch 解析失败）归因 `plugin-code`
- **Codex 跨模型交叉复审**（对抗 + 结构化双路；结构化路 P1 门禁 PASS）：又堵死两个伪造通道——日志溢出（ENOBUFS）现先于一切签名判定（截断头部的伪造传输行不再能通过）；错误否决覆盖 `TypeError`/`ReferenceError`/`ERROR` 等子类形态（Codex 实测复现过 `\bError\b` 的漏配伪造）。另修：git-url 安装的 web 平面识别、`~/` 路径展开后计算列表键、npm 钉扎结果以 `npmPinned` 暴露（镜像静默回退不再隐身）、清理失败报告残留路径
- **超时判定的错误否决交叉**（三个独立审查者一致点名后采取）：`pass-timeout-alive` 现要求日志既无失败签名也无任何非传输错误行；带错误噪声的超时降为 `inconclusive`（`timeout-with-error-signature`）
- **全链路真实验证**（隔离 K8s Pod + DSH 0.1.2-alpha.2，修复版回归）：
  - 旧写法插件（`inject: ["apiProxy"]`）→ `fail` / `activation-failed` / `plugin-code`，退出码 1
  - 迁移版（`inject: ["llm"]`）→ 三级全过 + `pass-timeout-alive`，插件 effect 真实执行，退出码 0
- 正控发现：旧写法插件在 0.1.1-rc.2 的 headless 最小 profile 下同样激活失败——`apiProxy` 属 web 宿主栈服务，宿主平面旧插件的正控需 web 形态（validation-report 的正控正是用 `dsh web` 跑的）

## 已知边界（诚实声明）

- **无内建沙箱——验证不可信第三方插件请在 Docker 一次性容器中运行**：`docker run --rm -it -v "$PWD":/w -w /w node:24-bookworm sh` 后在容器内执行本脚本，即可获得真实的文件系统/网络/进程隔离（这也是 `docs/validation-report-2026-08-30.md` 复现指南所用的形态）。直接在本机运行时，被验证插件以调用方完整权限与环境执行（仅 `DSH_HOME` 与工作目录指向临时区、模型端点为死端口），且 npm/git 安装生命周期脚本在探测开始前执行
- 仅 POSIX（信号与 shim 语义未在 Windows 验证）
- `pass-timeout-alive` 是 0.1.2 错误流契约（agent 对死端点静默重试）下的存活推断，且要求日志无失败签名、无非传输错误行；纯静默死锁与真存活无法区分，跨大版本日志文案漂移可能需要更新签名集（自检夹具锁定当前形态）
- 未做：`--docker` 内建模式、子进程环境白名单（凭据剔除）、进程组整树清理、正向激活证据标记——列为后续演进

## 致谢与来源

- 检测逻辑移植自一个稍后开源的私有插件测试基建（大规模真实插件批次上生产验证过）；方法本身与自检脚本在本 PR 内可独立复现
- 公开先例佐证形式可行性：[dsh-compat-guard](https://github.com/Shizuku-keop/dsh-compat-guard) 的 CI 兼容矩阵（安装+启动冒烟自动化）
- 死端点探测的实验依据（激活断言先于模型调用）与 #5120 症状形态一致，感谢 @tianyicui 发起征集、@zhu1090093659 的迁移痛点记录

---

## 审查提示（这部分不要粘贴进 PR）

- 分支：`feat/runtime-verify-runner`（7 commits 至 `fa6697f`；基于 upstream/main `e0dd212`。注：上游已合并 #25 至 `4e3f4d1`，本分支无冲突（#25 未动 plugin-upgrade 的 SKILL.md），开 PR 前可 rebase 或让 GitHub 自动合并）
- 上游 #25 已合并：PR 正文「与 #25 不重叠」段已按「已合并的互补工作」口径核对，无需改（若你想显式更新措辞可把该条改为「与刚合并的 #25（plugin-release 流程）互补」）
- 开 PR 时 base 选 `oh-my-dsh/dsh-plugin-upgrade-skill` 的 `main`；标题即上文第一行
- 验证环境备忘：.9 内网 K8s（kind 单节点）+ 节点本地镜像 `dsh-test-runner:latest`（内含 0.1.1-rc.2，npm 独立前缀装 0.1.2-alpha.2）；测试 Pod 用完即删
- 待办提醒：Codex 交叉复审通道待 `codex login` 后可补跑（review 技能的 Codex 对抗与结构化审查）
- pr-description.md 本身不提交不推送
