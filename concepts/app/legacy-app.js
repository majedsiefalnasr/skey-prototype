// Transitional legacy application module. Task 2 extracted this file
// verbatim from the monolith's inline <script> as a classic script; Task 4
// converts it into a module and pulls the shared locale/appearance/toast/
// work/loading/dialog-focus facilities out into their own modules (see
// concepts/app/core/{locale,appearance,work}.js and
// concepts/app/components/{dialog,toast,loading}/*.js). Everything else
// below is still the original single-scope implementation, unchanged,
// pending later tasks (5-11) that extract data-list/page/navigation
// components per the plan.
//
// startLegacyApp(shared) is called once, after the app-shell markup has
// been assembled into the document (see concepts/app/entry.js), with
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
  openNewDataListRecord as sharedOpenNewDataListRecord,
  applyDataListToolbarCommand as sharedApplyDataListToolbarCommand,
  applyDataListCommandClick as sharedApplyDataListCommandClick,
  applyDataListSortClick as sharedApplyDataListSortClick,
  onDataListChange as sharedOnDataListChange,
  reorderDataListColumn as sharedReorderDataListColumn,
  saveDataListLayout as sharedSaveDataListLayout,
  resetDataListLayout as sharedResetDataListLayout,
} from './components/data-list/actions.js'

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
        /* The loading facility's getContainer callback needs to resolve the
   currently visible page/view's skeleton host, which depends on
   currentContentViewName above — a binding that does not exist yet at the
   entry point's composition time (see concepts/app/entry.js). So `loading`
   itself is constructed here, as the very next thing after
   currentContentViewName exists, passing currentSkeletonContainer through
   createLoading's own getContainer parameter (shared.loading carries the
   factory and its other constructor params from entry.js). */
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

        const state = {
          status: 'posted',
          pay: 'credit',
          dirty: false,
          design: '1',
          mode: 'record',
          missing: 3,
          prints: 2,
          docNo: '126',
        }
        const editable = s =>
          s.mode === 'create'
            ? true
            : s.mode !== 'record' && !['posted', 'canceled', 'inactive'].includes(s.status)
        /* lockbanner copy for every status — ported from sales-invoice-record.html's
   LOCK_COPY map (final-review fix round gave every status its own entry, not
   just posted/canceled/inactive) */
        const LOCK_COPY = {
          posted:
            'This invoice is posted, so its fields are read-only. Undo the posting to edit it.',
          canceled: 'This invoice is canceled, so its fields are read-only.',
          inactive:
            'This invoice is deactivated, so its fields are read-only. Reactivate it to edit.',
          open: "You're viewing this invoice. Switch to Edit mode to make changes.",
          pending: "You're viewing this invoice. Switch to Edit mode to make changes.",
          returned: "You're viewing this invoice. Switch to Edit mode to make changes.",
        }
        /* A new invoice has no number, no history and nothing to act on until it is saved.
   Everything that reads or writes the stored document waits for that first save. */
        const needsSaved = [
          'Print',
          'Posting',
          'Display Journal Entry',
          'Cancel Document',
          'Receipt Voucher',
          'Sales Return',
          'User Log',
          'Documents Flow',
          'Reports',
          'Search',
          'Add From',
          'Modify',
          'Delete',
        ]

        /* verified matrix + the one proposed correction */
        const blocked = label => {
          /* actions that only make sense on a saved record the user is not already editing */
          if (label === 'Modify') {
            if (state.mode === 'edit') return 'You are already editing this invoice'
            if (state.status === 'posted')
              return 'A posted invoice cannot be modified. Undo the posting first.'
            if (state.status === 'canceled')
              return 'A canceled invoice cannot be modified. Restore it first.'
            if (state.status === 'inactive') return 'A deactivated invoice cannot be modified'
          }
          if (label === 'Delete') {
            if (state.status === 'posted')
              return 'A posted invoice cannot be deleted. Undo the posting first.'
            if (state.status === 'canceled')
              return 'A canceled invoice is kept in the records — it cannot be deleted'
            if (state.status === 'inactive') return 'A deactivated invoice cannot be deleted'
          }
          if (state.mode === 'create') {
            if (label === 'Save')
              return state.missing
                ? `${state.missing} required ${state.missing === 1 ? 'field' : 'fields'} still empty`
                : null
            if (label === 'Undo') return state.dirty ? null : 'Nothing to undo yet'
            if (needsSaved.includes(label)) return 'Save the invoice first — it has no number yet'
            return null
          }
          return RULES[label] ? RULES[label](state) : null
        }

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
        function buildNavLaunchpad(fbody) {
          const side = fbody.querySelector('.side')
          return buildRailAndPanel(fbody, side)
        }

        function openLaunchpadListDestination(side, label) {
          if (!['Customers', 'Sales Invoice', 'Geographical Structure'].includes(label))
            return false
          const group = findNavGroup(label)
          if (group) side.querySelector('.nc2').activateByLabel(group[0])
          setNavCurrent(side, label)
          return true
        }
        function launchpadTile(label, icon, onClick, {current = false} = {}) {
          const meta = NAV_APP_META[label] || {description: '', tone: 'overview'}
          const tile = document.createElement('button')
          tile.type = 'button'
          tile.className = 'lp-tile'
          tile.dataset.tone = meta.tone
          tile.dataset.i18nOriginal = label
          tile.innerHTML =
            `<span class="lp-tile-ic"><svg width="20" height="20" aria-hidden="true"><use href="#${icon}"/></svg></span>` +
            '<span class="lp-tile-copy"><span class="lp-tile-lbl"></span><span class="lp-tile-desc"></span><span class="lp-current" hidden></span></span>' +
            '<svg class="lp-tile-go" width="14" height="14" aria-hidden="true"><use href="#i-next"/></svg>'
          const tileLabel = tile.querySelector('.lp-tile-lbl')
          const tileDescription = tile.querySelector('.lp-tile-desc')
          tileLabel.dataset.i18nOriginal = label
          tileLabel.textContent = t(label)
          tileDescription.dataset.i18nOriginal = meta.description
          tileDescription.textContent = t(meta.description)
          if (current) {
            tile.classList.add('is-current')
            tile.setAttribute('aria-current', 'page')
            const currentLabel = tile.querySelector('.lp-current')
            currentLabel.hidden = false
            currentLabel.textContent = t('Current app')
          }
          tile.addEventListener('click', onClick)
          return tile
        }
        function launchpadTag(label, icon, cls, onClick) {
          const tag = document.createElement('button')
          tag.type = 'button'
          tag.className = 'lp-tag ' + cls
          tag.innerHTML = `<svg width="13" height="13" aria-hidden="true"><use href="#${icon}"/></svg><span></span>`
          tag.querySelector('span').textContent = t(label)
          tag.addEventListener('click', onClick)
          return tag
        }

        /* the launchpad covers the ENTIRE frame — rail, topbar search, app switcher,
   everything — since it's a start screen, not a page. The only chrome kept on
   screen is the live topbar's own action cluster (AI Assistant, notifications,
   help, avatar) — MOVED in, not cloned, so its ids and wired popovers stay
   singular; restoreLaunchpadActions() below puts it back in the topbar. */
        function restoreLaunchpadActions(frame) {
          const skipLink = frame.querySelector('.lp-view .skip-link')
          if (skipLink) frame.ownerDocument.body.prepend(skipLink)
          const actions = frame.querySelector('.lp-actions .right')
          if (actions) frame.querySelector('.gtop .gsearch').after(actions)
          const app = frame.querySelector('.lp-actions-left .app')
          if (app) frame.querySelector('.gtop .left .side-toggle').after(app)
          setLaunchpadShellInert(frame, false)
        }
        function setLaunchpadShellInert(frame, inert) {
          ;[frame.querySelector('.gtop'), frame.querySelector('.fbody')].forEach(region => {
            if (!region) return
            region.inert = inert
            if (inert) region.setAttribute('aria-hidden', 'true')
            else region.removeAttribute('aria-hidden')
          })
        }
        let launchpadReturnFocus = null
        const searchTypingAnimations = new WeakMap()
        const searchTypingSuffixes = ['apps', 'screens', 'actions']
        const SEARCH_TYPING_START_DELAY_MS = 700
        const SEARCH_TYPING_TYPE_DELAY_MS = 70
        const SEARCH_TYPING_HOLD_DELAY_MS = 1100
        const SEARCH_TYPING_ERASE_DELAY_MS = 40
        const SEARCH_TYPING_NEXT_WORD_DELAY_MS = 180

        function waitForSearchTyping(delay, signal) {
          return new Promise(resolve => {
            if (signal.aborted) {
              resolve(false)
              return
            }
            const stop = () => {
              clearTimeout(timeout)
              resolve(false)
            }
            const timeout = setTimeout(() => {
              signal.removeEventListener('abort', stop)
              resolve(true)
            }, delay)
            signal.addEventListener('abort', stop, {once: true})
          })
        }

        function searchTypingLabelIsVisible(label) {
          const region = label.closest('.lp-view, .gtop')
          return label.isConnected && !!region && !region.hidden && !region.inert
        }

        function searchTypingHasStopped(label, signal) {
          return signal.aborted || !searchTypingLabelIsVisible(label)
        }

        async function typeSearchCharacters(label, text, signal) {
          /* Character boundaries: empty text does nothing; one or many append in order. */
          for (const character of text) {
            if (!(await waitForSearchTyping(SEARCH_TYPING_TYPE_DELAY_MS, signal))) return
            if (!searchTypingLabelIsVisible(label)) return
            label.textContent += character
          }
        }

        async function eraseSearchSuffix(label, suffix, signal) {
          /* Character boundaries: remove exactly the suffix length and preserve the prefix. */
          for (let index = suffix.length; index > 0; index -= 1) {
            if (!(await waitForSearchTyping(SEARCH_TYPING_ERASE_DELAY_MS, signal))) return
            if (!searchTypingLabelIsVisible(label)) return
            label.textContent = label.textContent.slice(0, -1)
          }
        }

        function stopSearchTyping(region) {
          const label = region.querySelector('.search-typing-label')
          if (!label) return
          searchTypingAnimations.get(label)?.abort()
          searchTypingAnimations.delete(label)
          label.classList.remove('is-typing')
        }

        async function animateSearchSuffix(label, suffix, signal) {
          await typeSearchCharacters(label, suffix, signal)
          if (searchTypingHasStopped(label, signal)) return
          if (!(await waitForSearchTyping(SEARCH_TYPING_HOLD_DELAY_MS, signal))) return
          await eraseSearchSuffix(label, suffix, signal)
          if (searchTypingHasStopped(label, signal)) return
          await waitForSearchTyping(SEARCH_TYPING_NEXT_WORD_DELAY_MS, signal)
        }

        async function runSearchTyping(label, signal) {
          if (!(await waitForSearchTyping(SEARCH_TYPING_START_DELAY_MS, signal))) return
          if (!searchTypingLabelIsVisible(label)) return
          label.textContent = ''
          await typeSearchCharacters(label, 'Search ', signal)
          if (searchTypingHasStopped(label, signal)) return

          while (!signal.aborted && searchTypingLabelIsVisible(label)) {
            for (const suffix of searchTypingSuffixes) {
              await animateSearchSuffix(label, suffix, signal)
              if (searchTypingHasStopped(label, signal)) return
            }
          }
        }

        async function startSearchTyping(label) {
          searchTypingAnimations.get(label)?.abort()
          label.textContent = t(label.dataset.searchStatic)
          if (
            appLocale !== 'en' ||
            !searchTypingLabelIsVisible(label) ||
            matchMedia('(prefers-reduced-motion: reduce)').matches
          ) {
            label.classList.remove('is-typing')
            return
          }

          const controller = new AbortController()
          searchTypingAnimations.set(label, controller)
          label.classList.add('is-typing')
          await runSearchTyping(label, controller.signal)
          if (searchTypingAnimations.get(label) !== controller) return
          searchTypingAnimations.delete(label)
          label.classList.remove('is-typing')
        }

        function hideLaunchpad(frame, {restoreFocus = false} = {}) {
          const lp = frame?.querySelector('.lp-view')
          if (!lp || lp.hidden) return false
          stopSearchTyping(lp)
          lp.hidden = true
          restoreLaunchpadActions(frame)
          startSearchTyping(frame.querySelector('.shell-search-label'))
          syncCustomerPrototypeControls(currentContentViewName)
          if (restoreFocus && launchpadReturnFocus?.isConnected) {
            const focusTarget = launchpadReturnFocus
            requestAnimationFrame(() => focusTarget.focus())
          }
          launchpadReturnFocus = null
          queueSkeletonForCurrentView()
          return true
        }

        function getLaunchpadUserName() {
          const fullName = document.querySelector('.user-card b')?.textContent.trim() || ''
          return fullName.split(/\s+/)[0]
        }

        /* Wraps each word of an element's content in a .lp-word span (element
   children, like the user-name <bdi>, are kept whole as one "word") and
   stamps --lp-i on each so the lp-reveal-up stagger in CSS can animate
   them one after another — the same "by word" idea as MagicUI's
   TextAnimate, done without a framer-motion dependency. */
        function animateLaunchpadWords(el) {
          const nodes = Array.from(el.childNodes)
          el.innerHTML = ''
          let i = 0
          const appendWord = node => {
            const span = document.createElement('span')
            span.className = 'lp-word'
            span.style.setProperty('--lp-i', i++)
            span.appendChild(node)
            el.appendChild(span)
          }
          nodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
              const parts = node.textContent.split(/(\s+)/).filter(Boolean)
              parts.forEach(part => {
                if (/^\s+$/.test(part)) {
                  el.appendChild(document.createTextNode(part))
                } else {
                  appendWord(document.createTextNode(part))
                }
              })
            } else {
              appendWord(node)
            }
          })
        }

        function showLaunchpad(fbody, {mode = 'home', returnFocus = null} = {}) {
          closeEmailView()
          const frame = fbody.closest('.frame')
          launchpadReturnFocus = mode === 'switcher' ? returnFocus : null
          const focusWasInShell = [frame.querySelector('.gtop'), fbody].some(region =>
            region?.contains(document.activeElement)
          )
          const side = fbody.querySelector('.side')
          side.querySelectorAll('.nc2-icn.active').forEach(b => b.classList.remove('active'))
          const panel = side.querySelector('.nc3-panel')
          if (panel) panel.hidden = true
          let lp = frame.querySelector('.lp-view')
          if (!lp) {
            lp = document.createElement('div')
            lp.className = 'lp-view'
            frame.appendChild(lp)
          }
          lp.dataset.mode = mode
          lp.setAttribute('role', 'main')
          lp.setAttribute('aria-labelledby', 'launchpad-title')
          lp.hidden = false
          lp.scrollTop = 0
          requestAnimationFrame(() => lp.scrollTo({top: 0, behavior: 'auto'}))
          stopSearchTyping(frame.querySelector('.gtop'))
          stopSearchTyping(lp)
          lp.innerHTML = ''
          const orbs = document.createElement('div')
          orbs.className = 'lp-orbs'
          orbs.setAttribute('aria-hidden', 'true')
          orbs.innerHTML =
            '<span class="lp-orb lp-orb--sm lp-orb-1"></span>' +
            '<span class="lp-orb lp-orb--lg lp-orb-2"></span>' +
            '<span class="lp-orb lp-orb--sm lp-orb-3"></span>' +
            '<span class="lp-orb lp-orb--lg lp-orb-4"></span>' +
            '<span class="lp-orb lp-orb--lg lp-orb-5"></span>' +
            '<span class="lp-orb lp-orb--sm lp-orb-6"></span>' +
            '<span class="lp-orb lp-orb--sm lp-orb-7"></span>'
          lp.appendChild(orbs)
          const content = document.createElement('div')
          content.className = 'lp-content'
          lp.appendChild(content)
          const skipLink = frame.ownerDocument.querySelector('.skip-link')
          if (skipLink) lp.prepend(skipLink)
          syncCustomerPrototypeControls('launchpad')

          const actionsLeft = document.createElement('div')
          actionsLeft.className = 'lp-actions-left'
          actionsLeft.append(frame.querySelector('.gtop .left .app'))
          if (mode === 'switcher') {
            const close = document.createElement('button')
            close.type = 'button'
            close.className = 'ibtn lp-close'
            close.setAttribute('aria-label', t('Back to current screen'))
            close.innerHTML =
              '<svg width="16" height="16" aria-hidden="true"><use href="#i-x" /></svg>' +
              `<span class="tip">${t('Back to current screen')}</span>`
            close.addEventListener('click', () => hideLaunchpad(frame, {restoreFocus: true}))
            actionsLeft.prepend(close)
          }
          const actions = document.createElement('div')
          actions.className = 'lp-actions'
          actions.append(frame.querySelector('.gtop .right'))
          const chrome = document.createElement('div')
          chrome.className = 'lp-chrome'
          chrome.append(actionsLeft, actions)
          content.appendChild(chrome)
          setLaunchpadShellInert(frame, true)

          const hero = document.createElement('div')
          hero.className = 'lp-hero'
          hero.innerHTML =
            '<img class="lp-logo" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAABQCAYAAAAnSfh8AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAOdEVYdFNvZnR3YXJlAEZpZ21hnrGWYwAALN1JREFUeAHtXQl8VNW5/85dZs9M9oQkhAQCIWyikSKKVhZFxH0DBTfEqrUWn7Zq1T6tVFuXutWtfVirFRVxQ1EBRdEiIoiyJ4FAQkhC9m0y293OO+dOAkmYuffOJCSpnf/vd8lw77nnbuc73/4dBMeCJZucnnftFTbnqMWcKX48INZK9iH4LwJ5WFlRhGbBX7+htWHzkpaqNduh491ADDEMEqCev3Mn/v7OuOTJj/s9lQoAZiAGzDBmzFkSpMNFL57QWL22lOyTIIYYBgFQl7947PQVe0Vv4whAMcI9FljhzIlI8Nf9rnTTr/8CMSKOYRCA7fwxdto7ZYKvNhchFCPekEBIkf2I5ezTXOmnNTZXfbaV7MQQQwwDCEqszMjJTz0t+uuyEWJjxKsDQsSsxZ77bHr66YkQfH8xxDBgoANQsdiHLSYcJjYYDUL01ytJBb/aCTEOHMMAg8k+4Z4/B7w1CsQQARCDZSk1Le3UFIghhgEEY3MMvxJiem/EkEQ38EmT/wf+y9xrMQwuEMJFGRBDFMDI5hpxPsTE6BgGEIyiyCzEEBU43hkToWMYUBAOjHvFQRBGx81tjBREGR30NegTS5JC/vaOeSpKzHQQw8CCgyigRn00OkA+qQJgdI0qQ6KiIcD9OBRwipuM7OiJDpHOcLMd5CllgIfXAwgcMKRftjQFcHJ71H0jcprPL4HXHYCbriuEieNSoabOC6+9tQP2H2iE1AwnIciYNBxDSHBpE9LMcMGwX2CfGE8G6TEDBTEMh9uFT+pe2PUdBMNteSgshPRz0E2KIKcc5RYMIBZJokfa0vTc9jXQ4Qnq0pUarpt6x0kLgMOjQMFK53kMA1gRYKdtW9Mn5evLRdoOjZryogwR+DNRuwXEc3YDvmwzoCYHYWUdp3Iy4EQvMI+dC9yheMBs5NwJeU0gTdsHypUbATXEHSVWswjYJgL32ytoOEXEXJkSb3VFC7yx9FI4b9ZIlQOjji4o0ba0+iF34l8hKzseJNn4fTOsta54w3VpEMNPG4WF/Ji3xgqBoiZMBk7YwcfnOqF43LIjx8ceuBb7djViFOocBgGfaQf/7qZ7yueveQK6xNgX7JrfFihz21GoUGayh0uxgtwcWFY6a+XVEcm+SGZAvOJ7QNP2AKp1EocoEzTh0E1kyb44wLetBSmvHiK17SByvnjJj4DP2R7sW0ZH+/bzgBoJV376DUJ85JpMZH031Hlgw+qFMPusvOC1urxOhrzIeJcZWg/eBeVlTeS9xozKMXRH+mzm1/6iJjoUCe9VMLKSsW7psZlZYPij5JR8y4QL/EXN9Cc5B+NubTlCmjRVpoJ4MobYH0lbXHgydDDRuDMzkqVmPyEkhVHIxbqdZyIsWMaKWOMFRVLmZT11+q8iEqGxxwwwcxfg+rjwjdqsgG8nksFVNwFQcdoICM0oLHk90/cANNvCtCHHa5wgPbEcTNcvBJzUDkZAxA648Nx8GFeQrBJr6DaMqs8WbboFJp/9CjjjLRBDDJ1QfJJTnfWJ6KZ45B1NL+66nph+uw8SxLKMIu2GoFoqgV+2ow4eRATkiobHtlwkmzma1QfWNAfjvHLUKtktOuV2ATnmDH279pmtw+gxXgHCXoMMinOZmIYnt02QZNmhXsJqlpOvzv8/QtxjCL/mLGMTH4qIgOVZ5P4aHPoND8eDeO8nYHp4DmCeSgZaHJMYwYieK77wLyKS24OEGr4pEeFNII+qA6bRBkZQW9MOf/nDTJVItUCPZ2e5iMoR04Nj6AF0dFCKlZ5PWj49uA30REzm6HG52f99y2dV2zr/T9gaU7elIWvUC6e3S01+4JymIUfOCxy9FhZwY/PKAzu73knbir0n5G+dh8WqdnrcaZiAUYADPL7SmP5J7gEluUF4dSmZiwx4qViZiMgOY6KxwAOeeAjg89HaxN6BALE2x0fAUaefkQs/7KyBGGIIBcRgAcITLwp5DEFPIlBgR20AOkRujEO7cQgH70lsQYYekP3kjwUrCjLOgempXGSGKdRORG4jxiwvb1yvpVZqk/FMvkgdXFZzVIb5GP5LYM5PvHPkF5fc0I1OGcQoAWX//lkfnBHyJI45Rt/LeWv2y1KtV3XggKi0gTGoEwTDMRYq1yKWwYZHKzaRUyoSAcZ59IMHCZfGCR5gHz9XNUDptYWUNlBu+QKgxYBYTCYEVJ5kiPtSUHVCFGXgeX1JgPa4dfthGATofMM4OT85TjktfYol33W+eVjcyWyiJZsxs3Fk9qYvNjg/EdO84hX92Cc1Sg2+MqG8/Stxd8unDVC8DVYcsW6G5g5a1y8s5OJqWKcikome2FPYgEdoa9vTBMe6Pnr1jCkpYx1e5LB3O0quZ8VtnoaGEmpICeqVgwCE6zmI3nqMHsln2GlEY8iKLVyyZf7orXMX4I4jxI0EQmU7fX+EUIiKva3xeQjxfQintWY9OfVPZBCr1yOcmnWcnrlIrG4XyTfngWUOGWc3hEOyH00EeWoJQKsOocV7gL/jStX9Y8hv600C/PxMwNf9W7Vma4JODJtyAVw+MIKM9Dh47+MSuPyCgrBGLAp1KiT/lJc1QnpWPAwQ6A2ijMIMC7Nw1KOOyWkLFVGxyS0BwJKi3qRCfNl0CwGqJ8QTAh9hTbLOtJ2aviQp4QRiUFTafD/UvtH64oH72vZUtoKxkkB49Omvbud4xwTZTqW1IK3SkHmGtYHkb3izeOONCyB6IlYJMm/yX9dZ7UOnK0qAGBGFYxohxgQZpnj/jrWzrDBIwFg4YBPNx0yF5L3TdxHy3WJBQUKVp/tORF8no/BZ9qYDF676fcjzJMVqGplwT9eLifU+VbZmE8xK84q910YkLzICA9KeoYCyGjXncqU4i7icEJ1EwRBIX9yOTAhQD5Gi/hOyGSUw5buRgOwBw6yEJbPdtTd/AHMvGqNamsMas4jxasZFr0NGduJARVipg3r4itlvEH/iPLHKowjVnuhC3MizYELk4mGV0J18tvOmIf+YcnNKi/jm/nM+0CW87LF33qVI3nGC5A1xtI0QsWXukOGXPnn4wLvfQ+Tg4nPOdAwbdXez131ADvg0JB6sSLLYSgsnRCI9HFcESpruP3Tb1w/32N15fyElBUKoArIwfsSxFqk5wCKWDMs4E2pdtf+yur9sfw/CSTQIFDJhMF0fnbFygOJMcvvHZRc1/HXnNxENEGyWwPT0DMANxE9LiKibQYv+tgqgNMeB+UnCTa1iJF2rQSDmWxeAQs+jluuun4v2bSN9iyYwvXQG4Ah18eEjkyFp+OMq8fY0Mnf+/+bffAplh90DR7wPglKwe76MefZysVpVU/ouPpXM9mKdj0atzE37n4nng44SZIkbcRVomA8U2c/w9uHXQOSgA1zJHnlXs7etjEzvTHhxi8xBFkcOV/LNL6bCIAK1/Iba3fE3pGgkNXrfKZ35gWvfme+aLaNcaviy3C7KtnFpEyAodoccdIyFbWv4y4+5LS8U56vb34tG196zObHkhDe4qnu//YR2HbHFBid6wPTUDJBTPSDf/yGg1qB0Q3VebsmFwNc5iI/WE/l8SSXE1DYw3z4P5BMrQLmQWN2T3cFIr/IUYN/+GTD1tqj6lmUF0jJdYB3yCNxzx+lw4zUTISneCoKowFcbD8L1t66EhBQH8NyAZFVSYpIKrrwaE8e/TKTU45ZcgkWFsU5OJyIZrNRsB5ILgY7tAphII9DU5xw/80PZ114uI4Q0n5O3JqPqbY9kwiDSfynIrENl4cgkAgydOifX8vz2sY65+bvk1gBrHpvwgGtO9jOtH1dQ1eYYIqYidsvq8vIwvartozK5YrsAjI+w8ruuAPlPK9R9/F1zVXcQJpwyamGHWpjjvcCUJwP7yGwy2/FBlxTpkxrR6HWj7ZsScXZuIrzx/m547uXvwecXgWMZSEq2QVKqAwbQ/YtGrr90Z6CoSUIMOr4mcOpHNzHpBhrqvg3elGSGCDH6jNe2BjyHKOfVfE6WMUve1qLrGxq+of68Ac8Y6TrZ2MYl/WH4O+fOhZ7fiky8ikdcVz5/7c0QfpRKh1/YVTL8rJzVRKicRSQtlL7ktDJCwFEbXaJnOeQzIB8hMOrSoRZqr6lXSQzdQAnZRkRpQszUWIV7itS9RGKiFTIznJCW5lCJeCCJN/HS7AKs4AI43sTbCYz66Gkjyvzg8k/726NY8hKRUZt4MaZKjPR+2Q//+xYMAuKlwKK8lZBw0AdLDYgmZgxwaFS3jUEjLAVJv4DOkSof9e2i7tZT5cDFq+ZYRrpYYhhGYqXbkfPK2Q9CR4FJzB89Dxso69wrmVFVgTEaJOaF/0zELxj/d8UtQL+BOQ75mdpgswtuncYwtjuJG0RnklIkky21mei9V8AgKqBf9/S2D9h4y3aafEATCfgQG92PrOwR1wiy8RVcFlHL0u0gtwmlPbpkm5dszbXkJyJyHuuYPfSBlLEpqi7KNYtNplwXcT1ZqcW7Qu/eYlELAwvMZzlOFQ979BsSfyFr4xg2wUJ1WZHoBH7FJ0tEvMOI+oR5ZEIm1qy6mrzE1URcharrqTu5YvArVdB/4DIyCk3OITPXCj6d6LYOo9WOz+ckQ9/4mfsSzN5TV5xE/qK8vLyQxgEpS0Ll68upz03V2etf2L6pfk8Cn1Nezh0qLw/0aC7XvFV8iGwo58wci1LJ4frSevV563fX++uHvaLu7+hP813ECHggkZVlBWPpixIXx++vf7bonJYPist12jL2STmp1pMdhfaTU2+2jE8+B8vAUS7PJltQw4s7aR2v/iAQ1WiVNOYPor+9QtGrN06NVlU//jELBpnRqgOd7wqXlpYGQrY4ymOlI3/Xr4fy8M+iShgdRNoVUo/9mt8pRsADiPg8KU3x60iKhKMyZnbvvunvjwVjKo/i2VJe49kCnzQAUFcDTpuQZhfGxo+Q2t3V7o+qW6B/uBseM215WcBTTqQEVt9o1bJnYWPjt4d7eW9HI9iST8tg4zILOVPiRIaLG86bXS7EmBjRX+OWsVwuis0/BFoObG+t23Cg4zwU4bW1LNF96bfWvE6MgAcQzJBEOxa0xwzNAW1+d+9iiJxrHvnotTtqPbCjdgf0H7hRp/7tH5KvMRt0FgvANMEWpJVlPz7wBkRHvEeIL2v0LxfFpf5sCcvFpcmSh/qraTBIt9JJLB/XkZPPEEfYDBg67g6QxLZyd+OWu6v2PP82GCM+zpU9NS457cJ3GM6ex/NxDNEAkCy1S4rkq/I273qget8rX0Lv9XguNffKMXFJJz7N8o7hHB/H0utIUruMJV9l/cGVC2IEPIBgFOLL0jUpEaeLR9LKgBlsYHJO/P1lhKteKWOfjsSgGq3adn9x+WWgH2EfCqq4nVv48DOO+HG3BbzViiz6GLJpnhQkaBlkyatuBDkO1/g3x8/8aHl74w+LyGTyMmhPmNKw/HubfO5y6othJLEzV4GGptiGOdPOWG1LmrikdNPiP0L0RIxyJz00z2Id/qosutVJqvM6NEkJsdaszNE374/Vgx5ABBoCjbSSgxawIIPzivw/QHQDvL/BJWVNGeKIP+FNWfZpMwdqtLLncIR4kyBILJFOUCzlguPPWiVzpoRfEuIF6IVXhbpsAp5KMFnTXxo77a39ECTecB8HKbIPwun1dPkdqy3nQejdpIvjnBP/RYiXXiPEtycTh9DSR+F66D+FOQwuuNdVNRHLsnYjpLokzsh+ZeatEBxQg5WQ6ViSMgvurxR8dbqiMDVaVf7waDZ0hFdCZGDTcy4aOnTkXU1+d4XKj6CPQCR6TvQ3ZI+fsZKy8XD14gi9Y01Dm+CvxUNGzL8QokTysFknCYEmzffCIJMYPQGjjkIFNHhD6khAYPqIkFGwpCwNFKGFBPoUKFjbS+1bGHANAss+uUWvEZG0GVOG/cnhH1+wFoKz+mCUnJSx05bX+NvLJL2VPljGJPk9B65ravqaurQitTgTYn0Qp+TdUCZ4K5Xjs5omywW8ldyYny/bHa4FIdBSrR4wlpE14YSbIUrYXSctUmSvtv1AkcqjenhEM4Za7CA98m4wtbDNBuKj7wA021XiiBqUuPxcsEbeRdtBuHsNCIvXgXTqgfC1siLp220FxekD8arNELhnNYi3rAf5xEq1uuYAsTXk2VjzDM0J1WuoBGSOGLx+PnrHVXjosz+f27F7sBTlZ0ac/Oe7RH9TCh38Wg1ppBUG9OH+zXe/DtEZreSx08ccDngqpOO7IB/DyZJvdNaom86BYydMRKzm/9QTPa327FMhSlji8mZrC1sYfJ6KLyN+AchjAnF6MUgvvxzkvAgH45UJ4UlLXwHx7CLSJuIw2SCBNdpB+OXXIP+JTAZjDwGyEz0jgSjuZ+4B8bWXQR7eSDT5KL4Zvb86Jwh/fgeUO1cD5NYCYyMWytRWwLO3kb6XgnhCFeHI/U4PuPrTDX/khzoMPRRNQxPK24Af4fzX6O/nup3nDR8Og0OsVqzO0Y+CrmQgS2ZrWmvxNwsvheiIlxky+sZZktCWpBeS2QlqcWYYEzEumWkaJPkdQREaRWQShs55L8S9Yk9ryZssZ9V874jhaCJ+VGIeb0rI0TrOMDz423a/FllZWcJ5xTm7AM4oBqCVKbtOQPQ3LXh3WgmI5++IOC6aFqsT7vuEmPaJRNnaI3+brv5Q4wRY9CXIQ1siFtVpjWlh6T8J8dPq7qbuw51GFtaSZ7niO5Az2vpODTCK9YADe5qepenbhs+RMStUeW1pd51YkvfJBetgYMVqNPykh54XfNV6BIktjlxu15eXda6rHM2LVhLTZryBZe2qD0RBlXlLMiFerqS9adtvmg69M7WuYsXY2oNvjm86/NlZPve+JzhTXC3L2RXVz6QBog+bUjLPnQg9Jsnm6s8rqEtKC3QBvMTsGaMgQqSlTUilRjItsCYX1B2s3BJZPrCfDP7zf9CumkGPzdlGLDQ248RA2inpbkCZtPZu+HMwEYHluz8GVGU8eUMNBzp3FzBuk/b9tJtBvmMNME126GfI5QvWLjblxos0j8/wWQgzcksAKYJ82ugfr8RDXznrno4j/S1GYFv8uFv0xFnOHI8qS56jwSjRGK1UxGWOTqIJrVptEJYlkymxtbnkz/aSjTcWVBW/9Je6ik+/aar4dE/zobW76g68/fmhXU/+ds9XC9IPVbw2zmzLpD7csK4eRfEjV8b0xyDEhEN8zQ1a96LIAWyPm3AlRCYhIdY1aTrx9Wo3wlgE2BqBEYvcvnweIcyGOP22hDuLT71JiMJCZA2yecNvahuFBem+j1Qi0gPlxMJDK8kEYdXsV+2bEny8D/AlW4jupf8OaYEi2eWHAQBbPH6Z3TIqniP8IDK/IYM44ZAb+ETLktHbr8KpN43/GQQ5XL9w5Pj4ifFYDmi+XBqsEfDWPEaIqASiD5NE8c7p14hCq2YjzjaE2f3VvKTq6q30Q2pykPaDn+9rLHrIbrKkakx6CMyOYaeHOuB17/0QNIGR1VUwDyKUNqyu/EUac4oKn6dqM0QSiUUttkp+rbGppFMnfmYZGZp6947VUrGIFrQz4o6iurLLC9LzrxkYojiY5thsN9Y3sUzj3Ppg0bz+Bf1a3J7/fZ0reHC+5N/bIiM2QtcI4chUP467LG+D84qRRaVPvFcIn6rEclyzejhn5ghZR9wzWZLw7vVz74beAVtcBVdr0QLROXFD5XtnQ5jiciEgEUJXrJn732Y55xUa7Qg3KOQpx+t6P+66XUutOdkLFSX8nMRbkoZDZMAWW/YUUWgO34Lo9d7WHX+jP/thlsY6G0WkEhXuEEqM9A1geAJER/4ZCEiwAlDR2GWIc5m3IzOtjgCRgWZ2+kRGbg+Mzn9orj/3rXOe7Thy3MRqIkZa9d6Z3132NfTBi+XNSQVaxznehWr3FtNrRTJpKU21659lmPAVSIgoDMnJlmOWkm2q2vkDa9JR5+QAk5iY5wTjII4xXtPlwnFxILd8r7oUIyory+xNA/wzA0ua0LKyHAZ+8QLiVgLtT0eMXYpdAPnx5cQ1ZdX/zDTZvykO+HsvDy50ptGeFtVTslpAvm8l4fAGdFtbAJj9KWplkQECncrRvunvTRpy98/Ocl2Vt1ooa8WRLthEK0ioKYoW7mYiVt9c94vNCU3fldIP1+dJDCbeVKXnirU6806B6IxW3UCsydoV+lWhZWtkxdiAljvna4Pnhj6VWKPJeLbQ8j7V3Y+omUk0FjMswdHwRz7xpJ9DU+lHYAAJWeeMl0TtMtEMZ4G6ul216r2DURARlFk9HuRZO4IiqRZSiavjhoVqRQ0j1S4QLVm75EJQfreK6MwmzbY4vQ1Mi+cDzmgx1DfTZga84hTAZ+/UHkJ00vGbVTcZdhorWXucoIoPhx/dvI5saNjrZz9rKUi8jei5MmIiE6tpFVihrE1JeaGw1fJF+gXVv93wKfRxql7twbUVKSNu6owpDgnRX8vnn/r3FSUbf0H1wahjg/UaYMUHqdmXn0UmvIgskZwpPlnLCUDtRYx9SEi9yucu28jxjpnhbg8TXdbmHHctwNurwMAkZosvmKsmYWhAEhr3df6OrKwszRvZmwEouTX86+TJi/iwEFCcz3ipGlolqd4O0qEkQIkaC6IRwmL/fD4h3maIZIlRbs0YCFzyPTDUPRWqZC3tK70F+FuuA0zrTQ+OyFB1RB1csPZ28uf2vM8v3kJY60TFI3Rm3xgDIWKxygP2yekfZP1t+k2VN33xT+hbIlZk0U2z9dPC3ReZ+jky91ySM/5355fv/NOqKK/PYZ0PIwXcOGHo2Wsj/37EC6JIwVUSQkBd4UQSQx7zNO98OT5t6kys4Y2yOkbMAIOjyuEcfQnW9myBp6VoRefvyMvKPn424AYX4fXHzrh0cW/89RjgPx4LOEJ/Ki2GZ/7TbMBVxEtAjFRdH1dd5Y1wXvTSDGCrnBERb/C+2sF843VB+bFH0b1g363A3nEVIGtgsBBvV9DbxqUz359U/0rRJD7TQQ0AEYvCcoufsY5N/FvqfZOolbovdWLUWvP5NUjHHqooAhOXMul9moAAUQU3jEU6LluV0jAxKNEw5cg2OXh2WBCjLItDytf+hrI1ev5gIvIa9nsSPX+0Tl/Q3rr7zSP/hwiBCeGanjsTuNvJgN8yAnCLIxhC+V0e8DddB6Yv8oPVI6OAQkvW/t/pwN09F2BXNkCbPViDet1Y4K9eBFxFQlQLhx8pWXv/xcA8Oufo5MMpgMl9m+bfpLqQcF8V5et70GlFaX29aHtJ4VtEv3X/2pTjpJ6GiMRRudHPJM0b+Q0Exdi+elilet/rn/GWZA/osMiAr0YZlv87ujQL5cD/OZlwiBi4hLa6UIdaWzc0M6xVc1ASCQXic6cPAx0kJBS6tCzaFBzvBOrP7vx/VC8RW2hlPhHYzwrUQu/8MzOBW0cmDrufcN7e2Ukol6cMhv9wAvB/mQmm56cBuykHgBB3r6pHUuNXnB+YdqJjf3SSqtNj4uIyvV1IOHRb31XUPL5QCfbQTetfLJ7wBmIY/BmXaKETlLGXTh7Rv79NyX179ofQt+Z2pr7qjQk0OkjnBhh/e7k05sxlVIcbfLJOGNBQTBw4VBfuuKiT2CDLfmwzj74ctN85MicUTJUlbQMW0Y+7+Zd6NwtSIiAEp259nFJIRXA6UagrEfYxbaE2S9Dl0m6OeAWJQQJ1Yaz9F358XsO9G7P5THs70QUMcWNq2DKPjD8f+hZKbcmKCjFQ/wJ5rzr3wXCS0JY7cvJfaXTTYEnG0AT16tTX7w5XlQ+1txS9qhlogDFyuArmg86kZXWNuhHrcGC/e/+X0IUi/jsT+rvFQsN/KtSyEk1fV1eXTFruUrzi72kpUjAgp4jV7ZB8y8TZ0LeQS79b/CvenFhDK21otiROB2L5vSMj/2bqXhrcRIxlRQo0fwXhaQV7fPuWsZxFk82Y7BljQOdKVufwM7S4FcOw0N5S/GK3fRDDfzqC1Q3nrn6s6aWd+fwQh25NJyxjsJ6YeAP0PZjdX87NouVhsY4pVZbamaSs2RsgJ4dGUBgwagX0ZTwaB21NA5MlpfebNRV4S0pAUQIfFm9YeCZovNOWsk8Osrx2rAbRbU2QNkHTvcUw1gSt4yzvgroDGzd0vZdYTayfDuSG14r3c0nmyY7ZuZvCLEF6BKZMRyH0PSjRcrUHlqalZF9VK/g1Y/0h4KlUxuU907qr/EIaBK8z8ZQqjE7AiMmWye364uK+NmZ0uu0054+OxIbksMfFNki2Dp/UADvWhzruTJk8UjeBATFksu5ehjbGgX9akGue2r6ZdZq8eg2RiTleiyBLtfvfb/S07LiWYU3a+jAxwwXaD7EFp7+2CfQtHaLecO1g+n1NwD3jckMB+dqKP9bshGgVjvgJ10Ho+0OupEkXKpJ2AJHfe3hrz/NjBPwThNwuNOm1IUR+PKUvuezHJa+Dglfr6cMIsaysBE7Om/TYXaAjERJDqaZYrsgeSE8/nXLB/nYpYE/TjqV6xQKscSPOhdCTAbbE51+lPU8g8LcWvdxzb4yAf4Jg4syZem3kNiEAxxdK8cZF55ltGR5do5YisSbb0Ecycq7MAw0ixpJPM5dQFttxXO5VNMih332C9czO7/XcaERPTgl3zGRLPwE0z3WAt+4btVB/1/0xAh44qIMs438n35rx2NQnkm4cPxMKC/mux6Lojxm6dOZCuVE/llvxyXVw/MHsXHdxPDVqgY4YSkukJo9cUAQaQR7Eh/yNDpdCLMOfOfKUZ+/tvD70Hsa+RXm5HyGkqbrIkhtSUyeHWFc5w0asXNqFADkbNDXtqOy5/7/TiEXfVWfq4ACWxB3+3rnvAs9eRL3e1nGJdyYvshA9boQgHnT/4NtZ/560z7NOLq3Z37y1WTuL/UzgklNyRzgXjHkZ2UxTaEqhZnuagl3VtgWOP1SjVsPBfxTED7lsDyVSDSC/u1waP+P9Fkr0oRq0tmx/OnnIrPO0fKWKIrKIMT84Ztry21sOrb2+2rVtNWzVz1DKyppi9SuubJMja6bVlX+5yZpxItHhzZ7mPXeXb3vgOTCQhOFzH/yWENqMcDQvix7sGHr+g3V139ESwZ3qAJMzceFiMdAIWnMFcWWVh9ofNQHTGGK3W4DWNr96WUecGeKd5shWjdXqnybi05KydChaA4DNfbNGMC1ch3OIwVBGwcQJWlWzFwuH9wKYH2K/QKwPrl5AVxIUa9UJ3IQs7Cn2yUNOgTNYYG1jIbWj+DsWZPIiQFR8okJXLGGsHEcmAEr1jNzsp1xV0SVeAsbCYO/3TS9A/0Cq3vvuPptr8r0sn7AEYyn8mEMMF/BW20dPXbqqeMOiC6BH+mPjgXfWZeReDR1F3MMDK6zkb0qKS528cqx5FoLpjCKL3kZFaG0GhvUijBQFiXaWc7o4xuKkkRqY0KdD8hBPlKAaw6jVWCZkH5c08WnSI31XugTc3vzDX+PTfj4DK2FVdWRxjLg5c9QN71TtfZnWMoP0nIuy7QkTHhH9jRo9Y/C6960MdSRiAqaE29zkg5PGp8Mzj8yCYUOdauW/A+XNsPj+z+CHHTWQlGSNLuyRCVaPlKaXAD5rF+AETzDEsSwFuNdOA8bPBhf7jgadfV+4HWDyPgCPWS0zKyx5H/jHzgXk8PU/DXNhSrAiCC7/QVxBUnd3kLljA3VpkHax53mGREYuzYGa/rHzW+g/yKVb7nqs4PRXL5KkwMkIWI3gDWoJQufkTvj9grIdS5ZBd8JhvC2732b4+MuM1IOmtZk7CIO2TSFdqzoozYVBwAO1+gqgrW7QOObExAlpocTXnqiVNq5JNl1MC+GFbUOlkLiU0z4bl3mumuRE9HYQfA2a9a1pRU1vw4+vhTwGEYASb9XBFvh0+ZXwyfJ5MHJEIpjNHJhMLOSPTIZP35oHa8ixStImYiWOhk6SyVn41/8FC+fxopqbqxZgT2sF+eEVIF60LbqStTQzqsUOwut/B3zGHpV4gyBE7fSBtPQfII2q611N66gwAOI7Jox6Wx0VCfvdUlv072tPsdiHylin4JMiC6w9acKraWkX0xzcrpOcsn/rvfNIH/32oRRFACY+y1hR8vLyAJk0GvT7DCDBX0cIt07No9abjFg+Hhqq1/wY6lhEL6K1TYBVhEAnjktXuW7XOhH0N8MgmDg+FT5feTW42yMzcqrc8ellgGqdwaygrsOL6qlU1C0sA3FGMUQM0rf4z6WAaqiVsMe4pX2Ta8LCr0FO8vZvWdl+JiEiGSrmkS7m4HWf3wa9nD3ImIv07un1uJ2li10WWyarZ3wQ/A04bcIiWnWip1GLaav96jyWtfXHEqkRo63263twFOmeWsCKQCM8Qr6viAg4xWGCn582jBBq+DYMOTj5pAxIdFrAMKgoceZeYJoc2t+VlqydtwnQ4XjDd47IOdL13wCqdmnHm7daQb73I0C0tnU/Acu430p/EIlctoxyMb5ffkMDpvUWZNIlzoC/NprynRLhUmJj5adTWd6uGxyhZi5NW06XX+lKEPLBXU+sEYWmJQxnOe61j2gmktRUbTQ/FlcWvfCy1ZbRpxKCv/0gjcUO+U0MX0iWFfjD/WcaNFIhePj+aSBJBrPciMFKPpvovLKBSZ1wUeGl10BxEKONQ9DerBKI0/YSnbfUELejBi4lzQ39BOTb1fgPOM5VI1UQm4xlpAu7b/jKVr6+nF5P0y9LjDgNOu4ajDAuh+ggV5e8tEkRmh9hGE6nMgdp4G9Ky5v89FPQPelBKt38P38UPBXXmmxDQE8k7w0Yzg4tLdsORXAK29qw5U5Qwx57D8Sw4G0rejHcccNGLI9XgnEFqWBEcKLz9wTS1uMTwBVngBPTJU2owcrLG+gcqwueKXesNibu0mL0RvVm0i8e2gzoQL+UlcWHblj3q+EfnZfOZzoulaqIBVTBfSdWqwVikGIa5mC8W+qeO3DRKlqax0i5VeRp2f1MXFLhq4QuQk7wnCkempt/fAWih1yy6dcP5E992clyjtuIfxRD+MLwLBG5b3dlT32otWJD11xY6cAPD9CgjbdGn/7KZiJSn0QMVgr03WJnGDE8Ju6d9yEyyAe3L3lq7Jlv3igEmkbSFYOhF6AJ/DXNm76G3orQLIvA7zdeysgbEFVx2hDU9dUjGLmMAtgmqhU1dDe1PI/Bvmmzfl4f6cD5q64oOektxr3x8DXAop18hgO4JAvxbDBGJNluUNcBshLPEumDdZoa/Nvqbis+4U1UsWjdnRB8OiNcAR8u+dsyLPv/abKmYpM1hWblBDf1d2rA27bnVnf1l/uhd1BKNtxw5+EDy09kGEtRMAOoy7WObKmAOBsxGDeHmoWpiKcU//v6SZU//jaRGIZeNZmTRd6cFNEaSJ2gtE8DJszWdEJ2/CF33TezSr5ZdAVEXs0T7V5/ZQHDmdfwtOwsjr4UBaJ1DBtKwoqFaNSUF8OtgXoMrr1iAtyzeIqhKqePPfctLF223dgYJK5L6YaNABmN+hyIEu/mkWBa9jNiqdYfj4Rfg/j3fwJqseq2pVU0udvnE0eNMZWHYa11xRuuS4O+QeeTY9d4VwI/KX0in5Mwnc+yT+YSrdmsy5RI/MM2mksLnavHE6cqDsh+uU1oEOv8JVJZ+/rAnsa1TabSElhxZNBFO3iC1zj6G3r8v68MNZ3rJOEu/++KzuvoSQ9H3l9WVpZV5qeezNrS55isQ6bw5vgsQKZEnrOZMe2fLtOBkEyswbQglkcWW+sItywSvBWf+d2Va5uq1x7q2h9ED9aeMjYlJeOShy2O7JksH5dCrseRiUKSJG+zInmID5bVNLpgRd6277tfnRjueEQEXF3RAu7Ke4w0BdvQR2HoUL0SK0eBMQPy429pl6ylpV8T28G0cCHgZAP1qSmIyK1ktwC+7mvAWusBd9SyNt19qVp6xwj6mIBj6FvopgD2E8Lex7jp72PBV6N5qqd5281VxS/9HfrCCp2VkwBX/eJ9zSANKi1c88uVMGyYceJVb4ROI5+PBzCFEdPV0q+twP1mHuDUCAxN5Dx29xBQGp2abWhZWe6h8wE7B2RtpBj6HoOl1kqo+2CzRt04W/TXa94jFb89NauXg8azRETAdGnmTT8ehgvmLw/eWYhuL73mHfj3lkpQIhSwMNFX+Q9OAPj4RLWCJLAdqy5Q149ZVIvasYvnE64nR1yADhOLtWnJHIDiDIBkd9D41dm3TVBrQTN3zyN6kzJ4PnsMP2XI8VnnfIJ13S7I29JSrhlAHrGmzxPjSikRpS2Zf4bzZuXBnJkj1f2ffrEfPvq4BHJHJIKJj84QRGtD899nA/5sNCiTKgCPqCeWYRbQtmxgiWWYis3Rln6l5XD5FYWA/zUF5CkHADLJe3GbgdlK/NqHnYCTPDHajaE/wOaf8sJrgq9WAc0lWTG0NW99BHRUgYh04GNOpgEYcrBvhomOsDT774jIwschY4j2jTu5cJSI6cAxRACVQPKnPP8YYiy3K4qgyTxNxBJupDwQB73wPFIR+ngQ7pH+j2NYY1/0bdhNFsN/M1QCSUycHJc2/vZtitg6VI94MSb2cc+hz8CAtZ9jGF5SFNFABEUMPSEIrbUQQwzHQiW8NFqF0l4wLSHj7CdYzpEv+GnWkf6sb7ZlMIT7Gir7yxFqp5UZdEuwxHAMsNBetgpiiKE7uMyC22clDDnjbaxINklsodlVxJ3bBEaIl5bj9bv306L3aniTXnvG377/Vb0avjEcC84Uj3y1a56FGGLoAkfahMT49KmriJHKRqtsEMqluw3qmbJktqa6S7f85ndgMFCGObhj1R8s9oyYMhcB1AkPQ0V9/e6YCB1DN9i4IUNkoS3i82hChiUuj9v15WW0nJBheiQNd0s+d+kj+mvaxNAJkzWFOVT6BC2M3t9J8TEMcojehnKWMxC22w1E1o4bzvKN99HV7amBy7BErCrbpZt/c5/JnFyBQYkRsQ4Y1iL72g7e4q7eSjNjYqpHDN3Q3Ly1lWHNxumIME6TLb1t+9pz0NatW6lrJKLFzztZNbPry8uH8+bEIoRQX67e/tMBkXF4UwKWhKa7Dmz9zVKAmMQSQ2gEfDVloBvThxWzPQsEz+H7dq27lOavUlqMmPY6Q6boxZj68ndfcKWe0miNy5ujSB5sPA/vJw1Mi4rxlmR3Vc27BdXbn6T+udgkF0M4IIs9q9pszbisJ/3QwCeOd2LO5Ap4Wose3vftrdNaar+iy8p0zcaK7GJh9uG0vKvPtztH/5blneMZhrPjgSygPBBA1FQlNgrew1+1t+16qLH8I1qMy0hCfAwxoLyTH3+b5R0XEbqRFNlfLwrN2wPu0ne8gQMftVV+S5e+6ZOUzP8Hq/XvPFDHgd8AAAAASUVORK5CYII=" alt="Skey ERP" width="240" height="80">'
          const heading = document.createElement('h1')
          heading.id = 'launchpad-title'
          heading.className = 'lp-title'
          const subtitle = document.createElement('p')
          subtitle.className = 'lp-subtitle'

          if (mode === 'home') {
            const userName = getLaunchpadUserName()
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
          } else {
            heading.textContent = t('Switch app')
            subtitle.textContent = t('Choose another app or return to your current screen.')
          }

          hero.append(heading, subtitle)
          animateLaunchpadWords(heading)
          content.appendChild(hero)

          const body = document.createElement('div')
          body.className = 'lp-body'

          /* the same "Search or run an action" panel every other page opens — .s-open
     is the topbar's own wiring; the launchpad just gives it a bar of its own */
          const search = document.createElement('button')
          search.type = 'button'
          search.className = 'lp-search s-open'
          search.innerHTML =
            `<svg width="15" height="15" aria-hidden="true"><use href="#i-search"/></svg>` +
            `<span class="lp-search-label search-typing-label" data-search-static="Search apps and screens">${t('Search apps and screens')}</span>` +
            '<span class="kbd-chip lp-keyboard-hint">⌘K</span>'
          search.setAttribute('aria-label', t('Search apps and screens'))

          const sections = document.createElement('div')
          sections.className = 'lp-sections'

          /* Starred/Recent are quick-access shortcuts, not primary content — one light
     cluster with inline micro-labels, not two more copies of the same loud
     section-heading treatment the Apps grid below needs to stand apart from */
          const quick = document.createElement('div')
          quick.className = 'lp-quick'
          const quickRow = (label, icon, cls, items, rowIndex) => {
            const row = document.createElement('section')
            row.className = 'lp-quick-row'
            row.style.setProperty('--lp-i', rowIndex)
            const labelId = `launchpad-${label.toLowerCase()}-title`
            row.setAttribute('aria-labelledby', labelId)
            const lbl = document.createElement('h2')
            lbl.id = labelId
            lbl.className = 'lp-quick-lbl'
            lbl.textContent = t(label)
            const tags = document.createElement('div')
            tags.className = 'lp-tags'
            items.forEach((name, index) => {
              const tag = launchpadTag(name, icon, cls, () => {
                /* the rail only has icons for top-level NAV_TREE groups — a leaf like
             "Sales Invoice" needs its parent group's icon activated first so the
             panel renders the leaf, then setNavCurrent highlights the leaf itself
             and switches the content view, same as clicking it in the panel would */
                if (!openLaunchpadListDestination(side, name)) {
                  const group = findNavGroup(name)
                  if (group) side.querySelector('.nc2').activateByLabel(group[0])
                  setNavCurrent(side, name)
                }
              })
              if (index > 2) tag.classList.add('lp-mobile-extra')
              tags.appendChild(tag)
            })
            const viewAll = document.createElement('button')
            viewAll.type = 'button'
            viewAll.className = 'lp-view-all'
            viewAll.setAttribute('aria-expanded', 'false')
            viewAll.textContent = t('View all')
            viewAll.addEventListener('click', () => {
              const expanded = row.classList.toggle('is-expanded')
              viewAll.setAttribute('aria-expanded', String(expanded))
              viewAll.textContent = t(expanded ? 'Show less' : 'View all')
            })
            row.append(lbl, tags, viewAll)
            return row
          }
          quick.append(
            quickRow('Starred', 'i-spark', 'starred', NAV_FAVORITES, 0),
            quickRow('Recent', 'i-clock', 'recent', NAV_RECENTS.slice(0, 5), 1)
          )

          const appsSec = document.createElement('section')
          appsSec.setAttribute('aria-labelledby', 'launchpad-apps-title')
          appsSec.innerHTML = `<div class="lp-section-hd"><h2 id="launchpad-apps-title" class="lp-section-title">${t('Apps')}</h2></div>`
          const appsGrid = document.createElement('div')
          appsGrid.className = 'lp-grid'
          visibleGroups().forEach((group, index) => {
            const tile = launchpadTile(
              group[0],
              NAV_ICONS[group[0]] || 'i-doc',
              () => {
                if (!openLaunchpadListDestination(side, group[0]))
                  side.querySelector('.nc2').activateByLabel(group[0])
              },
              {current: mode === 'switcher' && group[0] === currentAppLabel}
            )
            tile.style.setProperty('--lp-i', index)
            appsGrid.appendChild(tile)
          })
          appsSec.appendChild(appsGrid)

          sections.append(quick, appsSec)
          body.append(search, sections)
          content.appendChild(body)
          startSearchTyping(search.querySelector('.lp-search-label'))
          if (focusWasInShell) requestAnimationFrame(() => search.focus())
          queueSkeletonForCurrentView()
        }

        /* ---- the topbar's app-grid icon becomes the actual app switcher, rebuilt whenever
   the sidebar customization changes what's visible or its order ---- */
        function setupAppSwitcher(listEl) {
          listEl.innerHTML = ''
          const filterWrap = document.createElement('div')
          filterWrap.className = 'app-switcher-filter'
          filterWrap.innerHTML =
            '<svg width="13" height="13" aria-hidden="true"><use href="#i-search"/></svg>' +
            '<input type="search" placeholder="Filter apps…" aria-label="Filter apps" autocomplete="off">'
          const rows = document.createElement('div')
          rows.className = 'app-switcher-rows'
          listEl.append(filterWrap, rows)

          const side = listEl.closest('.design').querySelector('.side')
          const groups = visibleGroups()
          groups.forEach(group => {
            const label = group[0]
            const row = document.createElement('button')
            row.type = 'button'
            row.setAttribute('role', 'menuitem')
            row.className = 'app-switcher-row'
            row.dataset.label = label
            row.innerHTML = `<span class="sq"><svg width="16" height="16" aria-hidden="true"><use href="#${NAV_ICONS[label] || 'i-doc'}"/></svg></span><span></span>`
            row.querySelector('span:last-child').textContent = label
            row.addEventListener('click', () => {
              side.querySelector('.nc2').activateByLabel(label)
              rows
                .querySelectorAll('.app-switcher-row')
                .forEach(r => r.classList.toggle('active', r.dataset.label === label))
              closeAllMenus()
            })
            rows.appendChild(row)
          })
          const activeIcon = side.querySelector('.nc2-icn.active')
          const activeLabel = activeIcon ? activeIcon.getAttribute('aria-label') : null
          rows
            .querySelectorAll('.app-switcher-row')
            .forEach(r => r.classList.toggle('active', r.dataset.label === activeLabel))

          const input = filterWrap.querySelector('input')
          input.value = ''
          input.addEventListener('input', () => {
            const q = input.value.trim().toLowerCase()
            rows.querySelectorAll('.app-switcher-row').forEach(r => {
              r.hidden = !!q && !r.dataset.label.toLowerCase().includes(q)
            })
          })
          input.addEventListener('click', e => e.stopPropagation())
        }

        /* ---- global collapse: pure CSS + a class toggle, no rebuild. The nav
   already carries both its expanded markup and its collapsed rail/panel
   in the same DOM; ".side.collapsed" just switches which half is visible. ---- */
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
        document.querySelectorAll('.pager').forEach(p => {
          const inp = p.querySelector('.pg-i'),
            max = +inp.max
          inp.dir = 'ltr'
          const b = {
            f: p.querySelector('.pg-f'),
            p: p.querySelector('.pg-p'),
            n: p.querySelector('.pg-n'),
            l: p.querySelector('.pg-l'),
          }
          const pos = p.closest('.design')?.querySelector('.pos')
          const set = v => {
            v = Math.min(max, Math.max(1, v || 1))
            inp.value = v
            inp.dataset.last = v
            b.f.disabled = b.p.disabled = v === 1
            b.n.disabled = b.l.disabled = v === max
            if (pos) pos.textContent = `Record ${v} of ${max}`
          }
          b.f.onclick = () => set(1)
          b.p.onclick = () => set(+inp.value - 1)
          b.n.onclick = () => set(+inp.value + 1)
          b.l.onclick = () => set(max)
          inp.onchange = () => set(+inp.value)
          set(1)
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
        const drawer = document.getElementById('drawer'),
          drscrim = document.getElementById('drscrim')
        const EMPTY = ({icon, title, body, cta}) => `<div class="empty">
    <span class="ic"><svg width="18" height="18"><use href="#${icon}"/></svg></span>
    <h4>${title}</h4><p>${body}</p>${cta ? `<div class="cta">${cta}</div>` : ''}</div>`

        const renderCards = () => {
          /* a draft has no record to describe yet */
          if (state.mode === 'create') {
            document.querySelector('.drtab[data-tab=stages] .n').textContent = '0'
            document.querySelector('[data-panel=stages]').innerHTML = EMPTY({
              icon: 'i-clock',
              title: 'Nothing has happened yet',
              body: 'The log starts the moment you save this invoice. It will show who entered it, who changed it, and every posting or cancellation after that.',
            })
            document
              .querySelectorAll('.cur-name,.cur-badge')
              .forEach(e => (e.textContent = 'Draft'))
            return
          }
          const list = CARDS.filter(c => c.always || c.id === state.status)
          document.querySelector('.drtab[data-tab=stages] .n').textContent = list.length
          const noCard =
            state.status === 'returned'
              ? `<div class="drnote">The <b>Returned</b> flag records nothing else \u2014 no user, no date, no reason. Only the flag itself is stored.</div>`
              : ''
          document.querySelector('[data-panel=stages]').innerHTML =
            list
              .map(
                c => `
    <div class="card"><div class="mk"><span class="dot"><svg width="11" height="11"><use href="#i-check"/></svg></span></div>
      <div class="main"><div class="t">${c.name}${c.badge ? `<span class="badge gray">${c.badge}</span>` : ''}</div>
        <div class="grid" style="grid-template-columns:repeat(${Math.min(c.rows.length, 4)},1fr)">
          ${c.rows.map(r => `<div><div class="k">${r[0]}</div><div>${String(r[1]).replace('__PRINTS__', state.prints)}</div></div>`).join('')}</div>
        ${c.link ? `<a class="lnk" href="#">${c.link} →</a>` : ''}</div></div>`
              )
              .join('') +
            noCard +
            `<div class="drnote">Only the cards this invoice actually has are listed, each showing its most recent state.</div>`
          document
            .querySelectorAll('.cur-name,.cur-badge')
            .forEach(
              e =>
                (e.textContent = state.mode === 'create' ? 'Draft' : STATUSES[state.status].short)
            )
        }
        const renderActivity = () => {
          /* the live product returns nothing here on most invoices — design for that first */
          if (state.mode === 'create' || !ACTIVITY.length || state.emptyFlow) {
            document.querySelector('.drtab[data-tab=activity] .n').textContent = '0'
            document.querySelector('[data-panel=activity]').innerHTML = EMPTY({
              icon: 'i-chat',
              title:
                state.mode === 'create'
                  ? 'No conversation yet'
                  : 'Nothing has been written about this invoice',
              body:
                state.mode === 'create'
                  ? 'Once the invoice is saved, anyone who works on it can leave a note here, attach a file, or mention a colleague.'
                  : 'Notes and messages left here stay with the invoice, so the next person sees why it looks the way it does.',
              cta:
                state.mode === 'create'
                  ? ''
                  : '<button class="lbtn out" id="first-note">Write the first note</button>',
            })
            return
          }
          document.querySelector('.drtab[data-tab=activity] .n').textContent = String(
            ACTIVITY.reduce((n, g) => n + g.items.length, 0)
          )
          document.querySelector('[data-panel=activity]').innerHTML = ACTIVITY.map(
            g =>
              `<div class="daysep">${g.day}</div>` +
              g.items
                .map(it => {
                  const chips = it.chips
                    ? `<div class="chips">${it.chips.map(c => `<span class="chip"><svg width="13" height="13"><use href="#${c.i}"/></svg> ${c.t}</span>`).join('')}</div>`
                    : ''
                  const chg = it.chg
                    ? `<div class="chg">${it.chg.l} <s>${it.chg.f}</s> → <b>${it.chg.t}</b></div>`
                    : ''
                  const notes = it.notes
                    ? `<div class="tg"><button class="ntg" aria-expanded="false"><svg width="13" height="13"><use href="#i-caret"/></svg> ${it.notes.length} notes</button></div>
        <div class="notes">${it.notes
          .map(
            n => `<div class="note-i"><span class="av2">${n.ini}</span><div>
          <div class="who">${n.who} ${n.tag ? `<span class="badge gray">${n.tag}</span>` : ''} <span class="tm">${n.time}</span></div>
          <div class="txt">${n.txt}</div></div></div>`
          )
          .join('')}</div>`
                    : ''
                  return `<div class="act"><span class="av ${it.sys ? 'sys' : ''}">${it.sys ? '<svg width="13" height="13"><use href="#i-gear"/></svg>' : it.ini}</span>
        <div class="main"><div class="line"><b>${it.who}</b> ${it.auto ? '<span class="badge gray">Automatic</span> ' : ''}${it.what}<span class="tm">${it.time}</span></div>
        ${chg}${chips}${notes}</div></div>`
                })
                .join('')
          ).join('')
        }
        const selectTab = name => {
          document
            .querySelectorAll('.drtab')
            .forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === name)))
          document
            .querySelectorAll('[data-panel]')
            .forEach(p => (p.hidden = p.dataset.panel !== name))
          document.querySelectorAll('[data-for]').forEach(b => (b.hidden = b.dataset.for !== name))
        }
        const openDrawer = tab => {
          renderCards()
          renderActivity()
          drawer.classList.add('open')
          drscrim.classList.add('open')
          selectTab(tab || 'stages')
          trapFocus(drawer)
        }
        const closeDrawer = () => {
          if (drawer.classList.contains('open')) {
            drawer.classList.remove('open')
            drscrim.classList.remove('open')
            releaseFocus()
          }
        }
        document
          .querySelectorAll('.drtab')
          .forEach(t => t.addEventListener('click', () => selectTab(t.dataset.tab)))
        document.addEventListener('click', e => {
          if (e.target.closest('#first-note')) drawer.querySelector('.drfoot textarea')?.focus()
        })
        document.addEventListener('click', e => {
          const o = e.target.closest('.dr-open')
          if (o && !o.disabled) {
            closePop()
            closeAllMenus()
            openDrawer(o.dataset.tab)
          }
          if (e.target.closest('.dr-close') || e.target === drscrim) closeDrawer()
          const ntg = e.target.closest('.ntg')
          if (ntg) {
            const box = ntg.closest('.main').querySelector('.notes')
            ntg.setAttribute('aria-expanded', String(box.classList.toggle('open')))
          }
          const seg = e.target.closest('.segctl button')
          if (seg)
            seg.parentElement
              .querySelectorAll('button')
              .forEach(x => x.setAttribute('aria-pressed', String(x === seg)))
        })

        /* ================= print dialog ================= */
        const pscrim = document.getElementById('pscrim')
        let printSettingsContext = 'Sales Invoice 001000352026126'
        const updPrint = () => {
          const dest = document.querySelector('.dcard[aria-pressed=true]').dataset.dest
          document
            .querySelectorAll('[data-when]')
            .forEach(f => (f.hidden = f.dataset.when !== dest))
          const form = document.getElementById('p-form').value.replace(/^\d+ - /, '')
          const lang = document.getElementById('p-lang').value.split(' - ')[1]
          const fmt = document.getElementById('p-fmt').value.replace(/^\d+ - /, '')
          const cop = document.getElementById('p-cop')?.value || '1'
          document.querySelector('.dfoot .sum').textContent =
            dest === 'save'
              ? `${fmt} · ${form} · ${lang}`
              : dest === 'send'
                ? `${document.getElementById('p-chan').value} · ${form} · ${lang}`
                : `Preview · ${form} · ${lang}`
        }
        const currentPrintSettingsContext = () => {
          if (document.querySelector('.customer-record-view')?.hidden === false)
            return (
              document.querySelector('#customer-record-chrome h1')?.textContent.trim() || 'Customer'
            )
          if (document.querySelector('.customer-list-view')?.hidden === false)
            return 'Customers list'
          if (document.querySelector('.list-view')?.hidden === false) return 'Sales invoices list'
          return (
            document.querySelector('.design.active .phead h1')?.textContent.trim() ||
            'Sales Invoice'
          )
        }
        function openPrintSettings(contextLabel = '') {
          closeAllMenus()
          clearInlineError(pscrim.querySelector('.dlg'))
          printSettingsContext = contextLabel || currentPrintSettingsContext()
          pscrim.querySelector('.dhd .sub').textContent = printSettingsContext
          pscrim.classList.add('open')
          updPrint()
          trapFocus(pscrim.querySelector('.dlg'))
        }
        document.addEventListener('click', e => {
          if (e.target.closest('.p-open') && !e.target.closest('.p-open').disabled)
            openPrintSettings()
          if (e.target.closest('.p-close') || e.target === pscrim) {
            pscrim.classList.remove('open')
            releaseFocus()
          }
          const dc = e.target.closest('.dcard')
          if (dc) {
            dc.parentElement
              .querySelectorAll('.dcard')
              .forEach(x => x.setAttribute('aria-pressed', String(x === dc)))
            updPrint()
          }
        })
        document.querySelector('.dbody').addEventListener('change', updPrint)

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
        const rscrim = document.getElementById('rscrim')
        const ACT_DLG = {
          Posting: 'posting',
          'Display Journal Entry': 'journal',
          'Cancel Document': 'cancel',
        }
        const openRDlg = kind => {
          rscrim.querySelectorAll('.rdlg').forEach(d => {
            d.hidden = d.dataset.dlg !== kind
            clearInlineError(d)
          })
          rscrim.classList.add('open')
          trapFocus(rscrim.querySelector('.rdlg:not([hidden])'))
          const dlg = rscrim.querySelector(`.rdlg[data-dlg="${kind}"]`)
          if (!dlg) return
          /* the dialog shows either the operation to perform, or the record of it —
     never a toggle that re-asks for an intent the user already declared */
          const done =
            (kind === 'posting' && state.status === 'posted') ||
            (kind === 'cancel' && state.status === 'canceled')
          dlg
            .querySelectorAll('[data-state]')
            .forEach(el => (el.hidden = (el.dataset.state === 'done') !== done))
          const title = dlg.querySelector('.rhd h3')
          if (kind === 'posting')
            title.textContent = done ? 'Posting details · invoice 126' : 'Post invoice 126'
          if (kind === 'cancel')
            title.textContent = done ? 'Cancellation details · document 126' : 'Cancel document 126'
          if (kind === 'delete') {
            const warn = document.getElementById('del-unsaved')
            if (warn) warn.hidden = !state.dirty
          }
          if (kind === 'cancel' && !done) {
            const t = document.getElementById('cf-dsc')
            if (t) t.value = ''
          }
          if (kind === 'posting' && !done) {
            const t = document.getElementById('pf-dsc')
            if (t) t.value = ''
          }
          ;['cf-rev', 'pf-rev'].forEach(id => {
            const t = document.getElementById(id)
            if (t) t.value = ''
          })
          validateOps()
        }
        const closeRDlg = () => {
          if (rscrim.classList.contains('open')) {
            rscrim.classList.remove('open')
            releaseFocus()
          }
        }
        /* every destructive or reversing step needs its reason before it can run */
        const validateOps = () => {
          const pair = [
            ['cf-dsc', 'cf-save'],
            ['cf-rev', 'cf-restore'],
            ['pf-rev', 'pf-unpost'],
          ]
          pair.forEach(([src, btn]) => {
            const t = document.getElementById(src),
              b = document.getElementById(btn)
            if (t && b) b.disabled = !t.value.trim()
          })
        }
        document.addEventListener('input', e => {
          if (['cf-dsc', 'cf-rev', 'pf-rev'].includes(e.target.id)) validateOps()
        })
        document.addEventListener('click', e => {
          const act = e.target.closest('[data-act]')
          if (act && !act.disabled && ACT_DLG[act.dataset.act]) {
            closeAllMenus()
            closeSearch()
            openRDlg(ACT_DLG[act.dataset.act])
            return
          }
          if (e.target.closest('.r-close') || e.target === rscrim) closeRDlg()
        })

        /* ================= shell services: focus, toasts, async work =================
   Everything that takes time has three visible states — working, done, failed —
   and every overlay gives the keyboard back where it found it.                */


        /* ---- failure shown inside the dialog, so nothing typed is lost ---- */
        const showInlineError = (dlg, {title, body, link}) => {
          clearInlineError(dlg)
          const box = document.createElement('div')
          box.className = 'inlineerr'
          box.setAttribute('role', 'alert')
          box.innerHTML = `<svg width="15" height="15"><use href="#i-warn"/></svg>
    <span><b>${title}</b>${body}${link ? ` <a href="#">${link}</a>` : ''}</span>`
          const body_ = dlg.querySelector('.rbody, .dbody')
          body_.prepend(box)
          box.scrollIntoView({block: 'nearest'})
        }
        const clearInlineError = dlg => dlg?.querySelectorAll('.inlineerr').forEach(b => b.remove())

        /* Invoice line validation — every column with a visible header gets a real
           check here, so an invalid cell can be marked and focused, not just
           reported as an abstract count. Item and Quantity are the two columns a
           line cannot be posted without. */
        function validateInvoiceLines() {
          const rows = [...document.querySelectorAll('#items-body tr[data-item-row]')]
          const problems = []
          rows.forEach((row, index) => {
            const itemField = row.querySelector('[aria-label="Item"]')
            const qtyField = row.querySelector('[aria-label="Quantity"]')
            const rowInvalid = []
            if (itemField && !itemField.value.trim())
              rowInvalid.push([itemField, t('Item is required.', 'Item is required.')])
            if (qtyField && (!qtyField.value || Number(qtyField.value) <= 0))
              rowInvalid.push([qtyField, t('Quantity is required.', 'Quantity is required.')])
            rowInvalid.forEach(([field, message]) => {
              field.setAttribute('aria-invalid', 'true')
              const lineLabel = appLocale === 'ar' ? `السطر ${index + 1}` : `Line ${index + 1}`
              problems.push({field, message: `${lineLabel}: ${message}`})
            })
          })
          return problems
        }

        function clearInvoiceLineValidation() {
          document
            .querySelectorAll('#items-body [aria-invalid="true"]')
            .forEach(field => field.removeAttribute('aria-invalid'))
          const summary = document.getElementById('items-error-summary')
          if (summary) {
            summary.hidden = true
            summary.innerHTML = ''
          }
        }

        function showInvoiceLineErrors(problems) {
          const summary = document.getElementById('items-error-summary')
          if (!summary) return
          summary.hidden = false
          const headline =
            appLocale === 'ar'
              ? `${problems.length} ${t(problems.length === 1 ? 'required field needs attention' : 'required fields need attention')}`
              : `${problems.length} required ${problems.length === 1 ? 'field needs' : 'fields need'} attention`
          summary.innerHTML = `<svg width="16" height="16" aria-hidden="true"><use href="#i-warn"/></svg><span><b>${encodeHtml(headline)}</b><ul>${problems.map(p => `<li>${encodeHtml(p.message)}</li>`).join('')}</ul></span>`
          const first = problems[0].field
          first.scrollIntoView({block: 'center'})
          first.focus()
        }

        /* clear a cell's invalid state as soon as it has a value, instead of making
           the user save again just to see the marker go away */
        document.addEventListener('input', event => {
          const field = event.target.closest('#items-body [aria-invalid="true"]')
          if (!field) return
          const hasValue =
            field.tagName === 'INPUT' && field.type === 'number'
              ? Number(field.value) > 0
              : Boolean(field.value.trim())
          if (!hasValue) return
          field.removeAttribute('aria-invalid')
          if (!document.querySelector('#items-body [aria-invalid="true"]'))
            clearInvoiceLineValidation()
        })

        /* ================= the three operations that take time ================= */
        let nextInvoiceNo = 129

        /* Save — the moment a draft becomes a record with a number */
        const doSave = async (btn, after) => {
          if (blocked('Save')) return
          const creating = state.mode === 'create'
          const lineProblems = document.getElementById('items-body') ? validateInvoiceLines() : []
          if (lineProblems.length) {
            showInvoiceLineErrors(lineProblems)
            toast({
              tone: 'bad',
              title: 'Could not save the invoice',
              body: `${lineProblems.length} line ${lineProblems.length === 1 ? 'field needs' : 'fields need'} attention before saving.`,
            })
            return
          }
          clearInvoiceLineValidation()
          const ok = await runWork(btn, creating ? 'Saving…' : 'Saving…')
          if (!ok) {
            toast({
              tone: 'bad',
              title: 'Could not save the invoice',
              body: 'The warehouse rejected the quantity on line 1. Fix it and try again.',
            })
            return
          }
          const no = nextInvoiceNo
          if (creating) {
            nextInvoiceNo++
            modeSel.value = 'record'
            applyMode('record')
          } else {
            state.dirty = false
            document.getElementById('dirty').checked = false
            if (state.mode === 'edit') {
              modeSel.value = 'record'
              applyMode('record')
            } else applyState()
          }
          toast({
            tone: 'ok',
            title: creating ? `Saved as invoice ${no}` : 'Changes saved',
            body: creating ? 'It now has a number and a place in the list.' : '',
            action: creating ? 'Open it' : null,
          })
          after && after()
        }

        /* Posting — the one that can genuinely fail, and says how */
        const doPost = async btn => {
          const dlg = rscrim.querySelector('.rdlg[data-dlg=posting]')
          const ok = await runWork(btn, 'Posting…', 1100)
          if (!ok) {
            showInlineError(dlg, {
              title: 'The journal entry did not balance',
              body: 'Debit 29,780.00 against credit 20,000.00. Nothing was posted and the invoice is unchanged.',
              link: 'Display Journal Entry ( Sales Invoice - Unbalanced )',
            })
            return
          }
          closeRDlg()
          document.getElementById('st').value = 'posted'
          state.status = 'posted'
          applyState()
          toast({
            tone: 'ok',
            title: 'Invoice 126 posted',
            body: 'Journal entry 4521 was created.',
            action: 'Display Journal Entry',
            onAction: () => openRDlg('journal'),
          })
        }

        /* Cancel — destructive, so the confirmation carries the reason */
        const doCancel = async btn => {
          const dlg = rscrim.querySelector('.rdlg[data-dlg=cancel]')
          const ok = await runWork(btn, 'Canceling…')
          if (!ok) {
            showInlineError(dlg, {
              title: 'Could not cancel the document',
              body: 'A receipt voucher is already linked to this invoice. Cancel the voucher first.',
            })
            return
          }
          closeRDlg()
          document.getElementById('st').value = 'canceled'
          state.status = 'canceled'
          applyState()
          toast({
            tone: 'ok',
            title: 'Document 126 canceled',
            body: 'Your reason is kept in the Cancellation Data card.',
            action: 'See the record',
            onAction: () => openRDlg('cancel'),
          })
        }

        /* Print — and the count the product already stores */
        const doPrint = async btn => {
          const dest = document.querySelector('.dcard[aria-pressed=true]').dataset.dest
          const ok = await runWork(
            btn,
            dest === 'save' ? 'Preparing the file…' : 'Preparing…',
            1000
          )
          const dlg = pscrim.querySelector('.dlg')
          if (!ok) {
            showInlineError(dlg, {
              title: 'The print form could not be generated',
              body: 'Form 3 - Arabic\\English Form is missing a template for this document type.',
            })
            return
          }
          pscrim.classList.remove('open')
          releaseFocus()
          const invoicePrint = printSettingsContext.startsWith('Sales Invoice')
          if (invoicePrint) {
            state.prints++
            applyState()
          }
          toast({
            tone: 'ok',
            title:
              dest === 'save' ? 'File ready' : dest === 'send' ? 'Sent' : 'Opened in the viewer',
            body: invoicePrint
              ? `This invoice has now been printed ${state.prints} times.`
              : `${printSettingsContext} is ready.`,
          })
        }

        /* wire the primary buttons of each dialog */
        document.addEventListener('click', e => {
          const b = e.target.closest('button')
          if (!b || b.disabled) return
          const label = b.textContent.trim()
          if (b.classList.contains('okfill') && label.startsWith('Post')) {
            doPost(b)
            return
          }
          if (b.id === 'cf-save') {
            doCancel(b)
            return
          }
          if (b.id === 'del-go') {
            doDelete(b)
            return
          }
          if (b.closest('.dfoot') && label === 'Apply') {
            doPrint(b)
            return
          }
          if (b.dataset.act === 'Save') {
            doSave(b)
            return
          }
          if (b.dataset.save === 'new') {
            doSave(b, () => {
              modeSel.value = 'create'
              applyMode('create')
            })
            return
          }
          if (b.dataset.save === 'close') {
            doSave(b)
            return
          }
        })

        /* ---- nothing on this shell is a dead click ---- */
        const startCreate = why => {
          const go = () => {
            modeSel.value = 'create'
            applyMode('create')
            toast({
              tone: 'ok',
              title: why || 'New invoice started',
              body: 'It takes its number when you save it.',
            })
          }
          if (atRisk()) askGuard(go, why ? 'copy from another invoice' : 'start another invoice')
          else go()
        }
        const NOT_BUILT = {
          Reports: 'Reports open the reporting screen in the real product.',
          'Lock Screen': 'Locking the screen is part of the session, not this prototype.',
          'Screen Parameters': 'Screen parameters open the configuration screen.',
          Clear: 'Clearing empties the form without leaving the record.',
        }
        /* shared so the command row and the search palette trigger the same behaviour */
        const runAction = act => {
          if (act === 'New') {
            startCreate()
            return
          }
          if (act === 'Add From') {
            startCreate('Copied from another invoice')
            return
          }
          if (act === 'New in new tab') {
            closeAllMenus()
            window.open(location.href, '_blank')
            toast({
              tone: 'ok',
              title: 'Opened in a new tab',
              body: 'This invoice stays exactly as it was here.',
            })
            return
          }
          if (act === 'Search') {
            closeAllMenus()
            openSearch()
            return
          }
          if (act === 'Receipt Voucher' || act === 'Sales Return') {
            closeAllMenus()
            toast({
              tone: 'ok',
              title: `${act} started from invoice 126`,
              body: 'The new document opens with the invoice already filled in.',
            })
            return
          }
          if (NOT_BUILT[act]) {
            closeAllMenus()
            toast({tone: 'ok', title: `${act} is out of scope here`, body: NOT_BUILT[act]})
            return
          }
          if (act === 'Modify') {
            modeSel.value = 'edit'
            applyMode('edit')
            toast({
              tone: 'ok',
              title: 'You can edit this invoice now',
              body: 'Change something in the form, then Save. Undo leaves it as it was.',
            })
            return
          }
          if (act === 'Delete') {
            openRDlg('delete')
            return
          }
          if (act === 'Undo' && state.mode === 'edit') {
            state.dirty = false
            document.getElementById('dirty').checked = false
            modeSel.value = 'record'
            applyMode('record')
            toast({
              tone: 'ok',
              title: 'Changes discarded',
              body: 'The invoice is back to its saved version.',
            })
          }
          if (act === 'Undo' && state.mode === 'create') {
            state.dirty = false
            document.getElementById('dirty').checked = false
            modeSel.value = 'record'
            applyMode('record')
            toast({
              tone: 'ok',
              title: 'New invoice discarded',
              body: 'Nothing was saved, so nothing was kept.',
            })
          }
        }
        document.addEventListener('click', e => {
          const b = e.target.closest('[data-act]')
          if (!b || b.disabled) return
          runAction(b.dataset.act)
        })

        /* ---- deleting asks first, and says what cannot be undone ---- */
        const doDelete = async btn => {
          const dlg = rscrim.querySelector('.rdlg[data-dlg=delete]')
          const ok = await runWork(btn, 'Deleting…')
          if (!ok) {
            showInlineError(dlg, {
              title: 'Could not delete the invoice',
              body: 'A stock movement is already linked to it. Cancel the movement first.',
            })
            return
          }
          closeRDlg()
          const hadEdits = state.dirty
          state.dirty = false
          document.getElementById('dirty').checked = false
          modeSel.value = 'record'
          applyMode('record')
          toast({
            tone: 'ok',
            title: 'Invoice 126 deleted',
            body: hadEdits
              ? 'It no longer appears in the list, and the unsaved changes went with it.'
              : 'It no longer appears in the list.',
          })
        }

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
        const emailAvatarTone = hue => (Math.abs(Math.round(Number(hue) / 60)) % 5) + 1
        const unreadOnly = () => document.getElementById('notif-unread-only')?.checked
        const renderEmailTab = body => {
          const messages = unreadOnly() ? EMAIL_DATA.filter(message => message.unread) : EMAIL_DATA
          if (!messages.length) {
            body.innerHTML = `<div class="notif-empty"><svg width="34" height="34" aria-hidden="true"><use href="#i-mail"/></svg><p>No email yet.</p></div>`
            return
          }
          body.innerHTML = ''
          let lastDay = null
          messages.forEach(m => {
            if (m.day !== lastDay) {
              body.appendChild(
                Object.assign(document.createElement('div'), {
                  className: 'nc-group-lbl',
                  textContent: m.day,
                })
              )
              lastDay = m.day
            }
            const row = document.createElement('button')
            row.type = 'button'
            row.className = 'notif-row' + (m.unread ? ' unread' : '')
            row.innerHTML = `<span class="notif-icn email-avatar" data-avatar-tone="${emailAvatarTone(m.hue)}"></span>
      <span class="notif-txt">${m.unread ? '<span class="visually-hidden">Unread. </span>' : ''}<b></b> <span class="notif-what"></span></span>
      <span class="notif-time"></span>`
            row.querySelector('.email-avatar').textContent = m.from.charAt(0)
            row.querySelector('b').textContent = m.from
            row.querySelector('.notif-what').textContent = m.subject
            row.querySelector('.notif-time').textContent = m.time
            row.addEventListener('click', () => {
              closeAllMenus()
              openEmailView(m.id)
            })
            body.appendChild(row)
          })
        }
        const renderNotif = tab => {
          const body = document.getElementById('notif-body')
          if (tab === 'email') {
            renderEmailTab(body)
            return
          }
          const allItems = NOTIF_DATA[tab] || []
          const items = unreadOnly() ? allItems.filter(item => item.unread) : allItems
          if (!items.length) {
            body.innerHTML = `<div class="notif-empty"><svg width="34" height="34" aria-hidden="true"><use href="#i-bell"/></svg>
      <p>You're all caught up — no notifications yet.</p></div>`
            return
          }
          body.innerHTML = ''
          items.forEach(n => {
            const row = document.createElement('div')
            row.className = 'notif-row' + (n.unread ? ' unread' : '')
            row.innerHTML = `<span class="notif-icn"><svg width="15" height="15" aria-hidden="true"><use href="#${n.icon}"/></svg></span>
      <span class="notif-txt">${n.unread ? '<span class="visually-hidden">Unread. </span>' : ''}<b></b> <span class="notif-what"></span></span>
      <span class="notif-time"></span>`
            row.querySelector('b').textContent = n.who
            row.querySelector('.notif-what').textContent = n.what
            row.querySelector('.notif-time').textContent = n.time
            body.appendChild(row)
          })
        }
        function selectNotificationTab(tab) {
          tab
            .closest('.notif-tabs')
            .querySelectorAll('button')
            .forEach(button => {
              const selected = button === tab
              button.setAttribute('aria-selected', String(selected))
              button.tabIndex = selected ? 0 : -1
            })
          renderNotif(tab.dataset.tab)
        }
        document.querySelectorAll('.notif-tabs button').forEach(tab => {
          tab.addEventListener('click', () => selectNotificationTab(tab))
          tab.addEventListener('keydown', event => {
            const tabs = [...event.currentTarget.closest('.notif-tabs').querySelectorAll('button')]
            const current = tabs.indexOf(event.currentTarget)
            let next = current
            if (event.key === 'ArrowRight') next += 1
            else if (event.key === 'ArrowLeft') next -= 1
            else if (event.key === 'Home') next = 0
            else if (event.key === 'End') next = tabs.length - 1
            else return
            event.preventDefault()
            const target = tabs[(next + tabs.length) % tabs.length]
            selectNotificationTab(target)
            target.focus()
          })
        })
        document.getElementById('notif-unread-only').addEventListener('change', () => {
          const selectedTab = document.querySelector('.notif-tabs [aria-selected="true"]')
          renderNotif(selectedTab?.dataset.tab || 'direct')
        })
        const notificationsTrigger = document.querySelector(
          '[aria-controls="notifications-popover"]'
        )
        document.getElementById('notifications-popover').addEventListener('keydown', event => {
          if (event.key !== 'Escape') return
          event.preventDefault()
          closeMenuAndRestoreFocus(notificationsTrigger)
        })
        renderNotif('direct')
        function syncNotifBadge() {
          const count =
            Object.values(NOTIF_DATA)
              .flat()
              .filter(n => n.unread).length + EMAIL_DATA.filter(m => m.unread).length
          const badge = document.getElementById('notif-badge')
          badge.textContent = count
          badge.hidden = !count
        }
        syncNotifBadge()

        /* ---- email view: opened from Notifications' Email tab, replaces the invoice
   content in place while the real topbar and sidebar stay put ---- */
        /* .content holds swappable views as direct children: the record page's
   top-level elements remain unwrapped while email and list surfaces use wrappers. */
        function showContentView(name) {
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
          currentContentViewName = name
          syncCustomerPrototypeControls(name)
          queueSkeletonForCurrentView()
        }
        function syncCustomerPrototypeControls(viewName) {
          /* the #kit prototype-controls panel is built by a later <script> tag, so on
   the very first showLaunchpad() call during boot its elements don't exist yet —
   skip until it's there; every later call (post-boot navigation) runs after #kit
   is built. */
          if (!document.getElementById('table-group-heading')) return
          const isLaunchpad = viewName === 'launchpad'
          const prototypeKit = document.getElementById('kit')
          if (isLaunchpad && prototypeKit && !prototypeKit.classList.contains('hidden'))
            document.getElementById('kit-hide')?.click()
          const customerRecord = viewName === 'customer-record'
          const nonInvoiceSurface = viewName !== 'record'
          const isTablePage = ['list', 'customers-list', 'geo-list'].includes(viewName)
          const hasCardSections =
            !isLaunchpad && (viewName === 'record' || customerRecord || isTablePage)
          document.getElementById('input-style-group').hidden = isLaunchpad
          document.getElementById('customer-group-heading').hidden = !customerRecord
          document.getElementById('customer-mode-group').hidden = !customerRecord
          document.getElementById('customer-layout-group').hidden = !customerRecord
          document.getElementById('section-style-group').hidden = !hasCardSections
          document.getElementById('table-group-heading').hidden = !isTablePage
          document.getElementById('filter-mode-group').hidden = !isTablePage
          document.getElementById('statistics-concept-group').hidden = !isTablePage
          ;[
            'invoice-group-heading',
            'invoice-mode-group',
            'invoice-status-group',
            'invoice-payment-group',
            'invoice-dirty-group',
            'invoice-emptyflow-group',
          ].forEach(id => {
            document.getElementById(id).hidden = nonInvoiceSurface
          })
        }
        function renderEmailList(query) {
          const scroll = document.getElementById('email-list-scroll')
          scroll.innerHTML = ''
          const q = (query || '').trim().toLowerCase()
          const matches = EMAIL_DATA.filter(
            m => !q || m.from.toLowerCase().includes(q) || m.subject.toLowerCase().includes(q)
          )
          if (!matches.length) {
            const empty = document.createElement('div')
            empty.className = 'notif-empty'
            empty.innerHTML =
              '<svg width="30" height="30" aria-hidden="true"><use href="#i-search"/></svg><p></p>'
            empty.querySelector('p').textContent = `No email matches "${query.trim()}".`
            scroll.appendChild(empty)
            return
          }
          let lastDay = null
          matches.forEach(m => {
            if (m.day !== lastDay) {
              scroll.appendChild(
                Object.assign(document.createElement('div'), {
                  className: 'nc-group-lbl',
                  textContent: m.day,
                })
              )
              lastDay = m.day
            }
            const row = document.createElement('button')
            row.type = 'button'
            row.className = 'email-list-row' + (m.unread ? ' unread' : '')
            row.dataset.id = m.id
            row.innerHTML = `<span class="email-avatar" style="--hue:${m.hue}"></span>
      <span class="email-list-txt"><span class="email-list-top"><b></b><span class="email-list-time"></span></span>
      <span class="email-list-subj"></span></span>`
            row.querySelector('.email-avatar').textContent = m.from.charAt(0)
            row.querySelector('b').textContent = m.from
            row.querySelector('.email-list-time').textContent = m.time
            row.querySelector('.email-list-subj').textContent = m.subject
            row.addEventListener('click', () => selectEmail(m.id))
            scroll.appendChild(row)
          })
          document
            .querySelectorAll('.email-list-row')
            .forEach(r => r.classList.toggle('active', r.dataset.id === currentEmailId))
        }
        let currentEmailId = null
        function selectEmail(id) {
          const m = EMAIL_DATA.find(x => x.id === id)
          if (!m) return
          currentEmailId = id
          m.unread = false
          document.querySelectorAll('.email-list-row').forEach(r => {
            r.classList.toggle('active', r.dataset.id === id)
            if (r.dataset.id === id) r.classList.remove('unread')
          })
          renderEmailReading(m)
          syncNotifBadge()
        }
        /* the composer footer is shared by "reply to an existing email" and "compose
   new" — it always sits outside the pane's own scroll area, pinned to the
   bottom of the reading pane like a real inbox's reply box */
        function composerMarkup(toLine, placeholder, sendLabel) {
          return `<div class="email-composer">
      ${toLine}
      <textarea class="email-composer-input" placeholder="${placeholder}"></textarea>
      <div class="email-composer-toolbar">
        <button type="button" class="ibtn" aria-label="Bold"><svg width="14" height="14" aria-hidden="true"><use href="#i-bold"/></svg></button>
        <button type="button" class="ibtn" aria-label="Italic"><svg width="14" height="14" aria-hidden="true"><use href="#i-italic"/></svg></button>
        <button type="button" class="ibtn" aria-label="Underline"><svg width="14" height="14" aria-hidden="true"><use href="#i-underline"/></svg></button>
        <button type="button" class="ibtn" aria-label="Strikethrough"><svg width="14" height="14" aria-hidden="true"><use href="#i-strike"/></svg></button>
        <button type="button" class="ibtn" aria-label="Attach file"><svg width="14" height="14" aria-hidden="true"><use href="#i-clip"/></svg></button>
        <span class="sp"></span>
        <button type="button" class="lbtn pri email-send"><svg width="14" height="14" aria-hidden="true"><use href="#i-reply"/></svg> ${sendLabel}</button>
      </div>
    </div>`
        }
        function wireComposer(pane, describe) {
          pane.querySelector('.email-send').addEventListener('click', () => {
            const input = pane.querySelector('.email-composer-input')
            if (!input.value.trim()) return
            input.value = ''
            toast({
              tone: 'ok',
              title: 'Message sent',
              body: `${describe()} This is a UI proposal — nothing is actually delivered.`,
            })
          })
        }
        function renderEmailReading(m) {
          const pane = document.getElementById('email-reading')
          const toChips = m.to.map(p => `<span class="email-chip">${p.name}</span>`).join('')
          const ccField = m.cc.length
            ? `<div class="email-field"><span>Cc</span>${m.cc.map(p => `<span class="email-chip">${p.name}</span>`).join('')}</div>`
            : ''
          const attach = m.attachments.length
            ? `<div class="email-attachments">${m.attachments
                .map(
                  a =>
                    `<span class="email-attach"><svg width="14" height="14" aria-hidden="true"><use href="#i-clip"/></svg><span>${a.name}</span><small>${a.size}</small></span>`
                )
                .join('')}</div>`
            : ''
          pane.innerHTML = `
    <div class="email-reading-scroll nc-scroll">
      <div class="email-reading-hd">
        <span class="email-avatar lg" style="--hue:${m.hue}">${m.from.charAt(0)}</span>
        <div class="email-reading-who"><b>${m.from}</b><span>${m.email}</span></div>
        <span class="email-reading-time">${m.day}, ${m.time}</span>
      </div>
      <h2 class="email-reading-subject">${m.subject}</h2>
      <div class="email-field"><span>To</span>${toChips}</div>
      ${ccField}
      <div class="email-reading-body">${m.body.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')}</div>
      ${attach}
    </div>
    ${composerMarkup(`<div class="email-composer-to">Reply to <b>${m.from}</b></div>`, 'Write a reply…', 'Reply')}`
          wireComposer(pane, () => `Your reply to ${m.from} was sent.`)
        }
        function renderComposeNew() {
          const pane = document.getElementById('email-reading')
          document.querySelectorAll('.email-list-row').forEach(r => r.classList.remove('active'))
          pane.innerHTML = `
    <div class="email-reading-scroll nc-scroll">
      <h2 class="email-reading-subject">New message</h2>
      <div class="email-compose-row"><label for="email-compose-to">To</label><input type="text" id="email-compose-to" placeholder="Recipient email…"></div>
      <div class="email-compose-row"><label for="email-compose-subject">Subject</label><input type="text" id="email-compose-subject" placeholder="Subject…"></div>
    </div>
    ${composerMarkup('', 'Write your message…', 'Send')}`
          wireComposer(pane, () => {
            const to = pane.querySelector('#email-compose-to').value.trim()
            return `Your message${to ? ` to ${to}` : ''} was sent.`
          })
        }
        function openEmailView(id) {
          showContentView('email')
          renderEmailList('')
          selectEmail(id || EMAIL_DATA[0]?.id)
          document.getElementById('email-search-input').value = ''
        }
        function closeEmailView() {
          showContentView('record')
        }
        document.querySelectorAll('.email-back').forEach(b =>
          b.addEventListener('click', e => {
            e.preventDefault()
            closeEmailView()
          })
        )
        document.querySelectorAll('.record-back').forEach(b =>
          b.addEventListener('click', e => {
            e.preventDefault()
            showContentView('list')
          })
        )
        document.querySelector('.email-compose')?.addEventListener('click', renderComposeNew)
        document
          .getElementById('email-search-input')
          .addEventListener('input', e => renderEmailList(e.target.value))
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
        const aiscrim = document.getElementById('aiscrim')
        const aiThread = document.getElementById('ai-thread')
        const aiInput = document.getElementById('ai-input')
        const openAI = () => {
          aiscrim.classList.add('open')
          trapFocus(aiscrim.querySelector('.ai-drawer'))
          aiInput.focus()
        }
        const closeAI = () => {
          if (aiscrim.classList.contains('open')) {
            aiscrim.classList.remove('open')
            releaseFocus()
          }
        }
        /* four grounded scenarios, keyed to the suggestion chips — real numbers from
   this invoice (see design 3's header facts), not generic filler. Anything
   typed free-form falls back to the honest "no model wired up" disclaimer. */
        const AI_SCENARIOS = {
          'Summarize this invoice':
            "Sales Invoice 126 · Posted · Credit\n\nCustomer 200001 (العميل الاول) — net amount 20,000.00 EGP, dated 29/07/2026 from Warehouse 201. Printed twice, no pending notes. It's read-only now that it's posted — Undo the posting first if it needs a change.",
          "Why can't I modify this invoice?":
            "It's Posted, and posted invoices lock by design — editing one after the fact would break the tie between the paper trail and the ledger entry it created. Undo the posting (Procedure → Undo) to unlock it, make the change, then post again.",
          'Draft a follow-up email to the customer':
            'Subject: Sales Invoice 126 — Payment Reminder\n\nHi there,\n\nJust a reminder that Invoice 126, dated 29/07/2026 for 20,000.00 EGP, is on credit terms. Let us know if you have any questions about the balance.\n\nThanks!',
          'What changed since it was posted?':
            "Since posting: the record locked for editing, and it's been printed 2 times. Nothing else has moved — posted invoices can't be edited directly, only reversed with Undo.",
        }
        const AI_FALLBACK =
          "This is a UI proposal — there is no model wired up yet. In a real build, this would answer using the invoice's own data."
        const aiAsk = text => {
          if (!text.trim()) return
          if (aiThread.querySelector('.ai-empty')) aiThread.innerHTML = ''
          const me = document.createElement('div')
          me.className = 'ai-msg me'
          me.textContent = text
          aiThread.appendChild(me)
          aiInput.value = ''
          aiThread.scrollTop = aiThread.scrollHeight

          const thinking = document.createElement('div')
          thinking.className = 'ai-msg bot ai-thinking'
          thinking.innerHTML =
            '<span class="ai-orb"></span><span>Thinking<span class="ai-dots"><i></i><i></i><i></i></span></span>'
          aiThread.appendChild(thinking)
          aiThread.scrollTop = aiThread.scrollHeight

          const answer = AI_SCENARIOS[text] || AI_FALLBACK
          setTimeout(
            () => {
              thinking.remove()
              const bot = document.createElement('div')
              bot.className = 'ai-msg bot'
              aiThread.appendChild(bot)
              let i = 0
              const step = () => {
                i = Math.min(i + 3, answer.length)
                bot.textContent = answer.slice(0, i)
                aiThread.scrollTop = aiThread.scrollHeight
                if (i < answer.length) setTimeout(step, 12)
              }
              step()
            },
            1000 + Math.random() * 500
          )
        }
        aiscrim.addEventListener('click', e => {
          if (e.target === aiscrim || e.target.closest('.ai-close')) closeAI()
        })
        document
          .querySelectorAll('.ai-chip')
          .forEach(c => c.addEventListener('click', () => aiAsk(c.dataset.ai)))
        document.getElementById('ai-send').addEventListener('click', () => aiAsk(aiInput.value))
        aiInput.addEventListener('keydown', e => {
          if (e.key === 'Enter') aiAsk(aiInput.value)
        })
        /* not scoped to .gtop: the launchpad boot (showLaunchpad, called during the
   mount loop above) already moved this cluster into .lp-actions by the time
   this wiring runs, so a ".gtop .right" selector would silently match nothing */
        document
          .querySelectorAll('.right button.chip')
          .forEach(b => b.addEventListener('click', openAI))
        /* "/" reuses the same suggestions as the chips above the thread — one list, two entry points */
        const aiSlashList = document.getElementById('ai-slash-list')
        document.querySelectorAll('.ai-chip').forEach(c => {
          const row = document.createElement('button')
          row.type = 'button'
          row.setAttribute('role', 'menuitem')
          row.textContent = c.textContent
          row.addEventListener('click', () => aiAsk(c.dataset.ai))
          aiSlashList.appendChild(row)
        })
        document.querySelectorAll('[data-ai-attach]').forEach(b =>
          b.addEventListener('click', () => {
            closeAllMenus()
            toast({
              tone: 'ok',
              title: b.dataset.aiAttach === 'image' ? 'Attach image' : 'Attach file',
              body: 'This is a UI mock — nothing is actually uploaded.',
            })
          })
        )

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
        const applyState = () => {
          const creating = state.mode === 'create'
          const st = state.status,
            info = STATUSES[st]

          /* identity — a new invoice has no number to show. Skip anything inside the
     email view or list view: they reuse .phead/.tline/.crumbs for a consistent
     look but their breadcrumb and title are their own, not the invoice's. */
          document.querySelectorAll('.d1 .tline h1, .d2 .idty h1').forEach(h => {
            if (
              h.closest(
                '.email-view, .list-view, .customer-list-view, .customer-record-view, .geo-list-view, .geo-record-view'
              )
            )
              return
            h.textContent = creating ? 'New sales invoice' : `Sales Invoice ${state.docNo}`
          })
          document
            .querySelectorAll('.d3 .otitle h1')
            .forEach(
              h =>
                (h.textContent = creating
                  ? 'New sales invoice'
                  : `Sales Invoice ${state.docNo} · 001000352026126`)
            )
          document
            .querySelectorAll('.d2 .idty .cr')
            .forEach(
              c =>
                (c.textContent = creating
                  ? 'Home › Sales Invoice › New'
                  : 'Home › Sales Invoice › All')
            )
          document.querySelectorAll('.crumbs [aria-current=page]').forEach(c => {
            if (
              c.closest(
                '.d2, .email-view, .list-view, .customer-list-view, .customer-record-view, .geo-list-view, .geo-record-view'
              )
            )
              return
            c.textContent = creating ? t('New') : t('All')
          })

          /* status chip — a draft is not the same thing as a saved invoice with no flags */
          document.querySelectorAll('.stpill').forEach(p => {
            p.dataset.s = creating ? 'draft' : st
            p.querySelector('.nm').textContent = creating ? 'Draft — not saved yet' : info.short
            const n = CHAIN.filter(c => reached(c.id)).length
            p.querySelector('.segs').innerHTML = creating
              ? ''
              : CHAIN.map(c => `<i class="seg${reached(c.id) ? ' on' : ''}"></i>`).join('')
            p.querySelector('.cnt').textContent = creating ? '' : `${n} of ${CHAIN.length}`
          })

          /* the record navigator stays where it is. A draft has no position in the list,
     so the box is blank — and using it asks about the unsaved work first. */
          document.querySelectorAll('.pager').forEach(p => {
            if (
              p.closest(
                '.customer-list-view, .customer-record-view, .geo-list-view, .geo-record-view'
              )
            )
              return
            p.hidden = false
            const inp = p.querySelector('.pg-i')
            inp.readOnly = creating
            inp.value = creating ? '' : inp.dataset.last || '1'
            inp.placeholder = creating ? '—' : ''
            inp.title = creating ? 'This invoice has no number until you save it' : ''
            /* keep every arrow clickable in create mode so the guard can catch it */
            p.querySelectorAll('button').forEach(b => {
              if (creating) b.disabled = false
            })
          })
          document.querySelectorAll('.backlist').forEach(b => (b.hidden = true))
          document.querySelectorAll('.pos').forEach(el => {
            if (
              el.closest(
                '.list-view, .customer-list-view, .customer-record-view, .geo-list-view, .geo-record-view'
              )
            )
              return
            const inp = el.closest('.design')?.querySelector('.pg-i')
            el.textContent = creating
              ? t(
                  'Not saved yet — this invoice takes its number and its place in the list when you save'
                )
              : `${t('Record', 'Record')} ${inp ? inp.value : 1} ${t('of', 'of')} 125`
          })

          /* the invoice record and list canvases now hold real markup, so the old
     click-anywhere-to-dirty stand-in (which overwrote a canvas's textContent)
     must not touch those or the separately managed Customer views. */
          document.querySelectorAll('.canvas').forEach(c => {
            if (
              c.closest(
                '.list-view, .customer-list-view, .customer-record-view, .geo-list-view, .geo-record-view'
              )
            )
              return
            if (c.querySelector('[data-field]')) return
            const live = state.mode === 'edit' || state.mode === 'create'
            c.style.cursor = live ? 'text' : ''
            if (!c.dataset.wired) {
              c.dataset.wired = '1'
              c.addEventListener('click', () => {
                if (state.mode !== 'edit' && state.mode !== 'create') return
                if (state.dirty && state.missing === 0) return
                state.dirty = true
                document.getElementById('dirty').checked = true
                /* standing in for a field edit also stands in for filling the required ones */
                if (state.mode === 'create') state.missing = 0
                applyState()
                toast({tone: 'ok', title: 'Field changed', body: 'Save and Undo are live now.'})
              })
            }
            const base = c.dataset.base || (c.dataset.base = c.textContent.trim())
            c.textContent = live ? base + ' — click here to stand in for editing a field' : base
          })
          /* Record Concept A's real fields: read-only outside an editable status,
     same rule the rest of the record's chrome already follows via editable(state) */
          document.querySelectorAll('.canvas [data-field]').forEach(el => {
            el.disabled = !editable(state)
          })
          document.querySelectorAll('.canvas [data-field-action]').forEach(el => {
            el.disabled = !editable(state)
          })

          /* which record actions belong on screen right now */
          const editing = state.mode === 'edit'
          const showSave = creating || editing
          document.querySelectorAll('[data-act="Modify"]').forEach(b => (b.hidden = showSave))
          /* exactly one primary at a time: Modify while reading, Save while writing.
     Delete is destructive, so it never carries the primary colour. */
          document.querySelectorAll('[data-act="Delete"]').forEach(b => (b.hidden = creating))
          document
            .querySelectorAll('.savewrap, [data-act="Undo"], .reqchip')
            .forEach(el => (el.hidden = !showSave))
          document
            .querySelectorAll('.d3 .fbar [data-act="Save"], .d3 .fbar [data-act="Undo"]')
            .forEach(b => (b.hidden = false))

          /* save split button and the count of what is still missing */
          document.querySelectorAll('.savewrap .car').forEach(c => {
            c.hidden = !creating
            c.disabled = !!blocked('Save')
          })
          document.querySelectorAll('.reqchip').forEach(ch => {
            ch.hidden = !creating
            ch.classList.toggle('ok', state.missing === 0)
            ch.textContent = state.missing
              ? `${state.missing} required ${state.missing === 1 ? 'field' : 'fields'} still empty`
              : 'All required fields filled'
          })
          /* every labelled action */
          document.querySelectorAll('[data-act]').forEach(b => {
            const why = blocked(b.dataset.act)
            b.disabled = !!why
            b.title = why || ''
          })
          /* design 4 mini chain */
          document.querySelectorAll('.cp-mini-mount').forEach(m => {
            m.innerHTML = CHAIN.map(c => {
              const on = reached(c.id),
                cur = !creating && c.id === st
              return `<div class="cp-mini ${on ? (cur ? 'cur' : 'done') : 'off'}"><span class="cp-dot">${on && !cur ? '<svg width="9" height="9"><use href="#i-check"/></svg>' : ''}</span>
        <div><div class="n">${c.name}</div><div class="d">${on ? c.when || '—' : creating ? 'Not yet' : 'Not recorded'}</div></div></div>`
            }).join('')
          })
          /* a locked record should say why, not just look grey — every status has its
     own copy, whether it's genuinely locked (posted/canceled/inactive) or just
     not yet switched into Edit mode (open/pending/returned) */
          document.querySelectorAll('.lockbanner').forEach(b => {
            const locked = !(creating || (editing && editable(state)))
            b.hidden = !locked
            if (locked) b.querySelector('span').textContent = LOCK_COPY[st]
          })

          /* design 4 panel: name the section honestly on a draft */
          document.querySelectorAll('.d4 .cp-sec h4').forEach(h => {
            if (!h.dataset.full) h.dataset.full = h.textContent
            if (h.dataset.full === 'Status')
              h.textContent = creating ? 'Status — nothing recorded yet' : 'Status'
          })

          /* design 3 footer bar + key facts — a draft has nothing in them yet */
          document
            .querySelectorAll('.d3 .fbar')
            .forEach(f => f.classList.toggle('show', state.dirty || creating))
          document.querySelectorAll('.d3 .facts .f b').forEach((b, i) => {
            if (!b.dataset.full) b.dataset.full = b.textContent
            b.textContent = creating ? '—' : b.dataset.full
            b.style.color = creating ? 'var(--faint)' : ''
          })
          document.querySelectorAll('.pay-fact').forEach(f => {
            f.dataset.full = state.pay === 'credit' ? 'Credit (آجل)' : 'Cash (نقد)'
            f.textContent = creating ? '—' : f.dataset.full
          })
          /* design 2 split button primary follows what is available */
          document.querySelectorAll('.d2 .genbtn .main').forEach(b => {
            const rvOk = !blocked('Receipt Voucher')
            b.dataset.act = rvOk ? 'Receipt Voucher' : 'Sales Return'
            b.lastChild.textContent = ' ' + b.dataset.act
            const why = blocked(b.dataset.act)
            b.disabled = !!why
            b.title = why || ''
          })
          if (pop.classList.contains('open')) renderPop()
          if (drawer.classList.contains('open')) renderCards()
          if (document.querySelector('.spanel.open')) renderSearch()
        }

        /* ========== unsaved-work guard ========== */
        const gscrim = document.getElementById('gscrim')
        let guardAfter = null
        const atRisk = () => state.mode === 'create' || (state.mode === 'edit' && state.dirty)
        const askGuard = (whatNext, label) => {
          guardAfter = whatNext
          setTimeout(() => trapFocus(gscrim.querySelector('.guard')), 0)
          document.getElementById('g-msg').textContent =
            state.mode === 'create'
              ? 'This invoice has never been saved. It gets its number only when you save it.'
              : 'This invoice has changes that were never saved.'
          document.getElementById('g-what').textContent = label
            ? `You were about to: ${label}.`
            : ''
          gscrim.classList.add('open')
        }
        const runGuarded = fn => {
          if (atRisk()) askGuard(fn, null)
          else fn()
        }
        document.getElementById('g-stay').onclick = () => {
          gscrim.classList.remove('open')
          guardAfter = null
          releaseFocus()
        }
        document.getElementById('g-newtab').onclick = () => {
          window.open(location.href, '_blank')
          gscrim.classList.remove('open')
          guardAfter = null
          releaseFocus()
          toast({
            tone: 'ok',
            title: 'Opened in a new tab',
            body: 'This invoice stays exactly as it was here.',
          })
        }
        document.getElementById('g-discard').onclick = () => {
          gscrim.classList.remove('open')
          releaseFocus()
          const f = guardAfter
          guardAfter = null
          if (f) f()
          else if (state.mode === 'create') {
            modeSel.value = 'record'
            applyMode('record')
          } else {
            state.dirty = false
            document.getElementById('dirty').checked = false
            applyState()
          }
        }
        document.getElementById('g-save').onclick = () => {
          gscrim.classList.remove('open')
          releaseFocus()
          const f = guardAfter
          guardAfter = null
          modeSel.value = 'record'
          applyMode('record')
          f && f()
        }
        gscrim.addEventListener('click', e => {
          if (e.target === gscrim) document.getElementById('g-stay').click()
        })

        /* anything that would walk away from unsaved work asks first */
        document.addEventListener(
          'click',
          e => {
            const nav = e.target.closest('.pager button, .backlist')
            if (nav && atRisk()) {
              e.preventDefault()
              e.stopPropagation()
              askGuard(
                null,
                nav.classList.contains('backlist')
                  ? 'go back to the invoice list'
                  : 'move to another record'
              )
              return
            }
            const nw = e.target.closest('[data-act="New"]')
            if (nw && !nw.disabled && atRisk()) {
              e.preventDefault()
              e.stopPropagation()
              askGuard(null, 'start another invoice')
            }
          },
          true
        )

        const modeSel = document.getElementById('mode')
        const applyMode = m => {
          state.mode = m
          /* every header field in this template already carries a value, so there is
             no real "still empty" header state to simulate — Save's real gate is the
             line-item validation that runs when Save is actually clicked. */
          state.missing = 0
          /* only an editable document can be in edit mode */
          if (m === 'edit' && !editable(state)) {
            state.status = 'open'
            document.getElementById('st').value = 'open'
          }
          if (m === 'record') state.dirty = false
          document.getElementById('dirty').checked = state.dirty
          document.getElementById('st').disabled = m === 'create'
          applyState()
        }
        modeSel.addEventListener('change', e => {
          const next = e.target.value
          /* leaving a draft or an edit with unsaved work is the same risk, whatever route you take */
          if (state.mode !== next && atRisk()) {
            e.target.value = state.mode
            askGuard(
              () => {
                modeSel.value = next
                applyMode(next)
              },
              next === 'create' ? 'start a new invoice' : 'leave this invoice'
            )
            return
          }
          applyMode(next)
        })
        document.getElementById('st').addEventListener('change', e => {
          state.status = e.target.value
          applyState()
        })
        document.getElementById('pay').addEventListener('change', e => {
          state.pay = e.target.value
          applyState()
        })
        document.getElementById('dirty').addEventListener('change', e => {
          state.dirty = e.target.checked
          applyState()
        })
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
          else if (currentContentViewName === 'customer-record') renderCustomerRecord()
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


        const CUSTOMER_IMAGE_SOURCES = new Set([
          'assets/customers/customer-200010-portrait.webp',
          'assets/customers/customer-200002-organization.webp',
        ])

        const geoState = {
          code: 'CAI',
          mode: 'view',
          expanded: new Set(['EG', 'CAI']),
          hierarchyView: 'tree',
          treeQuery: '',
          flowScale: 1,
        }
        const geoFlowContentSize = {width: 800, height: 800}

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
            syncShellListPager(context, filteredCount),
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
        function renderDataListSelectionActions(context, listState) {
          return sharedRenderDataListSelectionActions(context, listState, {t, dataListIcon})
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

        const customerState = {mode: 'view', customerNo: '200010'}



        function createBlankCustomerData() {
          const data = {}
          Object.values(CUSTOMER_SECTIONS).forEach(section => {
            section.fields.forEach(field => {
              data[field.key] = field.type === 'checkbox' ? false : ''
            })
          })
          data.operationUnit = '2 - lastchance'
          data.currency = 'EGP - Egyptian Pound'
          data.photo = null
          data.subLedgers = []
          data.contactDetails = []
          return data
        }

        function createSavedCustomerData(customerNo = CUSTOMER_REFERENCE.customerNo) {
          const row =
            CUSTOMER_ROWS.find(customer => customer.customerNo === customerNo) || CUSTOMER_ROWS[0]
          return {
            ...createBlankCustomerData(),
            ...CUSTOMER_REFERENCE,
            customerNo: row.customerNo,
            customerName: row.customerName,
            operationUnit: row.operationUnit,
            customerType: row.customerType,
            customerGroup: row.customerGroup,
            currency: `${row.currency} - Egyptian Pound`,
            otherCountry: row.country,
            contactPhone: row.phone,
            deactivationFrom: row.active ? '' : '2026-08-01',
            photo: row.photo,
          }
        }

        let customerData = {...createBlankCustomerData(), ...CUSTOMER_REFERENCE}
        let customerSavedSnapshot = structuredClone(customerData)
        Object.assign(customerState, {
          mode: 'view',
          layout: 'guided',
          activeSection: 'identity',
          expanded: new Set(Object.keys(CUSTOMER_SECTIONS)),
          errors: new Map(),
          dirty: false,
        })
        window.customerPrototype = {
          fieldKeys: Object.values(CUSTOMER_SECTIONS).flatMap(section =>
            section.fields.map(field => field.key)
          ),
        }

        const CUSTOMER_SECTION_ORDER = [
          'identity',
          'deactivation',
          'nationalAddress',
          'defaultContact',
          'mainData',
          'otherData',
          'subLedgers',
          'contactDetails',
        ]
        /* Record contract: the default tab must represent the record's normal
           purpose. Main Data leads; Deactivate is a secondary/destructive action
           and must never be the tab a user lands on when opening a customer. */
        const CUSTOMER_GUIDED_TABS = [
          'mainData',
          'nationalAddress',
          'defaultContact',
          'otherData',
          'subLedgers',
          'contactDetails',
          'deactivation',
        ]
        const CUSTOMER_REQUIRED_FIELDS = new Set(['customerNo', 'customerName'])
        const CUSTOMER_LOOKUP_KEYS = new Set(['operationUnit', 'customerType'])
        const customerLookupState = {
          fieldKey: '',
          trigger: null,
          source: 'customer',
          targetSelectId: '',
          selectedValue: '',
          matchModes: {
            operationUnit: 'contains',
            customerType: 'contains',
            unitParent: 'contains',
            unitLocation: 'contains',
          },
        }

        function customerSectionKeyForField(fieldKey) {
          return CUSTOMER_SECTION_ORDER.find(key =>
            CUSTOMER_SECTIONS[key].fields.some(field => field.key === fieldKey)
          )
        }

        function validateCustomerField(field) {
          const value = String(customerData[field.key] ?? '').trim()
          if (CUSTOMER_REQUIRED_FIELDS.has(field.key) && !value) {
            return `${field.label} is required.`
          }
          if (!value) return ''
          if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return `Enter a valid ${field.label}.`
          }
          if (field.type === 'url') {
            try {
              const url = new URL(value)
              if (!['http:', 'https:'].includes(url.protocol)) {
                return `Enter a valid ${field.label}.`
              }
            } catch {
              return `Enter a valid ${field.label}.`
            }
          }
          return ''
        }

        function validateCustomerRecord() {
          customerState.errors.clear()
          CUSTOMER_SECTION_ORDER.forEach(sectionKey => {
            CUSTOMER_SECTIONS[sectionKey].fields.forEach(field => {
              const message = validateCustomerField(field)
              if (message) customerState.errors.set(field.key, message)
            })
          })
          return customerState.errors.size === 0
        }

        function customerSectionMeta(key) {
          const section = CUSTOMER_SECTIONS[key]
          const errorCount = section.fields.filter(field =>
            customerState.errors.has(field.key)
          ).length
          if (errorCount) {
            return {
              text: `${errorCount} ${errorCount === 1 ? 'error' : 'errors'}`,
              className: 'is-error',
              hasErrors: true,
            }
          }
          if (section.type === 'subledgers') {
            const count = customerData.subLedgers.length
            return {
              text: `${count} ${count === 1 ? 'record' : 'records'}`,
              className: count ? 'is-complete' : '',
              hasErrors: false,
            }
          }
          if (section.type === 'empty') {
            return {text: 'Not defined', className: '', hasErrors: false}
          }
          const populated = section.fields.filter(field => {
            if (field.type === 'checkbox') return true
            return String(customerData[field.key] ?? '').trim() !== ''
          }).length
          const complete = populated === section.fields.length
          return {
            text: complete ? 'Complete' : `${populated} of ${section.fields.length}`,
            className: complete ? 'is-complete' : '',
            hasErrors: false,
          }
        }

        function renderCustomerSectionStatus(key) {
          const meta = customerSectionMeta(key)
          if (!meta.hasErrors) return ''
          return `<span class="customer-section-status ${encodeHtml(meta.className)}" data-customer-status="${encodeHtml(key)}">${encodeHtml(meta.text)}</span>`
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
            return renderCustomerAvatar(row)
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

        function syncShellListPager(context, filteredCount) {
          const mount = document.getElementById(DATA_LIST_FNAV_IDS[context])
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

        function dataRecordInitials(value) {
          return String(value || '?')
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(part => part[0] || '')
            .join('')
            .toUpperCase()
        }

        function customerImageData(photo) {
          if (!photo || !CUSTOMER_IMAGE_SOURCES.has(photo.src)) return null
          return {
            src: photo.src,
            alt: String(photo.alt || 'Customer image'),
            fit: photo.fit === 'contain' ? 'contain' : 'cover',
          }
        }

        function customerImagePreviewAttributes(row, image) {
          return `data-customer-image-preview data-customer-image-src="${encodeHtml(image.src)}" data-customer-image-alt="${encodeHtml(image.alt)}" data-customer-image-fit="${image.fit}" data-customer-image-name="${encodeHtml(row.customerName)}" data-customer-image-number="${encodeHtml(row.customerNo)}" aria-controls="customer-image-popover" aria-haspopup="dialog" aria-expanded="false" aria-label="Preview image for ${encodeHtml(row.customerName)}"`
        }

        function renderCustomerAvatar(row) {
          const initials = encodeHtml(dataRecordInitials(row.customerName))
          const image = customerImageData(row.photo)
          const fallback = `<span class="data-record-avatar customer-avatar-fallback" aria-hidden="true">${initials}</span>`
          if (!image) return fallback
          return `<button type="button" class="data-record-avatar customer-avatar-trigger image-fit-${image.fit}" ${customerImagePreviewAttributes(row, image)}><img src="${encodeHtml(image.src)}" alt="" data-customer-image><span class="data-record-avatar customer-avatar-fallback" aria-hidden="true" hidden>${initials}</span></button>`
        }

        function renderCustomerRecordPhoto(photo) {
          const row = {
            customerName: customerData.customerName || 'New customer',
            customerNo: customerData.customerNo || 'Unsaved',
          }
          const initials = encodeHtml(dataRecordInitials(row.customerName))
          const image = customerImageData(photo)
          if (!image)
            return `<span class="customer-photo-preview customer-avatar-fallback" aria-hidden="true">${initials}</span>`
          return `<button type="button" class="customer-photo-preview customer-avatar-trigger image-fit-${image.fit}" ${customerImagePreviewAttributes(row, image)}><img src="${encodeHtml(image.src)}" alt="${encodeHtml(image.alt)}" data-customer-image><span class="customer-photo-preview customer-avatar-fallback" aria-hidden="true" hidden>${initials}</span></button>`
        }

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
              ? renderCustomerAvatar(row)
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
          if (context === 'customer' && column.key === 'avatar') return renderCustomerAvatar(row)
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

        const customerImagePopover = document.getElementById('customer-image-popover')
        const customerImagePopoverMedia = customerImagePopover.querySelector(
          '.customer-image-popover-media'
        )
        const customerImagePopoverImage = customerImagePopoverMedia.querySelector('img')
        const customerImagePopoverName = document.getElementById('customer-image-popover-name')
        const customerImagePopoverNumber = document.getElementById('customer-image-popover-number')
        let customerImagePreviewTrigger = null
        let customerImagePreviewPinned = false
        let customerImagePreviewOpenTimer = 0
        let customerImagePreviewCloseTimer = 0

        function clearCustomerImagePreviewTimers() {
          clearTimeout(customerImagePreviewOpenTimer)
          clearTimeout(customerImagePreviewCloseTimer)
          customerImagePreviewOpenTimer = 0
          customerImagePreviewCloseTimer = 0
        }

        function positionCustomerImagePreview(trigger) {
          if (!trigger?.isConnected || !customerImagePopover.matches(':popover-open')) return
          const margin = 8
          const gap = 8
          const anchor = trigger.getBoundingClientRect()
          const preview = customerImagePopover.getBoundingClientRect()
          const rtl = document.documentElement.dir === 'rtl'
          const after = anchor.right + gap
          const before = anchor.left - preview.width - gap
          const afterFits = after + preview.width <= window.innerWidth - margin
          const beforeFits = before >= margin
          let left = rtl
            ? beforeFits
              ? before
              : afterFits
                ? after
                : anchor.right - preview.width
            : afterFits
              ? after
              : beforeFits
                ? before
                : anchor.left
          left = Math.max(margin, Math.min(left, window.innerWidth - preview.width - margin))
          const centeredTop = anchor.top + (anchor.height - preview.height) / 2
          const top = Math.max(
            margin,
            Math.min(centeredTop, window.innerHeight - preview.height - margin)
          )
          customerImagePopover.style.left = `${Math.round(left)}px`
          customerImagePopover.style.top = `${Math.round(top)}px`
        }

        function resetCustomerImagePreviewState() {
          customerImagePreviewTrigger?.setAttribute('aria-expanded', 'false')
          customerImagePreviewTrigger = null
          customerImagePreviewPinned = false
          clearCustomerImagePreviewTimers()
        }

        function openCustomerImagePreview(trigger, {pinned = false} = {}) {
          const src = trigger?.dataset.customerImageSrc
          if (!CUSTOMER_IMAGE_SOURCES.has(src)) return
          clearCustomerImagePreviewTimers()
          if (customerImagePreviewTrigger !== trigger)
            customerImagePreviewTrigger?.setAttribute('aria-expanded', 'false')
          customerImagePreviewTrigger = trigger
          customerImagePreviewPinned = pinned
          trigger.setAttribute('aria-expanded', 'true')
          customerImagePopoverImage.src = src
          customerImagePopoverImage.alt = trigger.dataset.customerImageAlt || 'Customer image'
          customerImagePopoverMedia.dataset.fit =
            trigger.dataset.customerImageFit === 'contain' ? 'contain' : 'cover'
          customerImagePopoverName.textContent = trigger.dataset.customerImageName || 'Customer'
          customerImagePopoverNumber.textContent = trigger.dataset.customerImageNumber || ''
          if (!customerImagePopover.matches(':popover-open')) customerImagePopover.showPopover()
          requestAnimationFrame(() => positionCustomerImagePreview(trigger))
        }

        function closeCustomerImagePreview() {
          clearCustomerImagePreviewTimers()
          if (customerImagePopover.matches(':popover-open')) customerImagePopover.hidePopover()
          resetCustomerImagePreviewState()
        }

        function scheduleCustomerImagePreviewOpen(trigger) {
          clearTimeout(customerImagePreviewCloseTimer)
          if (customerImagePreviewPinned) return
          clearTimeout(customerImagePreviewOpenTimer)
          customerImagePreviewOpenTimer = setTimeout(() => openCustomerImagePreview(trigger), 120)
        }

        function scheduleCustomerImagePreviewClose() {
          clearTimeout(customerImagePreviewOpenTimer)
          if (customerImagePreviewPinned) return
          clearTimeout(customerImagePreviewCloseTimer)
          customerImagePreviewCloseTimer = setTimeout(closeCustomerImagePreview, 160)
        }

        function handleCustomerImageError(event) {
          const image = event.target
          if (!(image instanceof HTMLImageElement) || !image.matches('[data-customer-image]'))
            return
          const trigger = image.closest('[data-customer-image-preview]')
          const fallback = trigger?.querySelector('.customer-avatar-fallback')
          if (!trigger || !fallback) return
          if (trigger === customerImagePreviewTrigger) closeCustomerImagePreview()
          fallback.hidden = false
          trigger.replaceWith(fallback)
        }

        document.addEventListener('error', handleCustomerImageError, true)
        document.addEventListener('pointerover', event => {
          const trigger = event.target.closest?.('[data-customer-image-preview]')
          if (!trigger || (event.pointerType && event.pointerType !== 'mouse')) return
          if (event.relatedTarget && trigger.contains(event.relatedTarget)) return
          scheduleCustomerImagePreviewOpen(trigger)
        })
        document.addEventListener('pointerout', event => {
          const trigger = event.target.closest?.('[data-customer-image-preview]')
          if (!trigger || (event.pointerType && event.pointerType !== 'mouse')) return
          if (event.relatedTarget && trigger.contains(event.relatedTarget)) return
          if (event.relatedTarget && customerImagePopover.contains(event.relatedTarget)) return
          scheduleCustomerImagePreviewClose()
        })
        document.addEventListener('focusin', event => {
          const trigger = event.target.closest?.('[data-customer-image-preview]')
          if (trigger) openCustomerImagePreview(trigger)
        })
        document.addEventListener('focusout', event => {
          const trigger = event.target.closest?.('[data-customer-image-preview]')
          if (!trigger || customerImagePreviewPinned) return
          if (event.relatedTarget && customerImagePopover.contains(event.relatedTarget)) return
          scheduleCustomerImagePreviewClose()
        })
        document.addEventListener('click', event => {
          if (event.target.closest?.('[data-customer-image-close]')) {
            closeCustomerImagePreview()
            return
          }
          const trigger = event.target.closest?.('[data-customer-image-preview]')
          if (!trigger) return
          event.preventDefault()
          if (trigger === customerImagePreviewTrigger && customerImagePreviewPinned)
            closeCustomerImagePreview()
          else openCustomerImagePreview(trigger, {pinned: true})
        })
        customerImagePopover.addEventListener('pointerenter', () => {
          clearTimeout(customerImagePreviewCloseTimer)
        })
        customerImagePopover.addEventListener('pointerleave', scheduleCustomerImagePreviewClose)
        customerImagePopover.addEventListener('toggle', event => {
          if (event.newState === 'closed') resetCustomerImagePreviewState()
        })
        document.addEventListener(
          'scroll',
          () => {
            if (customerImagePopover.matches(':popover-open')) closeCustomerImagePreview()
          },
          true
        )
        window.addEventListener('resize', () => {
          if (customerImagePreviewTrigger) positionCustomerImagePreview(customerImagePreviewTrigger)
        })

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

        const geoParentPickerState = {view: 'tree', expanded: new Set(), excluded: new Set()}

        function renderGeoParentPickerBranch(parentCode = '', level = 1) {
          return GEO_ROWS.filter(row => row.parentCode === parentCode)
            .map(row => {
              const hasChildren = GEO_ROWS.some(child => child.parentCode === row.code)
              const expanded = geoParentPickerState.expanded.has(row.code)
              const disabled = geoParentPickerState.excluded.has(row.code)
              const children =
                hasChildren && expanded
                  ? `<div class="geo-tree-children" role="group">${renderGeoParentPickerBranch(row.code, level + 1)}</div>`
                  : ''
              const chevronTitle = hasChildren
                ? (expanded ? 'Collapse' : 'Expand') + ` ${row.name}`
                : ''
              const chevron = hasChildren
                ? `<button type="button" class="geo-parent-picker-chevron" data-geo-parent-toggle="${encodeHtml(row.code)}" aria-expanded="${expanded}" aria-label="${encodeHtml(chevronTitle)}" title="${encodeHtml(chevronTitle)}">${dataListIcon('i-caret', 11).replace('<svg', '<svg class="geo-node-chevron"')}</button>`
                : '<span aria-hidden="true" style="width:11px"></span>'
              return `<div class="geo-tree-branch"><span class="geo-tree-node" role="treeitem" aria-level="${level}"${hasChildren ? ` aria-expanded="${expanded}"` : ''}>${chevron}<button type="button" class="geo-parent-picker-row" data-geo-parent-pick="${encodeHtml(row.code)}"${disabled ? ' disabled aria-disabled="true" title="Cannot choose a location’s own descendant as its parent"' : ''}><span class="geo-node-copy"><strong>${encodeHtml(row.name)}</strong><small>${encodeHtml(row.code)} · ${encodeHtml(row.type)}</small></span></button></span>${children}</div>`
            })
            .join('')
        }

        function renderGeoParentPickerTree() {
          const tree = document.getElementById('geo-parent-picker-tree')
          tree.innerHTML =
            renderGeoParentPickerBranch() ||
            `<div class="geo-hierarchy-empty">No locations available.</div>`
        }

        function renderGeoParentPickerFlow() {
          const canvas = document.getElementById('geo-parent-picker-flow-canvas')
          if (!canvas) return
          const nodeWidth = 156
          const nodeHeight = 58
          const slotWidth = 190
          const levelHeight = 164
          const maxLevel = GEO_ROWS.reduce((max, row) => Math.max(max, row.level), 1)
          const {positions, slotCount} = layoutGeoFlowPositions(
            nodeWidth,
            nodeHeight,
            slotWidth,
            levelHeight
          )
          const width = Math.max(900, slotCount * slotWidth)
          const height = Math.max(500, 24 + maxLevel * levelHeight + nodeHeight + 24)
          const connectors = GEO_ROWS.filter(row => row.parentCode)
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
          const nodes = GEO_ROWS.map(row => {
            const position = positions.get(row.code)
            const disabled = geoParentPickerState.excluded.has(row.code)
            return `<button class="geo-flow-node" type="button" data-geo-parent-pick="${encodeHtml(row.code)}"${disabled ? ' disabled aria-disabled="true" title="Cannot choose a location’s own descendant as its parent"' : ''} style="left:${position.x}px;top:${position.y}px" aria-label="Choose ${encodeHtml(row.name)} as parent">${geoLocationIcon(row.type, 16)}<span><strong>${encodeHtml(row.name)}</strong><small>${encodeHtml(row.code)} · ${encodeHtml(row.type)}</small></span></button>`
          }).join('')
          canvas.style.width = `${width}px`
          canvas.style.height = `${height}px`
          canvas.innerHTML = `<div class="geo-flow-surface" style="--geo-flow-scale:1;width:${width}px;height:${height}px"><svg class="geo-flow-connectors" style="width:${width}px;height:${height}px" viewBox="0 0 ${width} ${height}" aria-hidden="true">${connectors}</svg>${nodes}</div>`
        }

        function setGeoParentPickerView(view) {
          if (!['tree', 'flow'].includes(view)) return
          geoParentPickerState.view = view
          document.querySelectorAll('[data-geo-parent-picker-view]').forEach(tab => {
            const active = tab.dataset.geoParentPickerView === view
            tab.setAttribute('aria-selected', String(active))
          })
          document.getElementById('geo-parent-picker-tree-pane').hidden = view !== 'tree'
          document.getElementById('geo-parent-picker-flow-pane').hidden = view !== 'flow'
          if (view === 'flow') renderGeoParentPickerFlow()
        }

        let geoHierarchyDialogHome = null
        let geoHierarchyRefreshHome = null
        let geoHierarchyTitleHome = null

        function openGeoHierarchyDialog() {
          const panel = document.getElementById('geo-hierarchy-panel')
          const mount = document.getElementById('geo-hierarchy-dialog-mount')
          const refresh = panel?.querySelector('.geo-tree-refresh')
          const actionsMount = document.getElementById('geo-hierarchy-dialog-actions-mount')
          const title = panel?.querySelector('.geo-tree-header > div:first-child')
          const titleMount = document.getElementById('geo-hierarchy-dialog-title-mount')
          if (!panel || !mount) return
          geoHierarchyDialogHome = {parent: panel.parentElement, next: panel.nextSibling}
          mount.appendChild(panel)
          if (refresh && actionsMount) {
            geoHierarchyRefreshHome = {parent: refresh.parentElement, next: refresh.nextSibling}
            actionsMount.appendChild(refresh)
          }
          if (title && titleMount) {
            geoHierarchyTitleHome = {parent: title.parentElement, next: title.nextSibling}
            titleMount.appendChild(title)
          }
          geoHierarchyScrim.classList.add('open')
          trapFocus(geoHierarchyScrim.querySelector('.customer-modal'))
        }

        function closeGeoHierarchyDialog() {
          const panel = document.getElementById('geo-hierarchy-panel')
          const refresh = document.getElementById(
            'geo-hierarchy-dialog-actions-mount'
          )?.firstElementChild
          if (refresh && geoHierarchyRefreshHome) {
            geoHierarchyRefreshHome.parent.insertBefore(refresh, geoHierarchyRefreshHome.next)
          }
          geoHierarchyRefreshHome = null
          const title = document.getElementById(
            'geo-hierarchy-dialog-title-mount'
          )?.firstElementChild
          if (title && geoHierarchyTitleHome) {
            geoHierarchyTitleHome.parent.insertBefore(title, geoHierarchyTitleHome.next)
          }
          geoHierarchyTitleHome = null
          if (panel && geoHierarchyDialogHome) {
            geoHierarchyDialogHome.parent.insertBefore(panel, geoHierarchyDialogHome.next)
          }
          geoHierarchyDialogHome = null
          geoHierarchyScrim.classList.remove('open')
          releaseFocus()
        }

        function openGeoParentPicker() {
          const currentCode = document.getElementById('geo-field-code').value
          geoParentPickerState.excluded = currentCode
            ? new Set([currentCode, ...geoDescendantCodes(currentCode)])
            : new Set()
          geoParentPickerState.expanded = new Set(
            GEO_ROWS.map(row => row.parentCode).filter(Boolean)
          )
          setGeoParentPickerView('tree')
          renderGeoParentPickerTree()
          geoParentPickerScrim.classList.add('open')
          trapFocus(geoParentPickerScrim.querySelector('.customer-modal'))
        }

        function closeGeoParentPicker() {
          geoParentPickerScrim.classList.remove('open')
          releaseFocus()
        }

        function chooseGeoParent(code) {
          const select = document.getElementById('geo-field-parent')
          select.value = code || ''
          select.dispatchEvent(new Event('change', {bubbles: true}))
          closeGeoParentPicker()
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

        function renderGeoRecordChrome(row) {
          const editing = geoState.mode !== 'view'
          const title = geoState.mode === 'create' ? t('New Location') : encodeHtml(row.name)
          const actions = editing
            ? `<button class="lbtn pri" type="button" data-geo-record-action="save">${dataListIcon('i-save')} ${t('Save')}</button><button class="lbtn out" type="button" data-geo-record-action="undo">${dataListIcon('i-undo')} ${t('Undo')}</button>`
            : `<button class="lbtn pri" type="button" data-geo-record-action="modify">${dataListIcon('i-edit')} ${t('Modify')}</button><span class="vsep"></span><button class="lbtn out" type="button" data-geo-record-action="new">${dataListIcon('i-plus')} ${t('New')}</button><button class="lbtn out danger" type="button" data-geo-record-action="delete">${dataListIcon('i-trash')} ${t('Delete')}</button>`
          document.getElementById('geo-record-chrome').innerHTML = `
    <div class="arow customer-arow" role="toolbar" aria-label="Location toolbar">
      <div class="menu"><button type="button" aria-haspopup="menu" aria-expanded="false">${t('Record')} ${dataListIcon('i-caret', 12)}</button><div class="mlist" role="menu"><button role="menuitem" type="button" data-geo-record-action="new">${dataListIcon('i-plus', 14)} ${t('New')}</button><button role="menuitem" type="button" data-geo-record-action="modify"${editing ? ' disabled' : ''}>${dataListIcon('i-edit', 14)} ${t('Modify')}</button><button role="menuitem" type="button" data-geo-record-action="delete"${editing ? ' disabled' : ''}>${dataListIcon('i-trash', 14)} ${t('Delete')}</button><button role="menuitem" type="button" data-geo-record-action="search">${dataListIcon('i-search', 14)} ${t('Search')}</button></div></div>
      <div class="menu"><button type="button" aria-haspopup="menu" aria-expanded="false">${t('Procedure')} ${dataListIcon('i-caret', 12)}</button><div class="mlist" role="menu"><button role="menuitem" type="button" data-geo-record-action="save"${editing ? '' : ' disabled'}>${dataListIcon('i-save', 14)} ${t('Save')}</button><button role="menuitem" type="button" data-geo-record-action="print">${dataListIcon('i-print', 14)} ${t('Print')}</button><button role="menuitem" type="button" data-geo-record-action="undo"${editing ? '' : ' disabled'}>${dataListIcon('i-undo', 14)} ${t('Undo')}</button></div></div>
      <div class="menu"><button type="button" aria-haspopup="menu" aria-expanded="false">${t('More')} ${dataListIcon('i-caret', 12)}</button><div class="mlist" role="menu"><button role="menuitem" type="button" data-geo-record-action="parameters">${dataListIcon('i-sliders', 14)} ${t('Screen Parameters')}</button><button role="menuitem" type="button" data-geo-record-action="help">${dataListIcon('i-help', 14)} ${t('Help')}</button></div></div>
    </div>
    <div class="phead"><div class="l"><nav class="crumbs" aria-label="Breadcrumb"><a href="#">${t('Home')}</a><span class="sep">›</span><button class="geo-back-list" type="button">${t('Geographical Structure')}</button><span class="sep">›</span><span aria-current="page">${geoState.mode === 'create' ? t('New') : t('All')}</span></nav><div class="tline"><h1>${title}</h1><span class="badge ${row.active ? 'ok' : 'gray'}">${row.active ? t('Active') : t('Inactive')}</span></div></div><div class="r"><span class="recacts">${actions}</span></div></div>`
        }

        function geoLocationIcon(type, size = 14) {
          const icon =
            type === 'Country'
              ? 'i-home'
              : type === 'Governorate'
                ? 'i-flow'
                : type === 'City'
                  ? 'i-panel'
                  : 'i-location'
          return dataListIcon(icon, size)
        }

        function geoTreeRowMatches(row, query) {
          if (!query) return true
          const searchable = `${row.code} ${row.name} ${row.type}`.toLocaleLowerCase()
          if (searchable.includes(query)) return true
          return GEO_ROWS.filter(child => child.parentCode === row.code).some(child =>
            geoTreeRowMatches(child, query)
          )
        }

        function renderGeoTreeBranch(parentCode = '', level = 1) {
          const query = geoState.treeQuery.trim().toLocaleLowerCase()
          return GEO_ROWS.filter(
            row => row.parentCode === parentCode && geoTreeRowMatches(row, query)
          )
            .map(row => {
              const hasChildren = GEO_ROWS.some(child => child.parentCode === row.code)
              const expanded = Boolean(query) || geoState.expanded.has(row.code)
              const children =
                hasChildren && expanded
                  ? `<div class="geo-tree-children" role="group">${renderGeoTreeBranch(row.code, level + 1)}</div>`
                  : ''
              const chevronTitle = hasChildren
                ? expanded
                  ? `Collapse ${row.name}`
                  : `Expand ${row.name}`
                : ''
              const chevron = hasChildren
                ? dataListIcon('i-caret', 11)
                    .replace('<svg', '<svg class="geo-node-chevron"')
                    .replace('<svg', `<svg role="img" aria-label="${encodeHtml(chevronTitle)}"`)
                : '<span aria-hidden="true" style="width:11px"></span>'
              return `<div class="geo-tree-branch"><button class="geo-tree-node" type="button" role="treeitem" data-geo-node="${encodeHtml(row.code)}"${hasChildren ? ' data-geo-toggle-branch' : ''} aria-level="${level}" aria-current="${row.code === geoState.code}"${hasChildren ? ` aria-expanded="${expanded}" title="${encodeHtml(chevronTitle)}"` : ''}>${chevron}<span class="geo-node-copy"><strong>${encodeHtml(row.name)}</strong><small>${encodeHtml(row.code)} · ${encodeHtml(row.type)}</small></span></button>${children}</div>`
            })
            .join('')
        }

        function renderGeoTree() {
          const tree = document.getElementById('geo-tree')
          const markup = renderGeoTreeBranch()
          tree.innerHTML =
            markup ||
            `<div class="geo-hierarchy-empty">${dataListIcon('i-search', 18)}<span>No locations match “${encodeHtml(geoState.treeQuery)}”.</span></div>`
          const search = document.getElementById('geo-tree-search')
          if (search && search.value !== geoState.treeQuery) search.value = geoState.treeQuery
        }

        function layoutGeoFlowPositions(nodeWidth, nodeHeight, slotWidth, levelHeight) {
          const childrenByParent = new Map()
          GEO_ROWS.forEach(row => {
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

        function renderGeoFlow() {
          const canvas = document.getElementById('geo-flow-canvas')
          if (!canvas) return
          const nodeWidth = 156
          const nodeHeight = 58
          const slotWidth = 190
          const levelHeight = 164
          const maxLevel = GEO_ROWS.reduce((max, row) => Math.max(max, row.level), 1)
          const {positions, slotCount} = layoutGeoFlowPositions(
            nodeWidth,
            nodeHeight,
            slotWidth,
            levelHeight
          )
          const width = Math.max(800, slotCount * slotWidth + 100)
          const height = Math.max(200, 24 + maxLevel * levelHeight + nodeHeight)
          const connectors = GEO_ROWS.filter(row => row.parentCode)
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
          const nodes = GEO_ROWS.map(row => {
            const position = positions.get(row.code)
            return `<button class="geo-flow-node" type="button" data-geo-node="${encodeHtml(row.code)}" aria-current="${row.code === geoState.code}" style="left:${position.x}px;top:${position.y}px" aria-label="View ${encodeHtml(row.name)}">${geoLocationIcon(row.type, 16)}<span><strong>${encodeHtml(row.name)}</strong><small>${encodeHtml(row.code)} · ${encodeHtml(row.type)}</small></span></button>`
          }).join('')
          const scaledWidth = Math.round(width * geoState.flowScale)
          const scaledHeight = Math.round(height * geoState.flowScale)
          canvas.style.width = `${scaledWidth}px`
          canvas.style.height = `${scaledHeight}px`
          canvas.innerHTML = `<div class="geo-flow-surface" style="--geo-flow-scale:${geoState.flowScale};width:${width}px;height:${height}px"><svg class="geo-flow-connectors" style="width:${width}px;height:${height}px" viewBox="0 0 ${width} ${height}" aria-hidden="true">${connectors}</svg>${nodes}</div>`
          const zoom = document.getElementById('geo-flow-zoom-value')
          if (zoom) zoom.textContent = `${Math.round(geoState.flowScale * 100)}%`
          geoFlowContentSize.width = width
          geoFlowContentSize.height = height
        }

        function syncGeoHierarchyView() {
          document.querySelectorAll('[data-geo-view]').forEach(tab => {
            const active = tab.dataset.geoView === geoState.hierarchyView
            tab.setAttribute('aria-selected', String(active))
            tab.tabIndex = active ? 0 : -1
          })
          const treePane = document.getElementById('geo-tree-pane')
          const flowPane = document.getElementById('geo-flow-pane')
          treePane.hidden = geoState.hierarchyView !== 'tree'
          flowPane.hidden = geoState.hierarchyView !== 'flow'
          document
            .getElementById('geo-workspace')
            ?.classList.toggle('flow-view', geoState.hierarchyView === 'flow')
          if (!flowPane.hidden) renderGeoFlow()
        }

        function syncGeoRecordPager() {
          const pager = document.querySelector('.geo-record-footer .pager')
          const input = pager?.querySelector('.pg-i')
          const total = pager?.querySelector('.tot')
          const position = GEO_ROWS.findIndex(row => row.code === geoState.code) + 1
          if (!pager || !input || !total) return
          const setPosition = value => {
            const next = Math.min(GEO_ROWS.length, Math.max(1, Number(value) || 1))
            geoState.code = GEO_ROWS[next - 1].code
            renderGeoRecord()
          }
          total.textContent = `${t('of', 'of')} ${GEO_ROWS.length}`
          input.max = String(GEO_ROWS.length)
          input.value = String(position)
          input.dataset.last = String(position)
          pager.querySelector('.pg-f').disabled = position === 1
          pager.querySelector('.pg-p').disabled = position === 1
          pager.querySelector('.pg-n').disabled = position === GEO_ROWS.length
          pager.querySelector('.pg-l').disabled = position === GEO_ROWS.length
          pager.querySelector('.pg-f').onclick = () => setPosition(1)
          pager.querySelector('.pg-p').onclick = () => setPosition(position - 1)
          pager.querySelector('.pg-n').onclick = () => setPosition(position + 1)
          pager.querySelector('.pg-l').onclick = () => setPosition(GEO_ROWS.length)
          input.onchange = () => setPosition(input.value)
          document.getElementById('geo-record-position').textContent =
            `${t('Record', 'Record')} ${position} ${t('of', 'of')} ${GEO_ROWS.length}`
        }

        function geoDescendantCodes(code) {
          const descendants = new Set()
          const collect = parentCode => {
            GEO_ROWS.filter(row => row.parentCode === parentCode).forEach(child => {
              descendants.add(child.code)
              collect(child.code)
            })
          }
          collect(code)
          return descendants
        }

        function renderGeoParentOptions(row, creating) {
          const select = document.getElementById('geo-field-parent')
          const excluded = creating ? new Set() : geoDescendantCodes(row.code)
          if (!creating) excluded.add(row.code)
          const options = GEO_ROWS.filter(candidate => !excluded.has(candidate.code))
          select.innerHTML =
            '<option value="">No parent location</option>' +
            options
              .map(
                candidate =>
                  `<option value="${encodeHtml(candidate.code)}"${candidate.code === row.parentCode ? ' selected' : ''}>${encodeHtml(candidate.code)} - ${encodeHtml(candidate.name)}</option>`
              )
              .join('')
        }

        function saveGeoRecord() {
          const row = GEO_ROWS.find(item => item.code === geoState.code)
          if (!row) return
          const parentCode = document.getElementById('geo-field-parent').value
          const parentRow = GEO_ROWS.find(item => item.code === parentCode)
          row.name = document.getElementById('geo-field-name').value.trim()
          row.type = document.getElementById('geo-field-type').value
          row.active = document.getElementById('geo-field-status').value === 'Active'
          row.remarks = document.getElementById('geo-field-remarks').value
          row.parentCode = parentCode
          row.parent = parentRow ? `${parentRow.code} - ${parentRow.name}` : ''
          row.level = (parentRow?.level || 0) + 1
          const cascadeLevel = current => {
            GEO_ROWS.filter(child => child.parentCode === current.code).forEach(child => {
              child.level = current.level + 1
              cascadeLevel(child)
            })
          }
          cascadeLevel(row)
        }

        function renderGeoRecord() {
          const creating = geoState.mode === 'create'
          const editing = geoState.mode !== 'view'
          const row = creating
            ? {
                code: '',
                parentCode: geoState.code || '',
                name: '',
                level: (GEO_ROWS.find(item => item.code === geoState.code)?.level || 0) + 1,
                type: 'District',
                active: true,
                remarks: '',
              }
            : GEO_ROWS.find(item => item.code === geoState.code) || GEO_ROWS[0]
          if (!creating) geoState.code = row.code
          renderGeoRecordChrome(row)
          renderGeoTree()
          syncGeoHierarchyView()
          syncGeoTreePanelToggle()
          document.getElementById('geo-field-code').value = row.code
          renderGeoParentOptions(row, creating)
          document.getElementById('geo-field-name').value = row.name
          document.getElementById('geo-field-level').value = row.level
          document.getElementById('geo-field-type').value = row.type
          document.getElementById('geo-field-status').value = row.active ? 'Active' : 'Inactive'
          document.getElementById('geo-field-remarks').value = row.remarks
          document.getElementById('geo-field-name').readOnly = !editing
          document.getElementById('geo-field-parent').disabled = !editing
          document.getElementById('geo-parent-picker-trigger').disabled = !editing
          document.getElementById('geo-field-type').disabled = !editing
          document.getElementById('geo-field-status').disabled = !editing
          document.getElementById('geo-field-remarks').readOnly = !editing
          const note = document.getElementById('geo-footer-note')
          if (note) {
            const message = creating
              ? t('New location. Save when complete.')
              : editing
                ? t('Editing location. Save or Undo your changes.')
                : t('Saved location. Choose Modify to edit.')
            note.lastChild.textContent = ` ${message}`
          }
          syncGeoRecordPager()
        }

        function openGeoRecord(code, mode = 'view') {
          geoState.code = code || GEO_ROWS[0].code
          geoState.mode = mode
          let parentCode = GEO_ROWS.find(row => row.code === geoState.code)?.parentCode
          while (parentCode) {
            geoState.expanded.add(parentCode)
            parentCode = GEO_ROWS.find(row => row.code === parentCode)?.parentCode
          }
          showContentView('geo-record')
          renderGeoRecord()
        }

        function selectGeoTreeNode(node) {
          if (node.matches('[data-geo-toggle-branch]')) {
            if (geoState.expanded.has(node.dataset.geoNode))
              geoState.expanded.delete(node.dataset.geoNode)
            else geoState.expanded.add(node.dataset.geoNode)
          }
          geoState.code = node.dataset.geoNode
          renderGeoRecord()
        }

        function toggleGeoTreePanel(toggleButton) {
          if (geoHierarchyMediaQuery.matches) {
            openGeoHierarchyDialog()
            return
          }
          const workspace = document.getElementById('geo-workspace')
          const collapsed = workspace.classList.toggle('tree-collapsed')
          toggleButton.setAttribute('aria-pressed', String(collapsed))
          toggleButton.setAttribute(
            'aria-label',
            collapsed ? 'Expand location hierarchy' : 'Collapse location hierarchy'
          )
          toggleButton.title = collapsed ? 'Expand hierarchy' : 'Collapse hierarchy'
          toggleButton.querySelector('use')?.setAttribute('href', collapsed ? '#i-next' : '#i-prev')
        }

        function syncGeoTreePanelToggle() {
          const toggleButton = document.querySelector('[data-geo-tree-collapse]')
          if (!toggleButton) return
          if (geoHierarchyMediaQuery.matches) {
            toggleButton.setAttribute('aria-pressed', 'false')
            toggleButton.setAttribute('aria-label', 'Open location hierarchy')
            toggleButton.title = 'Open location hierarchy'
            toggleButton.querySelector('use')?.setAttribute('href', '#i-next')
            return
          }
          const collapsed = document
            .getElementById('geo-workspace')
            ?.classList.contains('tree-collapsed')
          toggleButton.setAttribute('aria-pressed', String(Boolean(collapsed)))
          toggleButton.setAttribute(
            'aria-label',
            collapsed ? 'Expand location hierarchy' : 'Collapse location hierarchy'
          )
          toggleButton.title = collapsed ? 'Expand hierarchy' : 'Collapse hierarchy'
          toggleButton.querySelector('use')?.setAttribute('href', collapsed ? '#i-next' : '#i-prev')
        }

        function setGeoHierarchyView(view) {
          if (!['tree', 'flow'].includes(view)) return
          geoState.hierarchyView = view
          syncGeoHierarchyView()
          if (view === 'flow')
            requestAnimationFrame(() => document.getElementById('geo-flow-viewport')?.focus())
        }

        function setGeoFlowScale(scale) {
          geoState.flowScale = Math.min(1.4, Math.max(0.55, scale))
          renderGeoFlow()
        }

        function fitGeoFlow() {
          const viewport = document.getElementById('geo-flow-viewport')
          if (!viewport) return
          const availableWidth = Math.max(1, viewport.clientWidth - 24)
          const availableHeight = Math.max(1, viewport.clientHeight - 24)
          setGeoFlowScale(
            Math.min(
              1,
              availableWidth / geoFlowContentSize.width,
              availableHeight / geoFlowContentSize.height
            )
          )
          viewport.scrollTo({top: 0, left: 0, behavior: 'smooth'})
        }

        function openCustomerRecord(customerNo, mode) {
          customerState.mode = mode
          customerState.customerNo = customerNo || ''
          customerState.dirty = false
          customerState.errors.clear()
          /* every record opens on its normal-purpose view — never carry over a tab
             (e.g. Deactivate) selected while viewing a previous customer */
          customerState.activeSection = 'identity'
          customerData =
            mode === 'create' ? createBlankCustomerData() : createSavedCustomerData(customerNo)
          customerSavedSnapshot = structuredClone(customerData)
          document.getElementById('customer-mode').value = mode
          showContentView('customer-record')
          renderCustomerRecord()
        }

        function renderCustomerField(field, {asCardToggle = false} = {}) {
          const value = customerData[field.key]
          const disabled = customerState.mode === 'view' ? ' disabled' : ''
          const key = encodeHtml(field.key)
          const label = encodeHtml(t(field.label))
          const id = `customer-field-${key}`
          const required = CUSTOMER_REQUIRED_FIELDS.has(field.key)
            ? ' required aria-required="true"'
            : ''
          const error = customerState.errors.get(field.key) || ''
          const invalid = error ? ' aria-invalid="true"' : ''
          const describedBy = error ? ` aria-describedby="${id}-error"` : ''
          const requiredMark = required ? '<span class="req" aria-hidden="true">*</span>' : ''
          const errorMarkup = error
            ? `<span class="customer-field-error" id="${id}-error">${encodeHtml(error)}</span>`
            : ''
          if (field.type === 'checkbox') {
            if (asCardToggle) {
              return `<label class="customer-dialog-toggle rec-field customer-field customer-field-wide customer-beneficiary-toggle" for="${id}"><span><strong>${label}</strong></span><input id="${id}" type="checkbox" role="switch" data-customer-field="${key}"${value ? ' checked' : ''}${disabled}><span class="customer-dialog-toggle-track" aria-hidden="true"></span></label>`
            }
            return `<div class="rec-field customer-field customer-check"><label for="${id}"><input id="${id}" type="checkbox" data-customer-field="${key}"${value ? ' checked' : ''}${disabled}> <span>${label}</span></label></div>`
          }
          if (field.type === 'photo') {
            const actionLabel = customerImageData(value) ? 'Change photo' : 'Select photo'
            return `<div class="rec-field customer-field customer-photo"><label for="${id}">${label}</label>${renderCustomerRecordPhoto(value)}<button id="${id}" class="lbtn out" type="button" data-customer-field="${key}" data-customer-action="photo"${disabled}><svg width="15" height="15" aria-hidden="true"><use href="#i-clip" /></svg> ${actionLabel}</button></div>`
          }
          if (field.type === 'select') {
            const options = [...new Set([value, ...field.options])]
            const optionMarkup = options
              .map(option => {
                const optionLabel = option || field.label
                return `<option value="${encodeHtml(option)}"${option === value ? ' selected' : ''}>${encodeHtml(optionLabel)}</option>`
              })
              .join('')
            if (CUSTOMER_LOOKUP_KEYS.has(field.key)) {
              const hierarchyTrigger =
                field.key === 'operationUnit'
                  ? `<button class="customer-lookup-trigger" type="button" data-unit-picker-open="${id}" aria-haspopup="dialog" aria-label="Choose ${label} from hierarchy"${disabled}><svg width="16" height="16" aria-hidden="true"><use href="#i-flow" /></svg></button>`
                  : ''
              return `<div class="rec-field customer-field"><label for="${id}">${label} ${requiredMark}</label><div class="customer-lookup-control"><select id="${id}" data-customer-field="${key}"${required}${invalid}${describedBy}${disabled}>${optionMarkup}</select>${hierarchyTrigger}<button class="customer-lookup-trigger" type="button" data-customer-lookup="${key}" aria-haspopup="menu" aria-controls="customer-lookup-menu" aria-expanded="false" aria-label="More options for ${label}"${disabled}><svg width="16" height="16" aria-hidden="true"><use href="#i-dots" /></svg></button></div>${errorMarkup}</div>`
            }
            return `<div class="rec-field customer-field"><label for="${id}">${label} ${requiredMark}</label><select id="${id}" data-customer-field="${key}"${required}${invalid}${describedBy}${disabled}>${optionMarkup}</select>${errorMarkup}</div>`
          }
          if (field.type === 'textarea') {
            return `<div class="rec-field customer-field customer-field-wide"><label for="${id}">${label} ${requiredMark}</label><textarea id="${id}" rows="3" data-customer-field="${key}" placeholder="${label}"${required}${invalid}${describedBy}${disabled}>${encodeHtml(value)}</textarea>${errorMarkup}</div>`
          }
          return `<div class="rec-field customer-field"><label for="${id}">${label} ${requiredMark}</label><input id="${id}" type="${encodeHtml(field.type)}" value="${encodeHtml(value)}" data-customer-field="${key}" placeholder="${label}"${required}${invalid}${describedBy}${disabled}>${errorMarkup}</div>`
        }

        function renderCustomerSectionBody(key) {
          const section = CUSTOMER_SECTIONS[key]
          if (key === 'identity') {
            const photo = section.fields.find(field => field.type === 'photo')
            const linked = section.fields.find(field => field.key === 'linkedBeneficiaries')
            const identityFields = section.fields.filter(
              field => field !== photo && field.key !== 'linkedBeneficiaries'
            )
            return `<div class="customer-identity-body"><div class="customer-identity-photo">${renderCustomerField(photo)}</div><div class="customer-field-grid">${identityFields.map(renderCustomerField).join('')}${renderCustomerField(linked, {asCardToggle: true})}</div></div>`
          }
          if (section.type === 'subledgers') return renderCustomerSubLedgers()
          if (section.type === 'empty') {
            return `<div class="customer-empty-state"><svg width="28" height="28" aria-hidden="true"><use href="#i-user" /></svg><h3>No contact details to display</h3><p>The supplied reference does not define contact-detail fields.</p></div>`
          }
          return `<div class="customer-field-grid">${section.fields.map(renderCustomerField).join('')}</div>`
        }

        function renderCustomerIdentitySection(concept) {
          const section = CUSTOMER_SECTIONS.identity
          const meta = customerSectionMeta('identity')
          const conceptAttribute = concept ? ` data-customer-concept="${encodeHtml(concept)}"` : ''
          return `<section class="customer-section customer-identity-section" data-customer-section="identity"${conceptAttribute} data-customer-has-errors="${meta.hasErrors}"><div class="customer-section-titlebar"><h2><span>${encodeHtml(section.title)}</span>${renderCustomerSectionStatus('identity')}</h2></div><div class="customer-section-body">${renderCustomerSectionBody('identity')}</div></section>`
        }

        function renderCustomerTabSection(key) {
          const meta = customerSectionMeta(key)
          return `<section class="customer-section customer-tab-section" data-customer-section="${encodeHtml(key)}" data-customer-has-errors="${meta.hasErrors}"><div class="customer-section-body">${renderCustomerSectionBody(key)}</div></section>`
        }

        function renderCustomerSection(key) {
          const section = CUSTOMER_SECTIONS[key]
          const meta = customerSectionMeta(key)
          return `<section class="customer-section" data-customer-section="${encodeHtml(key)}" data-customer-has-errors="${meta.hasErrors}"><h2 class="customer-section-titlebar"><span>${encodeHtml(section.title)}</span>${renderCustomerSectionStatus(key)}</h2><div class="customer-section-body">${renderCustomerSectionBody(key)}</div></section>`
        }

        function renderCustomerCollapsible(key, concept) {
          const section = CUSTOMER_SECTIONS[key]
          const expanded = customerState.expanded.has(key)
          const meta = customerSectionMeta(key)
          const bodyId = `customer-${concept}-${key}-body`
          return `<section class="customer-section" data-customer-section="${encodeHtml(key)}" data-customer-concept="${encodeHtml(concept)}" data-customer-has-errors="${meta.hasErrors}"><button class="customer-section-heading" type="button" data-customer-collapse="${encodeHtml(key)}" aria-controls="${encodeHtml(bodyId)}" aria-expanded="${expanded}"><span class="customer-section-label"><span>${encodeHtml(section.title)}</span>${renderCustomerSectionStatus(key)}</span><svg width="14" height="14" aria-hidden="true"><use href="#i-caret" /></svg></button><div class="customer-section-body" id="${encodeHtml(bodyId)}"${expanded ? '' : ' hidden'}>${renderCustomerSectionBody(key)}</div></section>`
        }

        function renderCustomerSubLedgers() {
          return `<div class="customer-table-toolbar">
      <button class="ibtn" type="button" aria-label="Add sub ledger" data-customer-action="add-sub-ledger"><svg width="15" height="15" aria-hidden="true"><use href="#i-plus" /></svg></button>
      <div class="sp"></div>
      <label class="customer-table-search"><svg width="15" height="15" aria-hidden="true"><use href="#i-search" /></svg><input type="search" placeholder="Search" aria-label="Search sub ledgers"></label>
    </div>
    <div class="inv-grid-wrap">
      <table class="inv-grid customer-subledger-grid">
        <thead><tr><th>#</th><th>Sub Ledger Type</th><th>Number</th><th>Default</th><th>Deactivate</th></tr></thead>
        <tbody><tr><td colspan="5" class="customer-table-empty">No records to display</td></tr></tbody>
      </table>
      <div class="customer-table-pager">Display 0 to 0 from 0 inputs</div>
    </div>`
        }

        function renderCustomerRecordChrome() {
          const creating = customerState.mode === 'create'
          const editing = customerState.mode === 'edit' || creating
          const title = creating
            ? t('New Customer')
            : `${encodeHtml(customerData.customerNo)} · ${encodeHtml(customerData.customerName)}`
          const viewActions = `<button class="lbtn pri" type="button" data-customer-action="modify"><svg width="15" height="15" aria-hidden="true"><use href="#i-edit" /></svg> ${t('Modify')}</button><span class="vsep"></span><span class="newwrap menu"><button class="lbtn out main" type="button" data-customer-action="new"><svg width="15" height="15" aria-hidden="true"><use href="#i-plus" /></svg> ${t('New')}</button><button class="car" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="Other ways to create a customer"><svg width="11" height="11" aria-hidden="true"><use href="#i-caret" /></svg></button><div class="mlist mend" role="menu"><button role="menuitem" type="button" data-customer-action="add-from">${t('Add From')}</button><button role="menuitem" type="button" data-customer-action="new-tab">${t('Open in new tab')}</button></div></span><button class="lbtn out danger" type="button" data-customer-action="delete" disabled><svg width="15" height="15" aria-hidden="true"><use href="#i-trash" /></svg> ${t('Delete')}</button>`
          const editActions = `<button class="lbtn pri" type="button" data-customer-action="save"><svg width="15" height="15" aria-hidden="true"><use href="#i-save" /></svg> ${t('Save')}</button><button class="lbtn out" type="button" data-customer-action="undo"><svg width="15" height="15" aria-hidden="true"><use href="#i-undo" /></svg> ${t('Undo')}</button>`
          document.getElementById('customer-record-chrome').innerHTML = `
    <div class="arow customer-arow" role="toolbar" aria-label="Customer toolbar">
      <div class="menu"><button type="button" aria-haspopup="menu" aria-expanded="false">${t('Record')} <svg width="12" height="12" aria-hidden="true"><use href="#i-caret" /></svg></button><div class="mlist" role="menu"><button role="menuitem" type="button" data-customer-action="new"><svg width="14" height="14" aria-hidden="true"><use href="#i-plus" /></svg> ${t('New')}</button><button role="menuitem" type="button" data-customer-action="add-from"><svg width="14" height="14" aria-hidden="true"><use href="#i-doc" /></svg> ${t('Add From')}</button><button role="menuitem" type="button" data-customer-action="modify"${editing ? ' disabled' : ''}><svg width="14" height="14" aria-hidden="true"><use href="#i-edit" /></svg> ${t('Modify')}</button><button role="menuitem" type="button" data-customer-action="delete"${editing ? ' disabled' : ''}><svg width="14" height="14" aria-hidden="true"><use href="#i-trash" /></svg> ${t('Delete')}</button><button role="menuitem" type="button" data-customer-action="search"><svg width="14" height="14" aria-hidden="true"><use href="#i-search" /></svg> ${t('Search')}</button></div></div>
      <div class="menu"><button type="button" aria-haspopup="menu" aria-expanded="false">${t('Procedure')} <svg width="12" height="12" aria-hidden="true"><use href="#i-caret" /></svg></button><div class="mlist" role="menu"><button role="menuitem" type="button" data-customer-action="save"${editing ? '' : ' disabled'}><svg width="14" height="14" aria-hidden="true"><use href="#i-save" /></svg> ${t('Save')}</button><button role="menuitem" type="button" data-customer-action="lock"><svg width="14" height="14" aria-hidden="true"><use href="#i-lock" /></svg> ${t('Lock Screen')}</button><button role="menuitem" type="button" data-customer-action="reports"><svg width="14" height="14" aria-hidden="true"><use href="#i-doc" /></svg> ${t('Reports')}</button><button role="menuitem" type="button" data-customer-action="print"><svg width="14" height="14" aria-hidden="true"><use href="#i-print" /></svg> ${t('Print')}</button><button role="menuitem" type="button" data-customer-action="undo"${editing ? '' : ' disabled'}><svg width="14" height="14" aria-hidden="true"><use href="#i-undo" /></svg> ${t('Undo')}</button></div></div>
      <div class="menu"><button type="button" aria-haspopup="menu" aria-expanded="false">${t('More')} <svg width="12" height="12" aria-hidden="true"><use href="#i-caret" /></svg></button><div class="mlist" role="menu"><button role="menuitem" type="button" data-customer-action="parameters"><svg width="14" height="14" aria-hidden="true"><use href="#i-sliders" /></svg> ${t('Screen Parameters')}</button><button role="menuitem" type="button" data-customer-action="help"><svg width="14" height="14" aria-hidden="true"><use href="#i-help" /></svg> ${t('Help')}</button><hr /><button role="menuitem" type="button" class="dan" data-customer-action="deactivate"><svg width="14" height="14" aria-hidden="true"><use href="#i-lock" /></svg> ${customerData.deactivationFrom ? t('Activate') : t('Deactivate')}</button></div></div>
      <div class="sp"></div>
      <button type="button" class="lbtn" data-customer-action="accounts-movement"><svg width="15" height="15" aria-hidden="true"><use href="#i-flow" /></svg> ${t('Accounts Movement')}</button>
    </div>
    <div class="phead">
      <div class="l">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="#">${t('Home')}</a><span class="sep">›</span><button class="customer-back" type="button">${t('Customers')}</button><span class="sep">›</span><span aria-current="page">${creating ? t('New') : t('All')}</span></nav>
        <div class="tline"><h1>${title}</h1><span class="badge ${customerData.deactivationFrom ? 'gray' : 'ok'}">${customerData.deactivationFrom ? t('Inactive') : t('Active')}</span></div>
      </div>
      <div class="r"><span class="recacts">${editing ? editActions : viewActions}</span></div>
    </div>`
          syncCustomerRecordFooter()
        }

        function syncCustomerRecordFooter() {
          const footer = document.querySelector('.customer-record-footer')
          if (!footer) return
          const rowIndex = CUSTOMER_ROWS.findIndex(
            customer => customer.customerNo === customerData.customerNo
          )
          const position = Math.max(1, rowIndex + 1)
          const pager = footer.querySelector('.pager')
          const input = pager?.querySelector('.pg-i')
          const total = pager?.querySelector('.tot')
          if (total) total.textContent = `${t('of', 'of')} 72`
          const positionLabel = document.getElementById('customer-record-position')
          const setPosition = value => {
            const next = Math.min(72, Math.max(1, Number(value) || 1))
            input.value = String(next)
            input.dataset.last = String(next)
            pager.querySelector('.pg-f').disabled = next === 1
            pager.querySelector('.pg-p').disabled = next === 1
            pager.querySelector('.pg-n').disabled = next === 72
            pager.querySelector('.pg-l').disabled = next === 72
            positionLabel.textContent = `${t('Record', 'Record')} ${next} ${t('of', 'of')} 72`
          }
          if (input && pager && positionLabel) {
            input.max = '72'
            pager.querySelector('.pg-f').onclick = () => setPosition(1)
            pager.querySelector('.pg-p').onclick = () => setPosition(Number(input.value) - 1)
            pager.querySelector('.pg-n').onclick = () => setPosition(Number(input.value) + 1)
            pager.querySelector('.pg-l').onclick = () => setPosition(72)
            input.onchange = () => setPosition(input.value)
            setPosition(position)
            const creating = customerState.mode === 'create'
            input.readOnly = creating
            if (creating) {
              pager.querySelectorAll('button').forEach(button => (button.disabled = true))
              positionLabel.textContent = 'New customer'
            }
          }
          const note = document.getElementById('customer-footer-note')
          if (note) {
            const message =
              customerState.mode === 'view'
                ? t('Saved customer. Choose Modify to edit.')
                : customerState.mode === 'create'
                  ? t('New customer. Save when complete.')
                  : t('Editing customer. Save or Undo your changes.')
            note.lastChild.textContent = ` ${message}`
          }
        }

        function renderCustomerGuided() {
          const canvas = document.getElementById('customer-record-canvas')
          const top = renderCustomerIdentitySection('guided')
          const activeKey = CUSTOMER_GUIDED_TABS.includes(customerState.activeSection)
            ? customerState.activeSection
            : 'mainData'
          customerState.activeSection = activeKey
          const tabs = CUSTOMER_GUIDED_TABS.map(key => {
            const selected = activeKey === key
            const section = CUSTOMER_SECTIONS[key]
            return `<button class="rec-tab${selected ? ' on' : ''}" id="customer-tab-${encodeHtml(key)}" type="button" role="tab" data-customer-tab="${encodeHtml(key)}" aria-controls="customer-guided-panel" aria-selected="${selected}" tabindex="${selected ? '0' : '-1'}"><span>${encodeHtml(section.title)}</span>${renderCustomerSectionStatus(key)}</button>`
          }).join('')
          canvas.innerHTML = `<div class="customer-guided">${top}<div class="customer-guided-details"><div class="rec-tabs" role="tablist" aria-label="Customer details">${tabs}</div><div class="customer-guided-panel" id="customer-guided-panel" role="tabpanel" aria-labelledby="customer-tab-${encodeHtml(activeKey)}">${renderCustomerTabSection(activeKey)}</div></div></div>`
        }
        function renderCustomerFocused() {
          if (!CUSTOMER_SECTION_ORDER.includes(customerState.activeSection)) {
            customerState.activeSection = 'identity'
          }
          const nav = CUSTOMER_SECTION_ORDER.map(key => {
            const current = customerState.activeSection === key
            const label = key === 'identity' ? 'Overview' : CUSTOMER_SECTIONS[key].title
            return `<button type="button" id="customer-focused-${encodeHtml(key)}" data-customer-focus-section="${encodeHtml(key)}" aria-controls="customer-focused-panel"${current ? ' aria-current="page"' : ''} tabindex="${current ? '0' : '-1'}"><span>${encodeHtml(label)}</span>${renderCustomerSectionStatus(key)}</button>`
          }).join('')
          document.getElementById('customer-record-canvas').innerHTML = `
    ${renderCustomerSummaryBand()}
    <div class="customer-focused">
      <nav class="customer-focused-nav" aria-label="Customer sections">${nav}</nav>
      <div class="customer-focused-panel" id="customer-focused-panel" role="region" aria-labelledby="customer-focused-${encodeHtml(customerState.activeSection)}">${renderCustomerSection(customerState.activeSection)}</div>
    </div>`
        }
        function renderCustomerCompact() {
          const cards = CUSTOMER_SECTION_ORDER.map(key => {
            const full = ['identity', 'subLedgers', 'contactDetails'].includes(key)
            const wide = ['nationalAddress', 'mainData', 'otherData'].includes(key)
            const spanClass = full ? ' full' : wide ? ' wide' : ''
            return `<div class="customer-compact-card${spanClass}">${renderCustomerCollapsible(key, 'compact')}</div>`
          }).join('')
          document.getElementById('customer-record-canvas').innerHTML = `
    ${renderCustomerSummaryBand()}
    <div class="customer-compact-grid">${cards}</div>`
        }

        let customerScrollObserver = null
        let customerScrollNavigationKey = ''
        let customerScrollNavigationTimer = 0
        let customerScrollNavigationId = 0

        function setCustomerScrollActiveSection(key) {
          if (!CUSTOMER_SECTION_ORDER.includes(key)) return
          customerState.activeSection = key
          document.querySelectorAll('.customer-scroll-nav button').forEach(button => {
            button.setAttribute(
              'aria-current',
              button.dataset.customerScrollSection === key ? 'page' : 'false'
            )
          })
        }

        function customerScrollStickyOffset() {
          if (!matchMedia('(max-width: 720px)').matches) return 12
          return (
            (document.querySelector('.customer-scroll-nav')?.getBoundingClientRect().height || 0) +
            8
          )
        }

        function customerScrollContainer() {
          const canvas = document.getElementById('customer-record-canvas')
          return canvas.scrollHeight > canvas.clientHeight + 1 ? canvas : document.scrollingElement
        }

        function customerScrollViewportTop(scroller) {
          return scroller === document.scrollingElement ? 0 : scroller.getBoundingClientRect().top
        }

        function syncCustomerScrollActiveSection() {
          if (customerScrollNavigationKey) return
          const canvas = document.getElementById('customer-record-canvas')
          if (!canvas) return
          const targets = [...canvas.querySelectorAll('[data-customer-scroll-target]')]
          if (!targets.length) return
          const scroller = customerScrollContainer()
          const anchor = customerScrollViewportTop(scroller) + customerScrollStickyOffset() + 2
          const activeTarget = targets.reduce((nearest, target) =>
            Math.abs(target.getBoundingClientRect().top - anchor) <
            Math.abs(nearest.getBoundingClientRect().top - anchor)
              ? target
              : nearest
          )
          setCustomerScrollActiveSection(activeTarget.dataset.customerScrollTarget)
        }

        function stopCustomerScrollNavigation({interrupt = false} = {}) {
          customerScrollNavigationId += 1
          window.clearTimeout(customerScrollNavigationTimer)
          customerScrollNavigationTimer = 0
          customerScrollNavigationKey = ''
          if (interrupt) {
            const scroller = customerScrollContainer()
            scroller.scrollTo({top: scroller.scrollTop, behavior: 'auto'})
            syncCustomerScrollActiveSection()
          }
        }

        function stopCustomerScrollTracking() {
          customerScrollObserver?.disconnect()
          customerScrollObserver = null
          stopCustomerScrollNavigation()
        }

        function startCustomerScrollSpy() {
          customerScrollObserver?.disconnect()
          customerScrollObserver = null
          if (!('IntersectionObserver' in window)) return
          const canvas = document.getElementById('customer-record-canvas')
          const scroller = customerScrollContainer()
          const stickyOffset = Math.round(customerScrollStickyOffset())
          customerScrollObserver = new IntersectionObserver(
            () => syncCustomerScrollActiveSection(),
            {
              root: scroller === document.scrollingElement ? null : scroller,
              rootMargin: `-${stickyOffset}px 0px -65% 0px`,
              threshold: [0, 0.1, 0.5],
            }
          )
          canvas
            .querySelectorAll('[data-customer-scroll-target]')
            .forEach(section => customerScrollObserver.observe(section))
        }

        function renderCustomerScroll() {
          if (!CUSTOMER_SECTION_ORDER.includes(customerState.activeSection)) {
            customerState.activeSection = 'identity'
          }
          const nav = CUSTOMER_SECTION_ORDER.map(key => {
            const current = customerState.activeSection === key
            return `<button type="button" data-customer-scroll-section="${encodeHtml(key)}" aria-controls="customer-section-${encodeHtml(key)}" aria-current="${current ? 'page' : 'false'}">${encodeHtml(CUSTOMER_SECTIONS[key].title)}</button>`
          }).join('')
          const sections = CUSTOMER_SECTION_ORDER.map(key => {
            const section =
              key === 'identity'
                ? renderCustomerIdentitySection('scroll')
                : renderCustomerCollapsible(key, 'scroll')
            return `<div id="customer-section-${encodeHtml(key)}" data-customer-scroll-target="${encodeHtml(key)}">${section}</div>`
          }).join('')
          document.getElementById('customer-record-canvas').innerHTML = `
    <div class="customer-scroll-layout">
      <nav class="customer-scroll-nav" aria-label="Customer sections">${nav}</nav>
      <div class="customer-scroll-content">${sections}</div>
    </div>`
          startCustomerScrollSpy()
        }

        function activateCustomerScrollSection(key) {
          if (!CUSTOMER_SECTION_ORDER.includes(key)) return
          stopCustomerScrollNavigation()
          const navigationId = customerScrollNavigationId
          customerScrollNavigationKey = key
          customerState.expanded.add(key)
          setCustomerScrollActiveSection(key)
          const section = document.getElementById(`customer-section-${key}`)
          if (!section) {
            stopCustomerScrollNavigation()
            return
          }
          const body = section.querySelector('.customer-section-body')
          const heading = section.querySelector('.customer-section-heading')
          body.hidden = false
          heading?.setAttribute('aria-expanded', 'true')
          const scroller = customerScrollContainer()
          const targetTop =
            scroller.scrollTop +
            section.getBoundingClientRect().top -
            customerScrollViewportTop(scroller) -
            customerScrollStickyOffset()
          const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
          scroller.scrollTo({
            top: Math.max(0, targetTop),
            behavior: reducedMotion ? 'auto' : 'smooth',
          })
          const finishNavigation = () => {
            if (navigationId !== customerScrollNavigationId || customerScrollNavigationKey !== key)
              return
            window.clearTimeout(customerScrollNavigationTimer)
            customerScrollNavigationTimer = 0
            customerScrollNavigationKey = ''
          }
          scroller.addEventListener('scrollend', finishNavigation, {once: true})
          customerScrollNavigationTimer = window.setTimeout(
            finishNavigation,
            reducedMotion ? 0 : 1200
          )
        }

        const CUSTOMER_RENDERERS = {
          guided: renderCustomerGuided,
          scroll: renderCustomerScroll,
        }

        function renderCustomerLayout({focusSelector = '', preserveScroll = false} = {}) {
          const canvas = document.getElementById('customer-record-canvas')
          if (!canvas) return
          const scrollTop = canvas.scrollTop
          stopCustomerScrollTracking()
          ;(CUSTOMER_RENDERERS[customerState.layout] || renderCustomerGuided)()
          applyRecordValueDirections(canvas)
          if (preserveScroll) canvas.scrollTop = scrollTop
          if (customerState.layout === 'scroll') {
            requestAnimationFrame(syncCustomerScrollActiveSection)
          }
          if (focusSelector) {
            const target = canvas.querySelector(focusSelector)
            if (target) target.focus({preventScroll: true})
          }
        }

        function renderCustomerRecord(options) {
          renderCustomerRecordChrome()
          renderCustomerLayout(options)
        }

        function setCustomerMode(mode) {
          customerState.mode = mode
          customerState.dirty = false
          if (mode === 'view') customerState.errors.clear()
          document.getElementById('customer-mode').value = mode
          renderCustomerRecord()
        }

        function saveCustomer() {
          if (!validateCustomerRecord()) {
            const firstError = CUSTOMER_SECTION_ORDER.flatMap(sectionKey =>
              CUSTOMER_SECTIONS[sectionKey].fields.map(field => ({field, sectionKey}))
            ).find(({field}) => customerState.errors.has(field.key))
            if (firstError) {
              customerState.expanded.add(firstError.sectionKey)
              if (
                customerState.layout === 'focused' ||
                customerState.layout === 'scroll' ||
                CUSTOMER_GUIDED_TABS.includes(firstError.sectionKey)
              ) {
                customerState.activeSection = firstError.sectionKey
              }
              renderCustomerRecord({
                focusSelector: `#customer-field-${firstError.field.key}`,
              })
              document
                .getElementById(`customer-field-${firstError.field.key}`)
                ?.scrollIntoView({block: 'center'})
            }
            toast({tone: 'bad', title: 'Complete the highlighted customer fields'})
            return false
          }
          customerSavedSnapshot = structuredClone(customerData)
          setCustomerMode('view')
          toast({tone: 'ok', title: 'Customer saved'})
          return true
        }

        function undoCustomer() {
          if (customerState.mode === 'create') {
            customerState.dirty = false
            showContentView('customers-list')
            return
          }
          customerData = structuredClone(customerSavedSnapshot)
          setCustomerMode('view')
        }

        function restoreCustomerView(previousMode) {
          if (previousMode !== 'create' && customerSavedSnapshot?.customerNo) {
            customerData = structuredClone(customerSavedSnapshot)
            customerState.customerNo = customerData.customerNo
            return
          }
          customerState.customerNo = CUSTOMER_REFERENCE.customerNo
          customerData = createSavedCustomerData(customerState.customerNo)
          customerSavedSnapshot = structuredClone(customerData)
        }

        const customerGuardScrim = document.getElementById('customer-gscrim')
        let customerGuardAfter = null
        const customerAtRisk = () =>
          customerState.mode === 'create' || (customerState.mode === 'edit' && customerState.dirty)

        function askCustomerGuard(after, label) {
          customerGuardAfter = after
          document.getElementById('customer-g-msg').textContent =
            customerState.mode === 'create'
              ? 'This customer has never been saved.'
              : 'This customer has changes that were never saved.'
          document.getElementById('customer-g-what').textContent = `You were about to: ${label}.`
          customerGuardScrim.classList.add('open')
          setTimeout(() => trapFocus(customerGuardScrim.querySelector('.guard')), 0)
        }

        function closeCustomerGuard() {
          customerGuardScrim.classList.remove('open')
          releaseFocus()
        }

        document.getElementById('customer-g-stay').addEventListener('click', () => {
          customerGuardAfter = null
          closeCustomerGuard()
        })
        document.getElementById('customer-g-discard').addEventListener('click', () => {
          const after = customerGuardAfter
          customerGuardAfter = null
          customerState.dirty = false
          if (customerState.mode === 'edit') {
            customerData = structuredClone(customerSavedSnapshot)
          }
          closeCustomerGuard()
          after?.()
        })
        document.getElementById('customer-g-save').addEventListener('click', () => {
          const after = customerGuardAfter
          if (!saveCustomer()) {
            customerGuardAfter = null
            closeCustomerGuard()
            return
          }
          customerGuardAfter = null
          closeCustomerGuard()
          after?.()
        })
        customerGuardScrim.addEventListener('click', event => {
          if (event.target === customerGuardScrim) {
            document.getElementById('customer-g-stay').click()
          }
        })
        document.addEventListener('keydown', event => {
          if (event.key === 'Escape' && customerGuardScrim.classList.contains('open')) {
            document.getElementById('customer-g-stay').click()
          }
        })

        document.addEventListener(
          'click',
          event => {
            const recordView = document.querySelector('.customer-record-view')
            const destination = event.target.closest(
              '.customer-back, .nc1-item, [data-label], .customer-record-view .pager button'
            )
            if (!recordView || recordView.hidden || !destination || !customerAtRisk()) return
            event.preventDefault()
            event.stopImmediatePropagation()
            const backToList = destination.classList.contains('customer-back')
            askCustomerGuard(
              () => {
                if (backToList) showContentView('customers-list')
                else destination.click()
              },
              backToList ? 'return to the Customers list' : 'leave this customer record'
            )
          },
          true
        )

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
        const customerRecordCanvas = document.getElementById('customer-record-canvas')
        const customerLookupMenu = document.getElementById('customer-lookup-menu')
        const customerUnitLookupMenu = document.getElementById('customer-unit-lookup-menu')
        const customerLookupSearchScrim = document.getElementById('customer-lookup-search-scrim')
        const customerTypeAddScrim = document.getElementById('customer-type-add-scrim')
        const geoFilterScrim = document.getElementById('geo-filter-scrim')
        const geoParentPickerScrim = document.getElementById('geo-parent-picker-scrim')
        const unitPickerScrim = document.getElementById('unit-picker-scrim')
        const geoHierarchyScrim = document.getElementById('geo-hierarchy-scrim')
        const kanbanBlockedScrim = document.getElementById('kanban-blocked-scrim')
        const dataExportScrim = document.getElementById('data-export-scrim')
        const customerUnitDrawerScrim = document.getElementById('customer-unit-drawer-scrim')
        const customerParentUnitDrawerScrim = document.getElementById(
          'customer-parent-unit-drawer-scrim'
        )
        const customerLocationAddScrim = document.getElementById('customer-location-add-scrim')
        const CUSTOMER_LOOKUP_LABELS = {
          operationUnit: 'Operation Unit',
          customerType: 'Customer Type',
          unitParent: 'Parent Unit',
          unitLocation: 'Geo. Location',
        }
        const CUSTOMER_MATCH_LABELS = {
          contains: 'Contains',
          starts: 'Starts with',
          ends: 'Ends with',
        }
        const customerLayerFocusStack = []

        function trapCustomerLayer(box) {
          if (!box) return
          customerLayerFocusStack.push(document.activeElement)
          trapped = box
          const first = box.querySelector(FOCUSABLE)
          ;(first || box).focus?.()
        }

        function releaseCustomerLayer() {
          const returnTo = customerLayerFocusStack.pop()
          trapped = customerParentUnitDrawerScrim.classList.contains('open')
            ? customerParentUnitDrawerScrim.querySelector('.customer-unit-drawer')
            : customerUnitDrawerScrim.classList.contains('open')
              ? customerUnitDrawerScrim.querySelector('.customer-unit-drawer')
              : null
          if (returnTo && document.contains(returnTo)) returnTo.focus()
        }

        function closeCustomerLookupMenu({restoreFocus = false} = {}) {
          if (customerLookupMenu.hidden) return
          customerLookupMenu.hidden = true
          customerLookupState.trigger?.setAttribute('aria-expanded', 'false')
          if (restoreFocus && document.contains(customerLookupState.trigger)) {
            customerLookupState.trigger.focus()
          }
        }

        function closeCustomerUnitLookupMenu({restoreFocus = false} = {}) {
          if (customerUnitLookupMenu.hidden) return
          customerUnitLookupMenu.hidden = true
          customerLookupState.trigger?.setAttribute('aria-expanded', 'false')
          if (restoreFocus && document.contains(customerLookupState.trigger)) {
            customerLookupState.trigger.focus()
          }
        }

        function positionCustomerLookupMenu(trigger, menu = customerLookupMenu) {
          const rect = trigger.getBoundingClientRect()
          const menuWidth = 252
          const menuHeight = menu.offsetHeight || 250
          const edge = 8
          const preferredLeft =
            document.documentElement.dir === 'rtl' ? rect.right - menuWidth : rect.left
          const left = Math.min(innerWidth - menuWidth - edge, Math.max(edge, preferredLeft))
          const fitsBelow = rect.bottom + 4 + menuHeight <= innerHeight - edge
          const top = fitsBelow ? rect.bottom + 4 : Math.max(edge, rect.top - menuHeight - 4)
          menu.style.left = `${left}px`
          menu.style.top = `${top}px`
        }

        function renderCustomerLookupMenu(fieldKey) {
          const matchMode = customerLookupState.matchModes[fieldKey]
          const addLabel =
            fieldKey === 'operationUnit'
              ? 'Add Operation Unit'
              : fieldKey === 'unitParent'
                ? 'Add Parent Unit'
                : fieldKey === 'unitLocation'
                  ? 'Add Geo. Location'
                  : 'Add Customer Type'
          customerLookupMenu.innerHTML = `
            <div class="customer-lookup-menu-label">Search options</div>
            ${Object.entries(CUSTOMER_MATCH_LABELS)
              .map(
                ([key, label]) =>
                  `<button type="button" role="menuitemradio" aria-checked="${key === matchMode}" data-customer-lookup-match="${encodeHtml(key)}"><span>${encodeHtml(label)}</span>${key === matchMode ? '<svg class="customer-lookup-check" width="15" height="15" aria-hidden="true"><use href="#i-check" /></svg>' : ''}</button>`
              )
              .join('')}
            <hr />
            <button type="button" role="menuitem" data-customer-lookup-action="search"><svg width="15" height="15" aria-hidden="true"><use href="#i-search" /></svg><span>Advanced search</span></button>
            <button type="button" role="menuitem" data-customer-lookup-action="add"><svg width="15" height="15" aria-hidden="true"><use href="#i-plus" /></svg><span>${encodeHtml(addLabel)}</span></button>`
        }

        function openCustomerLookupMenu(trigger) {
          closeCustomerLookupMenu()
          closeCustomerUnitLookupMenu()
          customerLookupState.fieldKey = trigger.dataset.customerLookup
          customerLookupState.trigger = trigger
          customerLookupState.source = 'customer'
          customerLookupState.targetSelectId = ''
          renderCustomerLookupMenu(customerLookupState.fieldKey)
          customerLookupMenu.hidden = false
          trigger.setAttribute('aria-expanded', 'true')
          positionCustomerLookupMenu(trigger)
          customerLookupMenu.querySelector('button')?.focus()
        }

        function openCustomerUnitLookupMenu(trigger) {
          closeCustomerUnitLookupMenu()
          customerLookupState.fieldKey = trigger.dataset.customerUnitLookup
          customerLookupState.trigger = trigger
          customerLookupState.source = 'unit'
          customerLookupState.targetSelectId = trigger.dataset.customerUnitTarget
          renderCustomerLookupMenu(customerLookupState.fieldKey)
          customerUnitLookupMenu.innerHTML = customerLookupMenu.innerHTML
          customerUnitLookupMenu.hidden = false
          trigger.setAttribute('aria-expanded', 'true')
          positionCustomerLookupMenu(trigger, customerUnitLookupMenu)
          customerUnitLookupMenu.querySelector('button')?.focus()
        }

        function customerLookupMatches(value, query, mode) {
          const candidate = value.toLocaleLowerCase()
          const needle = query.trim().toLocaleLowerCase()
          if (!needle) return true
          if (mode === 'starts') return candidate.startsWith(needle)
          if (mode === 'ends') return candidate.endsWith(needle)
          return candidate.includes(needle)
        }

        function renderCustomerLookupSearchResults() {
          const fieldKey = customerLookupState.fieldKey
          const query = document.getElementById('customer-lookup-search-query').value
          const mode = document.getElementById('customer-lookup-search-mode').value
          const status = document.getElementById('customer-lookup-filter-status')?.value || 'all'
          const country = document.getElementById('customer-lookup-filter-country')?.value || 'all'
          const parent = document.getElementById('customer-lookup-filter-parent')?.value || 'all'
          const type = document.getElementById('customer-lookup-filter-type')?.value || 'all'
          const level = document.getElementById('customer-lookup-filter-level')?.value || 'all'
          const sort = document.getElementById('customer-lookup-filter-sort')?.value || 'name-asc'
          const sourceResults =
            fieldKey === 'unitParent'
              ? CUSTOMER_LOOKUP_RESULTS.operationUnit
              : CUSTOMER_LOOKUP_RESULTS[fieldKey]
          const results = sourceResults
            .filter(item => {
              const searchable =
                fieldKey === 'operationUnit' || fieldKey === 'unitParent'
                  ? `${item.value} ${item.code} ${item.parent} ${item.country}`
                  : fieldKey === 'unitLocation'
                    ? `${item.value} ${item.code} ${item.parent} ${item.level} ${item.type}`
                    : `${item.value} ${item.details} ${item.order}`
              return (
                customerLookupMatches(searchable, query, mode) &&
                (status === 'all' || item.status.toLowerCase() === status) &&
                (country === 'all' || item.country === country) &&
                (parent === 'all' || item.parent === parent) &&
                (type === 'all' || item.type === type) &&
                (level === 'all' || item.level === level)
              )
            })
            .sort((a, b) => {
              if (sort === 'name-desc') return b.value.localeCompare(a.value)
              if (sort === 'order-asc') return Number(a.order) - Number(b.order)
              if (sort === 'code-asc') return Number(a.code) - Number(b.code)
              return a.value.localeCompare(b.value)
            })
          document.getElementById('customer-lookup-result-count').textContent =
            `${results.length} ${results.length === 1 ? 'result' : 'results'}`
          if (!results.some(item => item.value === customerLookupState.selectedValue)) {
            customerLookupState.selectedValue = ''
          }
          const resultBox = document.getElementById('customer-lookup-search-results')
          if (!results.length) {
            resultBox.innerHTML = `<div class="customer-lookup-empty"><strong>No results found</strong><br />Try another term or clear a filter.</div>`
            document.getElementById('customer-lookup-select').disabled = true
            customerLookupState.selectedValue = ''
            return
          }
          const headings =
            fieldKey === 'operationUnit' || fieldKey === 'unitParent'
              ? '<th>Operation Unit</th><th>Parent</th><th>Country</th><th>Status</th>'
              : fieldKey === 'unitLocation'
                ? '<th>Location</th><th>Code</th><th>Type</th><th>Level</th>'
                : '<th>Customer Type</th><th>Remarks</th><th>Order</th><th>Status</th>'
          const rows = results
            .map(item => {
              const selected = item.value === customerLookupState.selectedValue
              const cells =
                fieldKey === 'operationUnit' || fieldKey === 'unitParent'
                  ? `<td>${encodeHtml(item.value)}</td><td>${encodeHtml(item.parent)}</td><td>${encodeHtml(item.country)}</td><td><span class="badge ${item.status === 'Active' ? 'ok' : 'gray'}">${encodeHtml(item.status)}</span></td>`
                  : fieldKey === 'unitLocation'
                    ? `<td>${encodeHtml(item.value)}</td><td>${encodeHtml(item.code)}</td><td>${encodeHtml(item.type)}</td><td>${encodeHtml(item.level)}</td>`
                    : `<td>${encodeHtml(item.value)}</td><td>${encodeHtml(item.details)}</td><td>${encodeHtml(item.order)}</td><td><span class="badge ${item.status === 'Active' ? 'ok' : 'gray'}">${encodeHtml(item.status)}</span></td>`
              return `<tr tabindex="0" aria-selected="${selected}" data-customer-lookup-value="${encodeHtml(item.value)}">${cells}</tr>`
            })
            .join('')
          resultBox.innerHTML = `<table><thead><tr>${headings}</tr></thead><tbody>${rows}</tbody></table>`
          document.getElementById('customer-lookup-select').disabled =
            !customerLookupState.selectedValue
        }

        function openCustomerLookupSearch(fieldKey) {
          customerLookupState.fieldKey = fieldKey
          customerLookupState.selectedValue = ''
          const label = CUSTOMER_LOOKUP_LABELS[fieldKey]
          document.getElementById('customer-lookup-search-title').textContent = `Find ${label}`
          document.getElementById('customer-lookup-search-description').textContent =
            `Search and compare ${label.toLowerCase()} records before selecting one.`
          const query = document.getElementById('customer-lookup-search-query')
          query.value = ''
          query.placeholder = `Search ${label.toLowerCase()}`
          const mode = document.getElementById('customer-lookup-search-mode')
          mode.value = customerLookupState.matchModes[fieldKey]
          document.getElementById('customer-lookup-search-filters').innerHTML = `
            <label class="rec-field"><span>Status</span><select id="customer-lookup-filter-status"><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
            ${
              fieldKey === 'operationUnit' || fieldKey === 'unitParent'
                ? '<label class="rec-field"><span>Country</span><select id="customer-lookup-filter-country"><option value="all">All countries</option><option>EG - Egypt</option><option>SA - Saudi Arabia</option><option>AE - United Arab Emirates</option></select></label><label class="rec-field"><span>Parent Unit</span><select id="customer-lookup-filter-parent"><option value="all">All parent units</option><option>Head Office</option><option value="No parent">No parent</option></select></label>'
                : fieldKey === 'unitLocation'
                  ? '<label class="rec-field"><span>Type</span><select id="customer-lookup-filter-type"><option value="all">All types</option><option>Country</option><option>Governorate</option><option>City</option><option>District</option></select></label><label class="rec-field"><span>Level</span><select id="customer-lookup-filter-level"><option value="all">All levels</option><option>1</option><option>2</option><option>3</option></select></label>'
                  : ''
            }
            <label class="rec-field"><span>Sort by</span><select id="customer-lookup-filter-sort">${
              fieldKey === 'operationUnit' || fieldKey === 'unitParent'
                ? '<option value="name-asc">Name, A to Z</option><option value="name-desc">Name, Z to A</option><option value="code-asc">Unit code</option>'
                : fieldKey === 'unitLocation'
                  ? '<option value="name-asc">Name, A to Z</option><option value="name-desc">Name, Z to A</option><option value="code-asc">Location code</option>'
                  : '<option value="name-asc">Name, A to Z</option><option value="name-desc">Name, Z to A</option><option value="order-asc">Display order</option>'
            }</select></label>`
          document.getElementById('customer-lookup-select').disabled = true
          renderCustomerLookupSearchResults()
          customerLookupSearchScrim.classList.toggle(
            'is-over-drawer',
            customerLookupState.source === 'unit'
          )
          customerLookupSearchScrim.classList.add('open')
          if (customerLookupState.source === 'unit') {
            trapCustomerLayer(customerLookupSearchScrim.querySelector('.customer-modal'))
          } else {
            trapFocus(customerLookupSearchScrim.querySelector('.customer-modal'))
          }
          requestAnimationFrame(() => query.focus())
        }

        function closeCustomerLookupSearch() {
          const overDrawer = customerLookupSearchScrim.classList.contains('is-over-drawer')
          customerLookupSearchScrim.classList.remove('open')
          customerLookupSearchScrim.classList.remove('is-over-drawer')
          if (overDrawer) releaseCustomerLayer()
          else releaseFocus()
        }

        function applyCustomerLookupValue(fieldKey, value) {
          if (customerLookupState.source === 'unit') {
            const select = document.getElementById(customerLookupState.targetSelectId)
            if (!select) return
            if (![...select.options].some(option => option.value === value)) {
              select.add(new Option(value, value))
            }
            select.value = value
            select.dispatchEvent(new Event('change', {bubbles: true}))
            return
          }
          customerData[fieldKey] = value
          customerState.dirty = true
          renderCustomerRecord({
            focusSelector: `#customer-field-${fieldKey}`,
            preserveScroll: true,
          })
        }

        function openCustomerTypeAdd() {
          document.getElementById('customer-type-name').value = ''
          document.getElementById('customer-type-order').value = '10'
          document.getElementById('customer-type-deactivate').checked = false
          document.getElementById('customer-type-remarks').value = ''
          const error = document.getElementById('customer-type-name-error')
          error.hidden = true
          customerTypeAddScrim.classList.add('open')
          trapFocus(customerTypeAddScrim.querySelector('.customer-modal'))
          requestAnimationFrame(() => document.getElementById('customer-type-name').focus())
        }

        function closeCustomerTypeAdd() {
          customerTypeAddScrim.classList.remove('open')
          releaseFocus()
        }

        function openCustomerUnitDrawer() {
          document.getElementById('customer-unit-name').value = ''
          document.getElementById('customer-unit-financial').value = '1'
          document.getElementById('customer-unit-affected').checked = false
          const parentSelect = document.getElementById('customer-unit-parent')
          parentSelect.innerHTML =
            '<option value="">No parent unit</option>' +
            UNIT_ROWS.map(unit => {
              const label = `${unit.code} - ${unit.name}`
              return `<option value="${encodeHtml(label)}">${encodeHtml(label)}</option>`
            }).join('')
          const error = document.getElementById('customer-unit-name-error')
          error.hidden = true
          customerUnitDrawerScrim.classList.remove('is-page')
          const openPageButton = customerUnitDrawerScrim.querySelector('.customer-unit-open-page')
          openPageButton.setAttribute('aria-pressed', 'false')
          openPageButton.setAttribute('aria-label', 'Open in new tab')
          openPageButton.querySelector('span').textContent = 'Open in new tab'
          openPageButton.title = 'Open in new tab'
          document.getElementById('customer-unit-drawer-description').textContent =
            'Create the unit here, then use it on this customer.'
          setCustomerUnitTab('address')
          customerUnitDrawerScrim.classList.add('open')
          trapFocus(customerUnitDrawerScrim.querySelector('.customer-unit-drawer'))
          requestAnimationFrame(() => document.getElementById('customer-unit-name').focus())
        }

        function closeCustomerUnitDrawer() {
          closeCustomerUnitLookupMenu()
          if (customerLocationAddScrim.classList.contains('open')) closeCustomerLocationAdd()
          if (customerParentUnitDrawerScrim.classList.contains('open')) {
            closeCustomerParentUnitDrawer()
          }
          customerUnitDrawerScrim.classList.remove('open')
          customerUnitDrawerScrim.classList.remove('is-page')
          releaseFocus()
        }

        function openCustomerParentUnitDrawer() {
          document.getElementById('customer-parent-unit-name').value = ''
          document.getElementById('customer-parent-unit-financial').value = '1'
          document.getElementById('customer-parent-unit-affected').checked = false
          const error = document.getElementById('customer-parent-unit-name-error')
          error.hidden = true
          document.getElementById('customer-parent-unit-name').removeAttribute('aria-invalid')
          customerParentUnitDrawerScrim.classList.add('open')
          trapCustomerLayer(
            customerParentUnitDrawerScrim.querySelector('.customer-nested-unit-drawer')
          )
          requestAnimationFrame(() => document.getElementById('customer-parent-unit-name').focus())
        }

        function closeCustomerParentUnitDrawer() {
          closeCustomerUnitLookupMenu()
          customerParentUnitDrawerScrim.classList.remove('open')
          releaseCustomerLayer()
        }

        function openCustomerLocationAdd() {
          ;['code', 'name'].forEach(key => {
            const input = document.getElementById(`customer-location-${key}`)
            const error = document.getElementById(`customer-location-${key}-error`)
            input.value = ''
            input.removeAttribute('aria-invalid')
            input.removeAttribute('aria-describedby')
            error.hidden = true
          })
          document.getElementById('customer-location-parent').value = ''
          document.getElementById('customer-location-level').value = '1'
          document.getElementById('customer-location-type').value = 'Country'
          document.getElementById('customer-location-remarks').value = ''
          customerLocationAddScrim.classList.add('open')
          trapCustomerLayer(customerLocationAddScrim.querySelector('.customer-location-modal'))
          requestAnimationFrame(() => document.getElementById('customer-location-code').focus())
        }

        function closeCustomerLocationAdd() {
          customerLocationAddScrim.classList.remove('open')
          releaseCustomerLayer()
        }

        function setCustomerUnitTab(tabKey, {focus = false} = {}) {
          customerUnitDrawerScrim.querySelectorAll('[data-customer-unit-tab]').forEach(tab => {
            const active = tab.dataset.customerUnitTab === tabKey
            tab.setAttribute('aria-selected', String(active))
            tab.classList.toggle('on', active)
            tab.tabIndex = active ? 0 : -1
            if (active && focus) tab.focus()
          })
          customerUnitDrawerScrim.querySelectorAll('[data-customer-unit-panel]').forEach(panel => {
            panel.hidden = panel.dataset.customerUnitPanel !== tabKey
          })
        }

        customerRecordCanvas.addEventListener('click', event => {
          const trigger = event.target.closest('[data-customer-lookup]')
          if (!trigger || trigger.disabled) return
          if (!customerLookupMenu.hidden && customerLookupState.trigger === trigger) {
            closeCustomerLookupMenu({restoreFocus: true})
            return
          }
          openCustomerLookupMenu(trigger)
        })

        document.addEventListener('click', event => {
          const trigger = event.target.closest('[data-customer-unit-lookup]')
          if (!trigger || trigger.disabled) return
          if (!customerUnitLookupMenu.hidden && customerLookupState.trigger === trigger) {
            closeCustomerUnitLookupMenu({restoreFocus: true})
            return
          }
          openCustomerUnitLookupMenu(trigger)
        })

        customerLookupMenu.addEventListener('click', event => {
          const match = event.target.closest('[data-customer-lookup-match]')
          if (match) {
            customerLookupState.matchModes[customerLookupState.fieldKey] =
              match.dataset.customerLookupMatch
            closeCustomerLookupMenu({restoreFocus: true})
            return
          }
          const action = event.target.closest('[data-customer-lookup-action]')?.dataset
            .customerLookupAction
          if (!action) return
          const fieldKey = customerLookupState.fieldKey
          const returnTrigger = customerLookupState.trigger
          closeCustomerLookupMenu()
          if (returnTrigger && document.contains(returnTrigger)) {
            returnTrigger.focus({preventScroll: true})
          }
          if (action === 'search') openCustomerLookupSearch(fieldKey)
          if (action === 'add') {
            if (fieldKey === 'operationUnit') openCustomerUnitDrawer()
            else openCustomerTypeAdd()
          }
        })

        customerLookupMenu.addEventListener('keydown', event => {
          const items = [...customerLookupMenu.querySelectorAll('button')]
          const index = items.indexOf(document.activeElement)
          if (event.key === 'Escape') {
            event.preventDefault()
            closeCustomerLookupMenu({restoreFocus: true})
            return
          }
          if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
          event.preventDefault()
          const nextIndex =
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? items.length - 1
                : event.key === 'ArrowDown'
                  ? (index + 1) % items.length
                  : (index - 1 + items.length) % items.length
          items[nextIndex].focus()
        })

        customerUnitLookupMenu.addEventListener('click', event => {
          const match = event.target.closest('[data-customer-lookup-match]')
          if (match) {
            customerLookupState.matchModes[customerLookupState.fieldKey] =
              match.dataset.customerLookupMatch
            closeCustomerUnitLookupMenu({restoreFocus: true})
            return
          }
          const action = event.target.closest('[data-customer-lookup-action]')?.dataset
            .customerLookupAction
          if (!action) return
          const fieldKey = customerLookupState.fieldKey
          const returnTrigger = customerLookupState.trigger
          closeCustomerUnitLookupMenu()
          if (returnTrigger && document.contains(returnTrigger)) {
            returnTrigger.focus({preventScroll: true})
          }
          if (action === 'search') openCustomerLookupSearch(fieldKey)
          if (action === 'add') {
            if (fieldKey === 'unitParent') openCustomerParentUnitDrawer()
            if (fieldKey === 'unitLocation') openCustomerLocationAdd()
          }
        })

        customerUnitLookupMenu.addEventListener('keydown', event => {
          const items = [...customerUnitLookupMenu.querySelectorAll('button')]
          const index = items.indexOf(document.activeElement)
          if (event.key === 'Escape') {
            event.preventDefault()
            closeCustomerUnitLookupMenu({restoreFocus: true})
            return
          }
          if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
          event.preventDefault()
          const nextIndex =
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? items.length - 1
                : event.key === 'ArrowDown'
                  ? (index + 1) % items.length
                  : (index - 1 + items.length) % items.length
          items[nextIndex].focus()
        })

        document.addEventListener('click', event => {
          if (
            !customerLookupMenu.hidden &&
            !event.target.closest('#customer-lookup-menu') &&
            !event.target.closest('[data-customer-lookup]')
          ) {
            closeCustomerLookupMenu()
          }
          if (
            !customerUnitLookupMenu.hidden &&
            !event.target.closest('#customer-unit-lookup-menu') &&
            !event.target.closest('[data-customer-unit-lookup]')
          ) {
            closeCustomerUnitLookupMenu()
          }
        })

        customerLookupSearchScrim.addEventListener('input', renderCustomerLookupSearchResults)
        customerLookupSearchScrim.addEventListener('change', event => {
          if (event.target.id === 'customer-lookup-search-mode') {
            customerLookupState.matchModes[customerLookupState.fieldKey] = event.target.value
          }
          renderCustomerLookupSearchResults()
        })
        customerLookupSearchScrim.addEventListener('click', event => {
          if (event.target.closest('#customer-lookup-clear-filters')) {
            document.getElementById('customer-lookup-search-query').value = ''
            document.getElementById('customer-lookup-search-mode').value = 'contains'
            customerLookupState.matchModes[customerLookupState.fieldKey] = 'contains'
            customerLookupSearchScrim
              .querySelectorAll('#customer-lookup-search-filters select')
              .forEach(select => {
                select.selectedIndex = 0
              })
            customerLookupState.selectedValue = ''
            renderCustomerLookupSearchResults()
            document.getElementById('customer-lookup-search-query').focus()
            return
          }
          const row = event.target.closest('[data-customer-lookup-value]')
          if (row) {
            customerLookupState.selectedValue = row.dataset.customerLookupValue
            customerLookupSearchScrim
              .querySelectorAll('[data-customer-lookup-value]')
              .forEach(item => item.setAttribute('aria-selected', String(item === row)))
            document.getElementById('customer-lookup-select').disabled = false
          }
          if (
            event.target === customerLookupSearchScrim ||
            event.target.closest('.customer-lookup-search-close')
          ) {
            closeCustomerLookupSearch()
          }
        })
        customerLookupSearchScrim.addEventListener('keydown', event => {
          const row = event.target.closest('[data-customer-lookup-value]')
          if (row && event.key === 'Enter') {
            event.preventDefault()
            row.click()
            return
          }
          if (row && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault()
            const rows = [
              ...customerLookupSearchScrim.querySelectorAll('[data-customer-lookup-value]'),
            ]
            const index = rows.indexOf(row)
            const next =
              event.key === 'ArrowDown'
                ? Math.min(rows.length - 1, index + 1)
                : Math.max(0, index - 1)
            rows[next].focus()
          }
        })
        customerLookupSearchScrim.addEventListener('dblclick', event => {
          const row = event.target.closest('[data-customer-lookup-value]')
          if (!row) return
          row.click()
          document.getElementById('customer-lookup-select').click()
        })
        document.getElementById('customer-lookup-select').addEventListener('click', () => {
          if (!customerLookupState.selectedValue) return
          const fieldKey = customerLookupState.fieldKey
          const value = customerLookupState.selectedValue
          closeCustomerLookupSearch()
          applyCustomerLookupValue(fieldKey, value)
        })

        customerTypeAddScrim.addEventListener('click', event => {
          if (
            event.target === customerTypeAddScrim ||
            event.target.closest('.customer-type-add-close')
          ) {
            closeCustomerTypeAdd()
          }
        })
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
        document.getElementById('geo-parent-picker-trigger').addEventListener('click', () => {
          openGeoParentPicker()
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
        geoHierarchyScrim.addEventListener('click', event => {
          if (
            event.target === geoHierarchyScrim ||
            event.target.closest('.geo-hierarchy-dialog-close')
          ) {
            closeGeoHierarchyDialog()
          }
        })
        kanbanBlockedScrim.addEventListener('click', event => {
          if (
            event.target === kanbanBlockedScrim ||
            event.target.closest('.kanban-blocked-close')
          ) {
            closeKanbanBlockedDialog()
          }
        })
        const geoHierarchyMediaQuery = window.matchMedia('(max-width: 1200px)')
        geoHierarchyMediaQuery.addEventListener('change', event => {
          if (!event.matches) closeGeoHierarchyDialog()
          syncGeoTreePanelToggle()
        })
        geoParentPickerScrim.addEventListener('click', event => {
          const view = event.target.closest('[data-geo-parent-picker-view]')
          if (view) {
            setGeoParentPickerView(view.dataset.geoParentPickerView)
            return
          }
          const toggle = event.target.closest('[data-geo-parent-toggle]')
          if (toggle) {
            const code = toggle.dataset.geoParentToggle
            if (geoParentPickerState.expanded.has(code)) geoParentPickerState.expanded.delete(code)
            else geoParentPickerState.expanded.add(code)
            renderGeoParentPickerTree()
            return
          }
          const pick = event.target.closest('[data-geo-parent-pick]')
          if (pick) {
            if (!pick.disabled) chooseGeoParent(pick.dataset.geoParentPick)
            return
          }
          if (event.target.closest('.geo-parent-picker-root')) {
            chooseGeoParent('')
            return
          }
          if (
            event.target === geoParentPickerScrim ||
            event.target.closest('.geo-parent-picker-close')
          ) {
            closeGeoParentPicker()
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
        document.getElementById('customer-type-add-save').addEventListener('click', () => {
          const nameInput = document.getElementById('customer-type-name')
          const name = nameInput.value.trim()
          const error = document.getElementById('customer-type-name-error')
          if (!name) {
            error.textContent = 'Name is required.'
            error.hidden = false
            nameInput.setAttribute('aria-invalid', 'true')
            nameInput.setAttribute('aria-describedby', error.id)
            nameInput.focus()
            return
          }
          error.hidden = true
          nameInput.removeAttribute('aria-invalid')
          nameInput.removeAttribute('aria-describedby')
          const inactive = document.getElementById('customer-type-deactivate').checked
          const existing = CUSTOMER_LOOKUP_RESULTS.customerType.find(
            item => item.value.toLocaleLowerCase() === name.toLocaleLowerCase()
          )
          if (!existing) {
            CUSTOMER_LOOKUP_RESULTS.customerType.push({
              value: name,
              status: inactive ? 'Inactive' : 'Active',
              order: Number(document.getElementById('customer-type-order').value) || 0,
              details:
                document.getElementById('customer-type-remarks').value.trim() || 'No remarks',
            })
          }
          closeCustomerTypeAdd()
          if (inactive) {
            toast({tone: 'ok', title: 'Customer type added as inactive'})
          } else {
            applyCustomerLookupValue('customerType', name)
            toast({tone: 'ok', title: 'Customer type added and selected'})
          }
        })

        customerUnitDrawerScrim.addEventListener('click', event => {
          if (
            event.target === customerUnitDrawerScrim ||
            event.target.closest('.customer-unit-drawer-close')
          ) {
            closeCustomerUnitDrawer()
            return
          }
          const openPageButton = event.target.closest('.customer-unit-open-page')
          if (openPageButton) {
            const pageMode = !customerUnitDrawerScrim.classList.contains('is-page')
            customerUnitDrawerScrim.classList.toggle('is-page', pageMode)
            openPageButton.setAttribute('aria-pressed', String(pageMode))
            openPageButton.setAttribute(
              'aria-label',
              pageMode ? 'Return to drawer' : 'Open in new tab'
            )
            openPageButton.querySelector('span').textContent = pageMode
              ? 'Return to drawer'
              : 'Open in new tab'
            openPageButton.title = pageMode ? 'Return to drawer' : 'Open in new tab'
            document.getElementById('customer-unit-drawer-description').textContent = pageMode
              ? 'Full page view for creating a new operation unit.'
              : 'Create the unit here, then use it on this customer.'
            return
          }
          const unitTab = event.target.closest('[data-customer-unit-tab]')
          if (unitTab) {
            setCustomerUnitTab(unitTab.dataset.customerUnitTab)
            return
          }
          const editorTab = event.target.closest('.customer-unit-editor-tabs button')
          if (editorTab) {
            editorTab.parentElement.querySelectorAll('button').forEach(button => {
              const active = button === editorTab
              button.setAttribute('aria-pressed', String(active))
              button.classList.toggle('pri', active)
              button.classList.toggle('out', !active)
            })
          }
          if (event.target.closest('.customer-unit-photo')) {
            toast({tone: 'ok', title: 'Unit photo selection is a prototype'})
          }
        })
        customerUnitDrawerScrim.addEventListener('keydown', event => {
          const tab = event.target.closest('[data-customer-unit-tab]')
          if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
          event.preventDefault()
          const tabs = [...customerUnitDrawerScrim.querySelectorAll('[data-customer-unit-tab]')]
          const index = tabs.indexOf(tab)
          const nextIndex =
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? tabs.length - 1
                : event.key === 'ArrowRight'
                  ? (index + 1) % tabs.length
                  : (index - 1 + tabs.length) % tabs.length
          setCustomerUnitTab(tabs[nextIndex].dataset.customerUnitTab, {focus: true})
        })
        document.getElementById('customer-unit-drawer-save').addEventListener('click', () => {
          const nameInput = document.getElementById('customer-unit-name')
          const name = nameInput.value.trim()
          const error = document.getElementById('customer-unit-name-error')
          if (!name) {
            error.textContent = 'Unit Name is required.'
            error.hidden = false
            nameInput.setAttribute('aria-invalid', 'true')
            nameInput.setAttribute('aria-describedby', error.id)
            nameInput.focus()
            return
          }
          error.hidden = true
          nameInput.removeAttribute('aria-invalid')
          nameInput.removeAttribute('aria-describedby')
          const nextCode =
            Math.max(...CUSTOMER_LOOKUP_RESULTS.operationUnit.map(item => Number(item.code) || 0)) +
            1
          const value = `${nextCode} - ${name}`
          CUSTOMER_LOOKUP_RESULTS.operationUnit.push({
            value,
            code: String(nextCode),
            country: document.getElementById('customer-unit-country').value,
            parent: document.getElementById('customer-unit-parent').value || 'No parent',
            status: 'Active',
          })
          closeCustomerUnitDrawer()
          applyCustomerLookupValue('operationUnit', value)
          toast({tone: 'ok', title: 'Operation unit added and selected'})
        })

        customerParentUnitDrawerScrim.addEventListener('click', event => {
          if (
            event.target === customerParentUnitDrawerScrim ||
            event.target.closest('.customer-parent-unit-drawer-close')
          ) {
            closeCustomerParentUnitDrawer()
          }
        })

        document
          .getElementById('customer-parent-unit-drawer-save')
          .addEventListener('click', () => {
            const nameInput = document.getElementById('customer-parent-unit-name')
            const name = nameInput.value.trim()
            const error = document.getElementById('customer-parent-unit-name-error')
            if (!name) {
              error.textContent = 'Unit Name is required.'
              error.hidden = false
              nameInput.setAttribute('aria-invalid', 'true')
              nameInput.setAttribute('aria-describedby', error.id)
              nameInput.focus()
              return
            }
            error.hidden = true
            nameInput.removeAttribute('aria-invalid')
            nameInput.removeAttribute('aria-describedby')
            const nextCode =
              Math.max(
                ...CUSTOMER_LOOKUP_RESULTS.operationUnit.map(item => Number(item.code) || 0)
              ) + 1
            const value = `${nextCode} - ${name}`
            CUSTOMER_LOOKUP_RESULTS.operationUnit.push({
              value,
              code: String(nextCode),
              country: document.getElementById('customer-parent-unit-country').value,
              parent: document.getElementById('customer-parent-unit-parent').value || 'No parent',
              status: 'Active',
            })
            const parentSelect = document.getElementById('customer-unit-parent')
            parentSelect.add(new Option(value, value))
            parentSelect.value = value
            closeCustomerParentUnitDrawer()
            toast({tone: 'ok', title: 'Parent unit added and selected'})
          })

        customerLocationAddScrim.addEventListener('click', event => {
          if (
            event.target === customerLocationAddScrim ||
            event.target.closest('.customer-location-add-close')
          ) {
            closeCustomerLocationAdd()
          }
        })

        document.getElementById('customer-location-add-save').addEventListener('click', () => {
          const required = ['code', 'name']
          let firstInvalid = null
          required.forEach(key => {
            const input = document.getElementById(`customer-location-${key}`)
            const error = document.getElementById(`customer-location-${key}-error`)
            const missing = !input.value.trim()
            error.textContent = missing
              ? `${key === 'code' ? 'Location Code' : 'Location Name'} is required.`
              : ''
            error.hidden = !missing
            input.toggleAttribute('aria-invalid', missing)
            if (missing) input.setAttribute('aria-describedby', error.id)
            else input.removeAttribute('aria-describedby')
            if (missing && !firstInvalid) firstInvalid = input
          })
          if (firstInvalid) {
            firstInvalid.focus()
            return
          }
          const code = document.getElementById('customer-location-code').value.trim()
          const name = document.getElementById('customer-location-name').value.trim()
          const location = {
            value: name,
            code,
            parent: document.getElementById('customer-location-parent').value || 'No parent',
            level: document.getElementById('customer-location-level').value || '1',
            type: document.getElementById('customer-location-type').value,
            status: 'Active',
          }
          const existing = CUSTOMER_LOOKUP_RESULTS.unitLocation.find(
            item => item.value.toLocaleLowerCase() === name.toLocaleLowerCase()
          )
          if (!existing) CUSTOMER_LOOKUP_RESULTS.unitLocation.push(location)
          const targetId = customerLookupState.targetSelectId
          closeCustomerLocationAdd()
          customerLookupState.source = 'unit'
          customerLookupState.targetSelectId = targetId
          applyCustomerLookupValue('unitLocation', name)
          toast({tone: 'ok', title: 'Geo. Location added and selected'})
        })

        document.addEventListener('keydown', event => {
          if (event.key !== 'Escape') return
          if (!customerLookupMenu.hidden) closeCustomerLookupMenu({restoreFocus: true})
          else if (!customerUnitLookupMenu.hidden) closeCustomerUnitLookupMenu({restoreFocus: true})
          else if (customerLocationAddScrim.classList.contains('open')) closeCustomerLocationAdd()
          else if (customerLookupSearchScrim.classList.contains('open')) closeCustomerLookupSearch()
          else if (customerParentUnitDrawerScrim.classList.contains('open'))
            closeCustomerParentUnitDrawer()
          else if (customerTypeAddScrim.classList.contains('open')) closeCustomerTypeAdd()
          else if (customerUnitDrawerScrim.classList.contains('open')) closeCustomerUnitDrawer()
          else if (geoFilterScrim.classList.contains('open')) closeDataFilterModal()
          else if (geoParentPickerScrim.classList.contains('open')) closeGeoParentPicker()
          else if (unitPickerScrim.classList.contains('open')) closeUnitPicker()
          else if (geoHierarchyScrim.classList.contains('open')) closeGeoHierarchyDialog()
          else if (kanbanBlockedScrim.classList.contains('open')) closeKanbanBlockedDialog()
          else if (dataExportScrim.classList.contains('open')) closeDataExport()
        })

        function refreshCustomerSectionStatus(sectionKey) {
          const meta = customerSectionMeta(sectionKey)
          customerRecordCanvas
            .querySelectorAll(`[data-customer-status="${sectionKey}"]`)
            .forEach(status => {
              status.textContent = meta.hasErrors ? meta.text : ''
              status.hidden = !meta.hasErrors
              status.classList.toggle('is-error', meta.className === 'is-error')
            })
          customerRecordCanvas
            .querySelectorAll(`[data-customer-section="${sectionKey}"]`)
            .forEach(section => {
              section.dataset.customerHasErrors = String(meta.hasErrors)
            })
        }

        function refreshCustomerFieldError(control, field) {
          if (!customerState.errors.has(field.key)) return
          const message = validateCustomerField(field)
          if (message) customerState.errors.set(field.key, message)
          else customerState.errors.delete(field.key)
          const errorId = `${control.id}-error`
          let error = document.getElementById(errorId)
          control.toggleAttribute('aria-invalid', Boolean(message))
          if (message) {
            control.setAttribute('aria-describedby', errorId)
            if (!error) {
              error = document.createElement('span')
              error.className = 'customer-field-error'
              error.id = errorId
              control.insertAdjacentElement('afterend', error)
            }
            error.textContent = message
          } else {
            control.removeAttribute('aria-describedby')
            error?.remove()
          }
        }

        const updateCustomerField = event => {
          const control = event.target.closest('[data-customer-field]')
          if (!control) return
          const fieldKey = control.dataset.customerField
          customerData[fieldKey] = control.type === 'checkbox' ? control.checked : control.value
          customerState.dirty = true
          const sectionKey = customerSectionKeyForField(fieldKey)
          const field = CUSTOMER_SECTIONS[sectionKey]?.fields.find(item => item.key === fieldKey)
          if (field) refreshCustomerFieldError(control, field)
          if (sectionKey) refreshCustomerSectionStatus(sectionKey)
        }
        customerRecordCanvas.addEventListener('input', updateCustomerField)
        customerRecordCanvas.addEventListener('change', updateCustomerField)
        customerRecordCanvas.addEventListener('click', event => {
          const scrollLink = event.target.closest('[data-customer-scroll-section]')
          if (scrollLink) {
            activateCustomerScrollSection(scrollLink.dataset.customerScrollSection)
            return
          }
          const focusedLink = event.target.closest('[data-customer-focus-section]')
          if (focusedLink) {
            customerState.activeSection = focusedLink.dataset.customerFocusSection
            renderCustomerRecord({
              focusSelector: `[data-customer-focus-section="${customerState.activeSection}"]`,
              preserveScroll: true,
            })
            return
          }
          const tab = event.target.closest('[data-customer-tab]')
          if (tab) {
            customerState.activeSection = tab.dataset.customerTab
            renderCustomerRecord({
              focusSelector: `[data-customer-tab="${customerState.activeSection}"]`,
              preserveScroll: true,
            })
            return
          }
          const collapse = event.target.closest('[data-customer-collapse]')
          if (collapse) {
            const key = collapse.dataset.customerCollapse
            const expanded = !customerState.expanded.has(key)
            if (expanded) customerState.expanded.add(key)
            else customerState.expanded.delete(key)
            collapse.setAttribute('aria-expanded', String(expanded))
            collapse.nextElementSibling.hidden = !expanded
            if (customerState.layout === 'scroll') {
              requestAnimationFrame(syncCustomerScrollActiveSection)
            }
            return
          }
          const action = event.target.closest('[data-customer-action]')?.dataset.customerAction
          if (action === 'photo') {
            toast({tone: 'ok', title: 'Photo selection is a prototype'})
          }
          if (action === 'add-sub-ledger') {
            toast({tone: 'ok', title: 'Adding a sub ledger is a prototype'})
          }
        })
        customerRecordCanvas.addEventListener('keydown', event => {
          if (
            customerScrollNavigationKey &&
            ['ArrowDown', 'ArrowUp', 'End', 'Home', 'PageDown', 'PageUp', ' '].includes(event.key)
          ) {
            stopCustomerScrollNavigation({interrupt: true})
          }
          const focusedLink = event.target.closest('[data-customer-focus-section]')
          const scrollLink = event.target.closest('[data-customer-scroll-section]')
          const tab = event.target.closest('[data-customer-tab]')
          const control = focusedLink || scrollLink || tab
          if (!control) return
          const controls = [
            ...control.parentElement.querySelectorAll(
              focusedLink
                ? '[data-customer-focus-section]'
                : scrollLink
                  ? '[data-customer-scroll-section]'
                  : '[data-customer-tab]'
            ),
          ]
          const vertical = focusedLink || scrollLink
          const previousKey = vertical ? 'ArrowUp' : 'ArrowLeft'
          const nextKey = vertical ? 'ArrowDown' : 'ArrowRight'
          if (!['Home', 'End', previousKey, nextKey].includes(event.key)) return
          event.preventDefault()
          const index = controls.indexOf(control)
          const nextIndex =
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? controls.length - 1
                : event.key === previousKey
                  ? (index - 1 + controls.length) % controls.length
                  : (index + 1) % controls.length
          controls[nextIndex].click()
        })
        customerRecordCanvas.addEventListener(
          'wheel',
          () => {
            if (customerScrollNavigationKey) stopCustomerScrollNavigation({interrupt: true})
          },
          {passive: true}
        )
        customerRecordCanvas.addEventListener(
          'touchstart',
          () => {
            if (customerScrollNavigationKey) stopCustomerScrollNavigation({interrupt: true})
          },
          {passive: true}
        )
        document.getElementById('customer-record-chrome').addEventListener('click', event => {
          if (event.target.closest('.customer-back')) {
            showContentView('customers-list')
            return
          }
          const actionButton = event.target.closest('[data-customer-action]')
          const action = actionButton?.dataset.customerAction
          if (action === 'new') openCustomerRecord(null, 'create')
          if (action === 'modify') {
            customerSavedSnapshot = structuredClone(customerData)
            setCustomerMode('edit')
          }
          if (action === 'save') saveCustomer()
          if (action === 'undo') undoCustomer()
          if (action === 'search') openCustomerSearch()
          if (action === 'print') openPrintSettings(`${customerData.customerNo || 'New'}`)
          if (
            [
              'add-from',
              'new-tab',
              'delete',
              'lock',
              'reports',
              'parameters',
              'help',
              'accounts-movement',
              'deactivate',
            ].includes(action)
          ) {
            toast({
              tone: 'ok',
              title: `${encodeHtml(actionButton.textContent.trim())} is a prototype`,
            })
          }
          if (action) closeAllMenus()
        })
        document.querySelector('.customer-record-footer').addEventListener('click', event => {
          const action = event.target.closest('[data-customer-footer-action]')
          if (!action) return
          toast({tone: 'ok', title: `${encodeHtml(action.textContent.trim())} is a prototype`})
        })
        document.getElementById('customer-mode').addEventListener('change', event => {
          const mode = event.target.value
          const previousMode = customerState.mode
          customerState.errors.clear()
          if (mode === 'create') {
            customerState.customerNo = ''
            customerData = createBlankCustomerData()
          }
          if (mode === 'edit') customerSavedSnapshot = structuredClone(customerData)
          if (mode === 'view') restoreCustomerView(previousMode)
          setCustomerMode(mode)
        })
        document.getElementById('customer-layout').addEventListener('change', event => {
          customerState.layout = event.target.value
          renderCustomerLayout({preserveScroll: true})
        })
        let customerScrollResizeFrame = 0
        window.addEventListener('resize', () => {
          if (
            customerState.layout !== 'scroll' ||
            document.querySelector('.customer-record-view')?.hidden !== false
          )
            return
          cancelAnimationFrame(customerScrollResizeFrame)
          customerScrollResizeFrame = requestAnimationFrame(() => {
            startCustomerScrollSpy()
            syncCustomerScrollActiveSection()
          })
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
        document.getElementById('geo-tree').addEventListener('click', event => {
          const node = event.target.closest('[data-geo-node]')
          if (node) selectGeoTreeNode(node)
        })
        document.getElementById('geo-field-parent').addEventListener('change', event => {
          const parentCode = event.target.value
          const parentRow = GEO_ROWS.find(item => item.code === parentCode)
          document.getElementById('geo-field-level').value = (parentRow?.level || 0) + 1
        })
        document.addEventListener('click', event => {
          if (!event.target.closest('#geo-hierarchy-panel')) return
          const view = event.target.closest('[data-geo-view]')
          if (view) {
            setGeoHierarchyView(view.dataset.geoView)
            return
          }
          if (event.target.closest('[data-geo-expand-all]')) {
            GEO_ROWS.filter(row => GEO_ROWS.some(child => child.parentCode === row.code)).forEach(
              row => geoState.expanded.add(row.code)
            )
            renderGeoTree()
            return
          }
          if (event.target.closest('[data-geo-collapse-all]')) {
            geoState.expanded.clear()
            renderGeoTree()
            return
          }
          const zoom = event.target.closest('[data-geo-flow-zoom]')
          if (zoom) {
            setGeoFlowScale(geoState.flowScale + (zoom.dataset.geoFlowZoom === 'in' ? 0.1 : -0.1))
            return
          }
          if (event.target.closest('[data-geo-flow-fit]')) {
            fitGeoFlow()
            return
          }
          const flowNode = event.target.closest('#geo-flow-pane [data-geo-node]')
          if (flowNode) selectGeoTreeNode(flowNode)
        })
        function enableFlowPan(viewportId) {
          const viewport = document.getElementById(viewportId)
          if (!viewport || viewport.dataset.panEnabled) return
          viewport.dataset.panEnabled = 'true'
          let panning = false
          let dragged = false
          let startX = 0
          let startY = 0
          let startScrollLeft = 0
          let startScrollTop = 0
          viewport.addEventListener('pointerdown', event => {
            if (event.button !== 0 || event.target.closest('button')) return
            panning = true
            dragged = false
            startX = event.clientX
            startY = event.clientY
            startScrollLeft = viewport.scrollLeft
            startScrollTop = viewport.scrollTop
            viewport.setPointerCapture(event.pointerId)
          })
          viewport.addEventListener('pointermove', event => {
            if (!panning) return
            const dx = event.clientX - startX
            const dy = event.clientY - startY
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
              dragged = true
              viewport.classList.add('is-panning')
            }
            viewport.scrollLeft = startScrollLeft - dx
            viewport.scrollTop = startScrollTop - dy
          })
          const endPan = event => {
            if (!panning) return
            panning = false
            viewport.classList.remove('is-panning')
            if (dragged) viewport.releasePointerCapture(event.pointerId)
          }
          viewport.addEventListener('pointerup', endPan)
          viewport.addEventListener('pointercancel', endPan)
          viewport.addEventListener(
            'click',
            event => {
              if (dragged) {
                event.stopPropagation()
                event.preventDefault()
              }
            },
            true
          )
        }
        enableFlowPan('geo-flow-viewport')
        enableFlowPan('geo-parent-picker-flow-viewport')
        enableFlowPan('unit-picker-flow-viewport')
        document.getElementById('geo-tree-search').addEventListener('input', event => {
          geoState.treeQuery = event.target.value
          renderGeoTree()
        })
        document.querySelector('[data-geo-tree-collapse]').addEventListener('click', event => {
          toggleGeoTreePanel(event.currentTarget)
        })
        document.querySelector('.geo-tree-refresh').addEventListener('click', () => {
          renderGeoRecord()
          toast({tone: 'ok', title: 'Geographical Structure refreshed'})
        })
        document.getElementById('geo-record-chrome').addEventListener('click', event => {
          if (event.target.closest('.geo-back-list')) {
            if (geoHierarchyScrim.classList.contains('open')) closeGeoHierarchyDialog()
            showContentView('geo-list')
            renderGeoList()
            return
          }
          const action = event.target.closest('[data-geo-record-action]')?.dataset.geoRecordAction
          if (!action) return
          if (action === 'modify') {
            geoState.mode = 'edit'
            renderGeoRecord()
          } else if (action === 'new') openNewDataListRecord('geo')
          else if (action === 'save') {
            if (geoState.mode === 'edit') saveGeoRecord()
            geoState.mode = 'view'
            renderGeoRecord()
            toast({tone: 'ok', title: 'Location saved'})
          } else if (action === 'undo') {
            geoState.mode = 'view'
            renderGeoRecord()
            toast({tone: 'ok', title: 'Changes discarded'})
          } else if (action === 'print') openPrintSettings(`Location ${geoState.code}`)
          else if (action === 'search') openAdvancedSearch('geo')
          else
            toast({
              tone: 'ok',
              title: `${action[0].toUpperCase() + action.slice(1)} is ready for integration`,
            })
        })
        renderGeoRecord()

        /* ================= Sales Invoice Record (Guided Tabs) =================
   ported from sales-invoice-record.html:2311-2412 */

        /* ---- payment method: multiple simultaneous rows, each with its own
           method-specific extra fields ---- */
        const PAYMENT_METHODS = ['Cash', 'Bank', 'Credit Card', 'Cheque', 'Transfer']
        const PAYMENT_EXTRA_FIELDS = {
          Cash: [{label: 'Cash Code', value: '2001 - Main Cash'}],
          Bank: [
            {label: 'Bank Name', value: ''},
            {label: 'Account No.', value: ''},
          ],
          'Credit Card': [
            {label: 'Card Type', value: ''},
            {label: 'Approval No.', value: ''},
          ],
          Cheque: [
            {label: 'Cheque No.', value: ''},
            {label: 'Bank', value: ''},
          ],
          Transfer: [{label: 'Transfer Reference', value: ''}],
        }
        let paymentRowCount = 0

        /* containerId lets Task 6's Concepts B and C reuse this for their own
           payment-row containers, since only one concept's canvas is visible
           at a time but all three will exist in the DOM simultaneously */
        function addPaymentMethodRow(containerId = 'payment-rows', method = 'Cash', amount = '') {
          const id = paymentRowCount++
          const row = document.createElement('div')
          row.className = 'rec-card'
          row.dataset.paymentRow = id
          row.innerHTML =
            '<div class="rec-payment-row">' +
            `<div class="rec-field"><label>Payment Method <span class="req">*</span></label>` +
            `<select data-field data-payment-method>${PAYMENT_METHODS.map(m => `<option${m === method ? ' selected' : ''}>${m}</option>`).join('')}</select></div>` +
            `<div class="rec-field"><label>The Amount <span class="req">*</span></label><input data-field value="${amount}"></div>` +
            `<div class="rec-payment-extra"></div>` +
            `<button type="button" class="ibtn danger rec-remove-payment" aria-label="Remove payment method"><svg width="14" height="14" aria-hidden="true"><use href="#i-x"/></svg></button>` +
            '</div>'
          document.getElementById(containerId).appendChild(row)
          renderPaymentExtraFields(row, method)
          connectRecordLabels(row)
          applyRecordValueDirections(row)
          row
            .querySelector('[data-payment-method]')
            .addEventListener('change', e => renderPaymentExtraFields(row, e.target.value))
          row.querySelector('.rec-remove-payment').addEventListener('click', () => row.remove())
          /* a freshly-added row's [data-field] inputs start enabled by default —
   sweep the current editable/locked state onto them immediately so they
   don't escape a locked record */
          applyState()
        }

        function renderPaymentExtraFields(row, method) {
          const extra = row.querySelector('.rec-payment-extra')
          extra.innerHTML = (PAYMENT_EXTRA_FIELDS[method] || [])
            .map(
              f =>
                `<div class="rec-field"><label>${f.label}</label><input data-field value="${f.value}"></div>`
            )
            .join('')
          connectRecordLabels(extra)
          applyRecordValueDirections(extra)
        }

        /* ---- items grid: add/remove rows, recalc total qty ---- */
        let itemRowCount = 0
        /* bodyId/totalId let Concepts B and C (Task 6) reuse this for their own items
           grids, which have their own tbody/total elements since only one concept's
           canvas is visible at a time but all three will exist in the DOM simultaneously */
        function addItemRow(bodyId, totalId) {
          const id = itemRowCount++
          const tr = document.createElement('tr')
          tr.dataset.itemRow = id
          tr.innerHTML =
            '<td><input data-field placeholder="Item"></td>' +
            '<td><input data-field placeholder="UoM"></td>' +
            '<td><input data-field placeholder="Expiry"></td>' +
            '<td><input data-field placeholder="Batch"></td>' +
            '<td><input data-field type="number" value="1" class="items-qty"></td>' +
            '<td><input data-field type="number" value="0"></td>' +
            '<td><input data-field disabled placeholder="—"></td>' +
            '<td><input data-field type="number" value="0"></td>' +
            '<td><input data-field type="number" value="0"></td>' +
            '<td><input data-field disabled value="0"></td>' +
            '<td><input data-field disabled value="0"></td>' +
            '<td><input data-field disabled value="0"></td>' +
            '<td><button type="button" class="ibtn danger rec-remove-item" aria-label="Remove item"><svg width="14" height="14" aria-hidden="true"><use href="#i-x"/></svg></button></td>'
          const itemFieldNames = [
            'Item',
            'Unit of measure',
            'Expiry date',
            'Batch',
            'Quantity',
            'Unit price',
            'Bonus quantity',
            'Discount',
            'Tax',
            'Gross amount',
            'Discount amount',
            'Net amount',
          ]
          tr.querySelectorAll('input').forEach((input, index) => {
            input.setAttribute('aria-label', itemFieldNames[index])
          })
          applyRecordValueDirections(tr)
          document.getElementById(bodyId).appendChild(tr)
          tr.querySelector('.rec-remove-item').addEventListener('click', () => {
            tr.remove()
            recalcTotalQty(bodyId, totalId)
          })
          tr.querySelector('.items-qty').addEventListener('input', () =>
            recalcTotalQty(bodyId, totalId)
          )
          recalcTotalQty(bodyId, totalId)
          /* a freshly-added row's [data-field] inputs start enabled by default —
   sweep the current editable/locked state onto them immediately so they
   don't escape a locked record */
          applyState()
        }
        function recalcTotalQty(bodyId, totalId) {
          const qtys = [...document.querySelectorAll(`#${bodyId} .items-qty`)].map(
            i => Number(i.value) || 0
          )
          document.getElementById(totalId).textContent = qtys.reduce((a, b) => a + b, 0)
        }

        /* Spreadsheet-style line entry: Enter moves to the same column on the next
           row, adding one if this is the last row, so a clerk can key in several
           lines without reaching for the mouse. Arrow keys move between cells the
           same way a spreadsheet does; they only take over navigation on inputs
           where the caret is already at that edge, so normal text editing (and
           number-input spin arrows) still works. */
        document.addEventListener('keydown', event => {
          const cell = event.target.closest('.inv-grid td [data-field]')
          if (!cell) return
          const row = cell.closest('tr[data-item-row]')
          if (!row) return
          const body = row.parentElement
          const cellIndex = [...row.children].indexOf(cell.closest('td'))
          /* type="number" already uses Up/Down to step its value, so row-to-row
             arrow navigation only applies to plain text cells (Item, UoM, Expiry,
             Batch) — Enter still moves every field type to the next row. */
          const isPlainText = cell.tagName === 'INPUT' && cell.type === 'text'
          const atStart = isPlainText && cell.selectionStart === 0
          const atEnd = isPlainText && cell.selectionEnd === cell.value.length
          const moveTo = targetRow => {
            const targetCell = targetRow?.children[cellIndex]?.querySelector('[data-field]')
            if (!targetCell || targetCell.disabled) return false
            event.preventDefault()
            targetCell.focus()
            if (targetCell.tagName === 'INPUT') targetCell.select()
            return true
          }
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            const next = row.nextElementSibling
            if (next) moveTo(next)
            else if (body.id === 'items-body') {
              addItemRow('items-body', 'items-total-qty')
              moveTo(body.lastElementChild)
            }
            return
          }
          if (event.key === 'ArrowDown' && atEnd) {
            if (moveTo(row.nextElementSibling)) return
          }
          if (event.key === 'ArrowUp' && atStart) {
            if (moveTo(row.previousElementSibling)) return
          }
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
            if (body.id !== 'items-body') return
            event.preventDefault()
            const values = [...row.querySelectorAll('[data-field]')].map(field => field.value)
            addItemRow('items-body', 'items-total-qty')
            const newRow = body.lastElementChild
            newRow.querySelectorAll('[data-field]').forEach((field, index) => {
              if (!field.disabled) field.value = values[index] ?? field.value
            })
            recalcTotalQty('items-body', 'items-total-qty')
            moveTo(newRow)
          }
        })

        /* Multi-cell paste: clipboard text with tabs (columns) and newlines (rows) —
           the shape a user copies out of a spreadsheet — fills forward from the
           focused cell, adding rows if the pasted block runs past the last one. */
        document.addEventListener('paste', event => {
          const cell = event.target.closest('.inv-grid td [data-field]')
          if (!cell) return
          const text = event.clipboardData?.getData('text/plain') ?? ''
          if (!text.includes('\t') && !text.includes('\n')) return
          const row = cell.closest('tr[data-item-row]')
          const body = row?.parentElement
          if (!row || body?.id !== 'items-body') return
          event.preventDefault()
          const cellIndex = [...row.children].indexOf(cell.closest('td'))
          const grid = text
            .replace(/\r/g, '')
            .split('\n')
            .filter((line, index, lines) => line !== '' || index < lines.length - 1)
            .map(line => line.split('\t'))
          let targetRow = row
          grid.forEach((lineValues, rowOffset) => {
            if (rowOffset > 0) {
              if (!targetRow.nextElementSibling) addItemRow('items-body', 'items-total-qty')
              targetRow = targetRow.nextElementSibling
            }
            lineValues.forEach((value, columnOffset) => {
              const field =
                targetRow.children[cellIndex + columnOffset]?.querySelector('[data-field]')
              if (field && !field.disabled) field.value = value
            })
          })
          recalcTotalQty('items-body', 'items-total-qty')
        })

        /* ---- invoice-level discounts and charges ---- */
        let invoiceAdjustmentCount = 0
        const formatInvoiceMoney = value =>
          Number(value || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })

        function recalcInvoiceSummary() {
          const subtotal = 200
          const itemsDiscount = 0
          const discountValue = Math.max(
            0,
            Number(document.getElementById('invoice-discount-value')?.value) || 0
          )
          const discountCalculation =
            document.getElementById('invoice-discount-calculation')?.value || 'percent'
          const invoiceDiscount =
            discountCalculation === 'percent'
              ? ((subtotal - itemsDiscount) * Math.min(discountValue, 100)) / 100
              : Math.min(discountValue, subtotal - itemsDiscount)
          let charges = 0
          document
            .querySelectorAll('#invoice-adjustment-list [data-adjustment-kind]')
            .forEach(row => {
              const amount = Math.max(
                0,
                Number(row.querySelector('[data-adjustment-value]').value) || 0
              )
              charges += amount
            })
          const tax = 0
          const net = Math.max(0, subtotal - itemsDiscount - invoiceDiscount + charges + tax)
          document.getElementById('invoice-summary-subtotal').textContent =
            formatInvoiceMoney(subtotal)
          document.getElementById('invoice-summary-items-discount').textContent =
            `− ${formatInvoiceMoney(itemsDiscount)}`
          document.getElementById('invoice-summary-discount').textContent =
            `− ${formatInvoiceMoney(invoiceDiscount)}`
          document.getElementById('invoice-summary-charges').textContent =
            `+ ${formatInvoiceMoney(charges)}`
          document.getElementById('invoice-summary-tax').textContent =
            `+ ${formatInvoiceMoney(tax)}`
          document.getElementById('invoice-summary-net').textContent =
            `${formatInvoiceMoney(net)} EGP`
        }

        function syncInvoiceAdjustmentEmptyState() {
          const list = document.getElementById('invoice-adjustment-list')
          const hasRows = Boolean(list.querySelector('[data-adjustment-kind]'))
          let empty = list.querySelector('.rec-adjustment-empty')
          if (hasRows) {
            empty?.remove()
            return
          }
          if (!empty) {
            empty = document.createElement('div')
            empty.className = 'rec-adjustment-empty'
            empty.textContent = 'No invoice charges.'
            list.appendChild(empty)
          }
        }

        function addInvoiceAdjustment() {
          const list = document.getElementById('invoice-adjustment-list')
          const row = document.createElement('div')
          const id = invoiceAdjustmentCount++
          row.className = 'rec-adjustment-row'
          row.dataset.adjustmentKind = 'charge'
          row.dataset.adjustmentId = String(id)
          row.innerHTML = `<div class="rec-field"><label for="invoice-adjustment-name-${id}">Charge</label><select id="invoice-adjustment-name-${id}" data-field><option>Freight</option><option>Delivery</option><option>Insurance</option><option>Other</option></select></div><div class="rec-field"><label for="invoice-adjustment-calculation-${id}">Tax treatment</label><select id="invoice-adjustment-calculation-${id}" data-field><option>Before tax</option><option>After tax</option></select></div><div class="rec-field"><label for="invoice-adjustment-value-${id}">Amount</label><input id="invoice-adjustment-value-${id}" data-field data-adjustment-value type="number" min="0" step="0.01" value="0" inputmode="decimal"></div>`
          const remove = document.createElement('button')
          remove.type = 'button'
          remove.className = 'ibtn danger'
          remove.setAttribute('aria-label', 'Remove charge')
          remove.innerHTML =
            '<svg width="14" height="14" aria-hidden="true"><use href="#i-x" /></svg>'
          row.appendChild(remove)
          row.addEventListener('input', recalcInvoiceSummary)
          row.addEventListener('change', event => {
            if (event.target.matches('[data-adjustment-calculation]')) {
              const value = row.querySelector('[data-adjustment-value]')
              value.max = event.target.value === 'percent' ? '100' : ''
            }
            recalcInvoiceSummary()
          })
          remove.addEventListener('click', () => {
            row.remove()
            syncInvoiceAdjustmentEmptyState()
            recalcInvoiceSummary()
          })
          list.appendChild(row)
          applyRecordValueDirections(row)
          syncInvoiceAdjustmentEmptyState()
          applyState()
          row.querySelector('select, input')?.focus()
        }
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

        function selectRecordTab(tab) {
          document.querySelectorAll('#canvas-root .rec-tab').forEach(button => {
            const selected = button === tab
            button.classList.toggle('on', selected)
            button.setAttribute('aria-selected', String(selected))
            button.tabIndex = selected ? 0 : -1
          })
          document.querySelectorAll('#canvas-root .rec-tabpanel').forEach(panel => {
            panel.hidden = panel.dataset.panel !== tab.dataset.tab
          })
        }

        function handleRecordTabKeydown(event) {
          const tabs = [...document.querySelectorAll('#canvas-root .rec-tab')]
          const current = tabs.indexOf(event.currentTarget)
          const rtl = document.documentElement.dir === 'rtl'
          let next = current
          if (event.key === 'ArrowRight') next += rtl ? -1 : 1
          else if (event.key === 'ArrowLeft') next += rtl ? 1 : -1
          else if (event.key === 'Home') next = 0
          else if (event.key === 'End') next = tabs.length - 1
          else return
          event.preventDefault()
          const tab = tabs[(next + tabs.length) % tabs.length]
          selectRecordTab(tab)
          tab.focus()
        }

        let recordAInitialized = false
        function renderRecordA() {
          if (recordAInitialized) return
          recordAInitialized = true
          document.querySelectorAll('#canvas-root .rec-tab').forEach(btn => {
            btn.addEventListener('click', () => selectRecordTab(btn))
            btn.addEventListener('keydown', handleRecordTabKeydown)
          })
          selectRecordTab(document.querySelector('#canvas-root .rec-tab[aria-selected="true"]'))
          connectRecordLabels(document.getElementById('canvas-root'))
          applyRecordValueDirections(document.getElementById('canvas-root'))
          document.querySelectorAll('#canvas-root .rec-card-hd').forEach(hd => {
            hd.addEventListener('click', () => {
              const open = hd.getAttribute('aria-expanded') === 'true'
              hd.setAttribute('aria-expanded', String(!open))
              hd.nextElementSibling.hidden = open
            })
          })

          document
            .getElementById('add-payment-link')
            .addEventListener('click', () => addPaymentMethodRow('payment-rows'))
          document.querySelectorAll('[data-invoice-adjustment]').forEach(button => {
            button.addEventListener('click', addInvoiceAdjustment)
          })
          const discountCalculation = document.getElementById('invoice-discount-calculation')
          const discountValue = document.getElementById('invoice-discount-value')
          const discountUnit = document.getElementById('invoice-discount-unit')
          discountCalculation.addEventListener('change', () => {
            const percent = discountCalculation.value === 'percent'
            discountValue.max = percent ? '100' : '200'
            discountUnit.textContent = percent ? '%' : 'EGP'
            recalcInvoiceSummary()
          })
          discountValue.addEventListener('input', recalcInvoiceSummary)
          addPaymentMethodRow('payment-rows', 'Cash', '200')
          addItemRow('items-body', 'items-total-qty')
          recalcInvoiceSummary()
        }

        renderRecordA()
        /* the payment row and item row just created above are [data-field]
   elements that didn't exist yet for applyMode()'s initial applyState() call
   above — re-run it so their disabled state matches the current status */
        applyState()
        contentViewDeferralReady = true
        showContentView(currentContentViewName)

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
            const actions = renderDataListSelectionActions(context, listState)
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
}
