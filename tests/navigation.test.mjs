import test from 'node:test';
import assert from 'node:assert/strict';
import {createNavigation} from '../concepts/app/core/navigation.js';

function setup(requestLeave = () => true) {
  const calls = [];
  const pages = new Map(['list', 'record', 'email'].map(id => [id, {
    id, roots: [], activate: () => calls.push(`activate:${id}`),
    deactivate: () => calls.push(`deactivate:${id}`), dispose: () => calls.push(`dispose:${id}`),
  }]));
  const nav = createNavigation({resolvePage: id => pages.get(id), requestLeave,
    showPage: page => calls.push(`show:${page.id}`), onChange: id => calls.push(`change:${id}`)});
  return {nav, calls};
}

test('navigation attaches before activating the cached page and notifies last', async () => {
  const {nav, calls} = setup();
  assert.equal(await nav.navigate('list'), true);
  assert.deepEqual(calls, ['show:list', 'activate:list', 'change:list']);
  calls.length = 0;
  await nav.navigate('record');
  assert.deepEqual(calls, ['deactivate:list', 'show:record', 'activate:record', 'change:record']);
  assert.equal(nav.current(), 'record');
});

test('a rejected leave keeps the current page active', async () => {
  let allow = true;
  const {nav, calls} = setup(() => allow);
  await nav.navigate('list');
  calls.length = 0;
  allow = false;
  assert.equal(await nav.navigate('record'), false);
  assert.equal(nav.current(), 'list');
  assert.deepEqual(calls, []);
});

test('unknown pages reject without deactivating the current page', async () => {
  const {nav, calls} = setup();
  await nav.navigate('list');
  calls.length = 0;
  await assert.rejects(nav.navigate('unknown'), /Unknown page/);
  assert.deepEqual(calls, []);
});

test('newer navigation invalidates an older unresolved leave request', async () => {
  let release;
  const {nav, calls} = setup((from, to) => to === 'record' ? new Promise(resolve => { release = resolve; }) : true);
  await nav.navigate('list');
  const older = nav.navigate('record');
  await nav.navigate('email');
  release(true);
  assert.equal(await older, false);
  assert.equal(nav.current(), 'email');
  assert.ok(!calls.includes('activate:record'));
});

test('repeated activation reuses the page and disposal invalidates pending navigation', async () => {
  let release;
  const {nav, calls} = setup((from, to) => to === 'record' ? new Promise(resolve => { release = resolve; }) : true);
  await nav.navigate('list');
  await nav.navigate('list');
  const pending = nav.navigate('record');
  nav.dispose();
  release(true);
  assert.equal(await pending, false);
  assert.equal(calls.filter(call => call === 'dispose:list').length, 1);
  await assert.rejects(nav.navigate('email'), /disposed/);
});
