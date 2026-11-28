import {expect, test} from '@playwright/test'

const BASE_URL = process.env.PARITY_URL ?? 'http://127.0.0.1:4173'
const DENSITY_PADDING = {default: 16, compact: 12}

async function choose(page, id, value) {
  await page.locator(`#${id}`).evaluate((control, next) => {
    control.value = next
    control.dispatchEvent(new Event('change', {bubbles: true}))
  }, value)
}

const startOffset = (page, host, row) => page.evaluate(([host, row]) => {
  const visible = element => element.getClientRects().length > 0
  const container = [...document.querySelectorAll(host)].find(visible)
  const content = [...(container?.querySelectorAll(row) ?? [])].find(visible)
  return content ? Math.round(content.getBoundingClientRect().left - container.getBoundingClientRect().left) : null
}, [host, row])

for (const [density, padding] of Object.entries(DENSITY_PADDING)) {
  for (const [width, margin] of [[767, 16], [768, 16], [1023, 16], [1024, 32]]) {
    test(`boxed ${density} grid has a ${margin}px margin at ${width}px`, async ({page}) => {
      await page.setViewportSize({width, height: 900})
      await page.goto(`${BASE_URL}/customers/list`)
      await expect(page.locator('.skeleton-overlay')).toBeHidden()
      await page.locator('[data-list-open-record]').filter({visible: true}).first().evaluate(control => control.click())
      await expect(page.locator('.skeleton-overlay')).toBeHidden()
      await choose(page, 'content-layout', 'boxed')
      await choose(page, 'density', density)
      await expect(page.locator('.page-content')).toHaveCSS('padding-left', `${margin + padding}px`)
      await expect.poll(() => startOffset(page, '.page-action-bar', '.arow')).toBe(margin)
      await expect.poll(() => startOffset(page, '.page-footer', '.fnav')).toBe(margin)
    })
  }
}
