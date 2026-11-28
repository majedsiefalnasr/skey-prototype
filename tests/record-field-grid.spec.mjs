// Record field grids shrink to their card on phone widths, and below 390px
// inline labels sit above their values (#58).
import {expect, test} from '@playwright/test'

const BASE_URL = process.env.PARITY_URL ?? 'http://127.0.0.1:4173'
const WIDTHS = [320, 360, 375, 389, 390]
const STACKED_BELOW = 390
const MINIMUM_CONTROL_WIDTH = 96
const SCREENS = [
  {name: 'invoice', path: '/sales-systems-management/sales-invoices', grids: 6},
  {name: 'customer', path: '/customers/list', grids: 6},
  {name: 'people', path: '/help-screens/people-data', grids: 4},
  {name: 'geography', path: '/system-setup/geographical-structure', grids: 1},
]

function readGrids(minimumControlWidth) {
  const wide = []
  const past = []
  const narrow = []
  const clippedSwitches = []
  let grids = 0
  for (const grid of document.querySelectorAll('.page-content .rec-card-body, .page-content .customer-field-grid')) {
    if (grid.closest('.data-list-chart-body')) continue
    const revealed = []
    for (let node = grid; node && node !== document.body; node = node.parentElement) {
      if (node.hidden && node.matches('[role="tabpanel"], .rec-card-body')) {
        node.hidden = false
        revealed.push(node)
      }
    }
    const style = getComputedStyle(grid)
    if (grid.getClientRects().length && style.display === 'grid') {
      grids += 1
      const inner = grid.getBoundingClientRect().width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      const card = (grid.closest('.rec-card, .customer-section') ?? grid.parentElement).getBoundingClientRect()
      for (const field of grid.children) {
        const box = field.getBoundingClientRect()
        if (!box.width) continue
        const name = field.querySelector('[id]')?.id ?? field.textContent.trim().slice(0, 30)
        if (box.width > inner + 0.5) wide.push(name)
        const parts = [field, ...field.querySelectorAll('input, select, textarea, button, label, p')]
        const outside = parts.some(part => {
          const rect = part.getBoundingClientRect()
          return rect.width > 1 && Math.max(rect.right - card.right, card.left - rect.left) > 0.5
        })
        if (outside) past.push(name)
        for (const control of field.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]), select, textarea')) {
          if (!control.getClientRects().length) continue
          const rect = control.getBoundingClientRect()
          const visible = Math.min(rect.right, card.right) - Math.max(rect.left, card.left)
          if (visible < minimumControlWidth) narrow.push(`${name} ${Math.round(visible)}`)
        }
        for (const track of field.querySelectorAll('.customer-dialog-toggle-track')) {
          const rect = track.getBoundingClientRect()
          const frame = track.closest('.customer-dialog-toggle').getBoundingClientRect()
          const clipped = Math.max(rect.right - frame.right, frame.left - rect.left, rect.bottom - frame.bottom, frame.top - rect.top)
          if (clipped > 0.5) clippedSwitches.push(name)
        }
      }
    }
    for (const node of revealed) node.hidden = true
  }
  return {grids, wide, past, narrow, clippedSwitches}
}

for (const screen of SCREENS) {
  for (const labels of ['default', 'inline']) {
    test(`${screen.name} record fields stay inside their cards with ${labels} labels`, async ({page}, testInfo) => {
      test.skip(!['mobile-touch', 'mobile-rtl'].includes(testInfo.project.name), 'Phone widths run once per direction.')
      await page.route('https://cdn.jsdelivr.net/**', route => route.abort())
      await page.goto(`${BASE_URL}${screen.path}`)
      await expect(page.locator('.skeleton-overlay')).toBeHidden()
      await page.locator('#rtl').evaluate((control, checked) => {
        if (control.checked === checked) return
        control.checked = checked
        control.dispatchEvent(new Event('change', {bubbles: true}))
      }, Boolean(testInfo.project.use.rtl))
      await page.locator('[data-list-open-record]').filter({visible: true}).first().evaluate(control => control.click())
      await expect(page.locator('.skeleton-overlay')).toBeHidden()
      await page.locator('#input-style').evaluate((control, value) => {
        control.value = value
        control.dispatchEvent(new Event('change', {bubbles: true}))
      }, labels)
      for (const width of WIDTHS) {
        await page.setViewportSize({width, height: 844})
        await expect.poll(async () => (await page.evaluate(readGrids, MINIMUM_CONTROL_WIDTH)).grids).toBe(screen.grids)
        const {wide, past, narrow, clippedSwitches} = await page.evaluate(readGrids, MINIMUM_CONTROL_WIDTH)
        expect(wide, `fields wider than their grid at ${width}px`).toEqual([])
        expect(past, `fields past their card at ${width}px`).toEqual([])
        if (width < STACKED_BELOW) {
          expect(narrow, `controls narrower than ${MINIMUM_CONTROL_WIDTH}px at ${width}px`).toEqual([])
          expect(clippedSwitches, `switches outside their box at ${width}px`).toEqual([])
        }
      }
    })
  }
}
