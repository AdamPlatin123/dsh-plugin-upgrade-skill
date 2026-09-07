# H25-session-seed-boundary-trap · Session Seed Boundary

The agent migrates a fork-aware session state helper from alpha.3 to
alpha.4: the durable fork boundary (`header.seedLength`) becomes
`isSeeded` + top-level `inheritedEventCount`, positions and offsets become
branded `SessionSeq` / `SessionLogOffset`, and the projection `init`
receives the inherited boundary. The core trap: a FRESH fork looks correct
with the current log length as the cut, but a RESUMED fork (stored log
grown past the original prefix) exposes the difference — the ORIGINAL cut
must survive, or own events silently reclassify as inherited.

- **Environment**: `node:24-bookworm` + git; `/app/fixture` ships the
  alpha.3 helper module, a local verification app, and the exact pinned
  first-party closure `@deepseek-ai/dsh-session@0.1.2-alpha.4` (committed
  lockfile, `npm ci` at build time; the agent phase needs no network). The
  fixture and `node_modules` are committed as a git baseline — the judge
  seals everything except `fixture/src/**` and `fixture/package.json`
  (dependency edits scanned, not trusted).
- **Verifier**: deterministic. 65 behavioral against the real published
  alpha.4 package (fresh fork cut, resumed fork original cut, unforked
  session, projection init+apply, valid + invalid brand construction) + 25
  migration (no stale `seedLength`, `isSeeded` correct, `inheritedEventCount`
  declared, `SessionSeq` for positions, `SessionLogOffset` for offsets) +
  10 hygiene. Hard caps: module load failure → 30; as-cast bypass → 30;
  constructors no longer throw → 40; swapped brand usage → 60; resume using
  the current log length / `firstLiveSeq` → 65; `isSeeded` without count /
  count without `isSeeded` → 40; stale `seedLength` kept → 70; alpha.3 pin
  → 20. Flat 0: fixture untouched, sealed-file edits, or the baseline
  rewritten.
- **Oracle**: `harbor run -p benchmark/tasks/H25-session-seed-boundary-trap -a oracle`, expected reward 1.0.

```
environment/fixture/   # alpha.3 fork-state helpers + verification app + pinned closure
tests/                 # judge.mjs + judge-utils.mjs + judge-utils.test.mjs + test.sh
solution/              # alpha.4 migration + solve.sh
```

Distinct from H20 (`Session.events` removal — how to READ the log): this
task is about what session numbers MEAN and how the fork cut is stored —
the sequence/offset distinction plus the seed/fork metadata migration.
