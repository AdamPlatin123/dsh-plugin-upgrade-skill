// benchmark 判分入口：
//   node benchmark/run.mjs [--task ID ... | --all] [--agent-output DIR]
// 汇总各任务 judge.mjs 的结果，写 benchmark/scorecard.json 并在控制台打对齐表格。
import { execFile } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const BENCH = resolve(fileURLToPath(import.meta.url), '..')
const REPO = resolve(BENCH, '..')

function parseArgs(argv) {
  const args = { tasks: [], all: false, agentOutput: join(BENCH, 'agent-output') }
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--task') args.tasks.push(argv[i + 1])
    else if (argv[i] === '--all') args.all = true
    else if (argv[i] === '--agent-output') args.agentOutput = resolve(argv[i + 1])
  }
  if (!args.all && args.tasks.length === 0) args.all = true
  return args
}

function discoverTasks() {
  return readdirSync(join(BENCH, 'tasks'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(BENCH, 'tasks', entry.name, 'judge.mjs')))
    .map((entry) => entry.name)
    .sort()
}

function runJudge(taskId, agentOutput) {
  return new Promise((resolvePromise) => {
    const judge = join(BENCH, 'tasks', taskId, 'judge.mjs')
    execFile('node', [judge, '--agent-output', agentOutput], { cwd: join(BENCH, 'tasks', taskId), timeout: 420000 }, (error, stdout, stderr) => {
      const lines = stdout.trim().split('\n').filter(Boolean)
      let result = null
      for (let i = lines.length - 1; i >= 0; i -= 1) {
        try {
          const parsed = JSON.parse(lines[i])
          if (typeof parsed.score === 'number' && typeof parsed.max === 'number') {
            result = { score: parsed.score, max: parsed.max, reasons: parsed.reasons ?? [] }
            break
          }
        } catch { /* 非 JSON 行 */ }
      }
      if (!result) {
        result = {
          score: 0,
          max: 100,
          reasons: [`judge 未输出合法 JSON（exit=${error?.code ?? 0}）`, stderr.trim().slice(0, 300)].filter(Boolean),
        }
      }
      resolvePromise(result)
    })
  })
}

function displayWidth(str) {
  let width = 0
  for (const ch of String(str)) width += /[\u3000-\u303f\u4e00-\u9fff\uff00-\uffef]/.test(ch) ? 2 : 1
  return width
}

function pad(text, width) {
  const str = String(text)
  const len = displayWidth(str)
  return len >= width ? str : str + ' '.repeat(width - len)
}

const args = parseArgs(process.argv.slice(2))
const allTasks = discoverTasks()
const selected = args.all ? allTasks : args.tasks.filter((id) => {
  if (!allTasks.includes(id)) console.error(`警告: 未知任务 ${id}（可用: ${allTasks.join(', ')}）`)
  return allTasks.includes(id)
})

if (selected.length === 0) {
  console.error('没有可运行的任务')
  process.exit(1)
}

console.log(`agent-output: ${args.agentOutput}`)
console.log(`tasks: ${selected.join(', ')}\n`)

const rows = []
for (const taskId of selected) {
  process.stdout.write(`▶ ${taskId} ... `)
  const result = await runJudge(taskId, args.agentOutput)
  rows.push({ task: taskId, ...result })
  console.log(`${result.score}/${result.max}`)
}

const total = rows.reduce((sum, row) => sum + row.score, 0)
const max = rows.reduce((sum, row) => sum + row.max, 0)

// 控制台表格
const width = Math.max(...rows.map((row) => row.task.length), 4)
console.log('')
console.log(`${pad('TASK', width)}  SCORE    REASONS`)
console.log(`${'-'.repeat(width)}  -------  --------`)
for (const row of rows) {
  console.log(`${pad(row.task, width)}  ${pad(`${row.score}/${row.max}`, 7)}  ${row.reasons[0] ?? ''}`)
  for (const reason of row.reasons.slice(1)) {
    console.log(`${' '.repeat(width)}  ${' '.repeat(7)}  ${reason}`)
  }
}
console.log(`${'-'.repeat(width)}  -------`)
console.log(`${pad('TOTAL', width)}  ${total}/${max}`)

mkdirSync(BENCH, { recursive: true })
const scorecard = {
  generatedAt: new Date().toISOString(),
  agentOutput: args.agentOutput,
  repo: REPO,
  total,
  max,
  tasks: rows.map((row) => ({ task: row.task, score: row.score, max: row.max, reasons: row.reasons })),
}
const out = join(BENCH, 'scorecard.json')
writeFileSync(out, JSON.stringify(scorecard, null, 2) + '\n')
console.log(`\nscorecard: ${out}`)
