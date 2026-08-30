// legacy-plugin · 0.1.1 时代写法的示意复原，覆盖触点 #2–#6
// 对应迁移卡片见 references/（ALPHA1-01/02/03/04/05、ALPHA2-01/02）
// ⚠️ 故意不编译：它存在的意义是"被 pre-flight 检出、被卡片迁移"

import { homedir } from 'node:os'
import { join } from 'node:path'
import { writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
// 触点 #5: 从会话视图工程内部路径导入（alpha.1 工程拆分后此路径失效 → ALPHA1-03）
import { SessionView } from '@deepseek-ai/dsh-session-view/internal'

export function activate(ctx: any) {
  // ── 触点 #2: 内部事件名 ─────────────────────────────
  // 硬编码订阅宿主内部事件；0.1.2-alpha.1 移除 SessionEvent.ignorable、alpha.2 恢复
  // → ALPHA1-02 / ALPHA2-01（跨 alpha 的字段波动，走廊读完再删防御代码）
  ctx.on('session/event', (ev: any /* SessionEvent */) => {
    if (ev.ignorable) return
    console.log('[legacy] session event:', ev.type)
  })

  // ── 触点 #3: 内部服务探测 ────────────────────────────
  // 经 APIProxy 调宿主能力；0.1.2-alpha.1 APIProxy 整体移除，须按 17 条映射表改 @Remote
  // → ALPHA1-01；Remote 错误处理 → ALPHA2-02
  ctx.register('rename-session', async ({ id, title }: any) => {
    const apiProxy = await ctx.get('apiProxy')
    await apiProxy.invoke('session.rename', { id, title })
  })
  ctx.register('list-providers', async () => {
    const apiProxy = await ctx.get('apiProxy')
    return apiProxy.invoke('llm.providers')
  })

  // ── 触点 #4: 直接读写宿主目录 ────────────────────────
  // 假设默认 profile 固定路径；0.1.2 统一经 Profile 启动后目录解析假设可能失配
  // → ALPHA1-04
  ctx.register('write-note', async ({ text }: any) => {
    const profileDir = join(homedir(), '.dsh', 'profiles', 'default')
    writeFileSync(join(profileDir, 'legacy-note.txt'), text)
  })

  // ── 触点 #5: 内部 UI / 命令注册 ─────────────────────
  // 注册命令到宿主内部结构；UI 工程拆分后注册路径失效 → ALPHA1-03
  ctx.contributes.registerCommand('legacy.openView', () => {
    return new SessionView({ enhanced: true })
  })

  // ── 触点 #6: 子进程 / stdout 解析 ───────────────────
  // spawn headless 并解析 stdout；0.1.2-alpha.1 起进度流改走 stderr、stdout 只出最终结果
  // → ALPHA1-05；--profile 启动语义 → ALPHA1-04
  ctx.register('headless-ask', ({ prompt }: any) =>
    new Promise((resolve) => {
      const child = spawn('dsh', ['headless', '--profile', 'default', '-p', prompt])
      let result = ''
      child.stdout.on('data', (line: Buffer) => {
        const evt = JSON.parse(line.toString()) // 0.1.1: stdout 每行一个 JSON 事件
        if (evt.type === 'final') result = evt.text
      })
      child.on('close', () => resolve(result))
    })
  )
}
