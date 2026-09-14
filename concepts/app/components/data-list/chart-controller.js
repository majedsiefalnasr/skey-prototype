import {encodeHtml} from '../../core/locale.js'
import {dataListChartYOptions as sharedDataListChartYOptions, renderDataListChart as renderSharedDataListChart, createListChart} from './charts.js'

/** Owns list charts state and its DOM bindings. */
export function createListCharts({shared, t, getDataListChartRefreshReady, getDataListState, dataListIcon, refreshDataListForContext} = {}) {
  const sharedChartDeps = {t, encodeHtml, dataListIcon}
  
  const dataListChartYOptions = sharedDataListChartYOptions
  
  function renderDataListChart(context, rows, config, listState) {
    if (!listState.chartVisible) return ''
    return renderSharedDataListChart(context, rows, config, listState, sharedChartDeps)
  }
  
  const dataListChartHandles = {}
  
  function chartHandleFor(context, canvas) {
    if (!dataListChartHandles[context]) {
      dataListChartHandles[context] = createListChart({root: canvas, locale: shared.locale})
    }
    return dataListChartHandles[context]
  }
  
  function destroyDataListChartInstance(context) {
    dataListChartHandles[context]?.destroy()
  }
  
  function initDataListChart(context, canvas, rows, config, listState) {
    chartHandleFor(context, canvas).render(rows, config, listState)
  }
  
  function refreshOpenDataListCharts() {
    if (!getDataListChartRefreshReady()) return
    Object.keys(getDataListState()).forEach(context => {
      const listState = getDataListState()[context]
      if (listState.chartVisible && listState.canvas) refreshDataListForContext(context)
    })
  }

  return {renderDataListChart, refreshOpenDataListCharts}
}
