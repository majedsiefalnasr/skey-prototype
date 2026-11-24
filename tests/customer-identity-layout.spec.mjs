import {expect, test} from '@playwright/test'

const BASE_URL = process.env.PARITY_URL ?? 'http://127.0.0.1:4173'
const SCREENS = [
  {name: 'customer', path: '/customers/list', open: '[data-list-row-key] [data-list-open-record]', ready: '#customer-record-chrome'},
  {name: 'people', path: '/help-screens/people-data', open: '.people-view [data-row-open]', ready: '.people-record-view'}
]

for (const screen of SCREENS) {
  for (const width of [390, 1024, 1100, 1439, 1440]) {
    test(`${screen.name} identity fields do not overlap the photo box at ${width}px`, async ({page}) => {
      await page.setViewportSize({width, height: 900})
      await page.goto(`${BASE_URL}${screen.path}`)
      const loading = page.locator('#simulate-loading')
      if (await loading.count() && await loading.isChecked()) await loading.uncheck()
      const kit = page.locator('#kit-min')
      if (await kit.count() && await kit.isVisible()) await kit.click()
      await page.locator(screen.open).first().click()
      await expect(page.locator(screen.ready)).toBeVisible()
      const overlapping = await page.evaluate(() => {
        const rect = el => el.getBoundingClientRect()
        const photo = document.querySelector('.customer-identity-photo')
        const photoBox = rect(photo)
        return [...document.querySelectorAll('.customer-identity-body > .customer-field-grid > *')]
          .filter(cell => !photo.contains(cell))
          .filter(cell => {
            const cellBox = rect(cell)
            return cellBox.width > 0 && cellBox.left < photoBox.right && cellBox.right > photoBox.left && cellBox.top < photoBox.bottom && cellBox.bottom > photoBox.top
          })
          .length
      })
      expect(overlapping).toBe(0)
    })
  }
}
