// Collaboration store — the single source of truth for Notes, Activities,
// Events, Internal Mail and People Data plus the undirected links table
// between them, and for the user's custom mail folders. Pure: no DOM, no
// page imports. Fixtures, the storage object and the demo clock are injected
// by main.js. Every read returns a copy, so callers can never mutate state
// behind the store's back.
import {isValidDateTime} from './collab-dates.js'

export const COLLAB_STORAGE_KEY = 'skey-proto-collab'
export const COLLAB_SCHEMA_VERSION = 1
export const ENTITY_TYPES = ['note', 'activity', 'event', 'mail', 'person']
const ID_PREFIX = {note: 'note', activity: 'act', event: 'evt', mail: 'mail', person: 'per'}

const copy = value => (value == null ? value : JSON.parse(JSON.stringify(value)))
const sameRef = (x, y) => x.type === y.type && x.id === y.id
export const SYSTEM_NOTE_GROUPS = [
  {id: 'draft', label: 'Draft', hidden: false, system: true},
  {id: 'archived', label: 'Archive', hidden: false, system: true},
]
const DEFAULT_NOTE_GROUPS = [SYSTEM_NOTE_GROUPS[0], {id: 'active', label: 'Active', hidden: false, system: false}, SYSTEM_NOTE_GROUPS[1]]
const fixedGroups = groups => [copy(SYSTEM_NOTE_GROUPS[0]), ...groups.filter(group => !SYSTEM_NOTE_GROUPS.some(system => system.id === group.id)).map(({id, label, hidden}) => ({id, label, hidden: Boolean(hidden), system: false})), copy(SYSTEM_NOTE_GROUPS[1])]
function normalizeNoteGroups(state) {
  state.noteGroups = fixedGroups(Array.isArray(state.noteGroups) ? state.noteGroups : Array.isArray(state.noteColumns) ? state.noteColumns : DEFAULT_NOTE_GROUPS)
  delete state.noteColumns
  for (const note of state.entities.note) {
    note.groupId ||= note.status || 'draft'
    delete note.status
    if (!state.noteGroups.some(group => group.id === note.groupId)) state.noteGroups.splice(-1, 0, {id: note.groupId, label: note.groupId, hidden: false, system: false})
  }
  return state
}
const linkJoins = (link, x, y) =>
  (sameRef(link.a, x) && sameRef(link.b, y)) || (sameRef(link.a, y) && sameRef(link.b, x))

export function createCollabStore({storage, seed, now}) {
  const listeners = new Set()
  const initialState = () => ({
    version: COLLAB_SCHEMA_VERSION,
    seq: 1000,
    entities: Object.fromEntries(ENTITY_TYPES.map(type => [type, copy(seed.entities[type] || [])])),
    links: copy(seed.links || []),
    folders: [],
    noteGroups: copy(DEFAULT_NOTE_GROUPS),
    preferences: {},
  })
  const isUsable = saved =>
    saved?.version === COLLAB_SCHEMA_VERSION &&
    Array.isArray(saved.links) &&
    ENTITY_TYPES.every(type => Array.isArray(saved.entities?.[type]))
  const load = () => {
    try {
      const saved = JSON.parse(storage?.getItem(COLLAB_STORAGE_KEY) ?? 'null')
      if (isUsable(saved)) {
        /* `folders` arrived after the v1 schema: same version, older shape.
           Normalize instead of bumping the version, so one persisted state
           keeps working across the upgrade. */
        if (!Array.isArray(saved.folders)) saved.folders = []
        saved.folders = saved.folders.filter(folder => folder?.id && typeof folder.name === 'string')
        if (typeof saved.seq !== 'number') saved.seq = 1000
        if (!Array.isArray(saved.noteGroups) && !Array.isArray(saved.noteColumns)) saved.noteGroups = copy(DEFAULT_NOTE_GROUPS)
        if (!saved.preferences || typeof saved.preferences !== 'object') saved.preferences = {}
        return normalizeNoteGroups(saved)
      }
    } catch {
      /* corrupt or unavailable storage: fall back to the seed */
    }
    return normalizeNoteGroups(initialState())
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

  /* Folder names are compared trimmed and case-insensitively, against both
     the caller's reserved names (the system mailboxes) and the folders that
     already exist, so "Inbox" and "inbox" can never both appear. */
  const folderNameError = (name, id, reserved) => {
    const clean = String(name ?? '').trim()
    if (!clean) return 'empty'
    if (clean.length > 40) return 'too-long'
    const taken = new Set(reserved.map(value => String(value).trim().toLowerCase()))
    state.folders.forEach(folder => {
      if (folder.id !== id) taken.add(folder.name.trim().toLowerCase())
    })
    return taken.has(clean.toLowerCase()) ? 'duplicate' : null
  }

  return {
    now,
    getPreference: (key, fallback = null) => copy(state.preferences[key] ?? fallback),
    setPreference(key, value) { state.preferences[key] = copy(value); commit() },
    getEntity: (type, id) => copy(find(type, id)),
    listEntities: (type, filter = () => true) => copy((state.entities[type] || []).filter(filter)),
    listNoteGroups: () => copy(state.noteGroups),
    configureNoteGroups(groups, moves = {}) {
      const clean = groups.map(({id, label, hidden}) => ({id, label: String(label || '').trim(), hidden: Boolean(hidden), system: SYSTEM_NOTE_GROUPS.some(group => group.id === id)}))
      const ids = new Set(clean.map(column => column.id))
      const names = new Set(clean.map(column => column.label.toLocaleLowerCase()))
      if (ids.size !== clean.length || names.size !== clean.length || clean.some(column => !column.label || column.label.length > 40 || !/^[a-z0-9-]+$/i.test(column.id))) return {error: 'Use unique group names of 1–40 characters.'}
      if (SYSTEM_NOTE_GROUPS.some((system, index) => {
        const group = clean.find(item => item.id === system.id)
        return !group || group.label !== system.label || group.hidden || clean[index ? clean.length - 1 : 0]?.id !== system.id
      })) return {error: 'Draft and Archive are fixed system groups.'}
      for (const note of state.entities.note) {
        if (!ids.has(note.groupId) && !ids.has(moves[note.groupId])) return {error: 'Choose a destination for every removed group that contains notes.'}
      }
      for (const note of state.entities.note) if (!ids.has(note.groupId)) Object.assign(note, {groupId: moves[note.groupId], updatedAt: now()})
      state.noteGroups = clean
      commit()
      return {ok: true}
    },
    /** User-created mail folders: {id, name, createdAt}. The system
     *  mailboxes (Inbox/Sent/…) are not stored here — they are the
     *  constant list the mail screen owns. */
    listFolders: () => copy(state.folders),
    createFolder(name, {reserved = []} = {}) {
      const error = folderNameError(name, null, reserved)
      if (error) return {error}
      const folder = {id: `fld-${++state.seq}`, name: String(name).trim(), createdAt: now()}
      state.folders.push(folder)
      commit()
      return {folder: copy(folder)}
    },
    renameFolder(id, name, {reserved = []} = {}) {
      const folder = state.folders.find(entry => entry.id === id)
      if (!folder) return {error: 'missing'}
      const error = folderNameError(name, id, reserved)
      if (error) return {error}
      folder.name = String(name).trim()
      commit()
      return {folder: copy(folder)}
    },
    /** Removes the folder and files its messages in Inbox — a message must
     *  never be left pointing at a folder that no longer exists (nor at one
     *  it would be restored back into). Returns how many moved. */
    deleteFolder(id) {
      const before = state.folders.length
      state.folders = state.folders.filter(folder => folder.id !== id)
      if (state.folders.length === before) return {removed: false, moved: 0}
      let moved = 0
      for (const mail of state.entities.mail) {
        let touched = false
        if (mail.previousFolder === id) {
          mail.previousFolder = null
          touched = true
        }
        if (mail.folder === id) {
          mail.folder = 'inbox'
          moved++
          touched = true
        }
        if (touched) mail.updatedAt = now()
      }
      commit()
      return {removed: true, moved}
    },
    createEntity(type, data) {
      const stamp = now()
      const entity = {...copy(data), id: `${ID_PREFIX[type]}-${++state.seq}`, type, createdAt: stamp, updatedAt: stamp}
      if (type === 'note') {
        entity.groupId = entity.groupId || entity.status || 'draft'
        delete entity.status
        if (!state.noteGroups.some(group => group.id === entity.groupId)) return null
      }
      state.entities[type].push(entity)
      commit()
      return copy(entity)
    },
    updateEntity(type, id, changes) {
      const entity = find(type, id)
      if (!entity) return null
      if (type === 'note') {
        changes = copy(changes)
        if ('status' in changes) { changes.groupId ??= changes.status; delete changes.status }
        if (changes.groupId && !state.noteGroups.some(group => group.id === changes.groupId)) return null
        if (changes.groupId === 'archived' && entity.groupId !== 'archived') changes.previousGroupId = entity.groupId
      }
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
      state = normalizeNoteGroups(initialState())
      commit()
    },
  }
}
