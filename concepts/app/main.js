import {createNavigation} from './core/navigation.js'
import {createAssistant} from './components/assistant/assistant.js'
import {createEmail} from './pages/email/email.js'
import {createNotifications} from './components/notifications/notifications.js'
import {createHome} from './pages/home/home.js'
import {createInvoiceOperations} from './pages/invoices/operations.js'
import {createInvoices, createInvoiceState} from './pages/invoices/invoices.js'
import {createInvoicePrint} from './pages/invoices/print.js'
import {createInvoiceActivity} from './pages/invoices/activity.js'
import {createGeography} from './pages/geography/geography.js'
import {createInvoiceRecord} from './pages/invoices/record.js'
import {createInvoiceAdjustments} from './pages/invoices/adjustments.js'
import {createInvoiceLines} from './pages/invoices/lines.js'
import {createInvoicePayments} from './pages/invoices/payments.js'
import {encodeHtml} from './core/locale.js'
import {STATUSES, CHAIN} from './prototype/fixtures/invoices.js'
import {CUSTOMER_ROWS, CUSTOMER_REFERENCE, UNIT_ROWS, CUSTOMER_LOOKUP_RESULTS} from './prototype/fixtures/customers.js'
import {CURRENT_USER, LOGIN_LOG_ROWS, DEVICE_ROWS} from './prototype/fixtures/profile.js'
import {createDataList} from './components/data-list/list.js'
import {createCustomers} from './pages/customers/customers.js'
import {createProfile} from './pages/profile/profile.js'
import {renderCustomerAvatar} from './pages/customers/images.js'
import {createSidebar} from './shell/sidebar.js'
import {createTopbar} from './shell/topbar.js'
import {createShell} from './shell/shell.js'
import {createRecordChrome} from './pages/invoices/chrome.js'
import {createMenus} from './shell/menus.js'
import {createPagers} from './components/record-pager/mount.js'
import {createStatus} from './pages/invoices/status.js'
import {createSearch} from './shell/search.js'
import {createKeyboard} from './shell/keyboard.js'
import {createCustomize} from './shell/customize.js'
import {createAppearanceControls} from './shell/appearance.js'
import {createLocaleControls} from './shell/locale.js'
import {createContentHost} from './shell/content.js'
import {createInvoiceShortcuts} from './pages/invoices/shortcuts.js'
import {createListRuntime} from './components/data-list/runtime.js'
import {createPageListActions} from './pages/list-actions.js'
import {createListGuard} from './components/data-list/guard.js'
import {createListDates} from './components/data-list/date-fields.js'
import {createListPager} from './components/data-list/footer.js'
import {createInvoiceStatistics} from './pages/invoices/statistics.js'
import {createCustomerStatistics} from './pages/customers/statistics.js'
import {createGeoStatistics} from './pages/geography/statistics.js'
import {createListCharts} from './components/data-list/chart-controller.js'
import {createListStatistics} from './components/data-list/statistics-controller.js'
import {createListViews} from './components/data-list/renderers.js'
import {createListCards} from './pages/list-cards.js'
import {createKanban} from './pages/invoices/kanban.js'
import {createStatusDialogs} from './components/data-list/status-dialogs.js'
import {createListMenus} from './components/data-list/menu-controller.js'
import {createListExport} from './components/data-list/export.js'
import {createListFilters} from './components/data-list/filter-controller.js'
import {createUnitPicker} from './pages/geography/unit-picker.js'
import {createAdvancedSearch} from './pages/advanced-search.js'
import {createPageListBindings} from './pages/list-bindings.js'
import {createRecordFields} from './components/record-fields/fields.js'
import {createContextMenu} from './components/data-list/context-menu.js'
import {createLocale} from './core/locale.js'
import {createAppearance} from './core/appearance.js'
import {createWork} from './core/work.js'
import {createDialogFocus} from './components/dialog/dialog.js'
import {createToast} from './components/toast/toast.js'
import {createLoading} from './components/loading/loading.js'
import {readPrototypeState, createPrototypeControls} from './prototype/controls.js'

const locale = createLocale()
const dialogFocus = createDialogFocus(document)
const toast = createToast(document.getElementById('toasts'))

// The original's failNext() both read #failsim's checked state AND reset it
// to false on a simulated failure (so the next click succeeds) — shouldFail
// replicates both steps, preserving runWork's exact original behavior.
const work = createWork({
  shouldFail: () => {
    const failsim = document.getElementById('failsim')
    const failed = Boolean(failsim?.checked)
    if (failed && failsim) failsim.checked = false
    return failed
  },
})

const {t, formatDate: formatLocaleDate, formatCurrency: formatLocaleCurrency, getLocale, setLocale} = locale
const savedPrototypeState = readPrototypeState(sessionStorage)
let launchpadEnabled = savedPrototypeState.launchpad !== false
const getLaunchpadEnabled = () => launchpadEnabled
const setLaunchpadEnabled = enabled => {
  launchpadEnabled = Boolean(enabled)
  if (!launchpadEnabled) hideLaunchpad(document.querySelector('.frame'))
  topbar.syncTopbarChrome()
}

const localeControls = createLocaleControls({
  t,
  formatLocaleCurrency,
  getLocale,
  setLocale,
  getCurrentContentViewName: () => contentHost.getCurrentContentViewName(),
  stopSearchTyping: (...args) => stopSearchTyping(...args),
  startSearchTyping: (...args) => startSearchTyping(...args),
  getLaunchpadUserName: (...args) => getLaunchpadUserName(...args),
  applyState: (...args) => applyState(...args),
  renderGeoRecord: (...args) => renderGeoRecord(...args),
  getDataListState: () => listRuntime.dataListState,
  renderDataList: (...args) => listRuntime.renderDataList(...args),
  getCustomers: () => customers
})

const {trapFocus, releaseFocus} = dialogFocus

const runWork = work

const contentHost = createContentHost({
  syncPrototypeControlsPage: (...args) => syncPrototypeControlsPage(...args),
  queueSkeletonForCurrentView: (...args) => queueSkeletonForCurrentView(...args),
  applyDataI18n: (...args) => localeControls.applyDataI18n(...args),
  renderCustomerList: (...args) => pageListBindings.renderCustomerList(...args),
  renderGeoList: (...args) => pageListBindings.renderGeoList(...args),
  renderListA: (...args) => pageListBindings.renderListA(...args),
  closeAdvancedSearch: (...args) => advancedSearch.closeAdvancedSearch(...args)
})

let showContentView = (...args) => contentHost.attachAndShowView(...args)

let syncPrototypeControlsPage = () => {}

const {
  queue: queueSkeletonForCurrentView,
  clear: clearSkeletonOverlays,
  initTickers: initNumberTickers,
} = createLoading({
  getContainer: (...args) => contentHost.currentSkeletonContainer(...args),
  isSimulationEnabled: () => document.getElementById('simulate-loading')?.checked ?? false,
})

const {state, editable, LOCK_COPY, needsSaved, blocked} = createInvoiceState()

const sidebar = createSidebar({
  t,
  getShowContentView: () => showContentView,
  getLaunchpadEnabled,
  buildNavLaunchpad: (...args) => buildNavLaunchpad(...args),
  restoreLaunchpadActions: (...args) => restoreLaunchpadActions(...args),
  stopSearchTyping: (...args) => stopSearchTyping(...args),
  hideLaunchpad: (...args) => hideLaunchpad(...args),
  showLaunchpad: (...args) => showLaunchpad(...args),
  syncTopbarChrome: (...args) => topbar.syncTopbarChrome(...args),
  closeEmailView: (...args) => closeEmailView(...args),
  visibleDirtyDataListContext: (...args) => listGuard.visibleDirtyDataListContext(...args),
  guardDataListLeave: (...args) => listGuard.guardDataListLeave(...args)
})

const home = createHome({buildRailAndPanel: (...args) => sidebar.buildRailAndPanel(...args), findNavGroup: (...args) => sidebar.findNavGroup(...args), setNavCurrent: (...args) => sidebar.setNavCurrent(...args), t, getLocale, getLaunchpadEnabled, syncCustomerPrototypeControls: (...args) => syncPrototypeControlsPage(...args), getCurrentView: () => contentHost.getCurrentContentViewName(), queueSkeletonForCurrentView: (...args) => queueSkeletonForCurrentView(...args), closeEmailView: () => showContentView('record'), visibleGroups: (...args) => sidebar.visibleGroups(...args), getCurrentApp: () => sidebar.getCurrentAppLabel(), closeAllMenus: (...args) => menus.closeAllMenus(...args)})

const {buildNavLaunchpad, restoreLaunchpadActions, stopSearchTyping, startSearchTyping, hideLaunchpad, getLaunchpadUserName, showLaunchpad, setupAppSwitcher} = home

const topbar = createTopbar({
  toast,
  getSideCollapsed: () => sidebar.getSideCollapsed(),
  getLaunchpadEnabled,
  closeAllMenus: (...args) => menus.closeAllMenus(...args),
  openKbd: (...args) => keyboard.openKbd(...args),
  openCustomize: (...args) => customize.openCustomize(...args),
  navigateToProfileSection: section => {
    navigation.navigate('profile', {section})
    // Mirrors sidebar.js's setNavCurrent: the launchpad overlay's visibility
    // isn't tracked by navigation.js's currentId (the app boots with
    // currentContentViewName === 'record' while the launchpad still shows
    // on top by default), so any navigation trigger outside the sidebar
    // must dismiss it explicitly the same way, or it's left covering the
    // page and intercepting clicks.
    const frame = document.querySelector('.frame')
    const lp = frame && frame.querySelector('.lp-view')
    if (lp && !lp.hidden) hideLaunchpad(frame)
  },
})

const shell = createShell({
  setupAppSwitcher: (...args) => setupAppSwitcher(...args),
  renderSide: (...args) => sidebar.renderSide(...args),
  goToForYou: (...args) => topbar.goToForYou(...args),
  applySideCollapsedState: (...args) => sidebar.applySideCollapsedState(...args),
  toggleSideCollapse: (...args) => sidebar.toggleSideCollapse(...args),
  getLaunchpadEnabled
})

const menus = createMenus({
  showLaunchpad: (...args) => showLaunchpad(...args),
  getLaunchpadEnabled
})

const recordChrome = createRecordChrome({
  getShowContentView: () => showContentView,
  getState: () => state,
  renderActivity: (...args) => renderActivity(...args),
  getModeSel: () => modeSel,
  applyMode: (...args) => applyMode(...args)
})

const pagers = createPagers({

})

const status = createStatus({
  getState: () => state
})

const {drawer, renderCards, renderActivity, openDrawer, closeDrawer} = createInvoiceActivity({state,trapFocus,releaseFocus,closePop: (...args) => status.closePop(...args),closeAllMenus: (...args) => menus.closeAllMenus(...args)})

const {pscrim, openPrintSettings, doPrint} = createInvoicePrint({state, trapFocus, releaseFocus, closeAllMenus: (...args) => menus.closeAllMenus(...args), runWork, toast, clearInlineError: (...args) => clearInlineError(...args), showInlineError: (...args) => showInlineError(...args), applyState: () => applyState()})

const search = createSearch({
  actionDialog: action => actionDialog(action),
  toast,
  getState: () => state,
  blocked,
  stopSearchTyping: (...args) => stopSearchTyping(...args),
  startSearchTyping: (...args) => startSearchTyping(...args),
  openDrawer: (...args) => openDrawer(...args),
  openPrintSettings,
  openRDlg: (...args) => openRDlg(...args),
  runAction: (...args) => runAction(...args)
})

const {actionDialog, requestLeave: requestInvoiceLeave, rscrim, openRDlg, closeRDlg, showInlineError, clearInlineError, doSave, runAction, applyState, gscrim, atRisk, askGuard, runGuarded, modeSel, applyMode} = createInvoiceOperations({t, trapFocus, state, releaseFocus, closeAllMenus: (...args) => menus.closeAllMenus(...args), closeSearch: (...args) => search.closeSearch(...args), getLocale, encodeHtml, blocked, toast, runWork, doPrint, openSearch: (...args) => search.openSearch(...args), STATUSES, CHAIN, reached: (...args) => status.reached(...args), editable, LOCK_COPY, pop: status.pop, renderPop: (...args) => status.renderPop(...args), drawer, renderCards, renderSearch: (...args) => search.renderSearch(...args)})

const keyboard = createKeyboard({
  trapFocus,
  releaseFocus,
  hideLaunchpad: (...args) => hideLaunchpad(...args),
  closeAllMenus: (...args) => menus.closeAllMenus(...args),
  closePop: (...args) => status.closePop(...args),
  closeDrawer: (...args) => closeDrawer(...args),
  getPscrim: () => pscrim,
  openSearch: (...args) => search.openSearch(...args),
  closeSearch: (...args) => search.closeSearch(...args),
  closeRDlg: (...args) => closeRDlg(...args),
  getGscrim: () => gscrim,
  closeCustomize: (...args) => customize.closeCustomize(...args),
  closeAI: (...args) => closeAI(...args)
})

const customize = createCustomize({
  trapFocus,
  releaseFocus,
  toast,
  childrenOf: (...args) => sidebar.childrenOf(...args),
  leavesOf: (...args) => sidebar.leavesOf(...args),
  getForYouGroups: () => sidebar.getForYouGroups(),
  setForYouGroups: value => { sidebar.setForYouGroups(value) },
  renderSide: (...args) => sidebar.renderSide(...args)
})

const appearanceControls = createAppearanceControls({createAppearance, setLaunchpadEnabled})

const notifications = createNotifications({closeAllMenus: (...args) => menus.closeAllMenus(...args), openEmailView: (...args) => openEmailView(...args), closeMenuAndRestoreFocus: (...args) => menus.closeMenuAndRestoreFocus(...args)})

const {syncNotifBadge} = notifications

const email = createEmail({root: document.querySelector('.email-view'), onUnreadChange: () => syncNotifBadge(), navigate: (...args) => showContentView(...args), toast})

const {openEmailView, closeEmailView} = email

topbar.bind()

const assistant = createAssistant({trapFocus, releaseFocus, closeAllMenus: (...args) => menus.closeAllMenus(...args), toast})

const {closeAI} = assistant

const invoiceShortcuts = createInvoiceShortcuts({
  toast,
  getState: () => state,
  blocked,
  renderActivity: (...args) => renderActivity(...args),
  openPrintSettings,
  doSave: (...args) => doSave(...args),
  atRisk: (...args) => atRisk(...args),
  askGuard: (...args) => askGuard(...args),
  getModeSel: () => modeSel,
  applyMode,
  openKbd: (...args) => keyboard.openKbd(...args)
})

recordChrome.bind()

const geography = createGeography({root: document.querySelector('.geo-record-view'), getList: () => listRuntime.dataListInstances.geo, t, dataListIcon: (...args) => listRuntime.dataListIcon(...args), trapFocus, releaseFocus, toast, showContentView: (...args) => showContentView(...args), renderGeoList: (...args) => pageListBindings.renderGeoList(...args), openNewDataListRecord: (...args) => pageListActions.openNewDataListRecord(...args), openPrintSettings, openAdvancedSearch: (...args) => advancedSearch.openAdvancedSearch(...args)})

const {renderGeoRecord, openGeoRecord, closeGeoParentPicker, closeGeoHierarchyDialog} = geography

const listFilters = createListFilters({
  t,
  trapFocus,
  releaseFocus,
  toast,
  getDataListStorage: () => listRuntime.dataListStorage,
  saveDataListLayout: (...args) => listRuntime.saveDataListLayout(...args),
  getDataListState: () => listRuntime.dataListState,
  renderDataList: (...args) => listRuntime.renderDataList(...args),
  dataListIcon: (...args) => listRuntime.dataListIcon(...args),
  dateFilterLabel: (...args) => listDates.dateFilterLabel(...args),
  refreshDataListForContext: (...args) => listRuntime.refreshDataListForContext(...args),
  renderDataFilterModalDateField: (...args) => listDates.renderDataFilterModalDateField(...args)
})

const listViews = createListViews({
  t,
  computeDataListLayoutDirty: (...args) => listRuntime.computeDataListLayoutDirty(...args),
  getDataListState: () => listRuntime.dataListState,
  dataListIcon: (...args) => listRuntime.dataListIcon(...args),
  dataListRows: (...args) => listRuntime.dataListRows(...args),
  invoiceStatusBadge: (...args) => listCards.invoiceStatusBadge(...args),
  renderDataRecordCard: (...args) => listCards.renderDataRecordCard(...args),
  refreshDataListForContext: (...args) => listRuntime.refreshDataListForContext(...args),
  renderCustomerAvatar,
  invoiceStatusTransitions: () => kanban.INVOICE_STATUS_TRANSITIONS
})

const pageListActions = createPageListActions({
  getShowContentView: () => showContentView,
  getState: () => state,
  applyState,
  applyMode,
  openGeoRecord: (...args) => openGeoRecord(...args),
  applyDataListToolbarCommand: (...args) => listRuntime.applyDataListToolbarCommand(...args),
  getCustomers: () => customers,
  invoiceListStatistics: (...args) => invoiceStatistics.invoiceListStatistics(...args),
  customerListStatistics: (...args) => customerStatistics.customerListStatistics(...args),
  geoListStatistics: (...args) => geoStatistics.geoListStatistics(...args),
  dataRecordCardModel: (...args) => listCards.dataRecordCardModel(...args),
  moveInvoiceKanbanCard: (...args) => kanban.moveInvoiceKanbanCard(...args)
})

const listRuntime = createListRuntime({
  locale,
  t,
  toast,
  initNumberTickers: (...args) => initNumberTickers(...args),
  openPrintSettings,
  openGeoRecord: (...args) => openGeoRecord(...args),
  openStatusDialog: (context, row, targetStatusOrCommand) =>
    context === 'invoice'
      ? statusDialogs.openInvoiceStatusDialog(row, targetStatusOrCommand)
      : statusDialogs.openCustomerStatusDialog(row, {command: targetStatusOrCommand}),
  getDataListActions: () => pageListActions.dataListActions,
  guardDataListLeave: (...args) => listGuard.guardDataListLeave(...args),
  dateFilterLabel: (...args) => listDates.dateFilterLabel(...args),
  renderDataListDatePresetOptions: (...args) => listDates.renderDataListDatePresetOptions(...args),
  syncShellListPager: (...args) => listPager.syncShellListPager(...args),
  renderDataListChart: (...args) => listCharts.renderDataListChart(...args),
  renderDataListStatistics: (...args) => listStatistics.renderDataListStatistics(...args),
  renderDataListGroupTrigger: (...args) => listStatistics.renderDataListGroupTrigger(...args),
  renderDataListGroupingBar: (...args) => listStatistics.renderDataListGroupingBar(...args),
  renderDataListHeader: (...args) => listViews.renderDataListHeader(...args),
  renderDataListBody: (...args) => listViews.renderDataListBody(...args),
  openQuickView: (...args) => listViews.openQuickView(...args),
  renderDataListCards: (...args) => listViews.renderDataListCards(...args),
  renderDataListAdaptiveRecord: (...args) => listViews.renderDataListAdaptiveRecord(...args),
  getINVOICE_STATUS_TRANSITIONS: () => kanban.INVOICE_STATUS_TRANSITIONS,
  renderDataListKanban: (...args) => kanban.renderDataListKanban(...args),
  positionDataMenu: (...args) => listMenus.positionDataMenu(...args),
  applyFrozenDataListColumns: (...args) => listMenus.applyFrozenDataListColumns(...args),
  applyDataListFilterClick: (...args) => listFilters.applyDataListFilterClick(...args),
  applyDataListToolbarClick: (...args) => listFilters.applyDataListToolbarClick(...args),
  resolvedDataListStatisticsConcept: (...args) => listMenus.resolvedDataListStatisticsConcept(...args),
  activeDataListStatisticsConcept: (...args) => listMenus.activeDataListStatisticsConcept(...args),
  renderDataPageManageMenu: (...args) => listMenus.renderDataPageManageMenu(...args),
  renderGeoList: (...args) => pageListBindings.renderGeoList(...args)
})

// Explicit diagnostic export used by lifecycle tests; importing this module reuses the mounted app.
export const dataListInstances = listRuntime.dataListInstances

appearanceControls.setDataListChartRefreshReady(true)

const listGuard = createListGuard({
  trapFocus,
  releaseFocus,
  saveDataListLayout: (...args) => listRuntime.saveDataListLayout(...args),
  getDataListState: () => listRuntime.dataListState
})

const recordFields = createRecordFields()

const customerDependencies = {
  templates: {
    listInstance: listRuntime.dataListInstances.customer,
    listRoot: document.getElementById('customer-list-canvas'),
    listFooter: document.getElementById('customer-list-fnav'),
    recordRoot: document.querySelector('.customer-record-view'),
  },
  locale,
  appearance: null,
  dialogs: {trapFocus, releaseFocus},
  toast,
  work: runWork,
  navigate: null,
  createList: createDataList,
  record: {
    t,
    encodeHtml,
    showContentView: (...args) => showContentView(...args),
    applyRecordValueDirections: (...args) => recordFields.applyRecordValueDirections(...args),
    customerRows: CUSTOMER_ROWS,
    customerReference: CUSTOMER_REFERENCE,
    lookupResults: CUSTOMER_LOOKUP_RESULTS,
    unitRows: UNIT_ROWS,
    openCustomerRecord: (...args) => pageListActions.openCustomerRecord(...args),
    openCustomerSearch: (...args) => advancedSearch.openCustomerSearch(...args),
    openPrintSettings,
    openCustomerStatusDialog: (row, options) => statusDialogs.openCustomerStatusDialog(row, options),
    closeAllMenus: (...args) => menus.closeAllMenus(...args),
  },
}

const customers = createCustomers(customerDependencies)

const profile = createProfile({
  root: document.querySelector('.profile-view'),
  encodeHtml,
  currentUser: CURRENT_USER,
  loginLogRows: LOGIN_LOG_ROWS,
  deviceRows: DEVICE_ROWS,
  storage: sessionStorage,
  toast,
  trapFocus: dialogFocus.trapFocus,
  releaseFocus: dialogFocus.releaseFocus,
  syncAppearanceControls: () => appearanceControls.syncAppearanceControls(),
  bindAppearanceSection: () => appearanceControls.bindAppearanceSection(),
})

const listDates = createListDates({
  t,
  formatLocaleDate,
  getAppLocale: () => localeControls.getAppLocale(),
  dataListIcon: (...args) => listRuntime.dataListIcon(...args)
})

const listPager = createListPager({
  t,
  applyDataListRowAction: (...args) => listRuntime.applyDataListRowAction(...args),
  getDataListState: () => listRuntime.dataListState,
  renderDataList: (...args) => listRuntime.renderDataList(...args),
  dataListIcon: (...args) => listRuntime.dataListIcon(...args),
  dataListRows: (...args) => listRuntime.dataListRows(...args),
  renderDataListAdaptiveFooterActions: (...args) => listViews.renderDataListAdaptiveFooterActions(...args)
})

const listStatistics = createListStatistics({
  locale,
  t,
  getDataListState: () => listRuntime.dataListState,
  dataListIcon: (...args) => listRuntime.dataListIcon(...args),
  invoiceListStatistics: (...args) => invoiceStatistics.invoiceListStatistics(...args),
  customerListStatistics: (...args) => customerStatistics.customerListStatistics(...args),
  geoListStatistics: (...args) => geoStatistics.geoListStatistics(...args),
  resolvedDataListStatisticsConcept: (...args) => listMenus.resolvedDataListStatisticsConcept(...args)
})

const invoiceStatistics = createInvoiceStatistics({
  dataListPercent: (...args) => listStatistics.dataListPercent(...args)
})

const customerStatistics = createCustomerStatistics({
  dataListPercent: (...args) => listStatistics.dataListPercent(...args)
})

const geoStatistics = createGeoStatistics({
  dataListPercent: (...args) => listStatistics.dataListPercent(...args)
})

const listCharts = createListCharts({
  locale,
  t,
  getDataListChartRefreshReady: () => appearanceControls.getDataListChartRefreshReady(),
  getDataListState: () => listRuntime.dataListState,
  dataListIcon: (...args) => listRuntime.dataListIcon(...args),
  refreshDataListForContext: (...args) => listRuntime.refreshDataListForContext(...args)
})

appearanceControls.setOnRefreshCharts((...args) => listCharts.refreshOpenDataListCharts(...args))

const listCards = createListCards({
  dataListIcon: (...args) => listRuntime.dataListIcon(...args),
  getSharedViewDeps: () => listViews.sharedViewDeps,
  invoiceStatusKey: (...args) => kanban.invoiceStatusKey(...args)
})

const kanban = createKanban({
  trapFocus,
  releaseFocus,
  toast,
  renderDataList: (...args) => listRuntime.renderDataList(...args),
  renderDataListRowActions: (...args) => listViews.renderDataListRowActions(...args)
})

const statusDialogs = createStatusDialogs({
  trapFocus,
  releaseFocus,
  toast,
  renderDataList: (...args) => listRuntime.renderDataList(...args)
})

const listMenus = createListMenus({
  t,
  toast,
  computeDataListLayoutDirty: (...args) => listRuntime.computeDataListLayoutDirty(...args),
  applyDataListRowAction: (...args) => listRuntime.applyDataListRowAction(...args),
  applyDataListToolbarCommand: (...args) => listRuntime.applyDataListToolbarCommand(...args),
  saveDataListLayout: (...args) => listRuntime.saveDataListLayout(...args),
  resetDataListLayout: (...args) => listRuntime.resetDataListLayout(...args),
  getDataListState: () => listRuntime.dataListState,
  renderDataList: (...args) => listRuntime.renderDataList(...args),
  dataListIcon: (...args) => listRuntime.dataListIcon(...args),
  openDataExport: (...args) => listExport.openDataExport(...args)
})

const listExport = createListExport({
  trapFocus,
  releaseFocus,
  toast,
  getDataListState: () => listRuntime.dataListState,
  dataListRows: (...args) => listRuntime.dataListRows(...args)
})

const pageListBindings = createPageListBindings({
  getShowContentView: () => showContentView,
  renderGeoRecord: (...args) => renderGeoRecord(...args),
  closeGeoParentPicker: (...args) => closeGeoParentPicker(...args),
  closeGeoHierarchyDialog: (...args) => closeGeoHierarchyDialog(...args),
  openNewDataListRecord: (...args) => pageListActions.openNewDataListRecord(...args),
  getDataListState: () => listRuntime.dataListState,
  renderDataList: (...args) => listRuntime.renderDataList(...args),
  guardDataListLeave: (...args) => listGuard.guardDataListLeave(...args),
  closeDataExport: (...args) => listExport.closeDataExport(...args),
  closeKanbanBlockedDialog: (...args) => kanban.closeKanbanBlockedDialog(...args),
  closeUnitPicker: (...args) => unitPicker.closeUnitPicker(...args),
  closeDataFilterModal: (...args) => listFilters.closeDataFilterModal(...args),
  openCustomerRecord: (...args) => pageListActions.openCustomerRecord(...args),
  getGeoFilterScrim: () => listFilters.geoFilterScrim,
  getUnitPickerScrim: () => unitPicker.unitPickerScrim,
  getKanbanBlockedScrim: () => kanban.kanbanBlockedScrim,
  getDataExportScrim: () => listExport.dataExportScrim
})

const unitPicker = createUnitPicker({
  trapFocus,
  releaseFocus,
  dataListIcon: (...args) => listRuntime.dataListIcon(...args)
})

const advancedSearch = createAdvancedSearch({
  trapFocus,
  releaseFocus,
  openGeoRecord: (...args) => openGeoRecord(...args),
  renderCustomerList: (...args) => pageListBindings.renderCustomerList(...args),
  openCustomerRecord: (...args) => pageListActions.openCustomerRecord(...args)
})

listMenus.bind()

pageListBindings.bind()

const {addPaymentMethodRow, dispose: disposeInvoicePayments} = createInvoicePayments({connectRecordLabels: (...args) => recordFields.connectRecordLabels(...args), applyRecordValueDirections: (...args) => recordFields.applyRecordValueDirections(...args), applyState})

const {addItemRow, recalcTotalQty, dispose: disposeInvoiceLines} = createInvoiceLines({applyRecordValueDirections: (...args) => recordFields.applyRecordValueDirections(...args), applyState})

const {recalcInvoiceSummary, addInvoiceAdjustment, dispose: disposeInvoiceAdjustments} = createInvoiceAdjustments({applyRecordValueDirections: (...args) => recordFields.applyRecordValueDirections(...args), applyState})

const {render: renderRecordA, dispose: disposeRecordTabs} = createInvoiceRecord({connectRecordLabels: (...args) => recordFields.connectRecordLabels(...args), applyRecordValueDirections: (...args) => recordFields.applyRecordValueDirections(...args), addPaymentMethodRow, addItemRow, addInvoiceAdjustment, recalcInvoiceSummary})

const invoices = createInvoices({
  templates: {
    listRoot: document.querySelector('.list-view'), listCanvas: document.getElementById('list-canvas'),
    listFooter: document.getElementById('list-fnav'), listInstance: listRuntime.dataListInstances.invoice,
    recordRoots: [...document.querySelector('.page-content').children].filter(element => !element.matches('.email-view,.list-view,.customer-list-view,.customer-record-view,.geo-list-view,.geo-record-view')),
  }, state, operations: {applyState, applyMode, modeSel, requestLeave: requestInvoiceLeave},
  record: {render: renderRecordA, dispose: () => { disposeRecordTabs(); disposeInvoiceLines(); disposeInvoicePayments(); disposeInvoiceAdjustments() }},
})

const pageRegistry = new Map([
  ['launchpad', home],
  ['record', invoices.recordPage],
  ['list', invoices.listPage],
  ['customers-list', customers.listPage],
  ['customer-record', customers.recordPage],
  ['geo-list', geography.listPage],
  ['geo-record', geography.recordPage],
  ['email', email],
  ['profile', profile],
])

const navigation = createNavigation({
  resolvePage: id => pageRegistry.get(id),
  requestLeave: (fromId) => listGuard.requestPageLeave(fromId),
  showPage(page) {
    if (page.id === 'launchpad') return
    contentHost.attachAndShowView(page.id)
  },
  onChange: (...args) => contentHost.onNavigationChange(...args),
})

showContentView = name => {
  navigation.navigate(name)
}

contentHost.setContentViewDeferralReady(true)

navigation.navigate(contentHost.getCurrentContentViewName())

applyState()

const contextMenu = createContextMenu({
  t,
  toast,
  renderDataListSelectionActions: (...args) => listViews.renderDataListSelectionActions(...args),
  computeDataListLayoutDirty: (...args) => listRuntime.computeDataListLayoutDirty(...args),
  applyDataListRowAction: (...args) => listRuntime.applyDataListRowAction(...args),
  applyDataListToolbarCommand: (...args) => listRuntime.applyDataListToolbarCommand(...args),
  getDataListState: () => listRuntime.dataListState,
  dataListIcon: (...args) => listRuntime.dataListIcon(...args),
  rowMenuItems: (...args) => listViews.rowMenuItems(...args),
  refreshDataListForContext: (...args) => listRuntime.refreshDataListForContext(...args)
})

if (savedPrototypeState['customer-mode']) customers.setMode(savedPrototypeState['customer-mode'])
if (savedPrototypeState['customer-layout']) customers.setLayout(savedPrototypeState['customer-layout'])
const controls = createPrototypeControls({root: document, settings: appearanceControls.appearance, pages: {invoices, customers}})
syncPrototypeControlsPage = controls.syncPage
