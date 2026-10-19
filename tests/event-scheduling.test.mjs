import test from 'node:test'
import assert from 'node:assert/strict'
import {eventInstant, localTime, expandEvents, eventsConflict, dueReminders} from '../concepts/app/core/event-scheduling.js'

const event = changes => ({id: 'event-1', title: 'Meeting', allDay: false, start: '2026-03-07T09:00', end: '2026-03-07T10:00', timeZone: 'America/New_York', repeat: 'daily', participantIds: ['one'], ...changes})

test('timezone conversion rejects ambiguous/nonexistent times and preserves wall times across DST', () => {
  assert.equal(eventInstant('2026-03-08T02:30', 'America/New_York'), null)
  assert.equal(eventInstant('2026-11-01T01:30', 'America/New_York'), null)
  const items = expandEvents([event()], '2026-03-07', '2026-03-09', 'UTC')
  assert.deepEqual(items.map(item => item.start), ['2026-03-07T14:00', '2026-03-08T13:00', '2026-03-09T13:00'])
  assert.equal(localTime(items[1].startAt, 'America/New_York'), '2026-03-08T09:00')
})

test('monthly recurrence clamps to month end without drifting in later months', () => {
  const items = expandEvents([event({start: '2026-01-31T09:00', end: '2026-01-31T10:00', repeat: 'monthly'})], '2026-01-01', '2026-03-31')
  assert.deepEqual(items.map(item => item.occurrenceKey), ['2026-01-31', '2026-02-28', '2026-03-31'])
})

test('recurrence end dates and exceptions preserve other occurrences', () => {
  const source = event({repeatUntil: '2026-03-10', exceptions: {'2026-03-08': {cancelled: true}, '2026-03-09': {title: 'Changed meeting'}}})
  const items = expandEvents([source], '2026-03-07', '2026-03-31')
  assert.deepEqual(items.map(item => item.occurrenceKey), ['2026-03-07', '2026-03-09', '2026-03-10'])
  assert.equal(items[1].title, 'Changed meeting')
  assert.equal(source.start, '2026-03-07T09:00')
})

test('all-day dates do not shift when the viewer timezone changes', () => {
  const source = event({allDay: true, start: '2026-03-07', end: '2026-03-08', repeat: 'none'})
  for (const zone of ['Pacific/Auckland', 'America/Los_Angeles']) {
    const item = expandEvents([source], '2026-03-01', '2026-03-31', zone)[0]
    assert.equal(item.start, source.start)
    assert.equal(item.end, source.end)
  }
})

test('a rescheduled occurrence stays discoverable outside its original date range', () => {
  const source = event({exceptions: {'2026-03-07': {start: '2026-06-20T09:00', end: '2026-06-20T10:00'}}})
  const items = expandEvents([source], '2026-06-20', '2026-06-20', 'America/New_York')
  assert.equal(items.filter(item => item.occurrenceKey === '2026-03-07').length, 1)
  assert.equal(expandEvents([source], '2026-03-07', '2026-03-07').length, 0)
})

test('conflicts require a shared participant or resource and do not include back-to-back events', () => {
  const a = event({repeat: 'none'})
  assert.equal(eventsConflict(a, {...a, participantIds: ['other']}), false)
  assert.equal(eventsConflict(a, {...a, id: 'two'}), true)
  assert.equal(eventsConflict(a, {...a, start: a.end, end: '2026-03-07T11:00'}), false)
  assert.equal(eventsConflict({...a, participantIds: [], resourceIds: ['room']}, {...a, participantIds: [], resourceIds: ['room']}), true)
})

test('reminders are scoped to participants, delivery window and persisted read IDs', () => {
  const source = event({repeat: 'none', reminder: '10m'})
  assert.equal(dueReminders([source], 'one', '2026-03-07T13:49:00Z').length, 0)
  const [reminder] = dueReminders([source], 'one', '2026-03-07T13:55:00Z')
  assert.equal(reminder.unread, true)
  assert.equal(dueReminders([source], 'other', '2026-03-07T13:55:00Z').length, 0)
  assert.equal(dueReminders([source], 'one', '2026-03-07T13:55:00Z', [reminder.reminderId])[0].unread, false)
  assert.equal(dueReminders([source], 'one', '2026-03-07T15:01:00Z').length, 0)
})
