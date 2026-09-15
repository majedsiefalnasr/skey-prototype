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
  'app/components/notifications/notifications.css',
  'app/components/dialog/dialog.css',
  'app/pages/invoices/invoices.css',
  'app/pages/invoices/invoices-2.css',
  'app/pages/invoices/invoices-3.css',
  'app/pages/invoices/invoices-4.css',
  'app/pages/invoices/invoices-5.css',
  'app/pages/customers/customers.css',
]);

const withoutExtractionHeader = text => text.replace(/^\/\* Extracted[\s\S]*?\*\/\n/, '').trim();

test('owned styles preserve every non-retired checkpoint byte', async () => {
  const html = await readFile('concepts/app-shell.html', 'utf8');
  const links = [...html.matchAll(/<link\b[^>]*href="(app\/[^" ]+\.css)"[^>]*>/g)].map(match => match[1]);
  assert.equal(links[0], 'app/styles/tailwind.css');
  assert.equal(links.at(-1), 'app/prototype/controls.css');
  const legacyLinks = links.slice(0, -1).filter(file => file !== 'app/styles/tailwind.css');
  const inventory = JSON.parse(await readFile('tests/support/style-inventory.json', 'utf8'));
  for (const file of legacyLinks) {
    const owner = inventory.files.find(item => item.path === file);
    assert.ok(owner, `missing inventory owner: ${file}`);
    const expected = checkpoint.slice(owner.start, owner.end);
    const actual = withoutExtractionHeader(await readFile(`concepts/${file}`, 'utf8'));
    assert.equal(
      hash(actual),
      hash(expected.trim()),
      `${file} must retain every non-retired checkpoint byte in order`
    );
  }
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
  for (const rule of inventory.rules.filter(rule => !migrated.has(rule.file))) {
    assert.equal(hash(checkpoint.slice(rule.start, rule.end)), rule.sha256);
    const owner = inventory.files.find(file => file.path === rule.file);
    assert.ok(owner && rule.start >= owner.start && rule.end <= owner.end, `split rule: ${rule.selector}`);
  }
  assert.equal(inventory.files.filter(file => migrated.has(file.path)).length, migrated.size);
});
