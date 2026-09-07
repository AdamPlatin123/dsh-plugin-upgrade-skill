// S19-msvc-flock-trap grading: read-only gate + report-content checkpoints.
// The trap: fs-ext is statically imported, so --ignore-scripts cannot skip it —
// yet Windows never calls flock (named kernel semaphore instead), so the correct
// fix is a pnpm patch (skip the native build on Windows + pure-JS fallback).
//   20 — names fs-ext and the node-gyp/MSVC root cause;
//   20 — explains why --ignore-scripts cannot work (static import must load);
//   20 — identifies the Windows named-semaphore lock path and that flock is dead
//        code on Windows;
//   25 — proposes the pnpm-patch recipe (win32 install-script skip + JS fallback,
//        Linux/macOS keep native);
//   15 — avoids Visual Studio and upstream patching (10) + cites the corridor card
//        DSH-0.1.3-A1-03 (5).
// Caps: a plan that relies on installing Visual Studio as the fix → 50; a plan that
// relies on --ignore-scripts alone → 40. Fixture modified → flat 0.
import { emit, fixtureChanges, readAgentText } from './judge-utils.mjs'

const TASK = 'S19-msvc-flock-trap'

main().catch((error) => emit(0, [`judge error: ${error.message}`]))

async function main() {
  const reasons = []

  const gate = await fixtureChanges('fixture')
  if (gate.changed === true) {
    emit(0, [`fixture was modified, 0 points for this task (read-only discipline): ${gate.detail}`])
  }
  if (gate.changed === null) reasons.push(`warning: ${gate.detail}`)
  else reasons.push('fixture unchanged (read-only discipline passed)')

  const { text } = readAgentText('', TASK)
  if (!text.trim()) {
    emit(0, [...reasons, `no report found under /app/agent-output/${TASK}/, treated as 0 points`])
  }
  const lower = text.toLowerCase()

  let score = 0
  // 1. root cause
  if (/fs-ext/.test(text) && /(node-gyp|msvc|visual studio)/i.test(text)) {
    score += 20
    reasons.push('root cause: fs-ext native build + missing MSVC toolchain (+20)')
  } else {
    reasons.push('root cause not identified (fs-ext + node-gyp/MSVC)')
  }
  // 2. static-import trap
  if (/(static(ally)? import|must exist|must load|cannot skip)/i.test(text) && /ignore-scripts/.test(text)) {
    score += 20
    reasons.push('static-import trap: --ignore-scripts cannot skip a statically imported module (+20)')
  } else {
    reasons.push('does not explain why --ignore-scripts cannot fix this')
  }
  // 3. Windows lock path
  if (/(named|kernel) (semaphore|lock)/i.test(text) && /never (a file lock|calls flock|uses flock)/i.test(text)) {
    score += 20
    reasons.push('Windows lock path: named kernel semaphore, flock never called (+20)')
  } else if (/(semaphore|CreateSemaphoreW|acquireLockHandleWin32)/i.test(text) && /flock/.test(text)) {
    score += 12
    reasons.push('Windows lock path partially identified (semaphore vs flock, +12)')
  } else {
    reasons.push('Windows lock path not identified (named semaphore; flock unused)')
  }
  // 4. patch recipe
  if (/pnpm patch|patchedDependencies|patches\//.test(text) && /(skip|only.*non-win|win32).*(native|node-gyp|build)/i.test(text) && /(fallback|no-op|pure js|javascript)/i.test(text)) {
    score += 25
    reasons.push('pnpm-patch recipe: Windows skips the native build, pure-JS fallback (+25)')
  } else if (/pnpm patch|patchedDependencies|patches\//.test(text)) {
    score += 15
    reasons.push('patch mechanism named but the recipe is incomplete (+15)')
  } else {
    reasons.push('no pnpm-patch recipe proposed')
  }
  // 5. no-VS + card citation
  let noVs = 0
  if (/do not install visual studio|not install visual studio|no visual studio|without visual studio/i.test(text) || (/visual studio/i.test(text) && /not|unnecessary|avoid/i.test(text))) {
    noVs = 10
  }
  let cited = 0
  if (/DSH-0\.1\.3-A1-03/.test(text)) cited = 5
  score += noVs + cited
  reasons.push(`no-VS discipline (+${noVs}/10), card citation DSH-0.1.3-A1-03 (+${cited}/5)`)

  // caps
  const vsOnly = /(install|use).{0,40}visual studio/i.test(text) && !/pnpm patch|patchedDependencies/.test(text)
  if (vsOnly && score > 50) {
    reasons.push('plan relies on installing Visual Studio — capped at 50')
    score = 50
  }
  const ignoreOnly = /--ignore-scripts/.test(text) && !/pnpm patch|patchedDependencies/.test(text)
  if (ignoreOnly && score > 40) {
    reasons.push('plan relies on --ignore-scripts alone — capped at 40')
    score = 40
  }

  emit(score, reasons)
}
