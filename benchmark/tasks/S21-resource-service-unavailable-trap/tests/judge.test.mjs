import assert from 'node:assert/strict'
import test from 'node:test'
import { gradeText } from './judge.mjs'

const oracle = [
  'The content-read failure is in the resource-metadata delivery chain (the file provider registered by @deepseek-ai/dsh-api-workspace-files, the workspaceFiles.stat RPC over the Typert gateway) on the upgraded profile — not the plugin render code; the tab opening proves the claim layer works.',
  'The contrast probe: a different reader of the same file works — the file-trace plugin own RPC reads it fine, localizing the failure to the workspaceFiles delivery.',
  'Probe discipline: the per-module sweep (each of the 62 entries fetched one by one, all 200) is valid; the all-in-one join of 62 modules into one URL is invalid — it exceeds the 3 KB combo-URL cap and the loader partitions the roster.',
  'Mitigation order: restart the host once (the alpha.1 round self-healed on a later boot), then roll back to the previous published version, then report upstream (discussion #5999); no plugin-side rewrite or retry for a host-side gap.',
  'Distractor separation: the paste-input fold warnings are an unrelated paste-input bug (the end-marker spelling drift, fixed in v0.1.24), not the cause of the content-read failure.',
].join('\n')
const thin = 'The service is unavailable. I will fix the plugin.'
const keyword = 'resource provider metadata delivery chain contrast probe per-module sweep 62 restart rollback upstream report paste-input fold unrelated'

test('oracle report earns 100; empty and thin reports do not', () => {
  assert.equal(gradeText(oracle).score, 100, JSON.stringify(gradeText(oracle)))
  assert.equal(gradeText('').score, 0)
  assert.ok(gradeText(thin).score < 100, JSON.stringify(gradeText(thin)))
  assert.ok(gradeText(keyword).score < 100, JSON.stringify(gradeText(keyword)))
})
