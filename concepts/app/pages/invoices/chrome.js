

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
      host.className = 'recacts'
      host.innerHTML =
        '<span class="vsep" data-role="gensep"></span>' +
        '<span class="newwrap menu">' +
        '<button class="lbtn out main" data-act="New"><svg width="15" height="15" aria-hidden="true"><use href="#i-plus"/></svg> New</button>' +
        '<button class="car" aria-haspopup="menu" aria-expanded="false" aria-label="Other things to create">' +
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
      wrap.className = 'savewrap menu'
      btn.parentNode.insertBefore(wrap, btn)
      wrap.appendChild(btn)
      btn.classList.add('main')
      const car = document.createElement('button')
      car.className = 'car'
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
        '<button role="menuitem" data-save="new">Save and start another</button>' +
        '<button role="menuitem" data-save="close">Save and go to the list</button>'
      wrap.append(car, list)
      const chip = document.createElement('span')
      chip.className = 'reqchip'
      chip.hidden = true
      wrap.parentNode.insertBefore(chip, wrap)
    })
    /* lives in the footer next to "Record N of N" instead of its own
       full-width banner above the canvas, or crowding the title row — same
       always-visible reason, without spending a row on it anywhere. Scoped to
       the record page's own .fnav (a direct .content child) so it doesn't also
       attach to the List page's unrelated ".pos" (page count), which lives
       inside .list-view instead. */
    d.querySelectorAll('.content > .fnav .pos').forEach(p => {
      const bar = document.createElement('span')
      bar.className = 'lockbanner'
      bar.hidden = true
      bar.innerHTML =
        '<svg width="13" height="13" aria-hidden="true"><use href="#i-lock"/></svg><span></span>'
      p.after(bar)
    })
    d.querySelectorAll('.pager-mount').forEach(m => {
      const b = document.createElement('button')
      b.className = 'backlist'
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
