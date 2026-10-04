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
import {parse as parseRouteUrl, format as formatRouteUrl, resolveDefaultEntry} from './core/routes.js'
import {createInvoiceRecord} from './pages/invoices/record.js'
import {createInvoiceAdjustments} from './pages/invoices/adjustments.js'
import {createInvoiceLines} from './pages/invoices/lines.js'
import {createInvoicePayments} from './pages/invoices/payments.js'
import {encodeHtml} from './core/locale.js'
import {STATUSES, CHAIN} from './prototype/fixtures/invoices.js'
import {CUSTOMER_ROWS, CUSTOMER_REFERENCE, UNIT_ROWS, CUSTOMER_LOOKUP_RESULTS} from './prototype/fixtures/customers.js'
import {CURRENT_USER, EMPLOYEE_DETAILS, CONTACT_DETAILS, LOGIN_LOG_ROWS, RECENT_ACTIVITY_ROWS} from './prototype/fixtures/profile.js'
import {ORGANIZATION_DETAILS, ORGANIZATION_USERS, APPLICATION_SESSIONS, DATABASE_SESSIONS, ORGANIZATION_AUDIT_ROWS, STAFF_OPERATION_ROWS, SYSTEM_HEALTH, SYSTEM_SERVICES} from './prototype/fixtures/organization.js'
import {createDataList} from './components/data-list/list.js'
import {createCustomers} from './pages/customers/customers.js'
import {createProfile} from './pages/profile/profile.js'
import {createOrganization} from './pages/organization/organization.js'
import {createForYou} from './pages/for-you/for-you.js'
import {createOrganizationSessionActions} from './pages/organization/sessions.js'
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
import {createScreenParametersDialog} from './components/screen-parameters/screen-parameters.js'
import {createJournalEntryTable} from './components/screen-parameters/journal-entry.js'
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
import {createSpotlight} from './components/spotlight/spotlight.js'
import {tourStepsFor} from './components/spotlight/tour.js'
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
// Prototype spotlight tour (T1 invoice-shell onboarding). Never
// auto-starts: it only runs after an explicit trigger (Help → Take a
// tour, ?tour=1, or the Prototype Controls Start button), and only while
// the Prototype Controls Tour kill switch is ON.
const spotlight = createSpotlight({document, t})

/* Context-aware tour triggers. Help → Take a tour, the Prototype
   Controls Start button, and ?tour=1 all start the tour for the surface
   currently on screen (launchpad overlay wins over the view beneath it);
   ?tour=<surface> (list, record, profile, organization, launchpad) forces
   one. Unknown surfaces and surfaces without visible targets return
   false so callers can explain instead of starting nothing. */
function currentTourSurface() {
  if (document.querySelector('.lp-view:not([hidden])')) return 'launchpad'
  // contentHost is composed below; this only runs on user/demo triggers,
  // long after module evaluation finished.
  return contentHost.getCurrentContentViewName()
}
function startTourForSurface(surface, invoker) {
  const steps = tourStepsFor(surface ?? currentTourSurface())
  if (!steps) return false
  return spotlight.start(steps, invoker)
}
function explainNoTour() {
  toast({tone: 'info', title: t('No guided tour for this page yet')})
}
const savedPrototypeState = readPrototypeState(sessionStorage)
let activeRole = savedPrototypeState['active-role'] || 'administrator'
let launchpadEnabled = savedPrototypeState.launchpad !== false
const getLaunchpadEnabled = () => launchpadEnabled
const setLaunchpadEnabled = enabled => {
  launchpadEnabled = Boolean(enabled)
  if (!launchpadEnabled) hideLaunchpad(document.querySelector('.frame'))
  topbar.syncTopbarChrome()
}

/* ---- routing v1: deterministic URL <-> view mapping (core/routes.js).
   parse() runs before the shell exists; the default-entry resolution for
   '/' is the only step that reads launchpad configuration. `bootPlan` is
   also what popstate falls back to for URLs this app does not own (e.g.
   the legacy /concepts/app-shell.html entry). ---- */
const bootRoute = parseRouteUrl(location.pathname, location.search)
const bootPlan = (() => {
  if (bootRoute === null) {
    // Legacy entry document: keep today's boot outcome (Launchpad
    // overlay when enabled, otherwise the invoice list).
    return getLaunchpadEnabled() ? {kind: 'launchpad'} : {id: 'list', data: {}}
  }
  if (bootRoute.defaultEntry) return resolveDefaultEntry({launchpadEnabled: getLaunchpadEnabled()})
  return bootRoute
})()
const bootRenderFlags = bootRoute === null
  ? undefined
  : bootRoute.defaultEntry
    ? (getLaunchpadEnabled() ? {bootToLaunchpad: true} : {bootToLaunchpad: false, skipAutoNav: true})
    : {bootToLaunchpad: false, skipAutoNav: true}
const NAV_ITEM_LABEL_BY_ID = {
  list: 'Sales Invoice',
  'customers-list': 'Customers',
  'geo-list': 'Geographical Structure',
}
const pendingBootId = bootPlan.kind === 'launchpad' ? 'record' : bootPlan.id

/* The legacy /concepts/app-shell.html entry must keep working unchanged
   (decision 12) — and it must never change its own URL: a pushState to '/'
   would re-resolve every relative URL (customer avatars, fixture images)
   against the site root. URL sync therefore only runs when the document
   was itself booted from a route ('/' or a deep link). */
const routingEnabled = bootRoute !== null || location.pathname === '/'

let booted = false
let handlingPop = false
let suppressNextPop = false
let routeIdx = 0
let lastNavData

const pushRoute = path => {
  if (!routingEnabled) return
  routeIdx += 1
  history.pushState({routeIdx}, '', path)
}

const syncUrl = (id, data) => {
  lastNavData = data
  if (!booted || handlingPop) return
  /* While the launchpad overlay is open it owns the URL: intermediate
     content-view changes behind it (closing the email detail, pre-rendering
     the target) must not create history entries. The overlay's hide handler
     records the destination instead. */
  if (document.querySelector('.lp-view:not([hidden])')) return
  const path = formatRouteUrl(id, data)
  if (path == null || path === location.pathname + location.search) return
  pushRoute(path)
}

/* Launchpad is an overlay, not a navigation page: its URL sync hangs off
   show/hide rather than onChange. Showing the overlay on the default-entry
   route pushes '/'; hiding it records the destination — the view revealed
   underneath, or the target the caller navigated to (overlay-open clicks
   resolve their content view asynchronously, after hide has run). */
const onLaunchpadShow = () => {
  if (!booted || handlingPop || location.pathname === '/') return
  pushRoute('/')
}
const onLaunchpadHide = target => {
  if (!booted || handlingPop || location.pathname !== '/') return
  /* `target` is either the view revealed underneath (name, resolved with
     the last navigation data) or the {id, data} route plan the caller
     navigated to (app-scoped For You targets). */
  const plan =
    target && typeof target === 'object'
      ? target
      : {id: target ?? contentHost.getCurrentContentViewName(), data: lastNavData}
  const path = formatRouteUrl(plan.id, plan.data)
  if (path != null && path !== '/') pushRoute(path)
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
  openForYou: (...args) => openForYou(...args),
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

const openForYou = async app => {
  /* Highlight the app's rail/panel state exactly like v1's setNavCurrent
     did for the Dashboard tile, then navigate to its For You landing. */
  sidebar.applyNavCurrent(document.querySelector('.side'), app, {forYou: true})
  const allowed = await navigation.navigate('foryou', {app})
  if (!allowed) {
    /* A refused guard must leave the URL and highlight on the view that
       actually stayed on screen: the overlay-hide step already pushed the
       destination before navigation ran. */
    syncUrl(contentHost.getCurrentContentViewName(), lastNavData)
    const currentLabel = NAV_ITEM_LABEL_BY_ID[navigation.current()]
    if (currentLabel) sidebar.applyNavCurrent(document.querySelector('.side'), currentLabel)
  }
}

const home = createHome({buildRailAndPanel: (...args) => sidebar.buildRailAndPanel(...args), findNavGroup: (...args) => sidebar.findNavGroup(...args), setNavCurrent: (...args) => sidebar.setNavCurrent(...args), t, getLocale, getLaunchpadEnabled, syncCustomerPrototypeControls: (...args) => syncPrototypeControlsPage(...args), getCurrentView: () => contentHost.getCurrentContentViewName(), queueSkeletonForCurrentView: (...args) => queueSkeletonForCurrentView(...args), closeEmailView: () => {
    /* Only a real email detail counts as "the email view": closing the
       launchpad must not bounce the content view through 'record'. */
    if (contentHost.getCurrentContentViewName() === 'email') showContentView('record')
  }, visibleGroups: (...args) => sidebar.visibleGroups(...args), getCurrentApp: () => sidebar.getCurrentAppLabel(), closeAllMenus: (...args) => menus.closeAllMenus(...args), onLaunchpadShow, onLaunchpadHide, openForYou: (...args) => openForYou(...args)})

const {buildNavLaunchpad, restoreLaunchpadActions, stopSearchTyping, startSearchTyping, hideLaunchpad, getLaunchpadUserName, showLaunchpad, setupAppSwitcher} = home

const topbar = createTopbar({
  toast,
  t,
  getSideCollapsed: () => sidebar.getSideCollapsed(),
  getLaunchpadEnabled,
  closeAllMenus: (...args) => menus.closeAllMenus(...args),
  openKbd: (...args) => keyboard.openKbd(...args),
  openCustomize: (...args) => customize.openCustomize(...args),
  trapFocus,
  releaseFocus,
  renderSide: (...args) => sidebar.renderSide(...args),
  /* The user menu's Favorites row keys off "the page you are on": routed
     For You/list screens own an explicit label, profile/organization/email
     (and the launchpad overlay, which is a start screen, not a page) own
     none, and *-record views inherit the sidebar's own nav-row label. */
  getCurrentNavLabel: () => {
    if (document.querySelector('.lp-view:not([hidden])')) return null
    const view = contentHost.getCurrentContentViewName()
    if (view === 'foryou') return 'For You'
    if (NAV_ITEM_LABEL_BY_ID[view]) return NAV_ITEM_LABEL_BY_ID[view]
    if (view === 'email' || view === 'profile' || view === 'organization') return null
    return sidebar.getNavCurrentLabel()
  },
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
  navigateToOrganizationSection: section => {
    navigation.navigate('organization', {section})
    const frame = document.querySelector('.frame')
    const lp = frame && frame.querySelector('.lp-view')
    if (lp && !lp.hidden) hideLaunchpad(frame)
  },
  onTakeTour: () => startTourForSurface(undefined, document.activeElement),
})

// Keep the topbar labels this module owns (role chip, sidebar tips,
// favorites) in step with applyLocale(); setLocale() fires subscribers
// after the dictionary switches, so retranslate() reads the new language.
locale.subscribe(() => topbar.retranslate())

const shell = createShell({
  setupAppSwitcher: (...args) => setupAppSwitcher(...args),
  renderSide: (...args) => sidebar.renderSide(...args),
  bootRenderFlags,
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

const {actionDialog, requestLeave: requestInvoiceLeave, rscrim, openRDlg, closeRDlg, showInlineError, clearInlineError, doSave, runAction, applyState, gscrim, atRisk, askGuard, runGuarded, modeSel, applyMode} = createInvoiceOperations({t, trapFocus, state, releaseFocus, closeAllMenus: (...args) => menus.closeAllMenus(...args), closeSearch: (...args) => search.closeSearch(...args), getLocale, encodeHtml, blocked, toast, runWork, doPrint, openSearch: (...args) => search.openSearch(...args), STATUSES, CHAIN, reached: (...args) => status.reached(...args), editable, LOCK_COPY, pop: status.pop, renderPop: (...args) => status.renderPop(...args), drawer, renderCards, renderSearch: (...args) => search.renderSearch(...args), openScreenParameters: () => screenParametersDialog.open('Sales Invoice'), journalEntryTable: {activate: (...args) => journalEntryTable.activate(...args), deactivate: (...args) => journalEntryTable.deactivate(...args)}})

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

const geography = createGeography({root: document.querySelector('.geo-record-view'), getList: () => listRuntime.dataListInstances.geo, t, dataListIcon: (...args) => listRuntime.dataListIcon(...args), trapFocus, releaseFocus, toast, showContentView: (...args) => showContentView(...args), renderGeoList: (...args) => pageListBindings.renderGeoList(...args), openNewDataListRecord: (...args) => pageListActions.openNewDataListRecord(...args), openPrintSettings, openAdvancedSearch: (...args) => advancedSearch.openAdvancedSearch(...args), openGeoStatusDialog: (row, options) => statusDialogs.openGeoStatusDialog(row, options), openScreenParameters: () => screenParametersDialog.open('Geographical Structure')})

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
      : context === 'geo'
        ? statusDialogs.openGeoStatusDialog(row, {command: targetStatusOrCommand})
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
  getDataListState: () => listRuntime.dataListState,
  toast
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
    openScreenParameters: () => screenParametersDialog.open('Customer'),
    closeAllMenus: (...args) => menus.closeAllMenus(...args),
  },
}

const customers = createCustomers(customerDependencies)

const profile = createProfile({
  root: document.querySelector('.profile-view'),
  encodeHtml,
  currentUser: CURRENT_USER,
  employeeDetails: EMPLOYEE_DETAILS,
  contactDetails: CONTACT_DETAILS,
  loginLogRows: LOGIN_LOG_ROWS,
  activityRows: RECENT_ACTIVITY_ROWS,
  storage: sessionStorage,
  toast,
  trapFocus: dialogFocus.trapFocus,
  releaseFocus: dialogFocus.releaseFocus,
  syncAppearanceControls: () => appearanceControls.syncAppearanceControls(),
  bindAppearanceSection: () => appearanceControls.bindAppearanceSection(),
  applyDataI18n: () => localeControls.applyDataI18n(),
  languageControls: {
    getSelected: () => localeControls.getSelectedLanguage(),
    select: code => localeControls.selectLanguage(code),
  },
  onSectionChange: section => syncUrl('profile', {section}),
})

const organization = createOrganization({
  root: document.querySelector('.organization-view'),
  role: activeRole,
  fixtures: {
    details: ORGANIZATION_DETAILS,
    users: ORGANIZATION_USERS,
    applicationSessions: APPLICATION_SESSIONS,
    databaseSessions: DATABASE_SESSIONS,
    auditRows: ORGANIZATION_AUDIT_ROWS,
    staff: STAFF_OPERATION_ROWS,
    health: SYSTEM_HEALTH,
    services: SYSTEM_SERVICES,
  },
  storage: sessionStorage,
  toast,
  encodeHtml,
  dataListIcon: (...args) => listRuntime.dataListIcon(...args),
  dataListInstances: {
    orgUsers: listRuntime.dataListInstances.orgUsers,
    orgAppSessions: listRuntime.dataListInstances.orgAppSessions,
    orgDbSessions: listRuntime.dataListInstances.orgDbSessions,
    orgAudit: listRuntime.dataListInstances.orgAudit,
    orgStaff: listRuntime.dataListInstances.orgStaff,
  },
  trapFocus,
  releaseFocus,
  createSessionActions: createOrganizationSessionActions,
  onAccessDenied: () => navigation.navigate('profile'),
})

const forYou = createForYou({t})

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

const screenParametersDialog = createScreenParametersDialog({
  trapFocus,
  releaseFocus,
  dataListInstance: listRuntime.dataListInstances.screenParameters
})

const journalEntryTable = createJournalEntryTable({
  encodeHtml,
  dataListInstance: listRuntime.dataListInstances.journal
})

// Prototype control for the journal dialog's unbalanced state. Attached
// here, before createPrototypeControls() runs its restore below, so the
// replayed `change` event from a saved "on" state lands on this listener.
const journalUnbalancedControl = document.getElementById('journal-unbalanced')
journalUnbalancedControl?.addEventListener('change', () => {
  journalEntryTable.setUnbalanced(journalUnbalancedControl.checked)
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
    recordRoots: [...document.querySelector('.page-content').children].filter(element => !element.matches('.email-view,.list-view,.customer-list-view,.customer-record-view,.geo-list-view,.geo-record-view,.profile-view,.organization-view,.foryou-view')),
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
  ['organization', organization],
  ['foryou', forYou],
])

const navigation = createNavigation({
  resolvePage: id => pageRegistry.get(id),
  requestLeave: (fromId) => listGuard.requestPageLeave(fromId),
  showPage(page) {
    if (page.id === 'launchpad') return
    contentHost.attachAndShowView(page.id)
  },
  onChange: (id, data) => {
    contentHost.onNavigationChange(id)
    syncUrl(id, data)
    /* The boot navigation itself must never create a history entry: flip
       `booted` only after its URL sync has run (and been skipped). */
    if (!booted && id === pendingBootId) {
      booted = true
      history.replaceState({routeIdx}, '')
    }
  },
})

showContentView = (name, data) => {
  navigation.navigate(name, data)
}

contentHost.setContentViewDeferralReady(true)

if (bootRoute === null || (bootRoute.defaultEntry && getLaunchpadEnabled())) {
  // Legacy entry document, and the launchpad flavor of the default entry:
  // exactly today's boot navigation (record under the Launchpad overlay,
  // or the auto-nav microtask to the invoice list when the overlay is off).
  navigation.navigate(contentHost.getCurrentContentViewName())
} else if (bootPlan.id === 'foryou' && bootPlan.data?.app) {
  // App landing: select the app in the rail/panel (so highlight, current-app
  // state, and the panel's For You row agree), then show its For You screen.
  const side = document.querySelector('.side')
  const appRoute = {id: 'foryou', data: {app: bootPlan.data.app}}
  side.querySelector('.nc2')?.activateByLabel(bootPlan.data.app, {targetRoute: appRoute})
  sidebar.applyNavCurrent(side, bootPlan.data.app, {forYou: true})
  navigation.navigate('foryou', bootPlan.data)
} else if (NAV_ITEM_LABEL_BY_ID[bootPlan.id]) {
  // Routed screens that live on the sidebar rail boot through setNavCurrent
  // so the highlight and the view come up together.
  sidebar.setNavCurrent(document.querySelector('.side'), NAV_ITEM_LABEL_BY_ID[bootPlan.id])
} else {
  // profile / organization / email — no rail item, navigate directly.
  navigation.navigate(bootPlan.id, bootPlan.data)
}

/* Back/Forward: re-resolve the URL to a plan and apply it with the same
   guards as any other navigation. Unknown paths restore the boot plan;
   '/' re-resolves the default entry (Launchpad toggles stay honest); a
   guard refusal undoes the history move instead of stranding the URL. */
const applyRoutePlan = async plan => {
  if (plan.kind === 'launchpad') {
    const fbody = document.querySelector('.fbody')
    if (!fbody) return true
    const frame = fbody.closest('.frame')
    if (frame?.querySelector('.lp-view:not([hidden])')) return true
    return showLaunchpad(fbody, {mode: 'home'}) !== false
  }
  const overlayFrame = document.querySelector('.lp-view:not([hidden])')?.closest('.frame')
  if (overlayFrame) hideLaunchpad(overlayFrame)
  const label = NAV_ITEM_LABEL_BY_ID[plan.id]
  if (label) sidebar.applyNavCurrent(document.querySelector('.side'), label)
  const sameView =
    navigation.current() === plan.id &&
    (lastNavData?.section ?? undefined) === (plan.data?.section ?? undefined) &&
    (plan.id !== 'foryou' || (lastNavData?.app ?? undefined) === (plan.data?.app ?? undefined))
  if (sameView) return true
  if (plan.id === 'foryou' && plan.data?.app) {
    /* Re-select the app so the rail icon, panel, and current-app state
       follow the URL, not just the content view. */
    const side = document.querySelector('.side')
    const appRoute = {id: 'foryou', data: {app: plan.data.app}}
    side.querySelector('.nc2')?.activateByLabel(plan.data.app, {targetRoute: appRoute})
    sidebar.applyNavCurrent(side, plan.data.app, {forYou: true})
  }
  const allowed = await navigation.navigate(plan.id, plan.data)
  if (!allowed) {
    const currentLabel = NAV_ITEM_LABEL_BY_ID[navigation.current()]
    if (currentLabel) sidebar.applyNavCurrent(document.querySelector('.side'), currentLabel)
  }
  return allowed
}

window.addEventListener('popstate', event => {
  if (!routingEnabled) return
  const idx = event.state?.routeIdx ?? 0
  const delta = idx - routeIdx
  if (suppressNextPop) {
    suppressNextPop = false
    routeIdx = idx
    return
  }
  handlingPop = true
  const route = parseRouteUrl(location.pathname, location.search)
  const plan = route === null
    ? bootPlan
    : route.defaultEntry
      ? resolveDefaultEntry({launchpadEnabled: getLaunchpadEnabled()})
      : route
  applyRoutePlan(plan).then(allowed => {
    handlingPop = false
    routeIdx = idx
    if (!allowed && delta !== 0) {
      suppressNextPop = true
      history.go(-delta)
    }
  })
})

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
const controls = createPrototypeControls({
  root: document,
  settings: appearanceControls.appearance,
  pages: {invoices, customers},
  onRoleChange: role => {
    activeRole = role
    organization.setRole(role)
    topbar.setRole?.(role)
  },
})
syncPrototypeControlsPage = controls.syncPage

// Wire the avatar menu's Language submenu and restore the persisted
// functional locale (EN/AR) — deliberately the LAST wiring step: it must
// run after createPrototypeControls()'s restoreState(), which replays the
// #rtl harness checkbox from sessionStorage and would otherwise clobber a
// stored العربية/English choice with the last raw harness value. Still
// inside module evaluation, so the restore re-renders before the first
// paint and never flashes the wrong language. Demo-only catalog codes are
// never persisted.
localeControls.initLanguage()

/* Prototype Controls → Tour kill switch + explicit demo triggers.
   The #tour-enabled checkbox (persisted by createPrototypeControls via
   skey-proto-state like every other harness control) is prototype
   configuration, not a product setting: OFF disables ALL spotlight
   behavior — no auto-start, Help → Take a tour hidden, ?tour=1 ignored,
   triggered spotlights suppressed — and immediately dismisses a running
   tour (see spotlight.setEnabled). The #tour-start button is the third
   explicit trigger alongside Help and ?tour=1. */
const tourToggle = document.getElementById('tour-enabled')
const tourStartButton = document.getElementById('tour-start')
const applyTourEnabled = () => {
  const on = tourToggle ? tourToggle.checked !== false : true
  spotlight.setEnabled(on)
  topbar.syncTourMenu(on)
  if (tourStartButton) tourStartButton.disabled = !on
}
tourToggle?.addEventListener('change', applyTourEnabled)
tourStartButton?.addEventListener('click', () => {
  if (!startTourForSurface(undefined, tourStartButton)) explainNoTour()
})
applyTourEnabled()

/* ?tour=1 demo entry (?tour=<surface> forces one) — gated by the same
   kill switch, and never an auto-start: without the query param nothing
   tours on its own. Deferred past boot navigation so the record-view
   targets exist and are visible; retries briefly (then gives up) so the
   trigger also survives a boot that lands under the launchpad overlay
   until it is dismissed. */
const tourQuery = new URLSearchParams(location.search).get('tour')
if (tourQuery) {
  const forcedSurface = tourQuery === '1' ? undefined : tourQuery
  const attemptDemoStart = () => spotlight.isEnabled() && startTourForSurface(forcedSurface)
  requestAnimationFrame(() => setTimeout(() => {
    if (attemptDemoStart()) return
    let tries = 0
    const retry = setInterval(() => {
      if (attemptDemoStart() || ++tries >= 10) clearInterval(retry)
    }, 500)
  }, 60))
}
