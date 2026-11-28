// Focus return and stacking for dialogs (#31). The shared focus stack in
// concepts/app/components/dialog/dialog.js returns focus to the control that
// opened a dialog: the menu button for a menu item, and the parent dialog's
// trigger for a nested dialog. The operation unit picker stacks above the
// unit drawer that opens it, and Escape closes the picker alone. Escape also
// closes dialogs that had no handler of their own: through the header close
// button, through the dialog rather than a menu behind it, and through the
// backdrop of an unsaved-changes guard, which keeps the change. Below the
// geography breakpoint the location hierarchy is itself a dialog, and Escape
// on a dialog above it closes that dialog alone.

import {test, expect} from '@playwright/test'
import {boot, openSurface, settle} from './support/browser.mjs'

const BASE_URL = process.env.PARITY_URL ?? 'http://127.0.0.1:4173'
const visible = (page, selector) => page.locator(selector).filter({visible: true}).first()

test.beforeEach(async ({page}) => {
  test.skip(page.viewportSize().width < 1024, 'The triggers below are desktop controls')
  await boot(page, BASE_URL)
})

test('a dialog opened from the account menu returns focus to the menu button', async ({page}) => {
  await page.locator('.avatar-btn').click()
  await visible(page, '.help-kbd').click()
  await expect(page.locator('#kscrim .kbdsheet')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('#kscrim .kbdsheet')).toBeHidden()
  await expect(page.locator('.avatar-btn')).toBeFocused()
})

test('a dialog opened from a row menu returns focus to the row menu summary', async ({page}) => {
  await openSurface(page, 'customers-list')
  await settle(page)
  const row = page.locator('[data-data-list="customer"] [data-list-row-key]:not(:has(.badge.danger))').first()
  const summary = row.locator('summary[aria-label^="Actions for"]')
  await summary.click()
  await visible(page, '[data-list-row-action="change-status"]').click()
  const dialog = page.locator('#customer-status-scrim .dlg')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', {name: 'Close'}).first().click()
  await expect(dialog).toBeHidden()
  await expect(summary).toBeFocused()
})

test('the operation unit picker stacks above the unit drawer and closes alone', async ({page}) => {
  await openSurface(page, 'customer-record')
  await settle(page)
  await page.locator('#customer-mode').selectOption('edit', {force: true})
  await settle(page)
  await page.locator('[data-customer-lookup="operationUnit"]').first().click()
  await page.locator('[data-customer-lookup-action="add"]').click()
  const drawer = page.locator('#customer-unit-drawer-scrim .customer-unit-drawer')
  await expect(drawer).toBeVisible()
  const trigger = page.locator('[data-unit-picker-open="customer-unit-parent"]')
  await trigger.click()
  const picker = page.locator('#unit-picker-scrim .dlg')
  await expect(picker).toBeVisible()
  const onTop = await picker.evaluate(element => {
    const box = element.getBoundingClientRect()
    return element.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2))
  })
  expect(onTop).toBe(true)
  await page.keyboard.press('Escape')
  await expect(picker).toBeHidden()
  await expect(drawer).toBeVisible()
  await expect(trigger).toBeFocused()
})

test('Escape closes a dialog through its header close button', async ({page}) => {
  await openSurface(page, 'customers-list')
  await settle(page)
  const row = page.locator('[data-data-list="customer"] [data-list-row-key]:not(:has(.badge.danger))').first()
  const summary = row.locator('summary[aria-label^="Actions for"]')
  await summary.click()
  await visible(page, '[data-list-row-action="change-status"]').click()
  const dialog = page.locator('#customer-status-scrim .dlg')
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(summary).toBeFocused()
})

test('Escape closes Manage filters, not the menu behind it', async ({page}) => {
  await openSurface(page, 'list')
  await settle(page)
  const filterMode = mode =>
    page.locator('#filter-mode').evaluate((select, value) => {
      select.value = value
      select.dispatchEvent(new Event('change', {bubbles: true}))
    }, mode)
  await filterMode('modal')
  await visible(page, '[data-list-open-filters]').click()
  await visible(page, '.geo-filter-modal input[data-geo-filter-field]').fill('1')
  await visible(page, '.geo-filter-modal .geo-filter-close.pri').click()
  await filterMode('inline')
  await visible(page, '[data-list-save-view]').click()
  await page.locator('#save-filter-name').fill('Escape filter')
  await page.locator('#save-filter-confirm').click()
  await visible(page, 'details:has([data-list-manage-filters]) > summary').click()
  await visible(page, '[data-list-manage-filters]').click()
  const dialog = visible(page, '.manage-filters-modal')
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.manage-filters-modal').filter({visible: true})).toHaveCount(0)
})

test('Escape on the table layout guard keeps editing', async ({page}) => {
  await openSurface(page, 'list')
  await settle(page)
  await visible(page, '.data-page-manage > summary').click()
  await visible(page, '.data-page-manage details:has([data-list-manage-statistics-concept]) > summary').click()
  await visible(page, 'label:has([data-list-manage-statistics-concept]:not(:checked))').click()
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  const add = page.locator('#list-add')
  const guard = page.locator('#list-layout-guard .dlg')
  await add.click()
  await expect(guard).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(guard).toBeHidden()
  await expect(page.locator('.list-view')).toBeVisible()
  await add.click()
  await expect(guard).toBeVisible()
})

test('Escape over the phone location hierarchy closes only the top dialog', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844})
  await openSurface(page, 'geo-record')
  await settle(page)
  await visible(page, '[data-geo-tree-collapse]').click()
  const hierarchy = page.locator('#geo-hierarchy-scrim .dlg')
  await expect(hierarchy).toBeVisible()
  await visible(page, '#geo-hierarchy-panel [data-geo-view="flow"]').click()
  await visible(page, '[data-geo-flow-fullscreen]').click()
  // A mouse click hovers the node first, and its action toolbar then covers
  // the centre, so the click is dispatched. A finger tap reaches the node.
  const node = visible(page, '#geo-flow-pane [data-geo-node]')
  await node.focus()
  await node.dispatchEvent('click')
  const details = page.locator('#geo-flow-node-scrim .dlg')
  await expect(details).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(details).toBeHidden()
  await expect(hierarchy).toBeVisible()
  await expect(node).toBeFocused()
})
