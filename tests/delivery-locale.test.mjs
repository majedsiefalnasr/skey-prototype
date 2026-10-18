import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocale, uiLocale} from '../concepts/app/core/locale.js';
import {validateCustomerField} from '../concepts/app/pages/customers/fields.js';
import {PROFILE_SECTIONS} from '../concepts/app/pages/profile/fields.js';
import {ORGANIZATION_SECTIONS, ORGANIZATION_SECTION_ORDER} from '../concepts/app/pages/organization/fields.js';
import {createWork} from '../concepts/app/core/work.js';

test('Arabic busy feedback translates and restores the original button markup', async () => {
  const previous = uiLocale.getLocale();
  uiLocale.setLocale('ar');
  const attributes = new Map();
  const button = {innerHTML: '<b>حفظ</b>', setAttribute: (key,value) => attributes.set(key,value), removeAttribute: key => attributes.delete(key)};
  try {
    const done = createWork({shouldFail: () => false})(button, 'Saving…', 0);
    assert.match(button.innerHTML, /جار الحفظ/);
    assert.equal(attributes.get('aria-busy'), 'true');
    assert.equal(await done, true);
    assert.equal(button.innerHTML, '<b>حفظ</b>');
    assert.equal(attributes.has('aria-busy'), false);
  } finally {
    uiLocale.setLocale(previous);
  }
});

test('all visible Profile and Organization section headings and descriptions have Arabic copy', () => {
  const locale = createLocale();
  locale.setLocale('ar');
  const sections = [...Object.values(PROFILE_SECTIONS), ...ORGANIZATION_SECTION_ORDER.map(key => ORGANIZATION_SECTIONS[key])];
  for (const section of sections) {
    for (const key of [section.title, section.description]) assert.match(locale.t(key), /[\u0600-\u06ff]/, key);
  }
});

test('destructive invoice dialog instructions and prototype outcomes have Arabic copy', () => {
  const locale = createLocale();
  locale.setLocale('ar');
  for (const key of [
    'Posting writes this invoice into the accounts. After that it can be read but not edited.',
    'The invoice stays in the records as void, together with the reason you give below.',
    'The invoice and its lines are gone for good.',
    'A reason is required',
    'Prototype only: {action}',
    'This prototype does not create a related document.',
  ]) {
    assert.match(locale.t(key), /[\u0600-\u06ff]/, key);
  }
});

test('Arabic customer validation translates the instruction and field label', () => {
  const previous = uiLocale.getLocale();
  uiLocale.setLocale('ar');
  try {
    assert.equal(validateCustomerField({key: 'customerName', label: 'Customer Name'}, {}), 'اسم العميل مطلوب.');
  } finally {
    uiLocale.setLocale(previous);
  }
});
