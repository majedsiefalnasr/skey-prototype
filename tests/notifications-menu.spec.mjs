// The System Alerts menu stays inside the viewport (#47). Below `xs` (480px)
// the bell leaves less room than the menu is wide, so the menu anchors to the
// end of the top-bar actions. From `xs` up it stays anchored to the bell.

import {test, expect} from '@playwright/test'
import {boot, openSurface, settle} from './support/browser.mjs'

const BASE_URL = process.env.PARITY_URL ?? 'http://127.0.0.1:4173'
const INSET = 8

const trigger = page => page.locator('button[aria-controls="notifications-popover"]')
const menu = page => page.locator('#notifications-popover')

async function open(page, surface, width) {
  await boot(page, BASE_URL)
  await openSurface(page, surface)
  await settle(page)
  await page.setViewportSize({width, height: 844})
  await settle(page)
  await trigger(page).click()
  await expect(menu(page).locator('.notif-row').first()).toBeVisible()
}

function readMenu(page) {
  return menu(page).evaluate(popover => {
    const outer = popover.getBoundingClientRect()
    const bell = document.querySelector('button[aria-controls="notifications-popover"]').getBoundingClientRect()
    const rtl = document.documentElement.dir === 'rtl'
    const parts = [...popover.querySelectorAll('.notif-hd, .notif-tabs, [role="tab"], .switch, .notif-body > *')]
    return {
      left: outer.left,
      right: document.documentElement.clientWidth - outer.right,
      bottom: innerHeight - outer.bottom,
      menuOverflow: popover.scrollHeight - popover.clientHeight,
      outside: parts.filter(part => {
        const box = part.getBoundingClientRect()
        return box.left < outer.left || box.right > outer.right
      }).map(part => part.className),
      fromBellEnd: rtl ? outer.left - bell.left : outer.right - bell.right,
    }
  })
}

for (const surface of ['launchpad', 'list']) {
  for (const width of [320, 390, 479, 480, 768, 1024, 1440]) {
    test(`${surface}: the alerts menu fits at ${width}px and only its list scrolls`, async ({page}) => {
      await open(page, surface, width)
      for (const tab of ['direct', 'email']) {
        await menu(page).locator(`[data-tab="${tab}"]`).click()
        const reading = await readMenu(page)
        expect(reading.left, `${tab} left inset`).toBeGreaterThanOrEqual(INSET)
        expect(reading.right, `${tab} right inset`).toBeGreaterThanOrEqual(INSET)
        expect(reading.bottom, `${tab} bottom inset`).toBeGreaterThanOrEqual(0)
        expect(reading.outside, `${tab} parts outside the menu`).toEqual([])
        expect(reading.menuOverflow, `${tab} menu overflow`).toBeLessThanOrEqual(0)
        if (width >= 480) expect(Math.abs(reading.fromBellEnd), `${tab} offset from the bell`).toBeLessThan(1)
      }
    })
  }
}
