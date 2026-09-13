// Customers page assembly — Task 5 exported `customerConfig` only
// (configuration for the shared data-list, since the empty-filter test
// needed it before the rest of the customer surface existed). Task 7
// replaces that stub with the real `createCustomers(...)` factory named in
// the brief's Interfaces section, composing the now-extracted
// fields/images/lookups/layouts/record modules plus the shared
// `createList`/`createDataList` factory.
//
// `createList` here is the brief's literal name for the parameter, but
// legacy-app.js does not call `createList(...)` itself from inside this
// factory — Task 6 already constructs ONE `createDataList` instance per
// `DATA_LIST_CONFIG` context (invoice/customer/geo) up front, shared by
// every list-context consumer (toolbar guards, layout persistence, etc., see
// legacy-app.js's `dataListInstances`). Building a second, independent
// customer-list instance here would fork that shared state. So `createList`
// is accepted as the parameter the brief names, but `listPage` wraps the
// ALREADY-CONSTRUCTED instance legacy-app.js passes in as
// `templates.listInstance` (that instance itself came from calling
// `createList(...)` once, centrally) — same object, not a second one.
//
// No real Navigation/createNavigation exists yet (Task 10): per the prior
// report's architecture finding, `listPage`/`recordPage` implement the Page
// contract but nothing calls `.activate()`/`.deactivate()` from a central
// navigator until Task 10 lands. legacy-app.js calls those methods itself
// at the existing showContentView/#customer-mode call sites — the same
// relationship Task 6 established between createDataList's lifecycle
// methods and renderDataList's direct calls.

import {DATA_LIST_CONFIG} from '../../components/data-list/columns.js'
import {createCustomerRecord} from './record.js'

export const customerConfig = DATA_LIST_CONFIG.customer

/**
 * @param {object} params
 * @param {object} params.templates - {listInstance, listRoot, listFooter,
 *   recordRoot} — `listInstance` is the pre-built `createDataList({context:
 *   'customer', ...})` handle; `listRoot`/`listFooter` are
 *   `.customer-list-view`'s canvas/footer and `recordRoot` is
 *   `.customer-record-view` (the retained record page root).
 * @param {object} params.locale - {code}
 * @param {object} params.appearance - reserved for future theming hooks;
 *   accepted (not required) to match the brief's declared factory
 *   signature.
 * @param {object} params.dialogs - {trapFocus, releaseFocus}
 * @param {Function} params.toast
 * @param {Function} params.work - reserved (matches the brief's declared
 *   signature); not currently consumed by either page.
 * @param {Function} params.navigate - reserved for Task 10's real
 *   navigator; not currently consumed (legacy-app.js still drives
 *   activate/deactivate directly, per the architecture note above).
 * @param {Function} params.createList - accepted per the brief's declared
 *   signature; unused here since the shared instance already exists (see
 *   the module comment above) — kept as a named parameter rather than
 *   dropped, so the factory's shape matches the brief exactly.
 * @param {object} params.record - the additional record-page-only deps
 *   record.js's factory needs (t, encodeHtml, showContentView,
 *   applyRecordValueDirections, customerRows, customerReference,
 *   lookupResults, unitRows, openCustomerRecord, openCustomerSearch,
 *   openPrintSettings, closeAllMenus) — kept as a separate bundle rather
 *   than widening the top-level signature, since these are customer-record
 *   specifics the brief's generic factory signature has no named slot for.
 * @returns {{listPage: object, recordPage: object, setMode: Function, setLayout: Function}}
 */
export function createCustomers({templates, locale, appearance, dialogs, toast, work, navigate, createList, record: recordDeps}) {
  const listInstance = templates.listInstance || null

  const recordInstance = createCustomerRecord({
    root: templates.recordRoot,
    deps: {
      t: recordDeps.t,
      encodeHtml: recordDeps.encodeHtml,
      toast,
      trapFocus: dialogs.trapFocus,
      releaseFocus: dialogs.releaseFocus,
      showContentView: recordDeps.showContentView,
      applyRecordValueDirections: recordDeps.applyRecordValueDirections,
      customerRows: recordDeps.customerRows,
      customerReference: recordDeps.customerReference,
      lookupResults: recordDeps.lookupResults,
      unitRows: recordDeps.unitRows,
      openCustomerRecord: recordDeps.openCustomerRecord,
      openCustomerSearch: recordDeps.openCustomerSearch,
      openPrintSettings: recordDeps.openPrintSettings,
      closeAllMenus: recordDeps.closeAllMenus,
    },
  })

  const listPage = {
    id: 'customers-list',
    roots: {root: templates.listRoot},
    activate({root, footer} = {}) {
      listInstance?.activate({root: root || templates.listRoot, footer: footer || templates.listFooter})
    },
    deactivate() {
      listInstance?.deactivate()
    },
    dispose() {
      listInstance?.dispose()
    },
    render: (...args) => listInstance?.render(...args),
    getState: () => listInstance?.getState(),
  }

  const recordPage = recordInstance

  function setMode(mode) {
    recordInstance.setMode(mode)
  }

  function setLayout(layout) {
    recordInstance.setLayout(layout)
  }

  return {listPage, recordPage, setMode, setLayout}
}
