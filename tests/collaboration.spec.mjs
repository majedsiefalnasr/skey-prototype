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
