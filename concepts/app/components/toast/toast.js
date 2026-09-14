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
    const toneClass = tone === 'bad' ? ' bg-[var(--danger-bold)] text-inverse' : ''
    const iconToneClass = tone === 'ok' ? ' text-[var(--tooltip-success)]' : ''
    t.className = 'toast flex min-w-[320px] max-w-[520px] items-start gap-2.5 rounded-[10px] bg-[var(--tooltip-bg)] px-3.5 py-[11px] pointer-events-auto text-[13px] text-[var(--tooltip-ink)] shadow-shell [animation:toastin_0.18s_cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:animate-none ' + tone + toneClass
    t.innerHTML = `<span class="ic mt-px${iconToneClass}"><svg width="16" height="16"><use href="#${tone === 'ok' ? 'i-check' : 'i-warn'}"/></svg></span>
    <span class="bd flex-1"><b class="mb-0.5 block font-semibold">${title}</b>${body ? body : ''}${action ? `<button class="act mt-[5px] inline-block bg-none text-[12.5px] text-[var(--tooltip-action)] underline">${action}</button>` : ''}</span>
    <button class="ibtn x text-[var(--tooltip-close)] opacity-80" aria-label="Dismiss"><svg width="13" height="13"><use href="#i-x"/></svg></button>`
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
