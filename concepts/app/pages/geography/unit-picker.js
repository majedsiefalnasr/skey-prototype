import {enableFlowPan} from './hierarchy.js'
import {encodeHtml} from '../../core/locale.js'
import {UNIT_ROWS} from '../../prototype/fixtures/customers.js'

/** Owns unit picker state and its DOM bindings. */
export function createUnitPicker({trapFocus, releaseFocus, dataListIcon} = {}) {
  const unitPickerState = {view: 'tree', expanded: new Set(), targetSelectId: ''}

  function renderUnitPickerBranch(parentCode = '', level = 1) {
    return UNIT_ROWS.filter(row => row.parentCode === parentCode)
      .map(row => {
        const hasChildren = UNIT_ROWS.some(child => child.parentCode === row.code)
        const expanded = unitPickerState.expanded.has(row.code)
        const children =
          hasChildren && expanded
            ? `<div class="geo-tree-children" role="group">${renderUnitPickerBranch(row.code, level + 1)}</div>`
            : ''
        const chevronTitle = hasChildren
          ? (expanded ? 'Collapse' : 'Expand') + ` ${row.name}`
          : ''
        const chevron = hasChildren
          ? `<button type="button" class="geo-parent-picker-chevron" data-unit-toggle="${encodeHtml(row.code)}" aria-expanded="${expanded}" aria-label="${encodeHtml(chevronTitle)}" title="${encodeHtml(chevronTitle)}">${dataListIcon('i-caret', 11).replace('<svg', '<svg class="geo-node-chevron"')}</button>`
          : '<span aria-hidden="true" style="width:11px"></span>'
        return `<div class="geo-tree-branch"><span class="geo-tree-node" role="treeitem" aria-level="${level}"${hasChildren ? ` aria-expanded="${expanded}"` : ''}>${chevron}<button type="button" class="geo-parent-picker-row" data-unit-pick="${encodeHtml(row.code)}"><span class="geo-node-copy"><strong>${encodeHtml(row.name)}</strong><small>${row.status}</small></span></button></span>${children}</div>`
      })
      .join('')
  }

  function renderUnitPickerTree() {
    const tree = document.getElementById('unit-picker-tree')
    tree.innerHTML =
      renderUnitPickerBranch() || `<div class="geo-hierarchy-empty">No units available.</div>`
  }

  function layoutUnitFlowPositions(rows, nodeWidth, slotWidth, levelHeight) {
    const childrenByParent = new Map()
    rows.forEach(row => {
      const key = row.parentCode || ''
      const siblings = childrenByParent.get(key) || []
      siblings.push(row)
      childrenByParent.set(key, siblings)
    })
    const roots = childrenByParent.get('') || []
    const positions = new Map()
    let nextSlot = 0
    const place = (row, level) => {
      const children = childrenByParent.get(row.code) || []
      let centerSlot
      if (children.length) {
        const firstSlot = nextSlot
        children.forEach(child => place(child, level + 1))
        const lastSlot = nextSlot - 1
        centerSlot = (firstSlot + lastSlot) / 2
      } else {
        centerSlot = nextSlot
        nextSlot += 1
      }
      positions.set(row.code, {
        x: Math.round(centerSlot * slotWidth + slotWidth / 2 - nodeWidth / 2),
        y: 24 + level * levelHeight,
      })
      return centerSlot
    }
    roots.forEach(row => place(row, 0))
    return {positions, slotCount: Math.max(nextSlot, 1)}
  }

  function renderUnitPickerFlow() {
    const canvas = document.getElementById('unit-picker-flow-canvas')
    if (!canvas) return
    const nodeWidth = 156
    const nodeHeight = 58
    const slotWidth = 190
    const levelHeight = 164
    const maxLevel = UNIT_ROWS.reduce((max, row) => Math.max(max, row.level), 1)
    const {positions, slotCount} = layoutUnitFlowPositions(
      UNIT_ROWS,
      nodeWidth,
      slotWidth,
      levelHeight
    )
    const width = Math.max(900, slotCount * slotWidth)
    const height = Math.max(500, 24 + maxLevel * levelHeight + nodeHeight + 24)
    const connectors = UNIT_ROWS.filter(row => row.parentCode)
      .map(row => {
        const parent = positions.get(row.parentCode)
        const child = positions.get(row.code)
        if (!parent || !child) return ''
        const fromX = parent.x + nodeWidth / 2
        const fromY = parent.y + nodeHeight
        const toX = child.x + nodeWidth / 2
        const toY = child.y
        const middleY = Math.round((fromY + toY) / 2)
        return `<path d="M ${fromX} ${fromY} C ${fromX} ${middleY}, ${toX} ${middleY}, ${toX} ${toY}" />`
      })
      .join('')
    const nodes = UNIT_ROWS.map(row => {
      const position = positions.get(row.code)
      return `<button class="geo-flow-node" type="button" data-unit-pick="${encodeHtml(row.code)}" style="left:${position.x}px;top:${position.y}px" aria-label="Choose ${encodeHtml(row.name)}">${dataListIcon('i-flow', 16)}<span><strong>${encodeHtml(row.name)}</strong><small>${row.status}</small></span></button>`
    }).join('')
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    canvas.innerHTML = `<div class="geo-flow-surface" style="--geo-flow-scale:1;width:${width}px;height:${height}px"><svg class="geo-flow-connectors" style="width:${width}px;height:${height}px" viewBox="0 0 ${width} ${height}" aria-hidden="true">${connectors}</svg>${nodes}</div>`
  }

  function setUnitPickerView(view) {
    if (!['tree', 'flow'].includes(view)) return
    unitPickerState.view = view
    document.querySelectorAll('[data-unit-picker-view]').forEach(tab => {
      const active = tab.dataset.unitPickerView === view
      tab.setAttribute('aria-selected', String(active))
    })
    document.getElementById('unit-picker-tree-pane').hidden = view !== 'tree'
    document.getElementById('unit-picker-flow-pane').hidden = view !== 'flow'
    if (view === 'flow') renderUnitPickerFlow()
  }

  function openUnitPicker(targetSelectId) {
    unitPickerState.targetSelectId = targetSelectId
    unitPickerState.expanded = new Set(UNIT_ROWS.map(row => row.parentCode).filter(Boolean))
    setUnitPickerView('tree')
    renderUnitPickerTree()
    unitPickerScrim.classList.add('open')
    trapFocus(unitPickerScrim.querySelector('.customer-modal'))
  }

  function closeUnitPicker() {
    unitPickerScrim.classList.remove('open')
    releaseFocus()
  }

  function chooseUnit(code) {
    const select = document.getElementById(unitPickerState.targetSelectId)
    if (select) {
      const unit = UNIT_ROWS.find(row => row.code === code)
      const value = unit ? `${unit.code} - ${unit.name}` : ''
      if (value && ![...select.options].some(option => option.value === value)) {
        select.add(new Option(value, value))
      }
      select.value = value
      select.dispatchEvent(new Event('change', {bubbles: true}))
    }
    closeUnitPicker()
  }

  const unitPickerScrim = document.getElementById('unit-picker-scrim')

  unitPickerScrim.addEventListener('click', event => {
    const view = event.target.closest('[data-unit-picker-view]')
    if (view) {
      setUnitPickerView(view.dataset.unitPickerView)
      return
    }
    const toggle = event.target.closest('[data-unit-toggle]')
    if (toggle) {
      const code = toggle.dataset.unitToggle
      if (unitPickerState.expanded.has(code)) unitPickerState.expanded.delete(code)
      else unitPickerState.expanded.add(code)
      renderUnitPickerTree()
      return
    }
    const pick = event.target.closest('[data-unit-pick]')
    if (pick) {
      chooseUnit(pick.dataset.unitPick)
      return
    }
    if (event.target.closest('.unit-picker-root')) {
      chooseUnit('')
      return
    }
    if (event.target === unitPickerScrim || event.target.closest('.unit-picker-close')) {
      closeUnitPicker()
    }
  })

  document.addEventListener('click', event => {
    const opener = event.target.closest('[data-unit-picker-open]')
    if (opener) openUnitPicker(opener.dataset.unitPickerOpen)
  })

  enableFlowPan('unit-picker-flow-viewport')

  return {closeUnitPicker, unitPickerScrim}
}
