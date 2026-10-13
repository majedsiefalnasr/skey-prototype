import test from 'node:test'
import assert from 'node:assert/strict'
import {COLLAB_SEED, PROTOTYPE_NOW} from '../concepts/app/prototype/fixtures/collaboration.js'
import {ENTITY_TYPES} from '../concepts/app/core/collab-store.js'
import {isValidDateTime} from '../concepts/app/core/collab-dates.js'

test('seed ids are unique and typed', () => {
  const ids = ENTITY_TYPES.flatMap(type =>
    COLLAB_SEED.entities[type].map(entity => {
      assert.equal(entity.type, type)
      return `${type}:${entity.id}`
    })
  )
  assert.equal(new Set(ids).size, ids.length)
})

test('seed links point at seeded entities', () => {
  const exists = ref => COLLAB_SEED.entities[ref.type].some(entity => entity.id === ref.id)
  for (const link of COLLAB_SEED.links) assert.ok(exists(link.a) && exists(link.b), link.id)
})

test('seed keeps mail ids e1-e5 and covers every folder and scheduling case', () => {
  const mail = COLLAB_SEED.entities.mail
  for (const id of ['e1', 'e2', 'e3', 'e4', 'e5']) assert.ok(mail.some(message => message.id === id), id)
  for (const folder of ['inbox', 'sent', 'drafts']) assert.ok(mail.some(message => message.folder === folder), folder)
  const activities = COLLAB_SEED.entities.activity
  assert.ok(activities.some(a => a.dueDate && !a.scheduledStart), 'due-only activity')
  assert.ok(activities.some(a => isValidDateTime(a.scheduledStart)), 'scheduled activity')
  const today = PROTOTYPE_NOW.slice(0, 10)
  assert.ok(activities.some(a => a.dueDate && a.dueDate < today && a.status !== 'done'), 'overdue activity')
})
