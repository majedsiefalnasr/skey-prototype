import {expect, test} from '@playwright/test'

const BASE_URL = process.env.PARITY_URL ?? 'http://127.0.0.1:4173'

async function showFlag(page, width) {
  await page.setViewportSize({width, height: 900})
  await page.goto(`${BASE_URL}/system/profile`)
  await expect(page.locator('.profile-view')).toBeVisible()
  await page.locator('#profile-job-title').fill(`Flag layout ${width}`)
  await page.locator('#profile-profile-save').click()
  await expect(page.locator('.toast h2')).toBeVisible()
}

test('flag title uses the ADS 14px / 20px type', async ({page}) => {
  await showFlag(page, 1280)
  const title = await page.locator('.toast h2').evaluate(element => {
    const style = getComputedStyle(element)
    return {fontSize: style.fontSize, lineHeight: style.lineHeight}
  })
  expect(title).toEqual({fontSize: '14px', lineHeight: '20px'})
})

for (const [width, bottom, start] of [[560, '72px', '16px'], [561, '48px', '80px']]) {
  test(`flag placement switches to the phone layout at 560px (${width}px)`, async ({page}) => {
    await showFlag(page, width)
    const placement = await page.locator('#toasts').evaluate(element => {
      const style = getComputedStyle(element)
      return {bottom: style.bottom, start: element.getBoundingClientRect().left + 'px'}
    })
    expect(placement).toEqual({bottom, start})
  })
}
