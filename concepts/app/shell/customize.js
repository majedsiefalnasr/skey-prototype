import {NAV_TREE, NAV_ICONS} from '../prototype/fixtures/navigation.js'

/** Owns customize state and its DOM bindings. */
export function createCustomize({trapFocus, releaseFocus, toast, childrenOf, leavesOf, getForYouGroups, setForYouGroups, renderSide} = {}) {
  const cscrim = document.getElementById('cscrim')
  
  const csTree = document.getElementById('cs-tree')
  
  const csGroupsEl = document.getElementById('cs-groups')
  
  const csCount = document.getElementById('cs-count')
  
  let csDraft = []
  
  let csGroupSeq = 0
  
  const csSyncCount = () => {
    const n = csDraft.reduce((sum, g) => sum + g.items.length, 0)
    csCount.textContent = `${csDraft.length} group${csDraft.length === 1 ? '' : 's'}, ${n} screen${n === 1 ? '' : 's'}`
  }
  
  let csTreeRows = []
  
  const csTreeRow = (label, depth, icon, dragPayload) => {
    const li = document.createElement('li')
    li.className = 'cs-tree-row'
    li.dataset.depth = depth
    li.draggable = true
    li.innerHTML =
      (depth === 0
        ? `<span class="cs-icn"><svg width="14" height="14" aria-hidden="true"><use href="#${icon}"/></svg></span>`
        : '<span class="cs-expand-spacer"></span>') + '<span class="cs-lbl"></span>'
    li.querySelector('.cs-lbl').textContent = label
    li.addEventListener('dragstart', e => {
      if (li.classList.contains('disabled')) {
        e.preventDefault()
        return
      }
      e.dataTransfer.effectAllowed = 'copy'
      e.dataTransfer.setData('application/json', JSON.stringify(dragPayload))
      requestAnimationFrame(() => li.classList.add('dragging'))
    })
    li.addEventListener('dragend', () => li.classList.remove('dragging'))
    csTreeRows.push({el: li, screens: dragPayload.screens})
    return li
  }
  
  const csSyncTreeDisabled = () => {
    const used = new Set(csDraft.flatMap(g => g.items.map(it => it.label)))
    csTreeRows.forEach(({el, screens}) => {
      const allUsed = screens.every(s => used.has(s))
      el.classList.toggle('disabled', allUsed)
      el.draggable = !allUsed
    })
  }
  
  const csRenderTree = () => {
    csTree.innerHTML = ''
    csTreeRows = []
    NAV_TREE.forEach(group => {
      const appLabel = group[0]
      const kids = childrenOf(group)
      const row = csTreeRow(appLabel, 0, NAV_ICONS[appLabel] || 'i-doc', {
        appLabel,
        screens: leavesOf(group),
      })
      const li = document.createElement('li')
      li.appendChild(row)
      if (kids.length) {
        const expand = document.createElement('button')
        expand.type = 'button'
        expand.className = 'cs-expand'
        expand.setAttribute('aria-expanded', 'false')
        expand.setAttribute('aria-label', 'Show screens')
        expand.innerHTML =
          '<svg width="11" height="11" aria-hidden="true"><use href="#i-caret"/></svg>'
        row.insertBefore(expand, row.firstChild)
        const sub = document.createElement('ul')
        sub.className = 'cs-tree-sub'
        sub.hidden = true
        const addLeaves = (entry, depth) => {
          const entryLabel = Array.isArray(entry) ? entry[0] : entry
          const entryKids = childrenOf(entry)
          if (!entryKids.length) {
            sub.appendChild(
              csTreeRow(entryLabel, depth, null, {appLabel, screens: [entryLabel]})
            )
          } else {
            sub.appendChild(
              csTreeRow(entryLabel, depth, null, {appLabel, screens: leavesOf(entry)})
            )
            entryKids.forEach(k => addLeaves(k, depth + 1))
          }
        }
        kids.forEach(k => addLeaves(k, 1))
        expand.addEventListener('click', () => {
          sub.hidden = !sub.hidden
          expand.setAttribute('aria-expanded', String(!sub.hidden))
        })
        csTree.append(li, sub)
      } else {
        csTree.appendChild(li)
      }
    })
    csSyncTreeDisabled()
  }
  
  let csItemDragSrc =
    null
  
  let csGroupDragLabel = null
  
  const csRenderItem = (group, item, index) => {
    const li = document.createElement('li')
    li.className = 'cs-group-item'
    li.draggable = true
    li.innerHTML = `<span class="cs-grip">⋮⋮</span><span class="cs-item-lbl"></span><span class="cs-item-app"></span><button type="button" class="cs-item-del" aria-label="Remove"><svg width="11" height="11" aria-hidden="true"><use href="#i-x"/></svg></button>`
    li.querySelector('.cs-item-lbl').textContent = item.label
    li.querySelector('.cs-item-app').textContent = item.appLabel
    li.querySelector('.cs-item-del').addEventListener('click', () => {
      group.items.splice(index, 1)
      csRenderGroups()
    })
    li.addEventListener('dragstart', e => {
      e.stopPropagation()
      csItemDragSrc = {group, index}
      e.dataTransfer.effectAllowed = 'move'
      requestAnimationFrame(() => li.classList.add('dragging'))
    })
    li.addEventListener('dragend', () => {
      csItemDragSrc = null
      li.classList.remove('dragging')
    })
    /* dropping directly on another item inserts at that item's position,
       instead of falling through to the group-level drop which only appends —
       this is what actually lets items be reordered within a group */
    li.addEventListener('dragover', e => {
      if (csGroupDragLabel) return
      e.preventDefault()
      e.stopPropagation()
    })
    li.addEventListener('drop', e => {
      if (csGroupDragLabel) return
      e.preventDefault()
      e.stopPropagation()
      const targetIndex = group.items.indexOf(item)
      if (csItemDragSrc) {
        const {group: srcGroup, index: srcIndex} = csItemDragSrc
        const [moved] = srcGroup.items.splice(srcIndex, 1)
        /* removing the dragged item from its own group can shift the target's
   position left by one — reorder relative to where the target item now sits */
        const insertAt =
          srcGroup === group && srcIndex < targetIndex ? targetIndex - 1 : targetIndex
        group.items.splice(insertAt, 0, moved)
        csItemDragSrc = null
      } else {
        const json = e.dataTransfer.getData('application/json')
        if (!json) return
        const {appLabel, screens} = JSON.parse(json)
        const existing = new Set(group.items.map(it => it.label))
        const fresh = screens.filter(label => !existing.has(label))
        group.items.splice(targetIndex, 0, ...fresh.map(label => ({label, appLabel})))
      }
      csRenderGroups()
    })
    return li
  }
  
  let csCollapsedGroups = new Set()
  
  const csRenderGroups = () => {
    csGroupsEl.innerHTML = ''
    csDraft.forEach(group => {
      const li = document.createElement('li')
      li.className = 'cs-group'
      li.dataset.gid = group.id
      const collapsed = csCollapsedGroups.has(group.id)
      const hd = document.createElement('div')
      hd.className = 'cs-group-hd'
      hd.innerHTML =
        `<span class="cs-grip">⋮⋮</span>` +
        `<button type="button" class="cs-group-expand" aria-expanded="${!collapsed}" aria-label="${collapsed ? 'Expand' : 'Collapse'} group"><svg width="11" height="11" aria-hidden="true"><use href="#i-caret"/></svg></button>` +
        `<input class="cs-group-name" type="text" aria-label="Group name">` +
        `<span class="cs-group-tally"></span>` +
        `<button type="button" class="cs-group-del" aria-label="Delete group"><svg width="12" height="12" aria-hidden="true"><use href="#i-x"/></svg></button>`
      const nameInput = hd.querySelector('.cs-group-name')
      nameInput.value = group.name
      nameInput.addEventListener('input', () => (group.name = nameInput.value))
      hd.querySelector('.cs-group-tally').textContent = group.items.length
      hd.querySelector('.cs-group-del').addEventListener('click', () => {
        csDraft = csDraft.filter(g => g.id !== group.id)
        csRenderGroups()
      })
      hd.querySelector('.cs-grip').draggable = true
      hd.querySelector('.cs-grip').addEventListener('dragstart', e => {
        csGroupDragLabel = group.id
        e.dataTransfer.effectAllowed = 'move'
        requestAnimationFrame(() => li.classList.add('dragging'))
      })
      hd.querySelector('.cs-grip').addEventListener('dragend', () => {
        csGroupDragLabel = null
        li.classList.remove('dragging')
        /* the live DOM moves during dragover only reordered elements — commit
   that final order back into csDraft once, instead of on every tick */
        csDraft = [...csGroupsEl.querySelectorAll('.cs-group')]
          .map(el => csDraft.find(g => g.id === el.dataset.gid))
          .filter(Boolean)
        csSyncTreeDisabled()
      })
  
      const itemsList = document.createElement('ul')
      itemsList.className = 'cs-group-items'
      itemsList.hidden = collapsed
      group.items.forEach((item, i) => itemsList.appendChild(csRenderItem(group, item, i)))
  
      hd.querySelector('.cs-group-expand').addEventListener('click', () => {
        const nowCollapsed = !itemsList.hidden
        itemsList.hidden = nowCollapsed
        hd.querySelector('.cs-group-expand').setAttribute(
          'aria-expanded',
          String(!nowCollapsed)
        )
        hd.querySelector('.cs-group-expand').setAttribute(
          'aria-label',
          (nowCollapsed ? 'Expand' : 'Collapse') + ' group'
        )
        if (nowCollapsed) csCollapsedGroups.add(group.id)
        else csCollapsedGroups.delete(group.id)
      })
  
      /* drop target: a screen dragged from the left tree, or an existing item
         being moved from another group (or reordered within this one) */
      li.addEventListener('dragover', e => {
        if (!csGroupDragLabel) e.preventDefault()
        li.classList.add('drop-target')
      })
      li.addEventListener('dragleave', () => li.classList.remove('drop-target'))
      li.addEventListener('drop', e => {
        li.classList.remove('drop-target')
        if (csGroupDragLabel)
          return /* group cards are reordered by the outer list, not dropped into one another */
        e.preventDefault()
        if (csItemDragSrc) {
          const [moved] = csItemDragSrc.group.items.splice(csItemDragSrc.index, 1)
          group.items.push(moved)
          csItemDragSrc = null
        } else {
          const json = e.dataTransfer.getData('application/json')
          if (!json) return
          const {appLabel, screens} = JSON.parse(json)
          const existing = new Set(group.items.map(it => it.label))
          screens
            .filter(label => !existing.has(label))
            .forEach(label => group.items.push({label, appLabel}))
        }
        csRenderGroups()
      })
  
      li.append(hd, itemsList)
      csGroupsEl.appendChild(li)
    })
    csSyncCount()
    csSyncTreeDisabled()
  }
  
  csGroupsEl.addEventListener('dragover', e => {
    if (!csGroupDragLabel) return
    e.preventDefault()
    const dragging = csGroupsEl.querySelector('.cs-group.dragging')
    const over = e.target.closest('.cs-group')
    if (!dragging || !over || over === dragging) return
    const rect = over.getBoundingClientRect()
    const before = e.clientY < rect.top + rect.height / 2
    over.parentElement.insertBefore(dragging, before ? over : over.nextSibling)
  })
  
  document.getElementById('cs-add-group').addEventListener('click', () => {
    csGroupSeq += 1
    csDraft.push({id: 'g' + csGroupSeq, name: 'New group', items: []})
    csRenderGroups()
    csGroupsEl.querySelector('.cs-group:last-child .cs-group-name')?.select()
  })
  
  const openCustomize = () => {
    csGroupSeq = 0
    csCollapsedGroups = new Set()
    csDraft = getForYouGroups().map(g => {
      csGroupSeq += 1
      return {id: 'g' + csGroupSeq, name: g.name, items: g.items.map(it => ({...it}))}
    })
    csRenderTree()
    csRenderGroups()
    cscrim.classList.add('open')
    trapFocus(cscrim.querySelector('.dlg'))
  }
  
  const closeCustomize = () => {
    if (cscrim.classList.contains('open')) {
      cscrim.classList.remove('open')
      releaseFocus()
    }
  }
  
  cscrim.addEventListener('click', e => {
    if (e.target === cscrim || e.target.closest('.c-close')) closeCustomize()
  })
  
  document.getElementById('cs-save').addEventListener('click', () => {
    setForYouGroups(csDraft
      .filter(g => g.items.length)
      .map(g => ({name: g.name.trim() || 'Untitled group', items: g.items})))
    document
      .querySelectorAll('.side')
      .forEach(side => renderSide(side, {bootToLaunchpad: false}))
    toast({
      tone: 'ok',
      title: 'Sidebar updated',
      body: getForYouGroups().length
        ? `For You now has ${getForYouGroups().length} group${getForYouGroups().length === 1 ? '' : 's'}`
        : 'For You is empty — the icon is hidden until you add a group',
    })
    closeCustomize()
  })

  return {openCustomize, closeCustomize}
}
