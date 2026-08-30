# 示例 02：宿主侧插件

**场景**: 插件需要调用宿主的 session 管理 API。

**影响触点**: #3 内部服务探测（APIProxy 调用）

**复杂度**: ⭐⭐

---

## 升级前

```typescript
// src/service.ts
import { executeRemote } from '@deepseek-ai/dsh-host-apiproxy'

export class MyService {
  async listSessions() {
    return executeRemote('session', 'list', { limit: 10 })
  }
  
  async getSessions(id: string) {
    return executeRemote('session', 'get', { id })
  }
  
  async archiveSession(id: string) {
    return executeRemote('workspace', 'archiveSession', { sessionId: id })
  }
}

// package.json
{
  "dependencies": {
    "@deepseek-ai/dsh-host-apiproxy": "^0.1.1",
    "@deepseek-ai/cordis": "^0.1.1"
  }
}
```

---

## 升级后

```typescript
// src/service.ts
import type { Context } from '@deepseek-ai/cordis'

export class MyService {
  private gateway: any

  constructor(ctx: Context) {
    // 注入 TypertGateway
    this.gateway = ctx.inject('typert.gateway')
  }

  async listSessions() {
    // 注意：参数名为 _request，不是 request
    return this.gateway.invoke('session', 'list', {
      _request: { limit: 10 }
    })
  }
  
  async getSession(id: string) {
    try {
      return await this.gateway.invoke('session', 'get', {
        _request: { id }
      })
    } catch (error) {
      // RemoteError 直接携带 code
      if (error.code === 'session/not-found') {
        return null
      }
      throw error
    }
  }
  
  async archiveSession(id: string) {
    return this.gateway.invoke('workspace', 'archiveSession', {
      _request: { sessionId: id }
    })
  }
}

// package.json
{
  "dependencies": {
    "@deepseek-ai/cordis": "^0.1.2"
  }
}
```

---

## 迁移步骤

1. **删除 APIProxy 导入**:
   ```typescript
   // 删除这行
   import { executeRemote } from '@deepseek-ai/dsh-host-apiproxy'
   ```

2. **注入 Gateway**:
   ```typescript
   export class MyService {
     private gateway: any
     
     constructor(ctx: Context) {
       this.gateway = ctx.inject('typert.gateway')
     }
   }
   ```

3. **迁移所有 API 调用**:
   
   参考映射表（见 references/v0.1.2.md BC-02）：
   
   | 旧调用 | 新调用 | 参数变化 |
   |---|---|---|
   | `executeRemote('session', 'list', args)` | `gateway.invoke('session', 'list', { _request: args })` | 包装为 `{ _request }` |
   | `executeRemote('workspace', 'archiveSession', args)` | `gateway.invoke('workspace', 'archiveSession', { _request: args })` | 包装为 `{ _request }` |

4. **更新错误处理**:
   ```typescript
   catch (error) {
     // RemoteError 直接携带 code；gateway/internal 只在未分类错误时出现
     if (error.code === 'session/not-found') {
       // 处理
     }
   }
   ```

5. **更新 package.json**:
   ```sh
   pnpm remove @deepseek-ai/dsh-host-apiproxy
   pnpm add @deepseek-ai/cordis@^0.1.2
   ```

---

## 验证

```sh
# 1. 检查无残留引用
grep -r "dsh-host-apiproxy\|executeRemote" src/
# 预期：无输出

# 2. 构建
pnpm run build

# 3. 在测试环境启动
pnpm dsh --profile test

# 4. 调用 API 验证
# 在插件中调用 listSessions()，观察：
# - 无 arguments-invalid 错误
# - 返回结果正确
# - 错误处理正常（如 session/not-found）
```

---

## 常见错误

### 错误 1: `arguments-invalid`

**原因**: 参数格式错误。

**常见错误场景**:

| 错误写法 | 正确写法 |
|---|---|
| `gateway.invoke('session', 'list', { request: {} })` | `{ _request: {} }` |
| `gateway.invoke('session', 'list', { limit: 10 })` | `{ _request: { limit: 10 } }` |

**排查**:
```typescript
// 检查描述符定义
import descriptors from '@deepseek-ai/dsh-sdk/descriptors.json'
console.log(descriptors['session/list'])
```

### 错误 2: 错误码读取不到

**原因**: RemoteError 直接携带 code。

**解决**:
```typescript
// 正确访问
if (error.code === 'session/not-found') {
  // 处理
}
```

### 错误 3: `typert.gateway` 服务未找到

**原因**: Gateway 未注入或宿主版本不匹配。

**排查**:
```sh
# 检查宿主版本
pnpm list @deepseek-ai/dsh-agent
# 必须是 0.1.2+
```

### 错误 4: Stream 方法报错

**原因**: Stream 方法应该用 `gateway.stream()`，不是 `invoke()`。

**解决**:
```typescript
// 错误
await gateway.invoke('session', 'follow', { sessionId })

// 正确
const stream = await gateway.stream('session', 'follow', { sessionId })
for await (const event of stream) {
  // 处理事件
}
```
