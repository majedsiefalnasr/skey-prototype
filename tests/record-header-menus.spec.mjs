// The invoice record header menus stay inside the scrolling page (#53). A menu
// grows from its trigger's end edge and moves back inside only when that would
// cross a side of the page.

import {test, expect} from '@playwright/test'
import {boot, openSurface, settle} from './support/browser.mjs'

const BASE_URL = process.env.PARITY_URL ?? 'http://127.0.0.1:4173'
const MODES = [['record', 'posted'], ['edit', 'open'], ['create', 'open']]
const TRIGGERS = '.recacts .menu > button[aria-haspopup="menu"], .savewrap > button[aria-haspopup="menu"]'

async function open(page, mode, status, width) {
  await boot(page, BASE_URL)
  await openSurface(page, 'record')
  await settle(page)
  await page.setViewportSize({width, height: 844})
  await page.evaluate(([mode, status]) => {
    for (const [id, value] of [['st', status], ['mode', mode]]) {
      const control = document.getElementById(id)
      control.value = value
      control.dispatchEvent(new Event('change', {bubbles: true}))
    }
  }, [mode, status])
  await settle(page)
}

function readMenu(trigger) {
  return trigger.evaluate(button => {
    const list = button.parentElement.querySelector(':scope > .mlist')
    const scroller = list.closest('.page-content')
    const start = scroller.getBoundingClientRect().left + scroller.clientLeft
    const outer = list.getBoundingClientRect()
    const anchor = button.getBoundingClientRect()
    const rtl = document.documentElement.dir === 'rtl'
    return {
      past: Math.max(0, start - outer.left, outer.right - start - scroller.clientWidth),
      fromTriggerEnd: rtl ? outer.left - anchor.left : outer.right - anchor.right,
      unreachable: [...list.querySelectorAll('[role="menuitem"]')]
        .filter(item => item.getClientRects().length)
        .filter(item => {
          item.scrollIntoView({block: 'nearest', inline: 'nearest'})
          const box = item.getBoundingClientRect()
          return !item.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2))
        })
        .map(item => item.textContent.trim()),
    }
  })
}

for (const [mode, status] of MODES) {
  for (const width of [320, 390, 480, 600, 1440]) {
    test(`${mode}: header menus stay inside the page at ${width}px`, async ({page}) => {
      await open(page, mode, status, width)
      const triggers = page.locator(TRIGGERS).filter({visible: true})
      const count = await triggers.count()
      expect(count).toBeGreaterThan(0)
      for (let index = 0; index < count; index++) {
        const trigger = triggers.nth(index)
        await trigger.evaluate(button => button.scrollIntoView({block: 'center', inline: 'nearest'}))
        await trigger.dispatchEvent('click')
        await expect(trigger).toHaveAttribute('aria-expanded', 'true')
        const name = await trigger.getAttribute('aria-label') ?? (await trigger.textContent()).trim()
        const reading = await readMenu(trigger)
        expect.soft(reading.past, `${name} past the page edge`).toBeLessThan(0.5)
        expect.soft(reading.unreachable, `${name} unreachable items`).toEqual([])
        if (width >= 600) expect.soft(Math.abs(reading.fromTriggerEnd), `${name} offset from the trigger`).toBeLessThan(0.5)
        await trigger.dispatchEvent('click')
      }
    })
  }
}
