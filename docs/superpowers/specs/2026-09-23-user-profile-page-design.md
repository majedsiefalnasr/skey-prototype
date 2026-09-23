# User Profile Page — Design Spec

## Purpose

Add a User Profile page to the ERP prototype: a single settings surface covering personal info, account settings, appearance, sign-in security (password/PIN), sessions & devices, and notification preferences — reachable from the existing topbar user menu, styled to match the app's established ERP shell conventions and Atlassian Design System sensibilities.

## Scope

### New content view: `profile`

- New named content view `'profile'`, registered in `shell/content.js` alongside `record`/`customers-list`/`customer-record`/`geo-list`/`geo-record`, shown via the existing `attachAndShowView('profile')` mechanism. No new routing system — same content-swap pattern as every other page.
- New files, mirroring the customers-page split:
  - `pages/profile/profile.js` — `createProfile({...})` factory: owns current-section state, `setSection(key)`, wires scroll-nav clicks/scroll-spy (same approach as `pages/customers/layouts.js`'s `createScrollNavigator`), wires dialogs, wires fixture-backed device list.
  - `pages/profile/templates.html` — the `.profile-view` template: identity header, sticky scroll-nav, six sections, footer.
  - `pages/profile/fields.js` — `PROFILE_SECTIONS` metadata (key, title, icon) mirroring `CUSTOMER_SECTIONS`'s shape.
  - `pages/profile/dialogs.html` + wiring in `profile.js` — Change Password dialog, Set/Change PIN dialog (both reuse `components/dialog/dialog.js`'s `trapFocus`/`releaseFocus` and the `.dscrim`/`.dlg` markup pattern from `appearance-dialog.html`).
  - `prototype/fixtures/profile.js` — `CURRENT_USER`, `LOGIN_LOG_ROWS`, `DEVICE_ROWS` sample data.
- `main.js` imports and constructs `createProfile(...)`, following the same construction order/pattern as `createCustomers(...)`.

### Scroll Navigator layout (six sections, in order)

1. **Profile** — read-only-by-default identity fields plus editable personal info: name, email, phone, job title, photo/avatar (upload/replace), locale, timezone. Photo control follows the customer record's existing photo-field pattern (last positioned within its group per the prior customer-record convention already in the codebase).
2. **Account settings** — username (read-only), branch/company context (read-only, mirrors the user-pop's existing "Branch: lastchance" display), default landing page selector, account-level prototype preferences.
3. **Appearance** — the existing `appearance.js` controls (`createAppearanceControls`), relocated into this section's markup. Theme, accent color, interface scale, typography, layout (fluid/boxed), density, high contrast, launchpad toggle — same fields, same behavior, same `core/appearance.js` state, just a new mount point.
4. **Security** — "Change password" and "Set/Change PIN code" buttons, each opening a small modal dialog with client-side-only validated fields (current password, new password, confirm; or current PIN, new PIN, confirm) and a success toast. No real auth backend — this is a prototype interaction, not a working credential change.
5. **Sessions & devices** — a login log (timestamp, IP, device/browser, status: success/failed) rendered as a plain static table, and a device list (device name, location, last active, current-device badge) with a per-device "Sign out" action for non-current devices only. The current device shows a badge and has no sign-out control.
6. **Notifications** — email/in-app notification preference toggles (grouped by category), following the same toggle-row visual pattern already used in `appearance-dialog.html` (`.switch` control + label/description pair).

Layout: sticky left `profile-scroll-nav` (visual clone of `customer-scroll-nav`'s styling, generalized), single scrollable canvas below an identity header (avatar, name, email, role/branch — same idea as the customer record's identity block). Each section is a `fieldset`-based grouped card (`fset` convention from `appearance-dialog.html`), scroll-spied the same way `layouts.js`'s `createScrollNavigator` highlights the active section.

### Navigation entry points

The topbar user dropdown (`shell/shell.html`'s `.user-pop`) is updated so its existing/new links deep-link into the profile page at a specific section, instead of opening a separate dialog:

- New "My Profile" entry (or the existing user-card row becomes clickable) → `profile`, section `profile`.
- "Account settings" (existing, currently dead) → `profile`, section `account`.
- "Appearance" (existing, currently opens `appearance-dialog.html`) → `profile`, section `appearance`. The dialog-open call is replaced with a profile-page navigation + scroll-to-section call.

Deep-linking reuses the same scroll-to-section mechanism `layouts.js` already implements for `data-customer-scroll-section` buttons: navigate to the content view, then scroll the target section into view under the sticky nav offset.

### Appearance dialog removal

- `shell/appearance-dialog.html`'s scrim/dialog wrapper (`#appearance-scrim`, open/close logic, `.c-close` handling) is removed. Its field markup (accent swatches, scale slider, typography select, theme cards, layout/density cards, contrast/launchpad toggles) moves as-is into `pages/profile/templates.html`'s Appearance section.
- `shell/appearance.js`'s `createAppearanceControls` drops `openAppearance`/`closeAppearance` and the scrim-related DOM lookups; everything else (state, `syncAppearanceDialog` → renamed `syncAppearanceControls`, event wiring) is unchanged, just no longer dialog-scoped.
- `main.js` and `shell/topbar.js` no longer reference `.appearance-menu`'s dialog-open handler; the button becomes a navigation trigger instead.

## UX decisions

Scroll Navigator (not tabs) keeps the whole settings surface in one continuous, deep-linkable document, consistent with the Customer record's now-standard layout and this session's stated preference.

A single Appearance controls module with two logical mount points collapses into **one** mount point (the profile page) once the dialog is removed — simpler than maintaining dual bindings, and satisfies "dropdown opens the profile page" without redundant UI.

Devices/login-log render as **plain static tables**, not the full `data-list` component — no sort/filter/group is warranted for a fixed six-to-eight-row prototype fixture (YAGNI); pulling in the data-list machinery would be unjustified weight for read-mostly reference data.

The current device is badge-only with no self-service sign-out, matching Atlassian's and most ERPs' convention that ending your own active session belongs to the primary Log out action, not device management.

Notifications is an added section beyond the literal request, justified by its ubiquity in ERP/Atlassian-style profile pages and by the user's invitation to propose additional config; it's schema-shaped like Appearance (label/description/toggle rows) to avoid inventing a new pattern.

## Mock data & persistence

- `prototype/fixtures/profile.js` holds `CURRENT_USER` (matches the user-pop's current hardcoded name/branch), `LOGIN_LOG_ROWS` (6–10 sample entries), and `DEVICE_ROWS` (3–5 sample devices, one flagged `current: true`).
- Device "Sign out" removes that row from the rendered list and persists the removal for the session via `sessionStorage`, following `prototype/controls.js`'s existing `readJSON`/`writeJSON` (`skey-proto-state`-style key) convention — a new key (e.g. `skey-proto-profile-devices`) storing the list of revoked device ids. No real backend call; a toast confirms the action.
- Change Password / Set PIN dialogs validate client-side only (required fields, new/confirm match) and show a success toast on submit; no state is persisted beyond that toast (there's nothing meaningful to persist for a fake credential).

## Constraints

- Preserve existing APIs, keyboard behavior, RTL, reduced-motion behavior, and the app shell, per the codebase's established constraint pattern.
- Do not invent a real backend, authentication, or persistence beyond the sessionStorage device-list mechanism described above.
- Do not pull in `createDataList`/table component machinery for the login log or device list.
- Do not leave the old Appearance dialog mounted or reachable after the section move — it is fully replaced, not duplicated.
- Follow existing Tailwind-arbitrary-value styling conventions and existing token variables (`--surface`, `--line`, `--accent`, `--danger`, `--faint`, `.fset`, `.switch`) rather than introducing new design tokens.

## Verification

1. Topbar user dropdown's "My Profile", "Account settings", and "Appearance" entries each navigate to the `profile` content view and scroll to their respective section, with that section's scroll-nav item marked current.
2. Appearance section inside the profile page reproduces every control and behavior the old dialog had (theme, accent incl. custom hex, scale, typography, layout, density, high contrast, launchpad) with no regression; `appearance-dialog.html`'s scrim/dialog wrapper no longer exists in the DOM.
3. Security section's Change Password and Set/Change PIN dialogs open, trap focus, validate required/matching fields, and show a success toast on submit; Escape/close restores focus to the trigger.
4. Sessions & devices section renders the login log table and device list from fixtures; clicking "Sign out" on a non-current device removes it and the removal survives a page reload within the same session (sessionStorage); the current device shows its badge and no sign-out control.
5. Notifications section renders toggle rows grouped by category, consistent visually with Appearance's toggle rows.
6. Profile and Account settings sections render and (where editable) accept input without console errors.
7. Page matches existing RTL, keyboard-navigation (scroll-nav buttons are reachable/operable via keyboard, same as `customer-scroll-nav`), and reduced-motion behavior.
8. No existing customer/geography/invoice page, dialog, or keyboard shortcut regresses.
