import assert from 'node:assert/strict';
import {mkdtemp, readFile, stat} from 'node:fs/promises';
import {test} from 'node:test';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {compileTailwind} from '../scripts/tailwind.mjs';

test('Tailwind compiler writes a non-empty staged stylesheet', async () => {
  const output = path.join(await mkdtemp(path.join(tmpdir(), 'tw-')), 'tailwind.css');
  const {bytes} = await compileTailwind({root: process.cwd(), output});
  assert.ok(bytes > 0);
  assert.match(await readFile(output, 'utf8'), /@layer utilities|\.flex/);
});

test('Tailwind input has explicit sources and the generated output stays within its initial budget', async () => {
  const root = process.cwd();
  const input = await readFile(path.join(root, 'concepts/app/styles/tailwind.css'), 'utf8');

  assert.doesNotMatch(input, /^@import\s+"tailwindcss"\s*;/m);
  assert.match(input, /@import "tailwindcss\/theme" layer\(theme\);/);
  assert.match(input, /@import "\.\/tailwind\/base\.css" layer\(base\);/);
  assert.match(input, /@import "tailwindcss\/utilities" layer\(utilities\);/);
  assert.match(input, /@source "\.\.\/\.\.\/app-shell\.html";/);
  assert.match(input, /@source "\.\.\/\*\*\/\*\.html";/);
  assert.match(input, /@source "\.\.\/\*\*\/\*\.js";/);
  assert.doesNotMatch(input, /@source inline\("\*/);

  const manifest = await readFile(path.join(root, 'concepts/app/styles/tailwind/compatibility.md'), 'utf8');
  assert.match(manifest, /\| Owner \| Selector \| Reason \| Removal condition \|/);
  assert.match(manifest, /::before.*::after/);
  assert.match(manifest, /@keyframes/);
  assert.match(manifest, /ApexCharts DOM/);
  assert.match(manifest, /aria-\*.*relationships/);
  assert.match(manifest, /prototype density\/style modes/);

  const output = await stat(path.join(root, 'dist/concepts/app/styles/tailwind.css'));
  // Task 3 adds literal shell and launchpad utilities. Keep the original
  // 6518-byte checkpoint as the lower baseline while bounding this phase's
  // compiled output until the final migration establishes its final budget.
  assert.ok(output.size >= 6518);
  assert.ok(output.size <= 22000, `Tailwind output exceeds the Task 3 budget: ${output.size} bytes`);
});
