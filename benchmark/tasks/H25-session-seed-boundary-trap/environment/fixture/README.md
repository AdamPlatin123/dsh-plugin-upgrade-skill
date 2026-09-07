# Session seed boundary — handover note

This host-plane plugin creates and resumes forked sessions and feeds a
session projection that separates **inherited** events (from the fork
parent) from **own** events (produced by this session). The helpers live in
`/app/fixture/src/` and are the only place the plugin touches session
creation metadata.

## Helper contracts (must keep holding after migration)

1. `makeForkMeta(cut)` — the creation metadata for a fork whose inherited
   prefix has length `cut`.
2. `buildForkSession(id, seedEvents, cut)` — creates a FRESH fork: the seed
   is exactly the parent's events, so the inherited prefix length equals
   `cut` and the seed length.
3. `resumeForkSession(id, seedEvents, cut)` — resumes a fork whose ORIGINAL
   inherited prefix had length `cut`. The stored log has since grown, so
   `seedEvents.length` is LARGER than `cut`. The resumed session must still
   report the ORIGINAL `cut` as its inherited prefix.
4. `buildSession(id, seedEvents)` — an ordinary (unforked) session with no
   inherited prefix.
5. `eventPosition(n)` — an event sequence position.
6. `logOffset(n)` — a log offset / boundary length.
7. `makeProjection()` — a projection unit whose `init(header,
   inheritedCount)` starts from the inherited boundary and whose `apply`
   counts only the events at/after that boundary as own events.

## Version boundary

- The helpers were written against **dsh 0.1.2-alpha.3**, where the fork
  boundary was a `seedLength` field on the header metadata and positions
  were plain numbers.
- We are migrating to **dsh 0.1.2-alpha.4**, installed here as the exact
  published version. Its sources and type declarations are under
  `node_modules/@deepseek-ai/dsh-session/` — the first-party reference for
  the alpha.4 shapes.

## Scenarios that must both work

- Fresh fork: inherited prefix length = 3, seed length = 3.
- Resumed fork: ORIGINAL inherited prefix length = 3, stored log length = 8.
  The inherited prefix must still be reported as 3 — using the current log
  length instead would silently reclassify five own events as inherited.
- Unforked session: inherited prefix length = 0.
