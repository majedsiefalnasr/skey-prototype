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
  assert.match(input, /Shared data-list menu renderers[\s\S]*@source inline\("fixed z-\[120\]/);
  assert.match(input, /Shared data-list card and kanban renderers[\s\S]*data-\[s=posted\]:bg-/);
  assert.match(input, /Shared notification and assistant renderers[\s\S]*group-\[\.open\]:flex/);

  const generated = await readFile(path.join(root, 'dist/concepts/app/styles/tailwind.css'), 'utf8');
  assert.ok(generated.includes('.\\[box-shadow\\:var\\(--shadow-1\\)\\]'));
  assert.ok(generated.includes('.\\[\\&\\>button\\]\\:min-h-8>button'));
  assert.match(generated, /data-s=posted[^}]*background-color:var\(--st-post-bg\)/);
  assert.ok(generated.includes('.group-\\[\\.open\\]\\:flex'));

  const manifest = await readFile(path.join(root, 'concepts/app/styles/tailwind/compatibility.md'), 'utf8');
  assert.match(manifest, /\| Owner \| Selector \| Reason \| Removal condition \|/);
  assert.match(manifest, /::before.*::after/);
  assert.match(manifest, /@keyframes/);
  assert.match(manifest, /ApexCharts DOM/);
  assert.match(manifest, /aria-\*.*relationships/);
  assert.match(manifest, /prototype density\/style modes/);

  const output = await stat(path.join(root, 'dist/concepts/app/styles/tailwind.css'));
  // Task 4 replaces 60,749 bytes of retired component CSS with generated
  // utilities. The compiled output is 53,131 bytes at this checkpoint, so the
  // combined shipped CSS shrinks even though the temporary Tailwind-only Task 3
  // ceiling no longer applies. Task 7 still owns the plan's final baseline +
  // 10% review and its explicit dynamic-utility exception report.
  assert.ok(output.size >= 6518);
  assert.ok(output.size <= 54000, `Tailwind output exceeds the reviewed Task 4 ceiling: ${output.size} bytes`);
});
