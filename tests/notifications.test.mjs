import test from 'node:test'
import assert from 'node:assert/strict'
import {notificationItems, saveNotificationState} from '../concepts/app/components/notifications/state.js'
import {notificationActionButtons} from '../concepts/app/components/notifications/actions.js'

function withStorage(fn) {
  const data = new Map()
  globalThis.localStorage = {getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value)}
  globalThis.document = {dispatchEvent() {}}
  try { fn() } finally { delete globalThis.localStorage; delete globalThis.document }
}

test('notification state persists unread and starred without changing source fixtures', () => withStorage(() => {
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

test('notification controls expose accessible toggles', () => withStorage(() => {
  const html = notificationActionButtons({...notificationItems()[0], unread: false, pinned: true})
  assert.match(html, /aria-label="Mark as unread"/)
  assert.match(html, /aria-label="Unstar notification"/)
  assert.match(html, /aria-pressed="true"/)
}))
