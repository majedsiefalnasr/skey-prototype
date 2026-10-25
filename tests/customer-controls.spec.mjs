import {test, expect} from '@playwright/test'
import {settle} from './support/browser.mjs'

async function boot(page, rtl) {
  await page.route('https://cdn.jsdelivr.net/**', route => route.abort())
  await page.goto('/customers/list')
  for (const [id, value] of [['simulate-loading', false], ['rtl', rtl]]) await page.locator(`#${id}`).evaluate((el, checked) => {
    el.checked = checked
    el.dispatchEvent(new Event('change', {bubbles: true}))
  }, value)
  if (await page.locator('#kit-hide').isVisible()) await page.locator('#kit-hide').click()
  await settle(page)
}

test('Customer header More actions opens and closes on Escape', async ({page}, info) => {
  await boot(page, Boolean(info.project.use.rtl))
  await page.locator('[data-list-row-key="200002"] [data-list-open-record]').first().click()
  const trigger = page.locator('.customer-record-view .phead [data-customer-action="more"]')
  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect(trigger.locator('..').getByRole('menu')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
})

test('Customers without photos have a visible, centered initials avatar', async ({page}, info) => {
  await boot(page, Boolean(info.project.use.rtl))
  const fallback = page.locator('[data-list-row-key="200001"] .customer-avatar-fallback').first()
  await expect(fallback).toBeVisible()
  const style = await fallback.evaluate(el => ({
    width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height,
    display: getComputedStyle(el).display, background: getComputedStyle(el).backgroundColor,
    initials: el.textContent.trim(),
  }))
  expect(style.width).toBeGreaterThanOrEqual(30)
  expect(style.height).toBeGreaterThanOrEqual(30)
  expect(['grid', 'inline-grid', 'flex', 'inline-flex']).toContain(style.display)
  expect(style.background).not.toBe('rgba(0, 0, 0, 0)')
  expect(style.initials.length).toBeGreaterThan(0)
})
