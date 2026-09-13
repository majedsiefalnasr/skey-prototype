#!/usr/bin/env node
// Development server: builds once up front, then serves dist/ at 4173,
// rebuilding (serialized so concurrent requests never race a half-written
// dist/) before every app-document response so a manual browser refresh
// always sees the latest source. No live reload — developers refresh
// themselves, per the plan. On a build failure, serve.mjs's
// `beforeDocument` hook turns it into an explicit error response instead
// of silently serving a stale document.

import {build} from './build.mjs';
import {serve} from './serve.mjs';

const PORT = 4173;

/**
 * Wrap `build` so overlapping calls share one in-flight build instead of
 * starting a second one — the next caller after a build starts waits for
 * that same build to finish rather than kicking off its own.
 * @returns {() => Promise<void>}
 */
function serializedBuilder() {
  let inFlight = null;
  return function rebuild() {
    if (!inFlight) {
      inFlight = build().finally(() => {
        inFlight = null;
      });
    }
    return inFlight;
  };
}

const rebuild = serializedBuilder();

await rebuild(); // initial build before accepting any requests

const server = await serve({root: 'dist', port: PORT, beforeDocument: rebuild});
const address = server.address();
const boundPort = typeof address === 'object' && address ? address.port : PORT;
// eslint-disable-next-line no-console
console.log(`Serving dist/ (rebuilding on each document request) at http://127.0.0.1:${boundPort}/`);
