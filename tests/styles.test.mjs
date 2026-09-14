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

// Exact partial ownership: Task 4 retires only these notification rules. The
// switch and email-avatar rules remain byte-for-byte owned by the legacy file
// because shell/email consumers are outside Task 4. No whole-file bypasses.
const partiallyMigrated = new Map([
  ['app/components/notifications/notifications.css', new Set([
    '.notif-pop',
    '.notif-hd',
    '.notif-hd b',
    '.notif-badge',
    '.notif-hd-lbl',
    '.notif-tabs',
    '.notif-tabs button',
    ".notif-tabs button[aria-selected='true']",
    '.notif-empty',
    '.notif-empty svg',
    '.notif-empty p',
    '.notif-body',
    '.notif-row',
    '.notif-row:hover',
    '.notif-icn',
    '.notif-row.unread .notif-icn::after',
    '.notif-row.unread .notif-txt',
    '.notif-txt',
    '.notif-txt b',
    '.notif-what',
    '.notif-time',
  ])],
]);

const withoutExtractionHeader = text => text.replace(/^\/\* Extracted[\s\S]*?\*\/\n/, '').trim();

test('owned and partially migrated styles preserve every non-retired checkpoint byte', async () => {
  const html = await readFile('concepts/app-shell.html', 'utf8');
  const links = [...html.matchAll(/<link\b[^>]*href="(app\/[^" ]+\.css)"[^>]*>/g)].map(match => match[1]);
  assert.equal(links[0], 'app/styles/tailwind.css');
  assert.equal(links.at(-1), 'app/prototype/controls.css');
  const legacyLinks = links.slice(0, -1).filter(file => file !== 'app/styles/tailwind.css');
  const inventory = JSON.parse(await readFile('tests/support/style-inventory.json', 'utf8'));
  for (const file of legacyLinks) {
    const owner = inventory.files.find(item => item.path === file);
    assert.ok(owner, `missing inventory owner: ${file}`);
    const retiredSelectors = partiallyMigrated.get(file);
    const expected = retiredSelectors
      ? inventory.rules
        .filter(rule => rule.file === file && !retiredSelectors.has(rule.selector))
        .map(rule => checkpoint.slice(rule.start, rule.end))
        .join('')
      : checkpoint.slice(owner.start, owner.end);
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
  for (const [file, retiredSelectors] of partiallyMigrated) {
    const inventorySelectors = new Set(inventory.rules.filter(rule => rule.file === file).map(rule => rule.selector));
    for (const selector of retiredSelectors) {
      assert.ok(inventorySelectors.has(selector), `unknown retired selector in ${file}: ${selector}`);
    }
  }
  assert.equal(inventory.files.filter(file => migrated.has(file.path)).length, migrated.size);
});
