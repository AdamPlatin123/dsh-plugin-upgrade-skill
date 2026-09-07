import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { PROTOCOL, RUBRICS } from './rubrics.mjs'
import { collectFiles, isMain, sha256 } from './judge.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
export const REPO = resolve(HERE, '../..')

export function excerpt(text, heading) {
  const lines = text.split('\n')
  const start = lines.findIndex(line => /^#{2,3} /.test(line) && line.replace(/^#+ /, '').startsWith(`${heading} `))
  if (start < 0) throw new Error(`missing reference heading: ${heading}`)
  const level = lines[start].match(/^#+/)[0].length
  let end = start + 1
  while (end < lines.length && !(new RegExp(`^#{1,${level}} `).test(lines[end]))) end += 1
  return { start: start + 1, end, text: lines.slice(start, end).join('\n').trim() }
}

export function makePacket(task, root = REPO) {
  const rubric = RUBRICS[task]
  if (!rubric) throw new Error(`not a pilot task: ${task}`)
  const taskRoot = join(root, 'benchmark/tasks', task)
  const references = rubric.references.map(ref => {
    const full = readFileSync(join(root, ref.path), 'utf8')
    return { id: ref.heading, path: ref.path, source_sha256: sha256(full), ...excerpt(full, ref.heading) }
  })
  let commit = null
  try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim() } catch {}
  return { protocol: PROTOCOL, task, source_commit: commit,
    instruction: readFileSync(join(taskRoot, 'instruction.md'), 'utf8'),
    rubric: { criteria: rubric.criteria, caps: rubric.caps ?? [] }, references,
    fixture: collectFiles(join(taskRoot, 'environment/fixture')) }
}

export function pilotToml(original) {
  // Keep the exact agent phase, resources and prompt. The pilot's version and
  // sealed grader are separate from all registered historical task definitions.
  return original
    .replace(/schema_version = "1.4"/, `schema_version = "1.4"\nartifacts = [{ source = "/app/fixture" }, { source = "/app/agent-output" }]`)
    .replace(/^version = "1\.1\.0"$/m, 'version = "2.0.0"')
    .replace(/^(name = "dsh-plugin-upgrade\/[^"\n]+)"$/m, '$1-llm-pilot"')
    .replace(/\[verifier\][\s\S]*?(?=\n\[|$)/, `[verifier]
timeout_sec = 240.0
environment_mode = "separate"
network_mode = "public"

[verifier.env]
REPORT_JUDGE_BASE_URL = "\${REPORT_JUDGE_BASE_URL}"
REPORT_JUDGE_MODEL = "\${REPORT_JUDGE_MODEL}"
REPORT_JUDGE_API_KEY = "\${REPORT_JUDGE_API_KEY}"
`)
}

export function prepare(out, root = REPO) {
  const destination = resolve(out)
  const rel = relative(join(root, 'benchmark/tasks'), destination)
  if (!rel || (!rel.startsWith('..') && !isAbsolute(rel))) throw new Error('pilot output must be outside benchmark/tasks')
  if (existsSync(destination)) throw new Error('pilot output already exists; choose a fresh directory')
  // Finish validating inputs before creating the output directory.
  const packets = Object.keys(RUBRICS).map(task => makePacket(task, root))
  mkdirSync(destination, { recursive: true })
  const manifest = { protocol: PROTOCOL, tasks: [] }
  for (const packet of packets) {
    const source = join(root, 'benchmark/tasks', packet.task)
    const target = join(destination, packet.task)
    mkdirSync(join(target, 'tests'), { recursive: true })
    for (const name of ['instruction.md', 'environment', 'solution']) cpSync(join(source, name), join(target, name), { recursive: true })
    // Ensure the configured report artifact exists even on a no-op agent trial.
    const dockerfile = join(target, 'environment/Dockerfile')
    writeFileSync(dockerfile, readFileSync(dockerfile, 'utf8') + '\nRUN mkdir -p /app/agent-output\n')
    writeFileSync(join(target, 'task.toml'), pilotToml(readFileSync(join(source, 'task.toml'), 'utf8')))
    const packetJson = JSON.stringify(packet, null, 2) + '\n'
    writeFileSync(join(target, 'tests/packet.json'), packetJson)
    cpSync(join(HERE, 'judge.mjs'), join(target, 'tests/judge.mjs'))
    writeFileSync(join(target, 'tests/test.sh'), '#!/bin/bash\nset -euo pipefail\nnode /tests/judge.mjs\n')
    writeFileSync(join(target, 'tests/Dockerfile'), 'FROM node:24-bookworm\nWORKDIR /tests\nCOPY . /tests\nRUN chmod +x /tests/test.sh\n')
    manifest.tasks.push({ task: packet.task, packet_sha256: sha256(JSON.stringify(packet)),
      judge_sha256: sha256(readFileSync(join(HERE, 'judge.mjs'))), instruction_sha256: sha256(packet.instruction),
      original_judge_sha256: sha256(readFileSync(join(source, 'tests/judge.mjs'))),
      original_solution_sha256: sha256(readFileSync(join(source, 'solution/report.md'))) })
  }
  writeFileSync(join(destination, 'pilot-manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  return manifest
}

if (isMain(import.meta.url)) {
  if (process.argv.length !== 4 || process.argv[2] !== '--out') {
    console.error('Usage: node benchmark/report-judge/prepare.mjs --out /tmp/report-judge-pilot')
    process.exitCode = 1
  } else {
    try { console.log(JSON.stringify(prepare(process.argv[3]), null, 2)) }
    catch (error) { console.error(error.message); process.exitCode = 1 }
  }
}
