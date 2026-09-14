import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, rm, symlink, stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {assemble, build} from '../scripts/build.mjs';
import {serve} from '../scripts/serve.mjs';

const execFileAsync = promisify(execFile);

// assemble() resolves includes relative to a fixed `concepts/` sourceRoot
// captured at module load time (see scripts/build.mjs), so these tests
// build their fixtures *inside* the real concepts/ tree (under a
// gitignored scratch subdirectory) rather than in an unrelated temp dir.
const FIXTURE_ROOT = path.resolve('concepts/.test-fixtures');

async function withFixtures(files, fn) {
  await mkdir(FIXTURE_ROOT, {recursive: true});
  const dir = await mkdtemp(path.join(FIXTURE_ROOT, 'fx-'));
  try {
    for (const [relPath, content] of Object.entries(files)) {
      const target = path.join(dir, relPath);
      await mkdir(path.dirname(target), {recursive: true});
      await writeFile(target, content, 'utf8');
    }
    await fn(dir);
  } finally {
    await rm(dir, {recursive: true, force: true});
  }
}

test('assemble: expands a simple include', async () => {
  await withFixtures({
    'entry.html': '<p>before</p><!-- include: part.html --><p>after</p>',
    'part.html': '<span>middle</span>',
  }, async dir => {
    const result = await assemble(path.join(dir, 'entry.html'));
    assert.equal(result, '<p>before</p><span>middle</span><p>after</p>');
  });
});

test('assemble: expands nested includes', async () => {
  await withFixtures({
    'entry.html': 'A<!-- include: mid.html -->Z',
    'mid.html': 'B<!-- include: leaf.html -->Y',
    'leaf.html': 'C',
  }, async dir => {
    const result = await assemble(path.join(dir, 'entry.html'));
    assert.equal(result, 'ABCYZ');
  });
});

test('assemble: nested include resolves relative to the including file, not the entry', async () => {
  await withFixtures({
    'entry.html': '<!-- include: sub/mid.html -->',
    'sub/mid.html': '<!-- include: leaf.html -->',
    'sub/leaf.html': 'nested-leaf',
  }, async dir => {
    const result = await assemble(path.join(dir, 'entry.html'));
    assert.equal(result, 'nested-leaf');
  });
});

test('assemble: throws a clear error for a missing include', async () => {
  await withFixtures({
    'entry.html': '<!-- include: missing.html -->',
  }, async dir => {
    await assert.rejects(() => assemble(path.join(dir, 'entry.html')));
  });
});

test('assemble: throws on a direct include cycle', async () => {
  await withFixtures({
    'entry.html': '<!-- include: entry.html -->',
  }, async dir => {
    await assert.rejects(
      () => assemble(path.join(dir, 'entry.html')),
      /cycle/i
    );
  });
});

test('assemble: throws on an indirect include cycle', async () => {
  await withFixtures({
    'a.html': '<!-- include: b.html -->',
    'b.html': '<!-- include: a.html -->',
  }, async dir => {
    await assert.rejects(
      () => assemble(path.join(dir, 'a.html')),
      /cycle/i
    );
  });
});

test('assemble: rejects an include path that escapes concepts/', async () => {
  // Target a real file outside concepts/ (repo-root package.json) so the
  // resolved path exists and the rejection is provably the "outside
  // concepts/" guard, not an unrelated ENOENT from a missing target.
  await withFixtures({
    'entry.html': '<!-- include: escape.html -->',
  }, async dir => {
    // dir is concepts/.test-fixtures/fx-XXXX/ — compute the include target
    // (repo-root package.json) as a path relative to that fixture dir.
    const target = path.relative(dir, path.resolve('package.json'));
    await writeFile(path.join(dir, 'escape.html'), `<!-- include: ${target} -->`, 'utf8');
    await assert.rejects(
      () => assemble(path.join(dir, 'entry.html')),
      /outside concepts/i
    );
  });
});

test('assemble: does not execute embedded script content, pure string substitution', async () => {
  await withFixtures({
    'entry.html': '<!-- include: evil.html -->',
    'evil.html': '<script>globalThis.__ASSEMBLE_RAN__ = true;</script>',
  }, async dir => {
    const result = await assemble(path.join(dir, 'entry.html'));
    assert.equal(result, '<script>globalThis.__ASSEMBLE_RAN__ = true;</script>');
    assert.equal(globalThis.__ASSEMBLE_RAN__, undefined);
  });
});

test('assemble: multiple sibling includes in one file all expand, in order', async () => {
  await withFixtures({
    'entry.html': '1<!-- include: a.html -->2<!-- include: b.html -->3',
    'a.html': 'A',
    'b.html': 'B',
  }, async dir => {
    const result = await assemble(path.join(dir, 'entry.html'));
    assert.equal(result, '1A2B3');
  });
});

test('assemble: reassembling the real app-shell.html fragments reproduces the pre-fragment-move markup byte-for-byte, plus only this task\'s own intentional entry-point edits', async () => {
  // ddd8569 is the Task 2 mechanical-extraction checkpoint commit — the last
  // point where concepts/app-shell.html held the complete markup inline,
  // before Task 3 moved templates/overlays out into concepts/app/shell/
  // fragments. Re-assembling the fragmented source must reproduce that
  // exact content except for the two lines Task 4/10 intentionally change:
  // the classic-script entry point becomes a module entry point. Task 4
  // pointed it at the temporary app/entry.js; Task 10 retargets it at
  // app/main.js, the plan's real composition root (see concepts/app/main.js
  // and this task's report for why). The prototype-controls classic script
  // also gains `defer` so it keeps executing after the now-deferred module
  // script (see the Task 4 report for why). Any OTHER difference here means
  // the fragment-assembly mechanism itself changed markup it shouldn't
  // have — that's still a real regression to catch.
  const {stdout: baseline} = await execFileAsync('git', ['show', 'ddd8569:concepts/app-shell.html']);
  const expected = baseline
    .replace(
      '    <script src="app/legacy-app.js"></script>',
      '    <script type="module" src="app/main.js"></script>'
    )
    .replace(
      '    <script id="shell-kit-js" src="app/prototype/legacy-controls.js"></script>',
      '    <script id="shell-kit-js" src="app/prototype/legacy-controls.js" defer></script>'
    );
  const assembled = await assemble(path.resolve('concepts/app-shell.html'));
  assert.equal(assembled, expected);
});

test('build: produces dist/concepts/app-shell.html with no unresolved include directives', async () => {
  await build();
  const html = await readFile('dist/concepts/app-shell.html', 'utf8');
  assert.doesNotMatch(html, /<!-- include: /);
});

test('build: only copies allowlisted public paths into dist/', async () => {
  await build();
  const allow = ['index.html', 'logo-skey.png', 'concepts', 'deck', 'audit', 'docs'];
  for (const entry of allow) {
    await assert.doesNotReject(stat(path.join('dist', entry)));
  }
  // node_modules, scripts, tests, package.json etc. must never be copied.
  for (const forbidden of ['node_modules', 'scripts', 'tests', 'package.json', '.git', '.superpowers']) {
    await assert.rejects(stat(path.join('dist', forbidden)));
  }
});

test('build: index.html links to public artifacts still resolve in dist/', async () => {
  await build();
  const html = await readFile('dist/index.html', 'utf8');
  const hrefs = [...html.matchAll(/href="([^"#][^"]*)"/g)]
    .map(m => m[1])
    .filter(href => !/^https?:\/\//.test(href));
  assert.ok(hrefs.length > 0, 'expected at least one local href in index.html');
  for (const href of hrefs) {
    const target = path.join('dist', href.split('?')[0].split('#')[0]);
    await assert.doesNotReject(stat(target), `missing dist target for href="${href}"`);
  }
});

test('build: rejects a symlink that escapes the public-path allowlist', async () => {
  const escapeDir = await mkdtemp(path.join(tmpdir(), 'build-escape-'));
  try {
    await writeFile(path.join(escapeDir, 'secret.txt'), 'top secret');
    const linkPath = path.resolve('escaped-symlink-fixture');
    await rm(linkPath, {force: true});
    await symlink(escapeDir, linkPath, 'dir');
    try {
      // A symlink at the repo root is not on the allowlist itself, so it
      // must never appear in dist/ even though build() otherwise succeeds.
      await build();
      await assert.rejects(stat(path.join('dist', 'escaped-symlink-fixture')));
    } finally {
      await rm(linkPath, {force: true});
    }
  } finally {
    await rm(escapeDir, {recursive: true, force: true});
  }
});

test('served dist/: HTML, CSS, and JS assets have correct MIME types', async () => {
  await build();
  const server = await serve({root: 'dist', port: 0});
  try {
    const port = server.address().port;
    const html = await fetchHead(`http://127.0.0.1:${port}/concepts/app-shell.html`);
    assert.match(html.headers['content-type'], /text\/html/);
    const css = await fetchHead(`http://127.0.0.1:${port}/concepts/app/styles/legacy-app.css`);
    assert.match(css.headers['content-type'], /text\/css/);
    const js = await fetchHead(`http://127.0.0.1:${port}/concepts/app/legacy-app.js`);
    assert.match(js.headers['content-type'], /javascript/);
  } finally {
    server.close();
  }
});

test('served dist/: original asset URLs referenced from app-shell.html still resolve (200)', async () => {
  await build();
  const server = await serve({root: 'dist', port: 0});
  try {
    const port = server.address().port;
    const paths = [
      '/concepts/app-shell.html',
      '/concepts/app/styles/legacy-app.css',
      '/concepts/app/legacy-app.js',
      '/concepts/app/prototype/controls.css',
      '/concepts/app/prototype/legacy-controls.js',
    ];
    for (const p of paths) {
      const res = await fetchHead(`http://127.0.0.1:${port}${p}`);
      assert.equal(res.statusCode, 200, `expected 200 for ${p}`);
    }
  } finally {
    server.close();
  }
});

test('served dist/: path traversal outside dist/ is rejected', async () => {
  await build();
  const server = await serve({root: 'dist', port: 0});
  try {
    const port = server.address().port;
    const res = await fetchHead(`http://127.0.0.1:${port}/../package.json`);
    assert.notEqual(res.statusCode, 200);
  } finally {
    server.close();
  }
});

function fetchHead(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      res.resume();
      resolve(res);
    }).on('error', reject);
  });
}
