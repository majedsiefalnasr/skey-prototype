import {encodeHtml} from '../../core/locale.js'
import {dataListPercent as sharedDataListPercent, renderDataListStatistics as renderSharedDataListStatistics, renderDataListGroupTrigger as renderSharedDataListGroupTrigger, renderDataListGroupingBar as renderSharedDataListGroupingBar} from './statistics.js'

/** Owns list statistics state and its DOM bindings. */
export function createListStatistics({locale, t, getDataListState, dataListIcon, invoiceListStatistics, customerListStatistics, geoListStatistics, resolvedDataListStatisticsConcept} = {}) {
  const dataListPercent = sharedDataListPercent
  
  const DATA_LIST_STATISTICS_FACTORIES = {
    invoice: invoiceListStatistics,
    customer: customerListStatistics,
    geo: geoListStatistics,
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
