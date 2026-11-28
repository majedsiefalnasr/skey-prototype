#!/usr/bin/env node
// Assembles the app-shell.html source (which references reusable HTML
// fragments via `<!-- include: relative/path.html -->` directives) into
// its production-shaped, fragment-free form, and copies the explicit
// public-path allowlist into a fresh `dist/` staging directory.
//
// Include mechanism is pure string substitution — it never evaluates any
// script or HTML it reads. Include paths are resolved relative to the
// including file and must stay inside `concepts/`.

import {readFile, realpath, mkdir, writeFile, readdir, lstat, rm, rename} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {compileTailwind} from './tailwind.mjs';
import {ROUTE_PATHS} from '../concepts/app/core/routes.js';

const sourceRoot = await realpath('concepts');

/**
 * Expand `<!-- include: relative/path.html -->` directives in `file`,
 * recursively, resolving each include relative to the file that contains
 * it. Throws if an include resolves outside `concepts/` or forms a cycle.
 * Pure string substitution: never requires, imports, or executes anything.
 * @param {string} file
 * @param {string[]} stack
 * @returns {Promise<string>}
 */
export async function assemble(file, stack = []) {
  const absolute = await realpath(file);
  if (absolute !== sourceRoot && !absolute.startsWith(sourceRoot + path.sep))
    throw new Error(`Include outside concepts: ${file}`);
  if (stack.includes(absolute)) throw new Error(`Include cycle: ${absolute}`);
  const source = await readFile(absolute, 'utf8');
  const pattern = /<!-- include: ([^\r\n]+?) -->/g;
  let result = '', cursor = 0;
  for (const match of source.matchAll(pattern)) {
    result += source.slice(cursor, match.index);
    result += await assemble(path.resolve(path.dirname(absolute), match[1]),
      [...stack, absolute]);
    cursor = match.index + match[0].length;
  }
  return result + source.slice(cursor);
}

// Explicit public-path allowlist: only these repo-root entries are ever
// copied into dist/. Anything else (node_modules/, scripts/, tests/,
// package.json, dotfiles, dev/build/test artifacts, ...) is excluded by
// omission — this list is copied FROM, nothing else is walked.
const PUBLIC_PATHS = ['index.html', 'logo-skey.png', 'concepts', 'deck', 'audit', 'docs', 'presentation'];

const DEV_EXCLUDES = new Set(['node_modules', 'dist', 'scripts', 'tests', '.git', '.github',
  '.superpowers', '.baseline', 'test-results', 'playwright-report', 'blob-report',
  'package.json', 'package-lock.json', 'playwright.config.mjs']);

/**
 * True when `name` is a dotfile/dot-directory (hidden) segment.
 * @param {string} name
 */
function isHidden(name) {
  return name.startsWith('.');
}

/**
 * Recursively copy `src` into `dest`, rejecting any symlink whose real
 * target escapes `realSrcRoot`, and skipping hidden entries and anything
 * in DEV_EXCLUDES (defense in depth — the top-level allowlist already
 * keeps these out of the initial copy set, but nested hidden/dev dirs
 * inside an allowed tree, e.g. a stray `.git`, must not be copied either).
 * @param {string} src
 * @param {string} dest
 * @param {string} realSrcRoot
 */
async function copyTree(src, dest, realSrcRoot) {
  const info = await lstat(src);
  if (info.isSymbolicLink()) {
    const real = await realpath(src);
    const rootReal = await realpath(realSrcRoot);
    if (real !== rootReal && !real.startsWith(rootReal + path.sep)) {
      throw new Error(`Symlink escapes allowed root: ${src} -> ${real}`);
    }
    // Re-stat through the resolved, validated target rather than following
    // the link implicitly, so a symlink can't smuggle in anything we
    // haven't checked.
    const targetInfo = await lstat(real);
    if (targetInfo.isDirectory()) return copyTree(real, dest, realSrcRoot);
    await mkdir(path.dirname(dest), {recursive: true});
    await writeFile(dest, await readFile(real));
    return;
  }
  if (info.isDirectory()) {
    await mkdir(dest, {recursive: true});
    const entries = await readdir(src);
    for (const entry of entries) {
      if (isHidden(entry) || DEV_EXCLUDES.has(entry)) continue;
      await copyTree(path.join(src, entry), path.join(dest, entry), realSrcRoot);
    }
    return;
  }
  if (info.isFile()) {
    await mkdir(path.dirname(dest), {recursive: true});
    await writeFile(dest, await readFile(src));
  }
}

/**
 * Remove the dist/ directory that the swap replaced. The new dist/ is already
 * in place, so a directory that survives the retries is reported instead of
 * failing the build.
 * @param {string} directory
 * @param {{remove?: typeof rm, warn?: (message: string) => void}} [options]
 */
export async function removePreviousDist(directory, {remove = rm, warn = console.warn} = {}) {
  try {
    await remove(directory, {recursive: true, force: true, maxRetries: 3, retryDelay: 100});
  } catch (error) {
    warn(`Could not remove ${directory}: ${error.message}`);
  }
}

const SWAP_ATTEMPTS = 10;

/**
 * Replace `target` with the `staging` directory by renaming, rather than
 * deleting it first and rebuilding into it (which would leave a half-built or
 * empty dist/ visible to a concurrent request/build). A concurrent build can
 * publish its own `target` between the two renames, so that one is moved aside
 * too and the publish is retried.
 * @param {string} staging
 * @param {string} target
 * @param {{move?: typeof rename}} [options]
 */
export async function swapDist(staging, target, {move = rename} = {}) {
  const replaced = [];
  try {
    for (let attempt = 1; ; attempt += 1) {
      const previous = path.join(path.dirname(target), `.dist-old-${process.pid}-${randomUUID()}`);
      try {
        await move(target, previous);
        replaced.push(previous);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      try {
        await move(staging, target);
        return;
      } catch (error) {
        const occupied = error.code === 'ENOTEMPTY' || error.code === 'EEXIST';
        if (occupied && attempt < SWAP_ATTEMPTS) continue;
        // Roll back so a failed swap never leaves dist/ missing.
        if (!occupied && replaced.length) await move(replaced.pop(), target);
        throw error;
      }
    }
  } finally {
    for (const directory of replaced) await removePreviousDist(directory);
  }
}

/**
 * Build the production-shaped output: copy the public-path allowlist into
 * a fresh staging directory, assemble `concepts/app-shell.html` (expanding
 * its includes) into the staged copy, then swap it in as `dist/`.
 * @returns {Promise<void>}
 */
export async function build() {
  const repoRoot = process.cwd();
  const staging = path.resolve(repoRoot, `.dist-staging-${process.pid}-${Date.now()}`);
  await rm(staging, {recursive: true, force: true});
  await mkdir(staging, {recursive: true});

  try {
    for (const entry of PUBLIC_PATHS) {
      const src = path.join(repoRoot, entry);
      let exists = true;
      try {
        await lstat(src);
      } catch {
        exists = false;
      }
      if (!exists) continue; // e.g. presentation/ — allowed but absent
      await copyTree(src, path.join(staging, entry), src);
    }

    await compileTailwind({
      root: repoRoot,
      output: path.join(staging, 'concepts', 'app', 'styles', 'tailwind.css'),
    });

    // Assemble the app-shell entry document over the staged copy so the
    // published output has no residual include directives.
    const assembled = await assemble(path.join(repoRoot, 'concepts', 'app-shell.html'));
    await writeFile(path.join(staging, 'concepts', 'app-shell.html'), assembled, 'utf8');

    // Routing v1 (build-time route folders): the same assembled document
    // becomes the configured default entry at the site root and the entry
    // for each real prototype screen under its own path. A <base> pointing
    // at /concepts/ keeps the document's relative asset URLs resolving to
    // the app's assets regardless of the document's own path; the legacy
    // /concepts/app-shell.html copy stays untagged so its resolution (and
    // the parity snapshot's literal asset URLs) are unchanged. This
    // overwrites the copied project landing page at dist/index.html — the
    // landing page itself remains in the repo.
    const appDoc = assembled.replace('<head>', '<head><base href="/concepts/">');
    await writeFile(path.join(staging, 'index.html'), appDoc, 'utf8');
    for (const route of ROUTE_PATHS) {
      const routeDir = path.join(staging, route.replace(/^\//, ''));
      await mkdir(routeDir, {recursive: true});
      await writeFile(path.join(routeDir, 'index.html'), appDoc, 'utf8');
    }

    await swapDist(staging, path.join(repoRoot, 'dist'));
  } finally {
    await rm(staging, {recursive: true, force: true});
  }
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  await build();
  // eslint-disable-next-line no-console
  console.log('Built dist/');
}
