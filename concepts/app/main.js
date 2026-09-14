// Composition root (Task 10, replacing the temporary concepts/app/entry.js
// from Task 4). Builds the finite `shared` object the plan's contracts
// define, then calls startLegacyApp(shared) after the app-shell markup has
// been assembled into the document. startLegacyApp constructs every page
// factory (home/customers/geography/invoices/email) and, once all of them
// exist, the real Navigation instance from core/navigation.js that routes
// every subsequent page transition — see legacy-app.js's own composition
// comments for why navigation construction must wait until the very end of
// that function.
//
// Task 11: startLegacyApp now returns {navigation, appearance, customers,
// invoices, setSyncPrototypeControlsPage} instead of running fire-and-
// forget (this file only destructures the handles it actually needs — see
// the plan's "not an arbitrary getter" constraint), so it can read saved
// prototype-controls state, apply the customer-record mode/layout through
// its own already-initialized setter (the null-root/restoration fix — see
// below), and construct the real createPrototypeControls component
// (prototype/controls.js) in place of the former classic
// <script src="app/prototype/legacy-controls.js">.
//
// The shell/{sidebar,topbar,menus,search,customize} interaction code itself
// still lives inside legacy-app.js's closure rather than in separate
// concepts/app/shell/*.js modules — see the deviation note in this task's
// report: that code shares dozens of mutable closure bindings (state,
// blocked, csDraft, ACTIONS, dataListInstances, etc.) with the invoice/list
// machinery, and splitting it file-by-file without rethreading all of that
// by hand would be exactly the "rewrite thousands of lines from a summary"
// the plan's own preamble forbids. This file still composes one real shell
// and one real navigation contract; only the physical file boundary for the
// shell's own interaction code is deferred.
import {createLocale} from './core/locale.js'
import {createAppearance} from './core/appearance.js'
import {createWork} from './core/work.js'
import {createDialogFocus} from './components/dialog/dialog.js'
import {createToast} from './components/toast/toast.js'
import {createLoading} from './components/loading/loading.js'
import {startLegacyApp} from './legacy-app.js'
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

// window.toast is still required: the List view's ported render functions
// build rows via innerHTML with inline onclick attributes (kept verbatim
// from the standalone prototype this was ported from) that call toast() in
// global scope, exactly as before this extraction.
window.toast = toast

// `loading`'s getContainer and `appearance`'s onChange both need real
// implementations (currentSkeletonContainer, refreshOpenDataListCharts)
// that only exist inside startLegacyApp's closure (they read
// currentContentViewName / dataListChartRefreshReady, both legacy-app-
// private bindings) — but createLoading/createAppearance are ordinary
// factories that take these callbacks as constructor params, and this is
// the entry point that must build `shared`. Rather than constructing
// `loading`/`appearance` here and bolting extra properties onto them for
// startLegacyApp to fill in later, `shared.loading`/`shared.appearance`
// carry the factory functions themselves plus their non-callback
// constructor params; startLegacyApp constructs the real instances at the
// exact point in its body where the callback implementations first exist,
// passing them through createLoading/createAppearance's own declared
// parameters.
const {appearance, customers, invoices, setSyncPrototypeControlsPage} = startLegacyApp({
  locale,
  toast,
  work,
  dialogFocus,
  loading: {
    create: createLoading,
    isSimulationEnabled: () => document.getElementById('simulate-loading')?.checked ?? false,
  },
  appearance: {
    create: createAppearance,
    root: document.documentElement,
    readControls: () => ({
      mode: document.getElementById('theme')?.value,
      highContrast: document.getElementById('high-contrast')?.checked,
    }),
  },
})

// Task 11: restore prototype settings through initialized page interfaces
// (known-defects.md issue 6, the one behavior correction this refactor is
// allowed to make). `saved` is read once, up front — a pure sessionStorage
// read, no DOM involved — so customer-mode/customer-layout restoration can
// go through customers.setMode/setLayout (safe at any time: they update
// record.js's model state unconditionally and only touch the DOM once the
// record page is actually active, see pages/customers/record.js) instead
// of the old classic script's "set the DOM value and dispatch change"
// replay, which silently did nothing for these two controls because
// nothing listened for their `change` event before this task (see
// pages/customers/record.js's new construction-time listeners and
// prototype/controls.js's own comments for the full defect history).
//
// Every OTHER saved control (theme, density, rtl, invoice mode/status/
// payment/dirty, filter/statistics concept, etc.) already has a permanent
// `change` listener wired at page/boot-construction time inside
// startLegacyApp (core/appearance.js's readControls, pages/invoices/
// operations.js, and legacy-app.js's own boot-time listeners) — those
// listeners exist for the app's entire lifetime regardless of which page
// is active, so createPrototypeControls below still safely restores them
// through the original "set value + dispatch change" mechanism; only the
// two page-mode controls needed to move to the setter-based path.
const saved = readPrototypeState(sessionStorage)
if (saved['customer-mode']) customers.setMode(saved['customer-mode'])
if (saved['customer-layout']) customers.setLayout(saved['customer-layout'])

const controls = createPrototypeControls({
  root: document,
  settings: appearance,
  pages: {invoices, customers},
})
// syncPrototypeControlsPage inside legacy-app.js is a forward-referenced
// no-op until this call supplies the real implementation (see that
// binding's own declaration comment) — every post-boot navigation already
// routes through Navigation's onChange -> onNavigationChange ->
// syncPrototypeControlsPage(name), and pages/home.js's showLaunchpad/
// hideLaunchpad call it directly around the launchpad overlay. The
// original classic script never explicitly re-synced the panel for
// whichever surface booted either (the panel didn't exist yet the first
// time showLaunchpad ran during the shell mount loop, and no code called
// this again before the app's first post-boot navigation) — preserved
// as-is here rather than adding a boot-time sync call that didn't exist
// before, per the plan's "preserve existing behavior exactly" constraint
// outside the one allowed customer-restoration fix.
setSyncPrototypeControlsPage(controls.syncPage)
