import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parse, format, ROUTE_PATHS} from '../concepts/app/core/routes.js';

test('routes: /signin parses to the sign-in view and formats back', () => {
  assert.deepEqual(parse('/signin'), {id: 'signin', data: {}});
  assert.equal(format('signin'), '/signin');
  assert.ok(ROUTE_PATHS.includes('/signin'), 'built route folders include /signin');
});

test('routes: sign-in is not the default entry and owns no section query', () => {
  assert.notDeepEqual(parse('/signin'), {defaultEntry: true});
  assert.deepEqual(parse('/signin', '?section=users'), {id: 'signin', data: {}});
});

test('signin: every id and data hook the page module queries exists as a real attribute', async () => {
  // Regression: a missing closing quote once swallowed data-si-err into
  // the class value — invisible to the eye, fatal at runtime. An
  // attribute only counts when terminated by whitespace, `/`, `>`, or `=`.
  const template = await readFile('concepts/app/pages/signin/templates.html', 'utf8');
  const present = name => new RegExp(`(?:\\s)${name}(?=[\\s>\\/=])`).test(template);
  for (const id of ['si-tenant', 'si-to2', 'si-change', 'si-who', 'si-user', 'si-pass', 'si-show', 'si-signin', 'si-sso-ms', 'si-sso-gg', 'si-lang', 'si-ws-q', 'si-ws-go', 'si-branch-list', 'si-branch-go', 'si-pin', 'si-pin-signin', 'si-pin-who', 'si-pin-err', 'si-pin-back', 'si-pin-forget', 'si-pin-forget-wrap', 'si-pin-else', 'si-pin-someone', 'si-usepin', 'si-usepin-wrap', 'si-accounts-h', 'si-accounts-list', 'si-accounts-other', 'si-save-h', 'si-save-who', 'si-save-not-now', 'si-save-create', 'si-save-pin-h', 'si-save-pin', 'si-save-pin2', 'si-save-pin-err', 'si-save-back', 'si-save-go']) {
    assert.ok(template.includes(`id="${id}"`), `template owns #${id}`);
  }
  for (const attr of ['data-si-pane', 'data-si-err', 'data-si-caps']) {
    assert.ok(present(attr), `template owns a parseable ${attr}`);
  }
  // Round 2 removed the always-visible workspace rows — the search pane
  // submits without ever rendering a list.
  assert.ok(!template.includes('data-si-ws='), 'no workspace row buttons remain');
  assert.ok(!template.includes('si-ws-empty'), 'no empty-state element remains');
});

test('signin: every data-si-goto target resolves to a real pane, and all thirteen panes exist', async () => {
  const template = await readFile('concepts/app/pages/signin/templates.html', 'utf8');
  const panes = [...template.matchAll(/data-si-pane="([^"]+)"/g)].map(match => match[1]);
  const gotos = [...new Set([...template.matchAll(/data-si-goto="([^"]+)"/g)].map(match => match[1]))];
  assert.equal(new Set(panes).size, panes.length, 'pane ids are unique');
  for (const pane of ['1', '2', 'branch', 'pin', 'accounts', 'save', 'savepin', 'reset', 'workspaces', 'device', 'request', 'privacy', 'support']) {
    assert.ok(panes.includes(pane), `template owns pane ${pane}`);
  }
  assert.equal(panes.length, 13, 'exactly thirteen panes — no strays');
  // `back` is the router's alias for "the auth pane the user came from";
  // every other jump must land on a pane that exists.
  for (const target of gotos) {
    if (target === 'back') continue;
    assert.ok(panes.includes(target), `goto ${target} resolves to a pane`);
  }
  assert.ok(gotos.includes('back'), 'sub-panes offer a back affordance');
});

test('signin: the footer language submenu mirrors the seven-language catalog without colliding with the avatar menu', async () => {
  const {LANGUAGES} = await import('../concepts/app/core/locale.js');
  assert.equal(LANGUAGES.length, 7, 'catalog keeps seven languages');
  const template = await readFile('concepts/app/pages/signin/templates.html', 'utf8');
  assert.ok(template.includes('id="si-lang"'), 'template owns #si-lang');
  assert.ok(template.includes('class="data-menu data-manage-submenu si-language'), 'footer submenu uses the si-language surface');
  assert.ok(!/class="[^"]*language-submenu/.test(template), 'never reuses .language-submenu (avatar specs are strict)');
  const rows = [...template.matchAll(/data-si-language="([a-z]{2})"/g)].map(match => match[1]);
  assert.deepEqual(rows, LANGUAGES.map(language => language.code), 'rows match the catalog order');
  assert.ok(!/data-language="[a-z]{2}"/.test(template), 'no data-language rows in the sign-in template');
  assert.ok(template.includes('name="skey-signin-language"'), 'footer radios own their group name');
});

test('signin: the post-sign-in save dialog is gone — the flow lives in the card', async () => {
  const template = await readFile('concepts/app/pages/signin/templates.html', 'utf8');
  const shell = await readFile('concepts/app/shell/shell.html', 'utf8');
  const main = await readFile('concepts/app/main.js', 'utf8');
  assert.ok(!template.includes('id="sp-'), 'no sp-* ids remain in the sign-in template');
  assert.ok(!shell.includes('save-pin-dialog'), 'shell.html no longer includes the save dialog');
  assert.ok(!main.includes('sp-scrim'), 'main.js no longer drives the dialog');
  assert.ok(!main.includes('openSavePin'), 'openSavePin is gone');
  assert.ok(!main.includes('wireSavePin'), 'wireSavePin is gone');
});

test('signin: round 5 stores accounts under the list key and the single-record loader is gone', async () => {
  const signin = await readFile('concepts/app/pages/signin/signin.js', 'utf8');
  assert.ok(signin.includes("'skey-proto-accounts'"), 'signin.js owns the accounts list key');
  assert.ok(!signin.includes('loadCred'), 'the single-record loader is gone');
});
