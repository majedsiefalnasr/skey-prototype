// Pure local-time date helpers for the collaboration screens. Keys are
// strings ('YYYY-MM-DD' / 'YYYY-MM-DDTHH:mm') so stored data never carries
// a timezone; Date objects only exist inside these functions.
const pad = n => String(n).padStart(2, '0')
export const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function parseLocal(key) {
  const [datePart, timePart = '00:00'] = String(key).split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes] = timePart.split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes)
}
export const toDateKey = date =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
export const toDateTimeKey = date =>
  `${toDateKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`
export const isValidDateTime = value =>
  typeof value === 'string' && DATE_TIME_PATTERN.test(value) && !Number.isNaN(parseLocal(value).getTime())
export const isValidDate = value => typeof value === 'string' && DATE_PATTERN.test(value)

export function addDays(key, n) {
  const date = parseLocal(key)
  date.setDate(date.getDate() + n)
  return key.includes('T') ? toDateTimeKey(date) : toDateKey(date)
}
export function addMinutes(key, n) {
  const date = parseLocal(key)
  date.setMinutes(date.getMinutes() + n)
  return toDateTimeKey(date)
}
/** Weeks start on Sunday, matching the current product calendar. */
export function startOfWeek(key) {
  const date = parseLocal(key.slice(0, 10))
  date.setDate(date.getDate() - date.getDay())
  return toDateKey(date)
}
export function monthGridDays(key) {
  const start = startOfWeek(`${key.slice(0, 7)}-01`)
  return Array.from({length: 42}, (_, i) => addDays(start, i))
}
export const daysBetween = (a, b) =>
  Math.round((parseLocal(b.slice(0, 10)) - parseLocal(a.slice(0, 10))) / 86400000)
export function relativeDay(key, todayKey) {
  const diff = daysBetween(todayKey, key)
  if (diff === 0) return 'Today'
  if (diff === -1) return 'Yesterday'
  if (diff === 1) return 'Tomorrow'
  return null
}
export const formatDate = key =>
  parseLocal(key.slice(0, 10)).toLocaleDateString('en-GB', {weekday: 'short', day: 'numeric', month: 'short'})
export const formatMonthTitle = key =>
  parseLocal(key.slice(0, 10)).toLocaleDateString('en-GB', {month: 'long', year: 'numeric'})
export const formatTime = key => key.slice(11, 16)
export function nextHalfHour(key) {
  const date = parseLocal(key)
  const remainder = date.getMinutes() % 30
  if (remainder) date.setMinutes(date.getMinutes() + 30 - remainder)
  return toDateTimeKey(date)
}
