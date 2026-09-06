// fork-state.mjs — migrated to dsh 0.1.2-alpha.4.
// The durable fork boundary is now isSeeded (header) + a top-level
// inheritedEventCount (a SessionLogOffset), positions are SessionSeq,
// and the projection init receives the inherited boundary directly.
import { Session } from '@deepseek-ai/dsh-session'
import { SessionId, SessionLogOffset, SessionSeq, SESSION_FORMAT_VERSION } from '@deepseek-ai/dsh-session/types'

// 1. Creation metadata for a fork whose inherited prefix has length `cut`.
export function makeForkMeta(cut) {
  return { meta: { isSeeded: true }, inheritedEventCount: SessionLogOffset(cut) }
}

// 2. Fresh fork: seed is exactly the parent's events (cut === seed length).
export function buildForkSession(id, seedEvents, cut) {
  const meta = makeForkMeta(cut)
  return Session.create(
    SessionId(id),
    seedEvents,
    { version: SESSION_FORMAT_VERSION, id: SessionId(id), createdAt: 1, ...meta.meta },
    meta.inheritedEventCount,
  )
}

// 3. Resumed fork: the stored log has grown; the ORIGINAL cut must survive.
export function resumeForkSession(id, seedEvents, cut) {
  const meta = makeForkMeta(cut)
  return Session.fromRestore(
    SessionId(id),
    seedEvents,
    { version: SESSION_FORMAT_VERSION, id: SessionId(id), createdAt: 1, ...meta.meta },
    meta.inheritedEventCount,
  )
}

// 4. Ordinary (unforked) session.
export function buildSession(id, seedEvents) {
  return Session.create(SessionId(id), seedEvents, {
    version: SESSION_FORMAT_VERSION,
    id: SessionId(id),
    createdAt: 1,
    isSeeded: false,
  })
}

// 5/6. Position and offset helpers: branded on alpha.4.
export function eventPosition(n) {
  return SessionSeq(n)
}

export function logOffset(n) {
  return SessionLogOffset(n)
}

// 7. Fork-aware projection: own events are those at/after the inherited cut.
export function makeProjection() {
  return {
    key: 'fork-state',
    stateSchema: undefined,
    init(header, inheritedEventCount) {
      return { inheritedCount: Number(inheritedEventCount), ownEvents: 0 }
    },
    apply(state, event) {
      if (event.seq >= state.inheritedCount) {
        return { ...state, ownEvents: state.ownEvents + 1 }
      }
      return state
    },
  }
}
