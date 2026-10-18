import {test, expect} from '@playwright/test';
import {settle} from './support/browser.mjs';

// SHL-04 / contract C1: leaving a record page that reports unsaved work goes
// through the same guard whatever the route (rail leaf, app switcher, browser
// Back). The page's own `requestLeave()` is consulted after the list-layout
// guard. Everything is driven through the visible UI: open a list row, press
// Modify, type into an editable field.

const baseURL = () => process.env.PARITY_URL ?? 'http://127.0.0.1:4173';
const INVOICES_PATH = '/sales-systems-management/sales-invoices';

const pathOf = url => new URL(url).pathname;
const isRtl = page => page.evaluate(() => getComputedStyle(document.body).direction === 'rtl');

async function gotoRoute(page, path) {
  await page.goto(`${baseURL()}${path}`);
  const simulateLoading = page.locator('#simulate-loading');
  if (await simulateLoading.isChecked()) await simulateLoading.uncheck();
  await settle(page);
  const kitMin = page.locator('#kit-min');
  if (await kitMin.isVisible()) await kitMin.click();
}

/** Opens an editable (Open) list row, presses Modify and types into the
 *  Statement field, leaving the record dirty. Posted rows cannot be modified, so
 *  the row is chosen by its visible status badge, not by number. Returns the
 *  typed value. */
async function editOpenInvoice(page, value) {
  const openRow = page
    .locator('[data-list-row-key]')
    .filter({has: page.locator('.badge.invoice-status:visible', {hasText: /^Open$/})})
    .first();
  await openRow.locator('[data-list-open-record]').first().click();
  await expect(page.locator('#canvas-root')).toBeVisible();
  await settle(page);
  await page.locator('[data-act="Modify"]:visible').first().click();
  await page.locator('#rec-tab-other:visible').first().click();
  const statement = page.locator('#rec-panel-other textarea[data-field]:visible').first();
  await expect(statement).toBeEnabled();
  await statement.fill(value);
  await expect(page.locator('#dirty')).toBeChecked();
  await expect(page.locator('[data-act="Save"]:visible').first()).toBeEnabled();
}

async function makeInvoiceDirty(page) {
  await gotoRoute(page, INVOICES_PATH);
  const value = 'Leave guard probe';
  await editOpenInvoice(page, value);
  return value;
}

const statementValue = page => page.locator('#rec-panel-other textarea[data-field]').first().inputValue();
const guard = page => page.locator('#gscrim.open');

async function expectGuardThenStay(page, value) {
  await expect(guard(page)).toBeVisible();
  await expect(page.locator('#g-stay')).toBeVisible();
  await page.locator('#g-stay').click();
  await expect(guard(page)).toHaveCount(0);
  await expect.poll(() => pathOf(page.url())).toBe(INVOICES_PATH);
  await expect(page.locator('#canvas-root')).toBeVisible();
  expect(await statementValue(page)).toBe(value);
}

/** Rail icons sit under the floating resize handle; click the icon's start
 *  edge, which is clear of it in both writing directions. */
async function clickRailIcon(page, label) {
  const icon = page.locator(`.nc2-icn[aria-label="${label}"]`);
  await expect(icon).toBeVisible();
  const box = await icon.boundingBox();
  const rtl = await isRtl(page);
  await icon.click({position: {x: rtl ? box.width - 6 : 6, y: box.height / 2}});
}

/** The expanded rail floats over the panel's first 264px; click the row's
 *  trailing edge, which it never reaches. */
async function clickPanelRow(page, label) {
  const row = page.locator(`.nc1-item[data-label="${label}"]`);
  await expect(row).toBeVisible();
  const box = await row.boundingBox();
  const rtl = await isRtl(page);
  await row.click({position: {x: rtl ? 8 : box.width - 8, y: box.height / 2}});
}

test('dirty invoice + rail leaf shows guard', async ({page}) => {
  const value = await makeInvoiceDirty(page);

  // Switching the rail to the Customers app is itself a leave of the invoice.
  await clickRailIcon(page, 'Customers');
  await expectGuardThenStay(page, value);

  if (page.viewportSize().width >= 900) {
    // The Customers leaf is the route under test: Stay keeps the invoice,
    // Leave shows the Customers list.
    await clickPanelRow(page, 'Customers');
    await expectGuardThenStay(page, value);

    await clickPanelRow(page, 'Customers');
    await expect(guard(page)).toBeVisible();
    await page.locator('#g-discard').click();
    await settle(page);
    await expect(page.locator('.customer-list-view')).toBeVisible();
    await expect.poll(() => pathOf(page.url())).toBe('/customers/list');
  } else {
    // Compact viewports: the rail is an on-demand flyout that the guard's Stay
    // closes again, so another app's leaf cannot be reached while the invoice
    // is dirty. The rail icon is the only rail route there; Leave lands on the
    // Customers app.
    await expect(page.locator('.side.collapsed')).toBeVisible();
    await clickRailIcon(page, 'Customers');
    await expect(guard(page)).toBeVisible();
    await page.locator('#g-discard').click();
    await settle(page);
    await expect(page.locator('.foryou-view')).toBeVisible();
    await expect(page.locator('[data-foryou-app]')).toHaveText('Customers');
    await expect.poll(() => pathOf(page.url())).toBe('/customers');
  }
});

test('dirty invoice + app switcher shows guard', async ({page}) => {
  const value = await makeInvoiceDirty(page);

  const trigger = page.locator('.app-switcher-menu > button');
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.mlist.app-switcher-list')).toBeVisible();
  await page.locator('.app-switcher-row[data-label="Dashboard"]').click();
  await expectGuardThenStay(page, value);

  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.mlist.app-switcher-list')).toBeVisible();
  await page.locator('.app-switcher-row[data-label="Dashboard"]').click();
  await expect(guard(page)).toBeVisible();
  await page.locator('#g-discard').click();
  await settle(page);
  await expect(page.locator('.foryou-view')).toBeVisible();
  await expect(page.locator('[data-foryou-app]')).toHaveText('Dashboard');
  await expect.poll(() => pathOf(page.url())).toBe('/dashboard');
});

test('dirty invoice + browser Back keeps URL and edits on Stay', async ({page}) => {
  // Put an earlier entry in history so Back has somewhere to go.
  await gotoRoute(page, '/dashboard');
  await page.locator('.app-switcher-menu > button').click();
  await expect(page.locator('.lp-view[data-mode="switcher"]')).toBeVisible();
  await page.locator('.lp-tag').filter({hasText: 'Sales Invoice'}).first().click();
  await settle(page);
  await expect(page.locator('.list-view')).toBeVisible();
  await expect.poll(() => pathOf(page.url())).toBe(INVOICES_PATH);

  const value = 'Back guard probe';
  await editOpenInvoice(page, value);
  const historyLength = await page.evaluate(() => history.length);

  await page.goBack();
  await expectGuardThenStay(page, value);
  // Refusing the move restores the URL by stepping forward again, so no extra
  // entry may have been added.
  expect(await page.evaluate(() => history.length)).toBe(historyLength);

  // The restored entry is the live one: Back still asks, and Leave goes back.
  await page.goBack();
  await expect(guard(page)).toBeVisible();
  await page.locator('#g-discard').click();
  await settle(page);
  await expect(page.locator('.foryou-view')).toBeVisible();
  await expect.poll(() => pathOf(page.url())).toBe('/dashboard');
});
