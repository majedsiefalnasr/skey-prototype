// Browser behavior checks for the shared shell facilities extracted in
// Task 4 (locale, appearance, dialog focus, toast, work, loading). These
// exercise the facilities only through existing UI/DOM affordances already
// present in the baseline (no new testing hooks) — the same convention
// tests/parity.spec.mjs follows.
//
// Scope: prove the extraction changed no observable behavior for the one
// thing each facility does. This is not a re-run of the full parity matrix;
// tests/parity.spec.mjs / the Task 4 report cover the broader screenshot
// check separately.

import {test, expect} from '@playwright/test';
import {boot, openSurface, settle} from './support/browser.mjs';

test('theme change re-renders an open data list chart', async ({page}, testInfo) => {
  // The list toolbar's Chart toggle collapses into responsive chrome below
  // the desktop breakpoint (same as several other toolbar controls in this
  // app) — this test's concern (applyTheme() -> chart destroy/recreate
  // wiring) is viewport-independent, so it runs once on a desktop-sized
  // project rather than chasing the mobile toolbar's collapse interaction.
  test.skip(
    testInfo.project.use.viewport?.width < 900,
    'Chart toggle is not reachable in the responsive/mobile toolbar layout.'
  );
  // tests/support/browser.mjs's boot() deliberately aborts the real
  // ApexCharts CDN request so every other surface stays deterministic and
  // network-independent (see its comment, and known-defects.md finding 12).
  // This test's only concern is the app's own wiring — does applyTheme()
  // still call chart.destroy()+recreate on every open chart — not ApexCharts'
  // actual rendering (that library is third-party and out of scope here, per
  // the plan's "do not substitute a fake chart and claim chart parity", which
  // is about visual parity, not this wiring check). A minimal spy standing in
  // for the constructor keeps the assertion deterministic and offline while
  // still exercising the real `new ApexCharts(...)` / `.destroy()` call
  // sites in the shipped code, unmodified.
  await page.addInitScript(() => {
    window.__chartInstances = [];
    window.ApexCharts = class {
      constructor(el, options) {
        this.el = el;
        this.options = options;
        this.destroyed = false;
        window.__chartInstances.push(this);
      }
      render() {
        return Promise.resolve();
      }
      destroy() {
        this.destroyed = true;
      }
    };
  });
  await boot(page, 'http://127.0.0.1:4173');
  await openSurface(page, 'list');
  await settle(page);

  // Open the invoice list's chart panel using its existing toggle control.
  await page.locator('[data-list-action="chart"]').first().click();
  await expect.poll(() => page.evaluate(() => window.__chartInstances.length)).toBe(1);

  // Flip the existing theme control to dark — applyTheme() is expected to
  // call refreshOpenDataListCharts(), which destroys the previous chart
  // instance and constructs a new one for the same mount. #theme lives in
  // the prototype's demo bar, hidden the same way #rtl is (see boot()'s
  // comment on that control), so it is driven the same way: set + dispatch.
  await page.locator('#theme').evaluate(element => {
    element.value = 'dark';
    element.dispatchEvent(new Event('change', {bubbles: true}));
  });
  await expect.poll(() => page.evaluate(() => window.__chartInstances.length)).toBe(2);
  const firstDestroyed = await page.evaluate(() => window.__chartInstances[0].destroyed);
  expect(firstDestroyed).toBe(true);
});

test('Arabic locale switch updates direction and field formatting', async ({page}) => {
  await boot(page, 'http://127.0.0.1:4173');
  // Some Playwright projects (e.g. mobile-rtl) already boot with #rtl
  // checked (see tests/support/browser.mjs boot()'s `wantsRtl` handling) —
  // this test always exercises the same-direction *switch*, so it starts by
  // forcing English/ltr first regardless of the project's starting state.
  await page.locator('#rtl').evaluate(element => {
    if (element.checked) {
      element.checked = false;
      element.dispatchEvent(new Event('change', {bubbles: true}));
    }
  });
  await openSurface(page, 'record');
  await settle(page);

  const netAmount = page.locator('#invoice-summary-net');
  const before = await netAmount.textContent();
  // The document has no explicit `dir` attribute in the default English
  // locale (browsers treat that as implicit ltr) — applyLocale('ar') is the
  // only code path that ever sets `dir`.
  await expect(page.locator('html')).not.toHaveAttribute('dir', 'rtl');

  // #rtl is hidden by the concept page's own stylesheet (see
  // tests/support/browser.mjs boot()'s comment on the same control) — drive
  // it the same way: set + dispatch its real change handler.
  await page.locator('#rtl').evaluate(element => {
    element.checked = true;
    element.dispatchEvent(new Event('change', {bubbles: true}));
  });

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(netAmount).not.toHaveText(before);
  // Arabic-Indic digits replace the Western digits once translated.
  await expect(netAmount).toHaveText(/[٠-٩]/);
});

test('print dialog returns keyboard focus', async ({page}) => {
  await boot(page, 'http://127.0.0.1:4173');
  await openSurface(page, 'record');
  const trigger = page.locator('.content').getByRole('button', {name: 'Print', exact: true});
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', {name: 'Print Settings'})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

test('print dialog traps Tab within its focusable controls', async ({page}) => {
  await boot(page, 'http://127.0.0.1:4173');
  await openSurface(page, 'record');
  const trigger = page.locator('.content').getByRole('button', {name: 'Print', exact: true});
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', {name: 'Print Settings'});
  await expect(dialog).toBeVisible();

  // Focus starts on the dialog's first focusable control (trapFocus's
  // existing behavior). Shift+Tab from there must wrap to the dialog's
  // last focusable control, never escape to something outside the dialog.
  const focusable = dialog.locator(
    'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])'
  );
  const count = await focusable.count();
  expect(count).toBeGreaterThan(1);
  const last = focusable.nth(count - 1);

  await page.keyboard.press('Shift+Tab');
  await expect(last).toBeFocused();

  await page.keyboard.press('Escape');
});

test('a simulated failure resets busy state and shows the existing toast', async ({page}) => {
  await boot(page, 'http://127.0.0.1:4173');
  await openSurface(page, 'record');
  await settle(page);

  // Existing prototype demo controls (hidden by the concept page's own
  // stylesheet the same way #rtl is — see boot()'s comment) put the record
  // into an editable, dirty state and force the next simulated operation to
  // fail, exactly like tests/parity.spec.mjs's project setup drives #rtl.
  await page.locator('#mode').evaluate(element => {
    element.value = 'edit';
    element.dispatchEvent(new Event('change', {bubbles: true}));
  });
  await page.locator('#dirty').evaluate(element => {
    element.checked = true;
    element.dispatchEvent(new Event('change', {bubbles: true}));
  });
  await page.locator('#failsim').evaluate(element => {
    element.checked = true;
    element.dispatchEvent(new Event('change', {bubbles: true}));
  });

  const saveButton = page.locator('.content .lbtn[data-act="Save"]');
  await saveButton.click();

  const toast = page.locator('.toast.bad');
  await expect(toast).toBeVisible();
  await expect(toast).toContainText('Could not save the invoice');
  await expect(saveButton).not.toHaveAttribute('aria-busy', 'true');
});
