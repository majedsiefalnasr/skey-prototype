import {createGeographyPickers} from './pickers.js'
import {createGeographyHierarchy, enableFlowPan} from './hierarchy.js'
import {GEO_ROWS} from '../../prototype/fixtures/geography.js'
import {encodeHtml} from '../../core/locale.js'

export function createGeography({root, getList, t, dataListIcon, trapFocus, releaseFocus, toast, showContentView, renderGeoList, openNewDataListRecord, openPrintSettings, openAdvancedSearch}) {
const pageAbort = new AbortController()

const geoParentPickerScrim = document.getElementById('geo-parent-picker-scrim')
const geoHierarchyScrim = document.getElementById('geo-hierarchy-scrim')
const queryId = id => root.querySelector('#' + CSS.escape(id)) || geoParentPickerScrim.querySelector('#' + CSS.escape(id)) || geoHierarchyScrim.querySelector('#' + CSS.escape(id)) || document.getElementById(id)
const geoState = {
          code: 'CAI',
          mode: 'view',
          expanded: new Set(['EG', 'CAI']),
          hierarchyView: 'tree',
          treeQuery: '',
          flowScale: 1,
          flowFocusCode: '',
        }





























function renderGeoRecordChrome(row) {
          const editing = geoState.mode !== 'view'
          const title = geoState.mode === 'create' ? t('New Location') : encodeHtml(row.name)
          const actions = editing
            ? `<button class="lbtn pri" type="button" data-geo-record-action="save">${dataListIcon('i-save')} ${t('Save')}</button><button class="lbtn out" type="button" data-geo-record-action="undo">${dataListIcon('i-undo')} ${t('Undo')}</button>`
            : `<button class="lbtn pri" type="button" data-geo-record-action="modify">${dataListIcon('i-edit')} ${t('Modify')}</button><button class="lbtn out" type="button" data-geo-record-action="new">${dataListIcon('i-plus')} ${t('New')}</button><span class="menu relative inline-flex [flex:none]"><button class="ibtn" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="${t('More actions', 'More actions')}">${dataListIcon('i-dots')}</button><div class="mlist mend" role="menu"><button role="menuitem" type="button" class="dan" data-geo-record-action="delete">${dataListIcon('i-trash', 14)} ${t('Delete')}</button></div></span>`
          queryId('geo-record-chrome').innerHTML = `
    <div class="arow customer-arow [.d1_&]:flex [.d1_&]:items-center [.d1_&]:gap-1 [.d1_&]:[padding:7px_16px] [.d1_&]:[border-bottom:1px_solid_var(--line)] [.d1_&]:bg-surface [.d1_&]:flex-wrap" role="toolbar" aria-label="Location toolbar">
      <div class="menu"><button type="button" aria-haspopup="menu" aria-expanded="false">${t('Record')} ${dataListIcon('i-caret', 12)}</button><div class="mlist" role="menu"><button role="menuitem" type="button" data-geo-record-action="new">${dataListIcon('i-plus', 14)} ${t('New')}</button><button role="menuitem" type="button" data-geo-record-action="modify"${editing ? ' disabled' : ''}>${dataListIcon('i-edit', 14)} ${t('Modify')}</button><button role="menuitem" type="button" data-geo-record-action="delete"${editing ? ' disabled' : ''}>${dataListIcon('i-trash', 14)} ${t('Delete')}</button><button role="menuitem" type="button" data-geo-record-action="search">${dataListIcon('i-search', 14)} ${t('Search')}</button></div></div>
      <div class="menu"><button type="button" aria-haspopup="menu" aria-expanded="false">${t('Procedure')} ${dataListIcon('i-caret', 12)}</button><div class="mlist" role="menu"><button role="menuitem" type="button" data-geo-record-action="save"${editing ? '' : ' disabled'}>${dataListIcon('i-save', 14)} ${t('Save')}</button><button role="menuitem" type="button" data-geo-record-action="print">${dataListIcon('i-print', 14)} ${t('Print')}</button><button role="menuitem" type="button" data-geo-record-action="undo"${editing ? '' : ' disabled'}>${dataListIcon('i-undo', 14)} ${t('Undo')}</button></div></div>
      <div class="menu"><button type="button" aria-haspopup="menu" aria-expanded="false">${t('More')} ${dataListIcon('i-caret', 12)}</button><div class="mlist" role="menu"><button role="menuitem" type="button" data-geo-record-action="parameters">${dataListIcon('i-sliders', 14)} ${t('Screen Parameters')}</button><button role="menuitem" type="button" data-geo-record-action="help">${dataListIcon('i-help', 14)} ${t('Help')}</button></div></div>
    </div>
    <div class="phead [.d1_&]:[padding:11px_16px_0] [.d1_&]:flex [.d1_&]:items-start [.d1_&]:gap-3">
      <div class="l [.d1_.phead_&]:[flex:1]">
        <nav class="crumbs [.d3_.otitle_&]:[margin-bottom:3px]!" aria-label="Breadcrumb"><a href="#">${t('Home')}</a><span class="sep">›</span><button class="geo-back-list" type="button">${t('Geographical Structure')}</button><span class="sep">›</span><span aria-current="page">${geoState.mode === 'create' ? t('New') : t('All')}</span></nav>
        <div class="tline [.d1_&]:flex [.d1_&]:items-center [.d1_&]:gap-3 [.d1_&]:mt-2! [.d1_&]:flex-wrap [.d1_&_h1]:[font-size:23px] [.d1_&_h1]:font-semibold"><h1>${title}</h1><span class="badge ${row.active ? 'ok' : 'gray'}">${row.active ? t('Active') : t('Inactive')}</span></div>
      </div>
      <div class="r [.d1_.phead_&]:flex [.d1_.phead_&]:items-center [.d1_.phead_&]:gap-1 [.d1_.phead_&]:mt-1.5!"><span class="recacts inline-flex items-center [gap:7px] flex-wrap">${actions}</span></div>
    </div>`
          const pageActionBar = document.querySelector('.page-action-bar')
          const actionBar = queryId('geo-record-chrome').querySelector('.arow')
          pageActionBar?.querySelector('[data-page-action-bar="geo-record"]')?.remove()
          if (actionBar && pageActionBar) {
            actionBar.dataset.pageActionBar = 'geo-record'
            actionBar.hidden = false
            pageActionBar.append(actionBar)
            pageActionBar.hidden = false
          }
        }















function syncGeoRecordPager() {
          const pager = document.querySelector('.geo-record-footer .pager')
          const input = pager?.querySelector('.pg-i')
          const total = pager?.querySelector('.tot')
          const position = GEO_ROWS.findIndex(row => row.code === geoState.code) + 1
          if (!pager || !input || !total) return
          const setPosition = value => {
            const next = Math.min(GEO_ROWS.length, Math.max(1, Number(value) || 1))
            geoState.code = GEO_ROWS[next - 1].code
            renderGeoRecord()
          }
          total.textContent = `${t('of', 'of')} ${GEO_ROWS.length}`
          input.max = String(GEO_ROWS.length)
          input.value = String(position)
          input.dataset.last = String(position)
          pager.querySelector('.pg-f').disabled = position === 1
          pager.querySelector('.pg-p').disabled = position === 1
          pager.querySelector('.pg-n').disabled = position === GEO_ROWS.length
          pager.querySelector('.pg-l').disabled = position === GEO_ROWS.length
          pager.querySelector('.pg-f').onclick = () => setPosition(1)
          pager.querySelector('.pg-p').onclick = () => setPosition(position - 1)
          pager.querySelector('.pg-n').onclick = () => setPosition(position + 1)
          pager.querySelector('.pg-l').onclick = () => setPosition(GEO_ROWS.length)
          input.onchange = () => setPosition(input.value)
          queryId('geo-record-position').textContent =
            `${t('Record', 'Record')} ${position} ${t('of', 'of')} ${GEO_ROWS.length}`
        }

function geoDescendantCodes(code) {
          const descendants = new Set()
          const collect = parentCode => {
            GEO_ROWS.filter(row => row.parentCode === parentCode).forEach(child => {
              descendants.add(child.code)
              collect(child.code)
            })
          }
          collect(code)
          return descendants
        }

function renderGeoParentOptions(row, creating) {
          const select = queryId('geo-field-parent')
          const excluded = creating ? new Set() : geoDescendantCodes(row.code)
          if (!creating) excluded.add(row.code)
          const options = GEO_ROWS.filter(candidate => !excluded.has(candidate.code))
          select.innerHTML =
            '<option value="">No parent location</option>' +
            options
              .map(
                candidate =>
                  `<option value="${encodeHtml(candidate.code)}"${candidate.code === row.parentCode ? ' selected' : ''}>${encodeHtml(candidate.code)} - ${encodeHtml(candidate.name)}</option>`
              )
              .join('')
        }

function saveGeoRecord() {
          const row = GEO_ROWS.find(item => item.code === geoState.code)
          if (!row) return
          const parentCode = queryId('geo-field-parent').value
          const parentRow = GEO_ROWS.find(item => item.code === parentCode)
          row.name = queryId('geo-field-name').value.trim()
          row.type = queryId('geo-field-type').value
          row.active = queryId('geo-field-status').value === 'Active'
          row.remarks = queryId('geo-field-remarks').value
          row.parentCode = parentCode
          row.parent = parentRow ? `${parentRow.code} - ${parentRow.name}` : ''
          row.level = (parentRow?.level || 0) + 1
          const cascadeLevel = current => {
            GEO_ROWS.filter(child => child.parentCode === current.code).forEach(child => {
              child.level = current.level + 1
              cascadeLevel(child)
            })
          }
          cascadeLevel(row)
        }

function renderGeoRecord() {
          const creating = geoState.mode === 'create'
          const editing = geoState.mode !== 'view'
          const row = creating
            ? {
                code: '',
                parentCode: geoState.code || '',
                name: '',
                level: (GEO_ROWS.find(item => item.code === geoState.code)?.level || 0) + 1,
                type: 'District',
                active: true,
                remarks: '',
              }
            : GEO_ROWS.find(item => item.code === geoState.code) || GEO_ROWS[0]
          if (!creating) geoState.code = row.code
          renderGeoRecordChrome(row)
          renderGeoTree()
          syncGeoHierarchyView()
          syncGeoTreePanelToggle()
          queryId('geo-field-code').value = row.code
          renderGeoParentOptions(row, creating)
          queryId('geo-field-name').value = row.name
          queryId('geo-field-level').value = row.level
          queryId('geo-field-type').value = row.type
          queryId('geo-field-status').value = row.active ? 'Active' : 'Inactive'
          queryId('geo-field-remarks').value = row.remarks
          queryId('geo-field-name').readOnly = !editing
          queryId('geo-field-parent').disabled = !editing
          queryId('geo-parent-picker-trigger').disabled = !editing
          queryId('geo-field-type').disabled = !editing
          queryId('geo-field-status').disabled = !editing
          queryId('geo-field-remarks').readOnly = !editing
          const note = queryId('geo-footer-note')
          if (note) {
            const message = creating
              ? t('New location. Save when complete.')
              : editing
                ? t('Editing location. Save or Undo your changes.')
                : t('Saved location. Choose Modify to edit.')
            note.lastChild.textContent = ` ${message}`
          }
          syncGeoRecordPager()
          syncGeoFlowNodeDialog()
        }

function openGeoRecord(code, mode = 'view') {
          geoState.code = code || GEO_ROWS[0].code
          geoState.mode = mode
          let parentCode = GEO_ROWS.find(row => row.code === geoState.code)?.parentCode
          while (parentCode) {
            geoState.expanded.add(parentCode)
            parentCode = GEO_ROWS.find(row => row.code === parentCode)?.parentCode
          }
          showContentView('geo-record')
          renderGeoRecord()
        }













queryId('geo-parent-picker-trigger').addEventListener('click', () => {
          openGeoParentPicker()
        }, {signal: pageAbort.signal})



const geoHierarchyMediaQuery = window.matchMedia('(max-width: 1200px)')

geoHierarchyMediaQuery.addEventListener('change', event => {
          if (!event.matches) closeGeoHierarchyDialog()
          syncGeoTreePanelToggle()
        }, {signal: pageAbort.signal})



queryId('geo-tree').addEventListener('click', event => {
          const node = event.target.closest('[data-geo-node]')
          if (node) selectGeoTreeNode(node)
        }, {signal: pageAbort.signal})

queryId('geo-field-parent').addEventListener('change', event => {
          const parentCode = event.target.value
          const parentRow = GEO_ROWS.find(item => item.code === parentCode)
          queryId('geo-field-level').value = (parentRow?.level || 0) + 1
        }, {signal: pageAbort.signal})

document.addEventListener('click', event => {
          if (!event.target.closest('#geo-hierarchy-panel')) return
          const view = event.target.closest('[data-geo-view]')
          if (view) {
            setGeoHierarchyView(view.dataset.geoView)
            return
          }
          if (event.target.closest('[data-geo-expand-all]')) {
            GEO_ROWS.filter(row => GEO_ROWS.some(child => child.parentCode === row.code)).forEach(
              row => geoState.expanded.add(row.code)
            )
            renderGeoTree()
            return
          }
          if (event.target.closest('[data-geo-collapse-all]')) {
            geoState.expanded.clear()
            renderGeoTree()
            return
          }
          const zoom = event.target.closest('[data-geo-flow-zoom]')
          if (zoom) {
            setGeoFlowScale(geoState.flowScale + (zoom.dataset.geoFlowZoom === 'in' ? 0.1 : -0.1))
            return
          }
          if (event.target.closest('[data-geo-flow-fit]')) {
            fitGeoFlow()
            return
          }
          if (event.target.closest('[data-geo-flow-center]')) {
            centerGeoFlow()
            return
          }
          if (event.target.closest('[data-geo-flow-fullscreen]')) {
            toggleGeoFlowFullscreen()
            return
          }
          if (event.target.closest('[data-geo-flow-unfocus]')) {
            geoState.flowFocusCode = ''
            renderGeoFlow()
            fitGeoFlow()
            return
          }
          const nodeAction = event.target.closest('#geo-flow-pane [data-geo-flow-node-action]')
          if (nodeAction) {
            const code = nodeAction.dataset.geoNodeTarget
            const action = nodeAction.dataset.geoFlowNodeAction
            if (action === 'focus') {
              geoState.flowFocusCode = geoState.flowFocusCode === code ? '' : code
              renderGeoFlow()
              // Focusing (or returning to the full tree) changes the
              // canvas's content size and layout entirely -- re-fit and
              // re-center the scroll instead of leaving the viewport
              // wherever it happened to be scrolled before, which could
              // now be pointing at empty space outside the new content.
              fitGeoFlow()
              return
            }
            if (action === 'new') {
              // In fullscreen the flow canvas covers the viewport, so
              // openGeoRecord's own showContentView/render happens behind
              // it -- same dialog escape hatch the 'modify' branch below
              // uses, so New is visibly reachable without leaving fullscreen.
              const wasFullscreen = isGeoFlowFullscreen()
              openGeoRecord(code, 'create')
              if (wasFullscreen) openGeoFlowNodeDialog()
              return
            }
            if (action === 'delete') {
              openGeoDeleteTreeConfirm(code)
              return
            }
            // 'modify': openGeoRecord already does exactly what's needed --
            // select this code, set edit mode, re-render. (Not
            // selectGeoTreeNode: that reads node.dataset.geoNode, which the
            // toolbar button doesn't have -- it carries the target code in
            // data-geo-node-target instead, since it isn't the node itself.)
            openGeoRecord(code, 'edit')
            if (isGeoFlowFullscreen()) openGeoFlowNodeDialog()
            return
          }
          const flowNode = event.target.closest('#geo-flow-pane [data-geo-node]')
          if (flowNode) {
            selectGeoTreeNode(flowNode)
            if (isGeoFlowFullscreen()) openGeoFlowNodeDialog()
          }
        }, {signal: pageAbort.signal})

const geoFlowNodeScrim = document.getElementById('geo-flow-node-scrim')
let geoFlowNodeOpen = false
let geoFlowNodeDetailHome = null
let geoFlowNodeTitleHome = null
let geoFlowNodeActionsHome = null

function syncGeoFlowNodeDialog() {
          if (!geoFlowNodeOpen) return
          const detailMount = document.getElementById('geo-flow-node-mount')
          const titleMount = document.getElementById('geo-flow-node-title-mount')
          const actionsMount = document.getElementById('geo-flow-node-actions-mount')
          const card = document.querySelector('.geo-detail-card')
          const title = queryId('geo-record-chrome').querySelector('.tline')
          const actions = queryId('geo-record-chrome').querySelector('.recacts')
          // Every renderGeoRecord() rebuilds #geo-record-chrome from scratch, so the
          // title/actions nodes it just created always start back in the chrome --
          // re-pull them into the dialog's mounts each time, remembering where they
          // came from so closeGeoFlowNodeDialog() can put them back.
          if (card && detailMount && !detailMount.contains(card)) {
            geoFlowNodeDetailHome = geoFlowNodeDetailHome || {parent: card.parentElement, next: card.nextSibling}
            detailMount.appendChild(card)
          }
          if (title && titleMount) {
            geoFlowNodeTitleHome = {parent: title.parentElement, next: title.nextSibling}
            titleMount.replaceChildren(title)
          }
          if (actions && actionsMount) {
            geoFlowNodeActionsHome = {parent: actions.parentElement, next: actions.nextSibling}
            actionsMount.replaceChildren(actions)
          }
        }

function openGeoFlowNodeDialog() {
          geoFlowNodeOpen = true
          syncGeoFlowNodeDialog()
          geoFlowNodeScrim.classList.add('open')
          trapFocus(geoFlowNodeScrim.querySelector('.dlg'))
        }

function closeGeoFlowNodeDialog() {
          geoFlowNodeOpen = false
          const card = document.getElementById('geo-flow-node-mount')?.firstElementChild
          if (card && geoFlowNodeDetailHome) {
            geoFlowNodeDetailHome.parent.insertBefore(card, geoFlowNodeDetailHome.next)
          }
          geoFlowNodeDetailHome = null
          const title = document.getElementById('geo-flow-node-title-mount')?.firstElementChild
          if (title && geoFlowNodeTitleHome) {
            geoFlowNodeTitleHome.parent.insertBefore(title, geoFlowNodeTitleHome.next)
          }
          geoFlowNodeTitleHome = null
          const actions = document.getElementById('geo-flow-node-actions-mount')?.firstElementChild
          if (actions && geoFlowNodeActionsHome) {
            geoFlowNodeActionsHome.parent.insertBefore(actions, geoFlowNodeActionsHome.next)
          }
          geoFlowNodeActionsHome = null
          geoFlowNodeScrim.classList.remove('open')
          releaseFocus()
          if (geoState.mode !== 'view') {
            geoState.mode = 'view'
            renderGeoRecord()
          }
        }

geoFlowNodeScrim.addEventListener('click', event => {
          if (event.target === geoFlowNodeScrim || event.target.closest('.geo-flow-node-close')) {
            closeGeoFlowNodeDialog()
            return
          }
          handleGeoRecordAction(event)
        }, {signal: pageAbort.signal})

const geoDeleteTreeScrim = document.getElementById('geo-delete-tree-scrim')
let geoDeleteTreeCode = ''

function openGeoDeleteTreeConfirm(code) {
          const row = GEO_ROWS.find(item => item.code === code)
          if (!row) return
          geoDeleteTreeCode = code
          const affected = geoFlowLineageCodes(code)
          queryId('geo-delete-tree-name').textContent = `${row.code} - ${row.name}`
          queryId('geo-delete-tree-count').textContent = String(affected.size)
          queryId('geo-delete-tree-code').textContent = row.code
          const input = queryId('geo-delete-tree-confirm-input')
          input.value = ''
          queryId('geo-delete-tree-confirm').disabled = true
          geoDeleteTreeScrim.classList.add('open')
          trapFocus(geoDeleteTreeScrim.querySelector('.dlg'))
          input.focus()
        }

function closeGeoDeleteTreeConfirm() {
          geoDeleteTreeCode = ''
          geoDeleteTreeScrim.classList.remove('open')
          releaseFocus()
        }

// Real removal (splice, not a soft-delete flag): GEO_ROWS is this
// prototype's full/literal geo dataset -- nothing else reads a paired
// simulated-total constant off its length (checked: components/data-list/
// model.js's DATA_LIST_SIMULATED_TOTAL.geo=12 is otherwise unread), so
// shrinking the array is safe and makes a deleted tree disappear from
// every GEO_ROWS consumer (list, pickers, tree, flow) by construction.
function deleteGeoTree(code) {
          const codes = geoFlowLineageCodes(code)
          const removedCount = codes.size
          for (let i = GEO_ROWS.length - 1; i >= 0; i -= 1) {
            if (codes.has(GEO_ROWS[i].code)) GEO_ROWS.splice(i, 1)
          }
          geoState.expanded.forEach(expandedCode => {
            if (codes.has(expandedCode)) geoState.expanded.delete(expandedCode)
          })
          if (geoState.flowFocusCode && codes.has(geoState.flowFocusCode)) geoState.flowFocusCode = ''
          if (codes.has(geoState.code)) geoState.code = GEO_ROWS[0]?.code || ''
          return removedCount
        }

geoDeleteTreeScrim.addEventListener('click', event => {
          if (event.target === geoDeleteTreeScrim || event.target.closest('.geo-delete-tree-close')) {
            closeGeoDeleteTreeConfirm()
            return
          }
          if (event.target.closest('#geo-delete-tree-confirm')) {
            const code = geoDeleteTreeCode
            const removedCount = deleteGeoTree(code)
            closeGeoDeleteTreeConfirm()
            if (geoFlowNodeOpen) closeGeoFlowNodeDialog()
            renderGeoRecord()
            if (geoState.hierarchyView === 'flow') fitGeoFlow()
            toast({tone: 'ok', title: 'Location tree deleted', body: `${removedCount} location(s) removed.`})
          }
        }, {signal: pageAbort.signal})

queryId('geo-delete-tree-confirm-input').addEventListener('input', event => {
          const row = GEO_ROWS.find(item => item.code === geoDeleteTreeCode)
          queryId('geo-delete-tree-confirm').disabled = !row || event.target.value.trim() !== row.code
        }, {signal: pageAbort.signal})

queryId('geo-tree-search').addEventListener('input', event => {
          geoState.treeQuery = event.target.value
          renderGeoTree()
        }, {signal: pageAbort.signal})

document.querySelector('[data-geo-tree-collapse]').addEventListener('click', event => {
          toggleGeoTreePanel(event.currentTarget)
        }, {signal: pageAbort.signal})

document.querySelector('.geo-tree-refresh').addEventListener('click', () => {
          renderGeoRecord()
          toast({tone: 'ok', title: 'Geographical Structure refreshed'})
        }, {signal: pageAbort.signal})

function handleGeoRecordAction(event) {
          const action = event.target.closest('[data-geo-record-action]')?.dataset.geoRecordAction
          if (!action) return false
          if (action === 'modify') {
            geoState.mode = 'edit'
            renderGeoRecord()
          } else if (action === 'new') openNewDataListRecord('geo')
          else if (action === 'save') {
            if (geoState.mode === 'edit') saveGeoRecord()
            geoState.mode = 'view'
            renderGeoRecord()
            toast({tone: 'ok', title: 'Location saved'})
          } else if (action === 'undo') {
            geoState.mode = 'view'
            renderGeoRecord()
            toast({tone: 'ok', title: 'Changes discarded'})
          } else if (action === 'print') openPrintSettings(`Location ${geoState.code}`)
          else if (action === 'search') openAdvancedSearch('geo')
          else
            toast({
              tone: 'ok',
              title: `${action[0].toUpperCase() + action.slice(1)} is ready for integration`,
            })
          return true
        }

queryId('geo-record-chrome').addEventListener('click', event => {
          if (event.target.closest('.geo-back-list')) {
            if (geoHierarchyScrim.classList.contains('open')) closeGeoHierarchyDialog()
            showContentView('geo-list')
            renderGeoList()
            return
          }
          handleGeoRecordAction(event)
        }, {signal: pageAbort.signal})
const {dispose: disposeHierarchy, geoLocationIcon, geoTreeRowMatches, renderGeoTreeBranch, renderGeoTree, layoutGeoFlowPositions, geoFlowLineageCodes, renderGeoFlow, syncGeoHierarchyView, selectGeoTreeNode, toggleGeoTreePanel, syncGeoTreePanelToggle, setGeoHierarchyView, setGeoFlowScale, fitGeoFlow, centerGeoFlow, isGeoFlowFullscreen, toggleGeoFlowFullscreen} = createGeographyHierarchy({geoState, queryId, dataListIcon, geoHierarchyMediaQuery, renderGeoRecord, openGeoHierarchyDialog: (...args) => openGeoHierarchyDialog(...args)})
const {dispose: disposePickers, renderGeoParentPickerBranch, renderGeoParentPickerTree, renderGeoParentPickerFlow, setGeoParentPickerView, openGeoHierarchyDialog, closeGeoHierarchyDialog, openGeoParentPicker, closeGeoParentPicker, chooseGeoParent} = createGeographyPickers({queryId, dataListIcon, geoLocationIcon, layoutGeoFlowPositions, geoFlowLineageCodes, geoDescendantCodes, geoParentPickerScrim, geoHierarchyScrim, trapFocus, releaseFocus})
enableFlowPan('geo-flow-viewport')
enableFlowPan('geo-parent-picker-flow-viewport')
const listRoot = document.querySelector('.geo-list-view')
const listCanvas = document.getElementById('geo-list-canvas')
const listFooter = document.getElementById('geo-list-fnav')
const listPage = {
  id: 'geo-list', roots: [listRoot],
  activate() { getList().activate({root: listCanvas, footer: listFooter}) },
  deactivate() { getList().deactivate() },
  dispose() { getList().dispose() },
}
const recordPage = {
  id: 'geo-record', roots: [root], activate: renderGeoRecord,
  deactivate() { closeGeoParentPicker(); closeGeoHierarchyDialog() },
  dispose() { pageAbort.abort(); disposeHierarchy(); disposePickers() },
}
return {listPage, recordPage, dispose: () => pageAbort.abort(), renderGeoRecord, openGeoRecord, closeGeoParentPicker, closeGeoHierarchyDialog}
}
