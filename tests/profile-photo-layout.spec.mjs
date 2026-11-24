import {expect, test} from '@playwright/test'

const BASE_URL = process.env.PARITY_URL ?? 'http://127.0.0.1:4173'

for (const width of [390, 768, 900, 1280]) {
  test(`profile fields do not overlap the photo box at ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height: 900})
    await page.goto(`${BASE_URL}/system/profile`)
    await expect(page.locator('.profile-view')).toBeVisible()
    const overlapping = await page.evaluate(() => {
      const box = el => el.getBoundingClientRect()
      const photo = document.querySelector('.profile-photo-column')
      const photoBox = box(photo)
      return [...document.querySelectorAll('.profile-personal-fields input, .profile-personal-fields select')]
        .filter(field => {
          const fieldBox = box(field)
          return fieldBox.left < photoBox.right && fieldBox.right > photoBox.left && fieldBox.top < photoBox.bottom && fieldBox.bottom > photoBox.top
        })
        .map(field => field.id)
    })
    expect(overlapping).toEqual([])
  })
}
