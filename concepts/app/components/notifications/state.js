import {NOTIF_DATA} from '../../prototype/fixtures/messages.js'

const KEY = 'skey:notification-state'
let memory = {}

function savedState() {
  try { return {...memory, ...JSON.parse(localStorage.getItem(KEY) || '{}')} } catch { return {...memory} }
}

export function notificationItems() {
  const saved = savedState()
  return NOTIF_DATA.direct.map((row, index) => ({
    ...row,
    id: `direct-${index}`,
    unread: saved[`direct-${index}`]?.unread ?? row.unread,
    pinned: saved[`direct-${index}`]?.pinned ?? false,
  }))
}

export function saveNotificationState(row) {
  const saved = savedState()
  saved[row.id] = {unread: row.unread, pinned: row.pinned}
  memory = saved
  try { localStorage.setItem(KEY, JSON.stringify(saved)) } catch { /* In-memory state remains usable. */ }
  document.dispatchEvent(new Event('notifications:changed'))
}
