# S1–S4 report-judge pilot: implementation and offline validation

Date: 2026-09-06. Scope: a separate `report-judge-v1` pilot over the original S1–S4
prompts and fixtures. No judge-provider API was called. This is implementation and
offline calibration evidence, not a model benchmark or a measured LLM quality gain.

This records the initial offline stage. Later execution and Oracle/rubric changes
are recorded in the [live comparison](validation-report-2026-09-06-s1-s4-oracle-luna-llm-judge.md)
and [Oracle-only R2 report](validation-report-2026-09-06-s1-s4-oracle-regrade-r2.md).

## Delivered

- Four weighted semantic rubrics and frozen, source-labelled reference packets.
- A text-only, configurable OpenAI-compatible judge adapter with exact quotation
  checks and deterministic score aggregation.
- Independent Harbor verifier images, unchanged agent prompts/fixtures, verifier-only
  credentials, SHA-256 fixture integrity, and errors separated from scored zeros.
- Seven calibration reports per task: complete, reordered, keywords, wrong,
  prompt injection, fabricated citations and historical Oracle.
- Local old/new comparison runner; live mode requires explicit `--live` and a
  configured endpoint/model/key. Expected score ranges await live/human calibration.

## Validation

Commands executed:

```sh
npm test
npm run test:report-judge
node benchmark/scripts/validate-task-registry.mjs
node benchmark/scripts/validate-execution-contract.mjs
node benchmark/report-judge/prepare.mjs --out /tmp/s1-s4-report-judge-pilot-v1-ready
node benchmark/report-judge/calibrate.mjs --out /tmp/s1-s4-report-judge-offline-v1-ready
git diff --check
```

The full repository test passed. After adding prototype-key inventory coverage and
clearing stale rewards before external calls and fixing symlinked CLI entry paths, all 17 pilot test groups passed again.
The 54-task registry and execution-contract checks passed. All four generated TOMLs
were parsed with Python `tomllib`: version 2.0.0, separate verifier, verifier-only
configuration, with S4 retaining its original no-network agent policy. These tests
use injected API responses to validate the protocol; they do not measure semantics.

## Offline comparison (historical judges only)

| Task | Complete report | Reordered complete | Keywords only | Confidently wrong | Judge injection | Fabricated citations | Historical Oracle |
|---|---:|---:|---:|---:|---:|---:|---:|
| S1 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| S2 | 80 | 80 | 100 | 100 | 100 | 100 | 100 |
| S3 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| S4 | 70 | 70 | 100 | 70 | 100 | 100 | 100 |

There are 28 retained cases and zero live LLM scores. The keyword-only reports all
receive 100 under the original graders. S4's complete report explicitly rejects
unsupported lifecycle/inject changes, but its old regular expression still triggers
the 70-point hallucination cap. New LLM behavior on these cases remains unmeasured.

Evidence directories on this machine:

- `/tmp/s1-s4-report-judge-pilot-v1-ready`: generated tasks and `pilot-manifest.json`.
- `/tmp/s1-s4-report-judge-offline-v1-ready`: reports, packets, per-case JSON and summary.
- `/tmp/s1-s4-report-judge-npm-test.log`: full repository test output.

## Remaining verification

No judge provider/model has been selected or configured for this pilot. Run live
calibration after that is supplied, inspect disagreements, and obtain independent
human labels before claiming semantic grading is better or publishing skill deltas.
The Harbor executable is absent and Docker's daemon socket is unavailable on this
machine, so the generated Linux container workflow has not been run end to end.
There were no commits or pushes and no changes to the original S1–S4 task files.
