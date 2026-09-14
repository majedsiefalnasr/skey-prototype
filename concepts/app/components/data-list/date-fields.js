import {encodeHtml} from '../../core/locale.js'
import {DATA_DATE_UNITS, parseDataListDate, parseDateFilterValue} from './filters.js'

/** Owns list dates state and its DOM bindings. */
export function createListDates({t, formatLocaleDate, getAppLocale, dataListIcon} = {}) {
  function formatDateFilterValue(isoDate) {
    if (!isoDate) return ''
    if (getAppLocale() === 'ar') return formatLocaleDate(isoDate)
    const [year, month, day] = isoDate.split('-')
    return `${day}/${month}/${year}`
  }

  function dateFilterLabel(filter) {
    const {preset, a, b} = parseDateFilterValue(filter)
    const unitLabel = key =>
      (DATA_DATE_UNITS.find(item => item.key === key) || DATA_DATE_UNITS[0]).label.replace(
        '(s)',
        Number(a) === 1 ? '' : 's'
      )
    if (preset === 'today') return t('Today', 'Today')
    if (preset === 'this-week') return t('This week', 'This week')
    if (preset === 'this-month') return t('This month', 'This month')
    if (preset === 'this-quarter') return t('This quarter', 'This quarter')
    if (preset === 'this-year') return t('This year', 'This year')
    if (preset === 'previous') return `${t('Previous', 'Previous')} ${a || 1} ${unitLabel(b)}`
    if (preset === 'upcoming') return `${t('Upcoming', 'Upcoming')} ${a || 1} ${unitLabel(b)}`
    if (preset === 'specific')
      return a ? formatDateFilterValue(a) : t('Choose value', 'Choose value')
    if (preset === 'range')
      return a && b
        ? `${formatDateFilterValue(a)} – ${formatDateFilterValue(b)}`
        : t('Choose value', 'Choose value')
    return t('Choose value', 'Choose value')
  }

  const DATA_DATE_PRESET_LIST = [
    {key: 'today', label: 'Today'},
    {key: 'this-week', label: 'This week'},
    {key: 'this-month', label: 'This month'},
    {key: 'this-quarter', label: 'This quarter'},
    {key: 'this-year', label: 'This year'},
    {key: 'previous', label: 'Previous'},
    {key: 'upcoming', label: 'Upcoming'},
    {key: 'specific', label: 'Specific date'},
    {key: 'range', label: 'Date range'},
  ]

  function dataListDateInputValue(raw) {
    const date = parseDataListDate(raw)
    if (!date) return ''
    const pad = n => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  }

  function renderDataListDatePresetOptions(field, filter) {
    const {preset, a, b} = parseDateFilterValue(filter)
    const options = DATA_DATE_PRESET_LIST.map(
      item =>
        `<button type="button" role="option" aria-selected="${preset === item.key}" data-list-date-preset="${encodeHtml(field.key)}" data-preset="${item.key}">${encodeHtml(t(item.label))}${preset === item.key ? dataListIcon('i-check', 13) : ''}</button>`
    ).join('')
    const unitOptions = selectedUnit =>
      DATA_DATE_UNITS.map(
        unit =>
          `<option value="${unit.key}"${unit.key === selectedUnit ? ' selected' : ''}>${encodeHtml(t(unit.label))}</option>`
      ).join('')
    const relativeControls =
      preset === 'previous' || preset === 'upcoming'
        ? `<div class="data-filter-date-relative"><input type="number" min="1" value="${encodeHtml(a || '1')}" data-list-date-amount="${encodeHtml(field.key)}" aria-label="${t('Number', 'Number')}"><select data-list-date-unit="${encodeHtml(field.key)}" aria-label="${t('Unit', 'Unit')}">${unitOptions(b || 'day')}</select></div>`
        : ''
    const specificControls =
      preset === 'specific'
        ? `<input type="date" class="data-filter-date-input" value="${encodeHtml(dataListDateInputValue(a))}" data-list-date-specific="${encodeHtml(field.key)}" aria-label="${t('Choose date', 'Choose date')}">`
        : ''
    const rangeControls =
      preset === 'range'
        ? `<div class="data-filter-date-range"><input type="date" value="${encodeHtml(dataListDateInputValue(a))}" data-list-date-range-from="${encodeHtml(field.key)}" aria-label="${t('From', 'From')}"><span>${t('to', 'to')}</span><input type="date" value="${encodeHtml(dataListDateInputValue(b))}" data-list-date-range-to="${encodeHtml(field.key)}" aria-label="${t('To', 'To')}"></div>`
        : ''
    return `<div class="data-filter-date-presets" role="listbox">${options}</div>${relativeControls}${specificControls}${rangeControls}`
  }

  function renderDataFilterModalDateField(field, filter, clearButton = '') {
    const {preset, a, b} = parseDateFilterValue(filter)
    const presetSelect = `<select class="data-filter-modal-operator" data-list-date-preset-select data-list-date-preset="${encodeHtml(field.key)}">${DATA_DATE_PRESET_LIST.map(
      item =>
        `<option value="${item.key}"${item.key === preset ? ' selected' : ''}>${encodeHtml(t(item.label))}</option>`
    ).join('')}</select>`
    const unitOptions = selectedUnit =>
      DATA_DATE_UNITS.map(
        unit =>
          `<option value="${unit.key}"${unit.key === selectedUnit ? ' selected' : ''}>${encodeHtml(t(unit.label))}</option>`
      ).join('')
    if (preset === 'specific') {
      const specificInput = `<input type="date" value="${encodeHtml(dataListDateInputValue(a))}" data-list-date-specific="${encodeHtml(field.key)}" aria-label="${t('Choose date', 'Choose date')}">`
      return `<div class="data-filter-modal-row">${presetSelect}${specificInput}${clearButton}</div>`
    }
    if (preset === 'previous' || preset === 'upcoming') {
      const relativeControls = `<div class="data-filter-date-relative"><input type="number" min="1" value="${encodeHtml(a || '1')}" data-list-date-amount="${encodeHtml(field.key)}" aria-label="${t('Number', 'Number')}"><select data-list-date-unit="${encodeHtml(field.key)}" aria-label="${t('Unit', 'Unit')}">${unitOptions(b || 'day')}</select></div>`
      return `<div class="data-filter-modal-row">${presetSelect}${clearButton}</div>${relativeControls}`
    }
    if (preset === 'range') {
      const rangeControls = `<div class="data-filter-date-range"><input type="date" value="${encodeHtml(dataListDateInputValue(a))}" data-list-date-range-from="${encodeHtml(field.key)}" aria-label="${t('From', 'From')}"><span>${t('to', 'to')}</span><input type="date" value="${encodeHtml(dataListDateInputValue(b))}" data-list-date-range-to="${encodeHtml(field.key)}" aria-label="${t('To', 'To')}"></div>`
      return `<div class="data-filter-modal-row">${presetSelect}${clearButton}</div>${rangeControls}`
    }
    return `<div class="data-filter-modal-row">${presetSelect}${clearButton}</div>`
  }

  return {dateFilterLabel, renderDataListDatePresetOptions, renderDataFilterModalDateField}
}
