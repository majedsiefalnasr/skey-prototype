import {GEO_ROWS} from '../../prototype/fixtures/geography.js'
import {encodeHtml} from '../../core/locale.js'
export function createGeographyPickers({queryId, dataListIcon, geoLocationIcon, layoutGeoFlowPositions, geoFlowLineageCodes, geoDescendantCodes, geoParentPickerScrim, geoHierarchyScrim, trapFocus, releaseFocus}) {
const pageAbort = new AbortController()

const geoParentPickerState = {view: 'tree', expanded: new Set(), excluded: new Set(), flowFocusCode: ''}

// Mirrors hierarchy.js's geoFlowContentSize/geoFlowPanBuffer for this
// pane's own canvas, so centerGeoParentPickerFlow can find the tree's
// actual bounding box (not the empty pan buffer around it) without
// re-deriving layout math it doesn't otherwise need.
const geoParentPickerFlowContentSize = {
          width: 900,
          height: 500,
          buffer: 240,
          contentBounds: {minX: 0, maxX: 900, minY: 0, maxY: 500},
        }
const geoParentPickerFlowPanBufferMin = 240

// See hierarchy.js's geoFlowPanBuffer for why this needs to be at least
// half the viewport on each axis: a tree smaller than the viewport (e.g.
// 3 nodes) otherwise needs a negative scroll position to truly center,
// which the browser clamps to 0 -- landing the view on the buffer's edge
// instead of centered on the tree. No zoom control on this pane, so
// unlike the main flow canvas there's no scale factor to account for.
function geoParentPickerFlowPanBuffer(viewport) {
          return Math.max(
            geoParentPickerFlowPanBufferMin,
            Math.ceil((viewport?.clientWidth || 0) / 2),
            Math.ceil((viewport?.clientHeight || 0) / 2)
          )
        }

function renderGeoParentPickerBranch(parentCode = '', level = 1) {
          return GEO_ROWS.filter(row => row.parentCode === parentCode)
            .map(row => {
              const hasChildren = GEO_ROWS.some(child => child.parentCode === row.code)
              const expanded = geoParentPickerState.expanded.has(row.code)
              const disabled = geoParentPickerState.excluded.has(row.code)
              const children =
                hasChildren && expanded
                  ? `<div class="geo-tree-children" role="group">${renderGeoParentPickerBranch(row.code, level + 1)}</div>`
                  : ''
              const chevronTitle = hasChildren
                ? (expanded ? 'Collapse' : 'Expand') + ` ${row.name}`
                : ''
              const chevron = hasChildren
                ? `<button type="button" class="geo-parent-picker-chevron grid flex-none place-items-center w-5 h-5" data-geo-parent-toggle="${encodeHtml(row.code)}" aria-expanded="${expanded}" aria-label="${encodeHtml(chevronTitle)}" title="${encodeHtml(chevronTitle)}">${dataListIcon('i-caret', 11).replace('<svg', '<svg class="geo-node-chevron"')}</button>`
                : '<span aria-hidden="true" style="width:11px"></span>'
              return `<div class="geo-tree-branch relative grid"><span class="geo-tree-node flex w-full min-h-[42px] gap-2 items-center py-1.5 px-2 rounded-md border border-transparent text-start" role="treeitem" aria-level="${level}"${hasChildren ? ` aria-expanded="${expanded}"` : ''}>${chevron}<button type="button" class="geo-parent-picker-row flex min-w-0 flex-1 items-center text-start" data-geo-parent-pick="${encodeHtml(row.code)}"${disabled ? ' disabled aria-disabled="true" title="Cannot choose a location’s own descendant as its parent"' : ''}><span class="geo-node-copy grid min-w-0 flex-1 gap-px [&_strong]:overflow-hidden [&_strong]:text-ellipsis [&_strong]:whitespace-nowrap [&_small]:overflow-hidden [&_small]:text-ellipsis [&_small]:whitespace-nowrap"><strong class="text-[12.5px] font-semibold">${encodeHtml(row.name)}</strong><small class="text-muted text-xs font-normal">${encodeHtml(row.code)} · ${encodeHtml(row.type)}</small></span></button></span>${children}</div>`
            })
            .join('')
        }

function renderGeoParentPickerTree() {
          const tree = queryId('geo-parent-picker-tree')
          tree.innerHTML =
            renderGeoParentPickerBranch() ||
            `<div class="geo-hierarchy-empty grid min-h-40 place-items-center p-5 text-muted text-[12.5px] text-center">No locations available.</div>`
        }

function renderGeoParentPickerFlow() {
          const canvas = queryId('geo-parent-picker-flow-canvas')
          if (!canvas) return
          const nodeWidth = 156
          const nodeHeight = 58
          const slotWidth = 190
          const levelHeight = 164
          const focusCode = geoParentPickerState.flowFocusCode
          const visibleCodes = focusCode ? geoFlowLineageCodes(focusCode) : null
          const visibleRows = visibleCodes ? GEO_ROWS.filter(row => visibleCodes.has(row.code)) : GEO_ROWS
          const maxLevel = visibleRows.reduce((max, row) => Math.max(max, row.level), 1)
          const {positions, slotCount} = layoutGeoFlowPositions(
            nodeWidth,
            nodeHeight,
            slotWidth,
            levelHeight,
            visibleRows
          )
          const width = Math.max(900, slotCount * slotWidth)
          const height = Math.max(500, 24 + maxLevel * levelHeight + nodeHeight + 24)
          // The tree's own node bounding box, for true centering -- see
          // hierarchy.js's matching comment on why width/height's own
          // asymmetric padding isn't the content's actual visual center.
          const visiblePositions = visibleRows.map(row => positions.get(row.code)).filter(Boolean)
          const contentBounds = visiblePositions.length
            ? {
                minX: Math.min(...visiblePositions.map(p => p.x)),
                maxX: Math.max(...visiblePositions.map(p => p.x)) + nodeWidth,
                minY: Math.min(...visiblePositions.map(p => p.y)),
                maxY: Math.max(...visiblePositions.map(p => p.y)) + nodeHeight,
              }
            : {minX: 0, maxX: width, minY: 0, maxY: height}
          const connectors = visibleRows
            .filter(row => row.parentCode && positions.has(row.parentCode))
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
          const nodes = visibleRows.map(row => {
            const position = positions.get(row.code)
            const disabled = geoParentPickerState.excluded.has(row.code)
            const focused = row.code === focusCode
            return `<div class="geo-flow-node-group" style="position:absolute;left:${position.x}px;top:${position.y}px"><button class="geo-flow-node" type="button" data-geo-parent-pick="${encodeHtml(row.code)}"${disabled ? ' disabled aria-disabled="true" title="Cannot choose a location’s own descendant as its parent"' : ''} aria-label="Choose ${encodeHtml(row.name)} as parent">${geoLocationIcon(row.type, 16)}<span><strong>${encodeHtml(row.name)}</strong><small>${encodeHtml(row.code)} · ${encodeHtml(row.type)}</small></span></button><span class="geo-flow-node-actions" role="group" aria-label="${encodeHtml(row.name)} actions"><button type="button" data-geo-parent-picker-focus="${encodeHtml(row.code)}" aria-pressed="${focused}" title="${focused ? 'Showing only this tree' : 'Focus this tree'}" aria-label="${focused ? `Stop focusing ${encodeHtml(row.name)}` : `Focus ${encodeHtml(row.name)}`}"><svg width="13" height="13" aria-hidden="true"><use href="#i-target" /></svg></button></span></div>`
          }).join('')
          // Same pan-buffer treatment as the main flow canvas's
          // renderGeoFlow, so dragging can scroll past the tree's edges
          // into blank space here too.
          const buffer = geoParentPickerFlowPanBuffer(queryId('geo-parent-picker-flow-viewport'))
          const paddedWidth = width + buffer * 2
          const paddedHeight = height + buffer * 2
          canvas.style.width = `${paddedWidth}px`
          canvas.style.height = `${paddedHeight}px`
          canvas.innerHTML = `<div class="geo-flow-surface" style="--geo-flow-scale:1;width:${paddedWidth}px;height:${paddedHeight}px"><div style="position:absolute;left:${buffer}px;top:${buffer}px;width:${width}px;height:${height}px"><svg class="geo-flow-connectors" style="width:${width}px;height:${height}px" viewBox="0 0 ${width} ${height}" aria-hidden="true">${connectors}</svg>${nodes}</div></div>`
          geoParentPickerFlowContentSize.width = width
          geoParentPickerFlowContentSize.height = height
          geoParentPickerFlowContentSize.buffer = buffer
          geoParentPickerFlowContentSize.contentBounds = contentBounds
          const focusChipMount = queryId('geo-parent-picker-flow-focus-chip-mount')
          if (focusChipMount) {
            const focusRow = focusCode ? GEO_ROWS.find(row => row.code === focusCode) : null
            focusChipMount.innerHTML = focusRow
              ? `<span class="geo-flow-focus-chip"><span title="Focused: ${encodeHtml(focusRow.name)}">Focused: ${encodeHtml(focusRow.name)}</span><button type="button" data-geo-parent-picker-unfocus aria-label="Show full tree"><svg width="12" height="12" aria-hidden="true"><use href="#i-x" /></svg></button></span>`
              : ''
          }
        }

// Scrolls so the tree's own content box (not the empty pan buffer around
// it) is centered in the viewport -- this pane has no zoom/Fit control, so
// unlike hierarchy.js's centerGeoFlow there's no scale factor to apply.
function centerGeoParentPickerFlow() {
          const viewport = queryId('geo-parent-picker-flow-viewport')
          if (!viewport) return
          const bounds = geoParentPickerFlowContentSize.contentBounds
          const contentCenterX = geoParentPickerFlowContentSize.buffer + (bounds.minX + bounds.maxX) / 2
          const contentCenterY = geoParentPickerFlowContentSize.buffer + (bounds.minY + bounds.maxY) / 2
          // geoParentPickerFlowPanBuffer sized this render's buffer to at
          // least half the viewport on each axis, so these targets never
          // go negative -- no Math.max(0, ...) clamp needed. contentBounds
          // (not width/height/2) is the tree's own actual node bounding
          // box -- width/height pad asymmetrically for layout purposes.
          viewport.scrollTo({
            left: contentCenterX - viewport.clientWidth / 2,
            top: contentCenterY - viewport.clientHeight / 2,
            behavior: 'smooth',
          })
        }

function setGeoParentPickerView(view) {
          if (!['tree', 'flow'].includes(view)) return
          geoParentPickerState.view = view
          document.querySelectorAll('[data-geo-parent-picker-view]').forEach(tab => {
            const active = tab.dataset.geoParentPickerView === view
            tab.setAttribute('aria-selected', String(active))
          })
          queryId('geo-parent-picker-tree-pane').hidden = view !== 'tree'
          queryId('geo-parent-picker-flow-pane').hidden = view !== 'flow'
          if (view === 'flow') {
            renderGeoParentPickerFlow()
            // Auto-center on first entering Flow (and every switch back to
            // it), instead of leaving the viewport scrolled to (0,0) --
            // which now shows the empty pan buffer, not the tree.
            requestAnimationFrame(centerGeoParentPickerFlow)
          }
        }

let geoHierarchyDialogHome = null

let geoHierarchyRefreshHome = null

let geoHierarchyTitleHome = null

function openGeoHierarchyDialog() {
          const panel = queryId('geo-hierarchy-panel')
          const mount = queryId('geo-hierarchy-dialog-mount')
          const refresh = panel?.querySelector('.geo-tree-refresh')
          const actionsMount = queryId('geo-hierarchy-dialog-actions-mount')
          const title = panel?.querySelector('.geo-tree-header > div:first-child')
          const titleMount = queryId('geo-hierarchy-dialog-title-mount')
          if (!panel || !mount) return
          geoHierarchyDialogHome = {parent: panel.parentElement, next: panel.nextSibling}
          mount.appendChild(panel)
          if (refresh && actionsMount) {
            geoHierarchyRefreshHome = {parent: refresh.parentElement, next: refresh.nextSibling}
            actionsMount.appendChild(refresh)
          }
          if (title && titleMount) {
            geoHierarchyTitleHome = {parent: title.parentElement, next: title.nextSibling}
            titleMount.appendChild(title)
          }
          geoHierarchyScrim.classList.add('open')
          trapFocus(geoHierarchyScrim.querySelector('.dlg'))
        }

function closeGeoHierarchyDialog() {
          const panel = queryId('geo-hierarchy-panel')
          const refresh = queryId(
            'geo-hierarchy-dialog-actions-mount'
          )?.firstElementChild
          if (refresh && geoHierarchyRefreshHome) {
            geoHierarchyRefreshHome.parent.insertBefore(refresh, geoHierarchyRefreshHome.next)
          }
          geoHierarchyRefreshHome = null
          const title = queryId(
            'geo-hierarchy-dialog-title-mount'
          )?.firstElementChild
          if (title && geoHierarchyTitleHome) {
            geoHierarchyTitleHome.parent.insertBefore(title, geoHierarchyTitleHome.next)
          }
          geoHierarchyTitleHome = null
          if (panel && geoHierarchyDialogHome) {
            geoHierarchyDialogHome.parent.insertBefore(panel, geoHierarchyDialogHome.next)
          }
          geoHierarchyDialogHome = null
          geoHierarchyScrim.classList.remove('open')
          releaseFocus()
        }

function openGeoParentPicker() {
          const currentCode = queryId('geo-field-code').value
          geoParentPickerState.excluded = currentCode
            ? new Set([currentCode, ...geoDescendantCodes(currentCode)])
            : new Set()
          geoParentPickerState.expanded = new Set(
            GEO_ROWS.map(row => row.parentCode).filter(Boolean)
          )
          setGeoParentPickerView('tree')
          renderGeoParentPickerTree()
          geoParentPickerScrim.classList.add('open')
          trapFocus(geoParentPickerScrim.querySelector('.dlg'))
        }

function closeGeoParentPicker() {
          geoParentPickerScrim.classList.remove('open')
          releaseFocus()
        }

function chooseGeoParent(code) {
          const select = queryId('geo-field-parent')
          select.value = code || ''
          select.dispatchEvent(new Event('change', {bubbles: true}))
          closeGeoParentPicker()
        }
geoHierarchyScrim.addEventListener('click', event => {
          if (
            event.target === geoHierarchyScrim ||
            event.target.closest('.geo-hierarchy-dialog-close')
          ) {
            closeGeoHierarchyDialog()
          }
        }, {signal: pageAbort.signal})

geoParentPickerScrim.addEventListener('click', event => {
          const view = event.target.closest('[data-geo-parent-picker-view]')
          if (view) {
            setGeoParentPickerView(view.dataset.geoParentPickerView)
            return
          }
          const toggle = event.target.closest('[data-geo-parent-toggle]')
          if (toggle) {
            const code = toggle.dataset.geoParentToggle
            if (geoParentPickerState.expanded.has(code)) geoParentPickerState.expanded.delete(code)
            else geoParentPickerState.expanded.add(code)
            renderGeoParentPickerTree()
            return
          }
          if (event.target.closest('[data-geo-parent-picker-flow-center]')) {
            centerGeoParentPickerFlow()
            return
          }
          const focusToggle = event.target.closest('[data-geo-parent-picker-focus]')
          if (focusToggle) {
            const code = focusToggle.dataset.geoParentPickerFocus
            geoParentPickerState.flowFocusCode = geoParentPickerState.flowFocusCode === code ? '' : code
            renderGeoParentPickerFlow()
            // The focused subtree's content size changes entirely -- re-
            // center instead of leaving the scroll wherever the previous
            // (differently sized) content had it.
            centerGeoParentPickerFlow()
            return
          }
          if (event.target.closest('[data-geo-parent-picker-unfocus]')) {
            geoParentPickerState.flowFocusCode = ''
            renderGeoParentPickerFlow()
            centerGeoParentPickerFlow()
            return
          }
          const pick = event.target.closest('[data-geo-parent-pick]')
          if (pick) {
            if (!pick.disabled) chooseGeoParent(pick.dataset.geoParentPick)
            return
          }
          if (event.target.closest('.geo-parent-picker-root')) {
            chooseGeoParent('')
            return
          }
          if (
            event.target === geoParentPickerScrim ||
            event.target.closest('.geo-parent-picker-close')
          ) {
            closeGeoParentPicker()
          }
        }, {signal: pageAbort.signal})
return {dispose: () => pageAbort.abort(), renderGeoParentPickerBranch, renderGeoParentPickerTree, renderGeoParentPickerFlow, setGeoParentPickerView, openGeoHierarchyDialog, closeGeoHierarchyDialog, openGeoParentPicker, closeGeoParentPicker, chooseGeoParent}
}
