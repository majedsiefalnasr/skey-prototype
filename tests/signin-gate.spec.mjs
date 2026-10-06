import {test, expect} from '@playwright/test';
import {settle} from './support/browser.mjs';

// Session gate + URL: while signed out every entry — boot deep link, default
// entry, or a history move — shows the sign-in view and remembers the plan
// the user asked for; signing in lands on that plan, or on the default entry
// (Launchpad when enabled, else the Dashboard app) when nothing is pending.

const baseURL = () => process.env.PARITY_URL ?? 'http://127.0.0.1:4173';

const pathOf = url => new URL(url).pathname;

/** Persist a signed-out (and optionally Launchpad-off) prototype state the
 *  way a previous visit would have left it. `addInitScript` runs before the
 *  app on every document of this test, so it only seeds the state once —
 *  re-seeding would undo the sign-in the test itself performs. */
async function startSignedOut(page, {launchpad = true} = {}) {
  await page.addInitScript(
    saved => {
      if (!window.sessionStorage.getItem('skey-proto-state')) {
        window.sessionStorage.setItem('skey-proto-state', JSON.stringify(saved));
      }
    },
    {'signed-in': false, launchpad}
  );
}

async function goto(page, path) {
  await page.goto(`${baseURL()}${path}`);
  const simulateLoading = page.locator('#simulate-loading');
  if (await simulateLoading.isChecked()) await simulateLoading.uncheck();
  await settle(page);
  // The floating kit panel is bottom-anchored and overlaps the topbar's
  // avatar (the logout test clicks it) — collapse it like the other specs.
  const kitMin = page.locator('#kit-min');
  if (await kitMin.isVisible()) await kitMin.click();
}

/** Two-step form: tenant (pre-filled with the demo tenant) then credentials
 *  — the demo account is admin / skey123, and the button's own 800ms +
 *  350ms latency is covered by the hidden-view wait below. lastchance has
 *  branches, so Continue parks on the branch step first; the gate only
 *  cares about reaching step 2. With fresh state the card then parks on
 *  the save step; the helper answers "Not now". */
async function signIn(page) {
  await page.locator('#si-to2').click();
  const branchGo = page.locator('#si-branch-go');
  if (await branchGo.isVisible()) await branchGo.click();
  await page.locator('#si-user').fill('admin');
  await page.locator('#si-pass').fill('skey123');
  await page.locator('#si-signin').click();
  // Fresh state has no saved PIN — the card parks on the save step and
  // the session stays signed out until the visit is answered.
  const notNow = page.locator('#si-save-not-now');
  await notNow.waitFor({state: 'visible'});
  await notNow.click();
  await expect(page.locator('.signin-view')).toBeHidden();
  await settle(page);
}

const expectSignedOut = async page => {
  await expect(page.locator('.signin-view')).toBeVisible();
  await expect(page.locator('body')).toHaveClass(/signed-out/);
};

test('a URL opened while signed out shows sign-in, then lands on that URL', async ({page}) => {
  await startSignedOut(page);
  await goto(page, '/customers/list');
  await expectSignedOut(page);
  // The gate never rewrites the address bar: the URL the user asked for
  // stays put (no /signin entry is created for it).
  expect(pathOf(page.url())).toBe('/customers/list');

  await signIn(page);
  await expect(page.locator('.customer-list-view')).toBeVisible();
  expect(pathOf(page.url())).toBe('/customers/list');
});

test('signing in from the default entry opens the Launchpad when it is enabled', async ({page}) => {
  await startSignedOut(page);
  await goto(page, '/');
  await expectSignedOut(page);

  await signIn(page);
  await expect(page.locator('.lp-view')).toBeVisible();
  expect(pathOf(page.url())).toBe('/');
});

test('signing in from the default entry opens the Dashboard app when the Launchpad is off', async ({
  page
}) => {
  await startSignedOut(page, {launchpad: false});
  await goto(page, '/');
  await expectSignedOut(page);

  await signIn(page);
  await expect(page.locator('.foryou-view')).toBeVisible();
  await expect(page.locator('[data-foryou-app]')).toHaveText('Dashboard');
  expect(pathOf(page.url())).toBe('/dashboard');
});

test('history moves while signed out stay on sign-in and keep the requested URL', async ({page}) => {
  await startSignedOut(page);
  await goto(page, '/');
  await goto(page, '/customers/list');
  await expectSignedOut(page);
  expect(pathOf(page.url())).toBe('/customers/list');

  // Back to the default entry: still gated, address bar keeps that URL,
  // and the pending plan is the default entry again (Launchpad on).
  await page.goBack();
  await expectSignedOut(page);
  expect(pathOf(page.url())).toBe('/');

  await signIn(page);
  await expect(page.locator('.lp-view')).toBeVisible();
  expect(pathOf(page.url())).toBe('/');

  // Forward, now signed in: the URL the user originally asked for opens
  // normally, with no gate.
  await page.goForward();
  await expect(page.locator('.customer-list-view')).toBeVisible();
  expect(pathOf(page.url())).toBe('/customers/list');
});

test('logging out shows the gate, and signing in again lands on the default entry', async ({
  page
}) => {
  await goto(page, '/customers/list');
  await expect(page.locator('.customer-list-view')).toBeVisible();

  // Avatar menu → Log out → confirm (same flow as user-menu.spec).
  await page.locator('.avatar-btn').click();
  await expect(page.locator('.user-pop')).toHaveClass(/open/);
  await page.locator('.logout-menu').click();
  await page.locator('#lo-confirm').click();
  await expectSignedOut(page);

  // Nothing was requested while signed out: no pending plan means the
  // default entry — Launchpad here (it is enabled by default).
  await signIn(page);
  await expect(page.locator('.lp-view')).toBeVisible();
  expect(pathOf(page.url())).toBe('/');
});
