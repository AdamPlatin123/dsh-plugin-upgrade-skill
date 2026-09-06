# S17 · External UI Plugin Onboarding Trap

Static, read-only. A user hand-writes a new external web UI plugin and inserts it into a
running web profile (profile node_modules + `cordis.patch.yml` insert). The first boot
kills EVERY plugin's registration with a browser error naming an innocent first-awaited
entry (the real culprit: one raw-ESM client bundle failing the whole classic-script
combo); the repackaged plugin then fails apply on a cross-entry slot declaration; and the
dev loop itself bites (combo assembled once at boot — every edit needs a full host
restart, and on Windows an improper stop leaves the port bound, EADDRINUSE).

Derived from a real 2026-09-04 incident: hand-writing `@lhh010/dsh-profiles` onto a
source-launched dsh 0.1.3-alpha.1 web profile on Windows (misattributed combo failure →
ModuleLoader repackaging → cross-entry slot declaration → tree-kill restart discipline).

- Type: static / read-only report
- Score: 5 aspects × 20 points; every listed condition within an aspect is required.
  Explicitly wrong operational advice or a failed fixture-integrity check → 0.
  The deterministic prose rubric reports missing conditions; it is not a general semantic evaluator.
- **Oracle**: `harbor run -p benchmark/tasks/S17-external-ui-plugin-onboarding-trap -a oracle`, expected 1.0.
- See `instruction.md` for the brief, `solution/SOLUTION.md` for the reference answer.

Run `npm run test:s17-judge` for the isolated judge and verifier regressions (also included
in `npm test`). The verifier only reads agent artifacts; it never installs counter-example
or oracle reports into the answer directory and does not require `/solution/`.
