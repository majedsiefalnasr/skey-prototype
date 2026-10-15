// Per-type identity and one-line summaries for collaboration items, used
// wherever an item is shown outside its own screen (Related Items rows,
// the picker, mail lists, cards). Type is always icon + text label.
import {formatDate, formatTime, relativeDay, isValidDateTime} from '../../core/collab-dates.js'

export const TYPE_ORDER = ['note', 'activity', 'event', 'mail', 'person']

export const TYPE_META = {
  note: {label: 'Note', plural: 'Notes', icon: 'i-doc'},
  activity: {label: 'Activity', plural: 'Activities', icon: 'i-check'},
  event: {label: 'Event', plural: 'Events', icon: 'i-clock'},
  mail: {label: 'Mail', plural: 'Mail', icon: 'i-mail'},
  person: {label: 'Person', plural: 'People', icon: 'i-user'},
}

export const NOTE_STATUSES = [
  ['draft', 'Draft'],
  ['active', 'Active'],
  ['archived', 'Archived'],
]

export const ACTIVITY_KINDS = [
  ['todo', 'To-do', 'i-check'],
  ['call', 'Call', 'i-chat'],
  ['meeting', 'Meeting', 'i-user'],
  ['email', 'Email', 'i-mail'],
]
export const ACTIVITY_STATUSES = [
  ['planned', 'Planned'],
  ['in_progress', 'In progress'],
  ['done', 'Done'],
  ['cancelled', 'Cancelled'],
]
export const PRIORITIES = [
  ['low', 'Low'],
  ['normal', 'Normal'],
  ['high', 'High'],
]
export const MAIL_FOLDERS = [
  ['inbox', 'Inbox', 'i-mail'],
  ['starred', 'Starred', 'i-spark'],
  ['sent', 'Sent', 'i-reply'],
  ['drafts', 'Drafts', 'i-edit'],
  ['archive', 'Archive', 'i-archive'],
  ['trash', 'Trash', 'i-trash'],
]
export const CONVERSION_TARGETS = [
  ['customer', 'Customer'],
  ['supplier', 'Supplier'],
  ['employee', 'Employee'],
  ['user', 'User'],
]

const labelFrom = (list, value) => list.find(([id]) => id === value)?.[1] ?? value

export const kindLabel = kind => labelFrom(ACTIVITY_KINDS, kind)
export const kindIcon = kind => ACTIVITY_KINDS.find(([id]) => id === kind)?.[2] ?? 'i-check'
export const statusLabel = status => labelFrom(ACTIVITY_STATUSES, status)
export const noteStatusLabel = status => labelFrom(NOTE_STATUSES, status)
export const folderLabel = (folder, folders = []) =>
  MAIL_FOLDERS.find(([id]) => id === folder)?.[1] ?? folders.find(entry => entry.id === folder)?.name ?? folder
export const conversionLabel = target => labelFrom(CONVERSION_TARGETS, target)

export const isOpenActivity = activity => activity.status === 'planned' || activity.status === 'in_progress'
export const isOverdue = (activity, todayKey) =>
  Boolean(activity.dueDate) && activity.dueDate < todayKey && isOpenActivity(activity)

export const userName = (id, users) => users.find(user => user.id === id)?.name ?? 'Unassigned'

export const assigneeIdsOf = activity =>
  activity?.assigneeIds?.length ? [...activity.assigneeIds] : activity?.assigneeId ? [activity.assigneeId] : []

export function titleOf(entity) {
  if (!entity) return ''
  switch (entity.type) {
    case 'note':
      return entity.title || 'Untitled note'
    case 'activity':
      return entity.summary || 'Untitled activity'
    case 'event':
      return entity.title || 'Untitled event'
    case 'mail':
      return entity.subject || '(no subject)'
    case 'person':
      return entity.nameEn || entity.nameAr || 'Unnamed person'
    default:
      return ''
  }
}

const dayLabel = (key, todayKey) => relativeDay(key, todayKey) ?? formatDate(key)

/** Due / scheduled wording for an activity. Due date and scheduled time
 *  are separate facts and are reported separately. */
export function activityTiming(activity, todayKey) {
  const parts = []
  if (activity.dueDate) {
    if (isOverdue(activity, todayKey)) parts.push(`Overdue · ${formatDate(activity.dueDate)}`)
    else parts.push(activity.dueDate === todayKey ? 'Due today' : `Due ${dayLabel(activity.dueDate, todayKey)}`)
  }
  if (isValidDateTime(activity.scheduledStart)) {
    parts.push(`Scheduled ${dayLabel(activity.scheduledStart, todayKey)} ${formatTime(activity.scheduledStart)}`)
  }
  return parts
}

export function eventTiming(event, todayKey) {
  if (event.allDay) {
    const start = dayLabel(event.start, todayKey)
    return event.end && event.end !== event.start ? `All day · ${start} – ${dayLabel(event.end, todayKey)}` : `All day · ${start}`
  }
  return `${dayLabel(event.start, todayKey)} ${formatTime(event.start)}–${formatTime(event.end)}`
}

/** One-line summary. `folders` is the store's custom mail folder list, so a
 *  message filed in a folder the user created reports its name, not its id. */
export function metaLine(entity, {todayKey, folders = []}) {
  switch (entity.type) {
    case 'note':
      return noteStatusLabel(entity.status)
    case 'activity':
      return [statusLabel(entity.status), ...activityTiming(entity, todayKey)].join(' · ')
    case 'event':
      return eventTiming(entity, todayKey)
    case 'mail': {
      const at = entity.sentAt || entity.savedAt || entity.createdAt
      return `${folderLabel(entity.folder, folders)} · ${dayLabel(at, todayKey)} ${formatTime(at)}`
    }
    case 'person':
      return entity.convertedTo
        ? `Converted to ${conversionLabel(entity.convertedTo.target)}`
        : entity.lifecycle === 'contact'
          ? 'Contact'
          : 'Lead'
    default:
      return ''
  }
}

/** Free-text haystack used by search and the Related Items picker. */
export function searchText(entity) {
  const contacts = (entity.contacts || []).map(contact => contact.value).join(' ')
  const people = [...(entity.to || []), ...(entity.cc || [])].map(person => person.name).join(' ')
  return [
    titleOf(entity),
    entity.body && (Array.isArray(entity.body) ? entity.body.join(' ') : entity.body),
    entity.notes,
    entity.description,
    entity.location,
    entity.company,
    entity.nameAr,
    entity.from?.name,
    people,
    contacts,
    (entity.tags || []).join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

/* ---------- people duplicates ---------- */
const phoneKey = value => String(value || '').replace(/\D/g, '').replace(/^00/, '').slice(-10)
const emailKey = value => String(value || '').trim().toLowerCase()
const nameKey = value => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase()

/** Other people that look like the same person: same phone (last 10
 *  digits, so +20 / 0020 prefixes match), same email (case-insensitive),
 *  or the same English name. One match per person, strongest field first. */
export function findPersonDuplicates(candidate, people) {
  const contacts = candidate.contacts || []
  const phones = new Set(contacts.filter(c => c.kind !== 'email').map(c => phoneKey(c.value)).filter(v => v.length >= 7))
  const emails = new Set(contacts.filter(c => c.kind === 'email').map(c => emailKey(c.value)).filter(Boolean))
  const name = nameKey(candidate.nameEn)
  const matches = []
  for (const person of people) {
    if (person.id === candidate.id) continue
    const theirs = person.contacts || []
    const phone = theirs.find(c => c.kind !== 'email' && phones.has(phoneKey(c.value)))
    if (phone) matches.push({person, field: phone.kind})
    else if (theirs.some(c => c.kind === 'email' && emails.has(emailKey(c.value)))) matches.push({person, field: 'email'})
    else if (name && nameKey(person.nameEn) === name) matches.push({person, field: 'name'})
  }
  return matches
}
