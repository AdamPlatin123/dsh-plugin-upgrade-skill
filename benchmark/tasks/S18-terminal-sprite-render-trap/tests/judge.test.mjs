import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { gradeText } from './judge.mjs'

const testsDir = dirname(fileURLToPath(import.meta.url))
const taskDir = dirname(testsDir)
const oracle = readFileSync(join(taskDir, 'solution/report.md'), 'utf8')
const thinReport = 'The sprite renderer had bugs. I fixed the half-block background and the frame trim.'
const keywordReport = 'phantom pixels half filled background sgr reset ghost frames trim erase eol digest all frames timer unref checklist audit'

test('oracle report earns 100; empty and thin reports do not', () => {
  assert.equal(gradeText(oracle).score, 100, JSON.stringify(gradeText(oracle)))
  assert.equal(gradeText('').score, 0)
  assert.ok(gradeText(thinReport).score < 100, JSON.stringify(gradeText(thinReport)))
  assert.ok(gradeText(keywordReport).score < 100, JSON.stringify(gradeText(keywordReport)))
})
