// The sidebar's Account rail group. Profile, Organization Center and Email
// are screens of the shell itself — they have pages and URLs but no app —
// so they share one non-app rail group at the bottom of the rail instead of
// taking a rail icon each. These scenarios pin the three things that have to
// hold together: the group comes up whenever one of those views is current
// (whatever the entry point), its rows navigate to the views, and the group
// never leaks into the launchpad or the app switcher, which are both built
// from NAV_TREE alone.
//
// Deep links are used for the URL-bearing cases (like routing.spec): boot()
// enters through the legacy /concepts/app-shell.html document, which never
// syncs its own URL. Every rail/panel click applies the same edge-position
// normalization routing.spec uses for the floating resize handle and the
// hover-expanded rail.
import {test, expect} from '@playwright/test';
import {settle} from './support/browser.mjs';

const baseURL = () => process.env.PARITY_URL ?? 'http://127.0.0.1:4173';

const pathOf = url => new URL(url).pathname;

/** Locale-agnostic: applyLocale() stamps the English label before it
 *  translates the aria-label, and a rail rebuilt by renderSide carries
 *  whichever of the two survived. */
const ACCOUNT_ICON =
  '.nc2-icn[data-i18n-original="Account"], .nc2-icn[aria-label="Account"], .nc2-icn[aria-label="الحساب"]';

const isRtl = page => page.evaluate(() => getComputedStyle(document.body).direction === 'rtl');

/** Deep-link boot + the two normalizations shell clicks need: collapse the
 *  floating kit panel (bottom-anchored, it sits over the rail) and skip the
 *  prototype's loading simulation so views settle. */
async function gotoRoute(page, path) {
  await page.goto(`${baseURL()}${path}`);
  const simulateLoading = page.locator('#simulate-loading');
  if (await simulateLoading.isChecked()) {
    await simulateLoading.uncheck();
  }
  await settle(page);
  const kitMin = page.locator('#kit-min');
  if (await kitMin.isVisible()) {
    await kitMin.click();
    await settle(page);
  }
}

/** Rail icons sit under the floating resize handle, whose hit area overlays
 *  their centre — click the icon's clear edge instead (routing.spec). */
async function clickRailIcon(page, selector) {
  const icon = page.locator(selector).first();
  await expect(icon).toBeVisible();
  const box = await icon.boundingBox();
  const rtl = await isRtl(page);
  await icon.click({position: {x: rtl ? box.width - 6 : 6, y: box.height / 2}});
  await settle(page);
}

/** The Account panel is a pinned panel on wide viewports and an on-demand
 *  flyout on the collapsed rail of compact ones — bring it up either way. */
async function openAccountPanel(page) {
  if (await page.locator('.nc3-panel .nc1-item[data-label="Profile"]').isVisible()) return;
  await clickRailIcon(page, ACCOUNT_ICON);
}

/** Panel rows sit under the hover-expanded rail's first 264px, so click the
 *  row's trailing edge (routing.spec's clickPinnedForYouRow). */
async function clickPanelRow(page, label) {
  await openAccountPanel(page);
  const row = page.locator(`.nc3-panel .nc1-item[data-label="${label}"]`);
  await expect(row).toBeVisible();
  const box = await row.boundingBox();
  const rtl = await isRtl(page);
  await row.click({position: {x: rtl ? 8 : box.width - 8, y: box.height / 2}});
  await settle(page);
}

async function openAvatarMenu(page) {
  await page.locator('.avatar-btn').click();
  await settle(page);
  await expect(page.locator('.user-pop')).toHaveClass(/open/);
}

/** The topbar's row menu (grid icon + ArrowDown) — the launchpad overlay
 *  covers the topbar, so it is opened from an app screen. */
async function openAppSwitcherRows(page) {
  const trigger = page.locator('.app-switcher-menu > button');
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.mlist.app-switcher-list')).toBeVisible();
}

const accountGroupLabels = async () => {
  const {NAV_ACCOUNT_GROUP} = await import('../concepts/app/prototype/fixtures/navigation.js');
  return NAV_ACCOUNT_GROUP;
};

test('a shell-screen deep link brings up the Account group in the rail', async ({page}) => {
  await gotoRoute(page, '/system/profile');
  await expect(page.locator('.profile-view')).toBeVisible();
  await expect.poll(() => pathOf(page.url())).toBe('/system/profile');

  await expect(page.locator(ACCOUNT_ICON)).toHaveClass(/active/);
  await openAccountPanel(page);
  await expect(page.locator('.nc3-panel .nc3-title')).toHaveText('Account');
  await expect(page.locator('.nc3-panel .nc1-item')).toHaveCount(3);
  await expect(page.locator('.nc3-panel .nc1-item[data-label="Profile"]')).toHaveClass(/current/);
  await expect(
    page.locator('.nc3-panel .nc1-item[data-label="Organization Center"]')
  ).toHaveCount(1);
  await expect(page.locator('.nc3-panel .nc1-item[data-label="Email"]')).toHaveCount(1);
  // It is a group of screens, not an app landing: no pinned For You row.
  await expect(page.locator('.nc3-panel .nc1-item[data-label="For You"]')).toHaveCount(0);
  // ...and it pins the bottom of the rail instead of sitting among the apps:
  // outside the scrolling icon list (which overflows on its own), so it stays
  // reachable however far that list scrolls, and clear of the fixed
  // "Prototype controls" pill that covers the rail's last 48px.
  const pin = await page.evaluate(() => {
    const icon = document.querySelector('.nc2-rail-foot .nc2-icn');
    const rail = document.querySelector('.nc2-rail');
    const list = document.querySelector('.nc2-rail-scroll');
    const icons = [...document.querySelectorAll('.nc2-rail .nc2-icn')];
    const ir = icon?.getBoundingClientRect();
    const rr = rail.getBoundingClientRect();
    const kit = document.querySelector('.kit-pill');
    const kr = kit?.getBoundingClientRect();
    return {
      last: !!icon && icons[icons.length - 1] === icon,
      fullyVisible: !!ir && ir.width > 0 && ir.top >= rr.top && ir.bottom <= rr.bottom,
      listScrolls: list.scrollHeight > list.clientHeight,
      // 2D: on wide viewports the minimized kit pill sits bottom-left over
      // the rail, on compact ones it moves right of it entirely.
      pillClear:
        !kr ||
        !kr.width ||
        ir.right <= kr.left ||
        ir.left >= kr.right ||
        ir.bottom <= kr.top ||
        ir.top >= kr.bottom,
    };
  });
  expect(pin).toEqual({last: true, fullyVisible: true, listScrolls: true, pillClear: true});

  // The quick groups are pinned the same way at the other end, so only apps
  // are ever subject to that scroll.
  const top = await page.evaluate(() => {
    const has = (root, label) =>
      !!root?.querySelector(`.nc2-icn[aria-label="${label}"], .nc2-icn[data-i18n-original="${label}"]`);
    const pinned = document.querySelector('.nc2-rail-top');
    const list = document.querySelector('.nc2-rail-scroll');
    const quick = ['For You', 'Starred', 'Recent'];
    return {
      starredPinned: has(pinned, 'Starred'),
      recentPinned: has(pinned, 'Recent'),
      quickInList: quick.filter(label => has(list, label)),
      appsInList: list.querySelectorAll('.nc2-icn').length,
    };
  });
  expect(top.starredPinned).toBe(true);
  expect(top.recentPinned).toBe(true);
  expect(top.quickInList).toEqual([]);
  expect(top.appsInList).toBeGreaterThanOrEqual(15);
});

test('the avatar menu’s Organization Center entry lands in the Account group', async ({page}) => {
  await gotoRoute(page, '/dashboard');
  await openAvatarMenu(page);
  await page.locator('.organization-menu[data-organization-section="overview"]').click();
  await settle(page);

  await expect(page.locator('.organization-view')).toBeVisible();
  await expect.poll(() => pathOf(page.url())).toBe('/system/organization');
  await expect(page.locator(ACCOUNT_ICON)).toHaveClass(/active/);
  await openAccountPanel(page);
  await expect(page.locator('.nc3-panel .nc3-title')).toHaveText('Account');
  await expect(
    page.locator('.nc3-panel .nc1-item[data-label="Organization Center"]')
  ).toHaveClass(/current/);
  await expect(page.locator('.nc3-panel .nc1-item[data-label="Profile"]')).not.toHaveClass(
    /current/
  );
});

test('the Account group’s Email row opens Email', async ({page}) => {
  await gotoRoute(page, '/system/profile');
  await clickPanelRow(page, 'Email');

  await expect(page.locator('.email-view')).toBeVisible();
  await expect.poll(() => pathOf(page.url())).toBe('/system/email');
  await expect(page.locator(ACCOUNT_ICON)).toHaveClass(/active/);
  await expect(page.locator('.nc3-panel .nc1-item[data-label="Email"]')).toHaveClass(/current/);
});

test('Back out of Profile hands the rail back to the owning app', async ({page}) => {
  await gotoRoute(page, '/sales-systems-management/sales-invoices');
  await expect(page.locator('.list-view')).toBeVisible();

  await openAvatarMenu(page);
  await page.locator('.user-pop .profile-menu[data-profile-section="profile"]:not(.user-card)').click();
  await settle(page);
  await expect(page.locator('.profile-view')).toBeVisible();
  await expect(page.locator(ACCOUNT_ICON)).toHaveClass(/active/);

  await page.goBack();
  await settle(page);
  await expect.poll(() => pathOf(page.url())).toBe('/sales-systems-management/sales-invoices');
  await expect(page.locator('.list-view')).toBeVisible();
  // The Account group must not keep claiming a page it doesn't own.
  await expect(page.locator(ACCOUNT_ICON)).not.toHaveClass(/active/);
  await expect(page.locator('.nc3-panel .nc3-title')).toHaveText('Sales Systems Management');
  await expect(page.locator('.nc3-panel .nc1-item[data-label="Sales Invoice"]')).toHaveClass(
    /current/
  );
});

test('the launchpad and the app switcher offer apps, never the Account group', async ({page}) => {
  await gotoRoute(page, '/');
  await expect(page.locator('.lp-view')).toBeVisible();
  const labels = await accountGroupLabels();
  // The launchpad renders NAV_TREE and nothing else — a group seeded outside
  // it (like Starred/Recent, like Account) has no tile to show.
  const tileLabels = await page
    .locator('.lp-tile')
    .evaluateAll(tiles => tiles.map(tile => tile.dataset.i18nOriginal));
  const {NAV_TREE} = await import('../concepts/app/prototype/fixtures/navigation.js');
  expect(tileLabels).toEqual(NAV_TREE.map(group => group[0]));
  expect(tileLabels).not.toContain(labels[0]);

  await gotoRoute(page, '/dashboard');
  await openAppSwitcherRows(page);
  const rowLabels = await page
    .locator('.app-switcher-row')
    .evaluateAll(rows => rows.map(row => row.dataset.label));
  expect(rowLabels).toEqual(NAV_TREE.map(group => group[0]));

  // The fixture invariant behind both lists, checked where it can't drift.
  const {ACCOUNT_VIEW_BY_LABEL} = await import(
    '../concepts/app/prototype/fixtures/navigation.js'
  );
  const {APP_PATH_BY_LABEL} = await import('../concepts/app/core/routes.js');
  const flatten = node => (Array.isArray(node) ? node.flatMap(flatten) : [node]);
  const treeLabels = flatten(NAV_TREE);
  for (const label of labels) expect(treeLabels).not.toContain(label);
  for (const label of Object.keys(ACCOUNT_VIEW_BY_LABEL)) {
    expect(Object.keys(APP_PATH_BY_LABEL)).not.toContain(label);
  }
});
