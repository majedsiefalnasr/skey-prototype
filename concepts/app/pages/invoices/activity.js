import {CARDS, ACTIVITY, STATUSES} from '../../prototype/fixtures/invoices.js'

const ACTIVITY_DRAWER_NOTE_CLASS = 'drnote px-[18px] py-[13px] text-xs text-faint'
const ACTIVITY_CARD_CLASS = 'card flex gap-3 border-b border-[var(--line-2)] px-[18px] py-3.5'
const ACTIVITY_CARD_MARKER_CLASS = 'mk flex w-[22px] flex-none justify-center pt-0.5'
const ACTIVITY_CARD_DOT_CLASS = 'dot flex size-5 items-center justify-center rounded-full border-2 border-[var(--st-post-ink)] bg-surface text-[var(--st-post-ink)]'
const ACTIVITY_MAIN_CLASS = 'main min-w-0 flex-1'
const ACTIVITY_CARD_TITLE_CLASS = 't flex flex-wrap items-center gap-[9px] text-[13px] font-semibold'
const ACTIVITY_CARD_GRID_CLASS = 'grid mt-2 gap-x-3 gap-y-1 text-xs'
const ACTIVITY_CARD_KEY_CLASS = 'k text-xs text-faint'
const ACTIVITY_CARD_LINK_CLASS = 'lnk mt-1.5 inline-block text-xs text-accent'
const ACTIVITY_DAY_SEPARATOR_CLASS = 'daysep border-y border-[var(--line-2)] bg-[var(--line-2)] px-[18px] py-2 text-xs text-faint'
const ACTIVITY_ENTRY_CLASS = "act relative flex gap-3 px-[18px] py-3.5 before:absolute before:bottom-[-4px] before:start-[34px] before:top-10 before:w-0.5 before:bg-[var(--line-2)] before:content-[''] last:before:hidden"
const ACTIVITY_AVATAR_CLASS = 'av z-[1] flex size-[30px] flex-none items-center justify-center rounded-full bg-accent text-xs font-semibold text-inverse'
const ACTIVITY_SYSTEM_AVATAR_CLASS = 'sys bg-[var(--line-2)]! text-muted!'
const ACTIVITY_LINE_CLASS = 'line text-[13px] [&_b]:font-semibold'
const ACTIVITY_TIME_CLASS = 'tm ms-1.5 text-xs text-faint'
const ACTIVITY_CHANGE_CLASS = 'chg mt-[3px] text-xs text-muted [&_s]:text-faint [&_b]:text-ink'
const ACTIVITY_CHIPS_CLASS = 'chips mt-[7px] flex flex-wrap gap-[7px]'
const ACTIVITY_CHIP_CLASS = 'chip inline-flex items-center gap-1.5 rounded-[7px] border border-line bg-surface px-[9px] py-[3px] text-xs'
const ACTIVITY_TOGGLE_GROUP_CLASS = 'tg mt-2 flex gap-3.5 text-xs'
const ACTIVITY_TOGGLE_CLASS = 'ntg inline-flex items-center gap-[5px] text-muted'
const ACTIVITY_NOTES_CLASS = 'notes mt-[9px] hidden border-s-2 border-[var(--line-2)] ps-3 [&.open]:block'
const ACTIVITY_NOTE_CLASS = 'note-i flex gap-[9px] py-1.5'
const ACTIVITY_NOTE_AVATAR_CLASS = 'av2 flex size-6 flex-none items-center justify-center rounded-full bg-[var(--line-2)] text-xs font-semibold text-muted'
const ACTIVITY_NOTE_WHO_CLASS = 'who text-xs font-semibold'
const ACTIVITY_NOTE_TEXT_CLASS = 'txt mt-0.5 text-xs [&_.mn]:rounded [&_.mn]:bg-[var(--accent-soft)] [&_.mn]:px-1 [&_.mn]:text-accent'

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
              ? `<div class="${ACTIVITY_DRAWER_NOTE_CLASS}">The <b>Returned</b> flag records nothing else \u2014 no user, no date, no reason. Only the flag itself is stored.</div>`
              : ''
          document.querySelector('[data-panel=stages]').innerHTML =
            list
              .map(
                c => `
    <div class="${ACTIVITY_CARD_CLASS}"><div class="${ACTIVITY_CARD_MARKER_CLASS}"><span class="${ACTIVITY_CARD_DOT_CLASS}"><svg width="11" height="11"><use href="#i-check"/></svg></span></div>
      <div class="${ACTIVITY_MAIN_CLASS}"><div class="${ACTIVITY_CARD_TITLE_CLASS}">${c.name}${c.badge ? `<span class="badge gray">${c.badge}</span>` : ''}</div>
        <div class="${ACTIVITY_CARD_GRID_CLASS}" style="grid-template-columns:repeat(${Math.min(c.rows.length, 4)},1fr)">
          ${c.rows.map(r => `<div><div class="${ACTIVITY_CARD_KEY_CLASS}">${r[0]}</div><div>${String(r[1]).replace('__PRINTS__', state.prints)}</div></div>`).join('')}</div>
        ${c.link ? `<a class="${ACTIVITY_CARD_LINK_CLASS}" href="#">${c.link} →</a>` : ''}</div></div>`
              )
              .join('') +
            noCard +
            `<div class="${ACTIVITY_DRAWER_NOTE_CLASS}">Only the cards this invoice actually has are listed, each showing its most recent state.</div>`
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
              `<div class="${ACTIVITY_DAY_SEPARATOR_CLASS}">${g.day}</div>` +
              g.items
                .map(it => {
                  const chips = it.chips
                    ? `<div class="${ACTIVITY_CHIPS_CLASS}">${it.chips.map(c => `<span class="${ACTIVITY_CHIP_CLASS}"><svg width="13" height="13"><use href="#${c.i}"/></svg> ${c.t}</span>`).join('')}</div>`
                    : ''
                  const chg = it.chg
                    ? `<div class="${ACTIVITY_CHANGE_CLASS}">${it.chg.l} <s>${it.chg.f}</s> → <b>${it.chg.t}</b></div>`
                    : ''
                  const notes = it.notes
                    ? `<div class="${ACTIVITY_TOGGLE_GROUP_CLASS}"><button class="${ACTIVITY_TOGGLE_CLASS}" aria-expanded="false"><svg width="13" height="13"><use href="#i-caret"/></svg> ${it.notes.length} notes</button></div>
        <div class="${ACTIVITY_NOTES_CLASS}">${it.notes
          .map(
            n => `<div class="${ACTIVITY_NOTE_CLASS}"><span class="${ACTIVITY_NOTE_AVATAR_CLASS}">${n.ini}</span><div>
          <div class="${ACTIVITY_NOTE_WHO_CLASS}">${n.who} ${n.tag ? `<span class="badge gray">${n.tag}</span>` : ''} <span class="${ACTIVITY_TIME_CLASS}">${n.time}</span></div>
          <div class="${ACTIVITY_NOTE_TEXT_CLASS}">${n.txt}</div></div></div>`
          )
          .join('')}</div>`
                    : ''
                  return `<div class="${ACTIVITY_ENTRY_CLASS}"><span class="${ACTIVITY_AVATAR_CLASS}${it.sys ? ` ${ACTIVITY_SYSTEM_AVATAR_CLASS}` : ''}">${it.sys ? '<svg width="13" height="13"><use href="#i-gear"/></svg>' : it.ini}</span>
        <div class="${ACTIVITY_MAIN_CLASS}"><div class="${ACTIVITY_LINE_CLASS}"><b>${it.who}</b> ${it.auto ? '<span class="badge gray">Automatic</span> ' : ''}${it.what}<span class="${ACTIVITY_TIME_CLASS}">${it.time}</span></div>
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
