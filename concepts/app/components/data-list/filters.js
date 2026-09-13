// Data-list date/field-filter logic — moved verbatim (unmodified bodies) out
// of concepts/app/legacy-app.js as part of Task 5, from the baseline range
// .baseline/concepts/app-shell.html:21906-22134 (parseDataListDate through
// dataListRows; dataListRows itself is NOT moved here — its filter/sort
// algorithm is reconstructed as createListModel's rowsInView() in model.js,
// per the brief's explicit "pass the model's state explicitly where prior
// code indexed global dataListState" substitution).
//
// dateFilterRange and rowMatchesFieldFilter keep their EXISTING signatures
// per the brief's Interfaces section — callers pass `filter`/`row`/`field`
// exactly as before, nothing here reads a global.

/** @typedef {{key: string, label: string}} DateFilterOperator */

export const DATA_FILTER_OPERATORS = [
  {key: 'contains', label: 'contains'},
  {key: 'starts', label: 'starts with'},
  {key: 'equals', label: 'is equal to'},
  {key: 'not-equals', label: 'is not equal to'},
]

export function dataFilterOptionValue(option) {
  return typeof option === 'object' ? option.value : option
}

export function dataFilterOptionLabel(option) {
  return typeof option === 'object' ? option.label : option
}

export function parseDataListDate(raw) {
  if (!raw) return null
  const value = String(raw).trim()
  let day, month, year
  if (value.includes('-')) [year, month, day] = value.split('-')
  else [day, month, year] = value.split('/')
  if (!day || !month || !year) return null
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  return Number.isNaN(date.getTime()) ? null : date
}

export function dataListDateOnly(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export const DATA_DATE_UNITS = [
  {key: 'day', label: 'Day(s)'},
  {key: 'week', label: 'Week(s)'},
  {key: 'month', label: 'Month(s)'},
  {key: 'year', label: 'Year(s)'},
]

export function dataListShiftDate(date, amount, unit) {
  const result = new Date(date)
  if (unit === 'day') result.setDate(result.getDate() + amount)
  else if (unit === 'week') result.setDate(result.getDate() + amount * 7)
  else if (unit === 'month') result.setMonth(result.getMonth() + amount)
  else if (unit === 'year') result.setFullYear(result.getFullYear() + amount)
  return result
}

/* filter.value for date fields is a compact string so it stays a plain
   string like every other filter value (trim/compare code elsewhere treats
   filter.value as a string): "today" | "this-week" | "this-month" |
   "this-quarter" | "this-year" | "previous:<n>:<unit>" | "upcoming:<n>:<unit>" |
   "specific:<yyyy-mm-dd>" | "range:<yyyy-mm-dd>:<yyyy-mm-dd>" */
export function parseDateFilterValue(filterOrValue) {
  const raw =
    typeof filterOrValue === 'string' || filterOrValue == null
      ? filterOrValue
      : filterOrValue.value
  const [preset, a, b] = String(raw || '').split(':')
  return {preset: preset || 'today', a, b}
}

/* switching the preset resets a/b unless moving between the two presets
   that share the same "amount + unit" shape (previous <-> upcoming), so a
   leftover numeric amount never leaks into a date-picker preset (specific,
   range) as an invalid "undefined" date string */
export function dataListNextDatePresetValue(item, preset) {
  const current = parseDateFilterValue(item)
  if (preset === 'previous' || preset === 'upcoming') {
    const reusable = current.preset === 'previous' || current.preset === 'upcoming'
    return `${preset}:${reusable ? current.a || 1 : 1}:${reusable ? current.b || 'day' : 'day'}`
  }
  if (preset === 'specific') {
    const reusable = current.preset === 'specific'
    return `specific:${reusable ? current.a || '' : ''}`
  }
  if (preset === 'range') {
    const reusable = current.preset === 'range'
    return `range:${reusable ? current.a || '' : ''}:${reusable ? current.b || '' : ''}`
  }
  return preset
}

export function dataListQuarterOf(date) {
  return Math.floor(date.getMonth() / 3)
}

export function dateFilterRange(filter, today = dataListDateOnly(new Date())) {
  const {preset, a, b} = parseDateFilterValue(filter)
  if (preset === 'today') return {from: today, to: today}
  if (preset === 'this-week') {
    const from = new Date(today)
    from.setDate(from.getDate() - from.getDay())
    const to = new Date(from)
    to.setDate(to.getDate() + 6)
    return {from, to}
  }
  if (preset === 'this-month')
    return {
      from: new Date(today.getFullYear(), today.getMonth(), 1),
      to: new Date(today.getFullYear(), today.getMonth() + 1, 0),
    }
  if (preset === 'this-quarter') {
    const quarter = dataListQuarterOf(today)
    return {
      from: new Date(today.getFullYear(), quarter * 3, 1),
      to: new Date(today.getFullYear(), quarter * 3 + 3, 0),
    }
  }
  if (preset === 'this-year')
    return {
      from: new Date(today.getFullYear(), 0, 1),
      to: new Date(today.getFullYear(), 11, 31),
    }
  if (preset === 'previous') {
    const amount = Math.max(1, Number(a) || 1)
    return {from: dataListShiftDate(today, -amount, b || 'day'), to: today}
  }
  if (preset === 'upcoming') {
    const amount = Math.max(1, Number(a) || 1)
    return {from: today, to: dataListShiftDate(today, amount, b || 'day')}
  }
  if (preset === 'specific') {
    const date = parseDataListDate(a)
    return date ? {from: date, to: date} : null
  }
  if (preset === 'range') {
    const from = parseDataListDate(a)
    const to = parseDataListDate(b)
    if (!from || !to) return null
    return from <= to ? {from, to} : {from: to, to: from}
  }
  return null
}

/**
 * formatDateFilterValue/dateFilterLabel need locale (appLocale/t/
 * formatLocaleDate), which is legacy-app.js's shared.locale instance, not a
 * data-list concern — they stay in legacy-app.js (not named in the task-5
 * brief's Files/Interfaces list) and call the exports above.
 */

export function rowMatchesFieldFilter(row, filter, field) {
  if (!field || !filter.value) return true
  if (field.type === 'date') {
    const range = dateFilterRange(filter)
    if (!range) return true
    const rowDate = parseDataListDate(row[field.key])
    if (!rowDate) return false
    const value = dataListDateOnly(rowDate).getTime()
    return value >= range.from.getTime() && value <= range.to.getTime()
  }
  const raw = String(row[field.key] ?? '').toLowerCase()
  const expected = String(filter.value).toLowerCase()
  if (filter.operator === 'starts') return raw.startsWith(expected)
  if (filter.operator === 'not-equals') return raw !== expected
  if (filter.operator === 'equals' || field.type === 'select') return raw === expected
  return raw.includes(expected)
}

// ---------------------------------------------------------------------
// Custom (saved) filters — user-named snapshots of the field-filter
// editor's conditions, stored per table context so invoice/customer/geo
// each keep their own set, same persistence pattern as layout (see
// model.js's saveCustomFilters/loadCustomFilters storage methods, which
// this module's caller wires through). Moved from baseline
// .baseline/concepts/app-shell.html:21332-21360 (loadCustomFilters/
// persistCustomFilters); folded into the `storage` parameter contract
// declared by model.js's createListModel({config,rows,storage}) instead of
// reading/writing localStorage directly, per the brief's storage-key
// unchanged-string requirement (skey:data-list-custom-filters:${context}) —
// see model.js for the localStorage-backed implementation of that contract.
