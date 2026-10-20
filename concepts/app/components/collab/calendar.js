import {uiLocale} from '../../core/locale.js'
const {t} = uiLocale
// Day / Week / Month calendar shared by Events and the Activities calendar
// view. It only draws what the caller passes in: callers decide which items
// qualify (events by their own dates, activities only with a scheduled
// time), and switching mode or date never touches the items themselves.
// All-day items get their own row/chips, separate from the timed grid.
import {escapeHtml, icon, segmented} from './fields.js'
import {
  addDays,
  startOfWeek,
  monthGridDays,
  formatMonthTitle,
  formatTime,
  parseLocal,
} from '../../core/collab-dates.js'

const HOUR_PX = 48
const DAY_START_SCROLL = 7
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const longDay = key =>
  parseLocal(key).toLocaleDateString(uiLocale.getLocale() === 'ar' ? 'ar-EG' : 'en-GB', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'})
const shortDay = key => parseLocal(key).toLocaleDateString(uiLocale.getLocale() === 'ar' ? 'ar-EG' : 'en-GB', {day: 'numeric', month: 'short'})
const minutesOf = key => Number(key.slice(11, 13)) * 60 + Number(key.slice(14, 16))
const pad = n => String(n).padStart(2, '0')

export const CALENDAR_MODES = [
  ['day', 'Day'],
  ['week', 'Week'],
  ['month', 'Month'],
]

export function calendarRange(mode, date) {
  if (mode === 'day') return {from: date, to: date}
  if (mode === 'week') {
    const from = startOfWeek(date)
    return {from, to: addDays(from, 6)}
  }
  const days = monthGridDays(date)
  return {from: days[0], to: days[41]}
}

export function calendarTitle(mode, date) {
  if (mode === 'day') return longDay(date)
  if (mode === 'week') {
    const from = startOfWeek(date)
    const to = addDays(from, 6)
    return `${shortDay(from)} – ${shortDay(to)} ${to.slice(0, 4)}`
  }
  return formatMonthTitle(date)
}

export function shiftDate(mode, date, direction) {
  if (mode === 'day') return addDays(date, direction)
  if (mode === 'week') return addDays(date, 7 * direction)
  const d = parseLocal(`${date.slice(0, 7)}-01`)
  d.setMonth(d.getMonth() + direction)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`
}

const NAV_BUTTON_CLASS =
  'inline-grid min-h-8 min-w-8 place-items-center rounded-md border border-line bg-surface text-ink hover:bg-[var(--line-2)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)] rtl:[&_svg]:scale-x-[-1]'

/** Jump presets behind the range control: each maps to a mode plus the
 *  anchor date it should show. Labels are the menu rows themselves. */
const RANGE_PRESETS = [
  ['today', 'Today'],
  ['week', 'This week'],
  ['month', 'This month'],
  ['next-week', 'Next week'],
  ['next-month', 'Next month'],
  ['prev-month', 'Previous month'],
]

/** Mode + date a preset jumps to; `today` is the store's current day key. */
export function presetJump(id, today) {
  if (id === 'today') return {mode: 'day', date: today}
  if (id === 'week') return {mode: 'week', date: today}
  if (id === 'month') return {mode: 'month', date: today}
  if (id === 'next-week') return {mode: 'week', date: addDays(today, 7)}
  if (id === 'next-month') return {mode: 'month', date: shiftDate('month', today, 1)}
  if (id === 'prev-month') return {mode: 'month', date: shiftDate('month', today, -1)}
  return {mode: 'month', date: today}
}

/** What the range control calls the period on screen — a preset name when
 *  the calendar sits on one, otherwise the period's own label. */
const presetLabel = (mode, date, today) => {
  if (mode === 'day') {
    return date === today ? 'Today' : `${parseLocal(date).toLocaleDateString(uiLocale.getLocale() === 'ar' ? 'ar-EG' : 'en-GB', {weekday: 'short'})} ${shortDay(date)}`
  }
  if (mode === 'week') {
    const from = startOfWeek(date)
    return startOfWeek(today) === from ? 'This week' : `Week of ${shortDay(from)}`
  }
  return formatMonthTitle(date)
}

const rangeText = (mode, date) => {
  const {from, to} = calendarRange(mode, date)
  return from === to ? `${shortDay(from)} ${from.slice(0, 4)}` : `${shortDay(from)} – ${shortDay(to)} ${to.slice(0, 4)}`
}

/** Toolbar markup: ‹ › Today, the optional range control (jump presets plus
 *  the exact dates), the period title, Day | Week | Month. Callers that show
 *  the range control (`presets: true`) hide the title — the range chip
 *  already names the period — but keep it in the DOM for aria-live. */
export const calendarToolbar = ({mode, date, modes = CALENDAR_MODES, presets = false, today = '', titleHidden = false}) =>
  `<div class="flex flex-wrap items-center gap-2" data-cal-toolbar>
    <button type="button" class="${NAV_BUTTON_CLASS}" data-cal-prev aria-label="${escapeHtml(t('Previous ' + mode))}">${icon('i-prev')}</button>
    <button type="button" class="${NAV_BUTTON_CLASS}" data-cal-next aria-label="${escapeHtml(t('Next ' + mode))}">${icon('i-next')}</button>
    <button type="button" class="lbtn" data-cal-today>${t("Today")}</button>
    ${
      presets
        ? `<div class="menu">
            <button type="button" class="border border-line bg-surface text-[13px] text-ink" data-cal-preset aria-haspopup="menu" aria-expanded="false">${escapeHtml(t(presetLabel(mode, date, today)))}${icon('i-caret', 11)}</button>
            <div class="mlist" role="menu" aria-label="${escapeHtml(t("Jump to range"))}" data-cal-preset-menu>${RANGE_PRESETS.map(
              ([id, label]) => `<button type="button" role="menuitem" data-preset="${id}">${escapeHtml(t(label))}</button>`
            ).join('')}</div>
          </div>
          <span class="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1 text-[13px] text-ink" data-cal-range>${icon(
            'i-cal',
            13
          )}<span dir="ltr">${escapeHtml(rangeText(mode, date))}</span></span>`
        : ''
    }
    <h2 class="${titleHidden ? 'sr-only' : 'min-w-[180px] text-[15px] font-semibold text-ink'}" data-cal-title aria-live="polite">${escapeHtml(calendarTitle(mode, date))}</h2>
    <span class="ms-auto">${segmented({label: t("Calendar view"), views: modes, current: mode, dataAttr: 'data-cal-modes'})}</span>
  </div>`

export function bindCalendarToolbar(host, {onPrev, onNext, onToday, onMode, onPreset}) {
  const scope = host.closest('.collab-view') || host
  const runAndFocus = (callback, selector) => {
    callback()
    scope.querySelector(selector)?.focus()
  }
  host.querySelector('[data-cal-prev]').addEventListener('click', () => runAndFocus(onPrev, '[data-cal-prev]'))
  host.querySelector('[data-cal-next]').addEventListener('click', () => runAndFocus(onNext, '[data-cal-next]'))
  host.querySelector('[data-cal-today]').addEventListener('click', () => runAndFocus(onToday, '[data-cal-today]'))
  host.querySelectorAll('[data-cal-modes] button').forEach(button =>
    button.addEventListener('click', () => onMode(button.dataset.value))
  )
  if (!onPreset) return
  host.querySelectorAll('[data-cal-preset-menu] [data-preset]').forEach(item =>
    item.addEventListener('click', () => {
      /* Close the menu here as well: the jump re-renders the toolbar, but
         a preset that lands on the range already shown still repaints it —
         either way the menu must not outlive the pick. */
      const list = item.closest('.mlist')
      list.classList.remove('open')
      list.parentElement.querySelector('[aria-haspopup="menu"]')?.setAttribute('aria-expanded', 'false')
      runAndFocus(() => onPreset(item.dataset.preset), '[data-cal-preset]')
    })
  )
}

const itemLabel = item =>
  `${item.label}: ${item.title}, ${item.allDay ? 'all day' : `${formatTime(item.start)} to ${formatTime(item.end)}`}${item.conflict ? ' (conflicting)' : ''}`

/** One tab stop per date picker; arrows move focus without changing selection. */
export function bindCalendarDates(host, attribute, selectedDay, todayKey) {
  const buttons = [...host.querySelectorAll(`[${attribute}]`)]
  const initial = buttons.find(button => button.getAttribute(attribute) === selectedDay) || buttons.find(button => button.getAttribute(attribute) === todayKey) || buttons[0]
  buttons.forEach((button, index) => {
    button.tabIndex = button === initial ? 0 : -1
    button.addEventListener('focus', () => buttons.forEach(other => { other.tabIndex = other === button ? 0 : -1 }))
    button.addEventListener('keydown', event => {
      const rtl = document.documentElement.dir === 'rtl'
      const delta = {ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1, ArrowDown: 7, ArrowUp: -7}[event.key]
      const next = event.key === 'Home' ? index - index % 7 : event.key === 'End' ? index + 6 - index % 7 : delta ? index + delta : null
      if (next === null) return
      event.preventDefault()
      buttons[next]?.focus()
    })
  })
}

const ITEM_CLASS =
  'block w-full overflow-hidden rounded border-0 border-[var(--accent)] bg-[var(--accent-soft)] px-1.5 py-0.5 text-start text-xs text-ink hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)]'

const CONFLICT_CLASS = '![border-color:var(--danger)] ![background-color:var(--danger-soft-bg)]'

const itemButton = (item, index, extraClass = '', style = '', timeLabel = formatTime(item.start), enhanced = false, plainBorder = enhanced) => {
  const content = enhanced
    ? `<span class="event-month-title" dir="auto">${icon(item.allDay ? 'i-cal' : 'i-clock', 12)}<span>${escapeHtml(item.title)}</span></span><span class="event-month-time">${escapeHtml(item.allDay ? t('All day') : timeLabel)}</span>`
    : `${item.allDay ? '' : `<span class="font-semibold">${escapeHtml(timeLabel)}</span> `}<span dir="auto">${escapeHtml(item.title)}</span><span class="sr-only"> (${escapeHtml(t(item.label))})</span>`
  const paintClass = `${ITEM_CLASS} ${plainBorder ? '' : 'border-s-[3px]'} ${item.conflict ? CONFLICT_CLASS : ''} ${extraClass}`
  // Timed events keep a normal coarse-pointer button. Only its painted
  // child represents duration; the larger transparent target is not a
  // second, misleading duration block. Month/all-day chips are unchanged.
  return `<button type="button" class="${style ? 'cal-timed-event flex w-full items-start border-0 bg-transparent p-0 text-start focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)]' : paintClass}" ${style ? `style="${style}"` : ''} data-cal-item="${index}"${item.conflict ? ' data-cal-conflict="true"' : ''} aria-label="${escapeHtml(itemLabel(item))}">
    ${style ? `<span class="cal-event-paint ${paintClass} max-[720px]:truncate min-[721px]:[align-content:safe_center]" style="height:var(--cal-event-height)">${content}</span>` : content}
  </button>`
}

const coversDay = (item, day) =>
  item.allDay
    ? item.start.slice(0, 10) <= day && item.end.slice(0, 10) >= day
    : item.start < `${addDays(day, 1)}T00:00` && item.end > `${day}T00:00`

/** Greedy lanes so overlapping timed items sit side by side. */
function layoutDay(items) {
  const sorted = [...items].sort((a, b) => a.start - b.start)
  const lanes = []
  for (const entry of sorted) {
    const start = entry.start
    let lane = lanes.findIndex(end => end <= start)
    if (lane === -1) lane = lanes.length
    lanes[lane] = Math.max(start + 15, entry.end)
    entry.lane = lane
  }
  return {entries: sorted, laneCount: Math.max(lanes.length, 1)}
}

/* The grid's headers cannot stick through both its horizontal scroll host
 * and the page's vertical scrollport. Keep a small, non-panning context
 * strip in that outer scrollport instead of changing the grid geometry. */
function bindMobileContext(host) {
  const viewport = host.closest('[data-collab-body]')
  if (!viewport) return
  viewport._calendarContextAbort?.abort()
  const controller = new AbortController(), {signal} = controller
  viewport._calendarContextAbort = controller
  const context = document.createElement('div')
  context.className = 'collab-calendar-context'
  context.setAttribute('data-cal-context', '')
  context.setAttribute('aria-label', t('Calendar'))
  context.innerHTML = '<span data-cal-context-dates></span><span data-cal-context-time dir="ltr"></span>'
  const toolbar = viewport.querySelector('[data-cal-toolbar]')
  if (toolbar) toolbar.append(context)
  else host.before(context)
  const timed = host.querySelector('[data-timed]')
  const dateFormat = new Intl.DateTimeFormat(uiLocale.getLocale() === 'ar' ? 'ar-EG' : 'en-GB', {weekday: 'short', day: 'numeric', month: 'short'})
  const update = () => {
    if (signal.aborted || !host.isConnected) return
    const h = host.getBoundingClientRect(), v = viewport.getBoundingClientRect()
    const columns = [...host.querySelectorAll('[data-cal-column-date], [data-cal-weekday]')].filter(el => {
      const r = el.getBoundingClientRect()
      return r.right > Math.max(h.left, v.left) + 1 && r.left < Math.min(h.right, v.right) - 1
    })
    context.querySelector('[data-cal-context-dates]').textContent = columns.map(el =>
      el.dataset.calColumnDate ? dateFormat.format(parseLocal(el.dataset.calColumnDate)) : t(el.dataset.calWeekday)
    ).join(' · ')
    const time = context.querySelector('[data-cal-context-time]')
    time.hidden = !timed
    if (timed) {
      const r = timed.getBoundingClientRect(), grid = timed.firstElementChild.getBoundingClientRect()
      const top = Math.max(r.top, v.top, context.getBoundingClientRect().bottom), bottom = Math.min(r.bottom, v.bottom, innerHeight)
      const minute = y => Math.max(0, Math.min(24 * 60, Math.round((y - grid.top) / HOUR_PX * 60)))
      const clock = n => `${pad(Math.floor(n / 60))}:${pad(n % 60)}`
      time.textContent = `${clock(minute(top))}–${clock(minute(Math.max(top, bottom)))}`
    }
    host.style.setProperty('--cal-context-inset', `${(toolbar || context).getBoundingClientRect().height}px`)
  }
  let frame = 0
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; update() })
  }
  /* The collab body no longer scrolls — `.page-content` does — and the timed
     grid still does. One capture listener covers all three (and any nested
     viewport) without assuming which element owns scrolling (core/scroll.js). */
  document.addEventListener('scroll', schedule, {capture: true, passive: true, signal})
  const resize = new ResizeObserver(schedule)
  resize.observe(viewport)
  resize.observe(context)
  signal.addEventListener('abort', () => { resize.disconnect(); cancelAnimationFrame(frame); context.remove() }, {once: true})
  update()
  schedule()
}

/**
 * @param {HTMLElement} host
 * @param {{mode: string, date: string, todayKey: string, nowKey: string,
 *   items: {title: string, start: string, end: string, allDay: boolean, label: string}[],
 *   onSlot: (slot: {date: string, time?: string}) => void,
 *   onOpen: (index: number) => void,
 *   onMore: (date: string) => void}} options
 */
export function renderCalendar(host, {mode, date, todayKey, nowKey, items, onSlot, onOpen, onMore, enhanced = false, selectedDay, selectedId, onSelectDay}) {
  host.classList.add('collab-calendar-scroll')
  host.classList.toggle('collab-calendar-enhanced', enhanced)
  if (mode === 'month') renderMonth(host, {date, todayKey, items, enhanced, selectedDay})
  else renderTimeGrid(host, {days: mode === 'day' ? [date] : Array.from({length: 7}, (_, i) => addDays(startOfWeek(date), i)), todayKey, nowKey, items, enhanced})

  host.querySelectorAll('[data-cal-item]').forEach(button =>
    button.addEventListener('click', () => onOpen(Number(button.dataset.calItem)))
  )
  if (enhanced) host.querySelectorAll('[data-cal-item]').forEach(button => {
    button.setAttribute('aria-pressed', String(items[Number(button.dataset.calItem)].id === selectedId))
  })
  if (enhanced) host.querySelectorAll('[data-cal-column-date]').forEach(column => {
    if (column.dataset.calColumnDate === selectedDay) column.setAttribute('data-selected-day', 'true')
  })
  host.querySelectorAll('[data-cal-select-day]').forEach(button =>
    button.addEventListener('click', () => onSelectDay?.(button.dataset.calSelectDay)))
  if (enhanced) bindCalendarDates(host, 'data-cal-select-day', selectedDay, todayKey)
  host.querySelectorAll('[data-cal-slot]').forEach(button =>
    button.addEventListener('click', () => onSlot({date: button.dataset.calSlot, time: button.dataset.time || undefined}))
  )
  host.querySelectorAll('[data-cal-more]').forEach(button =>
    button.addEventListener('click', () => onMore(button.dataset.calMore))
  )
  const slots = [...host.querySelectorAll('[data-cal-slot]')]
  const initial = slots.find(slot => slot.dataset.calSlot === todayKey && (!slot.dataset.time || slot.dataset.time === '09:00')) || slots[0]
  slots.forEach(slot => {
    slot.tabIndex = slot === initial ? 0 : -1
    slot.addEventListener('focus', () => slots.forEach(other => { other.tabIndex = other === slot ? 0 : -1 }))
    slot.addEventListener('keydown', event => {
      const rtl = document.documentElement.dir === 'rtl'
      const horizontal = event.key === 'ArrowRight' ? (rtl ? -1 : 1) : event.key === 'ArrowLeft' ? (rtl ? 1 : -1) : 0
      let next
      if (mode === 'month') {
        const index = slots.indexOf(slot)
        const delta = horizontal || (event.key === 'ArrowDown' ? 7 : event.key === 'ArrowUp' ? -7 : 0)
        if (delta) next = slots[index + delta]
        else if (event.key === 'Home') next = slots[index - index % 7]
        else if (event.key === 'End') next = slots[index + 6 - index % 7]
      } else {
        const day = horizontal ? addDays(slot.dataset.calSlot, horizontal) : slot.dataset.calSlot
        let hour = Number(slot.dataset.time.slice(0, 2))
        if (event.key === 'ArrowDown') hour++
        if (event.key === 'ArrowUp') hour--
        if (event.key === 'Home') hour = 0
        if (event.key === 'End') hour = 23
        next = slots.find(candidate => candidate.dataset.calSlot === day && candidate.dataset.time === `${pad(hour)}:00`)
      }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
        event.preventDefault()
        next?.focus()
      }
    })
  })
  const scroller = host.querySelector('[data-timed]')
  if (scroller) scroller.scrollTop = DAY_START_SCROLL * HOUR_PX
  bindMobileContext(host)
}

function renderMonth(host, {date, todayKey, items, enhanced, selectedDay}) {
  const month = date.slice(0, 7)
  const days = monthGridDays(date)
  host.innerHTML = `<div class="overflow-hidden rounded-lg border border-line" role="grid" aria-label="${escapeHtml(formatMonthTitle(date))}" data-cal-month>
    <div class="grid grid-cols-7 border-b border-line bg-[var(--line-2)]" role="row">${WEEKDAYS.map(day => `<div role="columnheader" data-cal-weekday="${day}" class="px-2 py-1.5 text-xs font-semibold text-muted">${t(day)}</div>`).join('')}</div>
    ${Array.from({length: 6}, (_, week) => `<div class="grid grid-cols-7" role="row">${days
      .slice(week * 7, week * 7 + 7)
      .map(day => {
        const dayItems = items
          .map((item, index) => ({item, index}))
          .filter(({item}) => coversDay(item, day))
          .sort((a, b) => Number(b.item.allDay) - Number(a.item.allDay) || a.item.start.localeCompare(b.item.start))
        const shown = dayItems.slice(0, 3)
        const outside = day.slice(0, 7) !== month
        const isToday = day === todayKey
        return `<div role="gridcell" class="relative min-h-[104px] border-b border-e border-line p-1 ${isToday && !enhanced ? 'bg-[var(--accent-soft)] [box-shadow:inset_0_0_0_1px_var(--accent-line)]' : outside ? 'bg-[var(--line-2)] text-faint' : 'bg-surface'}" data-date="${day}"${enhanced && day === selectedDay ? ' data-selected-day="true"' : ''}${outside ? ' data-outside="true"' : ''}${isToday ? ' aria-current="date"' : ''}>
          <button type="button" class="absolute inset-0 border-0 bg-transparent focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)]" data-cal-slot="${day}" aria-label="${t('New on')} ${escapeHtml(longDay(day))}"></button>
          <${enhanced ? `button type="button" data-cal-select-day="${day}" aria-label="${escapeHtml(longDay(day))}" aria-pressed="${day === selectedDay}"` : 'span'} class="relative inline-grid size-6 place-items-center rounded-full text-xs ${isToday ? 'bg-[var(--accent)] font-semibold text-inverse' : ''}">${Number(day.slice(8)).toLocaleString(uiLocale.getLocale() === 'ar' ? 'ar-EG' : 'en-GB')}${isToday ? `<span class="sr-only"> ${t('(today)')}</span>` : ''}</${enhanced ? 'button' : 'span'}>
          <div class="relative mt-0.5 grid gap-0.5">${shown.map(({item, index}) => itemButton(item, index, 'truncate', '', item.start.slice(0, 10) < day ? t('Continues') : formatTime(item.start), enhanced)).join('')}
            ${dayItems.length > 3 ? `<button type="button" class="justify-self-start border-0 bg-transparent px-1 text-xs text-accent hover:underline" data-cal-more="${day}">+${dayItems.length - 3} more</button>` : ''}
          </div>
        </div>`
      })
      .join('')}</div>`).join('')}
  </div>`
}

function renderTimeGrid(host, {days, todayKey, nowKey, items, enhanced}) {
  const columns = `grid-template-columns:56px repeat(${days.length},minmax(0,1fr))`
  const allDay = days.map(day =>
    items.map((item, index) => ({item, index})).filter(({item}) => item.allDay && coversDay(item, day))
  )
  const hours = Array.from({length: 24}, (_, hour) => hour)
  host.innerHTML = `<div class="overflow-hidden rounded-lg border border-line bg-surface" ${days.length > 1 ? 'data-cal-week' : 'data-cal-day'}>
    <div class="grid border-b border-line" style="${columns}">
      <div></div>
      ${days.map(day => {
        const isToday = day === todayKey
        const locale = uiLocale.getLocale() === 'ar' ? 'ar-EG' : 'en-GB'
        const stamp = options => escapeHtml(parseLocal(day).toLocaleDateString(locale, options))
        return `<div data-cal-column-date="${day}" class="border-s border-line px-2 py-1.5 text-xs ${enhanced ? 'event-calendar-date-header' : isToday ? 'font-semibold text-accent bg-[var(--accent-soft)] border-t-2 border-t-[var(--accent)]' : 'text-muted'}"${isToday ? ' aria-current="date"' : ''}>
          ${enhanced ? `<span class="event-calendar-heading"><span class="event-calendar-day-number${isToday ? ' is-today' : ''}">${stamp({day: 'numeric'})}</span><span class="event-calendar-day-caption"><span>${stamp({weekday: 'short'})}</span><span>${stamp({month: 'short', year: 'numeric'})}</span></span></span>` : escapeHtml(longDay(day))}</div>`
      }).join('')}
    </div>
    <div class="grid border-b border-line" style="${columns}" data-allday-row aria-label="${escapeHtml(t("All-day"))}">
      <div class="px-1.5 py-1 text-[11px] text-muted">${t("All day")}</div>
      ${allDay.map(entries => `<div class="grid min-h-8 gap-0.5 border-s border-line p-1">${entries.map(({item, index}) => itemButton(item, index, 'truncate', '', undefined, false, enhanced)).join('')}</div>`).join('')}
    </div>
    <div class="relative max-h-[560px] overflow-auto" data-timed>
      <div class="grid" style="${columns}">
        <div>${hours.map(hour => `<div class="h-12 pe-1.5 text-end text-[11px] text-muted">${pad(hour)}:00</div>`).join('')}</div>
        ${days
          .map(day => {
            const timed = items
              .map((item, index) => ({item, index, start: 0, end: 0}))
              .filter(({item}) => !item.allDay && coversDay(item, day))
            timed.forEach(entry => {
              const start = entry.item.start.slice(0, 10) < day ? 0 : minutesOf(entry.item.start)
              const end = entry.item.end.slice(0, 10) > day ? 24 * 60 : minutesOf(entry.item.end)
              entry.start = start
              entry.end = Math.max(end, start + 30)
            })
            const {entries, laneCount} = layoutDay(timed)
            const nowLine =
              day === todayKey && nowKey
                ? `<div class="pointer-events-none absolute inset-x-0 z-[2] border-t-2 border-[var(--danger)]" style="top:${(minutesOf(nowKey) / 60) * HOUR_PX}px"><span class="sr-only">Now ${escapeHtml(formatTime(nowKey))}</span></div>`
                : ''
            return `<div class="relative border-s border-line ${day === todayKey && !enhanced ? 'bg-[var(--accent-soft)]' : ''}" data-cal-timed-date="${day}" style="height:${24 * HOUR_PX}px">
              ${hours.map(hour => `<button type="button" class="block h-12 w-full border-0 border-b border-[var(--line-2)] bg-transparent hover:bg-[var(--hover-overlay)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)]" data-cal-slot="${day}" data-time="${pad(hour)}:00" aria-label="${t('New at')} ${escapeHtml(longDay(day))} ${pad(hour)}:00"></button>`).join('')}
              ${entries
                .map(({item, index, lane, start, end}) => {
                  const width = 100 / laneCount
                  const height = ((end - start) / 60) * HOUR_PX - 2
                  const style = `position:absolute;top:${(start / 60) * HOUR_PX}px;height:${height}px;--cal-event-height:${height}px;inset-inline-start:calc(${lane * width}% + 2px);width:calc(${width}% - 4px);z-index:1`
                  return itemButton(item, index, '', style, item.start.slice(0, 10) < day ? 'Continues' : formatTime(item.start), false, enhanced)
                })
                .join('')}
              ${nowLine}
            </div>`
          })
          .join('')}
      </div>
    </div>
  </div>`
}
