// Deterministic prose rubric, not a general natural-language judge. Every listed
// condition is necessary for an aspect's 20 points. Operational contradictions
// are checked within clauses and tie negation to its own action or subject.
const ASPECTS = [
  ['phantom self-update root cause', [
    ['the version constant is baked at build time', /(?:version|constant)[\s\S]{0,120}(?:baked|inlined|read)[\s\S]{0,80}(?:build|bundle)|(?:build|build[- ]time)[\s\S]{0,100}(?:bakes?|inlines?)[\s\S]{0,80}version/i],
    ['the bump happened after the build', /(?:bump|version bump|bumping)[\s\S]{0,120}after[\s\S]{0,80}(?:build|built)|(?:build|built)[\s\S]{0,100}before[\s\S]{0,80}(?:bump|version)|(?:build|built)[\s\S]{0,80}(?:bump|bumped)/i],
    ['the client compares its baked version to the newest mirror tag', /(?:compares?|comparison)[\s\S]{0,140}(?:newest|latest|highest)[\s\S]{0,60}tag|(?:newest|latest)[\s\S]{0,40}tag[\s\S]{0,100}(?:compares?|badge)/i],
    ['corrected order: bump first, then build', /(?:bump)[\s\S]{0,80}first[\s\S]{0,120}(?:then )?(?:build)|(?:first)[\s\S]{0,40}bump[\s\S]{0,160}(?:build)/i],
    ['verify the shipped constant before pushing', /(?:grep|check|verify|assert)[\s\S]{0,120}(?:shipped|built|bundle|lib)[\s\S]{0,100}(?:constant|version)|(?:constant|version)[\s\S]{0,100}(?:grep|before (?:commit|push))/i],
  ]],
  ['client vs host plane asymmetry', [
    ['the client half re-fetches on refresh', /(?:client)[\s\S]{0,140}(?:re-?fetch|refresh|per-request|no-cache)|(?:refresh)[\s\S]{0,120}(?:client|bundle)/i],
    ['the host half registers routes once at boot', /(?:host|route|webServer)[\s\S]{0,160}(?:once|at boot|boot time|apply time)|(?:registers?)[\s\S]{0,100}(?:once|at boot)/i],
    ['the probes pin staleness to the running process', /(?:probe|png)[\s\S]{0,200}(?:200|alive)[\s\S]{0,160}(?:404|stale|running)|(?:running (?:host )?process)[\s\S]{0,100}(?:old|stale|predates)/i],
    ['a host-plane change needs a host restart', /(?:host[- ]plane|host (?:half|side)|route)[\s\S]{0,140}(?:host )?restart/i],
    ['the client-only rule does not extend to host registration', /(?:exception|does not|doesn't|not)[\s\S]{0,100}(?:hot[- ]?update|hot reload|hot-reload)/i],
  ]],
  ['broken-image attribution to upstream payload corruption', [
    ['the source file is well-formed XML', /(?:source|file|disk)[\s\S]{0,140}well[- ]formed|well[- ]formed[\s\S]{0,80}(?:source|svg|xml)/i],
    ['the session payload is spliced/corrupted', /(?:payload|session log|read[- ]result)[\s\S]{0,160}(?:splice|corrupt|mangle)|(?:splice|corrupt)[\s\S]{0,120}(?:payload|line 232)/i],
    ['the corruption is upstream of the plugin', /(?:upstream|result[- ]text|text assembly|read tool)[\s\S]{0,140}(?:corrupt|assembl|persist)|(?:corrupt)[\s\S]{0,120}(?:upstream|before the plugin)/i],
    ['do not edit or repair the traced file', /(?:never|do not|don't|must not)[\s\S]{0,60}(?:edit|repair|fix)[\s\S]{0,80}(?:file|svg|source)|editing[\s\S]{0,60}(?:the )?(?:file|svg)[\s\S]{0,80}wrong/i],
    ['the session payload is untrusted rendering input', /(?:untrusted|not trusted|validate)[\s\S]{0,140}(?:payload|input)|(?:payload)[\s\S]{0,80}(?:untrusted|validate)/i],
  ]],
  ['defensive render chain', [
    ['asset route / disk bytes as the primary source', /(?:asset route|disk bytes|real bytes)[\s\S]{0,120}(?:first|primary|prefer)|primary[\s\S]{0,80}(?:asset route|disk)/i],
    ['payload only after DOMParser/xml validation', /DOMParser|parsererror|xml valid/i],
    ['sandboxed iframe fallback, scripts blocked', /sandbox(?:ed)?[\s\S]{0,120}iframe|iframe[\s\S]{0,80}sandbox/i],
    ['SMIL animations still run in the fallback', /SMIL|animation/i],
    ['explicit error state instead of a silent broken image', /(?:explicit|visible|real)[\s\S]{0,100}(?:error|message|state)|(?:error state|error message)[\s\S]{0,120}(?:instead|rather|silent|broken)/i],
  ]],
  ['forensics method and prevention', [
    ['the session log is concatenated zstd frames, decoded per frame', /(?:concatenat|frame)[\s\S]{0,120}(?:zstd|zstandard)|(?:zstd|zstandard)[\s\S]{0,120}(?:frame|decode)/i],
    ['recover the exact stored text as splice evidence', /(?:exact|byte|stored)[\s\S]{0,100}(?:text|evidence)|evidence[\s\S]{0,100}(?:splice|line 232|offset)/i],
    ['file the upstream bug report', /(?:report|file)[\s\S]{0,100}(?:upstream|bug|issue)|(?:upstream)[\s\S]{0,80}(?:report|bug)/i],
    ['release checklist gains the bump-before-build gate', /(?:checklist|release)[\s\S]{0,140}(?:bump|gate|order)|bump[- ]before[- ]build/i],
    ['per-mirror tag SHA verification stays in the checklist', /(?:mirror|mirrors|per[- ]mirror)[\s\S]{0,120}(?:SHA|ls-remote|verif)|SHA[\s\S]{0,80}verif/i],
  ]],
]

// Bind each negation to its action, instead of a loose 40-character window.
const WRONG_ADVICE = [
  ['bump after build is fine', /(?:bump(?:ing)?|version bump)[\s\S]{0,60}after[\s\S]{0,40}(?:the )?build[\s\S]{0,40}(?:is (?:fine|ok|acceptable)|harmless|no issue)/i],
  ['the badge has a server-side cause', /(?:badge|update check)[\s\S]{0,80}is a (?:mirror|server|network)|(?:mirror|server|network)[\s\S]{0,60}(?:problem|issue|bug)[\s\S]{0,60}(?:badge|causes)/i],
  ['re-verifying mirrors fixes the badge', /(?:re-?verif|push(?:ing)?)[\s\S]{0,80}mirror[\s\S]{0,120}(?:fixes|resolves|removes)[\s\S]{0,60}badge/i],
  ['no restart needed for host routes', /(?:no need to|do not need to|don't need to|need not|skip(?:ping)?|avoid)[\s\S]{0,30}(?:restart|reboot)|(?:restart|reboot)[\s\S]{0,40}(?:is |would be )?(?:unnecessary|unneeded|not needed|optional)/i],
  ['the client refresh updates host routes', /(?:refresh|client update|browser refresh)[\s\S]{0,120}(?:updates?|reloads?|fixes?)[\s\S]{0,80}(?:host|route|server)/i],
  ['trust the session payload without validation', /(?:trust|render|use)[\s\S]{0,60}payload[\s\S]{0,80}(?:directly|without (?:any )?validat)/i],
  ['validation is unnecessary', /(?:DOMParser|xml valid|validat)(?:ion)?[\s\S]{0,60}(?:is (?:unnecessary|unneeded|optional)|can be skipped|not needed)/i],
  ['the source SVG file is corrupted', /(?:source|traced|the) (?:svg|file) (?:itself |on disk )?(?:is|was|must be) (?:corrupt|broken|damaged)/i],
  ['repair the traced file', /(?:repair|fix|rewrite)[\s\S]{0,40}(?:the )?(?:traced|source) (?:svg|file)/i],
  ['asset route is unnecessary', /(?:asset route|disk bytes)[\s\S]{0,60}(?:is (?:unnecessary|unneeded|optional)|can be skipped|not needed)/i],
  ['skip the validation (Chinese)', /(?:无需|不需要|不用)\s*(?:校验|验证|DOMParser)/i],
  ['edit the file instead (Chinese)', /(?:修复|修改|编辑)\s*(?:源文件|被追踪的文件|svg文件)/i],
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
    || /["']?\s+(?:is|would(?: be| have been))\s+(?:exactly )?(?:wrong|incorrect|false|bad advice)\b/.test(suffix)
    || /\b(?:would misattribute|misattributes?|misattribution)\b/.test(suffix)
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
