# Multi-Account Sign-In (Round 5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single saved credential with a list of saved accounts — picker entry for 2+ identities, per-account forget/removal, a two-way PIN⇄password switch, and identity-matched save rules (fixing the wrong-skip bug).

**Architecture:** `signin.js` owns a small accounts model (`skey-proto-accounts` array + one-time migration from `skey-proto-cred`) with derive-on-read identity (`currentAccount()` resolves from the tenant/user fields that every route into the PIN pane syncs first — this is round 5's refinement of the spec's `activeAccount` state idea; it cannot go stale because every entry path syncs the fields). A new `accounts` pane (pane count 12 → 13) renders picker rows dynamically. Templates and locale own the new markup/labels; `main.js` is untouched.

**Tech Stack:** vanilla ESM, Tailwind CLI build, node:test contract tests, Playwright 7-project suites.

## Global Constraints

- **NEVER commit** (user standing rule — skip every commit step; leave the working tree dirty).
- Demo creds: `admin` / `skey123`; PINs are exactly 6 digits; tenants `lastchance` (branches Cairo HQ/Alexandria/Giza) and `acme`.
- Build before any browser test: `node scripts/build.mjs` → must print `Built dist/`. Dev server already runs on port 4173 serving `dist` (baseURL `http://127.0.0.1:4173`).
- Unit tests: `node --test tests/*.test.mjs` (120 currently; this plan adds 1 guard test → **121 expected**).
- Playwright sign-in suites: `tests/signin-gate.spec.mjs` + `tests/signin-pages.spec.mjs`; 7 projects (`desktop`, `mobile-touch`, `desktop-dark`, `desktop-high-contrast-light`, `desktop-high-contrast-dark`, `mobile-rtl`, `desktop-reduced-motion`).
- **Flake protocol:** full multi-project runs randomly fail 2–6 tests (30s load timeouts or mid-assertion), all pass in isolation. Before believing any failure: re-run that one test in isolation (`npx playwright test <file> -g "<exact name>"`). Never re-baseline snapshots.
- Playwright strict mode: assert multi-row/text output through a single container locator (`#toasts`, `#si-accounts-list`), never a multi-element locator.
- If the Tailwind budget test (`tests/tailwind.test.mjs`) fails, STOP and report — do not bump the ceiling without approval.
- Follow the file's existing comment style (this codebase documents blocks).

---

### Task 1: Contract test + templates + locale (markup lands, unit green)

**Files:**
- Modify: `tests/signin.test.mjs` (pane/id contract)
- Modify: `concepts/app/pages/signin/templates.html`
- Modify: `concepts/app/core/locale.js`

**Interfaces:**
- Produces (for Tasks 2–3): pane `accounts`; ids `si-accounts-h`, `si-accounts-list`, `si-accounts-other`, `si-usepin`, `si-usepin-wrap`, `si-pin-forget`, `si-pin-else`, `si-pin-someone`, `si-pin-back`; locale keys `Who’s signing in?`, `Use another account`, `Forget this account`, `Sign in as someone else`, `Use PIN instead`, `Start over`, `One more step`, `Account removed from this device.`, `Remove account` (EN→AR mapping in spec R11f).

- [ ] **Step 1: Extend the unit contract (red)**

In `tests/signin.test.mjs`:

1. In the id-contract test, extend the id array (add the eight new ids):

```js
  for (const id of ['si-tenant', 'si-to2', 'si-change', 'si-who', 'si-user', 'si-pass', 'si-show', 'si-signin', 'si-sso-ms', 'si-sso-gg', 'si-lang', 'si-ws-q', 'si-ws-go', 'si-branch-list', 'si-branch-go', 'si-pin', 'si-pin-signin', 'si-pin-who', 'si-pin-err', 'si-pin-back', 'si-pin-forget', 'si-pin-else', 'si-pin-someone', 'si-usepin', 'si-accounts-h', 'si-accounts-list', 'si-accounts-other', 'si-save-h', 'si-save-who', 'si-save-not-now', 'si-save-create', 'si-save-pin-h', 'si-save-pin', 'si-save-pin2', 'si-save-pin-err', 'si-save-back', 'si-save-go']) {
    assert.ok(template.includes(`id="${id}"`), `template owns #${id}`);
  }
```

2. In the pane-contract test, rename it and add `accounts`:

```js
test('signin: every data-si-goto target resolves to a real pane, and all thirteen panes exist', async () => {
  const template = await readFile('concepts/app/pages/signin/templates.html', 'utf8');
  const panes = [...template.matchAll(/data-si-pane="([^"]+)"/g)].map(match => match[1]);
  const gotos = [...new Set([...template.matchAll(/data-si-goto="([^"]+)"/g)].map(match => match[1]))];
  assert.equal(new Set(panes).size, panes.length, 'pane ids are unique');
  for (const pane of ['1', '2', 'branch', 'pin', 'accounts', 'save', 'savepin', 'reset', 'workspaces', 'device', 'request', 'privacy', 'support']) {
    assert.ok(panes.includes(pane), `template owns pane ${pane}`);
  }
  // `back` is the router's alias for "the auth pane the user came from";
  // every other jump must land on a pane that exists.
  for (const target of gotos) {
    if (target === 'back') continue;
    assert.ok(panes.includes(target), `goto ${target} resolves to a pane`);
  }
  assert.ok(gotos.includes('back'), 'sub-panes offer a back affordance');
});
```

- [ ] **Step 2: Run unit tests to verify they fail**

Run: `node --test tests/signin.test.mjs`
Expected: FAIL — `template owns #si-accounts-h` (and the other new ids / pane `accounts`).

- [ ] **Step 3: Add the accounts pane to the template**

In `concepts/app/pages/signin/templates.html`, insert immediately **before** the line `<!-- PIN — auto-shown by activate() when a saved credential exists. -->`:

```html
          <!-- ACCOUNTS — entry picker when 2+ saved identities exist
               (round 5). Rows are rendered by signin.js. -->
          <section class="si-step mt-6 w-full flex-col items-center [&:not([hidden])]:flex" data-si-pane="accounts" data-si-focus="#si-accounts-h" aria-labelledby="si-accounts-h" hidden>
            <h1 id="si-accounts-h" tabindex="-1" class="text-[28px] font-semibold leading-8 text-balance" data-i18n="Who’s signing in?">Who’s signing in?</h1>
            <div id="si-accounts-list" class="mt-6 grid w-full gap-2 text-start"></div>
            <button type="button" id="si-accounts-other" class="lbtn out mt-5 w-full justify-center text-sm" data-si-goto="1" data-i18n="Use another account">Use another account</button>
          </section>

```

Also update that PIN comment to: `<!-- PIN — auto-shown by activate() when the saved identity has a PIN (or picked from the accounts pane). -->`

- [ ] **Step 4: Rework the PIN pane markup**

Still in `templates.html`, inside the `data-si-pane="pin"` section:

1. After the `<p class="mt-3 w-full text-start text-sm">…Use password instead…</p>` line, insert:

```html
            <p class="mt-3 w-full text-start text-sm" id="si-pin-forget-wrap" hidden><button type="button" id="si-pin-forget" class="border-0 bg-transparent p-0 font-semibold text-danger hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]" data-i18n="Forget this account">Forget this account</button></p>
```

2. Immediately after the `<p … id="si-pin-err" role="alert"></p>` line, insert:

```html
            <p class="mt-4 hidden w-full rounded-md border border-[var(--danger-soft-line)] bg-[var(--danger-soft-bg)] px-3 py-2 text-start text-sm" id="si-pin-else">
              <button type="button" id="si-pin-someone" class="border-0 bg-transparent p-0 font-semibold text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]" data-i18n="Sign in as someone else">Sign in as someone else</button>
            </p>
```

3. Replace the pane's trailing button:

```html
            <button type="button" id="si-pin-back" class="lbtn out mt-5 w-full justify-center text-sm" data-i18n="Start over">Start over</button>
```

(was `<button type="button" class="lbtn out mt-5 w-full justify-center text-sm" data-si-goto="back" data-i18n="Back to sign in">Back to sign in</button>` — note: `data-si-goto` is **removed**; `#si-pin-back` gets an explicit handler in Task 3.)

- [ ] **Step 5: Add the "Use PIN instead" link to the credentials pane**

In the `data-si-pane="2"` section, immediately **before** the `<p class="mt-5 text-sm text-muted"><span data-i18n="Having trouble?">…` line, insert:

```html
            <p class="mt-3 w-full text-start text-sm" id="si-usepin-wrap" hidden><button type="button" id="si-usepin" class="border-0 bg-transparent p-0 font-semibold text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]" data-i18n="Use PIN instead">Use PIN instead</button></p>
```

- [ ] **Step 6: Save-step eyebrow + "Start over" label swaps**

1. In `data-si-pane="save"`, make the h1 the second element:

```html
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-accent" data-i18n="One more step">One more step</p>
            <h1 id="si-save-h" tabindex="-1" class="mt-1.5 text-[28px] font-semibold leading-8 text-balance" data-i18n="Save your sign-in?">Save your sign-in?</h1>
```

2. Branch pane trailing button (the one with `data-si-goto="1"`): change `data-i18n` and text `Back to sign in` → `Start over` (keep `data-si-goto="1"`).
3. Device pane trailing button (the one directly after `[data-si-device-ok]`): change `data-i18n` and text `Back to sign in` → `Start over` (keep `data-si-goto="back"`).
4. **Do not touch** the five `Back to sign in` buttons on reset / workspaces / request / privacy / support.

- [ ] **Step 7: Add the nine locale keys**

In `concepts/app/core/locale.js`, after the entry `'PIN created — sign in with your PIN next time.': …` block (inside the same AR object), insert:

```js
          'Who’s signing in?': 'من سيُسجِّل الدخول؟',
          'Use another account': 'استخدام حساب آخر',
          'Forget this account': 'نسيان هذا الحساب',
          'Sign in as someone else': 'تسجيل الدخول كشخص آخر',
          'Use PIN instead': 'استخدم الرمز السري بدلاً منه',
          'Start over': 'البدء من جديد',
          'One more step': 'خطوة أخيرة',
          'Account removed from this device.': 'تمت إزالة الحساب من هذا الجهاز.',
          'Remove account': 'إزالة الحساب',
```

- [ ] **Step 8: Build and run unit tests (green)**

Run: `node scripts/build.mjs && node --test tests/signin.test.mjs`
Expected: `Built dist/`, all signin.test.mjs tests PASS (120/120 overall — Task 1 adds no tests).

---

### Task 2: Playwright rewrites + six new tests (red)

**Files:**
- Modify: `tests/signin-pages.spec.mjs`

**Interfaces:**
- Consumes: Task 1 markup (`accounts` pane, `si-usepin`, `si-pin-forget`, `si-pin-else`, `si-pin-someone`).
- Produces: test names referenced in Task 4's verification list.

- [ ] **Step 1: Rewrite the device test for direct completion**

Replace the tail of the test `'device code approval signs the demo session in'` (from `await page.locator('#si-device-approve').click();` to the end) with:

```js
  await page.locator('#si-device-approve').click();
  await expect(pane(page, 'device').locator('[data-si-device-ok]')).toBeVisible();
  // Round 5: device approval completes directly — no save step.
  await expect(page.locator('.signin-view')).toBeHidden();
  await expect(page.locator('.lp-view')).toBeVisible();
});
```

- [ ] **Step 2: Move the journey test to the accounts key**

In test `'signing in offers to save credentials behind a PIN, then the PIN signs in next time'`:

1. Replace:

```js
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('skey-proto-cred')));
  expect(stored.pinHash).toBeTruthy();
  expect(stored.pin).toBeUndefined();
  expect(stored.tenant).toBe('lastchance');
  expect(stored.branch).toBe('Cairo HQ');
```

with:

```js
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('skey-proto-accounts')));
  expect(stored).toHaveLength(1);
  expect(stored[0].pinHash).toBeTruthy();
  expect(stored[0].pin).toBeUndefined();
  expect(stored[0].tenant).toBe('lastchance');
  expect(stored[0].branch).toBe('Cairo HQ');
  // The round-4 single-record key is retired — nothing migrates back.
  expect(await page.evaluate(() => localStorage.getItem('skey-proto-cred'))).toBeNull();
```

2. After the wrong-PIN assertion, add the escape-hatch assertion:

```js
  await page.locator('#si-pin').fill('654321');
  await page.locator('#si-pin-signin').click();
  await expect(page.locator('#si-pin-err')).toContainText('Incorrect PIN');
  await expect(pane(page, 'pin')).toBeVisible();
  await expect(page.locator('#si-pin-else')).toBeVisible();
```

- [ ] **Step 3: Tighten the Not-now test**

In test `'"Not now" completes sign-in without saving, and the prompt returns next visit'`, replace:

```js
  expect(await page.evaluate(() => localStorage.getItem('skey-proto-cred'))).toBeNull();
```

with:

```js
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('skey-proto-accounts') || '[]'))).toHaveLength(0);
  expect(await page.evaluate(() => localStorage.getItem('skey-proto-cred'))).toBeNull();
```

(The legacy-seed test `'password sign-in skips the save step when a saved PIN exists'` stays untouched — after Task 3 it exercises the migration path.)

- [ ] **Step 4: Add seed helpers**

After the `signOut` helper in `tests/signin-pages.spec.mjs`, add:

```js
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
```

- [ ] **Step 5: Append the six new tests**

Append to the end of `tests/signin-pages.spec.mjs`:

```js
test('two saved accounts open the picker; picking one continues to its PIN pane', async ({page}) => {
  await startSignedOut(page);
  await seedAccounts(page, [
    {tenant: 'lastchance', user: 'admin', branch: 'Cairo HQ', pinHash: djb2('123456'), savedAt: Date.now()},
    {tenant: 'lastchance', user: 'manager', branch: 'Giza', pinHash: djb2('654321'), savedAt: Date.now()},
  ]);
  await goto(page);

  await expect(pane(page, 'accounts')).toBeVisible();
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
```

- [ ] **Step 6: Run the sign-in suites to verify the predicted red**

Run: `npx playwright test tests/signin-pages.spec.mjs tests/signin-gate.spec.mjs --project=desktop`
Expected: exactly 8 failing tests in `signin-pages.spec.mjs` —
`device code approval signs the demo session in`, `signing in offers to save credentials behind a PIN, then the PIN signs in next time`, and all six new tests. Everything else (gate, not-now, legacy-seed, reset, workspaces, branch, request, privacy/support, language, orb) passes. If a different set fails, isolate each failure first (flake protocol) before reacting.

---

### Task 3: `signin.js` accounts model + flow rework (guard red → everything green)

**Files:**
- Modify: `tests/signin.test.mjs` (one new guard test)
- Modify: `concepts/app/pages/signin/signin.js`

**Interfaces:**
- Consumes: Task 1 markup/ids/locale keys; existing factory `{root, t, onSignIn, subscribe, toast}`.
- Produces: module-scope `ACCOUNTS_KEY`, `LEGACY_CRED_KEY`, `accountKey`, `saveAccounts`, `loadAccounts`, `findAccount`, `upsertAccount`, `forgetAccount`; factory-scope `currentAccount()`, `refreshWho()`, `refreshUsePin()`, `renderAccounts()`, `startOver()`.

- [ ] **Step 1: Write the failing guard test**

Append to `tests/signin.test.mjs`:

```js
test('signin: round 5 stores accounts under the list key and the single-record loader is gone', async () => {
  const signin = await readFile('concepts/app/pages/signin/signin.js', 'utf8');
  assert.ok(signin.includes("'skey-proto-accounts'"), 'signin.js owns the accounts list key');
  assert.ok(!signin.includes('loadCred'), 'the single-record loader is gone');
});
```

Run: `node --test tests/signin.test.mjs`
Expected: FAIL — `signin.js owns the accounts list key`.

- [ ] **Step 2: Replace the header comment and storage model**

In `concepts/app/pages/signin/signin.js`:

1. Replace the file's opening comment block (the eleven lines from `// Sign-in page (Slack-style minimal concept, promoted into the app).` through `// ...A saved credential short-circuits the view to the PIN pane.`) with:

```js
// Sign-in page (Slack-style minimal concept, promoted into the app).
// A thirteen-pane router inside one card — tenant (1), credentials (2),
// branch, pin, accounts (2+ saved identities), save, savepin, then the
// six demo sub-pages (reset / workspaces / device / request / privacy /
// support) reached through data-si-goto — rendered from
// pages/signin/templates.html. No local imports: everything arrives via
// the factory (same packages the other pages receive), so this module
// cannot introduce an import cycle.
//
// Demo auth only: admin / skey123 signs in through onSignIn() (main.js
// flips the session control and navigates back); SSO buttons explain
// they are disabled in the prototype. Password auth parks on the save
// step only for identities with no saved PIN; device approval completes
// directly. Saved identities live in the accounts list — one saved
// account short-circuits the view to its PIN pane, two or more open the
// picker.
```

2. Replace the `CRED_KEY` block:

```js
/* localStorage: saved accounts under `skey-proto-accounts` —
   [{tenant, user, branch, pinHash, savedAt}, ...] — written by this
   module's save step; main.js never touches it. The pre-round-5
   single-record key is migrated on first load and always deleted, so
   forgetting the last account can never resurrect it. */
const ACCOUNTS_KEY = 'skey-proto-accounts'
const LEGACY_CRED_KEY = 'skey-proto-cred'

const accountKey = (tenantName, userName) =>
  `${String(tenantName || '').trim().toLowerCase()}|${String(userName || '').trim().toLowerCase()}`

function saveAccounts(list) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list))
  localStorage.removeItem(LEGACY_CRED_KEY)
}

function loadAccounts() {
  let list = []
  try {
    list = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]')
  } catch {
    list = []
  }
  list = list.filter(record => record && record.pinHash)
  let legacy = null
  try {
    const raw = localStorage.getItem(LEGACY_CRED_KEY)
    legacy = raw ? JSON.parse(raw) : null
  } catch {
    legacy = null
  }
  if (legacy) {
    if (!list.length && legacy.pinHash) {
      list = [legacy]
      saveAccounts(list)
    } else {
      localStorage.removeItem(LEGACY_CRED_KEY)
    }
  }
  return list
}

function findAccount(tenantName, userName) {
  const key = accountKey(tenantName, userName)
  return loadAccounts().find(record => accountKey(record.tenant, record.user) === key) || null
}

function upsertAccount(record) {
  const key = accountKey(record.tenant, record.user)
  const list = loadAccounts()
  const at = list.findIndex(existing => accountKey(existing.tenant, existing.user) === key)
  if (at >= 0) list[at] = record
  else list.push(record)
  saveAccounts(list)
}

function forgetAccount(tenantName, userName) {
  const key = accountKey(tenantName, userName)
  saveAccounts(loadAccounts().filter(record => accountKey(record.tenant, record.user) !== key))
}
```

(was the `/* localStorage key for the saved credential record … */ const CRED_KEY = 'skey-proto-cred'` block).

3. Delete the whole `function loadCred() { … }`.

- [ ] **Step 3: Add factory helpers**

After `const wsQuery = () => $('#si-ws-q')` add:

```js
  /* The saved account this attempt is authenticating right now — derived
     from the tenant/user fields, which every route into the PIN pane
     syncs first (activate, picker pick, Use PIN instead). */
  const currentAccount = () => findAccount(tenant().value, user().value)

  function refreshWho() {
    const base = `${tenant().value.trim() || '—'}.skeyerp.com`
    const who = user().value.trim()
    const suffix = branch ? ` · ${branch}` : ''
    $('#si-who').textContent = who ? `${who} · ${base}${suffix}` : `${base}${suffix}`
  }

  function refreshUsePin() {
    $('#si-usepin-wrap').hidden = !currentAccount()?.pinHash
  }

  /* Where "start over" lands: the picker when 2+ accounts are saved,
     otherwise the tenant step (round-5 entry rules). */
  const startOver = () => show(loadAccounts().length >= 2 ? 'accounts' : 1)
```

- [ ] **Step 4: Update `show()`**

1. Replace:

```js
    if (id === '2') {
      const base = `${tenant().value.trim() || '—'}.skeyerp.com`
      $('#si-who').textContent = branch ? `${base} · ${branch}` : base
    }
```

with:

```js
    if (id === '2') {
      refreshWho()
      refreshUsePin()
    }
    if (id === 'accounts') renderAccounts()
```

2. Replace the whole `if (id === 'pin') { … }` block with:

```js
    if (id === 'pin') {
      const record = currentAccount()
      pinInput().value = ''
      pinInput().removeAttribute('aria-invalid')
      pinErr().classList.add('hidden')
      pinErr().textContent = ''
      $('#si-pin-else').classList.add('hidden')
      pinSigninBtn().textContent = t('Sign in with PIN')
      $('#si-pin-forget-wrap').hidden = !record
      if (record) {
        $('#si-pin-who').textContent = record.branch
          ? `${record.user} · ${record.branch} · ${record.tenant}.skeyerp.com`
          : `${record.user} · ${record.tenant}.skeyerp.com`
      } else {
        $('#si-pin-who').textContent = `${user().value.trim() || 'admin'} · ${tenant().value.trim() || '—'}.skeyerp.com`
      }
    }
```

- [ ] **Step 5: Add `renderAccounts()` next to `renderBranches()`**

```js
  /* Picker rows for 2+ saved accounts: the row picks (fields sync, PIN
     pane), the × forgets just that record. Rendered with t() because
     dynamic strings own no data-i18n. */
  function renderAccounts() {
    const accounts = loadAccounts()
    $('#si-accounts-list').innerHTML = accounts
      .map((record, index) => {
        const host = `${record.tenant}.skeyerp.com`
        const initial = (record.user || '?').trim().charAt(0).toUpperCase()
        return `
          <div class="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 hover:border-[var(--accent-line)] focus-within:[box-shadow:0_0_0_3px_var(--accent-soft)]">
            <button type="button" class="flex min-w-0 flex-1 items-start gap-3 border-0 bg-transparent p-0 text-start" data-si-pick="${index}">
              <span class="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--line-2)] text-sm font-semibold text-ink" aria-hidden="true">${initial}</span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-semibold text-ink" dir="ltr">${record.user} · ${host}</span>
                <span class="block truncate text-xs text-muted" dir="ltr">${record.branch || host}</span>
              </span>
            </button>
            <button type="button" class="size-8 shrink-0 rounded-md border border-line bg-surface text-sm font-semibold text-danger hover:border-[var(--accent-line)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]" data-si-remove="${index}" aria-label="${t('Remove account')}" title="${t('Remove account')}">&times;</button>
          </div>`
      })
      .join('')
  }
```

- [ ] **Step 6: Update `complete()` comment, `postAuth()`, and `retranslate()`**

1. Replace the `complete()` doc comment's second half — from `Password and device auth route through postAuth() first,` … `answered. */` — with:

```js
     toggle). Password auth routes through postAuth() first, which parks
     on the save step only when the signing-in identity has no saved
     PIN; device approval completes directly (round 5). */
```

2. Replace:

```js
  function postAuth() {
    if (loadCred()) complete()
    else show('save')
  }
```

with:

```js
  function postAuth() {
    if (currentAccount()?.pinHash) complete()
    else show('save')
  }
```

3. In `retranslate()`, after `hideError()` add:

```js
    if (panes().find(pane => !pane.hidden)?.dataset.siPane === 'accounts') renderAccounts()
```

- [ ] **Step 7: bind() — picker, PIN, credentials, save, device**

1. After the branch-step listeners (`$('#si-branch-go')…`), add the picker listener:

```js
    /* ACCOUNTS PICKER — delegated: the row picks (fields sync, PIN
       pane), the × forgets that record only; the last removal falls
       back to the tenant step. */
    $('#si-accounts-list').addEventListener('click', event => {
      const remove = event.target.closest('[data-si-remove]')
      if (remove) {
        const record = loadAccounts()[Number(remove.dataset.siRemove)]
        if (record) forgetAccount(record.tenant, record.user)
        toast?.({tone: 'info', title: t('Account removed from this device.')})
        if (!loadAccounts().length) {
          show(1)
          return
        }
        renderAccounts()
        return
      }
      const pick = event.target.closest('[data-si-pick]')
      if (!pick) return
      const record = loadAccounts()[Number(pick.dataset.siPick)]
      if (!record) return
      tenant().value = record.tenant
      user().value = record.user
      branch = record.branch || null
      show('pin')
    })
```

2. Replace the whole `const pinSubmit = () => { … }` (through the closing `}` before `pinSigninBtn().addEventListener`) with:

```js
    /* PIN — the saved-account path: 800ms demo latency, digest check
       against the current account's record, then the same onSignIn()
       as password. */
    const pinSubmit = () => {
      const record = currentAccount()
      if (!record) {
        show(1)
        return
      }
      pinErr().classList.add('hidden')
      pinErr().textContent = ''
      $('#si-pin-else').classList.add('hidden')
      pinInput().removeAttribute('aria-invalid')
      pinSigninBtn().disabled = true
      setTimeout(() => {
        pinSigninBtn().disabled = false
        const pin = pinInput().value
        if (/^\d{6}$/.test(pin) && hashPin(pin) === record.pinHash) {
          pinSigninBtn().textContent = `✓ ${t('Sign in with PIN')}`
          setTimeout(() => {
            pinSigninBtn().textContent = t('Sign in with PIN')
            tenant().value = record.tenant
            user().value = record.user
            branch = record.branch || null
            complete()
          }, 350)
        } else {
          pinInput().setAttribute('aria-invalid', 'true')
          pinErr().textContent = t('Incorrect PIN — try again, or use your password.')
          pinErr().classList.remove('hidden')
          $('#si-pin-else').classList.remove('hidden')
          pinInput().focus()
        }
      }, 800)
    }
```

3. Extend the `pinInput().addEventListener('input', …)` body with one line:

```js
    pinInput().addEventListener('input', () => {
      pinInput().removeAttribute('aria-invalid')
      pinErr().classList.add('hidden')
      $('#si-pin-else').classList.add('hidden')
    })
```

4. Right after that input listener, add:

```js
    $('#si-pin-back').addEventListener('click', startOver)
    $('#si-pin-forget').addEventListener('click', () => {
      const record = currentAccount()
      if (!record) return
      forgetAccount(record.tenant, record.user)
      toast?.({tone: 'info', title: t('Account removed from this device.')})
      show(loadAccounts().length ? 'accounts' : 1)
    })
    $('#si-pin-someone').addEventListener('click', () => {
      pinErr().classList.add('hidden')
      pinErr().textContent = ''
      $('#si-pin-else').classList.add('hidden')
      pinInput().value = ''
      pinInput().removeAttribute('aria-invalid')
      startOver()
    })
    $('#si-usepin').addEventListener('click', () => {
      if (!currentAccount()?.pinHash) return
      show('pin')
    })
    user().addEventListener('input', () => {
      refreshWho()
      refreshUsePin()
    })
```

5. In the save handler, replace `localStorage.setItem(CRED_KEY, JSON.stringify({…}))` (the whole call, including its object literal) with:

```js
      upsertAccount({
        tenant: tenant().value.trim() || 'lastchance',
        user: user().value.trim() || 'admin',
        branch,
        pinHash: hashPin(pin.value),
        savedAt: Date.now(),
      })
```

6. In the device handler, replace `postAuth()` inside its `setTimeout` with `complete()`; update the device comment to: `/* DEVICE CODE — "Simulate approval" completes the demo handshake directly (round 5 skips the save step). */`

- [ ] **Step 8: Rewrite `activate()`**

Replace:

```js
    /* A saved credential opens the view on the PIN pane (prefilled from
       the record); escaping to another pane never bounces back — only
       the next activation re-offers the PIN. */
    const cred = loadCred()
    if (cred) {
      tenant().value = cred.tenant
      user().value = cred.user
      branch = cred.branch || null
      lastAuthPane = '1'
      show('pin')
      return
    }
    show(1)
```

with:

```js
    /* Round-5 entry rules: one saved account opens on its PIN pane
       (prefilled), 2+ open the picker, none fall through to the tenant
       step; escaping to another pane never bounces back — only the next
       activation re-offers. */
    const accounts = loadAccounts()
    if (accounts.length === 1) {
      tenant().value = accounts[0].tenant
      user().value = accounts[0].user
      branch = accounts[0].branch || null
      lastAuthPane = '1'
      show('pin')
      return
    }
    if (accounts.length >= 2) {
      lastAuthPane = '1'
      show('accounts')
      return
    }
    show(1)
```

- [ ] **Step 9: Build + unit (green)**

Run: `node scripts/build.mjs && node --test tests/signin.test.mjs`
Expected: `Built dist/`, all pass — overall **121/121** (120 + the Step-1 guard).

- [ ] **Step 10: Sign-in suites, desktop (green)**

Run: `npx playwright test tests/signin-pages.spec.mjs tests/signin-gate.spec.mjs --project=desktop`
Expected: all pass (19 pages + 7 gate). Any failure → isolate it (`-g "<name>"`) before concluding it's real.

---

### Task 4: Verification + spec status

**Files:**
- Modify: `docs/superpowers/specs/2026-10-05-signin-pages-design.md` (R11 Status line only)

- [ ] **Step 1: Full unit suite**

Run: `node --test tests/*.test.mjs`
Expected: all pass (121/121 incl. the Tailwind budget test). If the budget test fails → stop, report, do not touch the ceiling.

- [ ] **Step 2: Sign-in suites × 7 projects with flake protocol**

Run: `npx playwright test tests/signin-pages.spec.mjs tests/signin-gate.spec.mjs`
Expected: ~185+ passing with 0–6 random failures. For every failing test: re-run in isolation (`npx playwright test <file> -g "<exact name>"`) — a pass there = flake, done; a repeat failure = real bug → fix and re-verify from Step 1.

- [ ] **Step 3: impeccable detect**

Run: `node /Users/majedsiefalnasr/.agents/skills/impeccable/scripts/impeccable detect --json concepts/app/pages/signin/templates.html concepts/app/pages/signin/signin.js concepts/app/core/locale.js`
Expected: `[]` (any finding: fix or justify inline; pre-existing `shell.css` gradient-text is out of scope).

- [ ] **Step 4: Update spec status**

In `docs/superpowers/specs/2026-10-05-signin-pages-design.md`, change the Round 5 `**Status:**` line to `**Status:** Implemented + verified`.

- [ ] **Step 5: Review the working tree (NO COMMIT)**

Run: `git status --short`
Expected: modified `signin.js`, `templates.html`, `locale.js`, `signin.test.mjs`, `signin-pages.spec.mjs`, the spec/plan docs; **do not commit anything** (user standing rule).
