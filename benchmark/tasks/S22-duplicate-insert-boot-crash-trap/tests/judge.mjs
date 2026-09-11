// S22-duplicate-insert-boot-crash-trap grading: fixture read-only gate + five attribution/discipline aspects.
// Expected: the crash is attributed to Cordis's duplicate-insert rule (fatal, not merge), the
// profile-patch insert vs bundle-provided distinction is stated, the fix is to remove the
// duplicate (not add more), and the prevention step is to grep the bundle patch first.
// Every listed condition is necessary for an aspect's 20 points; the root-cause aspect
// requires BOTH the mechanism and the fatal-not-merge reasoning, so the crash log quote
// alone (or the brief's own questions) earns nothing.
import { emit, fixtureChanges, readAgentText } from './judge-utils.mjs'

const TASK = 'S22-duplicate-insert-boot-crash-trap'

const ASPECTS = [
  ['root cause: Cordis treats duplicate insert of the same plugin id as a fatal error (EntryGroup.update -> duplicate loader entry id), not a silent override or merge', [
    ['identifies the duplicate-id mechanism (duplicate + fatal/error, or EntryGroup)', /duplicate[\s\S]{0,200}(fatal|error|crash)|EntryGroup[\s\S]{0,120}duplicate/i],
    ['states the fatal-not-merge/override semantics', /(?:not|never|rather than|instead of)[\s\S]{0,60}(?:a )?(?:silent|merge|override)|fatal[\s\S]{0,80}(?:not|rather than)[\s\S]{0,40}(?:merge|override|silent)/i],
  ]],
  ['layering: config override by id is safe; insert of a NEW id is safe; insert of an ALREADY-PROVIDED id is fatal', [
    ['config override by id is safe', /(?:config override|override by id|config by id|override)[\s\S]{0,160}(?:safe|allowed)/i],
    ['insert of an already-provided/existing id is fatal', /(?:insert|adding|new row)[\s\S]{0,80}(?:new|already.(?:provided|shipped|registered)|existing|bundle-provided)[\s\S]{0,120}(?:fatal|crash|error|refus|reject)/i],
  ]],
  ['fix: remove the duplicate insert block from the profile patch; the web-app bundle already provides workspace-files', [
    ['remove the duplicate from the profile patch; bundle already provides the id', /(?:remove|delete|drop)[\s\S]{0,120}(?:duplicate|profile patch|insert)[\s\S]{0,160}(?:bundle|already provides|workspace-files)/i],
  ]],
  ['not a plugin defect: the plugin code is not at fault and modifying the plugin cannot fix it', [
    ['plugin is not at fault; plugin-side change cannot fix it', /not a plugin (?:defect|bug|issue)|plugin (?:code |itself )?(?:is not|not) at fault|cannot be fixed by (?:modifying|changing) the plugin|not fixable by (?:modifying|changing) the plugin/i],
  ]],
  ['prevention: grep the web-app bundle patch for the id BEFORE manually inserting into the profile patch', [
    ['grep/check the bundle patch before inserting', /(?:grep|check|search|inspect|look)[\s\S]{0,160}(?:web-app|bundle)[\s\S]{0,120}patch/i],
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
