// Profile page lifecycle scenarios (Task 11). Covers the user-menu entry
// point into the Page contract (Tasks 8-10), the six-section Scroll
// Navigator layout with deep-linking (Task 3/7), the change-password dialog
// (Task 5), and the sessions/devices list's sessionStorage-backed sign-out
// persistence and current-device rule (Task 6).
import {test, expect} from '@playwright/test';
import {boot, settle} from './support/browser.mjs';

/**
 * Open the profile page's Page contract to a given section via the topbar
 * avatar button's user menu — the plan's real entry point into the profile
 * page (reached this way rather than through openSurface's launchpad-tile
 * mechanism, since the profile page has no launchpad tile).
 * @param {import('@playwright/test').Page} page
 * @param {'profile'|'account'|'appearance'} section
 */
async function openProfileSection(page, section) {
  await page.locator('.avatar-btn').click();
  await page.locator(`.profile-menu[data-profile-section="${section}"]`).click();
  await settle(page);
}

test.describe('profile page', () => {
  test('opens from the user menu and shows all six sections', async ({page}) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));

    await openProfileSection(page, 'profile');
    await expect(page.locator('.profile-view')).toBeVisible();
    await expect(page.locator('[data-profile-scroll-section]')).toHaveCount(6);
    expect(errors).toEqual([]);
  });

  test('deep-links the Appearance section and highlights it as current', async ({page}) => {
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await openProfileSection(page, 'appearance');
    await expect(page.locator('[data-profile-scroll-section="appearance"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('#appearance-custom-color')).toBeVisible();
  });

  test('change password dialog validates matching passwords', async ({page}) => {
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await openProfileSection(page, 'security');
    await page.locator('[data-profile-open-change-password]').click();
    await expect(page.locator('#change-password-scrim')).toHaveClass(/open/);
    await page.locator('#current-password').fill('oldpass123');
    await page.locator('#new-password').fill('newpassword1');
    await page.locator('#confirm-password').fill('doesNotMatch');
    await page.locator('#change-password-form button[type=submit]').click();
    await expect(page.locator('#change-password-error')).toHaveText(/do not match/);
    await page.locator('#confirm-password').fill('newpassword1');
    await page.locator('#change-password-form button[type=submit]').click();
    await expect(page.locator('#change-password-scrim')).not.toHaveClass(/open/);
    await expect(page.locator('.toast')).toContainText('Password changed');
  });

  test('signing out a non-current device removes it and persists across reload', async ({page}) => {
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await openProfileSection(page, 'sessions');
    const nonCurrentRow = page.locator('.profile-device-row', {hasNot: page.locator('[data-profile-current-device]')}).first();
    const deviceId = await nonCurrentRow.getAttribute('data-profile-device');
    await nonCurrentRow.locator('[data-profile-device-signout]').click();
    await expect(page.locator(`[data-profile-device="${deviceId}"]`)).toHaveCount(0);

    await page.reload();
    await settle(page);
    await openProfileSection(page, 'sessions');
    await expect(page.locator(`[data-profile-device="${deviceId}"]`)).toHaveCount(0);
  });

  test('current device has no sign-out control', async ({page}) => {
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await openProfileSection(page, 'sessions');
    const currentRow = page.locator('.profile-device-row', {has: page.locator('[data-profile-current-device]')});
    await expect(currentRow.locator('[data-profile-device-signout]')).toHaveCount(0);
  });

  test('profile card style switches between inherited cards and simple groups', async ({page}) => {
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await openProfileSection(page, 'sessions');

    await expect(page.locator('#profile-card-style-group')).not.toHaveAttribute('hidden', '');
    await expect(page.locator('#profile-card-style')).toHaveValue('standard');
    await page.locator('#section-style').selectOption('fieldset', {force: true});

    const profile = page.locator('.profile-view');
    const cards = page.locator('#profile-section-sessions .rec-card');
    await expect(cards).toHaveCount(3);
    await expect(cards.first()).toHaveCSS('border-top-style', 'solid');
    await expect(cards.first().locator('.rec-card-hd')).toHaveCSS('position', 'relative');

    await page.locator('#profile-card-style').selectOption('simple', {force: true});
    await expect(profile).toHaveAttribute('data-profile-card-style', 'simple');
    await expect(cards.first()).toHaveCSS('border-top-style', 'none');
    await expect(cards.nth(1)).toHaveCSS('border-top-style', 'solid');
    await expect(cards.first().locator('.rec-card-hd')).toHaveCSS('position', 'static');
    await expect(cards.first().locator('.rec-card-hd')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');

    await page.locator('#profile-card-style').selectOption('standard', {force: true});
    await expect(profile).toHaveAttribute('data-profile-card-style', 'standard');
    await expect(page.locator('body')).toHaveClass(/cards-fieldset/);
    await expect(cards.first()).toHaveCSS('border-top-style', 'solid');
    await expect(cards.first().locator('.rec-card-hd')).toHaveCSS('position', 'relative');
  });

  test('profile simple card style persists across reload', async ({page}) => {
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await openProfileSection(page, 'profile');
    await page.locator('#profile-card-style').selectOption('simple', {force: true});

    await page.reload();
    await settle(page);
    await openProfileSection(page, 'profile');
    await expect(page.locator('#profile-card-style')).toHaveValue('simple');
    await expect(page.locator('.profile-view')).toHaveAttribute('data-profile-card-style', 'simple');
  });
});
