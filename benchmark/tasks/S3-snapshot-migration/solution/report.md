# S3 Migration Assessment Report (Reference Answer)

## Breaking surfaces and migration forms

1. **Type imports (src/client/index.ts:6, src/client/Pet.tsx:8; package.json:8)**: `@deepseek-ai/dsh-client-runtime/client` was removed. Replace the context import with `import type { Context as ClientContext } from '@deepseek-ai/cordis'`, and add type-only Context augmentations from the actual service owners. `ConversationSnapshot` must not also be imported from cordis: snapshot types belong to their target Session/Chat domain. The exact replacement for the old aggregate snapshot type needs checking against the target exports and the chosen read surface; do not invent that export. For a direct Chat migration, the documented `ChatSnapshot` owner is `@deepseek-ai/dsh-client-ui-chat/client`. Remove `dsh-client-runtime` from the actual `client.inject` array in package.json:8, retaining only real target providers. Otherwise the assembly can stay pending or fail to enter the boot graph, sometimes without an explicit startup error. Type erasure does not repair an unresolved type import.
2. **Flat snapshot reads (src/client/Pet.tsx:14,21-23: isThinking / toolRunning / lastTurnEnd)**: `partial`, `runningCalls` and `turnEnds` are chat-derived state. For the staged compatibility path, read these three fields through `views.get('chat')?.legacy`, preserving their field semantics and handling a missing chat projection. Then migrate them to the target-owned Chat/views/timeline surfaces; preserve turn ordering rather than assuming every new collection keeps the old array shape. This temporary projection is a migration step, not the preferred permanent alpha.2-only data surface.
3. **Lifecycle field (src/client/Pet.tsx:19: running)**: `running` remains Session lifecycle state, outside chat legacy. Keep `useSession(s => s.running)` on the Session seat. Its existing hook need not be renamed; separate the three chat reads from it instead of moving every field into chat legacy or changing every useSession call into a Chat hook.
4. **Slot registration (src/client/index.ts:38-43)**: the actual call is `scope.slots.register` inside `ctx.inject(['slots', 'conversation'], ...)`. Wait for the named slot with `scope.slots.inject`, retaining this dependency scope, the slot name `conversation.session.header.actions`, registration id `pet`, order `10` and component `Pet`. Add `import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'` for the slots service's Context augmentation; the existing locale and ui-conversation imports provide different type augmentations. The registration remains owned by the injected scope and slot lifetime, so it is disposed when either goes away and recreated when dependencies return; do not hoist it to the root context.

The registration migration shape is:

```ts
ctx.inject(['slots', 'conversation'], (scope: ClientContext) => {
  scope.slots.inject('conversation.session.header.actions', () => {
    return scope.slots.register(
      { name: 'conversation.session.header.actions', id: 'pet', order: 10 },
      Pet,
    )
  })
})
```

This is a proposed migration form for target-version typecheck and mount/disposal verification, not code executed against this static fixture. The locale dictionary effect and its lifetime are retained.

## Corresponding cards

- DSH-0.1.2-A1-03 (heavy split of the session-view project): items 2/3/4 above all come from this card.
- DSH-0.1.2-A1-25 (runtime package removal and domain ownership): item 1, including the phantom client.inject dependency; the API-10 reference supplies the Context and target Chat owner mappings.

## Two-step conclusion

Can run first through the compatibility projection: partial / runningCalls / turnEnds, then migrate chat state and turn history to the target views/timeline APIs.
Immediate changes: replace removed type imports, delete the phantom client.inject entry and adapt scoped slot registration. Keep running on its already-existing `useSession` lifecycle seat while separating the chat-derived selectors; running does not enter the compatibility projection.

All fixture files were inspected read-only. After implementing the migration, typecheck against the exact target exports, cold-boot an isolated profile with the plugin in the boot graph and no pending row, and verify pet updates plus mount/disposal. These are proposed checks; none was executed here.
