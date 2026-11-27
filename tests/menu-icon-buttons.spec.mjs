// Icon triggers in a `.menu` use the icon button size (#46): 32x32px with a
// fine pointer, and at least 44x44px on touch.

import {test, expect} from '@playwright/test'
import {boot, openSurface, settle} from './support/browser.mjs'

const BASE_URL = process.env.PARITY_URL ?? 'http://127.0.0.1:4173'
const SURFACES = ['launchpad', 'list', 'record', 'customers-list', 'customer-record', 'geo-record', 'email']

function readTriggers(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('.menu > button.ibtn')]
      .filter(button => button.getClientRects().length && getComputedStyle(button).visibility !== 'hidden')
      .map(button => {
        const box = button.getBoundingClientRect()
        return {name: button.getAttribute('aria-label'), width: Math.round(box.width), height: Math.round(box.height)}
      }))
}

for (const surface of SURFACES) {
  test(`${surface}: menu icon triggers use the icon button size`, async ({page}) => {
    await boot(page, BASE_URL)
    await openSurface(page, surface)
    await settle(page)
    const triggers = await readTriggers(page)
    expect(triggers.length).toBeGreaterThan(0)
    if (test.info().project.use.hasTouch) {
      expect(triggers.filter(trigger => trigger.width < 44 || trigger.height < 44)).toEqual([])
    } else {
      expect(triggers.filter(trigger => trigger.width !== 32 || trigger.height !== 32)).toEqual([])
    }
  })
}
