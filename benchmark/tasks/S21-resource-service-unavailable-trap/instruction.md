# S21 · The Resource Service That "Unavailable" (Read-Only)

## Unattended Evaluation Authorization (BENCHMARK-AUTH-v1)

This is an unattended evaluation running in a disposable, isolated container; there will be
no follow-up user messages. This task brief is itself the user's explicit authorization and
confirmation for the approach and execution needed to complete the task: complete the
necessary analysis and planning on your own, and keep executing as soon as the plan is
formed — do not pause to wait for "confirmation", and do not ask the user follow-up
questions. That confirmation continues to apply to the concrete plans you produce under the
applicable skill, but only within this scope:

- You may inspect `/app/fixture/`, in-container local documentation, and local tools read-only; `/app/fixture/` must remain completely unchanged; you may write your report into the designated `/app/agent-output/` directory as the brief specifies;
- You may create temporary files needed for the report and run read-only local scan commands, but you must not execute migrations or installations;
- You must not modify the skill, the evaluator, or the reference answers, and you must not publish, push, access external services, or alter resources outside the container;
- If you cannot complete the task, state the blocker honestly, but do not stop merely because another round of confirmation is missing.

## Scenario

A maintainer upgrades dsh in place (npm global, 0.1.5-alpha.1 → 0.1.5-alpha.2) on a
Windows profile created under 0.1.2/0.1.3 with six external client plugins junction-linked.
After the upgrade + restart:

- Clicking a chat file link whose address is OUTSIDE the session workspace throws
  `sidebarRight: no registered tab type claims "dsh-resource://file/absolute/…"`.
- The assistant then writes a test file INSIDE the session workspace; clicking THAT link
  opens a right-Sidebar tab titled correctly — but the tab's content shows only
  「文件资源服务不可用。」
- F12 Console: no red errors from the sidebar or the resource system; the only plugin
  warnings are `dsh-paste-input: fold skipped (parse failed)` repeats.
- A per-module probe of all 62 manifest combo entries: 62/62 HTTP 200. A naive all-in-one
  join of all 62 modules into one URL: 404.

The evidence pack is under `/app/fixture/` (read-only — do not modify it):
`symptom-log.txt`, `boot-manifest-excerpt.txt`, `combo-probe.txt`, `contrast-probe.txt`,
`console-excerpt.txt`, `discussion-excerpt.txt`, `README.md`.

**Your report** (write to `/app/agent-output/S21-resource-service-unavailable-trap/`, any
filename):

1. **Attribution**: where the content-read failure actually lives. The tab opened (the
   document tab type claimed the address and registered), so the claim/registration layer
   works; the failure is in the resource-metadata delivery
   (`useResource('file', …)` → the `file` provider registered by
   `@deepseek-ai/dsh-api-workspace-files`' client half → the `workspaceFiles.stat` RPC →
   the host WorkspaceFiles service). State what the contrast probe (file-trace's own RPC
   reads the same file fine) rules in and out, and why `meta.status === 'none'` (metadata
   never arrives) points at the provider/RPC chain rather than the tab's claim.
2. **Probe discipline**: the per-module sweep (62/62 HTTP 200) is valid; the naive
   all-in-one join of all 62 modules into one URL is NOT — explain the 3 KB combo-URL cap
   (`MAX_COMBO_URL_BYTES`), that the real loader partitions the roster into ≤3 KB chunks,
   and why a manual all-in-one 404 must never be cited as "modules missing".
3. **Distractor separation**: the repeated `dsh-paste-input: fold skipped (parse failed)`
   warnings are an unrelated paste-input bug (a parser/writer end-marker spelling drift
   across bundle generations; fixed in paste-input v0.1.24). State explicitly that they do
   not cause the content-read failure, and that the `ui-sidebar-textpreview` →
   `ui-sidebar-documentpreview` rename explains the roster change without being the cause.
4. **Mitigation decision**: no plugin-side rewrite, retry, fallback, or "repair" of the
   unavailable service; the decision order is (a) restart the host once — the 0.1.5-alpha.1
   round self-healed a roster/combo mismatch on a later boot, (b) roll the global package
   back to the previous published version as the escape hatch, (c) report upstream with the
   forensics (per-module sweep, contrast probe, discussion #5999).
5. **Prevention / upstream**: what a complete upstream report needs (per-module probe,
   contrast reader, roster excerpt, the invalid-join caveat), and what the host could do to
   fail loud (roster vs served-combo consistency check at boot, or a named error when a
   rostered module's bytes are absent from the served combo).

What is tested: attributing a runtime resource-chain failure to the upgraded profile
rather than the plugin, valid-vs-invalid probe design (combo URL cap, contrast reader),
the restart/rollback/report mitigation order, distractor separation between two
simultaneous plugin bugs, and the upstream-report discipline with reproducible forensics.
