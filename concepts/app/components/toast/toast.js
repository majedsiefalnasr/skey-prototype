// Shared toast facility — extracted verbatim from the single-file legacy
// application script (concepts/app/legacy-app.js, the "toasts: say what
// happened, and offer the next step" block). The algorithm/markup is
// unchanged; only the toast list container moved from a module-scoped
// `document.getElementById('toasts')` read to the createToast(host)
// parameter.
//
// createToast(host) returns the existing toast({tone,title,body,action,
// onAction,ms}) function.

/**
 * @param {HTMLElement} host
 */
export function createToast(host) {
  const toast = ({tone = 'ok', title, body, action, onAction, ms = 5200}) => {
    const t = document.createElement('div')
    t.className = 'toast ' + tone
    t.innerHTML = `<span class="ic"><svg width="16" height="16"><use href="#${tone === 'ok' ? 'i-check' : 'i-warn'}"/></svg></span>
    <span class="bd"><b>${title}</b>${body ? body : ''}${action ? `<button class="act">${action}</button>` : ''}</span>
    <button class="ibtn x" aria-label="Dismiss"><svg width="13" height="13"><use href="#i-x"/></svg></button>`
    t.querySelector('.x').onclick = () => t.remove()
    if (action)
      t.querySelector('.act').onclick = () => {
        t.remove()
        onAction && onAction()
      }
    host.append(t)
    setTimeout(() => t.remove(), ms)
  }
  return toast
}
