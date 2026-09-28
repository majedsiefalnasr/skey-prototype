import {test, expect} from '@playwright/test'
import {boot, settle} from './support/browser.mjs'

async function openOrganizationSection(page, section) {
  await page.locator('.avatar-btn').click()
  await page.locator(`.organization-menu[data-organization-section="${section}"]`).click()
  await settle(page)
}

test.describe('organization center', () => {
  test('overview trend charts omit axis labels but retain the latest value', async ({page}) => {
    await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173')
    await openOrganizationSection(page, 'overview')

    const responseCard = page.locator('.org-stat-card').filter({hasText: 'Response time'})
    await expect(responseCard.locator('[data-organization-trend-chart] text')).toHaveCount(1)
    await expect(responseCard.locator('[data-organization-trend-chart] text')).toContainText('ms')
    await expect(responseCard.locator('[data-organization-trend-chart]')).not.toContainText('09:00')
  })

  test('overview bento reflows from three columns to two and one', async ({page}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Responsive geometry is covered once.')
    await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173')
    await openOrganizationSection(page, 'overview')

    const statCells = page.locator('[data-organization-stat-cell]')
    await expect(statCells).toHaveCount(5)

    async function columnCountAt(viewportWidth) {
      await page.setViewportSize({width: viewportWidth, height: 1000})
      await settle(page)
      const lefts = await statCells.evaluateAll(items =>
        items.map(item => Math.round(item.getBoundingClientRect().left))
      )
      return new Set(lefts).size
    }

    expect(await columnCountAt(1600)).toBe(3)

    const cardBoxes = await page.locator('.org-stat-card').evaluateAll(cards =>
      Object.fromEntries(
        cards.slice(0, 5).map(card => {
          const title = card.querySelector('strong')?.textContent?.trim()
          const box = card.getBoundingClientRect()
          return [title, {left: Math.round(box.left), top: Math.round(box.top), bottom: Math.round(box.bottom), height: Math.round(box.height)}]
        })
      )
    )
    expect(cardBoxes['Active users'].top).toBe(cardBoxes['Response time'].top)
    expect(cardBoxes['Active users'].top).toBe(cardBoxes['Workflow exceptions'].top)
    expect(cardBoxes['Database sessions'].top).toBe(cardBoxes['Open alerts'].top)
    expect(cardBoxes['Database sessions'].left).toBe(cardBoxes['Response time'].left)
    expect(cardBoxes['Open alerts'].left).toBe(cardBoxes['Workflow exceptions'].left)
    expect(cardBoxes['Active users'].bottom).toBe(cardBoxes['Database sessions'].bottom)
    expect(cardBoxes['Active users'].bottom).toBe(cardBoxes['Open alerts'].bottom)
    expect(cardBoxes['Active users'].height).toBeGreaterThan(cardBoxes['Response time'].height * 1.8)

    const gaugeAlignment = await page
      .locator('.org-stat-card', {hasText: 'Active users'})
      .locator('[data-organization-gauge-center]')
      .evaluate(element => {
        const style = getComputedStyle(element)
        return [style.display, style.alignItems, style.justifyContent]
      })
    expect(gaugeAlignment).toEqual(['flex', 'center', 'center'])

    expect(await columnCountAt(1050)).toBe(2)
    expect(await columnCountAt(390)).toBe(1)

    const overflow = await page.locator('[data-organization-stat-grid]').evaluate(element =>
      element.scrollWidth > element.clientWidth
    )
    expect(overflow).toBe(false)
  })

  test('topbar menu groups organization links by active role', async ({page}) => {
    await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173')
    await page.locator('.avatar-btn').click()
    await expect(page.locator('[data-active-role-label]')).toHaveText('Administrator')
    await expect(page.locator('.organization-menu:visible')).toHaveCount(4)

    await page.locator('#active-role').selectOption('manager', {force: true})
    await expect(page.locator('[data-active-role-label]')).toHaveText('Manager')
    await expect(page.locator('.organization-menu:visible')).toHaveCount(3)
    await expect(page.locator('.organization-menu[data-organization-section="staff"]')).toBeVisible()
    await expect(page.locator('.organization-menu[data-organization-section="audit"]')).toBeHidden()

    await page.locator('#active-role').selectOption('user', {force: true})
    await expect(page.locator('[data-active-role-label]')).toHaveText('User')
    await expect(page.locator('[data-organization-menu-group]')).toBeHidden()
  })

  test('manager receives scoped data, read-only settings, and no database section', async ({page}) => {
    await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173')
    await page.locator('#active-role').selectOption('manager', {force: true})
    await openOrganizationSection(page, 'overview')

    await expect(page.locator('[data-organization-section="database-sessions"]')).toHaveCount(0)
    await expect(page.locator('.organization-nav [data-organization-section]')).toHaveCount(7)
    await page.locator('.organization-nav [data-organization-section="users"]').click()
    await expect(page.locator('#organization-users-canvas [data-list-row-key]')).toHaveCount(3)
    await page.locator('.organization-nav [data-organization-section="settings"]').click()
    await expect(page.locator('[data-organization-setting]')).toHaveCount(8)
    await expect(page.locator('[data-organization-setting]').first()).toHaveAttribute('readonly', '')
    await expect(page.locator('#organization-settings-save')).toHaveCount(0)
  })

  test('switching to User while Organization Center is open returns to Profile', async ({page}) => {
    await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173')
    await openOrganizationSection(page, 'overview')
    await page.locator('#active-role').selectOption('user', {force: true})
    await expect(page.locator('.profile-view')).toBeVisible()
    await expect(page.locator('.organization-view')).toBeHidden()
  })

  test('administrator can save and undo organization settings', async ({page}) => {
    await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173')
    await openOrganizationSection(page, 'overview')
    await page.locator('.organization-nav [data-organization-section="settings"]').click()
    const name = page.locator('#organization-setting-displayName')
    await name.fill('Last Chance Group')
    await expect(page.locator('#organization-settings-save')).toBeEnabled()
    await page.locator('#organization-settings-save').click()
    await expect(page.locator('.toast')).toContainText('Organization settings saved')
    await name.fill('Temporary name')
    await page.locator('#organization-settings-undo').click()
    await expect(name).toHaveValue('Last Chance Group')

    await page.reload()
    await settle(page)
    await openOrganizationSection(page, 'overview')
    await page.locator('.organization-nav [data-organization-section="settings"]').click()
    await expect(page.locator('#organization-setting-displayName')).toHaveValue('Last Chance Group')
  })

  test('administrator can revoke an application session with an audited reason', async ({page}) => {
    await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173')
    await openOrganizationSection(page, 'overview')
    await expect(page.locator('.organization-view')).toBeVisible()
    await page.locator('[data-organization-section="application-sessions"]').click()

    const row = page.locator('#organization-app-sessions-canvas [data-list-row-key="app-2"]')
    await row.locator('[data-organization-session-action="revoke"]').click()
    await expect(page.locator('#organization-session-dialog')).toHaveClass(/open/)
    await page.locator('#organization-session-form button[type="submit"]').click()
    await expect(page.locator('#organization-session-error')).toContainText('reason')
    await page.locator('#organization-session-reason').fill('Unexpected device reported by manager')
    await page.locator('#organization-session-form button[type="submit"]').click()

    await expect(row).toHaveCount(0)
    await expect(page.locator('.toast')).toContainText('Application session revoked')
    await page.locator('.organization-nav [data-organization-section="audit"]').click()
    await expect(page.locator('#organization-audit-canvas [data-list-row-key]').first()).toContainText('Revoked session')

    await page.reload()
    await settle(page)
    await openOrganizationSection(page, 'overview')
    await page.locator('[data-organization-section="application-sessions"]').click()
    await expect(page.locator('#organization-app-sessions-canvas [data-list-row-key="app-2"]')).toHaveCount(0)
  })

  test('administrator can terminate an eligible database session but protected rows have no action', async ({page}) => {
    await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173')
    await openOrganizationSection(page, 'overview')
    await page.locator('[data-organization-section="database-sessions"]').click()

    await expect(page.locator('#organization-db-sessions-canvas [data-list-row-key="db-0012"] [data-organization-session-action]')).toHaveCount(0)
    await page.locator('#organization-db-sessions-canvas [data-list-row-key="db-2191"] [data-organization-session-action="terminate"]').click()
    await page.locator('#organization-session-reason').fill('Clear blocking reporting workload')
    await page.locator('#organization-session-form button[type="submit"]').click()

    await expect(page.locator('#organization-db-sessions-canvas [data-list-row-key="db-2191"]')).toHaveCount(0)
    await expect(page.locator('.toast')).toContainText('Database session terminated')
  })

  test('organization session tables keep every column inside their bordered shell', async ({page}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Table geometry is covered once.')
    await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173')
    await openOrganizationSection(page, 'overview')
    await page.locator('[data-organization-section="database-sessions"]').click()

    const canvas = page.locator('#organization-db-sessions-canvas')
    const geometry = await canvas.evaluate(element => {
      const shell = element.querySelector('.data-list-shell')
      const table = element.querySelector('.inv-grid')
      const firstHeader = table.querySelector('th')
      const shellRect = shell.getBoundingClientRect()
      const tableRect = table.getBoundingClientRect()
      const firstHeaderRect = firstHeader.getBoundingClientRect()
      return {
        shellRight: Math.round(shellRect.right),
        tableRight: Math.round(tableRect.right),
        shellWidth: Math.round(shellRect.width),
        tableWidth: Math.round(tableRect.width),
        firstHeaderWidth: Math.round(firstHeaderRect.width),
        firstHeaderAlign: getComputedStyle(firstHeader).textAlign,
      }
    })

    expect(geometry.tableRight, JSON.stringify(geometry)).toBeLessThanOrEqual(geometry.shellRight)
    expect(geometry.firstHeaderWidth, JSON.stringify(geometry)).toBeGreaterThan(100)
    expect(geometry.firstHeaderAlign, JSON.stringify(geometry)).toBe('start')
  })

  test('section navigation supports arrow keys and the session dialog restores focus', async ({page}) => {
    await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173')
    await openOrganizationSection(page, 'overview')
    const overviewTab = page.locator('.organization-nav [data-organization-section="overview"]')
    await overviewTab.focus()
    await overviewTab.press('ArrowDown')
    await expect(page.locator('.organization-nav [data-organization-section="settings"]')).toHaveAttribute('aria-current', 'page')
    await expect(page.locator('#organization-section-settings')).toBeVisible()

    await page.locator('.organization-nav [data-organization-section="application-sessions"]').click()
    const revoke = page.locator('#organization-app-sessions-canvas [data-list-row-key="app-2"] [data-organization-session-action="revoke"]')
    await revoke.click()
    await page.keyboard.press('Escape')
    await expect(page.locator('#organization-session-dialog')).not.toHaveClass(/open/)
    await expect(revoke).toBeFocused()
  })
})
