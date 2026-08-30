#!/usr/bin/env node
// verify-runtime.mjs — deterministic runtime verification for a DSH plugin.
//
// Implements verification tier 3 of skills/plugin-upgrade/SKILL.md (real
// profile cold boot, entry activation, Cordis services not stuck pending) as
// an executable check, with failure attribution into four classes:
// plugin-code / dependency-resolution / profile-config / dsh-runtime.
//
// Method (battle-tested on a large plugin fleet): a deliberately dead model
// endpoint lets boot reach the model stage with a deterministic transport
// signature, because DSH asserts plugin-tree activation BEFORE any model call.
// A broken plugin fails activation in ~1s; a healthy one only fails later at
// the (dead) transport stage. A transport error is therefore a PASS signature
// for "plugin tree fully loaded and activated" — zero tokens, zero keys, and
// the verdict is fully decoupled from model availability.
//
// Usage:
//   node scripts/verify-runtime.mjs <plugin-spec> [options]
//
//   <plugin-spec>       npm package name, git URL, or local plugin directory
//   --profile <name>    verify inside this profile name (default: "verify";
//                       runs in an isolated temp DSH_HOME, your own profiles
//                       and $DSH_HOME are never touched)
//   --timeout <seconds> boot probe timeout (default 120)
//   --json              machine-readable result on stdout
//   --keep-workspace    keep the temp DSH_HOME for inspection
//   -h, --help          show this help
//
// Exit codes: 0=pass  1=fail  2=inconclusive  3=skipped
//
// No npm dependencies; requires node >= 20 and `dsh` on PATH (`git`/`npm`
// only for git-URL / npm-name specs).

import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// --- Signature regexes (priority order; see diagnoseBootLog) ----------------
// The bare word "network" is deliberately NOT a transport signature — matching
// it anywhere in a stack path misfires (fleet-proven).
const TRANSPORT_RE = /TRANSPORT|STREAM_CLOSED|EMPTY_RESPONSE|ECONNREFUSED|ECONNRESET|ETIMEDOUT|socket hang up|fetch failed/i
const MODULE_RESOLVE_RE = /ERR_MODULE_NOT_FOUND|esm\/loader|Cannot find module/i
const ACTIVATION_RE = /1 entry did not activate|plugin tree failed to load|did not activate/
// Only a wait for the webServer service means "wrong environment, re-probe
// under the web host": a plugin waiting for a REMOVED service (e.g. apiProxy,
// the #5120 signature) is an activation failure that migration must fix.
// Plural form included: a host-side wait can list several services; matching
// only the singular form missed those cases (root cause of a mass
// misjudgement batch in the original fleet).
const HOST_WAIT_RE = /waiting for services?:.*webServer/i

const DEAD_MODEL_BASE_URL = 'http://127.0.0.1:9/v1' // port 9 (discard): nothing listens -> immediate ECONNREFUSED
const EXIT_CODES = { pass: 0, fail: 1, inconclusive: 2, skipped: 3 }
const USAGE = `Usage: node scripts/verify-runtime.mjs <plugin-spec> [options]

  <plugin-spec>       npm package name, git URL, or local plugin directory
  --profile <name>    profile name inside an isolated temp DSH_HOME (default "verify")
  --timeout <seconds> boot probe timeout (default 120)
  --json              machine-readable result on stdout
  --keep-workspace    keep the temp DSH_HOME for inspection
  -h, --help          show this help

Exit codes: 0=pass  1=fail  2=inconclusive  3=skipped`

// --- Pure helpers (exported for verify-runtime.check.mjs) -------------------

/** Diagnose a full boot log against the signature priority chain:
 * host service wait > module resolve crash > activation failure > transport
 * signature (= tree loaded, PASS). Returns null when nothing matches. */
export function diagnoseBootLog(log) {
  if (HOST_WAIT_RE.test(log)) return { verdict: 'env-needs-service-host', attribution: 'profile-config' }
  if (MODULE_RESOLVE_RE.test(log)) return { verdict: 'load-crash-module-resolve', attribution: 'dependency-resolution' }
  if (ACTIVATION_RE.test(log)) return { verdict: 'activation-failed', attribution: 'plugin-code' }
  if (TRANSPORT_RE.test(log)) return { verdict: 'pass-boot-probe', attribution: null }
  return null
}

/** Detect the plugin structure of a source directory. Multi-form probing is
 * required: checking package.json alone once rejected real skills-shaped
 * plugins. Returns the structure marker or null. */
export function detectPluginStructure(srcDir) {
  if (!existsSync(srcDir) || !statSync(srcDir).isDirectory()) return null
  if (existsSync(join(srcDir, 'package.json'))) return 'package.json'
  for (const marker of ['cordis.yml', 'cordis.yaml', 'dsh.bundle']) {
    if (existsSync(join(srcDir, marker))) return marker
  }
  if (existsSync(join(srcDir, '.claude')) || existsSync(join(srcDir, 'skills'))) return 'skills'
  return null
}

/** True when the plugin declares itself as a web-plane client plugin. Without
 * this pre-probe, client plugins were mass-reported as activation failures. */
export function isWebPlugin(srcDir) {
  const pkgPath = join(srcDir, 'package.json')
  if (!existsSync(pkgPath)) return false
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    return pkg?.dsh?.client?.platform === 'web'
  } catch {
    return false
  }
}

/** Classify a plugin spec into an install route. A bare relative path
 * ("examples/legacy-plugin", no ./ prefix) must resolve as a directory, not as
 * a scoped npm name. */
export function classifySpec(spec) {
  if (/^https?:\/\/./.test(spec) || /^git@.+\.git$/.test(spec)) return 'git-url'
  if (spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('~/')) return 'directory'
  if (/^@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/i.test(spec)) return 'npm-name'
  if (/^[a-z0-9][a-z0-9._-]*$/i.test(spec)) return 'npm-name'
  if (spec.includes('/') && existsSync(spec)) return 'directory'
  return 'unknown'
}

/** The key expected to appear in `dsh plugin list` output after install:
 * the package name, or for structure-shaped directories the directory name. */
export function listKeyFor(spec, route) {
  if (route !== 'directory') return spec
  const pkgPath = join(spec, 'package.json')
  if (existsSync(pkgPath)) {
    try {
      const name = JSON.parse(readFileSync(pkgPath, 'utf8'))?.name
      if (name) return name
    } catch {
      /* fall through to basename */
    }
  }
  return basename(spec)
}

// --- Process helpers ---------------------------------------------------------

function run(cmd, args, options = {}) {
  return spawnSync(cmd, args, {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    timeout: (options.timeoutSeconds ?? 120) * 1000,
    killSignal: 'SIGKILL',
    env: { ...process.env, ...(options.env ?? {}) },
    cwd: options.cwd,
  })
}

function toolMissing(cmd) {
  const probe = run(cmd, ['--version'], { timeoutSeconds: 30 })
  return probe.error !== undefined
}

function tail(text, maxBytes = 500) {
  const flat = String(text ?? '').replaceAll('\n', ' ')
  return flat.length > maxBytes ? `…${flat.slice(-maxBytes)}` : flat
}

/** Minimal headless profile patch layer: declare a model served behind the
 * dead endpoint and disable the HMR plugin (it assumes a dev tree). */
function writeProfilePatches(profileDir) {
  mkdirSync(profileDir, { recursive: true })
  writeFileSync(
    join(profileDir, 'cordis.patch.yml'),
    [
      '# generated by scripts/verify-runtime.mjs — dead-endpoint model declaration (no secrets)',
      '- id: llm-verify',
      '  config:',
      '    models:',
      '      - id: verify-dead-endpoint',
      '        contextWindow: 8192',
      '        maxTokens: 64',
      '- id: agent-default-model',
      '  config:',
      '    provider: deepseek-official',
      '    model: verify-dead-endpoint',
      '- id: "@deepseek-ai/cordis-plugin-hmr"',
      '  disabled: true',
      '',
    ].join('\n'),
  )
}

/** Resolve the authoritative dist-tag latest from the official registry and
 * install pinned. Registry mirrors can lag behind on dist-tags metadata. */
function pinNpmSpec(pkgName) {
  const view = run('npm', ['view', pkgName, 'dist-tags.latest', '--registry=https://registry.npmjs.org'], { timeoutSeconds: 60 })
  const latest = (view.stdout ?? '').trim().replace(/^["']|["']$/g, '')
  return view.status === 0 && latest ? `${pkgName}@${latest}` : pkgName
}

function probeHeadless(dshHome, profile, cwd, timeoutSeconds) {
  const probe = run('dsh', ['--profile', profile, 'ok'], {
    timeoutSeconds,
    env: { DSH_HOME: dshHome, DEEPSEEK_BASE_URL: DEAD_MODEL_BASE_URL },
    cwd,
  })
  return {
    status: probe.status,
    timedOut: probe.error?.code === 'ETIMEDOUT' || probe.signal === 'SIGKILL',
    log: `${probe.stdout ?? ''}\n${probe.stderr ?? ''}`,
  }
}

/** Web-plane plugins need the web host: headless profiles expose no webServer
 * service, so the plugin would wait forever. Boot `dsh web` for a bounded
 * window, then scan the full log (the process is expected to be killed by the
 * timeout — the verdict comes from the log, not the exit code). */
function probeWebHost(dshHome, profile, cwd, timeoutSeconds) {
  const port = 18080 + Math.floor(Math.random() * 1000)
  const child = run('dsh', ['web', '--no-open', '--port', String(port)], {
    timeoutSeconds: Math.min(timeoutSeconds, 90),
    env: { DSH_HOME: dshHome, DEEPSEEK_BASE_URL: DEAD_MODEL_BASE_URL },
    cwd,
  })
  return {
    status: child.status,
    timedOut: child.error?.code === 'ETIMEDOUT' || child.signal === 'SIGKILL',
    log: `${child.stdout ?? ''}\n${child.stderr ?? ''}`,
  }
}

// --- Verification pipeline ---------------------------------------------------

export async function verifyRuntime(rawSpec, options = {}) {
  const timeoutSeconds = options.timeoutSeconds ?? 120
  const stages = []
  const result = { spec: rawSpec, status: 'inconclusive', verdict: '', attribution: null, stages, startedAt: new Date().toISOString() }
  const stage = (name, ok, durationMs, error = '') => stages.push({ stage: name, ok, durationMs, error })

  const missing = ['dsh', ...(classifySpec(rawSpec) === 'git-url' ? ['git'] : []), ...(classifySpec(rawSpec) === 'npm-name' ? ['npm'] : [])].filter(toolMissing)
  if (missing.length > 0) {
    result.verdict = `missing-tools:${missing.join(',')}`
    return result
  }

  const route = classifySpec(rawSpec)
  if (route === 'unknown') {
    result.status = 'skipped'
    result.verdict = `unrecognized-spec:${rawSpec}`
    return result
  }

  // Isolated DSH_HOME: the caller's $DSH_HOME and profiles are never touched.
  const keep = options.keepWorkspace === true
  const home = mkdtempSync(join(tmpdir(), 'dsh-verify-'))
  const dshHome = join(home, '.dsh')
  const profile = options.profile ?? 'verify'
  try {
    writeProfilePatches(join(dshHome, 'profiles', profile))
    const dshEnv = { DSH_HOME: dshHome }

    let spec = rawSpec
    let webPlugin = false
    if (route === 'directory') {
      const resolved = rawSpec.startsWith('~/') ? join(process.env.HOME ?? '', rawSpec.slice(2)) : rawSpec
      const structure = detectPluginStructure(resolved)
      if (!structure) {
        result.status = 'skipped'
        result.verdict = 'no-plugin-structure'
        return result
      }
      webPlugin = isWebPlugin(resolved)
      // Install from a copy: verification must not mutate the original tree.
      const srcCopy = join(home, 'plugin-src')
      cpSync(resolved, srcCopy, { recursive: true })
      spec = srcCopy
    }

    // ---- L1: install (npm specs pin the authoritative latest first) ----
    let t0 = Date.now()
    const installSpec = route === 'npm-name' ? pinNpmSpec(spec) : spec
    const add = run('dsh', ['plugin', '--profile', profile, 'add', installSpec], { timeoutSeconds: 300, env: dshEnv, cwd: home })
    const l1Ms = Date.now() - t0 // real elapsed time (fleet bug this fixes: was always 0)
    const l1Log = `${add.stdout ?? ''}\n${add.stderr ?? ''}`
    stage('l1-install', add.status === 0, l1Ms, add.status === 0 ? '' : tail(l1Log))
    if (add.status !== 0) {
      result.status = 'fail'
      result.verdict = 'install-failed'
      result.attribution = 'dependency-resolution'
      result.evidence = tail(l1Log)
      return result
    }

    // ---- L2: listed ----------------------------------------------------
    t0 = Date.now()
    const list = run('dsh', ['plugin', '--profile', profile, 'list'], { timeoutSeconds: 60, env: dshEnv, cwd: home })
    const l2Ms = Date.now() - t0
    const l2Log = `${list.stdout ?? ''}\n${list.stderr ?? ''}`
    const listed = list.status === 0 && list.stdout.includes(listKeyFor(spec, route))
    stage('l2-listed', listed, l2Ms, listed ? '' : tail(l2Log))
    if (!listed) {
      result.status = 'fail'
      result.verdict = 'not-listed-after-install'
      result.attribution = 'dsh-runtime'
      result.evidence = tail(l2Log)
      return result
    }

    // ---- L3: deterministic boot probe ----------------------------------
    t0 = Date.now()
    const boot = webPlugin ? probeWebHost(dshHome, profile, home, timeoutSeconds) : probeHeadless(dshHome, profile, home, timeoutSeconds)
    const l3Ms = Date.now() - t0
    // Diagnose against the FULL log: scanning only a short tail once let long
    // activation stack traces push the error headline out of the window.
    const diagnosis = diagnoseBootLog(boot.log)
    stage('l3-boot-probe', diagnosis?.verdict === 'pass-boot-probe' || (!diagnosis && !boot.timedOut && boot.status === 0), l3Ms, diagnosis ? '' : tail(boot.log))

    if (diagnosis?.verdict === 'pass-boot-probe') {
      result.status = 'pass'
      result.verdict = 'pass-boot-probe'
      return result
    }
    if (diagnosis?.verdict === 'env-needs-service-host') {
      result.status = 'skipped'
      result.verdict = 'env-needs-service-host'
      result.attribution = diagnosis.attribution
      return result
    }
    if (diagnosis) {
      result.status = 'fail'
      result.verdict = diagnosis.verdict
      result.attribution = diagnosis.attribution
      result.evidence = tail(boot.log)
      return result
    }
    if (!boot.timedOut && boot.status === 0) {
      result.status = 'pass'
      result.verdict = 'pass-exit-0'
      return result
    }
    result.status = 'inconclusive'
    result.verdict = boot.timedOut ? 'boot-probe-timeout' : 'boot-probe-no-signature'
    result.evidence = tail(boot.log)
    return result
  } finally {
    if (keep) result.workspace = home
    else rmSync(home, { recursive: true, force: true })
  }
}

// --- CLI ---------------------------------------------------------------------

function parseArgs(argv) {
  const options = { positional: [] }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--profile') options.profile = argv[++i]
    else if (arg === '--timeout') options.timeoutSeconds = Number(argv[++i])
    else if (arg === '--json') options.json = true
    else if (arg === '--keep-workspace') options.keepWorkspace = true
    else if (arg === '-h' || arg === '--help') options.help = true
    else options.positional.push(arg)
  }
  return options
}

function renderHuman(result) {
  const lines = [`verify-runtime: ${result.spec}`]
  for (const s of result.stages) {
    lines.push(`  ${s.ok ? 'PASS' : 'FAIL'}  ${s.stage}  ${(s.durationMs / 1000).toFixed(1)}s${s.error ? `  ${s.error.slice(0, 200)}` : ''}`)
  }
  lines.push(`verdict: ${result.verdict}  status: ${result.status}${result.attribution ? `  attribution: ${result.attribution}` : ''}`)
  if (result.evidence) lines.push(`evidence: ${result.evidence.slice(0, 300)}`)
  if (result.workspace) lines.push(`workspace kept: ${result.workspace}`)
  return lines.join('\n')
}

const isMain = (() => {
  try {
    return realpathSync(process.argv[1] ?? '') === realpathSync(fileURLToPath(import.meta.url))
  } catch {
    return false
  }
})()

if (isMain) {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    console.log(USAGE)
    process.exit(0)
  }
  if (options.positional.length === 0) {
    console.error(USAGE)
    process.exit(2)
  }
  verifyRuntime(options.positional[0], options).then((result) => {
    if (options.json) console.log(JSON.stringify(result, null, 2))
    else console.log(renderHuman(result))
    process.exit(EXIT_CODES[result.status] ?? 2)
  })
}
