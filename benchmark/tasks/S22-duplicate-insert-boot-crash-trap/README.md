# S22 · The Duplicate Insert That Crashed the Boot

Static, read-only. A maintainer upgrades dsh to 0.1.5-alpha.2, finds the right-Sidebar
document tab's content read unavailable, and manually inserts the workspace-files host
service into the profile's `cordis.patch.yml` — causing a fatal boot crash
(`duplicate loader entry id: workspace-files`) because the web-app bundle already
provides the same plugin.

Derived from a real 2026-09-09 dsh 0.1.5-alpha.2 upgrade session on Windows (the
maintainer's Claude Code session diagnosed the Cordis insert-duplication rule, removed
the duplicate, and replaced it with a NOTE comment).

- Type: static / read-only report
- Score: 5 aspects × 20 points; the rubric checks for Cordis insert-duplication rule
  understanding, the profile-patch-vs-bundle distinction, and the correct fix.
- See `instruction.md` for the brief, `solution/report.md` for the reference answer.
