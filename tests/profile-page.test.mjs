import assert from 'node:assert/strict'
import test from 'node:test'
import {CURRENT_USER, LOGIN_LOG_ROWS, DEVICE_ROWS} from '../concepts/app/prototype/fixtures/profile.js'
import {PROFILE_SECTION_ORDER, PROFILE_SECTIONS} from '../concepts/app/pages/profile/fields.js'

test('profile fixtures have the expected shape', () => {
  assert.equal(typeof CURRENT_USER.name, 'string')
  assert.equal(typeof CURRENT_USER.email, 'string')
  assert.ok(CURRENT_USER.name.length > 0)

  assert.ok(LOGIN_LOG_ROWS.length >= 6 && LOGIN_LOG_ROWS.length <= 10)
  LOGIN_LOG_ROWS.forEach(row => {
    assert.equal(typeof row.id, 'string')
    assert.equal(typeof row.timestamp, 'string')
    assert.ok(['success', 'failed'].includes(row.status))
  })

  assert.ok(DEVICE_ROWS.length >= 3 && DEVICE_ROWS.length <= 5)
  const currentDevices = DEVICE_ROWS.filter(d => d.current === true)
  assert.equal(currentDevices.length, 1)
  DEVICE_ROWS.forEach(row => {
    assert.equal(typeof row.id, 'string')
    assert.equal(typeof row.name, 'string')
    assert.equal(typeof row.lastActive, 'string')
  })
})

test('profile section metadata covers all six sections in order', () => {
  assert.deepEqual(PROFILE_SECTION_ORDER, ['profile', 'account', 'appearance', 'security', 'sessions', 'notifications'])
  PROFILE_SECTION_ORDER.forEach(key => {
    assert.equal(typeof PROFILE_SECTIONS[key].title, 'string')
    assert.equal(typeof PROFILE_SECTIONS[key].icon, 'string')
  })
})
