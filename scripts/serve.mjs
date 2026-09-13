#!/usr/bin/env node
// Minimal static file server for the app shell prototype and its frozen
// baseline. Used directly in Tasks 1-2 (before `npm run dev` exists) and
// kept available afterward as the production-shaped static server.
//
// Usage: node scripts/serve.mjs --root <dir> --port <port>
//
// Security properties (required by the plan's baseline task):
// - binds to 127.0.0.1 only (never 0.0.0.0)
// - decodes request paths safely and rejects `..` traversal
// - resolves symlinks and rejects any target that escapes the served root
// - never serves dotfiles/dot-directories (blocks `.git`, `.env`, etc.)
// - serves .js/.mjs as JavaScript and .css as CSS, with a small MIME map
// - returns explicit 404 for missing files and 500 for unexpected errors

import http from 'node:http';
import path from 'node:path';
import {realpath, stat, readFile} from 'node:fs/promises';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};
const DEFAULT_MIME = 'application/octet-stream';

/**
 * Parse `--root` and `--port` from argv (or an explicit array for tests).
 * @param {string[]} argv
 * @returns {{root: string, port: number}}
 */
export function parseArgs(argv) {
  let root = '.';
  let port = 4173;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--root') root = argv[++i] ?? root;
    else if (arg.startsWith('--root=')) root = arg.slice('--root='.length);
    else if (arg === '--port') port = Number(argv[++i]);
    else if (arg.startsWith('--port=')) port = Number(arg.slice('--port='.length));
  }
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid --port: ${port}`);
  }
  return {root, port};
}

/**
 * True when `name` is a dotfile/dot-directory segment (e.g. `.git`, `.env`),
 * except the current/parent directory markers which are traversal, not
 * dotfiles, and are rejected separately.
 * @param {string} name
 */
function isDotSegment(name) {
  return name.startsWith('.') && name !== '.' && name !== '..';
}

/**
 * Resolve a request URL path to a real, allowed file inside `servedRoot`.
 * Returns null when the path is missing, a directory without index.html,
 * outside the root (traversal or symlink escape), or a dotfile.
 * @param {string} servedRoot Real (symlink-resolved) absolute root path.
 * @param {string} urlPath Raw request path, e.g. "/concepts/app-shell.html".
 */
async function resolveSafePath(servedRoot, urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  } catch {
    return {error: 400};
  }

  // Reject encoded/raw traversal segments before touching the filesystem.
  const segments = decoded.split('/').filter(Boolean);
  if (segments.some(segment => segment === '..')) return {error: 403};
  if (segments.some(isDotSegment)) return {error: 403};

  const relative = segments.join(path.sep);
  const requested = path.normalize(path.join(servedRoot, relative || '.'));

  // Belt-and-suspenders: normalized path must still be inside the root.
  if (requested !== servedRoot && !requested.startsWith(servedRoot + path.sep)) {
    return {error: 403};
  }

  let candidate = requested;
  try {
    let info = await stat(candidate);
    if (info.isDirectory()) {
      candidate = path.join(candidate, 'index.html');
      info = await stat(candidate);
    }
    if (!info.isFile()) return {error: 404};
  } catch {
    return {error: 404};
  }

  // Resolve symlinks and confirm the *real* target is still inside the
  // *real* root, rejecting any symlink that escapes the served directory.
  let realCandidate;
  try {
    realCandidate = await realpath(candidate);
  } catch {
    return {error: 404};
  }
  if (realCandidate !== servedRoot && !realCandidate.startsWith(servedRoot + path.sep)) {
    return {error: 403};
  }

  return {filePath: realCandidate};
}

/**
 * Start the static server.
 * @param {{root: string, port: number}} options
 * @returns {Promise<http.Server>}
 */
export async function serve({root, port}) {
  const servedRoot = await realpath(path.resolve(root));
  await stat(servedRoot).then(info => {
    if (!info.isDirectory()) throw new Error(`--root is not a directory: ${root}`);
  });

  const server = http.createServer((req, res) => {
    handleRequest(servedRoot, req, res).catch(error => {
      // Explicit 500 rather than an unhandled rejection / hung socket.
      // eslint-disable-next-line no-console
      console.error('serve.mjs: unexpected error', error);
      if (!res.headersSent) {
        res.writeHead(500, {'content-type': 'text/plain; charset=utf-8'});
      }
      res.end('500 Internal Server Error');
    });
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve();
    });
  });

  return server;
}

async function handleRequest(servedRoot, req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, {'content-type': 'text/plain; charset=utf-8', allow: 'GET, HEAD'});
    res.end('405 Method Not Allowed');
    return;
  }

  const result = await resolveSafePath(servedRoot, req.url ?? '/');
  if (result.error) {
    const status = result.error;
    res.writeHead(status, {'content-type': 'text/plain; charset=utf-8'});
    res.end(status === 404 ? '404 Not Found' : `${status} Forbidden`);
    return;
  }

  const ext = path.extname(result.filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] ?? DEFAULT_MIME;

  try {
    const body = await readFile(result.filePath);
    res.writeHead(200, {'content-type': contentType, 'content-length': body.length});
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch (error) {
    if (error && error.code === 'EACCES') {
      res.writeHead(403, {'content-type': 'text/plain; charset=utf-8'});
      res.end('403 Forbidden');
      return;
    }
    throw error;
  }
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const options = parseArgs(process.argv.slice(2));
  const server = await serve(options);
  const address = server.address();
  const boundPort = typeof address === 'object' && address ? address.port : options.port;
  // eslint-disable-next-line no-console
  console.log(`Serving ${path.resolve(options.root)} at http://127.0.0.1:${boundPort}/`);
}
