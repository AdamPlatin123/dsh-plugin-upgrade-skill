// verify-runtime.check.mjs — offline self-check for verify-runtime.mjs.
// Runs the diagnosis signatures against representative log fixtures and the
// spec/structure helpers against temp directories; exercises the CLI surface.
// No dsh environment required: `node scripts/verify-runtime.check.mjs`.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { classifySpec, detectPluginStructure, diagnoseBootLog, isWebPlugin, listKeyFor } from './verify-runtime.mjs'

const here = dirname(fileURLToPath(import.meta.url))

// --- diagnoseBootLog: signature priority + fixtures --------------------------

const BOOT_FIXTURES = [
  {
    name: 'activation failure (pending on a removed service)',
    log: 'Error: dsh: plugin tree failed to load: dsh: 1 entry did not activate\n@demo/p: pending (waiting for service: apiProxy)',
    verdict: 'activation-failed',
    attribution: 'plugin-code',
  },
  {
    name: 'host wait for webServer, plural service list (fleet regression shape)',
    log: '[warn] entry @demo/p waiting for services: webServer, sessionTitle',
    verdict: 'env-needs-service-host',
    attribution: 'profile-config',
  },
  {
    name: 'wait for a removed service is NOT an environment issue (it is the migration case)',
    log: 'Error: dsh: plugin tree failed to load\n@demo/old: pending (waiting for service: apiProxy)',
    verdict: 'activation-failed',
    attribution: 'plugin-code',
  },
  {
    name: 'module resolve crash',
    log: "node:internal/process/esm_loader:404\nError [ERR_MODULE_NOT_FOUND]: Cannot find module '@demo/missing'",
    verdict: 'load-crash-module-resolve',
    attribution: 'dependency-resolution',
  },
  {
    name: 'transport signature = tree loaded (pass)',
    log: '[agent] TRANSPORT: connect ECONNREFUSED 127.0.0.1:9 — model endpoint unreachable',
    verdict: 'pass-boot-probe',
    attribution: null,
  },
  {
    name: 'transport signature, fetch-failed variant',
    log: 'TypeError: fetch failed\n    at node:internal/deps/undici/...',
    verdict: 'pass-boot-probe',
    attribution: null,
  },
]

for (const fx of BOOT_FIXTURES) {
  const got = diagnoseBootLog(fx.log)
  assert.deepEqual(got, { verdict: fx.verdict, attribution: fx.attribution }, `fixture: ${fx.name}`)
}

// Priority: a host wait must outrank a transport line appearing later in the log.
assert.equal(
  diagnoseBootLog('later: TRANSPORT ECONNREFUSED\nfirst: waiting for services: webServer')?.verdict,
  'env-needs-service-host',
  'host wait outranks transport signature',
)
// Priority: module crash outranks activation text in the same log.
assert.equal(
  diagnoseBootLog('x: 1 entry did not activate\ny: Error: Cannot find module')?.verdict,
  'load-crash-module-resolve',
  'module crash outranks activation failure',
)

// The bare word "network" must NOT count as a transport signature.
assert.equal(
  diagnoseBootLog('[plugin] network features initialised — no error'),
  null,
  'bare "network" is not a pass signature',
)
// No signature at all -> null (caller falls back to exit code / retry).
assert.equal(diagnoseBootLog('dsh booted fine, quiet log'), null, 'quiet log -> no diagnosis')

// --- classifySpec -------------------------------------------------------------

assert.equal(classifySpec('@deepseek-ai/dsh-some-plugin'), 'npm-name')
assert.equal(classifySpec('dsh-better-sidebar'), 'npm-name')
assert.equal(classifySpec('https://github.com/user/plugin.git'), 'git-url')
assert.equal(classifySpec('git@github.com:user/plugin.git'), 'git-url')
assert.equal(classifySpec('./examples/legacy-plugin'), 'directory')
assert.equal(classifySpec('/abs/path/plugin'), 'directory')
// A bare relative path that exists on disk is a directory, not a scoped npm name.
assert.equal(classifySpec(join(here, '..')), 'directory')
// A slashy token that is NOT an existing path and NOT scoped is unknown.
assert.equal(classifySpec('no-such-dir/nor-npm'), 'unknown')
assert.equal(classifySpec('not a spec!!'), 'unknown')

// --- detectPluginStructure / isWebPlugin / listKeyFor (temp dirs) ------------

const root = mkdtempSync(join(tmpdir(), 'verify-check-'))
try {
  const pkgDir = join(root, 'pkg')
  mkdirSync(pkgDir)
  writeFileSync(join(pkgDir, 'package.json'), '{"name":"@demo/pkg"}')
  assert.equal(detectPluginStructure(pkgDir), 'package.json')
  assert.equal(isWebPlugin(pkgDir), false)
  assert.equal(listKeyFor(pkgDir, 'directory'), '@demo/pkg')

  const webDir = join(root, 'web')
  mkdirSync(webDir)
  writeFileSync(join(webDir, 'package.json'), '{"name":"web-p","dsh":{"client":{"platform":"web"}}}')
  assert.equal(isWebPlugin(webDir), true)

  const cordisDir = join(root, 'cordis')
  mkdirSync(cordisDir)
  writeFileSync(join(cordisDir, 'cordis.yml'), '[]')
  assert.equal(detectPluginStructure(cordisDir), 'cordis.yml')
  assert.equal(listKeyFor(cordisDir, 'directory'), 'cordis', 'no package.json -> basename')

  const skillsDir = join(root, 'sk')
  mkdirSync(join(skillsDir, 'skills'), { recursive: true })
  assert.equal(detectPluginStructure(skillsDir), 'skills')

  const emptyDir = join(root, 'empty')
  mkdirSync(emptyDir)
  assert.equal(detectPluginStructure(emptyDir), null)
  assert.equal(detectPluginStructure(join(root, 'no-such-dir')), null)
} finally {
  rmSync(root, { recursive: true, force: true })
}

// --- CLI surface --------------------------------------------------------------

const help = spawnSync(process.execPath, [join(here, 'verify-runtime.mjs'), '--help'], { encoding: 'utf8' })
assert.equal(help.status, 0, '--help exits 0')
assert.match(help.stdout, /Exit codes: 0=pass\s+1=fail\s+2=inconclusive\s+3=skipped/)

const noArgs = spawnSync(process.execPath, [join(here, 'verify-runtime.mjs')], { encoding: 'utf8' })
assert.equal(noArgs.status, 2, 'no spec exits 2 (inconclusive)')

console.log('verify-runtime.check: all assertions passed')
