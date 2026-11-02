import {test, expect} from '@playwright/test'

const canvas = page => page.locator('#notifications-list-canvas')

async function openNotifications(page) {
  await page.goto('/help-screens/notifications')
  if (await page.locator('#kit-hide').isVisible()) await page.locator('#kit-hide').click()
  await expect(canvas(page).locator('[data-notification-action="read"]')).toHaveCount(8)
}

test('notifications keep their list interactive after the invoice shell updates', async ({page}) => {
  await openNotifications(page)
  await expect(canvas(page).locator('thead th')).toContainText(['Subject', 'Source', 'Actions'])
  await canvas(page).getByRole('button', {name: 'Star notification'}).first().click()
  await expect(canvas(page).getByRole('button', {name: 'Unstar notification'})).toHaveCount(1)
  await canvas(page).locator('[data-list-open-record]').first().click()
  await expect(page.locator('#notification-modal')).toBeVisible()
  await page.locator('#notification-modal-actions').getByRole('button', {name: 'Mark as unread'}).click()
  await expect(page.locator('#notification-modal-actions').getByRole('button', {name: 'Mark as read'})).toBeVisible()
  await page.locator('#notification-modal-close-btn').click()
  await expect(canvas(page).locator('[data-list-open-record]')).toHaveCount(8)
  await page.reload()
  await expect(canvas(page).getByRole('button', {name: 'Unstar notification'})).toHaveCount(1)
})
