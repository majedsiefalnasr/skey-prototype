import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// The Task 2 checkpoint originally included a fourth test here asserting
// concepts/app/legacy-app.js was byte-identical to the baseline's inline
// application script. Per the plan ("Extraction byte tests become
// checkpoint evidence after later modules replace these files; do not keep
// tests that require deleted temporary files"), that invariant stopped
// applying once Task 4 began pulling shared facilities out of
// legacy-app.js and converting it into a module (its own Interfaces
// section explicitly authorizes modifying this file) — legacy-app.js is
// no longer expected to match the frozen baseline byte-for-byte, and won't
// be again until Task 12 removes it entirely. The remaining three tests
// below cover files this task does not touch and remain valid checkpoint
// evidence for Task 2's mechanical extraction.

test('mechanical extraction retains prototype-controls script bytes', async () => {
  const original = await readFile('.baseline/concepts/app-shell.html', 'utf8');
  const scripts = [...original.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
    .filter(match => !/\bsrc=/.test(match[1]));
  const controlsScript = scripts.find(match => /id="shell-kit-js"/.test(match[1]))[2];
  assert.equal(await readFile('concepts/app/prototype/legacy-controls.js','utf8'), controlsScript);
});

test('mechanical extraction retains main style block bytes', async () => {
  const original = await readFile('.baseline/concepts/app-shell.html', 'utf8');
  const styles = [...original.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style>/g)];
  const mainStyle = styles.find(match => !/id="shell-kit-css"/.test(match[1]))[2];
  assert.equal(await readFile('concepts/app/styles/legacy-app.css','utf8'), mainStyle);
});

test('mechanical extraction retains prototype-controls style block bytes', async () => {
  const original = await readFile('.baseline/concepts/app-shell.html', 'utf8');
  const styles = [...original.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style>/g)];
  const controlsStyle = styles.find(match => /id="shell-kit-css"/.test(match[1]))[2];
  assert.equal(await readFile('concepts/app/prototype/controls.css','utf8'), controlsStyle);
});
