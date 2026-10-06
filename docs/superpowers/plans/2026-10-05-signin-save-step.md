# Save-PIN Step Inside the Sign-in Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the "Save your sign-in? / Create PIN" journey out of the post-sign-in dialog and into the sign-in card as two panes that defer the session until answered.

**Architecture:** `templates.html` gains `save` and `savepin` panes (round-2 copy, one new locale key). `signin.js` owns the whole save logic — a shared `complete()` is the single exit every auth path uses; password/device paths route through `postAuth()`, which parks on the save step when no saved PIN exists. `main.js` loses the `sp-*` dialog block entirely, and `save-pin-dialog.html` is deleted.

**Tech Stack:** vanilla ESM, Tailwind CLI build (`node scripts/build.mjs`), `node --test` contract tests, Playwright behavior tests (7 projects, no retries).

## Global Constraints

- **NEVER run `git commit` (or any git write).** The user commits manually — this is a standing project rule that overrides any per-step commit instruction.
- Demo credentials: `admin` / `skey123`; demo tenant `lastchance` (has branches Cairo HQ / Alexandria / Giza), `acme` (no branches).
- Build: `node scripts/build.mjs` → prints `Built dist/`. Playwright serves `dist/` at `http://127.0.0.1:4173` (dev server already running).
- Unit tests: `node --test tests/*.test.mjs` (currently 119 passing — must stay all-green).
- Sign-in Playwright specs: `npx playwright test tests/signin-pages.spec.mjs tests/signin-gate.spec.mjs --reporter=list`.
- localStorage credential key `skey-proto-cred` stores `{tenant, user, branch, pinHash, savedAt}` — never the raw PIN.
- Session deferral rule: nothing flips the `signed-in` toggle (and `.signin-view` stays up, body keeps `signed-out`) until **Not now** or **Save PIN** runs.
- impeccable gate: `/Users/majedsiefalnasr/.agents/skills/impeccable/scripts/impeccable detect --json <changed files>` must return `[]` (or only pre-existing findings not introduced by this change).
- No new dependencies, no comments beyond the ones shown, follow existing `si-*` id and `lbtn pri/out` button conventions.

---

### Task 1: Contract test + save panes markup + locale key

**Files:**
- Modify: `tests/signin.test.mjs` (pane/id contract test)
- Modify: `concepts/app/pages/signin/templates.html` (two new panes + header comment)
- Modify: `concepts/app/core/locale.js` (one new AR key, ~line 375)

**Interfaces:**
- Produces: panes `data-si-pane="save"` and `data-si-pane="savepin"`; ids `si-save-h`, `si-save-who`, `si-save-not-now`, `si-save-create`, `si-save-pin-h`, `si-save-pin`, `si-save-pin2`, `si-save-pin-err`, `si-save-back`, `si-save-go`. Task 3 wires behavior to exactly these; Task 2's Playwright tests locate exactly these.

- [ ] **Step 1: Extend the contract test (expect red)**

In `tests/signin.test.mjs`, in the id-contract test, extend the id list — replace:

```js
  for (const id of ['si-tenant', 'si-to2', 'si-change', 'si-who', 'si-user', 'si-pass', 'si-show', 'si-signin', 'si-sso-ms', 'si-sso-gg', 'si-lang', 'si-ws-q', 'si-ws-go', 'si-branch-list', 'si-branch-go', 'si-pin', 'si-pin-signin', 'si-pin-who', 'si-pin-err']) {
```

with:

```js
  for (const id of ['si-tenant', 'si-to2', 'si-change', 'si-who', 'si-user', 'si-pass', 'si-show', 'si-signin', 'si-sso-ms', 'si-sso-gg', 'si-lang', 'si-ws-q', 'si-ws-go', 'si-branch-list', 'si-branch-go', 'si-pin', 'si-pin-signin', 'si-pin-who', 'si-pin-err', 'si-save-h', 'si-save-who', 'si-save-not-now', 'si-save-create', 'si-save-pin-h', 'si-save-pin', 'si-save-pin2', 'si-save-pin-err', 'si-save-back', 'si-save-go']) {
```

In the pane test, rename the title `'signin: every data-si-goto target resolves to a real pane, and all ten panes exist'` → `'signin: every data-si-goto target resolves to a real pane, and all twelve panes exist'`, and replace the pane list:

```js
  for (const pane of ['1', '2', 'branch', 'pin', 'reset', 'workspaces', 'device', 'request', 'privacy', 'support']) {
```

with:

```js
  for (const pane of ['1', '2', 'branch', 'pin', 'save', 'savepin', 'reset', 'workspaces', 'device', 'request', 'privacy', 'support']) {
```

- [ ] **Step 2: Run unit tests, expect FAIL**

Run: `node --test tests/*.test.mjs`
Expected: FAIL — `template owns #si-save-h` (and the `template owns pane save` assertion).

- [ ] **Step 3: Add the two panes to templates.html**

In `concepts/app/pages/signin/templates.html`, update the header comment: replace `a ten-pane router inside the card — tenant (1),` with `a twelve-pane router inside the card — tenant (1),` and replace the following two lines

```
    credentials (2), branch, pin, then reset / workspaces / device /
    request / privacy / support reached through data-si-goto. ADS-aligned:
```

with

```
    credentials (2), branch, pin, save, savepin, then reset / workspaces /
    device / request / privacy / support reached through data-si-goto. ADS-aligned:
```

Insert these two panes immediately **before** the device pane (`<section class="si-step mt-6 w-full flex-col items-center [&:not([hidden])]:flex" data-si-pane="device"`):

```html
          <!-- SAVE CREDENTIALS — post-auth step inside the card. The
               session stays signed out until Not now or Save PIN. -->
          <section class="si-step mt-6 w-full flex-col items-center [&:not([hidden])]:flex" data-si-pane="save" data-si-focus="#si-save-h" aria-labelledby="si-save-h" hidden>
            <h1 id="si-save-h" tabindex="-1" class="text-[28px] font-semibold leading-8 text-balance" data-i18n="Save your sign-in?">Save your sign-in?</h1>
            <div class="mt-5 w-full rounded-md border border-line bg-surface px-3.5 py-3 text-start">
              <p class="text-xs text-muted" data-i18n="Signing in as">Signing in as</p>
              <p class="mt-1 text-sm font-semibold text-ink"><span dir="ltr" id="si-save-who">admin · lastchance.skeyerp.com</span></p>
            </div>
            <p class="mt-4 w-full text-start text-sm text-muted" data-i18n="Save this sign-in and next time a 6-digit PIN replaces your password on this device.">Save this sign-in and next time a 6-digit PIN replaces your password on this device.</p>
            <button type="button" id="si-save-create" class="lbtn pri mt-5 w-full justify-center text-sm" data-si-goto="savepin" data-i18n="Create PIN">Create PIN</button>
            <button type="button" id="si-save-not-now" class="lbtn out mt-3 w-full justify-center text-sm" data-i18n="Not now">Not now</button>
          </section>

          <!-- CREATE PIN -->
          <section class="si-step mt-6 w-full flex-col items-center [&:not([hidden])]:flex" data-si-pane="savepin" data-si-focus="#si-save-pin" aria-labelledby="si-save-pin-h" hidden>
            <h1 id="si-save-pin-h" tabindex="-1" class="text-[28px] font-semibold leading-8 text-balance" data-i18n="Create your PIN">Create your PIN</h1>
            <div class="mt-5 w-full text-start">
              <label for="si-save-pin" class="block text-xs font-medium text-muted" data-i18n="PIN">PIN</label>
              <input
                id="si-save-pin" type="password" inputmode="numeric" autocomplete="new-password" maxlength="6" dir="ltr"
                class="mt-1.5 w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink outline-none hover:border-[var(--accent-line)] focus:border-[var(--accent-line)] focus:[box-shadow:0_0_0_3px_var(--accent-soft)] aria-[invalid=true]:border-danger" />
            </div>
            <div class="mt-3.5 w-full text-start">
              <label for="si-save-pin2" class="block text-xs font-medium text-muted" data-i18n="Confirm PIN">Confirm PIN</label>
              <input
                id="si-save-pin2" type="password" inputmode="numeric" autocomplete="new-password" maxlength="6" dir="ltr"
                class="mt-1.5 w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-ink outline-none hover:border-[var(--accent-line)] focus:border-[var(--accent-line)] focus:[box-shadow:0_0_0_3px_var(--accent-soft)] aria-[invalid=true]:border-danger" />
            </div>
            <p class="mt-3 hidden w-full rounded-md border border-[var(--danger-soft-line)] bg-[var(--danger-soft-bg)] px-3 py-2 text-start text-sm text-danger" id="si-save-pin-err" role="alert"></p>
            <p class="mt-3 w-full text-start text-xs text-muted" data-i18n="Six digits — you will use it instead of your password next time.">Six digits — you will use it instead of your password next time.</p>
            <button type="button" id="si-save-go" class="lbtn pri mt-5 w-full justify-center text-sm" data-i18n="Save PIN">Save PIN</button>
            <button type="button" id="si-save-back" class="lbtn out mt-3 w-full justify-center text-sm" data-si-goto="save" data-i18n="Back">Back</button>
          </section>
```

- [ ] **Step 4: Add the one new locale key**

In `concepts/app/core/locale.js`, in the Arabic block directly after `'Create PIN': 'إنشاء رمز سري',`, add:

```js
          'Create your PIN': 'أنشئ رمزك السري',
```

(All other copy — "Save your sign-in?", "Not now", "Save PIN", the body strings, both error strings, "PIN created…" — already exists from round 2. English/fallback languages render the key itself.)

- [ ] **Step 5: Build and run unit tests, expect PASS**

Run: `node scripts/build.mjs` (expect `Built dist/`), then `node --test tests/*.test.mjs` → all pass (119).

---

### Task 2: Rewrite the Playwright tests (red until Task 3)

**Files:**
- Modify: `tests/signin-gate.spec.mjs` (`signIn` helper, lines ~44-57)
- Modify: `tests/signin-pages.spec.mjs` (header comment, device test, save journey, not-now test, one new test)

**Interfaces:**
- Consumes: Task 1's pane ids; Task 3's `complete()`/`postAuth()` behavior (deferral until `#si-save-not-now` or `#si-save-go`).
- Produces: the behavioral contract Task 3 must satisfy.

- [ ] **Step 1: Gate helper answers the save step**

In `tests/signin-gate.spec.mjs`, replace the `signIn` function:

```js
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
```

Also update the comment above it (the paragraph ending `the gate only cares about reaching step 2.`) by appending: ` With fresh state the card then parks on the save step; the helper answers "Not now".`

- [ ] **Step 2: signin-pages — header comment**

In `tests/signin-pages.spec.mjs`, in the file header, replace

```
// branch step, the saved-credential PIN pane, the post-sign-in
// save-credentials dialog, the viewport-filling orb background, and the
```

with

```
// branch step, the saved-credential PIN pane, the in-card
// save-credentials step (deferred session), the viewport-filling orb
// background, and the
```

- [ ] **Step 3: signin-pages — device test parks on the save step**

Replace in the device test:

```js
  await page.locator('#si-device-approve').click();
  await expect(pane(page, 'device').locator('[data-si-device-ok]')).toBeVisible();
  await expect(page.locator('.signin-view')).toBeHidden();
  await expect(page.locator('.lp-view')).toBeVisible();
```

with:

```js
  await page.locator('#si-device-approve').click();
  await expect(pane(page, 'device').locator('[data-si-device-ok]')).toBeVisible();
  // Fresh state: approval defers the session to the save step in the card.
  await expect(pane(page, 'save')).toBeVisible();
  await expect(page.locator('body')).toHaveClass(/signed-out/);
  await page.locator('#si-save-not-now').click();
  await expect(page.locator('.signin-view')).toBeHidden();
  await expect(page.locator('.lp-view')).toBeVisible();
```

- [ ] **Step 4: signin-pages — rewrite the journey test**

Replace the whole test `test('signing in offers to save credentials behind a PIN, then the PIN signs in next time', ...)` (starts ~line 309) with:

```js
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
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('skey-proto-cred')));
  expect(stored.pinHash).toBeTruthy();
  expect(stored.pin).toBeUndefined();
  expect(stored.tenant).toBe('lastchance');
  expect(stored.branch).toBe('Cairo HQ');

  // Next visit: the view opens on the PIN pane, prefilled from the record.
  await signOut(page);
  await expect(pane(page, 'pin')).toBeVisible();
  await expect(page.locator('#si-pin-who')).toContainText('admin');

  await page.locator('#si-pin').fill('654321');
  await page.locator('#si-pin-signin').click();
  await expect(page.locator('#si-pin-err')).toContainText('Incorrect PIN');
  await expect(pane(page, 'pin')).toBeVisible();

  await page.locator('#si-pin').fill('123456');
  await page.locator('#si-pin-signin').click();
  await expect(page.locator('.signin-view')).toBeHidden();
  // Saved credentials exist, so the save step never reappears.
  await expect(pane(page, 'save')).toBeHidden();
  // The saved branch is applied to the shell's branch menu.
  await expect(page.locator('.branch-submenu [data-branch="Cairo HQ"]')).toHaveAttribute('aria-checked', 'true');
});
```

- [ ] **Step 5: signin-pages — rewrite the not-now test**

Replace the whole test `test('"Not now" dismisses the save prompt only for the current visit', ...)` (starts ~line 366) with:

```js
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
```

- [ ] **Step 6: signin-pages — new password-with-existing-PIN test**

Append after the not-now test:

```js
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
```

- [ ] **Step 7: Run the sign-in suites, expect FAIL (logic not yet written)**

Run: `npx playwright test tests/signin-pages.spec.mjs tests/signin-gate.spec.mjs --reporter=list`
Expected: the save-step tests FAIL (old code still signs in directly and opens the dialog), everything else unchanged. This is the intended red state.

---

### Task 3: Save logic in signin.js, shrink main.js

**Files:**
- Modify: `concepts/app/pages/signin/signin.js` (top comment, `complete()`/`postAuth()`, three auth paths, `show()` branches, save handlers, factory signature, drop `getState`)
- Modify: `concepts/app/main.js` (delete the save-dialog block, shrink import, pass `toast` into `createSignIn`)

**Interfaces:**
- Consumes: Task 1's ids/panes; `t`, `onSignIn` (existing factory args); `toast` (new factory arg from main.js).
- Produces: `complete()` → `applyBranch()` + `onSignIn()`; `postAuth()` → `complete()` when `loadCred()` else `show('save')`; main.js `onSignIn` = toast + toggle flip only. Task 4 deletes the now-orphaned dialog.

- [ ] **Step 1: Update signin.js header comment**

Replace the first comment block's second half — from `A ten-pane router inside one card` through the `A saved credential (created by main.js's post-sign-in dialog) short-circuits the view to the PIN pane.` lines — with:

```
// A twelve-pane router inside one card — tenant (1), credentials (2),
// branch, pin, save, savepin, then the six demo sub-pages (reset /
// workspaces / device / request / privacy / support) reached through
// data-si-goto — rendered from pages/signin/templates.html. No local
// imports: everything arrives via the factory (same packages the other
// pages receive), so this module cannot introduce an import cycle.
//
// Demo auth only: admin / skey123 signs in through onSignIn() (main.js
// flips the session control and navigates back); SSO buttons explain
// they are disabled in the prototype. Password and device auth park on
// the save panes when no PIN exists — the session only completes via
// complete(). A saved credential short-circuits the view to the PIN pane.
```

Also replace the `CRED_KEY` comment and declaration (the original reads `— shared with main.js, which writes it from the save dialog; this module only ever reads it.` followed by `export const CRED_KEY = 'skey-proto-cred'`) with:

```
/* localStorage key for the saved credential record
   {tenant, user, pinHash, branch, savedAt} — written by this module's
   save panes; main.js never touches it. */
const CRED_KEY = 'skey-proto-cred'
```

(the `export` goes away with it — after Step 7 nothing outside this module imports it).

And make `hashPin` module-private (main.js's import is removed in Step 7, so nothing external consumes it anymore) — replace:

```js
/* Prototype-only PIN digest (djb2) — keeps the raw PIN out of the stored
   record without pretending to be real security for a 6-digit demo code.
   Exported for main.js's save dialog so create and verify share one hash. */
export function hashPin(pin) {
```

with:

```js
/* Prototype-only PIN digest (djb2) — keeps the raw PIN out of the stored
   record without pretending to be real security for a 6-digit demo code.
   One digest for both the save panes' create and the PIN pane's verify. */
function hashPin(pin) {
```

- [ ] **Step 2: Factory signature + completion helpers**

Change the factory signature:

```js
export function createSignIn({root, t, onSignIn, subscribe, toast} = {}) {
```

After the `applyBranch()` function, add:

```js
  /* The single completion point every auth path shares: publish the
     branch to the shell, then let main.js flip the session (toast +
     toggle). Password and device auth route through postAuth() first,
     which parks on the save step while no PIN exists — the session
     stays signed out until that step is answered. */
  function complete() {
    applyBranch()
    onSignIn?.()
  }
  function postAuth() {
    if (loadCred()) complete()
    else show('save')
  }
```

- [ ] **Step 3: Route the three auth paths**

Password success — in the `signinBtn` click handler replace:

```js
          setTimeout(() => {
            defaultSigninLabel()
            applyBranch()
            onSignIn?.()
          }, 350)
```

with:

```js
          setTimeout(() => {
            defaultSigninLabel()
            postAuth()
          }, 350)
```

PIN success — in `pinSubmit` replace:

```js
            applyBranch()
            onSignIn?.()
```

with:

```js
            complete()
```

Device approval — replace:

```js
        applyBranch()
        onSignIn?.()
```

with:

```js
        postAuth()
```

- [ ] **Step 4: `show()` branches for the two panes**

In `show()`, after the existing `if (id === 'pin') {...}` block, add:

```js
    if (id === 'save') {
      $('#si-save-who').textContent = `${user().value.trim() || 'admin'} · ${tenant().value.trim() || 'lastchance'}.skeyerp.com`
    }
    if (id === 'savepin') {
      const pin1 = $('#si-save-pin')
      const pin2 = $('#si-save-pin2')
      const err = $('#si-save-pin-err')
      pin1.value = ''
      pin2.value = ''
      pin1.removeAttribute('aria-invalid')
      pin2.removeAttribute('aria-invalid')
      err.classList.add('hidden')
      err.textContent = ''
    }
```

- [ ] **Step 5: Save-pane handlers in `bind()`**

In `bind()`, after the PIN input's `input` listener block, add:

```js
    /* SAVE STEP — Not now completes the visit without writing anything;
       Save PIN validates, stores the digest, toasts, and completes.
       Same validations and error strings the removed dialog used. */
    const saveGo = $('#si-save-go')
    const saveSubmit = () => {
      const pin = $('#si-save-pin')
      const pin2 = $('#si-save-pin2')
      const err = $('#si-save-pin-err')
      err.classList.add('hidden')
      err.textContent = ''
      pin.removeAttribute('aria-invalid')
      pin2.removeAttribute('aria-invalid')
      if (!/^\d{6}$/.test(pin.value)) {
        pin.setAttribute('aria-invalid', 'true')
        err.textContent = t('PIN must be exactly 6 digits.')
        err.classList.remove('hidden')
        pin.focus()
        return
      }
      if (pin.value !== pin2.value) {
        pin2.setAttribute('aria-invalid', 'true')
        err.textContent = t('PINs do not match.')
        err.classList.remove('hidden')
        pin2.focus()
        return
      }
      localStorage.setItem(
        CRED_KEY,
        JSON.stringify({
          tenant: tenant().value.trim() || 'lastchance',
          user: user().value.trim() || 'admin',
          branch,
          pinHash: hashPin(pin.value),
          savedAt: Date.now(),
        })
      )
      toast?.({tone: 'ok', title: t('PIN created — sign in with your PIN next time.')})
      complete()
    }
    $('#si-save-not-now').addEventListener('click', () => complete())
    saveGo.addEventListener('click', saveSubmit)
    for (const input of [$('#si-save-pin'), $('#si-save-pin2')]) {
      input.addEventListener('input', () => {
        input.removeAttribute('aria-invalid')
        $('#si-save-pin-err').classList.add('hidden')
      })
      input.addEventListener('keydown', event => {
        if (event.key !== 'Enter') return
        event.preventDefault()
        saveSubmit()
      })
    }
```

- [ ] **Step 6: Drop the now-unused `getState`**

Replace the return block's tail:

```js
    dispose,
    /* Who just signed in — main.js's save dialog persists this with the
       PIN digest. */
    getState: () => ({
      tenant: tenant().value.trim() || 'lastchance',
      user: user().value.trim() || 'admin',
      branch,
    }),
  }
```

with:

```js
    dispose,
  }
```

(`rg "signin.getState" concepts/ tests/` must come back empty afterwards — its only consumer was the deleted dialog block.)

- [ ] **Step 7: main.js — shrink the import, delete the dialog block, pass `toast`**

1. Line 26: replace `import {createSignIn, hashPin, CRED_KEY} from './pages/signin/signin.js'` with `import {createSignIn} from './pages/signin/signin.js'`.
2. Delete the whole save-dialog block: from the comment `/* Post-sign-in: offer to save the credential behind a 6-digit PIN. One` through the standalone `wireSavePin()` call (ends around line 746, immediately above the `/* Sign-in view (Slack-style minimal concept)...` comment).
3. In the `createSignIn({...})` call, add `toast,` as a parameter:

```js
const signin = createSignIn({
  root: document.querySelector('.signin-view'),
  t,
  toast,
  onSignIn: () => {
    toast({tone: 'ok', title: t('Signed in')})
    const toggle = document.getElementById('signed-in')
    if (toggle) {
      toggle.checked = true
      toggle.dispatchEvent(new Event('change', {bubbles: true}))
    }
  },
  subscribe: callback => locale.subscribe(callback),
});
```

- [ ] **Step 8: Build, unit, then the sign-in suites — expect ALL PASS**

Run: `node scripts/build.mjs` (expect `Built dist/`), then `node --test tests/*.test.mjs` (all pass), then `npx playwright test tests/signin-pages.spec.mjs tests/signin-gate.spec.mjs --reporter=list` (all pass — Tasks 1–2's contract and behavior now hold). If any failure, fix the source (never the tests) and rerun.

---

### Task 4: Delete the dialog + regression guards

**Files:**
- Modify: `tests/signin.test.mjs` (new guard test)
- Modify: `concepts/app/shell/shell.html:244` (remove include line)
- Delete: `concepts/app/shell/save-pin-dialog.html`

**Interfaces:**
- Consumes: Task 3's removal of every `sp-*` consumer in `main.js`.

- [ ] **Step 1: Add the guard test (expect red)**

Append to `tests/signin.test.mjs`:

```js
test('signin: the post-sign-in save dialog is gone — the flow lives in the card', async () => {
  const template = await readFile('concepts/app/pages/signin/templates.html', 'utf8');
  const shell = await readFile('concepts/app/shell/shell.html', 'utf8');
  const main = await readFile('concepts/app/main.js', 'utf8');
  assert.ok(!template.includes('id="sp-'), 'no sp-* ids remain in the sign-in template');
  assert.ok(!shell.includes('save-pin-dialog'), 'shell.html no longer includes the save dialog');
  assert.ok(!main.includes('sp-scrim'), 'main.js no longer drives the dialog');
  assert.ok(!main.includes('openSavePin'), 'openSavePin is gone');
  assert.ok(!main.includes('wireSavePin'), 'wireSavePin is gone');
});
```

- [ ] **Step 2: Run unit tests, expect exactly this failure**

Run: `node --test tests/*.test.mjs`
Expected: FAIL — `shell.html no longer includes the save dialog` (everything else green).

- [ ] **Step 3: Remove the include, delete the file**

1. In `concepts/app/shell/shell.html`, delete the line `<!-- include: save-pin-dialog.html -->` (line 244).
2. Delete `concepts/app/shell/save-pin-dialog.html`.

(The include must go first — the build resolves it.)

- [ ] **Step 4: Build + unit + one Playwright project, expect PASS**

Run: `node scripts/build.mjs`, `node --test tests/*.test.mjs` (all pass), then `npx playwright test tests/signin-pages.spec.mjs tests/signin-gate.spec.mjs --project=desktop --reporter=list` (all pass — the removed markup was inert but the shell changed).

---

### Task 5: Full verification + spec status

**Files:**
- Modify: `docs/superpowers/specs/2026-10-05-signin-pages-design.md` (status + "three dialog tests" wording fix in R10c)

- [ ] **Step 1: Full unit suite**

Run: `node --test tests/*.test.mjs` → all pass.

- [ ] **Step 2: Sign-in + shell-touching Playwright suites across all 7 projects**

Run: `npx playwright test tests/signin-pages.spec.mjs tests/signin-gate.spec.mjs tests/user-menu.spec.mjs tests/language-switcher.spec.mjs --reporter=list`
Expected: all pass. Known environment: pre-existing parity/data-list snapshot failures and load flakes exist elsewhere in the repo — they are out of scope; if this run has a single failure, re-run that spec in isolation before believing it (see spec Round 2's environmental-failure note). Never re-baseline snapshots without user approval.

- [ ] **Step 3: impeccable gate**

Run: `/Users/majedsiefalnasr/.agents/skills/impeccable/scripts/impeccable detect --json "concepts/app/pages/signin/templates.html" "concepts/app/pages/signin/signin.js" "concepts/app/main.js" "concepts/app/shell/shell.html" "concepts/app/core/locale.js"`
Expected: `[]` (the pre-existing shell.css `gradient-text` finding is not in this change's file set).

- [ ] **Step 4: Update the spec**

In `docs/superpowers/specs/2026-10-05-signin-pages-design.md`:
1. Round 4's `**Status:**` line → `**Status:** Implemented + verified (unit, sign-in Playwright suites ×7 projects, impeccable).`
2. In R10c, replace `the three dialog tests against` with `the two dialog tests (plus the device-approval test, which now parks on the save step) against`.

- [ ] **Step 5: Final status check (no commit)**

Run: `git status --porcelain` — review the changed/untracked files. Do **not** commit; report the result to the user.
