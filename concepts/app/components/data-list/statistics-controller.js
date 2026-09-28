import {encodeHtml} from '../../core/locale.js'
import {dataListPercent as sharedDataListPercent, renderDataListStatistics as renderSharedDataListStatistics, renderDataListGroupTrigger as renderSharedDataListGroupTrigger, renderDataListGroupingBar as renderSharedDataListGroupingBar} from './statistics.js'

/** Owns list statistics state and its DOM bindings. */
export function createListStatistics({locale, t, getDataListState, dataListIcon, invoiceListStatistics, customerListStatistics, geoListStatistics, resolvedDataListStatisticsConcept} = {}) {
  const dataListPercent = sharedDataListPercent

  const DATA_LIST_STATISTICS_FACTORIES = {
    invoice: invoiceListStatistics,
    customer: customerListStatistics,
    geo: geoListStatistics,
    // Screen Parameters has no numeric/plottable columns to summarize —
    // its statistics panel stays hidden by default (model.js's
    // createInitialState), but this no-op factory still exists so a user
    // toggling Statistics back on from the overflow menu gets an empty
    // panel instead of a thrown error. Journal Entry has its own always-
    // visible Debit/Credit/Balanced summary strip rendered separately
    // (journal-entry.js), so its statistics panel is likewise hidden by
    // default and this factory is the same no-op fallback.
    screenParameters: () => [],
    journal: () => [],
    // Organization Center's 5 contexts follow the same no-op rule: their
    // statistics panels start hidden (model.js's noRowActions default)
    // and this stub only guards against a thrown error if a user manually
    // re-enables the panel from the overflow menu.
    orgUsers: () => [],
    orgAppSessions: () => [],
    orgDbSessions: () => [],
    orgAudit: () => [],
    orgStaff: () => [],
  }

  function dataListStatistics(context, rows, config) {
    return DATA_LIST_STATISTICS_FACTORIES[context](rows, config, Math.max(rows.length, 1))
  }

  const sharedStatisticsDeps = {t, encodeHtml, dataListIcon, locale}

  function renderDataListStatistics(context, rows, config) {
    const listState = getDataListState()[context]
    const layout = resolvedDataListStatisticsConcept(listState.statisticsConcept)
    return renderSharedDataListStatistics({
      rows,
      config,
      layout,
      statisticsFn: (statsRows, statsConfig, total) =>
        dataListStatistics(context, statsRows, statsConfig, total),
      deps: sharedStatisticsDeps,
    })
  }

  function renderDataListGroupTrigger(config, listState) {
    return renderSharedDataListGroupTrigger(config, listState, sharedStatisticsDeps)
  }

  function renderDataListGroupingBar(config, listState) {
    return renderSharedDataListGroupingBar(config, listState, sharedStatisticsDeps)
  }

  return {dataListPercent, renderDataListStatistics, renderDataListGroupTrigger, renderDataListGroupingBar}
}
