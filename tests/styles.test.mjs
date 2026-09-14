import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const checkpoint = execFileSync('git', ['show', 'ddd8569:concepts/app/styles/legacy-app.css'], {encoding: 'utf8'});
const hash = text => createHash('sha256').update(text).digest('hex');
// Fully retired stylesheets: unlinked from app-shell.html entirely, so they
// are excluded from both the byte-checkpoint comparison and the linked-file
// list below.
const migrated = new Set([
  'app/shell/shell.css',
  'app/pages/home/home.css',
  'app/shell/shell-2.css',
  'app/shell/shell-3.css',
  'app/shell/shell-4.css',
  'app/components/record-pager/pager.css',
  'app/components/assistant/assistant.css',
  'app/components/toast/toast.css',
  'app/components/loading/loading.css',
  'app/components/data-list/list-2.css',
]);

// Partially converted stylesheets: still linked (they retain a cross-owner
// atom or a deferred owner's rule this task cannot touch -- see each file's
// own header comment), but their remaining bytes no longer match the
// checkpoint verbatim because Task 4 removed the selectors it did convert.
// Excluded only from the byte-checkpoint comparison, not from the linked-file
// list.
const partiallyMigrated = new Set([
  'app/components/notifications/notifications.css',
  'app/shell/shell-6.css',
]);

test('owned styles preserve every checkpoint declaration and condition in exact cascade order', async () => {
  const html = await readFile('concepts/app-shell.html', 'utf8');
  const links = [...html.matchAll(/<link\b[^>]*href="(app\/[^" ]+\.css)"[^>]*>/g)].map(match => match[1]);
  assert.equal(links[0], 'app/styles/tailwind.css');
  assert.equal(links.at(-1), 'app/prototype/controls.css');
  const legacyLinks = links.slice(0, -1).filter(file => file !== 'app/styles/tailwind.css');
  const styles = await Promise.all(legacyLinks.map(file => readFile(`concepts/${file}`, 'utf8')));
  const reconstructed = styles
    .map((text, index) => ({text, file: legacyLinks[index]}))
    .filter(({file}) => !partiallyMigrated.has(file))
    .map(({text}) => text.replace(/^\/\* Extracted[\s\S]*?\*\/\n/, ''))
    .join('');
  const inventory = JSON.parse(await readFile('tests/support/style-inventory.json', 'utf8'));
  const expected = inventory.files.filter(file => !migrated.has(file.path) && !partiallyMigrated.has(file.path)).map(file => checkpoint.slice(file.start, file.end)).join('');
  assert.equal(hash(reconstructed), hash(expected), 'unmigrated stylesheet blocks must retain checkpoint bytes and order');
});

test('style inventory accounts for contiguous complete blocks and every ordered stylesheet', async () => {
  const inventory = JSON.parse(await readFile('tests/support/style-inventory.json', 'utf8'));
  assert.equal(inventory.sha256, hash(checkpoint));
  const html = await readFile('concepts/app-shell.html', 'utf8');
  const files = [...html.matchAll(/<link\b[^>]*href="(app\/[^" ]+\.css)"[^>]*>/g)].map(match => match[1]);
  assert.equal(files[0], 'app/styles/tailwind.css');
  assert.deepEqual(
    inventory.files.filter(file => !migrated.has(file.path)).map(file => file.path),
    files.slice(0, -1).filter(file => file !== 'app/styles/tailwind.css')
  );
  for (const rule of inventory.rules.filter(rule => !migrated.has(rule.file) && !partiallyMigrated.has(rule.file))) {
    assert.equal(hash(checkpoint.slice(rule.start, rule.end)), rule.sha256);
    const owner = inventory.files.find(file => file.path === rule.file);
    assert.ok(owner && rule.start >= owner.start && rule.end <= owner.end, `split rule: ${rule.selector}`);
  }
  assert.equal(inventory.files.filter(file => migrated.has(file.path)).length, migrated.size);
});
