// Default semantic criteria. Historical score packets are archived separately.
export const PROTOCOL = 'report-judge-v1'
const criterion = (id, points, requirement, sourceRequired = true) => ({ id, points, requirement, sourceRequired })
const alpha1 = 'skills/plugin-upgrade/references/v0.1.2-alpha.1.md'
const alpha2 = 'skills/plugin-upgrade/references/v0.1.2-alpha.2.md'
const api = 'skills/plugin-upgrade/references/api-migration-0.1.2-alpha.2.md'
const cards = (...ids) => ids.map(id => ({ path: id.includes('-A2-') ? alpha2 : alpha1, heading: id }))
const closedBookReplacement = 'Respect the closed-book task: exact successor package names, symbols or signatures absent from the fixture are not mandatory for full credit. Accept a correct located diagnosis, card and defensible migration direction with unavailable details marked unconfirmed or deferred to the actual target owners/exports. Use the sealed references to check asserted details, not to require unseen names. Uncertainty alone without the diagnosis and migration direction earns no credit; positively invented replacements still lose credit.'

export const RUBRICS = {
  'S1-static-scan': {
    references: cards('DSH-0.1.2-A1-01', 'DSH-0.1.2-A1-02', 'DSH-0.1.2-A1-03', 'DSH-0.1.2-A1-04', 'DSH-0.1.2-A1-05', 'DSH-0.1.2-A1-08', 'DSH-0.1.2-A2-01'),
    criteria: [
      criterion('source-patch', 10, 'Locate the source patch declaration/target and script, distinguish source patching from ordinary composition, and explain the private session-view coupling.'),
      criterion('events', 10, 'Locate the informational event producer/consumer and ignorable:true. Explain alpha.1 removal and alpha.2 restoration: preserve omission-safe informational markers, not a whitelist for required events. Do not claim arbitrary Session.append supports writing the marker.'),
      criterion('host-services', 10, 'Locate apiProxy usage and its removal. Distinguish Host domain-service injection (llm/listProviders) from Web Client Remote; do not prescribe a nonexistent Host remote service.'),
      criterion('host-path', 10, 'Locate the fixed homedir/.dsh/profiles/default path and explain using runtime DSH_HOME/profile information. Do not claim --profile was introduced in alpha.1.'),
      criterion('ui', 10, 'Locate both the private SessionView import and command registration and explain public owner/seam verification after the split.'),
      criterion('channel', 10, 'Locate the private loopback HTTP server. Explain that loopback does not bypass auth requirements and distinguish host-managed authenticated channels from raw routes.'),
      criterion('subprocess', 10, 'Locate dsh subprocess calls and stdout JSON.parse. Explain stdout final text vs stderr progress, and that the JSONL assumption was already wrong, rather than inventing an alpha.2 stdout change.'),
      criterion('mapping', 20, 'Map actual located couplings to A1-01, A1-02+A2-01, A1-03, A1-04, A1-08; A1-05 is a valid additional stdout mapping. A bare card list earns zero. Award half only when the mappings are substantively correct but incomplete.'),
      criterion('limits', 10, 'Account for all seven hit categories (there are no no-hit categories here), state the scan limits, and propose target-version build/typecheck, isolated boot and a functional path. Never require actually executing this static fixture.', false),
    ],
  },
  'S2-negative-scan': {
    references: cards('DSH-0.1.2-A1-01'),
    criteria: [
      criterion('host-break', 40, 'Locate index.js inject/apiProxy.llm.providers and map the breaking Host service to A1-01. Explain llm injection/listProviders and the dead apiproxy dependency in package.json; a card name alone earns zero.'),
      criterion('negative-coverage', 20, 'Account for each of the other six categories with scanned-file evidence. session-notes.js is a pure string/array utility; cordis.patch.yml is ordinary plugin composition, not a host-source patch. Interpret a negative patch conclusion in its touchpoint-category context: wording such as no patch file/declaration under the source-patch category can correctly mean no host-source patch, especially when the scan scope includes the composition file. Do not deduct solely because an ordinary composition file has patch in its name, or require an extra explanation of that naming distinction when the category conclusion and scan evidence are correct. Still deduct for an explicit denial that the existing composition file itself exists, for misclassifying its insertion as host-source modification, or for unsupported negative conclusions. Do not invent coupling from filenames.'),
      criterion('inference-boundary', 20, 'Explain why no static hits cannot establish compatibility: scan coverage is limited and dependency/config/runtime behavior needs separate evidence. Distinguish the existing decisive apiProxy break from the six negative categories.', false),
      criterion('verification-plan', 20, 'Specify post-migration build/typecheck, an isolated target-version cold boot with no pending, and an actual provider call. These are proposed checks, not checks supposedly executed inside this non-runnable fixture.', false),
    ],
  },
  'S3-snapshot-migration': {
    references: [...cards('DSH-0.1.2-A1-03', 'DSH-0.1.2-A1-25'), { path: api, heading: 'API-10' }],
    criteria: [
      criterion('chat-projection', 20, 'Locate Pet.tsx partial/runningCalls/turnEnds reads. Explain their temporary chat legacy projection and subsequent views/timeline or target-owned Chat access. Accept a supported direct migration when it explains the compatibility option; merely saying legacy is insufficient.'),
      criterion('session-lifecycle', 20, 'Locate running in Pet.tsx and explain it belongs to the Session/useSession lifecycle seat, outside chat legacy. Do not claim the existing useSession call itself must be renamed for running.'),
      criterion('type-and-inject', 20, 'Locate removed dsh-client-runtime imports and the package.json client.inject entry. Repoint Context as ClientContext to scoped cordis and snapshot types to their target owner; do not claim every snapshot type is exported by cordis. Unknown exact snapshot symbols may be explicitly deferred to target exports.'),
      criterion('slot-registration', 20, 'Locate the scoped slots.register call in index.ts. Explain slots.inject around registration and the ui-renderer/client Context augmentation/service ownership; preserve the slot name and lifetime. Accept equivalent supported registration forms.'),
      criterion('mapping-and-plan', 20, 'Tie the located snapshot/lifecycle/slot changes to full DSH-0.1.2-A1-03 and separate temporary projection from immediate type/inject/lifecycle changes. A1-25 is a valid additional package-removal card. A bare card ID earns zero.'),
    ],
  },
  'S4-legacy-client-imports': {
    references: [...cards('DSH-0.1.2-A1-25', 'DSH-0.1.2-A1-26', 'DSH-0.1.2-A1-27', 'DSH-0.1.2-A1-30'), { path: api, heading: 'API-10' }],
    criteria: [
      criterion('runtime-removal', 25, `Locate the old ClientContext import, identify Web Client/plugin impact and A1-25, and require removing the deleted-package import in favor of a supported target owning package. A direction such as importing Context from its actual target owning package with the needed type augmentation is sufficient; the fixture does not establish the exact package name. Type erasure does not make a removed type package harmless. ${closedBookReplacement}`),
      criterion('registration-id', 25, 'Compare the actual pet-legacy-bundle loader ID with package.json name dsh-pet-session-bench, map A1-26 and require exact name alignment and client activation verification.'),
      criterion('session-content', 25, `Locate useSession/nodes, map A1-27 and require replacing the removed flat content access with a supported target content-reading surface, preserving ordering. Chat/durable windows or public selectors are supported directions; exact hook/store names such as useChat plus order/nodes.get are not mandatory when unavailable in the fixture. Do not positively claim that the old flat useSession nodes API remains supported. Pet.tsx is empty and has no breaking surface. ${closedBookReplacement}`),
      criterion('connection-face', 25, `Locate connection.api.agentPresets.list, map A1-30 and require removing that deleted face in favor of a verified public target interface for the operation. Remote/public domain APIs are supported directions, but the exact successor name is not mandatory when unavailable in the fixture. ${closedBookReplacement}`),
    ],
    caps: [{ id: 'invented-migration', total: 70, requirement: 'Apply ONLY if the report positively asserts an unsupported lifecycle replacement (apply to setup/activate) or that service inject generally must move into a manifest. Explicitly rejecting these claims, or legitimate cleanup of the deleted package from client.inject, does NOT trigger this cap.' }],
  },
  'S10-paste-rename-and-version-chip': {
    references: [],
    criteria: [
      criterion('paste-names-and-scope', 20, 'Design paste_image and paste_file names, adding (2), (3), etc. before the extension until an unused name is found. Reserve names within the batch as well as across live attachments. Scope renaming to clipboard acquisition before duplicate validation/record creation; drop and picker keep their real names. An explicit paste-only option in a shared function is equivalent if other sources remain unchanged. Do not require the words increment or collision. The prompt explicitly makes item 2 (original extension/MIME fallback and chip/upload display details) unscored: do not require or deduct for those details.'),
      criterion('live-conflict-state', 20, 'Identify the live composer snapshot occurrences as the authoritative occupied-name source and explain why the records subscription can delete cache entries on a transient empty snapshot while an attachment remains live. Account for the current paste batch/in-flight reservations; records may supplement but cannot replace live state. Do not demand a particular variable name or literal source-of-truth phrase.'),
      criterion('stale-tag-display', 20, 'Use the captured cached tags response (x-cache HIT, age, older 0.2.9) and renderCurrentChip(tag) to explain the stale latest label. Compare fetched and running PLUGIN_VERSION semantically: show an update only when remote is newer, otherwise show the running version, never an older fetched tag. Equivalent pseudocode such as remote > local and remote <= local is sufficient.'),
      criterion('regressions', 20, 'Propose tests showing repeated/same-batch image pastes retain distinct live attachments, a live occurrence still blocks a name with an empty records cache, and drop/picker names stay unchanged. Test an older/equal remote tag against the running build and a genuinely newer remote tag. Concrete expected names or assertions in code suffice; no mandatory coexist/assert wording. Do not grade the unscored extension/display guidance.', false),
      criterion('release-hygiene', 20, 'Synchronize the package version and hand-inlined PLUGIN_VERSION in the distributed lib artifact, run its syntax check (node --check or equivalent) plus behavioral regressions, and explain deployment/update of the served plugin artifact followed by browser reload/hard refresh. A Git tag or update chip alone does not install the artifact; there is no host-side update endpoint. Package metadata wording is equivalent to package.json. Do not require executing or publishing this static fixture.'),
    ],
  },
  'S12-global-upgrade-ebusy-trap': {
    references: [],
    criteria: [
      criterion('native-module-owner', 20, 'Identify the running Windows dsh web-host node.exe (PID 42432 in running-processes.txt) as the process that loaded koffi.node. Explain that the loaded native binary remains in use until that host exits, so npm cannot copy/replace it and reports EBUSY. File-in-use/handle wording is equivalent to lock; do not require universal claims about other operating systems or the word exclusive.'),
      criterion('browser-versus-host-sequence', 20, 'Explain that refreshing the browser reloads the page/SPA without stopping the native-module-owning host. Give the ordered procedure: stop/confirm exit of the relevant dsh host, install, then restart. Separate numbered steps, prose and command blocks together establish the sequence; do not require a single sentence. Do not prescribe killing every unrelated Node process.', false),
      criterion('unpinned-dist-tag-resolution', 20, 'Explain that an unversioned npm global install follows latest, which npm-dist-tags.txt pins to 0.1.1-rc.2; alpha points to 0.1.2-alpha.5. This can replace the initially installed alpha.4 with rc.2 rather than preserving/upgrading it. A statement that an unpinned install does NOT preserve the installed version is correct, not contradictory advice. Distinguish a minor wrong prior-version label from a wrong resolution mechanism.'),
      criterion('safe-exact-commands', 20, 'Provide npm install -g (or npm i -g) @deepseek-ai/dsh@0.1.2-alpha.5 and @deepseek-harness-tui/dsh-tui, together or separately after stopping the host. Verify dsh --version is alpha.5 and restart the host. An explicit @alpha may be discussed as a mutable alternative but cannot replace the requested exact-version command. Shell examples are proposed instructions, not required executed actions.', false),
      criterion('readme-prevention', 20, 'Tell README authors to pin the exact intended/tested core version whenever a plugin install command also installs dsh, and avoid silently following latest over an existing prerelease. Accept separate pinned core/plugin commands or one pinned combined command. Read the recommendation across headings and list items; quoted unpinned BAD examples are not endorsements.', false),
    ],
  },
  'S15-slot-error-boundary-crash': {
    references: [],
    criteria: [
      criterion('busy-scope-and-trigger', 20, 'Locate the disabled expression in AttachmentChips: (props.input?.phase ?? plain) !== plain || busy. busy is local to sibling AttachButton and unbound in AttachmentChips. Explain empty occurrences return null before the map, while a present occurrence in plain phase makes the left guard false and evaluates busy, causing ReferenceError. Accept not declared/not in scope and equivalent language.'),
      criterion('slot-boundary', 20, 'Explain that a render exception is caught by the slot error boundary and removes the whole dock entry, rather than only the remove button; the separate attach-button slot survives. The diagnostic is in the browser console, not a user-facing banner.'),
      criterion('attribution-and-isolation', 20, 'Use the shipped v0.2.10 expression to establish that busy already occurs in the baseline. Propose a data-present plain-phase baseline mount or rollback/re-add isolation to locate it. Do not force a claim that the hover diff is harmless: feature.diff is inconsistent with the baseline about the old disabled line and places imageItem before the callback-scoped status/record. Credit grounded discussion of these extra defects/inconsistencies. The evidence does not prove exactly when every historical user first exercised the failure.'),
      criterion('fix-and-hardening', 20, 'Remove the dangling busy reference or explicitly provide properly owned state/props, preserving the phase guard. Harden missing arrays with record?.items ?? [] (or equivalent) and DOM targets with event.target?.closest?.(...) or a safe element/type check. Scope hover lookups to where record/status are defined. Equivalent safe fixes count; do not require an exact patch or executing changes in this read-only task.'),
      criterion('data-present-regression', 20, 'Propose a render/mount test with a matching occurrence in plain phase, asserting the chip/remove control exists and the error boundary captures no exception. Explain why an empty-state-only test misses the expression and why node --check/parsing cannot resolve free identifiers or execute the component. Assertions using expect/DOM queries and ordinary prose both count. Include a data-present slot smoke in pre-ship checks, without requiring an actual test run here.', false),
    ],
  },
}

for (const [task, rubric] of Object.entries(RUBRICS)) {
  if (rubric.criteria.reduce((sum, c) => sum + c.points, 0) !== 100) throw new Error(`${task}: weights must sum to 100`)
}
