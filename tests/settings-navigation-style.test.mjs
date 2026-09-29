import assert from 'node:assert/strict'
import test from 'node:test'
import {readFile} from 'node:fs/promises'

test('prototype controls expose and persist the settings navigation style', async () => {
  const [html, source] = await Promise.all([
    readFile(new URL('../concepts/app/prototype/controls.html', import.meta.url), 'utf8'),
    readFile(new URL('../concepts/app/prototype/controls.js', import.meta.url), 'utf8'),
  ])

  assert.match(html, /id="settings-navigation-style"/)
  assert.match(html, /value="sidebar"[^>]*selected/)
  assert.match(html, /value="standard"/)
  assert.match(source, /'settings-navigation-style'/)
  assert.match(source, /applySettingsNavigationStyle/)
})

test('settings pages declare sidebar and standard tab layouts', async () => {
  const [profileTemplate, organizationTemplate, styles] = await Promise.all([
    readFile(new URL('../concepts/app/pages/profile/templates.html', import.meta.url), 'utf8'),
    readFile(new URL('../concepts/app/pages/organization/templates.html', import.meta.url), 'utf8'),
    readFile(new URL('../concepts/app/styles/tailwind.css', import.meta.url), 'utf8'),
  ])

  assert.match(profileTemplate, /data-settings-navigation-style="sidebar"/)
  assert.match(organizationTemplate, /data-settings-navigation-style="sidebar"/)
  assert.match(styles, /profile-view\[data-settings-navigation-style='standard'\]/)
  assert.match(styles, /organization-view\[data-settings-navigation-style='standard'\]/)
  assert.match(styles, /border-bottom: 2px solid transparent/)
  assert.match(styles, /border-bottom-color: var\(--accent\)/)
})
