import {test, expect} from '@playwright/test';
import {settle} from './support/browser.mjs';

// Routing v1: path-based URLs for the real prototype screens, the
// configurable default entry at '/', and Back/Forward behavior including
// the existing leave guards. These tests boot by deep-linking directly —
// unlike boot(), which always enters through the legacy
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
}

async function openAppSwitcher(page) {
  await page.locator('.app-switcher-menu > button').click();
  await expect(page.locator('.lp-view[data-mode="switcher"]')).toBeVisible();
}

async function clickLaunchpadDestination(page, label) {
  await openAppSwitcher(page);
  await page.locator('.lp-tag, .lp-tile').filter({hasText: label}).first().click();
  await settle(page);
}

test('/dashboard deep link boots the Dashboard screen', async ({page}) => {
  await gotoRoute(page, '/dashboard');
  await expect(page.locator('.dashboard-view')).toBeVisible();
  await expect(page.locator('.list-view')).toBeHidden();
  expect(pathOf(page.url())).toBe('/dashboard');
});

test('every real screen has a working deep link', async ({page}) => {
  const cases = [
    ['/invoices', '.list-view'],
    ['/customers', '.customer-list-view'],
    ['/geography', '.geo-list-view'],
    ['/email', '.email-view'],
    ['/profile', '.profile-view'],
    ['/organization', '.organization-view'],
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

test("the default entry '/' shows the Dashboard when the Launchpad is disabled", async ({page}) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('skey-proto-state', JSON.stringify({launchpad: false}));
  });
  await gotoRoute(page, '/');
  await expect(page.locator('.dashboard-view')).toBeVisible();
  await expect(page.locator('.lp-view')).toBeHidden();
  expect(pathOf(page.url())).toBe('/');
});

test('in-app navigation keeps the URL in step and Back/Forward restores screens', async ({page}) => {
  await gotoRoute(page, '/dashboard');
  await clickLaunchpadDestination(page, 'Customers');
  await expect(page.locator('.customer-list-view')).toBeVisible();
  await expect.poll(() => pathOf(page.url())).toBe('/customers');

  await page.goBack();
  await expect.poll(() => pathOf(page.url())).toBe('/dashboard');
  await expect(page.locator('.dashboard-view')).toBeVisible();

  await page.goBack();
  await expect.poll(() => pathOf(page.url())).toBe('/');
  await expect(page.locator('.lp-view')).toBeVisible();

  await page.goForward();
  await expect.poll(() => pathOf(page.url())).toBe('/dashboard');
  await expect(page.locator('.dashboard-view')).toBeVisible();
});

test('the launchpad Dashboard tile opens the Dashboard screen', async ({page}) => {
  await gotoRoute(page, '/');
  await page.locator('.lp-tile').filter({hasText: 'Dashboard'}).first().click();
  await settle(page);
  await expect(page.locator('.dashboard-view')).toBeVisible();
  await expect.poll(() => pathOf(page.url())).toBe('/dashboard');
});

test('profile sections are addressable and selectable via ?section=', async ({page}) => {
  await gotoRoute(page, '/profile?section=account');
  await expect(page.locator('.profile-view')).toBeVisible();
  await expect(page.locator('[data-profile-scroll-section="account"]')).toHaveAttribute(
    'aria-current',
    'page'
  );

  await page.locator('[data-profile-scroll-section="security"]').click();
  await expect.poll(() => new URL(page.url()).search).toBe('?section=security');

  await page.goBack();
  await expect.poll(() => page.url()).toContain('/profile?section=account');
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
  await clickLaunchpadDestination(page, 'Sales Invoice');
  await expect(page.locator('.list-view')).toBeVisible();
  await expect.poll(() => pathOf(page.url())).toBe('/invoices');

  // Make the invoice list layout dirty (hide a column, do not save) so the
  // navigation-level leave guard is armed.
  const columnsMenu = page
    .locator('.list-view')
    .locator('.data-menu')
    .filter({has: page.locator(':scope > summary', {hasText: /^Columns$/})});
  await columnsMenu.locator(':scope > summary').click();
  await columnsMenu.locator('[data-list-column]').first().uncheck();

  // Back re-resolves the URL to /dashboard; the guard must intercept the
  // view change.
  await page.goBack();
  await expect(page.locator('#list-layout-guard')).toHaveClass(/open/);

  // "Keep editing" aborts the pending navigation: the history move is
  // undone, the URL returns to the entry we left, and the list stays put.
  await page.locator('#list-layout-stay').click();
  await expect(page.locator('#list-layout-guard')).not.toHaveClass(/open/);
  await expect.poll(() => pathOf(page.url())).toBe('/invoices');
  await expect(page.locator('.list-view')).toBeVisible();
});
