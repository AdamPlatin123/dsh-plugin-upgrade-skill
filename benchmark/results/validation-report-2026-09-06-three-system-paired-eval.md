# Three-system paired evaluation of the RL-optimized plugin-upgrade skill (2026-09-04/06)

**Snapshot**: `oh-my-dsh/dsh-plugin-upgrade-skill@9940b05` (42 Harbor tasks, frozen for the whole run)
**Skill under test**: `skills/plugin-upgrade/` plus a 7-round RL-optimized `references/precision-checklist.md` (and `scripts/inject-lint.mjs`)
**Stacks**: opencode · DeepSeek-v4-pro (official API); opencode · deepseek-v4-flash-vision-exp (OpenCode Go gateway); Claude Code · glm-5.3-flash (Anthropic-protocol relay)
**Protocol**: BENCHMARK-AUTH-v1 single-shot unattended; n=1 per arm (M8/M10 additionally n=3 median); activation judged on host-side signals only

## 1. Headline numbers

| Stack | without-skill | with-skill | Δ |
|---|---|---|---|
| opencode · v4-pro | 0.547 | 0.652 | **+0.105** (31 hands-on tasks) |
| opencode · v4-flash-vision-exp | 0.56 | — (gateway monthly quota hit mid-run) | — |
| Claude Code · glm-5.3-flash | — | **0.73** (21/41 at 1.0) | +0.17 vs the flash baseline |

## 2. Findings

1. **The skill's net effect is knowledge injection, not reasoning.** Every delta concentrates in card-ID citations, exact peer carets, inject recomposition and citation contracts; hands-on basics saturate both arms. This independently confirms the 09-01 calibration report.
2. **Claude Code + glm-5.3-flash (thinking) + the optimized skill is the strongest stack tested** — and it avoids an opencode-specific failure mode (static-task early exit; H4 goes 0→1 on cc).
3. **v4-flash-vision-exp does not lower the closed-book baseline** (0.56 ≈ v4-pro's 0.55): the #102 weak-model hypothesis does not hold for this model.
4. **M8/M10/M11/M12 sit at a stable 0.4 plateau across all three stacks.** The expected `dsh.client.inject` set is implied by the plugin's product shape and is not derivable from its imports (oracle sources import renderer while the judge expects primitives/slots). This is task-inherent sampling variance, not missing skill coverage — removing the M11/M12 judge cap (#167) leaves the same agent-side variance.

## 3. Judge defects found (all verified against oracle in-container)

1. **M11/M12 cohort cap** — peers filter `@deepseek-ai/` swallows `cordis@^4.0.1` into the 0.1.2-alpha regex → permanent `min(score, 40)`. The reference solution scores 0.4 for the same reason. Fix in #167 (one line: filter `@deepseek-ai/dsh-`, as M9 already does).
2. **M5 activation failure** — a correctly-migrated plugin (matching the reference solution) still reports `plugin tree failed`; the reference solution scores 0 as well. Judge install/boot path, not agent error.
3. **M5/H8 malformed failure-branch output** — the `baseline-mismatch` / `fixture-unchanged` branches produce output that crashes harbor's VerifierResult validation → forced 0.
4. **H8 verifier performance** — serial per-plugin cold boots exceed 3600s (verifier×6.0) while the agent completes all four acts (6.2MB trajectory); the verifier needs parallelization.

## 4. RL trajectory (7 rounds, rule → closed failure mode)

| Round | Rule added | Breakthrough |
|---|---|---|
| R1 | exact cordis caret table, inject module table, locale pairing, A1-08 placement, citation contract | M6 0.4→0.98 |
| R2 | landing discipline (fixture write-back + report on disk), dead-reference sweep, R-01 trigger widened | M6/M7→1.0; recovered 3 zero-score landing failures |
| R3 | read-only-task exception (the report IS the deliverable) | H4 0→1 |
| R5 | type-only imports go to peers, not inject; product-shape inject table | inject correct on 3 stuck tasks |
| R6 | renderer's double role (consume slots → slots in inject + renderer wiring + peer; host → renderer in inject) | M9→1.0 |
| R7/R8 | `import type {} from '…ui-renderer/client'` as the load-bearing wiring; n=3 medians | M8/M10 confirmed a stable 0.4 plateau |

## 5. Limitations

- n=1 per arm for most cells (M8/M10 n=3); run-to-run variance is real but unquantified (M7 swings 1.0↔0.4 between runs on cc+glm).
- Static-task judges are keyword sieves (known upstream design); content scores were not manually re-graded.
- The runner cannot reach github.com / downloads.claude.ai — two custom harbor adapters install agents from npm instead; container-root residue must be cleaned between batches.

## Appendix: reproduction notes

harbor 0.22.0; custom adapters `OpenCodeNode24` / `ClaudeCodeNode` / `OpenCodeGo` (install agents via npm; `@ai-sdk/anthropic` with a `/v1`-suffixed baseURL for the gateway). Gateway auth needs `x-api-key` + a real user-agent + `x-opencode-session`; its monthly quota is account-wide and 5 concurrent large-prompt trials trip the abuse detector. Network allowlist per arm: the model host + registry.npmjs.org (+ github.com / raw.githubusercontent.com where reachable). Per-trial rewards, verifier logs and trajectories for all ~200 trials are preserved on the runner and can be shared on request.
