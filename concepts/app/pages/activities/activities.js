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
  GRID_CLASS,
  HINT_CLASS,
  VIEW_LIST_CLASS,
  viewRow,
} from '../../components/collab/fields.js'
import {renderBoard} from '../../components/collab/kanban.js'
import {renderCalendar, calendarToolbar, bindCalendarToolbar, calendarRange, shiftDate} from '../../components/collab/calendar.js'
import {
  menuItemRadio,
  menuItemCheck,
  menuGroupLabel,
  menuDetails,
  filterChip,
  clearFilterButton,
  searchField,
  viewMenu,
  toolbarRow,
  closeOwnedMenu,
} from '../../components/collab/list-toolbar.js'
import {
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
  assigneeIdsOf,
} from '../../components/collab/meta.js'
import {multiselect, multiselectValues, bindMultiselect} from '../../components/collab/multiselect.js'
import {addDays, addMinutes, isValidDateTime, formatDate, formatTime} from '../../core/collab-dates.js'

const DURATIONS = [15, 30, 45, 60, 90, 120].map(minutes => [String(minutes), `${minutes} min`])
const CHIP = 'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs'
/* The view menu's two entries and the dot on each card's status chip —
   the panel badge uses the same tones so one status reads one color
   everywhere. The board is the default; the calendar is the other view. */
const VIEW_PRESENTATION = {
  kanban: {label: 'Kanban', icon: 'i-board'},
  calendar: {label: 'Calendar', icon: 'i-cal'},
}
const QUICK_FILTERS = [
  ['all', 'All activities', 'i-list'],
  ['open', 'Open', 'i-clock'],
  ['done', 'Done', 'i-check'],
]
const STATUS_TONE = {planned: 'gray', in_progress: 'fix', done: 'ok', cancelled: 'danger'}
const STATUS_DOT = {
  planned: 'bg-[var(--muted)]',
  in_progress: 'bg-[var(--info)]',
  done: 'bg-[var(--success)]',
  cancelled: 'bg-[var(--danger)]',
}

export function createActivities({store, toast, panel, related, confirm, goHome, users, currentUserId, openItem, composeMailFor}) {
  const view = () => document.querySelector('.activities-view')
  const state = {
    view: 'kanban',
    query: '',
    quick: 'all',
    assignee: '',
    kind: '',
    overdueOnly: false,
    showHidden: false,
    calMode: 'week',
    calDate: null,
  }
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
      .filter(a => (state.quick === 'open' ? isOpenActivity(a) : state.quick === 'done' ? a.status === 'done' : true))
      .filter(a => !query || searchText(a).includes(query))
      .filter(a => !state.assignee || assigneeIdsOf(a).includes(state.assignee === 'me' ? currentUserId : state.assignee))
      .filter(a => !state.kind || a.kind === state.kind)
      .filter(a => !state.overdueOnly || isOverdue(a, todayKey()))
      .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || titleOf(a).localeCompare(titleOf(b)))
  }

  const statusChip = status =>
    `<span class="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] font-semibold text-ink"><span class="size-1.5 rounded-full ${
      STATUS_DOT[status] || 'bg-[var(--muted)]'
    }" aria-hidden="true"></span>${escapeHtml(statusLabel(status))}</span>`

  const priorityChip = priority => {
    const label = PRIORITIES.find(([value]) => value === priority)?.[1] ?? priority
    return priority === 'high'
      ? '<span class="rounded-full border border-[var(--danger-soft-line)] bg-[var(--danger-soft-bg)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--danger)]">High</span>'
      : `<span class="rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted">${escapeHtml(label)}</span>`
  }

  /** Card: status and priority chips (the kebab sits over the reserved end
   *  of that row), the title, the first line of notes, kind plus due or
   *  scheduled wording, then the owner with the link count — real data
   *  only, the prototype has no subtasks or comments to count. */
  function cardMarkup(activity) {
    const timing = activityTiming(activity, todayKey())
    const owners = assigneeIdsOf(activity).map(id => userName(id, users))
    const owner = owners[0] || 'Unassigned'
    const links = store.getRelatedItems('activity', activity.id).length
    const excerpt = (activity.notes || '')
      .split('\n')
      .map(line => line.trim())
      .find(Boolean)
    return `<span class="flex flex-wrap items-center gap-1.5 pe-10">${statusChip(activity.status)}${priorityChip(activity.priority)}${
      activity.archived ? '<span class="badge gray ms-auto">Archived</span>' : ''
    }</span>
      <span class="card-title mt-1.5 block text-[13px] font-semibold text-ink [overflow-wrap:anywhere]" dir="auto">${escapeHtml(titleOf(activity))}</span>
      ${excerpt ? `<span class="mt-1 line-clamp-2 block text-xs text-muted" dir="auto">${escapeHtml(excerpt)}</span>` : ''}
      <span class="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">${icon(kindIcon(activity.kind), 12)}<span>${escapeHtml(
        kindLabel(activity.kind)
      )}</span>${timing
        .map(text =>
          text.startsWith('Overdue')
            ? `<span class="${CHIP} bg-[var(--danger-soft-bg)] font-semibold text-[color:var(--danger)]">${icon('i-warn', 11)}${escapeHtml(text)}</span>`
            : `<span class="${CHIP} bg-[var(--line-2)] text-ink">${icon(text.startsWith('Scheduled') ? 'i-clock' : 'i-cal', 11)}${escapeHtml(text)}</span>`
        )
        .join('')}</span>
      <span class="mt-2 flex items-center gap-1.5 [border-top:1px_dashed_var(--line)] pt-2 text-xs text-muted">
        <span class="inline-grid size-5 flex-none place-items-center rounded-full bg-[var(--line-2)] text-[10px] font-semibold text-ink" aria-hidden="true">${escapeHtml(
          owner.charAt(0)
        )}</span>
        <span class="min-w-0 truncate" title="${escapeHtml(owners.join(', '))}">${escapeHtml(owner)}${
          owners.length > 1
            ? `<span class="ms-1 rounded-full bg-[var(--line-2)] px-1.5 py-px text-[10px] font-semibold text-ink" title="${escapeHtml(
                owners.slice(1).join(', ')
              )}">+${owners.length - 1}</span>`
            : ''
        }</span>
        ${
          links
            ? `<span class="ms-auto inline-flex items-center gap-1">${icon('i-flow', 11)}${links}<span class="sr-only"> related items</span></span>`
            : ''
        }
      </span>`
  }

  /** Kebab markup for a card — the shell's shared .menu/.mlist handles
   *  open, outside click, Escape and arrow keys; only the pick itself is
   *  bound per render, and it closes the menu before acting. */
  const cardActionsMarkup = activity => {
    const id = escapeHtml(activity.id)
    return `<div class="menu">
      <button type="button" class="text-muted hover:text-ink" data-card-menu-btn="${id}" aria-haspopup="menu" aria-expanded="false" aria-label="Actions for ${escapeHtml(
        titleOf(activity)
      )}">${icon('i-dots', 14)}</button>
      <div class="mlist mend" role="menu" aria-label="Card actions">
        <button type="button" role="menuitem" data-card-action="edit">${icon('i-edit', 14)}<span>Edit</span></button>
        ${
          isOpenActivity(activity)
            ? `<button type="button" role="menuitem" data-card-action="done">${icon('i-check', 14)}<span>Mark done</span></button>`
            : ''
        }
        <button type="button" role="menuitem" class="dan" data-card-action="delete">${icon('i-trash', 14)}<span>Delete</span></button>
      </div>
    </div>`
  }

  function bindCardActions(root) {
    root.querySelectorAll('[data-card-action]').forEach(item =>
      item.addEventListener('click', () => {
        const menu = item.closest('.menu')
        menu.querySelector('.mlist').classList.remove('open')
        menu.querySelector('[aria-haspopup="menu"]').setAttribute('aria-expanded', 'false')
        const id = item.closest('[data-card-id]')?.dataset.cardId
        if (!id) return
        const action = item.dataset.cardAction
        if (action === 'edit') openActivity(id, {}, {edit: true})
        else if (action === 'done') {
          const activity = store.getEntity('activity', id)
          if (activity) markDone(activity)
        } else if (action === 'delete') {
          const activity = store.getEntity('activity', id)
          if (activity) deleteActivity(activity)
        }
      })
    )
  }

  const fieldFilterCount = () => [state.assignee, state.kind, state.overdueOnly, state.showHidden].filter(Boolean).length
  const filterActive = () => Boolean(fieldFilterCount() || state.quick !== 'all')

  /** Applied field filters, inline as removable chips like the invoices
   *  list — the quick filter is already named by its own menu. */
  const filterChips = () =>
    [
      state.assignee
        ? filterChip({attr: 'filter-remove', value: 'assignee', label: `Assignee: ${state.assignee === 'me' ? 'Me' : userName(state.assignee, users)}`})
        : '',
      state.kind ? filterChip({attr: 'filter-remove', value: 'kind', label: `Kind: ${kindLabel(state.kind)}`}) : '',
      state.overdueOnly ? filterChip({attr: 'filter-remove', value: 'overdue', label: 'Overdue only'}) : '',
      state.showHidden ? filterChip({attr: 'filter-remove', value: 'hidden', label: 'Show cancelled & archived'}) : '',
    ]
      .filter(Boolean)
      .join('')

  function buildToolbar() {
    const host = view().querySelector('[data-collab-toolbar]')
    /* The invoices list chrome: quick filter and "+ Filter" with inline
       chips on the left, search and the view menu on the right. The page
       header owns the one primary action — the toolbar never repeats it. */
    const quick = QUICK_FILTERS.find(([id]) => id === state.quick) || QUICK_FILTERS[0]
    const quickItems = QUICK_FILTERS.map(([id, label, iconName]) =>
      menuItemRadio({attr: 'quick-filter', value: id, label, iconName, checked: state.quick === id})
    ).join('')
    const filterItems = `${menuGroupLabel('Assignee')}${menuItemRadio({
      attr: 'filter-assignee',
      value: '',
      label: 'Everyone',
      checked: !state.assignee,
    })}${menuItemRadio({attr: 'filter-assignee', value: 'me', label: 'Me', checked: state.assignee === 'me'})}${users
      .map(user => menuItemRadio({attr: 'filter-assignee', value: user.id, label: user.name, checked: state.assignee === user.id}))
      .join('')}${menuGroupLabel('Kind')}${menuItemRadio({attr: 'filter-kind', value: '', label: 'All kinds', checked: !state.kind})}${ACTIVITY_KINDS.map(
      ([id, label]) => menuItemRadio({attr: 'filter-kind', value: id, label, checked: state.kind === id})
    ).join('')}${menuItemCheck({
      attr: 'filter-overdue',
      value: 'overdue',
      label: 'Overdue only',
      checked: state.overdueOnly,
      iconName: 'i-warn',
    })}${menuItemCheck({
      attr: 'filter-hidden',
      value: 'hidden',
      label: 'Show cancelled & archived',
      checked: state.showHidden,
      iconName: 'i-eye',
    })}`
    const presentation = VIEW_PRESENTATION[state.view]
    const viewOptions = Object.entries(VIEW_PRESENTATION)
      .map(([id, entry]) =>
        menuItemRadio({attr: 'view-select', value: id, label: `${entry.label} view`, iconName: entry.icon, checked: state.view === id})
      )
      .join('')
    host.innerHTML = `<div class="data-list-controls grid gap-2 mb-2.5">${toolbarRow({
      ariaLabel: 'Activities table controls',
      left: `${menuDetails({attr: 'quick-menu', iconName: quick[2], label: quick[1], items: quickItems})}${menuDetails({
        attr: 'filter-menu',
        iconName: 'i-plus',
        label: 'Filter',
        items: filterItems,
      })}${filterChips()}${filterActive() ? clearFilterButton({attr: 'clear-filters'}) : ''}`,
      right: `${searchField({attr: 'collab-search', label: 'activities', value: state.query})}${viewMenu({
        attr: 'view-menu',
        label: presentation.label,
        iconName: presentation.icon,
        options: viewOptions,
      })}`,
    })}</div>`
    const refresh = () => {
      buildToolbar()
      renderBody()
    }
    host.querySelectorAll('[data-quick-filter]').forEach(item =>
      item.addEventListener('click', event => {
        state.quick = item.dataset.quickFilter
        closeOwnedMenu(event.currentTarget)
        refresh()
      })
    )
    host.querySelectorAll('[data-filter-assignee]').forEach(item =>
      item.addEventListener('click', event => {
        state.assignee = item.dataset.filterAssignee
        closeOwnedMenu(event.currentTarget)
        refresh()
      })
    )
    host.querySelectorAll('[data-filter-kind]').forEach(item =>
      item.addEventListener('click', event => {
        state.kind = item.dataset.filterKind
        closeOwnedMenu(event.currentTarget)
        refresh()
      })
    )
    host.querySelectorAll('[data-filter-overdue], [data-filter-hidden]').forEach(item =>
      item.addEventListener('click', event => {
        if (item.hasAttribute('data-filter-overdue')) state.overdueOnly = !state.overdueOnly
        else state.showHidden = !state.showHidden
        closeOwnedMenu(event.currentTarget)
        refresh()
      })
    )
    host.querySelectorAll('[data-filter-remove]').forEach(item =>
      item.addEventListener('click', () => {
        const key = item.dataset.filterRemove
        if (key === 'assignee') state.assignee = ''
        else if (key === 'kind') state.kind = ''
        else if (key === 'overdue') state.overdueOnly = false
        else if (key === 'hidden') state.showHidden = false
        refresh()
      })
    )
    host.querySelector('[data-clear-filters]')?.addEventListener('click', () => {
      state.quick = 'all'
      state.assignee = ''
      state.kind = ''
      state.overdueOnly = false
      state.showHidden = false
      refresh()
    })
    const search = host.querySelector('[data-collab-search]')
    const searchClear = host.querySelector('[data-collab-search-clear]')
    search.addEventListener('input', event => {
      state.query = event.target.value
      searchClear.hidden = !state.query
      renderBody()
    })
    searchClear.addEventListener('click', () => {
      state.query = ''
      search.value = ''
      searchClear.hidden = true
      renderBody()
      search.focus()
    })
    host.querySelectorAll('[data-view-select]').forEach(item =>
      item.addEventListener('click', event => {
        state.view = item.dataset.viewSelect
        closeOwnedMenu(event.currentTarget)
        refresh()
      })
    )
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
      renderCardActions: cardActionsMarkup,
      titleOf,
      emptyText: 'No activities here.',
      /* Same "Move to" select as the notes board: the non-drag status
         path for keyboard and touch users; drag keeps working too. */
      onOpen: id => openActivity(id),
      onMove: (id, status) => {
        const activity = store.getEntity('activity', id)
        if (!activity || activity.status === status) return
        store.updateEntity('activity', id, {status})
        toast({tone: 'info', title: `Moved to ${statusLabel(status)}`, body: titleOf(activity)})
        view().querySelector(`[data-card-open="${CSS.escape(id)}"]`)?.focus()
      },
    })
    bindCardActions(body)
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
    body.querySelector('[data-show-kanban]').addEventListener('click', () => {
      state.view = 'kanban'
      buildToolbar()
      renderBody()
    })
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
      ${multiselect({id: 'activity-assignee', label: 'Assigned to', required: true, options: users.map(user => [user.id, `${user.name} · ${user.role}`]), selected: assigneeIdsOf(activity), placeholder: 'Search people…'})}
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
      <details class="sm:col-span-2 rounded-md border border-line bg-surface"${scheduled ? ' open' : ''}>
        <summary class="flex cursor-pointer list-none items-center gap-2 rounded-md px-3 py-2.5 text-[13px] font-medium text-ink hover:bg-[var(--line-2)] [&::-webkit-details-marker]:hidden">
          ${icon('i-clock', 14)}<span>Schedule a time</span>
          <span class="ms-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${scheduled ? 'bg-[var(--line-2)] text-ink' : 'text-muted'}" data-schedule-state>${scheduled ? 'Scheduled' : 'Not scheduled'}</span>
        </summary>
        <div class="border-t border-line px-3 py-3">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            ${field({id: 'activity-start', label: 'Starts', control: textInput({id: 'activity-start', type: 'datetime-local', value: activity.scheduledStart || ''})})}
            ${field({id: 'activity-duration', label: 'Duration', control: selectInput({id: 'activity-duration', value: String(activity.durationMin || 30), options: DURATIONS})})}
          </div>
          <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
            <button type="button" class="lbtn" id="activity-schedule-clear">${icon('i-x')} Remove scheduled time</button>
            <span class="${HINT_CLASS}">Scheduled activities appear on the Activities calendar.</span>
          </div>
        </div>
      </details>
      ${field({id: 'activity-notes', label: 'Notes', wide: true, control: textarea({id: 'activity-notes', value: activity.notes, rows: 4})})}
    </div>`
  }

  /* Read-only twin of the editor: keeps the action row (Mark done, Create
     event, …) because those act on the record, not on its fields — the form
     itself waits behind the panel's Edit. */
  function viewMarkup(activity) {
    const priorityLabel = id => PRIORITIES.find(([value]) => value === id)?.[1] ?? id
    const durationLabel = id => DURATIONS.find(([value]) => value === id)?.[1] ?? id
    const assigned = assigneeIdsOf(activity)
      .map(id => {
        const user = users.find(candidate => candidate.id === id)
        return user ? `${user.name} · ${user.role}` : userName(id, users)
      })
      .join(', ')
    const when = activity.scheduledStart
      ? `${escapeHtml(formatDate(activity.scheduledStart))} ${escapeHtml(formatTime(activity.scheduledStart))} · ${escapeHtml(durationLabel(String(activity.durationMin || 30)))}`
      : '—'
    return `${actionsMarkup(activity)}<dl class="${VIEW_LIST_CLASS}">
      ${viewRow('Summary', escapeHtml(titleOf(activity)))}
      ${viewRow('Kind', escapeHtml(kindLabel(activity.kind)))}
      ${viewRow('Status', `<span class="badge gray">${escapeHtml(statusLabel(activity.status))}</span>`)}
      ${viewRow('Assigned to', assigned ? escapeHtml(assigned) : '—')}
      ${viewRow('Priority', escapeHtml(priorityLabel(activity.priority)))}
      ${viewRow('Due date', escapeHtml(activity.dueDate ? formatDate(activity.dueDate) : '—'))}
      ${viewRow('Scheduled', when)}
      ${viewRow('Notes', activity.notes ? `<span class="whitespace-pre-line" dir="auto">${escapeHtml(activity.notes)}</span>` : '—')}
    </dl>`
  }

  /* Bound on both the editor and the read-only view: the action buttons
     exist in each, the field shortcuts only in the editor — hence the
     optional queries, so view mode can reuse this binding. */
  function bindEditor(body, activity) {
    body.querySelectorAll('[data-due-shift]').forEach(button =>
      button.addEventListener('click', () => {
        const input = body.querySelector('#activity-due')
        input.value = addDays(input.value || todayKey(), Number(button.dataset.dueShift))
      })
    )
    body.querySelector('#activity-schedule-clear')?.addEventListener('click', () => {
      body.querySelector('#activity-start').value = ''
      updateScheduleState()
    })
    const startInput = body.querySelector('#activity-start')
    const updateScheduleState = () => {
      const stateEl = body.querySelector('[data-schedule-state]')
      if (!stateEl) return
      const scheduled = Boolean(startInput.value)
      stateEl.textContent = scheduled ? 'Scheduled' : 'Not scheduled'
      stateEl.classList.toggle('bg-[var(--line-2)]', scheduled)
      stateEl.classList.toggle('text-ink', scheduled)
      stateEl.classList.toggle('text-muted', !scheduled)
    }
    startInput?.addEventListener('input', updateScheduleState)
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
    const assigneeIds = multiselectValues(body, 'activity-assignee')
    return {
      kind: body.querySelector('#activity-kind').value,
      assigneeIds,
      assigneeId: assigneeIds[0] || '',
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
    const assigneeIds = assigneeIdsOf(source)
    const next = store.createEntity('activity', {
      kind: 'todo',
      summary: `Follow up: ${titleOf(source)}`,
      notes: '',
      assigneeIds,
      assigneeId: assigneeIds[0] || '',
      status: 'planned',
      priority: 'normal',
      archived: false,
    })
    store.link({type: 'activity', id: source.id}, {type: 'activity', id: next.id})
    toast({tone: 'ok', title: 'Follow-up created and linked', body: titleOf(next)})
    openActivity(next.id, {}, {edit: true})
  }

  function createEvent(activity) {
    if (linkedEvent(activity)) return openItem(linkedEvent(activity).ref)
    const event = store.createEntity('event', {
      title: titleOf(activity),
      allDay: false,
      start: activity.scheduledStart,
      end: addMinutes(activity.scheduledStart, Number(activity.durationMin) || 60),
      location: '',
      participantIds: assigneeIdsOf(activity),
      reminder: 'none',
      repeat: 'none',
      description: activity.notes || '',
    })
    store.link({type: 'activity', id: activity.id}, {type: 'event', id: event.id})
    toast({tone: 'ok', title: 'Event created and linked', body: titleOf(event)})
    openItem({type: 'event', id: event.id}, {edit: true})
  }

  function validate(body, values) {
    setFieldError(body, 'activity-summary', values.summary ? '' : 'Summary is required.')
    setFieldError(body, 'activity-assignee', values.assigneeIds.length ? '' : 'Choose at least one assignee.')
    const startInvalid = values.scheduledStart && !isValidDateTime(values.scheduledStart)
    setFieldError(body, 'activity-start', startInvalid ? 'Enter a valid date and time, or remove the scheduled time.' : '')
    if (!values.summary) body.querySelector('#activity-summary').focus()
    else if (!values.assigneeIds.length) body.querySelector('#activity-assignee').focus()
    else if (startInvalid) body.querySelector('#activity-start').focus()
    return values.summary && values.assigneeIds.length && !startInvalid
  }

  function openActivity(id, prefill = {}, {edit = false} = {}) {
    const existing = id ? store.getEntity('activity', id) : null
    if (id && !existing) {
      toast({tone: 'warn', title: 'This activity is no longer available', body: 'It may have been deleted.'})
      return
    }
    const activity = existing || {kind: 'todo', summary: '', notes: '', assigneeIds: [currentUserId], assigneeId: currentUserId, status: 'planned', priority: 'normal', dueDate: '', scheduledStart: '', durationMin: 30, archived: false, ...prefill}
    const ref = existing ? {type: 'activity', id: existing.id} : null
    panel.open({
      ref,
      edit,
      status: existing ? {label: statusLabel(existing.status), tone: STATUS_TONE[existing.status] || 'gray'} : undefined,
      title: existing ? titleOf(existing) : 'New activity',
      /* Header note: the kind plus what is due or scheduled — overdue
         reads in danger color so it is not carried by the chip alone. */
      description: existing
        ? [kindLabel(activity.kind), ...activityTiming(activity, todayKey())].join(' · ')
        : 'Track a call, meeting, email or to-do.',
      descriptionTone: existing && isOverdue(activity, todayKey()) ? 'danger' : undefined,
      render: body => {
        body.innerHTML = editorMarkup(activity)
        bindMultiselect(body)
        bindEditor(body, activity)
      },
      view: body => {
        body.innerHTML = viewMarkup(activity)
        /* The action row (Mark done, Create event, …) renders in view mode
           too, so its handlers bind here as well; bindEditor's field
           queries are optional-chained and no-op without the form. */
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
    toast({tone: 'info', title: archived ? 'Activity archived' : 'Activity restored', body: archived ? 'Hidden from default views. Turn on “Show cancelled & archived” in the Filter menu to find it.' : titleOf(activity)})
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
