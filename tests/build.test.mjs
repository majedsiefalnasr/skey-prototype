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

function replaceOnce(source, before, after) {
  const first = source.indexOf(before);
  assert.notEqual(first, -1, `missing intended markup: ${before}`);
  assert.equal(source.indexOf(before, first + before.length), -1, `duplicate intended markup: ${before}`);
  return source.slice(0, first) + after + source.slice(first + before.length);
}

function applyTask3ShellUtilities(html) {
  return [
    ['class="gtop"', 'class="gtop flex items-center gap-3 border-b border-line py-[9px] pe-4 ps-2"'],
    ['class="left"', 'class="left flex w-[calc(var(--sidebar-w)-16px)] shrink-0 items-center gap-2.5"'],
    ['class="gsearch"', 'class="gsearch relative flex flex-1 justify-center"'],
    ['class="swrap"', 'class="swrap relative w-[min(620px,100%)]"'],
    ['class="sbox s-open"', 'class="sbox s-open flex w-full items-center gap-2 rounded-lg border border-line bg-surface px-3 py-[7px] text-start text-muted"'],
    ['class="right"', 'class="right flex shrink-0 items-center gap-[7px]"'],
    ['class="app"', 'class="app relative flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-start font-semibold hover:bg-[var(--hover-overlay)]"'],
    ['class="app-name"', 'class="app-name min-w-0 truncate"'],
    ['class="chip"', 'class="chip inline-flex items-center gap-1.5 rounded-full border border-line px-[11px] py-[5px]"'],
  ].reduce((result, [before, after]) => replaceOnce(result, before, after), html);
}

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

test('assemble: reassembling the real app-shell.html fragments reproduces the pre-fragment-move markup byte-for-byte, plus only each task\'s own intentional entry-point/fragment edits', async () => {
  // ddd8569 is the Task 2 mechanical-extraction checkpoint commit — the last
  // point where concepts/app-shell.html held the complete markup inline,
  // before Task 3 moved templates/overlays out into concepts/app/shell/
  // fragments. Re-assembling the fragmented source must reproduce that
  // exact content except for the intentional edits later tasks made:
  //   - Task 4/10: the classic-script entry point becomes a module entry
  //     point (Task 4 pointed it at the temporary app/entry.js; Task 10
  //     retargets it at app/main.js, the plan's real composition root).
  //   - Task 11: the classic `<script id="shell-kit-js"
  //     src="...legacy-controls.js">` was deleted (no longer needed —
  //     createPrototypeControls in the new app/prototype/controls.js module
  //     is constructed from app/main.js instead, see that file), and
  //     `<link id="shell-kit-css">` moved immediately before the single
  //     remaining module `<script>` so it still loads late (prototype-
  //     control overrides stay ordered after application styles, per the
  //     plan's Global Constraints) without depending on the now-removed
  //     script tag's position. The inline `.demo-bar` prototype-controls
  //     markup itself also moved, byte-for-byte, into its own fragment
  //     (concepts/app/prototype/controls.html, included via `<!-- include:
  //     app/prototype/controls.html -->`) — but since assemble() expands
  //     that include back into the identical markup, this produces NO
  //     observable difference in the reassembled output; the script/link
  //     edits below are real differences from the baseline.
  //   - Task 12: the single `<link rel="stylesheet" href="app/styles/
  //     legacy-app.css">` became one `<link>` per owning component/page
  //     CSS file (plus styles/{tokens,base,app,overrides}.css), in the
  //     same original cascade order legacy-app.css's rules appeared in —
  //     see docs/superpowers/plans/2026-09-13-app-shell-components.md
  //     Task 12 for the full ownership mapping. legacy-app.css itself was
  //     deleted once every rule had a real owner file.
  // Any OTHER difference here means the fragment-assembly mechanism itself
  // changed markup it shouldn't have — that's still a real regression to
  // catch.
  const {stdout: baseline} = await execFileAsync('git', ['show', 'ddd8569:concepts/app-shell.html']);
  const expected = applyTask3ShellUtilities(baseline)
    .replace(
      '    <link rel="stylesheet" href="app/styles/legacy-app.css">',
      [
        '    <link rel="stylesheet" href="app/styles/tailwind.css">',
        ...JSON.parse(await readFile('tests/support/style-inventory.json', 'utf8')).files
          .filter(file => !['app/shell/shell.css', 'app/pages/home/home.css'].includes(file.path))
          .map(file => `    <link rel="stylesheet" href="${file.path}">`),
      ].join('\n')
    )
    .replace(
      '    <script src="app/legacy-app.js"></script>\n\n' +
        '    <link id="shell-kit-css" rel="stylesheet" href="app/prototype/controls.css">\n\n' +
        '    <script id="shell-kit-js" src="app/prototype/legacy-controls.js"></script>',
      '    <link id="shell-kit-css" rel="stylesheet" href="app/prototype/controls.css">\n\n' +
        '    <script type="module" src="app/main.js"></script>'
    );
  const assembled = await assemble(path.resolve('concepts/app-shell.html'));
  assert.equal(assembled, expected.replace(
    `                    class="lbtn out"
                    onclick="addItemRow('items-body', 'items-total-qty')">`,
    `                    id="add-item-link"
                    class="lbtn out">`
  ));
});

test('assemble: Task 3 shell utility mapping rejects an unrelated duplicate class attribute', () => {
  assert.throws(
    () => applyTask3ShellUtilities('<header class="gtop"></header><header class="gtop"></header>'),
    /duplicate intended markup: class="gtop"/
  );
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
    const css = await fetchHead(`http://127.0.0.1:${port}/concepts/app/styles/tokens.css`);
    assert.match(css.headers['content-type'], /text\/css/);
    const js = await fetchHead(`http://127.0.0.1:${port}/concepts/app/main.js`);
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
      '/concepts/app/styles/tokens.css',
      '/concepts/app/styles/base.css',
      '/concepts/app/styles/app.css',
      '/concepts/app/styles/overrides.css',
      '/concepts/app/shell/shell.css',
      '/concepts/app/pages/invoices/invoices.css',
      '/concepts/app/pages/customers/customers.css',
      '/concepts/app/pages/geography/geography.css',
      '/concepts/app/pages/email/email.css',
      '/concepts/app/components/data-list/list.css',
      '/concepts/app/components/dialog/dialog.css',
      '/concepts/app/components/toast/toast.css',
      '/concepts/app/components/loading/loading.css',
      '/concepts/app/components/notifications/notifications.css',
      '/concepts/app/components/record-pager/pager.css',
      '/concepts/app/pages/home/home.css',
      '/concepts/app/components/assistant/assistant.css',
      '/concepts/app/main.js',
      '/concepts/app/prototype/controls.css',
      '/concepts/app/prototype/controls.js',
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
