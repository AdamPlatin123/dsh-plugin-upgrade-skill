// S22-duplicate-insert-boot-crash-trap grading: fixture read-only gate + five attribution/discipline aspects.
// Expected: the crash is attributed to Cordis's duplicate-insert rule (fatal, not merge), the
// profile-patch insert vs bundle-provided distinction is stated, the fix is to remove the
// duplicate (not add more), and the prevention step is to grep the bundle patch first.
import { emit, fixtureChanges, readAgentText } from './judge-utils.mjs'

const TASK = 'S22-duplicate-insert-boot-crash-trap'

const ASPECTS = [
  { key: 'root cause: Cordis treats duplicate insert of the same plugin id as a fatal error (EntryGroup.update -> duplicate loader entry id), not a silent override or merge', pattern: /(duplicate|duplicate insert|already (provided|registered|exists?))[\s\S]{0,200}(fatal|error|crash|not a silent|not merge)|EntryGroup[\s\S]{0,120}duplicate/i, points: 20 },
  { key: 'layering: config override by id is safe; insert of a NEW id is safe; insert of an ALREADY-PROVIDED id is fatal', pattern: /(config override|override by id|merge)[\s\S]{0,160}(safe|allowed)|((insert|new)[\s\S]{0,60}(new|already.provided|existing)[\s\S]{0,120}(fatal|crash|error))/i, points: 20 },
  { key: 'fix: remove the duplicate insert block from the profile patch; the web-app bundle already provides workspace-files', pattern: /(remove|delete|drop)[\s\S]{0,120}(duplicate|profile patch|insert)[\s\S]{0,160}(bundle|already provides|workspace-files)/i, points: 20 },
  { key: 'not a plugin defect: the plugin code is not at fault and modifying the plugin cannot fix it', pattern: /(not a plugin (defect|bug|issue)|plugin (code |itself )?(is not|not) at fault|cannot be fixed by (modifying|changing) the plugin)/i, points: 20 },
  { key: 'prevention: grep the web-app bundle patch for the id BEFORE manually inserting into the profile patch', pattern: /(grep|check|search|look)[\s\S]{0,160}(web-app|bundle)[\s\S]{0,120}(patch|before)|(before)[\s\S]{0,120}(manually|insert|grep)/i, points: 20 },
]

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