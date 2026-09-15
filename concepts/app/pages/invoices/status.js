import {CHAIN} from '../../prototype/fixtures/invoices.js'

/** Owns status state and its DOM bindings. */
export function createStatus({getState} = {}) {
  const pop = document.getElementById('stpop')

  const reached = id =>
    getState().mode === 'create'
      ? false
      : id === 'entry' || id === 'modified' || id === getState().status

  const renderPop = () => {
    const creating = getState().mode === 'create'
    const n = CHAIN.filter(c => reached(c.id)).length
    pop.querySelector('h4').textContent = creating
      ? 'Nothing recorded yet'
      : 'Document status'
    pop.querySelector('.sub').textContent = creating
      ? 'Starts when you save'
      : `${n} of ${CHAIN.length} steps recorded`
    let lead = pop.querySelector('.poplead')
    if (!lead) {
      lead = document.createElement('p')
      lead.className = 'poplead [.stpop_&]:[font-size:12.5px] [.stpop_&]:text-muted [.stpop_&]:[margin-bottom:13px]!'
      pop.querySelector('.rows').before(lead)
    }
    lead.hidden = !creating
    lead.textContent =
      'This invoice has never been saved, so the system has recorded nothing about it. Saving writes the first line — who entered it and when — and the rest follows as the invoice moves.'
    /* the full history is a stored thing; there is none yet */
    const histBtn = pop.querySelector('.ft button')
    histBtn.disabled = creating
    histBtn.title = creating ? 'Save the invoice first — it has no history yet' : ''
    pop.querySelector('.rows').innerHTML = CHAIN.map(c => {
      const on = reached(c.id),
        cur = !creating && c.id === getState().status
      const cls = on ? (cur ? 'cur' : 'done') : 'off'
      const icon =
        on && !cur ? '<svg width="11" height="11"><use href="#i-check"/></svg>' : ''
      const badge = cur ? '<span class="badge ok [.reqchip&]:[background:var(--st-post-bg)] [.reqchip&]:[color:var(--st-post-ink)]">Current</span>' : ''
      const meta = on
        ? `${c.who} · ${c.when}${c.dur ? ' · took ' + c.dur : ''}`
        : creating
          ? 'Not yet'
          : 'Never happened on this invoice'
      const link = on && c.link ? `<a class="lnk [.strow_&]:text-xs [.strow_&]:text-accent [.strow_&]:[text-decoration:none] [.strow_&]:[display:inline-block] [.strow_&]:[margin-top:2px]!" href="#">${c.link} →</a>` : ''
      return `<div class="strow ${cls} flex [gap:11px] relative [padding-bottom:14px] [&:last-of-type]:[padding-bottom:2px]"><span class="stdot2 [width:20px] [height:20px] rounded-full [flex:none] flex items-center justify-center [border:2px_solid_var(--line)] bg-surface [z-index:1] [color:var(--inverse)] [.strow.done_&]:[background:var(--accent)] [.strow.done_&]:[border-color:var(--accent)] [.strow.cur_&]:[border-color:var(--accent)]">${icon}</span>
        <div><div class="t [.strow_&]:font-semibold [.strow_&]:[font-size:13px] [.strow_&]:flex [.strow_&]:items-center [.strow_&]:[gap:7px] [.strow_&]:flex-wrap [.strow.off_&]:text-muted [.dcard_&]:font-semibold [.dcard_&]:[font-size:13px] [.dcard_&]:flex [.dcard_&]:items-center [.dcard_&]:gap-1.5 [.dcard_&]:flex-wrap">${c.name}${badge}<span class="tag-derived">derived</span></div>
        <div class="m [.strow_&]:text-xs [.strow_&]:text-muted [.strow_&]:[margin-top:1px]!">${meta}</div>${link}</div></div>`
    }).join('')
  }

  const closePop = () => {
    pop.classList.remove('open')
    document
      .querySelectorAll('.stpill[aria-expanded="true"]')
      .forEach(b => b.setAttribute('aria-expanded', 'false'))
  }

  document.addEventListener('click', e => {
    const pill = e.target.closest('.stpill')
    if (pill) {
      const open = pop.classList.contains('open')
      closePop()
      if (!open) {
        renderPop()
        pop.classList.add('open')
        pill.setAttribute('aria-expanded', 'true')
        const r = pill.getBoundingClientRect(),
          h = pop.offsetHeight
        pop.style.top =
          (r.bottom + 8 + h <= innerHeight - 12
            ? r.bottom + 8
            : Math.max(12, r.top - h - 8)) + 'px'
        pop.style.left = Math.max(12, Math.min(innerWidth - 364, r.left)) + 'px'
      }
      e.stopPropagation()
    } else if (!e.target.closest('#stpop')) closePop()
  })

  return {pop, reached, renderPop, closePop}
}
