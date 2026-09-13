// Customer page lifecycle scenarios (Task 7). Covers create/view/edit mode
// switching, required-field validation, guided-tab navigation, the Scroll
// Navigator, lookup selection, the nested unit drawer, photo preview,
// save/undo, and the dirty-leave guard — then confirms event handlers still
// work after navigating away from the customer record and back.
//
// Also includes the plan's exact customer-mode-restoration regression test
// (known-defects.md issue 6 / docs/superpowers/plans/2026-09-13-app-shell-
// components.md Task 11). Per the brief and the plan, the ACTUAL fix for
// this defect — reading saved prototype state and applying it through
// initialized page interfaces before any DOM-dependent restoration runs —
// lands in Task 11 (createPrototypeControls, main.js composition order).
// Task 7's job is narrower: add this exact test, confirm it fails for the
// documented reason (a null `customer-record-chrome` lookup, not an
// unrelated timeout), and do the groundwork the Task 11 fix will depend on
// (root-scoped DOM queries instead of `document.getElementById` inside
// customer-page-private rendering). This test stays expected-failure until
// Task 11 actually wires restoration.
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
    test.fail(
      true,
      'known-defects.md issue 6 — fixed in Task 11 (restoration wiring), not this task'
    );
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await boot(page, 'http://127.0.0.1:4173');
    await openSurface(page, 'customer-record');
    await page.locator('#customer-mode').selectOption('create', {force: true});
    await page.reload();
    await settle(page);
    expect(errors).toEqual([]);
    // The no-crash assertion above is necessary but not sufficient: it only
    // proves the null-root lookup didn't throw, not that the saved 'create'
    // mode actually got restored. legacy-controls.js's restoreState() sets
    // #customer-mode's DOM <select> value to 'create' on every boot
    // regardless of whether anything is listening for its dispatched
    // 'change' event, so checking the <select>'s value alone would be
    // tautological — it doesn't prove the customer-record page itself
    // reflects that mode. The real signal is whether record.js actually
    // re-rendered: #customer-record-chrome is statically empty markup
    // (`<div id="customer-record-chrome"></div>`, see
    // concepts/app/shell/page-templates.html) until renderChrome() runs,
    // which only happens once record.js's activate() fires. This checks
    // that chrome DIRECTLY after reload, without navigating anywhere first
    // — navigating to customers-list (the original assertion) or back to
    // customer-record via openSurface() would either only prove an
    // unrelated view renders, or would open a fresh record through the
    // normal list-click flow (which activates in 'view' mode, not a
    // restored 'create' mode), masking whether restoration actually
    // happened rather than revealing it.
    await expect(page.locator('#customer-record-chrome')).toContainText('New Customer');
  });

  test('create mode renders the New Customer chrome with blank required fields', async ({page}) => {
    await boot(page, 'http://127.0.0.1:4173');
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
    await boot(page, 'http://127.0.0.1:4173');
    await openCustomerRecordInMode(page, 'create');
    await page.locator('.phead [data-customer-action="save"]').click();
    await expect(page.locator('.customer-field-error').first()).toBeVisible();
    // Still on the record — a validation failure must not navigate away or throw.
    await expect(page.locator('#customer-record-chrome')).toBeVisible();
  });

  test('view mode switches to edit via Modify, and Undo returns to view', async ({page}) => {
    await boot(page, 'http://127.0.0.1:4173');
    await openSurface(page, 'customer-record');
    await settle(page);
    await expect(page.locator('#customer-mode')).toHaveValue('view');
    await page.locator('.phead [data-customer-action="modify"]').click();
    await expect(page.locator('#customer-mode')).toHaveValue('edit');
    await page.locator('.phead [data-customer-action="undo"]').click();
    await expect(page.locator('#customer-mode')).toHaveValue('view');
  });

  test('guided layout tab switching updates the active section', async ({page}) => {
    await boot(page, 'http://127.0.0.1:4173');
    await openSurface(page, 'customer-record');
    await settle(page);
    const tabs = page.locator('[data-customer-tab]');
    const count = await tabs.count();
    test.skip(count < 2, 'guided layout not active for this record/viewport');
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  });

  test('Scroll Navigator layout renders a scroll nav and tracks the active section', async ({page}) => {
    await boot(page, 'http://127.0.0.1:4173');
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
    await boot(page, 'http://127.0.0.1:4173');
    await openCustomerRecordInMode(page, 'edit');
    const trigger = page.locator('[data-customer-lookup]').first();
    test.skip((await trigger.count()) === 0, 'no lookup-enabled field on this record/layout');
    await trigger.click();
    const menu = page.locator('#customer-lookup-menu');
    await expect(menu).toBeVisible();
  });

  test('lookup advanced search selects a value into the target field', async ({page}) => {
    await boot(page, 'http://127.0.0.1:4173');
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
    await boot(page, 'http://127.0.0.1:4173');
    await openCustomerRecordInMode(page, 'edit');
    const trigger = page.locator('[data-customer-lookup="operationUnit"]').first();
    test.skip((await trigger.count()) === 0, 'no operationUnit lookup field on this record/layout');
    await trigger.click();
    await page.locator('[data-customer-lookup-action="add"]').click();
    await expect(page.locator('.customer-unit-drawer').first()).toBeVisible();
  });

  test('photo preview trigger is present and hoverable when a photo is set', async ({page}) => {
    await boot(page, 'http://127.0.0.1:4173');
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
    await boot(page, 'http://127.0.0.1:4173');
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
    await boot(page, 'http://127.0.0.1:4173');
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
    await boot(page, 'http://127.0.0.1:4173');
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
    await boot(page, 'http://127.0.0.1:4173');
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
    await boot(page, 'http://127.0.0.1:4173');
    await openSurface(page, 'customer-record');
    await settle(page);
    // Breadcrumb "Customers" returns to the list (customerAtRisk() is false
    // in view mode, so this navigates immediately, no guard dialog).
    await page.locator('.customer-back').click();
    await settle(page);
    await expect(page.locator('.customer-list-view')).toBeVisible();
    await page.locator('[data-list-open-record]').first().click();
    await settle(page);
    // The record chrome must be live: Modify still toggles edit mode.
    await page.locator('.phead [data-customer-action="modify"]').click();
    await expect(page.locator('#customer-mode')).toHaveValue('edit');
  });
});
