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
        }





























function renderGeoRecordChrome(row) {
          const editing = geoState.mode !== 'view'
          const title = geoState.mode === 'create' ? t('New Location') : encodeHtml(row.name)
          const actions = editing
            ? `<button class="lbtn pri" type="button" data-geo-record-action="save">${dataListIcon('i-save')} ${t('Save')}</button><button class="lbtn out" type="button" data-geo-record-action="undo">${dataListIcon('i-undo')} ${t('Undo')}</button>`
            : `<button class="lbtn pri" type="button" data-geo-record-action="modify">${dataListIcon('i-edit')} ${t('Modify')}</button><span class="vsep"></span><button class="lbtn out" type="button" data-geo-record-action="new">${dataListIcon('i-plus')} ${t('New')}</button><button class="lbtn out danger" type="button" data-geo-record-action="delete">${dataListIcon('i-trash')} ${t('Delete')}</button>`
          queryId('geo-record-chrome').innerHTML = `
    <div class="arow customer-arow" role="toolbar" aria-label="Location toolbar">
      <div class="menu"><button type="button" aria-haspopup="menu" aria-expanded="false">${t('Record')} ${dataListIcon('i-caret', 12)}</button><div class="mlist" role="menu"><button role="menuitem" type="button" data-geo-record-action="new">${dataListIcon('i-plus', 14)} ${t('New')}</button><button role="menuitem" type="button" data-geo-record-action="modify"${editing ? ' disabled' : ''}>${dataListIcon('i-edit', 14)} ${t('Modify')}</button><button role="menuitem" type="button" data-geo-record-action="delete"${editing ? ' disabled' : ''}>${dataListIcon('i-trash', 14)} ${t('Delete')}</button><button role="menuitem" type="button" data-geo-record-action="search">${dataListIcon('i-search', 14)} ${t('Search')}</button></div></div>
      <div class="menu"><button type="button" aria-haspopup="menu" aria-expanded="false">${t('Procedure')} ${dataListIcon('i-caret', 12)}</button><div class="mlist" role="menu"><button role="menuitem" type="button" data-geo-record-action="save"${editing ? '' : ' disabled'}>${dataListIcon('i-save', 14)} ${t('Save')}</button><button role="menuitem" type="button" data-geo-record-action="print">${dataListIcon('i-print', 14)} ${t('Print')}</button><button role="menuitem" type="button" data-geo-record-action="undo"${editing ? '' : ' disabled'}>${dataListIcon('i-undo', 14)} ${t('Undo')}</button></div></div>
      <div class="menu"><button type="button" aria-haspopup="menu" aria-expanded="false">${t('More')} ${dataListIcon('i-caret', 12)}</button><div class="mlist" role="menu"><button role="menuitem" type="button" data-geo-record-action="parameters">${dataListIcon('i-sliders', 14)} ${t('Screen Parameters')}</button><button role="menuitem" type="button" data-geo-record-action="help">${dataListIcon('i-help', 14)} ${t('Help')}</button></div></div>
    </div>
    <div class="phead"><div class="l"><nav class="crumbs" aria-label="Breadcrumb"><a href="#">${t('Home')}</a><span class="sep">›</span><button class="geo-back-list" type="button">${t('Geographical Structure')}</button><span class="sep">›</span><span aria-current="page">${geoState.mode === 'create' ? t('New') : t('All')}</span></nav><div class="tline"><h1>${title}</h1><span class="badge ${row.active ? 'ok' : 'gray'}">${row.active ? t('Active') : t('Inactive')}</span></div></div><div class="r"><span class="recacts">${actions}</span></div></div>`
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
          const flowNode = event.target.closest('#geo-flow-pane [data-geo-node]')
          if (flowNode) selectGeoTreeNode(flowNode)
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

queryId('geo-record-chrome').addEventListener('click', event => {
          if (event.target.closest('.geo-back-list')) {
            if (geoHierarchyScrim.classList.contains('open')) closeGeoHierarchyDialog()
            showContentView('geo-list')
            renderGeoList()
            return
          }
          const action = event.target.closest('[data-geo-record-action]')?.dataset.geoRecordAction
          if (!action) return
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
        }, {signal: pageAbort.signal})
const {dispose: disposeHierarchy, geoLocationIcon, geoTreeRowMatches, renderGeoTreeBranch, renderGeoTree, layoutGeoFlowPositions, renderGeoFlow, syncGeoHierarchyView, selectGeoTreeNode, toggleGeoTreePanel, syncGeoTreePanelToggle, setGeoHierarchyView, setGeoFlowScale, fitGeoFlow} = createGeographyHierarchy({geoState, queryId, dataListIcon, geoHierarchyMediaQuery, renderGeoRecord, openGeoHierarchyDialog: (...args) => openGeoHierarchyDialog(...args)})
const {dispose: disposePickers, renderGeoParentPickerBranch, renderGeoParentPickerTree, renderGeoParentPickerFlow, setGeoParentPickerView, openGeoHierarchyDialog, closeGeoHierarchyDialog, openGeoParentPicker, closeGeoParentPicker, chooseGeoParent} = createGeographyPickers({queryId, dataListIcon, geoLocationIcon, layoutGeoFlowPositions, geoDescendantCodes, geoParentPickerScrim, geoHierarchyScrim, trapFocus, releaseFocus})
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
