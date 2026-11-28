// Narrow-screen layout of the Customer add dialogs: Add Operation Unit (#50),
// Add Parent Unit and Add Customer Type (#51). Below the sm breakpoint each
// General grid has one column, so every field must fill it. A field that keeps
// `grid-column: span 3` there creates two more columns and squeezes the first
// one. In the unit drawer that hid Parent Unit and covered its picker button
// with the next field.

import {test, expect} from '@playwright/test'
import {boot, openSurface, settle} from './support/browser.mjs'

const BASE_URL = process.env.PARITY_URL ?? 'http://127.0.0.1:4173'

async function openLookupAdd(page, lookup) {
  await boot(page, BASE_URL)
  await openSurface(page, 'customer-record')
  await settle(page)
  await page.locator('#customer-mode').selectOption('edit', {force: true})
  await settle(page)
  await page.locator(`[data-customer-lookup="${lookup}"]`).first().click()
  await page.locator('[data-customer-lookup-action="add"]').click()
}

async function openUnitDrawer(page) {
  await openLookupAdd(page, 'operationUnit')
  const drawer = page.locator('#customer-unit-drawer-scrim .customer-unit-drawer')
  await expect(drawer).toBeVisible()
  return drawer
}

const dialogs = {
  'Add Operation Unit': async page => {
    const drawer = await openUnitDrawer(page)
    return drawer.locator('.customer-unit-general .customer-form-grid')
  },
  'Add Parent Unit': async page => {
    await openUnitDrawer(page)
    await page.locator('#customer-unit-parent-trigger').click()
    await page.locator('#customer-unit-lookup-menu [data-customer-lookup-action="add"]').click()
    return page.locator('#customer-parent-unit-drawer-scrim .customer-form-grid')
  },
  'Add Customer Type': async page => {
    await openLookupAdd(page, 'customerType')
    return page.locator('#customer-type-add-scrim .customer-form-grid')
  },
}

for (const [name, open] of Object.entries(dialogs)) {
  for (const width of [320, 390, 480, 767]) {
    test(`${name}: every General field fills the single column at ${width}px`, async ({page}) => {
      const grid = await open(page)
      await expect(grid).toBeVisible()
      await page.setViewportSize({width, height: 844})
      await settle(page)
      const narrowed = await grid.evaluate(element => {
        const style = getComputedStyle(element)
        const column = element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
        return [...element.children]
          .map(field => ({
            field: field.textContent.trim().split(/\s{2,}|\n/)[0],
            missing: Math.round(column - field.getBoundingClientRect().width),
          }))
          .filter(({missing}) => Math.abs(missing) > 1)
      })
      expect(narrowed).toEqual([])
    })
  }
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
