# Semantic report judging: default for S1–S4, S10, S12 and S15

The registered `benchmark/tasks/` entries for these seven tasks now use
**LLM-as-judge by default**, at task version `3.0.0`, protocol `report-judge-v1`.
No generated pilot directory or extra enable flag is needed. This document keeps
its original filename so existing links remain valid.

The original [S1–S4 pilot comparison](../results/validation-report-2026-09-06-s1-s4-oracle-luna-llm-judge.md),
[R2 calibration](../results/validation-report-2026-09-06-s1-s4-oracle-regrade-r2.md)
and [2026-09-10 regex-scored Luna run](../results/validation-report-2026-09-10-codex-gpt-5.6-luna-s1-s10-s12-s15-no-skill.md)
are historical results under their own frozen graders. Do not combine those scores
with version-3 results, or compare skill conditions using different packets or
judge models.

The [seven-task Luna zero-skill run](../results/validation-report-2026-09-10-codex-gpt-5.6-luna-seven-semantic-no-skill.md)
uses the version-3 rubric through the Codex judge transport. The
[default-entry protocol checks](../results/validation-report-2026-09-10-default-semantic-verifiers.md)
separately cover Docker artifact transfer and API response handling with a local mock.

## Run the default task

Configure these variables through your local secret manager/environment before
running Harbor; never commit real credentials:

- `REPORT_JUDGE_BASE_URL`: the chosen OpenAI-compatible API prefix, e.g. ending
  at `/v1`; the adapter appends `/chat/completions`.
- `REPORT_JUDGE_MODEL`: the explicitly selected judge model or pinned snapshot.
- `REPORT_JUDGE_API_KEY`: the credential for that endpoint.

```sh
harbor run -p benchmark/tasks/S1-static-scan -a oracle
harbor run -p benchmark/tasks/S10-paste-rename-and-version-chip -a codex -m openai/gpt-5.6-luna
```

Choose a provider/model permitted to receive the fixture, reference excerpts and
candidate reports. Solver model and judge model are separate settings. No judge
provider/model is selected implicitly. The API must support non-streamed Chat
Completions with `response_format: {type: "json_object"}`; the verifier validates
the returned structure itself. HTTPS is required except for local development
endpoints. Redirects are rejected and server error bodies are never logged.
See the [Chat Completions reference](https://developers.openai.com/api/reference/resources/chat).

The task TOML declares `environment_mode="separate"` and supplies credentials
only under `[verifier.env]`. Agent prompts, fixtures and time limits are unchanged.
Harbor collects `/app/fixture` and `/app/agent-output` into the separate verifier;
the frozen packet and judge source are deployed with `tests/` only. The LLM gets
original task text, rubric, exact fixture text, frozen reference excerpts and
candidate reports. It gets no reference answer or out-of-band solver identity or
skill-condition label. Candidate text can identify its author, so this alone does
not guarantee complete blinding.

The model-free `skill-evaluation` CI controls run the six deterministic tasks in
that suite. S1 remains in the seven-task model suite; the control manifest lists
it separately under `semanticProtocolTasks`. The same CI job runs
`test:report-judge` for all seven semantic verifiers, with mocked responses and no
model credentials. This validates their protocol, not reference-answer quality.
The manual Actions model job has not been wired to a report-judge credential;
without explicit verifier configuration Harbor rejects it before any trial.
Use a separately authorized local API or Codex run for actual report grading.

## Criteria and scoring

| Task | Criteria / points |
|---|---|
| S1 | Seven located touchpoints 10 each; justified card mapping 20; scope/verification limits 10 |
| S2 | Located Host break 40; six negative categories 20; inference limits 20; proposed verification 20 |
| S3 | Chat projection, Session lifecycle, type/inject ownership, slot registration, justified mapping/plan: 20 each |
| S4 | Runtime removal, registration identity, session content, deleted connection face: 25 each |
| S10 | Paste naming/scope, live conflict state, stale-tag display, regressions, release hygiene: 20 each |
| S12 | Native-module owner, browser/host sequence, dist-tag resolution, exact alpha.5/TUI commands, README prevention: 20 each |
| S15 | Busy scope/trigger, slot boundary, attribution/isolation, fix/hardening, data-present regression: 20 each |

The LLM returns `pass`, `partial`, `fail` or `missing` for every criterion.
Deterministic code awards 100%, 50%, 0% or 0% of its weight and applies declared
caps; it ignores any total invented by the model. S4's 70-point cap requires a
positive unsupported lifecycle/inject assertion. Rejecting a bad example is not
an endorsement.

Judgment considers meaning across paragraphs, lists, tables and code. Synonyms,
negation, pseudocode and `expect` assertions may establish the same conclusion.
Bare keywords/card numbers and copied questions are not a diagnosis. S10's
extension/MIME and chip/upload-display guidance stays unscored, as its prompt
states. S15's rubric acknowledges contradictions in the supplied diff and accepts
grounded discussion of additional scope errors; it does not force a claim that
every hover addition is harmless.

Credit requires verbatim candidate evidence. Source-dependent criteria also need
an existing fixture path and verbatim source evidence. These checks prove quotation
existence, not semantic entailment; relevance remains the LLM's judgment. Reports
must identify the file or unambiguous function, expression, log entry or process
record. Candidate `path:line` citations are audited against sealed files; nearby
line drift alone does not invalidate a uniquely located diagnosis. No report code,
command or URL is executed.

## Submissions and evaluator failures

- Missing/empty reports, exact token-equivalent copies of the prompt, and fixture
  changes score zero without a model call. Shared prompt phrases are not removed
  from independent answers. More elaborate copying/injection is evaluated as
  untrusted text by the LLM.
- Complete fixture inventory and SHA-256, including hidden/new files, are checked
  against the verifier-owned packet. Candidate Git history is not trusted.
- Configuration/API/network errors, refusals, truncation and invalid evidence
  produce `details.json`, exit nonzero and leave **no reward file**. They are
  evaluator failures, not candidate zeros. Previous rewards are cleared before
  evaluation, including before a possible outer timeout.
- Successful grading writes scalar `reward.txt` and rich `details.json`. Reports
  are limited to 32 files / 256 KiB. Symlinks, special files and oversized
  submissions are rejected, never silently truncated.

## Maintain and freeze the verifiers

Edit `benchmark/report-judge/rubrics.mjs` and shared `judge.mjs`, then run:

```sh
npm run sync:report-judge
npm run test:report-judge
```

Synchronization materializes seven standalone judges, sealed packets, shell
entries, verifier Dockerfiles and task configurations. It removes superseded
keyword helpers. CI runs `--check` and rejects drift in the implementation,
fixture, instruction or referenced source bytes. Checked-in packets omit HEAD,
so unrelated commits need no regeneration; hashes seal the actual content.

Optionally freeze a separate run/regrade snapshot:

```sh
node benchmark/report-judge/prepare.mjs --out /tmp/report-judge-run
```

It creates the same default tasks plus a manifest. Output must be a fresh directory
outside `benchmark/tasks`; normal runs do not need this preparation step.

## Calibration

```sh
node benchmark/report-judge/calibrate.mjs --out /tmp/report-judge-offline
node benchmark/report-judge/calibrate.mjs --live --repeats 1 --out /tmp/report-judge-live
```

The first command only prepares samples and inputs; it does not call a model or
simulate semantic scores. The live command uses explicit API configuration and
makes 56 calls (seven tasks × eight samples) at one repeat; three repeats make up
to 168 calls. It stops at the first infrastructure/protocol failure, saving
completed evidence incrementally.

Samples cover complete/reordered answers, bare keywords, wrong claims, injection,
fabricated citations, copied prompts and the checked-in Oracle. Expected ranges
are calibration hypotheses, not independent human labels; Oracles have no assumed
score. Unit-test replies are protocol fixtures and do not establish semantic
quality. Inspect real false positives/negatives and disagreement before making
benchmark claims; do not tune only to visible examples. Preserve model identities,
packet/judge hashes and usage alongside scores.

## Regrade using a Codex login

The alternative host-side `codex-judge.mjs` transport uses the same packets,
rubrics and evidence checks, for an existing Codex login without an API key:

```sh
node benchmark/report-judge/codex-judge.mjs \
  --packet benchmark/tasks/S1-static-scan/tests/packet.json \
  --app /tmp/candidate-app --logs /tmp/candidate-grade \
  --model YOUR_AUTHORIZED_JUDGE_MODEL --bin /path/to/codex --effort high
```

`candidate-app` contains retained `fixture/` and `agent-output/` directories. For
a two-stage run, collect solver artifacts in Harbor with verification disabled,
then grade here using the same packet for every comparison group. This route does
not test the Docker API transport. `--model` is mandatory; authentication defaults
to `~/.codex/auth.json`, or the file selected by `--auth`.

Only that credential is copied into a temporary Codex home and deleted after the
attempt. User configuration, history and plugins are not copied. The judge has an
empty working directory, read-only sandbox, disabled tools/skills/memory and a
structured output schema. Non-text actions or an unsuccessful turn prevent
scoring. Input, schema, configuration, events, trace, final response, hashes and
usage are retained. The resolved model comes from CLI turn context, not an
independent server-returned ID. API and Codex transports are not presumed
interchangeable without a paired check.

For solver authentication use `CODEX_AUTH_JSON_PATH`, not
`CODEX_FORCE_AUTH_JSON=true`: Harbor 0.22.0 can redact literal `true` values in
exported artifacts. Damaged exports are infrastructure failures, not valid zeros.
