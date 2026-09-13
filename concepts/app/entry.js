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

// onChange must call refreshOpenDataListCharts(), which is private to
// startLegacyApp's closure (never bridged to window, before or after this
// extraction) — the same resolveContainer indirection pattern as `loading`
// below: a mutable box owned here, filled in by startLegacyApp as one of
// its first steps, read lazily on every appearance.apply() call.
const resolveChartRefresh = {current: () => {}}
const appearance = createAppearance({
  root: document.documentElement,
  readControls: () => ({
    mode: document.getElementById('theme')?.value,
    highContrast: document.getElementById('high-contrast')?.checked,
  }),
  onChange: () => resolveChartRefresh.current(),
})
appearance.resolveChartRefresh = resolveChartRefresh

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

// getContainer must resolve the current page/view's skeleton host, which
// depends on `currentContentViewName` — a legacy-app-private binding that
// does not exist until startLegacyApp(shared) has run below, while
// `loading` itself must exist before that call (it is one of `shared`'s
// finite keys). This indirects through a mutable box owned right here in
// the entry point (not added to `shared`, which stays exactly the six
// facilities the plan names) — startLegacyApp reads `shared.loading` and,
// as one of its first steps, fills `resolveContainer.current` with its
// real getContainer implementation, before any navigation/rendering that
// could call loading.queue().
const resolveContainer = {current: () => null}
const loading = createLoading({
  getContainer: () => resolveContainer.current(),
  isSimulationEnabled: () => document.getElementById('simulate-loading')?.checked ?? false,
})
loading.resolveContainer = resolveContainer

// window.toast is still required: the List view's ported render functions
// build rows via innerHTML with inline onclick attributes (kept verbatim
// from the standalone prototype this was ported from) that call toast() in
// global scope, exactly as before this extraction.
window.toast = toast

startLegacyApp({locale, appearance, toast, work, loading, dialogFocus})
