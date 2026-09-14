// Shared simulated-work facility — extracted verbatim from the single-file
// legacy application script (concepts/app/legacy-app.js, the "one place
// where slow work is run, so every button behaves the same" block
// immediately after the toast block). The algorithm is unchanged; only the
// original's direct `document.getElementById('failsim')` reads moved to
// the createWork({shouldFail}) constructor parameter, per the plan's
// stated contract.
//
// The original's failNext() both READ the #failsim checkbox and, on a
// failure, RESET it back to unchecked (so the next click succeeds) —
// `shouldFail()` preserves both: it is called once per runWork() call and
// is expected to perform that same read-then-reset-on-failure behavior
// (see the caller in legacy-app.js's startLegacyApp for the exact
// #failsim wiring), keeping runWork's own body identical to the original.
//
// createWork({shouldFail}) returns the existing runWork(btn,label,ms)
// function.

/**
 * @param {{shouldFail: () => boolean}} deps
 */
export function createWork({shouldFail}) {
  const runWork = (btn, label, ms = 900) =>
    new Promise(resolve => {
      const original = btn ? btn.innerHTML : null
      if (btn) {
        btn.setAttribute('aria-busy', 'true')
        btn.innerHTML = `<svg class="spin" width="15" height="15" aria-hidden="true"><use href="#i-loader"/></svg> ${label}`
      }
      setTimeout(() => {
        if (btn) {
          btn.removeAttribute('aria-busy')
          btn.innerHTML = original
        }
        const failed = shouldFail()
        resolve(!failed)
      }, ms)
    })
  return runWork
}
