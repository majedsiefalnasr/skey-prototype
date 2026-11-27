import {LIST_ROWS} from '../prototype/fixtures/invoices.js'
import {CUSTOMER_ROWS} from '../prototype/fixtures/customers.js'
import {GEO_ROWS} from '../prototype/fixtures/geography.js'

/** Owns page list bindings state and its DOM bindings. */
export function createPageListBindings({getShowContentView, renderGeoRecord, closeGeoParentPicker, closeGeoHierarchyDialog, openNewDataListRecord, getDataListState, renderDataList, guardDataListLeave, closeDataExport, closeKanbanBlockedDialog, closeUnitPicker, closeDataFilterModal, openCustomerRecord, getGeoFilterScrim, getUnitPickerScrim, getKanbanBlockedScrim, getDataExportScrim} = {}) {
  function renderCustomerList(rows = CUSTOMER_ROWS, {advanced = false} = {}) {
    const listState = getDataListState().customer
    listState.sourceRows = rows
    listState.advanced = advanced
    listState.canvas = document.getElementById('customer-list-canvas')
    renderDataList('customer')
  }

  function renderGeoList() {
    const listState = getDataListState().geo
    listState.sourceRows = GEO_ROWS
    listState.canvas = document.getElementById('geo-list-canvas')
    renderDataList('geo')
  }

  function renderListA(canvas) {
    getDataListState().invoice.canvas = canvas
    getDataListState().invoice.sourceRows = LIST_ROWS
    renderDataList('invoice')
  }

  document.getElementById('customer-list-add').addEventListener('click', () => {
    const addCustomer = () => openCustomerRecord(null, 'create')
    if (!guardDataListLeave(addCustomer)) addCustomer()
  })

  const geoParentPickerScrim = document.getElementById('geo-parent-picker-scrim')

  const geoHierarchyScrim = document.getElementById('geo-hierarchy-scrim')

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return
    const modal = event.target.closest?.('[aria-modal="true"]')
    const owns = scrim => scrim.classList.contains('open') && (!modal || scrim.contains(modal))
    if (owns(getGeoFilterScrim())) closeDataFilterModal()
    else if (owns(geoParentPickerScrim)) closeGeoParentPicker()
    else if (owns(getUnitPickerScrim())) closeUnitPicker()
    else if (owns(geoHierarchyScrim)) closeGeoHierarchyDialog()
    else if (owns(getKanbanBlockedScrim())) closeKanbanBlockedDialog()
    else if (owns(getDataExportScrim())) closeDataExport()
  })

  document.getElementById('list-add').addEventListener('click', () => {
    const addInvoice = () => getShowContentView()('record')
    if (!guardDataListLeave(addInvoice)) addInvoice()
  })

  document.getElementById('geo-list-add').addEventListener('click', () => {
    const addLocation = () => openNewDataListRecord('geo')
    if (!guardDataListLeave(addLocation)) addLocation()
  })

  function bind() {
  renderGeoRecord()
  }

  return {renderCustomerList, renderGeoList, renderListA, bind}
}
