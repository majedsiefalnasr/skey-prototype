// Language selector scenarios. The selector is a prototype/demo surface:
// the avatar menu's Language details submenu (a Statistics-manage-submenu
// style inner dropdown: summary opener + fixed radio popover) and Profile
// → Account settings → Language row share one seven-entry catalog
// (endonym + ISO code + checked radio), but only EN/AR are functional —
// selecting a demo-only entry (FR/DE/ES/PT/JA) updates the selector's own
// display state alone and must never change the application language,
// direction, content, or storage. Functional selections persist in
// localStorage (skey-proto-language).
//
// Every assertion is locale-agnostic so the suite holds on all seven
// projects, including mobile-rtl, which boots Arabic through the #rtl
// harness (tests/support/browser.mjs normalizes it per project).
import {test, expect} from '@playwright/test';
import {boot, settle} from './support/browser.mjs';

const LANGUAGE_STORAGE_KEY = 'skey-proto-language';

const SUBMENU = '.language-submenu';
const POPOVER = '.language-submenu > .data-menu-popover';

/**
 * Expand the Language inner dropdown. The summary hover-opens under the
 * mouse before Playwright's click toggles it shut, so click again until
 * the details ends up open — mirroring the toggle a user gets when they
 * click an already-hovered row.
 */
async function expandLanguageSubmenu(page) {
  const submenu = page.locator(SUBMENU);
  for (let attempt = 0; attempt < 3; attempt++) {
    if (await submenu.evaluate(element => element.open)) return;
    await page.locator(`${SUBMENU} > summary`).click();
    await settle(page);
  }
  await expect(submenu).toHaveJSProperty('open', true);
}

/** Open the avatar menu and expand its Language inner dropdown. */
async function openLanguageSubmenu(page) {
  await page.locator('.avatar-btn').click();
  await settle(page);
  await expandLanguageSubmenu(page);
}

/** Reads the direction/lang/storage trio every scenario compares around. */
async function appLanguageState(page) {
  return page.evaluate(key => ({
    dir: document.documentElement.getAttribute('dir'),
    lang: document.documentElement.getAttribute('lang'),
    stored: localStorage.getItem(key),
    current: document.querySelector('[data-language-current]')?.textContent ?? null,
  }), LANGUAGE_STORAGE_KEY);
}

test.describe('language selector', () => {
  test('avatar menu submenu lists the seven-catalog endonyms with one checked radio', async ({page}) => {
    await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173');

    await page.locator('.avatar-btn').click();
    await settle(page);
    const submenu = page.locator(SUBMENU);
    const summary = page.locator(`${SUBMENU} > summary`);
    await expect(summary).toBeVisible();
    // The summary trails the current endonym, so the selection is visible
    // before expanding the inner dropdown.
    const openerState = await appLanguageState(page);
    await expect(summary.locator('[data-language-current]')).toHaveText(openerState.current);

    await expandLanguageSubmenu(page);
    await expect(page.locator(POPOVER)).toBeVisible();
    // Statistics-style behavior: the main menu list stays in place while
    // the language popover opens next to it — no view swap, no back row.
    await expect(page.locator('.user-pop [data-i18n="Personal"]')).toBeVisible();
    await expect(page.locator('[data-language-back]')).toHaveCount(0);

    const popover = page.locator(POPOVER);
    const rows = popover.locator('label[data-language]');
    await expect(rows).toHaveCount(7);
    expect(await rows.evaluateAll(nodes => nodes.map(node => node.dataset.language))).toEqual([
      'en', 'ar', 'fr', 'de', 'es', 'pt', 'ja',
    ]);
    // Endonyms and ISO codes are always shown in their own language.
    await expect(rows.nth(0).locator('span').first()).toHaveText('English');
    await expect(rows.nth(1).locator('span').first()).toHaveText('العربية');
    await expect(rows.nth(6).locator('span').first()).toHaveText('日本語');
    await expect(rows.nth(0).locator('.ms-auto')).toHaveText('EN');
    await expect(rows.nth(6).locator('.ms-auto')).toHaveText('JA');
    // Exactly one native radio is checked, and it matches the boot
    // language (English on most projects, Arabic on mobile-rtl).
    const checked = popover.locator('label[data-language]:has(input:checked)');
    await expect(checked).toHaveCount(1);
    const bootLang = (await appLanguageState(page)).lang ?? 'en';
    await expect(checked).toHaveAttribute('data-language', bootLang === 'ar' ? 'ar' : 'en');

    // Closing the avatar menu collapses the inner dropdown, so the menu
    // always reopens with the language list shut.
    await page.keyboard.press('Escape');
    await settle(page);
    await page.locator('.avatar-btn').click();
    await settle(page);
    await expect(submenu).toHaveJSProperty('open', false);
    await expect(page.locator(POPOVER)).toBeHidden();
  });

  test('demo-only French moves the selector display but never the app language, direction, or storage', async ({page}) => {
    await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173');
    const before = await appLanguageState(page);

    await openLanguageSubmenu(page);
    await page.locator('[data-language="fr"]').click();
    await settle(page);

    const after = await appLanguageState(page);
    // Selector display follows the demo selection…
    await expect(page.locator(`${SUBMENU} [data-language-current]`)).toHaveText('Français');
    await expect(page.locator('[data-language="fr"] input')).toBeChecked();
    await expect(page.locator('[data-language="en"] input')).not.toBeChecked();
    // …but the app itself is untouched: same direction, same lang, no
    // persisted locale, and translated chrome text unchanged.
    expect(after.dir).toBe(before.dir);
    expect(after.lang).toBe(before.lang);
    expect(after.stored).toBe(before.stored);
    expect(after.stored).toBeNull();
    await expect(page.locator('.user-pop [data-i18n="Personal"]')).toHaveText(
      before.lang === 'ar' ? 'شخصي' : 'Personal'
    );

    // Statistics-style behavior: the popover stays open after picking so
    // adjacent options remain reachable, and the display state survives a
    // menu close/reopen — still never persisted.
    await expect(page.locator(POPOVER)).toBeVisible();
    await page.keyboard.press('Escape');
    await settle(page);
    await page.locator('.avatar-btn').click();
    await settle(page);
    await expect(page.locator(`${SUBMENU} [data-language-current]`)).toHaveText('Français');
    await expect(page.locator(SUBMENU)).toHaveJSProperty('open', false);
    expect((await appLanguageState(page)).stored).toBeNull();
  });

  test('functional Arabic switches the app and survives a reload until English is chosen again', async ({page}) => {
    await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173');
    // Start from a known English state on every project (mobile-rtl boots
    // Arabic through the #rtl harness), using that existing control.
    await page.locator('#rtl').evaluate(element => {
      element.checked = false;
      element.dispatchEvent(new Event('change', {bubbles: true}));
    });
    await settle(page);
    expect((await appLanguageState(page)).dir).not.toBe('rtl');

    await openLanguageSubmenu(page);
    await page.locator('[data-language="ar"]').click();
    await settle(page);

    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator(`${SUBMENU} [data-language-current]`)).toHaveText('العربية');
    await expect(page.locator('[data-language="ar"] input')).toBeChecked();
    expect((await appLanguageState(page)).stored).toBe('ar');

    // Reload without re-running boot()'s per-project #rtl normalization —
    // the restore path (initLanguage) must bring Arabic back on its own.
    await page.reload();
    await settle(page);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator(`${SUBMENU} [data-language-current]`)).toHaveText('العربية');
    await expect(page.locator('[data-language="ar"] input')).toBeChecked();
    expect((await appLanguageState(page)).stored).toBe('ar');
    await expect(page.locator('#rtl')).toBeChecked();

    // Choosing English again is functional too and overwrites the stored
    // locale (switching back through the same submenu).
    await openLanguageSubmenu(page);
    await page.locator('[data-language="en"]').click();
    await settle(page);
    await expect(page.locator('html')).not.toHaveAttribute('dir', 'rtl');
    expect((await appLanguageState(page)).stored).toBe('en');
    await page.reload();
    await settle(page);
    await expect(page.locator('html')).not.toHaveAttribute('dir', 'rtl');
    expect((await appLanguageState(page)).stored).toBe('en');
  });

  test('profile Account settings exposes the same catalog through its Language select', async ({page}) => {
    await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173');

    await page.locator('.avatar-btn').click();
    await settle(page);
    await page.locator('.profile-menu[data-profile-section="account"]').click();
    await settle(page);
    await expect(page.locator('.profile-view')).toBeVisible();

    const select = page.locator('#profile-language');
    await expect(select).toBeVisible();
    // The old read-only Locale duplicate is gone — Language is the single
    // profile-side control.
    await expect(page.locator('#profile-locale')).toHaveCount(0);
    const before = await appLanguageState(page);
    await expect(page.locator('label[for="profile-language"]')).toHaveText(
      before.lang === 'ar' ? 'اللغة' : 'Language'
    );

    const options = await select.locator('option').evaluateAll(nodes =>
      nodes.map(node => ({value: node.value, label: node.textContent, lang: node.getAttribute('lang')}))
    );
    expect(options.map(option => option.value)).toEqual(['en', 'ar', 'fr', 'de', 'es', 'pt', 'ja']);
    expect(options.map(option => option.label)).toEqual([
      'English (EN)',
      'العربية (AR)',
      'Français (FR)',
      'Deutsch (DE)',
      'Español (ES)',
      'Português (PT)',
      '日本語 (JA)',
    ]);
    expect(options.every(option => option.lang === option.value)).toBe(true);

    // It starts on the app's current language and shares state with the
    // avatar-menu submenu: picking a demo code there updates this select.
    await expect(select).toHaveValue(before.lang === 'ar' ? 'ar' : 'en');

    await openLanguageSubmenu(page);
    await page.locator('[data-language="de"]').click();
    await settle(page);
    await expect(select).toHaveValue('de');

    // And choosing from the profile select drives the same selector state.
    // Close the open avatar menu first so it can't cover the select.
    const stateAfterDemo = await appLanguageState(page);
    await page.keyboard.press('Escape');
    await settle(page);
    await select.selectOption('es');
    await settle(page);
    await expect(page.locator(`${SUBMENU} [data-language-current]`)).toHaveText('Español');
    expect((await appLanguageState(page)).stored).toBe(stateAfterDemo.stored);
    expect((await appLanguageState(page)).dir).toBe(stateAfterDemo.dir);
  });
});
