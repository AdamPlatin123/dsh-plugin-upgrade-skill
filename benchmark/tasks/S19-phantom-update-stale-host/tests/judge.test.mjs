import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { gradeReport } from './report-grading.mjs'

const testsDir = dirname(fileURLToPath(import.meta.url))
const taskDir = dirname(testsDir)
const oracle = readFileSync(join(taskDir, 'solution/report.md'), 'utf8')
const wrongReport = "The phantom badge is a mirror problem: re-verifying the mirrors fixes it.\nThe refresh updates host routes too, so no restart is needed. Skip the restart.\nThe source SVG file is corrupted, so repair the traced file directly.\nRender the payload directly without validation; DOMParser validation is unnecessary. The asset route is unnecessary.\nJust edit the file instead."
const keywordReport = "The version constant is baked at build time.\nThe host half registers routes once at boot.\nThe session payload is corrupted; the source file is well-formed XML.\nAsset route first, DOMParser validation, sandboxed iframe fallback, explicit error state.\nDecode the zstd frames; verify mirror SHAs."

test('reference report earns 100; empty, wrong and keyword-only answers do not', () => {
  assert.equal(gradeReport(oracle).score, 100, JSON.stringify(gradeReport(oracle)))
  assert.equal(gradeReport('').score, 0)
  assert.equal(gradeReport(wrongReport).score, 0, JSON.stringify(gradeReport(wrongReport)))
  assert.equal(gradeReport(keywordReport).score < 100, true, JSON.stringify(gradeReport(keywordReport)))
})

test('a separately written complete report also earns full credit', () => {
  const report = "Phantom self-update: the version constant is baked into the client bundle at build time and the bump happened after the build, so the shipped bundle compared 0.3.6 against the newest mirror tag v0.3.7. Corrected order: bump first, then build, then grep the shipped lib for the constant before pushing. Mirror SHA verification was fine and is irrelevant to the badge.\nClient vs host: the client half re-fetches per-request with no-cache so the toggle appeared; the host half registers its routes once at boot (apply-time closure), so the probes (PNG 200, SVG 404, disk lib whitelists svg) pin the staleness to the running host process. A host-plane change needs a host restart — the exception to hot-update, which covers only the client bundle.\nBroken image: the source file is well-formed XML; the session-log payload is spliced (line 247's tail at the shared prefix \"stro\"); the corruption is upstream of the plugin in the result-text assembly. Never edit or repair the traced file; treat the session payload as untrusted rendering input.\nRender chain: asset route disk bytes first; payload only after DOMParser xml validation (parsererror rejection); sandboxed iframe fallback with scripts blocked while SMIL animations still run; an explicit error state instead of a silent broken image.\nForensics and prevention: the session log is concatenated zstd frames decoded per frame, recovering the exact stored text as splice evidence; file the upstream bug report; the release checklist gains the bump-before-build gate and per-mirror tag SHA verification."
  assert.equal(gradeReport(report).score, 100, JSON.stringify(gradeReport(report)))
})

for (const advice of [
  'Do NOT bump the version first; the release log shows the build ran before the bump, which is the bug.',
  'Wrong advice: "the badge is a mirror problem".',
  '"Restart is unnecessary" is incorrect for host-plane changes.',
  'Do not trust the session payload without validation.',
  'Never repair the traced file; the source SVG is well-formed.',
  'Editing or "repairing" the traced file would have been the wrong move.',
  '不要跳过校验，也不要修改源文件。',
]) {
  test('correct or explicitly rejected advice stays valid: ' + advice, () => {
    assert.equal(gradeReport(oracle + '\n\n' + advice).score, 100)
  })
}
