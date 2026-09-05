#!/usr/bin/env node
// inject-derive.mjs — derive the exact dsh.client.inject set from the plugin's
// own imports (value + type-only), and lint the paired channel-auth migration.
//
// Usage: node inject-lint.mjs <fixture-dir>
// Exit 0 with a JSON report on stdout. Deterministic — run it, don't guess.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.argv[2];
if (!ROOT) { console.error('Usage: node inject-lint.mjs <fixture-dir>'); process.exit(2) }

// symbol-substring → owning client module. Substrings are deliberately coarse:
// any import whose specifier mentions the substring maps to the module.
const OWNERS = [
  ['ui-primitives', '@deepseek-ai/dsh-client-ui-primitives'],
  ['ui-slots', '@deepseek-ai/dsh-client-ui-slots'],
  ['client-locale', '@deepseek-ai/dsh-client-locale'],
  ['ui-settings-plugins', '@deepseek-ai/dsh-client-ui-settings-plugins'],
  ['ui-settings', '@deepseek-ai/dsh-client-ui-settings'],
  ['ui-renderer', '@deepseek-ai/dsh-client-ui-renderer'],
  ['session-controller', '@deepseek-ai/dsh-api-session-controller'],
  ['client-store', '@deepseek-ai/dsh-client-store'],
  ['ui-sidebar', '@deepseek-ai/dsh-client-ui-sidebar'],
  ['client-connection', '@deepseek-ai/dsh-client-connection'],
  ['ui-conversation', '@deepseek-ai/dsh-client-ui-conversation'],
];

function walk(dir, acc) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) { if (e !== 'node_modules' && e !== '.git') walk(p, acc) }
    else if (/\.(m?js|ts|tsx|cjs)$/.test(e)) acc.push(p);
  }
  return acc;
}

const files = walk(ROOT, []);
const inject = new Set();
const residue = { runtimeRefs: [], rawWebServerRoutes: [], oldCohortPeers: [] };

for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/from\s+['"](@deepseek-ai\/[^'"]+)['"]|import\s+['"](@deepseek-ai\/[^'"]+)['"]/g)) {
    const spec = m[1] ?? m[2];
    const hit = OWNERS.find(([sub]) => spec.includes(sub));
    if (hit) inject.add(hit[1]);
  }
  if (/['"]@deepseek-ai\/dsh-client-runtime/.test(src)) residue.runtimeRefs.push(f);
  if (/ctx\.webServer\.register\s*\(/.test(src)) residue.rawWebServerRoutes.push(f);
}

let pkg = {};
try { pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) } catch {}
const declared = pkg?.dsh?.client?.inject ?? [];
const injectEntry = pkg?.dsh?.inject ?? pkg?.inject ?? [];
const allDeclared = [...new Set([...(Array.isArray(injectEntry) ? injectEntry : []), ...(Array.isArray(declared) ? declared : [])])];
const missing = [...inject].filter((m) => !allDeclared.includes(m));
const extra = allDeclared.filter((m) => ![...inject].includes(m));

const peers = pkg?.peerDependencies ?? {};
const peersMissing = [...inject].filter((m) => !peers[m]);
const cordis = peers['@deepseek-ai/cordis'];

console.log(JSON.stringify({
  derivedInject: [...inject].sort(),
  declaredInject: allDeclared,
  missingFromInject: missing,
  extraInInject: extra,
  peersMissingForInject: peersMissing,
  cordisPeer: cordis,
  cordisOk: cordis === '^4.0.1',
  hasWebServerRouteLeft: residue.rawWebServerRoutes.length > 0,
  webServerRouteFiles: residue.rawWebServerRoutes,
  runtimeRefsLeft: residue.runtimeRefs,
  verdict: missing.length === 0 && residue.runtimeRefs.length === 0 && cordis === '^4.0.1' && residue.rawWebServerRoutes.length === 0
    ? 'OK'
    : 'FIX-REQUIRED',
}, null, 2));
