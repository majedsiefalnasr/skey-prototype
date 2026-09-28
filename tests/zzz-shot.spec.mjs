import {test} from '@playwright/test'
import {boot, settle} from './support/browser.mjs'

test('responsive bento charts and avatars', async ({page}) => {
  await page.setViewportSize({width: 1600, height: 1100})
  await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173')
  await page.locator('.avatar-btn').click()
  await page.locator('.organization-menu[data-organization-section="overview"]').click()
  await settle(page)
  await page.mouse.move(0, 0)
  await page.screenshot({path: '/tmp/bento-desktop.png', fullPage: true})

  await page.setViewportSize({width: 390, height: 844})
  await settle(page)
  await page.screenshot({path: '/tmp/bento-mobile.png', fullPage: true})
})
