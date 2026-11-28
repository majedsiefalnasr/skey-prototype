import {expect, test} from '@playwright/test'
import {boot, openSurface, settle} from './support/browser.mjs'

const BASE_URL = process.env.PARITY_URL ?? 'http://127.0.0.1:4173'

const openCustomerUnitDrawer = async page => {
  await openSurface(page, 'customer-record')
  await settle(page)
  await page.locator('#customer-mode').selectOption('edit', {force: true})
  await settle(page)
  await page.locator('[data-customer-lookup="operationUnit"]').first().click()
  await page.locator('[data-customer-lookup-action="add"]').click()
}

const openGeoRecord = async page => {
  await openSurface(page, 'geo-record')
  if (!(await page.locator('#geo-hierarchy-panel [role="tablist"]').isVisible())) await page.locator('[data-geo-tree-collapse]').click()
}

const tablists = [
  {name: 'Invoice sections', underline: true, list: '.rec-tabs[aria-label="Invoice sections"]', open: page => openSurface(page, 'record')},
  {name: 'Notification type', underline: true, list: '.notif-tabs', open: page => page.locator('button.ibtn[data-i18n-aria-label="System Alerts"]').filter({visible: true}).first().click()},
  {name: 'Operation unit details', underline: true, list: '.customer-unit-tabs', open: openCustomerUnitDrawer},
  {name: 'Invoice activity', underline: true, list: '.drtabs', open: async page => {
    await openSurface(page, 'record')
    await page.locator('.dr-open[data-tab="stages"]:visible').first().click()
  }},
  {name: 'Home quick tabs', list: '.lp-quick-tabs', open: async () => {}},
  {name: 'Geography hierarchy view', list: '#geo-hierarchy-panel [role="tablist"]', open: openGeoRecord},
  {name: 'Parent picker view', list: '#geo-parent-picker-scrim [role="tablist"]', open: async page => {
    await openGeoRecord(page)
    await page.locator('.lbtn[data-geo-record-action="modify"]:visible').first().click()
    await page.locator('#geo-parent-picker-trigger').click()
  }},
  {name: 'Unit picker view', list: '#unit-picker-scrim [role="tablist"]', open: async page => {
    await openCustomerUnitDrawer(page)
    await page.locator('[data-unit-picker-open="customer-unit-parent"]').click()
  }},
]

const tabState = list => list.evaluate(element => [...element.querySelectorAll('[role="tab"]')].map(tab => ({
  selected: tab.getAttribute('aria-selected') === 'true',
  tabIndex: tab.tabIndex,
  focused: tab === document.activeElement,
})))

const expectAt = (list, index, count) =>
  expect.poll(async () => (await tabState(list)).map(({selected, tabIndex, focused}) => [selected, tabIndex, focused])).toEqual(
    Array.from({length: count}, (_, position) => (position === index ? [true, 0, true] : [false, -1, false]))
  )

for (const rtl of [false, true]) {
  for (const tablist of tablists) {
    test(`${tablist.name} tabs follow ADS keys and size (${rtl ? 'rtl' : 'ltr'})`, async ({page}) => {
      test.skip(test.info().project.name !== 'desktop', 'runs once at 1440px; both directions are toggled here')
      await boot(page, BASE_URL)
      await page.locator('#rtl').evaluate((toggle, checked) => {
        toggle.checked = checked
        toggle.dispatchEvent(new Event('change', {bubbles: true}))
      }, rtl)
      await tablist.open(page)
      const list = page.locator(tablist.list).filter({visible: true}).first()
      await expect(list).toBeVisible()
      expect(await list.evaluate(element => getComputedStyle(element).direction)).toBe(rtl ? 'rtl' : 'ltr')

      if (tablist.underline) {
        const style = await list.evaluate(element => {
          const tab = element.querySelector('[role="tab"][aria-selected="true"]')
          const computed = getComputedStyle(tab)
          return [computed.paddingBlockStart, computed.paddingInlineStart, computed.paddingInlineEnd, computed.fontWeight]
        })
        expect(style).toEqual(['6px', '8px', '8px', '500'])
      }

      const tabs = list.getByRole('tab')
      const count = await tabs.count()
      const forward = rtl ? 'ArrowLeft' : 'ArrowRight'
      const backward = rtl ? 'ArrowRight' : 'ArrowLeft'
      await tabs.first().focus()
      await page.keyboard.press('Home')
      await expectAt(list, 0, count)
      await page.keyboard.press(forward)
      await expectAt(list, 1, count)
      await page.keyboard.press('End')
      await expectAt(list, count - 1, count)
      await page.keyboard.press(forward)
      await expectAt(list, 0, count)
      await page.keyboard.press(backward)
      await expectAt(list, count - 1, count)
    })
  }
}
