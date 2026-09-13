import {test, expect} from '@playwright/test';
import {boot, openSurface} from './support/browser.mjs';

const pageErrors = new WeakMap();
test.beforeEach(async ({page}) => {
  const errors = [];
  pageErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  await boot(page, 'http://127.0.0.1:4173');
});

test.afterEach(async ({page}) => {
  expect(pageErrors.get(page)).toEqual([]);
});

test('invoice line entry adds once and retains quantity calculations', async ({page}) => {
  await openSurface(page, 'record');
  await page.locator('#mode').selectOption('create', {force: true});
  const rows = page.locator('#items-body > tr');
  const count = await rows.count();
  await page.locator('#canvas-root').getByRole('button', {name: 'Add item', exact: true}).click();
  await expect(rows).toHaveCount(count + 1);
  await rows.last().locator('.items-qty').fill('3');
  await expect(page.locator('#items-total-qty')).toHaveText(String(count + 3));
  await rows.last().getByRole('button', {name: 'Remove item'}).click();
  await expect(rows).toHaveCount(count);
  await expect(page.locator('#items-total-qty')).toHaveText(String(count));
});

test('invoice payments retain method-specific fields and removal', async ({page}) => {
  await openSurface(page, 'record');
  await page.locator('#mode').selectOption('create', {force: true});
  await page.locator('#rec-tab-payment').click();
  await page.locator('#add-payment-link').click();
  const rows = page.locator('#payment-rows [data-payment-row]');
  await expect(rows).toHaveCount(2);
  await rows.last().locator('[data-payment-method]').selectOption('Cheque');
  await expect(rows.last().getByLabel('Cheque No.')).toBeVisible();
  await rows.last().getByRole('button', {name: 'Remove payment method'}).click();
  await expect(rows).toHaveCount(1);
});

test('geography editing excludes descendants as parents and preserves undo', async ({page}) => {
  await openSurface(page, 'geo-record');
  const name = page.locator('#geo-field-name');
  const original = await name.inputValue();
  const code = await page.locator('#geo-field-code').inputValue();
  await page.locator('.geo-record-view [data-geo-record-action="modify"]').last().click();
  await expect(page.locator(`#geo-field-parent option[value="${code}"]`)).toHaveCount(0);
  await name.fill('Temporary location');
  await page.locator('.geo-record-view [data-geo-record-action="undo"]').last().click();
  await expect(name).toHaveValue(original);
  await expect(name).toHaveAttribute('readonly', '');
});


test('invoice charges and discounts preserve the fixture summary', async ({page}) => {
  await openSurface(page, 'record');
  await page.locator('#mode').selectOption('create', {force: true});
  await page.locator('#invoice-discount-value').fill('10');
  await expect(page.locator('#invoice-summary-net')).toHaveText('180.00 EGP');
  await page.locator('[data-invoice-adjustment]').first().click();
  await page.locator('[data-adjustment-value]').fill('25');
  await expect(page.locator('#invoice-summary-net')).toHaveText('205.00 EGP');
  await page.getByRole('button', {name: 'Remove charge', exact: true}).click();
  await expect(page.locator('#invoice-summary-net')).toHaveText('180.00 EGP');
});

test('invoice keyboard line entry registers once after returning from the list', async ({page}) => {
  await openSurface(page, 'record');
  await page.locator('.record-back').first().click();
  await page.locator('[data-list-open-record]').first().click();
  await page.locator('#mode').selectOption('create', {force: true});
  const rows = page.locator('#items-body > tr');
  const count = await rows.count();
  await rows.last().getByRole('textbox', {name: 'Item', exact: true}).press('Enter');
  await expect(rows).toHaveCount(count + 1);
  await expect(rows.last().getByRole('textbox', {name: 'Item', exact: true})).toBeFocused();
});
