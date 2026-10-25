import test from 'node:test'
import assert from 'node:assert/strict'
import {createCollabStore, COLLAB_STORAGE_KEY, COLLAB_SCHEMA_VERSION} from '../concepts/app/core/collab-store.js'
import {addDays, startOfWeek, monthGridDays, nextHalfHour, relativeDay} from '../concepts/app/core/collab-dates.js'

const memoryStorage = (initial = {}) => {
  const map = new Map(Object.entries(initial))
  return {getItem: k => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: k => map.delete(k), map}
}
const seed = () => ({
  entities: {
    note: [{id: 'note-1', type: 'note', title: 'N1', body: '', status: 'active', tags: [], pinned: false}],
    activity: [
      {id: 'act-1', type: 'activity', kind: 'todo', summary: 'Due only', status: 'planned', priority: 'normal', assigneeId: 'usr-1', dueDate: '2026-10-14', archived: false},
      {id: 'act-2', type: 'activity', kind: 'call', summary: 'Timed', status: 'planned', priority: 'normal', assigneeId: 'usr-1', scheduledStart: '2026-10-13T10:00', durationMin: 30, archived: false},
      {id: 'act-3', type: 'activity', kind: 'call', summary: 'Bad', status: 'planned', priority: 'normal', assigneeId: 'usr-1', scheduledStart: '', archived: false},
      {id: 'act-4', type: 'activity', kind: 'call', summary: 'Archived', status: 'planned', priority: 'normal', assigneeId: 'usr-1', scheduledStart: '2026-10-13T11:00', archived: true},
      {id: 'act-5', type: 'activity', kind: 'call', summary: 'Malformed', status: 'planned', priority: 'normal', assigneeId: 'usr-1', scheduledStart: '2026-10-13', archived: false},
    ],
    event: [
      {id: 'evt-1', type: 'event', title: 'All day', allDay: true, start: '2026-10-12', end: '2026-10-14'},
      {id: 'evt-2', type: 'event', title: 'Later', allDay: false, start: '2026-11-02T09:00', end: '2026-11-02T10:00'},
    ],
    mail: [],
    person: [],
  },
  links: [],
})

test('note group changes migrate populated groups atomically and preserve links', () => {
  const store = createCollabStore({storage: memoryStorage(), seed: seed(), now: () => '2026-10-13T09:00:00Z'})
  const original = store.listNoteGroups()
  assert.equal(store.configureNoteGroups([...original.slice(0, -1), {id: 'review', label: 'Review'}, original.at(-1)]).ok, true)
  assert.equal(store.listNoteGroups().at(-1).id, 'archived')
  store.updateEntity('note', 'note-1', {status: 'review'})
  store.link({type: 'note', id: 'note-1'}, {type: 'activity', id: 'act-1'})
  assert.ok(store.configureNoteGroups(original).error)
  assert.equal(store.getEntity('note', 'note-1').groupId, 'review')
  assert.equal(store.configureNoteGroups(original, {review: 'active'}).ok, true)
  assert.equal(store.getEntity('note', 'note-1').groupId, 'active')
  assert.equal(store.getRelatedItems('note', 'note-1').length, 1)
  assert.ok(store.configureNoteGroups(original.filter(column => column.id !== 'archived')).error)
  assert.ok(store.configureNoteGroups([...original.slice(0, -1), {id: 'bad', label: ' Active '}, original.at(-1)]).error)
})
test('Draft and Archive cannot be renamed, hidden, reordered or removed', () => {
  const storage = memoryStorage()
  const store = createCollabStore({storage, seed: seed()})
  const original = store.listNoteGroups()
  for (const id of ['draft', 'archived']) {
    assert.ok(store.configureNoteGroups(original.map(group => group.id === id ? {...group, label: 'Changed'} : group)).error)
    assert.ok(store.configureNoteGroups(original.map(group => group.id === id ? {...group, hidden: true} : group)).error)
    assert.ok(store.configureNoteGroups(original.filter(group => group.id !== id)).error)
  }
  assert.ok(store.configureNoteGroups([...original].reverse()).error)
  assert.deepEqual(store.listNoteGroups(), original)
})
test('Active is an ordinary group and removing it persists without resurrection', () => {
  const storage = memoryStorage()
  const store = createCollabStore({storage, seed: seed(), now: () => '2026-10-13T09:00:00Z'})
  const groups = store.listNoteGroups()
  assert.equal(store.configureNoteGroups(groups.map(group => group.id === 'active' ? {...group, label: 'Customers'} : group)).ok, true)
  assert.equal(store.configureNoteGroups(groups.filter(group => group.id !== 'active'), {active: 'draft'}).ok, true)
  const restored = createCollabStore({storage, seed: seed()})
  assert.deepEqual(restored.listNoteGroups().map(group => group.id), ['draft', 'archived'])
  assert.equal(restored.getEntity('note', 'note-1').groupId, 'draft')
  assert.equal('status' in restored.getEntity('note', 'note-1'), false)
})
test('legacy columns and note statuses migrate without losing memberships or links', () => {
  const original = {version: COLLAB_SCHEMA_VERSION, seq: 1000, ...seed(), folders: [], preferences: {}, noteColumns: [
    {id: 'archived', label: 'History', hidden: true}, {id: 'active', label: 'Customer notes'}, {id: 'draft', label: 'Ideas', hidden: true},
  ]}
  const storage = memoryStorage({[COLLAB_STORAGE_KEY]: JSON.stringify(original)})
  const store = createCollabStore({storage, seed: seed()})
  assert.deepEqual(store.listNoteGroups().map(group => [group.label, group.hidden]), [['Draft', false], ['Customer notes', false], ['Archive', false]])
  assert.equal(store.getEntity('note', 'note-1').groupId, 'active')
  assert.equal('status' in store.getEntity('note', 'note-1'), false)
})
const make = (storage = memoryStorage()) => createCollabStore({storage, seed: seed(), now: () => '2026-10-13T13:24'})
const N1 = {type: 'note', id: 'note-1'}
const A1 = {type: 'activity', id: 'act-1'}

test('seed loads when storage is empty and persists on first mutation', () => {
  const storage = memoryStorage()
  const store = make(storage)
  assert.equal(store.listEntities('note').length, 1)
  store.createEntity('note', {title: 'x', status: 'draft'})
  const saved = JSON.parse(storage.getItem(COLLAB_STORAGE_KEY))
  assert.equal(saved.version, COLLAB_SCHEMA_VERSION)
  assert.equal(saved.entities.note.length, 2)
})

test('load falls back on corrupt/old state', () => {
  assert.equal(make(memoryStorage({[COLLAB_STORAGE_KEY]: '{not json'})).listEntities('note').length, 1)
  const old = JSON.stringify({version: 0, entities: {}, links: []})
  assert.equal(make(memoryStorage({[COLLAB_STORAGE_KEY]: old})).listEntities('note').length, 1)
})

test('saved state wins over seed', () => {
  const storage = memoryStorage()
  make(storage).createEntity('note', {title: 'kept', status: 'draft'})
  assert.equal(make(storage).listEntities('note').length, 2)
})

test('create/update/get return copies with ids and timestamps', () => {
  const store = make()
  const note = store.createEntity('note', {title: 'A', status: 'draft'})
  assert.match(note.id, /^note-\d+$/)
  assert.equal(note.createdAt, '2026-10-13T13:24')
  note.title = 'mutated outside'
  assert.equal(store.getEntity('note', note.id).title, 'A')
  store.updateEntity('note', note.id, {title: 'B'})
  assert.equal(store.getEntity('note', note.id).title, 'B')
  assert.equal(store.getEntity('note', 'missing'), null)
})

test('link is bidirectional and dedupes reverse pair and self link', () => {
  const store = make()
  assert.deepEqual(store.link(N1, A1), {created: true})
  assert.deepEqual(store.link(A1, N1), {created: false})
  assert.deepEqual(store.link(N1, N1), {created: false})
  assert.deepEqual(store.getRelatedItems('note', 'note-1').map(r => r.ref), [A1])
  assert.deepEqual(store.getRelatedItems('activity', 'act-1').map(r => r.ref), [N1])
})

test('unlink removes only the link', () => {
  const store = make()
  store.link(N1, A1)
  assert.deepEqual(store.unlink(A1, N1), {removed: true})
  assert.equal(store.getRelatedItems('note', 'note-1').length, 0)
  assert.ok(store.getEntity('note', 'note-1'))
  assert.ok(store.getEntity('activity', 'act-1'))
})

test('linking never changes entity fields', () => {
  const store = make()
  const before = store.getEntity('activity', 'act-1')
  store.link(A1, {type: 'event', id: 'evt-1'})
  assert.deepEqual(store.getEntity('activity', 'act-1'), before)
})

test('delete keeps links so the other side sees an unavailable item', () => {
  const store = make()
  store.link(N1, A1)
  store.deleteEntity('activity', 'act-1')
  assert.deepEqual(store.getRelatedItems('note', 'note-1'), [{ref: A1, entity: null}])
})

test('scheduledActivitiesInRange ignores empty/malformed starts, due-only and archived', () => {
  const ids = make().scheduledActivitiesInRange('2026-10-01', '2026-10-31').map(a => a.id)
  assert.deepEqual(ids, ['act-2'])
})

test('eventsInRange returns overlapping events including multi-day all-day', () => {
  const store = make()
  assert.deepEqual(store.eventsInRange('2026-10-13', '2026-10-13').map(e => e.id), ['evt-1'])
  assert.deepEqual(store.eventsInRange('2026-11-01', '2026-11-30').map(e => e.id), ['evt-2'])
})

test('subscribe fires after mutations and unsubscribe stops it', () => {
  const store = make()
  let calls = 0
  const off = store.subscribe(() => calls++)
  store.link(N1, A1)
  off()
  store.unlink(N1, A1)
  assert.equal(calls, 1)
})

test('reset restores seed and touches only its own key', () => {
  const storage = memoryStorage({'skey-proto-state': '{"rtl":true}'})
  const store = make(storage)
  store.createEntity('note', {title: 'x', status: 'draft'})
  store.reset()
  assert.equal(store.listEntities('note').length, 1)
  assert.equal(storage.getItem('skey-proto-state'), '{"rtl":true}')
})

test('storage failures do not break the store', () => {
  const throwing = {getItem() { throw new Error('denied') }, setItem() { throw new Error('denied') }}
  const store = make(throwing)
  assert.ok(store.createEntity('note', {title: 'x', status: 'draft'}).id)
})

test('date helpers', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01')
  assert.equal(startOfWeek('2026-10-13'), '2026-10-11')
  const grid = monthGridDays('2026-10-13')
  assert.equal(grid.length, 42)
  assert.equal(grid[0], '2026-09-27')
  assert.equal(nextHalfHour('2026-10-13T13:24'), '2026-10-13T13:30')
  assert.equal(nextHalfHour('2026-10-13T13:30'), '2026-10-13T13:30')
  assert.equal(nextHalfHour('2026-10-13T23:45'), '2026-10-14T00:00')
  assert.equal(relativeDay('2026-10-12', '2026-10-13'), 'Yesterday')
})

test('person duplicates match normalized phone, email, or name', async () => {
  const {findPersonDuplicates} = await import('../concepts/app/components/collab/meta.js')
  const people = [
    {id: 'per-1', nameEn: 'Ahmed Ali', contacts: [{kind: 'mobile', value: '+20 100 555 0101'}]},
    {id: 'per-2', nameEn: 'Sara', contacts: [{kind: 'email', value: 'Sara.M@example.com'}]},
  ]
  const fields = candidate => findPersonDuplicates(candidate, people).map(d => [d.person.id, d.field])
  assert.deepEqual(fields({id: 'new', nameEn: 'X', contacts: [{kind: 'mobile', value: '0020-100-555-0101'}]}), [['per-1', 'mobile']])
  assert.deepEqual(fields({id: 'new', nameEn: 'x', contacts: [{kind: 'email', value: 'sara.m@EXAMPLE.com'}]}), [['per-2', 'email']])
  assert.deepEqual(fields({id: 'new', nameEn: ' ahmed  ali ', contacts: []}), [['per-1', 'name']])
  assert.deepEqual(fields({id: 'per-1', nameEn: 'Ahmed Ali', contacts: []}), [])
  assert.deepEqual(fields({id: 'new', nameEn: '', contacts: [{kind: 'mobile', value: '12'}]}), [])
})

test('custom folders are created, validated and renamed in place', () => {
  const store = make()
  assert.deepEqual(store.listFolders(), [])

  const created = store.createFolder('  Clients  ', {reserved: ['Inbox', 'Sent']})
  assert.equal(created.error, undefined)
  assert.equal(created.folder.name, 'Clients')
  assert.match(created.folder.id, /^fld-\d+$/)
  assert.equal(created.folder.createdAt, '2026-10-13T13:24')

  // every read is a copy: mutating outside cannot touch store state
  created.folder.name = 'mutated'
  assert.equal(store.listFolders()[0].name, 'Clients')

  assert.equal(store.createFolder('   ', {reserved: []}).error, 'empty')
  assert.equal(store.createFolder('x'.repeat(41)).error, 'too-long')
  assert.equal(store.createFolder('INBOX', {reserved: ['Inbox']}).error, 'duplicate')
  assert.equal(store.createFolder(' clients').error, 'duplicate')
  assert.equal(store.createFolder('Other', {reserved: ['Inbox']}).error, undefined)

  const id = store.listFolders()[0].id
  const renamed = store.renameFolder(id, ' Key accounts ', {reserved: ['Inbox']})
  assert.equal(renamed.error, undefined)
  assert.equal(renamed.folder.name, 'Key accounts')
  assert.equal(store.renameFolder('fld-999', 'x').error, 'missing')
  assert.equal(store.renameFolder(id, 'Sent', {reserved: ['Sent']}).error, 'duplicate')
  assert.equal(store.renameFolder(id, 'key ACCOUNTS', {reserved: ['Sent']}).error, undefined)
  assert.deepEqual(store.listFolders().map(folder => folder.name), ['key ACCOUNTS', 'Other'])
})

test('deleteFolder files its messages in Inbox and clears restore points', () => {
  const store = make()
  const {folder} = store.createFolder('Clients')
  const filed = store.createEntity('mail', {subject: 'Filed', folder: folder.id})
  const restored = store.createEntity('mail', {subject: 'Back', folder: 'inbox', previousFolder: folder.id})
  const untouched = store.createEntity('mail', {subject: 'Elsewhere', folder: 'archive'})

  assert.deepEqual(store.deleteFolder('fld-nope'), {removed: false, moved: 0})
  assert.equal(store.listFolders().length, 1)

  const {removed, moved} = store.deleteFolder(folder.id)
  assert.equal(removed, true)
  assert.equal(moved, 1)
  assert.deepEqual(store.listFolders(), [])
  assert.equal(store.getEntity('mail', filed.id).folder, 'inbox')
  assert.equal(store.getEntity('mail', filed.id).updatedAt, '2026-10-13T13:24')
  assert.equal(store.getEntity('mail', restored.id).folder, 'inbox')
  assert.equal(store.getEntity('mail', restored.id).previousFolder, null)
  assert.equal(store.getEntity('mail', untouched.id).folder, 'archive')
})

test('a saved state from before folders still loads without a version bump', () => {
  const old = {
    version: COLLAB_SCHEMA_VERSION,
    entities: Object.fromEntries(['note', 'activity', 'event', 'mail', 'person'].map(type => [type, []])),
    links: [],
    folders: [{id: 'fld-1', name: 'Kept'}, null, {name: 'No id'}, {id: 'fld-2', name: 7}],
  }
  const store = make(memoryStorage({[COLLAB_STORAGE_KEY]: JSON.stringify(old)}))
  assert.deepEqual(store.listFolders(), [{id: 'fld-1', name: 'Kept'}])
  assert.match(store.createFolder('New').folder.id, /^fld-\d+$/)
})
