import {CUSTOMER_SECTIONS} from '../prototype/fixtures/customers.js'
import {GEO_ROWS} from '../prototype/fixtures/geography.js'
import {DATA_LIST_CONFIG} from '../components/data-list/columns.js'

/** Owns page list actions state and its DOM bindings. */
export function createPageListActions({getShowContentView, getState, applyState, applyMode, openGeoRecord, applyDataListToolbarCommand, getCustomers, invoiceListStatistics, customerListStatistics, geoListStatistics, dataRecordCardModel, moveInvoiceKanbanCard} = {}) {
  function openNewDataListRecord(context) {
    if (context === 'customer') {
      openCustomerRecord(null, 'create')
      return
    }
    if (context === 'geo') {
      openGeoRecord(GEO_ROWS[0].code, 'create')
      return
    }
    document.getElementById('mode').value = 'create'
    getShowContentView()('record')
    applyMode('create')
  }
  
  function invoiceListActions() {
    return {
      openRecord: (key, mode) => {
        openInvoiceRecord(key)
        const modeControl = document.getElementById('mode')
        if (modeControl) {
          modeControl.value = mode === 'view' ? 'record' : mode
          modeControl.dispatchEvent(new Event('change', {bubbles: true}))
        }
      },
      newRecord: () => openNewDataListRecord('invoice'),
      run: (command, keys, extra) => {
        if (command === 'move-kanban') {
          moveInvoiceKanbanCard('invoice', keys[0], extra.toStatus)
          return true
        }
        return applyDataListToolbarCommand('invoice', command, keys[0])
      },
      cardModel: row => dataRecordCardModel('invoice', row),
      statistics: invoiceListStatistics,
    }
  }
  
  function customerListActions() {
    return {
      openRecord: (key, mode) => openCustomerRecord(key, mode),
      newRecord: () => openNewDataListRecord('customer'),
      run: (command, keys) => applyDataListToolbarCommand('customer', command, keys[0]),
      cardModel: row => dataRecordCardModel('customer', row),
      statistics: customerListStatistics,
    }
  }
  
  function geoListActions() {
    return {
      openRecord: (key, mode) => openGeoRecord(key, mode),
      newRecord: () => openNewDataListRecord('geo'),
      run: (command, keys) => applyDataListToolbarCommand('geo', command, keys[0]),
      cardModel: row => dataRecordCardModel('geo', row),
      statistics: geoListStatistics,
    }
  }
  
  const dataListActionFactories = {
    invoice: invoiceListActions,
    customer: customerListActions,
    geo: geoListActions,
  }
  
  const dataListActions = Object.fromEntries(
    Object.keys(DATA_LIST_CONFIG).map(context => [context, dataListActionFactories[context]()])
  )
  
  function openCustomerRecord(customerNo, mode) {
    getCustomers().recordPage.openRecord(customerNo, mode, {CUSTOMER_SECTIONS})
    getShowContentView()('customer-record')
  }
  
  function openInvoiceRecord(no) {
    /* minimal per design spec §4: reflect which row was clicked in the record's
     title/breadcrumb — not a real invoice data lookup, no backend to query */
    getState().docNo = no
    getShowContentView()('record')
    applyState()
  }

  return {openNewDataListRecord, dataListActions, openCustomerRecord}
}
