// S21-resource-service-unavailable-trap grading: fixture read-only gate + five attribution/discipline aspects.
// Expected: the content-read failure is attributed to the resource-metadata delivery chain
// (useResource -> the file provider -> the workspaceFiles.stat RPC) on the upgraded profile —
// NOT to the plugin's own code; valid probes (per-module sweep, contrast reader) are cited,
// the invalid all-in-one join is explicitly rejected; the mitigation order is restart,
// rollback, upstream report; the paste-input fold warnings are kept separate.
// Every listed condition is necessary for an aspect's 20 points; patterns are anchored to
// answer-specific vocabulary so the brief's own questions (or the raw evidence) earn nothing.
import { emit, fixtureChanges, readAgentText } from './judge-utils.mjs'

const TASK = 'S21-resource-service-unavailable-trap'

const ASPECTS = [
  ['attribution: the failure is in the resource-metadata delivery chain (the file provider / the workspaceFiles.stat RPC), not the plugin render code', [
    ['names the failing chain (useResource / file provider / workspaceFiles.stat / resource-metadata)', /useResource|workspaceFiles\.?stat|file provider|resource[- ]metadata|resource (?:provider|delivery|chain)/i],
    ['the tab/claim layer works, or meta.status stays none (metadata never arrives)', /(?:tab|claim|registration)[\s\S]{0,160}(?:works?|fine|opened|succeeds)|meta\.status[\s\S]{0,80}'?none/i],
  ]],
  ['contrast probe: a different reader of the same file works (file-trace own RPC), localizing the failure', [
    ['the contrast/other reader works on the same file', /(?:file-trace|contrast|another reader|different reader|own rpc)[\s\S]{0,200}(?:works?|fine|reads?|succeeds|same file)/i],
    ['the contrast localizes the failure to the workspaceFiles delivery', /(?:localiz|narrow|isolat|pin)(?:es?|ed|ing|s)?[\s\S]{0,120}(?:workspaceFiles|provider|delivery|RPC|chain)/i],
  ]],
  ['probe discipline: the per-module sweep is valid; the all-in-one join is invalid (combo-URL cap; the loader partitions)', [
    ['the all-in-one join is explicitly invalid as evidence', /(?:all-in-one|naive|joined)[\s\S]{0,200}(?:invalid|not a request|never be cited|must not be cited|not valid)/i],
    ['the mechanism is the combo-URL cap / loader partitioning', /3 ?KB|MAX_COMBO_URL_BYTES|combo[- ]URL cap|partition/i],
  ]],
  ['mitigation order: restart once, then rollback, then upstream report; no plugin-side rewrite/retry/fallback', [
    ['restart first, then rollback/previous version', /restart[\s\S]{0,200}(?:rollback|roll[\s\S]{0,40}back|revert|previous (?:version|published))/i],
    ['rollback paired with the upstream report', /(?:rollback|revert|roll back)[\s\S]{0,160}(?:report|upstream|#5999)/i],
    ['explicitly no plugin-side rewrite/repair for a host-side gap', /(?:no|not|never|avoid)[\s\S]{0,40}plugin-side (?:rewrite|fix|repair|retry|fallback)/i],
  ]],
  ['distractor separation: the paste-input fold warnings are an unrelated (already-fixed) end-marker bug, not the cause', [
    ['fold/paste-input warnings are unrelated / not the cause', /(?:fold|paste-input)[\s\S]{0,200}(?:unrelated|separate|different (?:bug|issue)|not the cause|already[- ]fixed)/i],
  ]],
]

/**
 * Grade one report text against the five attribution/discipline aspects.
 * @param text - the agent report text.
 * @returns the score and per-aspect reasons.
 */
export function gradeText(text) {
  const reasons = []
  let score = 0
  for (const [key, checks] of ASPECTS) {
    const missing = checks.filter(([, pattern]) => !pattern.test(text))
    if (missing.length === 0) {
      score += 20
      reasons.push('hit aspect: ' + key + ' (+20)')
    } else {
      reasons.push('missing aspect: ' + key + ': ' + missing.map(([label]) => label).join('; ') + ' (-20)')
    }
  }
  return { score, reasons }
}

if (import.meta.url === 'file://' + process.argv[1].replace(/\\/g, '/')) {
  main().catch((error) => emit(0, ['judge error: ' + error.message]))
}

async function main() {
  const reasons = []
  const gate = await fixtureChanges('fixture')
  if (gate.changed === true) {
    emit(0, ['fixture was modified, 0 points for this task (read-only discipline): ' + gate.detail])
  }
  if (gate.changed === null) reasons.push('warning: ' + gate.detail)
  else reasons.push('fixture unchanged (read-only discipline passed)')
  const { text, files } = readAgentText('', TASK)
  if (!text.trim()) {
    emit(0, [...reasons, 'no report found under /app/agent-output/' + TASK + '/, treated as 0 points'])
  }
  reasons.push('read agent report: ' + files.join(', '))
  const graded = gradeText(text)
  emit(graded.score, [...reasons, ...graded.reasons])
}
