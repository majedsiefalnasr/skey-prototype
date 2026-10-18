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
  test('notes expose exactly Kanban and List in the view menu', async ({page}) => {
    await go(page, '/help-screens/notes')
    const menu = page.locator('.notes-view [data-view-menu]')
    await expect(menu.locator('summary')).toContainText('Kanban')
    await menu.locator('summary').click()
    await expect(menu.getByRole('menuitemradio')).toHaveText(['Kanban view', 'List view'])
    await expect(menu.getByRole('menuitemradio', {name: 'Kanban view'})).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('.notes-view [data-move]').first()).toBeVisible()
    await expect(page.locator('.notes-view [data-column]')).toHaveCount(3)
    await expect(page.locator('.notes-view [data-column="archived"]')).toHaveAttribute('data-collapsed', 'true')
    await expect(page.locator('.notes-view')).not.toContainText('Old pricing assumptions')
    await menu.getByRole('menuitemradio', {name: 'List view'}).click()
    await expect(page.locator('.notes-view table')).toBeVisible()
    await expect(page.locator('.notes-view table')).not.toContainText('Old pricing assumptions')
  })

  test('list view fits 1280px without horizontal scrolling (Title takes remaining width)', async ({page}) => {
    await page.setViewportSize({width: 1280, height: 800})
    await go(page, '/help-screens/notes')
    const menu = page.locator('.notes-view [data-view-menu]')
    await menu.locator('summary').click()
    await menu.getByRole('menuitemradio', {name: 'List view'}).click()
    await expect(page.locator('.notes-view table')).toBeVisible()
    const scroll = page.locator('.notes-view .data-table-scroll')
    expect(await scroll.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
    // The Title column is wider than the fixed-width columns (colgroup).
    const widths = await page.locator('.notes-view table col').evaluateAll(cols => cols.map(c => c.getBoundingClientRect().width))
    expect(widths[0]).toBeGreaterThan(Math.max(...widths.slice(1)))
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

  test('a new tag is immediately available in the tag filter chip', async ({page}) => {
    await go(page, '/help-screens/notes')
    await page.locator('.notes-view [data-collab-new]').click()
    await page.locator('#note-title').fill('Tagged note')
    await page.locator('#note-tags').fill('Quarter close')
    await panel(page).getByRole('button', {name: 'Save'}).click()
    // Customers flow: "+ Filter" lists fields; picking Tag opens the chip
    // editor so the value is chosen inside the chip itself.
    const menu = page.locator('.notes-view [data-filter-menu]')
    await menu.locator('summary').click()
    await menu.getByRole('menuitem', {name: 'Tag', exact: true}).click()
    const chip = page.locator('.notes-view [data-collab-editor-key="tag"]')
    await expect(chip).toHaveJSProperty('open', true)
    await chip.getByRole('option', {name: 'Quarter close', exact: true}).click()
    await expect(page.locator('.notes-view [data-collab-remove-filter="tag"]')).toBeVisible()
    await expect(page.locator('.notes-view [data-card-open]', {hasText: 'Tagged note'})).toBeVisible()
  })

  test('a text filter chip takes its value inside the chip, like Customers', async ({page}) => {
    await go(page, '/help-screens/notes')
    await page.locator('.notes-view [data-filter-menu] summary').click()
    await page.getByRole('menuitem', {name: 'Note title', exact: true}).click()
    const chip = page.locator('.notes-view [data-collab-editor-key="title"]')
    await expect(chip).toHaveJSProperty('open', true)
    const input = chip.locator('[data-collab-filter-value="title"]')
    await expect(input).toBeFocused()
    await input.fill('checklist')
    await expect(page.locator('.notes-view [data-collab-remove-filter="title"]')).toBeVisible()
    await expect(page.locator('.notes-view [data-card-open]')).toHaveCount(1)
    await expect(page.locator('.notes-view [data-card-open]', {hasText: 'Month-end checklist'})).toBeVisible()
    await expect(input).toBeFocused()
    // The operator row lives in the same chip popover and re-filters live.
    await chip.getByRole('button', {name: 'starts with'}).click()
    await expect(chip.locator('summary')).toContainText('starts with')
    await expect(page.locator('.notes-view [data-card-open]')).toHaveCount(0)
    await expect(chip.locator('[data-collab-filter-value="title"]')).toBeFocused()
    await chip.locator('[data-collab-filter-value="title"]').fill('month')
    await expect(page.locator('.notes-view [data-card-open]', {hasText: 'Month-end checklist'})).toBeVisible()
  })

  test('an emptied quick filter names itself in the empty state', async ({page}) => {
    await go(page, '/help-screens/notes')
    // The move-select is Notes' non-drag status path — moving the only
    // draft empties the Draft quick filter, and the List view's empty
    // state names the filter instead of a generic phrase.
    await page.getByLabel('Move Month-end checklist to').selectOption('active')
    // The move runs through the shared work lifecycle; let it commit before
    // opening menus that its re-render would otherwise close.
    await expect(page.locator('.toast')).toContainText('Moved to Active')
    await page.locator('.notes-view [data-view-menu] summary').click()
    await page.getByRole('menuitemradio', {name: 'List view'}).click()
    await page.locator('.notes-view [data-quick-menu] summary').click()
    await page.getByRole('menuitemradio', {name: 'Draft', exact: true}).click()
    await expect(page.locator('.notes-view [data-collab-body]')).toContainText('No draft notes')
    await expect(page.locator('.notes-view [data-collab-body]')).not.toContainText('your filters')
  })

  test('zero-count columns stay visible under filters', async ({page}) => {
    await go(page, '/help-screens/notes')
    await expect(page.locator('.notes-view [data-column]')).toHaveCount(3)
    await page.locator('.notes-view [data-quick-menu] summary').click()
    await page.getByRole('menuitemradio', {name: 'Pinned', exact: true}).click()
    // Documented behavior: filters never hide columns — empty ones keep
    // their placeholder instead of collapsing away.
    await expect(page.locator('.notes-view [data-column]')).toHaveCount(3)
    await expect(page.locator('.notes-view [data-column="draft"]')).toContainText('No matching notes.')
  })

  test('search and view survive navigation', async ({page}) => {
    // Enter through the app landing: deep links to inner screens leave the
    // rail panel empty (pre-existing shell behavior, same for Geography).
    await go(page, '/help-screens')
    await page.locator('.nc1-item[data-label="Notes"]').first().click()
    await page.locator('.notes-view [data-view-menu] summary').click()
    await page.getByRole('menuitemradio', {name: 'List view'}).click()
    await page.locator('.notes-view input[type=search]').fill('warehouse')
    await page.locator('.nc1-item[data-label="Events"]').first().click()
    await expect(page.locator('.events-view')).toBeVisible()
    await page.locator('.nc1-item[data-label="Notes"]').first().click()
    await expect(page.locator('.notes-view input[type=search]')).toHaveValue('warehouse')
    await expect(page.locator('.notes-view [data-view-menu] summary')).toContainText('List')
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
    // Opening a linked record swaps the editor in place: the screen you were
    // on stays put and only the panel changes hands.
    await expect(page.locator('.notes-view')).toBeVisible()
    await expect(page.locator('.events-view')).toBeHidden()
    // Existing records open read-only; the form waits behind Edit.
    await panel(page).getByRole('button', {name: 'Edit'}).click()
    await expect(panel(page).locator('#event-title')).toHaveValue('Quarter close')
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
    // Delete runs through the shared work lifecycle; wait for it to commit.
    await expect(card(page, 'Payment terms for Al Noor')).toHaveCount(0)
    await go(page, '/help-screens/people-data')
    await page.locator('.people-view [data-row-open]', {hasText: 'Ahmed Ali'}).click()
    await expect(panel(page)).toContainText('Unavailable item')
  })

  test('create related keeps the relationship', async ({page}) => {
    await go(page, '/help-screens/notes')
    await card(page, 'Warehouse 201 variance notes').click()
    await panel(page).getByRole('button', {name: 'Create related'}).click()
    await page.getByRole('menuitem', {name: 'Activity'}).click()
    // The new activity's editor opens over Notes — creating a related item
    // never takes you to the other screen.
    await expect(page.locator('.notes-view')).toBeVisible()
    await expect(page.locator('.activities-view')).toBeHidden()
    await expect(panel(page).locator('#activity-summary')).toBeVisible()
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
    await expect(page.locator('.events-view [data-timed] [data-cal-item]', {hasText: 'Customer visit'})).toBeVisible()
    await page.locator('.events-view [data-cal-next]').click()
    await expect(page.locator('.events-view [data-cal-title]')).toContainText('18')
    await page.locator('.events-view [data-cal-today]').click()
    await expect(page.locator('.events-view [data-cal-title]')).toContainText('11')
  })

  test('the range control names the period and jumps between them', async ({page}) => {
    await go(page, '/help-screens/events')
    await expect(page.locator('.events-view [data-cal-preset]')).toHaveText('October 2026')
    await expect(page.locator('.events-view [data-cal-range]')).toContainText('2026')
    await page.locator('[data-cal-preset]').click()
    const menu = page.locator('[data-cal-preset-menu]')
    await expect(menu).toBeVisible()
    await expect(menu.getByRole('menuitem')).toHaveText([
      'Today',
      'This week',
      'This month',
      'Next week',
      'Next month',
      'Previous month',
    ])
    await menu.getByRole('menuitem', {name: 'Next week'}).click()
    await expect(menu).toBeHidden()
    await expect(page.locator('.events-view [data-cal-preset]')).toHaveText('Week of 18 Oct')
    await expect(page.locator('.events-view [data-cal-modes] [data-value="week"]')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.events-view [data-cal-range]')).toContainText('24 Oct 2026')
  })

  test('the participants filter is a searchable multiselect', async ({page}) => {
    await go(page, '/help-screens/events')
    await expect(page.locator('.events-view [data-cal-tabs]')).toHaveCount(0)
    await page.locator('.events-view [data-filter-menu] summary').click()
    await page.getByRole('menuitem', {name: 'Participant', exact: true}).click()
    const chip = page.locator('.events-view [data-collab-editor-key="participant"]')
    await expect(chip).toHaveJSProperty('open', true)
    const summary = chip.locator('summary .data-filter-value')
    await expect(summary).toHaveText('Anyone')
    await expect(page.locator('.events-view [data-cal-item]', {hasText: 'Customer visit'})).toBeVisible()
    const search = chip.locator('[data-collab-filter-search]')
    await search.fill('mariam')
    await expect(chip.getByRole('option', {name: /^Mariam/})).toBeVisible()
    await expect(chip.getByRole('option', {name: /^Omar/})).toBeHidden()
    await chip.getByRole('option', {name: /^Mariam/}).click()
    await expect(chip).toHaveJSProperty('open', true)
    await expect(summary).toHaveText(/^Mariam Adel/)
    await expect(page.locator('.events-view [data-cal-item]', {hasText: 'Monthly sales review'})).toBeVisible()
    await expect(page.locator('.events-view [data-cal-item]', {hasText: 'Customer visit'})).toHaveCount(0)
    await expect(page.locator('.events-view [data-cal-item]', {hasText: 'Company holiday'})).toHaveCount(0)
    await search.fill('omar')
    await chip.getByRole('option', {name: /^Omar/}).click()
    await expect(summary).toHaveText(/\+1$/)
    await expect(page.locator('.events-view [data-cal-item]', {hasText: 'Monthly sales review'})).toBeVisible()
    await expect(page.locator('.events-view [data-cal-item]', {hasText: 'Customer visit'})).toHaveCount(0)
    await page.locator('.events-view [data-clear-filters]').click()
    await expect(page.locator('.events-view [data-cal-item]', {hasText: 'Customer visit'})).toBeVisible()
    await expect(page.locator('.events-view [data-cal-item]', {hasText: 'Company holiday'})).toBeVisible()
  })

  test('overlapping events are marked as conflicts with a notice', async ({page}) => {
    await go(page, '/help-screens/events')
    await page.locator('.events-view [data-collab-new]').click()
    await page.locator('#event-title').fill('Al Noor follow-up')
    await page.locator('#event-start').fill('2026-10-13T11:30')
    await page.locator('#event-end').fill('2026-10-13T12:30')
    await panel(page).getByRole('button', {name: 'Save'}).click()
    await expect(page.locator('.events-view [data-conflict-notice]')).toContainText('2 events overlap')
    await expect(page.locator('.events-view [data-cal-conflict="true"]')).toHaveCount(2)
    await expect(page.locator('.events-view [data-cal-conflict="true"]', {hasText: 'Customer visit'})).toHaveAttribute('aria-label', /conflicting/)
    await expect(page.locator('.events-view [data-cal-conflict="true"]', {hasText: 'Al Noor follow-up'})).toHaveAttribute('aria-label', /conflicting/)
    await expect(page.locator('.events-view [data-cal-item]', {hasText: 'Company holiday'})).not.toHaveAttribute('aria-label', /conflicting/)
  })

  test('the participants field saves a searchable selection', async ({page}) => {
    await go(page, '/help-screens/events')
    await page.locator('.events-view [data-collab-new]').click()
    await page.locator('#event-title').fill('Warehouse walkthrough')
    await page.locator('#event-start').fill('2026-10-14T09:00')
    await page.locator('#event-end').fill('2026-10-14T10:00')
    await page.locator('#event-location').fill('Warehouse 201')
    await expect(page.locator('[data-map-label]')).toHaveText('Warehouse 201')
    const search = page.locator('#event-participants')
    await search.click()
    await search.fill('mariam')
    await page.locator('#event-participants-list [data-ms-opt="usr-2"]').click()
    await expect(page.locator('[data-ms-off="usr-2"]')).toBeVisible()
    await panel(page).getByRole('button', {name: 'Save'}).click()
    await page.locator('.events-view [data-cal-item]', {hasText: 'Warehouse walkthrough'}).click()
    await expect(panel(page).locator('dt:text-is("Participants") + dd')).toContainText('Majed Sief Alnasr')
    await expect(panel(page).locator('dt:text-is("Participants") + dd')).toContainText('Mariam Adel')
    await expect(panel(page).locator('dt:text-is("Location") + dd')).toHaveText('Warehouse 201')
  })

  test('the event panel reports its time state, not its type', async ({page}) => {
    await go(page, '/help-screens/events')
    await page.locator('.events-view [data-collab-new]').click()
    await expect(panel(page).locator('[data-panel-status]')).toBeHidden()
    await page.keyboard.press('Escape')
    await page.locator('.events-view [data-cal-item]', {hasText: 'Monthly sales review'}).first().click()
    await expect(panel(page).locator('[data-panel-type]')).toHaveCount(0)
    const chip = panel(page).locator('[data-panel-status]')
    await expect(chip).toHaveText('Upcoming')
    await expect(chip).toHaveClass(/fix/)
    await expect(panel(page).locator('[data-panel-description]')).toContainText('10:00')
    await expect(panel(page).locator('[data-panel-description]')).toContainText('Meeting room 2')
    // Read-only rows speak the same human dates as the header — never the
    // stored ISO keys with their T separator.
    await expect(panel(page)).toContainText('Thu 15 Oct 10:00')
    await expect(panel(page)).toContainText('Thu 15 Oct 11:00')
    await expect(panel(page)).not.toContainText('2026-10-15T')
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
  const switchTo = async (page, name) => {
    await page.locator('.activities-view [data-view-menu] summary').click()
    await page.getByRole('menuitemradio', {name: `${name} view`}).click()
  }

  test('activity move to changes status only', async ({page}) => {
    await go(page, '/help-screens/activities')
    const title = 'Call Al Noor about quotation 884'
    const before = await card(page, title).textContent()
    await page.getByLabel(`Move ${title} to`).selectOption('in_progress')
    await expect(page.locator('.activities-view [data-column="in_progress"]')).toContainText(title)
    await expect(page.locator('.toast')).toContainText('Moved to In progress')
    // The card's status chip flips; every other part of the card is
    // byte-identical — a status change touches nothing else.
    const stripStatus = text => text.replace(/^(Planned|In progress|Done|Cancelled)/, '')
    const after = await card(page, title).textContent()
    expect(after.startsWith('In progress')).toBe(true)
    expect(stripStatus(after)).toBe(stripStatus(before))
  })

  test('activities expose Kanban and Calendar behind a view menu', async ({page}) => {
    await go(page, '/help-screens/activities')
    const menu = page.locator('.activities-view [data-view-menu]')
    await expect(menu.locator('summary')).toContainText('Kanban')
    await menu.locator('summary').click()
    await expect(menu.getByRole('menuitemradio')).toHaveText(['Kanban view', 'Calendar view'])
    await expect(menu.getByRole('menuitemradio', {name: 'Kanban view'})).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('.activities-view [data-column]')).toHaveCount(3)
    // Same accessible "Move to" select as the notes board — the non-drag
    // path; drag and drop still works on top of it.
    await expect(page.locator('.activities-view [data-move]').first()).toBeVisible()
    // The toolbar is the invoices-style row: a quick-filter menu, an inline
    // "+ Filter" menu, search — and none of the old tab-strip chrome.
    await expect(page.locator('.activities-view [data-quick-menu] summary')).toContainText('All activities')
    await expect(page.locator('.activities-view [data-filter-menu]')).toHaveCount(1)
    await expect(page.locator('.activities-view [data-collab-search]')).toBeVisible()
    await expect(
      page.locator(
        '.activities-view [data-filter-row], .activities-view [data-filter-toggle], .activities-view [data-add-activity], .activities-view [data-add-view], .activities-view [data-customize], .activities-view [data-view-switch]'
      )
    ).toHaveCount(0)
    // The one primary action lives in the page header, not the toolbar.
    await expect(page.locator('.activities-view [data-collab-new]')).toContainText('New activity')
    // Escape dismisses a toolbar popover and returns focus to its summary.
    const quickMenu = page.locator('.activities-view [data-quick-menu]')
    await quickMenu.locator('summary').click()
    await page.keyboard.press('Escape')
    await expect(quickMenu).toHaveJSProperty('open', false)
    await expect(quickMenu.locator('summary')).toBeFocused()
  })

  test('quick filter and inline filters narrow the board', async ({page}) => {
    await go(page, '/help-screens/activities')
    // The quick menu narrows the board: only the done activity stays.
    await page.locator('.activities-view [data-quick-menu] summary').click()
    await page.getByRole('menuitemradio', {name: 'Done', exact: true}).click()
    await expect(page.locator('.activities-view [data-column="planned"]')).toContainText('No activities here.')
    await expect(page.locator('.activities-view [data-card-id="act-5"]')).toBeVisible()
    await page.locator('.activities-view [data-clear-filters]').click()
    await expect(page.locator('.activities-view [data-card-id="act-1"]')).toBeVisible()
    // The Overdue field shows up as an inline chip with an editable value.
    await page.locator('.activities-view [data-filter-menu] summary').click()
    await page.getByRole('menuitem', {name: 'Overdue', exact: true}).click()
    await expect(page.locator('.activities-view [data-collab-remove-filter="overdue"]')).toBeVisible()
    await expect(page.locator('.activities-view [data-card-id="act-2"]')).toBeVisible()
    await expect(page.locator('.activities-view [data-card-id="act-1"]')).toHaveCount(0)
    await page.locator('.activities-view [data-collab-remove-filter="overdue"]').click()
    await expect(page.locator('.activities-view [data-card-id="act-1"]')).toBeVisible()
    await expect(page.locator('.activities-view [data-collab-remove-filter="overdue"]')).toHaveCount(0)
    // Search filters the body in place; the toolbar (and its focus) survives.
    const search = page.locator('.activities-view [data-collab-search]')
    await search.fill('password')
    await expect(page.locator('.activities-view [data-card-id]')).toHaveCount(1)
    await expect(page.locator('.activities-view [data-card-id="act-6"]')).toBeVisible()
    await expect(page.locator('.activities-view [data-collab-search]')).toBeFocused()
  })

  test('card kebab offers edit, mark done and delete', async ({page}) => {
    await go(page, '/help-screens/activities')
    await page.locator('[data-card-menu-btn="act-1"]').click()
    const menu = page.locator('[data-card-id="act-1"] .mlist')
    await expect(menu).toBeVisible()
    await expect(menu.getByRole('menuitem')).toHaveText(['Edit', 'Mark done', 'Delete'])
    await menu.getByRole('menuitem', {name: 'Edit'}).click()
    await expect(menu).toBeHidden()
    await expect(panel(page).locator('#activity-summary')).toHaveValue('Call Al Noor about quotation 884')
    await page.keyboard.press('Escape')
    // A done activity's card offers no "Mark done".
    await page.locator('[data-card-menu-btn="act-5"]').click()
    await expect(page.locator('[data-card-id="act-5"] .mlist').getByRole('menuitem')).toHaveText(['Edit', 'Delete'])
  })

  test('the panel header carries a status chip, not a type badge', async ({page}) => {
    await go(page, '/help-screens/activities')
    await page.locator('[data-card-open="act-1"]').click()
    await expect(panel(page).locator('[data-panel-status]')).toHaveText('Planned')
    await expect(panel(page).locator('[data-panel-type]')).toHaveCount(0)
    await expect(panel(page).locator('[data-panel-description]')).toContainText('Call')
    // Due and scheduled rows are humanized like the cards; the stored ISO
    // keys stay in the editor inputs behind Edit.
    await expect(panel(page)).toContainText('Tue 13 Oct')
    await expect(panel(page)).toContainText('15:00 · 30 min')
    await expect(panel(page)).not.toContainText('2026-10-13T')
    await page.keyboard.press('Escape')
    // An overdue activity's note line reads in the danger color.
    await page.locator('[data-card-open="act-2"]').click()
    await expect(panel(page).locator('[data-panel-status]')).toHaveText('Planned')
    await expect(panel(page).locator('[data-panel-description]')).toContainText('Overdue')
    await expect(panel(page).locator('[data-panel-description]')).toHaveClass(/text-\[color:var\(--danger\)\]/)
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
    await expect(view.locator('[data-cal-item]', {hasText: 'Customer visit'})).toHaveCount(0)
  })

  test('clearing the scheduled time removes it from the calendar', async ({page}) => {
    await go(page, '/help-screens/activities')
    await page.locator('[data-card-open="act-1"]').click()
    // An existing activity opens read-only; the schedule controls wait
    // behind Edit.
    await panel(page).getByRole('button', {name: 'Edit'}).click()
    await page.locator('#activity-schedule-clear').click()
    await panel(page).getByRole('button', {name: 'Save'}).click()
    await switchTo(page, 'Calendar')
    await expect(page.locator('.activities-view [data-cal-item]', {hasText: 'Call Al Noor'})).toHaveCount(0)
  })

  test('meeting creates one linked event, never two', async ({page}) => {
    await go(page, '/help-screens/activities')
    await page.locator('[data-card-open="act-1"]').click()
    await panel(page).getByRole('button', {name: 'Edit'}).click()
    await page.locator('#activity-kind').selectOption('meeting')
    await panel(page).getByRole('button', {name: 'Save'}).click()
    await page.locator('[data-card-open="act-1"]').click()
    await panel(page).getByRole('button', {name: 'Create event'}).click()
    // The event editor opens over Activities — same screen, new editor.
    await expect(page.locator('.activities-view')).toBeVisible()
    await expect(page.locator('.events-view')).toBeHidden()
    await expect(panel(page).locator('#event-title')).toBeVisible()
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

  test('assigned to is a searchable multi-assignee field', async ({page}) => {
    await go(page, '/help-screens/activities')
    await page.locator('[data-card-open="act-1"]').click()
    await panel(page).getByRole('button', {name: 'Edit'}).click()
    await expect(page.locator('[data-ms-off="usr-1"]')).toBeVisible()
    const search = page.locator('#activity-assignee')
    await search.click()
    await search.fill('omar')
    await page.locator('#activity-assignee-list [data-ms-opt="usr-3"]').click()
    await expect(page.locator('[data-ms-off="usr-3"]')).toBeVisible()
    await panel(page).getByRole('button', {name: 'Save'}).click()
    await page.locator('[data-card-open="act-1"]').click()
    const assigned = panel(page).locator('dt:text-is("Assigned to") + dd')
    await expect(assigned).toContainText('Majed Sief')
    await expect(assigned).toContainText('Omar Hassan')
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-card-id="act-1"]')).toContainText('+1')
  })

  test('the assignee filter matches activities assigned to that person', async ({page}) => {
    await go(page, '/help-screens/activities')
    await page.locator('.activities-view [data-filter-menu] summary').click()
    await page.getByRole('menuitem', {name: 'Assigned to', exact: true}).click()
    const chip = page.locator('.activities-view [data-collab-editor-key="assignee"]')
    await expect(chip).toHaveJSProperty('open', true)
    await chip.getByRole('option', {name: 'Omar Hassan', exact: true}).click()
    await expect(page.locator('.activities-view [data-collab-remove-filter="assignee"]')).toBeVisible()
    await expect(page.locator('.activities-view [data-card-open="act-2"]')).toBeVisible()
    await expect(page.locator('.activities-view [data-card-open="act-1"]')).toHaveCount(0)
  })

  test('an activity keeps at least one assignee', async ({page}) => {
    await go(page, '/help-screens/activities')
    await page.locator('[data-card-open="act-1"]').click()
    await panel(page).getByRole('button', {name: 'Edit'}).click()
    await page.locator('[data-ms-off="usr-1"]').click()
    await panel(page).getByRole('button', {name: 'Save'}).click()
    await expect(panel(page)).toContainText('Choose at least one assignee.')
  })

  test('schedule a time tracks its scheduled state', async ({page}) => {
    await go(page, '/help-screens/activities')
    await page.locator('[data-card-open="act-1"]').click()
    await panel(page).getByRole('button', {name: 'Edit'}).click()
    await expect(page.locator('[data-schedule-state]')).toHaveText('Scheduled')
    await page.locator('#activity-schedule-clear').click()
    await expect(page.locator('[data-schedule-state]')).toHaveText('Not scheduled')
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
    await go(page, '/help-screens/email')
    await row(page, 'Payment scheduled').click()
    await page.locator('#email-quick-reply').fill('I will check the receipt')
    await expect.poll(() => page.evaluate(() =>
      JSON.parse(sessionStorage.getItem('skey-proto-collab')).entities.mail.some(m =>
        m.folder === 'drafts' && m.body?.includes('I will check the receipt'))
    )).toBe(true)
    await go(page, '/help-screens/notes')
    await go(page, '/help-screens/email')
    // Entering the mailbox no longer opens a message on its own — reopen it
    // and the half-typed reply is still there.
    await row(page, 'Payment scheduled').click()
    await expect(page.locator('#email-quick-reply')).toHaveValue('I will check the receipt')
  })

  test('unfinished recipient input survives navigation in Drafts', async ({page}) => {
    await go(page, '/help-screens/email')
    await page.locator('.email-compose').click()
    await page.locator('#email-compose-to').fill('reader@example.com')
    await expect.poll(() => page.evaluate(() =>
      JSON.parse(sessionStorage.getItem('skey-proto-collab')).entities.mail.some(m =>
        m.folder === 'drafts' && m.toInput === 'reader@example.com')
    )).toBe(true)
    await go(page, '/help-screens/notes')
    await go(page, '/help-screens/email')
    await folder(page, 'drafts').click()
    await row(page, '(no subject)').first().click()
    await expect(page.locator('#email-compose-to')).toHaveValue('reader@example.com')
  })

  test('typed Cc recipient is included when sending', async ({page}) => {
    await go(page, '/help-screens/email')
    await page.locator('.email-compose').click()
    await page.locator('#email-compose-to').fill('reader@example.com')
    await page.locator('[data-add-cc]').click()
    await page.locator('#email-compose-cc').fill('copy@example.com')
    await page.locator('#email-compose-subject').fill('Cc check')
    await page.locator('.email-send').click()
    await expect(page.locator('.email-view')).toContainText('copy@example.com')
  })

  test('mail list exposes selected option semantics', async ({page}) => {
    await go(page, '/help-screens/email')
    await expect(page.locator('#email-list-scroll [role="listbox"]')).toBeVisible()
    await row(page, 'Payment scheduled').click()
    await expect(row(page, 'Payment scheduled')).toHaveAttribute('role', 'option')
    await expect(row(page, 'Payment scheduled')).toHaveAttribute('aria-selected', 'true')
  })

  test('checkboxes multi-select and the bulk bar acts on the whole selection', async ({page}) => {
    await go(page, '/help-screens/email')
    await row(page, 'Payment scheduled').locator('[data-mail-check]').check()
    await row(page, 'Quotation request from Al Noor Trading').locator('[data-mail-check]').check()
    // Two or more selected: the reading toolbar becomes the bulk bar, and
    // the pane shows a stack of the selected messages' own cards — never
    // any single message's content.
    const bulk = page.getByRole('toolbar', {name: 'Selection actions'})
    await expect(bulk).toContainText('2 selected')
    await expect(page.locator('.email-sel-card')).toHaveCount(2)
    await expect(page.locator('.email-reading-body')).toHaveCount(0)
    await expect(page.locator('.email-sel-card', {hasText: 'Payment scheduled for Sales Invoice 126'})).toBeVisible()
    await bulk.getByRole('button', {name: 'Delete'}).click()
    await expect(row(page, 'Payment scheduled')).toHaveCount(0)
    await expect(row(page, 'Quotation request from Al Noor Trading')).toHaveCount(0)
    await folder(page, 'trash').click()
    await expect(row(page, 'Payment scheduled')).toBeVisible()
    await expect(row(page, 'Quotation request from Al Noor Trading')).toBeVisible()
  })

  test('list header names the mailbox, filters unread and selects all', async ({page}) => {
    await go(page, '/help-screens/email')
    // The header carries the open mailbox's title above the search row.
    await expect(page.locator('[data-mail-folder-title]')).toHaveText('Inbox')
    // The count and Clear live in the reading pane's Selection actions bar —
    // nothing selection-related is shown in the list until rows are picked.
    const bulk = page.getByRole('toolbar', {name: 'Selection actions'})
    await expect(bulk).toHaveCount(0)
    // Unread-only hides the read messages; the switch carries the state.
    const unread = page.locator('[data-mail-unread-filter]')
    await expect(unread).not.toBeChecked()
    const before = await page.locator('.email-list-row').count()
    await unread.click()
    await expect(unread).toBeChecked()
    expect(await page.locator('.email-list-row').count()).toBeLessThan(before)
    await unread.click()
    await expect(unread).not.toBeChecked()
    await expect(page.locator('.email-list-row')).toHaveCount(before)
    // Select-all is a switch like the unread one: it picks up every visible
    // row, the Selection actions bar carries the count, and both flipping
    // it off and Clear drop it all.
    const selectAll = page.locator('[data-mail-select-all]')
    await expect(selectAll).toHaveAttribute('role', 'switch')
    await selectAll.check()
    await expect(bulk).toContainText(`${before} selected`)
    await selectAll.uncheck()
    await expect(bulk).toHaveCount(0)
    await selectAll.check()
    await bulk.getByRole('button', {name: 'Clear selection'}).click()
    await expect(bulk).toHaveCount(0)
  })

  test('an unread row carries no start rail, the opened row a rail and neutral band', async ({page}) => {
    await go(page, '/help-screens/email')
    const unreadRow = page.locator('.email-list-row.unread').first()
    await expect(unreadRow).toBeVisible()
    const unreadStyles = await unreadRow.evaluate(el => ({
      railContent: getComputedStyle(el, '::before').content,
      background: getComputedStyle(el).backgroundColor,
    }))
    expect(unreadStyles.railContent).toBe('none')
    expect(unreadStyles.background).toBe('rgba(0, 0, 0, 0)')
    await unreadRow.click()
    const activeRow = page.locator('.email-list-row.active')
    await expect(activeRow).toHaveCount(1)
    await page.mouse.move(0, 0)
    const activeStyles = await activeRow.evaluate(el => ({
      railWidth: getComputedStyle(el, '::before').width,
      background: getComputedStyle(el).backgroundColor,
    }))
    expect(activeStyles.railWidth).toBe('3px')
    expect(activeStyles.background).not.toBe('rgba(0, 0, 0, 0)')
    // The header number is a tag that says what it counts.
    const count = page.locator('[data-mail-folder-count]')
    await expect(count).toBeVisible()
    await expect(count).toHaveText(/^\d+ unread$/)
  })

  test('multi-selection stacks full-row cards behind the front card', async ({page}) => {
    await go(page, '/help-screens/email')
    await row(page, 'Payment scheduled').locator('[data-mail-check]').check()
    await row(page, 'Quotation request from Al Noor Trading').locator('[data-mail-check]').check()
    await expect(page.locator('[data-sel-count]')).toHaveText('2 messages selected')
    const cards = page.locator('.email-sel-card')
    await expect(cards).toHaveCount(2)
    const edge = page.locator('[data-deck-edge]')
    await expect(edge).toHaveCount(1)
    await expect(edge).toContainText('Quotation request from Al Noor Trading')
    const geometry = await cards.evaluateAll(els =>
      els.map(el => {
        const rect = el.getBoundingClientRect()
        return {top: rect.top, width: rect.width}
      })
    )
    expect(geometry[0].top).toBeLessThan(geometry[1].top)
    expect(geometry[0].width).toBeLessThan(geometry[1].width)
    // The front card still previews the first selected message.
    await expect(cards.nth(1)).toContainText('Payment scheduled for Sales Invoice 126')
    // The whole block sits centred in the reading pane, both ways.
    const layout = await page.evaluate(() => {
      const scroll = document.querySelector('#email-reading .email-reading-scroll')
      const head = document.querySelector('[data-sel-count]')
      const hint = [...scroll.querySelectorAll('p')].find(p => p.textContent.includes('Use the bar'))
      const s = scroll.getBoundingClientRect()
      const h = head.getBoundingClientRect()
      const f = hint.getBoundingClientRect()
      return {
        topGap: h.top - s.top,
        bottomGap: s.bottom - f.bottom,
        headCenter: (h.left + h.right) / 2,
        scrollCenter: (s.left + s.right) / 2,
      }
    })
    expect(Math.abs(layout.topGap - layout.bottomGap)).toBeLessThan(6)
    expect(Math.abs(layout.headCenter - layout.scrollCenter)).toBeLessThan(2)
  })

  test('entering a mailbox opens no message until one is clicked', async ({page}) => {
    await go(page, '/help-screens/email')
    // The reading pane waits behind the first click: no auto-opened message,
    // and the first row carries the roving tabindex so the list is
    // reachable by keyboard straight away.
    await expect(page.locator('#email-reading')).toContainText('Select a message to read it')
    await expect(page.locator('.email-reading-body')).toHaveCount(0)
    await expect(page.locator('.email-list-row').first()).toHaveAttribute('tabindex', '0')
    await row(page, 'Payment scheduled').click()
    await expect(page.locator('.email-reading-body')).toBeVisible()
    await expect(row(page, 'Payment scheduled')).toHaveAttribute('aria-selected', 'true')
  })

  const folder = (page, id) => page.locator(`.email-view [data-folder="${id}"]`)
  const row = (page, text) => page.locator('.email-list-row', {hasText: text})

  test('folders exist and show the right messages', async ({page}) => {
    await go(page, '/help-screens/email')
    await expect(page.locator('.email-view [data-folder]')).toHaveText([/Inbox/, /Starred/, /Sent/, /Drafts/, /Archive/, /Trash/])
    await folder(page, 'sent').click()
    await expect(row(page, 'Re: Stock check needed')).toBeVisible()
    await expect(row(page, 'Payment scheduled')).toHaveCount(0)
    await folder(page, 'starred').click()
    await expect(row(page, 'Payment scheduled')).toBeVisible()
  })

  test('custom folders are created, renamed, hold moved messages and survive a reload', async ({page}) => {
    await go(page, '/help-screens/email')
    const rail = page.locator('.email-view [data-folders]')
    const named = name => rail.locator('[data-folder]', {hasText: name})
    // The rail is an icon rail: the New folder button and the row actions
    // live past its content box when collapsed and only answer once the
    // list header's own expand button has pinned the rail open. The toggle
    // steps out while the rail is hover-peeked (so it never floats above
    // the open rail), so the pointer leaves the rail before clicking it.
    const expandRail = async () => {
      const toggle = page.locator('[data-rail-toggle]')
      if ((await toggle.getAttribute('aria-expanded')) === 'false') {
        await page.mouse.move(1200, 40)
        await toggle.click()
      }
    }
    await expandRail()

    await page.locator('[data-new-folder]').click()
    await page.locator('[data-folder-name]').fill('Clients')
    await page.locator('[data-folder-form]').getByRole('button', {name: 'Add'}).click()
    await expect(named('Clients')).toBeVisible()
    await expect(rail.locator('[data-folder]')).toHaveCount(7)

    // A system mailbox name is reserved, in any casing — refused in place,
    // with the reason, and the row never appears.
    await page.locator('[data-new-folder]').click()
    await page.locator('[data-folder-name]').fill('INBOX')
    await page.locator('[data-folder-form]').getByRole('button', {name: 'Add'}).click()
    await expect(page.locator('[data-folder-error]')).toHaveText('A folder with that name already exists.')
    await page.locator('[data-folder-cancel]').click()
    await expect(page.locator('[data-folder-name]')).toHaveCount(0)
    await expect(rail.locator('[data-folder]')).toHaveCount(7)

    // Move a message into it from the reading toolbar.
    await row(page, 'Quotation request from Al Noor Trading').click()
    await page.getByRole('button', {name: 'Move to', exact: true}).click()
    await page.getByRole('menuitem', {name: 'Clients'}).click()
    await expect(row(page, 'Quotation request from Al Noor Trading')).toHaveCount(0)
    await named('Clients').click()
    await expect(row(page, 'Quotation request from Al Noor Trading')).toBeVisible()
    await expect(named('Clients')).toContainText('1')

    // Renaming keeps what was filed in it.
    await expandRail()
    await page.getByRole('button', {name: 'Rename Clients'}).click()
    await page.locator('[data-folder-name]').fill('Key accounts')
    await page.locator('[data-folder-form]').getByRole('button', {name: 'Save'}).click()
    await expect(named('Key accounts')).toBeVisible()
    await expect(row(page, 'Quotation request from Al Noor Trading')).toBeVisible()

    // The folder is store state, so a fresh document load still has both.
    await go(page, '/help-screens/email')
    await expect(named('Key accounts')).toBeVisible()
    await named('Key accounts').click()
    await expect(row(page, 'Quotation request from Al Noor Trading')).toBeVisible()

    // Deleting files its messages back in Inbox instead of losing them.
    await expandRail()
    await page.getByRole('button', {name: 'Delete Key accounts'}).click()
    await expect(page.locator('#collab-confirm')).toContainText('move to Inbox')
    await page.locator('#collab-confirm').getByRole('button', {name: 'Delete folder'}).click()
    await expect(rail.locator('[data-folder]')).toHaveCount(6)
    await expect(named('Key accounts')).toHaveCount(0)
    await expect(row(page, 'Quotation request from Al Noor Trading')).toBeVisible()
  })

  test('mailbox rail peeks on hover and pins open from its own button', async ({page}) => {
    await go(page, '/help-screens/email')
    const rail = page.locator('.email-view [data-folders]')
    const list = page.locator('.email-view .email-list')
    const toggle = page.locator('.email-view [data-rail-toggle]')
    const inboxLabel = rail.locator('[data-folder="inbox"] .ef-lbl').first()

    // Collapsed at the same 52px the shell's nav rail sits at, labels
    // clipped, and the list reserving the collapsed strip beside it.
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(rail).toHaveCSS('width', '52px')
    await expect(inboxLabel).toHaveCSS('opacity', '0')
    await expect(list).toHaveCSS('margin-inline-start', '52px')

    // Hover peeks it open as a temporary flyout over the list — the shell
    // rail's own contract — with the labels back. The list header's expand
    // button steps out while the rail peeks, so no control floats above the
    // open rail.
    await rail.hover()
    await expect(rail).toHaveCSS('width', '176px')
    await expect(inboxLabel).toHaveCSS('opacity', '1')
    await expect(toggle).toBeHidden()

    // Leaving folds it back; the list never moved and the button returns.
    await page.mouse.move(1200, 40)
    await expect(rail).toHaveCSS('width', '52px')
    await expect(list).toHaveCSS('margin-inline-start', '52px')
    await expect(toggle).toBeVisible()

    // Its own button pins it open: the rail takes its 176px in the layout
    // and the list drops the collapsed reservation, so the kept-open rail
    // sits in the row instead of over the messages.
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(rail).toHaveCSS('width', '176px')
    await expect(inboxLabel).toHaveCSS('opacity', '1')
    await expect(list).toHaveCSS('margin-inline-start', '0px')

    // Collapsing unpins; with the pointer moved off, the rail is collapsed
    // again (hover would only peek it back open temporarily).
    await toggle.click()
    await page.mouse.move(1200, 40)
    await expect(rail).toHaveCSS('width', '52px')
    await expect(list).toHaveCSS('margin-inline-start', '52px')

    // Small screens collapse it outright, the moment the shell compacts —
    // the mailbox select takes over, exactly as the shell's sidebar does.
    await page.setViewportSize({width: 880, height: 900})
    await expect(rail).toBeHidden()
    await expect(page.locator('[data-folder-select]')).toBeVisible()
  })

  test('draft survives navigation and reload, send moves it to Sent', async ({page}) => {
    await go(page, '/help-screens/email')
    await page.locator('.email-compose').click()
    await page.locator('#email-compose-to').fill('Mariam')
    await page.getByRole('option', {name: /Mariam Adel/}).click()
    await page.locator('#email-compose-subject').fill('Quarter close plan')
    await page.locator('.email-composer-input').fill('Draft body text')
    await expect(page.locator('[data-draft-status]')).toContainText('Draft saved')
    await go(page, '/help-screens/notes')
    await page.reload()
    await go(page, '/help-screens/email')
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
    await go(page, '/help-screens/email')
    await row(page, 'Payment scheduled').click()
    await page.getByRole('toolbar', {name: 'Message actions'}).getByRole('button', {name: 'More actions'}).click()
    await page.getByRole('menuitem', {name: 'Create activity'}).click()
    // The activity editor opens over the message you started from.
    await expect(page.locator('.email-view')).toBeVisible()
    await expect(page.locator('.activities-view')).toBeHidden()
    await expect(panel(page).locator('#activity-summary')).toBeVisible()
    await expect(panel(page).locator('[data-related-row]', {hasText: 'Payment scheduled for Sales Invoice 126'})).toBeVisible()
    // Mail is the one type that still travels: it has a screen of its own.
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
    await go(page, '/help-screens/email')
    await row(page, 'password expires').click()
    // Delete lives behind the toolbar's More menu now.
    await page.getByRole('toolbar', {name: 'Message actions'}).getByRole('button', {name: 'More actions'}).click()
    await page.getByRole('menuitem', {name: 'Delete', exact: true}).click()
    await expect(row(page, 'password expires')).toHaveCount(0)
    await folder(page, 'trash').click()
    await expect(row(page, 'password expires')).toBeVisible()
    await folder(page, 'inbox').click()
    await row(page, 'Quotation request from Al Noor Trading').click()
    await page.getByRole('toolbar', {name: 'Message actions'}).getByRole('button', {name: 'Archive', exact: true}).click()
    await folder(page, 'archive').click()
    await expect(row(page, 'Quotation request from Al Noor Trading')).toBeVisible()
  })

  test('search filters within the folder', async ({page}) => {
    await go(page, '/help-screens/email')
    await page.locator('#email-search-input').fill('quotation')
    await expect(page.locator('.email-list-row')).toHaveCount(1)
    await page.locator('#email-search-input').fill('zzz-nothing')
    await expect(page.locator('.email-view')).toContainText('No messages match')
  })

  test('send without recipients is blocked with a message', async ({page}) => {
    await go(page, '/help-screens/email')
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

  test('panel Status is a badge chip like the other collab panels', async ({page}) => {
    await go(page, '/help-screens/people-data')
    await page.locator('.people-view [data-row-open]', {hasText: 'Khaled Ibrahim'}).click()
    await expect(panel(page).locator('dt:text-is("Status") + dd .badge.gray')).toHaveText('Contact')
  })

  test('toolbar matches the shared list-toolbar language (quick + filter + search + view menu)', async ({page}) => {
    await go(page, '/help-screens/people-data')
    await expect(page.locator('.people-view [data-collab-search]')).toBeVisible()
    const viewMenu = page.locator('.people-view [data-view-menu]')
    await expect(viewMenu.locator('summary')).toContainText('List')
    const quickMenu = page.locator('.people-view [data-quick-menu]')
    await expect(quickMenu.locator('summary')).toContainText('All people')
    await quickMenu.locator('summary').click()
    await quickMenu.getByRole('menuitemradio', {name: 'Lead', exact: true}).click()
    // The lifecycle radio drives the list: only leads remain.
    await expect(quickMenu.locator('summary')).toContainText('Lead')
    await expect(page.locator('.people-view table')).toContainText('Ahmed Ali')
    await expect(page.locator('.people-view table')).not.toContainText('Khaled Ibrahim')
    const clear = page.locator('.people-view [data-clear-filters]')
    await expect(clear).toBeVisible()
    await clear.click()
    await expect(page.locator('.people-view table')).toContainText('Khaled Ibrahim')
    await expect(page.locator('.people-view [data-clear-filters]')).toHaveCount(0)
  })

  test('the view menu switches People between List and Cards like Customers', async ({page}) => {
    await go(page, '/help-screens/people-data')
    await expect(page.locator('.people-view table')).toBeVisible()
    const viewMenu = page.locator('.people-view [data-view-menu]')
    await viewMenu.locator('summary').click()
    await viewMenu.getByRole('menuitemradio', {name: 'Cards view'}).click()
    await expect(viewMenu.locator('summary')).toContainText('Cards')
    await expect(page.locator('.people-view table')).toHaveCount(0)
    await expect(page.locator('.people-view .data-card-grid')).toBeVisible()
    const identity = page.locator('.people-view .data-record-card [data-row-open]', {hasText: 'Khaled Ibrahim'})
    await expect(identity).toBeVisible()
    await identity.click()
    await expect(panel(page).locator('dt:text-is("Name (English)") + dd')).toContainText('Khaled Ibrahim')
    await page.keyboard.press('Escape')
    await viewMenu.locator('summary').click()
    await viewMenu.getByRole('menuitemradio', {name: 'List view'}).click()
    await expect(page.locator('.people-view table')).toBeVisible()
    await expect(page.locator('.people-view .data-card-grid')).toHaveCount(0)
  })

  test('Archived lives in the quick menu and hides archived people by default', async ({page}) => {
    await go(page, '/help-screens/people-data')
    await page.locator('.people-view [data-row-open]', {hasText: 'Sara Mahmoud'}).click()
    await panel(page).getByRole('button', {name: 'More actions'}).click()
    await page.getByRole('menuitem', {name: 'Archive', exact: true}).click()
    await expect(page.locator('.people-view table')).not.toContainText('Sara Mahmoud')
    const quickMenu = page.locator('.people-view [data-quick-menu]')
    await quickMenu.locator('summary').click()
    await quickMenu.getByRole('menuitemradio', {name: 'Archived', exact: true}).click()
    await expect(quickMenu.locator('summary')).toContainText('Archived')
    await expect(page.locator('.people-view table')).toContainText('Sara Mahmoud')
    await expect(page.locator('.people-view tr', {hasText: 'Sara Mahmoud'})).toContainText('Archived')
    // Clearing returns to All people: the archived row is hidden again.
    await page.locator('.people-view [data-clear-filters]').click()
    await expect(page.locator('.people-view table')).not.toContainText('Sara Mahmoud')
    await expect(page.locator('.people-view [data-clear-filters]')).toHaveCount(0)
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
