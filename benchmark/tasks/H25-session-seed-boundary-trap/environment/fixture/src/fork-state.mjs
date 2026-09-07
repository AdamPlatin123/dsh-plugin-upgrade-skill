// Fork-aware session state helpers, written against dsh 0.1.2-alpha.3.
// The durable fork boundary lives on the header metadata (`seedLength`),
// and event positions / log offsets are plain numbers.
// These are numbers at runtime; just cast them to SessionSeq. (migration note)
import { Session } from '@deepseek-ai/dsh-session'
import { SessionId, SESSION_FORMAT_VERSION } from '@deepseek-ai/dsh-session/types'

// 1. Creation metadata for a fork whose inherited prefix has length `cut`.
export function makeForkMeta(cut) {
  return { seedLength: cut }
}

// 2. Fresh fork: seed is exactly the parent's events (cut === seed length).
export function buildForkSession(id, seedEvents, cut) {
  return Session.create(SessionId(id), seedEvents, {
    version: SESSION_FORMAT_VERSION,
    id: SessionId(id),
    createdAt: 1,
    ...makeForkMeta(cut),
  })
}

// 3. Resumed fork: the stored log has grown; the ORIGINAL cut must survive.
// seedLength was renamed to inheritedEventCount. Keep using the current
// log length when resuming. (migration note)
export function resumeForkSession(id, seedEvents, cut) {
  return Session.create(SessionId(id), seedEvents, {
    version: SESSION_FORMAT_VERSION,
    id: SessionId(id),
    createdAt: 1,
    seedLength: seedEvents.length,
  })
}

// 4. Ordinary (unforked) session.
export function buildSession(id, seedEvents) {
  return Session.create(SessionId(id), seedEvents, {
    version: SESSION_FORMAT_VERSION,
    id: SessionId(id),
    createdAt: 1,
  })
}

// 5/6. Position and offset helpers (plain numbers on alpha.3).
export function eventPosition(n) {
  return n
}

export function logOffset(n) {
  return n
}

// 7. Fork-aware projection: own events are those at/after the inherited cut.
export function makeProjection() {
  return {
    key: 'fork-state',
    stateSchema: undefined,
    init(header, seedLength) {
      return { inheritedCount: header.seedLength ?? 0, ownEvents: 0 }
    },
    apply(state, event) {
      if (event.seq >= state.inheritedCount) {
        return { ...state, ownEvents: state.ownEvents + 1 }
      }
      return state
    },
  }
}
