import {test, expect} from '@playwright/test'
import {boot, settle} from './support/browser.mjs'

async function openOrganizationSection(page, section) {
  await page.locator('.avatar-btn').click()
  await page.locator(`.organization-menu[data-organization-section="${section}"]`).click()
  await settle(page)
}

test.describe('organization center', () => {
  test('overview keeps only the Active users and Database sessions cards', async ({page}) => {
    await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173')
    await openOrganizationSection(page, 'overview')

    const titles = await page.locator('.org-stat-card').evaluateAll(cards =>
      cards.map(card => card.querySelector('strong')?.textContent.trim())
    )
    expect(titles).toEqual(['Active users', 'Database sessions'])
    // The trend cards (Response time, Workflow exceptions, Open alerts) are
    // gone, so no line chart renders on the overview any more.
    await expect(page.locator('[data-organization-trend-chart]')).toHaveCount(0)
    await expect(page.locator('.org-stat-card [data-organization-gauge-center]')).toHaveCount(2)
  })

  test('overview cards reflow from two columns to stacked and single', async ({page}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Responsive geometry is covered once.')
    await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173')
    await openOrganizationSection(page, 'overview')

    const statCells = page.locator('[data-organization-stat-cell]')
    await expect(statCells).toHaveCount(2)

    const geometryAt = async viewportWidth => {
      await page.setViewportSize({width: viewportWidth, height: 1000})
      await settle(page)
      const cells = await statCells.evaluateAll(items =>
        items.map(item => {
          const box = item.getBoundingClientRect()
          return {left: Math.round(box.left), right: Math.round(box.right), top: Math.round(box.top), bottom: Math.round(box.bottom)}
        })
      )
      return cells
    }

    // Side by side while there is room for both gauges...
    const wide = await geometryAt(1600)
    expect(new Set(wide.map(cell => cell.left)).size).toBe(2)
    expect(wide[0].top).toBe(wide[1].top)
    expect(wide[0].bottom).toBe(wide[1].bottom)

    const cardBoxes = await page.locator('.org-stat-card').evaluateAll(cards =>
      Object.fromEntries(
        cards.map(card => {
          const title = card.querySelector('strong')?.textContent?.trim()
          const box = card.getBoundingClientRect()
          return [title, {left: Math.round(box.left), top: Math.round(box.top), bottom: Math.round(box.bottom), height: Math.round(box.height)}]
        })
      )
    )
    expect(cardBoxes['Active users'].top).toBe(cardBoxes['Database sessions'].top)
    expect(cardBoxes['Active users'].bottom).toBe(cardBoxes['Database sessions'].bottom)
    expect(cardBoxes['Active users'].left).not.toBe(cardBoxes['Database sessions'].left)

    // ...then stacked full-width, then a single column on phones.
    const stacked = await geometryAt(1050)
    expect(new Set(stacked.map(cell => cell.left)).size).toBe(1)
    expect(stacked[1].top).toBeGreaterThanOrEqual(stacked[0].bottom)
    expect(await geometryAt(390).then(cells => new Set(cells.map(cell => cell.left)).size)).toBe(1)

    const gaugeAlignment = await page
      .locator('.org-stat-card', {hasText: 'Active users'})
      .locator('[data-organization-gauge-center]')
      .evaluate(element => {
        const style = getComputedStyle(element)
        return [style.display, style.alignItems, style.justifyContent]
      })
    expect(gaugeAlignment).toEqual(['flex', 'center', 'center'])

    const overflow = await page.locator('[data-organization-stat-grid]').evaluate(element =>
      element.scrollWidth > element.clientWidth
    )
    expect(overflow).toBe(false)
  })

  test('manager overview shows a single full-width Active users card', async ({page}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Responsive geometry is covered once.')
    await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173')
    await page.locator('#active-role').selectOption('manager', {force: true})
    await openOrganizationSection(page, 'overview')

    const cards = page.locator('.org-stat-card')
    await expect(cards).toHaveCount(1)
    // Database sessions stays privileged: no card and no section for manager.
    await expect(page.locator('.org-stat-card', {hasText: 'Database sessions'})).toHaveCount(0)

    for (const width of [1600, 1050]) {
      await page.setViewportSize({width, height: 1000})
      await settle(page)
      const span = await page.evaluate(() => {
        const grid = document.querySelector('[data-organization-stat-grid]').getBoundingClientRect()
        const card = document.querySelector('.org-stat-card').getBoundingClientRect()
        return {
          left: Math.round(card.left - grid.left),
          right: Math.round(grid.right - card.right),
          width: Math.round(card.width),
          gridWidth: Math.round(grid.width),
        }
      })
      expect(span.left, JSON.stringify(span)).toBe(0)
      expect(span.right, JSON.stringify(span)).toBe(0)
      expect(span.width, JSON.stringify(span)).toBe(span.gridWidth)
    }

    await page.setViewportSize({width: 390, height: 1000})
    await settle(page)
    await expect(cards).toHaveCount(1)
    const overflow = await page.locator('[data-organization-stat-grid]').evaluate(element =>
      element.scrollWidth > element.clientWidth
    )
    expect(overflow).toBe(false)
  })

  test('topbar menu groups organization links by active role', async ({page}) => {
    await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173')
    // The role chip label is translated with the shell chrome (setRole goes
    // through t()), so assert against the boot language (mobile-rtl boots
    // Arabic) instead of hard-coding English.
    const roleLabels =
      (await page.locator('html').getAttribute('lang')) === 'ar'
        ? {administrator: 'مسؤول', manager: 'مدير', user: 'مستخدم'}
        : {administrator: 'Administrator', manager: 'Manager', user: 'User'}
    await page.locator('.avatar-btn').click()
    await expect(page.locator('[data-active-role-label]')).toHaveText(roleLabels.administrator)
    await expect(page.locator('.organization-menu:visible')).toHaveCount(2)

    await page.locator('#active-role').selectOption('manager', {force: true})
    await expect(page.locator('[data-active-role-label]')).toHaveText(roleLabels.manager)
    await expect(page.locator('.organization-menu:visible')).toHaveCount(1)
    // Audit log / System performance / Staff operations are hidden tabs, so
    // the avatar menu no longer links to them for any role.
    await expect(page.locator('.organization-menu[data-organization-section="staff"]')).toHaveCount(0)
    await expect(page.locator('.organization-menu[data-organization-section="audit"]')).toHaveCount(0)
    await expect(page.locator('.organization-menu[data-organization-section="performance"]')).toHaveCount(0)

    await page.locator('#active-role').selectOption('user', {force: true})
    await expect(page.locator('[data-active-role-label]')).toHaveText(roleLabels.user)
    await expect(page.locator('[data-organization-menu-group]')).toBeHidden()
  })

  test('manager receives scoped data, read-only settings, and no database section', async ({page}) => {
    await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173')
    await page.locator('#active-role').selectOption('manager', {force: true})
    await openOrganizationSection(page, 'overview')

    await expect(page.locator('[data-organization-section="database-sessions"]')).toHaveCount(0)
    await expect(page.locator('.organization-nav [data-organization-section]')).toHaveCount(4)
    await page.locator('.organization-nav [data-organization-section="users"]').click()
    await expect(page.locator('#organization-users-canvas [data-list-row-key]')).toHaveCount(3)
    await page.locator('.organization-nav [data-organization-section="settings"]').click()
    // Read-only reference view: values are plain text, never form controls.
    await expect(page.locator('#organization-section-settings input, #organization-section-settings textarea, #organization-section-settings select')).toHaveCount(0)
    await expect(page.locator('#organization-setting-displayName')).toHaveCount(0)
    await expect(page.locator('#organization-section-settings dd').first()).not.toBeEmpty()
    await expect(page.locator('#organization-settings-save')).toHaveCount(0)
    await expect(page.locator('#organization-settings-undo')).toHaveCount(0)
    // Hidden tabs render no panel and no nav entry for any role.
    for (const section of ['audit', 'performance', 'staff']) {
      await expect(page.locator(`#organization-section-${section}`)).toHaveCount(0)
      await expect(page.locator(`.organization-nav [data-organization-section="${section}"]`)).toHaveCount(0)
    }
  })

  test('session guidance uses a compact information section message', async ({page}) => {
    await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173')
    await openOrganizationSection(page, 'overview')
    await page.locator('.organization-nav [data-organization-section="application-sessions"]').click()

    const message = page.locator('#organization-section-application-sessions [data-organization-section-message]')
    await expect(message).toBeVisible()
    await expect(message).toHaveAttribute('role', 'note')
    await expect(message).toContainText('Session safety')
    await expect(message).toContainText('IP addresses are masked')
    await expect(page.locator('#organization-section-application-sessions .org-card', {hasText: 'Session safety'})).toHaveCount(0)
  })

  test('switching to User while Organization Center is open returns to Profile', async ({page}) => {
    await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173')
    await openOrganizationSection(page, 'overview')
    await page.locator('#active-role').selectOption('user', {force: true})
    await expect(page.locator('.profile-view')).toBeVisible()
    await expect(page.locator('.organization-view')).toBeHidden()
  })

  test('organization settings are read-only text for every role', async ({page}) => {
    await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173')
    await openOrganizationSection(page, 'overview')
    await page.locator('.organization-nav [data-organization-section="settings"]').click()

    const settingsPanel = page.locator('#organization-section-settings')
    await expect(settingsPanel.locator('input, textarea, select')).toHaveCount(0)
    await expect(settingsPanel.locator('#organization-settings-save')).toHaveCount(0)
    const displayName = await settingsPanel.locator('dd').first().textContent()
    expect(displayName.trim().length).toBeGreaterThan(0)

    // Nothing persists: reloading shows the same fixture value untouched.
    await page.reload()
    await settle(page)
    await openOrganizationSection(page, 'overview')
    await page.locator('.organization-nav [data-organization-section="settings"]').click()
    await expect(page.locator('#organization-section-settings dd').first()).toHaveText(displayName)
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

  test('clearing a table filter restores the section rows instead of emptying the table', async ({page}) => {
    await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173')
    await openOrganizationSection(page, 'overview')
    await page.locator('.organization-nav [data-organization-section="users"]').click()

    const rows = page.locator('#organization-users-canvas [data-list-row-key]')
    const total = await rows.count()
    expect(total).toBeGreaterThan(1)
    await page.locator('#organization-users-canvas .data-menu summary').first().click()
    await page.locator('#organization-users-canvas [data-list-add-filter="status"]').click()
    await expect(rows).not.toHaveCount(total)
    await page.locator('#organization-users-canvas [data-list-clear-filter]').click()

    await expect(rows).toHaveCount(total)
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
