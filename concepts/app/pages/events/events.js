// Events — calendar only (Day / Week / Month). Events show by their own
// start/end; nothing else is drawn here (timed activities live on the
// Activities calendar, notes never appear on a calendar). Reminder and
// repeat are stored and shown, but the prototype neither notifies nor
// expands occurrences, and the editor says so.
import {
  escapeHtml,
  field,
  textInput,
  textarea,
  selectInput,
  checkbox,
  setFieldError,
  GRID_CLASS,
  SECTION_TITLE_CLASS,
  HINT_CLASS,
} from '../../components/collab/fields.js'
import {renderCalendar, calendarToolbar, bindCalendarToolbar, calendarRange, shiftDate} from '../../components/collab/calendar.js'
import {TYPE_META, titleOf} from '../../components/collab/meta.js'
import {addMinutes, nextHalfHour, isValidDate, isValidDateTime} from '../../core/collab-dates.js'

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
  const state = {mode: 'month', date: null}
  let built = false
  let unsubscribe = null
  let visibleItems = []

  const todayKey = () => store.now().slice(0, 10)

  function renderToolbar() {
    const host = view().querySelector('[data-collab-toolbar]')
    host.innerHTML = calendarToolbar({mode: state.mode, date: state.date})
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
    const {from, to} = calendarRange(state.mode, state.date)
    const events = store.eventsInRange(from, to)
    visibleItems = events.map(event => ({
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
      <div class="sm:col-span-2">${checkbox({id: 'event-allday', label: 'All day', checked: event.allDay})}</div>
      ${field({id: 'event-start', label: 'Starts', required: true, control: textInput({id: 'event-start', type, value: event.start, required: true})})}
      ${field({id: 'event-end', label: 'Ends', required: true, control: textInput({id: 'event-end', type, value: event.end, required: true})})}
      ${field({id: 'event-location', label: 'Location', wide: true, control: textInput({id: 'event-location', value: event.location})})}
      <fieldset class="sm:col-span-2">
        <legend class="${SECTION_TITLE_CLASS}">Participants</legend>
        <div class="grid grid-cols-1 gap-x-3 sm:grid-cols-2">${users
          .map(user => checkbox({id: `event-participant-${user.id}`, label: `${user.name} · ${user.role}`, checked: event.participantIds.includes(user.id)}))
          .join('')}</div>
      </fieldset>
      ${field({id: 'event-reminder', label: 'Reminder', hint: 'Prototype: no notification is sent.', control: selectInput({id: 'event-reminder', value: event.reminder, options: REMINDERS})})}
      ${field({id: 'event-repeat', label: 'Repeat', hint: 'Prototype: only the first occurrence is shown on the calendar.', control: selectInput({id: 'event-repeat', value: event.repeat, options: REPEATS})})}
      ${field({id: 'event-description', label: 'Description', wide: true, control: textarea({id: 'event-description', value: event.description, rows: 4})})}
    </div>`
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

  function openEvent(id, prefill = {}) {
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
      typeLabel: TYPE_META.event.label,
      typeIcon: TYPE_META.event.icon,
      title: existing ? titleOf(existing) : 'New event',
      render: body => {
        body.innerHTML = editorMarkup(event)
        bindAllDay(body)
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
      unsubscribe = store.subscribe(() => {
        if (view() && !view().hidden) renderBody()
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
  }
}
