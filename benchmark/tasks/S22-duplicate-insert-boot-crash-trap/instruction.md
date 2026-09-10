# S22 · The Duplicate Insert That Crashed the Boot (Read-Only)

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

A maintainer upgrades dsh to 0.1.5-alpha.2 on a Windows profile created under 0.1.2/0.1.3.
After the upgrade, the right-Sidebar document tab opens but its content read fails
(文件资源服务不可用). The maintainer assumes the workspace-files host service is missing
from the profile composition and manually adds an insert row to the profile's
`cordis.patch.yml`. The next `dsh web` boot crashes immediately with:

```
Error: dsh: plugin tree failed to load: failed to apply loader entry include (cordis:include):
duplicate loader entry id: workspace-files
```

The evidence pack is under `/app/fixture/` (read-only — do not modify it):
`boot-crash-log.txt` (the full crash output), `profile-patch-excerpt.txt` (the profile's
cordis.patch.yml with the manual insert), `web-app-patch-excerpt.txt` (the web-app bundle's
cordis.patch.yml showing the workspace-files row), and `README.md`.

**Your report** (write to `/app/agent-output/S22-duplicate-insert-boot-crash-trap/`, any
filename):

1. **Root cause**: why inserting a plugin id that the web-app bundle already provides causes
   a fatal crash — Cordis treats a duplicate `insert` of the same plugin id as an error
   (EntryGroup.update → duplicate loader entry id), not a silent override or merge.
2. **Cordis layering rules**: the distinction between (a) config override by id (safe — the
   profile patch can override a bundle-provided plugin's config), (b) `insert` of a NEW
   plugin id (adds to the composition), and (c) `insert` of an ALREADY-PROVIDED id (fatal).
   State which of the three the maintainer's action falls into and why.
3. **Fix**: what the maintainer should do — remove the duplicate insert block from the
   profile patch (the web-app bundle already provides workspace-files; no manual insert is
   needed). State explicitly that this is NOT a plugin defect and NOT fixable by modifying
   the plugin.
4. **Prevention**: what the maintainer should check BEFORE manually inserting a plugin id
   into the profile patch (grep the web-app bundle's cordis.patch.yml for the id; if it's
   already there, the composition already includes it), and what the host could do to fail
   with a more actionable error message (e.g. naming the bundle that already provides the
   id, or suggesting "remove the duplicate from your profile patch").

What is tested: understanding Cordis's insert-duplication rule (fatal, not merge),
distinguishing profile-patch insert from bundle-provided plugins, and the correct fix
(remove the duplicate, not add more).