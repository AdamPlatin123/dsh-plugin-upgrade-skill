# S18-msvc-flock-trap · Windows Install Blocker (Static Read-Only Task)

The agent reads a Windows install-failure evidence kit (error log, dependency
manifest, lock-source excerpts) and diagnoses why `pnpm install` fails on a
machine without Visual Studio Build Tools, then writes a fix plan to
`/app/agent-output/S18-msvc-flock-trap/report.md` that avoids Visual Studio and
upstream changes. The trap: the failing native module (`fs-ext`, pulled by
`@deepseek-ai/dsh-session-persistence-jsonl`) is statically imported, so
`--ignore-scripts` cannot skip it — yet Windows never calls `flock` at runtime
(it locks with a named kernel semaphore), so the least-invasive fix is a pnpm
patch that skips the native build on Windows and provides a pure-JS fallback.
Tests "install-channel root-cause diagnosis + platform lock-path evidence +
patch-mechanism fix planning". See [instruction.md](instruction.md) for the task
statement and [tests/judge.mjs](tests/judge.mjs) for the grading logic.

- **Environment**: `node:24-bookworm` + git (read-only discipline gate); no dsh
  needed — this is a static report task.
- **Verifier**: report-content checkpoints (root cause 20, static-import trap 20,
  Windows lock path 20, pnpm-patch recipe 25, no-VS + card citation 15); plans
  that rely on installing Visual Studio are capped at 50, plans that rely on
  `--ignore-scripts` alone at 40; fixture modified → flat 0. The reward is
  normalized into `/logs/verifier/reward.txt`.
- **Oracle**: `harbor run -p benchmark/tasks/S18-msvc-flock-trap -a oracle`,
  expected reward 1.0.

```
environment/Dockerfile   # image: git baseline only (static task)
environment/fixture/     # evidence kit: error log, manifest, lock-source excerpts
tests/                   # judge.mjs + judge-utils.mjs + test.sh
solution/                # reference report + SOLUTION.md + solve.sh
```
