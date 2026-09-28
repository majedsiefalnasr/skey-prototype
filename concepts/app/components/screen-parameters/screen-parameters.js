/** Owns the shared "Screen Parameters" reference dialog every record page's
    More-actions menu opens (Sales Invoice, Customer, Geographical
    Structure) — one dialog, one data-list instance (DATA_LIST_CONFIG.
    screenParameters), only the title text changes per caller. The table
    itself is the real data-list component (Filter/Search/Columns/sort/
    pagination), activated against this dialog's own canvas/footer exactly
    like a list page activates its .canvas/.fnav. */
export function createScreenParametersDialog({trapFocus, releaseFocus, dataListInstance}) {
  const scrim = document.getElementById('screen-parameters-scrim')
  const canvas = document.getElementById('screen-parameters-canvas')
  const footer = document.getElementById('screen-parameters-fnav')
  const titleEl = document.getElementById('screen-parameters-title')

  function open(title) {
    titleEl.textContent = title ? `Screen Parameters ( ${title} )` : 'Screen Parameters'
    dataListInstance.activate({root: canvas, footer})
    scrim.classList.add('open')
    trapFocus(scrim.querySelector('.dlg'))
  }

  function close() {
    scrim.classList.remove('open')
    dataListInstance.deactivate()
    releaseFocus()
  }

  scrim.addEventListener('click', event => {
    if (event.target === scrim || event.target.closest('.screen-parameters-close')) close()
  })

  return {open, close}
}
