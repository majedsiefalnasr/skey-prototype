// Contact cards and Default Contact Info share these values in both directions.
export const DEFAULT_CONTACT_FIELDS = {
  address: 'contactAddress', addressDetails: 'contactAddressDetails', city: 'contactCity',
  state: 'contactState', country: 'contactCountry', postalCode: 'contactPostalCode',
  phone: 'contactPhone', email: 'contactEmail', mobile: 'contactMobile', website: 'contactWebsite',
  fax: 'contactFax', poBox: 'contactPoBox',
}

export const CONTACT_TYPES = ['Mobile', 'Phone', 'Fax', 'E-mail', 'Website', 'P.O. Box', 'Postal Code', 'Address']

export function blankContact() {
  return {id: '', name: '', classification: 'Work', title: '', jobTitle: '', remarks: '',
    photo: null, order: 1, isDefault: false, connections: [], whatsapp: '', telegram: '',
    facebook: '', twitter: '', youtube: '',
    ...Object.fromEntries(Object.keys(DEFAULT_CONTACT_FIELDS).map(key => [key, '']))}
}

export function copyDefaultToContact(customer, contact) {
  for (const [key, field] of Object.entries(DEFAULT_CONTACT_FIELDS)) contact[key] = customer[field] || ''
}

export function copyContactToDefault(customer, contact) {
  for (const [key, field] of Object.entries(DEFAULT_CONTACT_FIELDS)) customer[field] = contact[key] || ''
}

export function ensureContacts(customer) {
  customer.contactDetails ||= []
  if (!customer.contactDetails.length && Object.values(DEFAULT_CONTACT_FIELDS).some(field =>
    field !== 'contactCountry' && customer[field])) {
    const primary = {...blankContact(), id: 'primary', name: customer.customerName || 'Default contact', isDefault: true}
    copyDefaultToContact(customer, primary)
    customer.contactDetails.push(primary)
  }
  if (customer.contactDetails.length) {
    const primary = customer.contactDetails.find(contact => contact.isDefault) || customer.contactDetails[0]
    for (const contact of customer.contactDetails) contact.isDefault = contact === primary
    copyContactToDefault(customer, primary)
  }
  return customer.contactDetails
}

export function saveContact(customer, draft) {
  const contacts = customer.contactDetails ||= []
  const index = contacts.findIndex(contact => contact.id === draft.id)
  const contact = structuredClone(draft)
  contact.id ||= globalThis.crypto.randomUUID()
  const previousDefault = contacts.find(item => item.isDefault)
  // A customer with contacts always has exactly one default.
  contact.isDefault = Boolean(contact.isDefault || !contacts.length || previousDefault?.id === contact.id)
  if (index < 0) contacts.push(contact)
  else contacts[index] = contact
  if (contact.isDefault) {
    for (const item of contacts) item.isDefault = item.id === contact.id
    copyContactToDefault(customer, contact)
  }
  return contact
}

export function setDefaultContact(customer, id) {
  const contact = customer.contactDetails.find(item => item.id === id)
  if (!contact) return
  for (const item of customer.contactDetails) item.isDefault = item === contact
  copyContactToDefault(customer, contact)
}

export function removeContact(customer, id) {
  const removed = customer.contactDetails.find(contact => contact.id === id)
  if (!removed) return false
  customer.contactDetails = customer.contactDetails.filter(contact => contact.id !== id)
  if (removed.isDefault) {
    const next = [...customer.contactDetails].sort((a, b) => Number(a.order || 0) - Number(b.order || 0))[0]
    if (next) setDefaultContact(customer, next.id)
    else copyContactToDefault(customer, blankContact())
  }
  return true
}

export function updateDefaultContact(customer, fieldKey, value) {
  customer[fieldKey] = value
  const entry = Object.entries(DEFAULT_CONTACT_FIELDS).find(([, field]) => field === fieldKey)
  if (!entry) return
  if (!customer.contactDetails?.length) {
    ensureContacts(customer)
    return
  }
  const contact = customer.contactDetails.find(item => item.isDefault)
  if (contact) contact[entry[0]] = value
}
