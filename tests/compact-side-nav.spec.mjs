// Below `md` the side navigation is hidden until its top bar button opens it
// over the page (#60).
import {expect, test} from '@playwright/test'

const BASE_URL = process.env.PARITY_URL ?? 'http://127.0.0.1:4173'
const COMPACT_WIDTHS = [320, 390, 768, 1023]
const OPEN_WIDTH = 316
const MINIMUM_OUTSIDE = 44

async function boot(page, testInfo, width) {
  await page.setViewportSize({width, height: 844})
  await page.route('https://cdn.jsdelivr.net/**', route => route.abort())
  await page.goto(`${BASE_URL}/customers/list`)
  await expect(page.locator('.skeleton-overlay')).toBeHidden()
  await page.locator('#rtl').evaluate((control, checked) => {
    if (control.checked === checked) return
    control.checked = checked
    control.dispatchEvent(new Event('change', {bubbles: true}))
  }, Boolean(testInfo.project.use.rtl))
  const minimize = page.locator('#kit-min')
  if (await minimize.isVisible()) await minimize.click()
}

const widthOf = locator => locator.evaluate(element => Math.round(element.getBoundingClientRect().width))

/** How far the open navigation, including anything spilling out of it,
 *  reaches from the edge it opens on. */
const reachOf = page =>
  page.evaluate(() => {
    const boxes = [...document.querySelectorAll('.side, .side .nc3-panel')].map(element => element.getBoundingClientRect())
    const rtl = getComputedStyle(document.body).direction === 'rtl'
    return Math.round(Math.max(...boxes.map(box => (rtl ? innerWidth - box.left : box.right))))
  })

for (const width of COMPACT_WIDTHS) {
  test(`side navigation opens over the page and closes at ${width}px`, async ({page}, testInfo) => {
    test.skip(!['mobile-touch', 'mobile-rtl'].includes(testInfo.project.name), 'Compact widths run once per direction.')
    await boot(page, testInfo, width)
    const side = page.locator('.side')
    const scrim = page.locator('.side-scrim')
    const content = page.locator('.content')
    const toggle = page.locator('.gtop .side-toggle')
    const openNavigation = async () => {
      await toggle.tap()
      await expect(side).toBeVisible()
      await expect(scrim).toBeVisible()
    }
    const expectClosed = async () => {
      await expect(side).toBeHidden()
      await expect(scrim).toBeHidden()
    }

    await expectClosed()
    expect(await widthOf(content)).toBe(width)

    await openNavigation()
    const openWidth = Math.min(OPEN_WIDTH, width - MINIMUM_OUTSIDE)
    expect(await widthOf(side)).toBe(openWidth)
    expect(await reachOf(page)).toBe(openWidth)
    expect(await widthOf(content)).toBe(width)

    const outside = testInfo.project.use.rtl ? 10 : width - 10
    await page.touchscreen.tap(outside, 420)
    await expectClosed()

    await openNavigation()
    await toggle.tap()
    await expectClosed()

    await openNavigation()
    await page.keyboard.press('Escape')
    await expectClosed()
    await expect(toggle).toBeFocused()

    await openNavigation()
    const rail = page.locator('.nc2-rail')
    const railWidth = await widthOf(rail)
    await page.locator('.nc2-icn[data-i18n-original="Help Screens"], .nc2-icn[aria-label="Help Screens"]').tap()
    await expect(side).toBeVisible()
    const notes = page.locator('.nc3-panel .nc1-item[data-label="Notes"]')
    await expect(notes).toBeVisible()
    expect(await widthOf(rail)).toBe(railWidth)
    await notes.tap()
    await expectClosed()
    await expect(page.locator('.notes-view')).toBeVisible()
  })
}

test('side navigation stays in the layout from 1024px', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'One desktop run covers the boundary.')
  await boot(page, testInfo, 1024)
  const side = page.locator('.side')
  await expect(side).toBeVisible()
  await expect(page.locator('.side-scrim')).toBeHidden()
  expect(await widthOf(side)).toBe(OPEN_WIDTH)
  expect(await widthOf(page.locator('.content'))).toBe(1024 - OPEN_WIDTH)

  await page.keyboard.press('Escape')
  await expect(side).toBeVisible()
  expect(await widthOf(side)).toBe(OPEN_WIDTH)

  await page.locator('.gtop .side-toggle').click()
  await expect(side).toBeVisible()
  await expect(page.locator('.side-scrim')).toBeHidden()
  expect(await widthOf(side)).toBe(52)
})
