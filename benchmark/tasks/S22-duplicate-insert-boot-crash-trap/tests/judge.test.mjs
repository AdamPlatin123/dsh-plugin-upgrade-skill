import assert from 'node:assert/strict'
import test from 'node:test'
import { gradeText } from './judge.mjs'

const oracle = [
  'The root cause is that Cordis treats a duplicate insert of the same plugin id as a fatal error — EntryGroup.update throws duplicate loader entry id — not a silent override or merge.',
  'Cordis layering rules: a config override by id is safe (merges into the bundle-provided plugin); an insert of a NEW plugin id is safe (adds to the composition); an insert of an ALREADY-PROVIDED id is fatal. The maintainer\'s action falls into the third category.',
  'The fix: remove the duplicate insert block from the profile patch — the web-app bundle already provides workspace-files, so no manual insert is needed.',
  'This is not a plugin defect; the plugin code is not at fault and modifying the plugin cannot fix a composition authoring error.',
  'Prevention: grep the web-app bundle patch for the id before manually inserting into the profile patch — if the bundle already provides it, the composition already includes it.',
].join('\n')
const thin = 'The boot crashed. I will fix the profile patch.'
const keyword = 'duplicate insert fatal error remove fix crash boot profile patch workspace-files plugin cordis'

test('oracle report earns 100; empty and thin reports do not', () => {
  assert.equal(gradeText(oracle).score, 100, JSON.stringify(gradeText(oracle)))
  assert.equal(gradeText('').score, 0)
  assert.ok(gradeText(thin).score < 100, JSON.stringify(gradeText(thin)))
  assert.ok(gradeText(keyword).score < 100, JSON.stringify(gradeText(keyword)))
})