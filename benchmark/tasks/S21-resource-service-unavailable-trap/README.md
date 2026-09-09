# S21 · The Resource Service That "Unavailable" Trap

Static, read-only. A dsh in-place upgrade (0.1.5-alpha.1 → 0.1.5-alpha.2, npm global,
Windows, profile created under 0.1.2/0.1.3) leaves exactly one thing broken: the
right-Sidebar document tab opens for a session file (the claim/registration layer works)
but the content read fails with 「文件资源服务不可用。」 while everything else — including a
different reader of the same file — works.

Derived from a real 2026-09-09/10 session on this deployment. The trap has three layers:

1. the failure is in the resource-metadata delivery chain
   (`useResource('file', …)` → the `file` provider registered by
   `@deepseek-ai/dsh-api-workspace-files`' client half → the `workspaceFiles.stat` RPC →
   the host WorkspaceFiles service), NOT in the plugin's render code — the tab opening
   proves the claim layer works;
2. the console is noisy with an UNRELATED plugin's warnings (`dsh-paste-input: fold
   skipped (parse failed)` — a separate end-marker spelling bug, fixed in paste-input
   v0.1.24) that invites conflating the two issues;
3. the fix is not in the plugin at all: no rewrite, retry, fallback, or "repair" of the
   unavailable service — the decision order is restart → rollback → report upstream.

- Type: static / read-only report
- Score: 5 aspects × 20 points. The deterministic prose rubric reports missing
  conditions; attributing the failure to the plugin's own code or proposing plugin-side
  workarolds caps the score.
- See `instruction.md` for the brief, `solution/report.md` for the reference answer.
