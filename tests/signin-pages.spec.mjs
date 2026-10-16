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

/** Continue from the email step through the branch pane (lastchance and
 *  acme both have branches) to the credentials step. */
async function continueToCredentials(page, email = 'admin@lastchance.local') {
  await page.locator('#si-email').fill(email);
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

test('request access validates required fields and confirms the demo submission', async ({page}) => {
  await startSignedOut(page);
  await goto(page);

  // The Request entry lives in the card header, above the pane stack.
  await page.locator('[data-si-goto="request"]').first().click();
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
  await expect(page.locator('#si-h1')).toHaveText('سجّل الدخول إلى Skey');
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


test('email validation normalizes identity and branches; a branchless workspace skips selection', async ({page}) => {
  await startSignedOut(page);
  await goto(page);
  await expect(page.locator('#si-email')).toHaveValue('');
  await page.locator('#si-to2').click();
  await expect(page.locator('#si-email-error')).toHaveText('Enter your work email.');
  await expect(page.locator('#si-email')).toBeFocused();
  for (const value of ['admin', 'a@@company.com', 'a b@company.com', 'admin@company']) {
    await page.locator('#si-email').fill(value);
    await page.locator('#si-to2').click();
    await expect(page.locator('#si-email')).toHaveAttribute('aria-invalid', 'true');
    await expect(pane(page, '1')).toBeVisible();
  }
  await page.locator('#si-email').fill('  ADMIN@LastChance.local ');
  await page.locator('#si-email').press('Enter');
  await expect(pane(page, 'branch')).toBeVisible();
  await expect(page.locator('#si-email')).toHaveValue('admin@lastchance.local');
  await expect(page.locator('#si-branch-list input')).toHaveCount(3);
  await expect(page.locator('#si-branch-list input:checked')).toHaveValue('Cairo HQ');
  await page.locator('#si-branch-list input[value="Alexandria"]').check();
  await page.locator('#si-branch-go').click();
  await expect(page.locator('#si-who')).toHaveText('admin@lastchance.local · lastchance.skeyerp.com · Alexandria');
  await page.locator('#si-change').click();
  await continueToCredentials(page, 'omar@nilefoods.local');
  await expect(pane(page, 'branch')).toBeHidden();
  await expect(page.locator('#si-who')).toHaveText('omar@nilefoods.local · nilefoods.skeyerp.com');
  await expect(page.locator('#si-pass')).toHaveValue('');
});

test('unknown and unassigned emails stay signed out and prefill Request access', async ({page}) => {
  await startSignedOut(page);
  await goto(page);
  for (const [email, message] of [['unknown@acme.local', "We couldn't find"], ['pending@lastchance.local', "isn't linked"]]) {
    await page.locator('#si-email').fill(email);
    await page.locator('#si-to2').click();
    await expect(page.locator('#si-discovery-message')).toContainText(message);
    await expect(page.locator('#si-discovery-message bdi')).toHaveText(email);
    await expect(page.locator('#si-email')).toBeFocused();
    await expect(page.locator('body')).toHaveClass(/signed-out/);
    await page.locator('#si-discovery [data-si-goto="request"]').click();
    await expect(page.locator('#si-req-email')).toHaveValue(email);
    await pane(page, 'request').locator('[data-si-goto="back"]').click();
  }
  await expect(page.locator('[data-si-pane="device"], [data-si-pane="workspaces"], #si-user, #si-tenant')).toHaveCount(0);
});

test('recognized non-admin discovery never grants access with the correct demo password', async ({page}) => {
  await startSignedOut(page);
  await goto(page);
  const identityBefore = await page.locator('[data-user-email]').allTextContents();
  for (const email of ['manager@lastchance.local', 'sara@acme.local', 'omar@nilefoods.local']) {
    await continueToCredentials(page, email);
    await expect(page.locator('#si-who')).toContainText(email);
    await page.locator('#si-pass').fill('skey123');
    await page.locator('#si-signin').click();
    await expect(page.locator('[data-si-err]')).toHaveText('This demo only supports signing in as admin@lastchance.local. Use another account to continue.');
    await expect(page.locator('body')).toHaveClass(/signed-out/);
    expect(await page.locator('[data-user-email]').allTextContents()).toEqual(identityBefore);
    await page.locator('#si-change').click();
  }
});

async function passwordSignIn(page) {
  await continueToCredentials(page);
  await page.locator('#si-pass').fill('skey123');
  await page.locator('#si-signin').click();
  await expect(pane(page, 'save')).toBeVisible();
}

async function savePin(page, pin = '123456') {
  await page.locator('#si-save-create').click();
  await page.locator('#si-save-pin').fill(pin);
  await page.locator('#si-save-pin2').fill(pin);
  await page.locator('#si-save-go').click();
  await expect(page.locator('.signin-view')).toBeHidden();
}

const savedAdmin = (branch = 'Cairo HQ') => ({email: 'admin@lastchance.local', tenant: 'lastchance', branch, pinHash: djb2('123456'), savedAt: Date.now()});
const savedManager = () => ({email: 'manager@lastchance.local', tenant: 'lastchance', branch: 'Giza', pinHash: djb2('654321'), savedAt: Date.now()});

test('admin authentication publishes consistent Shell and Profile identity, with no changes on failure', async ({page}) => {
  await startSignedOut(page);
  // A previous editable Profile must not override authenticated identity.
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('skey-proto-profile-personal')) {
      sessionStorage.setItem('skey-proto-profile-personal', JSON.stringify({name: 'Other Person', email: 'other@acme.local'}));
    }
  });
  await goto(page);
  await page.locator('#si-email').fill('admin@lastchance.local');
  await page.locator('#si-to2').click();
  await page.locator('#si-branch-list input[value="Alexandria"]').check();
  await page.locator('#si-branch-go').click();
  await page.locator('#si-pass').fill('wrong');
  await page.locator('#si-signin').click();
  await expect(page.locator('[data-si-err]')).toBeVisible();
  await expect(page.locator('body')).toHaveClass(/signed-out/);
  await page.locator('#si-pass').fill('skey123');
  await page.locator('#si-signin').click();
  await expect(pane(page, 'save')).toBeVisible();
  await expect(page.locator('body')).toHaveClass(/signed-out/);
  await page.locator('#si-save-not-now').click();
  await expect(page.locator('.lp-view')).toBeVisible();
  await expect(page.locator('.branch-submenu [data-branch="Alexandria"]')).toHaveAttribute('aria-checked', 'true');
  for (const email of await page.locator('[data-user-email]').allTextContents()) expect(email).toBe('admin@lastchance.local');
  await page.locator('.avatar-btn').click();
  await page.locator('.user-card.profile-menu').click();
  await expect(page.locator('.profile-view')).toBeVisible();
  await expect(page.locator('#profile-email')).toHaveValue('admin@lastchance.local');
  await expect(page.locator('#profile-name')).toHaveValue('Majed Sief Alnasr');
  await goto(page, '/system/profile');
  await expect(page.locator('#profile-email')).toHaveValue('admin@lastchance.local');
  await expect(page.locator('#profile-name')).toHaveValue('Majed Sief Alnasr');
});

test('reset password prefills the entered email and confirms that actual address', async ({page}) => {
  await startSignedOut(page);
  await goto(page);
  await continueToCredentials(page);
  await pane(page, '2').locator('[data-si-goto="reset"]').click();
  await expect(page.locator('#si-reset-user')).toHaveValue('admin@lastchance.local');
  await page.locator('#si-reset-send').click();
  await expect(page.locator('[data-si-reset-ok]')).toContainText('admin@lastchance.local');
  await pane(page, 'reset').locator('[data-si-goto="back"]').click();
  await expect(pane(page, '2')).toBeVisible();
});

test('saving a new email-keyed PIN validates it and supports subsequent sign-in', async ({page}) => {
  await startSignedOut(page);
  await goto(page);
  await passwordSignIn(page);
  await page.locator('#si-save-create').click();
  await page.locator('#si-save-pin').fill('123');
  await page.locator('#si-save-go').click();
  await expect(page.locator('#si-save-pin-err')).toContainText('6 digits');
  await page.locator('#si-save-pin').fill('123456');
  await page.locator('#si-save-pin2').fill('654321');
  await page.locator('#si-save-go').click();
  await expect(page.locator('#si-save-pin-err')).toContainText('do not match');
  await page.locator('#si-save-pin2').fill('123456');
  await page.locator('#si-save-go').click();
  await expect(page.locator('.signin-view')).toBeHidden();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('skey-proto-accounts')));
  expect(stored).toHaveLength(1);
  expect(stored[0]).toMatchObject({email: 'admin@lastchance.local', tenant: 'lastchance', branch: 'Cairo HQ', pinHash: djb2('123456')});
  expect(stored[0].user).toBeUndefined();
  expect(stored[0].pin).toBeUndefined();
  await signOut(page);
  await expect(pane(page, 'pin')).toBeVisible();
  await page.locator('#si-pin').fill('654321');
  await page.locator('#si-pin-signin').click();
  await expect(page.locator('#si-pin-err')).toContainText('Incorrect PIN');
  await expect(page.locator('#si-pin-else')).toBeVisible();
  await page.locator('#si-pin').fill('123456');
  await expect(page.locator('#si-pin-else')).toBeHidden();
  await page.locator('#si-pin-signin').click();
  await expect(page.locator('.lp-view')).toBeVisible();
  await expect(page.locator('.branch-submenu [data-branch="Cairo HQ"]')).toHaveAttribute('aria-checked', 'true');
});

test('legacy saved accounts and the single-record key are discarded without migration', async ({page}) => {
  await startSignedOut(page);
  await page.addInitScript(() => {
    localStorage.setItem('skey-proto-cred', JSON.stringify({tenant: 'lastchance', user: 'admin', pinHash: 'zz'}));
    localStorage.setItem('skey-proto-accounts', JSON.stringify([{tenant: 'lastchance', user: 'admin', pinHash: 'zz'}]));
  });
  await goto(page);
  await expect(pane(page, '1')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('skey-proto-cred'))).toBeNull();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('skey-proto-accounts')))).toEqual([]);
});

test('Not now leaves no saved record and the prompt returns on the next sign-in', async ({page}) => {
  await startSignedOut(page);
  await goto(page);
  await passwordSignIn(page);
  await page.locator('#si-save-not-now').click();
  await expect(page.locator('.lp-view')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('skey-proto-accounts')))).toEqual([]);
  await signOut(page);
  await passwordSignIn(page);
});

test('saved admin password fallback skips saving and offers Use PIN', async ({page}) => {
  await startSignedOut(page);
  await seedAccounts(page, [savedAdmin()]);
  await goto(page);
  await expect(pane(page, 'pin')).toBeVisible();
  await pane(page, 'pin').locator('[data-si-goto="2"]').click();
  await expect(page.locator('#si-usepin')).toBeVisible();
  await page.locator('#si-usepin').click();
  await expect(pane(page, 'pin')).toBeVisible();
  await pane(page, 'pin').locator('[data-si-goto="2"]').click();
  await page.locator('#si-pass').fill('skey123');
  await page.locator('#si-signin').click();
  await expect(page.locator('.lp-view')).toBeVisible();
  await expect(pane(page, 'save')).toBeHidden();
});

test('picker retains email-keyed accounts but a non-admin PIN cannot authenticate', async ({page}) => {
  await startSignedOut(page);
  await seedAccounts(page, [savedAdmin(), savedManager()]);
  await goto(page);
  await expect(pane(page, 'accounts')).toBeVisible();
  await expect(page.locator('#si-accounts-list [role="listitem"]')).toHaveCount(2);
  await page.locator('[data-si-pick="1"]').click();
  await expect(page.locator('#si-pin-who')).toContainText('manager@lastchance.local');
  await page.locator('#si-pin').fill('654321');
  await page.locator('#si-pin-signin').click();
  await expect(page.locator('#si-pin-err')).toBeVisible();
  await expect(page.locator('body')).toHaveClass(/signed-out/);
  await page.locator('#si-pin-back').click();
  await expect(pane(page, 'accounts')).toBeVisible();
  await page.locator('[data-si-pick="0"]').click();
  await page.locator('#si-pin-forget').click();
  await expect(pane(page, 'accounts')).toBeVisible();
  await expect(page.locator('#si-accounts-list')).not.toContainText('admin@lastchance.local');
  await page.locator('[data-si-remove="0"]').click();
  await expect(pane(page, '1')).toBeVisible();
});

for (const language of ['en', 'ar']) {
  test(`saved identity eligibility is clear and rejected attempts preserve identity (${language})`, async ({page}) => {
    await startSignedOut(page);
    await seedAccounts(page, [savedAdmin(), savedManager()]);
    await page.addInitScript(() => {
      sessionStorage.setItem('skey-proto-profile-personal', JSON.stringify({name: 'Existing Person', email: 'existing@acme.local'}));
    });
    await goto(page);
    if (language === 'ar') {
      await page.locator('#rtl').evaluate(el => {
        el.checked = true;
        el.dispatchEvent(new Event('change', {bubbles: true}));
      });
      await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    }
    const copy = language === 'ar' ? {
      notice: 'يمكن فقط للحساب admin@lastchance.local تسجيل الدخول إلى هذا العرض. يمكن استخدام الهويات المحفوظة الأخرى لاستكشاف مساحة العمل.',
      admin: 'تسجيل الدخول التجريبي متاح', other: 'استكشاف مساحة العمل فقط',
      rejection: 'يدعم هذا العرض تسجيل الدخول بالحساب admin@lastchance.local فقط. استخدم حساباً آخر للمتابعة.',
      intro: 'لقد حفظت هذا الدخول — أدخل رمزك المكوّن من 6 أرقام للمتابعة.',
      pinError: 'رمز سري غير صحيح — حاول مجدداً، أو استخدم كلمة المرور.',
    } : {
      notice: 'Only admin@lastchance.local can sign in to this demo. Other saved identities can be used for workspace discovery.',
      admin: 'Demo sign-in available', other: 'Workspace discovery only',
      rejection: 'This demo only supports signing in as admin@lastchance.local. Use another account to continue.',
      intro: 'You saved this sign-in — enter your 6-digit PIN to continue.',
      pinError: 'Incorrect PIN — try again, or use your password.',
    };
    const identity = () => page.evaluate(() => ({
      names: [...document.querySelectorAll('[data-user-name]')].map(el => el.textContent),
      emails: [...document.querySelectorAll('[data-user-email]')].map(el => el.textContent),
      profile: sessionStorage.getItem('skey-proto-profile-personal'),
      signedIn: JSON.parse(sessionStorage.getItem('skey-proto-state'))['signed-in'],
      accounts: localStorage.getItem('skey-proto-accounts'),
    }));
    const before = await identity();
    expect(before.signedIn).toBe(false);
    await expect(page.locator('#si-accounts-notice')).toHaveText(copy.notice);
    await expect(page.locator('[data-si-pick="0"]')).toContainText(copy.admin);
    await expect(page.locator('[data-si-pick="1"]')).toContainText(copy.other);
    await page.locator('[data-si-pick="1"]').click();
    await expect(page.locator('#si-pin-intro')).toHaveText(copy.rejection);
    await page.locator('#si-pin').fill('654321');
    await page.locator('#si-pin-signin').click();
    await expect(page.locator('#si-pin-err')).toHaveText(copy.rejection);
    await expect(page.locator('#si-pin')).toHaveAttribute('aria-invalid', 'true');
    expect(await identity()).toEqual(before);
    await pane(page, 'pin').locator('[data-si-goto="2"]').click();
    await page.locator('#si-pass').fill('skey123');
    await page.locator('#si-signin').click();
    await expect(page.locator('[data-si-err]')).toHaveText(copy.rejection);
    await expect(page.locator('#si-pass')).toHaveAttribute('aria-invalid', 'true');
    expect(await identity()).toEqual(before);
    await expect(page.locator('body')).toHaveClass(/signed-out/);
    await page.locator('#si-change').click();
    await continueToCredentials(page);
    await page.locator('#si-usepin').click();
    await expect(page.locator('#si-pin-intro')).toHaveText(copy.intro);
    await page.locator('#si-pin').fill('000000');
    await page.locator('#si-pin-signin').click();
    await expect(page.locator('#si-pin-err')).toHaveText(copy.pinError);
    expect(await identity()).toEqual(before);
  });
}

for (const [label, raw] of [
  ['empty', '[]'], ['malformed JSON', '{broken'], ['non-array', '{}'],
  ['invalid records', JSON.stringify([null, {user: 'admin', tenant: 'lastchance', pinHash: djb2('123456')},
    {email: 'unknown@acme.local', pinHash: djb2('123456')}, {email: 'pending@lastchance.local', pinHash: djb2('123456')},
    {email: 'admin@lastchance.local', pinHash: ''}])],
]) {
  test(`saved accounts fall back to email entry: ${label}`, async ({page}) => {
    await startSignedOut(page);
    await page.addInitScript(value => localStorage.setItem('skey-proto-accounts', value), raw);
    await goto(page);
    await expect(pane(page, '1')).toBeVisible();
    await expect(page.locator('#si-email')).toHaveValue('');
    await expect(page.locator('#si-email')).toBeFocused();
    await expect(pane(page, 'accounts')).toBeHidden();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('skey-proto-accounts')))).toEqual([]);
  });
}

test('changing email clears the saved branch and saving admin preserves the other record', async ({page}) => {
  await startSignedOut(page);
  await seedAccounts(page, [savedManager()]);
  await goto(page);
  await pane(page, 'pin').locator('[data-si-goto="2"]').click();
  await expect(page.locator('#si-who')).toContainText('Giza');
  await page.locator('#si-change').click();
  await passwordSignIn(page);
  await savePin(page);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('skey-proto-accounts')));
  expect(stored).toHaveLength(2);
  expect(stored.find(r => r.email === 'manager@lastchance.local').branch).toBe('Giza');
  expect(stored.find(r => r.email === 'admin@lastchance.local').branch).toBe('Cairo HQ');
  await signOut(page);
  await page.locator('#si-accounts-other').click();
  await page.locator('#si-email').fill('admin@lastchance.local');
  await page.locator('#si-to2').click();
  await expect(page.locator('#si-branch-list input:checked')).toHaveValue('Cairo HQ');
});

test('delayed focus preserves fast sequential PIN entry and request-field interaction', async ({page}) => {
  await startSignedOut(page);
  await goto(page);
  await passwordSignIn(page);
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.evaluate(() => document.querySelector('#si-save-create').click());
  await page.locator('#si-save-pin').fill('123456');
  await page.locator('#si-save-pin2').focus();
  await page.clock.runFor(61);
  await expect(page.locator('#si-save-pin2')).toBeFocused();
  await page.keyboard.insertText('123456');
  await expect(page.locator('#si-save-pin')).toHaveValue('123456');
  await expect(page.locator('#si-save-pin2')).toHaveValue('123456');
  await page.evaluate(() => document.querySelector('[data-si-goto="request"]').click());
  // Header Request access is independent of the pane's save controls.
  await expect(pane(page, 'request')).toBeVisible();
  await page.locator('#si-req-name').fill('Fast User');
  await page.locator('#si-req-email').fill('');
  await page.locator('#si-req-email').focus();
  await page.clock.runFor(61);
  await expect(page.locator('#si-req-email')).toBeFocused();
  await page.keyboard.insertText('fast@acme.local');
  await expect(page.locator('#si-req-name')).toHaveValue('Fast User');
  await expect(page.locator('#si-req-email')).toHaveValue('fast@acme.local');
});

test('interaction history prevents deferred focus stealing even after the field loses focus', async ({page}) => {
  await startSignedOut(page);
  await goto(page);
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.evaluate(() => document.querySelector('[data-si-goto="request"]').click());
  await page.locator('#si-req-email').fill('fast@acme.local');
  await page.locator('#si-lang').focus();
  await page.clock.runFor(61);
  await expect(page.locator('#si-lang')).toBeFocused();
});

test('password-manager-like focused and value-only filling survives the pane transition', async ({page}) => {
  await startSignedOut(page);
  await goto(page);
  await page.locator('#si-email').fill('admin@lastchance.local');
  await page.locator('#si-to2').click();
  await expect(pane(page, 'branch')).toBeVisible();
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.evaluate(() => document.querySelector('#si-branch-go').click());
  await page.locator('#si-pass').focus();
  await page.clock.runFor(61);
  await page.keyboard.insertText('skey123');
  await expect(page.locator('#si-pass')).toHaveValue('skey123');
  await expect(page.locator('#si-auth-email')).toHaveAttribute('autocomplete', 'username');
  await expect(page.locator('#si-auth-email')).toHaveValue('admin@lastchance.local');
  await page.evaluate(() => {
    document.querySelector('#si-change').click();
    document.querySelector('#si-to2').click();
    document.querySelector('#si-branch-go').click();
    const password = document.querySelector('#si-pass');
    password.value = 'skey123';
    password.dispatchEvent(new Event('input', {bubbles: true}));
  });
  await page.clock.runFor(61);
  await expect(page.locator('#si-pass')).toHaveValue('skey123');
  await page.locator('#si-signin').click();
  await page.clock.runFor(1200);
  await expect(pane(page, 'save')).toBeVisible();
});

test('keyboard initial focus, tab order and superseded pane callbacks', async ({page}) => {
  await startSignedOut(page);
  await goto(page);
  await page.locator('[data-si-goto="privacy"]').click();
  await pane(page, 'privacy').locator('[data-si-goto="back"]').click();
  await expect(page.locator('#si-email')).toBeFocused();
  await page.locator('#si-email').fill('admin@lastchance.local');
  await page.locator('#si-email').press('Enter');
  await expect(page.locator('#si-branch-list input:checked')).toBeFocused();
  await page.locator('#si-branch-go').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#si-pass')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#si-show')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#si-signin')).toBeFocused();
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.evaluate(() => {
    document.activeElement.blur();
    document.querySelector('[data-si-goto="request"]').click();
    document.querySelector('[data-si-goto="privacy"]').click();
    document.querySelector('[data-si-pane="privacy"] [data-si-goto="back"]').click();
  });
  await page.clock.runFor(61);
  await expect(page.locator('#si-pass')).toBeFocused();
  await page.locator('#si-pass').fill('skey123');
  await page.locator('#si-pass').press('Enter');
  await page.clock.runFor(1200);
  await expect(pane(page, 'save')).toBeVisible();
});

test('email/password mobile attributes and Arabic RTL preserve LTR identities', async ({page}, testInfo) => {
  await startSignedOut(page);
  await goto(page);
  const email = page.locator('#si-email');
  for (const [attr, value] of Object.entries({type: 'email', inputmode: 'email', autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'next', dir: 'ltr'})) {
    await expect(email).toHaveAttribute(attr, value);
  }
  await page.locator('#si-lang').click();
  await page.locator('.si-language [data-si-language="ar"]').click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await email.fill('unknown@acme.local');
  if (testInfo.project.use.hasTouch) await page.locator('#si-to2').tap();
  else await page.locator('#si-to2').click();
  await expect(page.locator('#si-discovery-message')).toContainText('لم نعثر');
  await expect(page.locator('#si-discovery-message bdi')).toHaveAttribute('dir', 'ltr');
  await email.fill('admin@lastchance.local');
  if (testInfo.project.use.hasTouch) await page.locator('#si-to2').tap();
  else await page.locator('#si-to2').click();
  await page.locator('#si-branch-go').click();
  await expect(page.locator('#si-pass')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('#si-pass')).toHaveAttribute('enterkeyhint', 'go');
  await expect(page.locator('#si-who')).toContainText('admin@lastchance.local');
  await page.locator('#si-pass').fill('skey123');
  await page.locator('#si-signin').click();
  await expect(pane(page, 'save')).toBeVisible();
  await savePin(page);
  await signOut(page);
  await expect(pane(page, 'pin')).toBeVisible();
  await page.locator('#si-pin').fill('123456');
  await page.locator('#si-pin-signin').click();
  await expect(page.locator('.lp-view')).toBeVisible();
});
