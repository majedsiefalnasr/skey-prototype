import {test, expect} from '@playwright/test'
import {settle} from './support/browser.mjs'

// Collaboration suite (Notes, Activities, Events, Internal Mail, People
// Data). Boots by deep link like routing.spec.mjs and clears only the
// collaboration store's key before every document load, so each test
// starts from the seed without touching any other prototype state.

const base = () => process.env.PARITY_URL ?? 'http://127.0.0.1:4173'

async function go(page, path) {
  await page.goto(`${base()}${path}`)
  const loading = page.locator('#simulate-loading')
  if (await loading.isChecked()) await loading.uncheck()
  await settle(page)
  // The floating prototype-controls panel overlaps the sidebar rail these
  // tests click through; hiding it uses the panel's own control.
  const kitHide = page.locator('#kit-hide')
  if (await kitHide.isVisible()) await kitHide.click()
}

test.beforeEach(async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop' && !testInfo.title.includes('[all]'), 'Collaboration flows run on the desktop project.')
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('collab-test-booted')) {
      sessionStorage.removeItem('skey-proto-collab')
      sessionStorage.setItem('collab-test-booted', '1')
    }
  })
})

for (const [path, selector, title] of [
  ['/help-screens/notes', '.notes-view', 'Notes'],
  ['/help-screens/activities', '.activities-view', 'Activities'],
  ['/help-screens/events', '.events-view', 'Events'],
  ['/help-screens/people-data', '.people-view', 'People Data'],
]) {
  test(`deep link ${path} shows ${title}`, async ({page}) => {
    await go(page, path)
    await expect(page.locator(selector)).toBeVisible()
    await expect(page.locator(`${selector} h1`)).toHaveText(title)
  })
}

test('Help Screens rows open their screens and Internal Mail opens email', async ({page}) => {
  for (const [label, selector] of [
    ['Notes', '.notes-view'],
    ['Activities', '.activities-view'],
    ['Events', '.events-view'],
    ['People Data', '.people-view'],
    ['Internal Mail', '.email-view'],
  ]) {
    await go(page, '/help-screens')
    await page.locator(`.nc1-item[data-label="${label}"]`).first().click()
    await expect(page.locator(selector)).toBeVisible()
  }
})

const card = (page, title) => page.locator('[data-card-open]', {hasText: title})
const panel = page => page.locator('#collab-panel')

test.describe('notes', () => {
  test('notes expose exactly Kanban and List', async ({page}) => {
    await go(page, '/help-screens/notes')
    const views = page.locator('.notes-view [data-view-switch] button')
    await expect(views).toHaveText(['Kanban', 'List'])
    await expect(page.locator('.notes-view [data-column]')).toHaveCount(3)
    await expect(page.locator('.notes-view [data-column="archived"]')).toHaveAttribute('data-collapsed', 'true')
    await expect(page.locator('.notes-view')).not.toContainText('Old pricing assumptions')
    await views.nth(1).click()
    await expect(page.locator('.notes-view table')).toBeVisible()
    await expect(page.locator('.notes-view table')).not.toContainText('Old pricing assumptions')
  })

  test('quick add creates a draft note with only a title', async ({page}) => {
    await go(page, '/help-screens/notes')
    await page.locator('[data-column="draft"] [data-quick-add]').fill('Call back Sara')
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-column="draft"]')).toContainText('Call back Sara')
  })

  test('move to changes status only', async ({page}) => {
    await go(page, '/help-screens/notes')
    await page.getByLabel('Move Month-end checklist to').selectOption('active')
    await expect(page.locator('[data-column="active"]')).toContainText('Month-end checklist')
  })

  test('new note needs only a title and validates it', async ({page}) => {
    await go(page, '/help-screens/notes')
    await page.locator('.notes-view [data-collab-new]').click()
    await panel(page).getByRole('button', {name: 'Save'}).click()
    await expect(panel(page)).toContainText('Title is required')
    await page.locator('#note-title').fill('Visit plan')
    await panel(page).getByRole('button', {name: 'Save'}).click()
    await expect(panel(page)).toBeHidden()
    await expect(card(page, 'Visit plan')).toBeVisible()
  })

  test('search and view survive navigation', async ({page}) => {
    // Enter through the app landing: deep links to inner screens leave the
    // rail panel empty (pre-existing shell behavior, same for Geography).
    await go(page, '/help-screens')
    await page.locator('.nc1-item[data-label="Notes"]').first().click()
    await page.locator('.notes-view [data-view-switch] button', {hasText: 'List'}).click()
    await page.locator('.notes-view input[type=search]').fill('warehouse')
    await page.locator('.nc1-item[data-label="Events"]').first().click()
    await expect(page.locator('.events-view')).toBeVisible()
    await page.locator('.nc1-item[data-label="Notes"]').first().click()
    await expect(page.locator('.notes-view input[type=search]')).toHaveValue('warehouse')
    await expect(page.locator('.notes-view table tbody tr')).toHaveCount(1)
  })

  test('titles are escaped', async ({page}) => {
    await go(page, '/help-screens/notes')
    await page.locator('.notes-view [data-collab-new]').click()
    await page.locator('#note-title').fill('<b>bold</b>')
    await panel(page).getByRole('button', {name: 'Save'}).click()
    await expect(card(page, '<b>bold</b>')).toBeVisible()
    await expect(page.locator('.notes-view [data-card-open] b')).toHaveCount(0)
  })
})

test.describe('related items', () => {
  test('link is visible from both sides and dedupes', async ({page}) => {
    await go(page, '/help-screens/notes')
    await card(page, 'Month-end checklist').click()
    await panel(page).getByRole('button', {name: 'Link existing…'}).click()
    const picker = page.locator('#collab-picker')
    await picker.getByRole('searchbox').fill('Quarter close')
    await picker.getByRole('option', {name: /Event Quarter close/}).click()
    await expect(picker.getByRole('option', {name: /Event Quarter close/})).toHaveCount(0)
    await picker.getByRole('button', {name: 'Done'}).click()
    await expect(panel(page).locator('[data-related-row]')).toHaveCount(1)
    await panel(page).locator('[data-related-row]', {hasText: 'Quarter close'}).locator('[data-related-open]').click()
    await expect(page.locator('.events-view')).toBeVisible()
    await expect(panel(page).locator('[data-related-row]', {hasText: 'Month-end checklist'})).toBeVisible()
  })

  test('unlink keeps both items', async ({page}) => {
    await go(page, '/help-screens/notes')
    await card(page, 'Payment terms for Al Noor').click()
    await panel(page).getByRole('button', {name: 'Remove link to Call Al Noor about quotation 884'}).click()
    await expect(panel(page).locator('[data-related-row]', {hasText: 'Call Al Noor'})).toHaveCount(0)
    await page.keyboard.press('Escape')
    await go(page, '/help-screens/activities')
    await expect(card(page, 'Call Al Noor about quotation 884')).toBeVisible()
  })

  test('deleted item shows as unavailable on the other side', async ({page}) => {
    await go(page, '/help-screens/notes')
    await card(page, 'Payment terms for Al Noor').click()
    await panel(page).getByRole('button', {name: 'More actions'}).click()
    await page.getByRole('menuitem', {name: 'Delete'}).click()
    await page.locator('#collab-confirm').getByRole('button', {name: 'Delete'}).click()
    await go(page, '/help-screens/people-data')
    await page.locator('.people-view [data-row-open]', {hasText: 'Ahmed Ali'}).click()
    await expect(panel(page)).toContainText('Unavailable item')
  })

  test('create related keeps the relationship', async ({page}) => {
    await go(page, '/help-screens/notes')
    await card(page, 'Warehouse 201 variance notes').click()
    await panel(page).getByRole('button', {name: 'Create related'}).click()
    await page.getByRole('menuitem', {name: 'Activity'}).click()
    await expect(page.locator('.activities-view')).toBeVisible()
    await expect(panel(page).locator('[data-related-row]', {hasText: 'Warehouse 201 variance notes'})).toBeVisible()
  })
})
