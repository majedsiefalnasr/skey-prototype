# Sign-in Pages, Animated Background, and Language Switcher — Design

**Date:** 2026-10-05
**Status:** Approved
**Scope:** `concepts/app/pages/signin/*`, `concepts/app/core/locale.js`, `concepts/app/shell/locale.js`, `tests/*`

## Goal

Turn the sign-in view into a complete demo surface:

1. The launchpad's animated orb background behind a card that is centered both axes.
2. Six working sub-pages (panes) for every currently dead link, with demo interactivity.
3. A language switcher listing the full 7-language catalog instead of the EN/AR toggle.

Constraints carried over from the approved restyle: ADS tokens only (no hardcoded
colors), no new CSS files (architecture.test asserts the exact stylesheet list),
keep all required `si-*` ids and `data-si-*` hooks (signin.test.mjs), and stay
inside the Tailwind budget (baseline 258928, ceiling 284820).

## 1. Layout and animated background

- `.signin-view` becomes `relative overflow-hidden bg-bg flex flex-col items-center`:
  - **Orbs layer:** `absolute inset-0 pointer-events-none overflow-hidden` +
    `aria-hidden="true"`, containing the launchpad's exact seven `.lp-orb`
    spans (home.js:292-299): the `lpOrbSm`/`lpOrbLg` radial-gradient utility
    strings and `animate-[lp-float-N_…_alternate]` with the same positions,
    sizes, and opacities. Utilities are picked up from the template by the
    existing `@source "../**/*.html"` scan — no new CSS, shared class names
    dedupe against the launchpad's generated rules.
  - **Main:** `flex-1 grid place-items-center w-full` holding the existing card
    (max-w-[480px], rounded-lg, surface + border, shadow-1) — centered
    vertically and horizontally.
  - **Footer:** after main, `relative z-[1]` over the background, unchanged
    contents except the language control (section 3).
- Reduced motion: shell.css already sets `animation: none` for `.lp-orb` under
  `prefers-reduced-motion`, and every Playwright project uses
  `reducedMotion: 'reduce'` — screenshots stay deterministic.
- `body.signed-out .page-content { background: var(--bg) }` (already added)
  keeps the frame gutter seamless.

## 2. Pane architecture

- Panes are `<section data-si-pane="…">` inside the card:
  `1` (tenant), `2` (credentials), `reset`, `workspaces`, `device`,
  `request`, `privacy`, `support`.
- `show(step)` becomes `show(paneId)` comparing `pane.dataset.siPane !== paneId`
  (string keys; `activate()` still opens `1`). Focus: each pane carries
  `data-si-focus="#selector"`; `show()` focuses it after un-hiding, falling back
  to the pane heading.
- Entry points: dead links become `<button type="button" data-si-goto="…">`
  wired with one delegated listener; "Back to sign in" returns to the last
  auth pane (the `show()`-tracked `1` or `2`), so a user who reached a
  sub-page from step 2 lands back on step 2. `#si-change` keeps its existing
  job (back to `1` from step 2).
- `[data-si-err]` (step 2) and `[data-si-caps]` keep their current roles;
  other panes own their own status/success boxes with local classes — no new
  global hooks, so `hideError()` stays scoped to step 2.
- Success/error boxes use `--success-soft-*` / `--danger-soft-*` tokens,
  matching the existing error box.

## 3. The six sub-pages

All panes render inside the same card; each has a heading (28/32 semibold),
lead (16/24 muted), ADS-labeled fields, and a back affordance.

| Pane | Entry from | Contents | Demo behavior |
|---|---|---|---|
| `reset` | "Reset your password" (step 2) | Username field (prefilled from step 2), primary "Send reset link" | 800ms disabled → success box: "If an account exists for `<user>@<tenant>`, a reset link is on its way. (demo — no email is sent)" |
| `workspaces` | "Find your workspaces" (step 1) | Search input filtering three demo tenants live: `lastchance.skeyerp.com`, `acme.skeyerp.com`, `northwind.skeyerp.com`, each showing name + city (empty query lists all three) | Selecting a row fills `#si-tenant` and calls `show(2)`; no match → "No workspaces found" empty state |
| `device` | "Use device code" (step 1) | Mono activation code (`SQTF-93B7`), status pill "Waiting for approval", primary "Simulate approval (demo)" | Click → success state, then `onSignIn()` (same 800/350ms rhythm as password sign-in) |
| `request` | "Request access" (header link) | Full name / Work email / Organization, primary "Request access" | Empty required fields get `aria-invalid` + focus (tenant-step pattern); otherwise 800ms → success box: "Request received — we'll email `<email>` within one business day. (demo)" |
| `privacy` | "Privacy & terms" (footer) | Short scrollable sections: Data processing, Security, Subprocessors, Your rights | Read-only + back |
| `support` | "Support" (footer) | Help center, `support@skeyerp.com`, Cairo HQ hours; link to `reset` | Read-only + back |

Demo auth is unchanged: any tenant + `admin` / `skey123` signs in.

## 4. Language switcher

- `#si-lang` (id preserved for tests) becomes the `<summary>` of
  `<details class="data-menu data-manage-submenu si-language relative">`
  in the footer, with a `[data-si-language-current]` span and the same seven
  `<label data-si-language="…">` radio rows as the shell avatar menu
  (shell.html:132-148) under a separate radio-group name
  (`skey-signin-language`). **Implementation deviation, deliberate:** the
  class and row attributes are `si`-prefixed rather than reused verbatim,
  because the sign-in view stays in the DOM (hidden) while signed in —
  reusing `.language-submenu`/`data-language` would give
  `language-switcher.spec`/`user-menu.spec`'s strict selectors two matches
  and break them. `syncLanguageControls()` and a document-delegated
  `change` listener in `initLanguage()` cover both surfaces, so behavior
  (endonym summary, checked radio, demo-only display state) is identical.
- The menu-controller's document-level listeners position/open/close any
  `.data-manage-submenu`, so behavior matches the avatar menu with no new code.
- `shell/locale.js#initLanguage` wires **all** submenus
  (`document.querySelectorAll('.language-submenu > .data-menu-popover')`)
  instead of only the first, keeping one source of truth. `syncLanguageControls()`
  already updates every `[data-language-current]` and every
  `.language-submenu [data-language]` radio.
- Semantics (existing): `en`/`ar` are functional — content, direction, and
  persistence change; `fr`/`de`/`es`/`pt`/`ja` update the selector display only
  and are never persisted.
- Remove the old toggle: `langBtn().addEventListener('click', …)` and the
  `langBtn().textContent = …` line in `retranslate()`.

## 5. Copy and i18n

All new strings get Arabic entries in `core/locale.js` under the existing
sign-in section (headings, leads, labels, buttons, success messages, empty
states, footer support rows). English copy lives in the template as today.

## 6. Tests

- **Unit** — extend `tests/signin.test.mjs`:
  - every `data-si-goto` target has a matching `data-si-pane` pane;
  - each new pane id is present; `si-lang` still exists;
  - locale.js exports all 7 `LANGUAGES` (guards the shared catalog).
- **Playwright** — new `tests/signin-pages.spec.mjs`:
  1. reset flow shows the success box;
  2. workspaces search filters, selecting a row lands on step 2 with the tenant filled;
  3. device approval signs in (`.signin-view` hidden, launchpad visible);
  4. request access shows its success box;
  5. privacy and support panes open and return via back;
  6. language menu lists 7 options; picking Français updates the footer label
     while the copy stays English and `dir` stays `ltr`.
- **Regression:** full unit suite (117 + new), `signin-gate.spec.mjs` (35),
  `user-menu.spec.mjs`, `routing`, `language-switcher`.
- **Visual:** `impeccable detect` on changed files; screenshots in
  light / dark / high-contrast / AR — verify orbs, centering, and RTL pane layout.

## 7. Known pre-existing failures (not ours)

`components.spec.mjs:250` (mobile-rtl timeout), `data-list` screenshot drift,
mobile-touch messaging/lifecycle/invoice timeouts — confirmed on baseline HEAD.

## 8. Delivery

No commits unless explicitly requested (standing instruction).

---

# Round 2 — Background fill, workspace search, branch step, saved-credential PIN

**Date:** 2026-10-05
**Status:** Implemented + verified (Q&A: workspace list removed / 2FA dropped
entirely / save prompt on every sign-in until a PIN exists, "Not now" only
dismisses that visit / branch step after tenant, before credentials).
**Scope:** `pages/signin/templates.html`, `pages/signin/signin.js`, new
`shell/save-pin-dialog.html` + `shell/shell.html` include, `main.js`,
`core/locale.js`, `tests/*`.

## R1. Full-bleed animated background

- Live measurement: `.signin-view`/`.lp-orbs` render at `x=16, w=1408` of a
  1440 viewport because `.page-content` carries `px-4` (and boxed layout adds
  `width: calc(100% - 64px)` gutters) — flat `--bg` bands down both edges,
  while the launchpad escapes the padding by attaching `.lp-view` to the frame.
- Fix: `.lp-orbs` becomes `fixed inset-0` (verified: no transformed/zoomed/
  contained ancestor, so the viewport is the containing block; the layer still
  hides with the view because a hidden ancestor renders no fixed children).
- Animation is already verbatim launchpad markup (computed
  `animation-name: lp-float-1, 16s, running`) — no change; tests assert both
  bbox coverage and the running animation under `reducedMotion:
  'no-preference'` emulation.

## R2. Workspace search without the list

- Delete the three `data-si-ws` rows, their `<ul>`, and `#si-ws-empty`.
  Keep `#si-ws-q`; add `#si-ws-go` (Continue) plus a "Press Enter to
  continue." hint.
- Submit (Enter in the field or the button) validates non-empty, strips a
  pasted `.skeyerp.com` suffix into `#si-tenant`, then runs the shared
  `advanceFromTenant()` route (R3).

## R3. Branch step (pane `branch`)

- Demo map in signin.js: `lastchance → [Cairo HQ, Alexandria, Giza]`,
  `acme → [Cairo HQ, Alexandria]`, anything else (incl. `northwind`) → none
  (pane skipped) — names match the app's `.branch-submenu` exactly.
- `advanceFromTenant()` (used by `#si-to2` and the workspaces submit):
  normalize/validate tenant → if branches exist, render radio rows (`name=
  skey-signin-branch`, first/previous selection checked) and `show('branch')`,
  else `show(2)`.
- Pane: radiogroup (`#si-branch-list`), primary Continue `#si-branch-go` →
  step 2, Back `data-si-goto="1"`. `#si-who` shows
  `tenant.skeyerp.com · {branch}` when a branch is selected.
- On every successful sign-in path that has a branch, `applyBranch()` sets
  `aria-checked` on the matching `.branch-submenu [data-branch]` button —
  exactly what `topbar.js:13` reads — so the signed-in app opens on it.

## R4. Save-credentials dialog (post sign-in)

- New `concepts/app/shell/save-pin-dialog.html` (loscrim pattern:
  `#sp-scrim.dscrim` + `.dlg`, `c-close` buttons, `.dscrim.open`,
  `trapFocus`/`releaseFocus`, scrim-click + Escape dismissal), included in
  `shell.html` after logout-dialog.
- `main.js` opens it from `onSignIn()` after the session toggle flips —
  iff localStorage has no `skey-proto-cred`. Two steps inside one dialog:
  ask ("Save your sign-in?" / Not now / Create PIN) → PIN form
  (`#sp-pin`, `#sp-pin2`, inline `#sp-pin-err`, Back / Save PIN).
- Save: 6 digits, both fields matching → persist
  `skey-proto-cred = {tenant, user, pinHash, branch, savedAt}` (demo hash
  `hashPin()` exported from signin.js, imported by main.js — no cycle), then
  close + toast "PIN created — sign in with your PIN next time."
- "Not now" closes without persisting (per-visit; the dialog returns on the
  next sign-in until a PIN exists). Copy is static `data-i18n` + AR keys;
  validation strings go through `t()` at runtime.

## R5. PIN sign-in (pane `pin`)

- 10th pane: heading, lead, `#si-pin-who` (`user · tenant.skeyerp.com`),
  `#si-pin` (password-type, `inputmode=numeric`, `maxlength=6`),
  `#si-pin-signin`, local `#si-pin-err` (NOT `data-si-err` — that stays
  step-2-only per the unit contract), `data-si-goto="2"` "Use password
  instead", `data-si-goto="1"` back.
- `activate()` (runs on every navigation to the view): if a saved record
  exists → prefill tenant/user/branch from it and `show('pin')`, else
  `show(1)`. Escaping to another pane never auto-bounces back (only the next
  activation re-offers PIN).
- Submit: 800ms demo latency → `hashPin(pin) === cred.pinHash` → ✓ label →
  `applyBranch()` + `onSignIn()`; otherwise `aria-invalid` + error box.
- Password/device paths unchanged (`admin` / `skey123`).

## R6. i18n

AR keys for every new string (branch pane, PIN pane, save dialog, hints,
validation, toast) in the existing sign-in section of `core/locale.js`.

## R7. Tests

- `tests/signin.test.mjs`: contract ids += `si-ws-go`, `si-branch-go`,
  `si-pin`, `si-pin-signin`; pane list += `branch`, `pin` (ten panes).
- `tests/signin-pages.spec.mjs`: rewrite workspaces (no rows; Enter/Continue
  → branch or step 2); new tests for background fill + running animation,
  branch flow (lastchance routes through branch pane, northwind skips it,
  who-line shows the pick), full save→PIN→sign-out→PIN-sign-in journey
  (wrong + right PIN), and "Not now is per-visit"; dismiss the dialog where
  older flows complete a sign-in.
- `tests/signin-gate.spec.mjs`: the password sign-in now raises the dialog —
  the sign-in helper routes through the branch pane; the open scrim never
  hides the post-sign-in views the gate asserts, so no dismissal is needed.
- Regression: full unit suite, full 7-project Playwright, `impeccable detect`
  on changed files. No commits.

## R8. Round-2 verification (2026-10-05)

- Unit: `node --test tests/*.test.mjs` → **119/119** (contract updated for
  ten panes + new ids; workspace row/empty-state guards added).
- Build: `node scripts/build.mjs` → `Built dist/`; Tailwind budget test green.
- Playwright, sign-in specs: **16/16 on desktop**, and every sign-in test
  passes isolated on mobile-touch / mobile-rtl / reduced-motion /
  high-contrast.
- `impeccable detect` on all changed files → `[]`.
- Full 7-project suite: 775 passed / 115 failed / 69 skipped. The failures
  are **environmental, not ours**: stash-running the same specs on clean
  HEAD (origin/main) reproduces 110 of them — screenshot drift at
  `maxDiffPixels: 0` / `retries: 0` since yesterday's snapshot rebaseline
  (parity 52, data-list 26, lifecycle 13, invoice-geography 9, messaging 8,
  org-center 3, routing 2, components 1) plus parallel-load timeouts. The
  7 failures unique to our run all pass when re-run in isolation (load
  flakes). Re-baselining snapshots is a separate, user-approved step.

---

# Round 3 — Visual fixes: sign-in canvas slab + save-dialog panel

**Date:** 2026-10-05
**Status:** Implemented + verified (two user-reported screenshots).

## R9a. Remove the background around the sign-in card

- Cause: `.signin-view` carried `bg-bg` and the round-1 rule
  `body.signed-out .page-content { background: var(--bg) }` painted a grey
  slab. In boxed layout page-content is 1296px centered, so the slab left
  white frame bands at the sides — a visible seam around the card (in
  default layout the slab swallowed the whole viewport instead).
- Fix: drop `bg-bg` from `.signin-view` and delete the signed-out
  page-content background rule. The view is transparent; the frame's
  surface (white / themed) and the fixed orb layer now run edge to edge in
  both layouts. Verified with 2000×1279 screenshots in default + boxed:
  no `#f8f8f8` slab (remaining exact-248 pixels are orb gradient stops).

## R9b. Save-PIN dialog panel

- Cause: dialogs draw their panel from `.dlg[data-tone]` (border + bg +
  `.dlg-inner` white); `save-pin-dialog.html` omitted `data-tone`, so
  `.dlg` computed `background: transparent` — only the `.dhd`/`.dfoot`
  line-2 strips showed over the launchpad.
- Fix: add `data-tone="default"` (same as `sidebar-dialog.html`). Probe:
  `dlgBg: rgb(240,241,242)`, `innerBg: rgb(255,255,255)`, crop shows the
  complete panel above the scrim.

## R9c. Verification

- Unit 119/119 (Tailwind budget green after rebuild).
- Playwright: signin-pages + signin-gate + user-menu + language-switcher
  across all 7 projects → 181 passed / 1 flake (gate:73 on
  desktop-high-contrast-light; passes isolated).
- `impeccable detect` on the three changed files → one finding at
  shell.css:101 (`gradient-text`), pre-existing, not in the working diff
  (launchpad heading). No commits.

---

# Round 4 — Save-PIN inside the sign-in card (dialog removed)

**Date:** 2026-10-05
**Status:** Implemented + verified (unit 120/120, sign-in Playwright
suites across all 7 projects with only documented parallel-load flakes
that pass in isolation, impeccable `[]`, dialog file and include removed).

## R10a. Flow

- The "Save your sign-in?" / "Create PIN" journey moves out of the
  post-sign-in dialog and into the sign-in card as two panes reached
  after successful authentication — the session does **not** flip until
  the step is answered (view stays visible, body stays `signed-out`,
  pending-URL redirect waits).
- Password success or device approval with **no** saved credential →
  pane `save`: h1 "Save your sign-in?", identity line
  `admin · lastchance.skeyerp.com`, the dialog's body copy, buttons
  **Not now** (secondary) / **Create PIN** (primary). No back link —
  the step must be answered.
- **Create PIN** → pane `savepin` (h1 "Create your PIN", the one new
  locale key; every other string reuses a round-2 key): PIN + Confirm
  (numeric, maxlength 6),
  same validations and error strings as the dialog
  ("PIN must be exactly 6 digits." / "PINs do not match."), six-digit
  hint, **Back** → pane `save`, **Save PIN** → writes `skey-proto-cred`
  `{tenant, user, branch, pinHash, savedAt}` (never the raw PIN) →
  toast "PIN created — sign in with your PIN next time." → completes
  sign-in.
- Completion = `applyBranch()` + the existing `onSignIn` (toast
  "Signed in" + session toggle flip). **Not now** completes without
  writing the credential; the prompt then returns on the next password
  sign-in (per-visit semantics unchanged).
- Saved-credential flows never see the step: PIN sign-in completes
  directly; password fallback while a CRED exists skips it too.
- Buttons only — no scrim, Escape, or dismissal semantics (a deliberate
  simplification of the dialog's behavior).

## R10b. Files

- `pages/signin/templates.html`: panes `data-si-pane="save"` and
  `data-si-pane="savepin"` with `si-save-*` ids
  (`si-save-who`, `si-save-not-now`, `si-save-create`, `si-save-pin`,
  `si-save-h`, `si-save-pin2`, `si-save-pin-h`, `si-save-pin-err`,
  `si-save-back`, `si-save-go`), standard pane classes and
  `data-si-focus` hooks; header comment ten-pane → twelve-pane. The one
  new locale key `Create your PIN` gets AR `أنشئ رمزك السري`; every
  other string reuses a round-2 key.
- `pages/signin/signin.js`: owns the save logic (it already owns
  `hashPin`, `CRED_KEY`, and the pane router). Password/device paths
  route through a shared `complete()`; with no CRED they land on `save`
  first. Validation code moves here from main.js.
- `main.js`: `onSignIn` shrinks to toast + toggle flip; `closeSavePin`,
  `showSavePinStep`, `openSavePin`, `wireSavePin` and the `hashPin` /
  `CRED_KEY` imports are deleted (createSignIn import stays).
- `shell/shell.html`: drop the `<!-- include: save-pin-dialog.html -->`
  line; delete `shell/save-pin-dialog.html`.

## R10c. Tests

- `tests/signin.test.mjs`: pane contract 10 → 12 (`save`, `savepin`);
  new ids asserted; guard that no `sp-` ids remain in the template.
- `tests/signin-gate.spec.mjs`: `signIn()` helper clicks **Not now**
  when the save pane appears (fresh state has no CRED) before waiting
  for the view to hide.
- `tests/signin-pages.spec.mjs`: rewrite the two dialog tests against
  the card — journey (deferred entry until Save PIN, validation,
  stored CRED, PIN sign-in next visit, no save step for PIN),
  Not-now (no CRED, prompt returns next visit) — plus the
  PIN-exists skip (password fallback) and the device-approval test,
  which now parks on the save step. Assert `.signin-view` still visible
  + body `signed-out` immediately after password success.
- Verification: `node scripts/build.mjs`, `node --test tests/*.test.mjs`,
  sign-in Playwright suites across all 7 projects, `impeccable detect`
  on changed files. No commits.

---

# Round 5 — Multi-account saved identities (picker, forget, two-way PIN)

**Date:** 2026-10-05
**Status:** Implemented + verified

## R11a. Storage & model (D1)

- New localStorage key `skey-proto-accounts`: a JSON array of
  `{tenant, user, branch, pinHash, savedAt}` records. Identity key =
  `` `${tenant.toLowerCase()}|${user.toLowerCase()}` ``.
- **Legacy migration:** the first `loadAccounts()` that finds the old
  `skey-proto-cred` record and an empty accounts list imports it as the
  first account, persists the new key, and deletes the legacy key —
  so forgetting an account can never resurrect it. Every
  `saveAccounts()` call also deletes the legacy key defensively.
- Module-private helpers in `signin.js`: `loadAccounts()`,
  `findAccount(tenant, user)`, `upsertAccount(record)` (replace-by-key
  in place, else append), `forgetAccount(tenant, user)`, plus
  `saveAccounts(list)`. `hashPin` stays module-private, unchanged.
- A module-level `activeAccount` (the record the PIN pane is currently
  authenticating) replaces the old single-`loadCred()` reads; it is set
  at activate (sole account), on picker-row pick, and when
  "Use PIN instead" resolves the current identity.
  **Implemented as derived state:** `currentAccount()` resolves the
  identity from the tenant/user fields at read time — every route into
  the PIN pane syncs those fields first, so it cannot go stale. The
  `activeAccount` references below mean this derived identity.

## R11b. Entry rules + account picker (D2, D3) — pane count 12 → 13

- `activate()` rules: 0 accounts → tenant step (today). Exactly 1
  account → set `activeAccount`, prefill identity/branch, straight to
  the PIN pane (today's behavior). 2+ accounts → picker pane.
- New pane `data-si-pane="accounts"`: h1 `Who's signing in?`
  (`#si-accounts-h`), a dynamic row list `#si-accounts-list` (initial
  circle + `user · tenant.skeyerp.com` + branch label; main tap target
  is a button that picks the account → prefills tenant/user/branch →
  PIN pane; each row also owns a separate
  `×` button with an `aria-label` set at render time from
  `Remove account` that calls
  `forgetAccount` for that row only), and a footer button
  `#si-accounts-other` `Use another account` → tenant step (saved
  list untouched).
- Removing a row re-renders the list in place; removing the last
  account falls back to the tenant step. Removal toasts
  `Account removed from this device.` with `tone: 'info'`.

## R11c. PIN pane (D3, D4)

- Identity line `#si-pin-who` gains the branch:
  `admin · Cairo HQ · lastchance.skeyerp.com` (branch segment omitted
  when the record has none). Sourced from `activeAccount`.
- New `#si-pin-forget` link `Forget this account`:
  `forgetAccount(activeAccount)` + toast → remaining accounts ?
  picker : tenant step (activeAccount cleared).
- Wrong-PIN error reveals a hidden-then-shown wrapper `#si-pin-else`
  holding `#si-pin-someone` `Sign in as someone else` → accounts ≥ 2 ?
  picker : tenant step (error cleared, PIN input reset). The wrapper
  hides on PIN input and on successful sign-in.
- `Use password instead` kept → credentials with that account's
  identity prefilled; the pane's trailing button becomes `Start over`
  (label swap from `Back to sign in`) → accounts ≥ 2 ? picker :
  tenant step.

## R11d. Credentials pane (D4, D6)

- New `#si-usepin` link `Use PIN instead` below the sign-in
  button block, next to the existing "Having trouble?" line, **visible only when `findAccount(tenant, user)` has a
  PIN** — shown on pane entry and re-evaluated as the username field
  changes. Activates it: set `activeAccount`, show the PIN pane.
  (Fixes the round-4 dead-end: password ↔ PIN is now two-way.)
- Identity line `#si-who` becomes `user · tenant.skeyerp.com[ · branch]`
  — the user segment appears once the username field is non-empty and
  refreshes on input; without a username it stays host-only (today).
- `Change` → tenant step unchanged.

## R11e. Save rule + device path (D5 — fixes the wrong-skip bug)

- Password success → `postAuth()`: `findAccount(current tenant+user)`
  with a `pinHash` → `complete()`; otherwise → save step. The identity
  just authenticated is what gets checked — never "any account exists".
- Save PIN → `upsertAccount({tenant, user, branch, pinHash, savedAt})`
  (identity-matched replace or append — a second account can be added
  without losing the first) → `saveAccounts` (drops legacy key) →
  toast `PIN created — sign in with your PIN next time.` →
  `complete()`.
- Device-code approval → `complete()` directly; the save step no longer
  appears on that path (reverts round 4's device-test park — that test
  returns to direct sign-in).
- PIN sign-in and "already has a PIN" password sign-in → `complete()`,
  unchanged. "Not now" semantics unchanged (per-visit re-prompt).
- Branch provenance: a branch taken from a saved record is tagged with
  that record's identity key (`branchSource`); `syncBranchSource()` drops
  it the moment tenant+username no longer match that key (hooked first
  in both input listeners). Branch-pane picks are attempt-scoped:
  `activate()` resets branch and tag so nothing carries across visits,
  the branch pane re-owns the choice (clearing the tag), and
  `advanceFromTenant` clears the tag when it reassigns a default.

## R11f. Copy — 9 new locale keys (EN → AR)

| Key | AR |
| --- | --- |
| `Who’s signing in?` (curly apostrophe) | `من سيُسجِّل الدخول؟` |
| `Use another account` | `استخدام حساب آخر` |
| `Forget this account` | `نسيان هذا الحساب` |
| `Sign in as someone else` | `تسجيل الدخول كشخص آخر` |
| `Use PIN instead` | `استخدم الرمز السري بدلاً منه` |
| `Start over` | `البدء من جديد` |
| `One more step` (save-pane eyebrow above the h1) | `خطوة أخيرة` |
| `Account removed from this device.` | `تمت إزالة الحساب من هذا الجهاز.` |
| `Remove account` (aria-label for row ×) | `إزالة الحساب` |

Everything else reuses existing keys. `Back to sign in` labels on the
five remaining demo sub-pages (reset/workspaces/request/privacy/support)
are NOT renamed this round.

## R11g. Files & tests

- **Files:** `pages/signin/signin.js` (storage model, activate,
  picker render + handlers, PIN/credentials/save rework),
  `pages/signin/templates.html` (picker pane, `#si-usepin`,
  `#si-pin-forget`, `#si-pin-else`, save-pane eyebrow, label swaps),
  `core/locale.js` (9 keys). `main.js` untouched (factory already
  receives `toast`). Tests as below.
- **Unit (`tests/signin.test.mjs`):** pane contract 12 → 13
  (`accounts`); id contract gains `si-accounts-h`, `si-accounts-list`,
  `si-accounts-other`, `si-usepin`, `si-pin-forget`, `si-pin-else`,
  `si-pin-someone`; new guard: `signin.js` owns `skey-proto-accounts`
  and the picker markup owns its ids; existing dialog-gone guard
  unchanged.
- **Playwright:**
  - Journey test storage assertions move to the array under
    `skey-proto-accounts` (record count 1, `pinHash` truthy, no raw
    `pin`); Not-now test asserts both keys stay empty.
  - Device test reverts to direct sign-in (no save-step park).
  - Legacy-seed test unchanged — it now exercises the migration path
    (still lands on the PIN pane, still skips the save step).
  - New tests: (1) picker — seed two accounts, entry shows picker,
    pick → PIN sign-in succeeds for that account; (2) picker × removes
    one account and the list falls back correctly; (3) forget-from-PIN
    clears storage and routes by what remains (picker while any remain,
    tenant step when none); (4) `Use PIN instead`
    round-trip from credentials; (5) wrong PIN reveals
    `Sign in as someone else`; (6) save-as-second-identity upserts
    (list of 2 after save, first account intact).
  - Gate helper (`signIn`) unchanged: fresh state → save step →
    `Not now`.
- **Verification:** build, `node --test tests/*.test.mjs`, sign-in
  suites × 7 projects (flake protocol: re-run failures in isolation;
  never re-baseline snapshots), impeccable `detect` on changed files.
  No commits.
