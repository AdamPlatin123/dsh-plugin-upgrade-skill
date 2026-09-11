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
const thin = 'The boot crashed. I will fix the profile patch.'
const keyword = 'duplicate insert fatal error remove fix crash boot profile patch workspace-files plugin cordis'

test('oracle report earns 100; empty, thin and keyword-stuffed reports do not', () => {
  assert.equal(gradeText(oracle).score, 100, JSON.stringify(gradeText(oracle)))
  assert.equal(gradeText('').score, 0)
  assert.ok(gradeText(thin).score < 100, JSON.stringify(gradeText(thin)))
  assert.ok(gradeText(keyword).score < 100, JSON.stringify(gradeText(keyword)))
})

test('restating the brief itself earns nothing (no answer leak via the questions)', () => {
  assert.equal(gradeText(questionSection).score, 0, JSON.stringify(gradeText(questionSection)))
  assert.equal(gradeText(instruction).score, 0, JSON.stringify(gradeText(instruction)))
})

test('the evidence pack alone earns nothing (fixture conclusions were scrubbed)', () => {
  for (const name of ['boot-crash-log.txt', 'profile-patch-excerpt.txt', 'web-app-patch-excerpt.txt', 'README.md']) {
    const text = readFileSync(join(taskDir, 'environment/fixture', name), 'utf8')
    assert.equal(gradeText(text).score, 0, name + ': ' + JSON.stringify(gradeText(text)))
  }
})
