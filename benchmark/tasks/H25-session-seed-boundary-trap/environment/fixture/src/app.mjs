// Local verification: exercise the helpers on both fork scenarios and the
// unforked session, then report what the projection sees.
import {
  buildForkSession, buildSession, logOffset, makeForkMeta, makeProjection, resumeForkSession,
} from './fork-state.mjs'

const mkEvent = (type, seq) => ({ type, seq, time: 1700000000000 + seq, data: { label: `e${seq}` } })
const TYPES = ['turn/start', 'session/title', 'todo/added', 'turn/end', 'session/title', 'todo/added', 'todo/removed', 'turn/start']

const fresh = buildForkSession('fresh', TYPES.slice(0, 3).map((t, i) => mkEvent(t, i)), 3)
console.log('fresh fork: inherited =', Number(fresh.inheritedEventCount), 'seq =', Number(fresh.seq))

const resumed = resumeForkSession('resumed', TYPES.map((t, i) => mkEvent(t, i)), 3)
console.log('resumed fork: inherited =', Number(resumed.inheritedEventCount), 'seq =', Number(resumed.seq), '(original cut must stay 3)')

const plain = buildSession('plain', TYPES.slice(0, 5).map((t, i) => mkEvent(t, i)))
console.log('unforked: inherited =', Number(plain.inheritedEventCount), 'seq =', Number(plain.seq))

const projection = makeProjection()
let state = projection.init(resumed.header, logOffset(3))
for (const event of resumed.snapshotEvents()) state = projection.apply(state, event)
console.log('projection over resumed fork: inheritedCount =', state.inheritedCount, 'ownEvents =', state.ownEvents, '(expect inherited 3, own 6)')

console.log('meta shape:', JSON.stringify(makeForkMeta(3)))
