# App shell development

The authored entry is `concepts/app-shell.html`. Node assembles its HTML includes into
`dist/concepts/app-shell.html`; native browser modules start at `concepts/app/main.js`.
Use the local server rather than opening the authored HTML directly.

## Run and build

Use Node with native modules, the built-in test runner, and `fetch` (verification used
Node 23.11.0). Install the lockfile's Playwright 1.63.0 dependency and its Chromium:

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
