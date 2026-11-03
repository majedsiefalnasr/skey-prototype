import test from 'node:test'
import assert from 'node:assert/strict'
import {notificationItems, saveNotificationState} from '../concepts/app/components/notifications/state.js'
import {notificationActionButtons} from '../concepts/app/components/notifications/actions.js'
import {DATA_LIST_CONFIG} from '../concepts/app/components/data-list/columns.js'
import {createListModel} from '../concepts/app/components/data-list/model.js'
import {renderDataListFieldChoices} from '../concepts/app/components/data-list/list.js'
import {memoryLayoutStorage} from './support/storage.mjs'

function withStorage(fn) {
  const data = new Map()
  globalThis.localStorage = {getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value)}
  globalThis.document = {dispatchEvent() {}}
  try { fn() } finally { delete globalThis.localStorage; delete globalThis.document }
}

test('notification state persists unread and pinned without changing source fixtures', () => withStorage(() => {
  const original = notificationItems()[0]
  assert.equal(original.unread, true)
  const saved = {...original, unread: false, pinned: true}
  saveNotificationState(saved)
  assert.deepEqual({unread: notificationItems()[0].unread, pinned: notificationItems()[0].pinned}, {unread: false, pinned: true})
  saved.unread = true
  saveNotificationState(saved)
  assert.equal(notificationItems()[0].unread, true)
  assert.equal(notificationItems()[0].pinned, true)
}))

test('notification controls expose only mark unread and pin actions', () => withStorage(() => {
  const html = notificationActionButtons({...notificationItems()[0], unread: false, pinned: true})
  assert.match(html, /aria-label="Mark as unread"/)
  assert.match(html, /aria-label="Unpin notification"/)
  assert.match(html, /aria-pressed="true"/)
}))

test('notification controls align to inline-end in every shared host', () => {
  for (const unread of [true, false]) {
    const html = notificationActionButtons({id: 'notice', unread})
    assert.match(html, /class="[^"]*\bflex\b[^"]*\bw-full\b[^"]*\bjustify-end\b/)
    assert.doesNotMatch(html, /justify-center/)
  }
})

test('notification filter choices follow visible fields and retain read quick filters', () => {
  const config = DATA_LIST_CONFIG.notifications
  assert.deepEqual(config.filterFields.map(field => field.key), ['what', 'source'])
  assert.deepEqual(config.filters.map(filter => filter.key), ['all', 'unread', 'read'])
  const html = renderDataListFieldChoices(config, {fieldFilters: []}, {
    t: value => value, encodeHtml: value => value, dataListIcon: () => '',
  })
  assert.match(html, /data-list-add-filter="what"/)
  assert.match(html, /data-list-add-filter="source"/)
  assert.doesNotMatch(html, /data-list-add-filter="(?:who|type)"/)
})

test('notification saved presets retain supported conditions without empty legacy presets', () => {
  const storage = memoryLayoutStorage()
  const presets = [
    {id: 'mixed', name: 'Sales alerts', fieldFilters: [{key: 'source', operator: 'equals', value: 'Sales'}, {key: 'type', operator: 'equals', value: 'Alert'}]},
    {id: 'legacy', name: 'Sender', fieldFilters: [{key: 'who', operator: 'contains', value: 'Admin'}]},
    {id: 'subject', name: 'Invoice', fieldFilters: [{key: 'what', operator: 'contains', value: 'Invoice'}]},
  ]
  storage.saveCustomFilters('notifications', presets)
  const model = createListModel({config: DATA_LIST_CONFIG.notifications, rows: [
    {id: 'sales', source: 'Sales', what: 'Invoice', unread: true},
    {id: 'hr', source: 'HR', what: 'Invoice', unread: false},
  ], storage, context: 'notifications'})
  assert.deepEqual(model.state.customFilters.map(preset => preset.id), ['mixed', 'subject'])
  assert.deepEqual(model.state.customFilters[0].fieldFilters, [presets[0].fieldFilters[0]])
  assert.deepEqual(storage.loadCustomFilters('notifications'), presets)
  model.state.fieldFilters = model.state.customFilters[0].fieldFilters
  assert.deepEqual(model.rowsInView().map(row => row.id), ['sales'])
  model.state.fieldFilters = []
  model.state.filter = 'read'
  assert.deepEqual(model.rowsInView().map(row => row.id), ['hr'])
  model.state.filter = 'unread'
  assert.deepEqual(model.rowsInView().map(row => row.id), ['sales'])
})

test('unread notifications hide mark-unread but retain pin controls', () => withStorage(() => {
  const html = notificationActionButtons({...notificationItems()[0], unread: true, pinned: false})
  assert.doesNotMatch(html, /aria-label="Mark as unread"/)
  assert.match(html, /aria-label="Pin notification"/)
  assert.doesNotMatch(html, /Mark as read/)
}))
