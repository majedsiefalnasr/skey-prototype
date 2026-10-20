import {test, expect} from '@playwright/test'
import {settle} from './support/browser.mjs'

async function go(page, info, path = 'notes') {
  await page.route('https://cdn.jsdelivr.net/**', route => route.abort())
  await page.goto(`/help-screens/${path}`)
  await page.locator('#simulate-loading').uncheck()
  await page.locator('#rtl').evaluate((el, checked) => {
    el.checked = checked
    el.dispatchEvent(new Event('change', {bubbles: true}))
  }, Boolean(info.project.use.rtl))
  if (await page.locator('#kit-hide').isVisible()) await page.locator('#kit-hide').click()
  await settle(page)
}

const panel = page => page.locator('#collab-panel')
const preview = page => page.locator('#collab-preview')
const related = (host, type) => host.locator(`[data-related-row][data-type="${type}"] [data-related-open]`).first()

test('related previews preserve the note, URL, focus, and read-only controls', async ({page}, info) => {
  await go(page, info)
  await page.locator('[data-card-open="note-1"]').click()
  const url = page.url()
  for (const [type, title] of [['activity', 'Call Al Noor about quotation 884'], ['person', 'Ahmed Ali']]) {
    const trigger = related(panel(page), type)
    await trigger.click()
    await expect(preview(page)).toBeVisible()
    await expect(preview(page).locator('[data-preview-box]')).toHaveAttribute('data-tone', type === 'activity' ? 'warning' : 'default')
    await expect(preview(page).locator('#collab-preview-title')).toHaveText(title)
    await expect(panel(page).locator('#collab-panel-title')).toHaveText('Payment terms for Al Noor')
    expect(page.url()).toBe(url)
    await expect(preview(page).locator('input,textarea,select,[data-related-open],[data-panel-edit]')).toHaveCount(0)
    await preview(page).locator('[data-preview-close]').focus()
    await page.keyboard.press('Shift+Tab')
    await expect(preview(page).locator('[data-preview-full]')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(preview(page).locator('[data-preview-close]')).toBeFocused()
    await page.screenshot({path: info.outputPath(`related-${type}-preview.png`), animations: 'disabled'})
    const bounds = await preview(page).locator('[data-preview-box]').boundingBox()
    expect(Math.abs(bounds.x + bounds.width / 2 - page.viewportSize().width / 2)).toBeLessThan(2)
    expect(bounds.width).toBeLessThanOrEqual(520)
    const spacing = await page.evaluate(() => ['.dhd', '.dlg-inner', '.dbody', '.dfoot'].map(selector => [
      getComputedStyle(document.querySelector(`#collab-preview ${selector}`)).padding,
      getComputedStyle(document.querySelector(`#customer-type-add-scrim ${selector}`)).padding,
    ]))
    for (const [actual, expected] of spacing) expect(actual).toBe(expected)
    await page.keyboard.press('Escape')
    await expect(preview(page)).toBeHidden()
    await expect(panel(page)).toBeVisible()
    await expect(trigger).toBeFocused()
  }
})

test('preview preserves draft values and View full uses the existing discard guard', async ({page}, info) => {
  await go(page, info)
  await page.locator('[data-card-open="note-1"]').click()
  await panel(page).locator('[data-panel-edit]').click()
  await panel(page).locator('#note-title').fill('Unsaved note title')
  await related(panel(page), 'activity').click()
  await preview(page).locator('[data-preview-done]').click()
  await expect(panel(page).locator('#note-title')).toHaveValue('Unsaved note title')
  await related(panel(page), 'activity').click()
  await preview(page).locator('[data-preview-full]').click()
  await expect(page.locator('#collab-confirm')).toBeVisible()
  await page.locator('#collab-confirm [data-confirm-cancel]').click()
  await expect(panel(page).locator('#note-title')).toHaveValue('Unsaved note title')
  await expect(page).toHaveURL(/\/help-screens\/notes$/)
  await related(panel(page), 'activity').click()
  await preview(page).locator('[data-preview-full]').click()
  await page.locator('#collab-confirm [data-confirm-ok]').click()
  await expect(page).toHaveURL(/\/help-screens\/activities$/)
  await expect(panel(page).locator('#collab-panel-title')).toHaveText('Call Al Noor about quotation 884')
})

test('event and mail previews open above notes without navigating', async ({page}, info) => {
  await go(page, info)
  for (const [id, type, title] of [['note-4', 'event', 'Monthly sales review'], ['note-3', 'mail', 'Stock check needed before Bill Outgoing Order ships']]) {
    await page.locator(`[data-card-open="${id}"]`).click()
    await related(panel(page), type).click()
    await expect(preview(page).locator('#collab-preview-title')).toHaveText(title)
    await expect(page).toHaveURL(/\/help-screens\/notes$/)
    await expect(panel(page)).toBeVisible()
    await page.screenshot({path: info.outputPath(`related-${type}-preview.png`), animations: 'disabled'})
    await preview(page).click({position: {x: 2, y: 2}})
    await expect(preview(page)).toBeHidden()
    await panel(page).locator('[data-panel-close]').click()
  }
})

test('person record previews its related note and View full navigates explicitly', async ({page}, info) => {
  await go(page, info, 'people-data')
  await page.locator('.people-view [data-row-open]').filter({hasText: 'Ahmed Ali'}).click()
  const record = page.locator('.people-record-view')
  await related(record, 'note').click()
  await expect(preview(page).locator('#collab-preview-title')).toHaveText('Payment terms for Al Noor')
  await expect(record).toBeVisible()
  await page.screenshot({path: info.outputPath('related-note-preview.png'), animations: 'disabled'})
  await preview(page).locator('[data-preview-full]').click()
  await expect(page).toHaveURL(/\/help-screens\/notes$/)
  await expect(panel(page).locator('#collab-panel-title')).toHaveText('Payment terms for Al Noor')
})

test('overdue related activities use the same danger shell as delete dialogs', async ({page}, info) => {
  await go(page, info, 'email')
  await page.locator('.email-list-row').filter({hasText: 'Stock check needed before Bill Outgoing Order ships'}).click()
  await related(page.locator('.email-view'), 'activity').click()
  const box = preview(page).locator('[data-preview-box]')
  await expect(box).toHaveAttribute('data-tone', 'danger')
  await expect(preview(page).locator('.badge.danger')).toBeVisible()
  const colors = await box.evaluate(el => {
    const confirm = document.querySelector('#collab-confirm [data-confirm-box]')
    const original = confirm.dataset.tone
    confirm.dataset.tone = 'danger'
    const result = [getComputedStyle(el).borderColor, getComputedStyle(confirm).borderColor]
    confirm.dataset.tone = original
    return result
  })
  expect(colors[0]).toBe(colors[1])
  await page.screenshot({path: info.outputPath('related-overdue-preview.png'), animations: 'disabled'})
  await expect(page).toHaveURL(/\/help-screens\/email$/)
})

test('completed related activities use success instead of an overdue tint', async ({page}, info) => {
  await go(page, info, 'activities')
  await page.locator('[data-card-open="act-1"]').click()
  await panel(page).locator('[data-panel-edit]').click()
  await panel(page).locator('#activity-status').selectOption('done')
  await panel(page).locator('#activity-due').fill('2026-10-01')
  await panel(page).locator('[data-panel-save]').click()
  await expect(panel(page)).toBeHidden()
  await page.goto('/help-screens/notes')
  await settle(page)
  await page.locator('[data-card-open="note-1"]').click()
  await related(panel(page), 'activity').click()
  await expect(preview(page).locator('[data-preview-box]')).toHaveAttribute('data-tone', 'success')
  await expect(preview(page).locator('.badge.danger')).toHaveCount(0)
})
