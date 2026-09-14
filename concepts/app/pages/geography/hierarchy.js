import {GEO_ROWS} from '../../prototype/fixtures/geography.js'
import {encodeHtml} from '../../core/locale.js'
export function createGeographyHierarchy({geoState, queryId, dataListIcon, geoHierarchyMediaQuery, renderGeoRecord, openGeoHierarchyDialog}) {
const pageAbort = new AbortController()

const geoFlowContentSize = {width: 800, height: 800}

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
              return `<div class="geo-tree-branch"><button class="geo-tree-node" type="button" role="treeitem" data-geo-node="${encodeHtml(row.code)}"${hasChildren ? ' data-geo-toggle-branch' : ''} aria-level="${level}" aria-current="${row.code === geoState.code}"${hasChildren ? ` aria-expanded="${expanded}" title="${encodeHtml(chevronTitle)}"` : ''}>${chevron}<span class="geo-node-copy"><strong>${encodeHtml(row.name)}</strong><small>${encodeHtml(row.code)} · ${encodeHtml(row.type)}</small></span></button>${children}</div>`
            })
            .join('')
        }

function renderGeoTree() {
          const tree = queryId('geo-tree')
          const markup = renderGeoTreeBranch()
          tree.innerHTML =
            markup ||
            `<div class="geo-hierarchy-empty">${dataListIcon('i-search', 18)}<span>No locations match “${encodeHtml(geoState.treeQuery)}”.</span></div>`
          const search = queryId('geo-tree-search')
          if (search && search.value !== geoState.treeQuery) search.value = geoState.treeQuery
        }

function layoutGeoFlowPositions(nodeWidth, nodeHeight, slotWidth, levelHeight) {
          const childrenByParent = new Map()
          GEO_ROWS.forEach(row => {
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

function renderGeoFlow() {
          const canvas = queryId('geo-flow-canvas')
          if (!canvas) return
          const nodeWidth = 156
          const nodeHeight = 58
          const slotWidth = 190
          const levelHeight = 164
          const maxLevel = GEO_ROWS.reduce((max, row) => Math.max(max, row.level), 1)
          const {positions, slotCount} = layoutGeoFlowPositions(
            nodeWidth,
            nodeHeight,
            slotWidth,
            levelHeight
          )
          const width = Math.max(800, slotCount * slotWidth + 100)
          const height = Math.max(200, 24 + maxLevel * levelHeight + nodeHeight)
          const connectors = GEO_ROWS.filter(row => row.parentCode)
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
          const nodes = GEO_ROWS.map(row => {
            const position = positions.get(row.code)
            return `<button class="geo-flow-node" type="button" data-geo-node="${encodeHtml(row.code)}" aria-current="${row.code === geoState.code}" style="left:${position.x}px;top:${position.y}px" aria-label="View ${encodeHtml(row.name)}">${geoLocationIcon(row.type, 16)}<span><strong>${encodeHtml(row.name)}</strong><small>${encodeHtml(row.code)} · ${encodeHtml(row.type)}</small></span></button>`
          }).join('')
          const scaledWidth = Math.round(width * geoState.flowScale)
          const scaledHeight = Math.round(height * geoState.flowScale)
          canvas.style.width = `${scaledWidth}px`
          canvas.style.height = `${scaledHeight}px`
          canvas.innerHTML = `<div class="geo-flow-surface" style="--geo-flow-scale:${geoState.flowScale};width:${width}px;height:${height}px"><svg class="geo-flow-connectors" style="width:${width}px;height:${height}px" viewBox="0 0 ${width} ${height}" aria-hidden="true">${connectors}</svg>${nodes}</div>`
          const zoom = queryId('geo-flow-zoom-value')
          if (zoom) zoom.textContent = `${Math.round(geoState.flowScale * 100)}%`
          geoFlowContentSize.width = width
          geoFlowContentSize.height = height
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
          if (view === 'flow')
            requestAnimationFrame(() => queryId('geo-flow-viewport')?.focus())
        }

function setGeoFlowScale(scale) {
          geoState.flowScale = Math.min(1.4, Math.max(0.55, scale))
          renderGeoFlow()
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
          viewport.scrollTo({top: 0, left: 0, behavior: 'smooth'})
        }
return {dispose: () => pageAbort.abort(), geoLocationIcon, geoTreeRowMatches, renderGeoTreeBranch, renderGeoTree, layoutGeoFlowPositions, renderGeoFlow, syncGeoHierarchyView, selectGeoTreeNode, toggleGeoTreePanel, syncGeoTreePanelToggle, setGeoHierarchyView, setGeoFlowScale, fitGeoFlow}
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
            if (event.button !== 0 || event.target.closest('button')) return
            panning = true
            dragged = false
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
