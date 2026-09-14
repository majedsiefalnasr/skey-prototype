
export function createInvoicePrint({state, trapFocus, releaseFocus, closeAllMenus, clearInlineError, showInlineError, runWork, toast, applyState}) {
const pageAbort = new AbortController()

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
        }, {signal: pageAbort.signal})
        document.querySelector('.dbody').addEventListener('change', updPrint, {signal: pageAbort.signal})


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


return {dispose: () => pageAbort.abort(), pscrim, openPrintSettings, doPrint}
}
