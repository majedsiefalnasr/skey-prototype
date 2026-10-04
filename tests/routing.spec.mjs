import {test, expect} from '@playwright/test';
import {settle} from './support/browser.mjs';

// For You routing: every app owns a base path that lands on its For You
// screen, inner screens nest under the owning app, shell screens live
// under /system, every app-switching entry point opens For You, and
// Back/Forward keeps app switches honest. These tests boot by deep-linking
// directly — unlike boot(), which always enters through the legacy
// /concepts/app-shell.html document (kept working for the parity suite).

const baseURL = () => process.env.PARITY_URL ?? 'http://127.0.0.1:4173';

const pathOf = url => new URL(url).pathname;

async function gotoRoute(page, path) {
  await page.goto(`${baseURL()}${path}`);
  const simulateLoading = page.locator('#simulate-loading');
  if (await simulateLoading.isChecked()) {
    await simulateLoading.uncheck();
  }
  await settle(page);
  // The prototype's floating controls panel is bottom-anchored and grows
  // with the active view, so on tall-content screens it sits over the
  // sidebar rail and the topbar's switcher dropdown these tests click
  // through. Collapsing it (the panel's own control, like #simulate-loading
  // above) leaves that area clickable; it is already hidden on compact
  // viewports and while the switcher overlay is open.
  const kitMin = page.locator('#kit-min');
  if (await kitMin.isVisible()) {
    await kitMin.click();
  }
}

/** The grid button opens the launchpad overlay in switcher mode (tiles) —
 *  the row menu only opens on ArrowDown over the same trigger, and it is
 *  closed again by the overlay, so rows are reached without the overlay. */
async function openAppSwitcherRows(page) {
  const trigger = page.locator('.app-switcher-menu > button');
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.mlist.app-switcher-list')).toBeVisible();
}

async function openAppSwitcher(page) {
  await page.locator('.app-switcher-menu > button').click();
  await expect(page.locator('.lp-view[data-mode="switcher"]')).toBeVisible();
}

async function expectForYou(page, app) {
  await expect(page.locator('.foryou-view')).toBeVisible();
  await expect(page.locator('[data-foryou-app]')).toHaveText(app);
}

const isRtl = page =>
  page.evaluate(() => getComputedStyle(document.body).direction === 'rtl');

/** Rail icon buttons sit under the floating resize handle: .side-handle is
 *  24px wide but grows to a 44px hit area on coarse pointers (shell.css
 *  `:is(.ibtn, .car, .avatar-btn, .side-handle)`), which overlays the
 *  icon's centre. Click the icon's padding-start edge instead — it is clear
 *  of the handle in both writing directions and on both pointer types. */
async function clickRailIcon(page, label) {
  const icon = page.locator(`.nc2-icn[aria-label="${label}"]`);
  await expect(icon).toBeVisible();
  const box = await icon.boundingBox();
  const rtl = await isRtl(page);
  await icon.click({position: {x: rtl ? box.width - 6 : 6, y: box.height / 2}});
}

/** .nc2-rail widens to 264px on hover/focus-within and floats over the
 *  panel's first 264px (shell.css), so the row's centre is covered whenever
 *  the pointer starts over the rail. Click the row's trailing edge, which
 *  the expanded rail never reaches from either side. */
async function clickPinnedForYouRow(page) {
  const row = page.locator('.nc1-item[data-label="For You"]');
  await expect(row).toBeVisible();
  const box = await row.boundingBox();
  const rtl = await isRtl(page);
  await row.click({position: {x: rtl ? 8 : box.width - 8, y: box.height / 2}});
}

test('an app base deep link boots that app’s For You screen', async ({page}) => {
  await gotoRoute(page, '/dashboard');
  await expectForYou(page, 'Dashboard');
  await expect(page.locator('.list-view')).toBeHidden();
  expect(pathOf(page.url())).toBe('/dashboard');

  await gotoRoute(page, '/sales-systems-management');
  await expectForYou(page, 'Sales Systems Management');
  expect(pathOf(page.url())).toBe('/sales-systems-management');

  await gotoRoute(page, '/system-setup');
  await expectForYou(page, 'System Setup');
  expect(pathOf(page.url())).toBe('/system-setup');
});

test('inner screens and shell screens deep-link to their views', async ({page}) => {
  const cases = [
    ['/sales-systems-management/sales-invoices', '.list-view'],
    ['/customers/list', '.customer-list-view'],
    ['/system-setup/geographical-structure', '.geo-list-view'],
    ['/system/email', '.email-view'],
    ['/system/profile', '.profile-view'],
    ['/system/organization', '.organization-view'],
  ];
  for (const [path, view] of cases) {
    await gotoRoute(page, path);
    await expect(page.locator(view), `expected ${view} at ${path}`).toBeVisible();
    expect(pathOf(page.url())).toBe(path);
  }
});

test("the default entry '/' shows the Launchpad when it is enabled", async ({page}) => {
  await gotoRoute(page, '/');
  await expect(page.locator('.lp-view')).toBeVisible();
  expect(pathOf(page.url())).toBe('/');
});

test("the default entry '/' shows the Dashboard For You when the Launchpad is disabled", async ({page}) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('skey-proto-state', JSON.stringify({launchpad: false}));
  });
  await gotoRoute(page, '/');
  await expect(page.locator('.foryou-view')).toBeVisible();
  await expect(page.locator('[data-foryou-app]')).toHaveText('Dashboard');
  await expect(page.locator('.lp-view')).toBeHidden();
  expect(pathOf(page.url())).toBe('/');
});

test('the launchpad app tile opens the app’s For You screen', async ({page}) => {
  await gotoRoute(page, '/');
  await page.locator('.lp-tile').filter({hasText: 'Sales Systems Management'}).first().click();
  await settle(page);
  await expectForYou(page, 'Sales Systems Management');
  await expect.poll(() => pathOf(page.url())).toBe('/sales-systems-management');
});

test('the app switcher row opens the app’s For You screen', async ({page}) => {
  await gotoRoute(page, '/dashboard');
  await openAppSwitcherRows(page);
  await page.locator('.app-switcher-row[data-label="Finance and Accounting"]').click();
  await settle(page);
  await expectForYou(page, 'Finance and Accounting');
  await expect.poll(() => pathOf(page.url())).toBe('/finance-and-accounting');
});

test('sidebar rail app icons open the app’s For You screen', async ({page}) => {
  await gotoRoute(page, '/dashboard');
  await clickRailIcon(page, 'Vendors');
  await settle(page);
  await expectForYou(page, 'Vendors');
  await expect.poll(() => pathOf(page.url())).toBe('/vendors');
});

test('the panel’s pinned For You row lands on the current app’s landing', async ({page}) => {
  await gotoRoute(page, '/system-setup/geographical-structure');
  await clickRailIcon(page, 'System Setup');
  await clickPinnedForYouRow(page);
  await settle(page);
  await expectForYou(page, 'System Setup');
  await expect.poll(() => pathOf(page.url())).toBe('/system-setup');
});

test('in-app navigation keeps the URL in step and Back/Forward restores screens', async ({page}) => {
  // Rail clicks do not involve the overlay: /dashboard -> /vendors.
  await gotoRoute(page, '/dashboard');
  await clickRailIcon(page, 'Vendors');
  await settle(page);
  await expectForYou(page, 'Vendors');
  await expect.poll(() => pathOf(page.url())).toBe('/vendors');

  await page.goBack();
  await expect.poll(() => pathOf(page.url())).toBe('/dashboard');
  await expectForYou(page, 'Dashboard');

  // An overlay round-trip inserts the overlay's own '/' entry before the
  // click's destination: /dashboard -> '/' -> /customers. The overlay's
  // switcher mode renders app tiles (the row menu closes when it opens),
  // so this hop goes through the tile; the row entry point itself is the
  // dedicated switcher-row test above.
  await openAppSwitcher(page);
  await page.locator('.lp-tile[data-i18n-original="Customers"]').click();
  await settle(page);
  await expectForYou(page, 'Customers');
  await expect.poll(() => pathOf(page.url())).toBe('/customers');

  await page.goBack();
  await expect.poll(() => pathOf(page.url())).toBe('/');
  await expect(page.locator('.lp-view')).toBeVisible();

  await page.goBack();
  await expect.poll(() => pathOf(page.url())).toBe('/dashboard');
  await expectForYou(page, 'Dashboard');

  await page.goForward();
  await expect.poll(() => pathOf(page.url())).toBe('/');
  await page.goForward();
  await expect.poll(() => pathOf(page.url())).toBe('/customers');
  await expectForYou(page, 'Customers');
});

test('profile sections are addressable and selectable via ?section=', async ({page}) => {
  await gotoRoute(page, '/system/profile?section=account');
  await expect(page.locator('.profile-view')).toBeVisible();
  await expect(page.locator('[data-profile-scroll-section="account"]')).toHaveAttribute(
    'aria-current',
    'page'
  );

  await page.locator('[data-profile-scroll-section="security"]').click();
  await expect.poll(() => new URL(page.url()).search).toBe('?section=security');

  await page.goBack();
  await expect.poll(() => page.url()).toContain('/system/profile?section=account');
  await expect(page.locator('[data-profile-scroll-section="account"]')).toHaveAttribute(
    'aria-current',
    'page'
  );
});

test('Back respects the list layout leave guard and restores the URL', async ({page}, testInfo) => {
  // The Columns menu collapses into the responsive/mobile toolbar layout
  // below the desktop breakpoint (same reason the data-list saved-layout
  // test skips there).
  test.skip(
    testInfo.project.use.viewport?.width < 900,
    'Columns menu is not reachable in the responsive/mobile toolbar layout.'
  );
  await gotoRoute(page, '/dashboard');
  await openAppSwitcher(page);
  await page.locator('.lp-tag').filter({hasText: 'Sales Invoice'}).first().click();
  await settle(page);
  await expect(page.locator('.list-view')).toBeVisible();
  await expect.poll(() => pathOf(page.url())).toBe(
    '/sales-systems-management/sales-invoices'
  );

  // Make the invoice list layout dirty (hide a column, do not save) so the
  // navigation-level leave guard is armed.
  const columnsMenu = page
    .locator('.list-view')
    .locator('.data-menu')
    .filter({has: page.locator(':scope > summary', {hasText: /^Columns$/})});
  await columnsMenu.locator(':scope > summary').click();
  await columnsMenu.locator('[data-list-column]').first().uncheck();

  // Back re-resolves the URL to the Dashboard landing; the guard must
  // intercept the view change.
  await page.goBack();
  await expect(page.locator('#list-layout-guard')).toHaveClass(/open/);

  // "Keep editing" aborts the pending navigation: the history move is
  // undone, the URL returns to the entry we left, and the list stays put.
  await page.locator('#list-layout-stay').click();
  await expect(page.locator('#list-layout-guard')).not.toHaveClass(/open/);
  await expect.poll(() => pathOf(page.url())).toBe(
    '/sales-systems-management/sales-invoices'
  );
  await expect(page.locator('.list-view')).toBeVisible();
});
