
      ;(() => {
        const bar = document.querySelector('.demo-bar')
        if (!bar) return

        /* ---------- 1. move the harness into a floating panel ---------- */
        const kit = document.createElement('div')
        kit.id = 'kit'
        kit.setAttribute('role', 'region')
        kit.setAttribute('aria-label', 'Prototype controls')
        kit.innerHTML =
          '<div class="kit-h"><span class="grip">\u22ee\u22ee</span><b>Prototype controls</b>' +
          '<button type="button" id="kit-info" title="About this prototype" aria-label="About this prototype">\u24d8 About</button>' +
          '<button type="button" id="kit-min" title="Collapse" aria-label="Collapse">\u2013</button>' +
          '<button type="button" id="kit-hide" title="Hide" aria-label="Hide">\u00d7</button></div>' +
          '<div class="kit-nav"><span style="flex:1 1 100%">Skey ERP \u00b7 App Shell</span><a href="../index.html" title="Project overview">Index</a></div>' +
          '<div class="kit-b"></div>'
        const body = kit.querySelector('.kit-b')
        ;[...bar.children].forEach(child => {
          if (child.classList.contains('sep')) {
            body.appendChild(document.createElement('hr'))
            return
          }
          body.appendChild(child)
        })
        bar.remove()
        document.body.appendChild(kit)

        const pill = document.createElement('button')
        pill.id = 'kit-pill'
        pill.className = 'kit-pill'
        pill.type = 'button'
        pill.innerHTML =
          '<svg width="16" height="16" aria-hidden="true"><use href="#i-sliders"/></svg><span class="kit-pill-label">Prototype controls</span>'
        document.body.appendChild(pill)
        /* ---------- shared prototype state, so switching versions keeps your setup ---------- */
        const STATE_KEY = 'skey-proto-state'
        const UI_KEY = 'skey-proto-ui'
        const readJSON = (k, fallback) => {
          try {
            return Object.assign({}, fallback, JSON.parse(sessionStorage.getItem(k) || '{}'))
          } catch {
            return Object.assign({}, fallback)
          }
        }
        const writeJSON = (k, v) => {
          try {
            sessionStorage.setItem(k, JSON.stringify(v))
          } catch {}
        }

        /* every harness control, addressed by id, restored and persisted by value */
        const CONTROL_IDS = [
          'theme',
          'content-layout',
          'mode',
          'st',
          'pay',
          'dirty',
          'failsim',
          'simulate-loading',
          'emptyflow',
          'rtl',
          'density',
          'input-style',
          'section-style',
          'filter-mode',
          'statistics-concept',
          'customer-mode',
          'customer-layout',
          'lang',
        ]

        const captureState = () => {
          const s = {}
          for (const id of CONTROL_IDS) {
            const el = document.getElementById(id)
            if (!el) continue
            s[id] = el.type === 'checkbox' ? el.checked : el.value
          }
          const active = kit.querySelector(
            '.kit-b button.tab.on, .kit-b button.tab[aria-pressed="true"]'
          )
          if (active) s.layout = active.textContent.trim()
          return s
        }

        /* apply saved values, then fire the events the prototype already listens for */
        const restoreState = () => {
          const saved = readJSON(STATE_KEY, null)
          if (!saved || !Object.keys(saved).length) return
          for (const id of CONTROL_IDS) {
            const el = document.getElementById(id)
            if (!el || !(id in saved)) continue
            const want = saved[id]
            if (el.type === 'checkbox') {
              if (el.checked !== want) {
                el.checked = want
                el.dispatchEvent(new Event('change', {bubbles: true}))
              }
            } else if ([...(el.options || [])].some(o => o.value === want)) {
              if (el.value !== want) {
                el.value = want
                el.dispatchEvent(new Event('change', {bubbles: true}))
              }
            }
          }
          if (saved.layout) {
            const btn = [...kit.querySelectorAll('.kit-b button.tab')].find(
              b => b.textContent.trim() === saved.layout
            )
            if (btn && btn.getAttribute('aria-pressed') !== 'true') btn.click()
          }
        }

        restoreState()
        kit.addEventListener('change', () => writeJSON(STATE_KEY, captureState()))
        kit.addEventListener('click', e => {
          if (e.target.closest('.kit-b button.tab'))
            setTimeout(() => writeJSON(STATE_KEY, captureState()), 0)
        })

        /* ---------- panel chrome: collapse, hide, drag, all remembered ---------- */
        const compactControls = matchMedia('(max-width: 720px)')
        const ui = readJSON(UI_KEY, {
          min: false,
          hidden: compactControls.matches,
          left: null,
          top: null,
        })
        const launchpadVisible = !!document.querySelector('.lp-view:not([hidden])')
        if (compactControls.matches || launchpadVisible) {
          ui.hidden = true
          ui.left = null
          ui.top = null
        }
        const minBtn = document.getElementById('kit-min')
        const saveUI = () => writeJSON(UI_KEY, ui)

        const applyMin = () => {
          kit.classList.toggle('min', ui.min)
          minBtn.textContent = ui.min ? '\u25a1' : '\u2013'
          minBtn.title = minBtn.ariaLabel = ui.min ? 'Expand' : 'Collapse'
          minBtn.setAttribute('aria-expanded', String(!ui.min))
        }
        const applyHidden = () => {
          kit.classList.toggle('hidden', ui.hidden)
          kit.setAttribute('aria-hidden', String(ui.hidden))
          pill.setAttribute('aria-expanded', String(!ui.hidden))
        }

        minBtn.onclick = () => {
          ui.min = !ui.min
          applyMin()
          saveUI()
        }
        document.getElementById('kit-hide').onclick = () => {
          ui.hidden = true
          applyHidden()
          saveUI()
          pill.focus()
        }
        pill.onclick = () => {
          ui.hidden = false
          applyHidden()
          saveUI()
          minBtn.focus()
        }
        applyMin()
        applyHidden()
        compactControls.addEventListener('change', event => {
          if (!event.matches) return
          ui.hidden = true
          ui.left = null
          ui.top = null
          kit.style.inset = ''
          kit.style.left = ''
          kit.style.top = ''
          applyHidden()
          saveUI()
        })

        /* keep the panel fully on screen; used after drags and on resize */
        const clamp = () => {
          if (ui.left == null || ui.top == null) return
          const w = kit.offsetWidth,
            h = kit.offsetHeight
          ui.left = Math.min(Math.max(6, ui.left), Math.max(6, innerWidth - w - 6))
          ui.top = Math.min(Math.max(6, ui.top), Math.max(6, innerHeight - h - 6))
          kit.style.inset = 'auto'
          kit.style.left = ui.left + 'px'
          kit.style.top = ui.top + 'px'
        }
        clamp()
        addEventListener('resize', clamp)

        const head = kit.querySelector('.kit-h')
        let sx = 0,
          sy = 0,
          ox = 0,
          oy = 0,
          dragging = false
        head.addEventListener('pointerdown', e => {
          if (e.target.closest('button')) return
          const r = kit.getBoundingClientRect()
          kit.style.inset = 'auto'
          kit.style.left = r.left + 'px'
          kit.style.top = r.top + 'px'
          sx = e.clientX
          sy = e.clientY
          ox = r.left
          oy = r.top
          dragging = true
          kit.classList.add('dragging')
          head.setPointerCapture(e.pointerId)
        })
        head.addEventListener('pointermove', e => {
          if (!dragging) return
          const w = kit.offsetWidth,
            h = kit.offsetHeight
          ui.left = Math.min(Math.max(6, ox + e.clientX - sx), innerWidth - w - 6)
          ui.top = Math.min(Math.max(6, oy + e.clientY - sy), innerHeight - h - 6)
          kit.style.left = ui.left + 'px'
          kit.style.top = ui.top + 'px'
        })
        const endDrag = e => {
          if (!dragging) return
          dragging = false
          kit.classList.remove('dragging')
          try {
            head.releasePointerCapture(e.pointerId)
          } catch {}
          saveUI()
        }
        head.addEventListener('pointerup', endDrag)
        head.addEventListener('pointercancel', endDrag)

        /* double-click the header to snap back to the default corner */
        head.addEventListener('dblclick', e => {
          if (e.target.closest('button')) return
          ui.left = ui.top = null
          saveUI()
          kit.style.inset = ''
          kit.style.left = ''
          kit.style.top = ''
        })

        /* ---------- 2. the written notes become a dialog ---------- */
        const notes = [...document.querySelectorAll('.note, .concept-note')].map(n => {
          const section = n.closest('.design, .concept')
          return {
            html: n.outerHTML.replace(/class="[^"]*"/, 'class="n"'),
            key: section ? section.dataset.design || section.dataset.concept || '' : '',
          }
        })
        document.querySelectorAll('.note, .concept-note').forEach(n => n.remove())

        const dlg = document.createElement('div')
        dlg.id = 'kit-notes'
        dlg.innerHTML =
          '<div class="box" role="dialog" aria-modal="true" aria-labelledby="kit-notes-t">' +
          '<div class="nh"><h3 id="kit-notes-t">About this prototype</h3>' +
          '<button type="button" aria-label="Close">\u00d7</button></div><div class="nb"></div></div>'
        document.body.appendChild(dlg)
        const nb = dlg.querySelector('.nb')
        const box = dlg.querySelector('.box')
        const infoBtn = document.getElementById('kit-info')
        let lastFocus = null

        const closeNotes = () => {
          if (!dlg.classList.contains('open')) return
          dlg.classList.remove('open')
          infoBtn.setAttribute('aria-expanded', 'false')
          ;(lastFocus || infoBtn).focus()
        }
        dlg.querySelector('.nh button').onclick = closeNotes
        dlg.addEventListener('click', e => {
          if (e.target === dlg) closeNotes()
        })

        /* Escape closes, Tab stays inside the dialog while it is open */
        document.addEventListener('keydown', e => {
          if (!dlg.classList.contains('open')) return
          if (e.key === 'Escape') {
            e.preventDefault()
            closeNotes()
            return
          }
          if (e.key !== 'Tab') return
          const f = [
            ...box.querySelectorAll(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            ),
          ].filter(el => el.offsetParent !== null)
          if (!f.length) return
          const first = f[0],
            last = f[f.length - 1]
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault()
            last.focus()
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        })

        const activeKey = () => {
          const a = document.querySelector('.design.active, .concept.active')
          return a ? a.dataset.design || a.dataset.concept || '' : ''
        }
        infoBtn.setAttribute('aria-expanded', 'false')
        infoBtn.onclick = () => {
          const k = activeKey()
          const shown = notes.filter(n => !n.key || n.key === k)
          nb.innerHTML = (shown.length ? shown : notes).map(n => n.html).join('')
          lastFocus = document.activeElement
          dlg.classList.add('open')
          infoBtn.setAttribute('aria-expanded', 'true')
          nb.scrollTop = 0
          dlg.querySelector('.nh button').focus()
        }
      })()
    