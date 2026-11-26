// Focus return and stacking for dialogs (#31). The shared focus stack in
// concepts/app/components/dialog/dialog.js returns focus to the control that
// opened a dialog: the menu button for a menu item, and the parent dialog's
// trigger for a nested dialog. The operation unit picker stacks above the
// unit drawer that opens it, and Escape closes the picker alone.

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
