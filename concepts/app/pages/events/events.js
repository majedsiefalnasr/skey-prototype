import {uiLocale} from '../../core/locale.js'
const {t} = uiLocale
// Events — Calendar and Agenda over Day / Week / Month. Events show by their own
// start/end; timed activities retain their separate calendar. Recurrence
// expands in the event's timezone, with exceptions and scoped edits.
// Reminders are delivered in-app while this prototype is open.
import {
  escapeHtml,
  icon,
  field,
  textInput,
  textarea,
  selectInput,
  SELECT_CONTROL_CLASS,
  switchInput,
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
  menuItemRadio,
  viewMenu,
  clearFilterButton,
  toolbarRow,
  collabFieldChoices,
  collabFilterChips,
  collabFilterMatches,
  bindCollabFieldFilters,
  restoreCollabFilterFocus,
} from '../../components/collab/list-toolbar.js'
import {renderCalendar, calendarToolbar, bindCalendarToolbar, bindCalendarDates, calendarRange, shiftDate, presetJump} from '../../components/collab/calendar.js'
import {eventList, miniCalendar, eventSidebar, coversEventDay, EVENT_CATEGORIES, eventCategory} from './event-layouts.js'
import {TYPE_META, titleOf, eventTiming} from '../../components/collab/meta.js'
import {addMinutes, nextHalfHour, isValidDate, isValidDateTime, formatDate, formatTime} from '../../core/collab-dates.js'
import {DEFAULT_EVENT_ZONE, eventInstant, localTime, shiftWall, expandEvents, eventsConflict} from '../../core/event-scheduling.js'

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

export function createEvents({store, toast, panel, related, confirm, goHome, users, beforeAction = async () => true}) {
  const view = () => document.querySelector('.events-view')
  const state = {mode: 'month', date: null, fieldFilters: [], zone: DEFAULT_EVENT_ZONE, layout: 'calendar', selectedDay: null, selectedId: null, upcomingExpanded: false}
  let built = false
  let unsubscribe = null
  let visibleItems = []

  const todayKey = () => localTime(eventInstant(store.now().slice(0, 16), DEFAULT_EVENT_ZONE) ?? Date.parse(store.now()), state.zone).slice(0, 10)

  const filterFields = () => [
    {
      key: 'participant',
      label: t("Participant"),
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
    {key: 'title', label: t("Event title"), icon: 'i-doc', type: 'text'},
    {key: 'location', label: t('Location'), icon: 'i-location', type: 'text'},
  ]

  /** Conflicts require overlapping time and a common participant/resource. */
  function classify(events) {
    const conflicts = new Set()
    events.forEach((a, index) =>
      events.slice(index + 1).forEach(b => {
        if (eventsConflict(a, b)) {
          conflicts.add(a.id)
          conflicts.add(b.id)
        }
      })
    )
    return conflicts
  }

  const rangeEvents = () => {
    const {from, to} = calendarRange(state.mode, state.date)
    return expandEvents(store.listEntities('event'), from, to, state.zone)
  }

  /** Header chip: an event has no workflow status, so the chip reports its
   *  time state instead — running now, later today, upcoming, or past. */
  const eventStatus = event => {
    if (event.invalidTime) return {label: t('Check time'), tone: 'warn'}
    const now = store.now()
    const start = event.allDay ? `${event.start}T00:00` : event.start
    const end = event.allDay ? `${event.end}T23:59` : event.end
    const clock = eventInstant(now.slice(0, 16), DEFAULT_EVENT_ZONE)
    const startAt = event.allDay ? start : eventInstant(start, event.timeZone)
    const endAt = event.allDay ? end : eventInstant(end, event.timeZone)
    const current = event.allDay ? localTime(clock, state.zone) : clock
    if (!event.allDay && (startAt === null || endAt === null)) return {label: t('Check time'), tone: 'warn'}
    if (endAt < current) return {label: t("Past"), tone: 'gray'}
    if (startAt <= current) return {label: t("Now"), tone: 'warn'}
    if (start.slice(0, 10) === (event.allDay ? todayKey() : localTime(clock, event.timeZone || DEFAULT_EVENT_ZONE).slice(0, 10))) return {label: t("Today"), tone: 'fix'}
    return {label: t("Upcoming"), tone: 'fix'}
  }

  function renderToolbar() {
    const host = view().querySelector('[data-collab-toolbar]')
    const fields = filterFields()
    const filterItems = collabFieldChoices({fields, activeKeys: new Set(state.fieldFilters.map(filter => filter.key))})
    host.innerHTML =
      calendarToolbar({mode: state.mode, date: state.date, presets: true, today: todayKey(), titleHidden: true}) +
      `<div class="data-list-controls mt-2 w-full">${toolbarRow({
        ariaLabel: 'Events filters',
        left: `${switchInput({id: 'event-reminders-enabled', label: 'Event reminders', checked: store.getPreference('eventReminders', true)}).replace('role="switch"', 'role="switch" data-event-reminders')}${menuDetails({attr: 'filter-menu', iconName: 'i-plus', label: t("Filter"), items: filterItems})}${collabFilterChips({
          fields,
          filters: state.fieldFilters,
        })}${state.fieldFilters.length ? clearFilterButton({attr: 'clear-filters'}) : ''}`,
        right: `<label class="inline-flex min-h-8 items-center gap-2 text-xs text-muted" for="calendar-display-zone">${t('Calendar timezone')}${selectInput({id: 'calendar-display-zone', value: state.zone, options: [...new Set([DEFAULT_EVENT_ZONE, 'UTC', ...(Intl.supportedValuesOf?.('timeZone') || [])])].map(zone => [zone, zone]), extra: {class: `${SELECT_CONTROL_CLASS} max-w-[210px]`, 'data-display-zone': true}})}</label>${viewMenu({attr: 'event-view-menu', label: state.layout === 'calendar' ? 'Calendar' : 'Agenda', iconName: state.layout === 'calendar' ? 'i-cal' : 'i-list', options: [['calendar', 'Calendar', 'i-cal'], ['agenda', 'Agenda', 'i-list']].map(([id, label, iconName]) => menuItemRadio({attr: 'event-view-select', value: id, label, iconName, checked: state.layout === id})).join('')})}`,
      })}</div>`
    host.firstElementChild.classList.add('w-full')
    host.querySelector('[data-event-reminders]').addEventListener('change', event => store.setPreference('eventReminders', event.target.checked))
    host.querySelector('[data-display-zone]').addEventListener('change', event => {
      const selected = visibleItems.find(item => item.id === state.selectedId)
      state.zone = event.target.value
      if (selected && !selected.allDay && !selected.invalidTime) {
        state.selectedDay = localTime(selected.startAt, state.zone).slice(0, 10)
        state.date = state.selectedDay
      }
      renderAll()
      view().querySelector('[data-display-zone]')?.focus({preventScroll: true})
    })
    host.querySelectorAll('[data-event-view-select]').forEach(button => button.addEventListener('click', () => {
      state.layout = button.dataset.eventViewSelect
      renderAll()
      view().querySelector('[data-event-view-menu] summary').focus()
    }))
    bindCalendarToolbar(host, {
      onPrev: () => go(shiftDate(state.mode, state.date, -1)),
      onNext: () => go(shiftDate(state.mode, state.date, 1)),
      onToday: () => go(todayKey()),
      onMode: mode => {
        state.mode = mode
        state.date = state.selectedDay || state.date
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
    state.selectedDay = date
    state.selectedId = null
    renderAll()
  }

  function renderAll() {
    renderToolbar()
    renderBody()
  }

  function renderBody() {
    const body = view().querySelector('[data-collab-body]')
    body._calendarContextAbort?.abort()
    const fields = filterFields()
    const allEvents = rangeEvents()
    const events = allEvents.filter(event =>
      state.fieldFilters.every(filter => collabFilterMatches(event, filter, fields.find(field => field.key === filter.key)))
    )
    const conflicts = classify(allEvents)
    visibleItems = events.map(event => ({
      ...event,
      id: event.id,
      title: titleOf(event),
      start: event.start,
      end: event.end,
      allDay: event.allDay,
      label: TYPE_META.event.label,
      conflict: conflicts.has(event.id),
    }))
    const conflictCount = events.filter(event => conflicts.has(event.id)).length
    const invalidCount = events.filter(event => event.invalidTime).length
    body.innerHTML = `${
      conflictCount
        ? `<p class="my-2 flex items-start gap-2 rounded-md border border-[var(--danger-soft-line)] bg-[var(--danger-soft-bg)] px-3 py-2 text-[13px] text-ink" data-conflict-notice role="status">${icon(
            'i-warn',
            14
          )}<span>${conflictCount} ${t('events double-book a participant or resource in this period.')}</span></p>`
        : ''
    }${invalidCount ? `<p class="my-2 rounded border border-[var(--warn-line)] bg-[var(--warn-bg)] p-3 text-sm text-ink" role="status">${invalidCount} ${t('occurrences need a valid local time. Open the event to resolve the timezone transition.')}</p>` : ''}<div data-calendar></div>`
    visibleItems.sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title))
    state.selectedDay ||= state.date
    const {from, to} = calendarRange(state.mode, state.date)
    if (state.selectedDay < from || state.selectedDay > to) state.selectedDay = state.date
    if (!visibleItems.some(event => event.id === state.selectedId && coversEventDay(event, state.selectedDay))) {
      state.selectedId = visibleItems.find(event => coversEventDay(event, state.selectedDay))?.id || null
    }
    body.querySelector('[data-calendar]').outerHTML = `<div class="event-workspace" data-event-layout="${state.layout}"><div class="event-main" data-calendar></div>${state.layout === 'agenda' ? `<aside class="event-sidebar" aria-label="${escapeHtml(t('Event overview'))}" data-event-sidebar></aside>` : ''}</div>`
    const main = body.querySelector('[data-calendar]')
    const status = event => eventStatus({...event, timeZone: state.zone})
    const links = event => store.getRelatedItems('event', event.seriesId).length
    const options = {users, status, links, repeats: REPEATS, reminders: REMINDERS}
    const selectEvent = event => {
      if (!event) return
      state.selectedId = event.id
      if (!coversEventDay(event, state.selectedDay)) state.selectedDay = event.start.slice(0, 10)
      renderBody()
    }
    const find = id => visibleItems.find(event => event.id === id)
    if (state.layout !== 'calendar') {
      main.innerHTML = eventList({...options, items: visibleItems, selectedId: state.selectedId, from})
      main.querySelectorAll('[data-agenda-event]').forEach(button => button.addEventListener('click', () => {
        const event = find(button.dataset.agendaEvent)
        selectEvent(event)
        body.querySelector(`[data-agenda-event="${CSS.escape(event.id)}"]`)?.focus({preventScroll: true})
        openOccurrence(event)
      }))
    } else {
      renderCalendar(main, {
        mode: state.mode,
        date: state.date,
        todayKey: todayKey(),
        nowKey: localTime(eventInstant(store.now().slice(0, 16), DEFAULT_EVENT_ZONE), state.zone),
        items: visibleItems,
        selectedDay: state.selectedDay,
        selectedId: state.selectedId,
        enhanced: true,
        onSelectDay: date => {
          state.selectedDay = date
          state.selectedId = null
          renderBody()
          body.querySelector(`[data-cal-select-day="${date}"]`)?.focus({preventScroll: true})
        },
        onOpen: index => {
          const event = visibleItems[index]
          selectEvent(event)
          body.querySelector(`[data-cal-item="${index}"]`)?.focus({preventScroll: true})
          openOccurrence(event)
        },
        onSlot: ({date, time}) => {
          state.selectedDay = date
          state.selectedId = null
          renderBody()
          body.querySelector(`[data-cal-slot="${date}"]${time ? `[data-time="${time}"]` : ''}`)?.focus({preventScroll: true})
          const start = `${date}T${time || '09:00'}`
          openEvent(null, {start, end: addMinutes(start, 60), timeZone: state.zone})
        },
        onMore: date => {
          state.mode = 'day'
          go(date)
        },
      })
    }
    if (state.layout === 'calendar') return

    const matchesFilters = event => state.fieldFilters.every(filter => collabFilterMatches(event, filter, fields.find(field => field.key === filter.key)))
    const monthRange = calendarRange('month', state.date)
    const miniItems = expandEvents(store.listEntities('event'), monthRange.from, monthRange.to, state.zone).filter(matchesFilters)
    const now = eventInstant(store.now().slice(0, 16), DEFAULT_EVENT_ZONE)
    const upcoming = expandEvents(store.listEntities('event'), todayKey(), shiftWall(todayKey(), 90), state.zone)
      .filter(event => matchesFilters(event) && (event.allDay ? event.end >= todayKey() : !event.invalidTime && event.endAt > now))
      .sort((a, b) => a.start.localeCompare(b.start))
    const sidebar = body.querySelector('[data-event-sidebar]')
    sidebar.innerHTML = miniCalendar({month: state.date, selectedDay: state.selectedDay, today: todayKey(), items: miniItems}) +
      eventSidebar({upcoming: state.upcomingExpanded ? upcoming : upcoming.slice(0, 3), expanded: state.upcomingExpanded})
    const jumpMonth = (date, focusSelector) => {
      state.mode = 'month'
      go(date)
      body.querySelector(focusSelector)?.focus({preventScroll: true})
    }
    sidebar.querySelectorAll('[data-event-mini-shift]').forEach(button => button.addEventListener('click', () =>
      jumpMonth(shiftDate('month', state.date, Number(button.dataset.eventMiniShift)), `[data-event-mini-shift="${button.dataset.eventMiniShift}"]`)))
    sidebar.querySelectorAll('[data-event-month], [data-event-year]').forEach(control => control.addEventListener('change', () => {
      const year = sidebar.querySelector('[data-event-year]')
      if (!year.validity.valid || !/^\d{4}$/.test(year.value)) {
        year.value = state.date.slice(0, 4)
        return
      }
      jumpMonth(`${year.value}-${sidebar.querySelector('[data-event-month]').value}-01`, control.hasAttribute('data-event-month') ? '[data-event-month]' : '[data-event-year]')
    }))
    sidebar.querySelectorAll('[data-event-day]').forEach(button => button.addEventListener('click', () => {
      state.mode = 'day'
      go(button.dataset.eventDay)
      body.querySelector(`[data-event-day="${button.dataset.eventDay}"]`)?.focus({preventScroll: true})
    }))
    bindCalendarDates(sidebar, 'data-event-day', state.selectedDay, todayKey())
    sidebar.querySelectorAll('[data-event-upcoming]').forEach(button => button.addEventListener('click', () => {
      const event = upcoming.find(item => item.id === button.dataset.eventUpcoming)
      if (!event) return
      state.mode = 'day'
      state.date = event.start.slice(0, 10)
      state.selectedDay = state.date
      state.selectedId = event.id
      renderAll()
      body.querySelector(`[data-agenda-event="${CSS.escape(event.id)}"]`)?.focus()
    }))
    sidebar.querySelector('[data-event-view-all]').addEventListener('click', () => {
      state.upcomingExpanded = !state.upcomingExpanded
      renderBody()
      body.querySelector('[data-event-view-all]')?.focus({preventScroll: true})
    })
  }

  function openOccurrence(event, {edit = false} = {}) {
    if (!event) return
    openEvent(event.seriesId, {}, {edit, occurrence: event.allDay || event.invalidTime ? event : {
      ...event, start: localTime(event.startAt, event.timeZone || DEFAULT_EVENT_ZONE), end: localTime(event.endAt, event.timeZone || DEFAULT_EVENT_ZONE),
    }})
  }

  function editorMarkup(event) {
    const type = event.allDay ? 'date' : 'datetime-local'
    return `<div class="${GRID_CLASS}">
      ${field({id: 'event-title', label: t("Title"), required: true, wide: true, control: textInput({id: 'event-title', value: event.title, required: true, extra: {autofocus: true}})})}
      ${field({id: 'event-category', label: t('Category'), wide: true, control: selectInput({id: 'event-category', value: eventCategory(event)[0], options: EVENT_CATEGORIES})})}
      <div class="sm:col-span-2">${switchRow({id: 'event-allday', label: t("All day"), checked: event.allDay})}</div>
      ${field({id: 'event-start', label: t("Starts"), required: true, control: textInput({id: 'event-start', type, value: event.start, required: true})})}
      ${field({id: 'event-end', label: t("Ends"), required: true, control: textInput({id: 'event-end', type, value: event.end, required: true})})}
      ${field({
        id: 'event-location',
        label: t("Location"),
        wide: true,
        control: `${textInput({id: 'event-location', value: event.location})}<div class="relative mt-2 h-[180px] overflow-hidden rounded-md border border-line bg-[var(--line-2)]" data-location-map aria-hidden="true">
          <svg viewBox="0 0 480 180" class="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice">
            <path d="M0 60 H480 M0 130 H480 M140 0 V180 M330 0 V180" stroke="var(--line)" stroke-width="12"/>
            <path d="M-12 165 L492 30" stroke="var(--line)" stroke-width="9"/>
          </svg>
          <div class="absolute inset-0 flex items-center justify-center gap-1.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-muted" data-map-pin><path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
            <span class="max-w-[70%] truncate rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink [box-shadow:var(--shadow-1)]" data-map-label>${t("No location")}</span>
          </div>
        </div>`,
      })}
      ${multiselect({
        id: 'event-participants',
        label: t("Participants"),
        options: users.map(user => [user.id, `${user.name} · ${user.role}`]),
        selected: event.participantIds || [],
        placeholder: t("Search people\u2026"),
        wide: true,
      })}
      ${field({id: 'event-timezone', label: t('Event timezone'), hint: t('Timed events keep this timezone when the calendar timezone changes. All-day dates stay unchanged.'), control: selectInput({id: 'event-timezone', value: event.timeZone || DEFAULT_EVENT_ZONE, options: [...new Set([DEFAULT_EVENT_ZONE, 'UTC', ...(Intl.supportedValuesOf?.('timeZone') || [])])].map(zone => [zone, zone])})})}
      ${field({id: 'event-reminder', label: t("Reminder"), hint: t('Reminders appear in System Alerts while the app is open. All-day reminders use 09:00 in the event timezone. Enable event reminders in the calendar toolbar.'), control: selectInput({id: 'event-reminder', value: event.reminder, options: REMINDERS})})}
      ${field({id: 'event-repeat', label: t("Repeat"), control: selectInput({id: 'event-repeat', value: event.repeat, options: REPEATS})})}
      ${field({id: 'event-repeat-until', label: t('Repeat until'), hint: t('Optional last occurrence date.'), control: textInput({id: 'event-repeat-until', type: 'date', value: event.repeatUntil || ''})})}
      ${field({id: 'event-description', label: t("Description"), wide: true, control: textarea({id: 'event-description', value: event.description, rows: 4})})}
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
    /* Title, status (Today/Upcoming/Past) and "All day" are in the panel
       header; a timezone only means something for a timed event. */
    return `<dl class="${VIEW_LIST_CLASS}">
      ${viewRow('Starts', escapeHtml(stamp(event.start)))}
      ${viewRow('Ends', escapeHtml(stamp(event.end)))}
      ${event.allDay ? '' : viewRow('Event timezone', escapeHtml(event.timeZone || DEFAULT_EVENT_ZONE))}
      ${viewRow('Location', escapeHtml(event.location || '—'))}
      ${viewRow('Category', escapeHtml(t(eventCategory(event)[1])))}
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
      label.textContent = value || t('No location')
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
      category: body.querySelector('#event-category').value,
      participantIds: multiselectValues(body, 'event-participants'),
      reminder: body.querySelector('#event-reminder').value,
      repeat: body.querySelector('#event-repeat').value,
      repeatUntil: body.querySelector('#event-repeat-until').value,
      timeZone: body.querySelector('#event-timezone').value,
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
    if (!values.allDay) {
      if (eventInstant(values.start, values.timeZone) === null) errors['event-start'] = 'This time is invalid or ambiguous in the selected timezone. Choose another time.'
      if (eventInstant(values.end, values.timeZone) === null) errors['event-end'] = 'This time is invalid or ambiguous in the selected timezone. Choose another time.'
    }
    if (values.repeat !== 'none' && values.repeatUntil && values.repeatUntil < values.start.slice(0, 10)) errors['event-repeat-until'] = 'Repeat end must not precede the first occurrence.'
    Object.entries(errors).forEach(([id, message]) => setFieldError(body, id, message))
    const first = Object.entries(errors).find(([, message]) => message)
    if (first) body.querySelector(`#${first[0]}`).focus()
    return !first
  }

  function openEvent(id, prefill = {}, {edit = false, occurrence = null} = {}) {
    const opener = document.activeElement
    const focusAttribute = ['data-agenda-event', 'data-cal-item', 'data-cal-slot', 'data-cal-select-day', 'data-collab-new'].find(attr => opener?.hasAttribute(attr))
    const focusSelector = focusAttribute ? `[${focusAttribute}="${CSS.escape(opener.getAttribute(focusAttribute))}"]` : null
    const existing = id ? store.getEntity('event', id) : null
    if (id && !existing) {
      toast({tone: 'warn', title: 'This event is no longer available', body: 'It may have been deleted.'})
      return
    }
    const start = nextHalfHour(localTime(eventInstant(store.now().slice(0, 16), DEFAULT_EVENT_ZONE) ?? Date.parse(store.now()), state.zone))
    const event = (occurrence ? {...occurrence, repeat: existing.repeat, repeatUntil: existing.repeatUntil} : existing) || {
      title: '',
      allDay: false,
      start,
      end: addMinutes(start, 60),
      location: '',
      participantIds: [users[0].id],
      reminder: 'none',
      repeat: 'none',
      timeZone: state.zone,
      description: '',
      ...prefill,
    }
    const ref = existing ? {type: 'event', id: existing.id} : null
    panel.open({
      ref,
      edit,
      onClose: () => {
        const target = (focusSelector && view()?.querySelector(focusSelector)) || (opener?.isConnected && opener) || view()?.querySelector('[data-collab-new]')
        target?.focus({preventScroll: true})
      },
      status: existing ? eventStatus(event) : undefined,
      title: existing ? titleOf(existing) : 'New event',
      description: existing
        ? [eventTiming(existing, todayKey()), existing.location].filter(Boolean).join(' · ')
        : 'Meetings, holidays and other time on the calendar.',
      render: body => {
        body.innerHTML = `${existing?.repeat && existing.repeat !== 'none' ? field({id: 'event-edit-scope', label: t('Apply changes to'), control: selectInput({id: 'event-edit-scope', value: occurrence ? 'this' : 'series', options: [['this', 'This occurrence'], ['future', 'This and future events'], ['series', 'Entire series']]})}) : ''}${editorMarkup(event)}`
        bindMultiselect(body)
        bindAllDay(body)
        bindLocationMap(body)
        body.querySelector('#event-edit-scope')?.addEventListener('change', eventChange => {
          const source = eventChange.target.value === 'series' ? existing : event
          body.querySelector('#event-start').value = source.start
          body.querySelector('#event-end').value = source.end
        })
      },
      view: body => {
        body.innerHTML = viewMarkup(event)
        if (existing?.repeat && existing.repeat !== 'none') body.insertAdjacentHTML('afterbegin', `<p class="${HINT_CLASS} mb-3">${t('Repeating event. Edit this occurrence, future events, or the entire series.')}</p>`)
      },
      save: async body => {
        const values = readEditor(body)
        if (!validate(body, values)) return false
        if (!(await beforeAction(document.querySelector('#collab-panel [data-panel-save]')))) return false
        if (existing) {
          const scope = body.querySelector('#event-edit-scope')?.value || 'series'
          const key = occurrence?.occurrenceKey || existing.start.slice(0, 10)
          if (scope === 'this') store.updateEntity('event', existing.id, {exceptions: {...existing.exceptions, [key]: {...values, repeat: 'none'}}})
          else if (scope === 'future' && key !== existing.start.slice(0, 10)) {
            const pastExceptions = Object.fromEntries(Object.entries(existing.exceptions || {}).filter(([date]) => date < key))
            const futureExceptions = Object.fromEntries(Object.entries(existing.exceptions || {}).filter(([date]) => date >= key))
            store.updateEntity('event', existing.id, {repeatUntil: shiftWall(key, -1), exceptions: pastExceptions})
            const next = store.createEntity('event', {...existing, ...values, exceptions: values.repeat === 'none' ? {} : futureExceptions})
            for (const item of store.getRelatedItems('event', existing.id)) store.link({type: 'event', id: next.id}, item.ref)
          } else store.updateEntity('event', existing.id, {...values, exceptions: values.repeat === 'none' ? {} : existing.exceptions})
          toast({tone: 'ok', title: 'Event saved', body: values.title})
        } else {
          store.createEntity('event', values)
          toast({tone: 'ok', title: 'Event created', body: values.title})
        }
        return true
      },
      menu: existing ? (existing.repeat && existing.repeat !== 'none' ? [
        {label: t('Delete this occurrence'), icon: 'i-trash', danger: true, run: () => deleteOccurrence(existing, occurrence?.occurrenceKey || existing.start.slice(0, 10), false)},
        {label: t('Delete this and future events'), icon: 'i-trash', danger: true, run: () => deleteOccurrence(existing, occurrence?.occurrenceKey || existing.start.slice(0, 10), true)},
        {label: t('Delete series'), icon: 'i-trash', danger: true, run: () => deleteEvent(existing)},
      ] : [{label: t("Delete"), icon: 'i-trash', danger: true, run: () => deleteEvent(existing)}]) : [],
      related: ref ? (host, options) => related.render(host, ref, options) : null,
    })
  }

  async function deleteOccurrence(event, key, future) {
    if (!(await confirm({title: future ? 'Delete this and future events?' : 'Delete this occurrence?', body: future ? 'Earlier occurrences and their links are preserved.' : 'Other occurrences and links are preserved.', confirmLabel: 'Delete', tone: 'danger'}))) return
    if (!(await beforeAction())) return
    store.updateEntity('event', event.id, future ? {repeatUntil: shiftWall(key, -1)} : {exceptions: {...event.exceptions, [key]: {cancelled: true}}})
    await panel.close({force: true})
    toast({tone: 'info', title: 'Calendar updated'})
  }

  async function deleteEvent(event) {
    const ok = await confirm({
      title: 'Delete this event?',
      body: 'The event is removed. Linked items keep the link and show it as unavailable until someone removes it. Linked activities are not changed.',
      confirmLabel: t("Delete"),
      tone: 'danger',
    })
    if (!ok || !(await beforeAction())) return
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
    refreshLocale() { if (built) { renderAll() } },
    get roots() {
      return view() ? [view()] : []
    },
    activate({openId, occurrenceKey} = {}) {
      if (!view()) return
      if (!built) build()
      if (!state.date) state.date = todayKey()
      if (openId) {
        const event = store.getEntity('event', openId)
        if (event) {
          state.date = occurrenceKey || event.start.slice(0, 10)
          state.selectedDay = state.date
          state.selectedId = occurrenceKey && event.repeat && event.repeat !== 'none' ? `${event.id}@${occurrenceKey}` : event.id
        }
      }
      renderAll()
      unsubscribe?.()
      /* The participants filter row and the conflict notice both read the
         store, so a save or delete repaints the whole screen, not just the
         grid. */
      unsubscribe = store.subscribe(() => {
        if (view() && !view().hidden) renderAll()
      })
      if (openId) {
        const series = store.getEntity('event', openId)
        const item = series && occurrenceKey ? expandEvents([series], occurrenceKey, occurrenceKey, series.timeZone || DEFAULT_EVENT_ZONE).find(item => item.occurrenceKey === occurrenceKey) : null
        openEvent(openId, {}, {occurrence: item})
      }
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
