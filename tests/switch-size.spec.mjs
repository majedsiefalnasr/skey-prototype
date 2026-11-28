import {expect, test} from '@playwright/test'

const BASE_URL = process.env.PARITY_URL ?? 'http://127.0.0.1:4173'

const screens = [
  {name: 'Email', path: '/help-screens/email', inputs: ['[data-mail-select-all]', '[data-mail-unread-filter]']},
  {name: 'notifications panel', path: '/dashboard', open: 'button[data-i18n-aria-label="System Alerts"]', inputs: ['#notif-unread-only']},
]

const geometry = (input, checked) => input.evaluate((element, checked) => {
  element.checked = checked
  const track = element.nextElementSibling
  const box = track.getBoundingClientRect()
  const thumb = getComputedStyle(track, '::before')
  const size = parseFloat(thumb.width)
  const shift = thumb.translate === 'none' ? 0 : parseFloat(thumb.translate)
  const left = thumb.left === 'auto' ? box.width - parseFloat(thumb.right) - size + shift : parseFloat(thumb.left) + shift
  const rtl = getComputedStyle(track).direction === 'rtl'
  const fromStart = rtl ? box.width - left - size : left
  return {track: [box.width, box.height], thumb: [size, parseFloat(thumb.height)], top: parseFloat(thumb.top), fromStart, fromEnd: box.width - fromStart - size}
}, checked)

for (const rtl of [false, true]) {
  for (const screen of screens) {
    test(`${screen.name} switch is 32x16 with a 12px thumb (${rtl ? 'rtl' : 'ltr'})`, async ({page}) => {
      await page.goto(`${BASE_URL}${screen.path}`)
      await expect(page.locator('.skeleton-overlay')).toBeHidden()
      await page.locator('#rtl').evaluate((toggle, rtl) => {
        if (toggle.checked === rtl) return
        toggle.checked = rtl
        toggle.dispatchEvent(new Event('change', {bubbles: true}))
      }, rtl)
      if (screen.open) await page.locator(screen.open).filter({visible: true}).first().click()
      for (const selector of screen.inputs) {
        const input = page.locator(selector)
        await expect(input.locator('xpath=following-sibling::span[1]')).toBeVisible()
        await expect.poll(() => geometry(input, false)).toEqual({track: [32, 16], thumb: [12, 12], top: 2, fromStart: 2, fromEnd: 18})
        await expect.poll(() => geometry(input, true)).toEqual({track: [32, 16], thumb: [12, 12], top: 2, fromStart: 18, fromEnd: 2})
      }
    })
  }
}
