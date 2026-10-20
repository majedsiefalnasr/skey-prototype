import {uiLocale} from '../../core/locale.js'
const {t} = uiLocale
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
  recordHighlights,
} from '../../components/collab/fields.js'
import {renderBoard} from '../../components/collab/kanban.js'
import {renderCalendar, calendarToolbar, bindCalendarToolbar, calendarRange, shiftDate, presetJump} from '../../components/collab/calendar.js'
import {
  menuItemRadio,
  menuDetails,
  clearFilterButton,
  searchField,
  viewMenu,
  toolbarRow,
  closeOwnedMenu,
  collabFieldChoices,
  collabFilterChips,
  collabFilterMatches,
  bindCollabFieldFilters,
  restoreCollabFilterFocus,
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
  kanban: {label: t("Kanban"), icon: 'i-board'},
  calendar: {label: t("Calendar"), icon: 'i-cal'},
}
const QUICK_FILTERS = [
  ['all', 'All activities', 'i-list'],
  ['mine', 'My work', 'i-user'],
  ['today', 'Today', 'i-cal'],
  ['overdue', 'Overdue', 'i-clock'],
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

export function createActivities({store, toast, panel, related, confirm, goHome, users, currentUserId, openItem, composeMailFor, beforeAction = async () => true}) {
  const view = () => document.querySelector('.activities-view')
  const state = {
    view: 'kanban',
    query: '',
    quick: 'all',
    fieldFilters: [],
    calMode: 'week',
    calDate: null,
    calSelectedDay: null,
    calSelectedId: null,
  }
  let built = false
  let unsubscribe = null
  let calendarItems = []

  const todayKey = () => store.now().slice(0, 10)
  const inQueue = (activity, queue) => {
    const open = !activity.archived && isOpenActivity(activity)
    if (queue === 'mine') return open && assigneeIdsOf(activity).includes(currentUserId)
    if (queue === 'today') return open && activity.dueDate === todayKey()
    if (queue === 'overdue') return open && Boolean(activity.dueDate) && activity.dueDate < todayKey()
    return true
  }
  const linkedEvent = activity =>
    store.getRelatedItems('activity', activity.id).find(item => item.ref.type === 'event' && item.entity)

  const filterFields = () => [
    {
      key: 'assignee',
      label: t("Assigned to"),
      icon: 'i-user',
      type: 'select',
      options: [{value: 'me', label: t("Me")}, ...users.map(user => ({value: user.id, label: user.name}))],
      match: (activity, filter) => assigneeIdsOf(activity).includes(filter.value === 'me' ? currentUserId : filter.value),
    },
    {key: 'kind', label: t("Kind"), icon: 'i-list', type: 'select', options: ACTIVITY_KINDS.map(([id, label]) => ({value: id, label}))},
    {
      key: 'overdue',
      label: t("Overdue"),
      icon: 'i-warn',
      type: 'select',
      options: [
        {value: 'yes', label: t("Overdue only")},
        {value: 'no', label: t("Not overdue")},
      ],
      match: (activity, filter) => (filter.value === 'yes' ? isOverdue(activity, todayKey()) : !isOverdue(activity, todayKey())),
    },
    {
      key: 'visibility',
      label: t("Cancelled & archived"),
      icon: 'i-eye',
      type: 'select',
      options: [
        {value: 'show', label: t("Show them")},
        {value: 'hide', label: t("Hide them")},
      ],
      match: (activity, filter) => filter.value === 'show' || (!activity.archived && activity.status !== 'cancelled'),
    },
  ]

  function filtered() {
    const query = state.query.trim().toLowerCase()
    const fields = filterFields()
    const effective = state.fieldFilters.some(filter => filter.key === 'visibility')
      ? state.fieldFilters
      : [...state.fieldFilters, {key: 'visibility', value: 'hide'}]
    return store
      .listEntities('activity')
      .filter(a => effective.every(filter => collabFilterMatches(a, filter, fields.find(field => field.key === filter.key))))
      .filter(a => (state.quick === 'open' ? isOpenActivity(a) : state.quick === 'done' ? a.status === 'done' : true))
      .filter(a => inQueue(a, state.quick))
      .filter(a => !query || searchText(a).includes(query))
      .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || titleOf(a).localeCompare(titleOf(b)))
  }

  const statusChip = status =>
    `<span class="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] font-semibold text-ink"><span class="size-1.5 rounded-full ${
      STATUS_DOT[status] || 'bg-[var(--muted)]'
    }" aria-hidden="true"></span>${escapeHtml(statusLabel(status))}</span>`

  const priorityChip = priority => {
    const label = PRIORITIES.find(([value]) => value === priority)?.[1] ?? priority
    return priority === 'high'
      ? `<span class="rounded-full border border-[var(--danger-soft-line)] bg-[var(--danger-soft-bg)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--danger)]">${t("High")}</span>`
      : `<span class="rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted">${escapeHtml(t(label))}</span>`
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
      activity.archived ? `<span class="badge gray ms-auto">${t("Archived")}</span>` : ''
    }</span>
      <span class="card-title mt-1.5 block text-[13px] font-semibold text-ink [overflow-wrap:anywhere]" dir="auto">${escapeHtml(titleOf(activity))}</span>
      ${excerpt ? `<span class="mt-1 line-clamp-2 block text-xs text-muted" dir="auto">${escapeHtml(excerpt)}</span>` : ''}
      <span class="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">${icon(kindIcon(activity.kind), 12)}<span>${escapeHtml(
        kindLabel(activity.kind)
      )}</span>${timing
        .map(text =>
          text.startsWith(t('Overdue'))
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
            ? `<span class="ms-auto inline-flex items-center gap-1">${icon('i-flow', 11)}${links}<span class="sr-only"> ${t("related items")}</span></span>`
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
      <div class="mlist mend" role="menu" aria-label="${escapeHtml(t("Card actions"))}">
        <button type="button" role="menuitem" data-card-action="edit">${icon('i-edit', 14)}<span>${t("Edit")}</span></button>
        ${
          isOpenActivity(activity)
            ? `<button type="button" role="menuitem" data-card-action="done">${icon('i-check', 14)}<span>${t("Mark done")}</span></button>`
            : ''
        }
        <button type="button" role="menuitem" class="dan" data-card-action="delete">${icon('i-trash', 14)}<span>${t("Delete")}</span></button>
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

  const fieldFilterCount = () => state.fieldFilters.length
  const filterActive = () => Boolean(fieldFilterCount() || state.quick !== 'all')

  function buildToolbar() {
    const host = view().querySelector('[data-collab-toolbar]')
    const fields = filterFields()
    /* The invoices list chrome: quick filter and "+ Filter" — the field
       chooser, like Customers — with editable value chips on the left,
       search and the view menu on the right. The page header owns the one
       primary action — the toolbar never repeats it. */
    const quick = QUICK_FILTERS.find(([id]) => id === state.quick) || QUICK_FILTERS[0]
    const quickItems = QUICK_FILTERS.map(([id, label, iconName]) =>
      menuItemRadio({attr: 'quick-filter', value: id, label, iconName, checked: state.quick === id})
    ).join('')
    const filterItems = collabFieldChoices({fields, activeKeys: new Set(state.fieldFilters.map(filter => filter.key))})
    const presentation = VIEW_PRESENTATION[state.view]
    const viewOptions = Object.entries(VIEW_PRESENTATION)
      .map(([id, entry]) =>
        menuItemRadio({attr: 'view-select', value: id, label: `${entry.label} view`, iconName: entry.icon, checked: state.view === id})
      )
      .join('')
    host.innerHTML = `<div class="data-list-controls grid w-full gap-2 mb-2.5">${toolbarRow({
      ariaLabel: 'Activities table controls',
      left: `${menuDetails({attr: 'quick-menu', iconName: quick[2], label: quick[1], items: quickItems})}${menuDetails({
        attr: 'filter-menu',
        iconName: 'i-plus',
        label: t("Filter"),
        items: filterItems,
      })}${collabFilterChips({fields, filters: state.fieldFilters})}${filterActive() ? clearFilterButton({attr: 'clear-filters'}) : ''}`,
      right: `${searchField({attr: 'collab-search', label: t("activities"), value: state.query})}${viewMenu({
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
    const onChange = ({focusKey = '', caret = null} = {}) => {
      refresh()
      restoreCollabFilterFocus(view().querySelector('[data-collab-toolbar]'), focusKey, caret)
    }
    host.querySelectorAll('[data-quick-filter]').forEach(item =>
      item.addEventListener('click', event => {
        state.quick = item.dataset.quickFilter
        closeOwnedMenu(event.currentTarget)
        refresh()
      })
    )
    bindCollabFieldFilters(host, {fields, filters: state.fieldFilters, onChange})
    host.querySelector('[data-clear-filters]')?.addEventListener('click', () => {
      state.quick = 'all'
      state.fieldFilters.splice(0, state.fieldFilters.length)
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
    body._calendarContextAbort?.abort()
    if (state.view === 'calendar') return renderCalendarView(body)
    const activities = filtered()
    const columns = [
      ['planned', 'Planned'],
      ['in_progress', 'In progress'],
      ['done', 'Done'],
      ...(state.fieldFilters.some(filter => filter.key === 'visibility' && filter.value === 'show')
        ? [['cancelled', 'Cancelled']]
        : []),
    ]
    renderBoard(body, {
      columns: columns.map(([id, label]) => ({id, label, items: activities.filter(a => a.status === id)})),
      renderCard: cardMarkup,
      renderCardActions: cardActionsMarkup,
      titleOf,
      emptyText: t("No activities here."),
      /* Same "Move to" select as the notes board: the non-drag status
         path for keyboard and touch users; drag keeps working too. */
      onOpen: id => openActivity(id),
      onMove: async (id, status) => {
        const activity = store.getEntity('activity', id)
        if (!activity || activity.status === status) return
        if (!(await beforeAction())) { renderBody(); return }
        store.updateEntity('activity', id, {status})
        toast({tone: 'info', title: uiLocale.t("Moved to {v0}").replace('{v0}', () => uiLocale.t(String(statusLabel(status)))), body: titleOf(activity)})
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
    body.innerHTML = `${calendarToolbar({mode: state.calMode, date: state.calDate, presets: true, today: todayKey(), titleHidden: true})}
      <p class="my-2 flex flex-wrap items-center gap-2 rounded-md bg-[var(--line-2)] px-3 py-2 text-[13px] text-ink" data-unscheduled-notice>
        ${icon('i-info')}<span>${unscheduled} unscheduled ${unscheduled === 1 ? 'activity isn’t' : 'activities aren’t'} shown here — only activities with a scheduled time appear on the calendar. They stay in Kanban.</span>
        <button type="button" class="lbtn ms-auto" data-show-kanban>${t("Show Kanban")}</button>
      </p>
      <div data-calendar></div>`
    bindCalendarToolbar(body, {
      onPrev: () => goCal(shiftDate(state.calMode, state.calDate, -1)),
      onNext: () => goCal(shiftDate(state.calMode, state.calDate, 1)),
      onToday: () => goCal(todayKey()),
      onMode: mode => {
        state.calMode = mode
        state.calDate = state.calSelectedDay || state.calDate
        renderBody()
        view().querySelector(`[data-cal-modes] [data-value="${mode}"]`)?.focus()
      },
      onPreset: id => {
        const jump = presetJump(id, todayKey())
        state.calMode = jump.mode
        goCal(jump.date)
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
      enhanced: true,
      selectedDay: state.calSelectedDay || state.calDate,
      selectedId: state.calSelectedId,
      onSelectDay: date => {
        state.calSelectedDay = date
        state.calSelectedId = null
        renderBody()
        body.querySelector(`[data-cal-select-day="${date}"]`)?.focus({preventScroll: true})
      },
      onOpen: index => {
        const activity = calendarItems[index]
        state.calSelectedDay = activity.start.slice(0, 10)
        state.calSelectedId = activity.id
        // Repaint selection in place so opening a record preserves the grid's pan and time scroll.
        body.querySelectorAll('[data-cal-item]').forEach(button => button.setAttribute('aria-pressed', String(calendarItems[Number(button.dataset.calItem)]?.id === activity.id)))
        body.querySelectorAll('[data-cal-select-day]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.calSelectDay === state.calSelectedDay)))
        body.querySelector(`[data-cal-item="${index}"]`)?.focus({preventScroll: true})
        openActivity(activity.id)
      },
      onSlot: ({date, time}) => {
        state.calSelectedDay = date
        state.calSelectedId = null
        openActivity(null, {scheduledStart: `${date}T${time || '09:00'}`, durationMin: 30})
      },
      onMore: date => {
        state.calMode = 'day'
        goCal(date)
      },
    })
  }

  function goCal(date) {
    state.calDate = date
    state.calSelectedDay = date
    state.calSelectedId = null
    renderBody()
  }

  /* ---------- editor ---------- */
  function actionsMarkup(activity) {
    if (!activity.id) return ''
    const buttons = []
    if (isOpenActivity(activity)) buttons.push(`<button type="button" class="lbtn out" data-action="done">${icon('i-check')} Mark done</button>`)
    else if (activity.status === 'done') buttons.push(`<button type="button" class="lbtn out" data-action="follow-up">${icon('i-plus')} Schedule follow-up</button>`)
    if (activity.kind === 'email') buttons.push(`<button type="button" class="lbtn out" data-action="compose">${icon('i-mail')} Compose email</button>`)
    if (activity.kind === 'meeting') {
      if (linkedEvent(activity)) buttons.push(`<button type="button" class="lbtn out" data-action="open-event">${icon('i-clock')} Open linked event</button>`)
      else {
        const scheduled = isValidDateTime(activity.scheduledStart)
        buttons.push(
          `<button type="button" class="lbtn out" data-action="create-event"${scheduled ? '' : ' disabled aria-describedby="activity-event-hint"'}>${icon('i-plus')} Create event</button>`,
          `<button type="button" class="lbtn out" data-action="link-event">${icon('i-flow')} Link existing event…</button>`
        )
        if (!scheduled) buttons.push(`<p class="${HINT_CLASS} w-full" id="activity-event-hint">${t("Schedule a time and save to create an event from this meeting.")}</p>`)
      }
    }
    return `<div class="mb-4 flex flex-wrap gap-2" data-activity-actions>${buttons.join('')}</div>`
  }

  function activityHighlights(activity) {
    const items = []
    /* The header's status chip already says Done, and the due date has its
       own row, so the flag only names the state. */
    if (isOverdue(activity, todayKey())) items.push({label: 'Overdue', tone: 'danger', iconName: 'i-warn'})
    else if (isOpenActivity(activity) && activity.dueDate === todayKey()) items.push({label: 'Due today', iconName: 'i-cal'})
    if (activity.priority === 'high') items.push({label: 'High priority', tone: 'danger', iconName: 'i-warn'})
    return recordHighlights(items)
  }

  function editorMarkup(activity) {
    const scheduled = Boolean(activity.scheduledStart)
    return `<div data-activity-signals>${activityHighlights(activity)}</div>${actionsMarkup(activity)}<div class="${GRID_CLASS}">
      ${field({id: 'activity-kind', label: t("Kind"), required: true, wide: true, control: `<div class="relative"><span class="pointer-events-none absolute start-3 top-2.5 text-accent" data-kind-icon>${icon(kindIcon(activity.kind))}</span>${selectInput({id: 'activity-kind', value: activity.kind, options: ACTIVITY_KINDS.map(([id, label]) => [id, label]), extra: {class: 'ps-9!'}})}</div>`})}
      ${multiselect({id: 'activity-assignee', label: t("Assigned to"), required: true, wide: true, options: users.map(user => [user.id, `${user.name} · ${user.role}`]), selected: assigneeIdsOf(activity), placeholder: t("Search people\u2026")})}
      ${field({id: 'activity-summary', label: t("Summary"), required: true, wide: true, control: textInput({id: 'activity-summary', value: activity.summary, required: true, extra: {autofocus: true}})})}
      ${field({id: 'activity-status', label: t("Status"), control: selectInput({id: 'activity-status', value: activity.status, options: ACTIVITY_STATUSES})})}
      ${field({id: 'activity-priority', label: t("Priority"), control: selectInput({id: 'activity-priority', value: activity.priority, options: PRIORITIES})})}
      ${field({
        id: 'activity-due',
        label: t("Due date"),
        hint: t("A due date alone does not put the activity on the calendar."),
        wide: true,
        control: `<div class="flex items-center gap-2">${textInput({id: 'activity-due', type: 'date', value: activity.dueDate || '', describedBy: 'activity-due-hint'})}<button type="button" class="lbtn out shrink-0" data-due-clear>${t('Clear')}</button></div>
          <div class="mt-1 grid grid-cols-2 gap-2">${[[1, '+1 day'], [7, '+1 week']].map(([days, label]) => `<button type="button" class="flex min-h-12 items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-start text-[13px] text-ink hover:border-[var(--accent-line)] hover:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-[var(--focus)]" data-due-shift="${days}">${icon('i-cal')}<span class="grid gap-0.5"><span class="font-semibold">${t(label)}</span><span class="text-xs text-muted" data-due-preview="${days}">${escapeHtml(formatDate(addDays(activity.dueDate || todayKey(), days)))}</span></span></button>`).join('')}</div><p class="${HINT_CLASS} mt-1">${t('Added to the selected due date, or today if empty.')}</p>`,
      })}
      <details class="sm:col-span-2 rounded-md border border-line bg-surface"${scheduled ? ' open' : ''}>
        <summary class="flex cursor-pointer list-none items-center gap-2 rounded-md px-3 py-2.5 text-[13px] font-medium text-ink hover:bg-[var(--line-2)] [&::-webkit-details-marker]:hidden">
          ${icon('i-clock', 14)}<span>${t("Schedule a time")}</span>
          <span class="ms-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${scheduled ? 'bg-[var(--line-2)] text-ink' : 'text-muted'}" data-schedule-state>${t(scheduled ? 'Scheduled' : 'Not scheduled')}</span>
        </summary>
        <div class="border-t border-line px-3 py-3">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            ${field({id: 'activity-start', label: t("Starts"), control: textInput({id: 'activity-start', type: 'datetime-local', value: activity.scheduledStart || ''})})}
            ${field({id: 'activity-duration', label: t("Duration"), control: selectInput({id: 'activity-duration', value: String(activity.durationMin || 30), options: DURATIONS})})}
          </div>
          <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
            <button type="button" class="lbtn" id="activity-schedule-clear">${icon('i-x')} Remove scheduled time</button>
            <span class="${HINT_CLASS}">${t("Scheduled activities appear on the Activities calendar.")}</span>
          </div>
        </div>
      </details>
      ${field({id: 'activity-notes', label: t("Notes"), wide: true, control: textarea({id: 'activity-notes', value: activity.notes, rows: 4})})}
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
    /* Title, kind and status live in the panel header and overdue/due-today
       in the flags above, so the list holds only the remaining fields. */
    return `${activityHighlights(activity)}${actionsMarkup(activity)}<dl class="${VIEW_LIST_CLASS}">
      ${viewRow('Assigned to', assigned ? escapeHtml(assigned) : '—')}
      ${viewRow('Priority', priorityChip(activity.priority))}
      ${viewRow('Due date', escapeHtml(activity.dueDate ? formatDate(activity.dueDate) : '—'))}
      ${viewRow('Scheduled', when)}
      ${viewRow('Notes', activity.notes ? `<span class="whitespace-pre-line" dir="auto">${escapeHtml(activity.notes)}</span>` : '—')}
    </dl>`
  }

  /* Bound on both the editor and the read-only view: the action buttons
     exist in each, the field shortcuts only in the editor — hence the
     optional queries, so view mode can reuse this binding. */
  function bindEditor(body, activity) {
    const updateSignals = () => {
      const due = body.querySelector('#activity-due')
      if (!due) return
      const current = {...activity, dueDate: due.value, status: body.querySelector('#activity-status').value, priority: body.querySelector('#activity-priority').value}
      body.querySelector('[data-activity-signals]').innerHTML = activityHighlights(current)
      body.querySelectorAll('[data-due-preview]').forEach(label => { label.textContent = formatDate(addDays(due.value || todayKey(), Number(label.dataset.duePreview))) })
      body.querySelector('[data-kind-icon]').innerHTML = icon(kindIcon(body.querySelector('#activity-kind').value))
    }
    body.querySelectorAll('#activity-due, #activity-priority, #activity-status, #activity-kind').forEach(input => input.addEventListener('change', updateSignals))
    body.querySelector('[data-due-clear]')?.addEventListener('click', () => { body.querySelector('#activity-due').value = ''; updateSignals() })
    body.querySelectorAll('[data-due-shift]').forEach(button =>
      button.addEventListener('click', () => {
        const input = body.querySelector('#activity-due')
        input.value = addDays(input.value || todayKey(), Number(button.dataset.dueShift))
        updateSignals()
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
      stateEl.textContent = t(scheduled ? 'Scheduled' : 'Not scheduled')
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

  async function markDone(activity) {
    if (!(await beforeAction())) return
    store.updateEntity('activity', activity.id, {status: 'done'})
    const done = store.getEntity('activity', activity.id)
    toast({tone: 'ok', title: 'Activity done', body: titleOf(done), action: 'Schedule follow-up', onAction: () => followUp(done)})
    openActivity(activity.id)
  }

  async function followUp(source) {
    if (!(await beforeAction())) return
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

  async function createEvent(activity) {
    if (!(await beforeAction())) return
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
    const opener = document.activeElement
    const calendarOpener = view()?.contains(opener) && (opener?.hasAttribute('data-cal-item') || opener?.hasAttribute('data-cal-slot'))
    const restoreCalendarFocus = () => {
      if (!calendarOpener) return
      const index = id ? calendarItems.findIndex(item => item.id === id) : -1
      const target = index >= 0
        ? view()?.querySelector(`[data-cal-item="${index}"]`)
        : opener?.isConnected ? opener : view()?.querySelector('[data-collab-new]')
      target?.focus({preventScroll: true})
    }
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
      onClose: restoreCalendarFocus,
      status: existing ? {label: statusLabel(existing.status), tone: STATUS_TONE[existing.status] || 'gray'} : undefined,
      title: existing ? titleOf(existing) : 'New activity',
      /* Header note: the kind only. Due state is flagged once in the body
         (with text and icon, not color alone) and dates sit in the details. */
      description: existing ? kindLabel(activity.kind) : 'Track a call, meeting, email or to-do.',
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
      save: async body => {
        const values = readEditor(body)
        if (!validate(body, values)) return false
        if (!(await beforeAction(document.querySelector('#collab-panel [data-panel-save]')))) return false
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
              ? {label: t("Restore"), icon: 'i-undo', run: () => setArchived(existing, false)}
              : {label: t("Archive"), icon: 'i-archive', run: () => setArchived(existing, true)},
            {label: t("Delete"), icon: 'i-trash', danger: true, run: () => deleteActivity(existing)},
          ]
        : [],
      related: ref ? (host, options) => related.render(host, ref, options) : null,
    })
  }

  async function setArchived(activity, archived) {
    if (!(await beforeAction())) return
    store.updateEntity('activity', activity.id, {archived})
    await panel.close({force: true})
    toast({tone: 'info', title: archived ? 'Activity archived' : 'Activity restored', body: archived ? 'Hidden from default views. Turn on “Show cancelled & archived” in the Filter menu to find it.' : titleOf(activity)})
  }

  async function deleteActivity(activity) {
    const ok = await confirm({
      title: 'Delete this activity?',
      body: 'The activity is removed. Linked items keep the link and show it as unavailable until someone removes it.',
      confirmLabel: t("Delete"),
      tone: 'danger',
    })
    if (!ok || !(await beforeAction())) return
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
    refreshLocale() { if (built) { buildToolbar(); renderBody() } },
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
