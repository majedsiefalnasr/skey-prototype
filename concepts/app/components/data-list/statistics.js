// Data-list statistics rendering — moved out of concepts/app/legacy-app.js
// as part of Task 6. Bodies are unchanged from the original except for two
// mechanical adaptations required by extraction into a standalone ES
// module (no shared closure over legacy-app.js's top-level bindings):
//
// 1. `t`/`encodeHtml`/`dataListIcon` are passed in explicitly (this module
//    has no closure over legacy-app.js's `t`, which comes from
//    shared.locale, or its local `dataListIcon` helper) rather than being
//    read from an enclosing scope.
// 2. `renderBalancedStatistics`'s original body read the module-global
//    `appLocale` directly (`appLocale === 'ar' ? metric.supportAr : ...`);
//    here it takes a `locale` object (shared.locale's own {t, getLocale,
//    ...} instance, per createListChart's established {root, locale}
//    convention) and calls `locale.getLocale()` instead — same behavior
//    (Arabic locale prefers metric.supportAr when present), no
//    module-level global.
//
// Per the Task 6 actions contract, the *context-specific* statistics
// factories (invoiceListStatistics/customerListStatistics/geoListStatistics
// in the original) are NOT part of this shared module — the shared list
// component must not import customer/invoice-specific logic. They stay
// page-supplied via createDataList's `actions.statistics(rows, config,
// total)` callback (legacy-app.js still defines and passes them, unchanged,
// per context, exactly as DATA_LIST_STATISTICS_FACTORIES dispatched
// before). This module owns only the presentation-layer renderers, which
// consume whatever metrics array `actions.statistics` returns — the same
// {label,value,support,icon,tone,progress,operation,benchmark,trend,
// trendLabel,trendTone,...} shape the original per-context factories always
// produced.

import {DATA_MENU_SUMMARY_CLASS, DATA_MENU_POPOVER_CLASS} from './list.js'

/**
 * @param {number} value
 * @param {number} total
 * @returns {number}
 */
export function dataListPercent(value, total) {
  return total ? Math.round((value / total) * 100) : 0
}

function renderBalancedStatistics(metrics, {t, encodeHtml, dataListIcon, locale}) {
  return metrics
    .map(metric => {
      const support = locale.getLocale() === 'ar' ? metric.supportAr || metric.support : metric.support
      const exactValue = String(metric.value)
      const displayValue = compactStatisticValue(exactValue)
      return `<article class="data-stat-card [--stat-tone:var(--accent)] grid min-w-0 gap-2 [padding:14px_16px] [border:1px_solid_var(--line)] [border-radius:10px] bg-surface [box-shadow:var(--shadow-1)] [&[data-tone=success]]:[--stat-tone:var(--success)] [&[data-tone=warning]]:[--stat-tone:var(--st-pend-ink)] [&[data-tone=neutral]]:[--stat-tone:var(--muted)] [&_strong]:[font-variant-numeric:tabular-nums] [&_strong]:overflow-hidden [&_strong]:text-ink [&_strong]:[font-size:24px] [&_strong]:font-bold [&_strong]:[line-height:1.1] [&_strong]:[letter-spacing:-0.01em] [&_strong]:[text-overflow:ellipsis] [&_strong]:whitespace-nowrap [&_small]:overflow-hidden [&_small]:text-muted [&_small]:text-xs [&_small]:[text-overflow:ellipsis] [&_small]:whitespace-nowrap" data-tone="${metric.tone}"><div class="data-stat-card-head flex min-w-0 gap-2 items-center text-muted text-xs font-semibold [&_svg]:flex [&_svg]:[width:22px] [&_svg]:[height:22px] [&_svg]:[flex-shrink:0] [&_svg]:items-center [&_svg]:justify-center [&_svg]:[padding:4px] [&_svg]:rounded-md [&_svg]:[background:color-mix(in_srgb,_var(--stat-tone)_14%,_transparent)] [&_svg]:[color:var(--stat-tone)] [&_svg]:[box-sizing:border-box]">${dataListIcon(metric.icon, 16)}<span>${encodeHtml(t(metric.label))}</span></div><strong title="${encodeHtml(exactValue)}" aria-label="${encodeHtml(exactValue)}">${encodeHtml(displayValue)}</strong><small>${encodeHtml(compactStatisticValue(support, {preserveYears: true}))}</small><div class="data-stat-meter [height:5px] overflow-hidden [border-radius:999px] bg-[var(--line-2)] [&>span]:block [&>span]:[width:var(--stat-progress,_0%)] [&>span]:h-full [&>span]:[border-radius:inherit] [&>span]:[background:var(--stat-tone)] [&>span]:[transition:width_0.3s_ease] hidden" aria-hidden="true"><span style="--stat-progress:${metric.progress}%"></span></div></article>`
    })
    .join('')
}

function renderOperationalStatistics(metrics, {encodeHtml, dataListIcon}) {
  return metrics
    .map(metric => {
      const exactValue = String(metric.value)
      const displayValue = compactStatisticValue(exactValue)
      return `<article class="data-stat-operation [--stat-tone:var(--accent)] grid min-w-0 [grid-template-columns:36px_minmax(0,_1fr)] [gap:10px_12px] [padding:12px] [border:1px_solid_var(--line)] rounded-lg bg-surface [&[data-tone=success]]:[--stat-tone:var(--success)] [&[data-tone=warning]]:[--stat-tone:var(--st-pend-ink)] [&[data-tone=neutral]]:[--stat-tone:var(--muted)]" data-tone="${metric.tone}"><span class="data-stat-operation-icon grid [width:36px] [height:36px] [place-items:center] rounded-md [background:color-mix(in_srgb,_var(--stat-tone)_14%,_transparent)] [color:var(--stat-tone)]">${dataListIcon(metric.icon, 16)}</span><div class="data-stat-operation-value [&_strong]:[font-variant-numeric:tabular-nums] grid min-w-0 gap-0.5 [&_span]:text-muted [&_span]:text-xs [&_strong]:overflow-hidden [&_strong]:text-ink [&_strong]:[font-size:21px] [&_strong]:[line-height:1.15] [&_strong]:[text-overflow:ellipsis] [&_strong]:whitespace-nowrap"><span>${encodeHtml(metric.label)}</span><strong title="${encodeHtml(exactValue)}" aria-label="${encodeHtml(exactValue)}">${encodeHtml(displayValue)}</strong><span>${encodeHtml(compactStatisticValue(metric.support, {preserveYears: true}))}</span></div><div class="data-stat-operation-cue [&_span]:text-muted [&_span]:text-xs grid min-w-0 [grid-column:1_/_-1] gap-0.5 [padding-top:9px] [border-top:1px_solid_var(--line-2)] [&_strong]:overflow-hidden [&_strong]:text-ink [&_strong]:text-xs [&_strong]:font-semibold [&_strong]:[text-overflow:ellipsis] [&_strong]:whitespace-nowrap"><span>Work cue</span><strong>${encodeHtml(metric.operation)}</strong></div></article>`
    })
    .join('')
}

function renderExceptionStatistics(metrics, {encodeHtml, dataListIcon}) {
  const attention = metrics.find(metric => metric.attention) || metrics[0]
  const supportingMetrics = metrics.filter(metric => metric !== attention)
  const attentionValue = attention.attentionValue ?? attention.value
  const attentionLabel = attention.attentionLabel || attention.label
  const attentionSupport = attention.attentionSupport || attention.support
  const supportingRows = supportingMetrics
    .map(metric => {
      const exactValue = String(metric.value)
      return `<div class="data-stat-exception-row [&>output]:[font-variant-numeric:tabular-nums] [--stat-tone:var(--accent)] grid min-w-0 [grid-template-columns:8px_minmax(0,_1fr)_auto] gap-2.5 items-center [padding:10px_12px] [border-bottom:1px_solid_var(--line-2)] [&:last-child]:[border-bottom:0] [&[data-tone=success]]:[--stat-tone:var(--success)] [&[data-tone=warning]]:[--stat-tone:var(--st-pend-ink)] [&[data-tone=neutral]]:[--stat-tone:var(--muted)] [&>output]:text-ink [&>output]:[font-size:16px] [&>output]:font-bold" data-tone="${metric.tone}"><span class="data-stat-exception-dot [width:7px] [height:7px] rounded-full [background:var(--stat-tone)]" aria-hidden="true"></span><span class="data-stat-exception-copy grid min-w-0 gap-0.5 [&_strong]:text-ink [&_strong]:text-xs [&_small]:overflow-hidden [&_small]:text-muted [&_small]:text-xs [&_small]:[text-overflow:ellipsis] [&_small]:whitespace-nowrap"><strong>${encodeHtml(metric.label)}</strong><small>${encodeHtml(compactStatisticValue(metric.support, {preserveYears: true}))}</small></span><output title="${encodeHtml(exactValue)}" aria-label="${encodeHtml(exactValue)}">${encodeHtml(compactStatisticValue(exactValue))}</output></div>`
    })
    .join('')
  const exactAttentionValue = String(attentionValue)
  return `<article class="data-stat-exception-lead [&_strong]:[font-variant-numeric:tabular-nums] grid [align-content:center] [gap:7px] [padding:16px] [border-inline-end:1px_solid_var(--line)] [background:var(--st-pend-bg)] [&_strong]:text-ink [&_strong]:[font-size:26px] [&_strong]:[line-height:1] [&_small]:text-ink [&_small]:text-xs [@media((max-width:1100px))]:[border-inline-end:0] [@media((max-width:1100px))]:[border-bottom:1px_solid_var(--line)]"><div class="data-stat-exception-lead-head flex [gap:7px] items-center [color:var(--st-pend-ink)] text-xs font-semibold">${dataListIcon('i-warn', 15)}<span>Needs attention</span></div><strong title="${encodeHtml(exactAttentionValue)}" aria-label="${encodeHtml(exactAttentionValue)}">${encodeHtml(compactStatisticValue(exactAttentionValue))}</strong><small>${encodeHtml(attentionLabel)} · ${encodeHtml(compactStatisticValue(attentionSupport, {preserveYears: true}))}</small><div class="data-stat-exception-focus flex [gap:7px] items-center [color:var(--st-pend-ink)] text-xs font-semibold [margin-top:3px]!">${dataListIcon('i-search', 13)}<span>${encodeHtml(attention.operation)}</span></div></article><div class="data-stat-exception-list grid [grid-template-rows:repeat(3,_minmax(0,_1fr))]">${supportingRows}</div>`
}

export function compactStatisticValue(value, {preserveYears = false} = {}) {
  return String(value).replace(/[-+]?\d[\d,]*(?:\.\d+)?/g, token => {
    const number = Number(token.replaceAll(',', ''))
    if (!Number.isFinite(number) || Math.abs(number) < 1000) return token
    if (preserveYears && !token.includes(',') && Number.isInteger(number) && number >= 1900 && number <= 2099)
      return token
    return new Intl.NumberFormat('en', {
      notation: 'compact',
      maximumFractionDigits: 2,
      useGrouping: false,
    }).format(number)
  })
}

function renderStatisticsSparkline(metric, {encodeHtml}, displayValue) {
  const width = 280
  const height = 66
  const padInline = 8
  const padTop = 18
  const padBottom = 5
  const plotHeight = height - padTop - padBottom
  const plotWidth = width - padInline * 2
  const minimum = Math.min(...metric.trend)
  const maximum = Math.max(...metric.trend)
  const range = maximum - minimum || 1
  const step = metric.trend.length > 1 ? plotWidth / (metric.trend.length - 1) : 0
  const points = metric.trend.map((point, index) => ({
    x: padInline + index * step,
    y: padTop + plotHeight - ((point - minimum) / range) * plotHeight,
  }))
  const pointsAttr = points.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')
  const last = points.at(-1)
  const gridlines = [minimum, (minimum + maximum) / 2, maximum]
    .map(value => {
      const y = padTop + plotHeight - ((value - minimum) / range) * plotHeight
      return `<line class="data-stat-sparkline-grid" x1="${padInline}" y1="${y.toFixed(1)}" x2="${width - padInline}" y2="${y.toFixed(1)}" stroke="var(--line-2)" stroke-width="1" stroke-dasharray="3 3"></line>`
    })
    .join('')
  const tooltipWidth = Math.min(104, 20 + displayValue.length * 6)
  const tooltipX = Math.min(Math.max(last.x - tooltipWidth / 2, 0), width - tooltipWidth)
  const tooltipY = Math.max(0, last.y - 22)
  return `<svg class="data-stat-sparkline mt-auto w-full h-auto [overflow:visible]" viewBox="0 0 ${width} ${height}" role="img" aria-label="${encodeHtml(metric.trendLabel)}">${gridlines}<line x1="${last.x.toFixed(1)}" y1="${last.y.toFixed(1)}" x2="${last.x.toFixed(1)}" y2="${height - padBottom}" stroke="var(--stat-tone)" stroke-width="1" stroke-dasharray="3 3"></line><polygon class="data-stat-sparkline-area" fill="color-mix(in srgb, var(--stat-tone) 14%, transparent)" stroke="none" points="${padInline},${height - padBottom} ${pointsAttr} ${width - padInline},${height - padBottom}"></polygon><polyline class="data-stat-sparkline-line" fill="none" stroke="var(--stat-tone)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" points="${pointsAttr}"></polyline><circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="7" fill="var(--stat-tone)" opacity="0.18"></circle><circle class="data-stat-sparkline-point" cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="3.5" fill="var(--stat-tone)" stroke="var(--surface)" stroke-width="1.5"></circle><g transform="translate(${tooltipX.toFixed(1)}, ${tooltipY.toFixed(1)})"><rect width="${tooltipWidth}" height="16" rx="4" fill="var(--tooltip-bg)"></rect><text x="${tooltipWidth / 2}" y="11" font-size="10" font-weight="600" fill="var(--tooltip-ink)" text-anchor="middle">${encodeHtml(displayValue)}</text></g></svg>`
}

function renderAnalyticalStatistics(metrics, deps) {
  const {encodeHtml, dataListIcon} = deps
  return metrics
    .map(metric => {
      const exactValue = String(metric.value)
      const displayValue = compactStatisticValue(exactValue)
      const benchmark = compactStatisticValue(metric.benchmark, {preserveYears: true})
      const trendLabel = compactStatisticValue(metric.trendLabel, {preserveYears: true})
      return `<article class="data-stat-analytical [&[data-tone=success]]:[--stat-tone:var(--success)] [&[data-tone=warning]]:[--stat-tone:var(--st-pend-ink)] [&[data-tone=neutral]]:[--stat-tone:var(--muted)] [--stat-tone:var(--accent)] grid min-w-0 [grid-template-rows:auto_auto_1fr_auto] gap-2 [padding:14px] [border:1px_solid_var(--line)] rounded-xl bg-surface [box-shadow:var(--shadow-1)]" data-tone="${metric.tone}"><div class="data-stat-analytical-head flex min-w-0 items-center justify-between gap-3"><span class="overflow-hidden text-ink text-sm font-bold [text-overflow:ellipsis] whitespace-nowrap">${encodeHtml(metric.label)}</span><span class="grid size-9 [flex:none] place-items-center rounded-lg [background:color-mix(in_srgb,_var(--stat-tone)_14%,_transparent)] [color:var(--stat-tone)]">${dataListIcon(metric.icon, 17)}</span></div><strong class="overflow-hidden text-ink text-[28px] font-bold [font-variant-numeric:tabular-nums] [letter-spacing:-0.02em] [line-height:1.05] [text-overflow:ellipsis] whitespace-nowrap" title="${encodeHtml(exactValue)}" aria-label="${encodeHtml(exactValue)}">${encodeHtml(displayValue)}</strong>${renderStatisticsSparkline(metric, deps, displayValue)}<div class="data-stat-analytical-foot flex min-w-0 items-start justify-between gap-3 text-xs text-muted"><span class="min-w-0 overflow-hidden [text-overflow:ellipsis]">${encodeHtml(benchmark)}</span><span class="data-stat-trend min-w-0 overflow-hidden text-end [text-overflow:ellipsis] [&[data-trend-tone=success]]:[color:var(--success)] [&[data-trend-tone=warning]]:[color:var(--st-pend-ink)]" data-trend-tone="${metric.trendTone}">${encodeHtml(trendLabel)}</span></div></article>`
    })
    .join('')
}

const DATA_LIST_STATISTICS_RENDERERS = {
  balanced: renderBalancedStatistics,
  operational: renderOperationalStatistics,
  exceptions: renderExceptionStatistics,
  analytical: renderAnalyticalStatistics,
}

/**
 * Render the statistics section for a data-list context.
 *
 * `statisticsFn(rows, config, total)` is the page-supplied business
 * callback (createDataList's `actions.statistics`) that produces the
 * metrics array — the shared component never computes context-specific
 * metrics itself (invoice/customer/geo statistics stay in legacy-app.js).
 *
 * @param {object} params
 * @param {unknown[]} params.rows
 * @param {object} params.config
 * @param {string} params.layout
 * @param {(rows: unknown[], config: object, total: number) => unknown[]} params.statisticsFn
 * @param {{t: Function, encodeHtml: Function, dataListIcon: Function, locale: object}} params.deps
 */
export function renderDataListStatistics({rows, config, layout, statisticsFn, deps}) {
  const {encodeHtml} = deps
  const resolvedLayout = DATA_LIST_STATISTICS_RENDERERS[layout] ? layout : 'balanced'
  const metrics = statisticsFn(rows, config, Math.max(rows.length, 1))
  const renderer = DATA_LIST_STATISTICS_RENDERERS[resolvedLayout]
  return `<section class="data-statistics mb-2.5! [padding-block-end:12px] [&[data-statistics-layout=balanced]]:grid [&[data-statistics-layout=balanced]]:[grid-template-columns:repeat(4,_minmax(0,_1fr))] [&[data-statistics-layout=balanced]]:gap-2.5 [&[data-statistics-layout=operational]]:grid [&[data-statistics-layout=operational]]:[grid-template-columns:repeat(4,_minmax(0,_1fr))] [&[data-statistics-layout=operational]]:gap-2.5 [&[data-statistics-layout=analytical]]:grid [&[data-statistics-layout=analytical]]:[grid-template-columns:repeat(4,_minmax(0,_1fr))] [&[data-statistics-layout=analytical]]:gap-2.5 [&[data-statistics-layout=exceptions]]:grid [&[data-statistics-layout=exceptions]]:overflow-hidden [&[data-statistics-layout=exceptions]]:[grid-template-columns:minmax(220px,_0.9fr)_minmax(0,_2fr)] [&[data-statistics-layout=exceptions]]:[border:1px_solid_var(--line)] [&[data-statistics-layout=exceptions]]:rounded-lg [&[data-statistics-layout=exceptions]]:bg-surface [@media((max-width:1100px))]:[&[data-statistics-layout=balanced]]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [@media((max-width:1100px))]:[&[data-statistics-layout=operational]]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [@media((max-width:1100px))]:[&[data-statistics-layout=analytical]]:[grid-template-columns:repeat(2,_minmax(0,_1fr))] [@media((max-width:1100px))]:[&[data-statistics-layout=exceptions]]:[grid-template-columns:minmax(0,_1fr)] [@media((max-width:560px))]:[&[data-statistics-layout=balanced]]:[grid-template-columns:minmax(0,_1fr)] [@media((max-width:560px))]:[&[data-statistics-layout=operational]]:[grid-template-columns:minmax(0,_1fr)] [@media((max-width:560px))]:[&[data-statistics-layout=analytical]]:[grid-template-columns:minmax(0,_1fr)]" data-statistics-layout="${resolvedLayout}" aria-label="${encodeHtml(config.label)} statistics, ${resolvedLayout} concept">${renderer(metrics, deps)}</section>`
}

/**
 * @param {object} config
 * @param {object} listState
 * @param {{dataListIcon: Function, t: Function}} deps
 */
export function renderDataListGroupTrigger(config, listState, {dataListIcon, t, encodeHtml}) {
  const availableColumns = config.columns.filter(
    column => column.groupable !== false && !listState.groupBy.includes(column.key)
  )
  if (!availableColumns.length) return ''
  return `<details class="data-menu relative" data-list-group-menu><summary class="${DATA_MENU_SUMMARY_CLASS}" aria-label="${t('Choose a column to group by', 'Choose a column to group by')}">${dataListIcon('i-grid', 14)}<span>${t('Group by', 'Group by')}</span>${dataListIcon('i-caret', 10)}</summary><div class="${DATA_MENU_POPOVER_CLASS}" role="menu">${availableColumns
    .map(
      column =>
        `<button type="button" role="menuitem" data-list-group-add="${encodeHtml(column.key)}"><span>${encodeHtml(t(column.label))}</span></button>`
    )
    .join('')}</div></details>`
}

/**
 * @param {object} config
 * @param {object} listState
 * @param {{dataListIcon: Function, t: Function, encodeHtml: Function}} deps
 */
export function renderDataListGroupingBar(config, listState, {dataListIcon, t, encodeHtml}) {
  const chips = listState.groupBy
    .map(key => config.columns.find(column => column.key === key))
    .filter(Boolean)
    .map(
      column =>
        `<span class="data-group-chip"><span>${encodeHtml(t(column.label))}</span><button type="button" data-list-group-remove="${encodeHtml(column.key)}" aria-label="${t('Remove', 'Remove')} ${encodeHtml(t(column.label))} ${t('grouping', 'grouping')}">${dataListIcon('i-x', 11)}</button></span>`
    )
    .join('')
  if (!chips) return ''
  const hasMoreColumns = config.columns.some(
    column => column.groupable !== false && !listState.groupBy.includes(column.key)
  )
  const dragHint = hasMoreColumns
    ? `<span class="data-group-drag-hint max-[900px]:hidden text-xs italic text-faint">${t('Drag a column header here to add another group', 'Drag a column header here to add another group')}</span>`
    : ''
  const clearButton = `<button type="button" class="data-group-clear ms-auto max-[900px]:ms-0 inline-flex items-center gap-1.5 rounded-md px-2.5 py-[5px] font-semibold text-muted hover:bg-[var(--line-2)] hover:text-ink" data-list-group-clear>${dataListIcon('i-undo', 12)}<span>${t('Reset grouping', 'Reset grouping')}</span></button>`
  return `<div class="data-group-dropzone flex min-h-[42px] flex-wrap items-center gap-1.5 bg-[var(--bg)] px-2.5 py-[7px] text-xs text-muted" data-list-group-drop aria-label="${t('Row grouping drop zone', 'Row grouping drop zone')}"><span class="data-group-dropzone-label inline-flex items-center gap-1.5">${dataListIcon('i-grid', 14)}<span>${t('Row groups', 'Row groups')}</span></span>${chips}${dragHint}${clearButton}</div>`
}
