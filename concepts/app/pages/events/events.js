// Events — calendar only (Day / Week / Month). Events show by their own
// start/end; nothing else is drawn here (timed activities live on the
// Activities calendar, notes never appear on a calendar). Reminder and
// repeat are stored and shown, but the prototype neither notifies nor
// expands occurrences, and the editor says so.
import {
  escapeHtml,
  icon,
  field,
  textInput,
  textarea,
  selectInput,
  switchInput,
  setFieldError,
  GRID_CLASS,
  SECTION_TITLE_CLASS,
  HINT_CLASS,
  VIEW_LIST_CLASS,
  viewRow,
} from '../../components/collab/fields.js'
import {renderCalendar, calendarToolbar, bindCalendarToolbar, calendarRange, shiftDate, presetJump} from '../../components/collab/calendar.js'
import {TYPE_META, titleOf, eventTiming} from '../../components/collab/meta.js'
import {addMinutes, nextHalfHour, isValidDate, isValidDateTime, formatDate, formatTime} from '../../core/collab-dates.js'

const REMINDERS = [
  ['none', 'No reminder'],
  ['10m', '10 minutes before'],
  ['1h', '1 hour before'],
  ['1d', '1 day before'],
]
const REPEATS = [
  ['none', 'Does not repeat'],
  ['daily', 'Daily'],
  ['weekly', 'Weekly'],
  ['monthly', 'Monthly'],
]
/* Filter tabs under the calendar: what is on the screen, split the way the
   prototype can honestly split it — a meeting is an event linked to an
   activity of kind "meeting", a conflict is two events overlapping in time
   (or two all-day events overlapping in dates). */
const EVENT_TABS = [
  ['all', 'All scheduled', 'i-cal'],
  ['meetings', 'Meetings', 'i-user'],
  ['events', 'Events', 'i-clock'],
  ['conflicts', 'Conflicted', 'i-warn'],
]

export function createEvents({store, toast, panel, related, confirm, goHome, users}) {
  const view = () => document.querySelector('.events-view')
  const state = {mode: 'month', date: null, tab: 'all'}
  let built = false
  let unsubscribe = null
  let visibleItems = []

  const todayKey = () => store.now().slice(0, 10)

  const isMeeting = event =>
    store.getRelatedItems('event', event.id).some(item => item.ref.type === 'activity' && item.entity?.kind === 'meeting')

  const overlaps = (a, b) =>
    a.allDay === b.allDay &&
    (a.allDay
      ? a.start.slice(0, 10) <= b.end.slice(0, 10) && b.start.slice(0, 10) <= a.end.slice(0, 10)
      : a.start < b.end && b.start < a.end)

  /** Meeting and conflict membership for the events currently in range —
   *  the tabs count and filter from this one pass. */
  function classify(events) {
    const meetings = new Set(events.filter(isMeeting).map(event => event.id))
    const conflicts = new Set()
    events.forEach((a, index) =>
      events.slice(index + 1).forEach(b => {
        if (overlaps(a, b)) {
          conflicts.add(a.id)
          conflicts.add(b.id)
        }
      })
    )
    return {meetings, conflicts}
  }

  const rangeEvents = () => {
    const {from, to} = calendarRange(state.mode, state.date)
    return store.eventsInRange(from, to)
  }

  /** Header chip: an event has no workflow status, so the chip reports its
   *  time state instead — running now, later today, upcoming, or past. */
  const eventStatus = event => {
    const now = store.now()
    const start = event.allDay ? `${event.start}T00:00` : event.start
    const end = event.allDay ? `${event.end}T23:59` : event.end
    if (end < now) return {label: 'Past', tone: 'gray'}
    if (start <= now) return {label: 'Now', tone: 'warn'}
    if (start.slice(0, 10) === todayKey()) return {label: 'Today', tone: 'fix'}
    return {label: 'Upcoming', tone: 'fix'}
  }

  function renderToolbar() {
    const host = view().querySelector('[data-collab-toolbar]')
    const events = rangeEvents()
    const {meetings, conflicts} = classify(events)
    const counts = {
      all: events.length,
      meetings: meetings.size,
      events: events.length - meetings.size,
      conflicts: conflicts.size,
    }
    host.innerHTML =
      calendarToolbar({mode: state.mode, date: state.date, presets: true, today: todayKey(), titleHidden: true}) +
      `<div class="flex w-full flex-wrap items-center gap-1 border-b border-line" role="group" aria-label="Filter events" data-cal-tabs>${EVENT_TABS.map(
        ([id, label, iconName]) =>
          `<button type="button" class="inline-flex min-h-8 -mb-px items-center gap-1.5 border-b-2 border-transparent px-2.5 text-[13px] font-medium text-muted hover:text-ink aria-pressed:border-accent aria-pressed:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)]" data-cal-tab="${id}" aria-pressed="${state.tab === id}">${icon(
            iconName,
            14
          )}<span>${label} <span class="rounded-full bg-[var(--line-2)] px-1.5 text-[11px] font-semibold text-muted">${counts[id]}</span></span></button>`
      ).join('')}</div>`
    host.firstElementChild.classList.add('w-full')
    bindCalendarToolbar(host, {
      onPrev: () => go(shiftDate(state.mode, state.date, -1)),
      onNext: () => go(shiftDate(state.mode, state.date, 1)),
      onToday: () => go(todayKey()),
      onMode: mode => {
        state.mode = mode
        renderAll()
        view().querySelector(`[data-cal-modes] [data-value="${mode}"]`)?.focus()
      },
      onPreset: id => {
        const jump = presetJump(id, todayKey())
        state.mode = jump.mode
        go(jump.date)
      },
    })
    host.querySelectorAll('[data-cal-tab]').forEach(button =>
      button.addEventListener('click', () => {
        state.tab = button.dataset.calTab
        host
          .querySelectorAll('[data-cal-tab]')
          .forEach(tab => tab.setAttribute('aria-pressed', String(tab.dataset.calTab === state.tab)))
        renderBody()
      })
    )
  }

  function go(date) {
    state.date = date
    renderAll()
  }

  function renderAll() {
    renderToolbar()
    renderBody()
  }

  function renderBody() {
    const events = rangeEvents()
    const {meetings, conflicts} = classify(events)
    const shown = events.filter(event =>
      state.tab === 'all'
        ? true
        : state.tab === 'meetings'
          ? meetings.has(event.id)
          : state.tab === 'events'
            ? !meetings.has(event.id)
            : conflicts.has(event.id)
    )
    visibleItems = shown.map(event => ({
      id: event.id,
      title: titleOf(event),
      start: event.start,
      end: event.end,
      allDay: event.allDay,
      label: TYPE_META.event.label,
    }))
    renderCalendar(view().querySelector('[data-collab-body]'), {
      mode: state.mode,
      date: state.date,
      todayKey: todayKey(),
      nowKey: store.now(),
      items: visibleItems,
      onOpen: index => openEvent(visibleItems[index].id),
      onSlot: ({date, time}) => {
        const start = `${date}T${time || '09:00'}`
        openEvent(null, {start, end: addMinutes(start, 60)})
      },
      onMore: date => {
        state.mode = 'day'
        go(date)
      },
    })
  }

  function editorMarkup(event) {
    const type = event.allDay ? 'date' : 'datetime-local'
    return `<div class="${GRID_CLASS}">
      ${field({id: 'event-title', label: 'Title', required: true, wide: true, control: textInput({id: 'event-title', value: event.title, required: true, extra: {autofocus: true}})})}
      <div class="sm:col-span-2">${switchInput({id: 'event-allday', label: 'All day', checked: event.allDay})}</div>
      ${field({id: 'event-start', label: 'Starts', required: true, control: textInput({id: 'event-start', type, value: event.start, required: true})})}
      ${field({id: 'event-end', label: 'Ends', required: true, control: textInput({id: 'event-end', type, value: event.end, required: true})})}
      ${field({id: 'event-location', label: 'Location', wide: true, control: textInput({id: 'event-location', value: event.location})})}
      <div class="sm:col-span-2 border-t border-line pt-3 mt-1">
        <h3 class="${SECTION_TITLE_CLASS}">Participants</h3>
        <div class="grid grid-cols-1 gap-x-3 sm:grid-cols-2">${users
          .map(user => switchInput({id: `event-participant-${user.id}`, label: `${user.name} · ${user.role}`, checked: event.participantIds.includes(user.id)}))
          .join('')}</div>
      </div>
      <div class="sm:col-span-2 border-t border-line mt-1"></div>
      ${field({id: 'event-reminder', label: 'Reminder', hint: 'Prototype: no notification is sent.', control: selectInput({id: 'event-reminder', value: event.reminder, options: REMINDERS})})}
      ${field({id: 'event-repeat', label: 'Repeat', hint: 'Prototype: only the first occurrence is shown on the calendar.', control: selectInput({id: 'event-repeat', value: event.repeat, options: REPEATS})})}
      ${field({id: 'event-description', label: 'Description', wide: true, control: textarea({id: 'event-description', value: event.description, rows: 4})})}
    </div>`
  }

  /* Read-only twin of the editor; the form waits behind Edit.  Times are
     spoken the way the panel header and the calendar speak them — "Thu 15
     Oct 10:00", never the stored ISO key with its T separator; the editor
     inputs keep the machine values. */
  function viewMarkup(event) {
    const labelOf = (list, id) => list.find(([value]) => value === id)?.[1] ?? id
    const participantNames = event.participantIds
      .map(id => users.find(user => user.id === id)?.name)
      .filter(Boolean)
    const stamp = value => (isValidDateTime(value) ? `${formatDate(value)} ${formatTime(value)}` : formatDate(value))
    return `<dl class="${VIEW_LIST_CLASS}">
      ${viewRow('Title', escapeHtml(titleOf(event)))}
      ${viewRow('All day', event.allDay ? 'Yes' : 'No')}
      ${viewRow('Starts', escapeHtml(stamp(event.start)))}
      ${viewRow('Ends', escapeHtml(stamp(event.end)))}
      ${viewRow('Location', escapeHtml(event.location || '—'))}
      ${viewRow('Participants', participantNames.length ? escapeHtml(participantNames.join(', ')) : '—')}
      ${viewRow('Reminder', escapeHtml(labelOf(REMINDERS, event.reminder)))}
      ${viewRow('Repeat', escapeHtml(labelOf(REPEATS, event.repeat)))}
      ${viewRow('Description', event.description ? `<span class="whitespace-pre-line" dir="auto">${escapeHtml(event.description)}</span>` : '—')}
    </dl>`
  }

  /** Switching all-day converts the existing values instead of clearing
   *  them: date-times keep their day, dates gain 09:00–10:00. */
  function bindAllDay(body) {
    const toggle = body.querySelector('#event-allday')
    const start = body.querySelector('#event-start')
    const end = body.querySelector('#event-end')
    toggle.addEventListener('change', () => {
      if (toggle.checked) {
        const startDay = start.value.slice(0, 10)
        const endDay = end.value.slice(0, 10) || startDay
        start.type = 'date'
        end.type = 'date'
        start.value = startDay
        end.value = endDay
      } else {
        const startDay = start.value || todayKey()
        start.type = 'datetime-local'
        end.type = 'datetime-local'
        start.value = `${startDay}T09:00`
        end.value = `${end.value || startDay}T10:00`
      }
    })
  }

  function readEditor(body) {
    return {
      title: body.querySelector('#event-title').value.trim(),
      allDay: body.querySelector('#event-allday').checked,
      start: body.querySelector('#event-start').value,
      end: body.querySelector('#event-end').value,
      location: body.querySelector('#event-location').value.trim(),
      participantIds: users.filter(user => body.querySelector(`#event-participant-${user.id}`).checked).map(user => user.id),
      reminder: body.querySelector('#event-reminder').value,
      repeat: body.querySelector('#event-repeat').value,
      description: body.querySelector('#event-description').value,
    }
  }

  function validate(body, values) {
    const valid = values.allDay ? isValidDate : isValidDateTime
    const errors = {
      'event-title': values.title ? '' : 'Title is required.',
      'event-start': valid(values.start) ? '' : 'Enter a start.',
      'event-end': !valid(values.end)
        ? 'Enter an end.'
        : valid(values.start) && (values.allDay ? values.end < values.start : values.end <= values.start)
          ? 'End must be after start.'
          : '',
    }
    Object.entries(errors).forEach(([id, message]) => setFieldError(body, id, message))
    const first = Object.entries(errors).find(([, message]) => message)
    if (first) body.querySelector(`#${first[0]}`).focus()
    return !first
  }

  function openEvent(id, prefill = {}, {edit = false} = {}) {
    const existing = id ? store.getEntity('event', id) : null
    if (id && !existing) {
      toast({tone: 'warn', title: 'This event is no longer available', body: 'It may have been deleted.'})
      return
    }
    const start = nextHalfHour(store.now())
    const event = existing || {
      title: '',
      allDay: false,
      start,
      end: addMinutes(start, 60),
      location: '',
      participantIds: [users[0].id],
      reminder: 'none',
      repeat: 'none',
      description: '',
      ...prefill,
    }
    const ref = existing ? {type: 'event', id: existing.id} : null
    panel.open({
      ref,
      edit,
      status: existing ? eventStatus(existing) : undefined,
      title: existing ? titleOf(existing) : 'New event',
      description: existing
        ? [eventTiming(existing, todayKey()), existing.location].filter(Boolean).join(' · ')
        : 'Meetings, holidays and other time on the calendar.',
      render: body => {
        body.innerHTML = editorMarkup(event)
        bindAllDay(body)
        if (existing?.repeat && existing.repeat !== 'none') {
          body.insertAdjacentHTML('afterbegin', `<p class="${HINT_CLASS} mb-3">Repeats ${escapeHtml(existing.repeat)} — only this first occurrence is shown in the prototype.</p>`)
        }
      },
      view: body => {
        body.innerHTML = viewMarkup(event)
        if (existing?.repeat && existing.repeat !== 'none') {
          body.insertAdjacentHTML('afterbegin', `<p class="${HINT_CLASS} mb-3">Repeats ${escapeHtml(existing.repeat)} — only this first occurrence is shown in the prototype.</p>`)
        }
      },
      save: body => {
        const values = readEditor(body)
        if (!validate(body, values)) return false
        if (existing) {
          store.updateEntity('event', existing.id, values)
          toast({tone: 'ok', title: 'Event saved', body: values.title})
        } else {
          store.createEntity('event', values)
          toast({tone: 'ok', title: 'Event created', body: values.title})
        }
        return true
      },
      menu: existing ? [{label: 'Delete', icon: 'i-trash', danger: true, run: () => deleteEvent(existing)}] : [],
      related: ref ? host => related.render(host, ref) : null,
    })
  }

  async function deleteEvent(event) {
    const ok = await confirm({
      title: 'Delete this event?',
      body: 'The event is removed. Linked items keep the link and show it as unavailable until someone removes it. Linked activities are not changed.',
      confirmLabel: 'Delete',
      tone: 'danger',
    })
    if (!ok) return
    store.deleteEntity('event', event.id)
    await panel.close({force: true})
    toast({tone: 'info', title: 'Event deleted', body: titleOf(event)})
  }

  function build() {
    const root = view()
    root.querySelector('[data-collab-new]').addEventListener('click', () => openEvent(null))
    root.querySelector('[data-collab-home]').addEventListener('click', event => {
      event.preventDefault()
      goHome()
    })
    built = true
  }

  return {
    id: 'events',
    get roots() {
      return view() ? [view()] : []
    },
    activate({openId} = {}) {
      if (!view()) return
      if (!built) build()
      if (!state.date) state.date = todayKey()
      if (openId) {
        const event = store.getEntity('event', openId)
        if (event) state.date = event.start.slice(0, 10)
      }
      renderAll()
      unsubscribe?.()
      /* Toolbar counts and the tab filter both read the store, so a save or
         delete repaints the whole screen, not just the grid. */
      unsubscribe = store.subscribe(() => {
        if (view() && !view().hidden) renderAll()
      })
      if (openId) openEvent(openId)
    },
    deactivate() {
      unsubscribe?.()
      unsubscribe = null
    },
    dispose() {
      unsubscribe?.()
    },
    /* Exposed so a Related Items row can open the event editor in place. */
    openEvent,
  }
}
