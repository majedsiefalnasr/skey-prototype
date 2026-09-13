import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('mechanical extraction retains application block bytes', async () => {
  const original = await readFile('.baseline/concepts/app-shell.html', 'utf8');
  const script = [...original.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
    .find(match => !/\bsrc=/.test(match[1]))[2];
  assert.equal(await readFile('concepts/app/legacy-app.js','utf8'), script);
});

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
