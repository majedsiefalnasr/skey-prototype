import {test, expect} from '@playwright/test'

test('appearance choices and their applied styles survive a browser refresh', async ({page}) => {
  await page.goto('/customers/list')
  const choices = {theme: 'dark', density: 'compact', 'content-layout': 'boxed', 'interface-scale': '110', 'input-style': 'inline', 'section-style': 'fieldset'}
  for (const [id, value] of Object.entries(choices)) {
    await page.locator(`#${id}`).evaluate((control, next) => {
      control.value = next
      control.dispatchEvent(new Event('change'))
    }, value)
  }
  await page.reload()
  for (const [id, value] of Object.entries(choices)) await expect(page.locator(`#${id}`)).toHaveValue(value)
  // A new tab shares browser preferences but has no prototype session state.
  const fresh = await page.context().newPage()
  await fresh.goto('/customers/list')
  for (const [id, value] of Object.entries(choices)) await expect(fresh.locator(`#${id}`)).toHaveValue(value)
  await fresh.close()
  await expect(page.locator('html')).toHaveAttribute('data-color-mode', 'dark')
  await expect(page.locator('body')).toHaveClass(/density-compact/)
  await expect(page.locator('body')).toHaveClass(/layout-boxed/)
  await expect(page.locator('body')).toHaveClass(/style-inline/)
  await expect(page.locator('body')).toHaveClass(/cards-fieldset/)
  await expect(page.locator('html')).toHaveCSS('--ui-scale', '1.1')
})

test('profile appearance changes and returning to defaults persist after refresh', async ({page}) => {
  await page.goto('/system/profile?section=appearance')
  if (await page.locator('#kit-hide').isVisible()) await page.locator('#kit-hide').click()
  await page.locator('[data-appearance-theme="dark"]').click()
  await page.locator('[data-appearance-density="comfortable"]').click()
  await page.locator('[data-appearance-layout="boxed"]').click()
  await page.reload()
  await expect(page.locator('[data-appearance-theme="dark"]')).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator('[data-appearance-density="comfortable"]')).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator('body')).toHaveClass(/layout-boxed/)
  await page.locator('[data-appearance-theme="system"]').click()
  await page.locator('[data-appearance-density="default"]').click()
  await page.locator('[data-appearance-layout="fluid"]').click()
  await page.reload()
  await expect(page.locator('#theme')).toHaveValue('system')
  await expect(page.locator('#density')).toHaveValue('default')
  await expect(page.locator('#content-layout')).toHaveValue('fluid')
})
