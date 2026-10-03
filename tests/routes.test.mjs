import assert from 'node:assert/strict'
import test from 'node:test'
import {parse, format, resolveDefaultEntry, ROUTE_PATHS} from '../concepts/app/core/routes.js'

test('routes: paths this app does not own parse to null (legacy/unknown entry)', () => {
  assert.equal(parse('/concepts/app-shell.html'), null)
  assert.equal(parse('/concepts/app-shell.html', ''), null)
  assert.equal(parse('/some/unknown/path'), null)
  assert.equal(parse('/deck/'), null)
})

test('routes: the default entry parses as defaultEntry and nothing else does', () => {
  assert.deepEqual(parse('/'), {defaultEntry: true})
  assert.deepEqual(parse('/'), parse('/'))
  for (const route of ROUTE_PATHS) {
    assert.notDeepEqual(parse(route), {defaultEntry: true})
  }
})

test('routes: every real screen has a deterministic deep link', () => {
  assert.deepEqual(parse('/dashboard'), {id: 'dashboard', data: {}})
  assert.deepEqual(parse('/invoices'), {id: 'list', data: {}})
  assert.deepEqual(parse('/customers'), {id: 'customers-list', data: {}})
  assert.deepEqual(parse('/geography'), {id: 'geo-list', data: {}})
  assert.deepEqual(parse('/email'), {id: 'email', data: {}})
  assert.deepEqual(parse('/profile'), {id: 'profile', data: {}})
  assert.deepEqual(parse('/organization'), {id: 'organization', data: {}})
})

test('routes: trailing slashes and query-free lookups normalize', () => {
  assert.deepEqual(parse('/dashboard/'), {id: 'dashboard', data: {}})
  assert.deepEqual(parse('/invoices/'), {id: 'list', data: {}})
  assert.deepEqual(parse('dashboard'), parse('/dashboard'))
})

test('routes: profile and organization carry validated section queries', () => {
  assert.deepEqual(parse('/profile', '?section=account'), {id: 'profile', data: {section: 'account'}})
  assert.deepEqual(parse('/organization', '?section=users'), {
    id: 'organization',
    data: {section: 'users'},
  })
  // Invalid section values degrade to the section-less route rather than
  // reaching page activation.
  assert.deepEqual(parse('/profile', '?section=bad value'), {id: 'profile', data: {}})
  assert.deepEqual(parse('/profile', '?section='), {id: 'profile', data: {}})
  assert.deepEqual(parse('/profile', '?other=x'), {id: 'profile', data: {}})
})

test('routes: format maps views to their area URL (no record ids in paths)', () => {
  assert.equal(format('dashboard'), '/dashboard')
  assert.equal(format('list'), '/invoices')
  assert.equal(format('record'), '/invoices')
  assert.equal(format('customers-list'), '/customers')
  assert.equal(format('customer-record'), '/customers')
  assert.equal(format('geo-list'), '/geography')
  assert.equal(format('geo-record'), '/geography')
  assert.equal(format('email'), '/email')
  assert.equal(format('launchpad'), '/')
  assert.equal(format('profile'), '/profile')
  assert.equal(format('organization'), '/organization')
})

test('routes: format round-trips parse for every routed path', () => {
  for (const route of ROUTE_PATHS) {
    const parsed = parse(route)
    assert.notEqual(parsed, null, `${route} must parse`)
    assert.equal(format(parsed.id, parsed.data), route, `${route} must round-trip`)
  }
})

test('routes: format returns null for unrouted views and drops invalid sections', () => {
  assert.equal(format('not-a-view'), null)
  assert.equal(format('profile', {section: 'bad value'}), '/profile')
  assert.equal(format('profile', {}), '/profile')
  assert.equal(format('profile', {section: 'account'}), '/profile?section=account')
})

test('routes: the default entry resolves launchpad-vs-dashboard from configuration only', () => {
  assert.deepEqual(resolveDefaultEntry({launchpadEnabled: true}), {kind: 'launchpad'})
  assert.deepEqual(resolveDefaultEntry({launchpadEnabled: false}), {
    id: 'dashboard',
    data: {},
  })
})
