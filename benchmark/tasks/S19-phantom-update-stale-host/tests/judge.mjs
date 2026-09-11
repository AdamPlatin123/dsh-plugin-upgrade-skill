import { emit, fixtureChanges, readAgentText } from './judge-utils.mjs'
import { gradeReport } from './report-grading.mjs'

const TASK = 'S19-phantom-update-stale-host'
main().catch((error) => emit(0, ['judge error: ' + error.message]))

async function main() {
  const gate = await fixtureChanges('fixture')
  if (gate.changed !== false) emit(0, ['fixture read-only check failed: ' + gate.detail])
  const { text, files } = readAgentText('', TASK)
  const result = gradeReport(text)
  emit(result.score, ['fixture unchanged (read-only discipline passed)',
    'read agent report: ' + files.join(', '), ...result.reasons])
}
