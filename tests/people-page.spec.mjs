import {test, expect} from '@playwright/test'
import {settle} from './support/browser.mjs'

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
  await page.locator('.people-record-view [data-panel-save]').click()
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
  await expect(page.locator('.people-record-view [data-panel-save]')).toBeInViewport()
})

test('People list pager and record footer use the shell footer slot like Customers', async ({page}, info) => {
  await go(page, '/help-screens/people-data', Boolean(info.project.use.rtl))
  const listFooter = page.locator('.page-footer [data-page-footer="people"]')
  const recordFooter = page.locator('.page-footer [data-page-footer="people-record"]')
  await expect(listFooter.locator('[data-list-page]').first()).toBeVisible()
  await expect(page.locator('.people-view [data-collab-body] [data-list-page]')).toHaveCount(0)
  // Pinned to the bottom of the content pane, not after the last row.
  const gap = await page.evaluate(() =>
    document.querySelector('.content').getBoundingClientRect().bottom
      - document.querySelector('.page-footer').getBoundingClientRect().bottom)
  expect(Math.abs(gap)).toBeLessThanOrEqual(1)
  await expect(recordFooter).toBeHidden()
  await page.locator('[data-row-open]').first().click()
  await expect(page.locator('.people-record-view')).toBeVisible()
  await expect(listFooter).toBeHidden()
  await page.locator('.people-record-view [data-panel-edit]').click()
  await expect(page.locator('.people-record-view [data-panel-save]')).toBeVisible()
  await page.locator('.people-record-view [data-panel-cancel]').click()
  await expect(page.locator('.people-record-view [data-panel-footer]')).toBeHidden()
  await page.locator('.people-record-view [data-people-back]').click()
  await expect(recordFooter).toBeHidden()
  await expect(listFooter).toBeVisible()
})

test('Person sections follow the Customer scroll layout and reopen collapsed content', async ({page}, info) => {
  const rtl = Boolean(info.project.use.rtl)
  await go(page, '/customers/list', rtl)
  await page.locator('[data-list-open-record]').first().click()
  const geometry = root => root.evaluate(root => {
    const layout = root.querySelector('.customer-scroll-layout')
    const nav = root.querySelector('.customer-scroll-nav, .people-scroll-nav')
    const content = root.querySelector('.customer-scroll-content')
    return {columns: getComputedStyle(layout).gridTemplateColumns, gap: getComputedStyle(layout).gap, navPosition: getComputedStyle(nav).position, navWidth: nav.getBoundingClientRect().width, contentWidth: content.getBoundingClientRect().width}
  })
  const customer = await geometry(page.locator('.customer-record-view'))
  await go(page, '/help-screens/people-data', rtl)
  await page.locator('[data-row-open]').first().click()
  const record = page.locator('.people-record-view')
  expect(await geometry(record)).toEqual(customer)
  const contact = record.locator('[data-person-section="contact"]')
  await contact.locator('summary').click()
  await expect(contact).not.toHaveAttribute('open')
  const link = record.locator('[data-person-scroll-section="contact"]')
  await link.click()
  await expect(contact).toHaveAttribute('open')
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(contact).toBeInViewport()
  await expect(page.locator('.page-footer [data-page-footer="people-record"] .pager')).toBeInViewport()
  await link.press(info.project.use.viewport.width > 720 ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight')
  await expect(record.locator('[data-person-scroll-section="address"]')).toBeFocused()
  await expect(record.locator('[data-person-scroll-section="address"]')).toHaveAttribute('aria-current', 'page')
  await settle(page)
  await page.locator('.page-content').evaluate(el => el.scrollTo({top: 0, behavior: 'instant'}))
  await page.screenshot({path: `/private/tmp/people-details-${info.project.name}.png`})
})

test('Person footer browses records and locks navigation during edits', async ({page}, info) => {
  await go(page, '/help-screens/people-data', Boolean(info.project.use.rtl))
  const names = await page.locator('[data-row-open]').allTextContents()
  await page.locator('[data-row-open]').first().click()
  const record = page.locator('.people-record-view')
  const footer = page.locator('.page-footer [data-page-footer="people-record"]')
  await expect(footer.locator('.pg-f')).toBeDisabled()
  await expect(footer.locator('.pg-i')).toHaveValue('1')
  await footer.locator('.pg-n').click()
  await expect(footer.locator('.pg-i')).toHaveValue('2')
  const title = await record.locator('[data-panel-title]').textContent()
  expect(names[1]).toContain(title)
  await record.locator('[data-panel-edit]').click()
  for (const selector of ['.pg-f', '.pg-p', '.pg-n', '.pg-l']) await expect(footer.locator(selector)).toBeDisabled()
  await expect(footer.locator('[data-panel-footer], [data-person-footer-note], [data-panel-save], [data-panel-cancel]')).toHaveCount(0)
  await record.locator('#person-photo-input').setInputFiles('concepts/assets/customers/customer-200010-portrait.webp')
  await expect(record.locator('[data-person-photo-preview] img').first()).toBeVisible()
  await record.locator('#person-company').fill('Header save works')
  await record.locator('[data-person-save]').click()
  await expect(record.locator('[data-panel-body]')).toContainText('Header save works')
  await expect(record.locator('[data-person-photo-preview] img').first()).toBeVisible()
  await expect(record.locator('[data-person-photo-select]')).toBeDisabled()
  await expect(footer.locator('.pg-p')).toBeEnabled()
  await footer.locator('.pg-l').click()
  await expect(footer.locator('.pg-n')).toBeDisabled()
  await record.locator('[data-person-new]').click()
  await expect(footer.locator('.pg-i')).toHaveValue('')
  await expect(record.locator('[data-panel-related], [data-person-scroll-section="related"]')).toHaveCount(0)
})
