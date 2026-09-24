import {GEO_ROWS} from '../../prototype/fixtures/geography.js'
import {encodeHtml} from '../../core/locale.js'
export function createGeographyHierarchy({geoState, queryId, dataListIcon, geoHierarchyMediaQuery, renderGeoRecord, openGeoHierarchyDialog}) {
const pageAbort = new AbortController()

const geoFlowContentSize = {
          width: 800,
          height: 800,
          buffer: 240,
          contentBounds: {minX: 0, maxX: 800, minY: 0, maxY: 800},
        }

// Minimum empty margin of canvas kept around the tree's own bounding box
// on every side, so dragging can scroll past the content's edges into
// blank space (free panning) instead of stopping exactly at it.
const geoFlowPanBufferMin = 240

// The buffer actually used for a render: at least geoFlowPanBufferMin, but
// never smaller than half the viewport's own size *in canvas-space* (the
// viewport's real pixel size divided by zoom scale, since the buffer is a
// canvas-space value that gets multiplied by scale again later when
// canvas.style.width is set). A tree narrower/shorter than the viewport
// (e.g. 3 nodes on a wide split pane, or any tree at a zoomed-out scale)
// needs a buffer at least that big on each side, or else centering it
// would need a negative scroll position -- which the browser clamps to 0,
// landing the view on the buffer's edge instead of centered on the (small)
// tree. Doubling ensures the "ideal" (unclamped) center-scroll math in
// centerGeoFlow is always achievable.
function geoFlowPanBuffer(viewport, scale) {
          const safeScale = scale > 0 ? scale : 1
          return Math.max(
            geoFlowPanBufferMin,
            Math.ceil((viewport?.clientWidth || 0) / safeScale / 2),
            Math.ceil((viewport?.clientHeight || 0) / safeScale / 2)
          )
        }

function geoLocationIcon(type, size = 14) {
          const icon =
            type === 'Country'
              ? 'i-home'
              : type === 'Governorate'
                ? 'i-flow'
                : type === 'City'
                  ? 'i-panel'
                  : 'i-location'
          return dataListIcon(icon, size)
        }

function geoTreeRowMatches(row, query) {
          if (!query) return true
          const searchable = `${row.code} ${row.name} ${row.type}`.toLocaleLowerCase()
          if (searchable.includes(query)) return true
          return GEO_ROWS.filter(child => child.parentCode === row.code).some(child =>
            geoTreeRowMatches(child, query)
          )
        }

function renderGeoTreeBranch(parentCode = '', level = 1) {
          const query = geoState.treeQuery.trim().toLocaleLowerCase()
          return GEO_ROWS.filter(
            row => row.parentCode === parentCode && geoTreeRowMatches(row, query)
          )
            .map(row => {
              const hasChildren = GEO_ROWS.some(child => child.parentCode === row.code)
              const expanded = Boolean(query) || geoState.expanded.has(row.code)
              const children =
                hasChildren && expanded
                  ? `<div class="geo-tree-children" role="group">${renderGeoTreeBranch(row.code, level + 1)}</div>`
                  : ''
              const chevronTitle = hasChildren
                ? expanded
                  ? `Collapse ${row.name}`
                  : `Expand ${row.name}`
                : ''
              const chevron = hasChildren
                ? dataListIcon('i-caret', 11)
                    .replace('<svg', '<svg class="geo-node-chevron"')
                    .replace('<svg', `<svg role="img" aria-label="${encodeHtml(chevronTitle)}"`)
                : '<span aria-hidden="true" style="width:11px"></span>'
              return `<div class="geo-tree-branch relative grid"><button class="geo-tree-node flex w-full min-h-[42px] gap-2 items-center py-1.5 px-2 rounded-md border border-transparent text-start" type="button" role="treeitem" data-geo-node="${encodeHtml(row.code)}"${hasChildren ? ' data-geo-toggle-branch' : ''} aria-level="${level}" aria-current="${row.code === geoState.code}"${hasChildren ? ` aria-expanded="${expanded}" title="${encodeHtml(chevronTitle)}"` : ''}>${chevron}<span class="geo-node-copy grid min-w-0 flex-1 gap-px [&_strong]:overflow-hidden [&_strong]:text-ellipsis [&_strong]:whitespace-nowrap [&_small]:overflow-hidden [&_small]:text-ellipsis [&_small]:whitespace-nowrap"><strong class="text-[12.5px] font-semibold">${encodeHtml(row.name)}</strong><small class="text-muted text-xs font-normal">${encodeHtml(row.code)} · ${encodeHtml(row.type)}</small></span></button>${children}</div>`
            })
            .join('')
        }

function renderGeoTree() {
          const tree = queryId('geo-tree')
          const markup = renderGeoTreeBranch()
          tree.innerHTML =
            markup ||
            `<div class="geo-hierarchy-empty grid min-h-40 place-items-center p-5 text-muted text-[12.5px] text-center">${dataListIcon('i-search', 18)}<span>No locations match “${encodeHtml(geoState.treeQuery)}”.</span></div>`
          const search = queryId('geo-tree-search')
          if (search && search.value !== geoState.treeQuery) search.value = geoState.treeQuery
        }

function layoutGeoFlowPositions(nodeWidth, nodeHeight, slotWidth, levelHeight, rows = GEO_ROWS) {
          const codes = new Set(rows.map(row => row.code))
          const childrenByParent = new Map()
          rows.forEach(row => {
            // A focused subset's root(s) have a parentCode that isn't in the
            // visible set -- treat those as roots here too, so the focused
            // node still lays out at level 0 instead of being dropped for
            // pointing at a parent that was filtered out.
            const key = row.parentCode && codes.has(row.parentCode) ? row.parentCode : ''
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

function geoFlowLineageCodes(code) {
          const lineage = new Set([code])
          const row = GEO_ROWS.find(item => item.code === code)
          let parentCode = row?.parentCode
          while (parentCode) {
            lineage.add(parentCode)
            parentCode = GEO_ROWS.find(item => item.code === parentCode)?.parentCode
          }
          const addDescendants = parent => {
            GEO_ROWS.filter(child => child.parentCode === parent).forEach(child => {
              lineage.add(child.code)
              addDescendants(child.code)
            })
          }
          addDescendants(code)
          return lineage
        }

// Per-node hover toolbar markup shared by the main flow canvas and its
// fullscreen dialog (same DOM, so wiring stays in one delegated click
// handler in geography.js's data-geo-flow-node-action branch). The
// buttons' own click targets are matched with .closest() before the
// node's own click-to-select handler, so pressing one never also selects
// the node underneath it.
function renderGeoFlowNodeActions(row, {focused}) {
          return `<span class="geo-flow-node-actions" role="group" aria-label="${encodeHtml(row.name)} actions">
  <button type="button" data-geo-flow-node-action="modify" data-geo-node-target="${encodeHtml(row.code)}" title="Modify" aria-label="Modify ${encodeHtml(row.name)}"><svg width="13" height="13" aria-hidden="true"><use href="#i-edit" /></svg></button>
  <button type="button" data-geo-flow-node-action="focus" data-geo-node-target="${encodeHtml(row.code)}" aria-pressed="${focused}" title="${focused ? 'Showing only this tree' : 'Focus this tree'}" aria-label="${focused ? `Stop focusing ${encodeHtml(row.name)}` : `Focus ${encodeHtml(row.name)}`}"><svg width="13" height="13" aria-hidden="true"><use href="#i-target" /></svg></button>
  <button type="button" data-geo-flow-node-action="new" data-geo-node-target="${encodeHtml(row.code)}" title="New child location" aria-label="Add a location under ${encodeHtml(row.name)}"><svg width="13" height="13" aria-hidden="true"><use href="#i-plus" /></svg></button>
  <button type="button" data-geo-flow-node-action="delete" data-geo-node-target="${encodeHtml(row.code)}" title="Delete this tree" aria-label="Delete ${encodeHtml(row.name)} and everything under it"><svg width="13" height="13" aria-hidden="true"><use href="#i-trash" /></svg></button>
</span>`
        }

function renderGeoFlow() {
          const canvas = queryId('geo-flow-canvas')
          if (!canvas) return
          const nodeWidth = 156
          const nodeHeight = 58
          const slotWidth = 190
          const levelHeight = 164
          const focusCode = geoState.flowFocusCode
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
          const width = Math.max(800, slotCount * slotWidth + 100)
          const height = Math.max(200, 24 + maxLevel * levelHeight + nodeHeight)
          // The tree's own node bounding box, used for true centering
          // (centerGeoFlow) -- distinct from width/height above, which pad
          // asymmetrically (e.g. +100 only on the right, +24 top margin
          // with no matching bottom margin) for layout/Fit purposes, not
          // for finding the content's actual visual center.
          const visiblePositions = visibleRows.map(row => positions.get(row.code)).filter(Boolean)
          const contentBounds = visiblePositions.length
            ? {
                minX: Math.min(...visiblePositions.map(p => p.x)),
                maxX: Math.max(...visiblePositions.map(p => p.x)) + nodeWidth,
                minY: Math.min(...visiblePositions.map(p => p.y)),
                maxY: Math.max(...visiblePositions.map(p => p.y)) + nodeHeight,
              }
            : {minX: 0, maxX: width, minY: 0, maxY: height}
          const lineage = geoState.code ? geoFlowLineageCodes(geoState.code) : null
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
              const dimmed = lineage && !(lineage.has(row.code) && lineage.has(row.parentCode))
              return `<path class="${dimmed ? 'is-dimmed' : ''}" d="M ${fromX} ${fromY} C ${fromX} ${middleY}, ${toX} ${middleY}, ${toX} ${toY}" />`
            })
            .join('')
          const nodes = visibleRows.map(row => {
            const position = positions.get(row.code)
            const dimmed = lineage && !lineage.has(row.code)
            // Wrapped in its own positioned group (not the .geo-flow-node
            // button itself) because the hover toolbar's buttons can't nest
            // inside the node's own <button> -- invalid HTML, and it would
            // make every toolbar click also fire the node's own click-to-
            // select handler. The wrapper carries the position:absolute
            // placement instead; .geo-flow-node itself no longer needs it.
            return `<div class="geo-flow-node-group${dimmed ? ' is-dimmed' : ''}" style="position:absolute;left:${position.x}px;top:${position.y}px"><button class="geo-flow-node" type="button" data-geo-node="${encodeHtml(row.code)}" aria-current="${row.code === geoState.code}" aria-label="View ${encodeHtml(row.name)}">${geoLocationIcon(row.type, 16)}<span><strong>${encodeHtml(row.name)}</strong><small>${encodeHtml(row.code)} · ${encodeHtml(row.type)}</small></span></button>${renderGeoFlowNodeActions(row, {focused: row.code === focusCode})}</div>`
          }).join('')
          // Scrollable region is content + a pan buffer on every side
          // (free panning past the tree's own edges); the actual tree
          // content sits inset by that buffer inside .geo-flow-surface
          // rather than shifting every node/connector coordinate. The
          // buffer is sized to this viewport (see geoFlowPanBuffer) and
          // stored so centerGeoFlow can find the tree's true center
          // without recomputing it against a possibly-resized viewport.
          const buffer = geoFlowPanBuffer(queryId('geo-flow-viewport'), geoState.flowScale)
          const paddedWidth = width + buffer * 2
          const paddedHeight = height + buffer * 2
          const scaledWidth = Math.round(paddedWidth * geoState.flowScale)
          const scaledHeight = Math.round(paddedHeight * geoState.flowScale)
          canvas.style.width = `${scaledWidth}px`
          canvas.style.height = `${scaledHeight}px`
          canvas.innerHTML = `<div class="geo-flow-surface" style="--geo-flow-scale:${geoState.flowScale};width:${paddedWidth}px;height:${paddedHeight}px"><div style="position:absolute;left:${buffer}px;top:${buffer}px;width:${width}px;height:${height}px"><svg class="geo-flow-connectors" style="width:${width}px;height:${height}px" viewBox="0 0 ${width} ${height}" aria-hidden="true">${connectors}</svg>${nodes}</div></div>`
          const zoom = queryId('geo-flow-zoom-value')
          if (zoom) zoom.textContent = `${Math.round(geoState.flowScale * 100)}%`
          const focusChipMount = queryId('geo-flow-focus-chip-mount')
          if (focusChipMount) {
            const focusRow = focusCode ? GEO_ROWS.find(row => row.code === focusCode) : null
            focusChipMount.innerHTML = focusRow
              ? `<span class="geo-flow-focus-chip"><span title="Focused: ${encodeHtml(focusRow.name)}">Focused: ${encodeHtml(focusRow.name)}</span><button type="button" data-geo-flow-unfocus aria-label="Show full tree"><svg width="12" height="12" aria-hidden="true"><use href="#i-x" /></svg></button></span>`
              : ''
          }
          geoFlowContentSize.width = width
          geoFlowContentSize.height = height
          geoFlowContentSize.buffer = buffer
          geoFlowContentSize.contentBounds = contentBounds
        }

function syncGeoHierarchyView() {
          document.querySelectorAll('[data-geo-view]').forEach(tab => {
            const active = tab.dataset.geoView === geoState.hierarchyView
            tab.setAttribute('aria-selected', String(active))
            tab.tabIndex = active ? 0 : -1
          })
          const treePane = queryId('geo-tree-pane')
          const flowPane = queryId('geo-flow-pane')
          treePane.hidden = geoState.hierarchyView !== 'tree'
          flowPane.hidden = geoState.hierarchyView !== 'flow'
          document
            .getElementById('geo-workspace')
            ?.classList.toggle('flow-view', geoState.hierarchyView === 'flow')
          if (!flowPane.hidden) renderGeoFlow()
        }

function selectGeoTreeNode(node) {
          if (node.matches('[data-geo-toggle-branch]')) {
            if (geoState.expanded.has(node.dataset.geoNode))
              geoState.expanded.delete(node.dataset.geoNode)
            else geoState.expanded.add(node.dataset.geoNode)
          }
          geoState.code = node.dataset.geoNode
          renderGeoRecord()
        }

function toggleGeoTreePanel(toggleButton) {
          if (geoHierarchyMediaQuery.matches) {
            openGeoHierarchyDialog()
            return
          }
          const workspace = queryId('geo-workspace')
          const collapsed = workspace.classList.toggle('tree-collapsed')
          toggleButton.setAttribute('aria-pressed', String(collapsed))
          toggleButton.setAttribute(
            'aria-label',
            collapsed ? 'Expand location hierarchy' : 'Collapse location hierarchy'
          )
          toggleButton.title = collapsed ? 'Expand hierarchy' : 'Collapse hierarchy'
          toggleButton.querySelector('use')?.setAttribute('href', collapsed ? '#i-next' : '#i-prev')
        }

function syncGeoTreePanelToggle() {
          const toggleButton = document.querySelector('[data-geo-tree-collapse]')
          if (!toggleButton) return
          if (geoHierarchyMediaQuery.matches) {
            toggleButton.setAttribute('aria-pressed', 'false')
            toggleButton.setAttribute('aria-label', 'Open location hierarchy')
            toggleButton.title = 'Open location hierarchy'
            toggleButton.querySelector('use')?.setAttribute('href', '#i-next')
            return
          }
          const collapsed = document
            .getElementById('geo-workspace')
            ?.classList.contains('tree-collapsed')
          toggleButton.setAttribute('aria-pressed', String(Boolean(collapsed)))
          toggleButton.setAttribute(
            'aria-label',
            collapsed ? 'Expand location hierarchy' : 'Collapse location hierarchy'
          )
          toggleButton.title = collapsed ? 'Expand hierarchy' : 'Collapse hierarchy'
          toggleButton.querySelector('use')?.setAttribute('href', collapsed ? '#i-next' : '#i-prev')
        }

function setGeoHierarchyView(view) {
          if (!['tree', 'flow'].includes(view)) return
          geoState.hierarchyView = view
          syncGeoHierarchyView()
          if (view === 'flow') {
            requestAnimationFrame(() => {
              queryId('geo-flow-viewport')?.focus()
              // Center on every switch into Flow (not just the first time
              // -- the tree may have changed since the last visit),
              // instead of leaving the viewport scrolled to (0,0), which
              // now shows the empty pan buffer rather than the tree.
              // Deferred a frame: the pane was `hidden` until
              // syncGeoHierarchyView() just above, so viewport.clientWidth/
              // Height would still read 0 if centered synchronously here,
              // which centerGeoFlow's own math would otherwise divide by
              // -- putting the scroll miles off instead of centered.
              centerGeoFlow()
            })
          }
        }

function setGeoFlowScale(scale) {
          geoState.flowScale = Math.min(1.4, Math.max(0.55, scale))
          renderGeoFlow()
        }

// Scrolls so the tree's own content box (not the empty pan buffer around
// it) is centered in the viewport, at the canvas's current zoom scale.
// Shared by the explicit Center action and by fitGeoFlow, since fitting
// the zoom level to the viewport without also centering would otherwise
// leave the view scrolled wherever it happened to be, possibly still
// showing mostly buffer.
function centerGeoFlow() {
          const viewport = queryId('geo-flow-viewport')
          if (!viewport) return
          const scale = geoState.flowScale
          const bounds = geoFlowContentSize.contentBounds
          const contentCenterX = (geoFlowContentSize.buffer + (bounds.minX + bounds.maxX) / 2) * scale
          const contentCenterY = (geoFlowContentSize.buffer + (bounds.minY + bounds.maxY) / 2) * scale
          // geoFlowPanBuffer sized this render's buffer to at least half
          // the viewport on each axis (see its own comment), so these
          // targets never actually go negative -- no Math.max(0, ...)
          // clamp needed, which is what previously pinned small trees to
          // the viewport's inline-start edge instead of true center.
          // contentBounds (not width/height/2) is the tree's own actual
          // node bounding box -- width/height pad asymmetrically for
          // layout purposes and don't represent the visual center.
          viewport.scrollTo({
            left: contentCenterX - viewport.clientWidth / 2,
            top: contentCenterY - viewport.clientHeight / 2,
            behavior: 'smooth',
          })
        }

function fitGeoFlow() {
          const viewport = queryId('geo-flow-viewport')
          if (!viewport) return
          const availableWidth = Math.max(1, viewport.clientWidth - 24)
          const availableHeight = Math.max(1, viewport.clientHeight - 24)
          setGeoFlowScale(
            Math.min(
              1,
              availableWidth / geoFlowContentSize.width,
              availableHeight / geoFlowContentSize.height
            )
          )
          centerGeoFlow()
        }

function isGeoFlowFullscreen() {
          return Boolean(queryId('geo-flow-pane')?.classList.contains('geo-flow-fullscreen'))
        }

function setGeoFlowFullscreen(fullscreen) {
          const pane = queryId('geo-flow-pane')
          const button = document.querySelector('[data-geo-flow-fullscreen]')
          if (!pane) return
          pane.classList.toggle('geo-flow-fullscreen', fullscreen)
          if (button) {
            const label = fullscreen ? 'Exit fullscreen' : 'Fullscreen'
            button.setAttribute('aria-pressed', String(fullscreen))
            button.setAttribute('aria-label', label)
            button.title = label
            button.querySelector('use')?.setAttribute('href', fullscreen ? '#i-collapse' : '#i-expand')
            const textNode = [...button.childNodes].find(
              node => node.nodeType === Node.TEXT_NODE && node.textContent.trim()
            )
            if (textNode) textNode.textContent = ` ${label}`
          }
          requestAnimationFrame(fitGeoFlow)
        }

function toggleGeoFlowFullscreen() {
          setGeoFlowFullscreen(!isGeoFlowFullscreen())
        }
return {dispose: () => pageAbort.abort(), geoLocationIcon, geoTreeRowMatches, renderGeoTreeBranch, renderGeoTree, layoutGeoFlowPositions, geoFlowLineageCodes, renderGeoFlow, syncGeoHierarchyView, selectGeoTreeNode, toggleGeoTreePanel, syncGeoTreePanelToggle, setGeoHierarchyView, setGeoFlowScale, fitGeoFlow, centerGeoFlow, isGeoFlowFullscreen, setGeoFlowFullscreen, toggleGeoFlowFullscreen}
}

        export function enableFlowPan(viewportId) {
          const viewport = document.getElementById(viewportId)
          if (!viewport || viewport.dataset.panEnabled) return
          viewport.dataset.panEnabled = 'true'
          let panning = false
          let dragged = false
          let startX = 0
          let startY = 0
          let startScrollLeft = 0
          let startScrollTop = 0
          viewport.addEventListener('pointerdown', event => {
            // Reset unconditionally, even when bailing out below (e.g. the
            // press started on a button) -- otherwise `dragged` from a
            // previous real drag-scroll stays true forever, since the only
            // other place it's set is inside pointermove (which never
            // fires for a plain click). That stale true then makes the
            // capturing 'click' handler below swallow every subsequent
            // click on the canvas -- including on nodes/buttons -- until
            // another full drag happens to flip it back.
            dragged = false
            if (event.button !== 0 || event.target.closest('button')) return
            panning = true
            startX = event.clientX
            startY = event.clientY
            startScrollLeft = viewport.scrollLeft
            startScrollTop = viewport.scrollTop
            viewport.setPointerCapture(event.pointerId)
          })
          viewport.addEventListener('pointermove', event => {
            if (!panning) return
            const dx = event.clientX - startX
            const dy = event.clientY - startY
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
              dragged = true
              viewport.classList.add('is-panning')
            }
            viewport.scrollLeft = startScrollLeft - dx
            viewport.scrollTop = startScrollTop - dy
          })
          const endPan = event => {
            if (!panning) return
            panning = false
            viewport.classList.remove('is-panning')
            if (dragged) viewport.releasePointerCapture(event.pointerId)
          }
          viewport.addEventListener('pointerup', endPan)
          viewport.addEventListener('pointercancel', endPan)
          viewport.addEventListener(
            'click',
            event => {
              if (dragged) {
                event.stopPropagation()
                event.preventDefault()
              }
            },
            true
          )
        }
