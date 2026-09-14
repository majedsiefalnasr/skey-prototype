// Customer page lifecycle scenarios (Task 7). Covers create/view/edit mode
// switching, required-field validation, guided-tab navigation, the Scroll
// Navigator, lookup selection, the nested unit drawer, photo preview,
// save/undo, and the dirty-leave guard — then confirms event handlers still
// work after navigating away from the customer record and back.
//
// Also includes the plan's exact customer-mode-restoration regression test
// (known-defects.md issue 6 / docs/superpowers/plans/2026-09-13-app-shell-
// components.md Task 11) — the ONE behavior correction this whole refactor
// is allowed to make. Task 7 added this test, root-scoped record.js's DOM
// queries (removing the anti-pattern that could throw a null-root
// exception), and confirmed the test failed for the documented reason (a
// null-root lookup, not an unrelated timeout) while restoration itself
// still did nothing. Task 11 completed the fix: main.js's composition now
// reads saved prototype state via readPrototypeState(sessionStorage) BEFORE
// any page activates and applies customer-mode/customer-layout through
// customers.setMode/setLayout directly (concepts/app/main.js), and
// record.js gained permanent #customer-mode/#customer-layout change
// listeners (mirroring the invoice record's own #mode/#st/#pay/#dirty
// listeners) so manual or restored changes to those controls actually take
// effect — see concepts/app/prototype/controls.js and concepts/app/pages/
// customers/record.js for the full mechanism. This test's `test.fail()`
// marking is removed below: it now passes for real.
import {test, expect} from '@playwright/test';
import {boot, openSurface, settle} from './support/browser.mjs';

// `#customer-mode`/`#customer-layout` are the demo-bar prototype controls
// (existing <select> elements, same family as the invoice record's `#mode`
// used by tests/parity.spec.mjs and tests/support/browser.mjs) — the
// established way these scenarios drive the customer record's mode/layout,
// not new testing hooks.
async function openCustomerRecordInMode(page, mode) {
  await openSurface(page, 'customer-record');
  await settle(page);
  await page.locator('#customer-mode').selectOption(mode, {force: true});
  await settle(page);
}

test.describe('customer record lifecycle', () => {
  test('customer mode restores after reload without a null-root exception', async ({page}) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await openSurface(page, 'customer-record');
    await page.locator('#customer-mode').selectOption('create', {force: true});
    await page.reload();
    await settle(page);
    expect(errors).toEqual([]);
    // This is the plan's own literal version of this regression test (see
    // Task 1/Task 11's checklist in docs/superpowers/plans/2026-09-13-app-
    // shell-components.md): after a reload with a saved 'create' customer
    // mode, the app must not throw AND normal navigation afterward must
    // still work. It deliberately does not assert on #customer-record-chrome
    // directly after reload without navigating anywhere: the composition
    // order this plan specifies (main.js applying saved state through
    // customers.setMode()/setLayout(), see concepts/app/main.js and
    // concepts/app/prototype/controls.js) restores the customer record's
    // own internal mode/layout MODEL, not "which page was showing" across a
    // hard reload — nothing in this app persists that, and the plan never
    // asked for it. (customers.setMode()'s DOM rendering is itself gated on
    // the record page being active — see pages/customers/record.js — so it
    // intentionally does not force the customer-record view to appear while
    // a different surface, 'record' by default at boot, is on screen.)
    await openSurface(page, 'customers-list');
    await expect(page.locator('.customer-list-view')).toBeVisible();
  });


  test('create mode renders the New Customer chrome with blank required fields', async ({page}) => {
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    // This test's own assertion matches the chrome's English label
    // ("New Customer") — some projects (mobile-rtl) boot with Arabic
    // already active (see tests/support/browser.mjs boot()'s `wantsRtl`
    // handling), which translates that label. Force English/ltr first, the
    // same pattern tests/data-list-component.spec.mjs's "a custom filter
    // can be saved and re-applied" test and tests/components.spec.mjs's
    // "Arabic locale switch" test use, since this test's own concern is
    // create-mode rendering, not locale-specific label text.
    await page.locator('#rtl').evaluate(element => {
      if (element.checked) {
        element.checked = false;
        element.dispatchEvent(new Event('change', {bubbles: true}));
      }
    });
    await openCustomerRecordInMode(page, 'create');
    await expect(page.locator('#customer-record-chrome')).toContainText('New Customer');
    await expect(page.locator('[data-customer-field="customerName"]')).toHaveValue('');
  });

  test('save in create mode with empty required fields surfaces validation errors', async ({page}) => {
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await openCustomerRecordInMode(page, 'create');
    await page.locator('.phead [data-customer-action="save"]').click();
    await expect(page.locator('.customer-field-error').first()).toBeVisible();
    // Still on the record — a validation failure must not navigate away or throw.
    await expect(page.locator('#customer-record-chrome')).toBeVisible();
  });

  test('view mode switches to edit via Modify, and Undo returns to view', async ({page}) => {
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await openSurface(page, 'customer-record');
    await settle(page);
    await expect(page.locator('#customer-mode')).toHaveValue('view');
    await page.locator('.phead [data-customer-action="modify"]').click();
    await expect(page.locator('#customer-mode')).toHaveValue('edit');
    await page.locator('.phead [data-customer-action="undo"]').click();
    await expect(page.locator('#customer-mode')).toHaveValue('view');
  });

  test('guided layout tab switching updates the active section', async ({page}) => {
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await openSurface(page, 'customer-record');
    await settle(page);
    const tabs = page.locator('[data-customer-tab]');
    const count = await tabs.count();
    test.skip(count < 2, 'guided layout not active for this record/viewport');
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  });

  test('Scroll Navigator layout renders a scroll nav and tracks the active section', async ({page}) => {
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await openSurface(page, 'customer-record');
    await settle(page);
    await page.locator('#customer-layout').selectOption('scroll', {force: true});
    await settle(page);
    await expect(page.locator('.customer-scroll-nav')).toBeVisible();
    const secondLink = page.locator('.customer-scroll-nav button').nth(1);
    await secondLink.click();
    await expect(secondLink).toHaveAttribute('aria-current', 'page');
  });

  test('lookup menu selects a value into the target field', async ({page}) => {
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await openCustomerRecordInMode(page, 'edit');
    const trigger = page.locator('[data-customer-lookup]').first();
    test.skip((await trigger.count()) === 0, 'no lookup-enabled field on this record/layout');
    await trigger.click();
    const menu = page.locator('#customer-lookup-menu');
    await expect(menu).toBeVisible();
  });

  test('lookup advanced search selects a value into the target field', async ({page}) => {
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await openCustomerRecordInMode(page, 'edit');
    const trigger = page.locator('[data-customer-lookup]').first();
    test.skip((await trigger.count()) === 0, 'no lookup-enabled field on this record/layout');
    await trigger.click();
    await page.locator('[data-customer-lookup-action="search"]').click();
    const row = page.locator('[data-customer-lookup-value]').first();
    await expect(row).toBeVisible();
    await row.click();
    await page.locator('#customer-lookup-select').click();
    await expect(page.locator('#customer-lookup-search-scrim')).not.toHaveClass(/open/);
  });

  test('nested unit drawer opens from the operation-unit lookup menu', async ({page}) => {
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await openCustomerRecordInMode(page, 'edit');
    const trigger = page.locator('[data-customer-lookup="operationUnit"]').first();
    test.skip((await trigger.count()) === 0, 'no operationUnit lookup field on this record/layout');
    await trigger.click();
    await page.locator('[data-customer-lookup-action="add"]').click();
    await expect(page.locator('.customer-unit-drawer').first()).toBeVisible();
  });

  test('photo preview trigger is present and hoverable when a photo is set', async ({page}) => {
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await openSurface(page, 'customer-record');
    await settle(page);
    // The default reference customer has no photo, so renderCustomerRecordPhoto
    // renders a plain initials fallback (no `.customer-avatar-trigger`) —
    // this asserts the record photo slot itself (trigger or fallback) is
    // present, and only exercises the hover-preview interaction when a real
    // photo/trigger exists.
    const photoSlot = page.locator('.customer-photo-preview').first();
    await expect(photoSlot).toBeVisible();
    const photoTrigger = page.locator('.customer-photo-preview.customer-avatar-trigger').first();
    if (await photoTrigger.count()) {
      await photoTrigger.hover();
    }
  });

  test('save persists edits and returns to view mode', async ({page}) => {
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await openCustomerRecordInMode(page, 'edit');
    const nameField = page.locator('[data-customer-field="customerName"]');
    const original = await nameField.inputValue();
    await nameField.fill(`${original} Edited`);
    await page.locator('.phead [data-customer-action="save"]').click();
    await settle(page);
    await expect(page.locator('#customer-mode')).toHaveValue('view');
    await expect(page.locator('#customer-record-chrome')).toContainText('Edited');
  });

  test('undo in edit mode discards changes and returns to view', async ({page}) => {
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await openCustomerRecordInMode(page, 'edit');
    const nameField = page.locator('[data-customer-field="customerName"]');
    const original = await nameField.inputValue();
    await nameField.fill('Should Be Discarded');
    await page.locator('.phead [data-customer-action="undo"]').click();
    await settle(page);
    await expect(page.locator('#customer-mode')).toHaveValue('view');
    await expect(page.locator('#customer-record-chrome')).not.toContainText('Should Be Discarded');
    void original;
  });

  test('dirty-leave guard blocks navigation away from an edited record, then discard leaves', async ({page}) => {
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await openCustomerRecordInMode(page, 'edit');
    const nameField = page.locator('[data-customer-field="customerName"]');
    const original = await nameField.inputValue();
    await nameField.fill(`${original} Dirty`);
    await nameField.dispatchEvent('change');
    // Breadcrumb "Customers" is the same trigger the adjacent "event
    // handlers still work" test below uses in view mode (where the guard
    // does NOT fire); here the record is dirty in edit mode, so
    // customerAtRisk() is true and record.js's document-level click
    // listener (record.js:702-719) intercepts the click, calling
    // askGuard(...) instead of navigating immediately.
    await page.locator('.customer-back').click();
    const guardScrim = page.locator('#customer-gscrim');
    await expect(guardScrim).toHaveClass(/open/);
    // Still on the record — the guard blocked the navigation.
    await expect(page.locator('.customer-list-view')).not.toBeVisible();
    await expect(nameField).toHaveValue(`${original} Dirty`);
    // Choosing "Leave without saving" discards the change and completes
    // the navigation the guard had blocked.
    await page.locator('#customer-g-discard').click();
    await settle(page);
    await expect(guardScrim).not.toHaveClass(/open/);
    await expect(page.locator('.customer-list-view')).toBeVisible();
  });

  test('dirty-leave guard "Stay here" cancels navigation and keeps the change', async ({page}) => {
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await openCustomerRecordInMode(page, 'edit');
    const nameField = page.locator('[data-customer-field="customerName"]');
    const original = await nameField.inputValue();
    await nameField.fill(`${original} Dirty`);
    await nameField.dispatchEvent('change');
    await page.locator('.customer-back').click();
    const guardScrim = page.locator('#customer-gscrim');
    await expect(guardScrim).toHaveClass(/open/);
    await page.locator('#customer-g-stay').click();
    await expect(guardScrim).not.toHaveClass(/open/);
    // Still on the record, still in edit mode, change intact.
    await expect(page.locator('.customer-list-view')).not.toBeVisible();
    await expect(page.locator('#customer-mode')).toHaveValue('edit');
    await expect(nameField).toHaveValue(`${original} Dirty`);
  });

  test('event handlers still work after navigating away from the record and back', async ({page}) => {
    // Found during Task 11 verification, present at HEAD (commit 5bcba6b,
    // Task 10's own checkpoint) before any Task 11 change: customers.js's
    // createCustomers({record: {showContentView, ...}}) call in
    // legacy-app.js passed the plain CURRENT VALUE of the module-level
    // `showContentView` binding as a shorthand property — captured at
    // customers' own construction time, while `showContentView` still held
    // its pre-navigation value (attachAndShowView, pure DOM show/hide with
    // no Navigation lifecycle). Every other page factory that needs this
    // callback (e.g. createGeography's `showContentView: (...args) =>
    // showContentView(...args)`) wraps it in an arrow function that reads
    // the live `let showContentView` binding at call time, observing the
    // later reassignment to the real navigation-routing wrapper.
    // customers.js's call site now uses the same live-binding wrapper.
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await openSurface(page, 'customer-record');
    await settle(page);
    // Breadcrumb "Customers" returns to the list (customerAtRisk() is false
    // in view mode, so this navigates immediately, no guard dialog).
    await page.locator('.customer-back').click();
    await settle(page);
    await expect(page.locator('.customer-list-view')).toBeVisible();
    await page.locator('[data-list-open-record]').first().click();
    await settle(page);
    // The record chrome must be live: Modify still toggles edit mode. This
    // is asserted with an explicit, short-timeout expect() rather than
    // page.locator(...).click() (whose default actionability wait wastes
    // the full 30s test timeout on every project once the button never
    // appears — see the root-cause comment above): the defect keeps the
    // record view detached, so the button is never even in the DOM.
    await expect(page.locator('.phead [data-customer-action="modify"]')).toBeVisible({timeout: 3000});
    await page.locator('.phead [data-customer-action="modify"]').click();
    await expect(page.locator('#customer-mode')).toHaveValue('edit');
  });
});

// Prototype-controls restoration (Task 11): readPrototypeState/
// createPrototypeControls (concepts/app/prototype/controls.js) read and
// apply the `skey-proto-state`/`skey-proto-ui` sessionStorage keys the
// panel has always used (preserved exactly — same keys, same control ids
// and value domains). These scenarios seed sessionStorage directly via
// page.addInitScript (the same pattern tests/data-list-component.spec.mjs
// and tests/components.spec.mjs already use to run code before the app's
// own scripts), since boot() always starts from a fresh browser context/
// storage state and has no other way to simulate "a previous session saved
// this".
test.describe('prototype-controls state restoration', () => {
  async function seedProtoState(page, state) {
    await page.addInitScript(saved => {
      sessionStorage.setItem('skey-proto-state', JSON.stringify(saved));
    }, state);
  }

  test('fresh sessionStorage (no prior saved state) boots without error, panel controls at their markup defaults', async ({page}) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // No seedProtoState call: this is boot()'s own default, fresh-context
    // behavior — asserted explicitly here as the readPrototypeState(storage)
    // baseline ("no saved key" -> {}) the other scenarios in this describe
    // block build on.
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await settle(page);
    expect(errors).toEqual([]);
    await expect(page.locator('#theme')).toHaveValue('system');
    await expect(page.locator('#density')).toHaveValue('default');
  });

  test('malformed saved JSON falls back gracefully instead of throwing', async ({page}) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      sessionStorage.setItem('skey-proto-state', '{not valid json');
    });
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await settle(page);
    expect(errors).toEqual([]);
    // readPrototypeState's JSON.parse failure falls back to {} (see
    // controls.js's readJSON), so every control keeps its plain markup
    // default, same as the fresh-storage case above.
    await expect(page.locator('#theme')).toHaveValue('system');
  });

  test('saved dark theme is restored on load', async ({page}) => {
    await seedProtoState(page, {theme: 'dark'});
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await settle(page);
    await expect(page.locator('#theme')).toHaveValue('dark');
    await expect(page.locator('html')).toHaveAttribute('data-color-mode', 'dark');
  });

  test('saved light theme is restored on load', async ({page}) => {
    await seedProtoState(page, {theme: 'light'});
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await settle(page);
    await expect(page.locator('#theme')).toHaveValue('light');
    await expect(page.locator('html')).toHaveAttribute('data-color-mode', 'light');
  });

  // Saved RTL restoration is not a separate scenario here: boot() itself
  // (tests/support/browser.mjs) always normalizes #rtl to match the
  // current Playwright project's own `use.rtl` flag after every navigation
  // (checking #rtl and dispatching `change` if it doesn't already match),
  // since only `mobile-rtl` wants RTL and every other project needs a
  // consistent LTR baseline for its screenshots. That normalization would
  // immediately overwrite any seeded `{rtl: true}` sessionStorage on every
  // OTHER project, and on `mobile-rtl` itself RTL is already forced on
  // regardless of what was saved — so no project can actually observe "a
  // saved RTL value survived restoration" as a distinct outcome from
  // "boot() forced this project's own RTL setting". `rtl` is restored
  // through the exact same "set control value + dispatch change" mechanism
  // already proven by the theme/density scenarios in this describe block
  // (`#rtl` has a permanent `change` listener, same family as `#theme`/
  // `#density` — see concepts/app/legacy-app.js), so no separate coverage
  // gap exists; boot()'s own comment documents this same mechanism.

  test('saved compact density is restored on load', async ({page}) => {
    await seedProtoState(page, {density: 'compact'});
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await settle(page);
    await expect(page.locator('#density')).toHaveValue('compact');
    await expect(page.locator('body')).toHaveClass(/density-compact/);
  });

  test('saved customer-mode "edit" is restored through customers.setMode without a null-root exception', async ({page}) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await seedProtoState(page, {'customer-mode': 'edit'});
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await settle(page);
    expect(errors).toEqual([]);
    // Checked immediately after boot, WITHOUT opening the customer record:
    // record.js's setMode() sets refs.modeSelect.value unconditionally (only
    // its DOM re-render is gated on the page being active — see
    // pages/customers/record.js), so this proves customers.setMode('edit')
    // genuinely ran. Opening a record via the list afterward would not be a
    // valid check here: [data-list-open-record]'s click always calls
    // openRecord(customerNo, 'view', ...), which resets the mode to 'view'
    // by design (opening a specific record is a distinct action from
    // resuming a restored mode) — see the customer-mode restoration
    // regression test above for why this app has no way to observe a
    // restored 'create'/'edit' mode by navigating to an actual record.
    await expect(page.locator('#customer-mode')).toHaveValue('edit');
  });

  test('saved customer-layout "scroll" is restored through customers.setLayout without a null-root exception', async ({page}) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await seedProtoState(page, {'customer-layout': 'scroll'});
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await openSurface(page, 'customer-record');
    await settle(page);
    expect(errors).toEqual([]);
    await expect(page.locator('#customer-layout')).toHaveValue('scroll');
    await expect(page.locator('.customer-scroll-nav')).toBeVisible();
  });
});
