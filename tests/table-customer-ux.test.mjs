import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import test from 'node:test'
import {
  renderDataListFilterButtons,
  renderDataListToolbar,
  renderDataListViewMenu,
} from '../concepts/app/components/data-list/list.js'
import {renderDataListGroupTrigger} from '../concepts/app/components/data-list/statistics.js'

const deps = {
  t: value => value,
  dataListIcon: icon => `<svg data-icon="${icon}"></svg>`,
  encodeHtml: value => String(value),
}

test('saved filters show five direct choices and an inline overflow submenu', () => {
  const html = renderDataListFilterButtons(
    {filters: []},
    {
      filter: 'all',
      activeCustomFilterId: '',
      customFilters: Array.from({length: 6}, (_, index) => ({
        id: `filter-${index + 1}`,
        name: `Saved filter ${index + 1}`,
      })),
    },
    deps
  )

  const mainMenu = html.slice(0, html.indexOf('data-list-custom-filter-overflow'))
  assert.equal((mainMenu.match(/data-list-custom-filter-apply/g) || []).length, 5)
  assert.match(html, /data-list-custom-filter-overflow/)
  assert.match(html, /More filters…/)
  assert.match(html, /Saved filter 6/)
})

test('table controls hide print, charts, and kanban without removing their implementations', () => {
  const state = {
    view: 'list',
    filter: 'all',
    activeCustomFilterId: '',
    customFilters: [],
    fieldFilters: [],
    advanced: false,
    selected: new Set(),
    chartVisible: false,
    layoutDirty: false,
    filterMode: 'inline',
    search: '',
    groupBy: [],
    hiddenColumns: new Set(),
    columnOrder: [],
  }
  const config = {
    label: 'Invoices',
    filters: [{key: 'all', icon: 'i-filter', label: 'All'}],
    filterFields: [],
    columns: [],
    supportsKanban: true,
  }
  const toolbar = renderDataListToolbar('invoice', config, state, {
    ...deps,
    renderDataListGroupTrigger: () => '',
  })

  assert.match(toolbar, /data-list-action="print"[^>]* hidden/)
  assert.match(toolbar, /data-list-action="chart"[^>]* hidden/)
  assert.match(renderDataListViewMenu(config, state, deps), /data-list-view="kanban"[^>]* hidden/)
})

test('group-by choices use labels without decorative icons', () => {
  const html = renderDataListGroupTrigger(
    {columns: [{key: 'status', label: 'Status'}]},
    {groupBy: []},
    deps
  )

  const choices = html.slice(html.indexOf('</summary>'))
  assert.match(html, /data-list-group-menu[^>]*>.*data-icon="i-grid"/s)
  assert.doesNotMatch(choices, /data-icon="i-grid"/)
})

test('appearance offers comfortable density and independent interface-scale presets', async () => {
  const [dialog, controls, baseStyles, frameStyles, shellStyles, shell] = await Promise.all([
    readFile(new URL('../concepts/app/pages/profile/sections.js', import.meta.url), 'utf8'),
    readFile(new URL('../concepts/app/shell/appearance.js', import.meta.url), 'utf8'),
    readFile(new URL('../concepts/app/styles/tailwind/base.css', import.meta.url), 'utf8'),
    readFile(new URL('../concepts/app/prototype/controls.css', import.meta.url), 'utf8'),
    readFile(new URL('../concepts/app/styles/tailwind/shell.css', import.meta.url), 'utf8'),
    readFile(new URL('../concepts/app/shell/shell.js', import.meta.url), 'utf8'),
  ])

  assert.match(dialog, /data-appearance-density="comfortable"/)
  assert.match(dialog, /type="range"[^>]*id="appearance-interface-scale"/)
  assert.match(dialog, /min="0"[^>]*max="3"[^>]*step="1"/)
  assert.match(dialog, /appearance-scale-value/)
  assert.equal((dialog.match(/data-appearance-scale-tick/g) || []).length, 4)
  assert.match(dialog, /appearance-density-grid grid \[grid-template-columns:repeat\(3,_1fr\)\]/)
  for (const group of ['theme', 'accent', 'typography', 'scale', 'layout', 'density']) {
    assert.match(dialog, new RegExp(`appearance-group-${group}`))
  }
  const layoutAndDensity = dialog.slice(dialog.indexOf('appearance-group-layout'))
  for (const description of [
    'Content fills the screen',
    'Content is width-limited',
    'Comfortable spacing',
    'Tighter rows &amp; controls',
    'More room around rows &amp; controls',
  ]) {
    assert.doesNotMatch(layoutAndDensity, new RegExp(description))
  }
  assert.match(controls, /--ui-scale/)
  assert.match(controls, /appearance-interface-scale/)
  assert.match(controls, /const scaleOptions = \['90', '100', '110', '125'\]/)
  assert.doesNotMatch(baseStyles, /body\s*\{[^}]*zoom:/s)
  assert.match(frameStyles, /\.frame\s*\{[^}]*zoom:\s*var\(--ui-scale, 1\)/s)
  assert.match(shellStyles, /\.appearance-group-theme\s*\{\s*order: 1/)
  assert.match(shellStyles, /\.dscrim \.dlg\s*\{[^}]*zoom:\s*var\(--ui-scale, 1\)/s)
  assert.match(shellStyles, /\.dhd\s*\{[^}]*background:\s*var\(--line-2\)/s)
  assert.match(
    shellStyles,
    /customer-modal-header,[^}]*customer-unit-drawer-header,[^}]*\.drhd[^}]*background:\s*var\(--line-2\)/s
  )
  assert.doesNotMatch(shellStyles, /body\.layout-boxed \.frame/)
  assert.match(shell, /page-content flex min-h-0 flex-1 flex-col px-4/)
  assert.match(shellStyles, /body\.layout-boxed \.page-content\s*\{[^}]*max-width:\s*1296px/s)
  assert.doesNotMatch(shellStyles, /body\.layout-boxed :is\(\.arow, \.phead, \.canvas, \.fnav\)/)
  assert.match(shellStyles, /\.lp-body\s*\{[^}]*max-width:\s*960px/s)
  assert.doesNotMatch(shellStyles, /body:not\(\.layout-boxed\) \.lp-body/)
  assert.match(shellStyles, /body\.density-comfortable \.lp-body/)
  assert.match(shellStyles, /body\.density-comfortable \.d1 \.arow/)
  assert.match(controls, /applyDensity\(document\.getElementById\('density'\)\.value\)/)
  assert.match(
    controls,
    /applyContentLayout\(document\.getElementById\('content-layout'\)\.value\)/
  )
})

test('launchpad availability is a shared persistent appearance preference', async () => {
  const [dialog, appearance, prototypeControls, home, sidebar, menus, shell] = await Promise.all([
    readFile(new URL('../concepts/app/pages/profile/sections.js', import.meta.url), 'utf8'),
    readFile(new URL('../concepts/app/shell/appearance.js', import.meta.url), 'utf8'),
    readFile(new URL('../concepts/app/prototype/controls.js', import.meta.url), 'utf8'),
    readFile(new URL('../concepts/app/pages/home/home.js', import.meta.url), 'utf8'),
    readFile(new URL('../concepts/app/shell/sidebar.js', import.meta.url), 'utf8'),
    readFile(new URL('../concepts/app/shell/menus.js', import.meta.url), 'utf8'),
    readFile(new URL('../concepts/app/shell/shell.js', import.meta.url), 'utf8'),
  ])

  assert.match(dialog, /id="appearance-launchpad"/)
  assert.match(dialog, /Show App Launchpad/)
  assert.match(appearance, /appearanceLaunchpad/)
  assert.match(appearance, /getElementById\('launchpad'\)/)
  assert.match(prototypeControls, /'launchpad'/)
  assert.match(home, /getLaunchpadEnabled/)
  assert.match(home, /if \(!getLaunchpadEnabled\(\)\) return false/)
  assert.match(sidebar, /getLaunchpadEnabled/)
  assert.match(menus, /getLaunchpadEnabled/)
  assert.match(shell, /getLaunchpadEnabled/)
})

test('boxed content owns list views through the shared page canvas', async () => {
  const [contentHost, main, shell, shellStyles] = await Promise.all([
    readFile(new URL('../concepts/app/shell/content.js', import.meta.url), 'utf8'),
    readFile(new URL('../concepts/app/main.js', import.meta.url), 'utf8'),
    readFile(new URL('../concepts/app/shell/shell.js', import.meta.url), 'utf8'),
    readFile(new URL('../concepts/app/styles/tailwind/shell.css', import.meta.url), 'utf8'),
  ])

  assert.match(contentHost, /const content = document\.querySelector\('\.page-content'\)/)
  assert.match(main, /recordRoots: \[\.\.\.document\.querySelector\('\.page-content'\)\.children\]/)
  assert.match(shell, /pageFooter\.className = 'page-footer'/)
  assert.match(shell, /pageFooter\.append\(footer\)/)
  assert.match(shell, /pageActionBar\.className = 'page-action-bar'/)
  assert.match(shell, /pageActionBar\.append\(actionBar\)/)
  assert.match(contentHost, /document\.querySelectorAll\('\.page-footer \[data-page-footer\]'\)/)
  assert.match(
    contentHost,
    /document\.querySelectorAll\('\.page-action-bar \[data-page-action-bar\]'\)/
  )
  assert.match(shellStyles, /\.page-footer\s*\{[^}]*width:\s*100%/s)
  assert.match(shellStyles, /body\.layout-boxed \.page-footer \.fnav\s*\{[^}]*max-width:\s*1296px/s)
  assert.match(shellStyles, /\.page-action-bar\s*\{[^}]*width:\s*100%/s)
  assert.match(
    shellStyles,
    /body\.layout-boxed \.page-action-bar \.arow\s*\{[^}]*max-width:\s*1296px/s
  )
})

test('operation-unit drawers retain their primary and nested widths', async () => {
  const dialogs = await readFile(
    new URL('../concepts/app/pages/customers/dialogs.html', import.meta.url),
    'utf8'
  )

  const primaryDrawer = dialogs.match(/class="customer-unit-drawer absolute[^\n]+"/)[0]
  const nestedDrawer = dialogs.match(
    /class="customer-unit-drawer customer-nested-unit-drawer[^\n]+"/
  )[0]
  assert.match(primaryDrawer, /\[width:80vw\]/)
  assert.doesNotMatch(primaryDrawer, /\bw-full\b/)
  assert.match(nestedDrawer, /\[width:60vw\]/)
  assert.doesNotMatch(nestedDrawer, /\bw-full\b/)
})

test('global search defaults to screens-only mode while retaining other search implementations', async () => {
  const search = await readFile(new URL('../concepts/app/shell/search.js', import.meta.url), 'utf8')

  assert.match(search, /const openSearch = \(screensOnly = true\)/)
  assert.match(search, /sScope = screensOnly \? 'screens' : 'all'/)
  assert.match(search, /if \(sScope === 'all' \|\| sScope === 'actions'\)/)
  assert.match(search, /if \(sScope === 'all' \|\| sScope === 'records'\)/)
})

test('invoice record actions expose status changes outside the audit pill', async () => {
  const [chrome, operations, dialogs, shellStyles] = await Promise.all([
    readFile(new URL('../concepts/app/pages/invoices/chrome.js', import.meta.url), 'utf8'),
    readFile(new URL('../concepts/app/pages/invoices/operations.js', import.meta.url), 'utf8'),
    readFile(
      new URL('../concepts/app/pages/invoices/record-dialogs.html', import.meta.url),
      'utf8'
    ),
    readFile(new URL('../concepts/app/styles/tailwind/shell.css', import.meta.url), 'utf8'),
  ])

  assert.match(chrome, /data-act="Change status"/)
  assert.match(chrome, /data-status-action="pending"/)
  assert.match(chrome, /data-status-action="returned"/)
  assert.match(operations, /const STATUS_TRANSITIONS/)
  assert.match(operations, /if \(creating\) \{\s*nextInvoiceNo\+\+\s*setStatus\('open'\)/s)
  assert.match(operations, /openStatusDialog/)
  assert.match(dialogs, /data-dlg="status"/)
  assert.match(shellStyles, /\.dlg\[data-tone='danger'\]\s*\{/)
  assert.match(dialogs, /data-tone="danger"\s+data-dlg="delete"/)
})

test('invoice consequence notes use accessible Atlassian-style section messages', async () => {
  const dialogs = await readFile(
    new URL('../concepts/app/pages/invoices/record-dialogs.html', import.meta.url),
    'utf8'
  )
  const messages = [...dialogs.matchAll(/<aside\s+class="effects ([^"]+)"\s+role="note"/g)]

  assert.equal(messages.length, 3)
  messages.forEach(([, classes]) => {
    assert.match(classes, /flex items-start gap-3/)
    assert.match(classes, /rounded-md/)
    assert.match(classes, /p-4/)
    assert.doesNotMatch(classes, /border/)
  })
  assert.match(dialogs, /data-tone=success.*?success-soft-bg/s)
  assert.match(dialogs, /data-tone=danger.*?danger-soft-bg/s)
})

test('account menu describes the branch and uses the default system-user avatar', async () => {
  const [shell, sidebar, activity, email] = await Promise.all([
    readFile(new URL('../concepts/app/shell/shell.html', import.meta.url), 'utf8'),
    readFile(new URL('../concepts/app/shell/sidebar-dialog.html', import.meta.url), 'utf8'),
    readFile(new URL('../concepts/app/pages/invoices/activity.js', import.meta.url), 'utf8'),
    readFile(new URL('../concepts/app/pages/email/email.js', import.meta.url), 'utf8'),
  ])

  assert.match(shell, /<div class="glbl">Workspace<\/div>/)
  assert.match(shell, /lastchance · Cairo HQ/)
  assert.doesNotMatch(shell, /Switch\s*account/)
  assert.doesNotMatch(sidebar, /tenant/i)
  assert.ok((shell.match(/<use href="#i-user"/g) || []).length >= 2)
  assert.match(activity, /isSystemUser/)
  assert.match(email, /isSystemUser/)
})
