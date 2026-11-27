// Invoice cards show the title and the document number whole, and keep their
// content inside the card (#45). A card narrower than 21rem gives the title and
// number their own row; one narrower than 16rem also stacks the totals.

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

function readContainment(page) {
  return page.locator('.data-record-card-invoice').evaluateAll(cards => ({
    escaped: cards.flatMap(card => {
      const outer = card.getBoundingClientRect()
      return [...card.querySelectorAll('*')].filter(element => {
        if (element.closest('details:not([open]) > :not(summary), .sr-only, .tip')) return false
        const box = element.getBoundingClientRect()
        return box.width > 0 && (box.left < outer.left - 0.5 || box.right > outer.right + 0.5)
      }).map(element => element.className)
    }),
    cutTotals: cards.flatMap(card => [...card.querySelectorAll('.data-record-card-snapshot strong')]
      .filter(element => element.scrollWidth > element.clientWidth)
      .map(element => element.textContent)),
    overlappingTotals: cards.filter(card => {
      const [customer, total] = [...card.querySelectorAll('.data-record-card-snapshot > div')]
        .map(column => [...column.children].map(child => {
          const range = document.createRange()
          range.selectNodeContents(child)
          return range.getBoundingClientRect()
        }))
      return customer.some(first => total.some(second =>
        Math.min(first.right, second.right) - Math.max(first.left, second.left) > 0.5 &&
        Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top) > 3))
    }).length,
    sidewaysScroll: (() => {
      const found = []
      for (let node = cards[0]?.parentElement; node; node = node.parentElement) {
        if (node.scrollWidth > node.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(node).overflowX)) {
          found.push(node.className)
        }
      }
      return found
    })(),
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

  test(`invoice card content stays inside the card at ${width}px`, async ({page}) => {
    await open(page, width)
    await forEachState(page, async state => {
      expect(await readContainment(page), state).toEqual({
        escaped: [],
        cutTotals: [],
        overlappingTotals: 0,
        sidewaysScroll: [],
      })
    })
  })
}
