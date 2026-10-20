import {uiLocale} from '../../core/locale.js'
import {escapeHtml as html, icon} from '../../components/collab/fields.js'
import {monthGridDays, parseLocal, formatMonthTitle, formatTime} from '../../core/collab-dates.js'

const {t} = uiLocale
export const EVENT_CATEGORIES = [['general', 'General'], ['company', 'Company'], ['customer', 'Customer'], ['sales', 'Sales']]
export const eventCategory = event => EVENT_CATEGORIES.find(([id]) => id === event.category) || EVENT_CATEGORIES[0]
export const eventDate = (day, options = {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'}) =>
  parseLocal(day.slice(0, 10)).toLocaleDateString(uiLocale.getLocale() === 'ar' ? 'ar-EG' : 'en-GB', options)

export const coversEventDay = (event, day) => event.start.slice(0, 10) <= day &&
  (event.allDay ? event.end.slice(0, 10) >= day : event.end > `${day}T00:00`)

const dateTile = day => `<span class="event-date-tile"><span>${html(eventDate(day, {weekday: 'short'}))}</span><strong>${html(eventDate(day, {day: 'numeric'}))}</strong><span>${html(eventDate(day, {month: 'short'}))}</span></span>`
const meta = (name, value) => `<span class="event-meta">${icon(name, 16)}<span>${html(value)}</span></span>`
const timing = event => event.allDay ? t('All day') : `${formatTime(event.start)} – ${formatTime(event.end)}`

function peopleSummary(event, users) {
  const people = (event.participantIds || []).map(id => users.find(user => user.id === id)).filter(Boolean)
  if (!people.length) return ''
  const label = people.length === 1 ? people[0].name : people.length <= 3 ? people.map(user => user.name.split(' ')[0]).join(', ') : `${people[0].name} +${people.length - 1}`
  const initials = name => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('')
  return `<span class="event-participants" title="${html(people.map(user => user.name).join(', '))}"><span class="event-avatar-stack" aria-hidden="true">${people.slice(0, 3).map(user => `<span class="event-initial-avatar">${html(initials(user.name))}</span>`).join('')}${people.length > 3 ? `<span class="event-initial-avatar">+${people.length - 3}</span>` : ''}</span><span dir="auto">${html(label)}</span><span class="sr-only">${html(people.map(user => user.name).join(', '))}</span></span>`
}

export function eventList({items, selectedId, users, status, links, repeats, reminders, from}) {
  if (!items.length) return `<p class="event-empty" role="status">${t('No events in this period.')}</p>`
  const groups = Map.groupBy(items, event => event.start.slice(0, 10) < from ? from : event.start.slice(0, 10))
  return `<div data-event-agenda class="event-list">${[...groups].map(([day, events]) => `
    <section class="event-date-group" data-event-group="${day}" aria-label="${html(eventDate(day))}">
      <header class="event-group-heading"><h3>${html(eventDate(day))}</h3><span>${events.length} ${t(events.length === 1 ? 'event' : 'events')}</span></header>
      ${events.map(event => {
        const currentStatus = status(event)
        const [category, label] = eventCategory(event)
        const count = links(event)
        return `<article class="event-entry event-category-${category}${event.allDay ? ' is-all-day' : ''}${event.id === selectedId ? ' is-selected' : ''}" data-event-entry="${html(event.id)}">
          <button type="button" class="event-row" data-agenda-event="${html(event.id)}">
            ${dateTile(day)}
            ${!event.allDay ? `<span class="event-time-column" aria-label="${html(timing(event))}" dir="ltr"><strong>${html(formatTime(event.start))}</strong><i aria-hidden="true"></i><span>${html(formatTime(event.end))}</span></span>` : ''}
            <span class="event-entry-content">
              <span class="event-entry-heading"><strong dir="auto">${html(event.title)}</strong><span class="badge ${currentStatus.tone}">${html(currentStatus.label)}</span>${event.conflict ? `<span class="badge danger">${t('Scheduling conflict')}</span>` : ''}</span>
              <span class="event-entry-meta">
                ${event.allDay ? meta('i-cal', t('All day')) : ''}
                ${event.location ? meta('i-location', event.location) : ''}
                <span class="event-category-label"><i aria-hidden="true"></i>${html(t(label))}</span>
                ${peopleSummary(event, users)}
                ${event.repeat && event.repeat !== 'none' ? meta('i-refresh', t(repeats.find(([id]) => id === event.repeat)?.[1] || event.repeat)) : ''}
                ${event.reminder && event.reminder !== 'none' ? meta('i-bell', t(reminders.find(([id]) => id === event.reminder)?.[1] || event.reminder)) : ''}
                ${count ? meta('i-clip', `${count} ${t(count === 1 ? 'Related item' : 'Related items')}`) : ''}
              </span>
            </span>
          </button>
        </article>`
      }).join('')}
    </section>`).join('')}</div>`
}

export function miniCalendar({month, selectedDay, today, items}) {
  const days = monthGridDays(month)
  const year = Number(month.slice(0, 4))
  return `<section class="event-side-section" aria-label="${html(t('Mini calendar'))}">
    <header class="event-mini-heading">
      <div class="event-month-controls">
        <select class="event-date-select" data-event-month aria-label="${html(t('Select month'))}">${Array.from({length: 12}, (_, index) => `<option value="${String(index + 1).padStart(2, '0')}" ${index + 1 === Number(month.slice(5, 7)) ? 'selected' : ''}>${html(eventDate(`${year}-${String(index + 1).padStart(2, '0')}-01`, {month: 'long'}))}</option>`).join('')}</select>
        <input class="event-date-year" type="number" min="1900" max="9999" value="${year}" data-event-year aria-label="${html(t('Select year'))}">
      </div>
      <div class="event-mini-nav"><button type="button" class="event-icon-button" data-event-mini-shift="-1" aria-label="${html(t('Previous month'))}">${icon('i-prev', 16)}</button><button type="button" class="event-icon-button" data-event-mini-shift="1" aria-label="${html(t('Next month'))}">${icon('i-next', 16)}</button></div>
    </header>
    <div class="event-mini-grid" role="group" aria-label="${html(formatMonthTitle(month))}">
      ${days.slice(0, 7).map(day => `<span class="event-mini-weekday">${html(eventDate(day, {weekday: 'short'}))}</span>`).join('')}
      ${days.map(day => `<button type="button" class="event-mini-day${day.slice(0, 7) !== month.slice(0, 7) ? ' is-outside' : ''}" data-event-day="${day}" aria-label="${html(eventDate(day))}${items.some(event => coversEventDay(event, day)) ? `, ${html(t('Has events'))}` : ''}" aria-pressed="${day === selectedDay}" ${day === today ? 'aria-current="date"' : ''}><span>${html(eventDate(day, {day: 'numeric'}))}</span>${items.some(event => coversEventDay(event, day)) ? '<i aria-hidden="true"></i>' : ''}</button>`).join('')}
    </div>
  </section>`
}

export function eventSidebar({upcoming, expanded}) {
  return `<section class="event-side-section"><header class="event-mini-heading"><h3>${t('Upcoming events')}</h3><button type="button" class="event-text-button" data-event-view-all>${t(expanded ? 'View less' : 'View all')}</button></header>
    <div class="event-upcoming">${upcoming.length ? upcoming.map(event => `<button type="button" data-event-upcoming="${html(event.id)}">${dateTile(event.start)}<span><strong dir="auto">${html(event.title)}</strong><span>${html(timing(event))}${event.location ? ` · ${html(event.location)}` : ''}</span></span></button>`).join('') : `<p class="text-sm text-muted">${t('No upcoming events.')}</p>`}</div>
  </section>`
}
