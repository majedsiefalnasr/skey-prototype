# Customer Pages and Four Layout Concepts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an interactive Customers list and Customer record to `concepts/app-shell.html`, with four Customer-only layout concepts selectable from the prototype controls, while preserving the approved app shell and Sales Invoice experience.

**Architecture:** Keep the repository's single-file HTML/CSS/vanilla-JavaScript architecture. Add two Customer view wrappers to the existing `.content` switcher, render all Customer concepts from one schema and state object, and scope every new selector and event handler under `.customer-*`. The Customer-layout control swaps only the record canvas; Sales Invoice keeps its existing templates, data, state, and behavior.

**Tech Stack:** HTML5, CSS custom properties, vanilla JavaScript, existing SVG sprite and shell components, `playwright-cli` browser verification, and Git.

## Global Constraints

- Read `docs/superpowers/specs/2026-08-23-customer-pages-design.md` before implementation.
- Modify `concepts/app-shell.html`; do not split or restructure the approved single-file prototype during this feature.
- Do not redesign or remove app-shell or Sales Invoice markup, behavior, data, or styling.
- Preserve all fields visible in the three Customer reference screenshots.
- The Customer layout selector affects only the Customer record.
- All four concepts consume the same Customer state; switching concepts must retain edits.
- Contact Details uses an honest empty state because no field schema was supplied.
- Use in-memory prototype behavior only; no dependencies, backend, durable persistence, real upload, export, or server pagination.
- Preserve the three untracked reference files `CleanShot 2026-08-23 at 14.10.31@2x.png`, `CleanShot 2026-08-23 at 14.10.57@2x.png`, and `CleanShot 2026-08-23 at 14.11.10@2x.png`; do not stage or commit them.
- Run browser verification with `playwright-cli` against `python3 -m http.server 8950 --directory concepts`.
- At execution, use `test-driven-development` for the browser assertion loop, `impeccable` for the four Customer layouts, and `VibeSec-Skill` for Customer-rendering safety.
- Use a fresh Conventional Commit after each task and stage only the files listed by that task.

---

## File map

- Modify: `concepts/app-shell.html`
  - Customer-scoped CSS next to the existing Sales Invoice list/record CSS at approximately lines 4103-4744.
  - Customer prototype controls next to the current density/input/mode controls at approximately lines 4748-4810.
  - Customer list and record templates next to `.list-tpl` at approximately lines 5986-6009.
  - Customer navigation routing in `setNavCurrent` at approximately lines 7800-7806.
  - Customer template mounting next to the current body/email/list mounts at approximately lines 8373-8387.
  - Five-state content switching in `showContentView` at approximately lines 10040-10056.
  - Customer schema, renderers, and interactions after the Sales Invoice list renderer at approximately lines 10804-10904.
- Create: none.
- Browser verification artifacts: `/tmp/customer-*.png`; never add them to Git.

---

### Task 1: Add Customer views, navigation, and list

**Files:**
- Modify: `concepts/app-shell.html`

**Interfaces:**
- Consumes: existing `showContentView(name)`, `setNavCurrent(root, label)`, `.phead`, `.canvas`, `.fnav`, `.inv-grid`, `.lbtn`, `t-pager`, `toast`, and SVG sprite components.
- Produces: `.customer-list-view`, `.customer-record-view`, `showContentView('customers-list' | 'customer-record')`, `CUSTOMER_ROWS`, `renderCustomerList()`, and `openCustomerRecord(customerNo, mode)`.

- [ ] **Step 1: Establish the failing browser assertions**

Start the static server in a dedicated terminal session:

```bash
python3 -m http.server 8950 --directory concepts
```

Open the prototype and prove the Customer views do not exist yet:

```bash
playwright-cli open http://localhost:8950/app-shell.html
playwright-cli eval "Boolean(document.querySelector('.customer-list-view'))"
playwright-cli eval "Boolean(document.querySelector('.customer-record-view'))"
```

Expected before implementation: both evaluations return `false`.

- [ ] **Step 2: Add Customer list and record template wrappers**

Immediately after the existing `.list-tpl`, add templates with unique Customer-scoped classes and IDs:

```html
<template class="customer-list-tpl">
  <div class="customer-list-view" hidden>
    <div class="phead">
      <div class="l">
        <nav class="crumbs" aria-label="Breadcrumb">
          <a href="#">Home</a><span class="sep">›</span>
          <span aria-current="page">Customers</span>
        </nav>
        <div class="tline"><h1>Customers</h1></div>
      </div>
      <div class="r">
        <button class="lbtn pri" id="customer-list-add" type="button">
          <svg width="15" height="15" aria-hidden="true"><use href="#i-plus" /></svg>
          Add Customer
        </button>
      </div>
    </div>
    <div class="canvas" id="customer-list-canvas"></div>
    <div class="fnav">
      <span class="customer-list-pager-mount"></span>
      <span class="pos" aria-live="polite">1 of 8 pages · 72 customers</span>
    </div>
  </div>
</template>

<template class="customer-record-tpl">
  <div class="customer-record-view" hidden>
    <div id="customer-record-chrome"></div>
    <div class="canvas customer-record-canvas" id="customer-record-canvas"></div>
    <div class="fnav">
      <span class="customer-record-pager-mount"></span>
      <span class="pos" id="customer-record-position" aria-live="polite">1 of 72 customers</span>
    </div>
  </div>
</template>
```

- [ ] **Step 3: Mount both templates and their pagers**

In the existing mount loop, append both templates after `.list-tpl` and fill their pager mounts from `t-pager`:

```js
content.append(d.querySelector('.customer-list-tpl').content.cloneNode(true))
content.append(d.querySelector('.customer-record-tpl').content.cloneNode(true))
d.querySelectorAll('.customer-list-pager-mount').forEach(m => m.append(T('t-pager')))
d.querySelectorAll('.customer-record-pager-mount').forEach(m => m.append(T('t-pager')))
```

- [ ] **Step 4: Extend content switching without changing invoice behavior**

Update `showContentView(name)` to recognize five states. Preserve the existing unwrapped invoice-record children and the existing email/list wrappers:

```js
function showContentView(name) {
  const advScrim = document.getElementById('adv-search-scrim')
  if (advScrim && advScrim.classList.contains('open')) closeAdvancedSearch()

  const content = document.querySelector('.content')
  const namedViews = {
    email: content.querySelector('.email-view'),
    list: content.querySelector('.list-view'),
    'customers-list': content.querySelector('.customer-list-view'),
    'customer-record': content.querySelector('.customer-record-view'),
  }
  const wrappedViews = Object.values(namedViews)
  wrappedViews.forEach(view => {
    view.hidden = view !== namedViews[name]
  })
  ;[...content.children].forEach(el => {
    if (wrappedViews.includes(el)) return
    el.hidden = name !== 'record'
  })
  syncCustomerPrototypeControls(name)
}
```

Add a temporary no-op until Task 2 implements the control:

```js
function syncCustomerPrototypeControls() {}
```

Verify all current `showContentView('record' | 'email' | 'list')` call sites remain valid.

- [ ] **Step 5: Route Customers navigation explicitly**

Replace the binary routing expression in `setNavCurrent` with an explicit map:

```js
const viewByNavLabel = {
  'Sales Invoice': 'list',
  Customers: 'customers-list',
}
showContentView(viewByNavLabel[label] || 'record')
```

Do not change the existing rail highlighting, launchpad teardown, or `navCurrentLabel` behavior.

- [ ] **Step 6: Add the Customer list data and renderer**

Add a representative dataset and a renderer that uses the approved nine columns:

```js
const CUSTOMER_COLUMNS = [
  'Customer No.',
  'Customer Name',
  'Operation Unit',
  'Customer Type',
  'Customer Group',
  'Currency',
  'Country',
  'Phone',
  'Active status',
]

const CUSTOMER_ROWS = [
  {
    customerNo: '200010',
    customerName: 'customer_412',
    operationUnit: '2 - lastchance',
    customerType: 'Retail',
    customerGroup: 'General',
    currency: 'EGP',
    country: 'EG - Egypt',
    phone: '02 2450 1200',
    active: true,
  },
  {
    customerNo: '200002',
    customerName: 'customertest',
    operationUnit: '2 - lastchance',
    customerType: 'Wholesale',
    customerGroup: 'Local',
    currency: 'EGP',
    country: 'EG - Egypt',
    phone: '010 2000 2000',
    active: true,
  },
  {
    customerNo: '200001',
    customerName: 'العميل الاول',
    operationUnit: '2 - lastchance',
    customerType: 'Retail',
    customerGroup: 'General',
    currency: 'EGP',
    country: 'EG - Egypt',
    phone: '010 1000 1000',
    active: false,
  },
]

function renderCustomerList() {
  const rows = CUSTOMER_ROWS.map(
    row => `<tr data-customer-no="${row.customerNo}">
      <td>${row.customerNo}</td>
      <td>${row.customerName}</td>
      <td>${row.operationUnit}</td>
      <td>${row.customerType}</td>
      <td>${row.customerGroup}</td>
      <td>${row.currency}</td>
      <td>${row.country}</td>
      <td>${row.phone}</td>
      <td><span class="badge ${row.active ? 'ok' : 'gray'}">${row.active ? 'Active' : 'Inactive'}</span></td>
    </tr>`
  ).join('')

  document.getElementById('customer-list-canvas').innerHTML = `
    <div class="inv-grid-wrap customer-grid-wrap">
      <div class="inv-grid-toolbar">
        <button class="lbtn out" id="customer-search-open" type="button">
          <svg width="15" height="15" aria-hidden="true"><use href="#i-search" /></svg> Search
        </button>
        <div class="grow"></div>
        <button class="lbtn out" data-customer-list-action="Columns" type="button">Columns</button>
        <button class="lbtn out" data-customer-list-action="Export" type="button">Export</button>
      </div>
      <div class="inv-group-bar">Drag a column header here to group</div>
      <table class="inv-grid customer-grid">
        <thead><tr>${CUSTOMER_COLUMNS.map(column => `<th>${column}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`
}
```

Use delegated click handling on `#customer-list-canvas` so re-rendering does not duplicate listeners:

```js
document.getElementById('customer-list-canvas').addEventListener('click', event => {
  const row = event.target.closest('[data-customer-no]')
  if (row) openCustomerRecord(row.dataset.customerNo, 'view')
  const action = event.target.closest('[data-customer-list-action]')
  if (action) toast({tone: 'ok', title: `${action.dataset.customerListAction} is a prototype`})
})
document.getElementById('customer-list-add').addEventListener('click', () =>
  openCustomerRecord(null, 'create')
)
```

Add a minimal working record summary; Task 2 expands it into the full schema-driven record:

```js
function openCustomerRecord(customerNo, mode) {
  customerState.mode = mode
  customerState.customerNo = customerNo || ''
  const row = CUSTOMER_ROWS.find(customer => customer.customerNo === customerNo)
  showContentView('customer-record')
  document.getElementById('customer-record-canvas').innerHTML = `
    <div class="customer-summary-band">
      <b>${mode === 'create' ? 'New Customer' : row.customerNo}</b>
      <span>${mode === 'create' ? 'Enter customer details' : row.customerName}</span>
      <button class="lbtn out customer-back" type="button">Back to Customers</button>
    </div>`
}
```

Initialize `customerState` before this function:

```js
const customerState = {mode: 'view', customerNo: '200010'}
```

- [ ] **Step 7: Add the Customer-specific search overlay**

Generalize the existing `#adv-search-scrim` field area by context while preserving the exact Invoice configuration as the default. Add `<button type="button" class="lbtn pri" id="adv-search-apply" hidden>Apply</button>` immediately before the existing Close button in `.as-foot`; keep it hidden for Invoice and show it for Customers. Define both configurations:

```js
const ADVANCED_SEARCH_FIELDS = {
  invoice: [
    {key: 'docno', label: 'Doc No.', placeholder: 'e.g. 126'},
    {key: 'customer', label: 'Customer', placeholder: 'Customer name or number'},
    {key: 'date', label: 'Date range', placeholder: 'e.g. 01/08/2026 – 13/08/2026'},
    {key: 'status', label: 'Status', type: 'select', options: ['All statuses', 'Posted', 'Pending', 'Open']},
    {key: 'pay', label: 'Payment method', type: 'select', options: ['All methods', 'Cash', 'Credit']},
  ],
  customer: [
    {key: 'customerNo', label: 'Customer No.', placeholder: 'e.g. 200010'},
    {key: 'customerName', label: 'Customer Name', placeholder: 'e.g. customer_412'},
    {key: 'typeGroup', label: 'Type or Group', placeholder: 'e.g. Retail or General'},
    {key: 'country', label: 'Country', placeholder: 'e.g. Egypt'},
    {key: 'status', label: 'Status', type: 'select', options: ['All statuses', 'Active', 'Inactive']},
  ],
}

function renderAdvancedSearchFields(context) {
  const fields = ADVANCED_SEARCH_FIELDS[context]
  document.querySelector('#adv-search-scrim .as-fields').innerHTML = fields.map(field => {
    if (field.type === 'select') {
      return `<div class="as-field"><label for="as-${field.key}">${field.label}</label><select id="as-${field.key}" data-advanced-filter="${field.key}">${field.options.map(option => `<option>${option}</option>`).join('')}</select></div>`
    }
    return `<div class="as-field"><label for="as-${field.key}">${field.label}</label><input id="as-${field.key}" data-advanced-filter="${field.key}" type="text" placeholder="${field.placeholder}"></div>`
  }).join('')
  document.querySelector('#adv-search-scrim .as-inp input').placeholder =
    context === 'customer'
      ? 'Search by customer number, name, type, or country'
      : 'Search by document number, customer, or amount'
  document.querySelector('#adv-search-scrim .as-list').innerHTML =
    context === 'customer'
      ? '<div class="as-grp">Matching customers</div><button type="button" class="as-item" role="option" data-customer-no="200010"><span class="ic"><svg width="14" height="14" aria-hidden="true"><use href="#i-user" /></svg></span><span class="tx"><span class="t">200010 · customer_412</span><span class="s">Retail · Active</span></span></button>'
      : '<div class="as-grp">Matching invoices</div><button type="button" class="as-item" role="option"><span class="ic"><svg width="14" height="14" aria-hidden="true"><use href="#i-doc" /></svg></span><span class="tx"><span class="t">#126 · محمد احمد</span><span class="s">13/08/2026 · Credit</span></span></button><button type="button" class="as-item" role="option"><span class="ic"><svg width="14" height="14" aria-hidden="true"><use href="#i-doc" /></svg></span><span class="tx"><span class="t">#140 · العميل الاول</span><span class="s">13/08/2026 · Credit</span></span></button>'
  document.getElementById('adv-search-apply').hidden = context !== 'customer'
}

function openAdvancedSearch(context = 'invoice') {
  advSearchScrim.dataset.context = context
  renderAdvancedSearchFields(context)
  advSearchScrim.classList.add('open')
  trapFocus(advSearchScrim.querySelector('.box'))
}

function openCustomerSearch() {
  openAdvancedSearch('customer')
}
```

Change the renderer signature to `renderCustomerList(rows = CUSTOMER_ROWS)` and use its `rows` parameter. Handle the Customer search trigger through the existing delegated `#customer-list-canvas` click listener so a list re-render cannot remove the handler:

```js
if (event.target.closest('#customer-search-open')) openCustomerSearch()
```

Apply the five filters and close the shared overlay:

```js
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
    return (!values.customerNo || row.customerNo.toLowerCase().includes(values.customerNo)) &&
      (!values.customerName || row.customerName.toLowerCase().includes(values.customerName)) &&
      (!values.typeGroup || `${row.customerType} ${row.customerGroup}`.toLowerCase().includes(values.typeGroup)) &&
      (!values.country || row.country.toLowerCase().includes(values.country)) &&
      (!values.status || values.status === 'all statuses' || values.status === status)
  })
  renderCustomerList(rows)
  closeAdvancedSearch()
})
```

All existing invoice callers may continue using `openAdvancedSearch()` with no argument, which restores the original four Invoice fields and leaves Apply hidden.

- [ ] **Step 8: Run the passing browser checks**

```bash
playwright-cli open http://localhost:8950/app-shell.html
playwright-cli eval "Boolean(document.querySelector('.customer-list-view'))"
playwright-cli eval "Boolean(document.querySelector('.customer-record-view'))"
```

Expected: both return `true`.

Select Customers from the sidebar, then verify:

```bash
playwright-cli eval "!document.querySelector('.customer-list-view').hidden"
playwright-cli eval "document.querySelectorAll('.customer-grid th').length"
playwright-cli eval "document.querySelectorAll('.customer-grid tbody tr').length"
```

Expected: `true`, `9`, and `3`.

Click customer `200010`; expected: `.customer-record-view` is visible and its summary shows `200010 / customer_412`. Navigate back to Sales Invoice; expected: the original invoice list appears unchanged.

- [ ] **Step 9: Verify and commit**

```bash
git diff --check
git diff -- concepts/app-shell.html
git status --short
git add concepts/app-shell.html
git commit -m "feat(customer): add list and shell routing"
```

Expected staged allowlist: only `concepts/app-shell.html`.

---

### Task 2: Add the shared Customer schema, state, record chrome, and controls

**Files:**
- Modify: `concepts/app-shell.html`

**Interfaces:**
- Consumes: `customerState`, `CUSTOMER_ROWS`, `openCustomerRecord`, `.customer-record-view`, and existing shell form/action components.
- Produces: `CUSTOMER_SECTIONS`, `customerData`, `renderCustomerSection(sectionKey)`, `renderCustomerRecord()`, `syncCustomerPrototypeControls(viewName)`, and the `#customer-layout` control.

- [ ] **Step 1: Prove the shared record model is absent**

```bash
playwright-cli eval "Boolean(document.querySelector('#customer-layout'))"
playwright-cli eval "Boolean(document.querySelector('[data-customer-field=\"customerName\"]'))"
```

Expected before implementation: both return `false`.

- [ ] **Step 2: Add the Customer-only prototype control**

Give the existing Invoice Mode, Invoice status, Payment, unsaved-edits, and empty-flow groups stable IDs: `invoice-mode-group`, `invoice-status-group`, `invoice-payment-group`, `invoice-dirty-group`, and `invoice-emptyflow-group`. The added IDs must not change their markup order, labels, or visible Invoice behavior.

Add these Customer-only groups to `.demo-bar`; they remain hidden unless the Customer record is active:

```html
<div class="grp" id="customer-mode-group" hidden>
  <label for="customer-mode">Mode:</label>
  <select id="customer-mode" autocomplete="off">
    <option value="create">Creating a new customer</option>
    <option value="view" selected>Viewing a saved customer</option>
    <option value="edit">Editing a saved customer</option>
  </select>
</div>
<div class="grp" id="customer-layout-group" hidden>
  <label for="customer-layout">Customer layout:</label>
  <select id="customer-layout" autocomplete="off">
    <option value="guided" selected>1 · Guided Sections</option>
    <option value="focused">2 · Focused Navigator</option>
    <option value="compact">3 · Compact Workspace</option>
    <option value="scroll">4 · Scroll Navigator</option>
  </select>
</div>
```

Replace Task 1's no-op with:

```js
function syncCustomerPrototypeControls(viewName) {
  const customerRecord = viewName === 'customer-record'
  const customerSurface = customerRecord || viewName === 'customers-list'
  document.getElementById('customer-mode-group').hidden = !customerRecord
  document.getElementById('customer-layout-group').hidden = !customerRecord
  ;[
    'invoice-mode-group',
    'invoice-status-group',
    'invoice-payment-group',
    'invoice-dirty-group',
    'invoice-emptyflow-group',
  ].forEach(id => {
    document.getElementById(id).hidden = customerSurface
  })
}
```

Bind `#customer-mode` to Customer state only:

```js
document.getElementById('customer-mode').addEventListener('change', event => {
  const mode = event.target.value
  if (mode === 'create') customerData = createBlankCustomerData()
  customerState.mode = mode
  customerState.dirty = false
  renderCustomerRecord()
})
```

The existing `#mode`, `#st`, `#pay`, `#dirty`, and `#emptyflow` listeners remain unchanged and continue to control Sales Invoice only.

- [ ] **Step 3: Define the complete Customer schema**

Add one field factory and one complete section map. Keys must remain unique even where screenshot labels repeat:

```js
const customerField = (key, label, type = 'text', options = []) => ({
  key,
  label,
  type,
  options,
})

const CUSTOMER_SECTIONS = {
  identity: {
    title: 'Customer',
    fields: [
      customerField('customerNo', 'Customer No.'),
      customerField('customerName', 'Customer Name'),
      customerField('operationUnit', 'Operation Unit', 'select', ['2 - lastchance']),
      customerField('customerType', 'Customer Type', 'select', ['Retail', 'Wholesale']),
      customerField('primeCustomer', 'Prime Customer', 'select', ['']),
      customerField('accountCode', 'Acc. Code', 'select', ['114001 - Customers']),
      customerField('customerGroup', 'Customer Group', 'select', ['General', 'Local']),
      customerField('linkedBeneficiaries', 'Linked To Beneficiaries', 'checkbox'),
      customerField('currency', 'Currency', 'select', ['EGP - Egyptian Pound']),
      customerField('photo', 'Customer Photo', 'photo'),
    ],
  },
  deactivation: {
    title: 'Deactivate',
    fields: [
      customerField('deactivationFrom', 'From Deactivation Date', 'date'),
      customerField('deactivationTo', 'To Deactivation Date', 'date'),
    ],
  },
  nationalAddress: {
    title: 'National Address',
    fields: [
      customerField('nationalStreet', 'Street'),
      customerField('nationalBuilding', 'Building'),
      customerField('nationalFlat', 'Flat'),
      customerField('nationalDistrict', 'District'),
      customerField('nationalShortAddress', 'Short Address'),
      customerField('nationalCity', 'City', 'select', ['']),
      customerField('nationalState', 'State', 'select', ['']),
      customerField('nationalCountry', 'Country', 'select', ['EG - Egypt']),
      customerField('nationalPostalCode', 'Postal Code'),
      customerField('nationalAddOn', 'Add On'),
      customerField('nationalIdentifierType', 'Identifier Type', 'select', ['']),
      customerField('nationalIdentifierNo', 'Identifier No.'),
    ],
  },
  defaultContact: {
    title: 'Default Contact Info.',
    fields: [
      customerField('contactAddress', 'Address'),
      customerField('contactAddressDetails', 'Address Details'),
      customerField('contactCity', 'City', 'select', ['']),
      customerField('contactState', 'State', 'select', ['']),
      customerField('contactCountry', 'Country', 'select', ['EG - Egypt']),
      customerField('contactPostalCode', 'Postal Code'),
      customerField('contactPhone', 'Phone'),
      customerField('contactEmail', 'E-Mail', 'email'),
      customerField('contactMobile', 'Mobile No.'),
      customerField('contactWebsite', 'Website', 'url'),
    ],
  },
  mainData: {
    title: 'Main Data',
    fields: [
      customerField('salespersonNo', 'Salesperson', 'select', ['']),
      customerField('driverNo', 'Driver No.', 'select', ['']),
      customerField('geoLocation', 'Geo. Location', 'select', ['']),
      customerField('collector', 'Collector', 'select', ['']),
      customerField('marketerNo', 'Marketer No.', 'select', ['']),
      customerField('creditPeriod', 'Credit Period', 'number'),
      customerField('taxScope', 'Tax Scope', 'select', ['']),
      customerField('taxCategory', 'Tax Category', 'select', ['']),
      customerField('methodShowPrice', 'Method Show Price', 'select', ['']),
      customerField('taxNumber', 'Tax Number'),
      customerField('permanentAccountNumber', 'Permanent Account Number'),
      customerField('programNo', 'Program No', 'select', ['']),
      customerField('activationDate', 'Activation Date', 'date'),
      customerField('customerBarcode', 'Customer Barcode'),
    ],
  },
  otherData: {
    title: 'Other Data',
    fields: [
      customerField('dealingDate', 'Dealing Date', 'date'),
      customerField('cashPriceLevel', 'Price Level For Cash', 'select', ['']),
      customerField('creditPriceLevel', 'Price Level For Credit', 'select', ['']),
      customerField('otherCountry', 'Country', 'select', ['EG - Egypt']),
      customerField('language', 'Language', 'select', ['Arabic', 'English']),
      customerField('paymentType', 'Payment Type', 'select', ['']),
      customerField('deliveryTerms', 'Delivery Terms', 'select', ['']),
      customerField('viaPerson', 'Via Person'),
      customerField('lastConfirmationDate', 'Last Confirmation Date', 'date'),
      customerField('idNumber', 'ID Number'),
      customerField('licenseNo', 'License No.'),
      customerField('licenseOwner', 'License Owner'),
      customerField('ceoTitle', 'CEO Title', 'select', ['']),
      customerField('ceoName', 'CEO Name'),
      customerField('yearEstablished', 'Year Established', 'number'),
      customerField('vendorCode', 'Vendor Code', 'select', ['']),
      customerField('blackListReason', 'Black List Reason'),
      customerField('blackListed', 'Black List', 'checkbox'),
      customerField('isSalesperson', 'Salesperson', 'checkbox'),
      customerField('inactiveSalesOrder', 'Inactivation In Sales Order', 'checkbox'),
      customerField('inactiveInvoice', 'Inactivation In Invoice', 'checkbox'),
      customerField('remarks', 'Remarks', 'textarea'),
    ],
  },
  subLedgers: {title: 'Sub Ledgers', type: 'subledgers', fields: []},
  contactDetails: {title: 'Contact Details', type: 'empty', fields: []},
}
```

- [ ] **Step 4: Define reference data and mode-safe state**

Create the populated reference object from customer `200010`, with blank strings for unspecified screenshot values, plus `subLedgers: []` and `contactDetails: []`. Derive blank create data from the schema rather than maintaining a second field list:

```js
const CUSTOMER_REFERENCE = {
  customerNo: '200010',
  customerName: 'customer_412',
  operationUnit: '2 - lastchance',
  customerType: '',
  primeCustomer: '',
  accountCode: '114001 - Customers',
  customerGroup: '',
  linkedBeneficiaries: false,
  currency: 'EGP - Egyptian Pound',
  photo: '',
  nationalCountry: 'EG - Egypt',
  contactCountry: 'EG - Egypt',
  otherCountry: 'EG - Egypt',
  blackListed: false,
  isSalesperson: false,
  inactiveSalesOrder: false,
  inactiveInvoice: false,
  subLedgers: [],
  contactDetails: [],
}

function createBlankCustomerData() {
  const data = {}
  Object.values(CUSTOMER_SECTIONS).forEach(section => {
    section.fields.forEach(field => {
      data[field.key] = field.type === 'checkbox' ? false : ''
    })
  })
  data.operationUnit = '2 - lastchance'
  data.currency = 'EGP - Egyptian Pound'
  data.subLedgers = []
  data.contactDetails = []
  return data
}

let customerData = {...createBlankCustomerData(), ...CUSTOMER_REFERENCE}
let customerSavedSnapshot = structuredClone(customerData)
Object.assign(customerState, {
  mode: 'view',
  layout: 'guided',
  activeSection: 'identity',
  expanded: new Set(Object.keys(CUSTOMER_SECTIONS)),
  dirty: false,
})
window.customerPrototype = {
  fieldKeys: Object.values(CUSTOMER_SECTIONS).flatMap(section =>
    section.fields.map(field => field.key)
  ),
}
```

Replace Task 1's summary-only opener so saved rows load reference data and Add loads blank data:

```js
function openCustomerRecord(customerNo, mode) {
  customerState.mode = mode
  customerState.customerNo = customerNo || ''
  customerState.dirty = false
  const row = CUSTOMER_ROWS.find(customer => customer.customerNo === customerNo)
  customerData = mode === 'create'
    ? createBlankCustomerData()
    : {
        ...createBlankCustomerData(),
        ...CUSTOMER_REFERENCE,
        customerNo: row.customerNo,
        customerName: row.customerName,
        operationUnit: row.operationUnit,
        customerType: row.customerType,
        customerGroup: row.customerGroup,
        currency: `${row.currency} - Egyptian Pound`,
        otherCountry: row.country,
        contactPhone: row.phone,
        deactivationFrom: row.active ? '' : '2026-08-01',
      }
  customerSavedSnapshot = structuredClone(customerData)
  document.getElementById('customer-mode').value = mode
  showContentView('customer-record')
  renderCustomerRecord()
}
```

- [ ] **Step 5: Add shared field, Sub Ledgers, and empty-state renderers**

Implement the shared renderers below. Every control carries `data-customer-field`; values are escaped before entering HTML; controls are disabled in view mode:

```js
function escapeCustomerHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function renderCustomerField(field) {
  const value = customerData[field.key]
  const disabled = customerState.mode === 'view' ? ' disabled' : ''
  const id = `customer-field-${field.key}`
  if (field.type === 'checkbox') {
    return `<div class="rec-field customer-field customer-check"><label for="${id}"><input id="${id}" type="checkbox" data-customer-field="${field.key}"${value ? ' checked' : ''}${disabled}> <span>${field.label}</span></label></div>`
  }
  if (field.type === 'photo') {
    return `<div class="rec-field customer-field customer-photo"><span class="customer-photo-preview"><svg width="24" height="24" aria-hidden="true"><use href="#i-user" /></svg></span><button id="${id}" class="lbtn out" type="button" data-customer-field="${field.key}" data-customer-action="photo"${disabled}><svg width="15" height="15" aria-hidden="true"><use href="#i-clip" /></svg> Select Photo</button></div>`
  }
  if (field.type === 'select') {
    const options = [...new Set([value, ...field.options])]
    const optionMarkup = options.map(option => {
      const label = option || field.label
      return `<option value="${escapeCustomerHtml(option)}"${option === value ? ' selected' : ''}>${escapeCustomerHtml(label)}</option>`
    }).join('')
    return `<div class="rec-field customer-field"><label for="${id}">${field.label}</label><select id="${id}" data-customer-field="${field.key}"${disabled}>${optionMarkup}</select></div>`
  }
  if (field.type === 'textarea') {
    return `<div class="rec-field customer-field customer-field-wide"><label for="${id}">${field.label}</label><textarea id="${id}" rows="3" data-customer-field="${field.key}" placeholder="${field.label}"${disabled}>${escapeCustomerHtml(value)}</textarea></div>`
  }
  return `<div class="rec-field customer-field"><label for="${id}">${field.label}</label><input id="${id}" type="${field.type}" value="${escapeCustomerHtml(value)}" data-customer-field="${field.key}" placeholder="${field.label}"${disabled}></div>`
}

function renderCustomerSectionBody(key) {
  const section = CUSTOMER_SECTIONS[key]
  if (section.type === 'subledgers') return renderCustomerSubLedgers()
  if (section.type === 'empty') {
    return `<div class="customer-empty-state"><svg width="28" height="28" aria-hidden="true"><use href="#i-user" /></svg><h3>No contact details to display</h3><p>The supplied reference does not define contact-detail fields.</p></div>`
  }
  return `<div class="customer-field-grid">${section.fields.map(renderCustomerField).join('')}</div>`
}

function renderCustomerSection(key) {
  const section = CUSTOMER_SECTIONS[key]
  return `<section class="customer-section" data-customer-section="${key}"><h2>${section.title}</h2><div class="customer-section-body">${renderCustomerSectionBody(key)}</div></section>`
}

function renderCustomerCollapsible(key, concept) {
  const section = CUSTOMER_SECTIONS[key]
  const expanded = customerState.expanded.has(key)
  return `<section class="customer-section" data-customer-section="${key}" data-customer-concept="${concept}"><button class="customer-section-heading" type="button" data-customer-collapse="${key}" aria-expanded="${expanded}"><span>${section.title}</span><svg width="14" height="14" aria-hidden="true"><use href="#i-caret" /></svg></button><div class="customer-section-body"${expanded ? '' : ' hidden'}>${renderCustomerSectionBody(key)}</div></section>`
}
```

Implement `renderCustomerSubLedgers()` with the exact five columns and empty state:

```js
function renderCustomerSubLedgers() {
  return `<div class="customer-table-toolbar">
      <button class="ibtn" type="button" aria-label="Add sub ledger"><svg width="15" height="15" aria-hidden="true"><use href="#i-plus" /></svg></button>
      <div class="sp"></div>
      <label class="customer-table-search"><svg width="15" height="15" aria-hidden="true"><use href="#i-search" /></svg><input type="search" placeholder="Search" aria-label="Search sub ledgers"></label>
    </div>
    <div class="inv-grid-wrap">
      <table class="inv-grid customer-subledger-grid">
        <thead><tr><th>#</th><th>Sub Ledger Type</th><th>Number</th><th>Default</th><th>Deactivate</th></tr></thead>
        <tbody><tr><td colspan="5" class="customer-table-empty">No records to display</td></tr></tbody>
      </table>
      <div class="customer-table-pager">Display 0 to 0 from 0 inputs</div>
    </div>`
}
```

The `section.type === 'empty'` branch above is the final Contact Details rendering; do not add invented controls later.

- [ ] **Step 6: Render Customer record chrome and bind state once**

`renderCustomerRecordChrome()` creates Customer-specific breadcrumb/title/actions without modifying the invoice `.body-tpl`:

```js
function renderCustomerRecordChrome() {
  const creating = customerState.mode === 'create'
  const editing = customerState.mode === 'edit' || creating
  const title = creating
    ? 'New Customer'
    : `Customer ${escapeCustomerHtml(customerData.customerNo)}`
  document.getElementById('customer-record-chrome').innerHTML = `
    <div class="arow customer-arow" role="toolbar" aria-label="Customer toolbar">
      <button type="button" class="lbtn out" data-customer-action="record-menu">Record</button>
      <button type="button" class="lbtn out" data-customer-action="procedure-menu">Procedure</button>
      <button type="button" class="lbtn out" data-customer-action="more-menu">More</button>
    </div>
    <div class="phead">
      <div class="l">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="#">Home</a><span class="sep">›</span><button class="customer-back" type="button">Customers</button><span class="sep">›</span><span aria-current="page">${creating ? 'New' : 'All'}</span></nav>
        <div class="tline"><h1>${title}</h1><span class="badge ${customerData.deactivationFrom ? 'gray' : 'ok'}">${customerData.deactivationFrom ? 'Inactive' : 'Active'}</span></div>
      </div>
      <div class="r">
        <button class="lbtn out" type="button" data-customer-action="new"${editing ? ' hidden' : ''}>New</button>
        <button class="lbtn pri" type="button" data-customer-action="modify"${editing ? ' hidden' : ''}>Modify</button>
        <button class="lbtn pri" type="button" data-customer-action="save"${editing ? '' : ' hidden'}><svg width="15" height="15" aria-hidden="true"><use href="#i-save" /></svg> Save</button>
        <button class="lbtn out" type="button" data-customer-action="undo"${editing ? '' : ' hidden'}><svg width="15" height="15" aria-hidden="true"><use href="#i-undo" /></svg> Undo</button>
      </div>
    </div>`
}
```

Use delegated `input` and `change` listeners on `#customer-record-canvas`:

```js
document.getElementById('customer-record-canvas').addEventListener('input', event => {
  const control = event.target.closest('[data-customer-field]')
  if (!control) return
  customerData[control.dataset.customerField] =
    control.type === 'checkbox' ? control.checked : control.value
  customerState.dirty = true
})
document.getElementById('customer-record-canvas').addEventListener('click', event => {
  if (event.target.closest('[data-customer-action="photo"]')) {
    toast({tone: 'ok', title: 'Photo selection is a prototype'})
  }
})
document.getElementById('customer-record-chrome').addEventListener('click', event => {
  if (event.target.closest('.customer-back')) showContentView('customers-list')
})
```

Bind `.customer-back` to `showContentView('customers-list')` for the view-mode foundation. Bind Select Photo and out-of-scope actions to honest prototype toasts. Task 5 replaces Customer navigation with the final Customer-specific unsaved-change guard without changing the Invoice guard.

- [ ] **Step 7: Add the Customer renderer dispatcher**

```js
const CUSTOMER_RENDERERS = {
  guided: renderCustomerGuided,
  focused: renderCustomerFocused,
  compact: renderCustomerCompact,
  scroll: renderCustomerScroll,
}

function renderCustomerRecord() {
  renderCustomerRecordChrome()
  CUSTOMER_RENDERERS[customerState.layout]()
}

document.getElementById('customer-layout').addEventListener('change', event => {
  customerState.layout = event.target.value
  renderCustomerRecord()
})
```

For this task, define each renderer as a working foundation that renders its concept name and the complete Identity section through the shared field renderer. Tasks 3 and 4 replace these foundations with their final information architectures:

```js
function renderCustomerFoundation(name, className) {
  document.getElementById('customer-record-canvas').innerHTML = `<div class="${className}"><div class="customer-summary-band"><b>${name}</b><span>${escapeCustomerHtml(customerData.customerName || 'Unnamed customer')}</span></div>${renderCustomerSection('identity')}</div>`
}
function renderCustomerGuided() {
  renderCustomerFoundation('Guided Sections', 'customer-guided')
}
function renderCustomerFocused() {
  renderCustomerFoundation('Focused Navigator', 'customer-focused')
}
function renderCustomerCompact() {
  renderCustomerFoundation('Compact Workspace', 'customer-compact-grid')
}
function renderCustomerScroll() {
  renderCustomerFoundation('Scroll Navigator', 'customer-scroll-layout')
}
```

- [ ] **Step 8: Run the passing shared-state checks**

Open customer `200010`, select `Editing a saved customer` from `#customer-mode`, edit Customer Name, switch among all four layout values, and verify:

```bash
playwright-cli eval "document.querySelector('[data-customer-field=\"customerName\"]').value"
playwright-cli eval "!document.querySelector('#customer-layout-group').hidden"
```

Expected: the edited name is retained and the control group is visible. Navigate to Sales Invoice and verify `#customer-layout-group` is hidden and the Invoice title/data remain unchanged.

- [ ] **Step 9: Verify and commit**

```bash
git diff --check
git diff -- concepts/app-shell.html
git status --short
git add concepts/app-shell.html
git commit -m "feat(customer): add shared record model"
```

Expected staged allowlist: only `concepts/app-shell.html`.

---

### Task 3: Implement Guided Sections and Focused Navigator

**Files:**
- Modify: `concepts/app-shell.html`

**Interfaces:**
- Consumes: `CUSTOMER_SECTIONS`, `customerData`, `customerState`, `renderCustomerField`, `renderCustomerSubLedgers`, and the record dispatcher.
- Produces: complete `renderCustomerGuided()` and `renderCustomerFocused()` implementations.

- [ ] **Step 1: Capture the failing concept checks**

Select Guided Sections and verify the required UI is absent before implementation:

```bash
playwright-cli select "#customer-layout" guided
playwright-cli eval "document.querySelectorAll('.customer-guided [role=\"tab\"]').length"
```

Expected before implementation: `0`.

Select Focused Navigator:

```bash
playwright-cli select "#customer-layout" focused
playwright-cli eval "document.querySelectorAll('.customer-focused-nav button').length"
```

Expected before implementation: `0`.

- [ ] **Step 2: Add shared Customer-section CSS**

Add the core Customer-scoped card, field-grid, checkbox, photo, table-toolbar, empty-state, and compact-density rules. Reuse shell tokens exclusively. Do not add unscoped `.rec-*`, `.canvas`, `.phead`, `.lbtn`, or `.inv-grid` overrides:

```css
.customer-record-canvas {
  overflow: auto;
  text-align: start;
}
.customer-record-canvas .customer-summary-band {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  align-items: center;
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid var(--accent-line);
  border-radius: 8px;
  background: var(--accent-soft);
}
.customer-record-canvas .customer-section {
  overflow: hidden;
  margin-bottom: 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow-1);
}
.customer-record-canvas .customer-section > h2,
.customer-record-canvas .customer-section-heading {
  width: 100%;
  padding: 8px 12px;
  color: var(--accent);
  background: var(--line-2);
  font-size: 12.5px;
  font-weight: 700;
  text-align: start;
}
.customer-record-canvas .customer-section-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.customer-record-canvas .customer-section-heading[aria-expanded='false'] svg {
  transform: rotate(-90deg);
}
.customer-record-canvas .customer-field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px 16px;
  padding: 12px;
}
.customer-record-canvas .customer-field-wide {
  grid-column: 1 / -1;
}
.customer-record-canvas .customer-check label {
  display: flex;
  gap: 8px;
  align-items: center;
  min-height: 32px;
}
.customer-record-canvas .customer-photo {
  display: grid;
  place-items: center;
  gap: 8px;
  min-height: 120px;
  padding: 12px;
  border: 1px dashed var(--line);
  border-radius: 8px;
}
.customer-record-canvas .customer-photo-preview {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  color: var(--muted);
  border-radius: 50%;
  background: var(--line-2);
}
.customer-record-canvas .customer-table-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid var(--line);
}
.customer-record-canvas .customer-table-search {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 240px;
  padding: 6px 8px;
  border: 1px solid var(--line);
  border-radius: 6px;
}
.customer-record-canvas .customer-table-search input {
  min-width: 0;
  border: 0;
  outline: 0;
}
.customer-record-canvas .customer-table-empty,
.customer-record-canvas .customer-table-pager {
  padding: 14px;
  color: var(--muted);
  text-align: center;
}
.customer-record-canvas .customer-empty-state {
  display: grid;
  place-items: center;
  gap: 6px;
  min-height: 180px;
  padding: 24px;
  color: var(--muted);
  text-align: center;
}
body.density-compact .customer-record-canvas .customer-field-grid {
  gap: 4px 8px;
  padding: 6px;
}
body.density-compact .customer-record-canvas .customer-section {
  margin-bottom: 6px;
}
body.density-compact .customer-record-canvas .customer-section > h2,
body.density-compact .customer-record-canvas .customer-section-heading {
  padding: 5px 8px;
}
```

- [ ] **Step 3: Implement Guided Sections**

Render Identity, Deactivation, National Address, and Default Contact Info as collapsible cards. Render Main Data, Other Data, Sub Ledgers, and Contact Details as one horizontal ARIA tablist and one visible panel:

```js
const CUSTOMER_GUIDED_TOP = ['identity', 'deactivation', 'nationalAddress', 'defaultContact']
const CUSTOMER_GUIDED_TABS = ['mainData', 'otherData', 'subLedgers', 'contactDetails']

function renderCustomerGuided() {
  const canvas = document.getElementById('customer-record-canvas')
  const top = CUSTOMER_GUIDED_TOP.map(key => renderCustomerCollapsible(key, 'guided')).join('')
  const activeKey = CUSTOMER_GUIDED_TABS.includes(customerState.activeSection)
    ? customerState.activeSection
    : 'mainData'
  customerState.activeSection = activeKey
  const tabs = CUSTOMER_GUIDED_TABS.map(key => {
    const selected = activeKey === key
    return `<button class="rec-tab${selected ? ' on' : ''}" id="customer-tab-${key}" type="button" role="tab" data-customer-tab="${key}" aria-controls="customer-guided-panel" aria-selected="${selected}">${CUSTOMER_SECTIONS[key].title}</button>`
  }).join('')
  canvas.innerHTML = `<div class="customer-guided">${top}<div class="rec-tabs" role="tablist">${tabs}</div><div class="customer-guided-panel" id="customer-guided-panel" role="tabpanel" aria-labelledby="customer-tab-${activeKey}">${renderCustomerSection(activeKey)}</div></div>`
}
```

Use one delegated click handler for tabs and collapsibles; native buttons provide Enter/Space behavior:

```js
document.getElementById('customer-record-canvas').addEventListener('click', event => {
  const tab = event.target.closest('[data-customer-tab]')
  if (tab) {
    customerState.activeSection = tab.dataset.customerTab
    renderCustomerRecord()
    return
  }
  const collapse = event.target.closest('[data-customer-collapse]')
  if (collapse) {
    const key = collapse.dataset.customerCollapse
    const expanded = !customerState.expanded.has(key)
    if (expanded) customerState.expanded.add(key)
    else customerState.expanded.delete(key)
    collapse.setAttribute('aria-expanded', String(expanded))
    collapse.nextElementSibling.hidden = !expanded
  }
})
```

- [ ] **Step 4: Implement Focused Navigator**

Render a two-column layout with a persistent identity summary and one selected section:

```css
.customer-record-canvas .customer-focused {
  display: grid;
  grid-template-columns: minmax(180px, 240px) minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}
.customer-record-canvas .customer-focused-nav {
  position: sticky;
  top: 0;
  display: grid;
  gap: 3px;
  padding: 6px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow-1);
}
.customer-record-canvas .customer-focused-nav button,
.customer-record-canvas .customer-scroll-nav button {
  padding: 7px 9px;
  border-radius: 6px;
  color: var(--muted);
  text-align: start;
}
.customer-record-canvas .customer-focused-nav button[aria-current='page'],
.customer-record-canvas .customer-scroll-nav button[aria-current='page'] {
  color: var(--accent);
  background: var(--accent-soft);
  font-weight: 600;
}
```

```js
const CUSTOMER_SECTION_ORDER = [
  'identity',
  'deactivation',
  'nationalAddress',
  'defaultContact',
  'mainData',
  'otherData',
  'subLedgers',
  'contactDetails',
]

function renderCustomerFocused() {
  if (!CUSTOMER_SECTION_ORDER.includes(customerState.activeSection)) {
    customerState.activeSection = 'identity'
  }
  const nav = CUSTOMER_SECTION_ORDER.map(key => {
    const current = customerState.activeSection === key
    return `<button type="button" data-customer-focus-section="${key}" aria-current="${current ? 'page' : 'false'}">${CUSTOMER_SECTIONS[key].title}</button>`
  }).join('')
  document.getElementById('customer-record-canvas').innerHTML = `
    <div class="customer-summary-band"><b>${customerData.customerNo || 'New customer'}</b><span>${customerData.customerName || 'Unnamed customer'}</span><span>${customerData.currency || 'No currency'}</span></div>
    <div class="customer-focused">
      <nav class="customer-focused-nav" aria-label="Customer sections">${nav}</nav>
      <div class="customer-focused-panel">${renderCustomerSection(customerState.activeSection)}</div>
    </div>`
}
```

Extend the delegated click handler to replace the Focused panel rather than scroll:

```js
const focusedLink = event.target.closest('[data-customer-focus-section]')
if (focusedLink) {
  customerState.activeSection = focusedLink.dataset.customerFocusSection
  renderCustomerRecord()
  return
}
```

- [ ] **Step 5: Verify both concepts and field coverage**

Guided checks:

```bash
playwright-cli select "#customer-layout" guided
playwright-cli eval "document.querySelectorAll('.customer-guided [role=\"tab\"]').length"
playwright-cli eval "document.querySelectorAll('.customer-guided [data-customer-field]').length > 0"
```

Expected: `4` and `true`. Click Other Data and verify `Black List Reason`, all four checkboxes, and Remarks appear. Click Sub Ledgers and verify the five headers and empty state.

Focused checks:

```bash
playwright-cli select "#customer-layout" focused
playwright-cli eval "document.querySelectorAll('.customer-focused-nav button').length"
playwright-cli eval "document.querySelectorAll('.customer-focused-panel .customer-section').length"
```

Expected: `8` and `1`. Select every nav item and verify the heading matches the button.

- [ ] **Step 6: Verify and commit**

```bash
git diff --check
git diff -- concepts/app-shell.html
git status --short
git add concepts/app-shell.html
git commit -m "feat(customer): add guided and focused layouts"
```

Expected staged allowlist: only `concepts/app-shell.html`.

---

### Task 4: Implement Compact Workspace and Scroll Navigator

**Files:**
- Modify: `concepts/app-shell.html`

**Interfaces:**
- Consumes: the shared Customer schema/renderers and `CUSTOMER_SECTION_ORDER`.
- Produces: complete `renderCustomerCompact()`, `renderCustomerScroll()`, `activateCustomerScrollSection(key)`, and Customer-only responsive/scroll-spy behavior.

- [ ] **Step 1: Capture failing checks for Concepts 3 and 4**

```bash
playwright-cli select "#customer-layout" compact
playwright-cli eval "document.querySelectorAll('.customer-compact-grid .customer-section').length"
playwright-cli select "#customer-layout" scroll
playwright-cli eval "document.querySelectorAll('.customer-scroll-nav button').length"
```

Expected before implementation: both return `0`.

- [ ] **Step 2: Implement Compact Workspace**

Render the Customer summary first, then responsive section cards. Identity spans the available width; Deactivation and Default Contact are compact cards; National Address, Main Data, and Other Data receive wider card spans; Sub Ledgers and Contact Details are full width:

```js
function renderCustomerCompact() {
  const cards = CUSTOMER_SECTION_ORDER.map(key => {
    const full = ['identity', 'subLedgers', 'contactDetails'].includes(key)
    const wide = ['nationalAddress', 'mainData', 'otherData'].includes(key)
    return `<div class="customer-compact-card${full ? ' full' : ''}${wide ? ' wide' : ''}">${renderCustomerCollapsible(key, 'compact')}</div>`
  }).join('')
  document.getElementById('customer-record-canvas').innerHTML = `
    <div class="customer-summary-band"><b>${customerData.customerNo || 'New customer'}</b><span>${customerData.customerName || 'Unnamed customer'}</span><span>${customerData.contactPhone || 'No phone'}</span><span>${customerData.currency || 'No currency'}</span></div>
    <div class="customer-compact-grid">${cards}</div>`
}
```

Add the Customer-scoped compact grid:

```css
.customer-record-canvas .customer-compact-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 12px;
}
.customer-record-canvas .customer-compact-card {
  grid-column: span 4;
}
.customer-record-canvas .customer-compact-card.wide {
  grid-column: span 8;
}
.customer-record-canvas .customer-compact-card.full {
  grid-column: 1 / -1;
}
.customer-record-canvas .customer-compact-card .customer-section {
  height: 100%;
  margin-bottom: 0;
}
@media (max-width: 1000px) {
  .customer-record-canvas .customer-compact-card,
  .customer-record-canvas .customer-compact-card.wide {
    grid-column: span 6;
  }
  .customer-record-canvas .customer-compact-card.full {
    grid-column: 1 / -1;
  }
}
```

- [ ] **Step 3: Implement the two-column Scroll Navigator**

Render every section continuously and give each section a stable target ID:

```css
.customer-record-canvas .customer-scroll-layout {
  display: grid;
  grid-template-columns: minmax(180px, 240px) minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}
.customer-record-canvas .customer-scroll-nav {
  position: sticky;
  top: 0;
  display: grid;
  gap: 3px;
  padding: 6px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow-1);
}
.customer-record-canvas [data-customer-scroll-target] {
  scroll-margin-top: 12px;
}
```

```js
function renderCustomerScroll() {
  const nav = CUSTOMER_SECTION_ORDER.map(key => {
    const current = customerState.activeSection === key
    return `<button type="button" data-customer-scroll-section="${key}" aria-current="${current ? 'page' : 'false'}">${CUSTOMER_SECTIONS[key].title}</button>`
  }).join('')
  const sections = CUSTOMER_SECTION_ORDER.map(
    key => `<div id="customer-section-${key}" data-customer-scroll-target="${key}">${renderCustomerCollapsible(key, 'scroll')}</div>`
  ).join('')
  document.getElementById('customer-record-canvas').innerHTML = `
    <div class="customer-scroll-layout">
      <nav class="customer-scroll-nav" aria-label="Customer sections">${nav}</nav>
      <div class="customer-scroll-content">${sections}</div>
    </div>`
  startCustomerScrollSpy()
}
```

Use two desktop columns: `minmax(180px, 240px) minmax(0, 1fr)`. Make `.customer-scroll-nav` sticky beneath the page header and independently sized to its contents.

- [ ] **Step 4: Implement expand-then-scroll and active-section tracking**

```js
function activateCustomerScrollSection(key) {
  customerState.activeSection = key
  customerState.expanded.add(key)
  const section = document.getElementById(`customer-section-${key}`)
  const body = section.querySelector('.customer-section-body')
  const heading = section.querySelector('.customer-section-heading')
  body.hidden = false
  heading.setAttribute('aria-expanded', 'true')
  document.querySelectorAll('.customer-scroll-nav button').forEach(button => {
    button.setAttribute(
      'aria-current',
      button.dataset.customerScrollSection === key ? 'page' : 'false'
    )
  })
  section.scrollIntoView({
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start',
  })
}
```

`startCustomerScrollSpy()` disconnects the previous observer before creating a new `IntersectionObserver`. Observe `[data-customer-scroll-target]` with a top-biased `rootMargin`; update `customerState.activeSection` and the nav's `aria-current` when an intersecting section becomes the nearest visible target. If `IntersectionObserver` is unavailable, keep click navigation working and skip scroll-spy:

```js
let customerScrollObserver = null
function startCustomerScrollSpy() {
  customerScrollObserver?.disconnect()
  customerScrollObserver = null
  if (!('IntersectionObserver' in window)) return
  customerScrollObserver = new IntersectionObserver(
    entries => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (!visible.length) return
      const key = visible[0].target.dataset.customerScrollTarget
      customerState.activeSection = key
      document.querySelectorAll('.customer-scroll-nav button').forEach(button => {
        button.setAttribute(
          'aria-current',
          button.dataset.customerScrollSection === key ? 'page' : 'false'
        )
      })
    },
    {rootMargin: '-120px 0px -65% 0px', threshold: [0, 0.1, 0.5]}
  )
  document
    .querySelectorAll('[data-customer-scroll-target]')
    .forEach(section => customerScrollObserver.observe(section))
}
```

Extend the Customer canvas's delegated click handler:

```js
const scrollLink = event.target.closest('[data-customer-scroll-section]')
if (scrollLink) activateCustomerScrollSection(scrollLink.dataset.customerScrollSection)
```

- [ ] **Step 5: Add narrow-screen behavior**

At `max-width: 720px`, use these Customer-only responsive rules:

```css
@media (max-width: 720px) {
  .customer-record-canvas .customer-focused,
  .customer-record-canvas .customer-scroll-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .customer-record-canvas .customer-focused-nav,
  .customer-record-canvas .customer-scroll-nav {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    overflow-x: auto;
    white-space: nowrap;
  }
  .customer-record-canvas .customer-compact-card,
  .customer-record-canvas .customer-compact-card.wide,
  .customer-record-canvas .customer-compact-card.full {
    grid-column: 1 / -1;
  }
  .customer-record-canvas .customer-field-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
[dir='rtl'] .customer-record-canvas .customer-section-heading[aria-expanded='false'] svg {
  transform: rotate(90deg);
}
```

Verify neither Customer layout adds horizontal page overflow:

```bash
playwright-cli eval "document.documentElement.scrollWidth === document.documentElement.clientWidth"
```

Expected: `true` at both desktop and 720px viewport widths.

- [ ] **Step 6: Verify both concepts and the required Scroll Navigator behavior**

Compact checks:

```bash
playwright-cli select "#customer-layout" compact
playwright-cli eval "document.querySelectorAll('.customer-compact-grid .customer-section').length"
```

Expected: `8`.

Scroll checks:

```bash
playwright-cli select "#customer-layout" scroll
playwright-cli eval "document.querySelectorAll('.customer-scroll-nav button').length"
playwright-cli eval "document.querySelectorAll('[data-customer-scroll-target]').length"
```

Expected: `8` and `8`.

Collapse Other Data, then click its vertical-nav link. Expected: the section expands, scrolls into view, and the matching button has `aria-current="page"`. Manually scroll to Sub Ledgers. Expected: scroll-spy moves `aria-current="page"` to Sub Ledgers.

- [ ] **Step 7: Verify and commit**

```bash
git diff --check
git diff -- concepts/app-shell.html
git status --short
git add concepts/app-shell.html
git commit -m "feat(customer): add compact and scroll layouts"
```

Expected staged allowlist: only `concepts/app-shell.html`.

---

### Task 5: Complete modes, accessibility, regression checks, and visual QA

**Files:**
- Modify: `concepts/app-shell.html`
- Read: `docs/superpowers/specs/2026-08-23-customer-pages-design.md`
- Read: `CleanShot 2026-08-23 at 14.10.31@2x.png`
- Read: `CleanShot 2026-08-23 at 14.10.57@2x.png`
- Read: `CleanShot 2026-08-23 at 14.11.10@2x.png`

**Interfaces:**
- Consumes: all Customer views, renderers, shared state, and existing Invoice flows.
- Produces: final view/edit/create behavior, unsaved guard integration, Customer field coverage proof, Sales Invoice regression proof, and stakeholder-ready screenshots.

- [ ] **Step 1: Audit the implementation against the specification and screenshots**

Create an in-session checklist with all 70 required Customer field/control labels from the spec. For each of the four layouts, use DOM evaluation to collect visible or reachable `[data-customer-field]` keys and confirm the set equals the schema's field-key set. Verify the Sub Ledgers and Contact Details destinations separately because they do not contain ordinary fields.

The automated equality check in the page must return `true`:

```js
(() => {
  const expected = [...window.customerPrototype.fieldKeys].sort()
  const actual = [...document.querySelectorAll('[data-customer-field]')]
    .map(control => control.dataset.customerField)
    .filter((key, index, keys) => keys.indexOf(key) === index)
    .sort()
  return JSON.stringify(actual) === JSON.stringify(expected)
})()
```

If concept-specific rendering means only one Focused/Guided section is in the DOM at a time, iterate every tab/nav destination and union the collected keys before comparing.

- [ ] **Step 2: Complete view, edit, create, Save, and Undo behavior**

Add a Customer-specific guard beside `#gscrim`. It reuses the existing `.dscrim`/`.guard` presentation but has unique IDs and never mutates Invoice guard state:

```html
<div class="dscrim" id="customer-gscrim">
  <div class="guard" role="dialog" aria-modal="true" aria-labelledby="customer-g-title">
    <div class="gh"><svg width="17" height="17" aria-hidden="true"><use href="#i-clock" /></svg><h3 id="customer-g-title">You have unsaved customer changes</h3></div>
    <div class="gb"><span id="customer-g-msg"></span><div class="lst" id="customer-g-what"></div></div>
    <div class="gf"><button class="lbtn out" id="customer-g-discard">Leave without saving</button><span class="end"><button class="lbtn out" id="customer-g-stay">Stay here</button><button class="lbtn pri" id="customer-g-save">Save, then leave</button></span></div>
  </div>
</div>
```

Implement Customer mode/action helpers without reusing invoice `state` or `applyState()`:

```js
function setCustomerMode(mode) {
  customerState.mode = mode
  customerState.dirty = false
  document.getElementById('customer-mode').value = mode
  renderCustomerRecord()
}

function saveCustomer() {
  customerState.mode = 'view'
  customerState.dirty = false
  customerSavedSnapshot = structuredClone(customerData)
  document.getElementById('customer-mode').value = 'view'
  renderCustomerRecord()
  toast({tone: 'ok', title: 'Customer saved'})
}

function undoCustomer() {
  if (customerState.mode === 'create') {
    customerState.dirty = false
    showContentView('customers-list')
    return
  }
  customerData = structuredClone(customerSavedSnapshot)
  setCustomerMode('view')
}

document.getElementById('customer-record-chrome').addEventListener('click', event => {
  const actionButton = event.target.closest('[data-customer-action]')
  const action = actionButton?.dataset.customerAction
  if (action === 'new') openCustomerRecord(null, 'create')
  if (action === 'modify') {
    customerSavedSnapshot = structuredClone(customerData)
    setCustomerMode('edit')
  }
  if (action === 'save') saveCustomer()
  if (action === 'undo') undoCustomer()
  if (['record-menu', 'procedure-menu', 'more-menu'].includes(action)) {
    toast({tone: 'ok', title: `${actionButton.textContent.trim()} actions are a prototype`})
  }
})
```

Implement the separate guard and navigation interception:

```js
const customerGuardScrim = document.getElementById('customer-gscrim')
let customerGuardAfter = null
const customerAtRisk = () =>
  customerState.mode === 'create' || (customerState.mode === 'edit' && customerState.dirty)

function askCustomerGuard(after, label) {
  customerGuardAfter = after
  document.getElementById('customer-g-msg').textContent =
    customerState.mode === 'create'
      ? 'This customer has never been saved.'
      : 'This customer has changes that were never saved.'
  document.getElementById('customer-g-what').textContent = `You were about to: ${label}.`
  customerGuardScrim.classList.add('open')
  setTimeout(() => trapFocus(customerGuardScrim.querySelector('.guard')), 0)
}

function closeCustomerGuard() {
  customerGuardScrim.classList.remove('open')
  releaseFocus()
}

document.getElementById('customer-g-stay').addEventListener('click', () => {
  customerGuardAfter = null
  closeCustomerGuard()
})
document.getElementById('customer-g-discard').addEventListener('click', () => {
  const after = customerGuardAfter
  customerGuardAfter = null
  customerState.dirty = false
  if (customerState.mode === 'edit') customerData = structuredClone(customerSavedSnapshot)
  closeCustomerGuard()
  after?.()
})
document.getElementById('customer-g-save').addEventListener('click', () => {
  const after = customerGuardAfter
  customerGuardAfter = null
  saveCustomer()
  closeCustomerGuard()
  after?.()
})

document.addEventListener('click', event => {
  const recordVisible = !document.querySelector('.customer-record-view').hidden
  const destination = event.target.closest('.customer-back, .nc1-item, [data-label], .customer-record-view .pager button')
  if (!recordVisible || !destination || !customerAtRisk()) return
  event.preventDefault()
  event.stopImmediatePropagation()
  const label = destination.classList.contains('customer-back')
    ? 'return to the Customers list'
    : 'leave this customer record'
  askCustomerGuard(() => {
    if (destination.classList.contains('customer-back')) showContentView('customers-list')
    else destination.click()
  }, label)
}, true)
```

The final behavior must be: view disables fields and shows New/Modify; edit/create enable fields and show Save/Undo; Save keeps values and returns to view; edit Undo restores the snapshot; create Undo returns to Customers; dirty navigation shows Customer wording. Invoice guard markup and handlers stay unchanged.

- [ ] **Step 3: Verify semantic and keyboard behavior**

Check:

- Every non-checkbox field has a visible `<label>` associated by `for`/`id` or an enclosing label.
- Every icon-only Customer button has `aria-label`.
- Guided tabs expose `role="tab"`, `aria-selected`, and one active panel.
- Focused and Scroll navigators expose an accessible nav label and one `aria-current="page"` item.
- Collapsible headings are buttons with `aria-expanded` and keyboard activation.
- Focus stays visible using existing shell focus tokens.
- Select Photo and prototype-only actions announce their result through the existing toast region.

- [ ] **Step 4: Run full desktop browser verification**

At the default desktop viewport:

1. Open Sales Invoice list; verify 7 invoice columns and 3 sample invoice rows.
2. Open Invoice 143; verify the Sales Invoice title, Customer card, Items grid, and totals still render.
3. Open Customers; verify 9 Customer columns and 3 sample rows.
4. Open `200010`; verify the populated title and Customer layout control.
5. Switch through all four concepts and capture:

```bash
playwright-cli screenshot --filename=/tmp/customer-guided.png
playwright-cli screenshot --filename=/tmp/customer-focused.png
playwright-cli screenshot --filename=/tmp/customer-compact.png
playwright-cli screenshot --filename=/tmp/customer-scroll.png
```

6. Exercise Guided tabs, Focused section switching, Compact collapsibles, and Scroll expand-then-scroll.
7. Edit Customer Name, switch all concepts, and verify the value remains.
8. Use Add Customer, Save, Undo, and dirty-navigation guard.
9. Open Customer search, filter Active records, clear the filter, and close with Escape.

Expected: no broken layouts, wrong titles, lost edits, or Invoice data changes.

- [ ] **Step 5: Run responsive, RTL, density, and reduced-motion checks**

At 720px width, verify all four Customer concepts avoid horizontal page overflow and Concepts 2/4 move their navigation above content. Enable RTL and compact density in the existing prototype controls and repeat each concept. Emulate reduced motion, click a Scroll Navigator destination, and verify navigation still occurs without depending on smooth animation.

```bash
playwright-cli resize 720 1000
playwright-cli eval "document.documentElement.scrollWidth === document.documentElement.clientWidth"
playwright-cli check "#rtl"
playwright-cli select "#density" compact
playwright-cli run-code "async page => await page.emulateMedia({ reducedMotion: 'reduce' })"
playwright-cli select "#customer-layout" scroll
```

Expected: overflow evaluation returns `true`; the Customer content is RTL/compact; clicking a Scroll Navigator destination still moves its target into view. Restore the desktop viewport and controls before the final console check:

```bash
playwright-cli resize 1440 1000
playwright-cli uncheck "#rtl"
playwright-cli select "#density" default
playwright-cli run-code "async page => await page.emulateMedia({ reducedMotion: 'no-preference' })"
```

- [ ] **Step 6: Check console and source hygiene**

```bash
playwright-cli console
git diff --check
git status --short
```

Expected: no new console errors, no whitespace errors, only `concepts/app-shell.html` modified, and the three CleanShot references still untracked.

- [ ] **Step 7: Run UI, security, production-code, and verification guard passes**

Use `impeccable` on the four Customer concepts, `VibeSec-Skill` on the Customer field/list rendering and event handling, `clean-code-guard` on the Customer diff, then `verification-before-completion`. Fix only Customer-scope findings. Re-run the entire Task 5 browser matrix after any fix.

- [ ] **Step 8: Commit the verified polish**

```bash
git add concepts/app-shell.html
git diff --cached --check
git diff --cached --stat
git commit -m "fix(customer): complete prototype interactions"
```

Expected staged allowlist: only `concepts/app-shell.html`. Do not commit `/tmp/customer-*.png` or the source CleanShot files.
