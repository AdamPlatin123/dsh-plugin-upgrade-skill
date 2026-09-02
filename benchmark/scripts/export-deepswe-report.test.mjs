// Self-tests for the DeepSWE-shaped report export. Synthetic judge ledgers only —
// real verifier output files are never touched.
import test from 'node:test'
import assert from 'node:assert/strict'
import { toDeepsweReport } from './export-deepswe-report.mjs'

function ledger(checkpoints, score = 100) {
  return { score, max: 100, reasons: [], checkpoints }
}

const FULL = ledger([
  { id: 'authed-200', label: 'x', type: 'pass-to-pass', points: 40, awarded: 40, patched: 'pass', pristine: 'pass' },
  { id: 'no-auth-401', label: 'x', type: 'fail-to-pass', points: 40, awarded: 40, patched: 'pass', pristine: 'fail' },
  { id: 'raw-route-removed', label: 'x', type: 'fail-to-pass', points: 20, awarded: 20, patched: 'pass', pristine: 'fail' },
])

const NAKED = ledger([
  { id: 'authed-200', label: 'x', type: 'pass-to-pass', points: 40, awarded: 40, patched: 'pass', pristine: 'pass' },
  { id: 'no-auth-401', label: 'x', type: 'fail-to-pass', points: 40, awarded: 0, patched: 'fail', pristine: 'fail' },
  { id: 'raw-route-removed', label: 'x', type: 'fail-to-pass', points: 20, awarded: 0, patched: 'fail', pristine: 'fail' },
], 40)

test('full pass maps to binary reward 1 with all buckets passed', () => {
  const report = toDeepsweReport(FULL, 'M5-token-auth-smoke')
  assert.equal(report.task, 'M5-token-auth-smoke')
  assert.equal(report.reward, 1)
  assert.equal(report.f2p_total, 2)
  assert.equal(report.f2p_passed, 2)
  assert.equal(report.f2p, 1)
  assert.equal(report.p2p_total, 1)
  assert.equal(report.p2p_passed, 1)
  assert.equal(report.p2p, 1)
  assert.equal(report.score, 1)
  assert.equal(report.partial, 1)
  assert.equal(report.ctrf.results.summary.passed, 3)
  assert.deepEqual(report.ctrf.results.tests[0], { name: '[p2p] authed-200', status: 'passed' })
})

test('partial state maps to binary reward 0 with the graded score preserved', () => {
  const report = toDeepsweReport(NAKED, 'M5-token-auth-smoke')
  assert.equal(report.reward, 0)
  assert.equal(report.f2p_passed, 0)
  assert.equal(report.p2p_passed, 1)
  assert.equal(report.p2p, 1)
  assert.equal(report.score, 0.4)
  assert.equal(report.partial, 1 / 3)
})

test('an empty p2p bucket defaults the p2p ratio to 1.0', () => {
  const onlyF2p = ledger([
    { id: 'a', label: 'x', type: 'fail-to-pass', points: 100, awarded: 100, patched: 'pass', pristine: 'fail' },
  ])
  const report = toDeepsweReport(onlyF2p, 'T')
  assert.equal(report.p2p_total, 0)
  assert.equal(report.p2p, 1)
  assert.equal(report.reward, 1)
})

test('an empty ledger maps to zeroed buckets, not division errors', () => {
  const report = toDeepsweReport(ledger([]), 'T')
  assert.equal(report.reward, 0)
  assert.equal(report.f2p, 0)
  assert.equal(report.p2p, 1)
  assert.equal(report.partial, 0)
})

test('report and pass checkpoints are bucketed as f2p', () => {
  const mixed = ledger([
    { id: 'r', label: 'x', type: 'report', points: 50, awarded: 50, patched: 'pass' },
    { id: 'p', label: 'x', type: 'pass', points: 50, awarded: 50, patched: 'pass' },
  ])
  const report = toDeepsweReport(mixed, 'T')
  assert.equal(report.f2p_total, 2)
  assert.equal(report.p2p_total, 0)
  assert.equal(report.reward, 1)
})
