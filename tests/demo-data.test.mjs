import test from 'node:test';
import assert from 'node:assert/strict';
import {COLLAB_SEED, COLLAB_USERS, PROTOTYPE_NOW} from '../concepts/app/prototype/fixtures/collaboration.js';
import {CURRENT_USER, EMPLOYEE_DETAILS, LOGIN_LOG_ROWS} from '../concepts/app/prototype/fixtures/profile.js';
import {SYSTEM_HEALTH, ORGANIZATION_USERS} from '../concepts/app/prototype/fixtures/organization.js';
import {EMAIL_DATA} from '../concepts/app/prototype/fixtures/messages.js';
import {CHAIN, ACTIVITY, LIST_ROWS} from '../concepts/app/prototype/fixtures/invoices.js';
import {CUSTOMER_ROWS, CUSTOMER_LOOKUP_RESULTS} from '../concepts/app/prototype/fixtures/customers.js';
import {GEO_ROWS} from '../concepts/app/prototype/fixtures/geography.js';

test('received and sent mail, logins and audit creation never occur after the demo clock', () => {
  for (const mail of COLLAB_SEED.entities.mail) {
    if (mail.sentAt) assert.ok(mail.sentAt <= PROTOTYPE_NOW, `${mail.id}: ${mail.sentAt}`);
    assert.ok(mail.createdAt <= PROTOTYPE_NOW, `${mail.id} creation`);
  }
  for (const row of LOGIN_LOG_ROWS) assert.ok(row.timestamp.replace(' ', 'T') <= PROTOTYPE_NOW);
});

test('invoice history is not earlier than any represented invoice', () => {
  const iso = value => value.slice(0, 10).split('/').reverse().join('-');
  const latest = LIST_ROWS.map(row => iso(row.date)).sort().at(-1);
  for (const entry of CHAIN.filter(entry => entry.when !== '—')) {
    assert.ok(iso(entry.when) >= latest, `${entry.id}: ${entry.when}`);
  }
});

test('invoice activity uses a real historical date rather than a false today label', () => {
  for (const day of ACTIVITY) {
    assert.doesNotMatch(day.day, /Today|Yesterday/);
    const iso = new Date(day.day).toISOString().slice(0, 10);
    assert.ok(iso >= '2026-08-16' && iso <= PROTOTYPE_NOW.slice(0, 10));
  }
});

test('signed-in identity is one person across collaboration, organization and inbox', () => {
  assert.equal(COLLAB_USERS.find(user => user.id === 'usr-1').email, 'admin@lastchance.local');
  assert.equal(COLLAB_USERS.find(user => user.id === 'usr-1').name, CURRENT_USER.name);
  assert.equal(ORGANIZATION_USERS.find(user => user.id === 'usr-1').name, CURRENT_USER.name);
  assert.equal(ORGANIZATION_USERS.find(user => user.id === 'usr-1').branch, CURRENT_USER.branch);
  for (const message of EMAIL_DATA) {
    assert.deepEqual(message.to, [{name: CURRENT_USER.name, email: CURRENT_USER.email}]);
  }
});

test('next maintenance is after the demo clock', () => {
  assert.ok(SYSTEM_HEALTH.nextMaintenance.replace(' ', 'T') > PROTOTYPE_NOW);
});

test('Al Noor keeps its customer relationship in the event invitation', () => {
  const visit = COLLAB_SEED.entities.event.find(event => event.id === 'evt-3');
  assert.match(visit.title, /Customer visit/);
  assert.ok(CUSTOMER_ROWS.some(row => row.customerName === 'Al Noor Trading'));
  assert.equal(EMAIL_DATA.find(message => message.id === 'e4').from, 'Customer Portal');
});

test('the employee manager is a named organization user', () => {
  assert.ok(ORGANIZATION_USERS.some(user => user.name === EMPLOYEE_DETAILS.manager));
});

test('invoice customer names and units agree with the customer records', () => {
  for (const invoice of LIST_ROWS) {
    const customer = CUSTOMER_ROWS.find(row => row.customerNo === invoice.custNo);
    assert.ok(customer, invoice.custNo);
    assert.equal(invoice.custName, customer.customerName);
    assert.equal(invoice.branch, customer.operationUnit);
  }
});

test('customer location lookup codes and labels identify actual geography rows', () => {
  for (const location of CUSTOMER_LOOKUP_RESULTS.unitLocation) {
    const row = GEO_ROWS.find(row => row.code === location.code);
    assert.ok(row, location.code);
    assert.equal(location.value, row.name);
  }
});

test('inactive customers were deactivated after their represented invoices', () => {
  const iso = value => value.split('/').reverse().join('-');
  for (const customer of CUSTOMER_ROWS.filter(row => !row.active)) {
    assert.match(customer.statusDate ?? '', /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(customer.statusDate <= PROTOTYPE_NOW.slice(0, 10));
    for (const invoice of LIST_ROWS.filter(row => row.custNo === customer.customerNo)) {
      assert.ok(iso(invoice.date) < customer.statusDate);
    }
  }
});
