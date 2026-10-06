import assert from 'node:assert/strict'
import test from 'node:test'
import {parse, format, resolveDefaultEntry, ROUTE_PATHS, APP_PATH_BY_LABEL} from '../concepts/app/core/routes.js'

test('routes: paths this app does not own parse to null (legacy/unknown entry)', () => {
  assert.equal(parse('/concepts/app-shell.html'), null)
  assert.equal(parse('/some/unknown/path'), null)
  assert.equal(parse('/deck/'), null)
  assert.equal(parse('/system'), null)
  assert.equal(parse('/vendors/unknown'), null)
  // v1 flat paths stay retired — no aliases.
  assert.equal(parse('/invoices'), null)
  assert.equal(parse('/geography'), null)
  assert.equal(parse('/email'), null)
  assert.equal(parse('/profile'), null)
  assert.equal(parse('/organization'), null)
})

test('routes: the default entry parses as defaultEntry and nothing else does', () => {
  assert.deepEqual(parse('/'), {defaultEntry: true})
  for (const route of ROUTE_PATHS) {
    assert.notDeepEqual(parse(route), {defaultEntry: true})
  }
})

test('routes: every app base parses to that app\u2019s For You screen', () => {
  assert.equal(Object.keys(APP_PATH_BY_LABEL).length, 20)
  for (const [label, path] of Object.entries(APP_PATH_BY_LABEL)) {
    assert.deepEqual(parse(path), {id: 'foryou', data: {app: label}}, `${path} must map to ${label}`)
  }
})

test('routes: inner screens and shell screens parse to their views', () => {
  assert.deepEqual(parse('/sales-systems-management/sales-invoices'), {id: 'list', data: {}})
  assert.deepEqual(parse('/customers/list'), {id: 'customers-list', data: {}})
  assert.deepEqual(parse('/system-setup/geographical-structure'), {id: 'geo-list', data: {}})
  assert.deepEqual(parse('/system/email'), {id: 'email', data: {}})
  assert.deepEqual(parse('/system/profile'), {id: 'profile', data: {}})
  assert.deepEqual(parse('/system/organization'), {id: 'organization', data: {}})
})

test('routes: trailing slashes and query-free lookups normalize', () => {
  assert.deepEqual(parse('/dashboard/'), {id: 'foryou', data: {app: 'Dashboard'}})
  assert.deepEqual(parse('/system/profile/'), {id: 'profile', data: {}})
  assert.deepEqual(parse('customers'), parse('/customers'))
})

test('routes: profile and organization carry validated section queries', () => {
  assert.deepEqual(parse('/system/profile', '?section=account'), {id: 'profile', data: {section: 'account'}})
  assert.deepEqual(parse('/system/organization', '?section=users'), {
    id: 'organization',
    data: {section: 'users'},
  })
  assert.deepEqual(parse('/system/profile', '?section=bad value'), {id: 'profile', data: {}})
  assert.deepEqual(parse('/system/profile', '?section='), {id: 'profile', data: {}})
  assert.deepEqual(parse('/system/profile', '?other=x'), {id: 'profile', data: {}})
})

test('routes: format maps views to their canonical URL', () => {
  assert.equal(format('foryou', {app: 'Dashboard'}), '/dashboard')
  assert.equal(format('foryou', {app: 'Car rent system'}), '/car-rent-system')
  assert.equal(format('foryou'), '/dashboard')
  assert.equal(format('foryou', {app: 'Not An App'}), '/dashboard')
  assert.equal(format('list'), '/sales-systems-management/sales-invoices')
  assert.equal(format('record'), '/sales-systems-management/sales-invoices')
  assert.equal(format('customers-list'), '/customers/list')
  assert.equal(format('customer-record'), '/customers/list')
  assert.equal(format('geo-list'), '/system-setup/geographical-structure')
  assert.equal(format('geo-record'), '/system-setup/geographical-structure')
  assert.equal(format('email'), '/system/email')
  assert.equal(format('profile'), '/system/profile')
  assert.equal(format('organization'), '/system/organization')
  assert.equal(format('launchpad'), '/')
})

test('routes: format round-trips parse for every routed path', () => {
  assert.equal(ROUTE_PATHS.length, 27)
  for (const route of ROUTE_PATHS) {
    const parsed = parse(route)
    assert.notEqual(parsed, null, `${route} must parse`)
    assert.equal(format(parsed.id, parsed.data), route, `${route} must round-trip`)
  }
})

test('routes: format returns null for unrouted views and drops invalid sections', () => {
  assert.equal(format('not-a-view'), null)
  assert.equal(format('profile', {section: 'bad value'}), '/system/profile')
  assert.equal(format('profile', {}), '/system/profile')
  assert.equal(format('profile', {section: 'account'}), '/system/profile?section=account')
})

test('routes: the default entry resolves launchpad-vs-Dashboard-For-You from configuration only', () => {
  assert.deepEqual(resolveDefaultEntry({launchpadEnabled: true}), {kind: 'launchpad'})
  assert.deepEqual(resolveDefaultEntry({launchpadEnabled: false}), {
    id: 'foryou',
    data: {app: 'Dashboard'},
  })
})
