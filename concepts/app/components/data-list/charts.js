// Data-list chart rendering + lifecycle — moved out of
// concepts/app/legacy-app.js as part of Task 6.
//
// The original kept exactly one ApexCharts instance per context in a
// single module-level object (`dataListChartInstances`, keyed by context
// string) so a re-render could destroy the stale instance before creating
// the next one. Per the Task 6 architecture change (global/context-keyed
// state -> one createDataList(...) closure per context), that global map
// is replaced by createListChart({root, locale}), a small per-instance
// factory returning {render, destroy}: each createDataList call constructs
// its own chart handle, so the chart instance for the invoice list can
// never collide with or leak into the customer/geo lists' handles — there
// is nothing shared/global left to key by context.
//
// All markup/math bodies below (dataListChartColors/Theme/Fields/YOptions/
// YValue/Groups/formatDataListChartValue/dataListChartApexType, and the
// ApexCharts options object built in render()) are unchanged from the
// original renderDataListChart/initDataListChart — only the destroy-before-
// create bookkeeping moved from a global map into this factory's own
// closure variable, and `t`/`appLocale` reads become `deps.t`/
// `deps.locale.getLocale()` (this module has no closure over legacy-app.js's
// shared.locale binding).

/**
 * ApexCharts does real color math internally (hover states, opacity
 * blends, gridline tints) — it needs resolved hex/rgb strings, not
 * var(--token) references it can't compute with. resolveDesignToken reads
 * the Atlassian Design System's own --ds-chart-categorical-* / --ds-text-*
 * custom properties at call time so the chart automatically matches
 * whichever theme (light/dark/high-contrast) is active.
 * @param {string} name
 * @param {string} fallback
 */
function resolveDesignToken(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

function dataListChartColors() {
  const colors = [1, 2, 3, 4, 5, 6]
    .map(n => resolveDesignToken(`--ds-chart-categorical-${n}`, ''))
    .filter(Boolean)
  return colors.length
    ? colors
    : ['#1868DB', '#5B7F24', '#964AC0', '#BD5B00', '#1558BC', '#803FA5']
}

function dataListChartTheme() {
  return {
    text: resolveDesignToken('--ds-text-subtle', '#505258'),
    border: resolveDesignToken('--ds-border', '#091e4224'),
    surface: resolveDesignToken('--ds-surface-overlay', '#ffffff'),
    ink: resolveDesignToken('--ds-text', '#292a2e'),
  }
}

export const DATA_CHART_TYPES = [
  {key: 'bar', label: 'Bar', icon: 'i-chart'},
  {key: 'column', label: 'Column', icon: 'i-chart'},
  {key: 'line', label: 'Line', icon: 'i-chart'},
  {key: 'donut', label: 'Donut', icon: 'i-donut'},
  {key: 'polar', label: 'Polar', icon: 'i-donut'},
]

export function dataListChartFields(config) {
  return [...config.columns, ...(config.extraChartFields || [])]
}

export function dataListChartYOptions(config) {
  return dataListChartFields(config).filter(column => column.plottable)
}

function dataListChartYValue(row, field) {
  const raw = row[field.key]
  if (field.valueType === 'number') return Number(String(raw ?? '').replace(/,/g, '')) || 0
  if (field.valueType === 'date') {
    const [day, month, year] = String(raw ?? '').split('/')
    const parsed = day && month && year ? new Date(`${year}-${month}-${day}`) : new Date(raw)
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
  }
  return Number(raw) || 0
}

export function dataListChartGroups(rows, config, listState) {
  const allFields = dataListChartFields(config)
  const field = allFields.find(column => column.key === listState.chartField)
    ? listState.chartField
    : config.columns[0].key
  const yField = dataListChartYOptions(config).find(column => column.key === listState.chartYField)
  const sourceRows = listState.selected.size
    ? rows.filter(row => listState.selected.has(String(row[config.key])))
    : rows
  if (yField) {
    const xField = allFields.find(column => column.key === field)
    const totals = new Map()
    const xSortValues = new Map()
    sourceRows.forEach(row => {
      const label = String(row[field] ?? '—') || '—'
      totals.set(label, (totals.get(label) || 0) + dataListChartYValue(row, yField))
      if (!xSortValues.has(label))
        xSortValues.set(label, xField?.valueType ? dataListChartYValue(row, xField) : label)
    })
    const groups = [...totals.entries()].map(([label, count]) => ({label, count}))
    const sorted =
      xField?.valueType === 'date'
        ? groups.sort((left, right) =>
            xSortValues.get(left.label) > xSortValues.get(right.label) ? 1 : -1
          )
        : groups.sort((left, right) => right.count - left.count)
    return {groups: sorted, yValueType: yField.valueType}
  }
  const counts = new Map()
  sourceRows.forEach(row => {
    const label = String(row[field] ?? '—') || '—'
    counts.set(label, (counts.get(label) || 0) + 1)
  })
  const groups = [...counts.entries()]
    .map(([label, count]) => ({label, count}))
    .sort((left, right) => right.count - left.count)
  return {groups, yValueType: 'count'}
}

/**
 * ApexCharts wants real display strings/numbers, never the raw epoch-ms a
 * date is sorted by internally — that's the bug this formatter exists to
 * prevent (a Doc Date Y-axis was showing 1786838400000 instead of a date).
 */
export function formatDataListChartValue(value, yValueType) {
  if (yValueType === 'date') {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)
    const pad = n => String(n).padStart(2, '0')
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
  }
  if (yValueType === 'number' || yValueType === 'count')
    return value.toLocaleString(undefined, {maximumFractionDigits: 2})
  return String(value)
}

export function dataListChartApexType(chartType) {
  if (chartType === 'donut') return 'donut'
  if (chartType === 'polar') return 'polarArea'
  if (chartType === 'line') return 'line'
  if (chartType === 'column') return 'bar'
  return 'bar'
}

/**
 * @param {string} context
 * @param {unknown[]} rows
 * @param {object} config
 * @param {object} listState
 * @param {{t: Function, encodeHtml: Function, dataListIcon: Function}} deps
 */
export function renderDataListChart(context, rows, config, listState, deps) {
  const {t, encodeHtml, dataListIcon} = deps
  if (!listState.chartVisible) return ''
  const yOptions = dataListChartYOptions(config)
  const yField = yOptions.find(column => column.key === listState.chartYField)
  const {groups} = dataListChartGroups(rows, config, listState)
  const total = groups.reduce((sum, group) => sum + group.count, 0)
  const scopeLabel = listState.selected.size
    ? `${listState.selected.size} selected`
    : yField
      ? `${groups.length} in view`
      : `${total} in view`
  const fieldOptions = config.columns
    .map(
      column =>
        `<option value="${encodeHtml(column.key)}"${column.key === listState.chartField ? ' selected' : ''}>${encodeHtml(column.label)}</option>`
    )
    .join('')
  const yFieldOptions = `<option value=""${yField ? '' : ' selected'}>${encodeHtml(t('Count', 'Count'))}</option>${yOptions
    .map(
      column =>
        `<option value="${encodeHtml(column.key)}"${column.key === listState.chartYField ? ' selected' : ''}>${encodeHtml(column.label)}</option>`
    )
    .join('')}`
  const typeButtons = DATA_CHART_TYPES.map(
    type =>
      `<button type="button" data-list-chart-type="${type.key}" aria-pressed="${listState.chartType === type.key}">${dataListIcon(type.icon, 15)}<span>${type.label}</span></button>`
  ).join('')
  const expanded = listState.chartExpanded !== false
  const canvasBody = groups.length
    ? `<div class="data-list-chart-apex w-full" data-chart-mount></div>`
    : `<p class="data-chart-empty flex min-h-[260px] items-center justify-center text-center text-[12.5px] text-muted">${t('No data to chart for this view.', 'No data to chart for this view.')}</p>`
  return `<section class="rec-card data-list-chart mb-3 shadow-[var(--shadow-1)]" aria-label="${encodeHtml(config.label)} chart">
    <div class="data-list-chart-hd-row flex items-stretch bg-[var(--line-2)]">
      <button type="button" class="rec-card-hd data-list-chart-hd min-w-0 flex-1" data-list-chart-toggle aria-expanded="${expanded}">
        <span class="data-list-chart-hd-title">${encodeHtml(config.label[0].toUpperCase() + config.label.slice(1))} breakdown</span>
        <span class="data-list-chart-scope me-auto rounded-full bg-surface px-[9px] text-xs font-semibold text-muted whitespace-nowrap">${encodeHtml(scopeLabel)}</span>
      </button>
      <button type="button" class="data-list-chart-close grid size-[26px] my-auto mx-2.5 shrink-0 place-items-center rounded-md text-muted hover:bg-surface hover:text-ink" data-list-chart-close aria-label="Close chart">${dataListIcon('i-x', 13)}</button>
    </div>
    <div class="rec-card-body data-list-chart-body p-4"${expanded ? '' : ' hidden'}>
      <div class="data-list-chart-layout data-list-chart-layout-solo grid items-stretch gap-4 grid-cols-[minmax(0,1fr)]">
        <div class="data-list-chart-main grid min-w-0 gap-3">
          <div class="data-list-chart-toolbar flex flex-wrap items-end gap-3">
            <div class="rec-field data-list-chart-field w-[220px] min-w-0">
              <label>${t('X axis', 'X axis')}</label>
              <select data-list-chart-field>${fieldOptions}</select>
            </div>
            ${
              yOptions.length
                ? `<div class="rec-field data-list-chart-field w-[220px] min-w-0">
              <label>${t('Y axis', 'Y axis')}</label>
              <select data-list-chart-y-field>${yFieldOptions}</select>
            </div>`
                : ''
            }
            <div class="data-list-chart-type ms-auto inline-flex flex-wrap gap-0.5 rounded-[7px] border border-line bg-[var(--bg)] p-0.5" role="group" aria-label="Chart type">${typeButtons}</div>
          </div>
          <div class="data-list-chart-canvas flex min-h-[260px] min-w-0 items-stretch justify-stretch overflow-x-auto">${canvasBody}</div>
        </div>
      </div>
    </div>
  </section>`
}

/**
 * Per-instance ApexCharts lifecycle for one data-list context. Each
 * createDataList(...) call constructs its own createListChart({root,
 * locale}) — `chart` below lives only in this closure, never in a
 * module-level/global map, so destroying/recreating one instance's chart
 * can never touch another instance's.
 *
 * @param {object} params
 * @param {HTMLElement} params.root - the canvas element renderDataList mounts into (same element passed to createDataList).
 * @param {{t: Function, getLocale: Function}} params.locale - shared.locale (or an equivalent {t, getLocale} pair).
 * @returns {{render: (rows: unknown[], config: object, listState: object) => void, destroy: () => void}}
 */
export function createListChart({root, locale}) {
  let chart = null

  function destroy() {
    if (chart) {
      chart.destroy()
      chart = null
    }
  }

  /**
   * Mirrors the original initDataListChart: always destroys the previous
   * instance first (renderDataList always replaces the mount via
   * innerHTML, so any prior chart is bound to an already-detached node),
   * then constructs a new one only if the chart panel is visible/expanded
   * and there is data to plot.
   */
  function render(rows, config, listState) {
    destroy()
    if (!listState.chartVisible || listState.chartExpanded === false) return
    const mount = root.querySelector('[data-chart-mount]')
    if (!mount) return
    const yOptions = dataListChartYOptions(config)
    const yField = yOptions.find(column => column.key === listState.chartYField)
    const {groups, yValueType} = dataListChartGroups(rows, config, listState)
    if (!groups.length) return
    const apexType = dataListChartApexType(listState.chartType)
    const isRadial = apexType === 'donut' || apexType === 'polarArea'
    const seriesName = yField ? locale.t(yField.label, yField.label) : locale.t('Count', 'Count')
    const valueFormatter = value => formatDataListChartValue(value, yValueType)
    const theme = dataListChartTheme()
    const isDark = document.documentElement.dataset.colorMode === 'dark'
    const options = {
      chart: {
        type: apexType,
        height: 320,
        toolbar: {show: false},
        fontFamily: 'inherit',
        foreColor: theme.text,
      },
      colors: dataListChartColors(),
      legend: {position: isRadial ? 'bottom' : 'top', labels: {colors: theme.ink}},
      dataLabels: {enabled: false},
      grid: {borderColor: theme.border, strokeDashArray: 3},
      tooltip: {
        theme: isDark ? 'dark' : 'light',
        y: {formatter: valueFormatter},
      },
      xaxis: {
        categories: groups.map(group => group.label),
        labels: {trim: true, hideOverlappingLabels: true},
        axisBorder: {color: theme.border},
        axisTicks: {color: theme.border},
      },
    }
    if (isRadial) {
      options.series = groups.map(group => group.count)
      options.labels = groups.map(group => group.label)
    } else {
      options.series = [{name: seriesName, data: groups.map(group => group.count)}]
      const horizontal = listState.chartType === 'bar'
      if (horizontal) options.xaxis.labels.formatter = valueFormatter
      else options.yaxis = {labels: {formatter: valueFormatter}}
      if (apexType === 'bar') options.plotOptions = {bar: {horizontal, borderRadius: 3}}
      if (apexType === 'line') options.stroke = {curve: 'smooth', width: 3}
    }
    chart = new ApexCharts(mount, options)
    chart.render()
  }

  return {render, destroy}
}
