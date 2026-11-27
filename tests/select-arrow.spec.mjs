// Space reserved for the custom select arrow (#52). The arrow is placed by page
// direction, so the padding that reserves its space must be physical. Logical
// padding follows each select's own direction, which differs from the page for
// a left-to-right value on a right-to-left page, and for a dir="auto" Arabic
// value on a left-to-right page.

import {test, expect} from '@playwright/test'
import {boot, openSurface, settle} from './support/browser.mjs'

const BASE_URL = process.env.PARITY_URL ?? 'http://127.0.0.1:4173'

async function open(page, surface) {
  await boot(page, BASE_URL)
  await openSurface(page, surface)
  await settle(page)
  if (surface === 'customer-record') {
    await page.locator('#customer-mode').selectOption('edit', {force: true})
    await settle(page)
  }
}

async function openUnitDrawer(page) {
  await open(page, 'customer-record')
  await page.locator('[data-customer-lookup="operationUnit"]').first().click()
  await page.locator('[data-customer-lookup-action="add"]').click()
  await expect(page.locator('#customer-unit-drawer-scrim .customer-unit-drawer')).toBeVisible()
}

const states = {
  'invoice list': page => open(page, 'list'),
  'invoice record': page => open(page, 'record'),
  'customer list': page => open(page, 'customers-list'),
  'customer record': page => open(page, 'customer-record'),
  'geography list': page => open(page, 'geo-list'),
  'geography record': page => open(page, 'geo-record'),
  'Add Operation Unit': openUnitDrawer,
  'Add Parent Unit': async page => {
    await openUnitDrawer(page)
    await page.locator('#customer-unit-parent-trigger').click()
    await page.locator('#customer-unit-lookup-menu [data-customer-lookup-action="add"]').click()
    await expect(page.locator('#customer-parent-unit-timezone')).toBeVisible()
  },
}

const cases = [
  {name: 'a right-to-left select on a right-to-left page', rtl: true, surface: 'customer-record', select: '#customer-field-customerType', direction: 'rtl', left: '28px', right: '8px'},
  {name: 'a left-to-right select on a right-to-left page', rtl: true, surface: 'customer-record', select: '#customer-field-accountCode', direction: 'ltr', left: '28px', right: '8px'},
  {name: 'a dir="auto" Arabic value on a left-to-right page', rtl: false, surface: 'record', select: '#record-field-9', direction: 'rtl', left: '8px', right: '28px'},
]

for (const {name, rtl, surface, select, direction, left, right} of cases) {
  test(`reserves the arrow space for ${name}`, async ({page}, info) => {
    test.skip(Boolean(info.project.use.rtl) !== rtl, `needs a ${rtl ? 'right-to-left' : 'left-to-right'} page`)
    await open(page, surface)
    const control = page.locator(select)
    await expect(control).toHaveCSS('direction', direction)
    await expect(control).toHaveCSS('padding-left', left)
    await expect(control).toHaveCSS('padding-right', right)
  })
}

for (const [name, show] of Object.entries(states)) {
  test(`${name}: every custom select keeps its arrow space on the arrow side`, async ({page}) => {
    await show(page)
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({width, height: 844})
      await settle(page)
      const selects = await page.locator('select').evaluateAll(nodes => nodes.flatMap(node => {
        const style = getComputedStyle(node)
        if (style.backgroundImage === 'none') return []
        const side = style.backgroundPositionX.includes('100%') ? 'right' : 'left'
        const offset = parseFloat(style.backgroundPositionX.match(/([\d.]+)px/)?.[1] ?? '0')
        const arrowEnd = offset + parseFloat(style.backgroundSize)
        const left = parseFloat(style.paddingLeft)
        const right = parseFloat(style.paddingRight)
        const [arrowSide, otherSide] = side === 'left' ? [left, right] : [right, left]
        return [{select: node.id || node.getAttribute('aria-label') || node.name, side, left, right, reserved: arrowSide >= arrowEnd && otherSide < arrowEnd}]
      }))
      expect(selects.length, `custom selects at ${width}px`).toBeGreaterThan(0)
      expect(selects.filter(entry => !entry.reserved), `selects at ${width}px`).toEqual([])
    }
  })
}
