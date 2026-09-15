import {encodeHtml} from '../../core/locale.js'
import {DATA_FILTER_OPERATORS, dataFilterOptionValue, dataFilterOptionLabel, parseDateFilterValue, dataListNextDatePresetValue} from './filters.js'
import {DATA_LIST_CONFIG} from './columns.js'
import {DATA_MENU_SUMMARY_CLASS, DATA_MENU_POPOVER_CLASS} from './list.js'

/** Owns list filters state and its DOM bindings. */
export function createListFilters({t, trapFocus, releaseFocus, toast, getDataListStorage, saveDataListLayout, getDataListState, renderDataList, dataListIcon, dateFilterLabel, refreshDataListForContext, renderDataFilterModalDateField} = {}) {
  function persistCustomFilters(context, filters) {
    return getDataListStorage().saveCustomFilters(context, filters)
  }

  const DATA_CUSTOM_FILTER_ICONS = [
    'i-eye',
    'i-spark',
    'i-clock',
    'i-check',
    'i-archive',
    'i-doc',
    'i-grid',
    'i-flow',
    'i-user',
    'i-panel',
    'i-location',
    'i-warn',
  ]

  function applyDataListFilterClick(event, context) {
    const listState = getDataListState()[context]
    const config = DATA_LIST_CONFIG[context]
    if (event.target.closest('[data-list-open-filters]')) {
      openDataFilterModal(context)
      return true
    }
    const applyCustom = event.target.closest('[data-list-custom-filter-apply]')
    if (applyCustom) {
      applyCustomFilter(context, applyCustom.dataset.listCustomFilterApply)
      return true
    }
    const deleteCustom = event.target.closest('[data-list-custom-filter-delete]')
    if (deleteCustom) {
      deleteCustomFilter(context, deleteCustom.dataset.listCustomFilterDelete)
      return true
    }
    if (event.target.closest('[data-list-manage-filters]')) {
      openManageFiltersDialog(context)
      return true
    }
    const filter = event.target.closest('[data-list-filter]')
    const addFilter = event.target.closest('[data-list-add-filter]')
    const removeFilter = event.target.closest('[data-list-remove-field-filter]')
    const operator = event.target.closest('[data-list-filter-operator]')
    const selectOption = event.target.closest('[data-list-filter-select-option]')
    if (selectOption) {
      const item = listState.fieldFilters.find(
        fieldFilter => fieldFilter.key === selectOption.dataset.listFilterSelectOption
      )
      if (item) item.value = selectOption.dataset.value
      listState.page = 1
      renderDataList(context)
      return true
    }
    const datePreset = event.target.closest('[data-list-date-preset]')
    if (datePreset) {
      const item = listState.fieldFilters.find(
        fieldFilter => fieldFilter.key === datePreset.dataset.listDatePreset
      )
      if (item) item.value = dataListNextDatePresetValue(item, datePreset.dataset.preset)
      listState.page = 1
      renderDataList(context, {
        focusFilterKey: datePreset.dataset.listDatePreset,
      })
      return true
    }
    if (filter) {
      listState.filter = filter.dataset.listFilter
      listState.fieldFilters = []
      listState.advanced = false
      listState.sourceRows = config.rows
      listState.selected.clear()
    } else if (addFilter) {
      const field = config.filterFields.find(
        item => item.key === addFilter.dataset.listAddFilter
      )
      if (!field) return false
      listState.fieldFilters.push({
        key: field.key,
        operator: field.type === 'text' ? 'contains' : 'equals',
        value:
          field.type === 'select'
            ? String(dataFilterOptionValue(field.options[0]))
            : field.type === 'date'
              ? 'today'
              : '',
      })
    } else if (removeFilter) {
      listState.fieldFilters = listState.fieldFilters.filter(
        item => item.key !== removeFilter.dataset.listRemoveFieldFilter
      )
    } else if (operator) {
      const item = listState.fieldFilters.find(
        fieldFilter => fieldFilter.key === operator.dataset.listFilterKey
      )
      if (item) item.operator = operator.dataset.listFilterOperator
    } else if (event.target.closest('[data-list-clear-filter]')) {
      listState.filter = 'all'
      listState.fieldFilters = []
      listState.advanced = false
      listState.activeCustomFilterId = ''
      listState.sourceRows = config.rows
      listState.selected.clear()
    } else if (event.target.closest('[data-list-clear-advanced]')) {
      listState.advanced = false
      listState.sourceRows = DATA_LIST_CONFIG[context].rows
      listState.selected.clear()
    } else return false
    listState.page = 1
    renderDataList(context, {
      focusFilterKey: addFilter
        ? addFilter.dataset.listAddFilter
        : operator?.dataset.listFilterKey || '',
    })
    return true
  }

  function applyDataListToolbarClick(event, context) {
    const listState = getDataListState()[context]
    if (event.target.closest('[data-list-search-clear]')) {
      listState.search = ''
      listState.page = 1
      renderDataList(context, {focusSearch: true})
    } else if (event.target.closest('[data-list-clear-selection]')) {
      listState.selected.clear()
      renderDataList(context)
    } else if (event.target.closest('[data-list-save-view]')) openSaveFilterDialog(context)
    else if (event.target.closest('[data-list-save-layout]')) saveDataListLayout(context)
    else return false
    return true
  }

  let activeFilterModalContext = null

  function renderDataFilterModal(context) {
    const config = DATA_LIST_CONFIG[context]
    const listState = getDataListState()[context]
    document.getElementById('geo-filter-title').textContent = `Filter ${config.label}`
    const quick = document.querySelector('#geo-filter-scrim .geo-filter-quick')
    const fields = document.querySelector('#geo-filter-scrim .geo-filter-fields')
    quick.innerHTML = config.filters
      .map(
        filter =>
          `<button type="button" role="radio" data-geo-filter-quick="${encodeHtml(filter.key)}" aria-checked="${filter.key === listState.filter}">${dataListIcon(filter.icon)}<span>${encodeHtml(filter.label)}</span></button>`
      )
      .join('')
    fields.innerHTML = config.filterFields
      .map(field => {
        const existing = listState.fieldFilters.find(item => item.key === field.key)
        const value = existing?.value ?? ''
        if (field.type === 'date') {
          const activeFilter = existing || {
            key: field.key,
            operator: 'equals',
            value: 'today',
          }
          const clearButton = existing
            ? `<button type="button" class="data-filter-modal-clear" data-geo-filter-clear-field="${encodeHtml(field.key)}" aria-label="${t('Clear', 'Clear')} ${encodeHtml(t(field.label))}" title="${t('Clear', 'Clear')}">${dataListIcon('i-x', 13)}</button>`
            : ''
          return `<div class="rec-field data-filter-modal-date [&_label]:block [&_label]:text-xs [&_label]:text-muted [&_label]:[margin-bottom:3px]! [&_input]:w-full [&_input]:[padding:6px_8px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-md [&_input]:[font:inherit] [&_input]:text-ink [&_input]:bg-surface [&_select]:w-full [&_select]:[padding:6px_8px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-md [&_select]:[font:inherit] [&_select]:text-ink [&_select]:bg-surface [&_textarea]:w-full [&_textarea]:[padding:6px_8px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-md [&_textarea]:[font:inherit] [&_textarea]:text-ink [&_textarea]:bg-surface [&_textarea]:[resize:vertical] [&_input:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_select:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_textarea:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_input:focus-visible]:[outline:none] [&_input:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_select:focus-visible]:[outline:none] [&_select:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_textarea:focus-visible]:[outline:none] [&_textarea:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_input:disabled]:bg-[var(--line-2)] [&_input:disabled]:text-muted [&_select:disabled]:bg-[var(--line-2)] [&_select:disabled]:text-muted [&_textarea:disabled]:bg-[var(--line-2)] [&_textarea:disabled]:text-muted [&_select]:[appearance:none] [&_select]:[-webkit-appearance:none] [&_select]:[padding-inline-end:28px] [&_select]:[background-image:url(data:image/svg+xml,%3Csvg_xmlns=http://www.w3.org/2000/svg_width=12_height=12_viewBox=0_0_12_12%3E%3Cpath_fill=%2344546f_d=M2.5_4.5_6_8l3.5-3.5z/%3E%3C/svg%3E)] [&_select]:[background-repeat:no-repeat] [&_select]:[background-position:right_8px_center] [&_select]:[background-size:12px] [[dir=rtl]_&_select]:[padding-inline-end:8px] [[dir=rtl]_&_select]:[padding-inline-start:28px] [[dir=rtl]_&_select]:[background-position:left_8px_center] [.rec-payment-row_&]:[flex:1] [.rec-payment-row_&]:[min-width:140px] [.rec-adjustment-row_&_label]:text-muted [.save-filter-modal_&]:[margin-top:14px]! [.manage-filters-modal_&]:[margin-top:14px]! [.save-filter-modal_&:first-child]:mt-0! [.customer-lookup-filters_&]:min-w-0"><span>${encodeHtml(t(field.label))}</span>${renderDataFilterModalDateField(field, activeFilter, clearButton)}</div>`
        }
        if (field.type === 'select') {
          const input = `<select data-geo-filter-field="${encodeHtml(field.key)}"><option value="">Any</option>${field.options
            .map(
              option =>
                `<option value="${encodeHtml(String(dataFilterOptionValue(option)))}"${String(dataFilterOptionValue(option)) === value ? ' selected' : ''}>${encodeHtml(String(dataFilterOptionLabel(option)))}</option>`
            )
            .join('')}</select>`
          return `<label class="rec-field [&_label]:block [&_label]:text-xs [&_label]:text-muted [&_label]:[margin-bottom:3px]! [&_input]:w-full [&_input]:[padding:6px_8px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-md [&_input]:[font:inherit] [&_input]:text-ink [&_input]:bg-surface [&_select]:w-full [&_select]:[padding:6px_8px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-md [&_select]:[font:inherit] [&_select]:text-ink [&_select]:bg-surface [&_textarea]:w-full [&_textarea]:[padding:6px_8px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-md [&_textarea]:[font:inherit] [&_textarea]:text-ink [&_textarea]:bg-surface [&_textarea]:[resize:vertical] [&_input:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_select:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_textarea:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_input:focus-visible]:[outline:none] [&_input:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_select:focus-visible]:[outline:none] [&_select:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_textarea:focus-visible]:[outline:none] [&_textarea:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_input:disabled]:bg-[var(--line-2)] [&_input:disabled]:text-muted [&_select:disabled]:bg-[var(--line-2)] [&_select:disabled]:text-muted [&_textarea:disabled]:bg-[var(--line-2)] [&_textarea:disabled]:text-muted [&_select]:[appearance:none] [&_select]:[-webkit-appearance:none] [&_select]:[padding-inline-end:28px] [&_select]:[background-image:url(data:image/svg+xml,%3Csvg_xmlns=http://www.w3.org/2000/svg_width=12_height=12_viewBox=0_0_12_12%3E%3Cpath_fill=%2344546f_d=M2.5_4.5_6_8l3.5-3.5z/%3E%3C/svg%3E)] [&_select]:[background-repeat:no-repeat] [&_select]:[background-position:right_8px_center] [&_select]:[background-size:12px] [[dir=rtl]_&_select]:[padding-inline-end:8px] [[dir=rtl]_&_select]:[padding-inline-start:28px] [[dir=rtl]_&_select]:[background-position:left_8px_center] [.rec-payment-row_&]:[flex:1] [.rec-payment-row_&]:[min-width:140px] [.rec-adjustment-row_&_label]:text-muted [.save-filter-modal_&]:[margin-top:14px]! [.manage-filters-modal_&]:[margin-top:14px]! [.save-filter-modal_&:first-child]:mt-0! [.customer-lookup-filters_&]:min-w-0"><span>${encodeHtml(t(field.label))}</span>${input}</label>`
        }
        const operator =
          DATA_FILTER_OPERATORS.find(item => item.key === existing?.operator) ||
          DATA_FILTER_OPERATORS[0]
        const operatorSelect = `<select class="data-filter-modal-operator" data-geo-filter-operator-select data-geo-filter-operator-key="${encodeHtml(field.key)}">${DATA_FILTER_OPERATORS.map(
          item =>
            `<option value="${encodeHtml(item.key)}"${item.key === operator.key ? ' selected' : ''}>${encodeHtml(t(item.label))}</option>`
        ).join('')}</select>`
        const input = `<input type="text" data-geo-filter-field="${encodeHtml(field.key)}" value="${encodeHtml(value)}" placeholder="Enter ${encodeHtml(field.label.toLowerCase())}" />`
        return `<label class="rec-field [&_label]:block [&_label]:text-xs [&_label]:text-muted [&_label]:[margin-bottom:3px]! [&_input]:w-full [&_input]:[padding:6px_8px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-md [&_input]:[font:inherit] [&_input]:text-ink [&_input]:bg-surface [&_select]:w-full [&_select]:[padding:6px_8px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-md [&_select]:[font:inherit] [&_select]:text-ink [&_select]:bg-surface [&_textarea]:w-full [&_textarea]:[padding:6px_8px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-md [&_textarea]:[font:inherit] [&_textarea]:text-ink [&_textarea]:bg-surface [&_textarea]:[resize:vertical] [&_input:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_select:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_textarea:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_input:focus-visible]:[outline:none] [&_input:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_select:focus-visible]:[outline:none] [&_select:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_textarea:focus-visible]:[outline:none] [&_textarea:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_input:disabled]:bg-[var(--line-2)] [&_input:disabled]:text-muted [&_select:disabled]:bg-[var(--line-2)] [&_select:disabled]:text-muted [&_textarea:disabled]:bg-[var(--line-2)] [&_textarea:disabled]:text-muted [&_select]:[appearance:none] [&_select]:[-webkit-appearance:none] [&_select]:[padding-inline-end:28px] [&_select]:[background-image:url(data:image/svg+xml,%3Csvg_xmlns=http://www.w3.org/2000/svg_width=12_height=12_viewBox=0_0_12_12%3E%3Cpath_fill=%2344546f_d=M2.5_4.5_6_8l3.5-3.5z/%3E%3C/svg%3E)] [&_select]:[background-repeat:no-repeat] [&_select]:[background-position:right_8px_center] [&_select]:[background-size:12px] [[dir=rtl]_&_select]:[padding-inline-end:8px] [[dir=rtl]_&_select]:[padding-inline-start:28px] [[dir=rtl]_&_select]:[background-position:left_8px_center] [.rec-payment-row_&]:[flex:1] [.rec-payment-row_&]:[min-width:140px] [.rec-adjustment-row_&_label]:text-muted [.save-filter-modal_&]:[margin-top:14px]! [.manage-filters-modal_&]:[margin-top:14px]! [.save-filter-modal_&:first-child]:mt-0! [.customer-lookup-filters_&]:min-w-0"><span>${encodeHtml(t(field.label))}</span><div class="data-filter-modal-row">${operatorSelect}${input}</div></label>`
      })
      .join('')
  }

  function openDataFilterModal(context) {
    activeFilterModalContext = context
    renderDataFilterModal(context)
    geoFilterScrim.classList.add('open')
    trapFocus(geoFilterScrim.querySelector('.customer-modal'))
  }

  function closeDataFilterModal() {
    geoFilterScrim.classList.remove('open')
    releaseFocus()
    activeFilterModalContext = null
  }

  let activeSaveFilterContext = null

  function dataListFilterConditionSummary(config, fieldFilter) {
    const field = config.filterFields.find(item => item.key === fieldFilter.key)
    if (!field) return ''
    if (field.type === 'date') return `${field.label}: ${dateFilterLabel(fieldFilter)}`
    if (field.type === 'select') {
      const optionLabel = dataFilterOptionLabel(
        field.options.find(option => dataFilterOptionValue(option) === fieldFilter.value) ||
          fieldFilter.value
      )
      return `${field.label}: ${optionLabel}`
    }
    const operator =
      DATA_FILTER_OPERATORS.find(item => item.key === fieldFilter.operator) ||
      DATA_FILTER_OPERATORS[0]
    return `${field.label} ${t(operator.label).toLowerCase()} "${fieldFilter.value}"`
  }

  function renderIconPicker(mount, selectedIcon, onPick) {
    mount.innerHTML = DATA_CUSTOM_FILTER_ICONS.map(
      icon =>
        `<button type="button" class="data-icon-picker-option inline-flex items-center justify-center [width:32px] [height:32px] [border:1px_solid_var(--line)] [border-radius:7px] bg-surface text-ink [cursor:pointer] [&:hover]:bg-[var(--line-2)]" data-icon="${icon}" aria-checked="${icon === selectedIcon}" aria-label="${icon}">${dataListIcon(icon, 16)}</button>`
    ).join('')
    mount.querySelectorAll('[data-icon]').forEach(button => {
      button.addEventListener('click', () => {
        mount
          .querySelectorAll('[data-icon]')
          .forEach(other => other.setAttribute('aria-checked', 'false'))
        button.setAttribute('aria-checked', 'true')
        onPick(button.dataset.icon)
      })
    })
  }

  function renderSaveFilterDialog(context) {
    const config = DATA_LIST_CONFIG[context]
    const listState = getDataListState()[context]
    document.getElementById('save-filter-name').value = ''
    const conditions = document.getElementById('save-filter-conditions')
    conditions.innerHTML = listState.fieldFilters
      .map(
        fieldFilter =>
          `<li>${encodeHtml(dataListFilterConditionSummary(config, fieldFilter))}</li>`
      )
      .join('')
    saveFilterState.icon = DATA_CUSTOM_FILTER_ICONS[0]
    renderIconPicker(
      document.getElementById('save-filter-icon-picker'),
      saveFilterState.icon,
      icon => (saveFilterState.icon = icon)
    )
  }

  const saveFilterState = {icon: DATA_CUSTOM_FILTER_ICONS[0]}

  const saveFilterScrim = document.getElementById('save-filter-scrim')

  function openSaveFilterDialog(context) {
    activeSaveFilterContext = context
    renderSaveFilterDialog(context)
    saveFilterScrim.classList.add('open')
    trapFocus(saveFilterScrim.querySelector('.customer-modal'))
    document.getElementById('save-filter-name').focus({preventScroll: true})
  }

  function closeSaveFilterDialog() {
    saveFilterScrim.classList.remove('open')
    releaseFocus()
    activeSaveFilterContext = null
  }

  function confirmSaveFilter() {
    const context = activeSaveFilterContext
    if (!context) return
    const name = document.getElementById('save-filter-name').value.trim()
    if (!name) {
      document.getElementById('save-filter-name').focus()
      return
    }
    const listState = getDataListState()[context]
    const customFilter = {
      id: `cf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      icon: saveFilterState.icon,
      fieldFilters: listState.fieldFilters.map(item => ({...item})),
    }
    listState.customFilters = [...listState.customFilters, customFilter]
    persistCustomFilters(context, listState.customFilters)
    listState.activeCustomFilterId = customFilter.id
    closeSaveFilterDialog()
    toast({tone: 'ok', title: `Filter "${name}" saved`})
    refreshDataListForContext(context)
  }

  saveFilterScrim.addEventListener('click', event => {
    if (event.target === saveFilterScrim || event.target.closest('.save-filter-close')) {
      closeSaveFilterDialog()
      return
    }
    if (event.target.closest('#save-filter-confirm')) confirmSaveFilter()
  })

  saveFilterScrim.addEventListener('keydown', event => {
    if (event.key === 'Enter' && event.target.id === 'save-filter-name') {
      event.preventDefault()
      confirmSaveFilter()
    }
  })

  let activeManageFiltersContext = null

  let activeManageFilterId = ''

  let manageFilterDraft = null

  const manageFiltersScrim = document.getElementById('manage-filters-scrim')

  function applyCustomFilter(context, customFilterId) {
    const listState = getDataListState()[context]
    const custom = listState.customFilters.find(item => item.id === customFilterId)
    if (!custom) return
    listState.filter = 'all'
    listState.fieldFilters = custom.fieldFilters.map(item => ({...item}))
    listState.activeCustomFilterId = custom.id
    listState.advanced = false
    listState.page = 1
    listState.selected.clear()
    refreshDataListForContext(context)
  }

  function deleteCustomFilter(context, customFilterId) {
    const listState = getDataListState()[context]
    listState.customFilters = listState.customFilters.filter(
      item => item.id !== customFilterId
    )
    persistCustomFilters(context, listState.customFilters)
    if (listState.activeCustomFilterId === customFilterId) {
      listState.activeCustomFilterId = ''
      listState.fieldFilters = []
    }
    refreshDataListForContext(context)
  }

  function renderManageFiltersList(context) {
    const listState = getDataListState()[context]
    const list = document.getElementById('manage-filters-list')
    if (!listState.customFilters.length) {
      list.innerHTML = `<li class="data-manage-filters-empty [padding:8px] text-muted [font-size:12.5px]">No saved filters yet.</li>`
      document.getElementById('manage-filters-editor').hidden = true
      return
    }
    list.innerHTML = listState.customFilters
      .map(
        custom =>
          `<li><button type="button" class="data-manage-filters-item flex w-full items-center gap-2 [min-height:34px] [padding:6px_8px] [border:0] rounded-md [background:transparent] text-ink [font:inherit] text-start [cursor:pointer] [&:hover]:bg-[var(--line-2)]" data-manage-filter-select="${encodeHtml(custom.id)}" aria-selected="${custom.id === activeManageFilterId}">${dataListIcon(custom.icon || 'i-eye', 15)}<span>${encodeHtml(custom.name)}</span></button></li>`
      )
      .join('')
  }

  function selectManageFilter(context, customFilterId) {
    const listState = getDataListState()[context]
    const custom = listState.customFilters.find(item => item.id === customFilterId)
    activeManageFilterId = custom ? customFilterId : ''
    manageFilterDraft = custom
      ? {
          name: custom.name,
          icon: custom.icon || 'i-eye',
          fieldFilters: custom.fieldFilters.map(item => ({...item})),
        }
      : null
    renderManageFiltersList(context)
    renderManageFilterEditor(context)
  }

  function renderManageFilterAddCondition(config) {
    const activeKeys = new Set(manageFilterDraft.fieldFilters.map(item => item.key))
    const available = config.filterFields.filter(field => !activeKeys.has(field.key))
    if (!available.length) return ''
    const options = available
      .map(
        field =>
          `<button type="button" role="menuitem" data-manage-filter-add-condition="${encodeHtml(field.key)}">${dataListIcon(field.icon)}<span>${encodeHtml(t(field.label))}</span></button>`
      )
      .join('')
    return `<details class="data-menu relative" data-manage-filter-add-menu><summary class="${DATA_MENU_SUMMARY_CLASS}">${dataListIcon('i-plus')}<span>${t('Add condition', 'Add condition')}</span></summary><div class="${DATA_MENU_POPOVER_CLASS}" role="menu">${options}</div></details>`
  }

  function renderManageFilterConditionRow(field, fieldFilter) {
    const removeButton = `<button type="button" class="data-manage-filter-remove inline-flex items-center justify-center [width:26px] [height:26px] rounded-md text-muted [flex-shrink:0] [&:hover]:bg-[var(--line-2)] [&:hover]:[color:var(--danger)]" data-manage-filter-remove-condition="${encodeHtml(field.key)}" aria-label="${t('Remove', 'Remove')} ${encodeHtml(t(field.label))} ${t('condition', 'condition')}">${dataListIcon('i-x', 13)}</button>`
    if (field.type === 'date') {
      return `<div class="data-manage-filter-condition-row grid [grid-template-columns:130px_1fr_auto] items-center gap-2.5 [padding:9px_10px] [border:1px_solid_var(--line)] [border-radius:7px] mb-2! bg-surface [&_select]:[min-height:32px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-md [&_select]:[padding:6px_9px] [&_select]:[font:inherit] [&_select]:[font-size:12.5px] [&_select]:bg-surface [&_input]:[min-height:32px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-md [&_input]:[padding:6px_9px] [&_input]:[font:inherit] [&_input]:[font-size:12.5px] [&_input]:bg-surface"><span class="data-manage-filter-condition-label text-muted [font-size:12.5px] font-semibold">${encodeHtml(t(field.label))}</span>${renderDataFilterModalDateField(field, fieldFilter)}${removeButton}</div>`
    }
    if (field.type === 'select') {
      const value = fieldFilter.value ?? ''
      const input = `<select class="data-manage-filter-field" data-manage-filter-field="${encodeHtml(field.key)}"><option value="">${t('Any', 'Any')}</option>${field.options
        .map(
          option =>
            `<option value="${encodeHtml(String(dataFilterOptionValue(option)))}"${String(dataFilterOptionValue(option)) === value ? ' selected' : ''}>${encodeHtml(String(dataFilterOptionLabel(option)))}</option>`
        )
        .join('')}</select>`
      return `<div class="data-manage-filter-condition-row grid [grid-template-columns:130px_1fr_auto] items-center gap-2.5 [padding:9px_10px] [border:1px_solid_var(--line)] [border-radius:7px] mb-2! bg-surface [&_select]:[min-height:32px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-md [&_select]:[padding:6px_9px] [&_select]:[font:inherit] [&_select]:[font-size:12.5px] [&_select]:bg-surface [&_input]:[min-height:32px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-md [&_input]:[padding:6px_9px] [&_input]:[font:inherit] [&_input]:[font-size:12.5px] [&_input]:bg-surface"><span class="data-manage-filter-condition-label text-muted [font-size:12.5px] font-semibold">${encodeHtml(t(field.label))}</span>${input}${removeButton}</div>`
    }
    const operator =
      DATA_FILTER_OPERATORS.find(item => item.key === fieldFilter.operator) ||
      DATA_FILTER_OPERATORS[0]
    const operatorSelect = `<select class="data-filter-modal-operator" data-manage-filter-operator-select data-manage-filter-operator-key="${encodeHtml(field.key)}">${DATA_FILTER_OPERATORS.map(
      item =>
        `<option value="${encodeHtml(item.key)}"${item.key === operator.key ? ' selected' : ''}>${encodeHtml(t(item.label))}</option>`
    ).join('')}</select>`
    const input = `<input type="text" class="data-manage-filter-field" data-manage-filter-field="${encodeHtml(field.key)}" value="${encodeHtml(fieldFilter.value ?? '')}" placeholder="${t('Enter', 'Enter')} ${encodeHtml(t(field.label).toLowerCase())}" />`
    return `<div class="data-manage-filter-condition-row grid [grid-template-columns:130px_1fr_auto] items-center gap-2.5 [padding:9px_10px] [border:1px_solid_var(--line)] [border-radius:7px] mb-2! bg-surface [&_select]:[min-height:32px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-md [&_select]:[padding:6px_9px] [&_select]:[font:inherit] [&_select]:[font-size:12.5px] [&_select]:bg-surface [&_input]:[min-height:32px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-md [&_input]:[padding:6px_9px] [&_input]:[font:inherit] [&_input]:[font-size:12.5px] [&_input]:bg-surface"><span class="data-manage-filter-condition-label text-muted [font-size:12.5px] font-semibold">${encodeHtml(t(field.label))}</span><div class="data-filter-modal-row">${operatorSelect}${input}</div>${removeButton}</div>`
  }

  function renderManageFilterEditor(context) {
    const config = DATA_LIST_CONFIG[context]
    const editor = document.getElementById('manage-filters-editor')
    if (!manageFilterDraft) {
      editor.hidden = true
      return
    }
    editor.hidden = false
    document.getElementById('manage-filter-name').value = manageFilterDraft.name
    renderIconPicker(
      document.getElementById('manage-filter-icon-picker'),
      manageFilterDraft.icon,
      icon => (manageFilterDraft.icon = icon)
    )
    const fieldsMount = document.getElementById('manage-filter-fields')
    const conditionRows = manageFilterDraft.fieldFilters
      .map(fieldFilter => {
        const field = config.filterFields.find(item => item.key === fieldFilter.key)
        return field ? renderManageFilterConditionRow(field, fieldFilter) : ''
      })
      .join('')
    fieldsMount.innerHTML = `${conditionRows || `<p class="data-manage-filter-empty [margin:0_0_10px]! [padding:12px] [border:1px_dashed_var(--line)] [border-radius:7px] text-muted [font-size:12.5px] text-center">${t('No conditions yet — add one below.', 'No conditions yet — add one below.')}</p>`}${renderManageFilterAddCondition(config)}`
  }

  function openManageFiltersDialog(context) {
    activeManageFiltersContext = context
    const listState = getDataListState()[context]
    selectManageFilter(context, listState.customFilters[0]?.id || '')
    manageFiltersScrim.classList.add('open')
    trapFocus(manageFiltersScrim.querySelector('.customer-modal'))
  }

  function closeManageFiltersDialog() {
    manageFiltersScrim.classList.remove('open')
    releaseFocus()
    activeManageFiltersContext = null
    activeManageFilterId = ''
    manageFilterDraft = null
  }

  function saveManageFilterEdits() {
    const context = activeManageFiltersContext
    if (!context || !manageFilterDraft) return
    const listState = getDataListState()[context]
    const custom = listState.customFilters.find(item => item.id === activeManageFilterId)
    if (!custom) return
    const name = document.getElementById('manage-filter-name').value.trim()
    if (!name) {
      document.getElementById('manage-filter-name').focus()
      return
    }
    custom.name = name
    custom.icon = manageFilterDraft.icon
    custom.fieldFilters = manageFilterDraft.fieldFilters.map(item => ({...item}))
    persistCustomFilters(context, listState.customFilters)
    if (listState.activeCustomFilterId === custom.id)
      listState.fieldFilters = custom.fieldFilters.map(item => ({...item}))
    renderManageFiltersList(context)
    toast({tone: 'ok', title: `Filter "${name}" updated`})
    refreshDataListForContext(context)
  }

  manageFiltersScrim.addEventListener('click', event => {
    if (
      event.target === manageFiltersScrim ||
      event.target.closest('.manage-filters-close')
    ) {
      closeManageFiltersDialog()
      return
    }
    const select = event.target.closest('[data-manage-filter-select]')
    if (select) {
      selectManageFilter(activeManageFiltersContext, select.dataset.manageFilterSelect)
      return
    }
    const addCondition = event.target.closest('[data-manage-filter-add-condition]')
    if (addCondition) {
      const config = DATA_LIST_CONFIG[activeManageFiltersContext]
      const field = config.filterFields.find(
        item => item.key === addCondition.dataset.manageFilterAddCondition
      )
      if (field && manageFilterDraft) {
        manageFilterDraft.fieldFilters.push({
          key: field.key,
          operator: field.type === 'text' ? 'contains' : 'equals',
          value:
            field.type === 'select'
              ? String(dataFilterOptionValue(field.options[0]))
              : field.type === 'date'
                ? 'today'
                : '',
        })
        renderManageFilterEditor(activeManageFiltersContext)
      }
      return
    }
    const removeCondition = event.target.closest('[data-manage-filter-remove-condition]')
    if (removeCondition && manageFilterDraft) {
      manageFilterDraft.fieldFilters = manageFilterDraft.fieldFilters.filter(
        item => item.key !== removeCondition.dataset.manageFilterRemoveCondition
      )
      renderManageFilterEditor(activeManageFiltersContext)
      return
    }
    if (event.target.closest('#manage-filter-save')) {
      saveManageFilterEdits()
      return
    }
    if (event.target.closest('#manage-filter-delete')) {
      const context = activeManageFiltersContext
      const customFilterId = activeManageFilterId
      deleteCustomFilter(context, customFilterId)
      selectManageFilter(context, getDataListState()[context].customFilters[0]?.id || '')
    }
  })

  manageFiltersScrim.addEventListener('change', event => {
    if (!manageFilterDraft) return
    const operatorSelect = event.target.closest('[data-manage-filter-operator-select]')
    if (operatorSelect) {
      const item = manageFilterDraft.fieldFilters.find(
        fieldFilter => fieldFilter.key === operatorSelect.dataset.manageFilterOperatorKey
      )
      if (item) item.operator = operatorSelect.value
      return
    }
    const datePresetSelect = event.target.closest('[data-list-date-preset-select]')
    if (datePresetSelect) {
      const item = manageFilterDraft.fieldFilters.find(
        fieldFilter => fieldFilter.key === datePresetSelect.dataset.listDatePreset
      )
      if (item) {
        item.value = dataListNextDatePresetValue(item, datePresetSelect.value)
        renderManageFilterEditor(activeManageFiltersContext)
      }
      return
    }
    const field = event.target.closest('[data-manage-filter-field]')
    if (field) {
      const item = manageFilterDraft.fieldFilters.find(
        fieldFilter => fieldFilter.key === field.dataset.manageFilterField
      )
      if (item) item.value = field.value
    }
  })

  manageFiltersScrim.addEventListener('input', event => {
    if (!manageFilterDraft) return
    const dateAmount = event.target.closest('[data-list-date-amount]')
    const dateUnit = event.target.closest('[data-list-date-unit]')
    const dateSpecific = event.target.closest('[data-list-date-specific]')
    const dateRangeFrom = event.target.closest('[data-list-date-range-from]')
    const dateRangeTo = event.target.closest('[data-list-date-range-to]')
    const dateKey =
      dateAmount?.dataset.listDateAmount ||
      dateUnit?.dataset.listDateUnit ||
      dateSpecific?.dataset.listDateSpecific ||
      dateRangeFrom?.dataset.listDateRangeFrom ||
      dateRangeTo?.dataset.listDateRangeTo
    if (dateKey) {
      const item = manageFilterDraft.fieldFilters.find(
        fieldFilter => fieldFilter.key === dateKey
      )
      if (item) {
        const {preset, a, b} = parseDateFilterValue(item)
        if (dateAmount) item.value = `${preset}:${dateAmount.value || 1}:${b || 'day'}`
        else if (dateUnit) item.value = `${preset}:${a || 1}:${dateUnit.value}`
        else if (dateSpecific) item.value = `specific:${dateSpecific.value}`
        else if (dateRangeFrom) item.value = `range:${dateRangeFrom.value}:${b || ''}`
        else if (dateRangeTo) item.value = `range:${a || ''}:${dateRangeTo.value}`
      }
      return
    }
    const field = event.target.closest('input[data-manage-filter-field]')
    if (!field) return
    const item = manageFilterDraft.fieldFilters.find(
      fieldFilter => fieldFilter.key === field.dataset.manageFilterField
    )
    if (item) item.value = field.value
  })

  function applyDataFilterField(context, key, rawValue) {
    const listState = getDataListState()[context]
    const value = rawValue.trim()
    const existing = listState.fieldFilters.find(item => item.key === key)
    if (!value) {
      listState.fieldFilters = listState.fieldFilters.filter(item => item.key !== key)
      return
    }
    if (existing) existing.value = value
    else listState.fieldFilters.push({key, operator: 'contains', value})
  }

  function ensureDataFilterModalField(context, key, defaults) {
    const listState = getDataListState()[context]
    let item = listState.fieldFilters.find(fieldFilter => fieldFilter.key === key)
    if (!item) {
      item = {key, ...defaults}
      listState.fieldFilters.push(item)
    }
    return item
  }

  const geoFilterScrim = document.getElementById('geo-filter-scrim')

  geoFilterScrim.addEventListener('click', event => {
    const context = activeFilterModalContext
    if (!context) return
    const listState = getDataListState()[context]
    const quick = event.target.closest('[data-geo-filter-quick]')
    if (quick) {
      listState.filter = quick.dataset.geoFilterQuick
      renderDataFilterModal(context)
      refreshDataListForContext(context)
      return
    }
    if (event.target.closest('#geo-filter-clear')) {
      listState.filter = 'all'
      listState.fieldFilters = []
      listState.selected.clear()
      renderDataFilterModal(context)
      refreshDataListForContext(context)
      return
    }
    const clearField = event.target.closest('[data-geo-filter-clear-field]')
    if (clearField) {
      listState.fieldFilters = listState.fieldFilters.filter(
        item => item.key !== clearField.dataset.geoFilterClearField
      )
      renderDataFilterModal(context)
      refreshDataListForContext(context)
      return
    }
    if (event.target === geoFilterScrim || event.target.closest('.geo-filter-close')) {
      closeDataFilterModal()
    }
  })

  geoFilterScrim.addEventListener('change', event => {
    const context = activeFilterModalContext
    if (!context) return
    const operatorSelect = event.target.closest('[data-geo-filter-operator-select]')
    if (operatorSelect) {
      const item = ensureDataFilterModalField(
        context,
        operatorSelect.dataset.geoFilterOperatorKey,
        {
          operator: 'contains',
          value: '',
        }
      )
      item.operator = operatorSelect.value
      refreshDataListForContext(context)
      return
    }
    const datePresetSelect = event.target.closest('[data-list-date-preset-select]')
    if (datePresetSelect) {
      const item = ensureDataFilterModalField(
        context,
        datePresetSelect.dataset.listDatePreset,
        {
          operator: 'equals',
          value: 'today',
        }
      )
      item.value = dataListNextDatePresetValue(item, datePresetSelect.value)
      renderDataFilterModal(context)
      refreshDataListForContext(context)
    }
  })

  geoFilterScrim.addEventListener('input', event => {
    const context = activeFilterModalContext
    if (!context) return
    const dateAmount = event.target.closest('[data-list-date-amount]')
    const dateUnit = event.target.closest('[data-list-date-unit]')
    const dateSpecific = event.target.closest('[data-list-date-specific]')
    const dateRangeFrom = event.target.closest('[data-list-date-range-from]')
    const dateRangeTo = event.target.closest('[data-list-date-range-to]')
    const dateKey =
      dateAmount?.dataset.listDateAmount ||
      dateUnit?.dataset.listDateUnit ||
      dateSpecific?.dataset.listDateSpecific ||
      dateRangeFrom?.dataset.listDateRangeFrom ||
      dateRangeTo?.dataset.listDateRangeTo
    if (dateKey) {
      const item = ensureDataFilterModalField(context, dateKey, {
        operator: 'equals',
        value: 'today',
      })
      const {preset, a, b} = parseDateFilterValue(item)
      if (dateAmount) item.value = `${preset}:${dateAmount.value || 1}:${b || 'day'}`
      else if (dateUnit) item.value = `${preset}:${a || 1}:${dateUnit.value}`
      else if (dateSpecific) item.value = `specific:${dateSpecific.value}`
      else if (dateRangeFrom) item.value = `range:${dateRangeFrom.value}:${b || ''}`
      else if (dateRangeTo) item.value = `range:${a || ''}:${dateRangeTo.value}`
      refreshDataListForContext(context)
      return
    }
    const field = event.target.closest('[data-geo-filter-field]')
    if (!field) return
    applyDataFilterField(context, field.dataset.geoFilterField, field.value)
    refreshDataListForContext(context)
  })

  return {applyDataListFilterClick, applyDataListToolbarClick, closeDataFilterModal, geoFilterScrim}
}
