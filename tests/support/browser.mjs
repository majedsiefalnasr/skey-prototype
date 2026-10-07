// Shared Playwright helpers for baseline/current app-shell parity tests.
// These wrap only EXISTING DOM controls/selectors already present in the
// baseline (launchpad exact-name buttons, [data-list-open-record],
// Notifications -> Email, #simulate-loading, #rtl, .skeleton-overlay) — no
// new testing hooks are added to the application markup.

import {test} from '@playwright/test';

/** @typedef {import('@playwright/test').Page} Page */

// Fixed clock so both baseline and current runs render identical relative
// dates/times. 2026-09-13T09:00:00+02:00 == 2026-09-13T07:00:00.000Z.
export const FIXTURE_TIME_ISO = '2026-09-13T09:00:00+02:00';
export const FIXTURE_TIME_EPOCH_MS = Date.parse(FIXTURE_TIME_ISO);

// Launchpad tile labels -> the surface `showContentView` lands on
// (setNavCurrent's viewByNavLabel mapping in the source).
const LAUNCHPAD_LIST_LABELS = {
  list: 'Sales Invoice',
  'customers-list': 'Customers',
  'geo-list': 'Geographical Structure',
};

// Each *-record surface is reached by opening its corresponding list first,
// then clicking the first available [data-list-open-record] control.
const RECORD_LIST_SURFACE = {
  record: 'list',
  'customer-record': 'customers-list',
  'geo-record': 'geo-list',
};

/**
 * Navigate to `baseURL`, install a fixed browser clock (so relative time
 * text and animations behave identically across baseline/current runs
 * while still letting timers progress), and disable the prototype's
 * simulate-loading control through its existing checkbox so skeleton
 * overlays resolve deterministically.
 *
 * Projects that need RTL (there is no OS-level media query for text
 * direction, unlike dark mode/high contrast) declare `rtl: true` in their
 * Playwright project `use` config; this reads that flag and checks the
 * existing `#rtl` control, which dispatches the app's own `change` handler
 * (`applyLocale('ar')`) — the direction is never set directly.
 * @param {Page} page
 * @param {string} baseURL
 */
export async function boot(page, baseURL) {
  await page.clock.install({time: FIXTURE_TIME_EPOCH_MS});
  // The baseline's own <head> loads ApexCharts as a render-blocking classic
  // <script src="https://cdn.jsdelivr.net/..."> (see known-defects.md
  // finding 12) — none of this suite's 8 static surfaces render a chart on
  // open, but a blocked/offline/slow path to that CDN still stalls the
  // page's `load` event for the whole script's connect timeout, since the
  // parser can't continue past a blocking <script> tag either way. Aborting
  // just that one known external request keeps parity tests deterministic
  // regardless of network reachability, without touching the app's own
  // lazy-load behavior for the library (only invoked from inside an actual
  // chart render, per the source).
  await page.route('https://cdn.jsdelivr.net/npm/apexcharts**', route => route.abort());
  await page.goto(`${baseURL}/concepts/app-shell.html`);
  await page.clock.resume();

  const simulateLoading = page.locator('#simulate-loading');
  if (await simulateLoading.isChecked()) {
    await simulateLoading.uncheck();
  }

  const wantsRtl = Boolean(test.info().project.use.rtl);
  const rtlToggle = page.locator('#rtl');
  if (wantsRtl !== (await rtlToggle.isChecked())) {
    // `#rtl` lives in the prototype's `.demo-bar`, which this concept page's
    // own "shell kit" stylesheet (`#shell-kit-css`) unconditionally hides
    // with `display: none !important` — so a visibility-gated `.click()`/
    // `.setChecked()` times out waiting for it to become actionable. This
    // still drives the existing control and its real `change` handler
    // (`applyLocale('ar')`), only skipping Playwright's actionability wait.
    await rtlToggle.evaluate((element, checked) => {
      element.checked = checked;
      element.dispatchEvent(new Event('change', {bubbles: true}));
    }, wantsRtl);
  }
}

/**
 * Navigate the already-booted page to one of the plan's eight surfaces,
 * using only existing DOM affordances (launchpad tiles, record-open
 * buttons, Notifications -> Email). Leaves the launchpad screen for
 * `launchpad` itself; every other surface first dismisses the launchpad
 * by opening its owning list (or, for `email`, via Notifications).
 * @param {Page} page
 * @param {'launchpad'|'list'|'record'|'customers-list'|'customer-record'|'geo-list'|'geo-record'|'email'} id
 */
export async function openSurface(page, id) {
  if (id === 'launchpad') {
    return;
  }

  if (id === 'email') {
    await openEmailFromNotifications(page);
    return;
  }

  const listSurface = RECORD_LIST_SURFACE[id] ?? id;
  const launchpadLabel = LAUNCHPAD_LIST_LABELS[listSurface];
  if (!launchpadLabel) {
    throw new Error(`openSurface: unknown surface id "${id}"`);
  }

  // "Sales Invoice", "Customers", and "Geographical Structure" are leaves
  // inside NAV_TREE groups, not top-level `.lp-tile` app buttons — they
  // reach the launchpad only via NAV_FAVORITES, rendered as `.lp-tag`
  // "Starred" shortcuts by launchpadTag() (source). That function only
  // stamps `data-i18n-original` on the tag's inner <span> the first time
  // applyLocale() runs (lazily, on the first RTL/locale change); before
  // that the span's plain textContent is already the exact English label
  // (appLocale starts 'en'). Matching either form keeps this one "exact
  // name" lookup correct whether or not this test's boot() has toggled RTL,
  // without adding any selector/attribute the baseline doesn't already
  // produce on its own.
  await page
    .locator('.lp-view')
    .locator('.lp-tag')
    .filter({
      has: page.locator(`span[data-i18n-original="${launchpadLabel}"], span:text-is("${launchpadLabel}")`),
    })
    .first()
    .click();
  await waitForSkeletonToAppear(page);

  if (listSurface !== id) {
    // A *-record surface: open the first record from the list we just landed on.
    await page.locator('[data-list-open-record]').first().click();
    await waitForSkeletonToAppear(page);
  }
}

/**
 * Every navigation shows a brief loading skeleton "by default" (source
 * comment at `SKELETON_DELAY_MS`), even with #simulate-loading off —
 * `queueSkeletonForCurrentView` defers actually creating `.skeleton-overlay`
 * to its own `requestAnimationFrame`, then clears it 700ms later. Calling
 * `settle()` (its exact, brief-specified `.skeleton-overlay.waitFor({state:
 * 'hidden'})`) immediately after a click races that deferral: if the overlay
 * hasn't been created yet, the locator matches nothing and resolves as
 * already "hidden", so the screenshot can land mid-skeleton once the real
 * overlay appears moments later. A fixed frame count isn't a reliable fix —
 * under CPU contention the gap between the click and the queued rAF actually
 * running varies — so this waits on real DOM state: for the overlay to
 * attach at all. If it never does (e.g. some future surface that legitimately
 * skips the loading state), this times out quickly and is swallowed, since
 * settle()'s own wait already handles "no overlay, nothing to wait out".
 * @param {Page} page
 */
async function waitForSkeletonToAppear(page) {
  await page
    .locator('.skeleton-overlay')
    .waitFor({state: 'attached', timeout: 2000})
    .catch(() => {});
}

/**
 * Open Email the way the plan requires: through Notifications -> Email,
 * never the launchpad's "Internal Mail" shortcut (which deliberately keeps
 * its known routing defect — see tests/support/known-defects.md, finding 7).
 * @param {Page} page
 */
async function openEmailFromNotifications(page) {
  // Keyed off the app's own i18n source attribute, not the rendered
  // aria-label: applyLocale() rewrites that label in place (System Alerts ->
  // تنبيهات النظام), so an aria-label selector only ever matches in English
  // and the whole surface is unreachable on the RTL project.
  await page.locator('button.ibtn[data-i18n-aria-label="System Alerts"]').click();
  await page.locator('.notif-tabs button[data-tab="email"]').click();
  // Rows inside the notifications popover's Email tab are rendered by
  // renderEmailTab as `.notif-row` elements in `#notif-body` (clicking one
  // calls the source's own `openEmailView(id)`); `.email-list-row` is a
  // different class used only by the full email page view once open.
  await page.locator('#notif-body .notif-row').first().click();
  await waitForSkeletonToAppear(page);
}

/**
 * Wait for the page to reach a visually stable, screenshot-ready state:
 * any skeleton loading overlay has resolved, web fonts are loaded, and two
 * animation frames have elapsed so layout/paint have settled.
 * @param {Page} page
 */
export async function settle(page) {
  await page.locator('.skeleton-overlay').waitFor({state: 'hidden'});
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(
    () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  );
}

/**
 * Right-click the first data-list row and leave its context menu open.
 *
 * The invoice table is wider than the viewport, so Playwright's default
 * center-point click scrolls the table's horizontal scroller first. That
 * scroll event is dispatched after `contextmenu`, where it reaches the
 * app's `window.addEventListener('scroll', closeDataListContextMenu, true)`
 * handler and closes the menu before an assertion can see it. Clicking a
 * point already inside the viewport triggers no scroll, so the menu stays.
 * @param {Page} page
 * @param {string} [context] data-list context, e.g. 'invoice'
 */
export async function openRowContextMenu(page, context = 'invoice') {
  const row = page.locator(`[data-data-list="${context}"] [data-list-row-key]`).first();
  const box = await row.boundingBox();
  const x = Math.max(8, Math.min(40, Math.floor(box.width / 2)));
  const y = Math.max(4, Math.min(24, Math.floor(box.height / 2)));
  await row.click({button: 'right', position: {x, y}});
}

/**
 * Open the invoice list's chart panel through a column header's "Chart
 * range" context-menu action.
 *
 * The toolbar's Chart button — together with Print and the Kanban view
 * option — renders with a deliberate `hidden` attribute (asserted by
 * tests/table-customer-ux.test.mjs's "table controls hide print, charts,
 * and kanban without removing their implementations"), so those controls
 * have no clickable entry point. "Chart range" is the visible affordance
 * that still flips `listState.chartVisible`, and it rerenders through the
 * context menu's own column-action path.
 * @param {Page} page
 */
export async function openListChart(page) {
  const header = page.locator('[data-data-list="invoice"] th[data-col]').first();
  await header.click({button: 'right', position: {x: 10, y: 12}});
  await page.locator('[data-context-column-action="chart-range"]').click();
  await settle(page);
  if ((await page.locator('.apexcharts-svg').count()) === 0) return;
  await page.waitForFunction(
    () => {
      const paths = [...document.querySelectorAll('.apexcharts-series path')];
      if (!paths.length) return false;
      const widths = paths.map(path => path.getBBox().width.toFixed(2)).join(',');
      if (widths === window.__skeyChartWidths) return true;
      window.__skeyChartWidths = widths;
      return false;
    },
    undefined,
    {polling: 120}
  );
}
