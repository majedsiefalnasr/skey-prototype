import {NAV_APP_META, NAV_FAVORITES, NAV_RECENTS, NAV_ICONS} from '../../prototype/fixtures/navigation.js'
export function createHome({buildRailAndPanel, findNavGroup, setNavCurrent, t, getLocale, syncCustomerPrototypeControls, getCurrentView, queueSkeletonForCurrentView, closeEmailView, visibleGroups, getCurrentApp, closeAllMenus}) {
const pageAbort = new AbortController()
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
          tile.className = 'lp-tile group grid min-h-[116px] grid-cols-[40px_minmax(0,1fr)_14px] content-start items-start gap-3 rounded-xl border border-line bg-surface p-4 text-start transition-[border-color,background-color] duration-[120ms] ease-out hover:border-[var(--accent-line)] focus-visible:border-accent'
          tile.dataset.tone = meta.tone
          tile.dataset.i18nOriginal = label
          tile.innerHTML =
            `<span class="lp-tile-ic flex size-10 items-center justify-center rounded-[10px] bg-[color-mix(in_srgb,var(--lp-tone,var(--accent))_11%,var(--surface))] text-[var(--lp-tone,var(--accent))]"><svg width="20" height="20" aria-hidden="true"><use href="#${icon}"/></svg></span>` +
            '<span class="lp-tile-copy min-w-0"><span class="lp-tile-lbl line-clamp-2 overflow-hidden text-[13.5px] font-bold leading-[1.35] text-ink"></span><span class="lp-tile-desc mt-1.5 line-clamp-2 overflow-hidden text-xs leading-[1.4] text-muted"></span><span class="lp-current mt-2 inline-flex text-[11px] font-bold text-accent" hidden></span></span>' +
            '<svg class="lp-tile-go mt-[3px] text-faint opacity-0 transition-opacity duration-100 group-hover:text-accent group-hover:opacity-100 group-focus-visible:text-accent group-focus-visible:opacity-100" width="14" height="14" aria-hidden="true"><use href="#i-next"/></svg>'
          const tileLabel = tile.querySelector('.lp-tile-lbl')
          const tileDescription = tile.querySelector('.lp-tile-desc')
          tileLabel.dataset.i18nOriginal = label
          tileLabel.textContent = t(label)
          tileDescription.dataset.i18nOriginal = meta.description
          tileDescription.textContent = t(meta.description)
          if (current) {
            tile.classList.add('is-current', 'border-[var(--accent-line)]', 'bg-[var(--accent-soft)]')
            tile.setAttribute('aria-current', 'page')
            const currentLabel = tile.querySelector('.lp-current')
            currentLabel.hidden = false
            currentLabel.textContent = t('Current app')
          }
          tile.addEventListener('click', onClick, {signal: pageAbort.signal})
          return tile
        }
        function launchpadTag(label, icon, cls, onClick) {
          const tag = document.createElement('button')
          tag.type = 'button'
          tag.className = 'lp-tag inline-flex items-center gap-[7px] rounded-full border border-line px-[13px] py-1.5 text-[12.5px] font-medium text-ink ' + cls
          tag.innerHTML = `<svg width="13" height="13" aria-hidden="true"><use href="#${icon}"/></svg><span></span>`
          tag.querySelector('span').textContent = t(label)
          tag.addEventListener('click', onClick, {signal: pageAbort.signal})
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
            getLocale() !== 'en' ||
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
          syncCustomerPrototypeControls(getCurrentView())
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
          lp.className = 'lp-view absolute inset-0 z-50 grid content-start overflow-auto bg-[var(--bg)]'
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
          orbs.className = 'lp-orbs pointer-events-none relative z-0 col-start-1 row-start-1 overflow-hidden'
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
          content.className = 'lp-content relative isolate z-[1] col-start-1 row-start-1 flex min-h-screen min-w-0 flex-col overflow-hidden'
          lp.appendChild(content)
          const skipLink = frame.ownerDocument.querySelector('.skip-link')
          if (skipLink) lp.prepend(skipLink)
          syncCustomerPrototypeControls('launchpad')

          const actionsLeft = document.createElement('div')
          actionsLeft.className = 'lp-actions-left flex min-w-0 items-center gap-[7px]'
          actionsLeft.append(frame.querySelector('.gtop .left .app'))
          if (mode === 'switcher') {
            const close = document.createElement('button')
            close.type = 'button'
            close.className = 'ibtn lp-close'
            close.setAttribute('aria-label', t('Back to current screen'))
            close.innerHTML =
              '<svg width="16" height="16" aria-hidden="true"><use href="#i-x" /></svg>' +
              `<span class="tip">${t('Back to current screen')}</span>`
            close.addEventListener('click', () => hideLaunchpad(frame, {restoreFocus: true}), {signal: pageAbort.signal})
            actionsLeft.prepend(close)
          }
          const actions = document.createElement('div')
          actions.className = 'lp-actions flex min-w-0 items-center gap-[7px]'
          actions.append(frame.querySelector('.gtop .right'))
          const chrome = document.createElement('div')
          chrome.className = 'lp-chrome sticky top-0 z-[2] flex min-h-14 items-center justify-between gap-3 px-4 py-2.5'
          chrome.append(actionsLeft, actions)
          content.appendChild(chrome)
          setLaunchpadShellInert(frame, true)

          const hero = document.createElement('div')
          hero.className = 'lp-hero mx-auto mt-11 max-w-[680px] px-6 pt-11 text-center'
          hero.innerHTML =
            '<img class="lp-logo" src="data:image/png;base64,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" alt="Skey ERP" width="240" height="80">'
          const heading = document.createElement('h1')
          heading.id = 'launchpad-title'
          heading.className = 'lp-title mt-6 text-[clamp(25px,3vw,34px)] font-bold leading-[1.15] tracking-[-0.025em] text-ink'
          const subtitle = document.createElement('p')
          subtitle.className = 'lp-subtitle mx-auto mt-2.5 max-w-[520px] text-sm leading-6 text-muted'

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
          body.className = 'lp-body mx-auto flex w-[min(1040px,100%)] flex-col gap-6 px-8 pb-12 pt-6'

          /* the same "Search or run an action" panel every other page opens — .s-open
     is the topbar's own wiring; the launchpad just gives it a bar of its own */
          const search = document.createElement('button')
          search.type = 'button'
          search.className = 'lp-search s-open mx-auto mb-11 flex w-[min(620px,100%)] items-center gap-[11px] rounded-[14px] border border-[var(--line-2)] bg-surface py-3 pe-2.5 ps-[18px] text-start text-faint shadow-[var(--shadow-1)] transition-shadow duration-150 hover:shadow-[var(--shadow-2)]'
          search.innerHTML =
            `<svg width="15" height="15" aria-hidden="true"><use href="#i-search"/></svg>` +
            `<span class="lp-search-label search-typing-label" data-search-static="Search apps and screens">${t('Search apps and screens')}</span>` +
            '<span class="lp-keyboard-hint shrink-0 rounded-md border border-line bg-[var(--line-2)] px-2 py-[3px] font-mono text-xs text-muted">⌘K</span>'
          search.setAttribute('aria-label', t('Search apps and screens'))

          const sections = document.createElement('div')
          sections.className = 'lp-sections flex flex-col gap-[26px]'

          /* Starred/Recent are quick-access shortcuts, not primary content — one light
     cluster with inline micro-labels, not two more copies of the same loud
     section-heading treatment the Apps grid below needs to stand apart from */
          const quick = document.createElement('div')
          quick.className = 'lp-quick grid grid-cols-2 gap-4'
          const quickRow = (label, icon, cls, items, rowIndex) => {
            const row = document.createElement('section')
            row.className = 'lp-quick-row'
            row.style.setProperty('--lp-i', rowIndex)
            const labelId = `launchpad-${label.toLowerCase()}-title`
            row.setAttribute('aria-labelledby', labelId)
            const lbl = document.createElement('h2')
            lbl.id = labelId
            lbl.className = 'lp-quick-lbl mb-2.5 text-[12.5px] font-bold text-muted'
            lbl.textContent = t(label)
            const tags = document.createElement('div')
            tags.className = 'lp-tags flex flex-1 flex-wrap gap-2'
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
            }, {signal: pageAbort.signal})
            row.append(lbl, tags, viewAll)
            return row
          }
          quick.append(
            quickRow('Starred', 'i-spark', 'starred', NAV_FAVORITES, 0),
            quickRow('Recent', 'i-clock', 'recent', NAV_RECENTS.slice(0, 5), 1)
          )

          const appsSec = document.createElement('section')
          appsSec.setAttribute('aria-labelledby', 'launchpad-apps-title')
          appsSec.innerHTML = `<div class="lp-section-hd mb-3.5 border-t border-line pt-5"><h2 id="launchpad-apps-title" class="lp-section-title text-[13px] font-bold text-muted">${t('Apps')}</h2></div>`
          const appsGrid = document.createElement('div')
          appsGrid.className = 'lp-grid grid grid-cols-4 gap-3'
          visibleGroups().forEach((group, index) => {
            const tile = launchpadTile(
              group[0],
              NAV_ICONS[group[0]] || 'i-doc',
              () => {
                if (!openLaunchpadListDestination(side, group[0]))
                  side.querySelector('.nc2').activateByLabel(group[0])
              },
              {current: mode === 'switcher' && group[0] === getCurrentApp()}
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
          listEl.classList.add('flex', 'w-[300px]', 'flex-col', 'p-0', '[max-height:70vh]')
          const filterWrap = document.createElement('div')
          filterWrap.className =
            'app-switcher-filter sticky top-1 z-[1] m-1 flex items-center gap-[7px] rounded-[7px] border border-line bg-[inherit] px-2 py-1.5 text-faint focus-within:border-[var(--accent-line)] focus-within:shadow-[0_0_0_3px_var(--accent-soft)]'
          filterWrap.innerHTML =
            '<svg class="shrink-0" width="13" height="13" aria-hidden="true"><use href="#i-search"/></svg>' +
            '<input class="min-w-0 flex-1 border-none bg-transparent font-[inherit] text-ink outline-none placeholder:text-faint" type="search" placeholder="Filter apps…" aria-label="Filter apps" autocomplete="off">'
          const rows = document.createElement('div')
          rows.className = 'app-switcher-rows overflow-auto px-1 pb-1'
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
            row.innerHTML = `<span class="sq relative flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--hover-overlay)] text-muted"><svg width="16" height="16" aria-hidden="true"><use href="#${NAV_ICONS[label] || 'i-doc'}"/></svg></span><span class="min-w-0 flex-1 truncate"></span>`
            row.querySelector('span:last-child').textContent = label
            row.addEventListener('click', () => {
              side.querySelector('.nc2').activateByLabel(label)
              rows
                .querySelectorAll('.app-switcher-row')
                .forEach(r => r.classList.toggle('active', r.dataset.label === label))
              closeAllMenus()
            }, {signal: pageAbort.signal})
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
          }, {signal: pageAbort.signal})
          input.addEventListener('click', e => e.stopPropagation(), {signal: pageAbort.signal})
        }

        /* ---- global collapse: pure CSS + a class toggle, no rebuild. The nav
   already carries both its expanded markup and its collapsed rail/panel
   in the same DOM; ".side.collapsed" just switches which half is visible. ---- */

return {id: 'launchpad', get roots() { const root = document.querySelector('.lp-view'); return root ? [root] : [] }, activate() { showLaunchpad(document.querySelector('.fbody'), {mode: 'home'}) }, deactivate() { hideLaunchpad(document.querySelector('.frame')) }, dispose() { pageAbort.abort(); stopSearchTyping(document); }, buildNavLaunchpad, restoreLaunchpadActions, stopSearchTyping, startSearchTyping, hideLaunchpad, getLaunchpadUserName, showLaunchpad, setupAppSwitcher}
}
