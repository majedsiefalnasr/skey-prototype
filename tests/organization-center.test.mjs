import assert from 'node:assert/strict'
import test from 'node:test'
import {readFile} from 'node:fs/promises'
import {
  ORGANIZATION_ROLES,
  organizationSectionsForRole,
  canPerformOrganizationAction,
} from '../concepts/app/pages/organization/access.js'
import {renderOrganizationSessionTarget} from '../concepts/app/pages/organization/sessions.js'

test('organization access policy defines the three prototype roles', () => {
  assert.deepEqual(ORGANIZATION_ROLES, ['administrator', 'manager', 'user'])
})

test('organization access policy scopes sections by role', () => {
  assert.deepEqual(organizationSectionsForRole('administrator'), [
    'overview',
    'settings',
    'users',
    'application-sessions',
    'database-sessions',
    'audit',
    'performance',
    'staff',
  ])
  assert.deepEqual(organizationSectionsForRole('manager'), [
    'overview',
    'settings',
    'users',
    'application-sessions',
    'audit',
    'performance',
    'staff',
  ])
  assert.deepEqual(organizationSectionsForRole('user'), [])
})

test('session action policy protects current, system, and out-of-scope sessions', () => {
  const ordinary = {current: false, protected: false, inManagerScope: true}
  assert.equal(canPerformOrganizationAction('administrator', 'revoke-session', ordinary), true)
  assert.equal(canPerformOrganizationAction('administrator', 'terminate-database-session', ordinary), true)
  assert.equal(canPerformOrganizationAction('manager', 'revoke-session', ordinary), true)
  assert.equal(canPerformOrganizationAction('manager', 'terminate-database-session', ordinary), false)
  assert.equal(canPerformOrganizationAction('user', 'revoke-session', ordinary), false)
  assert.equal(canPerformOrganizationAction('administrator', 'revoke-session', {...ordinary, current: true}), false)
  assert.equal(canPerformOrganizationAction('administrator', 'terminate-database-session', {...ordinary, protected: true}), false)
  assert.equal(canPerformOrganizationAction('manager', 'revoke-session', {...ordinary, inManagerScope: false}), false)
})

test('prototype controls declare a persisted active-role selector', async () => {
  const html = await readFile(new URL('../concepts/app/prototype/controls.html', import.meta.url), 'utf8')
  const source = await readFile(new URL('../concepts/app/prototype/controls.js', import.meta.url), 'utf8')

  assert.match(html, /id="active-role"/)
  assert.match(html, /value="administrator"/)
  assert.match(html, /value="manager"/)
  assert.match(html, /value="user"/)
  assert.match(source, /'active-role'/)
  assert.match(source, /onRoleChange/)
})

test('organization section metadata covers the approved information architecture', async () => {
  const {ORGANIZATION_SECTION_ORDER, ORGANIZATION_SECTIONS} = await import(
    '../concepts/app/pages/organization/fields.js'
  )
  assert.deepEqual(ORGANIZATION_SECTION_ORDER, [
    'overview',
    'settings',
    'users',
    'application-sessions',
    'database-sessions',
    'audit',
    'performance',
    'staff',
  ])
  ORGANIZATION_SECTION_ORDER.forEach(key => {
    assert.equal(typeof ORGANIZATION_SECTIONS[key].title, 'string')
    assert.equal(typeof ORGANIZATION_SECTIONS[key].description, 'string')
  })
})

test('organization fixtures contain operational, security, and staff data', async () => {
  const fixtures = await import('../concepts/app/prototype/fixtures/organization.js')
  assert.equal(typeof fixtures.ORGANIZATION_DETAILS.displayName, 'string')
  assert.ok(fixtures.ORGANIZATION_USERS.length >= 5)
  assert.ok(fixtures.APPLICATION_SESSIONS.some(row => row.current))
  assert.ok(fixtures.DATABASE_SESSIONS.some(row => row.protected))
  assert.ok(fixtures.ORGANIZATION_AUDIT_ROWS.length >= 5)
  assert.ok(fixtures.STAFF_OPERATION_ROWS.length >= 4)
})

test('organization page is mounted and registered in the application shell', async () => {
  const [templates, invoiceTemplates, shell, content, main, operations] = await Promise.all([
    readFile(new URL('../concepts/app/pages/organization/templates.html', import.meta.url), 'utf8'),
    readFile(new URL('../concepts/app/pages/invoices/templates.html', import.meta.url), 'utf8'),
    readFile(new URL('../concepts/app/shell/shell.js', import.meta.url), 'utf8'),
    readFile(new URL('../concepts/app/shell/content.js', import.meta.url), 'utf8'),
    readFile(new URL('../concepts/app/main.js', import.meta.url), 'utf8'),
    readFile(new URL('../concepts/app/pages/invoices/operations.js', import.meta.url), 'utf8'),
  ])

  assert.match(templates, /class="organization-tpl"/)
  assert.match(templates, /class="organization-view/)
  assert.match(invoiceTemplates, /include: \.\.\/organization\/templates\.html/)
  assert.match(shell, /\.organization-tpl/)
  assert.match(content, /organization:\s*'\.organization-view'/)
  assert.match(main, /import \{createOrganization\}/)
  assert.match(main, /\['organization', organization\]/)
  assert.match(operations, /\.organization-view/)
})

test('database session termination uses the dialog danger primary action', async () => {
  const dialogs = await readFile(
    new URL('../concepts/app/pages/organization/dialogs.html', import.meta.url),
    'utf8'
  )

  assert.match(
    dialogs,
    /<button type="submit" class="lbtn pri" id="organization-session-confirm">/
  )
  assert.doesNotMatch(dialogs, /class="lbtn dan" id="organization-session-confirm"/)
})

test('database session termination summarizes the affected workload with labeled metadata', () => {
  const markup = renderOrganizationSessionTarget(
    'terminate',
    {
      id: 'db-2191',
      workload: 'Reporting',
      account: 'skey_app',
      query: 'Aggregate inventory valuation',
    },
    value => value
  )

  assert.match(markup, /data-organization-session-summary/)
  assert.match(markup, />Database session</)
  assert.match(markup, />Account</)
  assert.match(markup, />Current operation</)
  assert.match(markup, /db-2191/)
  assert.match(markup, /Aggregate inventory valuation/)
})

test('createOrganization exposes the standard page contract plus role and section setters', async () => {
  const source = await readFile(
    new URL('../concepts/app/pages/organization/organization.js', import.meta.url),
    'utf8'
  )
  assert.match(source, /export function createOrganization/)
  assert.match(source, /id:\s*'organization'/)
  assert.match(source, /function activate/)
  assert.match(source, /function deactivate/)
  assert.match(source, /function dispose/)
  assert.match(source, /function setRole/)
  assert.match(source, /function setSection/)
})

test('topbar user menu is grouped and contains role-aware organization links', async () => {
  const [html, source, main] = await Promise.all([
    readFile(new URL('../concepts/app/shell/shell.html', import.meta.url), 'utf8'),
    readFile(new URL('../concepts/app/shell/topbar.js', import.meta.url), 'utf8'),
    readFile(new URL('../concepts/app/main.js', import.meta.url), 'utf8'),
  ])

  ;['Personal', 'Organization', 'Workspace', 'Session'].forEach(label => {
    assert.match(html, new RegExp(`>${label}<`))
  })
  assert.match(html, /data-active-role-label/)
  assert.match(html, /data-organization-menu-group/)
  assert.match(html, /data-organization-section="overview"/)
  assert.match(html, /data-organization-section="users"/)
  assert.match(html, /data-organization-section="audit"/)
  assert.match(html, /data-organization-section="performance"/)
  assert.match(html, /data-organization-section="staff"/)
  assert.match(source, /navigateToOrganizationSection/)
  assert.match(source, /function setRole/)
  assert.match(source, /organization-menu/)
  assert.match(main, /navigateToOrganizationSection/)
})

test('data-list filter reset restores rows supplied through setRows, not the empty static config', async () => {
  const controller = await readFile('concepts/app/components/data-list/filter-controller.js', 'utf8')
  const model = await readFile('concepts/app/components/data-list/model.js', 'utf8')
  assert.doesNotMatch(controller, /sourceRows = (config|DATA_LIST_CONFIG\[context\])\.rows/)
  assert.match(controller, /sourceRows = listState\.baseRows/)
  assert.match(model, /state\.baseRows = nextRows/)
})
