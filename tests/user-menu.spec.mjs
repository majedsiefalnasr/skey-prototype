// User menu (avatar dropdown) scenarios for the approved enhancement
// batch: log out with confirmation, branch switcher, per-page Favorites
// backed by NAV_FAVORITES, CURRENT_USER-stamped card, keyboard-shortcuts
// row, and the menu's accessibility contract (disabled Favorites with a
// reason, arrow-key traversal that skips collapsed submenu popovers,
// Escape restoring focus to the trigger), plus the pin-on-click
// regression for inner submenu summaries (Language/Workspace stay open
// after a plain click).
//
// Every visible-text assertion is locale-agnostic (keyed off
// document.documentElement.lang) so the suite holds on all seven
// projects, including mobile-rtl, which boots Arabic through the #rtl
// harness (tests/support/browser.mjs normalizes it per project).
import {test, expect} from '@playwright/test';
import {boot, settle} from './support/browser.mjs';

const baseURL = () => process.env.PARITY_URL ?? 'http://127.0.0.1:4173';

const AR = {
  'Log out?': 'تسجيل الخروج؟',
  'Signed out': 'تم تسجيل الخروج',
  'Signed in as': 'مسجَّل الدخول باسم',
  'You will be signed out of this session.': 'سيتم تسجيل خروجك من هذه الجلسة.',
  'Workspace switched': 'تم تبديل مساحة العمل',
  'Not available on this page': 'غير متاح في هذه الصفحة',
  Administrator: 'مسؤول',
};
const EN = {
  'Log out?': 'Log out?',
  'Signed out': 'Signed out',
  'Signed in as': 'Signed in as',
  'You will be signed out of this session.': 'You will be signed out of this session.',
  'Workspace switched': 'Workspace switched',
  'Not available on this page': 'Not available on this page',
  Administrator: 'Administrator',
};

const langOf = page => page.evaluate(() => document.documentElement.lang);

/** Translate a fixed-catalog string through the live document language. */
async function localized(page, key) {
  const table = (await langOf(page)) === 'ar' ? AR : EN;
  return table[key];
}

const isRtl = page => page.evaluate(() => getComputedStyle(document.body).direction === 'rtl');

/** Boot, settle, and collapse the floating kit panel — its bottom-anchored
 *  frame overlaps the sidebar rail and (on tall content) the topbar's
 *  right edge, so tests collapse it through its own control first — the
 *  same normalization routing.spec applies before shell clicks. */
async function bootUserMenu(page) {
  await boot(page, baseURL());
  await settle(page);
  const kitMin = page.locator('#kit-min');
  if (await kitMin.isVisible()) {
    await kitMin.click();
    await settle(page);
  }
}

async function openMenu(page) {
  await page.locator('.avatar-btn').click();
  await settle(page);
  await expect(page.locator('.user-pop')).toHaveClass(/open/);
}

async function closeMenu(page) {
  await page.keyboard.press('Escape');
  await settle(page);
  await expect(page.locator('.user-pop')).not.toHaveClass(/open/);
}

/** Expand a `.data-manage-submenu` details row: hover opens it under the
 *  pointer and the pin-on-click handler keeps a plain click from toggling
 *  it shut, so one click ends it open (the loop stays defensive). */
async function expandSubmenu(page, selector) {
  const submenu = page.locator(selector);
  for (let attempt = 0; attempt < 3; attempt++) {
    if (await submenu.evaluate(element => element.open)) return;
    await page.locator(`${selector} > summary`).click();
    await settle(page);
  }
  await expect(submenu).toHaveJSProperty('open', true);
}

/** The Starred rail button — rebuilt by renderSide, so it carries either
 *  the boot-time data-i18n-original stamp or a plain (translated)
 *  aria-label. Rail icons sit under the floating resize handle, so click
 *  the icon's clear edge, like routing.spec's clickRailIcon. */
async function openStarredPanel(page) {
  const icon = page
    .locator(
      '.nc2-icn[data-i18n-original="Starred"], .nc2-icn[aria-label="Starred"], .nc2-icn[aria-label="المفضلة"]'
    )
    .first();
  await expect(icon).toBeVisible();
  const box = await icon.boundingBox();
  const rtl = await isRtl(page);
  await icon.click({position: {x: rtl ? box.width - 6 : 6, y: box.height / 2}});
  await settle(page);
}

test.describe('user menu', () => {
  test('log out asks for confirmation and only signs out on confirm', async ({page}) => {
    await bootUserMenu(page);
    await openMenu(page);
    await page.locator('.logout-menu').click();
    await settle(page);

    await expect(page.locator('#loscrim')).toHaveClass(/open/);
    await expect(page.locator('#loscrim .dlg')).toBeVisible();
    await expect(page.locator('#lo-title')).toHaveText(await localized(page, 'Log out?'));

    // Standard dialog structure: warning tone, described-by subtitle in
    // the header, sign-out icon, white inner surface, stamped identity.
    const dialog = page.locator('#loscrim .dlg');
    await expect(dialog).toHaveAttribute('data-tone', 'warning');
    await expect(dialog).toHaveAttribute('aria-describedby', 'lo-sub');
    const subtitle = page.locator('#lo-sub');
    await expect(subtitle).toBeVisible();
    await expect(subtitle).toHaveClass(/dhd-subtitle/);
    await expect(subtitle).toHaveText(
      await localized(page, 'You will be signed out of this session.')
    );
    await expect(page.locator('#loscrim .dhd > svg use')).toHaveAttribute('href', '#i-signout');
    await expect(page.locator('#loscrim .dlg-inner')).toBeVisible();
    await expect(page.locator('#loscrim [data-i18n="Signed in as"]')).toHaveText(
      await localized(page, 'Signed in as')
    );
    await expect(page.locator('#loscrim [data-user-name]')).toHaveText('Majed Sief Alnasr');
    await expect(page.locator('#loscrim [data-user-email]')).toHaveText('admin@lastchance');

    // The row closes the dropdown behind the dialog.
    await expect(page.locator('.user-pop')).not.toHaveClass(/open/);

    // Cancel dismisses without signing out.
    await page.locator('#loscrim .lbtn.c-close').click();
    await settle(page);
    await expect(page.locator('#loscrim')).not.toHaveClass(/open/);
    await expect(page.locator('#toasts .toast', {hasText: await localized(page, 'Signed out')})).toHaveCount(0);

    // Escape dismisses as well.
    await openMenu(page);
    await page.locator('.logout-menu').click();
    await settle(page);
    await expect(page.locator('#loscrim')).toHaveClass(/open/);
    await page.keyboard.press('Escape');
    await settle(page);
    await expect(page.locator('#loscrim')).not.toHaveClass(/open/);

    // Confirming signs the session out with a toast.
    await openMenu(page);
    await page.locator('.logout-menu').click();
    await settle(page);
    await page.locator('#lo-confirm').click();
    await settle(page);
    await expect(page.locator('#loscrim')).not.toHaveClass(/open/);
    await expect(page.locator('#toasts .toast').last()).toContainText(await localized(page, 'Signed out'));
  });

  test('branch switcher updates card, summary, checkmark and toasts', async ({page}) => {
    await bootUserMenu(page);
    await openMenu(page);
    await expandSubmenu(page, '.branch-submenu');
    await expect(page.locator('.branch-submenu > .data-menu-popover')).toBeVisible();
    await expect(page.locator('.branch-submenu [data-branch]')).toHaveCount(3);
    await expect(page.locator('.branch-submenu [data-branch="Cairo HQ"]')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('.user-card [data-user-branch]')).toHaveText('Cairo HQ');

    await page.locator('.branch-submenu [data-branch="Alexandria"]').click();
    await settle(page);

    await expect(page.locator('.branch-submenu > summary [data-user-branch]')).toHaveText('Alexandria');
    await expect(page.locator('.user-card [data-user-branch]')).toHaveText('Alexandria');
    await expect(page.locator('.branch-submenu > summary [data-user-tenant]')).toHaveText('lastchance');
    await expect(page.locator('.branch-submenu [data-branch="Alexandria"]')).toHaveAttribute(
      'aria-checked',
      'true'
    );
    await expect(page.locator('#toasts .toast').last()).toContainText(
      await localized(page, 'Workspace switched')
    );
    // Radio picks keep the dropdown open, like Language. (The toast may
    // cover the popover band on short viewports and hover-close it — the
    // menu itself stays open either way.)
    await expect(page.locator('.user-pop')).toHaveClass(/open/);

    // The inner dropdown reopens on the pick and shows the moved check.
    await expandSubmenu(page, '.branch-submenu');
    await expect(page.locator('.branch-submenu > .data-menu-popover')).toBeVisible();
    await expect(page.locator('.branch-submenu [data-branch="Alexandria"] .menu-check')).toBeVisible();
    await expect(page.locator('.branch-submenu [data-branch="Cairo HQ"] .menu-check')).toBeHidden();

    // Reopening the menu resets the inner dropdown while the pick survives.
    await closeMenu(page);
    await openMenu(page);
    await expect(page.locator('.branch-submenu')).toHaveJSProperty('open', false);
    await expect(page.locator('.branch-submenu > summary [data-user-branch]')).toHaveText('Alexandria');
    await expect(page.locator('.branch-submenu [data-branch="Alexandria"]')).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  test('favorites row tracks NAV_FAVORITES for the current page', async ({page}) => {
    await bootUserMenu(page);
    await page
      .locator('.lp-tile[data-i18n-original="Sales Systems Management"]')
      .first()
      .click();
    await settle(page);
    await expect(page.locator('.foryou-view')).toBeVisible();

    const favorites = page.locator('.fav-toggle-menu');
    await openMenu(page);
    await expect(favorites).toBeEnabled();
    await expect(favorites.locator('[data-i18n]')).toHaveAttribute(
      'data-i18n',
      'Add this page to Favorites'
    );
    await favorites.click();
    await settle(page);
    await expect(page.locator('.user-pop')).not.toHaveClass(/open/);

    // The Starred rail group rebuilt itself with the new row.
    await openStarredPanel(page);
    await expect(page.locator('.nc3-panel .nc1-item[data-label="For You"]')).toHaveCount(1);

    await openMenu(page);
    await expect(favorites.locator('[data-i18n]')).toHaveAttribute(
      'data-i18n',
      'Remove from Favorites'
    );
    await favorites.click();
    await settle(page);
    await openStarredPanel(page);
    await expect(page.locator('.nc3-panel .nc1-item[data-label="For You"]')).toHaveCount(0);

    await openMenu(page);
    await expect(favorites.locator('[data-i18n]')).toHaveAttribute(
      'data-i18n',
      'Add this page to Favorites'
    );
  });

  test('user card is stamped from CURRENT_USER and shortcuts row opens the dialog', async ({
    page,
  }) => {
    await bootUserMenu(page);
    await openMenu(page);
    const card = page.locator('.user-card');
    await expect(card).toHaveAttribute('role', 'menuitem');
    await expect(card.locator('[data-user-initials]')).toHaveText('MS');
    await expect(card.locator('[data-user-name]')).toHaveText('Majed Sief Alnasr');
    await expect(card.locator('[data-user-email]')).toHaveText('admin@lastchance');
    await expect(card.locator('[data-user-tenant]')).toHaveText('lastchance');
    await expect(card.locator('[data-user-branch]')).toHaveText('Cairo HQ');
    await expect(card.locator('[data-active-role-label]')).toHaveText(
      await localized(page, 'Administrator')
    );
    await expect(page.locator('.avatar-btn')).toHaveAttribute('aria-label', 'Majed Sief Alnasr');

    // Keyboard shortcuts row carries the keyboard icon like its siblings
    // and raises the shared dialog; Escape dismisses.
    await expect(page.locator('.user-pop .help-kbd use[href="#i-kbd"]')).toHaveCount(1);
    await page.locator('.user-pop .help-kbd').click();
    await settle(page);
    await expect(page.locator('#kscrim')).toHaveClass(/open/);
    await page.keyboard.press('Escape');
    await settle(page);
    await expect(page.locator('#kscrim')).not.toHaveClass(/open/);

    // The card itself navigates to the profile surface.
    await openMenu(page);
    await page.locator('.user-card').click();
    await settle(page);
    await expect(page.locator('.profile-view')).toBeVisible();
  });

  test('menu a11y: disabled favorites with a reason, radio groups, keyboard traversal', async ({
    page,
  }) => {
    await bootUserMenu(page);

    // Keyboard: ArrowDown on the trigger opens the list on the card, and
    // further presses walk the visible rows — landing on the Language
    // opener and skipping the collapsed popover rows beneath it.
    await page.locator('.avatar-btn').focus();
    await page.keyboard.press('ArrowDown');
    await settle(page);
    await expect(page.locator('.user-pop')).toHaveClass(/open/);
    await expect(page.locator('.user-card')).toBeFocused();
    for (let press = 0; press < 4; press++) await page.keyboard.press('ArrowDown');
    await expect(page.locator('.language-submenu > summary')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('.user-pop .help-kbd')).toBeFocused();

    // From the branch opener the next ArrowDown lands on Customize
    // sidebar — never on a hidden popover radio.
    await page.locator('.branch-submenu > summary').focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('.user-pop .side-customize-menu')).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('.branch-submenu > summary')).toBeFocused();

    // Escape closes the menu and restores focus to the trigger.
    await page.keyboard.press('Escape');
    await settle(page);
    await expect(page.locator('.user-pop')).not.toHaveClass(/open/);
    await expect(page.locator('.avatar-btn')).toBeFocused();

    // On a surface with no nav label (launchpad) the row is disabled and
    // explains itself.
    await openMenu(page);
    const favorites = page.locator('.fav-toggle-menu');
    await expect(favorites).toBeDisabled();
    await expect(favorites).toHaveAttribute('title', await localized(page, 'Not available on this page'));

    // Submenu openers are menuitems. (The theme row and role submenu
    // were removed from the shell — absence is asserted by the
    // pin-on-click regression test below.)
    for (const summary of ['.language-submenu > summary', '.branch-submenu > summary']) {
      await expect(page.locator(summary)).toHaveAttribute('role', 'menuitem');
    }

    // Profile owns no nav label either — the row disables there too.
    await page
      .locator('.user-pop .profile-menu[data-profile-section="profile"]:not(.user-card)')
      .click();
    await settle(page);
    await openMenu(page);
    await expect(favorites).toBeDisabled();
    await expect(favorites).toHaveAttribute('title', await localized(page, 'Not available on this page'));
  });

  test('submenu summaries open on a plain click, stay pinned on pointer-out, close on the second click', async ({
    page,
  }) => {
    await bootUserMenu(page);
    await openMenu(page);

    // (a) A real user hovers the Language row (which hover-opens it) and
    // then clicks: the pin-on-click handler cancels the native toggle, so
    // the details ends OPEN and pinned, with its popover fully on-screen.
    const language = page.locator('.language-submenu');
    await expect(language).toHaveJSProperty('open', false);
    await page.locator('.language-submenu > summary').hover();
    await settle(page);
    await page.locator('.language-submenu > summary').click();
    await settle(page);
    await expect(language).toHaveJSProperty('open', true);
    await expect(language).toHaveAttribute('data-pinned', 'true');
    const popover = page.locator('.language-submenu > .data-menu-popover');
    await expect(popover).toBeVisible();
    const box = await popover.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);

    // Pointer moves away (onto the neighbouring row — not another
    // submenu, which would hover-open it and close this one by mutual
    // exclusion): the pinned popover must survive past the 140ms
    // hover-close timer.
    await page.locator('.user-pop .help-kbd').hover();
    await page.waitForTimeout(400);
    await expect(language).toHaveJSProperty('open', true);
    await expect(popover).toBeVisible();

    // (b) A second click drops the pin and closes natively.
    await page.locator('.language-submenu > summary').click();
    await settle(page);
    await expect(language).toHaveJSProperty('open', false);
    await expect(language).not.toHaveAttribute('data-pinned');

    // (c) Same open-on-click for the Workspace/branch submenu summary.
    const branch = page.locator('.branch-submenu');
    await page.locator('.branch-submenu > summary').click();
    await settle(page);
    await expect(branch).toHaveJSProperty('open', true);
    await expect(branch).toHaveAttribute('data-pinned', 'true');
    await expect(page.locator('.branch-submenu > .data-menu-popover')).toBeVisible();

    // (d) The role submenu and theme row were removed from the shell.
    await expect(page.locator('.role-submenu')).toHaveCount(0);
    await expect(page.locator('.theme-menu-row')).toHaveCount(0);
    await expect(page.locator('[data-theme-mode]')).toHaveCount(0);
    await expect(page.locator('[data-role]')).toHaveCount(0);
  });
});
