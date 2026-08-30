// 触点 #1 + #6: patch 面合成脚本（0.1.1 时代做法的示意复原）
// 实战参照 dsh-tui 的适配流程：DSH_HARNESS_SOURCE_ROOT 指向上游源码 → patch-surface 合成
// 0.1.2-alpha.1 会话视图工程拆分后，patch 目标路径需逐一核对（ALPHA1-03）
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync, spawn } from 'node:child_process'

const sourceRoot = process.env.DSH_HARNESS_SOURCE_ROOT // 触点 #1: 依赖宿主源码 checkout
if (!sourceRoot) throw new Error('DSH_HARNESS_SOURCE_ROOT is required')

const surface = readFileSync('patch.yml', 'utf8') // 触点 #1: patch-surface 清单
console.log('[legacy] applying patch surface:\n', surface)

// 触点 #6: 升级后自检——跑一次 headless 并解析 stdout（0.1.2 起应改解析 stderr → ALPHA1-05）
const out = execFileSync('dsh', ['headless', '--profile', 'default', '-p', 'ping'], {
  encoding: 'utf8',
})
for (const line of out.split('\n')) {
  if (!line.trim()) continue
  const evt = JSON.parse(line)
  if (evt.type === 'final') console.log('[legacy] headless ok:', evt.text)
}

const child = spawn('dsh', ['headless', '--profile', 'default'])
child.stdout.on('data', (l) => writeFileSync(1, l))
