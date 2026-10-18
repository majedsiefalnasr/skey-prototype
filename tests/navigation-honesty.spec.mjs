import {test, expect} from '@playwright/test';
import {settle} from './support/browser.mjs';

// SHL-03 / SHL-05: a nav leaf, quick-list entry or search result that has no
// screen opens the "Not in this prototype" placeholder naming that screen and
// its app. It never opens the Sales Invoice record in its place. Everything
// here is driven through the visible UI.

const baseURL = () => process.env.PARITY_URL ?? 'http://127.0.0.1:4173';

const pathOf = url => new URL(url).pathname;

async function gotoRoute(page, path) {
  await page.goto(`${baseURL()}${path}`);
  const simulateLoading = page.locator('#simulate-loading');
  if (await simulateLoading.isChecked()) await simulateLoading.uncheck();
  await settle(page);
  const kitMin = page.locator('#kit-min');
  if (await kitMin.isVisible()) await kitMin.click();
}

const isRtl = page => page.evaluate(() => getComputedStyle(document.body).direction === 'rtl');

/** Same edge-click as routing.spec: the rail widens over the panel's first
 *  264px on hover and the resize handle overlays the icon centre. */
async function clickRailIcon(page, label) {
  const icon = page.locator(`.nc2-icn[aria-label="${label}"]`);
  await expect(icon).toBeVisible();
  const box = await icon.boundingBox();
  const rtl = await isRtl(page);
  await icon.click({position: {x: rtl ? box.width - 6 : 6, y: box.height / 2}});
}

async function clickPanelRow(page, label) {
  const row = page.locator(`.nc1-item[data-label="${label}"]`);
  await expect(row).toBeVisible();
  const box = await row.boundingBox();
  const rtl = await isRtl(page);
  await row.click({position: {x: rtl ? 8 : box.width - 8, y: box.height / 2}});
}

/** Brings an app's panel on screen (collapsed on compact viewports) and
 *  clicks one of its rows, expanding a branch first when given. */
async function openRow(page, app, label, branch) {
  if (!(await page.locator(`.nc1-item[data-label="${branch ?? label}"]`).isVisible())) {
    await clickRailIcon(page, app);
    await settle(page);
  }
  if (branch) await clickPanelRow(page, branch);
  await clickPanelRow(page, label);
  await settle(page);
}

/** On compact viewports the rail panel is an on-demand flyout that stays open
 *  over the page's start edge after a row is chosen; a click on the free
 *  opposite edge closes it, as it would for a user. */
async function dismissCompactFlyout(page) {
  if (!(await page.locator('.side.collapsed .nc3-panel:not([hidden])').isVisible())) return;
  const width = page.viewportSize().width;
  await page.mouse.click((await isRtl(page)) ? 10 : width - 10, 600);
}

/** The invoice record names itself in its heading. The brief's
 *  `.invoice-record-root` class does not exist in the DOM and the
 *  `[data-invoice-number]` inputs are in the DOM but hidden even while the
 *  record is open, so the heading is the selector that proves "invoice
 *  content is on screen"; the brief's selector is asserted too. */
const invoiceHeading = page => page.locator('h1:visible').filter({hasText: /^Sales Invoice \d+/});
const briefInvoiceSelector = page => page.locator('.invoice-record-root, [data-invoice-number]');

async function expectNoInvoiceContent(page) {
  await expect(invoiceHeading(page)).toHaveCount(0);
  for (const element of await briefInvoiceSelector(page).all()) await expect(element).toBeHidden();
}

async function expectPlaceholder(page, {title, app}) {
  await expect(page.locator('.placeholder-view')).toBeVisible();
  await expect(page.locator('.placeholder-view h1')).toHaveText(title);
  await expect(page.locator('[data-placeholder-back]')).toHaveText(`Back to ${app}`);
  await expectNoInvoiceContent(page);
}

async function expectForYou(page, app) {
  await expect(page.locator('.foryou-view')).toBeVisible();
  await expect(page.locator('[data-foryou-title]')).toHaveText(app);
}

/** The global palette opens screens-only by product decision
 *  (table-customer-ux.test pins it), which hides the scope switch, so record
 *  results have no visible entry point today. `scope` selects one through the
 *  switch's own handler; screen results need no switch. */
async function search(page, query, resultText, scope) {
  await page.keyboard.press('Control+k');
  const panel = page.locator('.spanel.open');
  await expect(panel).toBeVisible();
  if (scope) {
    await page.evaluate(
      name => document.querySelector(`.spanel.open .sscope button[data-scope="${name}"]`).click(),
      scope
    );
  }
  await panel.locator('input').fill(query);
  await panel.locator('.sitem', {hasText: resultText}).first().click();
  await settle(page);
}

const LEAVES = [
  {app: 'Customers', base: '/customers', leaf: 'Sales Representatives'},
  {app: 'Sales Systems Management', base: '/sales-systems-management', leaf: 'Quotations Requests'},
  {app: 'System Setup', base: '/system-setup', leaf: 'General Parameters', branch: 'General Configuration'},
];

test('the invoice record is detectable by its heading', async ({page}) => {
  await gotoRoute(page, '/sales-systems-management/sales-invoices');
  await page.locator('[data-list-open-record]').first().click();
  await settle(page);
  await expect(invoiceHeading(page)).toBeVisible();
});

test('unbuilt leaf opens placeholder, not the invoice', async ({page}) => {
  for (const {app, base, leaf, branch} of LEAVES) {
    await gotoRoute(page, base);
    await expectForYou(page, app);

    await openRow(page, app, leaf, branch);
    await expectPlaceholder(page, {title: leaf, app});
    expect(pathOf(page.url())).toBe(`${base}/unavailable`);
    expect(new URL(page.url()).searchParams.get('screen')).toBe(leaf);

    await page.goBack();
    await settle(page);
    await expectForYou(page, app);
    await expect(page.locator('.placeholder-view')).toHaveCount(0);
    expect(pathOf(page.url())).toBe(base);
  }
});

test('placeholder button returns to the app For You page', async ({page}) => {
  await gotoRoute(page, '/customers');
  await openRow(page, 'Customers', 'Collectors');
  await expectPlaceholder(page, {title: 'Collectors', app: 'Customers'});
  await dismissCompactFlyout(page);
  await page.locator('[data-placeholder-back]').click();
  await settle(page);
  await expectForYou(page, 'Customers');
  expect(pathOf(page.url())).toBe('/customers');
});

test('placeholder deep link and reload name the screen', async ({page}) => {
  await gotoRoute(page, '/vendors/unavailable?screen=Vendor%20Invoice');
  await expectPlaceholder(page, {title: 'Vendor Invoice', app: 'Vendors'});
  await page.reload();
  await settle(page);
  await expectPlaceholder(page, {title: 'Vendor Invoice', app: 'Vendors'});
});

test('back and forward between two placeholders show the right screen', async ({page}) => {
  await gotoRoute(page, '/customers');
  await openRow(page, 'Customers', 'Sales Representatives');
  await expectPlaceholder(page, {title: 'Sales Representatives', app: 'Customers'});
  await openRow(page, 'Customers', 'Collectors');
  await expectPlaceholder(page, {title: 'Collectors', app: 'Customers'});
  await page.goBack();
  await settle(page);
  await expectPlaceholder(page, {title: 'Sales Representatives', app: 'Customers'});
  await page.goForward();
  await settle(page);
  await expectPlaceholder(page, {title: 'Collectors', app: 'Customers'});
});

test('a Starred entry without a screen opens the placeholder', async ({page}) => {
  await gotoRoute(page, '/customers');
  await clickRailIcon(page, 'Starred');
  await settle(page);
  await clickPanelRow(page, 'Purchase Invoice');
  await settle(page);
  await expectPlaceholder(page, {title: 'Purchase Invoice', app: 'Purchase Systems Management'});
  expect(pathOf(page.url())).toBe('/purchase-systems-management/unavailable');
  expect(new URL(page.url()).searchParams.get('screen')).toBe('Purchase Invoice');
});

test('search result to placeholder then Back', async ({page}) => {
  await gotoRoute(page, '/customers');
  await expectForYou(page, 'Customers');
  await search(page, 'Sales Return', 'Sales Systems Management');
  await expectPlaceholder(page, {title: 'Sales Return', app: 'Sales Systems Management'});
  await page.goBack();
  await settle(page);
  await expectForYou(page, 'Customers');
  await expectNoInvoiceContent(page);
});

test('search Screen Parameters result opens the dialog, not a placeholder', async ({page}) => {
  await gotoRoute(page, '/customers');
  await expectForYou(page, 'Customers');
  await search(page, 'Screen Parameters', 'Sales Invoice');
  await expect(page.locator('#screen-parameters-title')).toBeVisible();
  await expect(page.locator('.placeholder-view')).toHaveCount(0);
  await expectForYou(page, 'Customers');
  expect(pathOf(page.url())).toBe('/customers');
});

test('search module result opens that app For You page', async ({page}) => {
  await gotoRoute(page, '/customers');
  await search(page, 'Finance and Accounting', 'Module');
  await expectForYou(page, 'Finance and Accounting');
  expect(pathOf(page.url())).toBe('/finance-and-accounting');
});

test('search records: each invoice opens its own record by number, the customer opens its record, the item opens the placeholder', async ({page}) => {
  const records = [
    {query: '001000352026140', text: 'Invoice 140', opens: 'invoice', no: '140'},
    {query: '001000352026145', text: 'Invoice 145', opens: 'invoice', no: '145'},
    {query: '001000352026147', text: 'Invoice 147', opens: 'invoice', no: '147'},
    {query: '200001', text: 'العميل الاول', opens: 'customer'},
    {query: '7603', text: 'keyboard', opens: 'placeholder', title: '7603 · keyboard', app: 'Inventory Systems Management'},
  ];
  for (const record of records) {
    await gotoRoute(page, '/customers');
    await search(page, record.query, record.text, 'records');
    await expect(page.getByText('out of scope')).toHaveCount(0);
    if (record.opens === 'invoice') {
      await expect(invoiceHeading(page)).toHaveText(new RegExp('^Sales Invoice ' + record.no + '\\b'));
      await expect(page.locator('.placeholder-view')).toHaveCount(0);
    } else if (record.opens === 'customer') {
      await expect(page.locator('.customer-record-view')).toBeVisible();
      await expect(page.locator('.placeholder-view')).toHaveCount(0);
    } else {
      await expectPlaceholder(page, {title: record.title, app: record.app});
    }
  }
});

// SHL-07: the palette's invoice context ("You are on Sales Invoice · <number>",
// "Actions apply to invoice <number>") names the open record and is absent on
// every other page. The palette opens screens-only, which hides this context
// with CSS, so the assertions read the text and the `hidden` state the palette
// sets rather than CSS visibility.
test('palette invoice context follows the open record', async ({page}) => {
  const openPalette = async () => {
    await page.keyboard.press('Control+k');
    const panel = page.locator('.spanel.open');
    await expect(panel).toBeVisible();
    return panel;
  };
  const closePalette = () => page.keyboard.press('Escape');

  await gotoRoute(page, '/customers');
  await search(page, '001000352026145', 'Invoice 145', 'records');
  await expect(invoiceHeading(page)).toHaveText(/^Sales Invoice 145\b/);
  let panel = await openPalette();
  await expect(panel.locator('.sctx-current')).toContainText('001000352026145');
  await expect(panel.locator('.sctx-current')).not.toHaveAttribute('hidden');
  await expect(panel.locator('.sfoot-ctx')).toHaveText('Actions apply to invoice 145');
  await closePalette();

  await gotoRoute(page, '/customers/list');
  panel = await openPalette();
  await expect(panel.locator('.sctx-current')).toHaveAttribute('hidden', '');
  await expect(panel.locator('.sctx-current')).not.toContainText(/\d/);
  await expect(panel.locator('.sfoot-ctx')).toHaveAttribute('hidden', '');
  await expect(panel.locator('.sfoot-ctx')).toHaveText('');
  await closePalette();

  await gotoRoute(page, '/customers');
  panel = await openPalette();
  await expect(panel.locator('.sctx-current')).toHaveAttribute('hidden', '');
  await expect(panel.locator('.sfoot-ctx')).toHaveText('');
});
