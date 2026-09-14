// Customer fixtures -- moved verbatim (by name, unmodified bodies) out of
// concepts/app/legacy-app.js as part of Task 5's fixture-ownership split.
//
// CUSTOMER_ROWS is the Customers list's sample row data (paired with
// DATA_LIST_SIMULATED_TOTAL.customer = 72 in components/data-list/model.js
// -- these 3 rows are a representative sample, not the full simulated
// dataset).
//
// customerField()/CUSTOMER_SECTIONS/CUSTOMER_REFERENCE describe the
// customer record's field layout and reference values -- moved here per the
// task-5 brief's explicit naming ("customer CUSTOMER_ROWS, CUSTOMER_
// SECTIONS, CUSTOMER_REFERENCE, lookup/unit rows"). customerField() is
// CUSTOMER_SECTIONS's sole, tiny helper (a field-shape object literal
// builder) and moves with it since the two are inseparable. NOTE: the
// broader customer-record-page logic that consumes these (
// createBlankCustomerData/createSavedCustomerData/CUSTOMER_SECTION_ORDER/
// CUSTOMER_GUIDED_TABS/CUSTOMER_REQUIRED_FIELDS/customerState/
// customerLookupState and the render/validate functions) is NOT named in
// the brief and stays in legacy-app.js -- full customer-page extraction is
// Task 7, not this task.
//
// UNIT_ROWS/CUSTOMER_LOOKUP_RESULTS are the "lookup/unit rows" the brief
// names: sample data for the Operation Unit / Customer Type / etc. lookup
// pickers on the customer record form.
//
// Read-only sample/reference data throughout: legacy-app.js never mutates
// any of these in place (CUSTOMER_REFERENCE.photo reads CUSTOMER_ROWS[0]
// once at module-evaluation time, same as the original -- not a mutation).

export const CUSTOMER_ROWS = [
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
    photo: {
      src: 'assets/customers/customer-200010-portrait.webp',
      alt: 'Portrait of customer_412',
      fit: 'cover',
    },
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
    photo: {
      src: 'assets/customers/customer-200002-organization.webp',
      alt: 'Organization mark for customertest',
      fit: 'contain',
    },
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
    photo: null,
  },
]

export const customerField = (key, label, type = 'text', options = []) => ({
  key,
  label,
  type,
  options,
})

export const CUSTOMER_SECTIONS = {
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

export const CUSTOMER_REFERENCE = {
  customerNo: '200010',
  customerName: 'customer_412',
  operationUnit: '2 - lastchance',
  customerType: '',
  primeCustomer: '',
  accountCode: '114001 - Customers',
  customerGroup: '',
  linkedBeneficiaries: false,
  currency: 'EGP - Egyptian Pound',
  photo: CUSTOMER_ROWS[0].photo,
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

export const UNIT_ROWS = [
  {code: '1', name: 'Head Office', parentCode: '', level: 1, status: 'Active'},
  {code: '2', name: 'lastchance', parentCode: '1', level: 2, status: 'Active'},
  {code: '3', name: 'Cairo Branch', parentCode: '1', level: 2, status: 'Active'},
  {code: '4', name: 'Alexandria Branch', parentCode: '1', level: 2, status: 'Active'},
  {code: '9', name: 'Old Branch', parentCode: '1', level: 2, status: 'Inactive'},
]

export const CUSTOMER_LOOKUP_RESULTS = {
  customerType: [
    {value: 'Retail', status: 'Active', order: 10, details: 'Retail customers'},
    {value: 'Wholesale', status: 'Active', order: 20, details: 'Wholesale customers'},
    {value: 'Government', status: 'Active', order: 30, details: 'Public sector'},
    {
      value: 'Legacy',
      status: 'Inactive',
      order: 90,
      details: 'Not available for new records',
    },
  ],
  operationUnit: [
    {
      value: '2 - lastchance',
      code: '2',
      country: 'EG - Egypt',
      parent: 'Head Office',
      status: 'Active',
    },
    {
      value: '3 - Cairo Branch',
      code: '3',
      country: 'EG - Egypt',
      parent: 'Head Office',
      status: 'Active',
    },
    {
      value: '4 - Alexandria Branch',
      code: '4',
      country: 'EG - Egypt',
      parent: 'Head Office',
      status: 'Active',
    },
    {
      value: '9 - Old Branch',
      code: '9',
      country: 'EG - Egypt',
      parent: 'Head Office',
      status: 'Inactive',
    },
  ],
  unitLocation: [
    {
      value: 'Cairo',
      code: '2',
      parent: 'Egypt',
      level: '2',
      type: 'Governorate',
      status: 'Active',
    },
    {
      value: 'Alexandria',
      code: '3',
      parent: 'Egypt',
      level: '2',
      type: 'Governorate',
      status: 'Active',
    },
    {
      value: 'Nasr City',
      code: '21',
      parent: 'Cairo',
      level: '3',
      type: 'District',
      status: 'Active',
    },
  ],
}
