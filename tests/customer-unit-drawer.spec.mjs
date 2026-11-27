// Narrow-screen layout of the Add Operation Unit drawer (#50). Below the sm
// breakpoint the General grid has one column, so every field must fill it. A
// field that keeps `grid-column: span 3` there creates two more columns and
// collapses the first one, which hides Parent Unit and covers its picker
// button with the next field.

import {test, expect} from '@playwright/test'
import {boot, openSurface, settle} from './support/browser.mjs'

const BASE_URL = process.env.PARITY_URL ?? 'http://127.0.0.1:4173'

async function openUnitDrawer(page) {
  await boot(page, BASE_URL)
  await openSurface(page, 'customer-record')
  await settle(page)
  await page.locator('#customer-mode').selectOption('edit', {force: true})
  await settle(page)
  await page.locator('[data-customer-lookup="operationUnit"]').first().click()
  await page.locator('[data-customer-lookup-action="add"]').click()
  const drawer = page.locator('#customer-unit-drawer-scrim .customer-unit-drawer')
  await expect(drawer).toBeVisible()
  return drawer
}

for (const width of [320, 390, 480]) {
  test(`every General field fills the single column at ${width}px`, async ({page}) => {
    const drawer = await openUnitDrawer(page)
    await page.setViewportSize({width, height: 844})
    await settle(page)
    const narrowed = await drawer.locator('.customer-unit-general .customer-form-grid').evaluate(grid => {
      const column = grid.getBoundingClientRect().width
      return [...grid.children]
        .map(field => ({
          field: field.textContent.trim().split(/\s{2,}|\n/)[0],
          missing: Math.round(column - field.getBoundingClientRect().width),
        }))
        .filter(({missing}) => Math.abs(missing) > 1)
    })
    expect(narrowed).toEqual([])
  })
}

test('the Parent Unit hierarchy button opens the unit picker at 390px', async ({page}, info) => {
  const drawer = await openUnitDrawer(page)
  await page.setViewportSize({width: 390, height: 844})
  await settle(page)
  const button = drawer.locator('[data-unit-picker-open="customer-unit-parent"]')
  if (info.project.use.hasTouch) await button.tap({timeout: 5000})
  else await button.click({timeout: 5000})
  await expect(page.locator('#unit-picker-scrim .dlg')).toBeVisible()
})
