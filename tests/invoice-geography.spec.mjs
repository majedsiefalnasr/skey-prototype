import {test, expect} from '@playwright/test';
import {boot, openSurface} from './support/browser.mjs';

const pageErrors = new WeakMap();
test.beforeEach(async ({page}) => {
  const errors = [];
  pageErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
});

test.afterEach(async ({page}) => {
  expect(pageErrors.get(page)).toEqual([]);
});

test('invoice line entry adds once and retains quantity calculations', async ({page}) => {
  await openSurface(page, 'record');
  await page.locator('#mode').selectOption('create', {force: true});
  const rows = page.locator('#items-body > tr');
  const count = await rows.count();
  await page.locator('#add-item-link').click();
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

test('invoice print settings and activity drawer retain their document context', async ({page}) => {
  await openSurface(page, 'record');
  await page.locator('.content').getByRole('button', {name: 'Print', exact: true}).click();
  await expect(page.locator('#pscrim')).toHaveClass(/open/);
  await expect(page.locator('#pscrim .dhd .sub')).toContainText('Sales Invoice');
  await page.locator('#pscrim').getByRole('button', {name: 'Close', exact: true}).click();
  await page.locator('.dr-open[data-tab="stages"]').first().click();
  await expect(page.locator('#drawer')).toHaveClass(/open/);
  await expect(page.locator('.drtab[data-tab="stages"]')).toHaveAttribute('aria-selected', 'true');
  await page.locator('#drawer .dr-close').click();
});

test('invoice modify and undo preserve the operation lifecycle', async ({page}) => {
  await openSurface(page, 'record');
  await page.locator('#st').selectOption('open', {force: true});
  await page.locator('.design.active [data-act="Modify"]').click();
  await expect(page.locator('#mode')).toHaveValue('edit');
  await page.locator('.design.active .phead [data-act="Undo"]').click();
  await expect(page.locator('#mode')).toHaveValue('record');
});

test('geography hierarchy switches to flow and opens its compact dialog', async ({page}) => {
  await openSurface(page, 'geo-record');
  if (!(await page.locator('[data-geo-view="flow"]').isVisible())) {
    await page.locator('[data-geo-tree-collapse]').click();
    await expect(page.locator('#geo-hierarchy-scrim')).toHaveClass(/open/);
  }
  await page.locator('[data-geo-view="flow"]').click();
  await expect(page.locator('#geo-flow-pane')).toBeVisible();
  await expect(page.locator('#geo-flow-canvas [data-geo-node]')).not.toHaveCount(0);
  if (!(await page.locator('#geo-hierarchy-scrim').evaluate(element => element.classList.contains('open')))) {
    await page.setViewportSize({width: 900, height: 800});
    await page.locator('[data-geo-tree-collapse]').click();
    await expect(page.locator('#geo-hierarchy-scrim')).toHaveClass(/open/);
  }
  await page.locator('.geo-hierarchy-dialog-close').click();
  await expect(page.locator('#geo-hierarchy-scrim')).not.toHaveClass(/open/);
});
