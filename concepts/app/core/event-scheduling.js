// Calendar arithmetic stays in the event's timezone. All-day dates never
// pass through UTC; timed values are converted only at display boundaries.
export const DEFAULT_EVENT_ZONE = 'Africa/Cairo'
const MINUTE = 60000
const DAY = 86400000
const formatters = new Map()

export function localTime(epoch, zone = DEFAULT_EVENT_ZONE) {
  if (!formatters.has(zone)) formatters.set(zone, new Intl.DateTimeFormat('en-CA', {timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}))
  const parts = Object.fromEntries(formatters.get(zone).formatToParts(new Date(epoch)).map(part => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

// Enumerate nearby offsets, then round-trip. Nonexistent and ambiguous DST
// wall times return null instead of being silently shifted to another time.
export function eventInstant(value, zone = DEFAULT_EVENT_ZONE) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value || '')) return null
  const wall = Date.parse(value + ':00Z')
  if (!Number.isFinite(wall)) return null
  const offsets = new Set()
  try {
    for (const delta of [-36, -12, 0, 12, 36]) {
      const sample = wall + delta * 60 * MINUTE
      offsets.add(Date.parse(localTime(sample, zone) + ':00Z') - sample)
    }
    const matches = [...offsets].map(offset => wall - offset).filter(epoch => localTime(epoch, zone) === value)
    return matches.length === 1 ? matches[0] : null
  } catch { return null }
}

export function shiftWall(value, days) {
  return new Date(Date.parse(value.slice(0, 10) + 'T00:00:00Z') + days * DAY).toISOString().slice(0, 10) + value.slice(10)
}

function occurrenceStart(event, index) {
  if (event.repeat === 'monthly') {
    const [year, month, day] = event.start.slice(0, 10).split('-').map(Number)
    const first = new Date(Date.UTC(year, month - 1 + index, 1))
    const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
    first.setUTCDate(Math.min(day, last))
    return first.toISOString().slice(0, 10) + event.start.slice(10)
  }
  return shiftWall(event.start, index * (event.repeat === 'weekly' ? 7 : 1))
}

export function expandEvents(events, from, to, displayZone = DEFAULT_EVENT_ZONE) {
  const expanded = []
  for (const event of events) {
    const repeat = ['daily', 'weekly', 'monthly'].includes(event.repeat)
    const duration = Date.parse(event.end + (event.allDay ? 'T00:00:00Z' : ':00Z')) - Date.parse(event.start + (event.allDay ? 'T00:00:00Z' : ':00Z'))
    if (!Number.isFinite(duration) || duration < 0) continue
    const daySpan = Math.max(0, Math.ceil(duration / DAY))
    const distance = Math.floor((Date.parse(from + 'T00:00:00Z') - Date.parse(event.start.slice(0, 10) + 'T00:00:00Z')) / DAY)
    const index = !repeat ? 0 : event.repeat === 'monthly' ? Math.max(0, Math.floor((distance - daySpan - 2) / 31) - 1) : Math.max(0, Math.floor((distance - daySpan - 2) / (event.repeat === 'weekly' ? 7 : 1)))
    const seen = new Set()
    const add = (start, key) => {
      seen.add(key)
      const override = event.exceptions?.[key]
      if (override?.cancelled) return
      const end = new Date(Date.parse(start + (event.allDay ? 'T00:00:00Z' : ':00Z')) + duration).toISOString().slice(0, event.allDay ? 10 : 16)
      const item = {...event, start, end, ...override, seriesId: event.id, occurrenceKey: key, id: repeat ? `${event.id}@${key}` : event.id}
      if (!item.allDay) {
        const startAt = eventInstant(item.start, item.timeZone)
        const endAt = eventInstant(item.end, item.timeZone)
        if (startAt === null || endAt === null) item.invalidTime = true
        item.startAt = startAt
        item.endAt = endAt
        if (!item.invalidTime) {
          item.start = localTime(startAt, displayZone)
          item.end = localTime(endAt, displayZone)
        }
      }
      if (item.start.slice(0, 10) <= to && item.end.slice(0, 10) >= from) expanded.push(item)
    }
    for (let n = index; n < index + 2000; n++) {
      const start = n === 0 ? event.start : occurrenceStart(event, n)
      const key = start.slice(0, 10)
      if (repeat && (key > shiftWall(to, 2) || (event.repeatUntil && key > event.repeatUntil))) break
      add(start, key)
      if (!repeat) break
    }
    // An edited occurrence can move far outside its original date range.
    // Include that override when viewing its new date, without duplicating
    // occurrences already visited above or reviving truncated future work.
    if (repeat) for (const [key, override] of Object.entries(event.exceptions || {})) {
      if (!seen.has(key) && !override.cancelled && (!event.repeatUntil || key <= event.repeatUntil)) add(key + event.start.slice(10), key)
    }
  }
  return expanded
}

export function eventsConflict(a, b) {
  const sharedPerson = (a.participantIds || []).some(id => (b.participantIds || []).includes(id))
  const sharedResource = (a.resourceIds || []).some(id => (b.resourceIds || []).includes(id))
  if (!sharedPerson && !sharedResource) return false
  const bounds = item => item.allDay
    ? [eventInstant(item.start.slice(0, 10) + 'T00:00', item.timeZone), eventInstant(shiftWall(item.end.slice(0, 10), 1) + 'T00:00', item.timeZone)]
    : [item.startAt ?? eventInstant(item.start, item.timeZone), item.endAt ?? eventInstant(item.end, item.timeZone)]
  const [aStart, aEnd] = bounds(a), [bStart, bEnd] = bounds(b)
  return aStart !== null && aEnd !== null && bStart !== null && bEnd !== null && aStart < bEnd && bStart < aEnd
}

export function dueReminders(events, userId, now, read = []) {
  const epoch = Date.parse(now)
  const date = localTime(epoch, DEFAULT_EVENT_ZONE).slice(0, 10)
  const delays = {'10m': 10, '1h': 60, '1d': 1440}
  return expandEvents(events, shiftWall(date, -1), shiftWall(date, 2)).map(event => event.allDay ? {...event, startAt: eventInstant(event.start + 'T09:00', event.timeZone), endAt: eventInstant(shiftWall(event.end, 1) + 'T00:00', event.timeZone)} : event).filter(event =>
    !event.invalidTime && delays[event.reminder] && event.participantIds?.includes(userId) &&
    event.startAt - delays[event.reminder] * MINUTE <= epoch && event.endAt > epoch
  ).map(event => ({...event, reminderId: `reminder:${event.id}:${event.reminder}`, unread: !read.includes(`reminder:${event.id}:${event.reminder}`)}))
}
