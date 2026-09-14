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
      return `<article class="data-stat-card" data-tone="${metric.tone}"><div class="data-stat-card-head">${dataListIcon(metric.icon, 16)}<span>${encodeHtml(t(metric.label))}</span></div><strong>${encodeHtml(metric.value)}</strong><small>${encodeHtml(support)}</small><div class="data-stat-meter" aria-hidden="true"><span style="--stat-progress:${metric.progress}%"></span></div></article>`
    })
    .join('')
}

function renderOperationalStatistics(metrics, {encodeHtml, dataListIcon}) {
  return metrics
    .map(
      metric =>
        `<article class="data-stat-operation" data-tone="${metric.tone}"><span class="data-stat-operation-icon">${dataListIcon(metric.icon, 16)}</span><div class="data-stat-operation-value"><span>${encodeHtml(metric.label)}</span><strong>${encodeHtml(metric.value)}</strong><span>${encodeHtml(metric.support)}</span></div><div class="data-stat-operation-cue"><span>Work cue</span><strong>${encodeHtml(metric.operation)}</strong></div></article>`
    )
    .join('')
}

function renderExceptionStatistics(metrics, {encodeHtml, dataListIcon}) {
  const attention = metrics.find(metric => metric.attention) || metrics[0]
  const supportingMetrics = metrics.filter(metric => metric !== attention)
  const attentionValue = attention.attentionValue ?? attention.value
  const attentionLabel = attention.attentionLabel || attention.label
  const attentionSupport = attention.attentionSupport || attention.support
  const supportingRows = supportingMetrics
    .map(
      metric =>
        `<div class="data-stat-exception-row" data-tone="${metric.tone}"><span class="data-stat-exception-dot" aria-hidden="true"></span><span class="data-stat-exception-copy"><strong>${encodeHtml(metric.label)}</strong><small>${encodeHtml(metric.support)}</small></span><output>${encodeHtml(metric.value)}</output></div>`
    )
    .join('')
  return `<article class="data-stat-exception-lead"><div class="data-stat-exception-lead-head">${dataListIcon('i-warn', 15)}<span>Needs attention</span></div><strong>${encodeHtml(attentionValue)}</strong><small>${encodeHtml(attentionLabel)} · ${encodeHtml(attentionSupport)}</small><div class="data-stat-exception-focus">${dataListIcon('i-search', 13)}<span>${encodeHtml(attention.operation)}</span></div></article><div class="data-stat-exception-list">${supportingRows}</div>`
}

function statisticsSparklinePoints(trend) {
  const minimum = Math.min(...trend)
  const range = Math.max(...trend) - minimum || 1
  const step = trend.length > 1 ? 120 / (trend.length - 1) : 0
  return trend
    .map(
      (point, index) =>
        `${Math.round(index * step)},${Math.round(30 - ((point - minimum) / range) * 26)}`
    )
    .join(' ')
}

function renderStatisticsSparkline(metric, {encodeHtml}) {
  const points = statisticsSparklinePoints(metric.trend)
  return `<svg class="data-stat-sparkline" viewBox="0 0 120 34" preserveAspectRatio="none" role="img" aria-label="${encodeHtml(metric.trendLabel)}"><polygon class="data-stat-sparkline-area" points="0,34 ${points} 120,34"></polygon><polyline class="data-stat-sparkline-line" points="${points}"></polyline></svg>`
}

function renderAnalyticalStatistics(metrics, deps) {
  const {encodeHtml, dataListIcon} = deps
  return metrics
    .map(
      metric =>
        `<article class="data-stat-analytical" data-tone="${metric.tone}"><div class="data-stat-analytical-head"><span>${encodeHtml(metric.label)}</span>${dataListIcon(metric.icon, 14)}</div><strong>${encodeHtml(metric.value)}</strong>${renderStatisticsSparkline(metric, deps)}<div class="data-stat-analytical-foot"><span>${encodeHtml(metric.benchmark)}</span><span class="data-stat-trend" data-trend-tone="${metric.trendTone}">${encodeHtml(metric.trendLabel)}</span></div></article>`
    )
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
  return `<section class="data-statistics" data-statistics-layout="${resolvedLayout}" aria-label="${encodeHtml(config.label)} statistics, ${resolvedLayout} concept">${renderer(metrics, deps)}</section>`
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
  return `<details class="data-menu" data-list-group-menu><summary aria-label="${t('Choose a column to group by', 'Choose a column to group by')}">${dataListIcon('i-grid', 14)}<span>${t('Group by', 'Group by')}</span>${dataListIcon('i-caret', 10)}</summary><div class="data-menu-popover" role="menu">${availableColumns
    .map(
      column =>
        `<button type="button" role="menuitem" data-list-group-add="${encodeHtml(column.key)}">${dataListIcon('i-grid', 13)}<span>${encodeHtml(t(column.label))}</span></button>`
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
    ? `<span class="data-group-drag-hint">${t('Drag a column header here to add another group', 'Drag a column header here to add another group')}</span>`
    : ''
  const clearButton = `<button type="button" class="data-group-clear" data-list-group-clear>${dataListIcon('i-undo', 12)}<span>${t('Reset grouping', 'Reset grouping')}</span></button>`
  return `<div class="data-group-dropzone" data-list-group-drop aria-label="${t('Row grouping drop zone', 'Row grouping drop zone')}"><span class="data-group-dropzone-label">${dataListIcon('i-grid', 14)}<span>${t('Row groups', 'Row groups')}</span></span>${chips}${dragHint}${clearButton}</div>`
}
