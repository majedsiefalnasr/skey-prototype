export function createInvoiceOperations({t, trapFocus, state, releaseFocus, closeAllMenus, closeSearch, getLocale, encodeHtml, blocked, toast, runWork, doPrint, openSearch, STATUSES, CHAIN, reached, editable, LOCK_COPY, pop, renderPop, drawer, renderCards, renderSearch}) {
const pageAbort = new AbortController()

        const rscrim = document.getElementById('rscrim')
        const ACT_DLG = {
          Posting: 'posting',
          'Display Journal Entry': 'journal',
          'Cancel Document': 'cancel',
        }
        /* Status is changed from the record action row, never from the audit pill.
           The menu only exposes the next legitimate document states. */
        const STATUS_TRANSITIONS = {
          open: ['pending', 'canceled'],
          pending: ['open', 'posted'],
          posted: ['pending', 'returned', 'canceled'],
          returned: [],
          canceled: [],
          inactive: [],
        }
        const STATUS_ACTIONS = {
          open: {
            title: 'Open invoice 126',
            description: 'This makes the invoice available for normal processing again.',
            confirm: 'Open invoice',
            tone: 'default',
          },
          pending: {
            title: 'Mark invoice 126 as pending',
            description: 'Pending invoices stay on hold until the issue below is resolved.',
            confirm: 'Mark as pending',
            tone: 'warning',
            reason: 'Why is this invoice pending?',
          },
          returned: {
            title: 'Return invoice 126',
            description: 'This records the return and prevents further processing of this invoice.',
            confirm: 'Return invoice',
            tone: 'danger',
            reason: 'Why is this invoice being returned?',
          },
        }
        let pendingStatusAction = null
        const setStatus = status => {
          document.getElementById('st').value = status
          state.status = status
          applyState()
        }
        const openRDlg = kind => {
          rscrim.querySelectorAll('.dlg').forEach(d => {
            d.hidden = d.dataset.dlg !== kind
            clearInlineError(d)
          })
          rscrim.classList.add('open')
          trapFocus(rscrim.querySelector('.dlg:not([hidden])'))
          const dlg = rscrim.querySelector(`.dlg[data-dlg="${kind}"]`)
          if (!dlg) return
          if (kind === 'posting') dlg.dataset.tone = 'success'
          if (kind === 'cancel' || kind === 'delete') dlg.dataset.tone = 'danger'
          /* the dialog shows either the operation to perform, or the record of it —
     never a toggle that re-asks for an intent the user already declared */
          const done =
            (kind === 'posting' && state.status === 'posted') ||
            (kind === 'cancel' && state.status === 'canceled')
          dlg
            .querySelectorAll('[data-state]')
            .forEach(el => (el.hidden = (el.dataset.state === 'done') !== done))
          const title = dlg.querySelector('.dhd h3')
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
        const openStatusDialog = status => {
          if (status === 'posted') return openRDlg('posting')
          if (status === 'canceled') return openRDlg('cancel')
          const action = STATUS_ACTIONS[status]
          if (!action) return
          pendingStatusAction = status
          const dlg = rscrim.querySelector('.dlg[data-dlg="status"]')
          dlg.dataset.tone = action.tone
          dlg.querySelector('#sf-title').textContent = action.title
          dlg.querySelector('#sf-description').textContent = action.description
          dlg.querySelector('#sf-confirm').textContent = action.confirm
          const reason = dlg.querySelector('.status-reason')
          reason.hidden = !action.reason
          reason.querySelector('label').textContent = action.reason || ''
          const field = reason.querySelector('textarea')
          field.value = ''
          field.required = Boolean(action.reason)
          openRDlg('status')
          field.focus()
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
        }, {signal: pageAbort.signal})
        document.addEventListener('click', e => {
          const statusAction = e.target.closest('[data-status-action]')
          if (statusAction && !statusAction.hidden && !statusAction.disabled) {
            closeAllMenus()
            closeSearch()
            openStatusDialog(statusAction.dataset.statusAction)
            return
          }
          const act = e.target.closest('[data-act]')
          if (act && !act.disabled && ACT_DLG[act.dataset.act]) {
            closeAllMenus()
            closeSearch()
            openRDlg(ACT_DLG[act.dataset.act])
            return
          }
          if (e.target.closest('.r-close') || e.target === rscrim) closeRDlg()
        }, {signal: pageAbort.signal})

        /* ================= shell services: focus, toasts, async work =================
   Everything that takes time has three visible states — working, done, failed —
   and every overlay gives the keyboard back where it found it.                */


        /* ---- failure shown inside the dialog, so nothing typed is lost ---- */
        const showInlineError = (dlg, {title, body, link}) => {
          clearInlineError(dlg)
          if (dlg?.classList.contains('dlg')) dlg.dataset.tone = 'danger'
          const box = document.createElement('div')
          box.className = 'inlineerr'
          box.setAttribute('role', 'alert')
          box.innerHTML = `<svg width="15" height="15"><use href="#i-warn"/></svg>
    <span><b>${title}</b>${body}${link ? ` <a href="#">${link}</a>` : ''}</span>`
          const body_ = dlg.querySelector('.dbody')
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
              const lineLabel = getLocale() === 'ar' ? `السطر ${index + 1}` : `Line ${index + 1}`
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
            getLocale() === 'ar'
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
        }, {signal: pageAbort.signal})

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
            setStatus('open')
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
          const dlg = rscrim.querySelector('.dlg[data-dlg=posting]')
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
          setStatus('posted')
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
          const dlg = rscrim.querySelector('.dlg[data-dlg=cancel]')
          const ok = await runWork(btn, 'Canceling…')
          if (!ok) {
            showInlineError(dlg, {
              title: 'Could not cancel the document',
              body: 'A receipt voucher is already linked to this invoice. Cancel the voucher first.',
            })
            return
          }
          closeRDlg()
          setStatus('canceled')
          toast({
            tone: 'ok',
            title: 'Document 126 canceled',
            body: 'Your reason is kept in the Cancellation Data card.',
            action: 'See the record',
            onAction: () => openRDlg('cancel'),
          })
        }

        const doStatusChange = async btn => {
          const status = pendingStatusAction
          const action = STATUS_ACTIONS[status]
          const dlg = rscrim.querySelector('.dlg[data-dlg=status]')
          const reason = dlg.querySelector('#sf-reason')
          if (action.reason && !reason.value.trim()) {
            reason.focus()
            showInlineError(dlg, {
              title: 'A reason is required',
              body: 'Add a short explanation before changing this invoice status.',
            })
            return
          }
          const ok = await runWork(btn, `${action.confirm}…`)
          if (!ok) {
            showInlineError(dlg, {
              title: `Could not ${action.confirm.toLowerCase()}`,
              body: 'The invoice status was not changed. Please try again.',
            })
            return
          }
          closeRDlg()
          setStatus(status)
          toast({
            tone: status === 'returned' ? 'bad' : 'ok',
            title: `Invoice 126 is now ${STATUSES[status].label.toLowerCase()}`,
            body: action.reason ? 'Your reason was saved with the status change.' : '',
          })
        }

        /* Print — and the count the product already stores */
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
          if (b.id === 'sf-confirm') {
            doStatusChange(b)
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
        }, {signal: pageAbort.signal})

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
        }, {signal: pageAbort.signal})

        /* ---- deleting asks first, and says what cannot be undone ---- */
        const doDelete = async btn => {
          const dlg = rscrim.querySelector('.dlg[data-dlg=delete]')
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
                '.email-view, .list-view, .customer-list-view, .customer-record-view, .geo-list-view, .geo-record-view, .profile-view'
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
                '.d2, .email-view, .list-view, .customer-list-view, .customer-record-view, .geo-list-view, .geo-record-view, .profile-view'
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
              : CHAIN.map(
                  c =>
                    `<i class="seg block h-1 w-3.5 rounded-sm bg-current ${reached(c.id) ? 'on opacity-100' : 'opacity-[.28]'}"></i>`
                ).join('')
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
     must not touch those or the separately managed Customer/Geography/Profile
     views. */
          document.querySelectorAll('.canvas').forEach(c => {
            if (
              c.closest(
                '.list-view, .customer-list-view, .customer-record-view, .geo-list-view, .geo-record-view, .profile-view'
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
              }, {signal: pageAbort.signal})
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
          /* The audit pill reports history; status movement lives with the record
             commands. Keep unavailable transitions out of the menu entirely. */
          const statusTransitions = STATUS_TRANSITIONS[st] || []
          document.querySelectorAll('.statuswrap').forEach(wrap => {
            wrap.hidden = creating
            const trigger = wrap.querySelector('[data-act="Change status"]')
            trigger.disabled = creating || statusTransitions.length === 0
            trigger.title = creating
              ? 'Save the invoice before changing its status'
              : statusTransitions.length
                ? ''
                : 'This invoice is in a final status'
            wrap.querySelectorAll('[data-status-action]').forEach(item => {
              item.hidden = !statusTransitions.includes(item.dataset.statusAction)
            })
          })
          /* design 4 mini chain */
          document.querySelectorAll('.cp-mini-mount').forEach(m => {
            m.innerHTML = CHAIN.map(c => {
              const on = reached(c.id),
                cur = !creating && c.id === st
              return `<div class="cp-mini ${on ? (cur ? 'cur' : 'done') : 'off'} flex [gap:9px] [padding-bottom:11px] relative [&:last-child]:[padding-bottom:0]"><span class="cp-dot [width:16px] [height:16px] rounded-full [flex:none] [border:2px_solid_var(--line)] bg-surface [z-index:1] flex items-center justify-center [color:var(--inverse)] [background:var(--accent)] [border-color:var(--accent)]">${on && !cur ? '<svg width="9" height="9"><use href="#i-check"/></svg>' : ''}</span>
        <div><div class="n [.d4_.cp-mini_&]:text-xs [.d4_.cp-mini_&]:font-semibold [.d4_.cp-mini.off_&]:text-muted [.d4_.cp-mini.off_&]:font-normal">${c.name}</div><div class="d [.dcard_&]:text-xs [.dcard_&]:text-muted [.dcard_&]:[line-height:1.35] [.d4_.cp-mini_&]:text-xs [.d4_.cp-mini_&]:text-muted">${on ? c.when || '—' : creating ? 'Not yet' : 'Not recorded'}</div></div></div>`
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
          setTimeout(() => trapFocus(gscrim.querySelector('.dlg')), 0)
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
        }, {signal: pageAbort.signal})

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
          {capture: true, signal: pageAbort.signal}
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
        }, {signal: pageAbort.signal})
        document.getElementById('st').addEventListener('change', e => {
          state.status = e.target.value
          applyState()
        }, {signal: pageAbort.signal})
        document.getElementById('pay').addEventListener('change', e => {
          state.pay = e.target.value
          applyState()
        }, {signal: pageAbort.signal})
        document.getElementById('dirty').addEventListener('change', e => {
          state.dirty = e.target.checked
          applyState()
        }, {signal: pageAbort.signal})

let pendingLeave = null
function requestLeave() {
  pendingLeave?.(false)
  if (!atRisk()) return Promise.resolve(true)
  return new Promise(resolve => {
    const abort = new AbortController()
    const finish = allowed => { abort.abort(); pendingLeave = null; resolve(allowed) }
    pendingLeave = finish
    for (const id of ['g-stay', 'g-newtab']) {
      document.getElementById(id).addEventListener('click', () => finish(false), {signal: abort.signal})
    }
    askGuard(() => finish(true), 'leave this invoice')
  })
}
return {actionDialog: action => ACT_DLG[action], dispose: () => pageAbort.abort(), requestLeave, rscrim, openRDlg, closeRDlg, showInlineError, clearInlineError, doSave, runAction, applyState, gscrim, atRisk, askGuard, runGuarded, modeSel, applyMode}
}
