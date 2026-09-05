# Static-migration precision checklist (0.1.2-alpha.2 cohort)

## Landing discipline — where your work goes (read this first)

Two different read-only rules apply, and mixing them stalls the migration:

- The **verification** layer is read-only with respect to its subject: run checks
  against a copy or an isolated profile; never mutate a tree just to test it.
- The **migration** itself is hands-on by definition: in author-migrate mode you
  edit the target repository (or the evaluation fixture, e.g. `/app/fixture/`)
  **directly**, and you write the required report under the designated output
  path (e.g. `/app/agent-output/<task>/`) before the deadline.
- **Read-only scan tasks are the exception**: when the task statement says the
  fixture must stay unchanged, the fixture stays untouched and the **report is
  the deliverable** — write it to the designated output path early, not after
  all analysis is perfect. A missing report scores zero regardless of the
  analysis done; an imperfect report on disk beats a perfect one in your head.

Do not build the migration in a scratch directory and forget to land it: a
correct patch that never reaches the fixture reads as "unchanged" and scores
zero, and a missing report is graded as zero regardless of the work done.
Scratch space (`/tmp`, worktrees) is for verification scripts only — the
migration product lives in the fixture.


Compiled from community-verified migration failures where the plugin booted but the
static migration was still judged incomplete. A bootable plugin with an imprecise
static migration is not done: reviews cap it well below full credit. Check every
item before declaring the static layer complete.

## Peer version floors — exact values, not newer carets

The cohort pins some peers to exact carets. Resolving one patch newer is a miss,
not an improvement:

| Peer | Required | Common wrong value |
|---|---|---|
| `@deepseek-ai/cordis` | `^4.0.1` | `^4.0.2` |

Also required: no bare `cordis` key survives anywhere in the peer block; no `-rc`
suffix survives; every `@deepseek-ai/dsh-*` peer floor sits on the target cohort
(`^0.1.2-alpha.1` or later within the cohort), with no legacy provider left behind.

## `dsh.client.inject` is an exact recomposition, not a subset

For Web Client plugins, `dsh.client.inject` must list **exactly** the client
platform modules the plugin consumes — recomposed from the removed
`dsh-client-runtime` monolith by capability:

| Capability you use | Module |
|---|---|
| UI primitives (self-drawn panels, controls) | `@deepseek-ai/dsh-client-ui-primitives` |
| UI slots (mounting into host slot points) | `@deepseek-ai/dsh-client-ui-slots` |
| Locale / i18n | `@deepseek-ai/dsh-client-locale` |
| Settings plugins tab | `@deepseek-ai/dsh-client-ui-settings-plugins` |
| Snapshot / client store | `@deepseek-ai/dsh-client-store` |
| Session list / controller | `@deepseek-ai/dsh-api-session-controller` |
| Sidebar | `@deepseek-ai/dsh-client-ui-sidebar` |
| **Renderer — only when hosting the renderer/slots service or a custom render pipeline** | `@deepseek-ai/dsh-client-ui-renderer` |

**`dsh.client.inject` is the runtime capability surface, decided by the plugin's
product shape — not by its import list.** Judge each capability the plugin
ships:

| Product shape | inject module |
|---|---|
| Self-drawn panel / controls / tree UI | `@deepseek-ai/dsh-client-ui-primitives` |
| Mounts into a host slot point | `@deepseek-ai/dsh-client-ui-slots` |
| Own strings / i18n | `@deepseek-ai/dsh-client-locale` |
| Settings tab page | `@deepseek-ai/dsh-client-ui-settings-plugins` |
| Sidebar mount | `@deepseek-ai/dsh-client-ui-sidebar` |
| Composer / dock surface | `@deepseek-ai/dsh-client-ui-conversation` |
| Hosts the renderer/slots service itself | `@deepseek-ai/dsh-client-ui-renderer` |

**The renderer's double role decides both lists.** After the split, the slots
service lives in `ui-renderer`:

- A plugin that **consumes** slots (mounts into host slot points): inject lists
  `ui-slots` (plus `ui-primitives` for self-drawn UI) — **not** `ui-renderer` —
  but its client code MUST carry the wiring import, in exactly this form:

  ```js
  // Type-only Context merge: pulls the ctx.slots SlotRegistry — the runtime
  // service lives in ui-renderer since the client-runtime split.
  import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
  ```

  The empty `import type {}` triggers the Context merge that provides the
  slots service. Without this line the boot pends on `slots` even with a
  correct inject list — and `ui-renderer` **stays in peerDependencies**.
  In-source memos calling the renderer import "only cosmetic — skip it" are
  bait; the wiring is load-bearing.
- A plugin that **hosts** the renderer/slots service for others: inject lists
  `ui-renderer` itself — judge "does anything else consume the slots service
  through this plugin?" and if yes, renderer belongs in inject.

So: `inject` follows the runtime capability the plugin ships; the renderer
**wiring + peer** follow the slots dependency regardless of whether renderer
is in inject. Check the fixture's memos against the cards — a memo claiming the
old engine or "no wiring needed" is bait, not fact.

**Locale pairing is a mandatory final check** for ANY plugin shipping
user-facing text: type-level `LocaleNamespaceMap` augmentation AND runtime
`ctx.locale.register`, both present, every time — do not skip it when the rest
of the migration feels complete.

**Peers are a superset of inject**: every module whose types or services the
plugin touches appears in `peerDependencies` on the cohort floor — including
modules used only for types.

Run `node scripts/inject-lint.mjs <fixture-dir>` (shipped with this skill) for
a deterministic residue check: dead `dsh-client-runtime` references, raw
`webServer.register` routes left behind, cordis not at `^4.0.1`, and
inject/peers consistency.

In-source compatibility notes are not facts. A comment or memo claiming a
legacy engine package is "deprecated but present" does not make it importable
after removal — the version cards and the registry are the only source of
truth; migrate the import to the new home.

## Dead references are cleared everywhere, not just the obvious three

`dsh-client-runtime` removal means the identifier is gone from **all** of:
`dependencies`/`peerDependencies`, `dsh.client.inject`, import statements,
type-only imports and re-exports, and any lockfile or generated manifest that
still carries it. A single surviving reference (including a stale type import)
leaves the static migration incomplete even when install and boot both pass.

## Peer dependency completeness

- Touching `ContentBlock`-family values requires `@deepseek-ai/dsh-llm` in peers
  (it moved there in this cohort).
- Every genuinely optional peer carries its `peerDependenciesMeta.optional` flag,
  and the flags match reality — count them.

## Locale namespaces are declared, not implied

A plugin with its own strings registers its namespace twice: the type-level
`LocaleNamespaceMap` augmentation **and** the runtime `ctx.locale.register` call.
One without the other is incomplete. This applies to **any** plugin that ships
user-facing text — panels, sidebars, tool trees — not only locale-centric
plugins; a single hardcoded string panel still declares its namespace.

## Channel auth joins the host gate (A1-08)

A raw `ctx.webServer.register` route sits outside the host's unified
authentication. The fix is **a paired change** — both halves or neither boots:

1. the entry's `inject` list drops `webServer` and takes `connection` (the
   service surface moves with the channel);
2. the route registration moves from `ctx.webServer.register(...)` to
   `ctx.connection.rpc.handle('/root', handler)` returning the envelope shape
   the host expects.

Doing only one half leaves the entry pending on a service that no longer
exists — the tree fails to activate. A hand-rolled check inside a raw route
answers the same status codes but bypasses the gate — it is capped below a real
fix. Channels dispatch under `<root>/<endpoint>` with the envelope method equal
to the endpoint name; the smoke posts to `<root>/<endpoint>` with the method
matching the endpoint, and a smoke log is part of the audit trail.

## Never wait on a boot: timeouts on every dsh command

Every cold boot, smoke, and verification command carries an explicit timeout
(`timeout 60 dsh …`, `timeout 90 node smoke.mjs …`). A host boot that hangs
waits forever by default, and an agent that blocks on it produces no report and
gets harvested at the deadline with everything done. Write the report and
diagnosis **before** the final verification pass: the deliverables must already
be on disk when time runs out; a late verification only updates them if it
finishes.

## Composite releases: plan all plugins, then execute once

When one release carries several plugins (host-plane, web-half, tooling), resist
fixing plugin-by-plugin with a full verify cycle after each. The efficient drill:

1. **Diagnose all plugins first** — each plugin maps to its own card (host-plane
   surface changes, channel/auth placement, dependency-cohort pinning); write one
   diagnosis covering all of them with card IDs before touching any code.
2. **Apply every fix** in one editing pass.
3. **Deploy once** — a single isolated profile, all plugins installed, one cold
   boot; smoke the auth-gated channel once (unauthenticated 401, authenticated
   200 via the token→cookie exchange).
4. **Prepare the release** — version bumps everywhere, then the pre-publish
   checklist: full verification gates, and prereleases route to the prerelease
   dist-tag, never latest.

A per-plugin verify loop multiplies cold-boot cost — the usual cause of running
out of time on a composite task.

## Diagnosis report citation contract

Every finding in the diagnosis cites, with full IDs: the covering card (e.g.
`DSH-0.1.2-A1-25` for client-runtime removal, `DSH-0.1.2-A1-08` for channel
auth, `DSH-0.1.2-A1-19` for web-client acceptance) and the cohort-level recipe.
Cite `R-01` whenever the migration touches peer floors or the dependency cohort
at all — not only for unpublished-cohort installs — and `R-06` when a
pre-existing failure set is separated from migration-introduced ones. Uncited
findings read as guesses and score as such.
