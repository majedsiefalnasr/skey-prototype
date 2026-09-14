import {encodeHtml} from '../core/locale.js'
import {CUSTOMER_ROWS} from '../prototype/fixtures/customers.js'

/** Owns advanced search state and its DOM bindings. */
export function createAdvancedSearch({trapFocus, releaseFocus, openGeoRecord, renderCustomerList, openCustomerRecord} = {}) {
  const ADVANCED_SEARCH_FIELDS = {
    invoice: [
      {key: 'docno', label: 'Doc No.', placeholder: 'e.g. 126'},
      {key: 'customer', label: 'Customer', placeholder: 'Customer name or number'},
      {key: 'date', label: 'Date range', placeholder: 'e.g. 01/08/2026 – 13/08/2026'},
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: ['All statuses', 'Posted', 'Pending', 'Open'],
      },
      {
        key: 'pay',
        label: 'Payment method',
        type: 'select',
        options: ['All methods', 'Cash', 'Credit'],
      },
    ],
    customer: [
      {key: 'customerNo', label: 'Customer No.', placeholder: 'e.g. 200010'},
      {key: 'customerName', label: 'Customer Name', placeholder: 'e.g. customer_412'},
      {key: 'typeGroup', label: 'Type or Group', placeholder: 'e.g. Retail or General'},
      {key: 'country', label: 'Country', placeholder: 'e.g. Egypt'},
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: ['All statuses', 'Active', 'Inactive'],
      },
    ],
    geo: [
      {key: 'code', label: 'Location Code', placeholder: 'e.g. CAI'},
      {key: 'name', label: 'Location Name', placeholder: 'e.g. Cairo'},
      {
        key: 'type',
        label: 'Type',
        type: 'select',
        options: ['All types', 'Country', 'Governorate', 'City', 'District'],
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: ['All statuses', 'Active', 'Inactive'],
      },
    ],
  }
  
  function renderAdvancedSearchFields(context) {
    const fields = ADVANCED_SEARCH_FIELDS[context]
    document.querySelector('#adv-search-scrim .as-fields').innerHTML = fields
      .map(field => {
        const key = encodeHtml(field.key)
        const label = encodeHtml(field.label)
        if (field.type === 'select') {
          const options = field.options
            .map(option => `<option>${encodeHtml(option)}</option>`)
            .join('')
          return `<div class="as-field"><label for="as-${key}">${label}</label><select id="as-${key}" data-advanced-filter="${key}">${options}</select></div>`
        }
        return `<div class="as-field"><label for="as-${key}">${label}</label><input id="as-${key}" data-advanced-filter="${key}" type="text" placeholder="${encodeHtml(field.placeholder)}"></div>`
      })
      .join('')
    document.querySelector('#adv-search-scrim .as-inp input').placeholder =
      context === 'customer'
        ? 'Search by customer number, name, type, or country'
        : context === 'geo'
          ? 'Search by location code, name, parent, or type'
          : 'Search by document number, customer, or amount'
    document.querySelector('#adv-search-scrim .as-list').innerHTML =
      context === 'customer'
        ? '<div class="as-grp">Matching customers</div><button type="button" class="as-item" role="option" data-customer-no="200010"><span class="ic"><svg width="14" height="14" aria-hidden="true"><use href="#i-user" /></svg></span><span class="tx"><span class="t">200010 · customer_412</span><span class="s">Retail · Active</span></span></button>'
        : context === 'geo'
          ? '<div class="as-grp">Matching locations</div><button type="button" class="as-item" role="option" data-geo-search-code="CAI"><span class="ic"><svg width="14" height="14" aria-hidden="true"><use href="#i-flow" /></svg></span><span class="tx"><span class="t">CAI · Cairo Governorate</span><span class="s">Governorate · Active</span></span></button>'
          : '<div class="as-grp">Matching invoices</div><button type="button" class="as-item" role="option"><span class="ic"><svg width="14" height="14" aria-hidden="true"><use href="#i-doc" /></svg></span><span class="tx"><span class="t">#126 · محمد احمد</span><span class="s">13/08/2026 · Credit</span></span></button><button type="button" class="as-item" role="option"><span class="ic"><svg width="14" height="14" aria-hidden="true"><use href="#i-doc" /></svg></span><span class="tx"><span class="t">#140 · العميل الاول</span><span class="s">13/08/2026 · Credit</span></span></button>'
    document.getElementById('adv-search-apply').hidden = context !== 'customer'
  }
  
  const advSearchScrim = document.getElementById('adv-search-scrim')
  
  function openAdvancedSearch(context = 'invoice') {
    advSearchScrim.dataset.context = context
    renderAdvancedSearchFields(context)
    advSearchScrim.classList.add('open')
    trapFocus(advSearchScrim.querySelector('.box'))
  }
  
  function openCustomerSearch() {
    openAdvancedSearch('customer')
  }
  
  function closeAdvancedSearch() {
    advSearchScrim.classList.remove('open')
    releaseFocus()
  }
  
  advSearchScrim.addEventListener('click', e => {
    const customerOption = e.target.closest('.as-item[data-customer-no]')
    if (customerOption && advSearchScrim.dataset.context === 'customer') {
      openCustomerRecord(customerOption.dataset.customerNo, 'view')
      return
    }
    const geoOption = e.target.closest('.as-item[data-geo-search-code]')
    if (geoOption && advSearchScrim.dataset.context === 'geo') {
      closeAdvancedSearch()
      openGeoRecord(geoOption.dataset.geoSearchCode, 'view')
      return
    }
    if (e.target === advSearchScrim || e.target.closest('.adv-search-close'))
      closeAdvancedSearch()
  })
  
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && advSearchScrim.classList.contains('open')) closeAdvancedSearch()
  })
  
  document.getElementById('adv-search-apply').addEventListener('click', () => {
    if (advSearchScrim.dataset.context !== 'customer') return
    const values = Object.fromEntries(
      [...advSearchScrim.querySelectorAll('[data-advanced-filter]')].map(control => [
        control.dataset.advancedFilter,
        control.value.trim().toLowerCase(),
      ])
    )
    const rows = CUSTOMER_ROWS.filter(row => {
      const status = row.active ? 'active' : 'inactive'
      return (
        (!values.customerNo || row.customerNo.toLowerCase().includes(values.customerNo)) &&
        (!values.customerName ||
          row.customerName.toLowerCase().includes(values.customerName)) &&
        (!values.typeGroup ||
          `${row.customerType} ${row.customerGroup}`
            .toLowerCase()
            .includes(values.typeGroup)) &&
        (!values.country || row.country.toLowerCase().includes(values.country)) &&
        (!values.status || values.status === 'all statuses' || values.status === status)
      )
    })
    renderCustomerList(rows, {advanced: true})
    closeAdvancedSearch()
  })

  return {openAdvancedSearch, openCustomerSearch, closeAdvancedSearch}
}
