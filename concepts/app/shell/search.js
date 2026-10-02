import {SCREENS, RECORDS, ACTIONS} from '../prototype/fixtures/navigation.js'

/** Owns search state and its DOM bindings. */
export function createSearch({actionDialog,toast, getState, blocked, stopSearchTyping, startSearchTyping, openDrawer, openPrintSettings, openRDlg, runAction} = {}) {
  let sScope = 'all',
    sSel = 0,
    sRows = [],
    sScreensLocked = false

  const esc = s => s.replace(/[&<>]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'})[c])

  const hi = (t, q) => {
    if (!q) return esc(t)
    const i = t.toLowerCase().indexOf(q)
    return i < 0
      ? esc(t)
      : esc(t.slice(0, i)) +
          '<mark class="rounded-[2px] bg-[var(--mark-bg)] px-px text-inherit">' +
          esc(t.slice(i, i + q.length)) +
          '</mark>' +
          esc(t.slice(i + q.length))
  }

  const activePanel = () => document.querySelector('.design.active .spanel')

  const activeInput = () => activePanel().querySelector('input')

  const activeList = () => activePanel().querySelector('.slist')

  const renderSearch = () => {
    document.querySelectorAll('.sctx').forEach(c => {
      const b = c.querySelector('b')
      if (!b) return
      b.nextSibling &&
        (b.nextSibling.textContent =
          getState().mode === 'create' ? ' · new invoice, not saved yet' : ' · 001000352026126')
    })
    const q = activeInput().value.trim().toLowerCase()
    const m = x =>
      !q || x.t.toLowerCase().includes(q) || (x.s || '').toLowerCase().includes(q)
    /* the command row doesn't grey these out, it removes them — the palette matches:
       Modify only while reading, Save/Undo only while writing, same as .recacts */
    const showSave = getState().mode === 'create' || getState().mode === 'edit'
    const inMode = x => {
      if (x.t === 'Modify') return !showSave
      if (x.t === 'Save' || x.t === 'Undo') return showSave
      if (x.t === 'Delete') return getState().mode !== 'create'
      return true
    }
    const groups = []
    if (sScope === 'all' || sScope === 'actions') {
      const acts = ACTIONS.filter(m)
        .filter(inMode)
        .map(a => ({...a, kind: 'action', off: blocked(a.t)}))
      const on = acts.filter(a => !a.off),
        off = acts.filter(a => a.off)
      if (on.length)
        groups.push({g: 'Do on this invoice', items: on.slice(0, sScope === 'all' ? 5 : 99)})
      if (off.length && (q || sScope === 'actions'))
        groups.push({g: 'Unavailable right now', items: off, dim: true})
    }
    if (sScope === 'all' || sScope === 'screens') {
      const it = SCREENS.filter(m).map(x => ({...x, kind: 'screen'}))
      if (it.length)
        groups.push({g: 'Go to screen', items: it.slice(0, sScope === 'all' ? 5 : 99)})
    }
    if (sScope === 'all' || sScope === 'records') {
      const it = RECORDS.filter(m).map(x => ({...x, kind: 'record'}))
      if (it.length)
        groups.push({g: 'Open record', items: it.slice(0, sScope === 'all' ? 4 : 99)})
    }
    sRows = []
    const list = activeList()
    if (!groups.length) {
      list.innerHTML = `<div class="sempty px-[18px] py-8 text-center text-[13px] text-muted"><b class="mb-1 block text-ink">Nothing matches “${esc(activeInput().value)}”</b>Try a document number, a customer name, or an action such as “Posting”.</div>`
      return
    }
    list.innerHTML = groups
      .map(gr => {
        const rows = gr.items
          .map(it => {
            const i = sRows.push(it) - 1
            return `<button class="sitem flex w-full items-center gap-[11px] rounded-lg px-3 py-2 text-start disabled:opacity-60" role="option" data-i="${i}" ${gr.dim ? 'disabled' : ''}>
  <span class="ic flex size-[26px] shrink-0 items-center justify-center rounded-[7px] bg-[var(--line-2)] text-muted"><svg width="14" height="14"><use href="#${it.icon}"/></svg></span>
  <span class="tx min-w-0 flex-1"><span class="t block truncate text-[13px] [.strow_&]:font-semibold [.strow_&]:[font-size:13px] [.strow_&]:flex [.strow_&]:items-center [.strow_&]:[gap:7px] [.strow_&]:flex-wrap [.strow.off_&]:text-muted [.dcard_&]:font-semibold [.dcard_&]:[font-size:13px] [.dcard_&]:flex [.dcard_&]:items-center [.dcard_&]:gap-1.5 [.dcard_&]:flex-wrap">${hi(it.t, q)}</span>
  ${gr.dim ? `<span class="why block text-xs italic text-faint">${it.off}</span>` : it.s ? `<span class="s mt-px block text-xs text-muted">${hi(it.s, q)}</span>` : ''}</span>
  ${it.kbd && !gr.dim ? `<span class="kbd rounded border border-line bg-[var(--line-2)] px-1.5 py-px font-mono text-[11px] text-muted">${it.kbd}</span>` : ''}</button>`
          })
          .join('')
        return `<div class="sgrp flex items-center gap-2 px-3 pb-[3px] pt-[9px] text-xs uppercase tracking-[0.04em] text-faint">${gr.g}<span class="c rounded-full bg-[var(--line-2)] px-[7px] text-xs">${gr.items.length}</span></div>${rows}`
      })
      .join('')
    sSel = 0
    markSel()
  }

  const markSel = () => {
    const items = [...activeList().querySelectorAll('.sitem:not(:disabled)')]
    items.forEach((el, i) => el.classList.toggle('sel', i === sSel))
    items[sSel]?.scrollIntoView({block: 'nearest'})
  }

  const runSearch = () => {
    const items = [...activeList().querySelectorAll('.sitem:not(:disabled)')]
    const el = items[sSel]
    if (!el) return
    const it = sRows[+el.dataset.i]
    closeSearch()
    if (it.run === 'print') {
      openPrintSettings()
      return
    }
    if (it.run === 'favorite') {
      document.querySelector('.fav-toggle')?.click()
      return
    }
    if (it.run === 'stages' || it.run === 'activity') {
      openDrawer(it.run)
      return
    }
    if (actionDialog(it.t)) {
      openRDlg(actionDialog(it.t))
      return
    }
    if (it.kind === 'action') {
      /* runAction only knows the invoice verbs; the palette also offers
         Save and Help, which have their own homes in the UI — say so
         instead of closing as if the command had run */
      if (it.t === 'Save')
        toast({
          tone: 'info',
          title: 'Save from the record',
          body: 'Use the Save button in the invoice action row — it is live as soon as something changes.',
        })
      else if (it.t === 'Help')
        toast({
          tone: 'info',
          title: 'Keyboard shortcuts',
          body: 'Press F1 anywhere to open the shortcut sheet.',
        })
      else runAction(it.t)
    }
    /* screens/records: opening them is out of scope for this shell prototype */ else
      toast({
        tone: 'info',
        title: it.t,
        body: 'Opening this is out of scope for the app-shell prototype.',
      })
  }

  const openSearch = (screensOnly = true) => {
    document.querySelectorAll('.search-typing-label').forEach(label => {
      stopSearchTyping(label.closest('.lp-view, .gtop'))
    })
    const p = activePanel()
    p.classList.add('open')
    p.classList.toggle('screens-only', screensOnly)
    p.closest('.swrap').classList.add('open')
    document.getElementById('sscrim').classList.add('open')
    activeInput().value = ''
    sScope = screensOnly ? 'screens' : 'all'
    sScreensLocked = screensOnly
    p.querySelectorAll('.sscope button').forEach(b =>
      b.setAttribute('aria-pressed', String(b.dataset.scope === sScope))
    )
    renderSearch()
    activeInput().focus()
  }

  const closeSearch = () => {
    document.querySelectorAll('.spanel.open').forEach(p => {
      p.classList.remove('open')
      p.closest('.swrap').classList.remove('open')
    })
    document.getElementById('sscrim').classList.remove('open')
    document.querySelectorAll('.search-typing-label').forEach(startSearchTyping)
  }

  const sscrim = document.createElement('div')

  sscrim.className = 'sscrim fixed inset-0 z-[150] hidden bg-transparent'

  sscrim.id = 'sscrim'

  document.body.append(sscrim)

  sscrim.addEventListener('click', closeSearch)

  document.addEventListener('click', e => {
    const opener = e.target.closest('.s-open')
    if (opener) openSearch()
    const it = e.target.closest('.sitem:not(:disabled)')
    if (it) {
      sSel = [...activeList().querySelectorAll('.sitem:not(:disabled)')].indexOf(it)
      runSearch()
    }
  })

  document.addEventListener('mouseover', e => {
    const it = e.target.closest('.sitem:not(:disabled)')
    if (!it) return
    const items = [...activeList().querySelectorAll('.sitem:not(:disabled)')]
    const i = items.indexOf(it)
    if (i < 0 || i === sSel) return
    sSel = i
    markSel()
  })

  document
    .querySelectorAll('.spanel input')
    .forEach(i => i.addEventListener('input', renderSearch))

  document.querySelectorAll('.sscope button').forEach(b =>
    b.addEventListener('click', () => {
      sScope = b.dataset.scope
      b.parentElement
        .querySelectorAll('button')
        .forEach(x => x.setAttribute('aria-pressed', String(x === b)))
      renderSearch()
      activeInput().focus()
    })
  )

  document.querySelectorAll('.spanel input').forEach(inp =>
    inp.addEventListener('keydown', e => {
      const n = activeList().querySelectorAll('.sitem:not(:disabled)').length
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        sSel = (sSel + 1) % n
        markSel()
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        sSel = (sSel - 1 + n) % n
        markSel()
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        runSearch()
      }
      if (e.key === 'Tab' && !sScreensLocked) {
        e.preventDefault()
        const o = ['all', 'screens', 'records', 'actions']
        activePanel()
          .querySelector(`.sscope button[data-scope=${o[(o.indexOf(sScope) + 1) % 4]}]`)
          .click()
      }
    })
  )

  return {renderSearch, openSearch, closeSearch}
}
