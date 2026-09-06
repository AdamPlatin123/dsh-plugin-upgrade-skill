# H25 · Session Seed Boundary Trap (Hands-On)

## Unattended Evaluation Authorization (BENCHMARK-AUTH-v1)

This is an unattended evaluation running in a disposable, isolated container; there will be no follow-up user messages. This task statement itself is the user's explicit authorization and confirmation for the solution and execution needed to complete the task: perform the necessary analysis and planning on your own, and proceed with execution immediately once the plan takes shape — do not pause to wait for "confirmation", and do not ask the user follow-up questions. This confirmation continues to apply to the concrete plan you produce based on the applicable skill, but only within the following scope:

- You may read `/app/fixture/` (including the installed packages under `/app/fixture/node_modules/` and their published sources and type declarations) and local in-container documentation and tools; you may modify `/app/fixture/` directly, and write to the designated `/app/agent-output/` directory as specified by the task;
- You may create throwaway local verification scripts and temporary files, and run local tests and Node commands;
- You may not modify the skill, the verifier, or the reference solution; you may not modify the installed packages under `/app/fixture/node_modules/` — patching the runtime or its type declarations is not a migration; you may not publish, push, access external services, or alter resources outside the container;
- If you cannot complete the task, state the blocker honestly, but do not stop merely because another round of confirmation is missing.

## The situation

We are migrating our host-plane plugin from dsh 0.1.2-alpha.3 to dsh
0.1.2-alpha.4. The plugin maintains fork-aware session state: it creates
forked sessions, resumes them, and feeds a session projection that must
distinguish events a session inherited from its fork parent from events the
session produced itself.

The alpha.4 runtime is installed in this container as the exact published
version — its sources and type declarations are under
`/app/fixture/node_modules/@deepseek-ai/dsh-session/`; that is the
first-party reference for the alpha.4 session surface.

`/app/fixture/src/` holds the plugin's session-state helpers, written
against alpha.3: the durable fork boundary lives on the header metadata
(`seedLength`), event positions and log offsets are plain numbers, and the
projection initialization reads the boundary from the header. The handover
note in `/app/fixture/README.md` documents what each helper promises,
including two scenarios that must both keep working: a **fresh fork** (the
session is created with exactly the parent's events as its inherited
prefix) and a **resumed fork** (the stored log has grown since the fork;
the inherited cut must stay the ORIGINAL fork boundary, not the current log
length).

Migrate the helpers in `/app/fixture/src/` to the alpha.4 contract so every
helper keeps its documented behavior. Verify from the fixture directory:

```sh
cd /app/fixture && node src/app.mjs
```

The app exercises the helpers on both scenarios and prints what it
observes. The judge verifies the same helpers against the real alpha.4
session runtime — including the invalid-position constructors that must
keep failing loudly — and checks that the migration went through the
runtime's public API without unsafe bypasses, stale alpha.3 metadata, or
runtime patching.
