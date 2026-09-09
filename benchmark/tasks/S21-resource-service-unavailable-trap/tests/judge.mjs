// S21-resource-service-unavailable-trap grading: fixture read-only gate + five attribution/discipline aspects.
// Expected: the content-read failure is attributed to the resource-metadata delivery chain
// (useResource -> the file provider -> the workspaceFiles.stat RPC) on the upgraded profile —
// NOT to the plugin's own code; valid probes (per-module sweep, contrast reader) are cited,
// the invalid all-in-one join is explicitly rejected; the mitigation order is restart,
// rollback, upstream report; the paste-input fold warnings are kept separate.
import { emit, fixtureChanges, readAgentText } from './judge-utils.mjs'

const TASK = 'S21-resource-service-unavailable-trap'

const ASPECTS = [
  { key: 'attribution: the failure is in the resource-metadata delivery chain (the file provider / the workspaceFiles.stat RPC) on the upgraded profile — not the plugin render code; the tab opening proves the claim layer works', pattern: /(resource|provider|metadata|delivery|chain|rpc)[\s\S]{0,240}(fail|broken|not arrive|never arrive|unavailable)|(meta\.status|'none'|useResource)[\s\S]{0,160}(never|none|not arrive)/i, points: 20 },
  { key: 'contrast probe: a different reader of the same file works (file-trace own RPC), localizing the failure to the workspaceFiles delivery', pattern: /(file-trace|contrast|different reader|own rpc)[\s\S]{0,200}(works?|fine|reads?|same file)|(contrast)[\s\S]{0,160}(probe|reader)/i, points: 20 },
  { key: 'probe discipline: the per-module sweep (62/62 200) is valid; the all-in-one join is invalid (3 KB combo-URL cap; the loader partitions)', pattern: /(per-module|one by one|each (module|entry)|62\/62)[\s\S]{0,200}(200|valid)|((all|62).{0,20}join|all-in-one)[\s\S]{0,200}(invalid|3 ?kb|cap|exceeds)|combo-url cap/i, points: 20 },
  { key: 'mitigation order: restart once, then rollback, then upstream report; no plugin-side rewrite/retry/fallback for a host-side gap', pattern: /(restart)[\s\S]{0,160}(rollback|revert|previous (version|published))|(rollback|revert)[\s\S]{0,160}(report|upstream|#5999)|no plugin-side (rewrite|fix|repair)/i, points: 20 },
  { key: 'distractor separation: the paste-input fold warnings are an unrelated (already-fixed) end-marker bug, not the cause', pattern: /(fold|paste-input)[\s\S]{0,200}(unrelated|separate|different (bug|issue)|not the cause)|(end-marker spelling|fold-skip)[\s\S]{0,120}(unrelated|separate)/i, points: 20 },
]

/**
 * Grade one report text against the five attribution/discipline aspects.
 * @param text - the agent report text.
 * @returns the score and per-aspect reasons.
 */
export function gradeText(text) {
  const reasons = []
  let score = 0
  for (const aspect of ASPECTS) {
    if (aspect.pattern.test(text)) {
      score += aspect.points
      reasons.push('hit aspect: ' + aspect.key + ' (+' + aspect.points + ')')
    } else {
      reasons.push('missing aspect: ' + aspect.key + ' (-' + aspect.points + ')')
    }
  }
  return { score, reasons }
}

main().catch((error) => emit(0, ['judge error: ' + error.message]))

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
