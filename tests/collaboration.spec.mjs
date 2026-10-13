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
  test.skip(testInfo.project.name !== 'desktop', 'Collaboration flows run on the desktop project.')
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

  test('new tag is immediately available in the tag filter', async ({page}) => {
    await go(page, '/help-screens/notes')
    await page.locator('.notes-view [data-collab-new]').click()
    await page.locator('#note-title').fill('Tagged note')
    await page.locator('#note-tags').fill('Quarter close')
    await panel(page).getByRole('button', {name: 'Save'}).click()
    await expect(page.locator('#notes-tag option', {hasText: 'Quarter close'})).toHaveCount(1)
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

test.describe('events', () => {
  test('an overnight event appears on both days in every calendar mode', async ({page}) => {
    await go(page, '/help-screens/events')
    await page.locator('.events-view [data-collab-new]').click()
    await page.locator('#event-title').fill('Overnight handoff')
    await page.locator('#event-start').fill('2026-10-13T23:00')
    await page.locator('#event-end').fill('2026-10-14T01:00')
    await panel(page).getByRole('button', {name: 'Save'}).click()
    await page.locator('.events-view [data-cal-modes] button', {hasText: 'Day'}).click()
    await page.locator('.events-view [data-cal-next]').click()
    await expect(page.locator('.events-view [data-timed] [data-cal-item]', {hasText: 'Overnight handoff'})).toHaveCount(1)
    await page.locator('.events-view [data-cal-modes] button', {hasText: 'Week'}).click()
    await expect(page.locator('.events-view [data-timed] [data-cal-item]', {hasText: 'Overnight handoff'})).toHaveCount(2)
    await expect(page.locator('.events-view [data-timed] [data-cal-item]', {hasText: 'Overnight handoff'}).nth(1)).toContainText('Continues')
    await page.locator('.events-view [data-cal-modes] button', {hasText: 'Month'}).click()
    await expect(page.locator('.events-view [data-cal-month] [data-cal-item]', {hasText: 'Overnight handoff'})).toHaveCount(2)
  })

  test('events expose calendar only with Day/Week/Month', async ({page}) => {
    await go(page, '/help-screens/events')
    await expect(page.locator('.events-view [data-view-switch]')).toHaveCount(0)
    await expect(page.locator('.events-view [data-cal-modes] button')).toHaveText(['Day', 'Week', 'Month'])
    await expect(page.locator('.events-view [data-cal-title]')).toHaveText('October 2026')
    await expect(page.locator('.events-view [data-cal-item]', {hasText: 'Monthly sales review'})).toBeVisible()
    await page.locator('.events-view [data-cal-modes] button', {hasText: 'Week'}).click()
    await expect(page.locator('.events-view [data-allday-row]')).toBeVisible()
    await expect(page.locator('.events-view [data-timed] [data-cal-item]', {hasText: 'Supplier visit'})).toBeVisible()
    await page.locator('.events-view [data-cal-next]').click()
    await expect(page.locator('.events-view [data-cal-title]')).toContainText('18')
    await page.locator('.events-view [data-cal-today]').click()
    await expect(page.locator('.events-view [data-cal-title]')).toContainText('11')
  })

  test('create timed and all-day events', async ({page}) => {
    await go(page, '/help-screens/events')
    await page.locator('.events-view [data-collab-new]').click()
    await page.locator('#event-title').fill('Budget sync')
    await expect(page.locator('#event-start')).toHaveValue('2026-10-13T13:30')
    await expect(page.locator('#event-end')).toHaveValue('2026-10-13T14:30')
    await panel(page).getByRole('button', {name: 'Save'}).click()
    await page.locator('.events-view [data-cal-modes] button', {hasText: 'Day'}).click()
    await expect(page.locator('.events-view [data-timed] [data-cal-item]', {hasText: 'Budget sync'})).toBeVisible()
    await page.locator('.events-view [data-collab-new]').click()
    await page.locator('#event-title').fill('Offsite')
    await page.locator('#event-allday').check()
    await panel(page).getByRole('button', {name: 'Save'}).click()
    await expect(page.locator('.events-view [data-allday-row] [data-cal-item]', {hasText: 'Offsite'})).toBeVisible()
    await expect(page.locator('.events-view [data-timed] [data-cal-item]', {hasText: 'Offsite'})).toHaveCount(0)
  })

  test('end before start is rejected', async ({page}) => {
    await go(page, '/help-screens/events')
    await page.locator('.events-view [data-collab-new]').click()
    await page.locator('#event-title').fill('Bad')
    await page.locator('#event-end').fill('2026-10-13T09:00')
    await panel(page).getByRole('button', {name: 'Save'}).click()
    await expect(panel(page)).toContainText('End must be after start')
  })

  test('notes never appear on calendars even when linked to an event', async ({page}) => {
    await go(page, '/help-screens/events')
    await expect(page.locator('.events-view [data-cal-item]', {hasText: 'ملاحظات اجتماع المبيعات'})).toHaveCount(0)
    await page.locator('.events-view [data-cal-item]', {hasText: 'Monthly sales review'}).click()
    await expect(panel(page).locator('[data-related-row]', {hasText: 'ملاحظات اجتماع المبيعات'})).toBeVisible()
  })
})

test.describe('activities', () => {
  const switchTo = (page, name) => page.locator('.activities-view [data-view-switch] button', {hasText: name}).click()

  test('activities expose exactly Kanban and Calendar', async ({page}) => {
    await go(page, '/help-screens/activities')
    await expect(page.locator('.activities-view [data-view-switch] button')).toHaveText(['Kanban', 'Calendar'])
    await expect(page.locator('.activities-view [data-column]')).toHaveCount(3)
  })

  test('overdue is shown with text, not color only', async ({page}) => {
    await go(page, '/help-screens/activities')
    await expect(page.locator('[data-card-id="act-2"]')).toContainText('Overdue')
  })

  test('unscheduled activities stay off the calendar', async ({page}) => {
    await go(page, '/help-screens/activities')
    await switchTo(page, 'Calendar')
    const view = page.locator('.activities-view')
    await expect(view.locator('[data-cal-item]', {hasText: 'Call Al Noor about quotation 884'})).toBeVisible()
    await expect(view.locator('[data-cal-item]', {hasText: 'Send revised price list'})).toHaveCount(0)
    await expect(view.locator('[data-cal-item]', {hasText: 'Confirm stock counts'})).toHaveCount(0)
    await expect(view.locator('[data-unscheduled-notice]')).toContainText('unscheduled')
    await expect(view.locator('[data-cal-item]', {hasText: 'Supplier visit'})).toHaveCount(0)
  })

  test('clearing the scheduled time removes it from the calendar', async ({page}) => {
    await go(page, '/help-screens/activities')
    await page.locator('[data-card-open="act-1"]').click()
    await page.locator('#activity-schedule-clear').click()
    await panel(page).getByRole('button', {name: 'Save'}).click()
    await switchTo(page, 'Calendar')
    await expect(page.locator('.activities-view [data-cal-item]', {hasText: 'Call Al Noor'})).toHaveCount(0)
  })

  test('meeting creates one linked event, never two', async ({page}) => {
    await go(page, '/help-screens/activities')
    await page.locator('[data-card-open="act-1"]').click()
    await page.locator('#activity-kind').selectOption('meeting')
    await panel(page).getByRole('button', {name: 'Save'}).click()
    await page.locator('[data-card-open="act-1"]').click()
    await panel(page).getByRole('button', {name: 'Create event'}).click()
    await expect(page.locator('.events-view')).toBeVisible()
    await expect(panel(page).locator('[data-related-row]', {hasText: 'Call Al Noor about quotation 884'})).toBeVisible()
    await page.keyboard.press('Escape')
    await go(page, '/help-screens/activities')
    await page.locator('[data-card-open="act-1"]').click()
    await expect(panel(page).getByRole('button', {name: 'Create event'})).toHaveCount(0)
    await expect(panel(page).getByRole('button', {name: 'Open linked event'})).toBeVisible()
  })

  test('mark done offers a linked follow-up', async ({page}) => {
    await go(page, '/help-screens/activities')
    await page.locator('[data-card-open="act-6"]').click()
    await panel(page).getByRole('button', {name: 'Mark done'}).click()
    await panel(page).getByRole('button', {name: 'Schedule follow-up'}).click()
    await expect(panel(page).locator('[data-related-row]', {hasText: 'Review password policy'})).toBeVisible()
    await expect(page.locator('#activity-summary')).toHaveValue('Follow up: Review password policy')
  })

  test('linking an activity to an event changes neither', async ({page}) => {
    await go(page, '/help-screens/activities')
    await page.locator('[data-card-open="act-6"]').click()
    await panel(page).getByRole('button', {name: 'Link existing…'}).click()
    await page.locator('#collab-picker').getByRole('searchbox').fill('Quarter close')
    await page.locator('#collab-picker').getByRole('option', {name: /Event Quarter close/}).click()
    await page.locator('#collab-picker').getByRole('button', {name: 'Done'}).click()
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-column="planned"] [data-card-id="act-6"]')).toBeVisible()
    await switchTo(page, 'Calendar')
    await expect(page.locator('.activities-view [data-cal-item]', {hasText: 'Review password policy'})).toHaveCount(0)
  })
})

test.describe('internal mail', () => {
  test('saved quick reply is restored after leaving and returning', async ({page}) => {
    await go(page, '/system/email')
    await row(page, 'Payment scheduled').click()
    await page.locator('#email-quick-reply').fill('I will check the receipt')
    await expect.poll(() => page.evaluate(() =>
      JSON.parse(sessionStorage.getItem('skey-proto-collab')).entities.mail.some(m =>
        m.folder === 'drafts' && m.body?.includes('I will check the receipt'))
    )).toBe(true)
    await go(page, '/help-screens/notes')
    await go(page, '/system/email')
    await expect(page.locator('#email-quick-reply')).toHaveValue('I will check the receipt')
  })

  test('unfinished recipient input survives navigation in Drafts', async ({page}) => {
    await go(page, '/system/email')
    await page.locator('.email-compose').click()
    await page.locator('#email-compose-to').fill('reader@example.com')
    await expect.poll(() => page.evaluate(() =>
      JSON.parse(sessionStorage.getItem('skey-proto-collab')).entities.mail.some(m =>
        m.folder === 'drafts' && m.toInput === 'reader@example.com')
    )).toBe(true)
    await go(page, '/help-screens/notes')
    await go(page, '/system/email')
    await folder(page, 'drafts').click()
    await row(page, '(no subject)').first().click()
    await expect(page.locator('#email-compose-to')).toHaveValue('reader@example.com')
  })

  test('typed Cc recipient is included when sending', async ({page}) => {
    await go(page, '/system/email')
    await page.locator('.email-compose').click()
    await page.locator('#email-compose-to').fill('reader@example.com')
    await page.locator('[data-add-cc]').click()
    await page.locator('#email-compose-cc').fill('copy@example.com')
    await page.locator('#email-compose-subject').fill('Cc check')
    await page.locator('.email-send').click()
    await expect(page.locator('.email-view')).toContainText('copy@example.com')
  })

  test('mail list exposes selected option semantics', async ({page}) => {
    await go(page, '/system/email')
    await expect(page.locator('#email-list-scroll [role="listbox"]')).toBeVisible()
    await row(page, 'Payment scheduled').click()
    await expect(row(page, 'Payment scheduled')).toHaveAttribute('role', 'option')
    await expect(row(page, 'Payment scheduled')).toHaveAttribute('aria-selected', 'true')
  })

  const folder = (page, id) => page.locator(`.email-view [data-folder="${id}"]`)
  const row = (page, text) => page.locator('.email-list-row', {hasText: text})

  test('folders exist and show the right messages', async ({page}) => {
    await go(page, '/system/email')
    await expect(page.locator('.email-view [data-folder]')).toHaveText([/Inbox/, /Starred/, /Sent/, /Drafts/, /Archive/, /Trash/])
    await folder(page, 'sent').click()
    await expect(row(page, 'Re: Stock check needed')).toBeVisible()
    await expect(row(page, 'Payment scheduled')).toHaveCount(0)
    await folder(page, 'starred').click()
    await expect(row(page, 'Payment scheduled')).toBeVisible()
  })

  test('draft survives navigation and reload, send moves it to Sent', async ({page}) => {
    await go(page, '/system/email')
    await page.locator('.email-compose').click()
    await page.locator('#email-compose-to').fill('Mariam')
    await page.getByRole('option', {name: /Mariam Adel/}).click()
    await page.locator('#email-compose-subject').fill('Quarter close plan')
    await page.locator('.email-composer-input').fill('Draft body text')
    await expect(page.locator('[data-draft-status]')).toContainText('Draft saved')
    await go(page, '/help-screens/notes')
    await page.reload()
    await go(page, '/system/email')
    await folder(page, 'drafts').click()
    await row(page, 'Quarter close plan').click()
    await expect(page.locator('.email-composer-input')).toHaveValue('Draft body text')
    await expect(page.locator('[data-recipient-chip]')).toContainText('Mariam Adel')
    await page.locator('.email-send').click()
    await expect(page.getByText(/nothing is delivered/)).toBeVisible()
    await expect(row(page, 'Quarter close plan')).toHaveCount(0)
    await folder(page, 'sent').click()
    await expect(row(page, 'Quarter close plan')).toBeVisible()
  })

  test('create activity from a message preserves the relationship', async ({page}) => {
    await go(page, '/system/email')
    await row(page, 'Payment scheduled').click()
    await page.getByRole('toolbar', {name: 'Message actions'}).getByRole('button', {name: 'Create activity'}).click()
    await expect(page.locator('.activities-view')).toBeVisible()
    await expect(panel(page).locator('[data-related-row]', {hasText: 'Payment scheduled for Sales Invoice 126'})).toBeVisible()
    await panel(page).locator('[data-related-row]', {hasText: 'Payment scheduled'}).locator('[data-related-open]').click()
    await expect(page.locator('.email-view')).toBeVisible()
    await expect(page.locator('.email-view [data-related-row]', {hasText: 'Follow up: Payment scheduled'})).toBeVisible()
  })

  test('email activity composes a linked draft', async ({page}) => {
    await go(page, '/help-screens/activities')
    await page.locator('[data-card-open="act-4"]').click()
    await panel(page).getByRole('button', {name: 'Compose email'}).click()
    await expect(page.locator('.email-view #email-compose-subject')).toBeVisible()
    await expect(page.locator('.email-view [data-related-row]', {hasText: 'Send revised price list'})).toBeVisible()
  })

  test('delete moves to trash and archive moves to archive', async ({page}) => {
    await go(page, '/system/email')
    await row(page, 'password expires').click()
    await page.getByRole('toolbar', {name: 'Message actions'}).getByRole('button', {name: 'Delete', exact: true}).click()
    await expect(row(page, 'password expires')).toHaveCount(0)
    await folder(page, 'trash').click()
    await expect(row(page, 'password expires')).toBeVisible()
    await folder(page, 'inbox').click()
    await row(page, 'New quotation').click()
    await page.getByRole('toolbar', {name: 'Message actions'}).getByRole('button', {name: 'Archive', exact: true}).click()
    await folder(page, 'archive').click()
    await expect(row(page, 'New quotation')).toBeVisible()
  })

  test('search filters within the folder', async ({page}) => {
    await go(page, '/system/email')
    await page.locator('#email-search-input').fill('quotation')
    await expect(page.locator('.email-list-row')).toHaveCount(1)
    await page.locator('#email-search-input').fill('zzz-nothing')
    await expect(page.locator('.email-view')).toContainText('No messages match')
  })

  test('send without recipients is blocked with a message', async ({page}) => {
    await go(page, '/system/email')
    await page.locator('.email-compose').click()
    await page.locator('.email-composer-input').fill('Body only')
    await page.locator('.email-send').click()
    await expect(page.locator('.email-view')).toContainText('Add at least one recipient')
  })
})

test.describe('people data', () => {
  test('list shows bilingual names and conversion state', async ({page}) => {
    await go(page, '/help-screens/people-data')
    await expect(page.locator('.people-view table')).toContainText('أحمد علي')
    await expect(page.locator('.people-view tr', {hasText: 'Khaled Ibrahim'})).toContainText('Converted to Customer')
  })

  test('duplicate warning and simulated conversion leave Customers untouched', async ({page}) => {
    await go(page, '/customers/list')
    const customerRows = await page.locator('.customer-list-view [data-list-open-record]').count()
    await go(page, '/help-screens/people-data')
    await page.locator('.people-view [data-collab-new]').click()
    await page.locator('#person-name-en').fill('New Contact')
    await page.locator('[data-contact-value]').first().fill('+20 122 555 0199')
    await expect(panel(page).locator('[data-duplicate]')).toContainText('Sara Mahmoud')
    await panel(page).getByRole('button', {name: 'Save'}).click()
    await expect(page.locator('.people-view table')).toContainText('New Contact')
    await page.locator('.people-view [data-row-open]', {hasText: 'Sara Mahmoud'}).click()
    await panel(page).getByRole('button', {name: 'More actions'}).click()
    await page.getByRole('menuitem', {name: 'Convert to Customer'}).click()
    await expect(page.locator('#collab-confirm')).toContainText('No Customer record is created')
    await page.locator('#collab-confirm').getByRole('button', {name: 'Convert'}).click()
    await expect(page.locator('.people-view tr', {hasText: 'Sara Mahmoud'})).toContainText('Converted to Customer')
    await go(page, '/customers/list')
    await expect(page.locator('.customer-list-view [data-list-open-record]')).toHaveCount(customerRows)
  })

  test('invalid email contact is rejected', async ({page}) => {
    await go(page, '/help-screens/people-data')
    await page.locator('.people-view [data-collab-new]').click()
    await page.locator('#person-name-en').fill('Mail Typo')
    await page.locator('[data-contact-kind]').first().selectOption('email')
    await page.locator('[data-contact-value]').first().fill('not-an-email')
    await panel(page).getByRole('button', {name: 'Save'}).click()
    await expect(panel(page)).toContainText('Enter a valid email')
  })
})

test('collaboration screens mirror in RTL and translate their titles', async ({page}) => {
  await go(page, '/help-screens/notes')
  await page.locator('#rtl').evaluate(el => {
    el.checked = true
    el.dispatchEvent(new Event('change', {bubbles: true}))
  })
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('.notes-view h1')).toHaveText('الملاحظات')
  const board = await page.locator('.notes-view [data-column="draft"]').boundingBox()
  const archived = await page.locator('.notes-view [data-column="archived"]').boundingBox()
  expect(archived.x).toBeLessThan(board.x)
})
