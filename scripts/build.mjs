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
import path from 'node:path';
import {compileTailwind} from './tailwind.mjs';

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
 * Build the production-shaped output: copy the public-path allowlist into
 * a fresh staging directory, assemble `concepts/app-shell.html` (expanding
 * its includes) into the staged copy, then atomically replace `dist/`.
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

    // Atomically swap staging in for the previous dist/, rather than
    // deleting dist/ first and rebuilding into it (which would leave a
    // half-built or empty dist/ visible to a concurrent request/build).
    const finalDist = path.join(repoRoot, 'dist');
    const previous = path.join(repoRoot, `.dist-old-${process.pid}-${Date.now()}`);
    let hadPrevious = true;
    try {
      await rename(finalDist, previous);
    } catch {
      hadPrevious = false;
    }
    try {
      await rename(staging, finalDist);
    } catch (error) {
      // Roll back so a failed swap never leaves dist/ missing.
      if (hadPrevious) await rename(previous, finalDist);
      throw error;
    }
    if (hadPrevious) await rm(previous, {recursive: true, force: true});
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
