# H25-session-seed-boundary-trap reference solution

See [solution/src/fork-state.mjs](src/fork-state.mjs) — the alpha.4
migration of the fork-aware session state helpers. Expected judge score 100.

## The change

`dsh-v0.1.2-alpha.4` brands sequence positions and log offsets
(`SessionSeq` / `SessionLogOffset`, constructed via functions that throw
`TypeError` on anything but non-negative safe integers) and replaces the
alpha.3 `header.seedLength` with `meta.isSeeded` + a TOP-LEVEL
`inheritedEventCount: SessionLogOffset` (DSH-0.1.2-A4-04). The projection
definition's `init` now receives `(header, inheritedEventCount)`.

The two trap dimensions:

1. **Type fix ≠ semantic migration**: the alpha.3 helpers use plain numbers
   and `header.seedLength`; casts would silence nothing at runtime and the
   removed field is validated loudly (`session header has invalid field
   "seedLength"`). The migration must reconstruct the fork metadata through
   the real constructors — `SessionSeq(n)` for positions,
   `SessionLogOffset(n)` for offsets — and keep invalid inputs failing.
2. **Fresh fork vs resumed fork**: a resumed fork's stored log has grown
   past its original inherited prefix. `inheritedEventCount` must keep the
   ORIGINAL cut (3), not the current log length (8) — otherwise five own
   events silently reclassify as inherited and the projection counts wrong.

Correct migration:

- `makeForkMeta(cut)` → `{ meta: { isSeeded: true }, inheritedEventCount: SessionLogOffset(cut) }`;
- `buildForkSession` → `Session.create(..., header{...isSeeded}, inheritedEventCount)` (fresh fork: seed = parent events);
- `resumeForkSession` → `Session.fromRestore(..., header{...isSeeded}, inheritedEventCount)` (the ORIGINAL cut survives the grown log);
- `buildSession` → unseeded create (`isSeeded: false`, count 0);
- `eventPosition(n)` → `SessionSeq(n)`; `logOffset(n)` → `SessionLogOffset(n)` (invalid inputs keep throwing);
- projection `init(header, inheritedEventCount)` reads the boundary argument, `apply` counts events at/after it.

## First-party provenance

- Repository: `deepseek-ai/deepseek-harness`
- `dsh-v0.1.2-alpha.3` = `dd6322d604e00eec1ba5e0c8541159906a21094a`
- `dsh-v0.1.2-alpha.4` = `4e84901e6471b79ec0338099867ebb4606d12bb5`
- `packages/core/session/src/types.ts` (`SessionSeq` / `SessionLogOffset`
  brands + admission guards; `SessionHeader.isSeeded` replacing `seedLength`)
- `packages/core/session/src/index.ts` (`Session.create` /
  `Session.fromRestore` with `inheritedEventCount`; header validation
  rejecting `seedLength` and requiring `isSeeded`)
- `packages/session/session-projection/src/index.ts`
  (`ProjectionDefinition.init(header, inheritedEventCount)` —
  second parameter is a `SessionLogOffset`)
- `packages/core/agent/src/index.ts` / `packages/api/session-controller/src/commands.ts`
  (host-side consumers of the same boundary)
- Migration card: `DSH-0.1.2-A4-04`
  (`skills/plugin-upgrade/references/v0.1.2-alpha.4.md`)
- Published runtime the fixture pins: `@deepseek-ai/dsh-session@0.1.2-alpha.4`
  (exact; lockfile integrity fixed).

Every API shape was verified against the published package before the task
shipped, including the brand constructors' `TypeError` behavior and the
fresh/resumed `inheritedEventCount` distinction.

## Scoring

65 behavioral (real alpha.4 runtime: fresh fork cut 15 / resumed fork keeps
the original cut 20 / unforked session 10 / projection init+apply 10 /
valid construction 5 / invalid constructors throw 5) + 25 migration (no
stale seedLength 5, isSeeded without seedLength 5, inheritedEventCount
declared 5, SessionSeq for positions 5, SessionLogOffset for offsets 5) +
10 hygiene. Hard caps: module load failure → 30; as-cast bypass → 30;
constructors no longer throw → 40; swapped brand usage → 60; resume using
the current log length or firstLiveSeq → 65; isSeeded without count /
count without isSeeded → 40; stale seedLength kept → 70; alpha.3 pin → 20.
Flat 0: untouched fixture, sealed-file edits, or baseline rewritten. Full
model in [tests/judge.mjs](../tests/judge.mjs).
