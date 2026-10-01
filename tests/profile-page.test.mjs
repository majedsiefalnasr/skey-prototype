import assert from 'node:assert/strict'
import test from 'node:test'
import {readFile} from 'node:fs/promises'
import * as profileFixtures from '../concepts/app/prototype/fixtures/profile.js'
import {PROFILE_SECTION_ORDER, PROFILE_SECTIONS} from '../concepts/app/pages/profile/fields.js'
import {renderProfileScrollNav} from '../concepts/app/pages/profile/layout.js'
import {renderProfileSections} from '../concepts/app/pages/profile/sections.js'

const {CURRENT_USER, EMPLOYEE_DETAILS, CONTACT_DETAILS, LOGIN_LOG_ROWS} = profileFixtures

test('profile fixtures have the expected shape', () => {
  assert.equal(typeof CURRENT_USER.name, 'string')
  assert.equal(typeof CURRENT_USER.email, 'string')
  assert.ok(CURRENT_USER.name.length > 0)

  assert.equal(typeof EMPLOYEE_DETAILS.employeeNumber, 'string')
  assert.equal(typeof EMPLOYEE_DETAILS.employmentStatus, 'string')
  assert.equal(typeof EMPLOYEE_DETAILS.workPhone, 'string')

  assert.equal(typeof CONTACT_DETAILS.address, 'string')
  assert.equal(typeof CONTACT_DETAILS.email, 'string')
  assert.equal(typeof CONTACT_DETAILS.mobile, 'string')

  assert.ok(LOGIN_LOG_ROWS.length >= 6 && LOGIN_LOG_ROWS.length <= 10)
  LOGIN_LOG_ROWS.forEach(row => {
    assert.equal(typeof row.id, 'string')
    assert.equal(typeof row.timestamp, 'string')
    assert.ok(['success', 'failed'].includes(row.status))
  })

})

test('profile section metadata covers all seven sections in order', () => {
  assert.deepEqual(PROFILE_SECTION_ORDER, ['profile', 'employee', 'contact', 'account', 'appearance', 'security', 'sessions'])
  PROFILE_SECTION_ORDER.forEach(key => {
    assert.equal(typeof PROFILE_SECTIONS[key].title, 'string')
    assert.equal(typeof PROFILE_SECTIONS[key].icon, 'string')
  })
})

test('profile scroll nav renders one button per section with the active one current', () => {
  const encodeHtml = value => String(value)
  const html = renderProfileScrollNav(PROFILE_SECTION_ORDER, PROFILE_SECTIONS, 'security', encodeHtml)

  assert.equal((html.match(/data-profile-scroll-section="/g) || []).length, 7)
  assert.match(html, /data-profile-scroll-section="security"[^>]*aria-current="page"/)
  assert.doesNotMatch(html, /data-profile-scroll-section="profile"[^>]*aria-current/)
  assert.match(html, /class="profile-scroll-nav/)
})

test('appearance.js no longer wires a scrim/dialog and exports syncAppearanceControls', async () => {
  const controls = await readFile(new URL('../concepts/app/shell/appearance.js', import.meta.url), 'utf8')
  assert.doesNotMatch(controls, /appearance-scrim/)
  assert.doesNotMatch(controls, /openAppearance/)
  assert.match(controls, /function syncAppearanceControls/)
  assert.match(controls, /syncAppearanceControls,?\s*\}/)
})

test('security dialogs markup exists with password and pin forms', async () => {
  const html = await readFile(new URL('../concepts/app/pages/profile/dialogs.html', import.meta.url), 'utf8')
  assert.match(html, /id="change-password-scrim"/)
  assert.match(html, /id="set-pin-scrim"/)
  assert.match(html, /id="current-password"/)
  assert.match(html, /id="new-password"/)
  assert.match(html, /id="confirm-password"/)
  assert.match(html, /id="current-pin"/)
  assert.match(html, /id="new-pin"/)
  assert.match(html, /id="confirm-pin"/)
  assert.doesNotMatch(html, /2fa|deactivate-account|delete-account/)
})

test('security-dialogs.js exports createSecurityDialogs with open/bind API', async () => {
  const source = await readFile(new URL('../concepts/app/pages/profile/security-dialogs.js', import.meta.url), 'utf8')
  assert.match(source, /export function createSecurityDialogs/)
  assert.match(source, /openChangePassword/)
  assert.match(source, /openSetPin/)
  assert.match(source, /function bind/)
})

test('login log table renders one row per entry with status text', async () => {
  const {renderLoginLogTable} = await import('../concepts/app/pages/profile/devices.js')
  const encodeHtml = value => String(value)
  const rows = [
    {id: 'log-1', timestamp: '2026-09-23 08:12', ip: '1.2.3.4', device: 'Chrome', status: 'success'},
    {id: 'log-2', timestamp: '2026-09-22 08:12', ip: '1.2.3.4', device: 'Chrome', status: 'failed'},
  ]
  const html = renderLoginLogTable(rows, encodeHtml)
  assert.match(html, /<table/)
  assert.equal((html.match(/<tr[ >]/g) || []).length, 3) // header + 2 rows
  assert.match(html, />success</)
  assert.match(html, />failed</)
})

test('profile sections include employee details, contact details, and omit removed settings', () => {
  const encodeHtml = value => String(value)
  const html = renderProfileSections({currentUser: CURRENT_USER, employeeDetails: EMPLOYEE_DETAILS, contactDetails: CONTACT_DETAILS, accountDetails: {landingPage: 'home'}, encodeHtml})

  ;['profile', 'employee', 'contact', 'account', 'appearance', 'security', 'sessions'].forEach(key => {
    assert.match(html, new RegExp(`id="profile-section-${key}"`))
    assert.match(html, new RegExp(`data-profile-scroll-target="${key}"`))
  })

  assert.match(html, /id="profile-employee-number"[^>]*disabled/)
  assert.match(html, /id="profile-employee-work-phone"/)
  assert.match(html, /id="profile-employee-extension"/)
  assert.match(html, /id="profile-employee-office-location"/)
  assert.match(html, /id="profile-employee-save"/)
  assert.match(html, /id="profile-employee-undo"/)
  assert.doesNotMatch(html, /profile-section-notifications|profile-danger-zone|profile-2fa-toggle/)

  assert.match(html, /id="profile-contact-address"/)
  assert.match(html, /id="profile-contact-city"/)
  assert.match(html, /id="profile-contact-state"/)
  assert.match(html, /id="profile-contact-country"/)
  assert.match(html, /id="profile-contact-postal-code"/)
  assert.match(html, /id="profile-contact-phone"/)
  assert.match(html, /id="profile-contact-email"/)
  assert.match(html, /id="profile-contact-mobile"/)
  assert.match(html, /id="profile-contact-website"/)
  assert.match(html, /id="profile-contact-save"/)
  assert.match(html, /id="profile-contact-undo"/)

  // Every editable-fields tab (Profile, Employee, Contact, Account) gets
  // the identical Save/Undo bar, both starting disabled until dirty.
  ;['profile', 'employee', 'contact', 'account'].forEach(key => {
    assert.match(html, new RegExp(`id="profile-${key}-save"[^>]*disabled`))
    assert.match(html, new RegExp(`id="profile-${key}-undo"[^>]*disabled`))
  })
  assert.doesNotMatch(html, /id="profile-header-status"/)
  assert.doesNotMatch(html, /id="profile-appearance-save"|id="profile-security-save"|id="profile-sessions-save"/)

  assert.match(html, /id="appearance-custom-color"/)
  assert.match(html, /id="appearance-interface-scale"/)
  assert.match(html, /id="appearance-font-family"/)
  assert.match(html, /data-appearance-theme="system"/)
  assert.match(html, /data-appearance-density="comfortable"/)

  assert.match(html, /data-profile-open-change-password/)
  assert.match(html, /data-profile-open-set-pin/)

  assert.match(html, /id="profile-login-log"/)
  // The Sessions & devices tab no longer renders a Devices card.
  assert.doesNotMatch(html, /id="profile-device-list"/)
  assert.doesNotMatch(html, /profile-device-row/)
})

test('createProfile exposes the Page contract', async () => {
  const source = await readFile(new URL('../concepts/app/pages/profile/profile.js', import.meta.url), 'utf8')
  assert.match(source, /export function createProfile/)
  assert.match(source, /id:\s*'profile'/)
  assert.match(source, /function activate/)
  assert.match(source, /function deactivate/)
  assert.match(source, /function dispose/)
  assert.match(source, /function setSection/)
})

test('content host registers the profile view and the appearance dialog file is removed', async () => {
  const content = await readFile(new URL('../concepts/app/shell/content.js', import.meta.url), 'utf8')
  assert.match(content, /profile:\s*'\.profile-view'/)

  await assert.rejects(
    readFile(new URL('../concepts/app/shell/appearance-dialog.html', import.meta.url), 'utf8')
  )

  const shell = await readFile(new URL('../concepts/app/shell/shell.html', import.meta.url), 'utf8')
  assert.doesNotMatch(shell, /appearance-dialog\.html/)

  const invoicesTemplates = await readFile(new URL('../concepts/app/pages/invoices/templates.html', import.meta.url), 'utf8')
  assert.match(invoicesTemplates, /include: \.\.\/profile\/templates\.html/)
})

test('main.js wires the profile page and topbar no longer opens an appearance dialog', async () => {
  const main = await readFile(new URL('../concepts/app/main.js', import.meta.url), 'utf8')
  assert.match(main, /import \{createProfile\} from '\.\/pages\/profile\/profile\.js'/)
  assert.match(main, /EMPLOYEE_DETAILS/)
  assert.match(main, /CONTACT_DETAILS/)
  assert.match(main, /\['profile', profile\]/)
  assert.doesNotMatch(main, /openAppearance/)

  const topbar = await readFile(new URL('../concepts/app/shell/topbar.js', import.meta.url), 'utf8')
  assert.doesNotMatch(topbar, /openAppearance/)
  assert.match(topbar, /profile-menu/)

  const shell = await readFile(new URL('../concepts/app/shell/shell.html', import.meta.url), 'utf8')
  for (const section of ['profile', 'account', 'appearance', 'security', 'sessions']) {
    assert.match(shell, new RegExp(`data-profile-section="${section}"`))
  }
  assert.doesNotMatch(shell, /data-profile-section="notifications"/)
})
