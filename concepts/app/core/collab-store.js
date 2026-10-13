// Collaboration store — the single source of truth for Notes, Activities,
// Events, Internal Mail and People Data plus the undirected links table
// between them. Pure: no DOM, no page imports. Fixtures, the storage
// object and the demo clock are injected by main.js. Every read returns a
// copy, so callers can never mutate state behind the store's back.
import {isValidDateTime} from './collab-dates.js'

export const COLLAB_STORAGE_KEY = 'skey-proto-collab'
export const COLLAB_SCHEMA_VERSION = 1
export const ENTITY_TYPES = ['note', 'activity', 'event', 'mail', 'person']
const ID_PREFIX = {note: 'note', activity: 'act', event: 'evt', mail: 'mail', person: 'per'}

const copy = value => (value == null ? value : JSON.parse(JSON.stringify(value)))
const sameRef = (x, y) => x.type === y.type && x.id === y.id
const linkJoins = (link, x, y) =>
  (sameRef(link.a, x) && sameRef(link.b, y)) || (sameRef(link.a, y) && sameRef(link.b, x))

export function createCollabStore({storage, seed, now}) {
  const listeners = new Set()
  const initialState = () => ({
    version: COLLAB_SCHEMA_VERSION,
    seq: 1000,
    entities: Object.fromEntries(ENTITY_TYPES.map(type => [type, copy(seed.entities[type] || [])])),
    links: copy(seed.links || []),
  })
  const isUsable = saved =>
    saved?.version === COLLAB_SCHEMA_VERSION &&
    Array.isArray(saved.links) &&
    ENTITY_TYPES.every(type => Array.isArray(saved.entities?.[type]))
  const load = () => {
    try {
      const saved = JSON.parse(storage?.getItem(COLLAB_STORAGE_KEY) ?? 'null')
      if (isUsable(saved)) return saved
    } catch {
      /* corrupt or unavailable storage: fall back to the seed */
    }
    return initialState()
  }
  let state = load()

  const commit = () => {
    try {
      storage?.setItem(COLLAB_STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage full/blocked: the in-memory state still works */
    }
    listeners.forEach(listener => listener())
  }
  const find = (type, id) => state.entities[type]?.find(entity => entity.id === id) ?? null

  return {
    now,
    getEntity: (type, id) => copy(find(type, id)),
    listEntities: (type, filter = () => true) => copy((state.entities[type] || []).filter(filter)),
    createEntity(type, data) {
      const stamp = now()
      const entity = {...copy(data), id: `${ID_PREFIX[type]}-${++state.seq}`, type, createdAt: stamp, updatedAt: stamp}
      state.entities[type].push(entity)
      commit()
      return copy(entity)
    },
    updateEntity(type, id, changes) {
      const entity = find(type, id)
      if (!entity) return null
      Object.assign(entity, copy(changes), {id, type, updatedAt: now()})
      commit()
      return copy(entity)
    },
    /** Removes the entity only: its links stay so the other side can show
     *  an "Unavailable item" until someone removes the link. */
    deleteEntity(type, id) {
      const before = state.entities[type].length
      state.entities[type] = state.entities[type].filter(entity => entity.id !== id)
      if (state.entities[type].length !== before) commit()
    },
    link(a, b) {
      if (sameRef(a, b) || state.links.some(link => linkJoins(link, a, b))) return {created: false}
      state.links.push({
        id: `lnk-${++state.seq}`,
        a: {type: a.type, id: a.id},
        b: {type: b.type, id: b.id},
        createdAt: now(),
      })
      commit()
      return {created: true}
    },
    unlink(a, b) {
      const before = state.links.length
      state.links = state.links.filter(link => !linkJoins(link, a, b))
      const removed = state.links.length !== before
      if (removed) commit()
      return {removed}
    },
    getRelatedItems(type, id) {
      const self = {type, id}
      return state.links
        .filter(link => sameRef(link.a, self) || sameRef(link.b, self))
        .map(link => {
          const ref = sameRef(link.a, self) ? link.b : link.a
          return {ref: {type: ref.type, id: ref.id}, entity: copy(find(ref.type, ref.id))}
        })
    },
    isScheduled: activity => isValidDateTime(activity?.scheduledStart),
    /** Only a valid scheduledStart puts an activity on a calendar; a due
     *  date alone never does. */
    scheduledActivitiesInRange(from, to) {
      return copy(
        state.entities.activity.filter(
          activity =>
            !activity.archived &&
            isValidDateTime(activity.scheduledStart) &&
            activity.scheduledStart.slice(0, 10) >= from &&
            activity.scheduledStart.slice(0, 10) <= to
        )
      )
    },
    eventsInRange(from, to) {
      return copy(
        state.entities.event.filter(event => event.start.slice(0, 10) <= to && event.end.slice(0, 10) >= from)
      )
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    reset() {
      state = initialState()
      commit()
    },
  }
}
