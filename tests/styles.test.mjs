import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const checkpoint = execFileSync('git', ['show', 'ddd8569:concepts/app/styles/legacy-app.css'], {encoding: 'utf8'});
const hash = text => createHash('sha256').update(text).digest('hex');

test('owned styles preserve every checkpoint declaration and condition in exact cascade order', async () => {
  const html = await readFile('concepts/app-shell.html', 'utf8');
  const links = [...html.matchAll(/<link\b[^>]*href="(app\/[^" ]+\.css)"[^>]*>/g)].map(match => match[1]);
  assert.equal(links.at(-1), 'app/prototype/controls.css');
  const styles = await Promise.all(links.slice(0, -1).map(file => readFile(`concepts/${file}`, 'utf8')));
  const reconstructed = styles.map(text => text.replace(/^\/\* Extracted[\s\S]*?\*\/\n/, '')).join('');
  assert.equal(hash(reconstructed), hash(checkpoint), 'complete rule blocks must retain checkpoint bytes and order');
});

test('style inventory accounts for contiguous complete blocks and every ordered stylesheet', async () => {
  const inventory = JSON.parse(await readFile('tests/support/style-inventory.json', 'utf8'));
  assert.equal(inventory.sha256, hash(checkpoint));
  const html = await readFile('concepts/app-shell.html', 'utf8');
  const files = [...html.matchAll(/<link\b[^>]*href="(app\/[^" ]+\.css)"[^>]*>/g)].map(match => match[1]);
  assert.deepEqual(inventory.files.map(file => file.path), files.slice(0, -1));
  let cursor = 0;
  for (const rule of inventory.rules) {
    assert.equal(rule.start, cursor, `gap or overlap before ${rule.selector}`);
    assert.equal(hash(checkpoint.slice(rule.start, rule.end)), rule.sha256);
    const owner = inventory.files.find(file => file.path === rule.file);
    assert.ok(owner && rule.start >= owner.start && rule.end <= owner.end, `split rule: ${rule.selector}`);
    cursor = rule.end;
  }
  assert.equal(cursor, checkpoint.length);
});
