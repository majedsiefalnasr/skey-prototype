

/** Owns record chrome state and its DOM bindings. */
export function createRecordChrome({getShowContentView, getState, renderActivity, getModeSel, applyMode} = {}) {
  document.querySelectorAll('.design.active').forEach(d => {
    /* this record's own actions come first, the general ones after them */
    d.querySelectorAll('.lbtn[data-act="Save"]').forEach(btn => {
      const modify = document.createElement('button')
      modify.className = 'lbtn pri'
      modify.dataset.act = 'Modify'
      modify.innerHTML =
        '<svg width="15" height="15" aria-hidden="true"><use href="#i-edit"/></svg> Modify'
      btn.parentNode.insertBefore(modify, btn)
    })

    /* the general actions sit behind whatever this record is doing */
    d.querySelectorAll('.lbtn[data-act="Save"]').forEach(btn => {
      const row = btn.parentNode
      const host = document.createElement('span')
      host.className = 'recacts inline-flex items-center [gap:7px] flex-wrap'
      host.innerHTML =
        '<span class="vsep [.recacts_&]:[width:1px] [.recacts_&]:[align-self:stretch] [.recacts_&]:[background:var(--line)] [.recacts_&]:[margin:2px_3px]! [.d2_&]:[width:1px] [.d2_&]:[align-self:stretch] [.d2_&]:[background:var(--line)] [.d2_&]:[margin:0_4px]!" data-role="gensep"></span>' +
        '<span class="statuswrap menu relative inline-flex [flex:none]">' +
        '<button class="lbtn out" data-act="Change status" aria-haspopup="menu" aria-expanded="false"><svg width="15" height="15" aria-hidden="true"><use href="#i-flow"/></svg> Transition <svg width="11" height="11" aria-hidden="true"><use href="#i-caret"/></svg></button>' +
        '<div class="mlist mend" role="menu" style="min-width:210px">' +
        '<button role="menuitem" data-status-action="open"><svg width="14" height="14" aria-hidden="true"><use href="#i-doc"/></svg> Open invoice</button>' +
        '<button role="menuitem" data-status-action="pending"><svg width="14" height="14" aria-hidden="true"><use href="#i-clock"/></svg> Mark as pending</button>' +
        '<button role="menuitem" data-status-action="posted"><svg width="14" height="14" aria-hidden="true"><use href="#i-post"/></svg> Post invoice</button>' +
        '<button role="menuitem" data-status-action="returned"><svg width="14" height="14" aria-hidden="true"><use href="#i-undo"/></svg> Return invoice</button>' +
        '<hr><button role="menuitem" class="dan" data-status-action="canceled"><svg width="14" height="14" aria-hidden="true"><use href="#i-x"/></svg> Cancel invoice</button>' +
        '</div></span>' +
        '<span class="newwrap menu relative inline-flex [flex:none]">' +
        '<button class="lbtn out main [.newwrap>&]:[border-radius:6px_0_0_6px] [.newwrap>&]:whitespace-nowrap [.newwrap>&]:[border-inline-end:none] [[dir=rtl]_.newwrap>&]:[border-radius:0_6px_6px_0] [[dir=rtl]_.newwrap>&]:[border-inline-start:none] [[dir=rtl]_.newwrap>&]:[border-inline-end:1px_solid_var(--line)] [.savewrap>&]:[border-radius:6px_0_0_6px] [.savewrap>&]:whitespace-nowrap [[dir=rtl]_.savewrap>&]:[border-radius:0_6px_6px_0] [.d2_.genbtn>&]:[border-radius:7px_0_0_7px] [[dir=rtl]_.d2_.genbtn>&]:[border-radius:0_7px_7px_0] [.d4_&]:[flex:1] [.d4_&]:min-w-0 [.d4_&]:flex [.d4_&]:flex-col" data-act="New"><svg width="15" height="15" aria-hidden="true"><use href="#i-plus"/></svg> New</button>' +
        '<button class="car [.newwrap>&]:[border:1px_solid_var(--line)] [.newwrap>&]:[border-inline-start:none] [.newwrap>&]:[border-radius:0_6px_6px_0] [.newwrap>&]:[padding:6px_7px] [.newwrap>&]:bg-surface [[dir=rtl]_.newwrap>&]:[border-radius:6px_0_0_6px] [[dir=rtl]_.newwrap>&]:[border-inline-start:none] [[dir=rtl]_.newwrap>&]:[border-inline-end:none] [.newwrap>&:hover:not(:disabled)]:bg-[var(--line-2)] [.savewrap>&]:[background:var(--accent)] [.savewrap>&]:[color:var(--inverse)] [.savewrap>&]:[border-inline-start:1px_solid_color-mix(in_srgb,_var(--inverse)_35%,_transparent)] [.savewrap>&]:[border-radius:0_6px_6px_0] [.savewrap>&]:[padding:6px_7px] [[dir=rtl]_.savewrap>&]:[border-radius:6px_0_0_6px] [.savewrap>&:disabled]:[opacity:0.42] [.d2_.genbtn>&]:[border:1px_solid_var(--line)] [.d2_.genbtn>&]:[border-inline-start:none] [.d2_.genbtn>&]:[border-radius:0_7px_7px_0] [.d2_.genbtn>&]:[padding:6px_7px] [.d2_.genbtn>&]:bg-surface [[dir=rtl]_.d2_.genbtn>&]:[border-radius:7px_0_0_7px] [[dir=rtl]_.d2_.genbtn>&]:[border-inline-start:1px_solid_var(--line)] [[dir=rtl]_.d2_.genbtn>&]:[border-inline-end:none]" aria-haspopup="menu" aria-expanded="false" aria-label="Other things to create">' +
        '<svg width="11" height="11" aria-hidden="true"><use href="#i-caret"/></svg></button>' +
        '<div class="mlist mend" role="menu" style="min-width:230px">' +
        '<div class="grp-lbl">This screen</div>' +
        '<button role="menuitem" data-act="Add From">Add From</button>' +
        '<button role="menuitem" data-act="New in new tab"><svg width="14" height="14" aria-hidden="true"><use href="#i-next"/></svg> Open in new tab</button>' +
        '</div>' +
        '</span>' +
        '<button class="lbtn out danger" data-act="Delete"><svg width="15" height="15" aria-hidden="true"><use href="#i-trash"/></svg> Delete</button>'
      const undo = row.querySelector('[data-act="Undo"]')
      ;(undo || btn).after(host)
    })
    d.querySelectorAll('.lbtn[data-act="Save"]').forEach(btn => {
      const wrap = document.createElement('span')
      wrap.className = 'savewrap menu relative inline-flex [flex:none]'
      btn.parentNode.insertBefore(wrap, btn)
      wrap.appendChild(btn)
      btn.classList.add('main')
      const car = document.createElement('button')
      car.className = 'car [.newwrap>&]:[border:1px_solid_var(--line)] [.newwrap>&]:[border-inline-start:none] [.newwrap>&]:[border-radius:0_6px_6px_0] [.newwrap>&]:[padding:6px_7px] [.newwrap>&]:bg-surface [[dir=rtl]_.newwrap>&]:[border-radius:6px_0_0_6px] [[dir=rtl]_.newwrap>&]:[border-inline-start:1px_solid_var(--line)] [[dir=rtl]_.newwrap>&]:[border-inline-end:none] [.newwrap>&:hover:not(:disabled)]:bg-[var(--line-2)] [.savewrap>&]:[background:var(--accent)] [.savewrap>&]:[color:var(--inverse)] [.savewrap>&]:[border-inline-start:1px_solid_color-mix(in_srgb,_var(--inverse)_35%,_transparent)] [.savewrap>&]:[border-radius:0_6px_6px_0] [.savewrap>&]:[padding:6px_7px] [[dir=rtl]_.savewrap>&]:[border-radius:6px_0_0_6px] [.savewrap>&:disabled]:[opacity:0.42] [.d2_.genbtn>&]:[border:1px_solid_var(--line)] [.d2_.genbtn>&]:[border-inline-start:none] [.d2_.genbtn>&]:[border-radius:0_7px_7px_0] [.d2_.genbtn>&]:[padding:6px_7px] [.d2_.genbtn>&]:bg-surface [[dir=rtl]_.d2_.genbtn>&]:[border-radius:7px_0_0_7px] [[dir=rtl]_.d2_.genbtn>&]:[border-inline-start:1px_solid_var(--line)] [[dir=rtl]_.d2_.genbtn>&]:[border-inline-end:none]'
      car.setAttribute('aria-haspopup', 'menu')
      car.setAttribute('aria-expanded', 'false')
      car.setAttribute('aria-label', 'Other ways to save')
      car.innerHTML =
        '<svg width="11" height="11" aria-hidden="true"><use href="#i-caret"/></svg>'
      const list = document.createElement('div')
      list.className = 'mlist mend'
      list.setAttribute('role', 'menu')
      list.style.minWidth = '210px'
      list.innerHTML =
        '<button role="menuitem" data-save="new">Save and start another</button>'
      wrap.append(car, list)
      const chip = document.createElement('span')
      chip.className = 'reqchip inline-flex items-center gap-1.5 text-xs font-semibold [background:var(--warn-bg)] [color:var(--warn-ink)] [border-radius:999px] [padding:4px_11px]'
      chip.hidden = true
      wrap.parentNode.insertBefore(chip, wrap)
    })
    /* lives in the footer next to "Record N of N" instead of its own
       full-width banner above the canvas, or crowding the title row — same
       always-visible reason, without spending a row on it anywhere. Scoped to
       the record page's own .fnav (inside the shared page footer) so it doesn't also
       attach to the List page's unrelated ".pos" (page count), which lives
       inside .list-view instead. */
    d.querySelectorAll('.page-footer [data-page-footer="record"] .pos').forEach(p => {
      const bar = document.createElement('span')
      bar.className = 'lockbanner inline-flex items-center gap-1.5 [font-size:12.5px] text-muted [&_svg]:[color:var(--faint)]'
      bar.hidden = true
      bar.innerHTML =
        '<svg width="13" height="13" aria-hidden="true"><use href="#i-lock"/></svg><span></span>'
      p.after(bar)
    })
    d.querySelectorAll('.pager-mount').forEach(m => {
      const b = document.createElement('button')
      b.className = 'backlist inline-flex items-center gap-1.5 [padding:6px_11px] [border:1px_solid_var(--line)] [border-radius:7px] bg-surface [font-size:13px] whitespace-nowrap [&:hover]:bg-[var(--line-2)]'
      b.hidden = true
      b.innerHTML =
        '<svg width="14" height="14" aria-hidden="true"><use href="#i-prev"/></svg> Back to the invoice list'
      m.parentNode.insertBefore(b, m.nextSibling)
    })
  })

  document.querySelectorAll('.record-back').forEach(b =>
    b.addEventListener('click', e => {
      e.preventDefault()
      getShowContentView()('list')
    })
  )

  function bind() {
  document.getElementById('st').disabled = getState().mode === 'create'

  renderActivity()

  applyMode(getModeSel().value || 'record')
  }

  return {bind}
}
