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
  switchRow,
  setFieldError,
  GRID_CLASS,
  HINT_CLASS,
  VIEW_LIST_CLASS,
  viewRow,
} from '../../components/collab/fields.js'
import {multiselect, multiselectValues, bindMultiselect} from '../../components/collab/multiselect.js'
import {
  menuDetails,
  clearFilterButton,
  toolbarRow,
  collabFieldChoices,
  collabFilterChips,
  collabFilterMatches,
  bindCollabFieldFilters,
  restoreCollabFilterFocus,
} from '../../components/collab/list-toolbar.js'
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

export function createEvents({store, toast, panel, related, confirm, goHome, users}) {
  const view = () => document.querySelector('.events-view')
  const state = {mode: 'month', date: null, fieldFilters: []}
  let built = false
  let unsubscribe = null
  let visibleItems = []

  const todayKey = () => store.now().slice(0, 10)

  const filterFields = () => [
    {
      key: 'participant',
      label: 'Participant',
      icon: 'i-user',
      type: 'multi',
      emptyLabel: 'Anyone',
      options: users.map(user => ({value: user.id, label: `${user.name} · ${user.role}`})),
      match: (event, filter) => {
        const picked = Array.isArray(filter.value) ? filter.value : []
        if (!picked.length) return true
        return picked.some(id => (event.participantIds || []).includes(id))
      },
    },
    {key: 'title', label: 'Event title', icon: 'i-doc', type: 'text'},
  ]

  const overlaps = (a, b) =>
    a.allDay === b.allDay &&
    (a.allDay
      ? a.start.slice(0, 10) <= b.end.slice(0, 10) && b.start.slice(0, 10) <= a.end.slice(0, 10)
      : a.start < b.end && b.start < a.end)

  /** Conflicting membership for the events currently in range — two events
   *  overlapping in time, or two all-day events overlapping in dates. */
  function classify(events) {
    const conflicts = new Set()
    events.forEach((a, index) =>
      events.slice(index + 1).forEach(b => {
        if (overlaps(a, b)) {
          conflicts.add(a.id)
          conflicts.add(b.id)
        }
      })
    )
    return conflicts
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
    const fields = filterFields()
    const filterItems = collabFieldChoices({fields, activeKeys: new Set(state.fieldFilters.map(filter => filter.key))})
    host.innerHTML =
      calendarToolbar({mode: state.mode, date: state.date, presets: true, today: todayKey(), titleHidden: true}) +
      `<div class="data-list-controls mt-2 w-full">${toolbarRow({
        ariaLabel: 'Events filters',
        left: `${menuDetails({attr: 'filter-menu', iconName: 'i-plus', label: 'Filter', items: filterItems})}${collabFilterChips({
          fields,
          filters: state.fieldFilters,
        })}${state.fieldFilters.length ? clearFilterButton({attr: 'clear-filters'}) : ''}`,
        right: '',
      })}</div>`
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
    const onChange = ({focusKey = '', caret = null, soft = false} = {}) => {
      if (soft) {
        renderBody()
        return
      }
      renderAll()
      restoreCollabFilterFocus(view().querySelector('[data-collab-toolbar]'), focusKey, caret)
    }
    bindCollabFieldFilters(host, {fields, filters: state.fieldFilters, onChange})
    host.querySelector('[data-clear-filters]')?.addEventListener('click', () => {
      state.fieldFilters.splice(0, state.fieldFilters.length)
      renderAll()
    })
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
    const body = view().querySelector('[data-collab-body]')
    const fields = filterFields()
    const events = rangeEvents().filter(event =>
      state.fieldFilters.every(filter => collabFilterMatches(event, filter, fields.find(field => field.key === filter.key)))
    )
    const conflicts = classify(events)
    visibleItems = events.map(event => ({
      id: event.id,
      title: titleOf(event),
      start: event.start,
      end: event.end,
      allDay: event.allDay,
      label: TYPE_META.event.label,
      conflict: conflicts.has(event.id),
    }))
    const conflictCount = conflicts.size
    body.innerHTML = `${
      conflictCount
        ? `<p class="my-2 flex items-start gap-2 rounded-md border border-[var(--danger-soft-line)] bg-[var(--danger-soft-bg)] px-3 py-2 text-[13px] text-ink" data-conflict-notice role="status">${icon(
            'i-warn',
            14
          )}<span>${conflictCount} ${conflictCount === 1 ? 'event overlaps' : 'events overlap'} another event in this period. Conflicted events are marked in red on the calendar.</span></p>`
        : ''
    }<div data-calendar></div>`
    renderCalendar(body.querySelector('[data-calendar]'), {
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
      <div class="sm:col-span-2">${switchRow({id: 'event-allday', label: 'All day', checked: event.allDay})}</div>
      ${field({id: 'event-start', label: 'Starts', required: true, control: textInput({id: 'event-start', type, value: event.start, required: true})})}
      ${field({id: 'event-end', label: 'Ends', required: true, control: textInput({id: 'event-end', type, value: event.end, required: true})})}
      ${field({
        id: 'event-location',
        label: 'Location',
        wide: true,
        control: `${textInput({id: 'event-location', value: event.location})}<div class="relative mt-2 h-[180px] overflow-hidden rounded-md border border-line bg-[var(--line-2)]" data-location-map aria-hidden="true">
          <svg viewBox="0 0 480 180" class="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice">
            <path d="M0 60 H480 M0 130 H480 M140 0 V180 M330 0 V180" stroke="var(--line)" stroke-width="12"/>
            <path d="M-12 165 L492 30" stroke="var(--line)" stroke-width="9"/>
            <rect x="165" y="78" width="150" height="32" rx="3" fill="var(--surface)" stroke="var(--line)" stroke-width="2"/>
          </svg>
          <div class="absolute inset-0 flex items-center justify-center gap-1.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-muted" data-map-pin><path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
            <span class="max-w-[70%] truncate rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink [box-shadow:var(--shadow-1)]" data-map-label>No location</span>
          </div>
        </div>`,
      })}
      ${multiselect({
        id: 'event-participants',
        label: 'Participants',
        options: users.map(user => [user.id, `${user.name} · ${user.role}`]),
        selected: event.participantIds || [],
        placeholder: 'Search people…',
        wide: true,
      })}
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

  function bindLocationMap(body) {
    const input = body.querySelector('#event-location')
    const label = body.querySelector('[data-map-label]')
    const pin = body.querySelector('[data-map-pin]')
    if (!input || !label || !pin) return
    const sync = () => {
      const value = input.value.trim()
      label.textContent = value || 'No location'
      pin.classList.toggle('text-accent', Boolean(value))
      pin.classList.toggle('text-muted', !value)
    }
    input.addEventListener('input', sync)
    sync()
  }

  function readEditor(body) {
    return {
      title: body.querySelector('#event-title').value.trim(),
      allDay: body.querySelector('#event-allday').checked,
      start: body.querySelector('#event-start').value,
      end: body.querySelector('#event-end').value,
      location: body.querySelector('#event-location').value.trim(),
      participantIds: multiselectValues(body, 'event-participants'),
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
        bindMultiselect(body)
        bindAllDay(body)
        bindLocationMap(body)
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
      /* The participants filter row and the conflict notice both read the
         store, so a save or delete repaints the whole screen, not just the
         grid. */
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
