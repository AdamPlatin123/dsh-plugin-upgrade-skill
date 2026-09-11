// S18-terminal-sprite-render-trap grading: fixture read-only gate + five diagnosis aspects.
// Expected (terminal half-block sprite render trap):
//   1. Phantom pixels: half-filled cells (one empty half) leave the previous cell's SGR
//      background set; the stale background paints the empty half; fix = explicit bg
//      reset (ESC[49m) on half-filled cells.
//   2. Ghost frames: rows trimmed at trailing transparent cells let a narrower frame leave
//      the previous frame's pixels; fix = full-sprite-width rows + erase-to-EOL (ESC[K).
//   3. Frame data drift: hand-ported frame diverges from source art (23 cells / 6-pixel
//      tail-tip cluster); excerpt regression missed it; fix = digest ALL frames vs source.
//   4. Hang: rescheduling timer chain (planner setTimeout forever while mounted) pins
//      probe hosts that mount without unmount; fix = timer.unref(); interactive TUI is
//      kept alive by TTY/stdin handles.
//   5. Prevention: renderer contract checklist (half-cell bg reset, full-width rows,
//      erase-to-EOL, digest parity gate) + default-on rollout audit of probe timers.
// Every listed condition is necessary for an aspect's 20 points; patterns are anchored
// to answer-specific vocabulary (49m, erase-to-EOL, digest-all-frames, unref) so that
// restating the brief's own questions earns nothing. Wrong advice zeroes the report.
import { emit, fixtureChanges, readAgentText } from './judge-utils.mjs'

const TASK = 'S18-terminal-sprite-render-trap'

const ASPECTS = [
  ['phantom pixels: half-filled cell leaves previous SGR background set; fix = explicit background reset (ESC[49m)', [
    ['stale/persisting background across cells paints the empty half', /(?:background|bg|SGR)[\s\S]{0,160}(?:persist|leak|stale|carried|leftover|previous cell)|(?:persist|stale|leak)(?:s|ed|ing)?[\s\S]{0,100}(?:background|bg)/i],
    ['fix names the explicit background reset (ESC[49m)', /49m|bg reset|background reset/i],
  ]],
  ['ghost frames: trailing-trim lets a narrower frame leave previous pixels; fix = full-width rows + erase-to-EOL', [
    ['fix includes erase-to-EOL (ESC[K)', /erase[- ]?to[- ]?EOL|ESC\[K|x1b\[K/i],
    ['fix includes full-width rows re-output (overwrite stale cells)', /(?:full[- ]width|full sprite width|every row)[\s\S]{0,160}(?:overwrite|erase|clear|repaint|spaces)/i],
  ]],
  ['frame data drift: hand-ported frame diverges from source art; fix = digest ALL frames and assert', [
    ['fix digests ALL/every frame against the source', /digest[\s\S]{0,160}(?:ALL|every)[\s\S]{0,40}frames?/i],
    ['drift attributed to the hand-ported frame', /(?:hand[- ]?(?:ported|copied)|ported)[\s\S]{0,160}(?:drift|diverge|differ|mismatch|off)/i],
  ]],
  ['hang: rescheduling timer chain pins probe hosts that never unmount; fix = timer.unref()', [
    ['fix is timer.unref()', /\bunref\b/i],
    ['mechanism: rescheduling timer pins the event loop (process cannot exit)', /(?:reschedul|re-arm|evergreen|ever-rescheduling|setTimeout)[\s\S]{0,200}(?:pin|event loop|cannot exit|never exit|keep[\s\S]{0,20}(?:alive|open))/i],
  ]],
  ['prevention: renderer contract checklist + default-on rollout audit of probe timers', [
    ['checklist carries the concrete renderer contract items', /checklist[\s\S]{0,200}(?:49m|background plane|bg reset|full[- ]width|ESC\[K|digest)/i],
    ['rollout/default-on audit covers timer hygiene of mounting hosts', /(?:rollout|default[- ]?on|audit)[\s\S]{0,200}(?:timer|unref|mount)/i],
  ]],
]

// Bind each negation to its action (clause-level), instead of a loose window.
const WRONG_ADVICE = [
  ['no background reset needed', /(?:no need(?:ed)?|not needed|unnecessary|don'?t need|do not need|without)[\s\S]{0,40}(?:background|bg)[\s\S]{0,20}reset|(?:background|bg)[\s\S]{0,20}reset[\s\S]{0,40}(?:unnecessary|not needed)/i],
  ['phantom/ghost pixels are a terminal-emulator bug, not the renderer', /(?:phantom|ghost)[\s\S]{0,60}terminal(?: emulator)?[\s\S]{0,20}(?:bug|issue|defect|problem)|terminal(?: emulator)?[\s\S]{0,20}(?:bug|issue|defect|problem)[\s\S]{0,80}(?:no|not|instead of)[\s\S]{0,40}(?:renderer|plugin|fix)/i],
  ['do not unref the timer', /(?:do not|don'?t|never|avoid|skip)[\s\S]{0,30}unref|unref[\s\S]{0,40}(?:unnecessary|not needed|harmful|wrong|bad)/i],
  ['keep trimming rows', /(?:keep|kept|continue|retain)[\s\S]{0,30}trim/i],
  ['digests are unnecessary', /digests?[\s\S]{0,40}(?:unnecessary|not needed|optional|overkill)/i],
  ['no checklist needed', /(?:^|\s)(?:no|not)[\s\S]{0,20}checklist[\s\S]{0,30}(?:needed|necessary|required)|checklist[\s\S]{0,30}(?:unnecessary|not needed)/i],
  ['无需背景重置 (Chinese)', /(?:无需|不需要|不用)\s*(?:背景重置|重置背景)/i],
  ['不要 unref (Chinese)', /(?:不要|别|无需|不需要)[\s\S]{0,10}unref/i],
]

function clauses(text) {
  return text.replace(/```[^\n]*\n|```/g, '').replace(/[`*]/g, '')
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .split(/\n\s*\n|[;；。！？]|[.!?](?=\s|$)|[，]|(?:^|\n)\s*[-+]\s+/)
    .map((part) => part.replace(/\s+/g, ' ').trim()).filter(Boolean)
}

function rejectsAdvice(clause, match) {
  const prefix = clause.slice(0, match.index)
  const suffix = clause.slice(match.index + match[0].length)
  // Negating the bad action is good advice. Explicitly rejected quotations are
  // evidence, not recommendations; an unrelated "wrong" word is no exemption.
  return /(?:do not|don't|must not|should not|never|cannot|no|without)\s+$/i.test(prefix)
    || /(?:不要|不需|不用|无需|别)\s*$/.test(prefix)
    || /^never\b/i.test(clause)
    || /(?:wrong advice|incorrect claim|bad advice|reject the claim)\b/i.test(clause)
    || /["']?\s+(?:is|would(?: be| have been)|have been)\s+(?:exactly )?(?:the )?(?:wrong|incorrect|false|bad advice|wrong move)\b/.test(suffix)
    || /\b(?:would misattribute|misattributes?|misattribution)\b/.test(suffix)
}

/**
 * Grade one report text against the five diagnosis aspects.
 * @param text - the agent report text.
 * @returns the score and per-aspect reasons.
 */
export function gradeText(text) {
  if (!text.trim()) return { score: 0, reasons: ['no report found, treated as 0 points'] }
  const parts = clauses(text)
  const contradictions = []
  for (const [key, pattern] of WRONG_ADVICE) {
    for (const part of parts) {
      const match = pattern.exec(part)
      if (match && !rejectsAdvice(part, match)) contradictions.push(key)
    }
  }
  if (contradictions.length) {
    return { score: 0, reasons: ['WRONG CONCLUSION: ' + [...new Set(contradictions)].join('; ')] }
  }
  let score = 0
  const reasons = []
  for (const [key, checks] of ASPECTS) {
    const missing = checks.filter(([, pattern]) => !pattern.test(text))
    if (missing.length === 0) {
      score += 20
      reasons.push(`hit aspect: ${key} (+20)`)
    } else {
      reasons.push(`missing aspect: ${key}: ${missing.map(([label]) => label).join('; ')} (-20)`)
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
