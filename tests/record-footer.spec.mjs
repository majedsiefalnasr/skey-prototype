// Invoice and customer record footers keep every control inside their padding
// and their status text readable (#49). From `sm` (768px) up the row wraps, and
// a narrow row puts the status text on its own last line: below 860px for the
// invoice and below 740px for the customer record.

import {test, expect} from '@playwright/test'
import {boot, openSurface, settle} from './support/browser.mjs'

const BASE_URL = process.env.PARITY_URL ?? 'http://127.0.0.1:4173'
const WIDTHS = [768, 900, 912, 940, 1023, 1024, 1100, 1176, 1180, 1280, 1440]
const STATES = [
  {name: 'posted invoice', surface: 'record', status: 'posted', mode: 'record'},
  {name: 'draft invoice', surface: 'record', status: 'draft', mode: 'record'},
  {name: 'edited invoice', surface: 'record', status: 'open', mode: 'edit'},
  {name: 'new invoice', surface: 'record', status: 'open', mode: 'create'},
  {name: 'customer record', surface: 'customer-record'},
]
const LAST_LINE_LIMITS = [
  {name: 'posted invoice', surface: 'record', note: '.lockbanner', limit: 860},
  {name: 'customer record', surface: 'customer-record', note: '.customer-footer-note', limit: 740},
]

async function setControl(page, id, value) {
  await page.locator(`#${id}`).evaluate((element, next) => {
    if (element.type === 'checkbox') element.checked = next
    else element.value = next
    element.dispatchEvent(new Event('change', {bubbles: true}))
  }, value)
}

function readFooter(page) {
  return page.evaluate(() => {
    const row = [...document.querySelectorAll('.page-footer > .fnav')].find(element => element.getClientRects().length)
    const style = getComputedStyle(row)
    const outer = row.getBoundingClientRect()
    const left = outer.left + parseFloat(style.paddingLeft)
    const right = outer.right - parseFloat(style.paddingRight)
    const parts = [...row.querySelectorAll('button, input, .pos, .lockbanner, .customer-footer-note')]
      .filter(element => element.getClientRects().length && !element.closest('.tip'))
    const name = element => element.id || element.className
    const lines = element => {
      const tops = []
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node.parentElement.closest('.tip')) continue
        for (const word of node.textContent.matchAll(/\S+/g)) {
          const range = document.createRange()
          range.setStart(node, word.index)
          range.setEnd(node, word.index + word[0].length)
          const rect = range.getClientRects()[0]
          if (rect && !tops.some(top => Math.abs(top - rect.top) < 7)) tops.push(rect.top)
        }
      }
      return tops.length
    }
    return {
      outside: parts.filter(part => {
        const box = part.getBoundingClientRect()
        return box.left < left - 0.5 || box.right > right + 0.5
      }).map(name),
      tallText: parts.filter(part => part.matches('.pos, .lockbanner, .customer-footer-note') && lines(part) > 3).map(name),
      overlaps: parts.flatMap((first, index) => parts.slice(index + 1).filter(second => {
        if (first.contains(second) || second.contains(first)) return false
        const a = first.getBoundingClientRect()
        const b = second.getBoundingClientRect()
        return Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 &&
          Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5
      }).map(second => `${name(first)} / ${name(second)}`)),
      sidewaysScroll: [document.scrollingElement, document.querySelector('.content'), document.querySelector('.page-content')]
        .filter(element => element.scrollWidth > element.clientWidth + 1)
        .map(element => element.className),
    }
  })
}

for (const {name, surface, note, limit} of LAST_LINE_LIMITS) {
  test(`${name} status text takes the last line only below a ${limit}px row`, async ({page}) => {
    await boot(page, BASE_URL)
    await openSurface(page, surface)
    await settle(page)
    if (surface === 'record') {
      await setControl(page, 'st', 'posted')
      await setControl(page, 'mode', 'record')
    }
    const readings = []
    for (const width of WIDTHS) {
      await page.setViewportSize({width, height: 900})
      for (const layout of ['fluid', 'boxed']) {
        await setControl(page, 'content-layout', layout)
        await settle(page)
        const reading = await page.locator(`.page-footer > .fnav ${note}:visible`).evaluate(element => {
          const row = element.parentElement
          const style = getComputedStyle(row)
          return {
            row: row.getBoundingClientRect().width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
            order: getComputedStyle(element).order,
            basis: getComputedStyle(element).flexBasis,
          }
        })
        readings.push({width, layout, ...reading})
      }
    }
    expect(readings.filter(reading => {
      const narrow = reading.row < limit
      return reading.order !== (narrow ? '1' : '0') || (reading.basis === '100%') !== narrow
    })).toEqual([])
    expect([...new Set(readings.map(reading => reading.row < limit))].sort()).toEqual([false, true])
  })
}

for (const state of STATES) {
  for (const width of WIDTHS) {
    test(`${state.name} footer fits at ${width}px`, async ({page}) => {
      await boot(page, BASE_URL)
      await openSurface(page, state.surface)
      await settle(page)
      if (state.status) {
        await setControl(page, 'st', state.status)
        await setControl(page, 'mode', state.mode)
        await expect(page.locator('#mode')).toHaveValue(state.mode)
      }
      await page.setViewportSize({width, height: 900})
      for (const rtl of [false, true]) {
        await setControl(page, 'rtl', rtl)
        for (const layout of ['fluid', 'boxed']) {
          await setControl(page, 'content-layout', layout)
          await settle(page)
          expect(await readFooter(page), `${rtl ? 'rtl' : 'ltr'}, ${layout}`).toEqual({
            outside: [],
            tallText: [],
            overlaps: [],
            sidewaysScroll: [],
          })
        }
      }
    })
  }
}
