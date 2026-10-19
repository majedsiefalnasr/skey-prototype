import {test, expect} from '@playwright/test'

async function control(page, id, value) {
  await page.locator('#' + id).evaluate((el, value) => {
    if (el.type === 'checkbox') el.checked = value
    else el.value = value
    el.dispatchEvent(new Event('change', {bubbles: true}))
  }, value)
}

async function go(page, path, rtl = false) {
  await page.route('https://cdn.jsdelivr.net/**', route => route.abort())
  await page.goto(path)
  await control(page, 'simulate-loading', false)
  await control(page, 'rtl', rtl)
  if (await page.locator('#kit-hide').isVisible()) await page.locator('#kit-hide').click()
}

test('People table and toolbar share the Customers content edges', async ({page}, info) => {
  const rtl = Boolean(info.project.use.rtl)
  async function measure(path, root) {
    await go(page, path, rtl)
    return page.locator(root).evaluate(root => {
      const content = root.closest('.content').getBoundingClientRect()
      const table = root.querySelector('.data-list-shell').getBoundingClientRect()
      const toolbar = root.querySelector('.data-list-toolbar').getBoundingClientRect()
      return {start: table.left - content.left, end: content.right - table.right, toolbarStart: toolbar.left - table.left, toolbarEnd: table.right - toolbar.right}
    })
  }
  const customers = await measure('/customers/list', '.customer-list-view')
  const people = await measure('/help-screens/people-data', '.people-view')
  expect(people.start).toBeCloseTo(customers.start, 0)
  expect(people.end).toBeCloseTo(customers.end, 0)
  expect(Math.abs(people.toolbarStart)).toBeLessThanOrEqual(1)
  expect(Math.abs(people.toolbarEnd)).toBeLessThanOrEqual(1)
  if (info.project.use.viewport.width >= 900) {
    const box = await page.locator('.people-view .data-list-toolbar').boundingBox()
    const end = await page.locator('.people-view [data-view-menu]').boundingBox()
    expect(Math.abs(rtl ? end.x - box.x : box.x + box.width - end.x - end.width)).toBeLessThanOrEqual(1)
  }
})

test('Person page saves edits and returns to the same filtered list', async ({page}, info) => {
  await go(page, '/help-screens/people-data', Boolean(info.project.use.rtl))
  await page.locator('[data-collab-search]').fill('Ahmed Ali')
  await page.locator('[data-row-open]').click()
  const record = page.locator('.people-record-view')
  await expect(record).toBeVisible()
  await expect(page.locator('#collab-panel-scrim')).toBeHidden()
  await expect(record).not.toHaveAttribute('role', 'dialog')
  await expect(record.locator('[data-panel-title]')).toBeFocused()
  await record.locator('[data-panel-edit]').click()
  await record.locator('#person-company').fill('Updated company')
  await record.locator('[data-panel-save]').click()
  await expect(record.locator('[data-panel-body]')).toContainText('Updated company')
  await expect(record.locator('#person-company')).toHaveCount(0)
  await record.locator('[data-people-back]').click()
  await expect(page.locator('[data-collab-search]')).toHaveValue('Ahmed Ali')
  await expect(page.locator('[data-row-open]')).toHaveCount(1)
  await expect(page.locator('.people-view tbody')).toContainText('Updated company')
  await expect(page.locator('[data-row-open]')).toBeFocused()
  await page.reload()
  await expect(page.locator('.people-view tbody')).toContainText('Updated company')
})

test('Person page protects edits when returning to the list or Home', async ({page}, info) => {
  await go(page, '/help-screens/people-data', Boolean(info.project.use.rtl))
  await page.locator('[data-row-open]').first().click()
  const record = page.locator('.people-record-view')
  await record.locator('[data-panel-edit]').click()
  const company = record.locator('#person-company')
  const before = await company.inputValue()
  await company.fill('Unsaved change')
  await record.locator('[data-people-back]').click()
  await expect(page.locator('#collab-confirm')).toHaveClass(/open/)
  await page.locator('#collab-confirm [data-confirm-cancel]').click()
  await expect(company).toHaveValue('Unsaved change')
  await record.locator('[data-home-link]').click()
  await expect(page.locator('#collab-confirm')).toHaveClass(/open/)
  await page.locator('#collab-confirm [data-confirm-ok]').click()
  await expect(page.locator('.lp-view')).toBeVisible()
  await page.goto('/help-screens/people-data')
  await page.locator('[data-row-open]').first().click()
  await record.locator('[data-panel-edit]').click()
  await expect(company).toHaveValue(before)
})

test('Person page fits the content viewport when editing', async ({page}, info) => {
  await go(page, '/help-screens/people-data', Boolean(info.project.use.rtl))
  await page.locator('[data-collab-new]').click()
  const record = page.locator('.people-record-view')
  await expect(record).toBeVisible()
  const size = await record.evaluate(el => ({width: el.clientWidth, scroll: el.scrollWidth}))
  expect(size.scroll).toBeLessThanOrEqual(size.width + 1)
  await expect(record.locator('[data-panel-save]')).toBeInViewport()
})
