const tableClass =
  'w-full border-collapse text-[12.5px] [&_th]:sticky [&_th]:top-0 [&_th]:z-[1] [&_th]:bg-[linear-gradient(var(--line-2),var(--line-2)),var(--surface)] [&_th]:px-3 [&_th]:py-2 [&_th]:text-start [&_th]:font-semibold [&_th]:text-muted [&_td]:border-t [&_td]:border-line [&_td]:px-3 [&_td]:py-2.5 [&_td]:align-middle'

/** The section keys this render pass actually mounts — set by
    renderOrganizationSections() before any body renders, since a body can
    only be built once per pass and every card helper above needs to know
    up front whether its target tab exists. */
let navigableSections = new Set()

function card(title, body, options = '') {
  return `<section class="org-card [border:1px_solid_var(--line)] rounded-lg overflow-hidden bg-surface ${options}"><div class="org-card-hd flex items-center justify-between gap-2.5 [padding:8px_12px] [font-size:12.5px] font-bold bg-[var(--line-2)]"><span>${title}</span></div><div class="rec-card-body [padding:12px]">${body}</div></section>`
}

function heading(key, sections, encodeHtml) {
  const section = sections[key]
  return `<header class="mb-3"><h2 class="m-0 text-[18px] font-semibold text-ink">${encodeHtml(section.title)}</h2><p class="mt-1 mb-0 text-[12.5px] text-muted">${encodeHtml(section.description)}</p></header>`
}

function badge(value, tone = 'gray') {
  return `<span class="badge ${tone}">${value}</span>`
}

function table(headers, rows, emptyCopy = 'No matching records') {
  const body = rows.length
    ? rows.join('')
    : `<tr><td colspan="${headers.length}" class="text-center text-muted! py-8!">${emptyCopy}</td></tr>`
  return `<div class="max-h-[430px] overflow-auto rounded-md border border-line"><table class="${tableClass}"><thead><tr>${headers.map(label => `<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`
}

/** Mount point for a data-list-driven table section — same canvas/fnav
    contract journal-entry.js/screen-parameters.js use to activate a
    DATA_LIST_CONFIG instance inside a dialog/panel (real Filter/Search/
    Columns/sort/pagination UX), instead of the plain table() helper. */
function dataListMount(id) {
  return `<div class="canvas [overflow:visible]! mt-0!" id="organization-${id}-canvas"></div><div class="fnav fnav-list flex items-center gap-5 [padding:9px_0_0]" id="organization-${id}-fnav"></div>`
}

function sectionMessage(title, body, dataListIcon, icon = 'i-help') {
  return `<aside data-organization-section-message role="note" class="mb-3 flex items-start gap-3 rounded-md bg-[var(--info-soft-bg)] p-3 text-ink"><span class="mt-0.5 flex size-6 flex-none items-center justify-center text-[var(--info-soft-ink)]">${dataListIcon(icon, 17)}</span><div class="min-w-0"><strong class="block text-[13px] font-semibold">${title}</strong><p class="mt-1 mb-0 text-xs leading-5 text-muted">${body}</p></div></aside>`
}

/** Small rounded pill — a trend delta ("↑12%"), a live indicator, or a
    plain status chip. `tone` picks the pill's own background/ink
    (independent of --stat-tone, since a pill can read positive even on a
    card whose overall tone is a warning, e.g. a metric trending down is
    good news even inside a "workflow exceptions" card). */
function statPill(text, tone, icon) {
  const toneClass =
    tone === 'success'
      ? 'bg-[var(--success-soft-bg)] text-[var(--success-soft-ink)]'
      : tone === 'danger'
        ? 'bg-[var(--danger-soft-bg)] text-[var(--danger-soft-ink)]'
        : 'bg-[var(--line-2)] text-muted'
  return `<span class="inline-flex items-center gap-1 rounded-full [padding:3px_10px] text-xs font-semibold [flex:none] ${toneClass}">${icon || ''}${text}</span>`
}

/** Directional trend pill computed from a metric's own history —
    "↑12%" / "↓8%" comparing the last two points, colored by whether that
    direction is good or bad for THIS metric (lowerIsBetter flips it). */
function trendPill(trend, lowerIsBetter) {
  const previous = trend[trend.length - 2]
  const latest = trend[trend.length - 1]
  const delta = previous ? Math.round(((latest - previous) / previous) * 100) : 0
  const up = delta >= 0
  const good = lowerIsBetter ? !up : up
  const arrow = up
    ? '<svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 9 9 3M9 3H4M9 3v5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>'
    : '<svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3 9 9M9 9H4M9 9V4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>'
  return statPill(`${Math.abs(delta)}%`, good ? 'success' : 'danger', arrow)
}

const LIVE_PILL = `<span class="inline-flex items-center gap-1.5 rounded-full [padding:3px_10px] text-xs font-semibold [flex:none] bg-[var(--success-soft-bg)] text-[var(--success-soft-ink)]"><span class="[width:6px] [height:6px] rounded-full [background:currentColor]"></span>Live</span>`

/** Card header: icon chip, title + subtitle stacked, and a trailing
    pill (trend delta, "Live", or none) plus a decorative overflow-menu
    dot — the two-line label the app's plain single-line statHeader
    didn't carry. */
function statHeader(label, subtitle, icon, dataListIcon, pill) {
  return `<div class="flex min-w-0 gap-2.5 items-start justify-between"><div class="flex min-w-0 gap-2.5 items-center"><span class="flex [flex:none] items-center justify-center [width:34px] [height:34px] rounded-lg [background:color-mix(in_srgb,_var(--stat-tone)_14%,_transparent)] [color:var(--stat-tone)]">${dataListIcon(icon, 18)}</span><div class="min-w-0"><strong class="block overflow-hidden text-ink text-[13.5px] font-bold text-ellipsis whitespace-nowrap">${label}</strong><span class="block overflow-hidden text-muted text-xs text-ellipsis whitespace-nowrap">${subtitle}</span></div></div><div class="flex [flex:none] items-center gap-1.5">${pill || ''}</div></div>`
}

/** Overview stat card. Cards whose target section is still navigable
    render as a real button that jumps to it; a card pointing at a hidden
    section (fields.js's ORGANIZATION_HIDDEN_SECTIONS) falls back to a
    plain div with the same look, so the metric stays on the overview
    without offering an entry point to a tab the nav no longer shows. */
function statCardShell(section, tone, body) {
  const classes = `org-stat-card flex h-full w-full min-w-0 flex-col gap-4 [--stat-tone:var(--accent)] [padding:16px] [border:1px_solid_var(--line)] [border-radius:12px] bg-surface [box-shadow:var(--shadow-1)] text-start [&[data-tone=success]]:[--stat-tone:var(--success)] [&[data-tone=warning]]:[--stat-tone:var(--st-pend-ink)] [&[data-tone=danger]]:[--stat-tone:var(--danger)]${navigableSections.has(section) ? ' hover:[border-color:var(--stat-tone)] focus-visible:[outline:2px_solid_var(--focus)]' : ''}`
  if (!navigableSections.has(section)) return `<div data-tone="${tone}" class="${classes}">${body}</div>`
  return `<button type="button" data-organization-open-section="${section}" data-tone="${tone}" class="${classes}">${body}</button>`
}

function statGridCell(cardMarkup, desktopPlacement) {
  return `<div data-organization-stat-cell class="grid min-w-0 ${desktopPlacement}">${cardMarkup}</div>`
}

/** Segmented semicircular gauge — a ring of short radial ticks swept
    through 180°, colored up to `progress`% and dimmed beyond, matching
    the tick vocabulary already used by the uptime history bars
    (renderServiceUptime) rather than a smooth stroke arc. The value and
    its detail sit absolutely positioned INSIDE the arc's own negative
    space (tight under the curve, like a real gauge readout), not
    stacked below it with extra card height — `size` is the gauge's
    square viewBox side in px; scaleMax labels the arc's two ends. */
function radialGauge(progress, size, scaleMax, value, detail) {
  const clamped = Math.max(0, Math.min(100, progress))
  const cx = size / 2
  const cy = size / 2
  const outerR = size / 2 - 4
  const innerR = outerR - size * 0.1
  const tickCount = 34
  const activeTicks = Math.round((clamped / 100) * tickCount)
  const ticks = Array.from({length: tickCount}, (_, index) => {
    const angle = Math.PI + (index / (tickCount - 1)) * Math.PI
    const x1 = cx + innerR * Math.cos(angle)
    const y1 = cy + innerR * Math.sin(angle)
    const x2 = cx + outerR * Math.cos(angle)
    const y2 = cy + outerR * Math.sin(angle)
    const active = index < activeTicks
    return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${active ? 'var(--stat-tone)' : 'var(--line-2)'}" stroke-width="3.5" stroke-linecap="round" />`
  }).join('')
  const scale =
    scaleMax === undefined
      ? ''
      : `<div class="flex items-center justify-between text-xs text-muted px-1 -mt-1.5"><span>0</span><span>${scaleMax}</span></div>`
  return `<div class="w-[80%] mb-2"><div class="relative"><svg class="w-full h-auto" viewBox="0 0 ${size} ${size * 0.56}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${ticks}</svg><div class="absolute inset-x-0 top-[52%] grid place-items-center text-center px-2"><strong class="[font-variant-numeric:tabular-nums] block text-ink text-[36px] font-bold leading-[1.1] tracking-[-0.01em] overflow-hidden text-ellipsis whitespace-nowrap max-w-full">${value}</strong><small class="mt-0.5 block overflow-hidden text-muted text-xs text-ellipsis whitespace-nowrap max-w-full">${detail}</small></div></div>${scale}</div>`
}

/** Gauge card: header row, a large arc with the value + repeated label
    overlaid inside its own negative space and 0/scale-max endpoints
    below, then a pill row calling out the supporting detail (e.g. "5
    application sessions") — the layout a genuine fraction-of-a-whole
    metric reads best in (Active users of total accounts, Database
    sessions blocking share). `extra` appends further content below the
    detail row (Active users' Recent active users avatar strip). */
function statGaugeCard(
  label,
  subtitle,
  value,
  detail,
  section,
  icon,
  tone,
  progress,
  scaleMax,
  dataListIcon,
  headerPill,
  detailPillIcon,
  extra
) {
  const detailRow = detailPillIcon
    ? `<div class="flex justify-center">${statPill(detail, 'neutral', dataListIcon(detailPillIcon, 13))}</div>`
    : `<small class="inline-flex items-center gap-1 rounded-full [padding:3px_10px] text-xs font-semibold [flex:none] bg-[var(--line-2)] text-muted">${detail}</small>`
  const gaugeCenter = `<div data-organization-gauge-center class="flex min-h-0 w-full flex-1 flex-col items-center justify-center">${radialGauge(progress, 200, scaleMax, value, label)}${detailRow}</div>`
  const body = `${statHeader(label, subtitle, icon, dataListIcon, headerPill)}${gaugeCenter}${extra || ''}`
  return statCardShell(section, tone, body)
}

const AVATAR_TONE_CLASS = [
  'bg-[var(--avatar-tone-1-bg)] text-[var(--avatar-tone-1-ink)]',
  'bg-[var(--avatar-tone-2-bg)] text-[var(--avatar-tone-2-ink)]',
  'bg-[var(--avatar-tone-3-bg)] text-[var(--avatar-tone-3-ink)]',
  'bg-[var(--avatar-tone-4-bg)] text-[var(--avatar-tone-4-ink)]',
  'bg-[var(--avatar-tone-5-bg)] text-[var(--avatar-tone-5-ink)]',
]

function initialsOf(name) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase()
}

/** Recent-active-users strip: up to 4 avatar initials (colored, with an
    online dot) plus a "+N" overflow avatar, and a "View all" link to the
    Application sessions section — sourced from the same non-protected
    session rows the card's own "N application sessions" detail pill
    already counts, not fabricated data. */
function recentActiveUsers(users, encodeHtml) {
  const shown = users.slice(0, 4)
  const overflow = users.length - shown.length
  const avatars = shown
    .map(
      (user, index) =>
        `<div class="relative [flex:none]"><span class="flex items-center justify-center [width:44px] [height:44px] rounded-full text-[13px] font-bold ${AVATAR_TONE_CLASS[index % AVATAR_TONE_CLASS.length]}">${encodeHtml(initialsOf(user))}</span><span class="absolute [bottom:1px] [inset-inline-end:1px] [width:10px] [height:10px] rounded-full [background:var(--success-fill)] [border:2px_solid_var(--surface)]"></span></div>`
    )
    .join('')
  const overflowAvatar =
    overflow > 0
      ? `<span class="flex items-center justify-center [width:44px] [height:44px] rounded-full [border:1.5px_dashed_var(--line)] text-xs font-semibold text-muted [flex:none]">+${overflow}</span>`
      : ''
  // A plain <span>, not a nested <button> — statCardShell already wraps
  // the whole card in a <button> that navigates to the same section, so
  // this is a visual affordance riding on that same click, not a second
  // interactive element (invalid HTML nested inside the card's button).
  return `<div class="mt-2 border-t border-line pt-3"><div class="mb-2.5 flex items-center justify-between"><strong class="text-[12.5px] font-bold text-ink">Recent active users</strong><span class="inline-flex items-center gap-1 text-xs font-semibold text-accent">View all →</span></div><div class="flex items-center gap-2">${avatars}${overflowAvatar}</div></div>`
}

function sparklinePoints(trend, width, height) {
  const minimum = Math.min(...trend)
  const range = Math.max(...trend) - minimum || 1
  const step = trend.length > 1 ? width / (trend.length - 1) : 0
  return trend
    .map(
      (point, index) =>
        `${(index * step).toFixed(1)},${(height - ((point - minimum) / range) * height).toFixed(1)}`
    )
    .join(' ')
}

/** Area/line trend chart for a metric that changes over time or by day
    (Response time, and — for a consistent chart language across the
    trend cards — Workflow exceptions/Open alerts too, rather than mixing
    bars and lines side by side). Full-width, spans the whole card. */
function sparklineChart(trend, width = 280, height = 52) {
  const points = sparklinePoints(trend, width, height)
  return `<svg class="w-full h-auto" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><polygon points="0,${height} ${points} ${width},${height}" fill="color-mix(in srgb, var(--stat-tone) 14%, transparent)" stroke="none" /><polyline points="${points}" fill="none" stroke="var(--stat-tone)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" /></svg>`
}

/** Trend chart with quiet gridlines and the last point highlighted with
    a floating value pill + dashed guide line. Axis labels are omitted so
    the compact card spends its space on the trend itself. `unit` is
    appended to the tooltip pill's value (e.g. "320 ms" vs a bare "14"). */
function metricTrendChart(trend, unit, encodeHtml) {
  const width = 280
  const height = 82
  const padInline = 8
  const padTop = 22
  const padBottom = 6
  const plotHeight = height - padTop - padBottom
  const plotWidth = width - padInline * 2
  const minimum = Math.min(...trend)
  const maximum = Math.max(...trend)
  const range = maximum - minimum || 1
  const step = trend.length > 1 ? plotWidth / (trend.length - 1) : 0
  const points = trend.map((point, index) => {
    const x = padInline + index * step
    const y = padTop + plotHeight - ((point - minimum) / range) * plotHeight
    return {x, y}
  })
  const pointsAttr = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const last = points[points.length - 1]
  const gridlines = [minimum, Math.round((minimum + maximum) / 2), maximum]
  const gridlineMarkup = gridlines
    .map(gridlineValue => {
      const y = padTop + plotHeight - ((gridlineValue - minimum) / range) * plotHeight
      return `<line x1="${padInline}" y1="${y.toFixed(1)}" x2="${width - padInline}" y2="${y.toFixed(1)}" stroke="var(--line-2)" stroke-width="1" stroke-dasharray="3 3" />`
    })
    .join('')
  const tooltipValue = `${last ? trend[trend.length - 1] : 0}${unit ? ` ${unit}` : ''}`
  const tooltipWidth = 20 + tooltipValue.length * 6
  const tooltipX = Math.min(Math.max(last.x - tooltipWidth / 2, 0), width - tooltipWidth)
  return `<svg data-organization-trend-chart class="mt-auto mx-auto w-full max-w-[480px] h-auto" viewBox="0 0 ${width} ${height}" aria-hidden="true">${gridlineMarkup}<line x1="${last.x.toFixed(1)}" y1="${last.y.toFixed(1)}" x2="${last.x.toFixed(1)}" y2="${(height - padBottom).toFixed(1)}" stroke="var(--stat-tone)" stroke-width="1" stroke-dasharray="3 3" /><polygon points="${padInline},${height - padBottom} ${pointsAttr} ${width - padInline},${height - padBottom}" fill="color-mix(in srgb, var(--stat-tone) 14%, transparent)" stroke="none" /><polyline points="${pointsAttr}" fill="none" stroke="var(--stat-tone)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" /><circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="7" fill="var(--stat-tone)" opacity="0.18" /><circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="3.5" fill="var(--stat-tone)" stroke="var(--surface)" stroke-width="1.5" /><g transform="translate(${tooltipX.toFixed(1)}, ${Math.max(0, last.y - 22).toFixed(1)})"><rect width="${tooltipWidth}" height="16" rx="4" fill="var(--tooltip-bg)" /><text x="${tooltipWidth / 2}" y="11" font-size="10" font-weight="600" fill="var(--tooltip-ink)" text-anchor="middle">${encodeHtml(tooltipValue)}</text></g></svg>`
}

/** Trend card: header row, headline number (with an optional smaller
    unit suffix) and a dot-marked detail pill, then the chart spanning
    the full card width at the bottom — the layout a time-series or
    count-over-time metric reads best in (Response time, Workflow
    exceptions, Open alerts), distinct from the gauge card's layout
    since these aren't fractions of a whole. */
function statTrendCard(
  label,
  subtitle,
  value,
  unit,
  detail,
  detailGood,
  section,
  icon,
  tone,
  chart,
  dataListIcon,
  headerPill
) {
  const valueMarkup = unit
    ? `${value} <span class="text-[16px] font-semibold text-muted">${unit}</span>`
    : value
  const dotTone = detailGood ? 'var(--success)' : 'var(--muted)'
  const body = `${statHeader(label, subtitle, icon, dataListIcon, headerPill)}<div><strong class="[font-variant-numeric:tabular-nums] block overflow-hidden text-ink text-[28px] font-bold [line-height:1.1] [letter-spacing:-0.01em] text-ellipsis whitespace-nowrap">${valueMarkup}</strong><span class="mt-1 inline-flex items-center gap-1.5 text-xs text-muted"><span class="[width:6px] [height:6px] rounded-full [flex:none]" style="background:${dotTone}"></span>${detail}</span></div>${chart}`
  return statCardShell(section, tone, body)
}

function fractionOf(text) {
  const match = /^(\d+)\s+of\s+(\d+)/.exec(text || '')
  if (!match) return null
  const [, healthy, total] = match
  return {
    healthy: Number(healthy),
    total: Number(total),
    percent: Math.round((Number(healthy) / Number(total)) * 100),
  }
}

/** Compact status row for a health fraction (Background jobs,
    Integrations) — a colored dot plus the "N of M" figure, no gauge;
    the card's own line chart above already carries the visual trend. */
function statusDot(label, text, encodeHtml) {
  const fraction = fractionOf(text)
  const tone = !fraction
    ? 'var(--muted)'
    : fraction.percent >= 95
      ? 'var(--success)'
      : fraction.percent >= 80
        ? 'var(--st-pend-ink)'
        : 'var(--danger)'
  return `<div class="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0"><span class="[width:8px] [height:8px] rounded-full [flex:none]" style="background:${tone}"></span><span class="text-xs text-muted">${label}</span><strong class="ms-auto text-[13px]">${encodeHtml(text)}</strong></div>`
}

function relativeTimestamp(timestamp) {
  const then = new Date(timestamp.replace(' ', 'T'))
  const hours = Math.round((Date.now() - then.getTime()) / 3_600_000)
  if (hours < 0) return 'Scheduled'
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function renderOverview(data, role, encodeHtml, dataListIcon) {
  const appSessions = data.applicationSessions.length
  const totalUsers = data.users.length || 1
  const activeUsers = new Set(
    data.applicationSessions.filter(row => !row.protected).map(row => row.user)
  ).size
  const exceptions = data.staff.reduce((sum, row) => sum + row.slaBreaches, 0)
  const blockingSessions = data.databaseSessions.filter(row => row.blocking !== 'No').length
  const responseMs = Number.parseInt(data.health.responseTime, 10) || 0
  // Wide screens use a fixed two-row bento: Active users owns the full
  // first column, while the remaining metrics occupy one cell each.
  // Below that breakpoint, source order drives the ordinary two- or
  // one-column reflow without desktop placement leaving holes.
  const activeUserNames = [
    ...new Set(data.applicationSessions.filter(row => !row.protected).map(row => row.user)),
  ]
  const activeUsersCard = statGaugeCard(
    'Active users',
    'Currently using the application',
    activeUsers,
    `${appSessions} application sessions`,
    'application-sessions',
    'i-user',
    'neutral',
    Math.round((activeUsers / totalUsers) * 100),
    totalUsers,
    dataListIcon,
    LIVE_PILL,
    'i-user',
    recentActiveUsers(activeUserNames, encodeHtml)
  )
  const openAlertsCard = statTrendCard(
    'Open alerts',
    'Active system alerts',
    data.health.openAlerts,
    '',
    `${data.health.slowOperations} slow operations`,
    false,
    'performance',
    'i-warn',
    data.health.openAlerts ? 'danger' : 'neutral',
    metricTrendChart(data.health.openAlertsTrend, '', encodeHtml),
    dataListIcon,
    trendPill(data.health.openAlertsTrend, true)
  )
  const responseTimeCard = statTrendCard(
    'Response time',
    'Average API response time',
    responseMs,
    'ms',
    `${data.health.availability} availability`,
    true,
    'performance',
    'i-clock',
    'success',
    metricTrendChart(data.health.responseTimeTrend, 'ms', encodeHtml),
    dataListIcon,
    trendPill(data.health.responseTimeTrend, true)
  )
  const databaseSessionsCard =
    role === 'administrator'
      ? statGaugeCard(
          'Database sessions',
          'Active and blocking sessions',
          data.databaseSessions.length,
          `${blockingSessions} blocking or blocked`,
          'database-sessions',
          'i-lock',
          blockingSessions ? 'warning' : 'neutral',
          Math.round((blockingSessions / (data.databaseSessions.length || 1)) * 100),
          data.databaseSessions.length,
          dataListIcon
        )
      : ''
  const workflowExceptionsCard = statTrendCard(
    'Workflow exceptions',
    'Exceptions in workflow execution',
    exceptions,
    '',
    'Needs operational review',
    false,
    'staff',
    'i-warn',
    exceptions ? 'warning' : 'neutral',
    metricTrendChart(data.health.exceptionsTrend, '', encodeHtml),
    dataListIcon,
    trendPill(data.health.exceptionsTrend, true)
  )

  const statCells = [
    statGridCell(
      activeUsersCard,
      '[@media((min-width:800px)_and_(max-width:1299px))]:col-span-2 [@media((min-width:1300px))]:col-start-1 [@media((min-width:1300px))]:row-start-1 [@media((min-width:1300px))]:row-span-2'
    ),
    statGridCell(
      responseTimeCard,
      '[@media((min-width:1300px))]:col-start-2 [@media((min-width:1300px))]:row-start-1'
    ),
    statGridCell(
      workflowExceptionsCard,
      '[@media((min-width:1300px))]:col-start-3 [@media((min-width:1300px))]:row-start-1'
    ),
    databaseSessionsCard
      ? statGridCell(
          databaseSessionsCard,
          '[@media((min-width:1300px))]:col-start-2 [@media((min-width:1300px))]:row-start-2'
        )
      : '',
    statGridCell(
      openAlertsCard,
      role === 'administrator'
        ? '[@media((min-width:1300px))]:col-start-3 [@media((min-width:1300px))]:row-start-2'
        : '[@media((min-width:800px)_and_(max-width:1299px))]:col-span-2 [@media((min-width:1300px))]:col-start-2 [@media((min-width:1300px))]:col-span-2 [@media((min-width:1300px))]:row-start-2'
    ),
  ].join('')
  const healthTrend = data.health.operationalHealthTrend
  const healthNow = healthTrend[healthTrend.length - 1]
  const healthTone =
    healthNow >= 95 ? 'var(--success)' : healthNow >= 80 ? 'var(--st-pend-ink)' : 'var(--danger)'
  const operationalStatus = `<div class="flex items-start justify-between gap-3"><div><span class="block text-xs text-muted">Composite health, last 7 days</span><strong class="mt-1 block text-[26px] font-bold [line-height:1.1]" style="color:${healthTone}">${healthNow}%</strong><span class="text-xs text-muted">${encodeHtml(data.details.environment)} · ${encodeHtml(data.details.defaultBranch)}</span></div><div class="w-[130px] [flex:none]" style="--stat-tone:${healthTone}">${sparklineChart(healthTrend)}</div></div><dl class="m-0 mt-3 divide-y divide-line border-t border-line">${statusDot('Background jobs', data.health.backgroundJobs, encodeHtml)}${statusDot('Integrations', data.health.integrations, encodeHtml)}</dl><div class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-line pt-3 text-xs"><div><dt class="text-muted">Queue depth</dt><dd class="m-0 mt-0.5 font-semibold text-[13px]">${data.health.queueDepth} operations</dd></div><div><dt class="text-muted">Last deploy</dt><dd class="m-0 mt-0.5 font-semibold text-[13px]">${encodeHtml(relativeTimestamp(data.health.lastDeploy))}</dd></div><div><dt class="text-muted">Last backup</dt><dd class="m-0 mt-0.5 font-semibold text-[13px]">${encodeHtml(relativeTimestamp(data.health.lastBackup))}</dd></div><div><dt class="text-muted">Next maintenance</dt><dd class="m-0 mt-0.5 font-semibold text-[13px]">${encodeHtml(data.health.nextMaintenance.slice(0, 10))}</dd></div></div>`

  // The "Recent activity" card (audit-log rows + its "View audit log"
  // shortcut) is gone with the hidden Audit log tab — Operational status
  // now owns the full width below the stat grid.
  return `<div data-organization-stat-grid class="mb-4 grid grid-cols-1 gap-3 [@media((min-width:800px)_and_(max-width:1299px))]:grid-cols-2 [@media((min-width:1300px))]:grid-cols-3 [@media((min-width:1300px))]:grid-rows-2">${statCells}</div>${card('Operational status', operationalStatus)}`
}

/** Organization settings is a read-only reference view for every role:
    values render as plain text (no inputs, no save/undo bar), so the tab
    can never imply an edit that this screen doesn't offer. */
function renderSettings(details, encodeHtml) {
  const fields = [
    ['displayName', 'Display name'],
    ['legalName', 'Legal name'],
    ['registrationNumber', 'Registration number'],
    ['locale', 'Locale'],
    ['timezone', 'Timezone'],
    ['currency', 'Base currency'],
    ['fiscalYearStart', 'Fiscal year starts'],
    ['defaultBranch', 'Default branch'],
  ]
    .map(
      ([key, label]) =>
        `<div class="grid min-w-0 gap-1"><dt class="text-xs text-muted">${label}</dt><dd class="m-0 break-words text-[13px] font-semibold text-ink">${encodeHtml(details[key])}</dd></div>`
    )
    .join('')
  return card(
    'Organization identity and defaults',
    `<dl class="m-0 grid grid-cols-2 gap-x-4 gap-y-3 [@media((max-width:720px))]:grid-cols-1">${fields}</dl><p class="mt-4 mb-0 text-xs text-muted">Read-only view of the organization's legal identity, regional defaults, and fiscal configuration.</p>`
  )
}

function renderUsers() {
  return dataListMount('users')
}

function renderApplicationSessions(dataListIcon) {
  return `${sectionMessage('Session safety', 'IP addresses are masked. Revoking a session requires a reason and creates an audit event. Current and system sessions are protected.', dataListIcon, 'i-lock')}${dataListMount('app-sessions')}`
}

function renderDatabaseSessions(dataListIcon) {
  return `${sectionMessage('Privileged operation', 'Session details omit credentials, parameters, and full SQL. Termination requires an operational reason and is recorded in the audit log.', dataListIcon, 'i-lock')}${dataListMount('db-sessions')}`
}

function renderAudit() {
  return dataListMount('audit')
}

const SEGMENT_TONE = {
  up: 'bg-[var(--success-fill)]',
  degraded: 'bg-[var(--warn-ink)]',
  down: 'bg-[var(--danger)]',
}
const STATUS_LABEL = {up: 'Operational', degraded: 'Degraded performance', down: 'Outage'}
const STATUS_BADGE_TONE = {up: 'ok', degraded: 'warn', down: 'danger'}

function renderStatusBanner(services) {
  const worst = services.some(service => service.status === 'down')
    ? 'down'
    : services.some(service => service.status === 'degraded')
      ? 'degraded'
      : 'up'
  const tone =
    worst === 'up'
      ? 'bg-[var(--success-fill)] text-[var(--surface)]'
      : worst === 'degraded'
        ? 'bg-[var(--warn-bg)] text-[var(--warn-ink)]'
        : 'bg-[var(--danger-soft-bg)] text-[var(--danger)]'
  const copy =
    worst === 'up'
      ? 'All systems operational'
      : worst === 'degraded'
        ? 'Some systems degraded'
        : 'Service disruption in progress'
  return `<div class="mb-4 flex items-center gap-2.5 rounded-lg px-4 py-3 font-semibold ${tone}"><svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm3.7 6.2-4.6 4.6a.8.8 0 0 1-1.13 0L6.3 10.6a.8.8 0 1 1 1.13-1.13l1.1 1.1 4.04-4.04a.8.8 0 1 1 1.13 1.13Z" fill="currentColor"/></svg><span>${copy}</span></div>`
}

function segmentDayLabel(daysAgo) {
  if (daysAgo === 0) return 'Today'
  if (daysAgo === 1) return 'Yesterday'
  return `${daysAgo} days ago`
}

function segmentDate(daysAgo) {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})
}

const STATUS_DETAIL = {
  up: 'No incidents recorded',
  degraded: 'Elevated response time or partial impact',
  down: 'Service unavailable',
}

function renderServiceUptime(service, encodeHtml) {
  const total = service.history.length
  const segments = service.history
    .map((day, index) => {
      const daysAgo = total - 1 - index
      return `<span class="org-uptime-seg relative h-full flex-1 min-w-[3px] [padding-inline:0.5px] cursor-default" style="--stat-tone:${day === 'up' ? 'var(--success-fill)' : day === 'degraded' ? 'var(--warn-ink)' : 'var(--danger)'}"><span class="block h-full w-full rounded-[1px] transition-transform ${SEGMENT_TONE[day]} [.org-uptime-seg:hover_&]:[outline:2px_solid_var(--stat-tone)] [.org-uptime-seg:hover_&]:[outline-offset:1px] [.org-uptime-seg:hover_&]:scale-y-110"></span><span class="org-uptime-tip pointer-events-none absolute [inset-block-end:calc(100%+7px)] [inset-inline-start:50%] [translate:-50%_0] whitespace-nowrap rounded [padding:6px_9px] text-xs opacity-0 [transition:opacity_0.1s] [background:var(--tooltip-bg)] [color:var(--tooltip-ink)] [z-index:40] grid gap-0.5 [.org-uptime-seg:hover_&]:opacity-100"><strong class="text-[12.5px] font-semibold">${encodeHtml(segmentDayLabel(daysAgo))} · ${encodeHtml(segmentDate(daysAgo))}</strong><span class="opacity-80">${encodeHtml(STATUS_LABEL[day])} — ${encodeHtml(STATUS_DETAIL[day])}</span></span></span>`
    })
    .join('')
  return `<div class="border-t border-line py-3.5 first:border-t-0 first:pt-0"><div class="mb-2 flex flex-wrap items-center justify-between gap-2"><div><strong class="block text-[13.5px]">${encodeHtml(service.name)}</strong><small class="text-muted">${encodeHtml(service.detail)}</small></div>${badge(STATUS_LABEL[service.status], STATUS_BADGE_TONE[service.status])}</div><div class="org-uptime-track flex h-9 items-stretch [&:has(.org-uptime-seg:hover)_.org-uptime-seg>span:first-child]:opacity-60 [&_.org-uptime-seg:hover>span:first-child]:opacity-100!" role="img" aria-label="${encodeHtml(service.name)} uptime over the last 90 days, ${service.uptime}">${segments}</div><div class="mt-1.5 flex items-center justify-between text-xs text-muted"><span>90 days ago</span><span class="font-semibold text-ink">${service.uptime} uptime</span><span>Today</span></div></div>`
}

function performancePeriodChange(change, tone) {
  const rising = change >= 0
  const arrow = rising ? '↑' : '↓'
  const value = `${rising ? '+' : ''}${change}%`
  const toneClass =
    tone === 'success'
      ? 'bg-[var(--success-soft-bg)] text-[var(--success-soft-ink)]'
      : tone === 'warning'
        ? 'bg-[var(--warn-bg)] text-[var(--warn-ink)]'
        : 'bg-[var(--danger-soft-bg)] text-[var(--danger-soft-ink)]'
  return `<span data-organization-period-change class="grid flex-none gap-0.5 rounded-lg px-3 py-2 ${toneClass}"><strong class="text-[13px] font-bold">${arrow} ${value}</strong><small class="text-[10.5px] text-muted max-[620px]:hidden">vs. previous period</small></span>`
}

function performanceMetricShell(metric, dataListIcon, body) {
  return `<article data-organization-performance-metric data-tone="${metric.tone}" class="flex min-w-0 flex-col gap-4 rounded-xl border border-line bg-surface p-4 [box-shadow:var(--shadow-1)] [--stat-tone:var(--accent)] [&[data-tone=success]]:[--stat-tone:var(--success)] [&[data-tone=warning]]:[--stat-tone:var(--st-pend-ink)] [&[data-tone=danger]]:[--stat-tone:var(--danger)] ${metric.cardClass || ''}">${statHeader(metric.label, metric.subtitle, metric.icon, dataListIcon, metric.pill)}${body}</article>`
}

function performanceGaugeCard(metric, dataListIcon) {
  const summaries = metric.summaries
    .map(summary => `<div data-organization-availability-summary class="flex min-w-0 items-center gap-2 [@media((min-width:640px))]:justify-center"><span class="flex size-7 flex-none items-center justify-center text-muted">${dataListIcon(summary.icon, 17)}</span><span class="min-w-0"><strong class="block text-[13px] font-bold text-ink">${summary.value}</strong><small class="block text-[11px] leading-4 text-muted">${summary.label}</small></span></div>`)
    .join('')
  const gauge = `<div data-organization-performance-gauge class="flex min-h-[220px] flex-1 flex-col items-center justify-center">${radialGauge(metric.progress, 320, metric.scaleMax, metric.value, metric.label)}${statPill('Within target', 'success', dataListIcon('i-check', 12))}</div><div class="grid grid-cols-1 gap-3 border-t border-line pt-4 [@media((min-width:640px))]:grid-cols-3">${summaries}</div>`
  return performanceMetricShell(metric, dataListIcon, gauge)
}

function performanceTrendCard(metric, dataListIcon, encodeHtml) {
  const trend = `<div class="grid flex-1 items-end gap-3 [@media((min-width:1200px))]:grid-cols-[minmax(160px,_0.65fr)_minmax(240px,_1.35fr)]"><div><strong class="block truncate text-[28px] font-bold leading-none tracking-[-0.01em] text-ink [font-variant-numeric:tabular-nums]">${metric.value}</strong><span class="mt-2 inline-flex items-center gap-1.5 text-xs text-muted"><span class="size-1.5 flex-none rounded-full [background:var(--stat-tone)]"></span>${metric.detail}</span></div>${metricTrendChart(metric.trend, metric.unit, encodeHtml)}</div>`
  return performanceMetricShell(metric, dataListIcon, trend)
}

function estimatedDowntime(availability) {
  const unavailableSeconds = Math.round(86400 * (1 - Number.parseFloat(availability) / 100))
  return unavailableSeconds < 60 ? `${unavailableSeconds}s` : `${Math.floor(unavailableSeconds / 60)}m`
}

function availabilityPerformanceCard(health, dataListIcon) {
  return performanceGaugeCard(
    {
      label: 'Availability',
      subtitle: 'System uptime and service availability',
      value: health.availability,
      icon: 'i-check',
      tone: 'success',
      progress: Number.parseFloat(health.availability),
      scaleMax: '100%',
      pill: statPill('Within target', 'success', ''),
      cardClass: '[@media((min-width:1200px))]:col-start-1 [@media((min-width:1200px))]:row-span-3',
      summaries: [
        {icon: 'i-spark', value: `+${health.availabilityChange}%`, label: 'vs. previous period'},
        {icon: 'i-clock', value: estimatedDowntime(health.availability), label: 'Estimated downtime'},
        {icon: 'i-target', value: health.slaTarget, label: 'SLA target'},
      ],
    },
    dataListIcon
  )
}

function performanceTrendCards(health, dataListIcon, encodeHtml) {
  const trends = [
    {label: 'Median response time', subtitle: 'API and system response time', value: health.responseTime, detail: 'Stable over 24 hours', icon: 'i-clock', tone: 'success', trend: health.responseTimeTrend, unit: 'ms', pill: performancePeriodChange(health.responseTimeChange, 'success')},
    {label: 'Error rate', subtitle: 'Failed requests and system errors', value: health.errorRate, detail: `${health.openAlerts} alerts open`, icon: 'i-warn', tone: 'danger', trend: health.errorRateTrend, unit: '%', pill: performancePeriodChange(health.errorRateChange, 'danger')},
    {label: 'Queue depth', subtitle: 'Pending and scheduled operations', value: health.queueDepth, detail: '14 scheduled operations', icon: 'i-flow', tone: 'warning', trend: health.queueDepthTrend, unit: '', pill: performancePeriodChange(health.queueDepthChange, 'warning')},
  ]
  return trends.map(metric => performanceTrendCard(metric, dataListIcon, encodeHtml)).join('')
}

function renderPerformance(health, services, role, encodeHtml, dataListIcon) {
  const metrics = availabilityPerformanceCard(health, dataListIcon) + performanceTrendCards(health, dataListIcon, encodeHtml)
  const detailRows = [
    ['Sales invoice posting', '418 ms', 'Normal', 'Sales'],
    ['Inventory valuation report', '2.8 s', 'Slow', 'Inventory'],
    ['General ledger batch', '18 min', 'Running', 'Finance'],
    ['Warehouse synchronization', '6 min late', 'Attention', 'Integration'],
  ].map(row => `<tr>${row.map(value => `<td>${value}</td>`).join('')}</tr>`)
  const scopeNote =
    role === 'manager'
      ? '<p class="mt-3 mb-0 text-xs text-muted">Technical identifiers are hidden in the manager view; results are summarized by business module.</p>'
      : ''
  return `<div data-organization-performance-metrics class="mb-4 grid grid-cols-1 gap-3 [@media((min-width:1200px))]:grid-cols-[minmax(0,_1.05fr)_minmax(0,_1.2fr)] [@media((min-width:1200px))]:grid-rows-3">${metrics}</div>${renderStatusBanner(services)}${card('Service uptime', services.map(service => renderServiceUptime(service, encodeHtml)).join(''), 'mb-4')}${table(['Operation', 'Duration', 'State', 'Business area'], detailRows)}${scopeNote}`
}

function renderStaff(dataListIcon) {
  return `${sectionMessage('How to read these measures', 'These are workflow outcomes, not an employee score. Compare workload, aging, quality, and process context together before acting.', dataListIcon)}${dataListMount('staff')}`
}

export function renderOrganizationSections({
  sectionOrder,
  sections,
  role,
  data,
  activeKey,
  encodeHtml,
  dataListIcon,
}) {
  // Established before any body renders: stat cards ask this set whether
  // their target tab is one this pass actually mounts.
  navigableSections = new Set(sectionOrder)
  const bodies = {
    overview: () => renderOverview(data, role, encodeHtml, dataListIcon),
    settings: () => renderSettings(data.details, encodeHtml),
    users: () => renderUsers(),
    'application-sessions': () => renderApplicationSessions(dataListIcon),
    'database-sessions': () => renderDatabaseSessions(dataListIcon),
    audit: () => renderAudit(),
    performance: () => renderPerformance(data.health, data.services, role, encodeHtml, dataListIcon),
    staff: () => renderStaff(dataListIcon),
  }
  return sectionOrder
    .map(
      key =>
        `<section id="organization-section-${key}" data-organization-panel="${key}" role="tabpanel" aria-labelledby="organization-tab-${key}"${key === activeKey ? '' : ' hidden'}>${heading(key, sections, encodeHtml)}${bodies[key]()}</section>`
    )
    .join('')
}
