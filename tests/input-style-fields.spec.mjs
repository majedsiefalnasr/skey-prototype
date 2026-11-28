// Input styles keep labels clear of their values (#59): floating labels rise
// above read-only People values, and inline toggles use the whole field width.
import {expect, test} from '@playwright/test'

const BASE_URL = process.env.PARITY_URL ?? 'http://127.0.0.1:4173'

async function setControl(page, id, value) {
  await page.locator(`#${id}`).evaluate((element, value) => {
    if (element.type === 'checkbox') element.checked = value
    else element.value = value
    element.dispatchEvent(new Event('change', {bubbles: true}))
  }, value)
}

async function openRecord(page, testInfo, {path, record, width, style}) {
  await page.setViewportSize({width, height: 844})
  await page.route('https://cdn.jsdelivr.net/**', route => route.abort())
  await page.goto(`${BASE_URL}${path}`)
  await expect(page.locator('.skeleton-overlay')).toBeHidden()
  await setControl(page, 'rtl', Boolean(testInfo.project.use.rtl))
  await page.locator(record).filter({visible: true}).first().evaluate(control => control.click())
  await setControl(page, 'input-style', style)
}

test('floating labels stay clear of read-only People values', async ({page}, testInfo) => {
  test.skip(!['desktop', 'mobile-rtl'].includes(testInfo.project.name), 'One run per direction.')
  await openRecord(page, testInfo, {path: '/help-screens/people-data', record: '.people-view [data-row-open]', width: 1440, style: 'floated'})
  await expect(page.locator('.people-record-view .rec-field > p').first()).toBeVisible()
  const covered = await page.evaluate(() =>
    [...document.querySelectorAll('.people-record-view .rec-field > p')].filter(value => value.getClientRects().length).flatMap(value => {
      const label = value.parentElement.querySelector(':scope > label').getBoundingClientRect()
      const range = document.createRange()
      range.selectNodeContents(value)
      const text = range.getBoundingClientRect()
      const overlap = Math.max(0, Math.min(label.right, text.right) - Math.max(label.left, text.left)) * Math.max(0, Math.min(label.bottom, text.bottom) - Math.max(label.top, text.top))
      return overlap > 1 ? [value.parentElement.querySelector('label').textContent.trim()] : []
    })
  )
  expect(covered).toEqual([])
})

const TOGGLES = [
  {name: 'invoice', path: '/sales-systems-management/sales-invoices', label: /Calculate Tax On Free Qty|الكمية المجانية/},
  {name: 'customer', path: '/customers/list', label: /Inactivation In Sales Order|أمر البيع/},
]

for (const screen of TOGGLES) {
  for (const width of [320, 390, 768, 1440]) {
    test(`${screen.name} inline toggle keeps its label and switch inside at ${width}px`, async ({page}, testInfo) => {
      test.skip(!['desktop', 'mobile-rtl'].includes(testInfo.project.name), 'One run per direction.')
      await openRecord(page, testInfo, {path: screen.path, record: '[data-list-open-record]', width, style: 'inline'})
      const toggle = page.locator('label.customer-dialog-toggle').filter({hasText: screen.label}).first()
      await toggle.evaluate(element => {
        for (let node = element; node; node = node.parentElement) if (node.hidden) node.hidden = false
      })
      const reading = await toggle.evaluate(element => {
        const box = element.getBoundingClientRect()
        const range = document.createRange()
        range.selectNodeContents([...element.querySelectorAll('span')].find(span => span.textContent.trim()))
        const text = range.getBoundingClientRect()
        const track = [...element.querySelectorAll('span')].filter(span => !span.textContent.trim() && span.getClientRects().length).at(-1).getBoundingClientRect()
        const inside = rect => rect.width > 0 && rect.left >= box.left - 0.5 && rect.right <= box.right + 0.5 && rect.top >= box.top - 0.5 && rect.bottom <= box.bottom + 0.5
        const field = element.closest('.rec-field:not(.customer-dialog-toggle)') ?? element
        return {text: inside(text), track: inside(track), fullWidth: Math.abs(field.getBoundingClientRect().width - box.width) < 1}
      })
      expect(reading).toEqual({text: true, track: true, fullWidth: true})
    })
  }
}
