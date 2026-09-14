import {CARDS, ACTIVITY, STATUSES} from '../../prototype/fixtures/invoices.js'

export function createInvoiceActivity({state, trapFocus, releaseFocus, closePop, closeAllMenus}) {
const pageAbort = new AbortController()

        const drawer = document.getElementById('drawer'),
          drscrim = document.getElementById('drscrim')
        const EMPTY = ({icon, title, body, cta}) => `<div class="empty">
    <span class="ic"><svg width="18" height="18"><use href="#${icon}"/></svg></span>
    <h4>${title}</h4><p>${body}</p>${cta ? `<div class="cta">${cta}</div>` : ''}</div>`

        const renderCards = () => {
          /* a draft has no record to describe yet */
          if (state.mode === 'create') {
            document.querySelector('.drtab[data-tab=stages] .n').textContent = '0'
            document.querySelector('[data-panel=stages]').innerHTML = EMPTY({
              icon: 'i-clock',
              title: 'Nothing has happened yet',
              body: 'The log starts the moment you save this invoice. It will show who entered it, who changed it, and every posting or cancellation after that.',
            })
            document
              .querySelectorAll('.cur-name,.cur-badge')
              .forEach(e => (e.textContent = 'Draft'))
            return
          }
          const list = CARDS.filter(c => c.always || c.id === state.status)
          document.querySelector('.drtab[data-tab=stages] .n').textContent = list.length
          const noCard =
            state.status === 'returned'
              ? `<div class="drnote">The <b>Returned</b> flag records nothing else \u2014 no user, no date, no reason. Only the flag itself is stored.</div>`
              : ''
          document.querySelector('[data-panel=stages]').innerHTML =
            list
              .map(
                c => `
    <div class="card"><div class="mk"><span class="dot"><svg width="11" height="11"><use href="#i-check"/></svg></span></div>
      <div class="main"><div class="t">${c.name}${c.badge ? `<span class="badge gray">${c.badge}</span>` : ''}</div>
        <div class="grid" style="grid-template-columns:repeat(${Math.min(c.rows.length, 4)},1fr)">
          ${c.rows.map(r => `<div><div class="k">${r[0]}</div><div>${String(r[1]).replace('__PRINTS__', state.prints)}</div></div>`).join('')}</div>
        ${c.link ? `<a class="lnk" href="#">${c.link} →</a>` : ''}</div></div>`
              )
              .join('') +
            noCard +
            `<div class="drnote">Only the cards this invoice actually has are listed, each showing its most recent state.</div>`
          document
            .querySelectorAll('.cur-name,.cur-badge')
            .forEach(
              e =>
                (e.textContent = state.mode === 'create' ? 'Draft' : STATUSES[state.status].short)
            )
        }
        const renderActivity = () => {
          /* the live product returns nothing here on most invoices — design for that first */
          if (state.mode === 'create' || !ACTIVITY.length || state.emptyFlow) {
            document.querySelector('.drtab[data-tab=activity] .n').textContent = '0'
            document.querySelector('[data-panel=activity]').innerHTML = EMPTY({
              icon: 'i-chat',
              title:
                state.mode === 'create'
                  ? 'No conversation yet'
                  : 'Nothing has been written about this invoice',
              body:
                state.mode === 'create'
                  ? 'Once the invoice is saved, anyone who works on it can leave a note here, attach a file, or mention a colleague.'
                  : 'Notes and messages left here stay with the invoice, so the next person sees why it looks the way it does.',
              cta:
                state.mode === 'create'
                  ? ''
                  : '<button class="lbtn out" id="first-note">Write the first note</button>',
            })
            return
          }
          document.querySelector('.drtab[data-tab=activity] .n').textContent = String(
            ACTIVITY.reduce((n, g) => n + g.items.length, 0)
          )
          document.querySelector('[data-panel=activity]').innerHTML = ACTIVITY.map(
            g =>
              `<div class="daysep">${g.day}</div>` +
              g.items
                .map(it => {
                  const chips = it.chips
                    ? `<div class="chips">${it.chips.map(c => `<span class="chip"><svg width="13" height="13"><use href="#${c.i}"/></svg> ${c.t}</span>`).join('')}</div>`
                    : ''
                  const chg = it.chg
                    ? `<div class="chg">${it.chg.l} <s>${it.chg.f}</s> → <b>${it.chg.t}</b></div>`
                    : ''
                  const notes = it.notes
                    ? `<div class="tg"><button class="ntg" aria-expanded="false"><svg width="13" height="13"><use href="#i-caret"/></svg> ${it.notes.length} notes</button></div>
        <div class="notes">${it.notes
          .map(
            n => `<div class="note-i"><span class="av2">${n.ini}</span><div>
          <div class="who">${n.who} ${n.tag ? `<span class="badge gray">${n.tag}</span>` : ''} <span class="tm">${n.time}</span></div>
          <div class="txt">${n.txt}</div></div></div>`
          )
          .join('')}</div>`
                    : ''
                  return `<div class="act"><span class="av ${it.sys ? 'sys' : ''}">${it.sys ? '<svg width="13" height="13"><use href="#i-gear"/></svg>' : it.ini}</span>
        <div class="main"><div class="line"><b>${it.who}</b> ${it.auto ? '<span class="badge gray">Automatic</span> ' : ''}${it.what}<span class="tm">${it.time}</span></div>
        ${chg}${chips}${notes}</div></div>`
                })
                .join('')
          ).join('')
        }
        const selectTab = name => {
          document
            .querySelectorAll('.drtab')
            .forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === name)))
          document
            .querySelectorAll('[data-panel]')
            .forEach(p => (p.hidden = p.dataset.panel !== name))
          document.querySelectorAll('[data-for]').forEach(b => (b.hidden = b.dataset.for !== name))
        }
        const openDrawer = tab => {
          renderCards()
          renderActivity()
          drawer.classList.add('open')
          drscrim.classList.add('open')
          selectTab(tab || 'stages')
          trapFocus(drawer)
        }
        const closeDrawer = () => {
          if (drawer.classList.contains('open')) {
            drawer.classList.remove('open')
            drscrim.classList.remove('open')
            releaseFocus()
          }
        }
        document
          .querySelectorAll('.drtab')
          .forEach(t => t.addEventListener('click', () => selectTab(t.dataset.tab), {signal: pageAbort.signal}))
        document.addEventListener('click', e => {
          if (e.target.closest('#first-note')) drawer.querySelector('.drfoot textarea')?.focus()
        }, {signal: pageAbort.signal})
        document.addEventListener('click', e => {
          const o = e.target.closest('.dr-open')
          if (o && !o.disabled) {
            closePop()
            closeAllMenus()
            openDrawer(o.dataset.tab)
          }
          if (e.target.closest('.dr-close') || e.target === drscrim) closeDrawer()
          const ntg = e.target.closest('.ntg')
          if (ntg) {
            const box = ntg.closest('.main').querySelector('.notes')
            ntg.setAttribute('aria-expanded', String(box.classList.toggle('open')))
          }
          const seg = e.target.closest('.segctl button')
          if (seg)
            seg.parentElement
              .querySelectorAll('button')
              .forEach(x => x.setAttribute('aria-pressed', String(x === seg)))
        }, {signal: pageAbort.signal})


return {dispose: () => pageAbort.abort(), drawer, renderCards, renderActivity, openDrawer, closeDrawer}
}
