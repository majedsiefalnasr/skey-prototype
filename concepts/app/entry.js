// Temporary module entry point (Task 4). Composes the shared facilities
// extracted in this task and starts the transitional legacy application
// module with them. This is NOT the final composition root — the plan
// reserves concepts/app/main.js for Task 10, once navigation and the shell
// itself are also extracted into real components. Until then, this file's
// only job is: build the finite `shared` object the plan's contracts
// define, call startLegacyApp(shared) after the app-shell markup has been
// assembled into the document, then let the existing prototype controls
// script run afterward (it is a separate classic <script>, ordered after
// this one in concepts/app-shell.html, and only touches the already-mounted
// .demo-bar markup — it has no dependency on startLegacyApp's return value).
import {createLocale} from './core/locale.js'
import {createAppearance} from './core/appearance.js'
import {createWork} from './core/work.js'
import {createDialogFocus} from './components/dialog/dialog.js'
import {createToast} from './components/toast/toast.js'
import {createLoading} from './components/loading/loading.js'
import {startLegacyApp} from './legacy-app.js'

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
startLegacyApp({
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
