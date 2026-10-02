export function createAssistant({trapFocus, releaseFocus, closeAllMenus, toast}) {
const pageAbort = new AbortController()
const timers = new Set()
const schedule = (callback, delay) => { const timer = setTimeout(() => {timers.delete(timer); callback()}, delay); timers.add(timer); return timer }
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
          if (!text.trim()) {
            toast({
              tone: 'info',
              title: 'Type a question first',
              body: 'The assistant answers what you write, or pick one of the suggestions.',
            })
            return
          }
          if (aiThread.querySelector('.ai-empty')) aiThread.innerHTML = ''
          const me = document.createElement('div')
          me.className = 'ai-msg me max-w-[88%] self-end rounded-[10px] rounded-br-[3px] bg-accent px-3 py-2 text-[13px] leading-[1.5] text-inverse'
          me.textContent = text
          aiThread.appendChild(me)
          aiInput.value = ''
          aiThread.scrollTop = aiThread.scrollHeight

          const thinking = document.createElement('div')
          thinking.className = 'ai-msg bot ai-thinking max-w-[88%] self-start whitespace-pre-line rounded-[10px] rounded-bl-[3px] border border-line bg-[var(--bg)] px-3 py-2 text-[13px] leading-[1.5] text-ink flex items-center gap-2 text-muted'
          thinking.innerHTML =
            '<span class="ai-orb size-[15px] flex-none rounded-full bg-[conic-gradient(from_0deg,#6c9bff,#a575ff,#ff8dc7,#6c9bff)] [animation:ai-orb-spin_2.2s_linear_infinite,ai-orb-pulse_1.4s_ease-in-out_infinite] motion-reduce:animate-none"></span><span>Thinking<span class="ai-dots ms-px inline-flex gap-0.5 align-[-0.12em]"><i class="size-1 inline-block rounded-full bg-current opacity-30 [animation:ai-dot-bounce_1.1s_ease-in-out_infinite] motion-reduce:animate-none motion-reduce:opacity-60"></i><i class="size-1 inline-block rounded-full bg-current opacity-30 [animation:ai-dot-bounce_1.1s_ease-in-out_infinite] [animation-delay:0.15s] motion-reduce:animate-none motion-reduce:opacity-60"></i><i class="size-1 inline-block rounded-full bg-current opacity-30 [animation:ai-dot-bounce_1.1s_ease-in-out_infinite] [animation-delay:0.3s] motion-reduce:animate-none motion-reduce:opacity-60"></i></span></span>'
          aiThread.appendChild(thinking)
          aiThread.scrollTop = aiThread.scrollHeight

          const answer = AI_SCENARIOS[text] || AI_FALLBACK
          schedule(
            () => {
              thinking.remove()
              const bot = document.createElement('div')
              bot.className = 'ai-msg bot max-w-[88%] self-start whitespace-pre-line rounded-[10px] rounded-bl-[3px] border border-line bg-[var(--bg)] px-3 py-2 text-[13px] leading-[1.5] text-ink'
              aiThread.appendChild(bot)
              let i = 0
              const step = () => {
                i = Math.min(i + 3, answer.length)
                bot.textContent = answer.slice(0, i)
                aiThread.scrollTop = aiThread.scrollHeight
                if (i < answer.length) schedule(step, 12)
              }
              step()
            },
            1000 + Math.random() * 500
          )
        }
        aiscrim.addEventListener('click', e => {
          if (e.target === aiscrim || e.target.closest('.ai-close')) closeAI()
        }, {signal: pageAbort.signal})
        document.addEventListener('keydown', e => {
          if (e.key === 'Escape') closeAI()
        }, {signal: pageAbort.signal})
        document
          .querySelectorAll('.ai-chip')
          .forEach(c => c.addEventListener('click', () => aiAsk(c.dataset.ai), {signal: pageAbort.signal}))
        document.getElementById('ai-send').addEventListener('click', () => aiAsk(aiInput.value), {signal: pageAbort.signal})
        aiInput.addEventListener('keydown', e => {
          if (e.key === 'Enter') aiAsk(aiInput.value)
        }, {signal: pageAbort.signal})
        /* not scoped to .gtop: the launchpad boot (showLaunchpad, called during the
   mount loop above) already moved this cluster into .lp-actions by the time
   this wiring runs, so a ".gtop .right" selector would silently match nothing */
        document
          .querySelectorAll('.right button.chip')
          .forEach(b => b.addEventListener('click', openAI, {signal: pageAbort.signal}))
        /* "/" reuses the same suggestions as the chips above the thread — one list, two entry points */
        const aiSlashList = document.getElementById('ai-slash-list')
        document.querySelectorAll('.ai-chip').forEach(c => {
          const row = document.createElement('button')
          row.type = 'button'
          row.setAttribute('role', 'menuitem')
          row.textContent = c.textContent
          row.addEventListener('click', () => aiAsk(c.dataset.ai), {signal: pageAbort.signal})
          aiSlashList.appendChild(row)
        })
        document.querySelectorAll('[data-ai-attach]').forEach(b =>
          b.addEventListener('click', () => {
            closeAllMenus()
            toast({
              tone: 'info',
              title: b.dataset.aiAttach === 'image' ? 'Attach image' : 'Attach file',
              body: 'This is a UI mock — nothing is actually uploaded.',
            })
          }, {signal: pageAbort.signal})
        )


return {open: openAI, close: closeAI, dispose() { pageAbort.abort(); timers.forEach(clearTimeout); }, closeAI}
}
