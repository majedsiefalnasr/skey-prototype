import test from 'node:test';
import assert from 'node:assert/strict';
import {access, readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import {build} from '../scripts/build.mjs';

const appRoot = path.resolve('concepts/app');

async function modules(directory) {
  const entries = await readdir(directory, {withFileTypes: true});
  const files = await Promise.all(entries.map(async entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? modules(file) : entry.name.endsWith('.js') ? [file] : [];
  }));
  return files.flat();
}

function imports(source) {
  return [...source.matchAll(/\bimport\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g)]
    .map(match => match[1]);
}

test('architecture: the authored entry uses only the module application entry', async () => {
  const html = await readFile('concepts/app-shell.html', 'utf8');
  assert.match(html, /<script type="module" src="app\/main\.js"><\/script>/);
  assert.doesNotMatch(html, /legacy-app\.js|legacy-controls\.js/);
  assert.doesNotMatch(html, /\bon\w+\s*=/, 'migrated handlers must bind from modules');
  await assert.rejects(access('concepts/app/legacy-app.js'));
  await assert.rejects(access('concepts/app/styles/legacy-app.css'));
});

test('architecture: modules have no circular imports and shared layers do not import pages', async () => {
  const files = await modules(appRoot);
  const graph = new Map();
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    const dependencies = [];
    for (const specifier of imports(source)) {
      if (!specifier.startsWith('.')) continue;
      const resolved = path.resolve(path.dirname(file), specifier);
      dependencies.push(resolved.endsWith('.js') ? resolved : `${resolved}.js`);
    }
    graph.set(file, dependencies);
    if (file.includes(`${path.sep}core${path.sep}`) || file.includes(`${path.sep}components${path.sep}data-list${path.sep}`)) {
      assert.ok(!dependencies.some(dependency => dependency.includes(`${path.sep}pages${path.sep}`)), `${path.relative(appRoot, file)} imports a page`);
    }
  }
  const visiting = new Set();
  const visited = new Set();
  const visit = file => {
    if (visiting.has(file)) throw new Error(`Circular module import: ${[...visiting, file].map(item => path.relative(appRoot, item)).join(' -> ')}`);
    if (visited.has(file) || !graph.has(file)) return;
    visiting.add(file);
    for (const dependency of graph.get(file)) visit(dependency);
    visiting.delete(file);
    visited.add(file);
  };
  for (const file of graph.keys()) visit(file);
});

test('architecture: built shell has no include directives or duplicate IDs', async () => {
  await build();
  const html = await readFile('dist/concepts/app-shell.html', 'utf8');
  assert.doesNotMatch(html, /<!-- include:/);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual(duplicates, []);
});

test('architecture: Task 6 retires every remaining legacy stylesheet and its source file', async () => {
  const html = await readFile('concepts/app-shell.html', 'utf8');
  const links = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)].map(
    match => match[1]
  );
  assert.deepEqual(links, ['app/styles/tailwind.css', 'app/prototype/controls.css'],
    'exactly one compiled Tailwind stylesheet link plus the prototype shell-kit-css link may remain');
  assert.doesNotMatch(html, /legacy-app\.css/);

  const retiredFiles = [
    'concepts/app/styles/tokens.css',
    'concepts/app/styles/base.css',
    'concepts/app/styles/app.css',
    'concepts/app/styles/app-2.css',
    'concepts/app/styles/app-3.css',
    'concepts/app/styles/app-4.css',
    'concepts/app/styles/app-5.css',
    'concepts/app/styles/app-6.css',
    'concepts/app/styles/app-7.css',
    'concepts/app/styles/overrides.css',
    'concepts/app/styles/overrides-2.css',
    'concepts/app/shell/shell-5.css',
    'concepts/app/shell/shell-6.css',
    'concepts/app/shell/shell-7.css',
    'concepts/app/components/data-list/list.css',
    'concepts/app/pages/geography/geography.css',
    'concepts/app/pages/email/email.css',
  ];
  for (const file of retiredFiles) {
    await assert.rejects(access(file), `expected ${file} to be deleted`);
  }

  async function collectCss(directory) {
    const entries = await readdir(directory, {withFileTypes: true});
    const files = await Promise.all(entries.map(async entry => {
      const file = path.join(directory, entry.name);
      return entry.isDirectory() ? collectCss(file) : entry.name.endsWith('.css') ? [file] : [];
    }));
    return files.flat();
  }
  const cssFiles = await collectCss(path.resolve('concepts'));
  const relativeCss = cssFiles.map(file => path.relative(process.cwd(), file)).sort();
  assert.deepEqual(relativeCss, [
    'concepts/app/prototype/controls.css',
    'concepts/app/styles/tailwind.css',
    'concepts/app/styles/tailwind/base.css',
    'concepts/app/styles/tailwind/components.css',
    'concepts/app/styles/tailwind/customers.css',
    'concepts/app/styles/tailwind/email.css',
    'concepts/app/styles/tailwind/geography.css',
    'concepts/app/styles/tailwind/invoices.css',
    'concepts/app/styles/tailwind/shell.css',
  ].sort(), 'exactly one compiled Tailwind entry plus its compatibility layers and the prototype controls stylesheet may remain');
});

test('architecture: compiled Tailwind output records every compatibility-manifest owner', async () => {
  const manifest = await readFile('concepts/app/styles/tailwind/compatibility.md', 'utf8');
  assert.match(manifest, /\| Geography \|/, 'geography compatibility rows must be recorded');
  assert.match(manifest, /\| Email \|/, 'email compatibility rows must be recorded');
});

// The compiled-output-size ceiling is asserted once, in tests/tailwind.test.mjs
// ("Task 7 final Tailwind budget"), per the plan's file-ownership table assigning
// generated-output-size checks there. Keeping a second ceiling here duplicated
// the same dist/concepts/app/styles/tailwind.css measurement against a different
// number.
