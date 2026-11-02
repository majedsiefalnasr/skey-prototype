import {test} from 'node:test'
import assert from 'node:assert/strict'
import {blankContact, ensureContacts, saveContact, removeContact, setDefaultContact, updateDefaultContact} from '../concepts/app/pages/customers/contacts-model.js'
import {createSavedCustomerData, validateCustomerField, validateCustomerRecord} from '../concepts/app/pages/customers/fields.js'
import {validateCoordinatePair} from '../concepts/app/pages/customers/location-picker.js'
import {CUSTOMER_ROWS, CUSTOMER_REFERENCE} from '../concepts/app/prototype/fixtures/customers.js'

test('legacy Default Contact Info becomes one default card without sharing saved arrays', () => {
  const saved = structuredClone(CUSTOMER_ROWS)
  const a = createSavedCustomerData(saved[0].customerNo, saved, CUSTOMER_REFERENCE)
  const b = createSavedCustomerData(saved[1].customerNo, saved, CUSTOMER_REFERENCE)
  assert.equal(a.contactDetails.length, 1)
  assert.equal(a.contactDetails[0].phone, a.contactPhone)
  assert.equal(a.contactDetails[0].isDefault, true)
  a.contactDetails[0].phone = 'changed'
  assert.notEqual(b.contactDetails[0].phone, 'changed')
  assert.deepEqual(saved, CUSTOMER_ROWS)
  assert.equal(CUSTOMER_REFERENCE.contactDetails.length, 0)
})

test('first contact is default and additional contacts preserve it', () => {
  const customer = {contactDetails: []}
  const first = saveContact(customer, {...blankContact(), name: 'First', email: 'a@example.com'})
  saveContact(customer, {...blankContact(), name: 'Second', email: 'b@example.com'})
  assert.equal(customer.contactEmail, 'a@example.com')
  assert.equal(customer.contactDetails.filter(item => item.isDefault).length, 1)
  assert.equal(customer.contactDetails[0].id, first.id)
})

test('removing a default contact selects the next contact and removing the last clears synchronized fields', () => {
  const customer = {contactDetails: []}
  const first = saveContact(customer, {...blankContact(), name: 'First', email: 'a@example.com'})
  const second = saveContact(customer, {...blankContact(), name: 'Second', phone: '123'})
  assert.equal(removeContact(customer, first.id), true)
  assert.equal(customer.contactPhone, '123')
  assert.equal(customer.contactEmail, '')
  assert.equal(customer.contactDetails[0].isDefault, true)
  removeContact(customer, second.id)
  ensureContacts(customer)
  assert.equal(customer.contactDetails.length, 0)
  assert.equal(customer.contactPhone, '')
})

test('changing the default replaces every default field and preserves the other card', () => {
  const customer = {contactDetails: []}
  const first = saveContact(customer, {...blankContact(), name: 'First', email: 'a@example.com', phone: '111'})
  const second = saveContact(customer, {...blankContact(), name: 'Second', mobile: '222'})
  setDefaultContact(customer, second.id)
  assert.equal(customer.contactEmail, '')
  assert.equal(customer.contactPhone, '')
  assert.equal(customer.contactMobile, '222')
  assert.equal(customer.contactDetails.find(item => item.id === first.id).phone, '111')
  assert.equal(customer.contactDetails.filter(item => item.isDefault).length, 1)
})

test('editing either side synchronizes only the default contact', () => {
  const customer = {contactDetails: []}
  const first = saveContact(customer, {...blankContact(), name: 'First'})
  const second = saveContact(customer, {...blankContact(), name: 'Second'})
  updateDefaultContact(customer, 'contactAddress', 'New address')
  assert.equal(customer.contactDetails[0].address, 'New address')
  assert.equal(customer.contactDetails[1].address, '')
  saveContact(customer, {...first, address: 'Edited card', isDefault: false})
  assert.equal(customer.contactAddress, 'Edited card')
  assert.equal(customer.contactDetails[0].isDefault, true)
  saveContact(customer, {...second, email: 'new@example.com', isDefault: true})
  assert.equal(customer.contactEmail, 'new@example.com')
  assert.equal(customer.contactDetails.filter(item => item.isDefault).length, 1)
  ensureContacts(customer)
  assert.equal(customer.contactDetails.length, 2)
})

test('coordinate pairs validate together and synchronize only the default contact', () => {
  assert.equal(validateCoordinatePair('', ''), '')
  for (const pair of [['12', ''], ['', '2'], ['91', '2'], ['1', '-181'], ['Infinity', '0'], ['1e2', '1']]) {
    assert.notEqual(validateCoordinatePair(...pair), '')
  }
  assert.equal(validateCoordinatePair('0', '-180'), '')
  const customer = {contactDetails: []}
  const first = saveContact(customer, {...blankContact(), name: 'First', latitude: '30.04', longitude: '31.23'})
  const second = saveContact(customer, {...blankContact(), name: 'Second', latitude: '29.9', longitude: '31.1'})
  assert.equal(customer.contactLatitude, '30.04')
  assert.equal(customer.contactLongitude, '31.23')
  updateDefaultContact(customer, 'contactLongitude', '31.25')
  assert.equal(customer.contactDetails[0].longitude, '31.25')
  assert.equal(customer.contactDetails[1].longitude, '31.1')
  setDefaultContact(customer, second.id)
  assert.equal(customer.contactLatitude, '29.9')
  assert.equal(customer.contactLongitude, '31.1')
  assert.equal(customer.contactDetails.find(item => item.id === first.id).latitude, '30.04')
  customer.contactLongitude = ''
  assert.notEqual(validateCustomerField({key: 'contactLatitude'}, customer), '')
  const saved = createSavedCustomerData(CUSTOMER_ROWS[0].customerNo, CUSTOMER_ROWS, CUSTOMER_REFERENCE)
  saved.contactLatitude = '91'
  saved.contactLongitude = '0'
  const state = {errors: new Map()}
  assert.equal(validateCustomerRecord(saved, state), false)
  assert.ok(state.errors.has('contactLatitude'))
})

test('editing Default Contact Info on a blank customer creates a synchronized card', () => {
  const customer = {customerName: 'New customer', contactDetails: []}
  updateDefaultContact(customer, 'contactFax', '1234')
  assert.equal(customer.contactDetails.length, 1)
  assert.equal(customer.contactDetails[0].fax, '1234')
  assert.equal(customer.contactDetails[0].isDefault, true)
})
