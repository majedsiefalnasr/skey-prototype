import {expect, test} from '@playwright/test'

const BASE_URL = process.env.PARITY_URL ?? 'http://127.0.0.1:4173'
const CARD_SCREENS = [
  {name: 'people', path: '/help-screens/people-data', cards: '[data-view-select="cards"]'},
  {name: 'customer', path: '/customers/list', cards: '[data-list-view="cards"]'},
  {name: 'invoice', path: '/sales-systems-management/sales-invoices', cards: '[data-list-view="cards"]'}
]

async function open(page, width, path) {
  await page.setViewportSize({width, height: 900})
  await page.goto(`${BASE_URL}${path}`)
  await expect(page.locator('.skeleton-overlay')).toBeHidden()
}

const columnCount = locator => locator.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length)

for (const screen of CARD_SCREENS) {
  for (const [width, columns] of [[1280, 2], [1439, 2], [1440, 3]]) {
    test(`${screen.name} cards switch to three columns at lg (${width}px)`, async ({page}) => {
      await open(page, width, screen.path)
      await page.locator(screen.cards).first().evaluate(control => control.click())
      const grid = page.locator('.data-card-grid').filter({visible: true})
      await expect(grid).toBeVisible()
      expect(await columnCount(grid)).toBe(columns)
    })
  }
}

for (const [width, columns] of [[479, 1], [480, 2]]) {
  test(`statistics switch to two columns at xs (${width}px)`, async ({page}) => {
    await open(page, width, '/sales-systems-management/sales-invoices')
    const statistics = page.locator('.data-statistics').filter({visible: true})
    if (!(await statistics.count())) {
      await page.locator('[data-list-manage-action="statistics-status"]').first().evaluate(control => control.click())
    }
    await expect(statistics).toBeVisible()
    expect(await columnCount(statistics)).toBe(columns)
  })
}
