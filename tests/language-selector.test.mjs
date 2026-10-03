// Language selector coverage (avatar menu → Language details submenu +
// Profile → Account settings → Language row). The selector is a
// prototype/demo surface: all seven catalog entries render as real options
// (endonym + ISO code + a checked radio), but only EN/AR are functional
// locales wired to applyLocale() — the rest are presentation-only options
// that must never reach the locale facility.
import assert from 'node:assert/strict'
import test from 'node:test'
import {readFile} from 'node:fs/promises'
import {
  LANGUAGES,
  isFunctionalLanguage,
  LANGUAGE_STORAGE_KEY,
} from '../concepts/app/core/locale.js'
import {renderProfileSections} from '../concepts/app/pages/profile/sections.js'
import * as profileFixtures from '../concepts/app/prototype/fixtures/profile.js'

const {CURRENT_USER, EMPLOYEE_DETAILS, CONTACT_DETAILS} = profileFixtures

test('language catalog: seven endonyms with ISO codes, only EN/AR functional', () => {
  assert.deepEqual(
    LANGUAGES.map(entry => entry.code),
    ['en', 'ar', 'fr', 'de', 'es', 'pt', 'ja']
  )
  assert.deepEqual(
    LANGUAGES.map(entry => entry.iso),
    ['EN', 'AR', 'FR', 'DE', 'ES', 'PT', 'JA']
  )
  assert.deepEqual(
    LANGUAGES.map(entry => entry.name),
    ['English', 'العربية', 'Français', 'Deutsch', 'Español', 'Português', '日本語']
  )
  LANGUAGES.forEach(entry => {
    assert.equal(typeof entry.name, 'string')
    assert.ok(entry.name.length > 0)
    assert.equal(entry.iso, entry.code.toUpperCase())
  })
  assert.equal(isFunctionalLanguage('en'), true)
  assert.equal(isFunctionalLanguage('ar'), true)
  for (const code of ['fr', 'de', 'es', 'pt', 'ja']) {
    assert.equal(isFunctionalLanguage(code), false, `${code} must stay demo-only`)
  }
  assert.equal(LANGUAGE_STORAGE_KEY, 'skey-proto-language')
})

test('account settings renders the Language select with every catalog option', () => {
  const encodeHtml = value => String(value)
  const html = renderProfileSections({
    currentUser: CURRENT_USER,
    employeeDetails: EMPLOYEE_DETAILS,
    contactDetails: CONTACT_DETAILS,
    accountDetails: {landingPage: 'home'},
    encodeHtml,
    language: 'en',
  })

  assert.match(html, /<select id="profile-language"/)
  assert.match(html, /<label for="profile-language" data-i18n="Language">Language<\/label>/)
  for (const entry of LANGUAGES) {
    assert.ok(
      html.includes(`<option value="${entry.code}" lang="${entry.code}"`),
      `missing option for ${entry.code}`
    )
    assert.ok(
      html.includes(`${entry.name} (${entry.iso})`),
      `missing endonym + ISO label for ${entry.code}`
    )
  }
  assert.match(html, /<option value="en" lang="en" selected>English \(EN\)<\/option>/)
  // The personal-information card no longer carries the old Locale select —
  // Language lives only in Account settings.
  assert.doesNotMatch(html, /id="profile-locale"/)
})

test('avatar menu carries the Language submenu as a Statistics-style details inner dropdown', async () => {
  const shell = await readFile(
    new URL('../concepts/app/shell/shell.html', import.meta.url),
    'utf8'
  )
  const icons = await readFile(
    new URL('../concepts/app/shell/icons.html', import.meta.url),
    'utf8'
  )
  const localeSource = await readFile(
    new URL('../concepts/app/shell/locale.js', import.meta.url),
    'utf8'
  )

  // The opener lives in the user menu's Personal group as a
  // details/summary submenu in the data-list manage-submenu style, closed
  // on load, with the current endonym in its summary.
  assert.match(shell, /<details class="data-menu data-manage-submenu language-submenu relative">/)
  assert.ok(!/<details[^>]*\sopen/.test(shell), 'language submenu must start closed')
  assert.match(shell, /<summary role="menuitem"/)
  assert.match(shell, /data-language-current>English</)
  // The old view-swap machinery (wrapper views, opener row, back button,
  // menuitemradio rows) is gone.
  assert.ok(!/data-user-view/.test(shell), 'view-swap wrappers are gone')
  assert.ok(!/language-menu|language-back|lang-pick|lang-check/.test(shell), 'opener/back/pick controls are gone')

  // The popover is a radiogroup of native radio rows (Statistics style),
  // one per catalog entry, endonym + ISO, EN checked by default.
  assert.match(shell, /role="radiogroup" aria-label="Language" data-i18n-aria-label="Language"/)
  const rows = [...shell.matchAll(/<label class="data-manage-radio" data-language="([a-z]{2})"/g)].map(
    match => match[1]
  )
  assert.deepEqual(rows, ['en', 'ar', 'fr', 'de', 'es', 'pt', 'ja'])
  const inputs = [...shell.matchAll(/<input type="radio" name="skey-language" value="([a-z]{2})"/g)].map(
    match => match[1]
  )
  assert.deepEqual(inputs, rows, 'every row carries a native radio in the shared group')
  assert.match(shell, /value="en" checked/)
  LANGUAGES.forEach(entry => {
    assert.ok(
      shell.includes(`data-language="${entry.code}" lang="${entry.code}"`),
      `missing lang attribute for ${entry.code}`
    )
    assert.ok(shell.includes(`<span>${entry.name}</span>`), `missing endonym ${entry.code}`)
    assert.ok(shell.includes(`">${entry.iso}</span>`), `missing ISO ${entry.iso}`)
  })

  // The selector source wires the popover's change events and resets the
  // details whenever the avatar menu closes.
  assert.match(localeSource, /function selectLanguage\(/)
  assert.match(localeSource, /isFunctionalLanguage\(code\)/)
  assert.match(localeSource, /function initLanguage\(/)
  assert.match(localeSource, /\.data-menu-popover/)
  assert.match(localeSource, /submenu\.open = false/)
  assert.match(localeSource, /input\.checked = label\.dataset\.language/)
  assert.match(icons, /<symbol id="i-globe"/)
  assert.match(icons, /<symbol id="i-next"/)
  assert.match(shell, /<use href="#i-globe" \/>/)
  assert.match(shell, /<use href="#i-next" \/>/)
})
