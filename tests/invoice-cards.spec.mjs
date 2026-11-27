// Invoice cards show the title and the document number whole (#45). A card
// narrower than 21rem gives both their own row under the checkbox, icon and
// status badge.

import {test, expect} from '@playwright/test'
import {boot, openSurface, settle} from './support/browser.mjs'

const BASE_URL = process.env.PARITY_URL ?? 'http://127.0.0.1:4173'
const WIDTHS = [320, 390, 600, 768, 1024, 1280, 1440]
const DENSITIES = ['default', 'compact', 'comfortable']

async function open(page, width) {
  await boot(page, BASE_URL)
  await openSurface(page, 'list')
  await settle(page)
  await page.setViewportSize({width, height: 844})
  await page.locator('[data-list-view="cards"]').first().evaluate(control => control.click())
  await expect(page.locator('.data-record-card-invoice').first()).toBeVisible()
  await settle(page)
}

async function forEachState(page, check) {
  for (const labels of ['fixture', 'longest']) {
    if (labels === 'longest') {
      await page.locator('.data-record-card-invoice header > .badge').evaluateAll(badges => {
        const longest = document.documentElement.dir === 'rtl' ? 'مسودة' : 'Deactivated'
        for (const badge of badges) badge.textContent = longest
      })
    }
    for (const density of DENSITIES) {
      await page.evaluate(value => {
        document.body.classList.remove('density-compact', 'density-comfortable')
        if (value !== 'default') document.body.classList.add(`density-${value}`)
      }, density)
      await settle(page)
      await check(`${density} density, ${labels} labels`)
    }
  }
}

function readIdentities(page) {
  return page.locator('.data-record-card-invoice').evaluateAll(cards => cards.map(card => {
    const title = card.querySelector('.data-record-card-identity strong')
    const number = card.querySelector('.data-record-card-identity span')
    const range = document.createRange()
    range.selectNodeContents(number)
    return {
      title: title.textContent,
      titleCut: title.scrollWidth > title.clientWidth,
      numberCut: number.scrollWidth > number.clientWidth,
      numberLines: new Set([...range.getClientRects()].map(rect => Math.round(rect.top))).size,
    }
  }))
}

for (const width of WIDTHS) {
  test(`invoice card titles and numbers are whole at ${width}px`, async ({page}) => {
    await open(page, width)
    await forEachState(page, async state => {
      const cards = await readIdentities(page)
      expect(cards.length, state).toBeGreaterThan(0)
      expect(cards.filter(card => card.titleCut || card.numberCut || card.numberLines !== 1), state).toEqual([])
    })
  })
}
