import {CUSTOMER_SECTIONS} from '../prototype/fixtures/customers.js'
import {GEO_ROWS} from '../prototype/fixtures/geography.js'
import {DATA_LIST_CONFIG} from '../components/data-list/columns.js'
import {invoiceHeaderFromRow, statusKeyFromLabel} from '../prototype/fixtures/invoices.js'

/** Owns page list actions state and its DOM bindings. */
export function createPageListActions({getShowContentView, getState, applyState, applyMode, openGeoRecord, applyDataListToolbarCommand, getCustomers, getPeople, invoiceListStatistics, customerListStatistics, geoListStatistics, dataRecordCardModel, moveInvoiceKanbanCard} = {}) {
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
        if (!openInvoiceRecord(key)) return false
        // Opening a locked row in Edit must not silently turn it into Open.
        if (mode === 'edit' && ['posted', 'canceled', 'inactive'].includes(getState().status)) mode = 'view'
        const modeControl = document.getElementById('mode')
        if (modeControl) {
          modeControl.value = mode === 'view' ? 'record' : mode
          modeControl.dispatchEvent(new Event('change', {bubbles: true}))
        }
        return true
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

  // Screen Parameters rows have no detail record, no create-new, and no
  // row-level commands (columns.js's `noRowActions: true` already keeps
  // the shared list from rendering anything that would call these) — kept
  // as no-ops rather than omitted so this context's shape still satisfies
  // whatever generically calls actions[context].<method>() (e.g. a stray
  // click bypassing the suppressed row-actions cell).
  function screenParametersListActions() {
    return {
      openRecord: () => {},
      newRecord: () => {},
      run: () => false,
    }
  }

  const dataListActionFactories = {
    invoice: invoiceListActions,
    customer: customerListActions,
    geo: geoListActions,
    screenParameters: screenParametersListActions,
    // Journal Entry lines are the same shape (no detail record, no
    // create-new, no row-level commands) as Screen Parameters.
    journal: screenParametersListActions,
    // Organization Center's 5 contexts are the same shape too — their
    // Revoke/Terminate actions are cell content (renderers.js), not
    // engine-native row actions, so nothing here needs to do anything.
    orgUsers: screenParametersListActions,
    orgAppSessions: screenParametersListActions,
    orgDbSessions: screenParametersListActions,
    orgAudit: screenParametersListActions,
    orgStaff: screenParametersListActions,
  }

  const dataListActions = Object.fromEntries(
    Object.keys(DATA_LIST_CONFIG).map(context => [context, context === 'people' ? {
      openRecord: (id, mode) => getPeople().openPerson(id, {edit: mode === 'edit'}),
      deleteRecords: keys => getPeople().deleteRecords(keys),
    } : dataListActionFactories[context]()])
  )

  function openCustomerRecord(customerNo, mode) {
    getCustomers().recordPage.openRecord(customerNo, mode, {CUSTOMER_SECTIONS})
    getShowContentView()('customer-record')
  }

  function openInvoiceRecord(no) {
    const row = DATA_LIST_CONFIG.invoice.rows.find(row => String(row.no) === String(no))
    const status = row && statusKeyFromLabel(row.status)
    if (!status) return false
    const state = getState()
    state.docNo = String(row.no)
    state.docSeq = row.seq
    state.sourceInvoiceNo = String(row.no)
    state.status = status
    /* the row's own header fields and payment type; the #pay control still overrides afterwards */
    state.header = invoiceHeaderFromRow(row)
    state.pay = row.pay.toLowerCase()
    document.getElementById('st').value = state.status
    document.getElementById('pay').value = state.pay
    getShowContentView()('record')
    applyState()
    return true
  }

  return {openNewDataListRecord, dataListActions, openCustomerRecord}
}
