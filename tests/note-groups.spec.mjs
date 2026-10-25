import {test, expect} from '@playwright/test'

async function go(page, rtl) {
  await page.route('https://cdn.jsdelivr.net/**', route => route.abort())
  await page.goto('/help-screens/notes')
  for (const [id, checked] of [['simulate-loading', false], ['rtl', rtl]]) await page.locator(`#${id}`).evaluate((el, value) => {
    el.checked = value; el.dispatchEvent(new Event('change', {bubbles: true}))
  }, checked)
  if (await page.locator('#kit-hide').isVisible()) await page.locator('#kit-hide').click()
}

test('Draft and Archive are the only protected groups; Active can be edited', async ({page}, info) => {
  await go(page, Boolean(info.project.use.rtl))
  await page.locator('[data-manage-columns]').click()
  const panel = page.locator('#collab-panel')
  for (const id of ['draft', 'archived']) {
    const row = panel.locator(`[data-stage-id="${id}"]`)
    await expect(row.locator('[data-stage-label]')).toHaveAttribute('readonly', '')
    await expect(row.locator('[data-stage-hidden]')).toBeDisabled()
    await expect(row.locator('[data-stage-remove], [data-stage-drag]')).toHaveCount(0)
    for (const move of await row.locator('[data-stage-order]').all()) await expect(move).toBeDisabled()
  }
  await expect(panel.locator('[data-stage-id]').first()).toHaveAttribute('data-stage-id', 'draft')
  await expect(panel.locator('[data-stage-id]').last()).toHaveAttribute('data-stage-id', 'archived')
  const active = panel.locator('[data-stage-id="active"]')
  await active.locator('[data-stage-label]').fill('Customer notes')
  await expect(active.locator('[data-stage-remove]')).toBeEnabled()
  await panel.locator('[data-panel-save]').click()
  await expect(page.locator('[data-column="active"]')).toContainText('Customer notes')
  await page.locator('[data-card-open]', {hasText: 'Payment terms for Al Noor'}).click()
  await panel.locator('[data-panel-edit]').click()
  await expect(panel.locator('#note-group')).toHaveValue('active')
  await expect(panel.locator('#note-status')).toHaveCount(0)
})

test('removing Active moves its notes to the chosen group and stays removed after reload', async ({page}, info) => {
  await go(page, Boolean(info.project.use.rtl))
  await page.locator('[data-manage-columns]').click()
  const panel = page.locator('#collab-panel')
  const active = panel.locator('[data-stage-id="active"]')
  await active.locator('[data-stage-remove]').check()
  await active.locator('[data-stage-destination]').selectOption('draft')
  await panel.locator('[data-panel-save]').click()
  await page.locator('#collab-confirm [data-confirm-ok]').click()
  await expect(page.locator('[data-column="active"]')).toHaveCount(0)
  await expect(page.locator('[data-column="draft"]')).toContainText('Payment terms for Al Noor')
  await page.reload()
  await expect(page.locator('[data-column="active"]')).toHaveCount(0)
  await expect(page.locator('[data-column="draft"]')).toContainText('Payment terms for Al Noor')
  const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem('skey-proto-collab')))
  expect(saved.noteGroups.map(group => group.id)).toEqual(['draft', 'archived'])
  expect(saved.entities.note.every(note => note.groupId && !('status' in note))).toBe(true)
})
