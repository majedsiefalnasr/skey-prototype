import {createNavigation} from './core/navigation.js'
import {createAssistant} from './components/assistant/assistant.js'
import {createEmail} from './pages/email/email.js'
import {createNotifications} from './components/notifications/notifications.js'
import {createHome} from './pages/home/home.js'
import {enableFlowPan} from './pages/geography/hierarchy.js'
import {createRecordPager} from './components/record-pager/pager.js'
import {createInvoiceOperations} from './pages/invoices/operations.js'
import {createInvoices, createInvoiceState} from './pages/invoices/invoices.js'
import {createInvoicePrint} from './pages/invoices/print.js'
import {createInvoiceActivity} from './pages/invoices/activity.js'
import {createGeography} from './pages/geography/geography.js'
import {createInvoiceRecord} from './pages/invoices/record.js'
import {createInvoiceAdjustments} from './pages/invoices/adjustments.js'
import {createInvoiceLines} from './pages/invoices/lines.js'
import {createInvoicePayments} from './pages/invoices/payments.js'
// Transitional legacy application module. Task 2 extracted this file
// verbatim from the monolith's inline <script> as a classic script; Task 4
// converts it into a module and pulls the shared locale/appearance/toast/
// work/loading/dialog-focus facilities out into their own modules (see
// concepts/app/core/{locale,appearance,work}.js and
// concepts/app/components/{dialog,toast,loading}/*.js). Tasks 5-9 extract
// the data-list/page components; Task 10 (see the composition block at the
// bottom of startLegacyApp) constructs the real Navigation contract from
// core/navigation.js once every page factory below is built, and routes
// every former direct showContentView(...) call through it instead.
//
// startLegacyApp(shared) is called once, after the app-shell markup has
// been assembled into the document (see concepts/app/main.js), with
// `shared` limited to exactly the finite set of facilities this task
// isolates — not an arbitrary getter for every remaining legacy binding.
import {normalizeHexColor, deriveAccentPair} from './core/appearance.js'
import {encodeHtml} from './core/locale.js'
import {STATUSES, CHAIN, CARDS, RULES, ACTIVITY, LIST_ROWS} from './prototype/fixtures/invoices.js'
import {
  CUSTOMER_ROWS,
  CUSTOMER_SECTIONS,
  CUSTOMER_REFERENCE,
  UNIT_ROWS,
  CUSTOMER_LOOKUP_RESULTS,
} from './prototype/fixtures/customers.js'
import {GEO_ROWS} from './prototype/fixtures/geography.js'
import {
  NAV_TREE,
  NAV_FAVORITES,
  NAV_RECENTS,
  NAV_ICONS,
  NAV_APP_META,
  SCREENS,
  RECORDS,
  ACTIONS,
} from './prototype/fixtures/navigation.js'
import {EMAIL_DATA, NOTIF_DATA} from './prototype/fixtures/messages.js'
import {
  createListModel,
  DATA_LIST_SIMULATED_TOTAL,
  DATA_LIST_DEFAULT_PAGE_SIZE,
  localStorageDataListStorage,
} from './components/data-list/model.js'
import {
  DATA_FILTER_OPERATORS,
  DATA_DATE_UNITS,
  dataFilterOptionValue,
  dataFilterOptionLabel,
  parseDataListDate,
  parseDateFilterValue,
  dataListNextDatePresetValue,
} from './components/data-list/filters.js'
import {
  DATA_LIST_CONFIG,
  DATA_LIST_STATISTICS_CONCEPT_OPTIONS,
  DATA_LIST_RESPONSIVE_WIDTH,
  responsiveDataListColumns,
} from './components/data-list/columns.js'
import {
  renderShellPager as renderSharedShellPager,
  renderShellRecordPager as renderSharedShellRecordPager,
} from './components/data-list/pagination.js'
import {
  dataListPercent as sharedDataListPercent,
  renderDataListStatistics as renderSharedDataListStatistics,
  renderDataListGroupTrigger as renderSharedDataListGroupTrigger,
  renderDataListGroupingBar as renderSharedDataListGroupingBar,
} from './components/data-list/statistics.js'
import {
  dataListChartYOptions as sharedDataListChartYOptions,
  renderDataListChart as renderSharedDataListChart,
  createListChart,
} from './components/data-list/charts.js'
import {
  renderDataListRowActions as renderSharedDataListRowActions,
  renderDataListRowActionMenu as renderSharedDataListRowActionMenu,
  renderDataListAdaptiveFooterActions as renderSharedDataListAdaptiveFooterActions,
  renderDataListHeader as renderSharedDataListHeader,
  renderDataListRecordRows as renderSharedDataListRecordRows,
  renderDataListBody as renderSharedDataListBody,
  renderDataListCards as renderSharedDataListCards,
  renderDataListAdaptiveRecord as renderSharedDataListAdaptiveRecord,
  dataListDetailsId as sharedDataListDetailsId,
} from './components/data-list/views.js'
import {
  applyFrozenDataListColumns as applySharedFrozenDataListColumns,
  createContextMenu,
  renderDataListColumnHeaderMenu as renderSharedDataListColumnHeaderMenu,
  applyDataListColumnHeaderAction as applySharedDataListColumnHeaderAction,
} from './components/data-list/menus.js'
import {
  createDataList,
  renderDataListSelectionActions as sharedRenderDataListSelectionActions,
} from './components/data-list/list.js'
import {
  computeDataListLayoutDirty as sharedComputeDataListLayoutDirty,
  deleteDataListRecords as sharedDeleteDataListRecords,
  toggleDataListStatus as sharedToggleDataListStatus,
  setDataListRecordsStatus as sharedSetDataListRecordsStatus,
  applyDataListRowAction as sharedApplyDataListRowAction,
  applyDataListToolbarCommand as sharedApplyDataListToolbarCommand,
  applyDataListCommandClick as sharedApplyDataListCommandClick,
  applyDataListSortClick as sharedApplyDataListSortClick,
  onDataListChange as sharedOnDataListChange,
  reorderDataListColumn as sharedReorderDataListColumn,
  saveDataListLayout as sharedSaveDataListLayout,
  resetDataListLayout as sharedResetDataListLayout,
} from './components/data-list/actions.js'
import {renderCustomerAvatar} from './pages/customers/images.js'
import {createCustomers} from './pages/customers/customers.js'

export function startLegacyApp(shared) {
        const {t, formatDate: formatLocaleDate, formatCurrency: formatLocaleCurrency, getLocale, setLocale} = shared.locale
        let appLocale = getLocale()
        const {trapFocus, releaseFocus} = shared.dialogFocus
        const toast = shared.toast
        const runWork = shared.work
        /* ================================================================
   Localization — scoped to the one complete Arabic workflow the audit asked
   for (Customer record → Sales Invoice record → line entry → validation →
   save), not a full-app translation. Real locale, not a visual RTL mirror:
   language, direction, translated copy, and locale-aware date/number/
   currency formatting move together. Declared first because rail/launchpad
   construction during boot already calls t() before anything else runs. */

        /* tracks which .content view is showing underneath the launchpad overlay,
   so closing the launchpad without a real navigation (e.g. opening a rail-icon
   flyout) can resync the prototype-controls panel to it. */
        let currentContentViewName = 'record'
        // Forward-referenced mutable binding for the function historically
        // named showContentView. Declared here, this early, because
        // createHome's showLaunchpad calls closeEmailView() synchronously
        // during the shell mount loop a few hundred lines below (well
        // before this file's old single showContentView definition site) —
        // closeEmailView's arrow function only READS this binding when
        // actually invoked, so a `let` declared here (assigned to
        // attachAndShowView, a hoisted `function` declared further below —
        // safe to reference immediately since only its hoisted binding,
        // not its later source position, matters here) avoids the
        // temporal-dead-zone ReferenceError that a `let` declared later, at
        // the old definition site after the mount loop, produced instead.
        // This exactly reproduces the original's own boot-time behavior:
        // showContentView('record') already ran for real at this same
        // "closeEmailView() during the very first showLaunchpad()" moment,
        // back when showContentView was itself a hoisted `function`
        // declaration further down the file.
        let showContentView = attachAndShowView
        // Forward-referenced mutable binding for the prototype-controls
        // panel's per-surface visibility sync (Task 11: moved from this
        // file's own syncCustomerPrototypeControls into
        // prototype/controls.js's createPrototypeControls -> syncPage).
        // createHome's showLaunchpad/hideLaunchpad call this synchronously
        // (see pages/home/home.js), and showLaunchpad already runs during
        // the shell mount loop below, well before main.js can construct
        // `controls` — which itself needs `customers`/`invoices`, built
        // only at the very end of this function. A no-op default (matching
        // the original's own "the panel doesn't exist yet on the very
        // first boot call, skip" early return) is safe here: main.js
        // reassigns this to the real controls.syncPage once constructed,
        // before any post-boot navigation can rely on it.
        let syncPrototypeControlsPage = () => {}
        /* The loading facility's getContainer callback needs to resolve the
   currently visible page/view's skeleton host, which depends on
   currentContentViewName above — a binding that does not exist yet at the
   entry point's composition time (see concepts/app/main.js). So `loading`
   itself is constructed here, as the very next thing after
   currentContentViewName exists, passing currentSkeletonContainer through
   createLoading's own getContainer parameter (shared.loading carries the
   factory and its other constructor params from main.js). */
        function currentSkeletonContainer() {
          const launchpad = document.querySelector('.lp-view:not([hidden])')
          if (launchpad) return launchpad
          const selectors = {
            record: '.content',
            email: '.email-view:not([hidden])',
            list: '.list-view:not([hidden])',
            'customers-list': '.customer-list-view:not([hidden])',
            'customer-record': '.customer-record-view:not([hidden])',
            'geo-list': '.geo-list-view:not([hidden])',
            'geo-record': '.geo-record-view:not([hidden])',
          }
          const selector = selectors[currentContentViewName]
          return selector ? document.querySelector(selector) : null
        }
        const {
          queue: queueSkeletonForCurrentView,
          clear: clearSkeletonOverlays,
          initTickers: initNumberTickers,
        } = shared.loading.create({
          getContainer: currentSkeletonContainer,
          isSimulationEnabled: shared.loading.isSimulationEnabled,
        })
        /* ================= verified model =================
   Statuses: real ribbon flags. Actions: real shared.operationMenu labels.
   Action matrix verified by walking live records.                      */
        /* the chain shown in the popover: two audit cards that always exist,
   then the status flags in the order the product records them */
        /* audit cards confirmed by the backend team; Returned has no card */

        const {state, editable, LOCK_COPY, needsSaved, blocked} = createInvoiceState()
        /* ---------- search data (verified) ---------- */

        /* ================================================================
   sidebar navigation — 4 structural concepts over the real live tree
   (read from app.skeyerp.com, see concepts/sidebar-navigation-audit.md)
   ================================================================ */

        /* entry = string (leaf) | [label, ...children] (branch). Verbatim labels, product typos included. */
        /* icons borrowed from the shared symbol sprite — structure over final icon design, per spec */

        /* the rail always shows every app from NAV_TREE, fixed order — no more
   hide/reorder; that job now belongs to building For You groups instead */
        const visibleGroups = () => NAV_TREE
        const childrenOf = entry => (Array.isArray(entry) ? entry.slice(1) : [])

        /* every leaf screen under a NAV_TREE entry, however deep — used both to list
   an app's screens in the customizer's left tree and to flatten a whole app
   dropped into a For You group down to its individual screens */
        const leavesOf = entry => {
          const kids = childrenOf(entry)
          if (!kids.length) return [Array.isArray(entry) ? entry[0] : entry]
          return kids.flatMap(leavesOf)
        }

        /* reverse of leavesOf — which top-level NAV_TREE group a given leaf screen
   lives under. Used to activate the right rail icon before a leaf (like "Sales
   Invoice") can be highlighted inside its panel — the rail only has icons for
   top-level groups, not every nested screen. */
        const findNavGroup = label => NAV_TREE.find(group => leavesOf(group).includes(label))

        /* "For You" — the user's own custom groups of screens, built via the
   Customize sidebar dialog. Each group is {name, items: [{label, appLabel}]},
   flat only, no nested groups. The rail's For You icon only appears once at
   least one group exists. Pre-seeded with 3 groups for testing — remove or
   reset to [] to try the empty-state (no For You icon) flow. */
        let forYouGroups = [
          {
            name: 'Daily sales',
            items: [
              {label: 'Sales Invoice', appLabel: 'Sales Systems Management'},
              {label: 'Sales Order', appLabel: 'Sales Systems Management'},
              {label: 'Sales Return', appLabel: 'Sales Systems Management'},
              {label: 'Customers', appLabel: 'Customers'},
            ],
          },
          {
            name: 'Finance',
            items: [
              {label: 'Receipt Voucher', appLabel: 'Finance and Accounting'},
              {label: 'Payment Voucher', appLabel: 'Finance and Accounting'},
              {label: 'Journal Entry', appLabel: 'Finance and Accounting'},
              {label: 'Chart of Accounts', appLabel: 'Finance and Accounting'},
            ],
          },
          {
            name: 'Admin & reports',
            items: [
              {label: 'Key Performance Indicators', appLabel: 'Dashboard'},
              {label: 'Financial statistics', appLabel: 'Finance and Accounting'},
              {label: 'Vendors', appLabel: 'Vendors'},
            ],
          },
        ]

        /* current-selection highlight shared across all 4 concepts */
        let navCurrentLabel = 'Sales Invoice'
        let currentAppLabel = findNavGroup(navCurrentLabel)?.[0] || navCurrentLabel
        const setNavCurrent = (root, label, {skipListLayoutGuard = false} = {}) => {
          const targetListContext =
            label === 'Sales Invoice' ? 'invoice' : label === 'Customers' ? 'customer' : ''
          if (
            !skipListLayoutGuard &&
            visibleDirtyDataListContext() !== targetListContext &&
            guardDataListLeave(() => setNavCurrent(root, label, {skipListLayoutGuard: true}))
          )
            return
          navCurrentLabel = label
          currentAppLabel = findNavGroup(label)?.[0] || label
          closeEmailView() /* any real navigation leaves the email view, same as it would leave any other page */
          const viewByNavLabel = {
            'Sales Invoice': 'list',
            Customers: 'customers-list',
            'Geographical Structure': 'geo-list',
          }
          showContentView(viewByNavLabel[label] || 'record')
          const frame = root.closest('.frame')
          const lp = frame && frame.querySelector('.lp-view')
          if (lp && !lp.hidden) {
            hideLaunchpad(frame)
          }
          root.querySelectorAll('.current').forEach(el => el.classList.remove('current'))
          root.querySelectorAll('.on-path').forEach(el => el.classList.remove('on-path'))
          root.querySelectorAll('.nc1-item').forEach(el => {
            if (el.dataset.label !== label) return
            el.classList.add('current')
            let n = el.closest('.nc1-node')
            while (n) {
              n.classList.add('open', 'on-path')
              n = n.parentElement.closest('.nc1-node')
            }
          })
        }
        /* the click that collapses/expands the sidebar shouldn't also register as "clicked outside" for whatever flyout is open */
        const clickedCollapseToggle = e =>
          e
            .composedPath()
            .some(
              el =>
                el instanceof Element &&
                (el.classList.contains('side-toggle') || el.classList.contains('side-handle'))
            )

        /* ---- recursive item builder: label + chevron(if branch), no icon —
   pinned-panel rows never carry one, only rail icons and the customizer's
   tree do ---- */
        function ncBuildItem(entry, depth, root) {
          const isBranch = Array.isArray(entry)
          const label = isBranch ? entry[0] : entry
          const node = document.createElement('div')
          node.className = 'nc1-node'
          const btn = document.createElement('button')
          btn.type = 'button'
          btn.className = 'nc1-item'
          btn.dataset.label = label
          btn.innerHTML =
            '<span class="nc1-lbl"></span>' +
            (isBranch
              ? '<svg class="nc1-chev" width="12" height="12" aria-hidden="true"><use href="#i-caret"/></svg>'
              : '')
          btn.querySelector('.nc1-lbl').textContent = t(label)
          node.appendChild(btn)
          if (isBranch) {
            const sub = document.createElement('div')
            sub.className = 'nc1-sub'
            childrenOf(entry).forEach(child => sub.appendChild(ncBuildItem(child, depth + 1, root)))
            node.appendChild(sub)
            btn.setAttribute('aria-expanded', 'false')
            btn.addEventListener('click', () => {
              const open = node.classList.toggle('open')
              btn.setAttribute('aria-expanded', String(open))
            })
          } else {
            btn.addEventListener('click', () => setNavCurrent(root, label))
          }
          return node
        }

        /* ---- a group's title + its tree, with Favorites pinned on top.
   The rail pins one of these open permanently as its flyout. ---- */
        function makeGroupPanel(root, {showFavs = true} = {}) {
          const panel = document.createElement('div')
          panel.className = 'nc3-panel'
          if (showFavs) {
            const favs = document.createElement('div')
            favs.className = 'nc3-favs'
            const favLbl = document.createElement('div')
            favLbl.className = 'nc-group-lbl'
            favLbl.textContent = t('Favorites')
            favs.appendChild(favLbl)
            NAV_FAVORITES.forEach(f => {
              const b = document.createElement('button')
              b.type = 'button'
              b.className = 'nc-fav'
              b.dataset.label = f
              b.innerHTML =
                '<svg width="13" height="13" aria-hidden="true"><use href="#i-spark"/></svg><span></span>'
              b.querySelector('span').textContent = t(f)
              b.addEventListener('click', () => setNavCurrent(root, f))
              favs.appendChild(b)
            })
            panel.appendChild(favs)
          }
          const body = document.createElement('div')
          body.className = 'nc-scroll nc3-body'
          panel.appendChild(body)
          const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
          /* the For You rail icon renders forYouGroups instead of a NAV_TREE branch —
     one flat, unlabeled-depth list of screens per user-made group, each group
     getting its own title row instead of the single app title an ordinary
     panel shows */
          const fillForYou = () => {
            body.innerHTML = ''
            const title = document.createElement('div')
            title.className = 'nc3-title'
            title.textContent = t('For You')
            body.appendChild(title)
            forYouGroups.forEach(g => {
              const lbl = document.createElement('div')
              lbl.className = 'nc-group-lbl'
              lbl.textContent = g.name
              body.appendChild(lbl)
              g.items.forEach(item => body.appendChild(ncBuildItem(item.label, 0, root)))
            })
          }
          const fill = (group, withForYou) => {
            if (group === 'for-you') {
              fillForYou()
              return
            }
            body.innerHTML = ''
            const title = document.createElement('div')
            title.className = 'nc3-title'
            title.textContent = group[0]
            body.appendChild(title)
            if (withForYou) body.appendChild(ncBuildItem('For you', 0, root))
            childrenOf(group).forEach(entry => body.appendChild(ncBuildItem(entry, 0, root)))
          }
          /* a plain innerHTML swap reads as a hard cut when you're clicking rail icons in
     quick succession — a short crossfade makes the panel feel like it's updating
     in place instead of flickering */
          const show = (group, {withForYou = false} = {}) => {
            if (reduceMotion() || !body.children.length) {
              fill(group, withForYou)
              return
            }
            body.classList.add('swap-out')
            setTimeout(() => {
              fill(group, withForYou)
              body.classList.remove('swap-out')
            }, 100)
          }
          return {el: panel, show}
        }

        /* ---- the icon rail + a pinned panel that never goes away. Handles its own
   collapse: the panel just switches from a pinned sibling to an overlay next
   to the rail (CSS only, same DOM, same favorites, same items) — see
   ".side.collapsed .nc3-panel" in the stylesheet. Also exposes activateByLabel
   so the topbar app-switcher and the launchpad's own tiles can select a rail
   icon the same way clicking it directly would. ---- */
        function buildRailAndPanel(fbody, side) {
          const root = document.createElement('div')
          root.className = 'nc nc2'
          const rail = document.createElement('div')
          rail.className = 'nc2-rail'
          const {el: panel, show} = makeGroupPanel(root, {
            showFavs: false,
          }) /* Starred now lives in the rail itself */

          /* every rail icon — Starred, Recent, and each app — feeds the same pinned
     panel the same way, so switching between them never changes behaviour.
     Any of them also leaves the launchpad, same as picking a page would. */
          const activate = (btn, group, opts) => {
            const collapsed = side.classList.contains('collapsed')
            if (collapsed && btn.classList.contains('active') && !panel.hidden) {
              panel.hidden = true
              btn.classList.remove('active')
              return
            }
            const frame = fbody.closest('.frame')
            const lp = frame.querySelector('.lp-view')
            if (lp && !lp.hidden) {
              hideLaunchpad(frame)
            }
            rail.querySelectorAll('.active').forEach(b => b.classList.remove('active'))
            btn.classList.add('active')
            show(group, opts)
            panel.hidden = false
          }
          const railIcon = (label, icon, group, opts) => {
            const btn = document.createElement('button')
            btn.type = 'button'
            btn.className = 'nc2-icn'
            btn.setAttribute('aria-label', t(label))
            btn.innerHTML = `<svg width="18" height="18" aria-hidden="true"><use href="#${icon}"/></svg><span class="nc2-lbl">${encodeHtml(t(label))}</span>`
            /* a mouse click leaves focus sitting on the button, which keeps
       ":focus-within" (and so the hover-expanded rail) engaged until an
       unrelated outside click knocks it loose — blur right away so the rail
       collapses as soon as the pointer actually leaves it. event.detail is 0
       for a keyboard-triggered click, so keyboard users keep their focus ring
       (and the rail stays open for them to keep navigating). */
            btn.addEventListener('click', e => {
              activate(btn, group, opts)
              if (e.detail > 0) btn.blur()
            })
            return btn
          }

          /* the For You icon only earns its place once the user has actually built a
     group — an empty pin at the top of every rail, forever, isn't worth it */
          if (forYouGroups.length) {
            const forYouSep = document.createElement('div')
            forYouSep.className = 'nc2-rail-sep'
            rail.append(railIcon('For You', 'i-user', 'for-you'), forYouSep)
          }

          const railSep = document.createElement('div')
          railSep.className = 'nc2-rail-sep'
          rail.append(
            railIcon('Starred', 'i-spark', ['Starred', ...NAV_FAVORITES]),
            railIcon('Recent', 'i-clock', ['Recent', ...NAV_RECENTS]),
            railSep
          )

          const groups = visibleGroups()
          const iconByLabel = new Map()
          groups.forEach(group => {
            const label = group[0]
            const btn = railIcon(label, NAV_ICONS[label] || 'i-doc', group, {withForYou: true})
            iconByLabel.set(label, btn)
            rail.appendChild(btn)
          })
          document.addEventListener('click', e => {
            if (
              side.classList.contains('collapsed') &&
              !panel.hidden &&
              !clickedCollapseToggle(e)
            ) {
              const p = e.composedPath()
              if (!p.includes(root)) {
                panel.hidden = true
                rail.querySelectorAll('.active').forEach(b => b.classList.remove('active'))
              }
            }
          })
          /* roving focus: with 18+ icons and no text labels, Tabbing through every one
     to reach the bottom of the rail is slow — arrow keys move focus directly */
          rail.addEventListener('keydown', e => {
            if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
            const icons = [...rail.querySelectorAll('.nc2-icn')]
            const i = icons.indexOf(document.activeElement)
            if (i === -1) return
            e.preventDefault()
            const next =
              e.key === 'ArrowDown'
                ? icons[(i + 1) % icons.length]
                : e.key === 'ArrowUp'
                  ? icons[(i - 1 + icons.length) % icons.length]
                  : e.key === 'Home'
                    ? icons[0]
                    : icons[icons.length - 1]
            next.focus()
          })
          root.append(rail, panel)
          /* selects an app's rail icon + opens its panel from outside the rail itself —
     used by the topbar app-switcher and by the launchpad tiles */
          root.activateByLabel = label => {
            currentAppLabel = label
            const btn = iconByLabel.get(label)
            if (btn) {
              side.classList.toggle('collapsed', compactShell.matches)
              updateSideWidth(side)
              activate(
                btn,
                groups.find(g => g[0] === label),
                {withForYou: true}
              )
              if (compactShell.matches) panel.hidden = true
            }
          }
          return root
        }

        /* ---- boots into a Spotlight-style launchpad screen. Picking an app selects
   it in the rail exactly like clicking the rail icon would. The topbar's
   app-switcher button reopens it later — renderSide (not this builder)
   decides whether a given rebuild should land back on the launchpad, so
   re-rendering the sidebar (e.g. after saving Customize sidebar) doesn't
   yank the user there. ---- */
        const home = createHome({buildRailAndPanel: (...args) => buildRailAndPanel(...args), findNavGroup: (...args) => findNavGroup(...args), setNavCurrent: (...args) => setNavCurrent(...args), t: (...args) => t(...args), getLocale: (...args) => getLocale(...args), syncCustomerPrototypeControls: (...args) => syncPrototypeControlsPage(...args), getCurrentView: () => currentContentViewName, queueSkeletonForCurrentView: (...args) => queueSkeletonForCurrentView(...args), closeEmailView: () => showContentView('record'), visibleGroups: (...args) => visibleGroups(...args), getCurrentApp: () => currentAppLabel, closeAllMenus: (...args) => closeAllMenus(...args)})
        const {buildNavLaunchpad, restoreLaunchpadActions, stopSearchTyping, startSearchTyping, hideLaunchpad, getLaunchpadUserName, showLaunchpad, setupAppSwitcher} = home
        const compactShell = matchMedia('(max-width: 900px)')
        let sideCollapsed = compactShell.matches
        function updateSideWidth(side) {
          side.classList.toggle('wide', !sideCollapsed)
        }
        /* bootToLaunchpad: whether this rebuild should land on the launchpad —
   true for a fresh mount, false for a rebuild that should leave the user
   exactly where they were (e.g. after saving Customize sidebar, which just
   needs the rail's contents refreshed) */
        function renderSide(side, {bootToLaunchpad = true} = {}) {
          const fbody = side.parentElement
          const frame = fbody.closest('.frame')
          const wasShowingLaunchpad = !!frame.querySelector('.lp-view:not([hidden])')
          const nav = side.querySelector('.nc')
          if (nav) nav.remove()
          const lp = frame.querySelector('.lp-view')
          if (lp) {
            stopSearchTyping(lp)
            restoreLaunchpadActions(frame)
            lp.remove()
          }
          side.classList.remove('collapsed')
          const built = buildNavLaunchpad(fbody)
          side.prepend(built)
          if (bootToLaunchpad || wasShowingLaunchpad) {
            showLaunchpad(fbody, {mode: 'home'})
          } else {
            setNavCurrent(side, navCurrentLabel)
          }
          if (sideCollapsed) side.classList.add('collapsed')
          updateSideWidth(side)
        }
        /* the topbar app switcher just selects a rail icon; the collapse toggle
   jumps to the front of the topbar once collapsed, same as the reference —
   it's the primary way back at that point */
        /* the topbar keeps the tenant as its identity, not a single app — the rail
   and launchpad already carry app identity. */
        /* the active fiscal year rides next to the tenant name so it's always visible,
   not tucked in a menu — every posted document is scoped to one, so which
   year is active changes what the rest of the shell shows. */
        const ACTIVE_FISCAL_YEAR = '2026'
        function syncTopbarBrand() {
          /* not scoped to .gtop — the launchpad moves this same button into
     .lp-actions-left while it's open (see showLaunchpad), and it still
     needs the year badge/label filled in there too */
          document.querySelectorAll('.gtop .app, .lp-actions-left .app').forEach(el => {
            el.innerHTML =
              '<svg width="16" height="16" aria-hidden="true"><use href="#i-home"/></svg><span class="app-name"></span><span class="badge gray year-badge"></span><span class="tip"></span>'
            el.querySelector('.app-name').textContent = 'lastchance'
            el.querySelector('.year-badge').textContent = ACTIVE_FISCAL_YEAR
            el.querySelector('.tip').textContent = 'lastchance'
            el.setAttribute('aria-label', `lastchance, fiscal year ${ACTIVE_FISCAL_YEAR}`)
          })
        }
        /* clicking the topbar's tenant identity has nothing app-scoped to go "home" to;
   the Home rail icon covers that job instead. */
        function goToForYou() {}
        function syncTopbarChrome() {
          document.querySelectorAll('.app-switcher-menu').forEach(m => {
            m.hidden = false
            m.style.order = '1'
          })
          document.querySelectorAll('.gtop .app').forEach(a => {
            a.style.order = '2'
          })
          document.querySelectorAll('.side-toggle').forEach(b => {
            b.style.order = sideCollapsed ? '-1' : '3'
            b.classList.toggle('rail-aligned', sideCollapsed)
            b.setAttribute('aria-pressed', String(sideCollapsed))
            b.setAttribute('aria-label', sideCollapsed ? 'Expand sidebar' : 'Collapse sidebar')
            b.querySelector('.tip').textContent = sideCollapsed
              ? 'Expand sidebar'
              : 'Collapse sidebar'
          })
          syncTopbarBrand()
        }
        function applySideCollapsedState() {
          document.querySelectorAll('.side').forEach(side => {
            side.classList.toggle('collapsed', sideCollapsed)
            updateSideWidth(side)
            /* the panel is pinned open whenever the sidebar is expanded, and is
       an on-demand flyout once collapsed — collapsing should close it right
       away instead of leaving it floating until a separate outside click */
            const panel = side.querySelector('.nc3-panel')
            if (panel) panel.hidden = sideCollapsed
            const handle = side.querySelector('.side-handle')
            if (handle)
              handle.setAttribute(
                'aria-label',
                sideCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
              )
          })
          syncTopbarChrome()
        }
        function toggleSideCollapse() {
          sideCollapsed = !sideCollapsed
          applySideCollapsedState()
        }
        compactShell.addEventListener('change', event => {
          sideCollapsed = event.matches
          applySideCollapsedState()
        })

        const deferredContentViews = new Map()
        const initializedContentViews = new Set()
        let contentViewDeferralReady = false
        let ensureContentViewRendered = () => {}

        /* ================= mount designs ================= */
        const T = id => document.getElementById(id).content.cloneNode(true)
        document.querySelectorAll('.design.active').forEach(d => {
          const frame = document.createElement('div')
          frame.className = 'frame'
          frame.append(T('t-top'))
          const body = document.createElement('div')
          body.className = 'fbody'
          const side = document.createElement('nav')
          side.className = 'side'
          side.setAttribute('aria-label', 'Primary navigation')
          const handle = document.createElement('button')
          handle.type = 'button'
          handle.className = 'side-handle'
          handle.setAttribute('aria-label', 'Collapse sidebar')
          handle.addEventListener('click', toggleSideCollapse)
          side.appendChild(handle)
          const content = document.createElement('main')
          content.className = 'content'
          content.id = 'app-main'
          content.tabIndex = -1
          content.append(d.querySelector('.body-tpl').content.cloneNode(true))
          content.append(d.querySelector('.email-tpl').content.cloneNode(true))
          content.append(d.querySelector('.list-tpl').content.cloneNode(true))
          content.append(d.querySelector('.customer-list-tpl').content.cloneNode(true))
          content.append(d.querySelector('.customer-record-tpl').content.cloneNode(true))
          content.append(d.querySelector('.geo-list-tpl').content.cloneNode(true))
          content.append(d.querySelector('.geo-record-tpl').content.cloneNode(true))
          body.append(side, content)
          frame.append(body)
          d.querySelector('.mount').append(frame)
          d.querySelectorAll('.pager-mount').forEach(m => m.append(T('t-pager')))
          d.querySelectorAll('.customer-record-pager-mount').forEach(m => m.append(T('t-pager')))
          d.querySelectorAll('.geo-record-pager-mount').forEach(m => m.append(T('t-pager')))
          d.querySelectorAll('.pill-mount').forEach(m => m.append(T('t-pill')))
          d.querySelectorAll('.menus-mount').forEach(m => m.append(T('t-menus')))
          d.querySelectorAll('.ctx-mount').forEach(m => m.append(T('t-ctx')))
          d.querySelectorAll('.crumbs .sep').forEach(separator => {
            separator.setAttribute('aria-hidden', 'true')
          })
          d.querySelectorAll('.side-toggle').forEach(b =>
            b.addEventListener('click', toggleSideCollapse)
          )
          d.querySelectorAll('.gtop .app').forEach(b => b.addEventListener('click', goToForYou))
          renderSide(side)
          d.querySelectorAll('.app-switcher-list').forEach(setupAppSwitcher)
          applySideCollapsedState()
        })
        /* ========== create-mode controls, added once per design ========== */
        document.querySelectorAll('.design.active').forEach(d => {
          /* this record's own actions come first, the general ones after them */
          d.querySelectorAll('.lbtn[data-act="Save"]').forEach(btn => {
            const modify = document.createElement('button')
            modify.className = 'lbtn pri'
            modify.dataset.act = 'Modify'
            modify.innerHTML =
              '<svg width="15" height="15" aria-hidden="true"><use href="#i-edit"/></svg> Modify'
            btn.parentNode.insertBefore(modify, btn)
          })

          /* the general actions sit behind whatever this record is doing */
          d.querySelectorAll('.lbtn[data-act="Save"]').forEach(btn => {
            const row = btn.parentNode
            const host = document.createElement('span')
            host.className = 'recacts'
            host.innerHTML =
              '<span class="vsep" data-role="gensep"></span>' +
              '<span class="newwrap menu">' +
              '<button class="lbtn out main" data-act="New"><svg width="15" height="15" aria-hidden="true"><use href="#i-plus"/></svg> New</button>' +
              '<button class="car" aria-haspopup="menu" aria-expanded="false" aria-label="Other things to create">' +
              '<svg width="11" height="11" aria-hidden="true"><use href="#i-caret"/></svg></button>' +
              '<div class="mlist mend" role="menu" style="min-width:230px">' +
              '<div class="grp-lbl">This screen</div>' +
              '<button role="menuitem" data-act="Add From">Add From</button>' +
              '<button role="menuitem" data-act="New in new tab"><svg width="14" height="14" aria-hidden="true"><use href="#i-next"/></svg> Open in new tab</button>' +
              '</div>' +
              '</span>' +
              '<button class="lbtn out danger" data-act="Delete"><svg width="15" height="15" aria-hidden="true"><use href="#i-trash"/></svg> Delete</button>'
            const undo = row.querySelector('[data-act="Undo"]')
            ;(undo || btn).after(host)
          })
          d.querySelectorAll('.lbtn[data-act="Save"]').forEach(btn => {
            const wrap = document.createElement('span')
            wrap.className = 'savewrap menu'
            btn.parentNode.insertBefore(wrap, btn)
            wrap.appendChild(btn)
            btn.classList.add('main')
            const car = document.createElement('button')
            car.className = 'car'
            car.setAttribute('aria-haspopup', 'menu')
            car.setAttribute('aria-expanded', 'false')
            car.setAttribute('aria-label', 'Other ways to save')
            car.innerHTML =
              '<svg width="11" height="11" aria-hidden="true"><use href="#i-caret"/></svg>'
            const list = document.createElement('div')
            list.className = 'mlist mend'
            list.setAttribute('role', 'menu')
            list.style.minWidth = '210px'
            list.innerHTML =
              '<button role="menuitem" data-save="new">Save and start another</button>' +
              '<button role="menuitem" data-save="close">Save and go to the list</button>'
            wrap.append(car, list)
            const chip = document.createElement('span')
            chip.className = 'reqchip'
            chip.hidden = true
            wrap.parentNode.insertBefore(chip, wrap)
          })
          /* lives in the footer next to "Record N of N" instead of its own
     full-width banner above the canvas, or crowding the title row — same
     always-visible reason, without spending a row on it anywhere. Scoped to
     the record page's own .fnav (a direct .content child) so it doesn't also
     attach to the List page's unrelated ".pos" (page count), which lives
     inside .list-view instead. */
          d.querySelectorAll('.content > .fnav .pos').forEach(p => {
            const bar = document.createElement('span')
            bar.className = 'lockbanner'
            bar.hidden = true
            bar.innerHTML =
              '<svg width="13" height="13" aria-hidden="true"><use href="#i-lock"/></svg><span></span>'
            p.after(bar)
          })
          d.querySelectorAll('.pager-mount').forEach(m => {
            const b = document.createElement('button')
            b.className = 'backlist'
            b.hidden = true
            b.innerHTML =
              '<svg width="14" height="14" aria-hidden="true"><use href="#i-prev"/></svg> Back to the invoice list'
            m.parentNode.insertBefore(b, m.nextSibling)
          })
        })

        /* ================= menus ================= */
        const closeAllMenus = except =>
          document.querySelectorAll('.menu > button[aria-expanded="true"]').forEach(b => {
            if (b !== except) {
              b.setAttribute('aria-expanded', 'false')
              b.parentElement.querySelector('.mlist').classList.remove('open')
            }
          })
        const enabledMenuItems = list =>
          [...list.querySelectorAll('[role^="menuitem"]')].filter(item => !item.disabled)
        function openMenuFromKeyboard(trigger, edge) {
          const list = trigger.parentElement.querySelector('.mlist')
          closeAllMenus(trigger)
          trigger.setAttribute('aria-expanded', 'true')
          list.classList.add('open')
          if (list.classList.contains('app-switcher-list')) positionFixedMenu(trigger, list)
          const items = enabledMenuItems(list)
          items.forEach(item => (item.tabIndex = -1))
          ;(edge === 'last' ? items.at(-1) : items[0])?.focus()
        }
        function closeMenuAndRestoreFocus(trigger) {
          trigger.setAttribute('aria-expanded', 'false')
          trigger.parentElement.querySelector('.mlist').classList.remove('open')
          trigger.focus()
        }
        document.addEventListener('keydown', event => {
          const trigger = event.target.closest('.menu > button[aria-haspopup="menu"]')
          if (trigger && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault()
            openMenuFromKeyboard(trigger, event.key === 'ArrowUp' ? 'last' : 'first')
            return
          }
          const list = event.target.closest('.mlist[role="menu"]')
          if (!list) return
          const owner = list.parentElement.querySelector(':scope > button[aria-haspopup="menu"]')
          if (event.key === 'Escape') {
            event.preventDefault()
            closeMenuAndRestoreFocus(owner)
            return
          }
          if (event.key === 'Tab') {
            owner.setAttribute('aria-expanded', 'false')
            list.classList.remove('open')
            return
          }
          const items = enabledMenuItems(list)
          if (!items.length) return
          const current = items.indexOf(document.activeElement)
          let next = current
          if (event.key === 'ArrowDown') next = (current + 1) % items.length
          else if (event.key === 'ArrowUp') next = (current - 1 + items.length) % items.length
          else if (event.key === 'Home') next = 0
          else if (event.key === 'End') next = items.length - 1
          else return
          event.preventDefault()
          items[next]?.focus()
        })
        document.addEventListener('click', e => {
          const switcherBtn = e.target.closest('.app-switcher-menu > button')
          if (switcherBtn) {
            const fbody = switcherBtn.closest('.design').querySelector('.fbody')
            showLaunchpad(fbody, {mode: 'switcher', returnFocus: switcherBtn})
            return
          }
          const trg = e.target.closest('.menu > button[aria-haspopup]')
          if (trg) {
            const l = trg.parentElement.querySelector('.mlist')
            const open = trg.getAttribute('aria-expanded') === 'true'
            closeAllMenus(trg)
            trg.setAttribute('aria-expanded', String(!open))
            l.classList.toggle('open', !open)
            if (!open && l.classList.contains('app-switcher-list')) positionFixedMenu(trg, l)
            return
          }
          if (!e.target.closest('.menu')) closeAllMenus()
        })
        /* the app switcher's trigger sits inside the sidebar's own stacking context, so a
   plain position:absolute popover gets visually clipped/buried under the rail and
   panel — anchoring it with position:fixed from the trigger's own rect escapes that entirely */
        function positionFixedMenu(trigger, list) {
          const r = trigger.getBoundingClientRect()
          list.style.position = 'fixed'
          list.style.insetInlineStart = r.left + 'px'
          list.style.insetInlineEnd = 'auto'
          list.style.top = r.bottom + 4 + 'px'
        }

        /* ================= pagers ================= */
        document.querySelectorAll('.pager').forEach(root => {
          const input = root.querySelector('.pg-i')
          const total = Number(input.max)
          input.dir = 'ltr'
          let index = 1
          const position = root.closest('.design')?.querySelector('.pos')
          const pager = createRecordPager({root, getPosition: () => ({index, total}), onNavigate: value => {
            index = value
            pager.sync()
            if (position) position.textContent = `Record ${index} of ${total}`
          }})
          pager.sync()
          if (position) position.textContent = `Record ${index} of ${total}`
        })

        /* ================= status popover ================= */
        const pop = document.getElementById('stpop')
        const reached = id =>
          state.mode === 'create'
            ? false
            : id === 'entry' || id === 'modified' || id === state.status
        const renderPop = () => {
          const creating = state.mode === 'create'
          const n = CHAIN.filter(c => reached(c.id)).length
          pop.querySelector('h4').textContent = creating
            ? 'Nothing recorded yet'
            : 'Document status'
          pop.querySelector('.sub').textContent = creating
            ? 'Starts when you save'
            : `${n} of ${CHAIN.length} steps recorded`
          let lead = pop.querySelector('.poplead')
          if (!lead) {
            lead = document.createElement('p')
            lead.className = 'poplead'
            pop.querySelector('.rows').before(lead)
          }
          lead.hidden = !creating
          lead.textContent =
            'This invoice has never been saved, so the system has recorded nothing about it. Saving writes the first line — who entered it and when — and the rest follows as the invoice moves.'
          /* the full history is a stored thing; there is none yet */
          const histBtn = pop.querySelector('.ft button')
          histBtn.disabled = creating
          histBtn.title = creating ? 'Save the invoice first — it has no history yet' : ''
          pop.querySelector('.rows').innerHTML = CHAIN.map(c => {
            const on = reached(c.id),
              cur = !creating && c.id === state.status
            const cls = on ? (cur ? 'cur' : 'done') : 'off'
            const icon =
              on && !cur ? '<svg width="11" height="11"><use href="#i-check"/></svg>' : ''
            const badge = cur ? '<span class="badge ok">Current</span>' : ''
            const meta = on
              ? `${c.who} · ${c.when}${c.dur ? ' · took ' + c.dur : ''}`
              : creating
                ? 'Not yet'
                : 'Never happened on this invoice'
            const link = on && c.link ? `<a class="lnk" href="#">${c.link} →</a>` : ''
            return `<div class="strow ${cls}"><span class="stdot2">${icon}</span>
      <div><div class="t">${c.name}${badge}<span class="tag-derived">derived</span></div>
      <div class="m">${meta}</div>${link}</div></div>`
          }).join('')
        }
        const closePop = () => {
          pop.classList.remove('open')
          document
            .querySelectorAll('.stpill[aria-expanded="true"]')
            .forEach(b => b.setAttribute('aria-expanded', 'false'))
        }
        document.addEventListener('click', e => {
          const pill = e.target.closest('.stpill')
          if (pill) {
            const open = pop.classList.contains('open')
            closePop()
            if (!open) {
              renderPop()
              pop.classList.add('open')
              pill.setAttribute('aria-expanded', 'true')
              const r = pill.getBoundingClientRect(),
                h = pop.offsetHeight
              pop.style.top =
                (r.bottom + 8 + h <= innerHeight - 12
                  ? r.bottom + 8
                  : Math.max(12, r.top - h - 8)) + 'px'
              pop.style.left = Math.max(12, Math.min(innerWidth - 364, r.left)) + 'px'
            }
            e.stopPropagation()
          } else if (!e.target.closest('#stpop')) closePop()
        })

        /* ================= drawer ================= */
        const {drawer, renderCards, renderActivity, openDrawer, closeDrawer} = createInvoiceActivity({state,trapFocus,releaseFocus,closePop,closeAllMenus})
        /* ================= print dialog ================= */
        const {pscrim, openPrintSettings, doPrint} = createInvoicePrint({state, trapFocus, releaseFocus, closeAllMenus, runWork, toast, clearInlineError: (...args) => clearInlineError(...args), showInlineError: (...args) => showInlineError(...args), applyState: () => applyState()})
        /* ================= search ================= */
        let sScope = 'all',
          sSel = 0,
          sRows = [],
          sScreensLocked = false
        const esc = s => s.replace(/[&<>]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'})[c])
        const hi = (t, q) => {
          if (!q) return esc(t)
          const i = t.toLowerCase().indexOf(q)
          return i < 0
            ? esc(t)
            : esc(t.slice(0, i)) +
                '<mark>' +
                esc(t.slice(i, i + q.length)) +
                '</mark>' +
                esc(t.slice(i + q.length))
        }
        const activePanel = () => document.querySelector('.design.active .spanel')
        const activeInput = () => activePanel().querySelector('input')
        const activeList = () => activePanel().querySelector('.slist')
        const renderSearch = () => {
          document.querySelectorAll('.sctx').forEach(c => {
            const b = c.querySelector('b')
            if (!b) return
            b.nextSibling &&
              (b.nextSibling.textContent =
                state.mode === 'create' ? ' · new invoice, not saved yet' : ' · 001000352026126')
          })
          const q = activeInput().value.trim().toLowerCase()
          const m = x =>
            !q || x.t.toLowerCase().includes(q) || (x.s || '').toLowerCase().includes(q)
          /* the command row doesn't grey these out, it removes them — the palette matches:
     Modify only while reading, Save/Undo only while writing, same as .recacts */
          const showSave = state.mode === 'create' || state.mode === 'edit'
          const inMode = x => {
            if (x.t === 'Modify') return !showSave
            if (x.t === 'Save' || x.t === 'Undo') return showSave
            if (x.t === 'Delete') return state.mode !== 'create'
            return true
          }
          const groups = []
          if (sScope === 'all' || sScope === 'actions') {
            const acts = ACTIONS.filter(m)
              .filter(inMode)
              .map(a => ({...a, kind: 'action', off: blocked(a.t)}))
            const on = acts.filter(a => !a.off),
              off = acts.filter(a => a.off)
            if (on.length)
              groups.push({g: 'Do on this invoice', items: on.slice(0, sScope === 'all' ? 5 : 99)})
            if (off.length && (q || sScope === 'actions'))
              groups.push({g: 'Unavailable right now', items: off, dim: true})
          }
          if (sScope === 'all' || sScope === 'screens') {
            const it = SCREENS.filter(m).map(x => ({...x, kind: 'screen'}))
            if (it.length)
              groups.push({g: 'Go to screen', items: it.slice(0, sScope === 'all' ? 5 : 99)})
          }
          if (sScope === 'all' || sScope === 'records') {
            const it = RECORDS.filter(m).map(x => ({...x, kind: 'record'}))
            if (it.length)
              groups.push({g: 'Open record', items: it.slice(0, sScope === 'all' ? 4 : 99)})
          }
          sRows = []
          const list = activeList()
          if (!groups.length) {
            list.innerHTML = `<div class="sempty"><b>Nothing matches “${esc(activeInput().value)}”</b>Try a document number, a customer name, or an action such as “Posting”.</div>`
            return
          }
          list.innerHTML = groups
            .map(gr => {
              const rows = gr.items
                .map(it => {
                  const i = sRows.push(it) - 1
                  return `<button class="sitem" role="option" data-i="${i}" ${gr.dim ? 'disabled' : ''}>
        <span class="ic"><svg width="14" height="14"><use href="#${it.icon}"/></svg></span>
        <span class="tx"><span class="t">${hi(it.t, q)}</span>
        ${gr.dim ? `<span class="why">${it.off}</span>` : it.s ? `<span class="s">${hi(it.s, q)}</span>` : ''}</span>
        ${it.kbd && !gr.dim ? `<span class="kbd">${it.kbd}</span>` : ''}</button>`
                })
                .join('')
              return `<div class="sgrp">${gr.g}<span class="c">${gr.items.length}</span></div>${rows}`
            })
            .join('')
          sSel = 0
          markSel()
        }
        const markSel = () => {
          const items = [...activeList().querySelectorAll('.sitem:not(:disabled)')]
          items.forEach((el, i) => el.classList.toggle('sel', i === sSel))
          items[sSel]?.scrollIntoView({block: 'nearest'})
        }
        const runSearch = () => {
          const items = [...activeList().querySelectorAll('.sitem:not(:disabled)')]
          const el = items[sSel]
          if (!el) return
          const it = sRows[+el.dataset.i]
          closeSearch()
          if (it.run === 'print') {
            openPrintSettings()
            return
          }
          if (it.run === 'favorite') {
            document.querySelector('.fav-toggle')?.click()
            return
          }
          if (it.run === 'stages' || it.run === 'activity') {
            openDrawer(it.run)
            return
          }
          if (ACT_DLG[it.t]) {
            openRDlg(ACT_DLG[it.t])
            return
          }
          if (it.kind === 'action') runAction(it.t)
          /* screens/records: opening them is out of scope for this shell prototype */ else
            toast({
              tone: 'ok',
              title: it.t,
              body: 'Opening this is out of scope for the app-shell prototype.',
            })
        }
        const openSearch = (screensOnly = false) => {
          document.querySelectorAll('.search-typing-label').forEach(label => {
            stopSearchTyping(label.closest('.lp-view, .gtop'))
          })
          const p = activePanel()
          p.classList.add('open')
          p.classList.toggle('screens-only', screensOnly)
          p.closest('.swrap').classList.add('open')
          document.getElementById('sscrim').classList.add('open')
          activeInput().value = ''
          sScope = screensOnly ? 'screens' : 'all'
          sScreensLocked = screensOnly
          p.querySelectorAll('.sscope button').forEach(b =>
            b.setAttribute('aria-pressed', String(b.dataset.scope === sScope))
          )
          renderSearch()
          activeInput().focus()
        }
        const closeSearch = () => {
          document.querySelectorAll('.spanel.open').forEach(p => {
            p.classList.remove('open')
            p.closest('.swrap').classList.remove('open')
          })
          document.getElementById('sscrim').classList.remove('open')
          document.querySelectorAll('.search-typing-label').forEach(startSearchTyping)
        }
        const sscrim = document.createElement('div')
        sscrim.className = 'sscrim'
        sscrim.id = 'sscrim'
        document.body.append(sscrim)
        sscrim.addEventListener('click', closeSearch)
        document.addEventListener('click', e => {
          const opener = e.target.closest('.s-open')
          if (opener) openSearch(opener.classList.contains('lp-search'))
          const it = e.target.closest('.sitem:not(:disabled)')
          if (it) {
            sSel = [...activeList().querySelectorAll('.sitem:not(:disabled)')].indexOf(it)
            runSearch()
          }
        })
        document.addEventListener('mouseover', e => {
          const it = e.target.closest('.sitem:not(:disabled)')
          if (!it) return
          const items = [...activeList().querySelectorAll('.sitem:not(:disabled)')]
          const i = items.indexOf(it)
          if (i < 0 || i === sSel) return
          sSel = i
          markSel()
        })
        document
          .querySelectorAll('.spanel input')
          .forEach(i => i.addEventListener('input', renderSearch))
        document.querySelectorAll('.sscope button').forEach(b =>
          b.addEventListener('click', () => {
            sScope = b.dataset.scope
            b.parentElement
              .querySelectorAll('button')
              .forEach(x => x.setAttribute('aria-pressed', String(x === b)))
            renderSearch()
            activeInput().focus()
          })
        )
        document.querySelectorAll('.spanel input').forEach(inp =>
          inp.addEventListener('keydown', e => {
            const n = activeList().querySelectorAll('.sitem:not(:disabled)').length
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              sSel = (sSel + 1) % n
              markSel()
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              sSel = (sSel - 1 + n) % n
              markSel()
            }
            if (e.key === 'Enter') {
              e.preventDefault()
              runSearch()
            }
            if (e.key === 'Tab' && !sScreensLocked) {
              e.preventDefault()
              const o = ['all', 'screens', 'records', 'actions']
              activePanel()
                .querySelector(`.sscope button[data-scope=${o[(o.indexOf(sScope) + 1) % 4]}]`)
                .click()
            }
          })
        )

        /* ================= design 4 panel toggle ================= */
        document.querySelectorAll('.panel-toggle').forEach(t =>
          t.addEventListener('click', () => {
            const d = t.closest('.design')
            const c = d.classList.toggle('collapsed')
            t.setAttribute('aria-expanded', String(!c))
            t.setAttribute('aria-label', c ? 'Show context panel' : 'Hide context panel')
          })
        )

        /* ================= record dialogs ================= */
        const {requestLeave: requestInvoiceLeave, rscrim, openRDlg, closeRDlg, showInlineError, clearInlineError, doSave, runAction, applyState, gscrim, atRisk, askGuard, runGuarded, modeSel, applyMode} = createInvoiceOperations({t, trapFocus, state, releaseFocus, closeAllMenus, closeSearch, getLocale, encodeHtml, blocked, toast, runWork, doPrint, openSearch: (...args) => openSearch(...args), STATUSES, CHAIN, reached: (...args) => reached(...args), editable, LOCK_COPY, pop, renderPop: (...args) => renderPop(...args), drawer, renderCards, renderSearch: (...args) => renderSearch(...args)})
        /* ================= keyboard: the shortcuts we advertise actually run ================= */
        const kscrim = document.getElementById('kscrim')
        const openKbd = () => {
          kscrim.classList.add('open')
          trapFocus(kscrim.querySelector('.kbdsheet'))
        }
        const closeKbd = () => {
          if (kscrim.classList.contains('open')) {
            kscrim.classList.remove('open')
            releaseFocus()
          }
        }
        kscrim.addEventListener('click', e => {
          if (e.target === kscrim || e.target.closest('.k-close')) closeKbd()
        })
        document.addEventListener('click', e => {
          if (e.target.closest('[data-act="Help"]')) {
            closeAllMenus()
            openKbd()
          }
        })

        /* ---- "Customize your sidebar": build "For You" groups by dragging screens
   (or whole apps, flattened to their screens) from the left tree into groups
   on the right — edits a draft, only Save commits it to forYouGroups ---- */
        const cscrim = document.getElementById('cscrim')
        const csTree = document.getElementById('cs-tree')
        const csGroupsEl = document.getElementById('cs-groups')
        const csCount = document.getElementById('cs-count')
        /* draft shape mirrors forYouGroups: [{name, items:[{label, appLabel}]}] */
        let csDraft = []
        let csGroupSeq = 0
        const csSyncCount = () => {
          const n = csDraft.reduce((sum, g) => sum + g.items.length, 0)
          csCount.textContent = `${csDraft.length} group${csDraft.length === 1 ? '' : 's'}, ${n} screen${n === 1 ? '' : 's'}`
        }

        /* ---- left column: read-only tree, every row a drag source. Rows whose
   screens are already in some group are disabled — a screen can only live in
   one group at a time, so re-dragging it in isn't a choice worth offering. */
        let csTreeRows = [] /* {el, screens} for every row, refreshed on each tree build */
        const csTreeRow = (label, depth, icon, dragPayload) => {
          const li = document.createElement('li')
          li.className = 'cs-tree-row'
          li.dataset.depth = depth
          li.draggable = true
          li.innerHTML =
            (depth === 0
              ? `<span class="cs-icn"><svg width="14" height="14" aria-hidden="true"><use href="#${icon}"/></svg></span>`
              : '<span class="cs-expand-spacer"></span>') + '<span class="cs-lbl"></span>'
          li.querySelector('.cs-lbl').textContent = label
          li.addEventListener('dragstart', e => {
            if (li.classList.contains('disabled')) {
              e.preventDefault()
              return
            }
            e.dataTransfer.effectAllowed = 'copy'
            e.dataTransfer.setData('application/json', JSON.stringify(dragPayload))
            requestAnimationFrame(() => li.classList.add('dragging'))
          })
          li.addEventListener('dragend', () => li.classList.remove('dragging'))
          csTreeRows.push({el: li, screens: dragPayload.screens})
          return li
        }
        /* a row is disabled once every screen it represents is already used —
   a single unused screen inside an otherwise-placed app keeps that app's own
   row draggable, since dropping it would still add something new */
        const csSyncTreeDisabled = () => {
          const used = new Set(csDraft.flatMap(g => g.items.map(it => it.label)))
          csTreeRows.forEach(({el, screens}) => {
            const allUsed = screens.every(s => used.has(s))
            el.classList.toggle('disabled', allUsed)
            el.draggable = !allUsed
          })
        }
        const csRenderTree = () => {
          csTree.innerHTML = ''
          csTreeRows = []
          NAV_TREE.forEach(group => {
            const appLabel = group[0]
            const kids = childrenOf(group)
            const row = csTreeRow(appLabel, 0, NAV_ICONS[appLabel] || 'i-doc', {
              appLabel,
              screens: leavesOf(group),
            })
            const li = document.createElement('li')
            li.appendChild(row)
            if (kids.length) {
              const expand = document.createElement('button')
              expand.type = 'button'
              expand.className = 'cs-expand'
              expand.setAttribute('aria-expanded', 'false')
              expand.setAttribute('aria-label', 'Show screens')
              expand.innerHTML =
                '<svg width="11" height="11" aria-hidden="true"><use href="#i-caret"/></svg>'
              row.insertBefore(expand, row.firstChild)
              const sub = document.createElement('ul')
              sub.className = 'cs-tree-sub'
              sub.hidden = true
              const addLeaves = (entry, depth) => {
                const entryLabel = Array.isArray(entry) ? entry[0] : entry
                const entryKids = childrenOf(entry)
                if (!entryKids.length) {
                  sub.appendChild(
                    csTreeRow(entryLabel, depth, null, {appLabel, screens: [entryLabel]})
                  )
                } else {
                  sub.appendChild(
                    csTreeRow(entryLabel, depth, null, {appLabel, screens: leavesOf(entry)})
                  )
                  entryKids.forEach(k => addLeaves(k, depth + 1))
                }
              }
              kids.forEach(k => addLeaves(k, 1))
              expand.addEventListener('click', () => {
                sub.hidden = !sub.hidden
                expand.setAttribute('aria-expanded', String(!sub.hidden))
              })
              csTree.append(li, sub)
            } else {
              csTree.appendChild(li)
            }
          })
          csSyncTreeDisabled()
        }

        /* ---- right column: the user's groups — name, drag-reorderable items, drag-reorderable groups ---- */
        let csItemDragSrc =
          null /* {group, index} while dragging an existing item within/between groups */
        let csGroupDragLabel = null /* group id while dragging a group card to reorder */

        const csRenderItem = (group, item, index) => {
          const li = document.createElement('li')
          li.className = 'cs-group-item'
          li.draggable = true
          li.innerHTML = `<span class="cs-grip">⋮⋮</span><span class="cs-item-lbl"></span><span class="cs-item-app"></span><button type="button" class="cs-item-del" aria-label="Remove"><svg width="11" height="11" aria-hidden="true"><use href="#i-x"/></svg></button>`
          li.querySelector('.cs-item-lbl').textContent = item.label
          li.querySelector('.cs-item-app').textContent = item.appLabel
          li.querySelector('.cs-item-del').addEventListener('click', () => {
            group.items.splice(index, 1)
            csRenderGroups()
          })
          li.addEventListener('dragstart', e => {
            e.stopPropagation()
            csItemDragSrc = {group, index}
            e.dataTransfer.effectAllowed = 'move'
            requestAnimationFrame(() => li.classList.add('dragging'))
          })
          li.addEventListener('dragend', () => {
            csItemDragSrc = null
            li.classList.remove('dragging')
          })
          /* dropping directly on another item inserts at that item's position,
     instead of falling through to the group-level drop which only appends —
     this is what actually lets items be reordered within a group */
          li.addEventListener('dragover', e => {
            if (csGroupDragLabel) return
            e.preventDefault()
            e.stopPropagation()
          })
          li.addEventListener('drop', e => {
            if (csGroupDragLabel) return
            e.preventDefault()
            e.stopPropagation()
            const targetIndex = group.items.indexOf(item)
            if (csItemDragSrc) {
              const {group: srcGroup, index: srcIndex} = csItemDragSrc
              const [moved] = srcGroup.items.splice(srcIndex, 1)
              /* removing the dragged item from its own group can shift the target's
         position left by one — reorder relative to where the target item now sits */
              const insertAt =
                srcGroup === group && srcIndex < targetIndex ? targetIndex - 1 : targetIndex
              group.items.splice(insertAt, 0, moved)
              csItemDragSrc = null
            } else {
              const json = e.dataTransfer.getData('application/json')
              if (!json) return
              const {appLabel, screens} = JSON.parse(json)
              const existing = new Set(group.items.map(it => it.label))
              const fresh = screens.filter(label => !existing.has(label))
              group.items.splice(targetIndex, 0, ...fresh.map(label => ({label, appLabel})))
            }
            csRenderGroups()
          })
          return li
        }

        /* groups collapsed by the user stay collapsed across a re-render — keyed by
   id since a plain index would drift as groups are added/removed/reordered */
        let csCollapsedGroups = new Set()

        const csRenderGroups = () => {
          csGroupsEl.innerHTML = ''
          csDraft.forEach(group => {
            const li = document.createElement('li')
            li.className = 'cs-group'
            li.dataset.gid = group.id
            const collapsed = csCollapsedGroups.has(group.id)
            const hd = document.createElement('div')
            hd.className = 'cs-group-hd'
            hd.innerHTML =
              `<span class="cs-grip">⋮⋮</span>` +
              `<button type="button" class="cs-group-expand" aria-expanded="${!collapsed}" aria-label="${collapsed ? 'Expand' : 'Collapse'} group"><svg width="11" height="11" aria-hidden="true"><use href="#i-caret"/></svg></button>` +
              `<input class="cs-group-name" type="text" aria-label="Group name">` +
              `<span class="cs-group-tally"></span>` +
              `<button type="button" class="cs-group-del" aria-label="Delete group"><svg width="12" height="12" aria-hidden="true"><use href="#i-x"/></svg></button>`
            const nameInput = hd.querySelector('.cs-group-name')
            nameInput.value = group.name
            nameInput.addEventListener('input', () => (group.name = nameInput.value))
            hd.querySelector('.cs-group-tally').textContent = group.items.length
            hd.querySelector('.cs-group-del').addEventListener('click', () => {
              csDraft = csDraft.filter(g => g.id !== group.id)
              csRenderGroups()
            })
            hd.querySelector('.cs-grip').draggable = true
            hd.querySelector('.cs-grip').addEventListener('dragstart', e => {
              csGroupDragLabel = group.id
              e.dataTransfer.effectAllowed = 'move'
              requestAnimationFrame(() => li.classList.add('dragging'))
            })
            hd.querySelector('.cs-grip').addEventListener('dragend', () => {
              csGroupDragLabel = null
              li.classList.remove('dragging')
              /* the live DOM moves during dragover only reordered elements — commit
         that final order back into csDraft once, instead of on every tick */
              csDraft = [...csGroupsEl.querySelectorAll('.cs-group')]
                .map(el => csDraft.find(g => g.id === el.dataset.gid))
                .filter(Boolean)
              csSyncTreeDisabled()
            })

            const itemsList = document.createElement('ul')
            itemsList.className = 'cs-group-items'
            itemsList.hidden = collapsed
            group.items.forEach((item, i) => itemsList.appendChild(csRenderItem(group, item, i)))

            hd.querySelector('.cs-group-expand').addEventListener('click', () => {
              const nowCollapsed = !itemsList.hidden
              itemsList.hidden = nowCollapsed
              hd.querySelector('.cs-group-expand').setAttribute(
                'aria-expanded',
                String(!nowCollapsed)
              )
              hd.querySelector('.cs-group-expand').setAttribute(
                'aria-label',
                (nowCollapsed ? 'Expand' : 'Collapse') + ' group'
              )
              if (nowCollapsed) csCollapsedGroups.add(group.id)
              else csCollapsedGroups.delete(group.id)
            })

            /* drop target: a screen dragged from the left tree, or an existing item
       being moved from another group (or reordered within this one) */
            li.addEventListener('dragover', e => {
              if (!csGroupDragLabel) e.preventDefault()
              li.classList.add('drop-target')
            })
            li.addEventListener('dragleave', () => li.classList.remove('drop-target'))
            li.addEventListener('drop', e => {
              li.classList.remove('drop-target')
              if (csGroupDragLabel)
                return /* group cards are reordered by the outer list, not dropped into one another */
              e.preventDefault()
              if (csItemDragSrc) {
                const [moved] = csItemDragSrc.group.items.splice(csItemDragSrc.index, 1)
                group.items.push(moved)
                csItemDragSrc = null
              } else {
                const json = e.dataTransfer.getData('application/json')
                if (!json) return
                const {appLabel, screens} = JSON.parse(json)
                const existing = new Set(group.items.map(it => it.label))
                screens
                  .filter(label => !existing.has(label))
                  .forEach(label => group.items.push({label, appLabel}))
              }
              csRenderGroups()
            })

            li.append(hd, itemsList)
            csGroupsEl.appendChild(li)
          })
          csSyncCount()
          csSyncTreeDisabled()
        }
        /* group-card reordering moves the dragged element directly in the DOM as the
   pointer passes over a neighbor — the same lightweight, no-rebuild feel as
   dragging an item within a group — and only reconciles csDraft's order once,
   on dragend (see the .cs-grip dragend handler above) */
        csGroupsEl.addEventListener('dragover', e => {
          if (!csGroupDragLabel) return
          e.preventDefault()
          const dragging = csGroupsEl.querySelector('.cs-group.dragging')
          const over = e.target.closest('.cs-group')
          if (!dragging || !over || over === dragging) return
          const rect = over.getBoundingClientRect()
          const before = e.clientY < rect.top + rect.height / 2
          over.parentElement.insertBefore(dragging, before ? over : over.nextSibling)
        })

        document.getElementById('cs-add-group').addEventListener('click', () => {
          csGroupSeq += 1
          csDraft.push({id: 'g' + csGroupSeq, name: 'New group', items: []})
          csRenderGroups()
          csGroupsEl.querySelector('.cs-group:last-child .cs-group-name')?.select()
        })

        /* ---- Appearance dialog: drives the same real controls as the
           Prototype controls panel (#theme, #high-contrast, #density,
           #content-layout) so every existing theme/chart-refresh/density
           behavior fires unchanged — this dialog holds no parallel state. */
        const appearanceScrim = document.getElementById('appearance-scrim')
        const appearanceHighContrast = document.getElementById('appearance-high-contrast')
        const appearanceCustomColor = document.getElementById('appearance-custom-color')
        const appearanceCustomHex = document.getElementById('appearance-custom-hex')
        const appearanceCustomError = document.getElementById('appearance-custom-error')
        const appearanceCustomGroup = document.querySelector('[data-custom-accent]')
        const appearanceReset = document.getElementById('appearance-reset')
        const appearanceAccentState = {
          kind: 'preset',
          light: '#1868DB',
          dark: '#669DF1',
          seed: '#1868DB',
        }
        function clearCustomAccentError() {
          appearanceCustomHex.removeAttribute('aria-invalid')
          appearanceCustomError.textContent = ''
        }
        function commitCustomAccent(value) {
          const seed = normalizeHexColor(value)
          if (!seed) {
            appearanceCustomHex.setAttribute('aria-invalid', 'true')
            appearanceCustomError.textContent = 'Enter a 3- or 6-digit hex color.'
            return false
          }
          const pair = deriveAccentPair(seed)
          Object.assign(appearanceAccentState, {kind: 'custom', seed, ...pair})
          clearCustomAccentError()
          applyAppearanceAccent()
          syncAppearanceDialog()
          return true
        }
        function syncAppearanceChoices(selector, dataKey, selectedValue) {
          document.querySelectorAll(selector).forEach(card => {
            const selected = card.dataset[dataKey] === selectedValue
            card.setAttribute('aria-checked', String(selected))
            card.tabIndex = selected ? 0 : -1
          })
        }
        function syncAppearanceDialog() {
          const isDark = document.documentElement.dataset.colorMode === 'dark'
          document.querySelectorAll('.accent-swatch').forEach((swatch, index) => {
            const hex = isDark ? swatch.dataset.accentDark : swatch.dataset.accent
            swatch.style.setProperty('--sw', hex)
            const selected =
              appearanceAccentState.kind === 'preset' &&
              swatch.dataset.accent.toUpperCase() === appearanceAccentState.light
            swatch.setAttribute(
              'aria-checked',
              String(selected)
            )
            swatch.tabIndex = selected || (appearanceAccentState.kind === 'custom' && index === 0) ? 0 : -1
          })
          appearanceCustomColor.value = appearanceAccentState.seed.toLowerCase()
          if (!appearanceCustomHex.hasAttribute('aria-invalid')) {
            appearanceCustomHex.value = appearanceAccentState.seed
          }
          appearanceCustomGroup.style.setProperty('--custom-accent', appearanceAccentState.seed)
          appearanceCustomGroup.dataset.selected = String(appearanceAccentState.kind === 'custom')
          syncAppearanceChoices('[data-appearance-theme]', 'appearanceTheme', themeSelect.value)
          syncAppearanceChoices(
            '[data-appearance-layout]',
            'appearanceLayout',
            document.getElementById('content-layout').value
          )
          syncAppearanceChoices(
            '[data-appearance-density]',
            'appearanceDensity',
            document.getElementById('density').value
          )
          appearanceHighContrast.checked = highContrastToggle.checked
        }
        const openAppearance = () => {
          syncAppearanceDialog()
          appearanceScrim.classList.add('open')
          trapFocus(appearanceScrim.querySelector('.dlg'))
        }
        const closeAppearance = () => {
          if (appearanceScrim.classList.contains('open')) {
            appearanceScrim.classList.remove('open')
            releaseFocus()
          }
        }
        appearanceScrim.addEventListener('click', e => {
          if (e.target === appearanceScrim || e.target.closest('.c-close')) closeAppearance()
        })
        document.querySelectorAll('.accent-swatch').forEach(swatch =>
          swatch.addEventListener('click', () => {
            Object.assign(appearanceAccentState, {
              kind: 'preset',
              seed: swatch.dataset.accent.toUpperCase(),
              light: swatch.dataset.accent.toUpperCase(),
              dark: swatch.dataset.accentDark.toUpperCase(),
            })
            clearCustomAccentError()
            applyAppearanceAccent()
            syncAppearanceDialog()
          })
        )
        appearanceCustomColor.addEventListener('input', e => commitCustomAccent(e.target.value))
        appearanceCustomHex.addEventListener('change', e => commitCustomAccent(e.target.value))
        appearanceCustomHex.addEventListener('keydown', e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commitCustomAccent(e.currentTarget.value)
          }
          if (e.key === 'Escape') {
            e.preventDefault()
            e.currentTarget.value = appearanceAccentState.seed
            clearCustomAccentError()
          }
        })
        document.querySelectorAll('[data-appearance-theme]').forEach(card =>
          card.addEventListener('click', () => {
            themeSelect.value = card.dataset.appearanceTheme
            themeSelect.dispatchEvent(new Event('change'))
            syncAppearanceDialog()
          })
        )
        function bindAppearanceRadioKeys(group, selector) {
          group.addEventListener('keydown', e => {
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
            const current = e.target.closest(selector)
            if (!current) return
            e.preventDefault()
            const items = [...group.querySelectorAll(selector)]
            const direction = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1
            const next = items[(items.indexOf(current) + direction + items.length) % items.length]
            next.focus()
            next.click()
          })
        }
        bindAppearanceRadioKeys(
          document.querySelector('.appearance-theme-grid'),
          '[data-appearance-theme]'
        )
        bindAppearanceRadioKeys(
          document.querySelector('.accent-swatches'),
          '.accent-swatch[role="radio"]'
        )
        bindAppearanceRadioKeys(
          document.querySelector('.appearance-layout-grid'),
          '[data-appearance-layout]'
        )
        bindAppearanceRadioKeys(
          document.querySelector('.appearance-density-grid'),
          '[data-appearance-density]'
        )
        document.querySelectorAll('[data-appearance-layout]').forEach(card =>
          card.addEventListener('click', () => {
            const layoutSelect = document.getElementById('content-layout')
            layoutSelect.value = card.dataset.appearanceLayout
            layoutSelect.dispatchEvent(new Event('change'))
            syncAppearanceDialog()
          })
        )
        document.querySelectorAll('[data-appearance-density]').forEach(card =>
          card.addEventListener('click', () => {
            const densitySelect = document.getElementById('density')
            densitySelect.value = card.dataset.appearanceDensity
            densitySelect.dispatchEvent(new Event('change'))
            syncAppearanceDialog()
          })
        )
        appearanceHighContrast.addEventListener('change', e => {
          highContrastToggle.checked = e.target.checked
          highContrastToggle.dispatchEvent(new Event('change'))
          syncAppearanceDialog()
        })
        appearanceReset.addEventListener('click', () => {
          Object.assign(appearanceAccentState, {
            kind: 'preset',
            light: '#1868DB',
            dark: '#669DF1',
            seed: '#1868DB',
          })
          clearCustomAccentError()
          themeSelect.value = 'system'
          highContrastToggle.checked = systemContrastQuery.matches
          const layoutSelect = document.getElementById('content-layout')
          const densitySelect = document.getElementById('density')
          layoutSelect.value = 'fluid'
          densitySelect.value = 'default'
          themeSelect.dispatchEvent(new Event('change'))
          highContrastToggle.dispatchEvent(new Event('change'))
          layoutSelect.dispatchEvent(new Event('change'))
          densitySelect.dispatchEvent(new Event('change'))
          syncAppearanceDialog()
        })

        const openCustomize = () => {
          csGroupSeq = 0
          csCollapsedGroups = new Set()
          csDraft = forYouGroups.map(g => {
            csGroupSeq += 1
            return {id: 'g' + csGroupSeq, name: g.name, items: g.items.map(it => ({...it}))}
          })
          csRenderTree()
          csRenderGroups()
          cscrim.classList.add('open')
          trapFocus(cscrim.querySelector('.dlg'))
        }
        const closeCustomize = () => {
          if (cscrim.classList.contains('open')) {
            cscrim.classList.remove('open')
            releaseFocus()
          }
        }
        cscrim.addEventListener('click', e => {
          if (e.target === cscrim || e.target.closest('.c-close')) closeCustomize()
        })
        document.getElementById('cs-save').addEventListener('click', () => {
          forYouGroups = csDraft
            .filter(g => g.items.length)
            .map(g => ({name: g.name.trim() || 'Untitled group', items: g.items}))
          document
            .querySelectorAll('.side')
            .forEach(side => renderSide(side, {bootToLaunchpad: false}))
          toast({
            tone: 'ok',
            title: 'Sidebar updated',
            body: forYouGroups.length
              ? `For You now has ${forYouGroups.length} group${forYouGroups.length === 1 ? '' : 's'}`
              : 'For You is empty — the icon is hidden until you add a group',
          })
          closeCustomize()
        })

        /* ---- topbar menus: Notifications, Help, User — generic .menu/.mlist toggle
   handles open/close; this just wires what each row actually does ---- */
        /* the app's own inbox — separate from system notifications above, so it gets
   its own tab instead of being mixed into "Direct" */
        const notifications = createNotifications({closeAllMenus: (...args) => closeAllMenus(...args), openEmailView: (...args) => openEmailView(...args), closeMenuAndRestoreFocus: (...args) => closeMenuAndRestoreFocus(...args)})
        const {syncNotifBadge} = notifications
        // attachAndShowView is the content-host "showPage" half of the
        // former showContentView: pure DOM attach/hide for the 7
        // content-host pages ('record' falls through the generic
        // .content-children loop below, same as before). It knows nothing
        // about Page.activate/deactivate or currentContentViewName — the
        // real Navigation instance (constructed once every page factory
        // exists, at the end of this function) owns that lifecycle
        // uniformly for every page, including customer-record, closing the
        // gap the prior architecture note flagged. Launchpad is not one of
        // the named views here: it is a frame-level overlay, handled
        // entirely through home.activate()/home.deactivate() (showLaunchpad/
        // hideLaunchpad), never through this content-host attachment path.
        function attachAndShowView(name) {
          /* adv-search-scrim is a sibling outside .content, so switching which
   .content child is visible doesn't touch it — close it here so it never
   strands open across an unrelated navigation (e.g. breadcrumb back to the
   list) */
          const advScrim = document.getElementById('adv-search-scrim')
          if (advScrim && advScrim.classList.contains('open')) closeAdvancedSearch()

          const content = document.querySelector('.content')
          const viewSelectors = {
            email: '.email-view',
            list: '.list-view',
            'customers-list': '.customer-list-view',
            'customer-record': '.customer-record-view',
            'geo-list': '.geo-list-view',
            'geo-record': '.geo-record-view',
          }
          const namedViews = Object.fromEntries(
            Object.entries(viewSelectors).map(([key, selector]) => {
              const view = content.querySelector(selector) || deferredContentViews.get(key)
              if (view) deferredContentViews.set(key, view)
              return [key, view]
            })
          )
          const targetView = namedViews[name]
          if (contentViewDeferralReady && targetView && !targetView.isConnected)
            content.appendChild(targetView)
          ensureContentViewRendered(name)
          const wrappedViews = Object.values(namedViews)
          wrappedViews.forEach(view => {
            if (!view) return
            view.hidden = view !== targetView
            if (contentViewDeferralReady && view !== targetView) view.remove()
          })
          ;[...content.children].forEach(el => {
            if (wrappedViews.includes(el)) return
            el.hidden = name !== 'record'
          })
        }
        // onNavigationChange is the "onChange" half of the former
        // showContentView: bookkeeping that runs after the target page has
        // been shown/activated, for every content-host page uniformly.
        // syncPrototypeControlsPage (the former syncCustomerPrototypeControls,
        // moved to prototype/controls.js's createPrototypeControls -> syncPage
        // in Task 11 — see that file for the full per-surface visibility
        // logic) is a forward-referenced binding reassigned once main.js
        // constructs `controls`; see its declaration above for why.
        function onNavigationChange(name) {
          currentContentViewName = name
          syncPrototypeControlsPage(name)
          queueSkeletonForCurrentView()
        }
        // showContentView itself is declared once, much earlier (see the
        // comment there for why), currently holding attachAndShowView. It
        // is reassigned once more at the end of this function, once
        // `navigation` is constructed, to route every call through the real
        // navigation contract instead of driving the DOM directly — every
        // one of its 13 original call sites is either an event-handler
        // callback that only fires post-boot, or a callback reference
        // handed to a page factory and invoked later at runtime, never
        // synchronously during construction, so that later reassignment is
        // safe regardless of when each reference was captured.
        const email = createEmail({root: document.querySelector('.email-view'), onUnreadChange: () => syncNotifBadge(), navigate: (...args) => showContentView(...args), toast})
        const {openEmailView, closeEmailView} = email
        document.querySelectorAll('.record-back').forEach(b =>
          b.addEventListener('click', e => {
            e.preventDefault()
            showContentView('list')
          })
        )
        document.querySelectorAll('.help-kbd').forEach(b =>
          b.addEventListener('click', () => {
            closeAllMenus()
            openKbd()
          })
        )
        document.querySelectorAll('.side-customize-menu').forEach(b =>
          b.addEventListener('click', () => {
            closeAllMenus()
            openCustomize()
          })
        )
        document.querySelectorAll('.appearance-menu').forEach(b =>
          b.addEventListener('click', () => {
            closeAllMenus()
            openAppearance()
          })
        )
        document.querySelectorAll('.fav-toggle-menu').forEach(b =>
          b.addEventListener('click', () => {
            closeAllMenus()
            document.querySelector('.fav-toggle')?.click()
          })
        )
        document.querySelectorAll('.mlist').forEach(list =>
          list.addEventListener('click', e => {
            if (
              e.target.closest('button[role="menuitem"]') &&
              !e.target.closest('.help-kbd, .side-customize-menu, .fav-toggle-menu, .appearance-menu')
            )
              closeAllMenus()
          })
        )

        /* ---- AI Assistant dialog (proposal) — a structural mock, no live model behind it ---- */
        const assistant = createAssistant({trapFocus, releaseFocus, closeAllMenus, toast})
        const {closeAI} = assistant
        const firstEnabled = sel =>
          [...document.querySelectorAll('.design.active ' + sel)].find(b => !b.disabled)
        document.addEventListener('keydown', e => {
          const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)
          const mod = e.metaKey || e.ctrlKey
          const k = e.key.toLowerCase()
          if (mod && k === 's') {
            e.preventDefault()
            const b = firstEnabled('[data-act="Save"]')
            b
              ? doSave(b)
              : toast({tone: 'bad', title: 'Nothing to save', body: blocked('Save') || ''})
            return
          }
          if (mod && k === 'p') {
            e.preventDefault()
            const why = blocked('Print')
            if (why) {
              toast({tone: 'bad', title: 'Print is not available', body: why})
              return
            }
            openPrintSettings()
            return
          }
          if (mod && k === 'n') {
            e.preventDefault()
            if (atRisk()) askGuard(null, 'start another invoice')
            else {
              modeSel.value = 'create'
              applyMode('create')
              toast({tone: 'ok', title: 'New invoice started'})
            }
            return
          }
          if (e.key === 'F1') {
            e.preventDefault()
            openKbd()
            return
          }
          if (typing && !mod) return
        })

        /* ================= apply state ================= */
        const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)')
        const systemContrastQuery = window.matchMedia('(prefers-contrast: more)')
        const highContrastToggle = document.getElementById('high-contrast')
        /* The appearance facility's onChange callback ultimately needs
   refreshOpenDataListCharts, which is private to this closure and isn't
   defined until much later (alongside the rest of the chart code) — but
   appearance.apply() is called during initial boot below (applyTheme's
   first call), long before that point. onRefreshCharts is a plain
   function-reference variable (not a property bolted onto the appearance
   instance) that starts as a no-op and is reassigned, once, at the exact
   spot refreshOpenDataListCharts comes into existence; the appearance
   instance itself is still constructed here, in its original position,
   via createAppearance's own onChange parameter, matching how loading's
   getContainer is threaded through createLoading's parameter above. */
        let onRefreshCharts = () => {}
        const appearance = shared.appearance.create({
          root: shared.appearance.root,
          readControls: shared.appearance.readControls,
          onChange: () => onRefreshCharts(),
        })
        function applyTheme(requestedMode) {
          appearance.apply({
            mode: requestedMode,
            highContrast: highContrastToggle.checked,
            accentLight: appearanceAccentState.light,
            accentDark: appearanceAccentState.dark,
          })
        }
        function applyAppearanceAccent() {
          appearance.apply({
            accentLight: appearanceAccentState.light,
            accentDark: appearanceAccentState.dark,
          })
        }
        /* refreshOpenDataListCharts (defined later, alongside the rest of the
           chart code) reads dataListState, which doesn't exist yet the first
           time applyTheme runs during initial setup — this flag, declared
           up here before applyTheme's first call, is what lets that function
           safely no-op until dataListState is actually ready. */
        let dataListChartRefreshReady = false
        const themeSelect = document.getElementById('theme')
        themeSelect.addEventListener('change', e => applyTheme(e.target.value))
        highContrastToggle.addEventListener('change', () => applyTheme(themeSelect.value))
        const syncSystemTheme = () => {
          if (themeSelect.value === 'system') applyTheme('system')
        }
        systemThemeQuery.addEventListener('change', syncSystemTheme)
        systemContrastQuery.addEventListener('change', () => {
          highContrastToggle.checked = systemContrastQuery.matches
          applyTheme(themeSelect.value)
        })
        highContrastToggle.checked = systemContrastQuery.matches
        applyTheme(document.getElementById('theme').value)
        document.getElementById('density').addEventListener('change', e => {
          document.body.classList.toggle('density-compact', e.target.value === 'compact')
        })
        document.getElementById('content-layout').addEventListener('change', e => {
          document.body.classList.toggle('layout-boxed', e.target.value === 'boxed')
        })
        document.getElementById('input-style').addEventListener('change', e => {
          document.body.classList.remove('style-floated', 'style-inline')
          if (e.target.value !== 'default') document.body.classList.add(`style-${e.target.value}`)
        })
        document.getElementById('section-style').addEventListener('change', e => {
          document.body.classList.toggle('cards-fieldset', e.target.value === 'fieldset')
        })
        document.getElementById('filter-mode').addEventListener('change', e => {
          Object.keys(DATA_LIST_CONFIG).forEach(context => {
            dataListState[context].filterMode = e.target.value
            if (dataListState[context].canvas) refreshDataListForContext(context)
          })
        })
        document.getElementById('statistics-concept').addEventListener('change', () => {
          Object.keys(DATA_LIST_CONFIG).forEach(context => {
            if (dataListState[context].canvas) refreshDataListForContext(context)
          })
        })
        document.getElementById('emptyflow').addEventListener('change', e => {
          state.emptyFlow = e.target.checked
          renderActivity()
        })
        /* every static data-i18n node currently in the document — called after the
           locale changes, and again whenever a lazily-rendered view (a list, on
           its first visit) adds new data-i18n nodes that missed the last pass */
        function applyDataI18n() {
          document.querySelectorAll('[data-i18n]').forEach(node => {
            node.textContent = t(node.dataset.i18n)
          })
        }
        function applyLocale(locale) {
          appLocale = locale
          setLocale(locale)
          document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
          document.documentElement.lang = locale === 'ar' ? 'ar' : 'en'
          /* re-render whichever view is currently on screen so its dynamic text
             (breadcrumb tail, KPI cards, record position, toolbar) picks up the
             new language too — data-i18n only covers static markup, and a list
             view rendered here for the first time only just gained its
             data-i18n nodes, so the walk below must run after this, not before */
          if (currentContentViewName === 'record') applyState()
          else if (currentContentViewName === 'customer-record') customers.recordPage.activate()
          else if (currentContentViewName === 'geo-record') renderGeoRecord()
          else if (currentContentViewName === 'list' && dataListState.invoice.canvas)
            renderDataList('invoice')
          else if (currentContentViewName === 'customers-list' && dataListState.customer.canvas)
            renderDataList('customer')
          else if (currentContentViewName === 'geo-list' && dataListState.geo.canvas)
            renderDataList('geo')
          applyDataI18n()
          const topbarSearch = document.querySelector('.gtop .sbox')
          const topbarSearchLabel = topbarSearch?.querySelector('.shell-search-label')
          if (topbarSearchLabel) {
            stopSearchTyping(topbarSearchLabel.closest('.gtop'))
            startSearchTyping(topbarSearchLabel)
            topbarSearch.setAttribute('aria-label', t('Search or run an action'))
          }
          const netAmount = document.getElementById('invoice-summary-net')
          if (netAmount) {
            const amount = parseFloat(netAmount.textContent) || 0
            netAmount.textContent = formatLocaleCurrency(amount)
          }
          /* re-invoking showLaunchpad() here would move the shared topbar action
             cluster out of its live location a second time and lose it — relabel
             the already-built launchpad DOM in place instead */
          const activeLaunchpad = document.querySelector('.lp-view:not([hidden])')
          if (activeLaunchpad) {
            const launchpadMode = activeLaunchpad.dataset.mode || 'home'
            const heading = activeLaunchpad.querySelector('.lp-title')
            const subtitle = activeLaunchpad.querySelector('.lp-subtitle')
            if (launchpadMode === 'switcher') {
              heading.textContent = t('Switch app')
              subtitle.textContent = t('Choose another app or return to your current screen.')
            } else {
              const userName = getLaunchpadUserName()
              heading.replaceChildren()
              if (userName) {
                heading.append(`${t('Good to see you,')} `)
                const name = document.createElement('bdi')
                name.className = 'lp-user-name'
                name.textContent = userName
                name.setAttribute('data-text', userName)
                heading.append(name, '.')
              } else {
                heading.textContent = t('Welcome back.')
              }
              subtitle.textContent = t('Resume recent work or open another Skey app.')
            }

            activeLaunchpad.querySelectorAll('.lp-quick-lbl').forEach(node => {
              if (!node.dataset.i18nOriginal) node.dataset.i18nOriginal = node.textContent
              node.textContent = t(node.dataset.i18nOriginal)
            })
            activeLaunchpad.querySelectorAll('.lp-tag span').forEach(node => {
              if (!node.dataset.i18nOriginal) node.dataset.i18nOriginal = node.textContent
              node.textContent = t(node.dataset.i18nOriginal)
            })
            const search = activeLaunchpad.querySelector('.lp-search')
            const searchLabel = search?.querySelector('.lp-search-label')
            if (searchLabel) {
              stopSearchTyping(activeLaunchpad)
              startSearchTyping(searchLabel)
            }
            if (search) search.setAttribute('aria-label', t('Search apps and screens'))
            activeLaunchpad.querySelectorAll('.lp-view-all').forEach(button => {
              button.textContent = t(
                button.getAttribute('aria-expanded') === 'true' ? 'Show less' : 'View all'
              )
            })
            const currentLabel = activeLaunchpad.querySelector('.lp-current:not([hidden])')
            if (currentLabel) currentLabel.textContent = t('Current app')
            const close = activeLaunchpad.querySelector('.lp-close')
            if (close) {
              close.setAttribute('aria-label', t('Back to current screen'))
              const tip = close.querySelector('.tip')
              if (tip) tip.textContent = t('Back to current screen')
            }
            activeLaunchpad.querySelectorAll('.lp-tile').forEach(tile => {
              const label = tile.querySelector('.lp-tile-lbl')
              const description = tile.querySelector('.lp-tile-desc')
              if (label) label.textContent = t(label.dataset.i18nOriginal || '')
              if (description) description.textContent = t(description.dataset.i18nOriginal || '')
            })
            const appsTitle = activeLaunchpad.querySelector('#launchpad-apps-title')
            if (appsTitle) appsTitle.textContent = t('Apps')
          }
          /* relabel the persistent sidebar rail in place — its buttons key off the
             English label internally (data-label, activateByLabel lookups), so
             only the visible text is retranslated, not the whole nav rebuilt */
          document.querySelectorAll('.nc1-item').forEach(btn => {
            const lbl = btn.querySelector('.nc1-lbl')
            if (lbl && btn.dataset.label) lbl.textContent = t(btn.dataset.label)
          })
          document.querySelectorAll('.nc2-icn[aria-label]').forEach(btn => {
            const original = btn.dataset.i18nOriginal || btn.getAttribute('aria-label')
            btn.dataset.i18nOriginal = original
            btn.setAttribute('aria-label', t(original))
            const lbl = btn.querySelector('.nc2-lbl')
            if (lbl) lbl.textContent = t(original)
          })
          document.querySelectorAll('.nc-fav[data-label]').forEach(btn => {
            const lbl = btn.querySelector('span')
            if (lbl) lbl.textContent = t(btn.dataset.label)
          })
        }
        document.getElementById('rtl').addEventListener('change', e => {
          applyLocale(e.target.checked ? 'ar' : 'en')
        })
        document.addEventListener('keydown', e => {
          if (e.key === 'Escape') {
            const switcher = document.querySelector('.lp-view[data-mode="switcher"]:not([hidden])')
            if (switcher) {
              e.preventDefault()
              hideLaunchpad(switcher.closest('.frame'), {restoreFocus: true})
              return
            }
            closeAllMenus()
            closePop()
            closeDrawer()
            closeSearch()
            closeRDlg()
            closeKbd()
            closeCustomize()
            closeAI()
            if (pscrim.classList.contains('open')) {
              pscrim.classList.remove('open')
              releaseFocus()
            }
            if (gscrim.classList.contains('open')) document.getElementById('g-stay').click()
          }
          if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            openSearch()
          }
        })

        document.getElementById('st').disabled = state.mode === 'create'
        renderActivity()
        document.querySelectorAll('.fav-toggle').forEach(btn => {
          btn.onclick = () => {
            const on = btn.getAttribute('aria-pressed') !== 'true'
            btn.setAttribute('aria-pressed', String(on))
            btn.setAttribute('aria-label', on ? 'Remove from Favorites' : 'Add to Favorites')
            btn.querySelector('.tip').textContent = on
              ? 'Remove from Favorites'
              : 'Add to Favorites'
            toast({tone: 'ok', title: on ? 'Added to Favorites' : 'Removed from Favorites'})
          }
        })
        /* a reloaded page can restore a different mode in the select — follow it */
        applyMode(modeSel.value || 'record')

        /* ================= Sales Invoice List — concept rendering ================= */

        const geography = createGeography({root: document.querySelector('.geo-record-view'), getList: () => dataListInstances.geo, t, dataListIcon: (...args) => dataListIcon(...args), trapFocus, releaseFocus, toast, showContentView: (...args) => showContentView(...args), renderGeoList, openNewDataListRecord, openPrintSettings, openAdvancedSearch})
        const {renderGeoRecord, openGeoRecord, closeGeoParentPicker, closeGeoHierarchyDialog} = geography


        // persistCustomFilters/loadCustomFilters — thin delegation to the
        // shared storage contract (concepts/app/components/data-list/model.js's
        // localStorageDataListStorage(), unchanged key strings), kept as named
        // functions so the existing call sites below (saveCustomFilter/
        // deleteCustomFilter/applyCustomFilter) don't need their own edits.
        function persistCustomFilters(context, filters) {
          return dataListStorage.saveCustomFilters(context, filters)
        }


        const DATA_CUSTOM_FILTER_ICONS = [
          'i-eye',
          'i-spark',
          'i-clock',
          'i-check',
          'i-archive',
          'i-doc',
          'i-grid',
          'i-flow',
          'i-user',
          'i-panel',
          'i-location',
          'i-warn',
        ]

        // dataListInstances/dataListState/dataListModels — Task 6's
        // createDataList({context,config,rows,locale,actions,storage,deps})
        // factory (concepts/app/components/data-list/list.js) now owns what
        // used to be built here inline: each context's model (createListModel,
        // Task 5), chart handle, AbortController-scoped canvas listeners, and
        // ResizeObserver, all private to that instance's closure. Per the
        // task-6-report.md continuation plan (the lowest-risk path), this file
        // still keeps dataListState[context]/dataListModels[context] as real,
        // populated objects — dataListState[context] IS instance.getState()'s
        // return value (the instance's private listState, by reference) and
        // dataListModels[context] IS instance.model — so every one of this
        // file's ~150 existing `dataListState[context].foo` /
        // `dataListModels[context].bar` read/write sites below keeps working
        // completely unchanged, and every existing per-context function below
        // (openDataListRecord, applyDataListToolbarCommand, wireDataList's own
        // delegated listeners, etc.) keeps calling `renderDataList(context)` to
        // re-render — that function is now a one-line call into
        // `dataListInstances[context].render()`. dataListInstances[context] is
        // the new lifecycle surface (activate/deactivate/dispose/getLayout/
        // applyLayout/requestLeave) for future code; nothing here is a
        // re-introduction of a bare global object literal — it is 3
        // independent factory closures indexed by a small registry, and only
        // the two seams the brief calls out (record-open/new, Kanban move) are
        // rewritten to go through the `actions` contract — every other
        // existing action/render function is unchanged.
        const dataListStorage = localStorageDataListStorage()

        // Deps every createDataList(...) instance needs (see list.js's own
        // createDataList/renderDataList/wireDataList JSDoc for the exact
        // shape) — almost all of them are this file's own existing functions,
        // referenced here as thin wrappers only where the shared module's
        // parameter order/shape differs slightly from the page-local one.
        const dataListDeps = {
          t,
          encodeHtml,
          // dataListIcon/applyFrozenDataListColumns are declared later in this
          // file as `const` (not hoisted function declarations, unlike almost
          // everything else this bundle references) — wrapped in lambdas here
          // so they're resolved lazily on first call, after both are actually
          // initialized, rather than read eagerly at this object's own
          // construction time (which would throw a TDZ ReferenceError).
          dataListIcon: (...args) => dataListIcon(...args),
          DATA_FILTER_OPERATORS,
          dataFilterOptionLabel,
          dataFilterOptionValue,
          dateFilterLabel,
          renderDataListDatePresetOptions,
          dataListRows,
          simulatedTotal: context => DATA_LIST_SIMULATED_TOTAL[context],
          responsiveDataListColumns,
          responsiveWidthFor: key => DATA_LIST_RESPONSIVE_WIDTH[key],
          renderDataListGroupTrigger,
          renderDataListGroupingBar,
          renderKanban: renderDataListKanban,
          renderDataListCards,
          renderDataListAdaptiveRecord,
          renderDataListHeader,
          renderDataListBody,
          renderDataListStatistics,
          renderDataListChart,
          initNumberTickers,
          renderDataPageManageMenus: context => {
            const manageMenu = document.querySelector(
              `.data-page-manage[data-list-context="${CSS.escape(context)}"]`
            )
            if (manageMenu) renderDataPageManageMenu(manageMenu)
          },
          syncFooterPager: (footer, context, filteredCount) =>
            syncShellListPager(context, filteredCount, footer),
          applyFrozenDataListColumns: (canvas, visibleColumns, listState) =>
            applyFrozenDataListColumns(canvas, visibleColumns, listState),
          applyDataListFilterClick,
          applyDataListToolbarClick,
          applyDataListSortClick,
          applyDataListCommandClick,
          onDataListChange,
          positionDataMenu,
          openQuickView,
          openGeoRecord,
          kanbanTransitionAllowed: (fromStatus, toStatus) =>
            (INVOICE_STATUS_TRANSITIONS[fromStatus] || []).includes(toStatus),
          computeDataListLayoutDirty,
          reorderDataListColumn: (context, sourceKey, targetKey) =>
            reorderDataListColumn(context, sourceKey, targetKey),
          guardDataListLeave,
        }

        // Still used directly by the page-level right-click context-menu
        // handler below (multi-select "selection actions" content) — not a
        // dataListDeps entry since that handler runs once at the document
        // level, outside any single createDataList instance.
        function renderDataListSelectionActions(config, listState) {
          return sharedRenderDataListSelectionActions(config, listState, {t, dataListIcon})
        }

        // The ~14 action/command handlers below are thin delegations to
        // concepts/app/components/data-list/actions.js (Task 6) — every
        // caller elsewhere in this file keeps its original plain-name,
        // `(context, ...)`-first call shape (`computeDataListLayoutDirty(listState)`,
        // `applyDataListToolbarCommand(context, command, selectedKey)`, etc.)
        // unchanged; only the body now forwards to the shared module with
        // `dataListState[context]`/`DATA_LIST_CONFIG[context]`/`dataListModels
        // [context]` resolved here (still the same objects every other call
        // site in this file already reads/writes) plus the small `sharedActionDeps`
        // bundle those shared functions need (rerender/toast/etc).
        const sharedActionDeps = {
          toast,
          dataListRows,
          rerender: (context, options) => renderDataList(context, options),
          openQuickView,
          openGeoRecord,
          openPrintSettings,
          activeDataListStatisticsConcept,
          resolvedDataListStatisticsConcept,
        }

        function computeDataListLayoutDirty(listState) {
          return sharedComputeDataListLayoutDirty(listState, sharedActionDeps)
        }

        function deleteDataListRecords(context, keys) {
          return sharedDeleteDataListRecords(context, keys, DATA_LIST_CONFIG[context], dataListState[context], {
            ...sharedActionDeps,
            rerender: () => renderDataList(context),
          })
        }

        function toggleDataListStatus(context, row) {
          return sharedToggleDataListStatus(row, {
            ...sharedActionDeps,
            rerender: () => renderDataList(context),
          })
        }

        function setDataListRecordsStatus(context, keys, active) {
          return sharedSetDataListRecordsStatus(keys, active, DATA_LIST_CONFIG[context], {
            ...sharedActionDeps,
            rerender: () => renderDataList(context),
          })
        }

        function openDataListRecord(context, key, mode) {
          if (guardDataListLeave(() => openDataListRecord(context, key, mode))) return
          dataListActions[context].openRecord(key, mode)
        }

        function applyDataListRowAction(context, rowAction) {
          return sharedApplyDataListRowAction(context, rowAction, DATA_LIST_CONFIG[context], {
            ...sharedActionDeps,
            actions: dataListActions[context],
            deleteDataListRecords: (ctx, keys) => deleteDataListRecords(context, keys),
            toggleDataListStatus: row => toggleDataListStatus(context, row),
          })
        }

        function openNewDataListRecord(context) {
          if (context === 'customer') {
            openCustomerRecord(null, 'create')
            return
          }
          if (context === 'geo') {
            openGeoRecord(GEO_ROWS[0].code, 'create')
            return
          }
          document.getElementById('mode').value = 'create'
          showContentView('record')
          applyMode('create')
        }

        function applyDataListToolbarCommand(context, command, selectedKey) {
          return sharedApplyDataListToolbarCommand(
            context,
            command,
            selectedKey,
            dataListState[context],
            DATA_LIST_CONFIG[context],
            {
              ...sharedActionDeps,
              actions: dataListActions[context],
              rerender: () => renderDataList(context),
              deleteDataListRecords: (ctx, keys) => deleteDataListRecords(context, keys),
              setDataListRecordsStatus: (keys, active) =>
                setDataListRecordsStatus(context, keys, active),
            }
          )
        }

        function applyDataListCommandClick(event, context) {
          return sharedApplyDataListCommandClick(event, context, dataListState[context], {
            ...sharedActionDeps,
            actions: dataListActions[context],
            rerender: () => renderDataList(context),
            applyDataListRowAction: (ctx, rowAction) => applyDataListRowAction(ctx, rowAction),
            applyDataListToolbarCommand: (ctx, cmd, key) => applyDataListToolbarCommand(ctx, cmd, key),
          })
        }

        function applyDataListSortClick(event, context) {
          return sharedApplyDataListSortClick(event, dataListState[context], {
            ...sharedActionDeps,
            rerender: () => renderDataList(context),
          })
        }

        function onDataListChange(event, context) {
          return sharedOnDataListChange(event, context, dataListState[context], DATA_LIST_CONFIG[context], {
            ...sharedActionDeps,
            parseDateFilterValue,
            rerender: (options = {}) => renderDataList(context, options),
          })
        }

        function reorderDataListColumn(context, sourceKey, targetKey) {
          return sharedReorderDataListColumn(sourceKey, targetKey, dataListState[context], {
            ...sharedActionDeps,
            rerender: () => renderDataList(context),
          })
        }

        function saveDataListLayout(context) {
          return sharedSaveDataListLayout(dataListState[context], dataListModels[context], {
            ...sharedActionDeps,
            rerender: () => renderDataList(context),
          })
        }

        function resetDataListLayout(context) {
          return sharedResetDataListLayout(dataListModels[context], {
            ...sharedActionDeps,
            rerender: () => renderDataList(context),
          })
        }

        function invoiceListActions() {
          return {
            openRecord: (key, mode) => {
              openInvoiceRecord(key)
              const modeControl = document.getElementById('mode')
              if (modeControl) {
                modeControl.value = mode === 'view' ? 'record' : mode
                modeControl.dispatchEvent(new Event('change', {bubbles: true}))
              }
            },
            newRecord: () => openNewDataListRecord('invoice'),
            run: (command, keys, extra) => {
              if (command === 'move-kanban') {
                moveInvoiceKanbanCard('invoice', keys[0], extra.toStatus)
                return true
              }
              return applyDataListToolbarCommand('invoice', command, keys[0])
            },
            cardModel: row => dataRecordCardModel('invoice', row),
            statistics: invoiceListStatistics,
          }
        }

        function customerListActions() {
          return {
            openRecord: (key, mode) => openCustomerRecord(key, mode),
            newRecord: () => openNewDataListRecord('customer'),
            run: (command, keys) => applyDataListToolbarCommand('customer', command, keys[0]),
            cardModel: row => dataRecordCardModel('customer', row),
            statistics: customerListStatistics,
          }
        }

        function geoListActions() {
          return {
            openRecord: (key, mode) => openGeoRecord(key, mode),
            newRecord: () => openNewDataListRecord('geo'),
            run: (command, keys) => applyDataListToolbarCommand('geo', command, keys[0]),
            cardModel: row => dataRecordCardModel('geo', row),
            statistics: geoListStatistics,
          }
        }

        const dataListActionFactories = {
          invoice: invoiceListActions,
          customer: customerListActions,
          geo: geoListActions,
        }

        // dataListActions — a small context -> actions-object registry,
        // separate from dataListInstances, since createDataList's returned
        // instance handle (per the brief's exact contract) does not expose
        // the `actions` it was constructed with. Wrapper functions below
        // (openDataListRecord, applyDataListRowAction, etc.) read the
        // context's actions object from here rather than assuming it hangs
        // off the instance.
        const dataListActions = Object.fromEntries(
          Object.keys(DATA_LIST_CONFIG).map(context => [context, dataListActionFactories[context]()])
        )
        const dataListInstances = Object.fromEntries(
          Object.entries(DATA_LIST_CONFIG).map(([context, config]) => [
            context,
            createDataList({
              context,
              config,
              rows: config.rows,
              locale: shared.locale,
              actions: dataListActions[context],
              storage: dataListStorage,
              deps: dataListDeps,
            }),
          ])
        )
        const dataListModels = Object.fromEntries(
          Object.entries(dataListInstances).map(([context, instance]) => [context, instance.model])
        )
        const dataListState = Object.fromEntries(
          Object.entries(dataListInstances).map(([context, instance]) => [
            context,
            instance.getState(),
          ])
        )
        function renderDataList(context, options) {
          dataListInstances[context].render(options)
        }
        // Exposed the same way window.customerPrototype is above — a small
        // diagnostic surface, not a runtime dependency of the app itself.
        // Lets tests reach each createDataList(...) instance's
        // activate/deactivate/dispose lifecycle methods directly, since
        // nothing in the current page navigation flow calls them yet (the
        // brief's own scoping: they're the new public surface for future
        // code, not a requirement to migrate every existing call site in
        // this task).
        window.dataListInstances = dataListInstances
        dataListChartRefreshReady = true

        const listLayoutGuard = document.getElementById('list-layout-guard')
        let listLayoutGuardContext = ''
        let listLayoutGuardAfter = null

        function visibleDirtyDataListContext() {
          if (
            document.querySelector('.list-view')?.hidden === false &&
            dataListState.invoice.layoutDirty
          )
            return 'invoice'
          if (
            document.querySelector('.customer-list-view')?.hidden === false &&
            dataListState.customer.layoutDirty
          )
            return 'customer'
          if (
            document.querySelector('.geo-list-view')?.hidden === false &&
            dataListState.geo.layoutDirty
          )
            return 'geo'
          return ''
        }

        function askListLayoutGuard(context, after) {
          listLayoutGuardContext = context
          listLayoutGuardAfter = after
          listLayoutGuard.classList.add('open')
          setTimeout(() => trapFocus(listLayoutGuard.querySelector('.guard')), 0)
        }

        function guardDataListLeave(after) {
          const context = visibleDirtyDataListContext()
          if (!context) return false
          askListLayoutGuard(context, after)
          return true
        }

        function closeListLayoutGuard() {
          listLayoutGuard.classList.remove('open')
          listLayoutGuardContext = ''
          listLayoutGuardAfter = null
          releaseFocus()
        }

        document.getElementById('list-layout-stay').addEventListener('click', closeListLayoutGuard)
        document.getElementById('list-layout-discard').addEventListener('click', () => {
          const context = listLayoutGuardContext
          const after = listLayoutGuardAfter
          const listState = dataListState[context]
          listState.columnOrder = [...listState.savedColumnOrder]
          listState.hiddenColumns = new Set(listState.savedHiddenColumns)
          listState.groupBy = [...listState.savedGroupBy]
          listState.view = listState.savedView
          listState.statisticsVisible = listState.savedStatisticsVisible
          listState.statisticsConcept = listState.savedStatisticsConcept
          listState.layoutDirty = false
          closeListLayoutGuard()
          after?.()
        })
        document.getElementById('list-layout-save').addEventListener('click', () => {
          const context = listLayoutGuardContext
          const after = listLayoutGuardAfter
          if (!saveDataListLayout(context)) return
          closeListLayoutGuard()
          after?.()
        })
        listLayoutGuard.addEventListener('click', event => {
          if (event.target === listLayoutGuard) closeListLayoutGuard()
        })

        // Customer record model/validation, chrome/layout rendering, save/
        // undo/guard, and lookup/drawer behavior now live in
        // pages/customers/{fields,images,lookups,layouts,record,customers}.js
        // (Task 7) — `customers` (this createCustomers(...) call) is the
        // single owner of that state. Constructed here, right after
        // dataListInstances/dataListState exist (`templates.listInstance`
        // reuses the SAME createDataList('customer') instance Task 6 already
        // built above, per customers.js's own module comment — not a second
        // one), and after every function/DOM reference below it in this file
        // is already valid to REFERENCE (hoisted `function` declarations,
        // e.g. showContentView/openPrintSettings/applyRecordValueDirections/
        // closeAllMenus/openCustomerSearch) even though their bodies are
        // defined later in the file — same forward-reference relationship
        // applyLocale already relies on for `customers.recordPage`.
        const customers = createCustomers({
          templates: {
            listInstance: dataListInstances.customer,
            listRoot: document.getElementById('customer-list-canvas'),
            listFooter: document.getElementById('customer-list-fnav'),
            recordRoot: document.querySelector('.customer-record-view'),
          },
          locale: shared.locale,
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
            applyRecordValueDirections,
            customerRows: CUSTOMER_ROWS,
            customerReference: CUSTOMER_REFERENCE,
            lookupResults: CUSTOMER_LOOKUP_RESULTS,
            unitRows: UNIT_ROWS,
            openCustomerRecord,
            openCustomerSearch,
            openPrintSettings,
            closeAllMenus,
          },
        })
        // window.customerPrototype stays the same small diagnostic surface
        // it always was.
        window.customerPrototype = {
          fieldKeys: Object.values(CUSTOMER_SECTIONS).flatMap(section =>
            section.fields.map(field => field.key)
          ),
        }

        const dataListIcon = (name, size = 15) =>
          `<svg width="${size}" height="${size}" aria-hidden="true"><use href="#${name}" /></svg>`



        function formatDateFilterValue(isoDate) {
          if (!isoDate) return ''
          if (appLocale === 'ar') return formatLocaleDate(isoDate)
          const [year, month, day] = isoDate.split('-')
          return `${day}/${month}/${year}`
        }

        function dateFilterLabel(filter) {
          const {preset, a, b} = parseDateFilterValue(filter)
          const unitLabel = key =>
            (DATA_DATE_UNITS.find(item => item.key === key) || DATA_DATE_UNITS[0]).label.replace(
              '(s)',
              Number(a) === 1 ? '' : 's'
            )
          if (preset === 'today') return t('Today', 'Today')
          if (preset === 'this-week') return t('This week', 'This week')
          if (preset === 'this-month') return t('This month', 'This month')
          if (preset === 'this-quarter') return t('This quarter', 'This quarter')
          if (preset === 'this-year') return t('This year', 'This year')
          if (preset === 'previous') return `${t('Previous', 'Previous')} ${a || 1} ${unitLabel(b)}`
          if (preset === 'upcoming') return `${t('Upcoming', 'Upcoming')} ${a || 1} ${unitLabel(b)}`
          if (preset === 'specific')
            return a ? formatDateFilterValue(a) : t('Choose value', 'Choose value')
          if (preset === 'range')
            return a && b
              ? `${formatDateFilterValue(a)} – ${formatDateFilterValue(b)}`
              : t('Choose value', 'Choose value')
          return t('Choose value', 'Choose value')
        }


        // dataListRows(context) now delegates its filter/sort algorithm to
        // the shared model's rowsInView() (concepts/app/components/data-list/
        // model.js) — dataListState[context] IS that model's own state
        // object (see the dataListModels/dataListState construction above),
        // so every existing read/write into dataListState[context].search /
        // .filter / .fieldFilters / .sortKey / .sortDirection elsewhere in
        // this file is already the exact state rowsInView() reads.
        function dataListRows(context) {
          return dataListModels[context].rowsInView()
        }

        function renderDataListCell(context, row, column) {
          const value = row[column.key]
          if (context === 'customer' && column.key === 'avatar') {
            return renderCustomerAvatar(row, {encodeHtml})
          }
          if (
            (context === 'customer' && column.key === 'customerNo') ||
            (context === 'invoice' && column.key === 'no') ||
            (context === 'geo' && column.key === 'code')
          ) {
            return `<button class="customer-record-link" type="button" data-list-open-record="${encodeHtml(String(value))}" aria-label="Open ${context} ${encodeHtml(String(value))}">${encodeHtml(String(value))}</button>`
          }
          if (['customer', 'geo'].includes(context) && column.key === 'active') {
            return `<span class="badge ${value ? 'ok' : 'gray'}">${value ? 'Active' : 'Inactive'}</span>`
          }
          if (context === 'invoice' && column.key === 'status') {
            return invoiceStatusBadge(value)
          }
          return encodeHtml(String(value ?? ''))
        }

        const DATA_DATE_PRESET_LIST = [
          {key: 'today', label: 'Today'},
          {key: 'this-week', label: 'This week'},
          {key: 'this-month', label: 'This month'},
          {key: 'this-quarter', label: 'This quarter'},
          {key: 'this-year', label: 'This year'},
          {key: 'previous', label: 'Previous'},
          {key: 'upcoming', label: 'Upcoming'},
          {key: 'specific', label: 'Specific date'},
          {key: 'range', label: 'Date range'},
        ]

        function dataListDateInputValue(raw) {
          const date = parseDataListDate(raw)
          if (!date) return ''
          const pad = n => String(n).padStart(2, '0')
          return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
        }

        function renderDataListDatePresetOptions(field, filter) {
          const {preset, a, b} = parseDateFilterValue(filter)
          const options = DATA_DATE_PRESET_LIST.map(
            item =>
              `<button type="button" role="option" aria-selected="${preset === item.key}" data-list-date-preset="${encodeHtml(field.key)}" data-preset="${item.key}">${encodeHtml(t(item.label))}${preset === item.key ? dataListIcon('i-check', 13) : ''}</button>`
          ).join('')
          const unitOptions = selectedUnit =>
            DATA_DATE_UNITS.map(
              unit =>
                `<option value="${unit.key}"${unit.key === selectedUnit ? ' selected' : ''}>${encodeHtml(t(unit.label))}</option>`
            ).join('')
          const relativeControls =
            preset === 'previous' || preset === 'upcoming'
              ? `<div class="data-filter-date-relative"><input type="number" min="1" value="${encodeHtml(a || '1')}" data-list-date-amount="${encodeHtml(field.key)}" aria-label="${t('Number', 'Number')}"><select data-list-date-unit="${encodeHtml(field.key)}" aria-label="${t('Unit', 'Unit')}">${unitOptions(b || 'day')}</select></div>`
              : ''
          const specificControls =
            preset === 'specific'
              ? `<input type="date" class="data-filter-date-input" value="${encodeHtml(dataListDateInputValue(a))}" data-list-date-specific="${encodeHtml(field.key)}" aria-label="${t('Choose date', 'Choose date')}">`
              : ''
          const rangeControls =
            preset === 'range'
              ? `<div class="data-filter-date-range"><input type="date" value="${encodeHtml(dataListDateInputValue(a))}" data-list-date-range-from="${encodeHtml(field.key)}" aria-label="${t('From', 'From')}"><span>${t('to', 'to')}</span><input type="date" value="${encodeHtml(dataListDateInputValue(b))}" data-list-date-range-to="${encodeHtml(field.key)}" aria-label="${t('To', 'To')}"></div>`
              : ''
          return `<div class="data-filter-date-presets" role="listbox">${options}</div>${relativeControls}${specificControls}${rangeControls}`
        }

        /* Shell-footer list pager — the single navigator for a paginated list, living
           in the page footer (.fnav) rather than glued under the table, matching
           where every record view already puts its own navigator. Deliberately
           worded and structured differently from the in-record "Record N of N"
           pager so the two navigation ideas are never mistaken for each other:
           this one moves between pages of a list, that one moves between records
           inside an open record. */
        const DATA_LIST_FNAV_IDS = {
          invoice: 'list-fnav',
          customer: 'customer-list-fnav',
          geo: 'geo-list-fnav',
        }

        // renderShellPager/renderShellRecordPager now delegate their
        // page-math + markup to the shared pagination module
        // (concepts/app/components/data-list/pagination.js), passing
        // dataListState[context] (the model's own state, see above) plus the
        // small set of legacy-local render helpers those functions need.
        const shellPagerDeps = {t, encodeHtml, dataListIcon}
        function renderShellPager(context, filteredCount) {
          return renderSharedShellPager(context, filteredCount, dataListState[context], shellPagerDeps)
        }

        /* Adaptive view's footer navigator moves between records, one at a
           time, instead of between pages — same First/Prev/[N]/Next/Last
           shape as the in-record "Record N of N" pager elsewhere, but scoped
           to the actually-navigable rows rather than the simulated total
           (there's nothing meaningful to jump to past the real sample set). */
        function renderShellRecordPager(context, filteredCount) {
          return renderSharedShellRecordPager(context, filteredCount, dataListState[context], {
            ...shellPagerDeps,
            dataListRows,
            renderDataListAdaptiveFooterActions,
          })
        }

        /* Keyboard record-nav for Adaptive view: Alt+Left/Right flips records
           without reaching for the pager buttons. Alt- (not plain arrow keys)
           keeps this from hijacking normal text-field caret movement or list
           scrolling; only fires for whichever table is actually on screen
           and currently in Adaptive view. */
        function activeAdaptiveListContext() {
          return Object.keys(dataListState).find(context => {
            const listState = dataListState[context]
            return listState.view === 'adaptive' && listState.canvas?.offsetParent
          })
        }
        document.addEventListener('keydown', event => {
          if (!event.altKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return
          const target = event.target
          if (target?.closest?.('input, textarea, select, [contenteditable="true"]')) return
          const context = activeAdaptiveListContext()
          if (!context) return
          const listState = dataListState[context]
          const filteredCount = dataListRows(context).length
          const nextPage = event.key === 'ArrowRight' ? listState.page + 1 : listState.page - 1
          if (nextPage < 1 || nextPage > filteredCount) return
          event.preventDefault()
          listState.page = nextPage
          renderDataList(context, {skipStatsAnimation: true})
        })

        // `footer` lets callers that already hold the footer/pager mount
        // element (the createDataList render flow, which receives it as an
        // explicit parameter per the brief) pass it straight through instead
        // of this function re-querying the DOM for it. Optional and falls
        // back to the internal getElementById lookup when omitted, since
        // other callers (keyboard nav, in-pager click/change handlers) only
        // have `context` in scope.
        function syncShellListPager(context, filteredCount, footer) {
          const mount = footer || document.getElementById(DATA_LIST_FNAV_IDS[context])
          if (!mount) return
          const listState = dataListState[context]
          mount.hidden = listState.view === 'kanban'
          if (mount.hidden) return
          mount.innerHTML =
            listState.view === 'adaptive'
              ? renderShellRecordPager(context, filteredCount)
              : renderShellPager(context, filteredCount)
          if (mount.dataset.wired) return
          mount.dataset.wired = 'true'
          mount.addEventListener('click', event => {
            const recordButton = event.target.closest('[data-list-record]')
            if (recordButton) {
              if (recordButton.disabled) return
              listState.page = Number(recordButton.dataset.listRecord) || 1
              renderDataList(context, {skipStatsAnimation: true})
              return
            }
            const pageButton = event.target.closest('[data-list-page]')
            if (pageButton) {
              if (pageButton.disabled) return
              listState.page = Number(pageButton.dataset.listPage) || 1
              renderDataList(context, {skipStatsAnimation: true})
              return
            }
            const rowAction = event.target.closest('[data-list-row-action]')
            if (rowAction) applyDataListRowAction(context, rowAction)
          })
          mount.addEventListener('change', event => {
            const recordInput = event.target.closest('.pg-i')
            if (recordInput) {
              const mountEl = event.currentTarget
              const total = Number(recordInput.max) || 1
              const next = Math.min(Math.max(1, Number(recordInput.value) || 1), total)
              listState.page = next
              renderDataList(context, {skipStatsAnimation: true})
              return
            }
            const jumpInput = event.target.closest('.data-pagination-jump-input')
            if (jumpInput) {
              const totalPages = Number(jumpInput.max) || 1
              listState.page = Math.min(Math.max(1, Number(jumpInput.value) || 1), totalPages)
              renderDataList(context, {skipStatsAnimation: true})
              return
            }
            const sizeSelect = event.target.closest('[data-list-page-size]')
            if (!sizeSelect) return
            listState.pageSize = Number(sizeSelect.value) || DATA_LIST_DEFAULT_PAGE_SIZE
            listState.page = 1
            renderDataList(context, {skipStatsAnimation: true})
          })
        }

        const dataListPercent = sharedDataListPercent

        function invoiceListStatistics(rows, config, total) {
          const posted = rows.filter(row => row.status === 'Posted').length
          const pending = rows.filter(row => row.status === 'Pending').length
          const postedRate = dataListPercent(posted, total)
          const pendingRate = dataListPercent(pending, total)
          const gross = rows.reduce(
            (sum, row) => sum + Number(String(row.total).replace(/,/g, '') || 0),
            0
          )
          const average = gross / total
          return [
            {
              label: 'Invoices in view',
              value: rows.length,
              support: `of ${config.rows.length} total invoices`,
              supportAr: `من إجمالي ${config.rows.length} فاتورة`,
              icon: 'i-doc',
              tone: 'information',
              progress: dataListPercent(rows.length, config.rows.length),
              operation: 'Review the current invoice queue',
              benchmark: `${dataListPercent(rows.length, config.rows.length)}% of all invoices`,
              trend: [48, 55, 51, 64, 69, 76],
              trendLabel: 'Current filtered scope',
              trendTone: 'neutral',
            },
            {
              label: 'Posted',
              value: posted,
              support: `${postedRate}% of this view`,
              supportAr: `${postedRate}% من هذا العرض`,
              icon: 'i-check',
              tone: 'success',
              progress: postedRate,
              operation: 'Review posted documents',
              benchmark: 'Target 75%',
              trend: [52, 58, 61, 66, 72, postedRate],
              trendLabel:
                postedRate >= 75
                  ? `${postedRate - 75} pts above target`
                  : `${75 - postedRate} pts to target`,
              trendTone: postedRate >= 75 ? 'success' : 'warning',
            },
            {
              label: 'Pending',
              value: pending,
              support: `${pendingRate}% need attention`,
              supportAr: `${pendingRate}% تحتاج إلى مراجعة`,
              icon: 'i-clock',
              tone: 'warning',
              progress: pendingRate,
              operation: 'Review pending invoices',
              benchmark: 'Threshold 15%',
              trend: [30, 27, 24, 21, 18, pendingRate],
              trendLabel:
                pendingRate <= 15 ? 'Within threshold' : `${pendingRate - 15} pts above threshold`,
              trendTone: pendingRate <= 15 ? 'success' : 'warning',
              attention: true,
              attentionLabel: 'Pending invoices',
              attentionValue: pending,
              attentionSupport: `${pendingRate}% of the current view needs review`,
            },
            {
              label: 'Gross value',
              value: `EGP ${gross.toLocaleString(undefined, {minimumFractionDigits: 2})}`,
              support: 'Across the current view',
              supportAr: 'عبر العرض الحالي',
              icon: 'i-grid',
              tone: 'neutral',
              progress: 100,
              operation: 'Review invoice value distribution',
              benchmark: `Average EGP ${average.toLocaleString(undefined, {maximumFractionDigits: 0})}`,
              trend: [42, 49, 47, 58, 71, 78],
              trendLabel: 'Six-period value pattern',
              trendTone: 'neutral',
            },
          ]
        }

        function customerListStatistics(rows, config, total) {
          const active = rows.filter(row => row.active).length
          const inactive = rows.length - active
          const retail = rows.filter(row => row.customerType === 'Retail').length
          const activeRate = dataListPercent(active, total)
          const inactiveRate = dataListPercent(inactive, total)
          const retailRate = dataListPercent(retail, total)
          return [
            {
              label: 'Customers in view',
              value: rows.length,
              support: `of ${config.rows.length} total customers`,
              supportAr: `من إجمالي ${config.rows.length} عميل`,
              icon: 'i-user',
              tone: 'information',
              progress: dataListPercent(rows.length, config.rows.length),
              operation: 'Review the current customer portfolio',
              benchmark: `${dataListPercent(rows.length, config.rows.length)}% of all customers`,
              trend: [43, 49, 57, 61, 69, 75],
              trendLabel: 'Current filtered scope',
              trendTone: 'neutral',
            },
            {
              label: 'Active',
              value: active,
              support: `${activeRate}% of this view`,
              supportAr: `${activeRate}% من هذا العرض`,
              icon: 'i-check',
              tone: 'success',
              progress: activeRate,
              operation: 'Review active accounts',
              benchmark: 'Target 90%',
              trend: [76, 79, 82, 84, 87, activeRate],
              trendLabel:
                activeRate >= 90
                  ? `${activeRate - 90} pts above target`
                  : `${90 - activeRate} pts to target`,
              trendTone: activeRate >= 90 ? 'success' : 'warning',
            },
            {
              label: 'Inactive',
              value: inactive,
              support: inactive ? 'Review account availability' : 'No inactive accounts',
              supportAr: inactive ? 'راجع توفر الحساب' : 'لا يوجد حسابات غير نشطة',
              icon: 'i-archive',
              tone: inactive ? 'warning' : 'neutral',
              progress: inactiveRate,
              operation: 'Review inactive customer accounts',
              benchmark: 'Threshold 10%',
              trend: [22, 20, 18, 16, 13, inactiveRate],
              trendLabel:
                inactiveRate <= 10
                  ? 'Within threshold'
                  : `${inactiveRate - 10} pts above threshold`,
              trendTone: inactiveRate <= 10 ? 'success' : 'warning',
              attention: true,
              attentionLabel: 'Inactive customers',
              attentionValue: inactive,
              attentionSupport: inactive
                ? `${inactiveRate}% of the current view may need follow-up`
                : 'No customer accounts need follow-up',
            },
            {
              label: 'Retail',
              value: retail,
              support: `${retailRate}% of this view`,
              supportAr: `${retailRate}% من هذا العرض`,
              icon: 'i-panel',
              tone: 'neutral',
              progress: retailRate,
              operation: 'Review customer type mix',
              benchmark: 'Portfolio mix',
              trend: [46, 49, 51, 50, 53, retailRate],
              trendLabel: 'Six-period portfolio mix',
              trendTone: 'neutral',
            },
          ]
        }

        function geoListStatistics(rows, config, total) {
          const active = rows.filter(row => row.active).length
          const inactive = rows.length - active
          const roots = rows.filter(row => !row.parentCode).length
          const levels = rows.reduce((maximum, row) => Math.max(maximum, Number(row.level)), 0)
          const activeRate = dataListPercent(active, total)
          return [
            {
              label: 'Locations in view',
              value: rows.length,
              support: `of ${config.rows.length} total locations`,
              supportAr: `من إجمالي ${config.rows.length} موقع`,
              icon: 'i-flow',
              tone: 'information',
              progress: dataListPercent(rows.length, config.rows.length),
              operation: 'Review the current location scope',
              benchmark: `${dataListPercent(rows.length, config.rows.length)}% of all locations`,
              trend: [40, 46, 52, 61, 68, 74],
              trendLabel: 'Current filtered scope',
              trendTone: 'neutral',
            },
            {
              label: 'Active',
              value: active,
              support: `${activeRate}% of this view`,
              supportAr: `${activeRate}% من هذا العرض`,
              icon: 'i-check',
              tone: 'success',
              progress: activeRate,
              operation: 'Review location availability',
              benchmark: 'Target 95%',
              trend: [78, 82, 84, 87, 91, activeRate],
              trendLabel:
                activeRate >= 95
                  ? `${activeRate - 95} pts above target`
                  : `${95 - activeRate} pts to target`,
              trendTone: activeRate >= 95 ? 'success' : 'warning',
              attention: true,
              attentionLabel: 'Inactive locations',
              attentionValue: inactive,
              attentionSupport: inactive
                ? `${dataListPercent(inactive, total)}% of the current view is unavailable`
                : 'All locations in this view are active',
            },
            {
              label: 'Root locations',
              value: roots,
              support: 'Top-level hierarchy nodes',
              supportAr: 'عقد الهيكل الرئيسية',
              icon: 'i-grid',
              tone: 'neutral',
              progress: dataListPercent(roots, total),
              operation: 'Review top-level ownership',
              benchmark: 'Hierarchy structure',
              trend: [18, 20, 20, 22, 24, dataListPercent(roots, total)],
              trendLabel: 'Six-period structural mix',
              trendTone: 'neutral',
            },
            {
              label: 'Hierarchy depth',
              value: `${levels} levels`,
              support: 'Deepest level in this view',
              supportAr: 'أعمق مستوى في هذا العرض',
              icon: 'i-panel',
              tone: 'neutral',
              progress: dataListPercent(levels, 4),
              operation: 'Review hierarchy complexity',
              benchmark: 'Policy limit 4 levels',
              trend: [2, 2, 3, 3, 4, levels],
              trendLabel: levels <= 4 ? 'Within policy' : `${levels - 4} levels above policy`,
              trendTone: levels <= 4 ? 'success' : 'warning',
            },
          ]
        }

        const DATA_LIST_STATISTICS_FACTORIES = {
          invoice: invoiceListStatistics,
          customer: customerListStatistics,
          geo: geoListStatistics,
        }

        function dataListStatistics(context, rows, config) {
          return DATA_LIST_STATISTICS_FACTORIES[context](rows, config, Math.max(rows.length, 1))
        }

        // Chart math/markup (color/theme token resolution, field/group
        // calculations, value formatting, the chart panel's own markup) moved
        // to concepts/app/components/data-list/charts.js as part of Task 6.
        const sharedChartDeps = {t, encodeHtml, dataListIcon}
        const dataListChartYOptions = sharedDataListChartYOptions

        function renderDataListChart(context, rows, config, listState) {
          if (!listState.chartVisible) return ''
          return renderSharedDataListChart(context, rows, config, listState, sharedChartDeps)
        }

        /* ================= ApexCharts-backed breakdown chart =================
           One createListChart({root, locale}) handle per data-list context,
           tracked here (still context-keyed at this checkpoint — the full
           per-instance closure rewrite, replacing this map with state owned
           by each createDataList(...) call, lands in a later Task 6
           checkpoint) so a re-render can destroy the stale chart before
           creating the next one. createListChart itself already guarantees a
           chart never leaks into another context's slot, since each handle
           below is a fully independent instance from charts.js — this map
           only tracks WHICH handle belongs to which context, it holds no
           chart internals directly. */
        const dataListChartHandles = {}

        function chartHandleFor(context, canvas) {
          if (!dataListChartHandles[context]) {
            dataListChartHandles[context] = createListChart({root: canvas, locale: shared.locale})
          }
          return dataListChartHandles[context]
        }

        function destroyDataListChartInstance(context) {
          dataListChartHandles[context]?.destroy()
        }

        /* Runs after the chart section's HTML lands in the DOM (renderDataList
           already replaced canvas.innerHTML by the time this is called), so
           the mount div is guaranteed to exist when it's not skipped. */
        function initDataListChart(context, canvas, rows, config, listState) {
          chartHandleFor(context, canvas).render(rows, config, listState)
        }

        function refreshOpenDataListCharts() {
          if (!dataListChartRefreshReady) return
          Object.keys(dataListState).forEach(context => {
            const listState = dataListState[context]
            if (listState.chartVisible && listState.canvas) refreshDataListForContext(context)
          })
        }
        onRefreshCharts = refreshOpenDataListCharts

        // Statistics presentation renderers (balanced/operational/exceptions/
        // analytical cards, sparklines, the group trigger/bar) moved to
        // concepts/app/components/data-list/statistics.js as part of Task 6.
        // sharedStatisticsDeps bundles the small set of helpers those
        // functions need (t/encodeHtml/dataListIcon/locale) since the shared
        // module has no closure over this file's top-level bindings.
        const sharedStatisticsDeps = {t, encodeHtml, dataListIcon, locale: shared.locale}

        /* Exceptions & attention is a prototype-only concept for global demo
           switching — the per-table Manage menu only ever offers the three
           concepts meant to ship as real, everyday statistics presentations. */
        /* Statistics concept: a per-table choice (set from that table's Manage
           dropdown) wins when present; otherwise it falls back to the global
           Prototype control, same as before this per-table override existed. */
        function renderDataListStatistics(context, rows, config) {
          const listState = dataListState[context]
          const layout = resolvedDataListStatisticsConcept(listState.statisticsConcept)
          return renderSharedDataListStatistics({
            rows,
            config,
            layout,
            statisticsFn: (statsRows, statsConfig, total) =>
              dataListStatistics(context, statsRows, statsConfig, total),
            deps: sharedStatisticsDeps,
          })
        }

        /* the trigger lives in the main toolbar (between Chart and Columns) so
           picking the first group-by column costs no extra row; the drop-zone/
           chips row below only appears once there's something to show in it */
        function renderDataListGroupTrigger(config, listState) {
          return renderSharedDataListGroupTrigger(config, listState, sharedStatisticsDeps)
        }

        function renderDataListGroupingBar(config, listState) {
          return renderSharedDataListGroupingBar(config, listState, sharedStatisticsDeps)
        }


        // Row/table/adaptive/group rendering moved to
        // concepts/app/components/data-list/views.js as part of Task 6. The
        // context-specific pieces that remain here (rowMenuItems, renderCell,
        // renderFieldValue, groupValueLabel, renderCard) are the callbacks
        // the shared views.js module invokes — the shared component never
        // branches on `context === 'customer' | 'geo' | 'invoice'` itself.

        /* Shared by the left-click "..." row menu, the adaptive-view footer
           menu, AND the right-click context menu — one source of truth so
           none of the three ever drift apart. */
        function rowMenuItems(context, row, view) {
          if (view === 'adaptive-footer') {
            const contextActions =
              context === 'customer'
                ? `<button type="button" role="menuitem" data-list-row-action="accounts-movement">${dataListIcon('i-flow')} ${t('Accounts movement', 'Accounts movement')}</button><button type="button" role="menuitem" data-list-row-action="toggle-status">${dataListIcon(row.active ? 'i-archive' : 'i-check')} ${row.active ? t('Deactivate', 'Deactivate') : t('Activate', 'Activate')}</button>`
                : context === 'geo'
                  ? `<button type="button" role="menuitem" data-list-row-action="view-hierarchy">${dataListIcon('i-flow')} ${t('View in hierarchy', 'View in hierarchy')}</button><button type="button" role="menuitem" data-list-row-action="toggle-status">${dataListIcon(row.active ? 'i-archive' : 'i-check')} ${row.active ? t('Deactivate', 'Deactivate') : t('Activate', 'Activate')}</button>`
                  : `<button type="button" role="menuitem" data-list-row-action="user-log">${dataListIcon('i-user')} ${t('User log', 'User log')}</button><button type="button" role="menuitem" data-list-row-action="documents-flow">${dataListIcon('i-flow')} ${t('Documents flow', 'Documents flow')}</button>`
            const deleteAction = `<button type="button" role="menuitem" data-list-row-action="delete">${dataListIcon('i-trash')} ${t('Delete', 'Delete')}</button>`
            return `${contextActions}<div class="data-menu-separator"></div>${deleteAction}`
          }
          const quickViewDisabled = view === 'kanban'
          const commonActions = `<button type="button" role="menuitem" data-list-row-action="quick-view"${quickViewDisabled ? ' disabled aria-disabled="true" title="Switch out of Kanban to jump to a single record"' : ''}>${dataListIcon('i-panel')} Open in Adaptive view</button><button type="button" role="menuitem" data-list-row-action="display">${dataListIcon('i-external')} Display</button><button type="button" role="menuitem" data-list-row-action="modify">${dataListIcon('i-edit')} Modify</button>`
          const recordActions =
            context === 'customer'
              ? `<button type="button" role="menuitem" data-list-row-action="accounts-movement">${dataListIcon('i-flow')} Accounts movement</button><button type="button" role="menuitem" data-list-row-action="toggle-status">${dataListIcon(row.active ? 'i-archive' : 'i-check')} ${row.active ? 'Deactivate' : 'Activate'}</button>`
              : context === 'geo'
                ? `<button type="button" role="menuitem" data-list-row-action="view-hierarchy">${dataListIcon('i-flow')} View in hierarchy</button><button type="button" role="menuitem" data-list-row-action="toggle-status">${dataListIcon(row.active ? 'i-archive' : 'i-check')} ${row.active ? 'Deactivate' : 'Activate'}</button>`
                : `<button type="button" role="menuitem" data-list-row-action="print">${dataListIcon('i-print')} Print</button><button type="button" role="menuitem" data-list-row-action="user-log">${dataListIcon('i-user')} User log</button><button type="button" role="menuitem" data-list-row-action="documents-flow">${dataListIcon('i-flow')} Documents flow</button>`
          const deleteAction = `<button type="button" role="menuitem" data-list-row-action="delete">${dataListIcon('i-trash')} Delete</button>`
          return `${commonActions}<div class="data-menu-separator"></div>${recordActions}<div class="data-menu-separator"></div>${deleteAction}`
        }

        function groupValueLabel(context, column, groupValue) {
          if (column.key === 'active') return groupValue ? 'Active' : 'Inactive'
          return String(groupValue ?? 'Not set') || 'Not set'
        }

        const sharedViewDeps = {
          t,
          encodeHtml,
          dataListIcon,
          renderCell: (context, row, column) => renderDataListCell(context, row, column),
          renderFieldValue: (context, row, column) => renderQuickViewFieldValue(context, row, column),
          groupValueLabel,
          rowMenuItems,
          renderCard: (context, row, config, listState) =>
            renderDataRecordCard(context, row, config, listState),
        }

        function renderDataListAdaptiveFooterActions(context, row, config) {
          return renderSharedDataListAdaptiveFooterActions(context, row, config, sharedViewDeps)
        }

        function renderDataListRowActions(context, row, config, view = 'list') {
          return renderSharedDataListRowActions(context, row, config, view, sharedViewDeps)
        }

        function renderDataListHeader(visibleColumns, listState) {
          return renderSharedDataListHeader(visibleColumns, listState, sharedViewDeps)
        }

        function dataListDetailsId(context, key) {
          return sharedDataListDetailsId(context, key)
        }

        function renderDataListRecordRows(row, tableContext) {
          return renderSharedDataListRecordRows(row, tableContext, sharedViewDeps)
        }

        function renderDataListBody(rows, tableContext) {
          return renderSharedDataListBody(rows, tableContext, sharedViewDeps)
        }

        // dataRecordInitials/customerImageData/customerImagePreviewAttributes/
        // renderCustomerAvatar are imported from pages/customers/images.js
        // (Task 7) — still used here by the shared list-card rendering below
        // (renderCustomerSnapshotCard, renderQuickViewFieldValue), which
        // stays page-owned since it spans invoice/customer/geo contexts.
        // renderCustomerRecordPhoto's page-scope version (closing over the
        // old module-level `customerData`) is gone; the record page now
        // uses images.js's explicit-params version via record.js.

        function recordStatusBadge(active) {
          return `<span class="badge ${active ? 'ok' : 'gray'}">${active ? 'Active' : 'Inactive'}</span>`
        }

        function invoiceStatusBadge(status) {
          return `<span class="badge invoice-status" data-s="${encodeHtml(invoiceStatusKey(status))}">${encodeHtml(status)}</span>`
        }

        function customerRecordCardModel(row) {
          return {
            title: row.customerName,
            subtitle: `${row.customerNo}`,
            badge: recordStatusBadge(row.active),
            factMap: {
              type: ['Customer type', row.customerType],
              group: ['Customer group', row.customerGroup],
              operation: ['Operation unit', row.operationUnit],
              currency: ['Account currency', row.currency],
              location: ['Location', row.country],
              phone: ['Phone', row.phone],
            },
          }
        }

        function invoiceRecordCardModel(row) {
          return {
            title: `Sales Invoice ${row.no}`,
            subtitle: row.seq,
            avatar: dataListIcon('i-doc', 18),
            badge: invoiceStatusBadge(row.status),
            factMap: {
              total: ['Total', `${row.currency} ${row.total}`],
              customer: ['Customer', row.custName],
              date: ['Document date', row.date],
              payment: ['Payment', row.pay],
              subtype: ['Sub-type', row.subtype],
            },
          }
        }

        function geoRecordCardModel(row) {
          const hierarchyPath = row.parent
            ? `${row.parent} › ${row.code} - ${row.name}`
            : `Root › ${row.code} - ${row.name}`
          return {
            title: row.name,
            subtitle: `Location ${row.code}`,
            avatar: dataListIcon('i-flow', 18),
            badge: recordStatusBadge(row.active),
            factMap: {
              hierarchy: ['Hierarchy path', hierarchyPath],
              type: ['Location type', row.type],
              level: ['Level', row.level],
              code: ['Code', row.code],
              remarks: ['Remarks', row.remarks || 'No remarks'],
            },
          }
        }

        function dataRecordCardModel(context, row) {
          return context === 'customer'
            ? customerRecordCardModel(row)
            : context === 'geo'
              ? geoRecordCardModel(row)
              : invoiceRecordCardModel(row)
        }

        function dataRecordCardFactMarkup([label, value]) {
          const wide = label === 'Hierarchy path' ? ' class="wide"' : ''
          return `<div${wide}><dt>${encodeHtml(label)}</dt><dd>${encodeHtml(String(value ?? '—'))}</dd></div>`
        }

        function dataRecordCardSelectMarkup(config, key, selected) {
          return `<label class="data-record-card-select"><input type="checkbox" data-list-row-select value="${encodeHtml(key)}" aria-label="Select ${encodeHtml(config.singular)} ${encodeHtml(key)}"${selected ? ' checked' : ''}></label>`
        }

        function dataRecordCardContext(context, row, config, listState) {
          const key = String(row[config.key])
          return {
            key,
            selected: listState.selected.has(key),
            model: dataRecordCardModel(context, row),
          }
        }

        function renderSnapshotCardHeader(context, row, config, card) {
          const avatar =
            context === 'customer'
              ? renderCustomerAvatar(row, {encodeHtml})
              : `<span class="data-record-avatar" aria-hidden="true">${card.model.avatar}</span>`
          return `<header class="data-record-card-header">${dataRecordCardSelectMarkup(config, card.key, card.selected)}${avatar}<button class="data-record-card-identity" type="button" data-list-open-record="${encodeHtml(card.key)}" aria-label="Open ${encodeHtml(config.singular)} ${encodeHtml(card.key)}"><div><strong>${encodeHtml(card.model.title)}</strong><span>${encodeHtml(card.model.subtitle)}</span></div></button>${card.model.badge}</header>`
        }

        function dataRecordActionButton(action, icon, label) {
          return `<button type="button" class="data-toolbar-button" data-list-row-action="${action}" title="${encodeHtml(label)}">${dataListIcon(icon)}<span class="data-toolbar-button-label">${encodeHtml(label)}</span></button>`
        }

        function renderContextCardActions(context) {
          const actions =
            context === 'invoice'
              ? [
                  ['print', 'i-print', 'Print'],
                  ['documents-flow', 'i-flow', 'Documents flow'],
                ]
              : context === 'customer'
                ? [
                    ['modify', 'i-edit', 'Modify'],
                    ['accounts-movement', 'i-flow', 'Accounts movement'],
                  ]
                : [
                    ['view-hierarchy', 'i-flow', 'View hierarchy'],
                    ['modify', 'i-edit', 'Modify'],
                  ]
          return actions.map(action => dataRecordActionButton(...action)).join('')
        }

        function renderCardFooterEndActions(context, row, config) {
          return `<div class="data-record-card-footer-end">${renderOperationsOverflowActions(context, row, config)}</div>`
        }

        function renderOperationsOverflowActions(context, row, config) {
          const quickView = `<button type="button" role="menuitem" data-list-row-action="quick-view">${dataListIcon('i-panel')} Open in Adaptive view</button>`
          const display = `<button type="button" role="menuitem" data-list-row-action="display">${dataListIcon('i-external')} Display</button>`
          const deleteAction = `<button type="button" role="menuitem" data-list-row-action="delete">${dataListIcon('i-trash')} Delete</button>`
          const actions =
            context === 'invoice'
              ? `${quickView}${display}<button type="button" role="menuitem" data-list-row-action="modify">${dataListIcon('i-edit')} Modify</button><button type="button" role="menuitem" data-list-row-action="user-log">${dataListIcon('i-user')} User log</button><div class="data-menu-separator"></div>${deleteAction}`
              : `${quickView}${display}<button type="button" role="menuitem" data-list-row-action="toggle-status">${dataListIcon(row.active ? 'i-archive' : 'i-check')} ${row.active ? 'Deactivate' : 'Activate'}</button><div class="data-menu-separator"></div>${deleteAction}`
          return renderSharedDataListRowActionMenu(config, String(row[config.key]), actions, '', sharedViewDeps)
        }

        function renderInvoiceSnapshotCard(row, config, listState) {
          const card = dataRecordCardContext('invoice', row, config, listState)
          return `<article class="data-record-card data-record-card-snapshot-layout data-record-card-invoice" role="listitem" data-list-row-key="${encodeHtml(card.key)}" aria-selected="${card.selected}">${renderSnapshotCardHeader('invoice', row, config, card)}<div class="data-record-card-snapshot"><div><span>Customer</span><strong>${encodeHtml(row.custName)}</strong><small>${encodeHtml(row.custNo)}</small></div><div class="data-record-card-snapshot-value"><span>Total</span><strong>${encodeHtml(row.currency)} ${encodeHtml(row.total)}</strong></div></div><dl class="data-record-card-meta">${[
            ['Document date', row.date],
            ['Payment', row.pay],
            ['Sub-type', row.subtype],
          ]
            .map(dataRecordCardFactMarkup)
            .join(
              ''
            )}</dl><footer class="data-record-card-operations-actions">${renderContextCardActions('invoice')}${renderCardFooterEndActions('invoice', row, config)}</footer></article>`
        }

        function renderCustomerSnapshotCard(row, config, listState) {
          const card = dataRecordCardContext('customer', row, config, listState)
          return `<article class="data-record-card data-record-card-snapshot-layout data-record-card-customer" role="listitem" data-list-row-key="${encodeHtml(card.key)}" aria-selected="${card.selected}">${renderSnapshotCardHeader('customer', row, config, card)}<div class="data-record-card-snapshot"><div><span>Customer profile</span><strong>${encodeHtml(row.customerType)} customer</strong><small>${encodeHtml(row.customerGroup)} group</small></div><div class="data-record-card-snapshot-value data-record-card-snapshot-contact"><span>Phone</span><strong>${encodeHtml(row.phone)}</strong></div></div><dl class="data-record-card-meta">${[
            ['Operation unit', row.operationUnit],
            ['Account currency', row.currency],
            ['Location', row.country],
          ]
            .map(dataRecordCardFactMarkup)
            .join(
              ''
            )}</dl><footer class="data-record-card-operations-actions">${renderContextCardActions('customer')}${renderCardFooterEndActions('customer', row, config)}</footer></article>`
        }

        function renderGeoSnapshotCard(row, config, listState) {
          const card = dataRecordCardContext('geo', row, config, listState)
          return `<article class="data-record-card data-record-card-snapshot-layout data-record-card-geo" role="listitem" data-list-row-key="${encodeHtml(card.key)}" aria-selected="${card.selected}">${renderSnapshotCardHeader('geo', row, config, card)}<div class="data-record-card-hierarchy"><span>Hierarchy path</span><strong>${encodeHtml(card.model.factMap.hierarchy[1])}</strong></div><div class="data-record-card-classification"><div><span>Type</span><strong>${encodeHtml(row.type)}</strong></div><div><span>Level</span><strong>${encodeHtml(row.level)}</strong></div><div><span>Code</span><strong>${encodeHtml(row.code)}</strong></div></div><dl class="data-record-card-meta">${dataRecordCardFactMarkup(['Remarks', row.remarks || 'No remarks'])}</dl><footer class="data-record-card-operations-actions">${renderContextCardActions('geo')}${renderCardFooterEndActions('geo', row, config)}</footer></article>`
        }

        function renderDataRecordCard(context, row, config, listState) {
          if (context === 'customer') return renderCustomerSnapshotCard(row, config, listState)
          if (context === 'geo') return renderGeoSnapshotCard(row, config, listState)
          return renderInvoiceSnapshotCard(row, config, listState)
        }

        /* ================= quick view: jump into adaptive view on this record =================
           Quick view used to open a read-only drawer duplicating what Adaptive
           view already shows. Instead it now switches the table itself into
           Adaptive view, positioned at this record — same destination as
           navigating there by hand, no separate dialog to keep in sync. */
        function renderQuickViewFieldValue(context, row, column) {
          const value = row[column.key]
          if (context === 'customer' && column.key === 'avatar')
            return renderCustomerAvatar(row, {encodeHtml})
          if (['customer', 'geo'].includes(context) && column.key === 'active')
            return `<span class="badge ${value ? 'ok' : 'gray'}">${value ? 'Active' : 'Inactive'}</span>`
          return encodeHtml(String(value === '' || value == null ? '—' : value))
        }

        function openQuickView(context, key) {
          const listState = dataListState[context]
          const filteredRows = dataListRows(context)
          const config = DATA_LIST_CONFIG[context]
          const index = filteredRows.findIndex(row => String(row[config.key]) === key)
          if (index < 0) return
          listState.view = 'adaptive'
          listState.page = index + 1
          computeDataListLayoutDirty(listState)
          refreshDataListForContext(context)
        }

        function renderDataListCards(context, rows, config, listState) {
          return renderSharedDataListCards(context, rows, config, listState, sharedViewDeps)
        }

        function renderDataListAdaptiveRecord(context, row, config, filteredCount = 0) {
          const listState = dataListState[context]
          return renderSharedDataListAdaptiveRecord(
            context,
            row,
            config,
            listState,
            filteredCount,
            sharedViewDeps
          )
        }

        const INVOICE_KANBAN_COLUMNS = [
          'Draft',
          'Open',
          'Pending',
          'Posted',
          'Returned',
          'Canceled',
        ]
        const INVOICE_STATUS_TRANSITIONS = {
          Draft: ['Open', 'Canceled'],
          Open: ['Pending', 'Canceled'],
          Pending: ['Open', 'Posted'],
          Posted: ['Pending', 'Returned', 'Canceled'],
          Returned: [],
          Canceled: [],
        }

        function invoiceStatusKey(status) {
          return String(status || '').toLowerCase()
        }

        function renderDataListKanbanCard(row, config, listState) {
          const key = String(row[config.key])
          const selected = listState.selected.has(key)
          return `<article class="data-kanban-card" role="listitem" draggable="true" data-list-row-key="${encodeHtml(key)}" data-kanban-status="${encodeHtml(row.status)}" aria-selected="${selected}"><header><button class="data-record-card-identity" type="button" data-list-open-record="${encodeHtml(key)}" aria-label="Open ${encodeHtml(config.singular)} ${encodeHtml(key)}"><div><strong>Sales Invoice ${encodeHtml(row.no)}</strong><span>${encodeHtml(row.seq)}</span></div></button>${renderDataListRowActions('invoice', row, config, 'kanban')}</header><div class="data-kanban-card-total">${encodeHtml(row.currency)} ${encodeHtml(row.total)}</div><dl class="data-kanban-card-meta"><div><dt>Customer</dt><dd>${encodeHtml(row.custName)}</dd></div><div><dt>Date</dt><dd>${encodeHtml(row.date)}</dd></div><div><dt>Payment</dt><dd>${encodeHtml(row.pay)}</dd></div></dl></article>`
        }

        function renderDataListKanban(context, rows, config, listState) {
          if (context !== 'invoice') return ''
          const columns = INVOICE_KANBAN_COLUMNS.map(status => {
            const columnRows = rows.filter(row => row.status === status)
            const cards = columnRows
              .map(row => renderDataListKanbanCard(row, config, listState))
              .join('')
            return `<div class="data-kanban-column" data-kanban-column="${encodeHtml(status)}"><header class="data-kanban-column-header" data-s="${invoiceStatusKey(status)}"><span class="stdot"></span><strong>${encodeHtml(status)}</strong><span class="data-kanban-count">${columnRows.length}</span></header><div class="data-kanban-drop" data-kanban-drop="${encodeHtml(status)}" role="list" aria-label="${encodeHtml(status)} invoices">${cards || `<p class="data-kanban-empty">No invoices</p>`}</div></div>`
          }).join('')
          return `<div class="data-kanban-board">${columns}</div>`
        }

        function positionDataMenu(details) {
          if (!details?.open) return
          const summary = details.querySelector(':scope > summary')
          const popover =
            details.querySelector(':scope > .data-menu-popover') ||
            [...document.body.children].find(child => child.__homeParent === details)
          if (!summary || !popover) return
          const margin = 8
          const gap = 4
          const anchor = summary.getBoundingClientRect()
          popover.style.left = `${margin}px`
          popover.style.top = `${margin}px`
          popover.style.maxHeight = `${Math.max(120, window.innerHeight - margin * 2)}px`
          const rect = popover.getBoundingClientRect()
          if (details.classList.contains('data-manage-submenu')) {
            const rtl = document.documentElement.dir === 'rtl'
            const fitsEnd = rtl
              ? anchor.left - gap - rect.width >= margin
              : anchor.right + gap + rect.width <= window.innerWidth - margin
            let left = rtl
              ? fitsEnd
                ? anchor.left - gap - rect.width
                : anchor.right + gap
              : fitsEnd
                ? anchor.right + gap
                : anchor.left - gap - rect.width
            left = Math.max(margin, Math.min(left, window.innerWidth - rect.width - margin))
            let top = anchor.top
            if (top + rect.height > window.innerHeight - margin)
              top = Math.max(margin, window.innerHeight - margin - rect.height)
            popover.style.left = `${left}px`
            popover.style.top = `${top}px`
            return
          }
          const alignEnd =
            details.classList.contains('end') || details.classList.contains('data-page-manage')
          let left = alignEnd ? anchor.right - rect.width : anchor.left
          left = Math.max(margin, Math.min(left, window.innerWidth - rect.width - margin))
          let top = anchor.bottom + gap
          if (top + rect.height > window.innerHeight - margin)
            top = Math.max(margin, anchor.top - rect.height - gap)
          popover.style.left = `${left}px`
          popover.style.top = `${top}px`
        }

        const applyFrozenDataListColumns = applySharedFrozenDataListColumns

        function applyDataListFilterClick(event, context) {
          const listState = dataListState[context]
          const config = DATA_LIST_CONFIG[context]
          if (event.target.closest('[data-list-open-filters]')) {
            openDataFilterModal(context)
            return true
          }
          const applyCustom = event.target.closest('[data-list-custom-filter-apply]')
          if (applyCustom) {
            applyCustomFilter(context, applyCustom.dataset.listCustomFilterApply)
            return true
          }
          const deleteCustom = event.target.closest('[data-list-custom-filter-delete]')
          if (deleteCustom) {
            deleteCustomFilter(context, deleteCustom.dataset.listCustomFilterDelete)
            return true
          }
          if (event.target.closest('[data-list-manage-filters]')) {
            openManageFiltersDialog(context)
            return true
          }
          const filter = event.target.closest('[data-list-filter]')
          const addFilter = event.target.closest('[data-list-add-filter]')
          const removeFilter = event.target.closest('[data-list-remove-field-filter]')
          const operator = event.target.closest('[data-list-filter-operator]')
          const selectOption = event.target.closest('[data-list-filter-select-option]')
          if (selectOption) {
            const item = listState.fieldFilters.find(
              fieldFilter => fieldFilter.key === selectOption.dataset.listFilterSelectOption
            )
            if (item) item.value = selectOption.dataset.value
            listState.page = 1
            renderDataList(context)
            return true
          }
          const datePreset = event.target.closest('[data-list-date-preset]')
          if (datePreset) {
            const item = listState.fieldFilters.find(
              fieldFilter => fieldFilter.key === datePreset.dataset.listDatePreset
            )
            if (item) item.value = dataListNextDatePresetValue(item, datePreset.dataset.preset)
            listState.page = 1
            renderDataList(context, {
              focusFilterKey: datePreset.dataset.listDatePreset,
            })
            return true
          }
          if (filter) {
            listState.filter = filter.dataset.listFilter
            listState.fieldFilters = []
            listState.advanced = false
            listState.sourceRows = config.rows
            listState.selected.clear()
          } else if (addFilter) {
            const field = config.filterFields.find(
              item => item.key === addFilter.dataset.listAddFilter
            )
            if (!field) return false
            listState.fieldFilters.push({
              key: field.key,
              operator: field.type === 'text' ? 'contains' : 'equals',
              value:
                field.type === 'select'
                  ? String(dataFilterOptionValue(field.options[0]))
                  : field.type === 'date'
                    ? 'today'
                    : '',
            })
          } else if (removeFilter) {
            listState.fieldFilters = listState.fieldFilters.filter(
              item => item.key !== removeFilter.dataset.listRemoveFieldFilter
            )
          } else if (operator) {
            const item = listState.fieldFilters.find(
              fieldFilter => fieldFilter.key === operator.dataset.listFilterKey
            )
            if (item) item.operator = operator.dataset.listFilterOperator
          } else if (event.target.closest('[data-list-clear-filter]')) {
            listState.filter = 'all'
            listState.fieldFilters = []
            listState.advanced = false
            listState.activeCustomFilterId = ''
            listState.sourceRows = config.rows
            listState.selected.clear()
          } else if (event.target.closest('[data-list-clear-advanced]')) {
            listState.advanced = false
            listState.sourceRows = DATA_LIST_CONFIG[context].rows
            listState.selected.clear()
          } else return false
          listState.page = 1
          renderDataList(context, {
            focusFilterKey: addFilter
              ? addFilter.dataset.listAddFilter
              : operator?.dataset.listFilterKey || '',
          })
          return true
        }

        function applyDataListToolbarClick(event, context) {
          const listState = dataListState[context]
          if (event.target.closest('[data-list-search-clear]')) {
            listState.search = ''
            listState.page = 1
            renderDataList(context, {focusSearch: true})
          } else if (event.target.closest('[data-list-clear-selection]')) {
            listState.selected.clear()
            renderDataList(context)
          } else if (event.target.closest('[data-list-save-view]')) openSaveFilterDialog(context)
          else if (event.target.closest('[data-list-save-layout]')) saveDataListLayout(context)
          else return false
          return true
        }

        function dataManageAction(action, icon, title, support, {disabled = false} = {}) {
          return `<button type="button" role="menuitem" data-list-manage-action="${action}"${disabled ? ' disabled' : ''}>${dataListIcon(icon)}<span class="data-manage-copy"><strong>${title}</strong><small>${support}</small></span></button>`
        }

        const DATA_BORDER_MODES = ['default', 'both', 'none', 'horizontal', 'vertical']

        function renderDataManageBorderControls(context, listState) {
          return DATA_BORDER_MODES.map(
            mode =>
              `<label class="data-manage-radio"><input type="radio" name="${encodeHtml(context)}-border" data-list-manage-border="${mode}"${listState.borderMode === mode ? ' checked' : ''}><span>${mode[0].toUpperCase() + mode.slice(1)}</span></label>`
          ).join('')
        }

        function resolvedDataListStatisticsConcept(statisticsConcept) {
          return (
            statisticsConcept || document.getElementById('statistics-concept')?.value || 'balanced'
          )
        }

        function activeDataListStatisticsConcept(listState) {
          return resolvedDataListStatisticsConcept(listState.statisticsConcept)
        }

        function renderDataManageStatisticsControls(context, listState) {
          const active = activeDataListStatisticsConcept(listState)
          return DATA_LIST_STATISTICS_CONCEPT_OPTIONS.map(
            option =>
              `<label class="data-manage-radio"><input type="radio" name="${encodeHtml(context)}-statistics-concept" data-list-manage-statistics-concept="${option.key}"${active === option.key ? ' checked' : ''}><span>${encodeHtml(t(option.label))}</span></label>`
          ).join('')
        }

        function renderDataManageFrozenControls(config, listState) {
          const columns = listState.columnOrder
            .map(key => config.columns.find(column => column.key === key))
            .filter(Boolean)
          if (!columns.length) return `<p class="data-manage-empty">No columns to freeze.</p>`
          return columns
            .map(
              column =>
                `<label><input type="checkbox" data-list-manage-frozen="${encodeHtml(column.key)}"${listState.frozenColumns.has(column.key) ? ' checked' : ''}><span>${encodeHtml(column.label)}</span></label>`
            )
            .join('')
        }

        function renderDataPageManageMenu(details) {
          const context = details.dataset.listContext
          const config = DATA_LIST_CONFIG[context]
          const listState = dataListState[context]
          const popover = details.querySelector('.data-menu-popover')
          if (!config || !listState || !popover) return
          const singular = config.singular[0].toUpperCase() + config.singular.slice(1)
          const borderLabel = DATA_BORDER_MODES.includes(listState.borderMode)
            ? listState.borderMode[0].toUpperCase() + listState.borderMode.slice(1)
            : 'Default'
          const statisticsConceptLabel =
            DATA_LIST_STATISTICS_CONCEPT_OPTIONS.find(
              option => option.key === activeDataListStatisticsConcept(listState)
            )?.label || 'Balanced cards'
          const tablePrefs =
            listState.view === 'list'
              ? `<div class="data-manage-group-label">Table preferences</div>
            ${dataManageAction('save-layout', 'i-save', 'Save table layout', 'Keep columns, grouping, view and statistics', {disabled: !listState.layoutDirty})}
            ${dataManageAction('reset-layout', 'i-undo', 'Reset table layout', 'Restore the system default')}
            <details class="data-menu data-manage-submenu"><summary>${dataListIcon('i-sliders')}<span class="data-manage-copy"><strong>Borders</strong><small>${borderLabel}</small></span>${dataListIcon('i-next', 10)}</summary><div class="data-menu-popover" role="radiogroup" aria-label="Table borders">${renderDataManageBorderControls(context, listState)}</div></details>
            <details class="data-menu data-manage-submenu"><summary>${dataListIcon('i-lock')}<span class="data-manage-copy"><strong>Freeze columns</strong><small>${listState.frozenColumns.size ? `${listState.frozenColumns.size} frozen` : 'None'}</small></span>${dataListIcon('i-next', 10)}</summary><div class="data-menu-popover" role="group" aria-label="Frozen columns">${renderDataManageFrozenControls(config, listState)}</div></details>`
              : `<div class="data-manage-group-label">Table preferences</div>
            ${dataManageAction('save-layout', 'i-save', 'Save table layout', 'Keep columns, grouping, view and statistics', {disabled: !listState.layoutDirty})}
            ${dataManageAction('reset-layout', 'i-undo', 'Reset table layout', 'Restore the system default')}`
          popover.innerHTML = `
            <div class="data-manage-group-label">Data exchange</div>
            ${dataManageAction('export', 'i-external', 'Export', 'Excel, PDF, CSV or Word')}
            <div class="data-menu-separator"></div>
            <div class="data-manage-group-label">Analysis</div>
            ${dataManageAction('statistics-status', 'i-grid', listState.statisticsVisible ? 'Hide statistics' : 'Show statistics', 'Toggle the statistics summary for this view')}
            <details class="data-menu data-manage-submenu"><summary>${dataListIcon('i-chart')}<span class="data-manage-copy"><strong>Statistics style</strong><small>${encodeHtml(t(statisticsConceptLabel))}</small></span>${dataListIcon('i-next', 10)}</summary><div class="data-menu-popover" role="radiogroup" aria-label="Statistics style">${renderDataManageStatisticsControls(context, listState)}</div></details>
            <div class="data-menu-separator"></div>
            <div class="data-manage-group-label">Reporting</div>
            ${dataManageAction('report', 'i-doc', `${singular} report`, 'Create a configurable report')}
            <div class="data-menu-separator"></div>
            ${tablePrefs}`
        }

        function renderDataPageManageMenus() {
          document
            .querySelectorAll('.data-page-manage[data-list-context]')
            .forEach(renderDataPageManageMenu)
        }

        let dataExportContext = ''

        function renderDataExportColumns(config, listState) {
          const columns = listState.columnOrder
            .map(key => config.columns.find(column => column.key === key))
            .filter(Boolean)
          return columns
            .map(
              column =>
                `<label><input type="checkbox" data-export-column="${encodeHtml(column.key)}"${listState.hiddenColumns.has(column.key) ? '' : ' checked'}><span>${encodeHtml(column.label)}</span></label>`
            )
            .join('')
        }

        function openDataExport(context) {
          dataExportContext = context
          const config = DATA_LIST_CONFIG[context]
          const listState = dataListState[context]
          dataExportScrim
            .querySelectorAll('[data-export-format]')
            .forEach(button =>
              button.setAttribute('aria-checked', String(button.dataset.exportFormat === 'xlsx'))
            )
          document.getElementById('data-export-scope').value = 'visible'
          document.getElementById('data-export-filename').value =
            `${config.label[0].toUpperCase() + config.label.slice(1)} - ${new Date().toISOString().slice(0, 10)}`
          document.getElementById('data-export-columns').innerHTML = renderDataExportColumns(
            config,
            listState
          )
          dataExportScrim.classList.add('open')
          trapFocus(dataExportScrim.querySelector('.customer-modal'))
        }

        function closeDataExport() {
          dataExportScrim.classList.remove('open')
          releaseFocus()
        }

        function runDataExport() {
          const config = DATA_LIST_CONFIG[dataExportContext]
          const listState = dataListState[dataExportContext]
          const format = dataExportScrim.querySelector('[data-export-format][aria-checked="true"]')
            ?.dataset.exportFormat
          const scope = document.getElementById('data-export-scope').value
          const rows =
            scope === 'selected'
              ? listState.selected.size
              : scope === 'all'
                ? config.rows.length
                : dataListRows(dataExportContext).length
          const columnCount = dataExportScrim.querySelectorAll(
            '[data-export-column]:checked'
          ).length
          const fileName =
            document.getElementById('data-export-filename').value.trim() || config.label
          closeDataExport()
          toast({
            tone: 'ok',
            title: `Exporting ${rows} ${rows === 1 ? config.singular : config.label} (${columnCount} columns) as ${fileName}.${format}`,
          })
        }

        function openKanbanBlockedDialog(row, fromStatus, toStatus) {
          const allowedFrom = INVOICE_STATUS_TRANSITIONS[fromStatus] || []
          document.getElementById('kanban-blocked-body').textContent =
            `Sales Invoice ${row.no} is ${fromStatus} and can't move directly to ${toStatus}. It must follow the document status flow.`
          const allowedBlock = document.getElementById('kanban-blocked-allowed')
          const allowedList = document.getElementById('kanban-blocked-allowed-list')
          if (allowedFrom.length) {
            allowedList.innerHTML = allowedFrom
              .map(
                status =>
                  `<span class="stpill" data-s="${invoiceStatusKey(status)}"><span class="stdot"></span><span class="nm">${encodeHtml(status)}</span></span>`
              )
              .join('')
            allowedBlock.hidden = false
          } else {
            allowedList.innerHTML = ''
            allowedBlock.hidden = true
          }
          kanbanBlockedScrim.classList.add('open')
          trapFocus(kanbanBlockedScrim.querySelector('.customer-modal'))
        }

        function closeKanbanBlockedDialog() {
          kanbanBlockedScrim.classList.remove('open')
          releaseFocus()
        }

        function moveInvoiceKanbanCard(context, key, toStatus) {
          const config = DATA_LIST_CONFIG[context]
          const row = config.rows.find(record => String(record[config.key]) === key)
          if (!row) return
          const fromStatus = row.status
          if (fromStatus === toStatus) return
          const allowed = (INVOICE_STATUS_TRANSITIONS[fromStatus] || []).includes(toStatus)
          if (!allowed) {
            openKanbanBlockedDialog(row, fromStatus, toStatus)
            return
          }
          row.status = toStatus
          renderDataList(context)
          toast({tone: 'ok', title: `Sales Invoice ${row.no} moved to ${toStatus}`})
        }

        function renderCustomerList(rows = CUSTOMER_ROWS, {advanced = false} = {}) {
          const listState = dataListState.customer
          listState.sourceRows = rows
          listState.advanced = advanced
          listState.canvas = document.getElementById('customer-list-canvas')
          renderDataList('customer')
        }

        function renderGeoList() {
          const listState = dataListState.geo
          listState.sourceRows = GEO_ROWS
          listState.canvas = document.getElementById('geo-list-canvas')
          renderDataList('geo')
        }

        let activeFilterModalContext = null

        function refreshDataListForContext(context) {
          if (context === 'geo') renderGeoList()
          else renderDataList(context)
        }

        function renderDataFilterModal(context) {
          const config = DATA_LIST_CONFIG[context]
          const listState = dataListState[context]
          document.getElementById('geo-filter-title').textContent = `Filter ${config.label}`
          const quick = document.querySelector('#geo-filter-scrim .geo-filter-quick')
          const fields = document.querySelector('#geo-filter-scrim .geo-filter-fields')
          quick.innerHTML = config.filters
            .map(
              filter =>
                `<button type="button" role="radio" data-geo-filter-quick="${encodeHtml(filter.key)}" aria-checked="${filter.key === listState.filter}">${dataListIcon(filter.icon)}<span>${encodeHtml(filter.label)}</span></button>`
            )
            .join('')
          fields.innerHTML = config.filterFields
            .map(field => {
              const existing = listState.fieldFilters.find(item => item.key === field.key)
              const value = existing?.value ?? ''
              if (field.type === 'date') {
                const activeFilter = existing || {
                  key: field.key,
                  operator: 'equals',
                  value: 'today',
                }
                const clearButton = existing
                  ? `<button type="button" class="data-filter-modal-clear" data-geo-filter-clear-field="${encodeHtml(field.key)}" aria-label="${t('Clear', 'Clear')} ${encodeHtml(t(field.label))}" title="${t('Clear', 'Clear')}">${dataListIcon('i-x', 13)}</button>`
                  : ''
                return `<div class="rec-field data-filter-modal-date"><span>${encodeHtml(t(field.label))}</span>${renderDataFilterModalDateField(field, activeFilter, clearButton)}</div>`
              }
              if (field.type === 'select') {
                const input = `<select data-geo-filter-field="${encodeHtml(field.key)}"><option value="">Any</option>${field.options
                  .map(
                    option =>
                      `<option value="${encodeHtml(String(dataFilterOptionValue(option)))}"${String(dataFilterOptionValue(option)) === value ? ' selected' : ''}>${encodeHtml(String(dataFilterOptionLabel(option)))}</option>`
                  )
                  .join('')}</select>`
                return `<label class="rec-field"><span>${encodeHtml(t(field.label))}</span>${input}</label>`
              }
              const operator =
                DATA_FILTER_OPERATORS.find(item => item.key === existing?.operator) ||
                DATA_FILTER_OPERATORS[0]
              const operatorSelect = `<select class="data-filter-modal-operator" data-geo-filter-operator-select data-geo-filter-operator-key="${encodeHtml(field.key)}">${DATA_FILTER_OPERATORS.map(
                item =>
                  `<option value="${encodeHtml(item.key)}"${item.key === operator.key ? ' selected' : ''}>${encodeHtml(t(item.label))}</option>`
              ).join('')}</select>`
              const input = `<input type="text" data-geo-filter-field="${encodeHtml(field.key)}" value="${encodeHtml(value)}" placeholder="Enter ${encodeHtml(field.label.toLowerCase())}" />`
              return `<label class="rec-field"><span>${encodeHtml(t(field.label))}</span><div class="data-filter-modal-row">${operatorSelect}${input}</div></label>`
            })
            .join('')
        }

        function renderDataFilterModalDateField(field, filter, clearButton = '') {
          const {preset, a, b} = parseDateFilterValue(filter)
          const presetSelect = `<select class="data-filter-modal-operator" data-list-date-preset-select data-list-date-preset="${encodeHtml(field.key)}">${DATA_DATE_PRESET_LIST.map(
            item =>
              `<option value="${item.key}"${item.key === preset ? ' selected' : ''}>${encodeHtml(t(item.label))}</option>`
          ).join('')}</select>`
          const unitOptions = selectedUnit =>
            DATA_DATE_UNITS.map(
              unit =>
                `<option value="${unit.key}"${unit.key === selectedUnit ? ' selected' : ''}>${encodeHtml(t(unit.label))}</option>`
            ).join('')
          if (preset === 'specific') {
            const specificInput = `<input type="date" value="${encodeHtml(dataListDateInputValue(a))}" data-list-date-specific="${encodeHtml(field.key)}" aria-label="${t('Choose date', 'Choose date')}">`
            return `<div class="data-filter-modal-row">${presetSelect}${specificInput}${clearButton}</div>`
          }
          if (preset === 'previous' || preset === 'upcoming') {
            const relativeControls = `<div class="data-filter-date-relative"><input type="number" min="1" value="${encodeHtml(a || '1')}" data-list-date-amount="${encodeHtml(field.key)}" aria-label="${t('Number', 'Number')}"><select data-list-date-unit="${encodeHtml(field.key)}" aria-label="${t('Unit', 'Unit')}">${unitOptions(b || 'day')}</select></div>`
            return `<div class="data-filter-modal-row">${presetSelect}${clearButton}</div>${relativeControls}`
          }
          if (preset === 'range') {
            const rangeControls = `<div class="data-filter-date-range"><input type="date" value="${encodeHtml(dataListDateInputValue(a))}" data-list-date-range-from="${encodeHtml(field.key)}" aria-label="${t('From', 'From')}"><span>${t('to', 'to')}</span><input type="date" value="${encodeHtml(dataListDateInputValue(b))}" data-list-date-range-to="${encodeHtml(field.key)}" aria-label="${t('To', 'To')}"></div>`
            return `<div class="data-filter-modal-row">${presetSelect}${clearButton}</div>${rangeControls}`
          }
          return `<div class="data-filter-modal-row">${presetSelect}${clearButton}</div>`
        }

























        const unitPickerState = {view: 'tree', expanded: new Set(), targetSelectId: ''}

        function renderUnitPickerBranch(parentCode = '', level = 1) {
          return UNIT_ROWS.filter(row => row.parentCode === parentCode)
            .map(row => {
              const hasChildren = UNIT_ROWS.some(child => child.parentCode === row.code)
              const expanded = unitPickerState.expanded.has(row.code)
              const children =
                hasChildren && expanded
                  ? `<div class="geo-tree-children" role="group">${renderUnitPickerBranch(row.code, level + 1)}</div>`
                  : ''
              const chevronTitle = hasChildren
                ? (expanded ? 'Collapse' : 'Expand') + ` ${row.name}`
                : ''
              const chevron = hasChildren
                ? `<button type="button" class="geo-parent-picker-chevron" data-unit-toggle="${encodeHtml(row.code)}" aria-expanded="${expanded}" aria-label="${encodeHtml(chevronTitle)}" title="${encodeHtml(chevronTitle)}">${dataListIcon('i-caret', 11).replace('<svg', '<svg class="geo-node-chevron"')}</button>`
                : '<span aria-hidden="true" style="width:11px"></span>'
              return `<div class="geo-tree-branch"><span class="geo-tree-node" role="treeitem" aria-level="${level}"${hasChildren ? ` aria-expanded="${expanded}"` : ''}>${chevron}<button type="button" class="geo-parent-picker-row" data-unit-pick="${encodeHtml(row.code)}"><span class="geo-node-copy"><strong>${encodeHtml(row.name)}</strong><small>${row.status}</small></span></button></span>${children}</div>`
            })
            .join('')
        }

        function renderUnitPickerTree() {
          const tree = document.getElementById('unit-picker-tree')
          tree.innerHTML =
            renderUnitPickerBranch() || `<div class="geo-hierarchy-empty">No units available.</div>`
        }

        function layoutUnitFlowPositions(rows, nodeWidth, slotWidth, levelHeight) {
          const childrenByParent = new Map()
          rows.forEach(row => {
            const key = row.parentCode || ''
            const siblings = childrenByParent.get(key) || []
            siblings.push(row)
            childrenByParent.set(key, siblings)
          })
          const roots = childrenByParent.get('') || []
          const positions = new Map()
          let nextSlot = 0
          const place = (row, level) => {
            const children = childrenByParent.get(row.code) || []
            let centerSlot
            if (children.length) {
              const firstSlot = nextSlot
              children.forEach(child => place(child, level + 1))
              const lastSlot = nextSlot - 1
              centerSlot = (firstSlot + lastSlot) / 2
            } else {
              centerSlot = nextSlot
              nextSlot += 1
            }
            positions.set(row.code, {
              x: Math.round(centerSlot * slotWidth + slotWidth / 2 - nodeWidth / 2),
              y: 24 + level * levelHeight,
            })
            return centerSlot
          }
          roots.forEach(row => place(row, 0))
          return {positions, slotCount: Math.max(nextSlot, 1)}
        }

        function renderUnitPickerFlow() {
          const canvas = document.getElementById('unit-picker-flow-canvas')
          if (!canvas) return
          const nodeWidth = 156
          const nodeHeight = 58
          const slotWidth = 190
          const levelHeight = 164
          const maxLevel = UNIT_ROWS.reduce((max, row) => Math.max(max, row.level), 1)
          const {positions, slotCount} = layoutUnitFlowPositions(
            UNIT_ROWS,
            nodeWidth,
            slotWidth,
            levelHeight
          )
          const width = Math.max(900, slotCount * slotWidth)
          const height = Math.max(500, 24 + maxLevel * levelHeight + nodeHeight + 24)
          const connectors = UNIT_ROWS.filter(row => row.parentCode)
            .map(row => {
              const parent = positions.get(row.parentCode)
              const child = positions.get(row.code)
              if (!parent || !child) return ''
              const fromX = parent.x + nodeWidth / 2
              const fromY = parent.y + nodeHeight
              const toX = child.x + nodeWidth / 2
              const toY = child.y
              const middleY = Math.round((fromY + toY) / 2)
              return `<path d="M ${fromX} ${fromY} C ${fromX} ${middleY}, ${toX} ${middleY}, ${toX} ${toY}" />`
            })
            .join('')
          const nodes = UNIT_ROWS.map(row => {
            const position = positions.get(row.code)
            return `<button class="geo-flow-node" type="button" data-unit-pick="${encodeHtml(row.code)}" style="left:${position.x}px;top:${position.y}px" aria-label="Choose ${encodeHtml(row.name)}">${dataListIcon('i-flow', 16)}<span><strong>${encodeHtml(row.name)}</strong><small>${row.status}</small></span></button>`
          }).join('')
          canvas.style.width = `${width}px`
          canvas.style.height = `${height}px`
          canvas.innerHTML = `<div class="geo-flow-surface" style="--geo-flow-scale:1;width:${width}px;height:${height}px"><svg class="geo-flow-connectors" style="width:${width}px;height:${height}px" viewBox="0 0 ${width} ${height}" aria-hidden="true">${connectors}</svg>${nodes}</div>`
        }

        function setUnitPickerView(view) {
          if (!['tree', 'flow'].includes(view)) return
          unitPickerState.view = view
          document.querySelectorAll('[data-unit-picker-view]').forEach(tab => {
            const active = tab.dataset.unitPickerView === view
            tab.setAttribute('aria-selected', String(active))
          })
          document.getElementById('unit-picker-tree-pane').hidden = view !== 'tree'
          document.getElementById('unit-picker-flow-pane').hidden = view !== 'flow'
          if (view === 'flow') renderUnitPickerFlow()
        }

        function openUnitPicker(targetSelectId) {
          unitPickerState.targetSelectId = targetSelectId
          unitPickerState.expanded = new Set(UNIT_ROWS.map(row => row.parentCode).filter(Boolean))
          setUnitPickerView('tree')
          renderUnitPickerTree()
          unitPickerScrim.classList.add('open')
          trapFocus(unitPickerScrim.querySelector('.customer-modal'))
        }

        function closeUnitPicker() {
          unitPickerScrim.classList.remove('open')
          releaseFocus()
        }

        function chooseUnit(code) {
          const select = document.getElementById(unitPickerState.targetSelectId)
          if (select) {
            const unit = UNIT_ROWS.find(row => row.code === code)
            const value = unit ? `${unit.code} - ${unit.name}` : ''
            if (value && ![...select.options].some(option => option.value === value)) {
              select.add(new Option(value, value))
            }
            select.value = value
            select.dispatchEvent(new Event('change', {bubbles: true}))
          }
          closeUnitPicker()
        }

        function openDataFilterModal(context) {
          activeFilterModalContext = context
          renderDataFilterModal(context)
          geoFilterScrim.classList.add('open')
          trapFocus(geoFilterScrim.querySelector('.customer-modal'))
        }

        function closeDataFilterModal() {
          geoFilterScrim.classList.remove('open')
          releaseFocus()
          activeFilterModalContext = null
        }

        /* ================= custom (saved) filters: save dialog ================= */
        let activeSaveFilterContext = null

        function dataListFilterConditionSummary(config, fieldFilter) {
          const field = config.filterFields.find(item => item.key === fieldFilter.key)
          if (!field) return ''
          if (field.type === 'date') return `${field.label}: ${dateFilterLabel(fieldFilter)}`
          if (field.type === 'select') {
            const optionLabel = dataFilterOptionLabel(
              field.options.find(option => dataFilterOptionValue(option) === fieldFilter.value) ||
                fieldFilter.value
            )
            return `${field.label}: ${optionLabel}`
          }
          const operator =
            DATA_FILTER_OPERATORS.find(item => item.key === fieldFilter.operator) ||
            DATA_FILTER_OPERATORS[0]
          return `${field.label} ${t(operator.label).toLowerCase()} "${fieldFilter.value}"`
        }

        function renderIconPicker(mount, selectedIcon, onPick) {
          mount.innerHTML = DATA_CUSTOM_FILTER_ICONS.map(
            icon =>
              `<button type="button" class="data-icon-picker-option" data-icon="${icon}" aria-checked="${icon === selectedIcon}" aria-label="${icon}">${dataListIcon(icon, 16)}</button>`
          ).join('')
          mount.querySelectorAll('[data-icon]').forEach(button => {
            button.addEventListener('click', () => {
              mount
                .querySelectorAll('[data-icon]')
                .forEach(other => other.setAttribute('aria-checked', 'false'))
              button.setAttribute('aria-checked', 'true')
              onPick(button.dataset.icon)
            })
          })
        }

        function renderSaveFilterDialog(context) {
          const config = DATA_LIST_CONFIG[context]
          const listState = dataListState[context]
          document.getElementById('save-filter-name').value = ''
          const conditions = document.getElementById('save-filter-conditions')
          conditions.innerHTML = listState.fieldFilters
            .map(
              fieldFilter =>
                `<li>${encodeHtml(dataListFilterConditionSummary(config, fieldFilter))}</li>`
            )
            .join('')
          saveFilterState.icon = DATA_CUSTOM_FILTER_ICONS[0]
          renderIconPicker(
            document.getElementById('save-filter-icon-picker'),
            saveFilterState.icon,
            icon => (saveFilterState.icon = icon)
          )
        }

        const saveFilterState = {icon: DATA_CUSTOM_FILTER_ICONS[0]}
        const saveFilterScrim = document.getElementById('save-filter-scrim')

        function openSaveFilterDialog(context) {
          activeSaveFilterContext = context
          renderSaveFilterDialog(context)
          saveFilterScrim.classList.add('open')
          trapFocus(saveFilterScrim.querySelector('.customer-modal'))
          document.getElementById('save-filter-name').focus({preventScroll: true})
        }

        function closeSaveFilterDialog() {
          saveFilterScrim.classList.remove('open')
          releaseFocus()
          activeSaveFilterContext = null
        }

        function confirmSaveFilter() {
          const context = activeSaveFilterContext
          if (!context) return
          const name = document.getElementById('save-filter-name').value.trim()
          if (!name) {
            document.getElementById('save-filter-name').focus()
            return
          }
          const listState = dataListState[context]
          const customFilter = {
            id: `cf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
            name,
            icon: saveFilterState.icon,
            fieldFilters: listState.fieldFilters.map(item => ({...item})),
          }
          listState.customFilters = [...listState.customFilters, customFilter]
          persistCustomFilters(context, listState.customFilters)
          listState.activeCustomFilterId = customFilter.id
          closeSaveFilterDialog()
          toast({tone: 'ok', title: `Filter "${name}" saved`})
          refreshDataListForContext(context)
        }

        saveFilterScrim.addEventListener('click', event => {
          if (event.target === saveFilterScrim || event.target.closest('.save-filter-close')) {
            closeSaveFilterDialog()
            return
          }
          if (event.target.closest('#save-filter-confirm')) confirmSaveFilter()
        })
        saveFilterScrim.addEventListener('keydown', event => {
          if (event.key === 'Enter' && event.target.id === 'save-filter-name') {
            event.preventDefault()
            confirmSaveFilter()
          }
        })

        /* ================= custom (saved) filters: manage dialog =================
           Edits happen on a draft copy of the selected filter's fields — the
           live table and its stored localStorage entry are only touched by
           Save changes, the same "commit on save" contract as the rest of
           this dialog's name/icon fields. Switching to a different saved
           filter in the list re-seeds the draft, discarding unsaved edits. */
        let activeManageFiltersContext = null
        let activeManageFilterId = ''
        let manageFilterDraft = null
        const manageFiltersScrim = document.getElementById('manage-filters-scrim')

        function applyCustomFilter(context, customFilterId) {
          const listState = dataListState[context]
          const custom = listState.customFilters.find(item => item.id === customFilterId)
          if (!custom) return
          listState.filter = 'all'
          listState.fieldFilters = custom.fieldFilters.map(item => ({...item}))
          listState.activeCustomFilterId = custom.id
          listState.advanced = false
          listState.page = 1
          listState.selected.clear()
          refreshDataListForContext(context)
        }

        function deleteCustomFilter(context, customFilterId) {
          const listState = dataListState[context]
          listState.customFilters = listState.customFilters.filter(
            item => item.id !== customFilterId
          )
          persistCustomFilters(context, listState.customFilters)
          if (listState.activeCustomFilterId === customFilterId) {
            listState.activeCustomFilterId = ''
            listState.fieldFilters = []
          }
          refreshDataListForContext(context)
        }

        function renderManageFiltersList(context) {
          const listState = dataListState[context]
          const list = document.getElementById('manage-filters-list')
          if (!listState.customFilters.length) {
            list.innerHTML = `<li class="data-manage-filters-empty">No saved filters yet.</li>`
            document.getElementById('manage-filters-editor').hidden = true
            return
          }
          list.innerHTML = listState.customFilters
            .map(
              custom =>
                `<li><button type="button" class="data-manage-filters-item" data-manage-filter-select="${encodeHtml(custom.id)}" aria-selected="${custom.id === activeManageFilterId}">${dataListIcon(custom.icon || 'i-eye', 15)}<span>${encodeHtml(custom.name)}</span></button></li>`
            )
            .join('')
        }

        function selectManageFilter(context, customFilterId) {
          const listState = dataListState[context]
          const custom = listState.customFilters.find(item => item.id === customFilterId)
          activeManageFilterId = custom ? customFilterId : ''
          manageFilterDraft = custom
            ? {
                name: custom.name,
                icon: custom.icon || 'i-eye',
                fieldFilters: custom.fieldFilters.map(item => ({...item})),
              }
            : null
          renderManageFiltersList(context)
          renderManageFilterEditor(context)
        }

        function renderManageFilterAddCondition(config) {
          const activeKeys = new Set(manageFilterDraft.fieldFilters.map(item => item.key))
          const available = config.filterFields.filter(field => !activeKeys.has(field.key))
          if (!available.length) return ''
          const options = available
            .map(
              field =>
                `<button type="button" role="menuitem" data-manage-filter-add-condition="${encodeHtml(field.key)}">${dataListIcon(field.icon)}<span>${encodeHtml(t(field.label))}</span></button>`
            )
            .join('')
          return `<details class="data-menu" data-manage-filter-add-menu><summary>${dataListIcon('i-plus')}<span>${t('Add condition', 'Add condition')}</span></summary><div class="data-menu-popover" role="menu">${options}</div></details>`
        }

        function renderManageFilterConditionRow(field, fieldFilter) {
          const removeButton = `<button type="button" class="data-manage-filter-remove" data-manage-filter-remove-condition="${encodeHtml(field.key)}" aria-label="${t('Remove', 'Remove')} ${encodeHtml(t(field.label))} ${t('condition', 'condition')}">${dataListIcon('i-x', 13)}</button>`
          if (field.type === 'date') {
            return `<div class="data-manage-filter-condition-row"><span class="data-manage-filter-condition-label">${encodeHtml(t(field.label))}</span>${renderDataFilterModalDateField(field, fieldFilter)}${removeButton}</div>`
          }
          if (field.type === 'select') {
            const value = fieldFilter.value ?? ''
            const input = `<select class="data-manage-filter-field" data-manage-filter-field="${encodeHtml(field.key)}"><option value="">${t('Any', 'Any')}</option>${field.options
              .map(
                option =>
                  `<option value="${encodeHtml(String(dataFilterOptionValue(option)))}"${String(dataFilterOptionValue(option)) === value ? ' selected' : ''}>${encodeHtml(String(dataFilterOptionLabel(option)))}</option>`
              )
              .join('')}</select>`
            return `<div class="data-manage-filter-condition-row"><span class="data-manage-filter-condition-label">${encodeHtml(t(field.label))}</span>${input}${removeButton}</div>`
          }
          const operator =
            DATA_FILTER_OPERATORS.find(item => item.key === fieldFilter.operator) ||
            DATA_FILTER_OPERATORS[0]
          const operatorSelect = `<select class="data-filter-modal-operator" data-manage-filter-operator-select data-manage-filter-operator-key="${encodeHtml(field.key)}">${DATA_FILTER_OPERATORS.map(
            item =>
              `<option value="${encodeHtml(item.key)}"${item.key === operator.key ? ' selected' : ''}>${encodeHtml(t(item.label))}</option>`
          ).join('')}</select>`
          const input = `<input type="text" class="data-manage-filter-field" data-manage-filter-field="${encodeHtml(field.key)}" value="${encodeHtml(fieldFilter.value ?? '')}" placeholder="${t('Enter', 'Enter')} ${encodeHtml(t(field.label).toLowerCase())}" />`
          return `<div class="data-manage-filter-condition-row"><span class="data-manage-filter-condition-label">${encodeHtml(t(field.label))}</span><div class="data-filter-modal-row">${operatorSelect}${input}</div>${removeButton}</div>`
        }

        function renderManageFilterEditor(context) {
          const config = DATA_LIST_CONFIG[context]
          const editor = document.getElementById('manage-filters-editor')
          if (!manageFilterDraft) {
            editor.hidden = true
            return
          }
          editor.hidden = false
          document.getElementById('manage-filter-name').value = manageFilterDraft.name
          renderIconPicker(
            document.getElementById('manage-filter-icon-picker'),
            manageFilterDraft.icon,
            icon => (manageFilterDraft.icon = icon)
          )
          const fieldsMount = document.getElementById('manage-filter-fields')
          const conditionRows = manageFilterDraft.fieldFilters
            .map(fieldFilter => {
              const field = config.filterFields.find(item => item.key === fieldFilter.key)
              return field ? renderManageFilterConditionRow(field, fieldFilter) : ''
            })
            .join('')
          fieldsMount.innerHTML = `${conditionRows || `<p class="data-manage-filter-empty">${t('No conditions yet — add one below.', 'No conditions yet — add one below.')}</p>`}${renderManageFilterAddCondition(config)}`
        }

        function openManageFiltersDialog(context) {
          activeManageFiltersContext = context
          const listState = dataListState[context]
          selectManageFilter(context, listState.customFilters[0]?.id || '')
          manageFiltersScrim.classList.add('open')
          trapFocus(manageFiltersScrim.querySelector('.customer-modal'))
        }

        function closeManageFiltersDialog() {
          manageFiltersScrim.classList.remove('open')
          releaseFocus()
          activeManageFiltersContext = null
          activeManageFilterId = ''
          manageFilterDraft = null
        }

        function saveManageFilterEdits() {
          const context = activeManageFiltersContext
          if (!context || !manageFilterDraft) return
          const listState = dataListState[context]
          const custom = listState.customFilters.find(item => item.id === activeManageFilterId)
          if (!custom) return
          const name = document.getElementById('manage-filter-name').value.trim()
          if (!name) {
            document.getElementById('manage-filter-name').focus()
            return
          }
          custom.name = name
          custom.icon = manageFilterDraft.icon
          custom.fieldFilters = manageFilterDraft.fieldFilters.map(item => ({...item}))
          persistCustomFilters(context, listState.customFilters)
          if (listState.activeCustomFilterId === custom.id)
            listState.fieldFilters = custom.fieldFilters.map(item => ({...item}))
          renderManageFiltersList(context)
          toast({tone: 'ok', title: `Filter "${name}" updated`})
          refreshDataListForContext(context)
        }

        manageFiltersScrim.addEventListener('click', event => {
          if (
            event.target === manageFiltersScrim ||
            event.target.closest('.manage-filters-close')
          ) {
            closeManageFiltersDialog()
            return
          }
          const select = event.target.closest('[data-manage-filter-select]')
          if (select) {
            selectManageFilter(activeManageFiltersContext, select.dataset.manageFilterSelect)
            return
          }
          const addCondition = event.target.closest('[data-manage-filter-add-condition]')
          if (addCondition) {
            const config = DATA_LIST_CONFIG[activeManageFiltersContext]
            const field = config.filterFields.find(
              item => item.key === addCondition.dataset.manageFilterAddCondition
            )
            if (field && manageFilterDraft) {
              manageFilterDraft.fieldFilters.push({
                key: field.key,
                operator: field.type === 'text' ? 'contains' : 'equals',
                value:
                  field.type === 'select'
                    ? String(dataFilterOptionValue(field.options[0]))
                    : field.type === 'date'
                      ? 'today'
                      : '',
              })
              renderManageFilterEditor(activeManageFiltersContext)
            }
            return
          }
          const removeCondition = event.target.closest('[data-manage-filter-remove-condition]')
          if (removeCondition && manageFilterDraft) {
            manageFilterDraft.fieldFilters = manageFilterDraft.fieldFilters.filter(
              item => item.key !== removeCondition.dataset.manageFilterRemoveCondition
            )
            renderManageFilterEditor(activeManageFiltersContext)
            return
          }
          if (event.target.closest('#manage-filter-save')) {
            saveManageFilterEdits()
            return
          }
          if (event.target.closest('#manage-filter-delete')) {
            const context = activeManageFiltersContext
            const customFilterId = activeManageFilterId
            deleteCustomFilter(context, customFilterId)
            selectManageFilter(context, dataListState[context].customFilters[0]?.id || '')
          }
        })
        manageFiltersScrim.addEventListener('change', event => {
          if (!manageFilterDraft) return
          const operatorSelect = event.target.closest('[data-manage-filter-operator-select]')
          if (operatorSelect) {
            const item = manageFilterDraft.fieldFilters.find(
              fieldFilter => fieldFilter.key === operatorSelect.dataset.manageFilterOperatorKey
            )
            if (item) item.operator = operatorSelect.value
            return
          }
          const datePresetSelect = event.target.closest('[data-list-date-preset-select]')
          if (datePresetSelect) {
            const item = manageFilterDraft.fieldFilters.find(
              fieldFilter => fieldFilter.key === datePresetSelect.dataset.listDatePreset
            )
            if (item) {
              item.value = dataListNextDatePresetValue(item, datePresetSelect.value)
              renderManageFilterEditor(activeManageFiltersContext)
            }
            return
          }
          const field = event.target.closest('[data-manage-filter-field]')
          if (field) {
            const item = manageFilterDraft.fieldFilters.find(
              fieldFilter => fieldFilter.key === field.dataset.manageFilterField
            )
            if (item) item.value = field.value
          }
        })
        manageFiltersScrim.addEventListener('input', event => {
          if (!manageFilterDraft) return
          const dateAmount = event.target.closest('[data-list-date-amount]')
          const dateUnit = event.target.closest('[data-list-date-unit]')
          const dateSpecific = event.target.closest('[data-list-date-specific]')
          const dateRangeFrom = event.target.closest('[data-list-date-range-from]')
          const dateRangeTo = event.target.closest('[data-list-date-range-to]')
          const dateKey =
            dateAmount?.dataset.listDateAmount ||
            dateUnit?.dataset.listDateUnit ||
            dateSpecific?.dataset.listDateSpecific ||
            dateRangeFrom?.dataset.listDateRangeFrom ||
            dateRangeTo?.dataset.listDateRangeTo
          if (dateKey) {
            const item = manageFilterDraft.fieldFilters.find(
              fieldFilter => fieldFilter.key === dateKey
            )
            if (item) {
              const {preset, a, b} = parseDateFilterValue(item)
              if (dateAmount) item.value = `${preset}:${dateAmount.value || 1}:${b || 'day'}`
              else if (dateUnit) item.value = `${preset}:${a || 1}:${dateUnit.value}`
              else if (dateSpecific) item.value = `specific:${dateSpecific.value}`
              else if (dateRangeFrom) item.value = `range:${dateRangeFrom.value}:${b || ''}`
              else if (dateRangeTo) item.value = `range:${a || ''}:${dateRangeTo.value}`
            }
            return
          }
          const field = event.target.closest('input[data-manage-filter-field]')
          if (!field) return
          const item = manageFilterDraft.fieldFilters.find(
            fieldFilter => fieldFilter.key === field.dataset.manageFilterField
          )
          if (item) item.value = field.value
        })

        function applyDataFilterField(context, key, rawValue) {
          const listState = dataListState[context]
          const value = rawValue.trim()
          const existing = listState.fieldFilters.find(item => item.key === key)
          if (!value) {
            listState.fieldFilters = listState.fieldFilters.filter(item => item.key !== key)
            return
          }
          if (existing) existing.value = value
          else listState.fieldFilters.push({key, operator: 'contains', value})
        }

        function ensureDataFilterModalField(context, key, defaults) {
          const listState = dataListState[context]
          let item = listState.fieldFilters.find(fieldFilter => fieldFilter.key === key)
          if (!item) {
            item = {key, ...defaults}
            listState.fieldFilters.push(item)
          }
          return item
        }









































        // openCustomerRecord/openCustomerSearch stay in legacy-app.js as
        // thin wrappers (rather than moving into customers.js) because they
        // are the entry points the shared list/search infrastructure calls
        // BEFORE `customers` exists in this closure at parse time (its own
        // construction, further below, itself depends on `openCustomerRecord`
        // being a stable reference passed into createCustomerRecord's deps)
        // — matching the forward-reference pattern applyLocale already uses
        // for `customers.recordPage`.
        function openCustomerRecord(customerNo, mode) {
          customers.recordPage.openRecord(customerNo, mode, {CUSTOMER_SECTIONS})
          showContentView('customer-record')
        }

        function renderListA(canvas) {
          dataListState.invoice.canvas = canvas
          dataListState.invoice.sourceRows = LIST_ROWS
          renderDataList('invoice')
        }

        function openInvoiceRecord(no) {
          /* minimal per design spec §4: reflect which row was clicked in the record's
   title/breadcrumb — not a real invoice data lookup, no backend to query */
          state.docNo = no
          showContentView('record')
          applyState()
        }
        /* referenced from the grid's row onclick (inline, kept verbatim from the
   ported markup) — needs to be reachable outside this IIFE, same as toast. */
        window.openInvoiceRecord = openInvoiceRecord

        /* ---- advanced search: shared overlay opened from every list concept's Search trigger ----
   (ported from sales-invoice-list.html; trapFocus/releaseFocus already exist in this IIFE) */
        const ADVANCED_SEARCH_FIELDS = {
          invoice: [
            {key: 'docno', label: 'Doc No.', placeholder: 'e.g. 126'},
            {key: 'customer', label: 'Customer', placeholder: 'Customer name or number'},
            {key: 'date', label: 'Date range', placeholder: 'e.g. 01/08/2026 – 13/08/2026'},
            {
              key: 'status',
              label: 'Status',
              type: 'select',
              options: ['All statuses', 'Posted', 'Pending', 'Open'],
            },
            {
              key: 'pay',
              label: 'Payment method',
              type: 'select',
              options: ['All methods', 'Cash', 'Credit'],
            },
          ],
          customer: [
            {key: 'customerNo', label: 'Customer No.', placeholder: 'e.g. 200010'},
            {key: 'customerName', label: 'Customer Name', placeholder: 'e.g. customer_412'},
            {key: 'typeGroup', label: 'Type or Group', placeholder: 'e.g. Retail or General'},
            {key: 'country', label: 'Country', placeholder: 'e.g. Egypt'},
            {
              key: 'status',
              label: 'Status',
              type: 'select',
              options: ['All statuses', 'Active', 'Inactive'],
            },
          ],
          geo: [
            {key: 'code', label: 'Location Code', placeholder: 'e.g. CAI'},
            {key: 'name', label: 'Location Name', placeholder: 'e.g. Cairo'},
            {
              key: 'type',
              label: 'Type',
              type: 'select',
              options: ['All types', 'Country', 'Governorate', 'City', 'District'],
            },
            {
              key: 'status',
              label: 'Status',
              type: 'select',
              options: ['All statuses', 'Active', 'Inactive'],
            },
          ],
        }

        function renderAdvancedSearchFields(context) {
          const fields = ADVANCED_SEARCH_FIELDS[context]
          document.querySelector('#adv-search-scrim .as-fields').innerHTML = fields
            .map(field => {
              const key = encodeHtml(field.key)
              const label = encodeHtml(field.label)
              if (field.type === 'select') {
                const options = field.options
                  .map(option => `<option>${encodeHtml(option)}</option>`)
                  .join('')
                return `<div class="as-field"><label for="as-${key}">${label}</label><select id="as-${key}" data-advanced-filter="${key}">${options}</select></div>`
              }
              return `<div class="as-field"><label for="as-${key}">${label}</label><input id="as-${key}" data-advanced-filter="${key}" type="text" placeholder="${encodeHtml(field.placeholder)}"></div>`
            })
            .join('')
          document.querySelector('#adv-search-scrim .as-inp input').placeholder =
            context === 'customer'
              ? 'Search by customer number, name, type, or country'
              : context === 'geo'
                ? 'Search by location code, name, parent, or type'
                : 'Search by document number, customer, or amount'
          document.querySelector('#adv-search-scrim .as-list').innerHTML =
            context === 'customer'
              ? '<div class="as-grp">Matching customers</div><button type="button" class="as-item" role="option" data-customer-no="200010"><span class="ic"><svg width="14" height="14" aria-hidden="true"><use href="#i-user" /></svg></span><span class="tx"><span class="t">200010 · customer_412</span><span class="s">Retail · Active</span></span></button>'
              : context === 'geo'
                ? '<div class="as-grp">Matching locations</div><button type="button" class="as-item" role="option" data-geo-search-code="CAI"><span class="ic"><svg width="14" height="14" aria-hidden="true"><use href="#i-flow" /></svg></span><span class="tx"><span class="t">CAI · Cairo Governorate</span><span class="s">Governorate · Active</span></span></button>'
                : '<div class="as-grp">Matching invoices</div><button type="button" class="as-item" role="option"><span class="ic"><svg width="14" height="14" aria-hidden="true"><use href="#i-doc" /></svg></span><span class="tx"><span class="t">#126 · محمد احمد</span><span class="s">13/08/2026 · Credit</span></span></button><button type="button" class="as-item" role="option"><span class="ic"><svg width="14" height="14" aria-hidden="true"><use href="#i-doc" /></svg></span><span class="tx"><span class="t">#140 · العميل الاول</span><span class="s">13/08/2026 · Credit</span></span></button>'
          document.getElementById('adv-search-apply').hidden = context !== 'customer'
        }

        const advSearchScrim = document.getElementById('adv-search-scrim')
        function openAdvancedSearch(context = 'invoice') {
          advSearchScrim.dataset.context = context
          renderAdvancedSearchFields(context)
          advSearchScrim.classList.add('open')
          trapFocus(advSearchScrim.querySelector('.box'))
        }
        function openCustomerSearch() {
          openAdvancedSearch('customer')
        }
        function closeAdvancedSearch() {
          advSearchScrim.classList.remove('open')
          releaseFocus()
        }
        advSearchScrim.addEventListener('click', e => {
          const customerOption = e.target.closest('.as-item[data-customer-no]')
          if (customerOption && advSearchScrim.dataset.context === 'customer') {
            openCustomerRecord(customerOption.dataset.customerNo, 'view')
            return
          }
          const geoOption = e.target.closest('.as-item[data-geo-search-code]')
          if (geoOption && advSearchScrim.dataset.context === 'geo') {
            closeAdvancedSearch()
            openGeoRecord(geoOption.dataset.geoSearchCode, 'view')
            return
          }
          if (e.target === advSearchScrim || e.target.closest('.adv-search-close'))
            closeAdvancedSearch()
        })
        document.addEventListener('keydown', e => {
          if (e.key === 'Escape' && advSearchScrim.classList.contains('open')) closeAdvancedSearch()
        })
        /* referenced from inline onclick="openAdvancedSearch()" in renderListA/B/C's ported
   markup — needs to be reachable outside this IIFE, same as openInvoiceRecord. */
        window.openAdvancedSearch = openAdvancedSearch

        function parkRowMenuPopover(details) {
          if (!details.classList.contains('data-row-menu')) return
          const popover = details.querySelector(':scope > .data-menu-popover')
          if (!popover || popover.dataset.parked) return
          popover.dataset.parked = 'true'
          popover.__homeParent = details
          popover.__homeNext = popover.nextSibling
          document.body.appendChild(popover)
        }

        function unparkRowMenuPopover(details) {
          const popover = details.querySelector?.(':scope > .data-menu-popover')
          const parked =
            popover || [...document.body.children].find(child => child.__homeParent === details)
          if (!parked?.dataset.parked) return
          delete parked.dataset.parked
          parked.__homeParent.insertBefore(parked, parked.__homeNext)
          parked.__homeParent = null
          parked.__homeNext = null
        }

        document.addEventListener(
          'toggle',
          event => {
            const details = event.target.closest?.('.data-menu, .data-page-manage')
            if (!details) return
            if (!details.open) {
              unparkRowMenuPopover(details)
              return
            }
            document
              .querySelectorAll('.data-menu[open], .data-page-manage[open]')
              .forEach(openMenu => {
                if (openMenu !== details && !openMenu.contains(details))
                  openMenu.removeAttribute('open')
              })
            parkRowMenuPopover(details)
            requestAnimationFrame(() => positionDataMenu(details))
          },
          true
        )
        const repositionOpenDataMenus = () =>
          document
            .querySelectorAll('.data-menu[open], .data-page-manage[open]')
            .forEach(positionDataMenu)
        window.addEventListener('resize', repositionOpenDataMenus)
        document.addEventListener('scroll', repositionOpenDataMenus, true)

        renderDataPageManageMenus()

        document.addEventListener('click', event => {
          const parkedRowAction = event.target.closest(
            '.data-menu-popover[data-parked] [data-list-row-action]'
          )
          if (parkedRowAction) {
            const homeParent = parkedRowAction.closest('.data-menu-popover').__homeParent
            const context =
              homeParent?.closest('[data-data-list]')?.dataset.dataList ||
              homeParent?.dataset.listContext
            if (context) applyDataListRowAction(context, parkedRowAction)
            parkedRowAction.closest('.data-menu-popover').__homeParent?.removeAttribute('open')
            return
          }
          const manage = event.target.closest('[data-list-manage-action]')
          if (manage) {
            const details = manage.closest('.data-page-manage')
            const context = details.dataset.listContext
            const action = manage.dataset.listManageAction
            if (action === 'save-layout') saveDataListLayout(context)
            else if (action === 'reset-layout') resetDataListLayout(context)
            else if (action === 'statistics-status')
              applyDataListToolbarCommand(context, action, [...dataListState[context].selected][0])
            else if (action === 'export') openDataExport(context)
            else {
              toast({
                tone: 'ok',
                title: `${manage.querySelector('strong')?.textContent || action} is ready for integration`,
              })
            }
            details.removeAttribute('open')
            return
          }
          const activeMenu = event.target.closest('.data-menu, .data-page-manage')
          if (!activeMenu) {
            document
              .querySelectorAll('.data-menu[open], .data-page-manage[open]')
              .forEach(details => details.removeAttribute('open'))
          }
        })
        document.addEventListener('change', event => {
          const border = event.target.closest('[data-list-manage-border]')
          const frozen = event.target.closest('[data-list-manage-frozen]')
          const statisticsConcept = event.target.closest('[data-list-manage-statistics-concept]')
          if (!border && !frozen && !statisticsConcept) return
          const details = event.target.closest('.data-page-manage')
          const context = details?.dataset.listContext
          if (!context) return
          const listState = dataListState[context]
          if (border) listState.borderMode = border.dataset.listManageBorder
          else if (frozen) {
            const key = frozen.dataset.listManageFrozen
            if (frozen.checked) listState.frozenColumns.add(key)
            else listState.frozenColumns.delete(key)
          } else if (statisticsConcept) {
            listState.statisticsConcept = statisticsConcept.dataset.listManageStatisticsConcept
            computeDataListLayoutDirty(listState)
          }
          renderDataList(context)
          renderDataPageManageMenu(details)
          details.querySelectorAll('.data-manage-submenu').forEach(submenu => {
            if (
              submenu.querySelector(
                border
                  ? '[data-list-manage-border]'
                  : frozen
                    ? '[data-list-manage-frozen]'
                    : '[data-list-manage-statistics-concept]'
              )
            ) {
              submenu.setAttribute('open', '')
              requestAnimationFrame(() => positionDataMenu(submenu))
            }
          })
          positionDataMenu(details)
        })
        document.getElementById('customer-list-add').addEventListener('click', () => {
          const addCustomer = () => openCustomerRecord(null, 'create')
          if (!guardDataListLeave(addCustomer)) addCustomer()
        })
        const geoFilterScrim = document.getElementById('geo-filter-scrim')
        const geoParentPickerScrim = document.getElementById('geo-parent-picker-scrim')
        const unitPickerScrim = document.getElementById('unit-picker-scrim')
        const geoHierarchyScrim = document.getElementById('geo-hierarchy-scrim')
        const kanbanBlockedScrim = document.getElementById('kanban-blocked-scrim')
        const dataExportScrim = document.getElementById('data-export-scrim')
        // customer-record-canvas, the customer lookup menus, the lookup
        // search scrim, and the type-add/unit-drawer/parent-unit-drawer/
        // location-add drawer scrims are now owned entirely by
        // pages/customers/{lookups,record}.js (Task 7) — see
        // createCustomers()'s construction further below, which owns the
        // single createLookups({refs, ...}) instance. That module registers
        // its own document-wide Escape handler for its four drawers/menus;
        // this one now covers only the geo/kanban/export overlays that
        // remain page-owned.
        geoFilterScrim.addEventListener('click', event => {
          const context = activeFilterModalContext
          if (!context) return
          const listState = dataListState[context]
          const quick = event.target.closest('[data-geo-filter-quick]')
          if (quick) {
            listState.filter = quick.dataset.geoFilterQuick
            renderDataFilterModal(context)
            refreshDataListForContext(context)
            return
          }
          if (event.target.closest('#geo-filter-clear')) {
            listState.filter = 'all'
            listState.fieldFilters = []
            listState.selected.clear()
            renderDataFilterModal(context)
            refreshDataListForContext(context)
            return
          }
          const clearField = event.target.closest('[data-geo-filter-clear-field]')
          if (clearField) {
            listState.fieldFilters = listState.fieldFilters.filter(
              item => item.key !== clearField.dataset.geoFilterClearField
            )
            renderDataFilterModal(context)
            refreshDataListForContext(context)
            return
          }
          if (event.target === geoFilterScrim || event.target.closest('.geo-filter-close')) {
            closeDataFilterModal()
          }
        })
        geoFilterScrim.addEventListener('change', event => {
          const context = activeFilterModalContext
          if (!context) return
          const operatorSelect = event.target.closest('[data-geo-filter-operator-select]')
          if (operatorSelect) {
            const item = ensureDataFilterModalField(
              context,
              operatorSelect.dataset.geoFilterOperatorKey,
              {
                operator: 'contains',
                value: '',
              }
            )
            item.operator = operatorSelect.value
            refreshDataListForContext(context)
            return
          }
          const datePresetSelect = event.target.closest('[data-list-date-preset-select]')
          if (datePresetSelect) {
            const item = ensureDataFilterModalField(
              context,
              datePresetSelect.dataset.listDatePreset,
              {
                operator: 'equals',
                value: 'today',
              }
            )
            item.value = dataListNextDatePresetValue(item, datePresetSelect.value)
            renderDataFilterModal(context)
            refreshDataListForContext(context)
          }
        })

        dataExportScrim.addEventListener('click', event => {
          const format = event.target.closest('[data-export-format]')
          if (format) {
            dataExportScrim
              .querySelectorAll('[data-export-format]')
              .forEach(button => button.setAttribute('aria-checked', String(button === format)))
            return
          }
          if (event.target.closest('[data-export-columns-all]')) {
            dataExportScrim
              .querySelectorAll('[data-export-column]')
              .forEach(checkbox => (checkbox.checked = true))
            return
          }
          if (event.target.closest('[data-export-columns-none]')) {
            dataExportScrim
              .querySelectorAll('[data-export-column]')
              .forEach(checkbox => (checkbox.checked = false))
            return
          }
          if (event.target === dataExportScrim || event.target.closest('.data-export-close')) {
            closeDataExport()
          }
        })
        document.getElementById('data-export-run').addEventListener('click', runDataExport)

        kanbanBlockedScrim.addEventListener('click', event => {
          if (
            event.target === kanbanBlockedScrim ||
            event.target.closest('.kanban-blocked-close')
          ) {
            closeKanbanBlockedDialog()
          }
        })



        unitPickerScrim.addEventListener('click', event => {
          const view = event.target.closest('[data-unit-picker-view]')
          if (view) {
            setUnitPickerView(view.dataset.unitPickerView)
            return
          }
          const toggle = event.target.closest('[data-unit-toggle]')
          if (toggle) {
            const code = toggle.dataset.unitToggle
            if (unitPickerState.expanded.has(code)) unitPickerState.expanded.delete(code)
            else unitPickerState.expanded.add(code)
            renderUnitPickerTree()
            return
          }
          const pick = event.target.closest('[data-unit-pick]')
          if (pick) {
            chooseUnit(pick.dataset.unitPick)
            return
          }
          if (event.target.closest('.unit-picker-root')) {
            chooseUnit('')
            return
          }
          if (event.target === unitPickerScrim || event.target.closest('.unit-picker-close')) {
            closeUnitPicker()
          }
        })
        document.addEventListener('click', event => {
          const opener = event.target.closest('[data-unit-picker-open]')
          if (opener) openUnitPicker(opener.dataset.unitPickerOpen)
        })
        geoFilterScrim.addEventListener('input', event => {
          const context = activeFilterModalContext
          if (!context) return
          const dateAmount = event.target.closest('[data-list-date-amount]')
          const dateUnit = event.target.closest('[data-list-date-unit]')
          const dateSpecific = event.target.closest('[data-list-date-specific]')
          const dateRangeFrom = event.target.closest('[data-list-date-range-from]')
          const dateRangeTo = event.target.closest('[data-list-date-range-to]')
          const dateKey =
            dateAmount?.dataset.listDateAmount ||
            dateUnit?.dataset.listDateUnit ||
            dateSpecific?.dataset.listDateSpecific ||
            dateRangeFrom?.dataset.listDateRangeFrom ||
            dateRangeTo?.dataset.listDateRangeTo
          if (dateKey) {
            const item = ensureDataFilterModalField(context, dateKey, {
              operator: 'equals',
              value: 'today',
            })
            const {preset, a, b} = parseDateFilterValue(item)
            if (dateAmount) item.value = `${preset}:${dateAmount.value || 1}:${b || 'day'}`
            else if (dateUnit) item.value = `${preset}:${a || 1}:${dateUnit.value}`
            else if (dateSpecific) item.value = `specific:${dateSpecific.value}`
            else if (dateRangeFrom) item.value = `range:${dateRangeFrom.value}:${b || ''}`
            else if (dateRangeTo) item.value = `range:${a || ''}:${dateRangeTo.value}`
            refreshDataListForContext(context)
            return
          }
          const field = event.target.closest('[data-geo-filter-field]')
          if (!field) return
          applyDataFilterField(context, field.dataset.geoFilterField, field.value)
          refreshDataListForContext(context)
        })
        document.addEventListener('keydown', event => {
          if (event.key !== 'Escape') return
          if (geoFilterScrim.classList.contains('open')) closeDataFilterModal()
          else if (geoParentPickerScrim.classList.contains('open')) closeGeoParentPicker()
          else if (unitPickerScrim.classList.contains('open')) closeUnitPicker()
          else if (geoHierarchyScrim.classList.contains('open')) closeGeoHierarchyDialog()
          else if (kanbanBlockedScrim.classList.contains('open')) closeKanbanBlockedDialog()
          else if (dataExportScrim.classList.contains('open')) closeDataExport()
        })

        document.getElementById('adv-search-apply').addEventListener('click', () => {
          if (advSearchScrim.dataset.context !== 'customer') return
          const values = Object.fromEntries(
            [...advSearchScrim.querySelectorAll('[data-advanced-filter]')].map(control => [
              control.dataset.advancedFilter,
              control.value.trim().toLowerCase(),
            ])
          )
          const rows = CUSTOMER_ROWS.filter(row => {
            const status = row.active ? 'active' : 'inactive'
            return (
              (!values.customerNo || row.customerNo.toLowerCase().includes(values.customerNo)) &&
              (!values.customerName ||
                row.customerName.toLowerCase().includes(values.customerName)) &&
              (!values.typeGroup ||
                `${row.customerType} ${row.customerGroup}`
                  .toLowerCase()
                  .includes(values.typeGroup)) &&
              (!values.country || row.country.toLowerCase().includes(values.country)) &&
              (!values.status || values.status === 'all statuses' || values.status === status)
            )
          })
          renderCustomerList(rows, {advanced: true})
          closeAdvancedSearch()
        })

        document.getElementById('list-add').addEventListener('click', () => {
          const addInvoice = () => showContentView('record')
          if (!guardDataListLeave(addInvoice)) addInvoice()
        })
        ensureContentViewRendered = name => {
          if (initializedContentViews.has(name)) return
          if (name === 'list') renderListA(document.getElementById('list-canvas'))
          else if (name === 'customers-list') renderCustomerList()
          else if (name === 'geo-list') renderGeoList()
          else return
          initializedContentViews.add(name)
          applyDataI18n()
        }

        document.getElementById('geo-list-add').addEventListener('click', () => {
          const addLocation = () => openNewDataListRecord('geo')
          if (!guardDataListLeave(addLocation)) addLocation()
        })



        enableFlowPan('unit-picker-flow-viewport')




        renderGeoRecord()

        /* ================= Sales Invoice Record (Guided Tabs) =================
   ported from sales-invoice-record.html:2311-2412 */

        /* ---- payment method: multiple simultaneous rows, each with its own
           method-specific extra fields ---- */
        const {addPaymentMethodRow, dispose: disposeInvoicePayments} = createInvoicePayments({connectRecordLabels, applyRecordValueDirections, applyState})

        /* ---- items grid: add/remove rows, recalc total qty ---- */
        const {addItemRow, recalcTotalQty, dispose: disposeInvoiceLines} = createInvoiceLines({applyRecordValueDirections, applyState})

        /* ---- invoice-level discounts and charges ---- */
        const {recalcInvoiceSummary, addInvoiceAdjustment, dispose: disposeInvoiceAdjustments} = createInvoiceAdjustments({applyRecordValueDirections, applyState})

        /* referenced from inline onclick="addItemRow(...)" in the ported Items grid
   markup — needs to be reachable outside this IIFE, same as openInvoiceRecord. */
        window.addItemRow = addItemRow

        let generatedRecordFieldId = 0
        function connectRecordLabels(root) {
          root.querySelectorAll('.rec-field').forEach(field => {
            const label = field.querySelector(':scope > label')
            const control = field.querySelector(
              ':scope > input, :scope > select, :scope > textarea'
            )
            if (!label || !control || label.htmlFor) return
            if (!control.id) control.id = `record-field-${generatedRecordFieldId++}`
            label.htmlFor = control.id
          })
        }

        function applyRecordValueDirections(root) {
          root.querySelectorAll('input, select, textarea').forEach(control => {
            const fixedDirection = control.matches(
              '[type="number"], [type="date"], [type="time"], [type="tel"]'
            )
            control.dir = fixedDirection ? 'ltr' : 'auto'
          })
        }

        const {render: renderRecordA, dispose: disposeRecordTabs} = createInvoiceRecord({connectRecordLabels, applyRecordValueDirections, addPaymentMethodRow, addItemRow, addInvoiceAdjustment, recalcInvoiceSummary})

        const invoices = createInvoices({
          templates: {
            listRoot: document.querySelector('.list-view'), listCanvas: document.getElementById('list-canvas'),
            listFooter: document.getElementById('list-fnav'), listInstance: dataListInstances.invoice,
            recordRoots: [...document.querySelector('.content').children].filter(element => !element.matches('.email-view,.list-view,.customer-list-view,.customer-record-view,.geo-list-view,.geo-record-view')),
          }, state, operations: {applyState, applyMode, modeSel, requestLeave: requestInvoiceLeave},
          record: {render: renderRecordA, dispose: () => { disposeRecordTabs(); disposeInvoiceLines(); disposeInvoicePayments(); disposeInvoiceAdjustments() }},
        })
        // Task 10: every page factory now exists (home/notifications/email/
        // geography/customers/invoices), so this is the one point where the
        // real Navigation contract can be built. resolvePage returns the
        // already-constructed, cached Page for each id — no page
        // implementation is imported by core/navigation.js itself.
        //
        // requestLeave adapts the ONLY guard mechanism showContentView's
        // callers ever actually consulted before a transition:
        // guardDataListLeave/visibleDirtyDataListContext, shared by the
        // three list pages. It resolves via the guard's own existing
        // Stay/Discard/Save buttons calling `after?.()` — wrapping that in
        // a Promise here means `after` becomes "resolve(true)" and the
        // ambient click handlers never run any other action, so nothing is
        // executed twice.
        //
        // Two other guards exist in this codebase (the invoice record's
        // operations.requestLeave/atRisk, and the customer record's own
        // askGuard for its .customer-back/.nc1-item click) but neither was
        // ever reachable through showContentView/setNavCurrent before this
        // task: customer's guard is a document-level click interceptor
        // inside record.js that runs (and fully resolves) BEFORE
        // showContentView is ever called for that transition, and invoice's
        // guard was only ever wired to the record's own #mode <select>
        // change handler, never to leaving the record via the sidebar or
        // any other showContentView call site. Wiring either of those into
        // requestLeave here would add a leave-confirmation prompt to a
        // transition that never had one, which is exactly the kind of
        // observable-behavior change the plan's Global Constraints forbid
        // outside the one customer-restoration fix reserved for Task 11.
        const pageRegistry = new Map([
          ['launchpad', home],
          ['record', invoices.recordPage],
          ['list', invoices.listPage],
          ['customers-list', customers.listPage],
          ['customer-record', customers.recordPage],
          ['geo-list', geography.listPage],
          ['geo-record', geography.recordPage],
          ['email', email],
        ])
        function requestPageLeave(fromId) {
          if (fromId === 'list' || fromId === 'customers-list' || fromId === 'geo-list') {
            const context = {list: 'invoice', 'customers-list': 'customer', 'geo-list': 'geo'}[fromId]
            if (visibleDirtyDataListContext() !== context) return true
            return new Promise(resolve => askListLayoutGuard(context, () => resolve(true)))
          }
          return true
        }
        const navigation = createNavigation({
          resolvePage: id => pageRegistry.get(id),
          requestLeave: (fromId) => requestPageLeave(fromId),
          showPage(page) {
            if (page.id === 'launchpad') return
            attachAndShowView(page.id)
          },
          onChange: onNavigationChange,
        })
        // Every original showContentView(...) call site now routes through
        // the real navigation contract instead of driving the DOM directly.
        // Fire-and-forget matches every original call site's own usage (none
        // of them awaited showContentView's return value).
        showContentView = name => {
          navigation.navigate(name)
        }
        contentViewDeferralReady = true
        // The very first navigation: currentId starts null, so navigate()
        // shows/activates the boot view (currentContentViewName, 'record')
        // without deactivating anything else — same as the original direct
        // invoices.recordPage.activate() + showContentView(...) boot pair,
        // now performed once through the real contract instead of twice.
        navigation.navigate(currentContentViewName)
        /* the payment row and item row just created above are [data-field]
   elements that didn't exist yet for applyMode()'s initial applyState() call
   above — re-run it so their disabled state matches the current status */
        applyState()

        /* ================= data-list context (right-click) menus =================
           Right-click is pure acceleration here, never the only door: every
           menu below reuses the exact same content and dispatch functions
           the left-click "..." button and toolbar already use, so nothing
           is reachable by right-click alone. Four cases, checked in order
           of specificity:
             1. a copyable identifier cell (Doc No., Customer No./Code,
                Net Total) — the one genuinely new action, since no copy
                affordance exists anywhere today
             2. a selected row, when other rows are also selected — surfaces
                the bulk-action set instead of the single-row menu
             3. a single table row / kanban card / adaptive record — the
                per-context row-actions menu (status changes stay drag-and-
                drop only in Kanban, since they're a real multi-step
                workflow, not a one-click jump)
             4. anything else inside a data-list canvas — no menu, let the
                browser's native context menu through */
        const dataListContextMenu = document.getElementById('data-list-context-menu')

        const DATA_LIST_COPYABLE_COLUMNS = {
          invoice: ['no', 'seq', 'total'],
          customer: ['customerNo'],
          geo: ['code'],
        }

        function closeDataListContextMenu() {
          dataListContextMenu.hidden = true
          dataListContextMenu.innerHTML = ''
          delete dataListContextMenu.dataset.context
          delete dataListContextMenu.dataset.rowKey
          delete dataListContextMenu.dataset.columnKey
        }

        function positionDataListContextMenu(x, y) {
          const rect = dataListContextMenu.getBoundingClientRect()
          const maxX = window.innerWidth - rect.width - 8
          const maxY = window.innerHeight - rect.height - 8
          dataListContextMenu.style.left = `${Math.max(8, Math.min(x, maxX))}px`
          dataListContextMenu.style.top = `${Math.max(8, Math.min(y, maxY))}px`
        }

        function openDataListContextMenu(x, y, innerHtml, context, rowKey = '', columnKey = '') {
          dataListContextMenu.innerHTML = innerHtml
          dataListContextMenu.dataset.context = context
          if (rowKey) dataListContextMenu.dataset.rowKey = rowKey
          else delete dataListContextMenu.dataset.rowKey
          if (columnKey) dataListContextMenu.dataset.columnKey = columnKey
          else delete dataListContextMenu.dataset.columnKey
          dataListContextMenu.hidden = false
          positionDataListContextMenu(x, y)
          dataListContextMenu
            .querySelector('[role="menuitem"], button')
            ?.focus({preventScroll: true})
        }

        function copyTextToClipboard(text) {
          if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(text).catch(() => {})
          } else {
            const helper = document.createElement('textarea')
            helper.value = text
            helper.style.position = 'fixed'
            helper.style.opacity = '0'
            document.body.appendChild(helper)
            helper.select()
            document.execCommand('copy')
            helper.remove()
          }
          toast({tone: 'ok', title: `Copied "${text}"`})
        }

        const sharedMenuDeps = {t, encodeHtml, dataListIcon}

        function renderDataListColumnHeaderMenu(context, column) {
          const listState = dataListState[context]
          return renderSharedDataListColumnHeaderMenu(DATA_LIST_CONFIG[context], column, listState, sharedMenuDeps)
        }

        function applyDataListColumnHeaderAction(context, columnKey, action) {
          const listState = dataListState[context]
          const config = DATA_LIST_CONFIG[context]
          const result = applySharedDataListColumnHeaderAction(listState, config, columnKey, action)
          if (!result) return
          if (result.dirty) computeDataListLayoutDirty(listState)
          refreshDataListForContext(context)
        }

        document.addEventListener('contextmenu', event => {
          const header = event.target.closest('th[data-col]')
          if (header) {
            const canvas = event.target.closest('[data-data-list]')
            if (!canvas) return
            const context = canvas.dataset.dataList
            const config = DATA_LIST_CONFIG[context]
            const column = config.columns.find(item => item.key === header.dataset.col)
            if (!column) return
            event.preventDefault()
            openDataListContextMenu(
              event.clientX,
              event.clientY,
              renderDataListColumnHeaderMenu(context, column),
              context,
              '',
              column.key
            )
            return
          }
          const cell = event.target.closest('td[data-col]')
          const rowEl = event.target.closest('[data-list-row-key]')
          const canvas = event.target.closest('[data-data-list]')
          if (!canvas || !rowEl) return
          const context = canvas.dataset.dataList
          const listState = dataListState[context]
          const config = DATA_LIST_CONFIG[context]
          const key = rowEl.dataset.listRowKey

          const copyEntry =
            cell && (DATA_LIST_COPYABLE_COLUMNS[context] || []).includes(cell.dataset.col)
              ? `<button type="button" role="menuitem" data-context-copy="${encodeHtml(cell.textContent.trim())}">${dataListIcon('i-doc', 13)} ${t('Copy value', 'Copy value')}</button><div class="data-menu-separator"></div>`
              : ''

          if (listState.selected.size > 1 && listState.selected.has(key)) {
            event.preventDefault()
            const actions = renderDataListSelectionActions(config, listState)
            openDataListContextMenu(event.clientX, event.clientY, `${copyEntry}${actions}`, context)
            return
          }

          const row = config.rows.find(record => String(record[config.key]) === key)
          if (!row) return
          event.preventDefault()
          const view = rowEl.closest('.data-kanban-card') ? 'kanban' : listState.view
          const rowActionsHtml = rowMenuItems(context, row, view)
          openDataListContextMenu(
            event.clientX,
            event.clientY,
            `${copyEntry}${rowActionsHtml}`,
            context,
            key
          )
        })

        dataListContextMenu.addEventListener('click', event => {
          const copy = event.target.closest('[data-context-copy]')
          if (copy) {
            copyTextToClipboard(copy.dataset.contextCopy)
            closeDataListContextMenu()
            return
          }
          const rowAction = event.target.closest('[data-list-row-action]')
          if (rowAction) {
            const context = dataListContextMenu.dataset.context
            closeDataListContextMenu()
            if (context) applyDataListRowAction(context, rowAction)
            return
          }
          const toolbarAction = event.target.closest('[data-list-action]')
          if (toolbarAction) {
            const context = dataListContextMenu.dataset.context
            const listState = context && dataListState[context]
            const selectedKey = listState ? [...listState.selected][0] : ''
            closeDataListContextMenu()
            if (context)
              applyDataListToolbarCommand(context, toolbarAction.dataset.listAction, selectedKey)
            return
          }
          const columnAction = event.target.closest('[data-context-column-action]')
          if (columnAction && !columnAction.disabled) {
            const context = dataListContextMenu.dataset.context
            const columnKey = dataListContextMenu.dataset.columnKey
            const action = columnAction.dataset.contextColumnAction
            closeDataListContextMenu()
            if (context && columnKey) applyDataListColumnHeaderAction(context, columnKey, action)
          }
        })
        document.addEventListener('click', event => {
          if (!dataListContextMenu.hidden && !dataListContextMenu.contains(event.target))
            closeDataListContextMenu()
        })
        document.addEventListener('keydown', event => {
          if (event.key === 'Escape' && !dataListContextMenu.hidden) closeDataListContextMenu()
        })
        window.addEventListener('scroll', closeDataListContextMenu, true)
        window.addEventListener('resize', closeDataListContextMenu)

        // Task 11: startLegacyApp now returns the finite set of handles
        // main.js's composition needs to read saved prototype state BEFORE
        // any DOM-dependent restoration, apply it through each page's own
        // already-initialized setter, and only then construct
        // createPrototypeControls (which itself needs `customers`/
        // `invoices` to exist first — see prototype/controls.js). Every
        // other page factory stays private to this closure, matching the
        // plan's "not an arbitrary getter for every remaining legacy
        // binding" constraint already applied to `shared` in main.js.
        //
        // setSyncPrototypeControlsPage supplies the real implementation for
        // the forward-referenced syncPrototypeControlsPage binding declared
        // near the top of this function (see its own comment for why a
        // plain reassignment from inside this closure, like
        // onRefreshCharts's, doesn't work here: the real implementation is
        // createPrototypeControls's syncPage, built in main.js, which
        // itself depends on `customers`/`invoices` returned below).
        return {
          navigation,
          appearance,
          customers,
          invoices,
          setSyncPrototypeControlsPage(fn) {
            syncPrototypeControlsPage = fn
          },
        }
}
