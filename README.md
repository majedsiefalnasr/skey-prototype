![Skey](logo-skey.png)

# Skey ERP app shell prototype

An interactive prototype of Skey ERP's app shell: the launchpad and its 20-app
navigation, dense keyboard-first invoice and customer records, lists and drawers,
dialogs, the organization center, profile, geography, and email surfaces — in
English and Arabic (RTL), light/dark, high contrast, and reduced motion.

The prototype is authored HTML (`concepts/app-shell.html`) assembled into `dist/`
with native browser ES modules, plain CSS, and Tailwind 4 utilities. No framework,
no bundler — behavior parity against the frozen baseline is enforced by tests.

## Quick start

```sh
npm ci
npx playwright install chromium
npm run dev
```

Open <http://127.0.0.1:4173/>. The dev server rebuilds
`dist/` before each app-document response — refresh the browser after edits.
`dist/` is generated and git-ignored; never open the authored HTML directly.
Routes: `/` (default entry — Launchpad or Dashboard), `/dashboard`,
`/invoices`, `/customers`, `/geography`, `/email`, `/profile`,
`/organization`; the legacy `<http://127.0.0.1:4173/concepts/app-shell.html>`
document still boots for parity testing.

## Static build

```sh
npm run build
node scripts/serve.mjs --root dist --port 4183
```

Serve the whole `dist/` tree (relative module, stylesheet, and image URLs depend
on it) at <http://127.0.0.1:4183/> — `/concepts/app-shell.html` remains the
legacy entry document.

## Tests

```sh
npm run test:unit      # node:test — *.test.mjs (architecture, Tailwind budget, data, contracts)
npm run test:browser   # Playwright — *.spec.mjs, 7 projects
npm run test:parity    # screenshot subset only
```

Browser projects: `desktop`, `mobile-touch`, `desktop-dark`,
`desktop-high-contrast-light`, `desktop-high-contrast-dark`, `mobile-rtl`, and
`desktop-reduced-motion` (dark/contrast/RTL are driven through the prototype's
own `#theme`, `#high-contrast`, and `#rtl` controls, never by setting attributes).

Run against the static server with `PARITY_URL=http://127.0.0.1:4183`, otherwise
it targets the dev server on 4173. Finish `test:unit` first — the build tests
regenerate `dist/`.

Screenshot baselines use **zero pixel tolerance**. Regenerate them only for a
deliberate visual change (`npx playwright test … --update-snapshots`), never to
hide a refactor regression. Pre-existing failures are ledgered in
[`tests/support/known-defects.md`](tests/support/known-defects.md); parity is
measured against the frozen baseline described in
[`tests/support/baseline.json`](tests/support/baseline.json) and captured by
`node scripts/capture-baseline.mjs`.

## Layout

| Path | What it is |
| --- | --- |
| `concepts/app-shell.html` | Authored entry — assembled into `dist/` by `scripts/build.mjs` |
| `concepts/app/main.js` | Module entry: pages, shell, components wired together |
| `concepts/app/shell/` | Topbar, sidebar rail + panel, launchpad, search, dialogs |
| `concepts/app/pages/` | Invoice, customers, geography, organization, profile, email, home |
| `concepts/app/components/` | Data list, toast/flags, assistant, drawers, and the rest |
| `concepts/app/prototype/fixtures/` | Navigation tree, search, and sample record data |
| `concepts/app/styles/` | Tailwind inputs and compiled utilities |
| `tests/` | Unit tests, Playwright specs, and screenshot baselines |
| `scripts/` | dev/serve/build/Tailwind, baseline and chart-cache tooling |
| `docs/` | Development guide, design rationale, plans and specs |

## Docs

- [`docs/app-shell-development.md`](docs/app-shell-development.md) — run, build, and verify
- [`PRODUCT.md`](PRODUCT.md) — users, purpose, and brand commitments
- [`audit/app-shell-audit.md`](audit/app-shell-audit.md) — the audit this prototype grew from
- [`docs/tailwind-migration-report.md`](docs/tailwind-migration-report.md) — utility migration and byte budget
- [`tests/support/known-defects.md`](tests/support/known-defects.md) — baseline defect ledger

## Status

Private, unlicensed (`UNLICENSED`) prototype for design and engineering review.
