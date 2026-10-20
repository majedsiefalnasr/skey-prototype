import {test, expect} from '@playwright/test'
import {settle} from './support/browser.mjs'

async function go(page, info, area = 'activities') {
  await page.route('https://cdn.jsdelivr.net/**', route => route.abort())
  await page.goto(`/help-screens/${area}`)
  await page.locator('#simulate-loading').uncheck()
  await page.locator('#rtl').evaluate((el, checked) => {
    el.checked = checked
    el.dispatchEvent(new Event('change', {bubbles: true}))
  }, Boolean(info.project.use.rtl))
  if (await page.locator('#kit-hide').isVisible()) await page.locator('#kit-hide').click()
  if (area === 'activities') {
    await page.locator('[data-view-menu] summary').click()
    await page.locator('[data-view-select="calendar"]').click()
  }
  await settle(page)
}

const paint = el => ({background: getComputedStyle(el).backgroundColor, shadow: getComputedStyle(el).boxShadow})
const chipStyle = el => ({
  border: getComputedStyle(el).borderInlineStartWidth,
  padding: getComputedStyle(el).padding,
  title: getComputedStyle(el.querySelector('.event-month-title')).fontSize,
  time: getComputedStyle(el.querySelector('.event-month-time')).fontSize,
})

test('Activities shares Events calendar chips and neutral Today styling in every period', async ({page}, info) => {
  await go(page, info, 'events')
  const eventPaint = await page.locator('[data-date="2026-10-13"]').evaluate(paint)
  const marker = await page.locator('[data-cal-select-day="2026-10-13"]').evaluate(el => getComputedStyle(el).backgroundColor)
  const eventChip = await page.locator('[data-cal-item]').first().evaluate(chipStyle)
  await go(page, info)
  await expect(page.locator('[data-cal-week]')).toBeVisible()
  await expect(page.locator('[data-cal-range]')).toContainText('2026')
  await expect(page.locator('[data-cal-item]', {hasText: 'Customer visit'})).toHaveCount(0)
  await expect(page.locator('[data-cal-item]', {hasText: 'Send revised price list'})).toHaveCount(0)
  for (const mode of ['week', 'month', 'day']) {
    await page.locator(`[data-cal-modes] [data-value="${mode}"]`).click()
    if (mode === 'month') {
      expect(await page.locator('[data-date="2026-10-13"]').evaluate(paint)).toEqual(eventPaint)
      expect(await page.locator('[data-date="2026-10-14"]').evaluate(paint)).toEqual(eventPaint)
      expect(await page.locator('[data-cal-item]').first().evaluate(chipStyle)).toEqual(eventChip)
      const call = page.locator('[data-cal-item]', {hasText: 'Call Al Noor'})
      await expect(call.locator('.event-month-time')).toContainText('15:00')
    } else {
      const header = page.locator('[data-cal-column-date="2026-10-13"]')
      expect(await header.locator('.event-calendar-day-number').evaluate(el => getComputedStyle(el).backgroundColor)).toBe(marker)
      expect(await header.evaluate(paint)).toEqual({...eventPaint, shadow: 'none'})
      expect(await page.locator('[data-cal-timed-date="2026-10-13"]').evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)')
      expect(await page.locator('.cal-event-paint').first().evaluate(el => getComputedStyle(el).borderInlineStartWidth)).toBe('0px')
    }
    await settle(page)
    await page.locator('.page-content').evaluate(el => el.scrollTo(0, 0))
    await page.screenshot({path: info.outputPath(`activities-calendar-${mode}.png`), animations: 'disabled'})
  }
})

test('Activities range jumps and keyboard date selection retain scheduling and record focus', async ({page}, info) => {
  await go(page, info)
  const before = await page.evaluate(() => sessionStorage.getItem('skey-proto-collab'))
  const call = page.locator('[data-cal-item]', {hasText: 'Call Al Noor'})
  await call.click()
  await expect(page.locator('#collab-panel [data-panel-edit]')).toBeVisible()
  await expect(page.locator('#activity-summary')).toHaveCount(0)
  await page.locator('[data-panel-close]').click()
  await expect(call).toBeFocused()
  await page.locator('[data-cal-preset]').click()
  await page.locator('[data-cal-preset-menu] [data-preset="next-month"]').click()
  await expect(page.locator('[data-date="2026-11-01"]')).toBeVisible()
  await expect(page.locator('[data-cal-preset]')).toBeFocused()
  await page.locator('[data-cal-preset]').click()
  await page.locator('[data-cal-preset-menu] [data-preset="month"]').click()
  await page.locator('[data-cal-select-day="2026-10-13"]').focus()
  await page.keyboard.press(info.project.use.rtl ? 'ArrowLeft' : 'ArrowRight')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-cal-select-day="2026-10-21"]')).toBeFocused()
  await page.locator('[data-cal-modes] [data-value="day"]').click()
  await expect(page.locator('[data-cal-column-date="2026-10-21"]')).toBeVisible()
  const slot = page.locator('[data-cal-slot="2026-10-21"][data-time="09:00"]')
  await slot.click()
  await expect(page.locator('#activity-start')).toHaveValue('2026-10-21T09:00')
  await expect(page.locator('#activity-duration')).toHaveValue('30')
  await page.locator('[data-panel-close]').click()
  await expect(slot).toBeFocused()
  expect(await page.evaluate(() => sessionStorage.getItem('skey-proto-collab'))).toBe(before)
  await page.locator('[data-show-kanban]').click()
  await expect(page.locator('[data-card-open="act-2"]')).toBeVisible()
  await expect(page.locator('[data-cal-context]')).toHaveCount(0)
})
