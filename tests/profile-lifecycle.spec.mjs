// Profile page lifecycle scenarios (Task 11). Covers the user-menu entry
// point into the Page contract (Tasks 8-10), the six-section Scroll
// Navigator layout with deep-linking (Task 3/7), and the change-password
// dialog (Task 5). The Sessions & devices section no longer renders a
// Devices card, so its sign-out scenarios are gone with it.
import {test, expect} from '@playwright/test';
import {boot, settle} from './support/browser.mjs';

/**
 * Open the profile page's Page contract to a given section via the topbar
 * avatar button's user menu — the plan's real entry point into the profile
 * page (reached this way rather than through openSurface's launchpad-tile
 * mechanism, since the profile page has no launchpad tile).
 *
 * The user menu only carries Profile/Account/Appearance/Security/Sessions
 * since the organization-center rework dropped Employee details and Contact
 * details from it; those two sections are reached the way the app now
 * exposes them — open My Profile, then activate the section's own
 * Scroll Navigator tab.
 * @param {import('@playwright/test').Page} page
 * @param {'profile'|'employee'|'contact'|'account'|'appearance'|'security'|'sessions'} section
 */
async function openProfileSection(page, section) {
  await page.locator('.avatar-btn').click();
  const menuEntry = page.locator(`.profile-menu[data-profile-section="${section}"]`);
  if (await menuEntry.count()) {
    await menuEntry.click();
  } else {
    await page.locator('.profile-menu[data-profile-section="profile"]').click();
    await page.locator(`[data-profile-scroll-section="${section}"]`).click();
  }
  await settle(page);
}

test.describe('profile page', () => {
  test('opens from the user menu and shows the revised seven profile sections', async ({page}) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));

    await openProfileSection(page, 'profile');
    await expect(page.locator('.profile-view')).toBeVisible();
    await expect(page.locator('[data-profile-scroll-section]')).toHaveCount(7);
    await expect(page.locator('[data-profile-scroll-section]')).toHaveText([
      'Profile',
      'Employee details',
      'Contact details',
      'Account settings',
      'Appearance',
      'Security',
      'Sessions & devices',
    ]);
    await expect(page.locator('[data-profile-section="notifications"]')).toHaveCount(0);
    await expect(page.locator('.profile-danger-zone, #profile-2fa-toggle')).toHaveCount(0);
    // A user who could be inactive couldn't have signed in to open this
    // page at all, so an active/inactive status here is meaningless — the
    // header carries no status badge.
    await expect(page.locator('#profile-header-status')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('every editable tab starts with a disabled Save/Undo bar that enables once dirty', async ({page}) => {
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    for (const section of ['profile', 'employee', 'contact', 'account']) {
      await openProfileSection(page, section);
      await expect(page.locator(`#profile-${section}-save`)).toBeDisabled();
      await expect(page.locator(`#profile-${section}-undo`)).toBeDisabled();
    }
  });

  test('personal information save, undo, and persist across reload', async ({page}) => {
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await openProfileSection(page, 'profile');

    const jobTitle = page.locator('#profile-job-title');
    const phone = page.locator('#profile-phone');
    await jobTitle.fill('Senior ERP Administrator');
    await phone.fill('+20 100 999 8888');
    await expect(page.locator('#profile-profile-save')).toBeEnabled();
    await page.locator('#profile-profile-save').click();
    await expect(page.locator('.toast')).toContainText('Profile saved');
    await expect(page.locator('#profile-profile-save')).toBeDisabled();

    await jobTitle.fill('Temporary title');
    await expect(page.locator('#profile-profile-undo')).toBeEnabled();
    await page.locator('#profile-profile-undo').click();
    await expect(jobTitle).toHaveValue('Senior ERP Administrator');
    await expect(page.locator('#profile-profile-undo')).toBeDisabled();

    await page.reload();
    await settle(page);
    await openProfileSection(page, 'profile');
    await expect(jobTitle).toHaveValue('Senior ERP Administrator');
    await expect(phone).toHaveValue('+20 100 999 8888');
  });

  test('account settings save, undo, and persist across reload', async ({page}) => {
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await openProfileSection(page, 'account');

    await expect(page.locator('#profile-username')).toBeDisabled();
    await expect(page.locator('#profile-branch')).toBeDisabled();

    const landingPage = page.locator('#profile-landing-page');
    await landingPage.selectOption('invoices');
    await expect(page.locator('#profile-account-save')).toBeEnabled();
    await page.locator('#profile-account-save').click();
    await expect(page.locator('.toast')).toContainText('Account settings saved');
    await expect(page.locator('#profile-account-save')).toBeDisabled();

    await page.reload();
    await settle(page);
    await openProfileSection(page, 'account');
    await expect(page.locator('#profile-landing-page')).toHaveValue('invoices');
  });

  test('employee contact details save, undo, and persist across reload', async ({page}) => {
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await openProfileSection(page, 'employee');

    await expect(page.locator('#profile-employee-number')).toBeDisabled();
    await expect(page.locator('#profile-employee-department')).toBeDisabled();

    const workPhone = page.locator('#profile-employee-work-phone');
    const extension = page.locator('#profile-employee-extension');
    const officeLocation = page.locator('#profile-employee-office-location');
    await expect(workPhone).toBeEnabled();
    await workPhone.fill('+20 2 5555 0101');
    await extension.fill('410');
    await officeLocation.fill('Cairo HQ · Floor 5');
    await page.locator('#profile-employee-save').click();
    await expect(page.locator('.toast')).toContainText('Employee details saved');

    await officeLocation.fill('Temporary office');
    await page.locator('#profile-employee-undo').click();
    await expect(officeLocation).toHaveValue('Cairo HQ · Floor 5');

    await page.reload();
    await settle(page);
    await openProfileSection(page, 'employee');
    await expect(workPhone).toHaveValue('+20 2 5555 0101');
    await expect(extension).toHaveValue('410');
    await expect(officeLocation).toHaveValue('Cairo HQ · Floor 5');
  });

  test('contact details save, undo, and persist across reload', async ({page}) => {
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await openProfileSection(page, 'contact');

    const phone = page.locator('#profile-contact-phone');
    const city = page.locator('#profile-contact-city');
    const website = page.locator('#profile-contact-website');
    await expect(phone).toBeEnabled();
    await phone.fill('+20 2 5555 0202');
    await city.fill('Alexandria');
    await website.fill('https://example.com');
    await page.locator('#profile-contact-save').click();
    await expect(page.locator('.toast')).toContainText('Contact details saved');

    await city.fill('Temporary city');
    await page.locator('#profile-contact-undo').click();
    await expect(city).toHaveValue('Alexandria');

    await page.reload();
    await settle(page);
    await openProfileSection(page, 'contact');
    await expect(phone).toHaveValue('+20 2 5555 0202');
    await expect(city).toHaveValue('Alexandria');
    await expect(website).toHaveValue('https://example.com');
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

  test('profile card style switches between inherited cards and simple groups', async ({page}) => {
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await openProfileSection(page, 'sessions');

    await expect(page.locator('#profile-card-style-group')).not.toHaveAttribute('hidden', '');
    await expect(page.locator('#profile-card-style')).toHaveValue('standard');
    await page.locator('#section-style').selectOption('fieldset', {force: true});

    const profile = page.locator('.profile-view');
    // Recent activity + Login log; the Devices card is gone from this tab.
    const cards = page.locator('#profile-section-sessions .rec-card');
    await expect(cards).toHaveCount(2);
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

  test('settings navigation style switches both settings pages and persists', async ({page}) => {
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await openProfileSection(page, 'profile');

    await expect(page.locator('#settings-navigation-style-group')).not.toHaveAttribute('hidden', '');
    await page.locator('#settings-navigation-style').selectOption('standard', {force: true});
    await expect(page.locator('.profile-view')).toHaveAttribute('data-settings-navigation-style', 'standard');
    await expect(page.locator('.profile-scroll-nav')).toHaveCSS('display', 'flex');
    await expect(page.locator('.profile-scroll-nav')).toHaveCSS('border-bottom-style', 'solid');

    await page.locator('.avatar-btn').click();
    await page.locator('.organization-menu[data-organization-section="overview"]').click();
    await settle(page);
    await expect(page.locator('.organization-view')).toHaveAttribute('data-settings-navigation-style', 'standard');
    await expect(page.locator('.organization-nav')).toHaveCSS('display', 'flex');

    await page.reload();
    await settle(page);
    await openProfileSection(page, 'profile');
    await expect(page.locator('#settings-navigation-style')).toHaveValue('standard');
    await expect(page.locator('.profile-view')).toHaveAttribute('data-settings-navigation-style', 'standard');
  });
});
