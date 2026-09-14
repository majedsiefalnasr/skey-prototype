

/** Owns keyboard state and its DOM bindings. */
export function createKeyboard({trapFocus, releaseFocus, hideLaunchpad, closeAllMenus, closePop, closeDrawer, getPscrim, openSearch, closeSearch, closeRDlg, getGscrim, closeCustomize, closeAI} = {}) {
  const kscrim = document.getElementById('kscrim')
  
  const openKbd = () => {
    kscrim.classList.add('open')
    trapFocus(kscrim.querySelector('.kbdsheet'))
  }
  
  const closeKbd = () => {
    if (kscrim.classList.contains('open')) {
      kscrim.classList.remove('open')
      releaseFocus()
    }
  }
  
  kscrim.addEventListener('click', e => {
    if (e.target === kscrim || e.target.closest('.k-close')) closeKbd()
  })
  
  document.addEventListener('click', e => {
    if (e.target.closest('[data-act="Help"]')) {
      closeAllMenus()
      openKbd()
    }
  })
  
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const switcher = document.querySelector('.lp-view[data-mode="switcher"]:not([hidden])')
      if (switcher) {
        e.preventDefault()
        hideLaunchpad(switcher.closest('.frame'), {restoreFocus: true})
        return
      }
      closeAllMenus()
      closePop()
      closeDrawer()
      closeSearch()
      closeRDlg()
      closeKbd()
      closeCustomize()
      closeAI()
      if (getPscrim().classList.contains('open')) {
        getPscrim().classList.remove('open')
        releaseFocus()
      }
      if (getGscrim().classList.contains('open')) document.getElementById('g-stay').click()
    }
    if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      openSearch()
    }
  })

  return {openKbd}
}
