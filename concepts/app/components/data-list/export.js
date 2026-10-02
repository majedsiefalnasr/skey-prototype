import {encodeHtml} from '../../core/locale.js'
import {DATA_LIST_CONFIG} from './columns.js'

/** Owns list export state and its DOM bindings. */
export function createListExport({trapFocus, releaseFocus, toast, getDataListState, dataListRows} = {}) {
  let dataExportContext = ''

  function renderDataExportColumns(config, listState) {
    const columns = listState.columnOrder
      .map(key => config.columns.find(column => column.key === key))
      .filter(Boolean)
    return columns
      .map(
        column =>
          `<label class="flex items-center gap-[7px] px-0.5 py-1 text-[12.5px] text-ink"><input type="checkbox" data-export-column="${encodeHtml(column.key)}"${listState.hiddenColumns.has(column.key) ? '' : ' checked'}><span>${encodeHtml(column.label)}</span></label>`
      )
      .join('')
  }

  function openDataExport(context) {
    dataExportContext = context
    const config = DATA_LIST_CONFIG[context]
    const listState = getDataListState()[context]
    dataExportScrim
      .querySelectorAll('[data-export-format]')
      .forEach(button =>
        button.setAttribute('aria-checked', String(button.dataset.exportFormat === 'xlsx'))
      )
    document.getElementById('data-export-scope').value = 'visible'
    document.getElementById('data-export-filename').value =
      `${config.label[0].toUpperCase() + config.label.slice(1)} - ${new Date().toISOString().slice(0, 10)}`
    document.getElementById('data-export-columns').innerHTML = renderDataExportColumns(
      config,
      listState
    )
    dataExportScrim.classList.add('open')
    trapFocus(dataExportScrim.querySelector('.dlg'))
  }

  function closeDataExport() {
    dataExportScrim.classList.remove('open')
    releaseFocus()
  }

  function runDataExport() {
    const config = DATA_LIST_CONFIG[dataExportContext]
    const listState = getDataListState()[dataExportContext]
    const format = dataExportScrim.querySelector('[data-export-format][aria-checked="true"]')
      ?.dataset.exportFormat
    const scope = document.getElementById('data-export-scope').value
    const rows =
      scope === 'selected'
        ? listState.selected.size
        : scope === 'all'
          ? config.rows.length
          : dataListRows(dataExportContext).length
    const columnCount = dataExportScrim.querySelectorAll(
      '[data-export-column]:checked'
    ).length
    const fileName =
      document.getElementById('data-export-filename').value.trim() || config.label
    closeDataExport()
    toast({
      tone: 'ok',
      title: 'Export ready',
      body: `${rows} ${rows === 1 ? config.singular : config.label} · ${columnCount} columns · ${fileName}.${format}`,
    })
  }

  const dataExportScrim = document.getElementById('data-export-scrim')

  dataExportScrim.addEventListener('click', event => {
    const format = event.target.closest('[data-export-format]')
    if (format) {
      dataExportScrim
        .querySelectorAll('[data-export-format]')
        .forEach(button => button.setAttribute('aria-checked', String(button === format)))
      return
    }
    if (event.target.closest('[data-export-columns-all]')) {
      dataExportScrim
        .querySelectorAll('[data-export-column]')
        .forEach(checkbox => (checkbox.checked = true))
      return
    }
    if (event.target.closest('[data-export-columns-none]')) {
      dataExportScrim
        .querySelectorAll('[data-export-column]')
        .forEach(checkbox => (checkbox.checked = false))
      return
    }
    if (event.target === dataExportScrim || event.target.closest('.data-export-close')) {
      closeDataExport()
    }
  })

  document.getElementById('data-export-run').addEventListener('click', runDataExport)

  return {openDataExport, closeDataExport, dataExportScrim}
}
