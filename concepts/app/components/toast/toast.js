// Flag-style toast facility — the app's "toast" is an Atlassian Design
// Flag, and the `#toasts` container plays the FlagGroup: a fixed anchor
// at the inline-start (bottom-left, 400px wide) that only the newest
// flag occupies. Each older flag is parked one own-height + 16px below
// the one before it, so the next flag in line still shows a band of
// itself above the viewport's bottom edge — a new flag slides in from
// the left on top while the previous ones slide down to make room, and
// dismissing the top flag slides the next one back up — atlaskit's
// FlagGroup enter / reposition / stack order.
//
//   createToast(host) returns toast({tone, title, body, action,
//   onAction, ms}).
//
// Tone → Flag appearance (atlassian.design/components/flag):
//   ok    success  surface flag, green check, auto-dismiss (8s)
//   info  info     surface flag, information icon, auto-dismiss (8s)
//   warn  warning  solid flag, never auto-dismiss (docs: "Never set
//                  warning flags to auto dismiss")
//   bad   error    solid flag, never auto-dismiss (docs: "Never set
//                  error flags to auto dismiss") — role="alert"
//
// All four tones pass an explicit `ms` to opt back into a timer; the
// default only applies to the two auto-dismiss tones.

/** Auto-dismiss window Atlaskit's AutoDismissFlag uses. */
const AUTO_DISMISS_MS = 8000

/** Slide-out window (200ms) before a dismissed flag leaves the stack. */
const EXIT_MS = 220

/** `SlideOut15PercentLeft` + fade, atlaskit's exiting motion. */
const EXIT_CLASS = 'animate-[toastout_200ms_cubic-bezier(0.6,0,0.8,0.6)_both]'

const TONES = {
  ok: {
    cls: 'ok',
    icon: 'i-check',
    iconCls: 'text-[var(--success)]',
    box: 'bg-surface border border-line text-ink',
    descCls: 'text-muted',
    linkCls: 'text-[var(--info)]',
    closeCls: 'text-muted hover:bg-[var(--line-2)]',
    auto: true,
  },
  info: {
    cls: 'info',
    icon: 'i-info',
    iconCls: 'text-[var(--info)]',
    box: 'bg-surface border border-line text-ink',
    descCls: 'text-muted',
    linkCls: 'text-[var(--info)]',
    closeCls: 'text-muted hover:bg-[var(--line-2)]',
    auto: true,
  },
  warn: {
    cls: 'warn',
    icon: 'i-warn',
    iconCls: '',
    box: 'bg-[var(--warn-bg)] border border-[var(--warn-line)] text-[var(--warn-ink)]',
    descCls: 'opacity-85',
    linkCls: 'text-current',
    closeCls: 'text-current hover:bg-black/10',
    auto: false,
  },
  bad: {
    cls: 'bad',
    icon: 'i-error',
    iconCls: 'text-inverse',
    box: 'bg-[var(--danger-bold)] border border-transparent text-inverse',
    descCls: 'opacity-90',
    linkCls: 'text-inverse',
    closeCls: 'text-inverse hover:bg-white/15',
    auto: false,
  },
}

/**
 * @param {HTMLElement} host
 */
export function createToast(host) {
  // Slot 0 is the flag you read (its bottom edge sits on the anchor);
  // every older flag is translated one own-height + `--flag-gap` (16px,
  // atlaskit's inter-flag gap) further down, so the next one up shows a
  // band of itself above the viewport's bottom edge and anything past
  // that is parked below it.
  const restack = () => {
    const stack = [...host.children].filter(el => !el.hasAttribute('data-exit'))
    const gap = parseFloat(getComputedStyle(host).getPropertyValue('--flag-gap')) || 16
    const anchor = host.getBoundingClientRect().bottom
    const vh = window.innerHeight
    for (let i = stack.length - 1, slot = 0; i >= 0; i--, slot++) {
      const el = stack[i]
      const h = el.offsetHeight
      el.style.transform = `translateY(calc(${slot} * (100% + var(--flag-gap))))`
      el.style.visibility = anchor - h + slot * (h + gap) < vh ? '' : 'hidden'
    }
  }

  const toast = ({tone = 'ok', title, body, action, onAction, ms}) => {
    const kind = TONES[tone] || TONES.ok
    const t = document.createElement('div')
    t.className = `toast ${kind.cls} pointer-events-auto absolute bottom-0 start-0 flex w-full items-start gap-2.5 rounded-lg px-3.5 py-3 shadow-shell transition-[transform,visibility] duration-[250ms] ease-[cubic-bezier(0.4,0,0,1)] motion-reduce:transition-none [animation:toastin_250ms_cubic-bezier(0,0.4,0,1)_both] motion-reduce:animate-none ${kind.box}`
    if (tone === 'bad') t.setAttribute('role', 'alert')
    t.innerHTML = `<span class="ic mt-px shrink-0 ${kind.iconCls}"><svg width="16" height="16" aria-hidden="true"><use href="#${kind.icon}"/></svg></span>
    <span class="bd min-w-0 flex-1"><b class="mb-0.5 block text-[13.5px] font-semibold leading-5">${title}</b>${body ? `<p class="m-0 mt-0.5 text-[13px] leading-[18px] ${kind.descCls}">${body}</p>` : ''}${action ? `<button class="act mt-1.5 inline-block bg-none border-0 p-0 text-[12.5px] font-medium underline ${kind.linkCls}">${action}</button>` : ''}</span>
    <button class="x mt-[-2px] -me-1 flex size-7 shrink-0 items-center justify-center rounded-md border-0 bg-transparent p-0 ${kind.closeCls}" aria-label="Dismiss"><svg width="14" height="14" aria-hidden="true"><use href="#i-x"/></svg></button>`

    // Dismissing keeps the flag mounted through its slide-out, and leaves
    // it out of restack() so the flags underneath move up around it.
    const close = () => {
      if (t.hasAttribute('data-exit')) return
      t.style.pointerEvents = 'none'
      t.setAttribute('data-exit', '')
      t.classList.add(EXIT_CLASS)
      restack()
      setTimeout(() => t.remove(), EXIT_MS)
    }

    t.querySelector('.x').onclick = close
    if (action)
      t.querySelector('.act').onclick = () => {
        close()
        onAction && onAction()
      }
    host.append(t)
    restack()
    if (kind.auto) setTimeout(close, ms ?? AUTO_DISMISS_MS)
    else if (ms != null) setTimeout(close, ms)
  }
  return toast
}
