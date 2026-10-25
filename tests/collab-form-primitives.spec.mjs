import {test, expect} from '@playwright/test'
import {settle} from './support/browser.mjs'

const base = () => process.env.PARITY_URL ?? 'http://127.0.0.1:4173'
const SHOT = process.env.SHOT_DIR

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Form primitives run on the desktop project.')
})

async function go(page, path) {
  await page.goto(`${base()}${path}`)
  const loading = page.locator('#simulate-loading')
  if (await loading.isChecked()) await loading.uncheck()
  await settle(page)
  const kitHide = page.locator('#kit-hide')
  if (await kitHide.isVisible()) await kitHide.click()
}

test('form primitives', async ({page}) => {
  await go(page, '/help-screens/notes')

  const check = await page.evaluate(async () => {
    const {multiselect, bindMultiselect} = await import('./app/components/collab/multiselect.js')
    const {switchRow} = await import('./app/components/collab/fields.js')
    const host = document.createElement('div')
    host.id = 'probe-host'
    host.style.cssText =
      'position:fixed;inset:80px auto auto 50%;transform:translateX(-50%);z-index:400;background:#fff;padding:14px;border:1px solid #ddd;width:340px;border-radius:8px;box-shadow:0 8px 30px rgba(0,0,0,.2)'
    host.innerHTML =
      `<div style="display:grid;gap:8px">` +
      multiselect({
        id: 'probe-ms',
        label: 'Assigned to',
        required: true,
        options: [
          ['usr-1', 'Majed Sief'],
          ['usr-2', 'Noura Adel'],
          ['usr-3', 'Khaled Ibrahim'],
          ['usr-4', 'Salma Farid'],
        ],
        selected: ['usr-1'],
        placeholder: 'Search people…',
      }) +
      switchRow({id: 'probe-toggle', label: 'All day event', checked: false}) +
      `</div>`
    document.body.append(host)
    bindMultiselect(document)
    return {ok: true}
  })
  expect(check.ok).toBe(true)

  const input = page.locator('#probe-ms')
  await input.click()
  await input.fill('kh')
  await expect(page.locator('#probe-ms-list [data-ms-opt]:visible')).toHaveCount(1)
  await page.locator('#probe-ms-list [data-ms-opt]:visible').click()
  await expect(page.locator('#probe-host [data-ms-off="usr-3"]')).toHaveCount(1)
  const vals = await page.evaluate(() =>
    [...document.querySelectorAll('[data-ms="probe-ms"] [data-ms-val]')].map(h => h.value)
  )
  expect(vals).toEqual(['usr-1', 'usr-3'])
  await input.press('Escape')
  await expect(page.locator('#probe-ms-list')).toBeHidden()
  await page.locator('#probe-host [data-ms-off="usr-1"]').click()
  const vals2 = await page.evaluate(() =>
    [...document.querySelectorAll('[data-ms="probe-ms"] [data-ms-val]')].map(h => h.value)
  )
  expect(vals2).toEqual(['usr-3'])
  await expect(page.locator('#probe-host [data-ms-clear]')).toBeVisible()
  await page.locator('#probe-host [data-ms-clear]').click()
  const vals3 = await page.evaluate(() =>
    [...document.querySelectorAll('[data-ms="probe-ms"] [data-ms-val]')].map(h => h.value)
  )
  expect(vals3).toEqual([])
  await expect(page.locator('#probe-host [data-ms-clear]')).toBeHidden()
  await expect(page.locator('#probe-ms-list [data-ms-opt][aria-selected="true"]')).toHaveCount(0)
  await input.press('Escape')
  await expect(page.locator('#probe-ms-list')).toBeHidden()
  if (SHOT) await page.screenshot({path: `${SHOT}/probe-multiselect.png`})

  const toggle = page.locator('#probe-toggle')
  expect(await toggle.isChecked()).toBe(false)
  await page.locator('label[for="probe-toggle"]').click()
  expect(await toggle.isChecked()).toBe(true)
  const switchBox = await page.locator('label[for="probe-toggle"] > span').last().boundingBox()
  const rowBox = await page.locator('label[for="probe-toggle"]').boundingBox()
  expect(Math.round(switchBox.width)).toBe(34)
  expect(rowBox.height).toBeGreaterThanOrEqual(38)
  if (SHOT) await page.screenshot({path: `${SHOT}/probe-switchrow.png`})

  await page.locator('#probe-host').evaluate(el => el.remove())
  await page.locator('.notes-view [data-collab-new]').click()
  await expect(page.locator('#collab-panel')).toBeVisible()
  const aligned = await page.evaluate(() => {
    const status = document.querySelector('#note-group')
    const title = document.querySelector('#note-title')
    const cs = getComputedStyle(status)
    return {
      statusH: status.getBoundingClientRect().height,
      titleH: title.getBoundingClientRect().height,
      arrow: cs.backgroundImage.includes('svg+xml') && cs.backgroundImage.includes('%20xmlns'),
      backgroundImage: cs.backgroundImage.slice(0, 90),
      appearance: cs.appearance,
    }
  })
  console.log('EDITOR', JSON.stringify(aligned))
  expect(aligned.arrow).toBe(true)
  expect(Math.abs(aligned.statusH - aligned.titleH)).toBeLessThan(1.5)
  if (SHOT) await page.screenshot({path: `${SHOT}/probe-note-editor.png`})
})
