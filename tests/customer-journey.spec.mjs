import {test, expect} from '@playwright/test';
import {settle} from './support/browser.mjs';
import {CUSTOMER_ROWS} from '../concepts/app/prototype/fixtures/customers.js';
import {PROTOTYPE_NOW} from '../concepts/app/prototype/fixtures/collaboration.js';

// CUS-04 / CUS-05: an inactive customer states why it was deactivated, and the
// customer record answers the global leave guard (contract C1) so every route
// out of a record with unsaved edits asks first. Everything is driven through
// the visible UI: open a list row, press Modify, type into a field.

const baseURL = () => process.env.PARITY_URL ?? 'http://127.0.0.1:4173';
const CUSTOMERS_LIST_PATH = '/customers/list';

const pathOf = url => new URL(url).pathname;

async function gotoRoute(page, path) {
  await page.goto(`${baseURL()}${path}`);
  const simulateLoading = page.locator('#simulate-loading');
  if (await simulateLoading.isChecked()) await simulateLoading.uncheck();
  await settle(page);
  const kitMin = page.locator('#kit-min');
  if (await kitMin.isVisible()) await kitMin.click();
}

async function openCustomer(page, customerNo) {
  const row = page.locator('[data-list-row-key]').filter({hasText: customerNo}).first();
  await row.locator('[data-list-open-record]').first().click();
  await expect(page.locator('#customer-record-chrome')).toBeVisible();
  await settle(page);
}

const nameField = page => page.locator('[data-customer-field="customerName"]');
const guard = page => page.locator('#customer-gscrim.open');

/** Opens 200002 from the list, presses Modify and types a new name. Returns it. */
async function makeCustomerDirty(page, value) {
  await openCustomer(page, '200002');
  await page.locator('.phead [data-customer-action="modify"]:visible').first().click();
  await expect(nameField(page)).toBeEnabled();
  await nameField(page).fill(value);
  await expect(nameField(page)).toHaveValue(value);
}

async function expectGuardThenStay(page, value) {
  await expect(guard(page)).toBeVisible();
  await expect(page.locator('#customer-g-discard')).toHaveText('Leave without saving');
  await expect(page.locator('#customer-g-save')).toHaveText('Save, then leave');
  await page.locator('#customer-g-stay').click();
  await expect(guard(page)).toHaveCount(0);
  await expect(page.locator('#customer-record-chrome')).toBeVisible();
  await expect(page.locator('#customer-mode')).toHaveValue('edit');
  await expect(nameField(page)).toHaveValue(value);
}

test('inactive customer shows reason', async ({page}) => {
  const inactive = CUSTOMER_ROWS.find(row => !row.active);
  expect(inactive.customerNo).toBe('200001');
  expect(inactive.statusReason).toBeTruthy();

  await gotoRoute(page, CUSTOMERS_LIST_PATH);
  await openCustomer(page, inactive.customerNo);

  await expect(page.locator('.tline .badge.danger')).toHaveText('Inactive');
  await expect(page.locator('[data-customer-deactivation-reason]')).toHaveText(inactive.statusReason);

  // The date is shown, and is not later than the demo clock.
  const date = (await page.locator('[data-customer-deactivation-date]').textContent()).trim();
  expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(date <= PROTOTYPE_NOW.slice(0, 10)).toBe(true);
  await expect(page.locator('[data-customer-field="deactivationFrom"]')).toHaveValue(date);

  // An active customer shows no deactivation note.
  await page.locator('.customer-back').click();
  await settle(page);
  await openCustomer(page, '200002');
  await expect(page.locator('[data-customer-deactivation-reason]')).toHaveCount(0);
});

test('dirty customer + app switcher shows guard', async ({page}) => {
  await gotoRoute(page, CUSTOMERS_LIST_PATH);
  const value = 'Switcher guard probe';
  await makeCustomerDirty(page, value);

  const trigger = page.locator('.app-switcher-menu > button');
  const pickDashboard = async () => {
    await trigger.focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('.mlist.app-switcher-list')).toBeVisible();
    await page.locator('.app-switcher-row[data-label="Dashboard"]').click();
  };

  await pickDashboard();
  await expectGuardThenStay(page, value);
  await expect.poll(() => pathOf(page.url())).toBe(CUSTOMERS_LIST_PATH);

  // Leave asks once, then goes: a second prompt would leave the guard open.
  await pickDashboard();
  await expect(guard(page)).toBeVisible();
  await page.locator('#customer-g-discard').click();
  await settle(page);
  await expect(guard(page)).toHaveCount(0);
  await expect(page.locator('.foryou-view')).toBeVisible();
  await expect(page.locator('[data-foryou-app]')).toHaveText('Dashboard');
  await expect.poll(() => pathOf(page.url())).toBe('/dashboard');
});

test('dirty customer + browser Back keeps edits on Stay', async ({page}) => {
  // Put an earlier entry in history so Back has somewhere to go.
  await gotoRoute(page, '/dashboard');
  await page.locator('.app-switcher-menu > button').click();
  await expect(page.locator('.lp-view[data-mode="switcher"]')).toBeVisible();
  await page.locator('.lp-tag').filter({hasText: 'Customers'}).first().click();
  await settle(page);
  await expect(page.locator('.customer-list-view')).toBeVisible();
  await expect.poll(() => pathOf(page.url())).toBe(CUSTOMERS_LIST_PATH);

  const value = 'Back guard probe';
  await makeCustomerDirty(page, value);
  const historyLength = await page.evaluate(() => history.length);

  await page.goBack();
  await expectGuardThenStay(page, value);
  // Refusing the move restores the URL by stepping forward again, so no extra
  // entry may have been added.
  expect(await page.evaluate(() => history.length)).toBe(historyLength);

  // The restored entry is the live one: Back still asks, and Leave goes back.
  await page.goBack();
  await expect(guard(page)).toBeVisible();
  await page.locator('#customer-g-discard').click();
  await settle(page);
  await expect(guard(page)).toHaveCount(0);
  await expect(page.locator('.foryou-view')).toBeVisible();
  await expect.poll(() => pathOf(page.url())).toBe('/dashboard');
});

test('new customer + app switcher asks once, then leaves', async ({page}) => {
  await gotoRoute(page, CUSTOMERS_LIST_PATH);
  await openCustomer(page, '200002');
  await page.locator('.phead [data-customer-action="new"]:visible').first().click();
  await expect(page.locator('#customer-mode')).toHaveValue('create');

  const trigger = page.locator('.app-switcher-menu > button');
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.mlist.app-switcher-list')).toBeVisible();
  await page.locator('.app-switcher-row[data-label="Dashboard"]').click();
  await expect(guard(page)).toBeVisible();
  await page.locator('#customer-g-discard').click();
  await settle(page);
  await expect(guard(page)).toHaveCount(0);
  await expect.poll(() => pathOf(page.url())).toBe('/dashboard');
});

// INV-11 / DAT-R1: the record footer advertises the opened customer's real
// place among the rows the list shows, never a made-up total.
test('customer record position reflects the list', async ({page}) => {
  await gotoRoute(page, CUSTOMERS_LIST_PATH);
  const keys = await page.locator('[data-list-row-key]').evaluateAll(rows => [
    ...new Set(rows.map(row => row.getAttribute('data-list-row-key'))),
  ]);
  expect(keys).toHaveLength(CUSTOMER_ROWS.length);
  const label = page.locator('#customer-record-position');
  const pager = page.locator('.customer-record-footer .pager');
  const expectAt = async index => {
    await expect(label).toHaveText(`Record ${index + 1} of ${keys.length}`);
    await expect(pager.locator('.pg-i')).toHaveValue(String(index + 1));
    await expect(pager.locator('.pg-i')).toHaveAttribute('max', String(keys.length));
    await expect(pager.locator('.tot')).toHaveText(`of ${keys.length}`);
    await expect(page.locator('#customer-record-chrome .tline h1')).toContainText(keys[index]);
  };

  await openCustomer(page, '200002');
  await expectAt(keys.indexOf('200002'));

  // Next / Previous move through the same real rows, one record at a time.
  await pager.locator('.pg-n').click();
  await expectAt(keys.indexOf('200002') + 1);
  await expect(pager.locator('.pg-n')).toBeDisabled();
  await pager.locator('.pg-f').click();
  await expectAt(0);
  await expect(pager.locator('.pg-p')).toBeDisabled();

  // A new record is not one of the list rows: no position is advertised.
  await page.locator('.phead [data-customer-action="new"]:visible').first().click();
  await expect(page.locator('#customer-mode')).toHaveValue('create');
  await expect(label).toHaveText('New customer');
  await expect(pager.locator('.pg-i')).toHaveValue('');
  await expect(pager.locator('button:enabled')).toHaveCount(0);
});


test('edited name appears in list and reopens', async ({page}) => {
  await gotoRoute(page, CUSTOMERS_LIST_PATH);
  await makeCustomerDirty(page, 'Updated demo customer');
  await page.locator('.phead [data-customer-action="save"]:visible').first().click();
  await expect(page.locator('#customer-mode')).toHaveValue('view');
  await page.locator('.customer-back').click();
  await expect(page.locator('[data-list-row-key="200002"]').first()).toContainText('Updated demo customer');
  await openCustomer(page, '200002');
  await expect(nameField(page)).toHaveValue('Updated demo customer');
});

test('added customer appears and reopens with a unique number', async ({page}) => {
  await gotoRoute(page, CUSTOMERS_LIST_PATH); await openCustomer(page, '200002');
  await page.locator('.phead [data-customer-action="new"]:visible').first().click();
  await nameField(page).fill('New demo customer');
  await page.locator('.phead [data-customer-action="save"]:visible').first().click();
  await expect(page.locator('#customer-mode')).toHaveValue('view');
  await expect(page.locator('[data-customer-field="customerNo"]')).toHaveValue('200011');
  await page.locator('.customer-back').click();
  await expect(page.locator('[data-list-row-key="200011"]').first()).toContainText('New demo customer');
  await openCustomer(page, '200011');
  await expect(nameField(page)).toHaveValue('New demo customer');
});
