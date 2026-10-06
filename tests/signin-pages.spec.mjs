import {test, expect} from '@playwright/test';
import {settle} from './support/browser.mjs';

// Sign-in sub-pages and round-2 flows: the demo panes behind the card's
// links (reset, workspaces, device, request, privacy, support), the
// branch step, the saved-credential PIN pane, the in-card
// save-credentials step (deferred session), the viewport-filling orb
// background, and the
// footer's seven-language submenu. The footer submenu is the si- prefixed
// surface (data-si-language, own radio group) — language-switcher.spec
// owns the avatar menu's .language-submenu, and both exist in the DOM at
// once.

const baseURL = () => process.env.PARITY_URL ?? 'http://127.0.0.1:4173';

/** Persist a signed-out prototype state the way a previous visit would
 *  have left it (see signin-gate.spec). Runs before the app on every
 *  document, so it only seeds once. */
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

async function goto(page, path = '/') {
  await page.goto(`${baseURL()}${path}`);
  const simulateLoading = page.locator('#simulate-loading');
  if (await simulateLoading.isChecked()) await simulateLoading.uncheck();
  await settle(page);
  // The floating kit panel overlaps the footer on small viewports —
  // collapse it like the other specs do.
  const kitMin = page.locator('#kit-min');
  if (await kitMin.isVisible()) await kitMin.click();
  await settle(page);
}

const pane = (page, id) => page.locator(`[data-si-pane="${id}"]`);

/** Continue from the tenant step through the branch pane (lastchance and
 *  acme both have branches) to the credentials step. */
async function continueToCredentials(page) {
  await page.locator('#si-to2').click();
  const branchGo = page.locator('#si-branch-go');
  if (await branchGo.isVisible()) await branchGo.click();
}

/** Avatar menu → Log out → confirm (same flow as user-menu.spec). */
async function signOut(page) {
  await page.locator('.avatar-btn').click();
  await page.locator('.logout-menu').click();
  await page.locator('#lo-confirm').click();
}

/** The demo PIN digest (djb2) — mirrors signin.js so a test can seed an
 *  account that actually signs in. */
const djb2 = pin => {
  let hash = 5381;
  for (const char of pin) hash = ((hash << 5) + hash + char.charCodeAt(0)) >>> 0;
  return hash.toString(36);
};

/** Seed saved accounts the way a previous visit would have left them. */
async function seedAccounts(page, accounts) {
  await page.addInitScript(records => {
    if (!window.localStorage.getItem('skey-proto-accounts')) {
      window.localStorage.setItem('skey-proto-accounts', JSON.stringify(records));
    }
  }, accounts);
}

test('reset password accepts a username and confirms the demo link', async ({page}) => {
  await startSignedOut(page);
  await goto(page);

  await continueToCredentials(page);
  await settle(page);
  await page.locator('[data-si-pane="2"] [data-si-goto="reset"]').click();
  await settle(page);

  await expect(pane(page, 'reset')).toBeVisible();
  // Prefilled from the credentials step (empty there → the demo admin).
  await expect(page.locator('#si-reset-user')).toHaveValue('admin');
  await page.locator('#si-reset-send').click();
  await expect(pane(page, 'reset').locator('[data-si-reset-ok]')).toBeVisible();
  await expect(pane(page, 'reset').locator('[data-si-reset-ok]')).toContainText(
    'admin@lastchance.skeyerp.com'
  );

  // Back returns to the auth pane the user came from — step 2, not step 1.
  await pane(page, 'reset').locator('[data-si-goto="back"]').click();
  await settle(page);
  await expect(pane(page, '2')).toBeVisible();
});

test('workspace search shows no result list and Enter or Continue picks the tenant', async ({page}) => {
  await startSignedOut(page);
  await goto(page);

  await page.locator('[data-si-pane="1"] [data-si-goto="workspaces"]').click();
  await settle(page);
  await expect(pane(page, 'workspaces')).toBeVisible();

  // Round 2: the always-visible demo list is gone — search input + hint
  // + Continue button only, no rows and no empty state.
  await expect(page.locator('[data-si-ws]')).toHaveCount(0);
  await expect(page.locator('#si-ws-empty')).toHaveCount(0);
  await expect(page.locator('#si-ws-hint')).toContainText('Press Enter to continue.');
  await expect(page.locator('#si-ws-go')).toBeVisible();

  // An empty submit keeps you on the pane and flags the field.
  await page.locator('#si-ws-go').click();
  await expect(pane(page, 'workspaces')).toBeVisible();
  await expect(page.locator('#si-ws-q')).toHaveAttribute('aria-invalid', 'true');

  // Enter submits; a pasted suffix is stripped into the tenant step, and
  // acme (branch-bearing) parks on the branch pane rather than step 2.
  await page.locator('#si-ws-q').fill('acme.skeyerp.com');
  await page.locator('#si-ws-q').press('Enter');
  await settle(page);
  await expect(pane(page, 'branch')).toBeVisible();
  await expect(page.locator('#si-tenant')).toHaveValue('acme');
  await expect(page.locator('#si-branch-list input')).toHaveCount(2);

  await page.locator('#si-branch-go').click();
  await settle(page);
  await expect(pane(page, '2')).toBeVisible();
  await expect(page.locator('#si-who')).toHaveText('acme.skeyerp.com · Cairo HQ');
});

test('branch-bearing workspaces route through the branch step, others skip it', async ({page}) => {
  await startSignedOut(page);
  await goto(page);

  // lastchance → three branches, Cairo HQ preselected, pick a different one.
  await page.locator('#si-to2').click();
  await settle(page);
  await expect(pane(page, 'branch')).toBeVisible();
  await expect(page.locator('#si-branch-list input')).toHaveCount(3);
  await expect(page.locator('#si-branch-list input[value="Cairo HQ"]')).toBeChecked();
  await page.locator('#si-branch-list input[value="Alexandria"]').check();
  await page.locator('#si-branch-go').click();
  await settle(page);
  await expect(pane(page, '2')).toBeVisible();
  await expect(page.locator('#si-who')).toHaveText('lastchance.skeyerp.com · Alexandria');

  // Back to the tenant step; a branch-less workspace skips the pane and
  // the who line drops the branch suffix.
  await page.locator('#si-change').click();
  await page.locator('#si-tenant').fill('northwind');
  await page.locator('#si-to2').click();
  await settle(page);
  await expect(pane(page, '2')).toBeVisible();
  await expect(pane(page, 'branch')).toBeHidden();
  await expect(page.locator('#si-who')).toHaveText('northwind.skeyerp.com');
});

test('device code approval signs the demo session in', async ({page}) => {
  await startSignedOut(page);
  await goto(page);

  await page.locator('[data-si-pane="1"] [data-si-goto="device"]').click();
  await settle(page);
  await expect(pane(page, 'device')).toBeVisible();
  await expect(pane(page, 'device')).toContainText('SQTF-93B7');
  await expect(pane(page, 'device')).toContainText('Waiting for approval');

  await page.locator('#si-device-approve').click();
  await expect(pane(page, 'device').locator('[data-si-device-ok]')).toBeVisible();
  // Round 5: device approval completes directly — no save step.
  await expect(page.locator('.signin-view')).toBeHidden();
  await expect(page.locator('.lp-view')).toBeVisible();
});

test('request access validates required fields and confirms the demo submission', async ({page}) => {
  await startSignedOut(page);
  await goto(page);

  // The Request entry lives in the card header, above the pane stack.
  await page.locator('[data-si-goto="request"]').click();
  await settle(page);
  await expect(pane(page, 'request')).toBeVisible();

  await page.locator('#si-req-send').click();
  await expect(page.locator('#si-req-name')).toBeFocused();
  await expect(page.locator('#si-req-name')).toHaveAttribute('aria-invalid', 'true');

  await page.locator('#si-req-name').fill('Nour Hassan');
  await page.locator('#si-req-email').fill('nour@acme.com');
  await page.locator('#si-req-org').fill('Acme Industries');
  await page.locator('#si-req-send').click();
  await expect(pane(page, 'request').locator('[data-si-req-ok]')).toBeVisible();
  await expect(pane(page, 'request').locator('[data-si-req-ok]')).toContainText('nour@acme.com');
});

test('privacy and support panes open from the footer and return to sign-in', async ({page}) => {
  await startSignedOut(page);
  await goto(page);

  await page.locator('[data-si-goto="privacy"]').click();
  await settle(page);
  await expect(pane(page, 'privacy')).toBeVisible();
  await expect(pane(page, 'privacy')).toContainText('AES-256');
  await pane(page, 'privacy').locator('[data-si-goto="back"]').click();
  await settle(page);
  await expect(pane(page, '1')).toBeVisible();

  await page.locator('[data-si-goto="support"]').click();
  await settle(page);
  await expect(pane(page, 'support')).toBeVisible();
  await expect(pane(page, 'support')).toContainText('support@skeyerp.com');
  // Support links onward to the reset pane, whose back returns to step 1
  // (the last auth pane the user was on).
  await pane(page, 'support').locator('[data-si-goto="reset"]').click();
  await settle(page);
  await expect(pane(page, 'reset')).toBeVisible();
  await pane(page, 'reset').locator('[data-si-goto="back"]').click();
  await settle(page);
  await expect(pane(page, '1')).toBeVisible();
});

test('footer language menu lists the seven languages as a demo-only selector', async ({page}) => {
  await startSignedOut(page);
  await goto(page);

  const heading = await page.locator('#si-h1').textContent();
  const before = await page.evaluate(key => ({
    dir: document.documentElement.getAttribute('dir'),
    lang: document.documentElement.getAttribute('lang'),
    stored: localStorage.getItem(key),
  }), 'skey-proto-language');

  await page.locator('#si-lang').click();
  await settle(page);
  await expect(page.locator('.si-language')).toHaveJSProperty('open', true);

  const popover = page.locator('.si-language > .data-menu-popover');
  await expect(popover).toBeVisible();
  const rows = popover.locator('label[data-si-language]');
  await expect(rows).toHaveCount(7);
  expect(await rows.evaluateAll(nodes => nodes.map(node => node.dataset.siLanguage))).toEqual([
    'en', 'ar', 'fr', 'de', 'es', 'pt', 'ja',
  ]);

  await page.locator('.si-language [data-si-language="fr"]').click();
  await settle(page);
  // Selector display follows the demo pick…
  await expect(page.locator('[data-si-language-current]')).toHaveText('Français');
  await expect(page.locator('.si-language [data-si-language="fr"] input')).toBeChecked();
  await expect(page.locator('.si-language [data-si-language="en"] input')).not.toBeChecked();
  // …but the app itself is untouched: same heading, direction, lang,
  // and no persisted locale.
  await expect(page.locator('#si-h1')).toHaveText(heading);
  const after = await page.evaluate(key => ({
    dir: document.documentElement.getAttribute('dir'),
    lang: document.documentElement.getAttribute('lang'),
    stored: localStorage.getItem(key),
  }), 'skey-proto-language');
  expect(after).toEqual(before);
});

test('functional Arabic from the footer menu translates the sign-in view and flips direction', async ({page}) => {
  await startSignedOut(page);
  await goto(page);

  const englishHeading = await page.locator('#si-h1').textContent();
  await page.locator('#si-lang').click();
  await settle(page);
  await page.locator('.si-language [data-si-language="ar"]').click();
  await settle(page);

  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('[data-si-language-current]')).toHaveText('العربية');
  const arabicHeading = await page.locator('#si-h1').textContent();
  expect(arabicHeading).not.toBe(englishHeading);
  await expect(page.locator('#si-h1')).toHaveText('سجّل الدخول إلى مساحة عملك');
  await expect(page.locator('[data-si-goto="privacy"]')).toHaveText('الخصوصية والشروط');

  // A sub-pane opened after the switch is translated too (data-i18n walk).
  await page.locator('[data-si-goto="privacy"]').click();
  await settle(page);
  await expect(pane(page, 'privacy')).toBeVisible();
  await expect(pane(page, 'privacy')).toContainText('TLS 1.3');
  await expect(pane(page, 'privacy').locator('h2').first()).toHaveText('معالجة البيانات');
});

test('the orb background fills the viewport edge to edge and animates like the launchpad', async ({page}) => {
  await startSignedOut(page);
  await goto(page);

  // The view sits inside page-content's 16px padding (worse under the
  // boxed layout), so the layer must be viewport-anchored, not view-
  // anchored — otherwise flat --bg bands run down both edges.
  const measure = () =>
    page.evaluate(() => {
      const layer = document.querySelector('.signin-view .lp-orbs');
      const rect = layer.getBoundingClientRect();
      return {x: rect.x, y: rect.y, w: rect.width, h: rect.height, vw: innerWidth, vh: innerHeight};
    });
  const geometry = await measure();
  expect(geometry).toMatchObject({x: 0, y: 0});
  expect(geometry.w).toBe(geometry.vw);
  expect(geometry.h).toBe(geometry.vh);

  await page.evaluate(() => document.body.classList.add('layout-boxed'));
  const boxed = await measure();
  expect(boxed).toMatchObject({x: 0, y: 0});
  expect(boxed.w).toBe(boxed.vw);
  expect(boxed.h).toBe(boxed.vh);

  // The suite forces reducedMotion:'reduce' (shell.css then sets
  // animation:none) — emulate normal motion to assert the launchpad
  // float animation actually runs here too.
  await page.emulateMedia({reducedMotion: 'no-preference'});
  const animation = await page.evaluate(() => {
    const style = getComputedStyle(document.querySelector('.signin-view .lp-orb'));
    return {name: style.animationName, duration: style.animationDuration, state: style.animationPlayState};
  });
  expect(animation.name).toMatch(/^lp-float-/);
  expect(animation.duration).toMatch(/\d+s/);
  expect(animation.state).toBe('running');
});

test('signing in offers to save credentials behind a PIN, then the PIN signs in next time', async ({page}) => {
  await startSignedOut(page);
  await goto(page);

  await continueToCredentials(page);
  await page.locator('#si-user').fill('admin');
  await page.locator('#si-pass').fill('skey123');
  await page.locator('#si-signin').click();

  // The save step lives INSIDE the card and defers the session.
  await expect(pane(page, 'save')).toBeVisible();
  await expect(page.locator('#si-save-who')).toContainText('admin');
  await expect(page.locator('body')).toHaveClass(/signed-out/);

  await page.locator('#si-save-create').click();
  await expect(pane(page, 'savepin')).toBeVisible();

  // Validation: too short, then mismatched, then accepted.
  await page.locator('#si-save-pin').fill('123');
  await page.locator('#si-save-pin2').fill('123');
  await page.locator('#si-save-go').click();
  await expect(page.locator('#si-save-pin-err')).toContainText('6 digits');
  await page.locator('#si-save-pin').fill('123456');
  await page.locator('#si-save-pin2').fill('654321');
  await page.locator('#si-save-go').click();
  await expect(page.locator('#si-save-pin-err')).toContainText('do not match');
  await page.locator('#si-save-pin').fill('123456');
  await page.locator('#si-save-pin2').fill('123456');
  await page.locator('#si-save-go').click();

  await expect(page.locator('.signin-view')).toBeHidden();
  // Container-level assertions: "PIN created" and "Signed in" stack, and
  // a multi-element locator would violate Playwright's strict mode.
  await expect(page.locator('#toasts')).toContainText('PIN created');
  await expect(page.locator('#toasts')).toContainText('Signed in');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('skey-proto-accounts')));
  expect(stored).toHaveLength(1);
  expect(stored[0].pinHash).toBeTruthy();
  expect(stored[0].pin).toBeUndefined();
  expect(stored[0].tenant).toBe('lastchance');
  expect(stored[0].branch).toBe('Cairo HQ');
  // The round-4 single-record key is retired — nothing migrates back.
  expect(await page.evaluate(() => localStorage.getItem('skey-proto-cred'))).toBeNull();

  // Next visit: the view opens on the PIN pane, prefilled from the record.
  await signOut(page);
  await expect(pane(page, 'pin')).toBeVisible();
  await expect(page.locator('#si-pin-who')).toContainText('admin');

  await page.locator('#si-pin').fill('654321');
  await page.locator('#si-pin-signin').click();
  await expect(page.locator('#si-pin-err')).toContainText('Incorrect PIN');
  await expect(pane(page, 'pin')).toBeVisible();
  await expect(page.locator('#si-pin-else')).toBeVisible();

  await page.locator('#si-pin').fill('123456');
  await page.locator('#si-pin-signin').click();
  await expect(page.locator('.signin-view')).toBeHidden();
  // Saved credentials exist, so the save step never reappears.
  await expect(pane(page, 'save')).toBeHidden();
  // The saved branch is applied to the shell's branch menu.
  await expect(page.locator('.branch-submenu [data-branch="Cairo HQ"]')).toHaveAttribute('aria-checked', 'true');
});

test('"Not now" completes sign-in without saving, and the prompt returns next visit', async ({page}) => {
  await startSignedOut(page);
  await goto(page);

  await continueToCredentials(page);
  await page.locator('#si-user').fill('admin');
  await page.locator('#si-pass').fill('skey123');
  await page.locator('#si-signin').click();
  await expect(pane(page, 'save')).toBeVisible();
  await expect(page.locator('body')).toHaveClass(/signed-out/);

  await page.locator('#si-save-not-now').click();
  await expect(page.locator('.signin-view')).toBeHidden();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('skey-proto-accounts') || '[]'))).toHaveLength(0);
  expect(await page.evaluate(() => localStorage.getItem('skey-proto-cred'))).toBeNull();

  // The prompt returns on the next sign-in — nothing was persisted.
  await signOut(page);
  await expect(pane(page, '1')).toBeVisible();
  await continueToCredentials(page);
  await page.locator('#si-user').fill('admin');
  await page.locator('#si-pass').fill('skey123');
  await page.locator('#si-signin').click();
  await expect(pane(page, 'save')).toBeVisible();
});

test('password sign-in skips the save step when a saved PIN exists', async ({page}) => {
  await startSignedOut(page);
  await page.addInitScript(() => {
    if (!window.localStorage.getItem('skey-proto-cred')) {
      window.localStorage.setItem(
        'skey-proto-cred',
        JSON.stringify({tenant: 'lastchance', user: 'admin', branch: 'Cairo HQ', pinHash: 'zz', savedAt: Date.now()})
      );
    }
  });
  await goto(page);

  // The view short-circuits to the PIN pane; the password fallback must
  // complete without re-offering the save step.
  await expect(pane(page, 'pin')).toBeVisible();
  await page.locator('[data-si-pane="pin"] [data-si-goto="2"]').click();
  await page.locator('#si-user').fill('admin');
  await page.locator('#si-pass').fill('skey123');
  await page.locator('#si-signin').click();
  await expect(page.locator('.signin-view')).toBeHidden();
  await expect(pane(page, 'save')).toBeHidden();
  await expect(page.locator('.lp-view')).toBeVisible();
});

test('two saved accounts open the picker; picking one continues to its PIN pane', async ({page}) => {
  await startSignedOut(page);
  await seedAccounts(page, [
    {tenant: 'lastchance', user: 'admin', branch: 'Cairo HQ', pinHash: djb2('123456'), savedAt: Date.now()},
    {tenant: 'lastchance', user: 'manager', branch: 'Giza', pinHash: djb2('654321'), savedAt: Date.now()},
  ]);
  await goto(page);

  await expect(pane(page, 'accounts')).toBeVisible();
  await expect(page.locator('#si-accounts-list')).toHaveAttribute('role', 'list');
  await expect(page.locator('#si-accounts-list [role="listitem"]')).toHaveCount(2);
  await expect(page.locator('#si-accounts-list')).toContainText('admin · lastchance.skeyerp.com');
  await expect(page.locator('#si-accounts-list')).toContainText('manager · lastchance.skeyerp.com');
  await expect(page.locator('#si-accounts-list')).toContainText('Giza');

  await page.locator('[data-si-pick="1"]').click();
  await expect(pane(page, 'pin')).toBeVisible();
  await expect(page.locator('#si-pin-who')).toContainText('manager · Giza · lastchance.skeyerp.com');

  await page.locator('#si-pin').fill('654321');
  await page.locator('#si-pin-signin').click();
  await expect(page.locator('.signin-view')).toBeHidden();
  await expect(page.locator('.branch-submenu [data-branch="Giza"]')).toHaveAttribute('aria-checked', 'true');
});

test('the picker × forgets one account at a time and falls back when none remain', async ({page}) => {
  await startSignedOut(page);
  await seedAccounts(page, [
    {tenant: 'lastchance', user: 'admin', branch: 'Cairo HQ', pinHash: djb2('123456'), savedAt: Date.now()},
    {tenant: 'lastchance', user: 'manager', branch: 'Giza', pinHash: djb2('654321'), savedAt: Date.now()},
  ]);
  await goto(page);
  await expect(pane(page, 'accounts')).toBeVisible();

  await page.locator('[data-si-remove="0"]').click();
  await expect(page.locator('#toasts')).toContainText('Account removed from this device.');
  await expect(page.locator('#si-accounts-list')).not.toContainText('admin');
  await expect(page.locator('#si-accounts-list')).toContainText('manager');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('skey-proto-accounts')))).toHaveLength(1);

  await page.locator('[data-si-remove="0"]').click();
  await expect(pane(page, '1')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('skey-proto-accounts')))).toHaveLength(0);
});

test('Forget this account clears the record and routes by what remains', async ({page}) => {
  await startSignedOut(page);
  await seedAccounts(page, [
    {tenant: 'lastchance', user: 'admin', branch: 'Cairo HQ', pinHash: djb2('123456'), savedAt: Date.now()},
    {tenant: 'lastchance', user: 'manager', branch: 'Giza', pinHash: djb2('654321'), savedAt: Date.now()},
  ]);
  await goto(page);

  await page.locator('[data-si-pick="0"]').click();
  await expect(pane(page, 'pin')).toBeVisible();
  await expect(page.locator('#si-pin-forget')).toBeVisible();
  await page.locator('#si-pin-forget').click();

  await expect(page.locator('#toasts')).toContainText('Account removed from this device.');
  // One account remains → back to the picker, not the tenant step.
  await expect(pane(page, 'accounts')).toBeVisible();
  await expect(page.locator('#si-accounts-list')).toContainText('manager');
  await expect(page.locator('#si-accounts-list')).not.toContainText('admin');

  // The last one goes → tenant step.
  await page.locator('[data-si-remove="0"]').click();
  await expect(pane(page, '1')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('skey-proto-accounts')))).toHaveLength(0);
});

test('credentials offer Use PIN instead only while the identity has a saved PIN', async ({page}) => {
  await startSignedOut(page);
  await seedAccounts(page, [
    {tenant: 'lastchance', user: 'admin', branch: 'Cairo HQ', pinHash: djb2('123456'), savedAt: Date.now()},
  ]);
  await goto(page);

  await expect(pane(page, 'pin')).toBeVisible();
  await page.locator('[data-si-pane="pin"] [data-si-goto="2"]').click();
  await expect(pane(page, '2')).toBeVisible();
  await expect(page.locator('#si-who')).toContainText('admin · lastchance.skeyerp.com');
  await expect(page.locator('#si-usepin')).toBeVisible();

  // A different username has no saved PIN — the link disappears.
  await page.locator('#si-user').fill('someone');
  await expect(page.locator('#si-usepin')).toBeHidden();
  await page.locator('#si-user').fill('admin');
  await expect(page.locator('#si-usepin')).toBeVisible();

  await page.locator('#si-usepin').click();
  await expect(pane(page, 'pin')).toBeVisible();
  await expect(page.locator('#si-pin-who')).toContainText('admin · Cairo HQ · lastchance.skeyerp.com');
});

test('a wrong PIN offers Sign in as someone else back to the tenant step', async ({page}) => {
  await startSignedOut(page);
  await seedAccounts(page, [
    {tenant: 'lastchance', user: 'admin', branch: 'Cairo HQ', pinHash: djb2('123456'), savedAt: Date.now()},
  ]);
  await goto(page);

  await expect(pane(page, 'pin')).toBeVisible();
  await page.locator('#si-pin').fill('999999');
  await page.locator('#si-pin-signin').click();
  await expect(page.locator('#si-pin-err')).toContainText('Incorrect PIN');
  await expect(page.locator('#si-pin-else')).toBeVisible();
  await expect(page.locator('#si-pin-else')).toHaveAttribute('role', 'status');

  // Typing again tucks the escape hatch away.
  await page.locator('#si-pin').fill('111111');
  await expect(page.locator('#si-pin-else')).toBeHidden();

  await page.locator('#si-pin').fill('999999');
  await page.locator('#si-pin-signin').click();
  await expect(page.locator('#si-pin-else')).toBeVisible();
  await page.locator('#si-pin-someone').click();
  await expect(pane(page, '1')).toBeVisible();
});

test('saving a second identity appends to the accounts list instead of replacing', async ({page}) => {
  await startSignedOut(page);
  await seedAccounts(page, [
    {tenant: 'lastchance', user: 'manager', branch: 'Cairo HQ', pinHash: djb2('111111'), savedAt: Date.now()},
  ]);
  await goto(page);

  // One saved account → its PIN pane; the password fallback signs in as
  // a different identity, which must still see the save step (the
  // round-5 wrong-skip fix: an existing account never hides it for a
  // different user).
  await expect(pane(page, 'pin')).toBeVisible();
  await page.locator('[data-si-pane="pin"] [data-si-goto="2"]').click();
  await page.locator('#si-user').fill('admin');
  await page.locator('#si-pass').fill('skey123');
  await page.locator('#si-signin').click();
  await expect(pane(page, 'save')).toBeVisible();

  await page.locator('#si-save-create').click();
  await page.locator('#si-save-pin').fill('123456');
  await page.locator('#si-save-pin2').fill('123456');
  await page.locator('#si-save-go').click();
  await expect(page.locator('.signin-view')).toBeHidden();

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('skey-proto-accounts')));
  expect(stored).toHaveLength(2);
  expect(stored[0].user).toBe('manager');
  expect(stored[0].pinHash).toBe(djb2('111111'));
  expect(stored[1].user).toBe('admin');
  expect(stored[1].tenant).toBe('lastchance');
  expect(await page.evaluate(() => localStorage.getItem('skey-proto-cred'))).toBeNull();

  // Next visit: two identities → the picker opens.
  await signOut(page);
  await expect(pane(page, 'accounts')).toBeVisible();
  await expect(page.locator('#si-accounts-list')).toContainText('manager');
  await expect(page.locator('#si-accounts-list')).toContainText('admin');
});

test('Start over from the PIN pane returns to the picker when 2+ accounts are saved', async ({page}) => {
  await startSignedOut(page);
  await seedAccounts(page, [
    {tenant: 'lastchance', user: 'admin', branch: 'Cairo HQ', pinHash: djb2('123456'), savedAt: Date.now()},
    {tenant: 'lastchance', user: 'manager', branch: 'Giza', pinHash: djb2('654321'), savedAt: Date.now()},
  ]);
  await goto(page);

  await expect(pane(page, 'accounts')).toBeVisible();
  await page.locator('[data-si-pick="0"]').click();
  await expect(pane(page, 'pin')).toBeVisible();
  await page.locator('#si-pin-back').click();
  await expect(pane(page, 'accounts')).toBeVisible();
  await expect(page.locator('#si-accounts-list')).toContainText('admin');
});

test('password sign-in as a different identity does not carry the prefilled branch', async ({page}) => {
  await startSignedOut(page);
  await seedAccounts(page, [
    {tenant: 'lastchance', user: 'manager', branch: 'Giza', pinHash: djb2('111111'), savedAt: Date.now()},
  ]);
  await goto(page);

  await expect(pane(page, 'pin')).toBeVisible();
  await expect(page.locator('#si-pin-who')).toContainText('Giza');
  await page.locator('[data-si-pane="pin"] [data-si-goto="2"]').click();
  await expect(pane(page, '2')).toBeVisible();
  await expect(page.locator('#si-who')).toContainText('Giza');

  // Switching identity drops the record-prefilled branch from display…
  await page.locator('#si-user').fill('admin');
  await expect(page.locator('#si-who')).not.toContainText('Giza');

  await page.locator('#si-pass').fill('skey123');
  await page.locator('#si-signin').click();
  await expect(pane(page, 'save')).toBeVisible();

  await page.locator('#si-save-create').click();
  await page.locator('#si-save-pin').fill('123456');
  await page.locator('#si-save-pin2').fill('123456');
  await page.locator('#si-save-go').click();
  await expect(page.locator('.signin-view')).toBeHidden();

  // …and from the record the save step writes: the original account
  // keeps its branch, the new one carries none.
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('skey-proto-accounts')));
  expect(stored).toHaveLength(2);
  expect(stored.find(record => record.user === 'manager').branch).toBe('Giza');
  expect(stored.find(record => record.user === 'admin').branch).toBeNull();
});

test('a stale branch from a previous attempt never pre-checks the next one', async ({page}) => {
  await startSignedOut(page);
  await seedAccounts(page, [
    {tenant: 'lastchance', user: 'manager', branch: 'Giza', pinHash: djb2('111111'), savedAt: Date.now()},
  ]);
  await goto(page);

  // Sign in with the prefilled identity's PIN — branch ends the session
  // holding 'Giza' at module scope.
  await expect(pane(page, 'pin')).toBeVisible();
  await page.locator('#si-pin').fill('111111');
  await page.locator('#si-pin-signin').click();
  await expect(page.locator('.lp-view')).toBeVisible();

  // A second account shows up while still signed in, so the sign-out
  // re-activation — the "next visit", same page life, so the module-scope
  // branch from the previous attempt is still around — must start fresh
  // instead of pre-checking it. (A page reload would erase the state
  // under test, hence no goto() here.)
  await page.evaluate(hash => {
    const list = JSON.parse(localStorage.getItem('skey-proto-accounts'));
    list.push({tenant: 'lastchance', user: 'admin', branch: null, pinHash: hash, savedAt: Date.now()});
    localStorage.setItem('skey-proto-accounts', JSON.stringify(list));
  }, djb2('123456'));
  await signOut(page);

  await expect(pane(page, 'accounts')).toBeVisible();
  await page.locator('#si-accounts-other').click();
  await expect(pane(page, '1')).toBeVisible();
  await page.locator('#si-tenant').fill('lastchance');
  await page.locator('#si-to2').click();
  await expect(pane(page, 'branch')).toBeVisible();
  await expect(page.locator('#si-branch-list input:checked')).toHaveValue('Cairo HQ');
});
