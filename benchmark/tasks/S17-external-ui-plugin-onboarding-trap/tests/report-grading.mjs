// Deterministic prose rubric, not a general natural-language judge. Every listed
// condition is necessary for an aspect's 20 points. Operational contradictions
// are checked within clauses and tie negation to its own action or subject.
const ASPECTS = [
  ['combo root cause', [
    ['raw ESM breaks the whole classic-script combo', /(?:import|esm)[\s\S]{0,240}(?:combo|classic|entire|whole)[\s\S]{0,160}(?:fail|syntax|compil)|(?:import|esm)[\s\S]{0,240}(?:fail|syntax|compil)[\s\S]{0,160}(?:entire|whole)[\s\S]{0,30}combo/i],
    ['zero plugin registrations', /(?:zero|no|none of the|0) plugins? (?:\w+\s+){0,3}register|(?:all|every) plugins?[\s\S]{0,60}(?:fail to|cannot|can't) register/i],
    ['the named stock entry is innocent', /(?:typert-registry|named entry)[\s\S]{0,160}(?:first|innocent|misattribut)|(?:first awaited|first entry)[\s\S]{0,120}(?:innocent|misattribut)/i],
  ]],
  ['diagnosis and client packaging', [
    ['bisect profile inserts', /bisect[\s\S]{0,100}(?:insert|patch)/i],
    ['parse as a classic script', /(?:classic[- ]script|vm\.Script)[\s\S]{0,120}(?:pars|check|probe)|(?:pars|check|probe)[\s\S]{0,120}(?:classic[- ]script|vm\.Script)/i],
    ['register a loader factory', /__ModuleLoader__\.load\s*\(\s*\{[\s\S]{0,120}\bid\b[\s\S]{0,120}\bfactory\b/i],
    ['React comes from require inside the factory', /(?:react|require\s*\()[\s\S]{0,180}(?:inside|within)[\s\S]{0,40}factory|factory[\s\S]{0,200}require\s*\(\s*['"]react(?:\/jsx-runtime)?['"]/i],
    ['export both inject and apply', /exports?[\s\S]{0,80}\binject\b[\s\S]{0,80}\bapply\b|(?:module\.)?exports\.inject[\s\S]{0,120}(?:module\.)?exports\.apply/i],
  ]],
  ['cross-entry slot contract', [
    ['the owning entry declares the slot', /(?:slot[\s\S]{0,70}declar[\s\S]{0,70}(?:another|owner|parent)|(?:owner|parent|another entry)[\s\S]{0,70}declar)/i],
    ['defer registration until declaration', /(?:defer|wait)[\s\S]{0,100}declar|(?:register|registration)[\s\S]{0,100}before[\s\S]{0,60}declar/i],
    ['wrap registration in slots.inject', /(?:ctx\.)?slots\.inject\s*\(\s*['"]settings\.section['"]\s*,\s*\(\s*\)\s*=>\s*(?:\{\s*)?(?:return\s+)?(?:ctx\.)?slots\.register\s*\(/i],
    ['registrant field whitelist', /(?:only|just)[\s\S]{0,45}\bname\b[\s\S]{0,30}\bid\b[\s\S]{0,30}\border\b/i],
    ['kind and scope belong to the declaration', /(?:kind[\s\S]{0,15}scope|scope[\s\S]{0,15}kind)[\s\S]{0,100}(?:declar|must not|never|omit)|(?:omit|never|must not)[\s\S]{0,50}kind[\s\S]{0,15}scope/i],
  ]],
  ['host restart and Windows process tree', [
    ['combo assembled once per boot', /(?:combo|bundle)[\s\S]{0,80}(?:assembl|compos|build|built)[\s\S]{0,60}once[\s\S]{0,40}boot/i],
    ['no HMR rebuild', /(?:no|without)[\s\S]{0,15}hmr|hmr[\s\S]{0,40}(?:unavailable|unsupported|does not|cannot)/i],
    ['full host restart on each edit', /(?:every|each)[\s\S]{0,70}(?:edit|change|iteration)[\s\S]{0,160}(?:requires?|needs?|must|ends with)[\s\S]{0,60}(?:full |whole )?host restart/i],
    ['kill the process tree on Windows', /taskkill\s+\/PID\s+\S+\s+\/T\s+\/F|(?:kill|stop)\s+(?:(?:the|whole|entire)\s+){0,2}(?:process )?tree/i],
    ['old process holds the port and causes EADDRINUSE', /(?:process|tree)[\s\S]{0,120}(?:hold|port)[\s\S]{0,100}EADDRINUSE|EADDRINUSE[\s\S]{0,120}(?:old|orphan|previous)[\s\S]{0,80}(?:process|port)/i],
  ]],
  ['host and author prevention', [
    ['scan each bundle at startup', /(?:startup|boot)[\s\S]{0,120}(?:scan|pars|check)[\s\S]{0,100}(?:each|every)[\s\S]{0,60}(?:plugin|bundle)|(?:scan|pars|check)[\s\S]{0,100}(?:each|every)[\s\S]{0,60}(?:plugin|bundle)[\s\S]{0,120}(?:startup|boot)/i],
    ['name the offending plugin', /(?:name|identify|attribut)[\s\S]{0,80}(?:offend|culprit|faulty)|(?:offend|culprit|faulty)[\s\S]{0,80}(?:name|identify|attribut)/i],
    ['authoring template or checklist', /(?:author|onboard)[\s\S]{0,100}(?:template|checklist)|(?:template|checklist)[\s\S]{0,100}(?:author|onboard)/i],
  ]],
]

// Bind each negation to its action, instead of a loose 40-character window.
const WRONG_ADVICE = [
  ['omit slots.inject', /\b(?:do not|don't|never)\s+(?:use|call|wrap (?:with|in))\s+(?:ctx\.)?slots\.inject\b/i],
  ['remove slots.inject', /\b(?:avoid|remove|drop|omit)\s+(?:the\s+)?(?:ctx\.)?slots\.inject\b/i],
  ['slots.inject is unnecessary', /\b(?:ctx\.)?slots\.inject\s+(?:(?:is|would be|can be|must be|should be)\s+)?(?:unnecessary|unneeded|not needed|not required|not necessary|removed|omitted|skipped)/i],
  ['blame slots.inject for the race', /\bslots\.inject\s+(?:creates?|causes?)[\s\S]{0,45}(?:race|problem)/i],
  ['register directly', /^(?:then\s+|instead\s+)?(?:call|use)\s+(?:ctx\.)?slots\.register\s+directly\b/i],
  ['restart is unnecessary', /\b(?:host\s+)?restart(?:ing)?\s+(?:is|would be)\s+(?:unnecessary|unneeded|optional|not needed|not required|not necessary)/i],
  ['skip the restart', /\b(?:skip|omit|avoid)\s+(?:(?:the|a|full|host)\s+){0,3}restart\b/i],
  ['no need to restart', /\b(?:no need to|do not need to|don't need to|need not)\s+restart\b/i],
  ['HMR rebuilds the combo', /\bhmr\s+(?:(?:automatically|always)\s+)?rebuilds?\b/i],
  ['keep raw ESM', /\b(?:keep|retain|preserve)\s+(?:the\s+)?(?:raw esm|top[- ]level imports?)\b/i],
  ['wrong registrant fields', /\bregistrants?\s+(?:should|must|can)\s+(?:set|pass|include)\s+kind\s+and\s+scope\b/i],
  ['omit slots.inject (Chinese)', /(?:不要|无需|不需要|不用)\s*(?:使用|用|调用)?\s*(?:ctx\.)?slots\.inject/i],
  ['skip restart (Chinese)', /(?:无需|不需要|不用)\s*(?:完整|整体)?\s*重启/i],
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
    || /(?:wrong advice|incorrect claim|bad advice|reject the claim)[:"'\s]*$/i.test(prefix)
    || /["']?\s+(?:is|would be)\s+(?:wrong|incorrect|false|bad advice)\b/i.test(suffix)
}

export function gradeReport(text) {
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
    const missing = checks.filter(([, pattern]) => !parts.some((part) => pattern.test(part)))
    if (missing.length === 0) {
      score += 20
      reasons.push(`hit aspect: ${key} (+20)`)
    } else {
      reasons.push(`missing aspect: ${key}: ${missing.map(([label]) => label).join('; ')} (-20)`)
    }
  }
  return { score, reasons }
}
