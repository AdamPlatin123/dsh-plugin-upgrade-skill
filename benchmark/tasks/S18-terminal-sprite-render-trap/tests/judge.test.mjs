import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { gradeText } from './judge.mjs'

const testsDir = dirname(fileURLToPath(import.meta.url))
const taskDir = dirname(testsDir)
const oracle = readFileSync(join(taskDir, 'solution/report.md'), 'utf8')
const instruction = readFileSync(join(taskDir, 'instruction.md'), 'utf8')
const questionSection = instruction.slice(instruction.indexOf('**Your report**'))
const thinReport = 'The sprite renderer had bugs. I fixed the half-block background and the frame trim.'
const keywordReport = 'phantom pixels half filled background sgr persist reset ghost frames trim erase eol digest all frames timer hang unref checklist audit rollout'

test('oracle report earns 100; empty, thin and keyword-stuffed reports do not', () => {
  assert.equal(gradeText(oracle).score, 100, JSON.stringify(gradeText(oracle)))
  assert.equal(gradeText('').score, 0)
  assert.ok(gradeText(thinReport).score < 100, JSON.stringify(gradeText(thinReport)))
  assert.ok(gradeText(keywordReport).score < 100, JSON.stringify(gradeText(keywordReport)))
})

test('restating the brief itself earns nothing (no answer leak via the questions)', () => {
  assert.equal(gradeText(questionSection).score, 0, JSON.stringify(gradeText(questionSection)))
  assert.equal(gradeText(instruction).score, 0, JSON.stringify(gradeText(instruction)))
})

test('wrong advice zeroes the report even when the questions are restated', () => {
  const wrong = questionSection + '\n\nAnswers: the phantom pixels are a terminal emulator bug, no renderer fix needed. Ghost frames are caused by the palette; keep trimming rows. The drift is fine, digests are unnecessary. The hang is a Node bug; do NOT call timer.unref(). No checklist is needed.'
  assert.equal(gradeText(wrong).score, 0, JSON.stringify(gradeText(wrong)))
})

for (const advice of [
  'Do NOT skip the 49m background reset; without it the empty half keeps the stale color.',
  'Wrong advice: "the phantom pixels are a terminal emulator bug".',
  '"unref is unnecessary" is incorrect — the probe hosts never unmount.',
]) {
  test('correct or explicitly rejected advice stays valid: ' + advice, () => {
    assert.equal(gradeText(oracle + '\n\n' + advice).score, 100, JSON.stringify(gradeText(oracle + '\n\n' + advice)))
  })
}
