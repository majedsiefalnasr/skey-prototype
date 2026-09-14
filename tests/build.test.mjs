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

async function assembleGitSnapshot(commit, file = 'concepts/app-shell.html', stack = []) {
  assert.ok(!stack.includes(file), `snapshot include cycle: ${[...stack, file].join(' -> ')}`);
  const {stdout: source} = await execFileAsync('git', ['show', `${commit}:${file}`]);
  const pattern = /<!-- include: ([^\r\n]+?) -->/g;
  let result = '', cursor = 0;
  for (const match of source.matchAll(pattern)) {
    result += source.slice(cursor, match.index);
    result += await assembleGitSnapshot(
      commit,
      path.posix.normalize(path.posix.join(path.posix.dirname(file), match[1])),
      [...stack, file]
    );
    cursor = match.index + match[0].length;
  }
  return result + source.slice(cursor);
}

function classTokens(tag) {
  const value = tag.match(/\sclass="([^"]*)"/)?.[1] || '';
  return value.split(/\s+/).filter(Boolean);
}

function withoutClassAttribute(tag) {
  return tag.replace(/\sclass="[^"]*"/, '').replace(/\s+/g, ' ').replace(/\s+>/g, '>');
}

function assertUtilityMigrationMarkup(actual, expected) {
  const tokenize = html => {
    const tokens = [];
    let cursor = 0;
    while (cursor < html.length) {
      if (html[cursor] !== '<') {
        const nextTag = html.indexOf('<', cursor);
        const end = nextTag === -1 ? html.length : nextTag;
        tokens.push(html.slice(cursor, end));
        cursor = end;
        continue;
      }
      let quote = '';
      let end = cursor + 1;
      for (; end < html.length; end += 1) {
        const char = html[end];
        if (quote) {
          if (char === quote) quote = '';
        } else if (char === '"' || char === "'") quote = char;
        else if (char === '>') break;
      }
      tokens.push(html.slice(cursor, end + 1));
      cursor = end + 1;
    }
    return tokens;
  };
  const actualTokens = tokenize(actual);
  const expectedTokens = tokenize(expected);
  assert.equal(actualTokens.length, expectedTokens.length, 'Task 4 must preserve the assembled DOM token count');
  expectedTokens.forEach((expectedToken, index) => {
    const actualToken = actualTokens[index];
    if (!expectedToken.startsWith('<')) {
      assert.equal(actualToken, expectedToken, `Task 4 changed text/whitespace token ${index}`);
      return;
    }
    assert.equal(
      withoutClassAttribute(actualToken),
      withoutClassAttribute(expectedToken),
      `Task 4 changed a non-class attribute or element at token ${index}`
    );
    const actualClasses = new Set(classTokens(actualToken));
    for (const apiClass of classTokens(expectedToken)) {
      assert.ok(actualClasses.has(apiClass), `Task 4 removed pre-existing class "${apiClass}" at token ${index}`);
    }
  });
}

function applyTask3ShellUtilities(html) {
  return [
    ['class="gtop"', 'class="gtop flex items-center gap-3 border-b border-line py-[9px] pe-4 ps-2"'],
    ['class="left"', 'class="left flex w-[calc(var(--sidebar-w)-16px)] shrink-0 items-center gap-2.5"'],
    ['class="gsearch"', 'class="gsearch relative flex flex-1 justify-center"'],
    ['class="swrap"', 'class="swrap relative w-[min(620px,100%)]"'],
    ['class="sbox s-open"', 'class="sbox s-open flex w-full items-center gap-2 rounded-lg border border-line bg-surface px-3 py-[7px] text-start text-muted"'],
    [
      '<span class="kbd-chip">⌘K</span>',
      '<span class="ms-auto rounded border border-line bg-[var(--line-2)] px-1.5 py-px font-mono text-[11px] text-muted">⌘K</span>',
    ],
    [
      'class="spanel"',
      'class="spanel fixed inset-x-0 top-3.5 z-[160] mx-auto hidden max-h-[min(600px,68vh)] w-[min(620px,92vw)] flex-col overflow-hidden rounded-[9px] border-[1.5px] border-line bg-surface shadow-[var(--shadow-2)]"',
    ],
    ['class="sinp"', 'class="sinp flex items-center gap-2 border-b border-line px-3 py-2"'],
    [
      '                <input\n                  type="text"\n                  placeholder="Search screens, customers and invoices, or type an action"\n                  autocomplete="off" />',
      '                <input\n                  class="flex-1 border-none text-sm font-[inherit] outline-none"\n                  type="text"\n                  placeholder="Search screens, customers and invoices, or type an action"\n                  autocomplete="off" />',
    ],
    [
      'autocomplete="off" />\n                <span class="kbd-chip" style="margin: 0">Esc</span>',
      'autocomplete="off" />\n                <span class="rounded border border-line bg-[var(--line-2)] px-1.5 py-px font-mono text-[11px] text-muted">Esc</span>',
    ],
    [
      'class="sctx"',
      'class="sctx flex flex-wrap items-center gap-2 border-b border-line bg-[var(--line-2)] px-3.5 py-2 text-xs text-muted"',
    ],
    [
      'You are on <b>Sales Invoice</b> · 001000352026126',
      'You are on <b class="text-ink">Sales Invoice</b> · 001000352026126',
    ],
    ['class="sscope" role="group" aria-label="Scope"', 'class="sscope ms-auto inline-flex gap-1" role="group" aria-label="Scope"'],
    [
      '<button data-scope="all" aria-pressed="true">Everything</button>',
      '<button class="rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs text-muted aria-pressed:border-[var(--accent-line)] aria-pressed:bg-[var(--accent-soft)] aria-pressed:font-semibold aria-pressed:text-accent" data-scope="all" aria-pressed="true">Everything</button>',
    ],
    [
      '<button data-scope="screens" aria-pressed="false">Screens</button>',
      '<button class="rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs text-muted aria-pressed:border-[var(--accent-line)] aria-pressed:bg-[var(--accent-soft)] aria-pressed:font-semibold aria-pressed:text-accent" data-scope="screens" aria-pressed="false">Screens</button>',
    ],
    [
      '<button data-scope="records" aria-pressed="false">Records</button>',
      '<button class="rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs text-muted aria-pressed:border-[var(--accent-line)] aria-pressed:bg-[var(--accent-soft)] aria-pressed:font-semibold aria-pressed:text-accent" data-scope="records" aria-pressed="false">Records</button>',
    ],
    [
      '<button data-scope="actions" aria-pressed="false">Actions</button>',
      '<button class="rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs text-muted aria-pressed:border-[var(--accent-line)] aria-pressed:bg-[var(--accent-soft)] aria-pressed:font-semibold aria-pressed:text-accent" data-scope="actions" aria-pressed="false">Actions</button>',
    ],
    ['class="slist" role="listbox"', 'class="slist flex-1 overflow-auto p-1.5" role="listbox"'],
    [
      'class="sfoot"',
      'class="sfoot flex items-center gap-[15px] border-t border-line bg-[var(--line-2)] px-3.5 py-2 text-xs text-muted"',
    ],
    [
      '                <span><span class="k">↑↓</span>Navigate</span\n                ><span><span class="k">↵</span>Open</span>\n                <span class="sfoot-scope"><span class="k">Tab</span>Change scope</span>',
      '                <span><span class="k rounded border border-line bg-surface px-1.5 py-px font-mono text-[11px] me-[5px]">↑↓</span>Navigate</span\n                ><span><span class="k rounded border border-line bg-surface px-1.5 py-px font-mono text-[11px] me-[5px]">↵</span>Open</span>\n                <span class="sfoot-scope"><span class="k rounded border border-line bg-surface px-1.5 py-px font-mono text-[11px] me-[5px]">Tab</span>Change scope</span>',
    ],
    ['class="sfoot-ctx" style="margin-inline-start: auto"', 'class="sfoot-ctx ms-auto"'],
    ['class="right"', 'class="right flex shrink-0 items-center gap-[7px]"'],
    ['class="app"', 'class="app relative flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-start font-semibold hover:bg-[var(--hover-overlay)]"'],
    ['class="app-name"', 'class="app-name min-w-0 truncate"'],
    ['class="chip"', 'class="chip inline-flex items-center gap-1.5 rounded-full border border-line px-[11px] py-[5px]"'],
    ['class="avatar-btn"', 'class="avatar-btn rounded-full"'],
    [
      'class="user-card">\n                <span class="avatar">MS</span>',
      'class="user-card mb-0.5 flex items-center gap-2.5 px-2.5 pb-3 pt-2.5">\n                <span class="avatar size-9 text-[13px]">MS</span>',
    ],
    [
      '<div><b>Majed Sief Alnasr</b><span>admin@lastchance</span></div>',
      '<div><b class="block text-[13.5px] text-ink">Majed Sief Alnasr</b><span class="block text-xs text-muted">admin@lastchance</span></div>',
    ],
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

test('assemble: Task 4 preserves structure, attributes, text, and every pre-existing API class', async () => {
  // 4ae52c8 is the final Task 3 repair immediately before Task 4. The only
  // structural Task 4 change is retiring these five component stylesheet
  // links. Class attributes may gain literal utilities, but every prior class
  // remains an API/selector contract and every other assembled byte is fixed.
  const retiredLinks = [
    'app/components/record-pager/pager.css',
    'app/components/assistant/assistant.css',
    'app/components/toast/toast.css',
    'app/components/data-list/list-2.css',
    'app/components/loading/loading.css',
  ];
  const baseline = await assembleGitSnapshot('4ae52c8');
  const expected = retiredLinks.reduce(
    (html, href) => replaceOnce(html, `    <link rel="stylesheet" href="${href}">\n`, ''),
    baseline
  );
  const assembled = await assemble(path.resolve('concepts/app-shell.html'));
  assertUtilityMigrationMarkup(assembled, expected);
});

test('assemble: Task 4 class contract rejects a removed selector/API class', () => {
  assert.throws(
    () => assertUtilityMigrationMarkup('<button class="utility">Save</button>', '<button class="action">Save</button>'),
    /removed pre-existing class "action"/
  );
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

test('served dist/: current local asset URLs referenced from app-shell.html resolve (200)', async () => {
  await build();
  const server = await serve({root: 'dist', port: 0});
  try {
    const port = server.address().port;
    const shellPath = '/concepts/app-shell.html';
    const shell = await readFile(`dist${shellPath}`, 'utf8');
    const paths = [shellPath, ...localShellAssetPaths(shell, shellPath)];
    assert.ok(paths.length > 1, 'expected app-shell.html to reference local stylesheet or script assets');
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

function localShellAssetPaths(html, shellPath) {
  const shellUrl = new URL(shellPath, 'http://skey.test');
  const paths = new Set();
  for (const [tag] of html.matchAll(/<(?:link|script)\b[^>]*>/gi)) {
    const isStylesheet = /^<link\b/i.test(tag) && /\brel="stylesheet"/i.test(tag);
    const isScript = /^<script\b/i.test(tag);
    if (!isStylesheet && !isScript) continue;
    const asset = tag.match(/\b(?:href|src)="([^"]+)"/i)?.[1];
    if (!asset) continue;
    const url = new URL(asset, shellUrl);
    if (url.origin === shellUrl.origin) paths.add(url.pathname);
  }
  return [...paths];
}
