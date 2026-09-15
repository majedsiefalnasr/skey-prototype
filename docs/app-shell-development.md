# App shell development

The authored entry is `concepts/app-shell.html`. Node assembles its HTML includes into
`dist/concepts/app-shell.html`; native browser modules start at `concepts/app/main.js`.
Use the local server rather than opening the authored HTML directly.

## Run and build

Use Node with native modules, the built-in test runner, and `fetch` (verification used
Node 23.11.0). Install the exact locked dependency versions from `package-lock.json`
(this also installs `tailwindcss`/`@tailwindcss/cli` 4.3.3 and `@playwright/test`
1.63.0 — never install these ad hoc, or the compiled CSS byte size and screenshot
baselines can drift), then install Playwright's own browser binary:

```sh
npm ci
npx playwright install chromium
npm run dev
```

Open `http://127.0.0.1:4173/concepts/app-shell.html`. Development rebuilds before each
app-document response; refresh the browser after edits. `dist/` is generated and ignored.
For a static build:

```sh
npm run build
node scripts/serve.mjs --root dist --port 4183
```

Open the same path on port 4183. A static host needs the entire `dist/` tree to preserve
relative module, stylesheet, and image URLs. No remote hosting settings are changed by
these commands.

## Verification

Prepare the fixed historical baseline and cache the real chart library:

```sh
node scripts/capture-baseline.mjs
node scripts/cache-chart.mjs
npm run build
npm run test:unit
```

With the static server above running in another terminal:

```sh
PARITY_URL=http://127.0.0.1:4183 npm run test:browser -- --workers=2
```

`npm run test:browser` uses port 4173 by default. `npm run test:parity` runs the screenshot
subset. Browser discovery includes only `.spec.mjs`; `npm run test:unit` runs `.test.mjs`.
Finish unit tests before browser tests because the build tests regenerate `dist/`.

The seven browser projects cover desktop, mobile touch, dark, light/dark high contrast,
RTL mobile, and reduced motion. Behavior scenarios cover normal motion separately,
repeated navigation, dialogs, settings restoration, filters, invoice line entry, and
chart cleanup. Frozen screenshots use zero pixel tolerance. Do not update them to hide
a refactor regression.

The baseline is commit `07f6b8a664e684022a3faf4c9e95392a13134529`, HTML blob
`2776f120870c4fdbb6eb80e2777bc4c085ce39f3`. The mechanical extraction checkpoint is
`ddd8569`. `tests/support/baseline.json` records capture provenance;
`tests/support/migration-inventory.json` records JavaScript ownership.

`tests/tailwind.test.mjs`'s `Task 7 final Tailwind budget` test is the single
authoritative ceiling on the compiled `dist/concepts/app/styles/tailwind.css` size:
the migration's final measured size plus 10% headroom. See
`docs/tailwind-migration-report.md` for the exact byte counts, package versions,
retained compatibility-selector count, and the Tailwind utility migration's screenshot
audit findings (including two confirmed pre-existing regressions surfaced by that
audit that are out of scope for a documentation-only task to fix).

ApexCharts remains the original render-blocking CDN script with its original integrity
attribute. Static screenshot helpers abort the request because their initial views do
not draw charts. `tests/chart-parity.spec.mjs` instead uses the actual integrity-checked
ApexCharts bytes from `.baseline/`, compares with the historical page, and checks cleanup.
If the cache is absent and the CDN cannot be reached, that check fails; a fake renderer
is not evidence of chart parity. The unit-like chart lifecycle spies in other browser
scenarios test calls and disposal separately.

## Ownership and cascade

`main.js` constructs the shared facilities and page factories, supplies explicit
callbacks, and registers cached page instances with `core/navigation.js`. Shell
interactions belong in `shell/`; page workflows belong in `pages/`; shared list behavior
belongs in `components/data-list/`. Sample records remain in `prototype/fixtures/`.
Prototype controls call initialized page interfaces and restore the existing storage keys.

Each owner keeps complete CSS rule blocks. Numbered stylesheet segments keep later
blocks at their original position in the cascade; merge or reorder them only after
checking precedence. The entry links all application styles before prototype styles.
`styles/overrides.css` and `overrides-2.css` contain the original cross-cutting density,
input-style, and touch patches. `tests/support/style-inventory.json` records the ordered
rules and checkpoint offsets. `tests/styles.test.mjs` proves the linked files reconstruct
the mechanical stylesheet byte-for-byte, including media conditions and declarations.

`styles/tailwind.css` is compiled during `npm run build` into the staged `dist/` tree;
the browser always loads that generated stylesheet. `scripts/tailwind.mjs` invokes the
Tailwind v4 CLI (`@tailwindcss/cli`) ahead of time as a build step — Tailwind is never
loaded, compiled, or run in the browser at request time, and the project adds no Vite,
PostCSS, or framework runtime to do so. `styles/tailwind.css` imports Tailwind's `theme`
and `utilities` layers only (no Preflight reset layer), then imports the preserved
reset, body, and reduced-motion rules from `styles/tailwind/base.css`. Semantic Tailwind
values map to the existing token variables with `@theme inline`, so utility colors
continue to follow theme changes.

### `@source` registration

Register every directory Tailwind should scan for class names explicitly with `@source`
in `styles/tailwind.css` (the authored shell HTML, every `**/*.html`, and every
`**/*.js` under `concepts/app/`). Tailwind v4 only generates a utility's CSS if that
utility's exact literal text appears somewhere inside a registered `@source` path — it
does not evaluate JavaScript or resolve runtime string concatenation. A wildcard
`@source inline("*` (matching everything) is never allowed; it would defeat the point of
scanning literal sources and silently accept accidental or unreviewed classes.

### Dynamic-utility safelisting with `@source inline()`

A renderer that builds its class list from a `const SOME_THING_CLASS = 'a b c'` literal
string constant (rather than writing the classes directly in a template) is invisible to
Tailwind's normal source scan, because the scanner only sees the variable name
(`SOME_THING_CLASS`), not the string's contents, at the call site. Every such constant
needs its own named `@source inline("...")` declaration in `styles/tailwind.css`,
directly copying the constant's exact literal utility string, with a comment identifying
which renderer file and constant it mirrors, for example:

```css
/* Dynamic utilities: ACTIVITY_SECONDARY_BUTTON_CLASS (concepts/app/pages/invoices/activity.js). */
@source inline("inline-flex items-center gap-1.5 rounded-md border border-line ...");
```

`tests/tailwind.test.mjs` enforces that every such constant across the known dynamic
renderer files has exactly one matching `@source inline()` declaration, and that the
declared string is character-for-character identical to the renderer's own constant —
a drift between the two (one updated without the other) fails the test rather than
silently generating stale or missing utility CSS. Keep this safelist narrow and named
per constant; do not add a broad or wildcard `@source inline()` to work around a
generation gap.

### The literal-utility rule

A class applied to an element must be literal, complete text somewhere in a registered
`@source` path (either directly in an HTML/JS template, or via a named `@source
inline()` declaration as above) — never assembled at runtime from a variable, template
fragment, or string concatenation such as `` `text-${color}-500` ``. Tailwind cannot see
or generate a utility whose name only exists after a runtime join/interpolation, so a
constructed class name silently renders with no matching CSS. If a value must vary at
runtime (a color, a size, a computed offset), either enumerate every literal variant
Tailwind should generate (as full literal strings, e.g. one `@source inline()` entry per
tone rather than a template), or fall back to an inline `style` property / CSS custom
property read by an arbitrary-value utility (e.g. `bg-[var(--accent)]`) instead of a
dynamically named utility class.

### Compatibility-rule criteria: when a selector belongs in `compatibility.md` vs. must become a utility

Ordinary layout, spacing, color, and presentation always belong in literal utilities on
the element itself. Before adding any selector-based CSS rule (anything keyed to a CSS
selector rather than applied as a class on one element), add a row to
`styles/tailwind/compatibility.md` recording its owner, the selector, the reason it
cannot be a literal utility, and the condition under which it could later be removed.
A rule is only allowed if it falls into one of these categories:

- **Pseudo-elements** (`::before` / `::after`) — generated content needs a selector
  relationship that a class on the element itself cannot express.
- **`@keyframes`** — named animation definitions cannot live on an element as literal
  utilities; the element carries only the utilities that reference the animation name
  (duration, timing, delay, reduced-motion override).
- **ApexCharts DOM** — the third-party chart library creates its own DOM after the
  application renders, which this codebase does not control or template.
- **`[aria-*]` / state relationships** — a selector that reads another element's ARIA
  attribute, a sibling's class, or a `:has()`/`:hover`/descendant relationship, where the
  visual state genuinely depends on more than the element's own static classes.
- **Prototype density/style modes** — the demo's own global `body.*` density/input-style
  toggles that apply to many descendants at once via a body-level class.

If a candidate rule does not fit one of these categories, it must become a literal
utility (or set of utilities, toggled directly via JavaScript `classList` changes)
instead of a new compatibility-manifest row. When in doubt, prefer expressing state by
toggling a utility class directly on the affected element from its owning controller,
rather than adding a new selector relationship.

## Add a page

Place templates and dialogs with the page under `concepts/app/pages/<page>/`, and include
them from the authored entry or an existing owning fragment. Includes resolve relative
to their containing file, within `concepts/`; missing files, cycles, and escaping paths
fail the build. Preserve the one shared shell: do not copy topbar/sidebar markup into a
page, and do not add wrappers around invoice record roots to simplify mounting.

Create a page instance with `id`, `roots`, `activate(data)`, `deactivate()`, and `dispose()`.
Register it once and let navigation reuse it. Put dirty-leave behavior in the page and
connect it to the existing leave guard. Add fixture values to a page-owned fixture
module, map the existing navigation action before calling `navigate`, link styles in
explicit cascade order, and add a browser scenario using the visible UI.

The customer registration below is the existing implementation's dependency wiring;
callbacks defer calls until the relevant controller has been initialized.

<!-- customer-registration-example -->
```js
const customerDependencies = {
  templates: {
    listInstance: listRuntime.dataListInstances.customer,
    listRoot: document.getElementById('customer-list-canvas'),
    listFooter: document.getElementById('customer-list-fnav'),
    recordRoot: document.querySelector('.customer-record-view'),
  },
  locale,
  appearance: null,
  dialogs: {trapFocus, releaseFocus},
  toast,
  work: runWork,
  navigate: null,
  createList: createDataList,
  record: {
    t,
    encodeHtml,
    showContentView: (...args) => showContentView(...args),
    applyRecordValueDirections: (...args) => recordFields.applyRecordValueDirections(...args),
    customerRows: CUSTOMER_ROWS,
    customerReference: CUSTOMER_REFERENCE,
    lookupResults: CUSTOMER_LOOKUP_RESULTS,
    unitRows: UNIT_ROWS,
    openCustomerRecord: (...args) => pageListActions.openCustomerRecord(...args),
    openCustomerSearch: (...args) => advancedSearch.openCustomerSearch(...args),
    openPrintSettings,
    closeAllMenus: (...args) => menus.closeAllMenus(...args),
  },
}
const customerViews = createCustomers(customerDependencies)
pageRegistry.set('customers-list', customerViews.listPage)
pageRegistry.set('customer-record', customerViews.recordPage)
```

The one intentional behavior correction is customer mode/layout restoration through
initialized page setters after reload. Other audited prototype defects remain in
[`tests/support/known-defects.md`](../tests/support/known-defects.md); this refactor does
not change their behavior.
