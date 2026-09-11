import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { gradeText } from './judge.mjs'

const testsDir = dirname(fileURLToPath(import.meta.url))
const taskDir = dirname(testsDir)
const oracle = readFileSync(join(taskDir, 'solution/report.md'), 'utf8')
const instruction = readFileSync(join(taskDir, 'instruction.md'), 'utf8')
const questionSection = instruction.slice(instruction.indexOf('**Your report**'))
const thin = 'The service is unavailable. I will fix the plugin.'
const keyword = 'resource provider metadata delivery chain contrast probe per-module sweep 62 restart rollback upstream report paste-input fold unrelated'

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

test('the evidence pack alone earns at most 20 (fixture conclusions were scrubbed)', () => {
  const dir = join(taskDir, 'environment/fixture')
  const all = readdirSync(dir)
    .map((name) => { try { return readFileSync(join(dir, name), 'utf8') } catch { return '' } })
    .join('\n')
  assert.ok(gradeText(all).score <= 20, JSON.stringify(gradeText(all)))
})
