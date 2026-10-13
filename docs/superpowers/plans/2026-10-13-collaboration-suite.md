# Collaboration Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the five `Help Screens` collaboration rows into interconnected prototype screens (Notes, Activities, Events, Internal Mail, People Data) sharing one Related Items system.

**Architecture:** A pure, sessionStorage-backed store in `core/` owns entities and an undirected links table. Shared UI lives in `components/collab/` (fields, side panel, kanban, calendar) and `components/related-items/`. Four new thin pages plus the reworked email page compose those pieces; `main.js` injects fixtures, the demo clock, and cross-page navigation callbacks.

**Tech Stack:** Vanilla ES modules, Tailwind v4 utilities (literal class strings), Node `node:test`, Playwright 1.63.

**Spec:** `docs/superpowers/specs/2026-10-13-collaboration-suite-design.md`

## Global Constraints

- Do not edit `concepts/app/pages/invoices/**`, `concepts/app/pages/customers/**`, or `concepts/app/components/data-list/**`.
- `core/**` and `components/**` must never import from `pages/**`; no circular imports (`tests/architecture.test.mjs`).
- Storage key: `skey-proto-collab`; only `core/collab-store.js` reads/writes it.
- Demo clock: `PROTOTYPE_NOW = '2026-10-13T13:24'`; all "today"/overdue/defaults derive from `store.now()`.
- Seeded mail ids stay `e1`–`e5`.
- Activity `dueDate`, `scheduledStart`, `durationMin` are independent; only valid `scheduledStart` (`YYYY-MM-DDTHH:mm`) puts an activity on a calendar.
- Linking never changes any entity field.
- Reuse `.lbtn`, `.lbtn.pri`, `.ibtn`, `.badge`, `.crumbs`, `.phead`, `rec-field` styling, `toast()`, `trapFocus/releaseFocus`.
- Type identity = icon **and** text label, never color only.
- RTL: logical utilities (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`), `dir="auto"` on user text.
- All user-facing copy for simulated features states it is a prototype (delivery, reminders, repeat, conversion).
- Email pixel snapshots are regenerated only after the user approves the new mail UI.

## Review Focus

1. **Corrupt or old `skey-proto-collab` JSON** → store must fall back to seed, not throw on boot. (Task 1 test `load falls back on corrupt/old state`.)
2. **Activity with `scheduledStart: ''` or malformed** (e.g. user clears the time input) → must not appear on the calendar. (Task 1 test `scheduledActivitiesInRange ignores empty/malformed starts`.)
3. **Linking an item to itself or re-linking in reverse order** → no new link. (Task 1 test `link dedupes reverse pair and self link`.)
4. **Draft left mid-compose when navigating away** → must still be in Drafts with its body. (Task 8 browser test `draft survives navigation`.)
5. **User text containing HTML (`<b>x</b>` in a note title)** → rendered as text, never markup. (Task 4 browser test `titles are escaped`.)

---

## File map

| File | Responsibility |
|---|---|
| `concepts/app/core/collab-store.js` (new) | entities, links, persistence, calendar queries |
| `concepts/app/core/collab-dates.js` (new) | pure date math/formatting for calendar + relative labels |
| `concepts/app/prototype/fixtures/collaboration.js` (new) | `PROTOTYPE_NOW`, `COLLAB_SEED` (notes, activities, events, mail from `EMAIL_DATA`, people, links) |
| `concepts/app/components/collab/fields.js` (new) | shared form class constants + field HTML helpers, `escapeHtml` re-export |
| `concepts/app/components/collab/panel.js` (new) | side-panel editor shell |
| `concepts/app/components/collab/kanban.js` (new) | board renderer, drag + Move to… |
| `concepts/app/components/collab/calendar.js` (new) | day/week/month renderer |
| `concepts/app/components/collab/meta.js` (new) | per-type icon, label, title, meta line (used by related items, mail, cards) |
| `concepts/app/components/related-items/related-items.js` (new) | Related Items section + picker dialog + create related |
| `concepts/app/components/collab/collab.html` (new) | panel + picker + confirm dialog markup, included once |
| `concepts/app/pages/notes/{notes.js,templates.html}` (new) | Notes screen |
| `concepts/app/pages/activities/{activities.js,templates.html}` (new) | Activities screen |
| `concepts/app/pages/events/{events.js,templates.html}` (new) | Events screen |
| `concepts/app/pages/people/{people.js,templates.html}` (new) | People Data screen |
| `concepts/app/pages/email/{email.js,templates.html}` (rewrite) | Internal Mail |
| `concepts/app/components/notifications/notifications.js` (modify) | read inbox via injected `getInboxMail`/`markRead` |
| `concepts/app/core/routes.js` (modify) | 4 new paths |
| `concepts/app/shell/{shell.js,content.js,sidebar.js}` (modify) | mount templates, view selectors, nav label map |
| `concepts/app/prototype/fixtures/navigation.js` (modify) | rename rows |
| `concepts/app/prototype/{controls.html,controls.js}` (modify) | Collaboration group + reset |
| `concepts/app/main.js` (modify) | compose store + pages |
| `concepts/app/shell/shell.html` (modify) | include `components/collab/collab.html` and the four new page templates |
| `concepts/app/core/locale.js` (modify) | AR strings for nav rows + screen titles |
| `tests/collab-store.test.mjs` (new), `tests/collab-seed.test.mjs` (new), `tests/collaboration.spec.mjs` (new), `tests/routes.test.mjs` (modify), `tests/tailwind.test.mjs` (baseline, if needed), `tests/support/known-defects.md` (note) | verification |

> Existing page templates are aggregated via `pages/invoices/templates.html:682`. To keep `pages/invoices/**` untouched, the four new templates are included from `shell/shell.html` instead; `shell.js` only needs each `<template>` to exist inside `.design`. Task 3 verifies `d.querySelector('.notes-tpl')` resolves from there.

---

### Task 1: Store, date helpers, unit tests

**Files:**
- Create: `concepts/app/core/collab-store.js`, `concepts/app/core/collab-dates.js`
- Test: `tests/collab-store.test.mjs`

**Interfaces — Produces:**
- `createCollabStore({storage, seed, now}) → store` with `getEntity(type,id)`, `listEntities(type, filter?)`, `createEntity(type,data)`, `updateEntity(type,id,changes)`, `deleteEntity(type,id)`, `link(a,b) → {created}`, `unlink(a,b) → {removed}`, `getRelatedItems(type,id) → [{ref, entity|null}]`, `eventsInRange(fromDate,toDate)`, `scheduledActivitiesInRange(fromDate,toDate)`, `isScheduled(activity)`, `now()`, `subscribe(fn) → unsubscribe`, `reset()`.
- Constants: `COLLAB_STORAGE_KEY`, `COLLAB_SCHEMA_VERSION`, `ENTITY_TYPES`.
- `collab-dates.js`: `parseLocal(str) → Date`, `toDateKey(Date) → 'YYYY-MM-DD'`, `toDateTimeKey(Date) → 'YYYY-MM-DDTHH:mm'`, `addDays(key, n) → key`, `addMinutes(dtKey, n) → dtKey`, `startOfWeek(key) → key` (Sunday), `monthGridDays(key) → key[42]`, `daysBetween(a,b) → int`, `relativeDay(key, todayKey) → 'Today'|'Yesterday'|'Tomorrow'|null`, `formatDate(key) → 'Tue, 13 Oct'`, `formatTime(dtKey) → '13:24'`, `nextHalfHour(dtKey) → dtKey`.

- [ ] **Step 1: Write failing tests** — `tests/collab-store.test.mjs`:

```js
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
    ],
    event: [
      {id: 'evt-1', type: 'event', title: 'All day', allDay: true, start: '2026-10-12', end: '2026-10-14'},
      {id: 'evt-2', type: 'event', title: 'Later', allDay: false, start: '2026-11-02T09:00', end: '2026-11-02T10:00'},
    ],
    mail: [], person: [],
  },
  links: [],
})
const make = (storage = memoryStorage()) => createCollabStore({storage, seed: seed(), now: () => '2026-10-13T13:24'})
const N1 = {type: 'note', id: 'note-1'}, A1 = {type: 'activity', id: 'act-1'}

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
  assert.equal(make(memoryStorage({[COLLAB_STORAGE_KEY]: JSON.stringify({version: 0, entities: {}, links: []})})).listEntities('note').length, 1)
})

test('saved state wins over seed', () => {
  const storage = memoryStorage()
  make(storage).createEntity('note', {title: 'kept', status: 'draft'})
  assert.equal(make(storage).listEntities('note').length, 2)
})

test('create/update/get return copies with ids and timestamps', () => {
  const store = make()
  const n = store.createEntity('note', {title: 'A', status: 'draft'})
  assert.match(n.id, /^note-\d+$/)
  assert.equal(n.createdAt, '2026-10-13T13:24')
  n.title = 'mutated outside'
  assert.equal(store.getEntity('note', n.id).title, 'A')
  store.updateEntity('note', n.id, {title: 'B'})
  assert.equal(store.getEntity('note', n.id).title, 'B')
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
  assert.equal(nextHalfHour('2026-10-13T23:45'), '2026-10-14T00:00')
  assert.equal(relativeDay('2026-10-12', '2026-10-13'), 'Yesterday')
})
```

- [ ] **Step 2: Run** `node --test tests/collab-store.test.mjs` → FAIL (module not found).

- [ ] **Step 3: Implement `core/collab-dates.js`**

```js
// Pure local-time date helpers for the collaboration screens. Keys are
// strings ('YYYY-MM-DD' / 'YYYY-MM-DDTHH:mm') so stored data never carries
// a timezone; Date objects only exist inside these functions.
const pad = n => String(n).padStart(2, '0')
export const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function parseLocal(key) {
  const [d, t = '00:00'] = String(key).split('T')
  const [y, m, day] = d.split('-').map(Number)
  const [h, min] = t.split(':').map(Number)
  return new Date(y, m - 1, day, h, min)
}
export const toDateKey = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
export const toDateTimeKey = date => `${toDateKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`
export const isValidDateTime = v => typeof v === 'string' && DATE_TIME_PATTERN.test(v) && !Number.isNaN(parseLocal(v).getTime())
export const isValidDate = v => typeof v === 'string' && DATE_PATTERN.test(v)

export function addDays(key, n) {
  const d = parseLocal(key)
  d.setDate(d.getDate() + n)
  return key.includes('T') ? toDateTimeKey(d) : toDateKey(d)
}
export function addMinutes(key, n) {
  const d = parseLocal(key)
  d.setMinutes(d.getMinutes() + n)
  return toDateTimeKey(d)
}
export function startOfWeek(key) {
  const d = parseLocal(key.slice(0, 10))
  d.setDate(d.getDate() - d.getDay())
  return toDateKey(d)
}
export function monthGridDays(key) {
  const first = `${key.slice(0, 7)}-01`
  const start = startOfWeek(first)
  return Array.from({length: 42}, (_, i) => addDays(start, i))
}
export const daysBetween = (a, b) => Math.round((parseLocal(b.slice(0, 10)) - parseLocal(a.slice(0, 10))) / 86400000)
export function relativeDay(key, todayKey) {
  const diff = daysBetween(todayKey, key)
  return diff === 0 ? 'Today' : diff === -1 ? 'Yesterday' : diff === 1 ? 'Tomorrow' : null
}
export const formatDate = key => parseLocal(key.slice(0, 10)).toLocaleDateString('en-GB', {weekday: 'short', day: 'numeric', month: 'short'})
export const formatMonthTitle = key => parseLocal(key.slice(0, 10)).toLocaleDateString('en-GB', {month: 'long', year: 'numeric'})
export const formatTime = key => key.slice(11, 16)
export function nextHalfHour(key) {
  const d = parseLocal(key)
  const add = 30 - (d.getMinutes() % 30)
  d.setMinutes(d.getMinutes() + (add === 30 && d.getMinutes() % 30 === 0 ? 0 : add))
  return toDateTimeKey(d)
}
```

- [ ] **Step 4: Implement `core/collab-store.js`**

```js
// Collaboration store — the single source of truth for Notes, Activities,
// Events, Internal Mail and People Data plus the undirected links table
// between them. Pure: no DOM, no page imports. Fixtures, the storage
// object and the demo clock are injected by main.js.
import {isValidDateTime} from './collab-dates.js'

export const COLLAB_STORAGE_KEY = 'skey-proto-collab'
export const COLLAB_SCHEMA_VERSION = 1
export const ENTITY_TYPES = ['note', 'activity', 'event', 'mail', 'person']
const ID_PREFIX = {note: 'note', activity: 'act', event: 'evt', mail: 'mail', person: 'per'}

const copy = value => (value == null ? value : JSON.parse(JSON.stringify(value)))
const sameRef = (x, y) => x.type === y.type && x.id === y.id
const refOf = entity => ({type: entity.type, id: entity.id})

export function createCollabStore({storage, seed, now}) {
  const listeners = new Set()
  const initialState = () => ({
    version: COLLAB_SCHEMA_VERSION,
    seq: 1000,
    entities: Object.fromEntries(ENTITY_TYPES.map(type => [type, copy(seed.entities[type] || [])])),
    links: copy(seed.links || []),
  })
  const isUsable = saved =>
    saved && saved.version === COLLAB_SCHEMA_VERSION && saved.entities && Array.isArray(saved.links) &&
    ENTITY_TYPES.every(type => Array.isArray(saved.entities[type]))
  const load = () => {
    try {
      const saved = JSON.parse(storage?.getItem(COLLAB_STORAGE_KEY) ?? 'null')
      if (isUsable(saved)) return saved
    } catch {}
    return initialState()
  }
  let state = load()

  const commit = () => {
    try { storage?.setItem(COLLAB_STORAGE_KEY, JSON.stringify(state)) } catch {}
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
    deleteEntity(type, id) {
      const before = state.entities[type].length
      state.entities[type] = state.entities[type].filter(entity => entity.id !== id)
      if (state.entities[type].length !== before) commit()
    },
    link(a, b) {
      if (sameRef(a, b)) return {created: false}
      if (state.links.some(l => (sameRef(l.a, a) && sameRef(l.b, b)) || (sameRef(l.a, b) && sameRef(l.b, a)))) return {created: false}
      state.links.push({id: `lnk-${++state.seq}`, a: {type: a.type, id: a.id}, b: {type: b.type, id: b.id}, createdAt: now()})
      commit()
      return {created: true}
    },
    unlink(a, b) {
      const before = state.links.length
      state.links = state.links.filter(l => !((sameRef(l.a, a) && sameRef(l.b, b)) || (sameRef(l.a, b) && sameRef(l.b, a))))
      const removed = state.links.length !== before
      if (removed) commit()
      return {removed}
    },
    getRelatedItems(type, id) {
      const self = {type, id}
      return state.links
        .filter(l => sameRef(l.a, self) || sameRef(l.b, self))
        .map(l => {
          const ref = sameRef(l.a, self) ? l.b : l.a
          return {ref: {...ref}, entity: copy(find(ref.type, ref.id))}
        })
    },
    isScheduled: activity => isValidDateTime(activity?.scheduledStart),
    scheduledActivitiesInRange(from, to) {
      return copy(state.entities.activity.filter(a =>
        !a.archived && isValidDateTime(a.scheduledStart) &&
        a.scheduledStart.slice(0, 10) >= from && a.scheduledStart.slice(0, 10) <= to))
    },
    eventsInRange(from, to) {
      return copy(state.entities.event.filter(e => e.start.slice(0, 10) <= to && e.end.slice(0, 10) >= from))
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    reset() {
      state = initialState()
      commit()
    },
    refOf,
  }
}
```

- [ ] **Step 5: Run** `node --test tests/collab-store.test.mjs` → all PASS. Run `npm run test:unit` → architecture test still passes.
- [ ] **Step 6: Commit** `git add concepts/app/core/collab-store.js concepts/app/core/collab-dates.js tests/collab-store.test.mjs && git commit -m "feat: collaboration store with undirected links"`

---

### Task 2: Seed fixtures + store bootstrap + reset control

**Files:**
- Create: `concepts/app/prototype/fixtures/collaboration.js`, `tests/collab-seed.test.mjs`
- Modify: `concepts/app/main.js` (create store), `concepts/app/prototype/controls.html` (group), `concepts/app/prototype/controls.js` (`syncPage` shows group; button wiring through option `onResetCollab`)

**Interfaces:**
- Produces `PROTOTYPE_NOW`, `COLLAB_SEED`, `COLLAB_USERS` (= `ORGANIZATION_USERS` subset `{id,name,role}`), `CURRENT_USER_ID = 'usr-1'`.
- `createPrototypeControls({..., onResetCollab})`; `syncPage` shows `#collab-group-heading` + `#collab-reset-group` for `notes|activities|events|email|people`.

- [ ] **Step 1: Failing test** `tests/collab-seed.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import {COLLAB_SEED, PROTOTYPE_NOW} from '../concepts/app/prototype/fixtures/collaboration.js'
import {ENTITY_TYPES} from '../concepts/app/core/collab-store.js'
import {isValidDateTime} from '../concepts/app/core/collab-dates.js'

test('seed ids are unique and typed', () => {
  const ids = ENTITY_TYPES.flatMap(type => COLLAB_SEED.entities[type].map(e => { assert.equal(e.type, type); return `${type}:${e.id}` }))
  assert.equal(new Set(ids).size, ids.length)
})
test('seed links point at seeded entities', () => {
  const has = r => COLLAB_SEED.entities[r.type].some(e => e.id === r.id)
  for (const l of COLLAB_SEED.links) assert.ok(has(l.a) && has(l.b), l.id)
})
test('seed keeps mail ids e1-e5 and covers every folder and scheduling case', () => {
  const mail = COLLAB_SEED.entities.mail
  for (const id of ['e1', 'e2', 'e3', 'e4', 'e5']) assert.ok(mail.some(m => m.id === id))
  for (const folder of ['inbox', 'sent', 'drafts']) assert.ok(mail.some(m => m.folder === folder), folder)
  const acts = COLLAB_SEED.entities.activity
  assert.ok(acts.some(a => a.dueDate && !a.scheduledStart), 'due-only activity')
  assert.ok(acts.some(a => isValidDateTime(a.scheduledStart)), 'scheduled activity')
  assert.ok(acts.some(a => a.dueDate && a.dueDate < PROTOTYPE_NOW.slice(0, 10) && a.status !== 'done'), 'overdue activity')
})
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Write fixtures.** Content (stable ids):
  - Notes: `note-1` "Payment terms for Al Noor" (active, tags `customers`, pinned), `note-2` "Month-end checklist" (draft, body with `- [ ]` lines), `note-3` "Warehouse 201 variance notes" (active), `note-4` "ملاحظات اجتماع المبيعات" (Arabic title, active), `note-5` "Old pricing assumptions" (archived).
  - Activities (assignees `usr-1..usr-4`): `act-1` call "Call Al Noor about quotation 884", scheduled `2026-10-13T15:00` 30 min, due `2026-10-13`; `act-2` todo "Confirm stock counts for Bill Outgoing Order", due `2026-10-10` (overdue, planned); `act-3` meeting "Monthly sales review", scheduled `2026-10-15T10:00` 60 min, in_progress; `act-4` email "Send revised price list", due `2026-10-16`, no schedule; `act-5` todo "Archive Q3 receipts", done; `act-6` todo "Review password policy", due `2026-10-20`, no schedule.
  - Events: `evt-1` "Monthly sales review" `2026-10-15T10:00–11:00` (location "Meeting room 2", participants usr-1,usr-2,usr-3), `evt-2` "Company holiday" all-day `2026-10-06`, `evt-3` "Supplier visit — Al Noor" `2026-10-13T11:00–12:00`, `evt-4` "Quarter close" all-day `2026-10-29`–`2026-10-30`.
  - Mail: `EMAIL_DATA.map(toMail)` where `toMail(m)` = `{id: m.id, type: 'mail', folder: 'inbox', threadId: 't-' + m.id, from: {name: m.from, email: m.email}, to: m.to, cc: m.cc, subject: m.subject, body: m.body, attachments: m.attachments, unread: m.unread, starred: m.id === 'e1', hue: m.hue, sentAt: (m.day === 'Today' ? '2026-10-13' : '2026-10-12') + 'T' + m.time}`; plus `mail-s1` sent reply in thread `t-e2` ("Re: Stock check needed…", from current user, to Warehouse Ops, `sentAt 2026-10-13T14:40`) and `mail-d1` draft ("Price list update", to Mariam Adel, `savedAt 2026-10-13T12:10`).
  - People: `per-1` Ahmed Ali / أحمد علي, Al Noor Trading, mobile `+20 100 555 0101`; `per-2` Sara Mahmoud / سارة محمود, mobile `+20 122 555 0199`, email `sara.m@example.com`; `per-3` Khaled Ibrahim, lifecycle contact, `convertedTo: {target: 'customer', at: '2026-10-01T10:00'}`; `per-4` Ahmed Aly (EN name differs, same mobile as per-1 → duplicate demo).
  - Links: `note-1↔per-1`, `note-1↔act-1`, `act-1↔per-1`, `act-1↔e4`, `act-3↔evt-1`, `note-3↔e2`, `act-2↔e2`, `note-4↔evt-1`.
- [ ] **Step 4: Run** `node --test tests/collab-seed.test.mjs` → PASS.
- [ ] **Step 5: Bootstrap in `main.js`** right after `const toast = ...`:

```js
import {createCollabStore} from './core/collab-store.js'
import {COLLAB_SEED, PROTOTYPE_NOW} from './prototype/fixtures/collaboration.js'
const collabStore = createCollabStore({storage: sessionStorage, seed: COLLAB_SEED, now: () => PROTOTYPE_NOW})
```
  Pass `onResetCollab: () => { collabStore.reset(); toast({tone: 'info', title: 'Collaboration data reset', body: 'Notes, activities, events, mail and people are back to the demo data.'}) }` to `createPrototypeControls`.
- [ ] **Step 6: Controls markup** — append before the session group in `controls.html`:

```html
<div class="grp-heading" id="collab-group-heading" hidden>Collaboration</div>
<div class="grp" id="collab-reset-group" hidden>
  <button type="button" id="collab-reset" class="open-btn">Reset collaboration data</button>
</div>
```
  In `controls.js`: `doc.getElementById('collab-reset')?.addEventListener('click', onResetCollab)` and in `syncPage`: `const isCollab = ['notes','activities','events','email','people'].includes(viewName); ['collab-group-heading','collab-reset-group'].forEach(id => { const el = doc.getElementById(id); if (el) el.hidden = !isCollab })`.
- [ ] **Step 7: Run** `npm run test:unit` → PASS. **Commit** `feat: seed collaboration data and reset control`.

---

### Task 3: Routes, navigation, page shells

**Files:**
- Modify: `concepts/app/core/routes.js`, `tests/routes.test.mjs`, `concepts/app/prototype/fixtures/navigation.js:481-491`, `concepts/app/shell/sidebar.js:107-111`, `concepts/app/shell/shell.js:36-46`, `concepts/app/shell/content.js` (both selector maps), `concepts/app/shell/shell.html` (includes), `concepts/app/main.js` (`NAV_ITEM_LABEL_BY_ID`, `pageRegistry`, invoice `recordRoots` exclusion selector list, page creation), `tests/support/known-defects.md` (finding 7 note)
- Create: `concepts/app/pages/{notes,activities,events,people}/templates.html` and minimal `*.js` (header + empty body; real UI in later tasks)
- Test: `tests/collaboration.spec.mjs` (reachability block)

**Interfaces — Produces:**
- View ids `notes`, `activities`, `events`, `people`; root selectors `.notes-view`, `.activities-view`, `.events-view`, `.people-view`; template classes `.notes-tpl` etc.
- Page factories `createNotes(deps)`, `createActivities(deps)`, `createEvents(deps)`, `createPeople(deps)` returning `{id, roots, activate(data), deactivate(), dispose()}`; `activate({openId})` opens that item's panel.

- [ ] **Step 1: Update `tests/routes.test.mjs`**: change `ROUTE_PATHS.length` to `31`, update the "20 app bases + 3 inner paths + 4 shell paths = 27" comment in routes.js, and add:

```js
test('routes: help-screens collaboration paths', () => {
  assert.deepEqual(parse('/help-screens/notes'), {id: 'notes', data: {}})
  assert.deepEqual(parse('/help-screens/activities'), {id: 'activities', data: {}})
  assert.deepEqual(parse('/help-screens/events'), {id: 'events', data: {}})
  assert.deepEqual(parse('/help-screens/people-data'), {id: 'people', data: {}})
  assert.equal(format('people'), '/help-screens/people-data')
  assert.deepEqual(parse('/help-screens'), {id: 'foryou', data: {app: 'Help Screens'}})
})
```
- [ ] **Step 2: Run** `node --test tests/routes.test.mjs` → FAIL.
- [ ] **Step 3: routes.js** — add to `AREA_VIEW_BY_PATH`: `'/help-screens/notes': 'notes', '/help-screens/activities': 'activities', '/help-screens/events': 'events', '/help-screens/people-data': 'people'`; add the same four to `PATH_BY_VIEW`; update the count comment to `20 app bases + 7 inner paths + 4 shell paths = 31`. Run → PASS.
- [ ] **Step 4: Navigation fixture** — Help Screens group becomes `['Help Screens', 'Internal Mail', 'Events', 'Activities', 'Notes', 'People Data', 'Smart Query Engine', 'AI Dashboard', 'Sales Forecast']`. Sidebar `viewByNavLabel` adds `'Internal Mail': 'email', Events: 'events', Activities: 'activities', Notes: 'notes', 'People Data': 'people'`. Main `NAV_ITEM_LABEL_BY_ID` adds `notes: 'Notes', activities: 'Activities', events: 'Events', people: 'People Data'`. Add a line to known-defects finding 7: "Internal Mail now maps to the Email view (2026-10-13 collaboration suite); other unmapped rows still fall back."
- [ ] **Step 5: Page templates** — each `templates.html` follows the email header pattern. Notes example (others identical with their names/actions):

```html
<template class="notes-tpl">
  <div class="notes-view collab-view flex flex-1 min-h-0 flex-col" hidden>
    <div class="phead px-4 [.d1_&]:flex [.d1_&]:items-start [.d1_&]:gap-5 [.d1_&]:[padding:11px_0]">
      <div class="l [.d1_.phead_&]:flex-1">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="#" data-collab-home data-i18n="Home">Home</a><span class="sep">›</span><span aria-current="page" data-i18n="Notes">Notes</span></nav>
        <div class="tline"><h1 data-i18n="Notes">Notes</h1></div>
      </div>
      <div class="r"><button type="button" class="lbtn pri" data-notes-new><svg width="15" height="15" aria-hidden="true"><use href="#i-plus" /></svg> <span data-i18n="New note">New note</span></button></div>
    </div>
    <div class="collab-toolbar" data-notes-toolbar></div>
    <div class="collab-body flex-1 min-h-0 overflow-auto px-4 pb-4" data-notes-body></div>
  </div>
</template>
```
  Include all four from `shell/shell.html` next to the other includes (`<!-- include: ../pages/notes/templates.html -->` …). In `shell.js` append `.notes-tpl`, `.activities-tpl`, `.events-tpl`, `.people-tpl` after `.foryou-tpl`. In `content.js` add `notes: '.notes-view'` etc. to both maps (with `:not([hidden])` in the skeleton map). In `main.js` add `.notes-view,.activities-view,.events-view,.people-view` to the `recordRoots` exclusion selector string (otherwise the invoice record shows/hides them).
- [ ] **Step 6: Minimal page factories** (filled in later tasks), e.g.:

```js
export function createNotes({store, t, toast, panel, related}) {
  const root = () => document.querySelector('.notes-view')
  return {id: 'notes', get roots() { return root() ? [root()] : [] }, activate() {}, deactivate() {}, dispose() {}}
}
```
  Register in `pageRegistry`. `data-collab-home` links call `topbar.goToForYou`-equivalent: navigate to `foryou` with `{app: 'Help Screens'}` via an injected `goHome()`.
- [ ] **Step 7: Browser test** `tests/collaboration.spec.mjs` (first block):

```js
import {test, expect} from '@playwright/test'
import {settle} from './support/browser.mjs'
const base = () => process.env.PARITY_URL ?? 'http://127.0.0.1:4173'
async function go(page, path) {
  await page.goto(`${base()}${path}`)
  const loading = page.locator('#simulate-loading')
  if (await loading.isChecked()) await loading.uncheck()
  await settle(page)
}
test.beforeEach(async ({page}) => { await page.addInitScript(() => sessionStorage.removeItem('skey-proto-collab')) })

for (const [path, selector, title] of [
  ['/help-screens/notes', '.notes-view', 'Notes'],
  ['/help-screens/activities', '.activities-view', 'Activities'],
  ['/help-screens/events', '.events-view', 'Events'],
  ['/help-screens/people-data', '.people-view', 'People Data'],
]) {
  test(`deep link ${path} shows ${title}`, async ({page}) => {
    await go(page, path)
    await expect(page.locator(selector)).toBeVisible()
    await expect(page.locator(`${selector} h1`)).toHaveText(title)
  })
}

test('Help Screens rows open their screens and Internal Mail opens email', async ({page}) => {
  await go(page, '/help-screens')
  for (const [label, selector] of [['Notes', '.notes-view'], ['Activities', '.activities-view'], ['Events', '.events-view'], ['People Data', '.people-view'], ['Internal Mail', '.email-view']]) {
    await page.locator(`.nc1-item[data-label="${label}"]`).first().click()
    await expect(page.locator(selector)).toBeVisible()
    if (label === 'Internal Mail') await go(page, '/help-screens')
  }
})
```
  Note: `addInitScript` with removeItem runs on every navigation including reloads; tests that check reload persistence must use a separate context without it (Task 4/8 tests use `test.describe` with their own setup).
- [ ] **Step 8: Run** `npm run test:unit`, start `npm run dev` (background), `npx playwright test tests/collaboration.spec.mjs --project=desktop` → PASS. **Commit** `feat: route and wire collaboration screens under Help Screens`.

---

### Task 4: Shared UI — fields, meta, panel, related items

**Files:**
- Create: `concepts/app/components/collab/fields.js`, `meta.js`, `panel.js`, `collab.html`; `concepts/app/components/related-items/related-items.js`
- Modify: `concepts/app/shell/shell.html` (include `collab.html`), `concepts/app/main.js` (instantiate)

**Interfaces — Produces:**
- `fields.js`: `FIELD_CLASS` (the `rec-field …` input class string copied verbatim from `pages/customers/lookups.js:278`, without the `.customer-*`/`.rec-payment-*`/modal scoped variants), `field({id,label,required,control})`, `textInput({id,value,required,type})`, `selectInput({id,value,options:[[value,label]]})`, `textarea({id,value,rows})`, `checkbox({id,label,checked})`, `escapeHtml` (re-export `encodeHtml` from `core/locale.js`).
- `meta.js`: `TYPE_META = {note:{label:'Note', icon:'i-doc'}, activity:{label:'Activity', icon:'i-check'}, event:{label:'Event', icon:'i-clock'}, mail:{label:'Mail', icon:'i-mail'}, person:{label:'Person', icon:'i-user'}}`, `titleOf(entity)`, `metaLine(entity, {today, users})` (note: status; activity: status + `Overdue`/`Due <date>`/`Scheduled <date time>`; event: date/time or "All day"; mail: folder + date; person: lifecycle or `Converted to X`), `ACTIVITY_KINDS`, `ACTIVITY_STATUSES`, `isOverdue(activity, todayKey)`, `userName(id, users)`.
- `panel.js`: `createCollabPanel({trapFocus, releaseFocus, confirm})` → `{open({ref, typeLabel, title, body: (el) => void, onSave: (el) => boolean, menu: [{label, run}], related: (el) => void, isDirty: () => bool}), close(), isOpen(), currentRef()}`. Markup ids: `#collab-panel`, `#collab-panel-scrim`.
- `createConfirm()` inside panel.js → `confirm({title, body, confirmLabel, tone}) → Promise<boolean>` using `#collab-confirm`.
- `related-items.js`: `createRelatedItems({store, users, toast, trapFocus, releaseFocus, openItem, onCreated})` → `{render(container, ref), openPicker(ref, {types?})}`; `createRelated(type, sourceRef)` creates default entity + link and calls `openItem`.

- [ ] **Step 1: Browser tests** (append to `tests/collaboration.spec.mjs`), exercised through Notes seed data (`note-1` is linked to `act-1` and `per-1`). These fail until Task 5 renders Notes; write them now, run after Task 5:

```js
test.describe('related items', () => {
  test('link is visible from both sides and dedupes', async ({page}) => {
    await go(page, '/help-screens/notes')
    await page.getByRole('button', {name: /Month-end checklist/}).click()
    const panel = page.locator('#collab-panel')
    await panel.getByRole('button', {name: 'Link existing…'}).click()
    const picker = page.locator('#collab-picker')
    await picker.getByRole('searchbox').fill('Monthly sales review')
    await picker.getByRole('option', {name: /Event.*Monthly sales review/}).click()
    await picker.getByRole('button', {name: 'Done'}).click()
    await expect(panel.locator('[data-related-row]')).toHaveCount(1)
    await panel.getByRole('button', {name: 'Link existing…'}).click()
    await picker.getByRole('searchbox').fill('Monthly sales review')
    await expect(picker.getByRole('option', {name: /Event.*Monthly sales review/})).toHaveCount(0)
    await picker.getByRole('button', {name: 'Done'}).click()
    await panel.locator('[data-related-row]').first().click()
    await expect(page.locator('.events-view')).toBeVisible()
    await expect(page.locator('#collab-panel [data-related-row]', {hasText: 'Month-end checklist'})).toBeVisible()
  })

  test('unlink keeps both items', async ({page}) => {
    await go(page, '/help-screens/notes')
    await page.getByRole('button', {name: /Payment terms for Al Noor/}).click()
    await page.getByRole('button', {name: /Remove link to Call Al Noor/}).click()
    await page.keyboard.press('Escape')
    await go(page, '/help-screens/activities')
    await expect(page.getByRole('button', {name: /Call Al Noor about quotation 884/})).toBeVisible()
  })

  test('deleted item shows as unavailable on the other side', async ({page}) => {
    await go(page, '/help-screens/notes')
    await page.getByRole('button', {name: /Payment terms for Al Noor/}).click()
    await page.locator('#collab-panel').getByRole('button', {name: 'More actions'}).click()
    await page.getByRole('menuitem', {name: 'Delete'}).click()
    await page.locator('#collab-confirm').getByRole('button', {name: 'Delete'}).click()
    await go(page, '/help-screens/people-data')
    await page.getByRole('button', {name: /Ahmed Ali/}).click()
    await expect(page.locator('#collab-panel')).toContainText('Unavailable item')
  })

  test('titles are escaped', async ({page}) => {
    await go(page, '/help-screens/notes')
    await page.getByRole('button', {name: 'New note'}).click()
    await page.locator('#collab-panel #note-title').fill('<b>bold</b>')
    await page.locator('#collab-panel').getByRole('button', {name: 'Save'}).click()
    await expect(page.locator('.notes-view').getByText('<b>bold</b>')).toBeVisible()
    await expect(page.locator('.notes-view b', {hasText: 'bold'})).toHaveCount(0)
  })
})
```
- [ ] **Step 2: `collab.html`** (included once from `shell.html`):

```html
<div id="collab-panel-scrim" class="fixed inset-0 z-[130] hidden bg-[rgba(17,24,39,0.4)] [&.open]:block"></div>
<aside id="collab-panel" class="fixed inset-y-0 end-0 z-[140] hidden w-[min(560px,94vw)] flex-col bg-surface shadow-shell [&.open]:flex" role="dialog" aria-modal="true" aria-labelledby="collab-panel-title">
  <header class="flex items-start gap-3 border-b border-line px-[18px] py-3.5">
    <span class="badge" data-panel-type></span>
    <h2 id="collab-panel-title" class="min-w-0 flex-1 text-[15px] font-semibold" dir="auto"></h2>
    <div class="relative"><button type="button" class="ibtn" data-panel-menu aria-haspopup="menu" aria-expanded="false" aria-label="More actions"><svg width="15" height="15" aria-hidden="true"><use href="#i-dots" /></svg></button>
      <div class="absolute end-0 top-full z-10 hidden min-w-[160px] rounded-lg border border-line bg-surface p-1.5 shadow-shell [&.open]:grid" role="menu" data-panel-menu-list></div></div>
    <button type="button" class="ibtn" data-panel-close aria-label="Close"><svg width="15" height="15" aria-hidden="true"><use href="#i-x" /></svg></button>
  </header>
  <form class="flex min-h-0 flex-1 flex-col" data-panel-form novalidate>
    <div class="flex-1 overflow-auto px-[18px] py-4" data-panel-body></div>
    <div class="border-t border-line px-[18px] py-3" data-panel-related></div>
    <footer class="flex justify-end gap-2 border-t border-line px-[18px] py-3">
      <button type="button" class="lbtn" data-panel-cancel>Cancel</button>
      <button type="submit" class="lbtn pri">Save</button>
    </footer>
  </form>
</aside>
<div id="collab-picker" class="dlg fixed inset-0 z-[150] hidden place-items-center bg-[rgba(17,24,39,0.4)] [&.open]:grid" role="dialog" aria-modal="true" aria-labelledby="collab-picker-title">
  <div class="w-[min(560px,94vw)] rounded-lg bg-surface shadow-shell">
    <div class="flex items-center gap-3 border-b border-line px-4 py-3"><h2 id="collab-picker-title" class="flex-1 text-[15px] font-semibold">Link existing item</h2></div>
    <div class="px-4 pt-3"><input type="search" class="w-full rounded-md border border-line px-2 py-1.5" placeholder="Search notes, activities, events, mail, people…" aria-label="Search items" data-picker-search>
      <div class="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Filter by type" data-picker-types></div></div>
    <ul class="m-0 max-h-[50vh] list-none overflow-auto p-2" role="listbox" aria-label="Results" data-picker-results></ul>
    <div class="flex justify-end border-t border-line px-4 py-3"><button type="button" class="lbtn pri" data-picker-done>Done</button></div>
  </div>
</div>
<div id="collab-confirm" class="dlg fixed inset-0 z-[160] hidden place-items-center bg-[rgba(17,24,39,0.4)] [&.open]:grid" role="alertdialog" aria-modal="true" aria-labelledby="collab-confirm-title" aria-describedby="collab-confirm-body">
  <div class="w-[min(420px,92vw)] rounded-lg bg-surface p-5 shadow-shell">
    <h2 id="collab-confirm-title" class="text-[15px] font-semibold"></h2>
    <p id="collab-confirm-body" class="mt-2 text-[13px] text-muted"></p>
    <div class="mt-4 flex justify-end gap-2"><button type="button" class="lbtn" data-confirm-cancel>Cancel</button><button type="button" class="lbtn pri" data-confirm-ok></button></div>
  </div>
</div>
```
- [ ] **Step 3: `panel.js`** — behaviors: `open()` fills header, calls `body(bodyEl)` and `related(relatedEl)` (when `ref` exists), adds `.open` to panel + scrim, `trapFocus(panel)`; submit → `onSave(bodyEl)`; returns `false` keeps panel open (validation), `true` closes; Cancel/✕/Esc/scrim → if `isDirty()` then `confirm({title:'Discard changes?', confirmLabel:'Discard'})`; close → `releaseFocus()`. Menu: `role=menuitem` buttons, toggles `aria-expanded`, Esc closes menu first. `refreshRelated()` re-renders the related section (called by related-items after link/unlink). Escape handled by a `keydown` listener scoped to the panel (stop propagation so the shell keyboard handler doesn't also act).
- [ ] **Step 4: `related-items.js`** —
  - `render(container, ref)`: `store.getRelatedItems(ref.type, ref.id)` sorted by `TYPE_META` order then title; heading `Related items (n)`; rows are `<div data-related-row>` with a main `<button>` (icon + `<span class="badge">Type</span>` + title `dir=auto` + meta) → `openItem(row.ref)`, and `ibtn` `aria-label="Remove link to <title>"` → `store.unlink` + toast `Link removed` + re-render. Null entity → muted row: `Unavailable item` + `(deleted <type label>)` + remove button `aria-label="Remove link to unavailable item"`. Empty → `No related items yet.` Footer: `Link existing…` (`openPicker`) and `Create related` menu with `Note`, `Activity`, `Event`.
  - Picker: items = all entities of the selected type(s) excluding `ref` and already-linked; text match over `titleOf` + body/notes/description/subject; listbox options `role=option`, `aria-label` = `"<Type> <title>"`, ↑/↓ moves `aria-activedescendant`, Enter/click → `store.link` + toast `Linked to <title>` + remove option + call `onLinked()` callback (panel refresh). `Done`/Esc closes, `releaseFocus()`.
  - `createRelated(type, sourceRef)`: defaults — note `{title:'Untitled note', body:'', status:'draft', tags:[], pinned:false}`; activity `{kind:'todo', summary:'Follow up', notes:'', assigneeId:CURRENT_USER_ID, status:'planned', priority:'normal', archived:false}`; event `{title:'New event', allDay:false, start: nextHalfHour(now), end: addMinutes(nextHalfHour(now), 60), location:'', participantIds:[CURRENT_USER_ID], reminder:'none', repeat:'none', description:''}` → `createEntity`, `link(source, created)`, toast `Created and linked`, `openItem({type, id})`.
- [ ] **Step 5: Wire in `main.js`**: `const collabPanel = createCollabPanel({trapFocus, releaseFocus})`; `const relatedItems = createRelatedItems({store: collabStore, users: COLLAB_USERS, toast, trapFocus, releaseFocus, openItem: ref => openCollabItem(ref)})` where

```js
const COLLAB_VIEW_BY_TYPE = {note: 'notes', activity: 'activities', event: 'events', person: 'people', mail: 'email'}
const openCollabItem = ref => {
  collabPanel.close({force: true})
  const view = COLLAB_VIEW_BY_TYPE[ref.type]
  const label = NAV_ITEM_LABEL_BY_ID[view]
  if (label) sidebar.applyNavCurrent(document.querySelector('.side'), label)
  showContentView(view, ref.type === 'mail' ? {messageId: ref.id} : {openId: ref.id})
}
```
  Note: `navigate()` to the *same* page id still calls `activate(data)` (navigation.js doesn't short-circuit), so opening a related item of the same type works.
- [ ] **Step 6: Commit** after Task 5 makes the tests runnable: `feat: shared collaboration panel and related items`.

---

### Task 5: Kanban component + Notes screen

**Files:** Create `concepts/app/components/collab/kanban.js`; fill `concepts/app/pages/notes/notes.js`. Test: `tests/collaboration.spec.mjs`.

**Interfaces:**
- `renderBoard(container, {columns:[{id, label, items, collapsed, quickAdd}], renderCard(item) → HTMLElement, onMove(itemId, columnId), onQuickAdd(columnId, title), onToggleColumn(columnId)})`. Card elements must carry `data-card-id`; each card gets a `Move to…` `<select aria-label="Move <title> to">` (keyboard alternative to drag) rendered by the board.
- Notes page state: `{view: 'kanban'|'list', query, tag, pinnedOnly, showArchived, sort: 'updated'|'title', archivedOpen:false}` kept in closure.
- Shared toolbar helper in `components/collab/fields.js`: `viewSwitch(views:[[id,label]], current)` → segmented buttons with `aria-pressed`, `searchBox(id, placeholder, value)`.

- [ ] **Step 1: Tests**:

```js
test('notes expose exactly Kanban and List', async ({page}) => {
  await go(page, '/help-screens/notes')
  const views = page.locator('.notes-view [data-view-switch] button')
  await expect(views).toHaveText(['Kanban', 'List'])
  await expect(page.locator('.notes-view [data-column]')).toHaveCount(3)
  await expect(page.locator('.notes-view [data-column="archived"]')).toHaveAttribute('data-collapsed', 'true')
  await views.nth(1).click()
  await expect(page.locator('.notes-view table')).toBeVisible()
  await expect(page.locator('.notes-view table')).not.toContainText('Old pricing assumptions')
})

test('quick add creates a draft note with only a title', async ({page}) => {
  await go(page, '/help-screens/notes')
  await page.locator('[data-column="draft"] [data-quick-add]').fill('Call back Sara')
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-column="draft"]')).toContainText('Call back Sara')
})

test('move to… changes status only', async ({page}) => {
  await go(page, '/help-screens/notes')
  await page.getByLabel('Move Month-end checklist to').selectOption('active')
  await expect(page.locator('[data-column="active"]')).toContainText('Month-end checklist')
})

test('search and view survive navigation', async ({page}) => {
  await go(page, '/help-screens/notes')
  await page.locator('.notes-view [data-view-switch] button', {hasText: 'List'}).click()
  await page.locator('.notes-view input[type=search]').fill('warehouse')
  await page.locator('.nc1-item[data-label="Events"]').first().click()
  await page.locator('.nc1-item[data-label="Notes"]').first().click()
  await expect(page.locator('.notes-view input[type=search]')).toHaveValue('warehouse')
  await expect(page.locator('.notes-view table tbody tr')).toHaveCount(1)
})
```
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `kanban.js` (HTML5 drag: `draggable=true`, `dragstart` sets `text/plain` id, column `dragover` preventDefault + `.drop-target` class, `drop` → `onMove`; collapsed column renders header with count + `Show`/`Hide` toggle button `aria-expanded`; quick add = `<input data-quick-add placeholder="+ Add note">` Enter → `onQuickAdd`). Implement Notes per spec §6.1: toolbar (search, Tag select from all tags, Pinned only checkbox, view switch; List adds Sort select + Show archived), card (pin icon with sr-only "Pinned", title `dir=auto`, excerpt, tags, `n related`, relative updated), list table (`<button>` title cell opens panel), editor body (Title* `#note-title`, Body, Status, Tags comma input, Pinned checkbox; validation "Title is required"), menu (`Archive`/`Restore`, `Delete` with confirm), `activate({openId})` opens the note. Subscribe to store → re-render when visible.
- [ ] **Step 4: Run** Task 4 + Task 5 tests → PASS. **Step 5: Commit** `feat: notes kanban and list with related items`.

---

### Task 6: Calendar component + Events screen

**Files:** Create `concepts/app/components/collab/calendar.js`; fill `concepts/app/pages/events/events.js`.

**Interfaces:** `renderCalendar(container, {mode, date, today, nowKey, items:[{ref, title, start, end, allDay, label}], onSlot({date, time}), onOpen(ref), onMore(dateKey)})`; `calendarRange(mode, date) → {from, to}`; `calendarTitle(mode, date) → string`. Toolbar helper `calendarToolbar({mode, date, modes})` in `calendar.js` renders `‹ › Today title [modes]`.

- [ ] **Step 1: Tests**:

```js
test('events expose calendar only with Day/Week/Month', async ({page}) => {
  await go(page, '/help-screens/events')
  await expect(page.locator('.events-view [data-view-switch]')).toHaveCount(0)
  await expect(page.locator('.events-view [data-cal-mode]')).toHaveText(['Day', 'Week', 'Month'])
  await expect(page.locator('.events-view [data-cal-title]')).toHaveText('October 2026')
  await expect(page.locator('.events-view [data-cal-item]', {hasText: 'Monthly sales review'})).toBeVisible()
  await page.locator('.events-view [data-cal-mode]', {hasText: 'Week'}).click()
  await expect(page.locator('.events-view [data-allday-row]')).toBeVisible()
  await expect(page.locator('.events-view [data-timed] [data-cal-item]', {hasText: 'Supplier visit'})).toBeVisible()
})

test('create timed and all-day events', async ({page}) => {
  await go(page, '/help-screens/events')
  await page.getByRole('button', {name: 'New event'}).click()
  await page.locator('#event-title').fill('Budget sync')
  await expect(page.locator('#event-start')).toHaveValue('2026-10-13T13:30')
  await expect(page.locator('#event-end')).toHaveValue('2026-10-13T14:30')
  await page.locator('#collab-panel').getByRole('button', {name: 'Save'}).click()
  await page.locator('.events-view [data-cal-mode]', {hasText: 'Day'}).click()
  await expect(page.locator('.events-view [data-timed] [data-cal-item]', {hasText: 'Budget sync'})).toBeVisible()
  await page.getByRole('button', {name: 'New event'}).click()
  await page.locator('#event-title').fill('Offsite')
  await page.locator('#event-allday').check()
  await page.locator('#collab-panel').getByRole('button', {name: 'Save'}).click()
  await expect(page.locator('.events-view [data-allday-row] [data-cal-item]', {hasText: 'Offsite'})).toBeVisible()
})

test('end before start is rejected', async ({page}) => {
  await go(page, '/help-screens/events')
  await page.getByRole('button', {name: 'New event'}).click()
  await page.locator('#event-title').fill('Bad')
  await page.locator('#event-end').fill('2026-10-13T09:00')
  await page.locator('#collab-panel').getByRole('button', {name: 'Save'}).click()
  await expect(page.locator('#collab-panel')).toContainText('End must be after start')
})

test('notes never appear on calendars even when linked to an event', async ({page}) => {
  await go(page, '/help-screens/events')
  await expect(page.locator('.events-view [data-cal-item]', {hasText: 'ملاحظات اجتماع المبيعات'})).toHaveCount(0)
})
```
- [ ] **Step 2: Implement calendar** per spec §5.4 using `collab-dates.js`: month grid 6×7 (`role=grid`, day headers Sun–Sat, `data-date`, today `aria-current="date"`), max 3 `[data-cal-item]` buttons per day then `+n more` → `onMore` (switches to Day). Week/Day: `[data-allday-row]` then `[data-timed]` scroll container 24×48px rows, scrolled to 07:00 on render; items absolutely positioned (`top = minutes*0.8px`, `height = max(duration, 30)*0.8`), overlapping items split width by column index; now line when today is visible. Empty cell/slot `<button>` with `aria-label="New at <date> <time>"` → `onSlot`. Item label: `"<label>: <title>, <time or All day>"`.
- [ ] **Step 3: Events page** per spec §6.3: state `{mode: 'month', date: today}`; items from `store.eventsInRange(range)`; editor fields `#event-title*`, `#event-allday`, `#event-start`/`#event-end` (`datetime-local` or `date`, switching type on toggle and converting values), `#event-location`, participants (checkbox list of `COLLAB_USERS`, labeled "Participants"), `#event-reminder` with hint "Prototype: no notification is sent", `#event-repeat` with hint "Only the first occurrence is shown in this prototype", `#event-description`; validation title required + end ≥ start (all-day: end date ≥ start date). Slot click prefills start (timed: slot time; month: `09:00`) and end +60. Menu: Delete (confirm). Linked activities appear only in Related Items.
- [ ] **Step 4: Run** tests → PASS. **Step 5: Commit** `feat: events calendar with day, week and month`.

---

### Task 7: Activities screen

**Files:** fill `concepts/app/pages/activities/activities.js`.

**Interfaces:** Consumes `renderBoard`, `renderCalendar`, `calendarToolbar`, `relatedItems`, `isOverdue`, `ACTIVITY_KINDS`. Produces `createActivities({..., composeMailFor(activityRef), openItem})` — `composeMailFor` is injected by main.js and implemented by the email page (Task 8): `email.composeLinked(ref)`.

- [ ] **Step 1: Tests**:

```js
test('activities expose exactly Kanban and Calendar', async ({page}) => {
  await go(page, '/help-screens/activities')
  await expect(page.locator('.activities-view [data-view-switch] button')).toHaveText(['Kanban', 'Calendar'])
  await expect(page.locator('.activities-view [data-column]')).toHaveCount(3)
})

test('overdue is shown with text, not color only', async ({page}) => {
  await go(page, '/help-screens/activities')
  await expect(page.locator('[data-card-id="act-2"]')).toContainText('Overdue')
})

test('unscheduled activities stay off the calendar', async ({page}) => {
  await go(page, '/help-screens/activities')
  await page.locator('.activities-view [data-view-switch] button', {hasText: 'Calendar'}).click()
  const cal = page.locator('.activities-view')
  await expect(cal.locator('[data-cal-item]', {hasText: 'Call Al Noor about quotation 884'})).toBeVisible()
  await expect(cal.locator('[data-cal-item]', {hasText: 'Send revised price list'})).toHaveCount(0)
  await expect(cal.locator('[data-cal-item]', {hasText: 'Confirm stock counts'})).toHaveCount(0)
  await expect(cal.locator('[data-unscheduled-notice]')).toContainText('unscheduled')
})

test('clearing the scheduled time removes it from the calendar', async ({page}) => {
  await go(page, '/help-screens/activities')
  await page.locator('[data-card-id="act-1"] [data-card-open]').click()
  await page.locator('#activity-schedule-clear').click()
  await page.locator('#collab-panel').getByRole('button', {name: 'Save'}).click()
  await page.locator('.activities-view [data-view-switch] button', {hasText: 'Calendar'}).click()
  await expect(page.locator('.activities-view [data-cal-item]', {hasText: 'Call Al Noor'})).toHaveCount(0)
})

test('meeting creates one linked event, never two', async ({page}) => {
  await go(page, '/help-screens/activities')
  await page.locator('[data-card-id="act-1"] [data-card-open]').click()
  await page.locator('#activity-kind').selectOption('meeting')
  await page.locator('#collab-panel').getByRole('button', {name: 'Save'}).click()
  await page.locator('[data-card-id="act-1"] [data-card-open]').click()
  await page.getByRole('button', {name: 'Create event'}).click()
  await expect(page.locator('.events-view')).toBeVisible()
  await go(page, '/help-screens/activities')
  await page.locator('[data-card-id="act-1"] [data-card-open]').click()
  await expect(page.getByRole('button', {name: 'Create event'})).toHaveCount(0)
  await expect(page.getByRole('button', {name: 'Open linked event'})).toBeVisible()
})

test('mark done offers a linked follow-up', async ({page}) => {
  await go(page, '/help-screens/activities')
  await page.locator('[data-card-id="act-6"] [data-card-open]').click()
  await page.getByRole('button', {name: 'Mark done'}).click()
  await page.getByRole('button', {name: 'Schedule follow-up'}).click()
  await expect(page.locator('#collab-panel [data-related-row]', {hasText: 'Review password policy'})).toBeVisible()
})
```
- [ ] **Step 2: Implement** per spec §6.2: toolbar (search, Assignee select All/Me/users, Kind select, Overdue only, Show cancelled & archived, view switch). Card: `[data-card-open]` button with kind icon + label, summary, assignee name, `High` badge, due/scheduled chips (`Overdue · <date>` uses `i-warn` + text). Editor: `#activity-kind`, `#activity-summary*`, `#activity-assignee`, `#activity-status`, `#activity-priority`, `#activity-due` (date) + `+1 day`/`+1 week` buttons (disabled without a due date), disclosure "Schedule a time" containing `#activity-start` (datetime-local) + `#activity-duration` select + `#activity-schedule-clear` ("Remove scheduled time"), `#activity-notes`. Kind actions row inside the body: `Mark done` (status open only), `Compose email` (kind email → `composeMailFor(ref)`), meeting: if related event exists → `Open linked event`, else `Create event` (disabled with reason "Schedule a time first" when no `scheduledStart`) + `Link existing event…` (`relatedItems.openPicker(ref, {types: ['event']})`). Create event: `createEntity('event', {title: summary, allDay:false, start: scheduledStart, end: addMinutes(scheduledStart, durationMin || 60), participantIds:[assigneeId], location:'', reminder:'none', repeat:'none', description:''})`, `link`, toast, `openItem(eventRef)`. Mark done: `updateEntity(status:'done')`, toast with `action: 'Schedule follow-up'`, `onAction` creates `{kind:'todo', summary:'Follow up: '+summary, ...}`, links to the done activity, opens it — the button also appears inline in the panel after marking done so the test (and keyboard users) don't depend on the toast timing. Calendar view: `store.scheduledActivitiesInRange`, notice `[data-unscheduled-notice]` "`n` unscheduled activities aren't shown here — they stay in Kanban." with button `Show Kanban`; slot → new activity with `scheduledStart` = slot.
- [ ] **Step 3: Run** → PASS. **Step 4: Commit** `feat: activities kanban and calendar`.

---

### Task 8: Internal Mail rework + notifications source

**Files:** Rewrite `concepts/app/pages/email/email.js` + `templates.html`; modify `concepts/app/components/notifications/notifications.js` (inject `getInboxMail()`, `markMailRead(id)`), `concepts/app/main.js` (pass deps; `composeMailFor`).

**Interfaces:** `createEmail({root, store, users, currentUser, toast, relatedItems, onUnreadChange, navigate, openItem, confirm})` → existing `{id, roots, activate({messageId}), deactivate, dispose, openEmailView, closeEmailView}` **plus** `composeLinked(ref)`. Keep class names `.email-view`, `.email-compose`, `.email-send`, `.email-composer-input`, `#email-compose-to`, `#email-search-input`, `.email-list-row`, `.email-reading-scroll` (existing tests rely on them). `#email-compose-to` becomes the recipient chip input (typing an address + Enter/`,` adds a chip; on Send any leftover text is added as a chip).

- [ ] **Step 1: Tests**:

```js
test.describe('internal mail', () => {
  test('folders exist and show the right messages', async ({page}) => {
    await go(page, '/system/email')
    const folders = page.locator('.email-view [data-folder]')
    await expect(folders).toHaveText([/Inbox/, /Starred/, /Sent/, /Drafts/, /Archive/, /Trash/])
    await folders.filter({hasText: 'Sent'}).click()
    await expect(page.locator('.email-list-row')).toContainText(['Re: Stock check needed'])
  })

  test('draft survives navigation and reload, send moves it to Sent', async ({page}) => {
    await go(page, '/system/email')
    await page.locator('.email-compose').click()
    await page.locator('#email-compose-to').fill('Mariam')
    await page.getByRole('option', {name: /Mariam Adel/}).click()
    await page.locator('#email-compose-subject').fill('Quarter close plan')
    await page.locator('.email-composer-input').fill('Draft body text')
    await go(page, '/help-screens/notes')
    await page.reload()
    await go(page, '/system/email')
    await page.locator('.email-view [data-folder="drafts"]').click()
    await page.locator('.email-list-row', {hasText: 'Quarter close plan'}).click()
    await expect(page.locator('.email-composer-input')).toHaveValue('Draft body text')
    await page.locator('.email-send').click()
    await expect(page.getByText(/nothing is delivered/)).toBeVisible()
    await page.locator('.email-view [data-folder="sent"]').click()
    await expect(page.locator('.email-list-row', {hasText: 'Quarter close plan'})).toBeVisible()
  })

  test('create activity from a message preserves the relationship', async ({page}) => {
    await go(page, '/system/email')
    await page.locator('.email-list-row', {hasText: 'Payment scheduled'}).click()
    await page.getByRole('button', {name: 'Create activity'}).click()
    await expect(page.locator('.activities-view')).toBeVisible()
    await expect(page.locator('#collab-panel [data-related-row]', {hasText: 'Payment scheduled for Sales Invoice 126'})).toBeVisible()
    await page.locator('#collab-panel [data-related-row]', {hasText: 'Payment scheduled'}).locator('button').first().click()
    await expect(page.locator('.email-view [data-related-row]', {hasText: 'Follow up: Payment scheduled'})).toBeVisible()
  })

  test('delete moves to trash and archive moves to archive', async ({page}) => {
    await go(page, '/system/email')
    await page.locator('.email-list-row', {hasText: 'password expires'}).click()
    await page.getByRole('button', {name: 'Delete'}).click()
    await page.locator('.email-view [data-folder="trash"]').click()
    await expect(page.locator('.email-list-row', {hasText: 'password expires'})).toBeVisible()
  })

  test('search filters within the folder', async ({page}) => {
    await go(page, '/system/email')
    await page.locator('#email-search-input').fill('quotation')
    await expect(page.locator('.email-list-row')).toHaveCount(1)
  })
})
```
- [ ] **Step 2: Implement** per spec §6.4. Layout: `.email-app` grid `[folder rail 180px | list 300px | pane 1fr]`, rail collapses to `<select data-folder-select>` under 1100px (container width via Tailwind `max-[1100px]:` utilities), single column under 720px with `Back to list` button. Folder buttons `data-folder=<id>` with count spans. Reading pane: thread messages for the selected message's `threadId` (only messages not in trash unless viewing trash), toolbar buttons with visible text labels (Reply, Forward, Archive/Move to Inbox, Delete/Delete permanently, Mark unread, Star/Unstar, Create activity), then `relatedItems.render(el, ref)`. Compose pane: To/Cc chip inputs with `role=combobox` + listbox suggestions from users (name match) plus free emails validated by `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`; `#email-compose-subject`; `.email-composer-input`; related section; buttons Send / Save draft / Discard. Draft lifecycle: entity created on first input (`folder:'drafts', from: current user, savedAt`), debounced 600 ms autosave, flush on `deactivate()` and on switching folder/message; "Draft saved HH:mm" status (`aria-live=polite`). Send validation: ≥1 recipient, subject or body; then `updateEntity(folder:'sent', sentAt: now(), unread:false)`, toast `Message sent` + body "Prototype only — nothing is delivered.". Reply/Forward create a new draft with `threadId` and `Re:`/`Fwd:` subject and quoted body; reply links nothing automatically (relationship of the thread lives on the original). Create activity: `createEntity('activity', {kind:'todo', summary:'Follow up: '+subject, assigneeId: CURRENT_USER_ID, status:'planned', priority:'normal', archived:false, notes:''})`, `link(mailRef, activityRef)`, `openItem(activityRef)`. `composeLinked(ref)`: navigate to email, open compose with a new draft already linked to `ref`. `selectEmail` marks read via `store.updateEntity` and calls `onUnreadChange()`.
- [ ] **Step 3: Notifications** — replace `EMAIL_DATA` reads with injected `getInboxMail()` returning `store.listEntities('mail', m => m.folder === 'inbox')` mapped to `{id, from: m.from.name, subject, unread, time: formatTime(m.sentAt), hue}` (the shape the popover already renders); badge count uses the same getter.
- [ ] **Step 4: Run** mail tests + existing `tests/messaging.spec.mjs` (expect only the `email-reading.png` pixel diff to fail; `email compose retains send feedback` must still pass — it fills `#email-compose-to` with an email and sends with a body; the send handler converts leftover text to a chip). **Step 5: Commit** `feat: internal mail folders, drafts, actions and related items`.

---

### Task 9: People Data screen

**Files:** fill `concepts/app/pages/people/people.js`.

**Interfaces:** `findDuplicates(person, people) → [{person, field}]` exported from `people.js`? No — pages can't be imported by tests cheaply in Node without DOM; export it from `components/collab/meta.js` as `findPersonDuplicates(candidate, people)` (pure) and unit test it in `tests/collab-store.test.mjs`.

- [ ] **Step 1: Unit test** (append to `tests/collab-store.test.mjs`):

```js
import {findPersonDuplicates} from '../concepts/app/components/collab/meta.js'
test('person duplicates match normalized phone, email, or name', () => {
  const people = [
    {id: 'per-1', nameEn: 'Ahmed Ali', contacts: [{kind: 'mobile', value: '+20 100 555 0101'}]},
    {id: 'per-2', nameEn: 'Sara', contacts: [{kind: 'email', value: 'Sara.M@example.com'}]},
  ]
  assert.deepEqual(findPersonDuplicates({id: 'new', nameEn: 'X', contacts: [{kind: 'mobile', value: '0020-100-555-0101'}]}, people).map(d => [d.person.id, d.field]), [['per-1', 'mobile']])
  assert.deepEqual(findPersonDuplicates({id: 'new', nameEn: 'x', contacts: [{kind: 'email', value: 'sara.m@EXAMPLE.com'}]}, people).map(d => d.field), ['email'])
  assert.deepEqual(findPersonDuplicates({id: 'new', nameEn: ' ahmed ali ', contacts: []}, people).map(d => d.field), ['name'])
  assert.deepEqual(findPersonDuplicates({id: 'per-1', nameEn: 'Ahmed Ali', contacts: []}, people), [])
})
```
  Phone normalization: strip non-digits, then strip leading `00`, compare last 10 digits.
- [ ] **Step 2: Browser tests**:

```js
test('people: duplicate warning and simulated conversion leave Customers untouched', async ({page}) => {
  await go(page, '/customers/list')
  const customerRows = await page.locator('.customer-list-view [data-list-open-record]').count()
  await go(page, '/help-screens/people-data')
  await page.getByRole('button', {name: 'New person'}).click()
  await page.locator('#person-name-en').fill('New Contact')
  await page.locator('[data-contact-value]').first().fill('+20 122 555 0199')
  await expect(page.locator('#collab-panel [data-duplicate]')).toContainText('Sara Mahmoud')
  await page.locator('#collab-panel').getByRole('button', {name: 'Save'}).click()
  await page.getByRole('button', {name: /Sara Mahmoud/}).click()
  await page.locator('#collab-panel').getByRole('button', {name: 'More actions'}).click()
  await page.getByRole('menuitem', {name: 'Convert to Customer'}).click()
  await expect(page.locator('#collab-confirm')).toContainText('No Customer')
  await page.locator('#collab-confirm').getByRole('button', {name: 'Convert'}).click()
  await expect(page.locator('.people-view')).toContainText('Converted to Customer')
  await go(page, '/customers/list')
  await expect(page.locator('.customer-list-view [data-list-open-record]')).toHaveCount(customerRows)
})
```
- [ ] **Step 3: Implement** per spec §6.5: list table (Name with EN + AR `dir=auto` as a `<button>`, Company, Primary mobile, Primary email, Lifecycle badge, Converted badge), search + Lifecycle filter + Show archived; editor sections Identity (`#person-name-en*`, `#person-name-ar`, job title, company), Contact (repeatable rows: kind select, `[data-contact-value]` input, primary radio, remove; `Add contact`; validation per kind), Address `<details>` (country, city), Notes; live duplicate check on input (`[data-duplicate]` warning with `Open` button); menu: Convert to Customer/Supplier/Employee/User (confirm with prototype statement → `updateEntity({convertedTo:{target, at: now()}})`; replace confirmation when already converted), Archive/Restore, Delete.
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** `feat: people data list, duplicates and simulated conversion`.

---

### Task 10: i18n, RTL, budget, regression, snapshots

**Files:** `concepts/app/core/locale.js` (AR entries), `tests/tailwind.test.mjs` + `docs/tailwind-migration-report.md` (if over budget), snapshot files (only after approval).

- [ ] **Step 1: AR dictionary** — add: `Notes: 'الملاحظات'`, `Activities: 'الأنشطة'`, `Events: 'الأحداث'`, `'People Data': 'بيانات الأشخاص'`, `'Internal Mail': 'البريد الداخلي'`, `'New note': 'ملاحظة جديدة'`, `'New activity': 'نشاط جديد'`, `'New event': 'حدث جديد'`, `'New person': 'شخص جديد'`, `Kanban: 'كانبان'`, `List: 'قائمة'`, `Calendar: 'التقويم'`, `Day: 'يوم'`, `Week: 'أسبوع'`, `Month: 'شهر'`, `Today: 'اليوم'`, `'Related items': 'العناصر المرتبطة'` (only keys that don't already exist — check with grep first).
- [ ] **Step 2: RTL smoke test**:

```js
test('collaboration screens mirror in RTL', async ({page}) => {
  await go(page, '/help-screens/notes')
  await page.locator('#rtl').evaluate(el => { el.checked = true; el.dispatchEvent(new Event('change', {bubbles: true})) })
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('.notes-view h1')).toHaveText('الملاحظات')
})
```
- [ ] **Step 3: Full checks**: `npm run test:unit`; `npm run build`; with `npm run dev` running: `npx playwright test` (all 7 projects). Expected failures to triage: only `email-reading.png` (messaging) and parity `email.png`. If Tailwind budget fails, record the measured size, add a dated addendum to `docs/tailwind-migration-report.md` naming the collaboration screens, and raise `FINAL_TAILWIND_BASELINE_BYTES` with a comment line like the existing ones.
- [ ] **Step 4: Approval checkpoint** — capture `output/collab-email-desktop.png` via Playwright and show the user. Only after approval: `npx playwright test tests/messaging.spec.mjs tests/parity.spec.mjs -g email --update-snapshots`, then rerun the full suite.
- [ ] **Step 5: Commit** `test: collaboration suite regression and email snapshot refresh`.
