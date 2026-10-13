// Activities — assignable work, in Kanban (by status) and Calendar views.
// Due date and scheduled time are separate: only a scheduled start puts an
// activity on the calendar; a due date alone keeps it in Kanban, and no
// time is ever invented for it. The activity kind drives the prototype's
// shortcuts: Email opens a linked draft, Meeting creates or opens one
// linked event (never a second one).
import {
  escapeHtml,
  icon,
  field,
  textInput,
  textarea,
  selectInput,
  setFieldError,
  searchBox,
  toolbarSelect,
  toolbarToggle,
  segmented,
  emptyState,
  GRID_CLASS,
  HINT_CLASS,
} from '../../components/collab/fields.js'
import {renderBoard} from '../../components/collab/kanban.js'
import {renderCalendar, calendarToolbar, bindCalendarToolbar, calendarRange, shiftDate} from '../../components/collab/calendar.js'
import {
  TYPE_META,
  ACTIVITY_KINDS,
  ACTIVITY_STATUSES,
  PRIORITIES,
  kindLabel,
  kindIcon,
  statusLabel,
  isOverdue,
  isOpenActivity,
  activityTiming,
  userName,
  titleOf,
  searchText,
} from '../../components/collab/meta.js'
import {addDays, addMinutes, isValidDateTime} from '../../core/collab-dates.js'

const DURATIONS = [15, 30, 45, 60, 90, 120].map(minutes => [String(minutes), `${minutes} min`])
const CHIP = 'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs'

export function createActivities({store, toast, panel, related, confirm, goHome, users, currentUserId, openItem, composeMailFor}) {
  const view = () => document.querySelector('.activities-view')
  const state = {view: 'kanban', query: '', assignee: '', kind: '', overdueOnly: false, showHidden: false, calMode: 'week', calDate: null}
  let built = false
  let unsubscribe = null
  let calendarItems = []

  const todayKey = () => store.now().slice(0, 10)
  const linkedEvent = activity =>
    store.getRelatedItems('activity', activity.id).find(item => item.ref.type === 'event' && item.entity)

  function filtered() {
    const query = state.query.trim().toLowerCase()
    return store
      .listEntities('activity')
      .filter(a => state.showHidden || (!a.archived && a.status !== 'cancelled'))
      .filter(a => !query || searchText(a).includes(query))
      .filter(a => !state.assignee || a.assigneeId === (state.assignee === 'me' ? currentUserId : state.assignee))
      .filter(a => !state.kind || a.kind === state.kind)
      .filter(a => !state.overdueOnly || isOverdue(a, todayKey()))
      .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || titleOf(a).localeCompare(titleOf(b)))
  }

  function cardMarkup(activity) {
    const timing = activityTiming(activity, todayKey())
    return `<span class="flex items-center gap-1.5 text-xs text-muted">${icon(kindIcon(activity.kind), 12)}<span>${escapeHtml(kindLabel(activity.kind))}</span>
        ${activity.priority === 'high' ? '<span class="badge danger ms-auto">High</span>' : ''}
        ${activity.archived ? '<span class="badge gray ms-auto">Archived</span>' : ''}</span>
      <span class="card-title mt-1 block text-[13px] font-semibold text-ink [overflow-wrap:anywhere]" dir="auto">${escapeHtml(titleOf(activity))}</span>
      <span class="mt-1 block text-xs text-muted">${escapeHtml(userName(activity.assigneeId, users))}</span>
      ${
        timing.length
          ? `<span class="mt-2 flex flex-wrap gap-1">${timing
              .map(text =>
                text.startsWith('Overdue')
                  ? `<span class="${CHIP} bg-[var(--danger-soft-bg)] font-semibold text-[color:var(--danger)]">${icon('i-warn', 11)}${escapeHtml(text)}</span>`
                  : `<span class="${CHIP} bg-[var(--line-2)] text-ink">${icon(text.startsWith('Scheduled') ? 'i-clock' : 'i-check', 11)}${escapeHtml(text)}</span>`
              )
              .join('')}</span>`
          : ''
      }`
  }

  function buildToolbar() {
    const host = view().querySelector('[data-collab-toolbar]')
    host.innerHTML = `${searchBox({id: 'activities-search', label: 'Search activities', value: state.query})}
      ${toolbarSelect({id: 'activities-assignee', label: 'Assignee', value: state.assignee, options: [['', 'Everyone'], ['me', 'Me'], ...users.map(user => [user.id, user.name])]})}
      ${toolbarSelect({id: 'activities-kind', label: 'Kind', value: state.kind, options: [['', 'All kinds'], ...ACTIVITY_KINDS.map(([id, label]) => [id, label])]})}
      ${toolbarToggle({id: 'activities-overdue', label: 'Overdue only', checked: state.overdueOnly})}
      ${toolbarToggle({id: 'activities-hidden', label: 'Show cancelled & archived', checked: state.showHidden})}
      <span class="ms-auto">${segmented({label: 'View', views: [['kanban', 'Kanban'], ['calendar', 'Calendar']], current: state.view})}</span>`
    const bind = (id, key, read = el => el.value) =>
      host.querySelector(`#${id}`).addEventListener(id === 'activities-search' ? 'input' : 'change', event => {
        state[key] = read(event.target)
        renderBody()
      })
    bind('activities-search', 'query')
    bind('activities-assignee', 'assignee')
    bind('activities-kind', 'kind')
    bind('activities-overdue', 'overdueOnly', el => el.checked)
    bind('activities-hidden', 'showHidden', el => el.checked)
    host.querySelectorAll('[data-view-switch] button').forEach(button =>
      button.addEventListener('click', () => setView(button.dataset.value))
    )
  }

  function setView(name) {
    state.view = name
    view().querySelectorAll('[data-view-switch] button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.value === name)))
    renderBody()
  }

  function renderBody() {
    const body = view().querySelector('[data-collab-body]')
    if (state.view === 'calendar') return renderCalendarView(body)
    const activities = filtered()
    const columns = [
      ['planned', 'Planned'],
      ['in_progress', 'In progress'],
      ['done', 'Done'],
      ...(state.showHidden ? [['cancelled', 'Cancelled']] : []),
    ]
    renderBoard(body, {
      columns: columns.map(([id, label]) => ({id, label, items: activities.filter(a => a.status === id)})),
      renderCard: cardMarkup,
      titleOf,
      emptyText: 'No activities here.',
      onOpen: id => openActivity(id),
      onMove: (id, status) => {
        const activity = store.getEntity('activity', id)
        if (!activity || activity.status === status) return
        store.updateEntity('activity', id, {status})
        toast({tone: 'info', title: `Moved to ${statusLabel(status)}`, body: titleOf(activity)})
        view().querySelector(`[data-move="${CSS.escape(id)}"]`)?.focus()
      },
    })
  }

  function renderCalendarView(body) {
    const {from, to} = calendarRange(state.calMode, state.calDate)
    const scheduled = store.scheduledActivitiesInRange(from, to).filter(a => filtered().some(f => f.id === a.id))
    calendarItems = scheduled.map(activity => ({
      id: activity.id,
      title: titleOf(activity),
      start: activity.scheduledStart,
      end: addMinutes(activity.scheduledStart, Number(activity.durationMin) || 30),
      allDay: false,
      label: kindLabel(activity.kind),
    }))
    const unscheduled = filtered().filter(a => isOpenActivity(a) && !store.isScheduled(a)).length
    body.innerHTML = `${calendarToolbar({mode: state.calMode, date: state.calDate})}
      <p class="my-2 flex flex-wrap items-center gap-2 rounded-md bg-[var(--line-2)] px-3 py-2 text-[13px] text-ink" data-unscheduled-notice>
        ${icon('i-info')}<span>${unscheduled} unscheduled ${unscheduled === 1 ? 'activity isn’t' : 'activities aren’t'} shown here — only activities with a scheduled time appear on the calendar. They stay in Kanban.</span>
        <button type="button" class="lbtn ms-auto" data-show-kanban>Show Kanban</button>
      </p>
      <div data-calendar></div>`
    bindCalendarToolbar(body, {
      onPrev: () => goCal(shiftDate(state.calMode, state.calDate, -1)),
      onNext: () => goCal(shiftDate(state.calMode, state.calDate, 1)),
      onToday: () => goCal(todayKey()),
      onMode: mode => {
        state.calMode = mode
        renderBody()
        view().querySelector(`[data-cal-modes] [data-value="${mode}"]`)?.focus()
      },
    })
    body.querySelector('[data-show-kanban]').addEventListener('click', () => setView('kanban'))
    renderCalendar(body.querySelector('[data-calendar]'), {
      mode: state.calMode,
      date: state.calDate,
      todayKey: todayKey(),
      nowKey: store.now(),
      items: calendarItems,
      onOpen: index => openActivity(calendarItems[index].id),
      onSlot: ({date, time}) => openActivity(null, {scheduledStart: `${date}T${time || '09:00'}`, durationMin: 30}),
      onMore: date => {
        state.calMode = 'day'
        goCal(date)
      },
    })
  }

  function goCal(date) {
    state.calDate = date
    renderBody()
  }

  /* ---------- editor ---------- */
  function actionsMarkup(activity) {
    if (!activity.id) return ''
    const buttons = []
    if (isOpenActivity(activity)) buttons.push(`<button type="button" class="lbtn" data-action="done">${icon('i-check')} Mark done</button>`)
    else if (activity.status === 'done') buttons.push(`<button type="button" class="lbtn" data-action="follow-up">${icon('i-plus')} Schedule follow-up</button>`)
    if (activity.kind === 'email') buttons.push(`<button type="button" class="lbtn" data-action="compose">${icon('i-mail')} Compose email</button>`)
    if (activity.kind === 'meeting') {
      if (linkedEvent(activity)) buttons.push(`<button type="button" class="lbtn" data-action="open-event">${icon('i-clock')} Open linked event</button>`)
      else {
        const scheduled = isValidDateTime(activity.scheduledStart)
        buttons.push(
          `<button type="button" class="lbtn" data-action="create-event"${scheduled ? '' : ' disabled aria-describedby="activity-event-hint"'}>${icon('i-plus')} Create event</button>`,
          `<button type="button" class="lbtn" data-action="link-event">${icon('i-flow')} Link existing event…</button>`
        )
        if (!scheduled) buttons.push(`<p class="${HINT_CLASS} w-full" id="activity-event-hint">Schedule a time and save to create an event from this meeting.</p>`)
      }
    }
    return `<div class="mb-4 flex flex-wrap gap-2" data-activity-actions>${buttons.join('')}</div>`
  }

  function editorMarkup(activity) {
    const scheduled = Boolean(activity.scheduledStart)
    return `${actionsMarkup(activity)}<div class="${GRID_CLASS}">
      ${field({id: 'activity-kind', label: 'Kind', required: true, control: selectInput({id: 'activity-kind', value: activity.kind, options: ACTIVITY_KINDS.map(([id, label]) => [id, label])})})}
      ${field({id: 'activity-assignee', label: 'Assigned to', required: true, control: selectInput({id: 'activity-assignee', value: activity.assigneeId, options: users.map(user => [user.id, `${user.name} · ${user.role}`])})})}
      ${field({id: 'activity-summary', label: 'Summary', required: true, wide: true, control: textInput({id: 'activity-summary', value: activity.summary, required: true, extra: {autofocus: true}})})}
      ${field({id: 'activity-status', label: 'Status', control: selectInput({id: 'activity-status', value: activity.status, options: ACTIVITY_STATUSES})})}
      ${field({id: 'activity-priority', label: 'Priority', control: selectInput({id: 'activity-priority', value: activity.priority, options: PRIORITIES})})}
      ${field({
        id: 'activity-due',
        label: 'Due date',
        hint: 'A due date alone does not put the activity on the calendar.',
        wide: true,
        control: `<div class="flex flex-wrap items-center gap-2">${textInput({id: 'activity-due', type: 'date', value: activity.dueDate || '', describedBy: 'activity-due-hint', extra: {class: 'max-w-[200px]'}})}
          <button type="button" class="lbtn" data-due-shift="1">+1 day</button><button type="button" class="lbtn" data-due-shift="7">+1 week</button></div>`,
      })}
      <details class="sm:col-span-2 rounded-md border border-line px-3 py-2"${scheduled ? ' open' : ''}>
        <summary class="cursor-pointer text-[13px] font-medium text-ink">Schedule a time</summary>
        <div class="${GRID_CLASS} mt-3">
          ${field({id: 'activity-start', label: 'Starts', control: textInput({id: 'activity-start', type: 'datetime-local', value: activity.scheduledStart || ''})})}
          ${field({id: 'activity-duration', label: 'Duration', control: selectInput({id: 'activity-duration', value: String(activity.durationMin || 30), options: DURATIONS})})}
          <div class="sm:col-span-2 flex flex-wrap items-center gap-2"><button type="button" class="lbtn" id="activity-schedule-clear">${icon('i-x')} Remove scheduled time</button><span class="${HINT_CLASS}">Scheduled activities appear on the Activities calendar.</span></div>
        </div>
      </details>
      ${field({id: 'activity-notes', label: 'Notes', wide: true, control: textarea({id: 'activity-notes', value: activity.notes, rows: 4})})}
    </div>`
  }

  function bindEditor(body, activity) {
    body.querySelectorAll('[data-due-shift]').forEach(button =>
      button.addEventListener('click', () => {
        const input = body.querySelector('#activity-due')
        input.value = addDays(input.value || todayKey(), Number(button.dataset.dueShift))
      })
    )
    body.querySelector('#activity-schedule-clear').addEventListener('click', () => {
      body.querySelector('#activity-start').value = ''
    })
    body.querySelector('[data-action="done"]')?.addEventListener('click', () => markDone(activity))
    body.querySelector('[data-action="follow-up"]')?.addEventListener('click', () => followUp(activity))
    body.querySelector('[data-action="compose"]')?.addEventListener('click', async () => {
      if (await panel.close()) composeMailFor({type: 'activity', id: activity.id})
    })
    body.querySelector('[data-action="open-event"]')?.addEventListener('click', () => openItem(linkedEvent(activity).ref))
    body.querySelector('[data-action="create-event"]')?.addEventListener('click', () => createEvent(activity))
    body.querySelector('[data-action="link-event"]')?.addEventListener('click', () =>
      related.openPicker({type: 'activity', id: activity.id}, {types: ['event'], onClose: () => openActivity(activity.id)})
    )
  }

  function readEditor(body) {
    const start = body.querySelector('#activity-start').value
    return {
      kind: body.querySelector('#activity-kind').value,
      assigneeId: body.querySelector('#activity-assignee').value,
      summary: body.querySelector('#activity-summary').value.trim(),
      status: body.querySelector('#activity-status').value,
      priority: body.querySelector('#activity-priority').value,
      dueDate: body.querySelector('#activity-due').value,
      scheduledStart: start,
      durationMin: start ? Number(body.querySelector('#activity-duration').value) : null,
      notes: body.querySelector('#activity-notes').value,
    }
  }

  function markDone(activity) {
    store.updateEntity('activity', activity.id, {status: 'done'})
    const done = store.getEntity('activity', activity.id)
    toast({tone: 'ok', title: 'Activity done', body: titleOf(done), action: 'Schedule follow-up', onAction: () => followUp(done)})
    openActivity(activity.id)
  }

  function followUp(source) {
    const next = store.createEntity('activity', {
      kind: 'todo',
      summary: `Follow up: ${titleOf(source)}`,
      notes: '',
      assigneeId: source.assigneeId,
      status: 'planned',
      priority: 'normal',
      archived: false,
    })
    store.link({type: 'activity', id: source.id}, {type: 'activity', id: next.id})
    toast({tone: 'ok', title: 'Follow-up created and linked', body: titleOf(next)})
    openActivity(next.id)
  }

  function createEvent(activity) {
    if (linkedEvent(activity)) return openItem(linkedEvent(activity).ref)
    const event = store.createEntity('event', {
      title: titleOf(activity),
      allDay: false,
      start: activity.scheduledStart,
      end: addMinutes(activity.scheduledStart, Number(activity.durationMin) || 60),
      location: '',
      participantIds: [activity.assigneeId],
      reminder: 'none',
      repeat: 'none',
      description: activity.notes || '',
    })
    store.link({type: 'activity', id: activity.id}, {type: 'event', id: event.id})
    toast({tone: 'ok', title: 'Event created and linked', body: titleOf(event)})
    openItem({type: 'event', id: event.id})
  }

  function validate(body, values) {
    setFieldError(body, 'activity-summary', values.summary ? '' : 'Summary is required.')
    const startInvalid = values.scheduledStart && !isValidDateTime(values.scheduledStart)
    setFieldError(body, 'activity-start', startInvalid ? 'Enter a valid date and time, or remove the scheduled time.' : '')
    if (!values.summary) body.querySelector('#activity-summary').focus()
    else if (startInvalid) body.querySelector('#activity-start').focus()
    return values.summary && !startInvalid
  }

  function openActivity(id, prefill = {}) {
    const existing = id ? store.getEntity('activity', id) : null
    if (id && !existing) {
      toast({tone: 'warn', title: 'This activity is no longer available', body: 'It may have been deleted.'})
      return
    }
    const activity = existing || {kind: 'todo', summary: '', notes: '', assigneeId: currentUserId, status: 'planned', priority: 'normal', dueDate: '', scheduledStart: '', durationMin: 30, archived: false, ...prefill}
    const ref = existing ? {type: 'activity', id: existing.id} : null
    panel.open({
      ref,
      typeLabel: TYPE_META.activity.label,
      typeIcon: TYPE_META.activity.icon,
      title: existing ? titleOf(existing) : 'New activity',
      render: body => {
        body.innerHTML = editorMarkup(activity)
        bindEditor(body, activity)
      },
      save: body => {
        const values = readEditor(body)
        if (!validate(body, values)) return false
        if (existing) {
          store.updateEntity('activity', existing.id, values)
          toast({tone: 'ok', title: 'Activity saved', body: values.summary})
        } else {
          store.createEntity('activity', {...values, archived: false})
          toast({tone: 'ok', title: 'Activity created', body: values.summary})
        }
        return true
      },
      menu: existing
        ? [
            existing.archived
              ? {label: 'Restore', icon: 'i-undo', run: () => setArchived(existing, false)}
              : {label: 'Archive', icon: 'i-archive', run: () => setArchived(existing, true)},
            {label: 'Delete', icon: 'i-trash', danger: true, run: () => deleteActivity(existing)},
          ]
        : [],
      related: ref ? host => related.render(host, ref) : null,
    })
  }

  async function setArchived(activity, archived) {
    store.updateEntity('activity', activity.id, {archived})
    await panel.close({force: true})
    toast({tone: 'info', title: archived ? 'Activity archived' : 'Activity restored', body: archived ? 'Hidden from default views. Turn on “Show cancelled & archived” to find it.' : titleOf(activity)})
  }

  async function deleteActivity(activity) {
    const ok = await confirm({
      title: 'Delete this activity?',
      body: 'The activity is removed. Linked items keep the link and show it as unavailable until someone removes it.',
      confirmLabel: 'Delete',
      tone: 'danger',
    })
    if (!ok) return
    store.deleteEntity('activity', activity.id)
    await panel.close({force: true})
    toast({tone: 'info', title: 'Activity deleted', body: titleOf(activity)})
  }

  function build() {
    const root = view()
    root.querySelector('[data-collab-new]').addEventListener('click', () => openActivity(null))
    root.querySelector('[data-collab-home]').addEventListener('click', event => {
      event.preventDefault()
      goHome()
    })
    built = true
  }

  return {
    id: 'activities',
    get roots() {
      return view() ? [view()] : []
    },
    activate({openId} = {}) {
      if (!view()) return
      if (!built) build()
      if (!state.calDate) state.calDate = todayKey()
      buildToolbar()
      renderBody()
      unsubscribe?.()
      unsubscribe = store.subscribe(() => {
        if (view() && !view().hidden) renderBody()
      })
      if (openId) openActivity(openId)
    },
    deactivate() {
      unsubscribe?.()
      unsubscribe = null
    },
    dispose() {
      unsubscribe?.()
    },
    openActivity,
  }
}
