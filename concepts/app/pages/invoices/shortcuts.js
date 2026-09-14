

/** Owns invoice shortcuts state and its DOM bindings. */
export function createInvoiceShortcuts({toast, getState, blocked, renderActivity, openPrintSettings, doSave, atRisk, askGuard, getModeSel, applyMode, openKbd} = {}) {
  const firstEnabled = sel =>
    [...document.querySelectorAll('.design.active ' + sel)].find(b => !b.disabled)

  document.addEventListener('keydown', e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)
    const mod = e.metaKey || e.ctrlKey
    const k = e.key.toLowerCase()
    if (mod && k === 's') {
      e.preventDefault()
      const b = firstEnabled('[data-act="Save"]')
      b
        ? doSave(b)
        : toast({tone: 'bad', title: 'Nothing to save', body: blocked('Save') || ''})
      return
    }
    if (mod && k === 'p') {
      e.preventDefault()
      const why = blocked('Print')
      if (why) {
        toast({tone: 'bad', title: 'Print is not available', body: why})
        return
      }
      openPrintSettings()
      return
    }
    if (mod && k === 'n') {
      e.preventDefault()
      if (atRisk()) askGuard(null, 'start another invoice')
      else {
        getModeSel().value = 'create'
        applyMode('create')
        toast({tone: 'ok', title: 'New invoice started'})
      }
      return
    }
    if (e.key === 'F1') {
      e.preventDefault()
      openKbd()
      return
    }
    if (typing && !mod) return
  })

  document.getElementById('emptyflow').addEventListener('change', e => {
    getState().emptyFlow = e.target.checked
    renderActivity()
  })

  return {}
}
