import {EMAIL_DATA} from '../../prototype/fixtures/messages.js'
export function createEmail({root, onUnreadChange, navigate, toast}) {
const pageAbort = new AbortController()
const queryId = id => root.querySelector('#' + CSS.escape(id))
        function renderEmailList(query) {
          const scroll = queryId('email-list-scroll')
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
            row.className =
              'email-list-row flex items-start gap-2.5 w-full border-0 bg-transparent font-[inherit] text-start cursor-pointer py-2.5 px-3.5 border-b border-line' +
              (m.unread ? ' unread' : '')
            row.dataset.id = m.id
            row.innerHTML = `<span class="email-avatar relative flex-none w-7 h-7 rounded-full flex items-center justify-center bg-[var(--avatar-bg)] text-[var(--avatar-ink)] text-xs font-bold" style="--hue:${m.hue}"></span>
      <span class="email-list-txt flex-1 min-w-0"><span class="email-list-top flex items-baseline justify-between gap-2"><b class="text-[13px] font-medium text-ink"></b><span class="email-list-time flex-none text-xs text-faint"></span></span>
      <span class="email-list-subj block text-[12.5px] text-muted mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap"></span></span>`
            row.querySelector('.email-avatar').textContent = m.from.charAt(0)
            row.querySelector('b').textContent = m.from
            row.querySelector('.email-list-time').textContent = m.time
            row.querySelector('.email-list-subj').textContent = m.subject
            row.addEventListener('click', () => selectEmail(m.id), {signal: pageAbort.signal})
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
          root.querySelectorAll('.email-list-row').forEach(r => {
            r.classList.toggle('active', r.dataset.id === id)
            if (r.dataset.id === id) r.classList.remove('unread')
          })
          renderEmailReading(m)
          onUnreadChange()
        }
        /* the composer footer is shared by "reply to an existing email" and "compose
   new" — it always sits outside the pane's own scroll area, pinned to the
   bottom of the reading pane like a real inbox's reply box */
        function composerMarkup(toLine, placeholder, sendLabel) {
          return `<div class="email-composer flex-none py-4 px-6 border-t border-line bg-surface">
      ${toLine}
      <textarea class="email-composer-input w-full min-h-[70px] resize-y bg-surface border border-line rounded-lg py-2.5 px-3 font-[inherit] text-ink outline-none" placeholder="${placeholder}"></textarea>
      <div class="email-composer-toolbar flex items-center gap-0.5 mt-2">
        <button type="button" class="ibtn" aria-label="Bold"><svg width="14" height="14" aria-hidden="true"><use href="#i-bold"/></svg></button>
        <button type="button" class="ibtn" aria-label="Italic"><svg width="14" height="14" aria-hidden="true"><use href="#i-italic"/></svg></button>
        <button type="button" class="ibtn" aria-label="Underline"><svg width="14" height="14" aria-hidden="true"><use href="#i-underline"/></svg></button>
        <button type="button" class="ibtn" aria-label="Strikethrough"><svg width="14" height="14" aria-hidden="true"><use href="#i-strike"/></svg></button>
        <button type="button" class="ibtn" aria-label="Attach file"><svg width="14" height="14" aria-hidden="true"><use href="#i-clip"/></svg></button>
        <span class="sp flex-1"></span>
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
          }, {signal: pageAbort.signal})
        }
        function renderEmailReading(m) {
          const pane = queryId('email-reading')
          const toChips = m.to.map(p => `<span class="email-chip inline-flex items-center bg-[var(--hover-overlay)] text-ink rounded-full py-0.5 px-2.5 text-[12.5px]">${p.name}</span>`).join('')
          const ccField = m.cc.length
            ? `<div class="email-field flex items-center gap-2 mb-1.5 text-[12.5px] text-faint"><span>Cc</span>${m.cc.map(p => `<span class="email-chip inline-flex items-center bg-[var(--hover-overlay)] text-ink rounded-full py-0.5 px-2.5 text-[12.5px]">${p.name}</span>`).join('')}</div>`
            : ''
          const attach = m.attachments.length
            ? `<div class="email-attachments flex flex-wrap gap-2 mt-3.5">${m.attachments
                .map(
                  a =>
                    `<span class="email-attach flex items-center gap-[7px] border border-line rounded-lg py-[7px] px-2.5 text-[12.5px] text-ink"><svg width="14" height="14" aria-hidden="true"><use href="#i-clip"/></svg><span>${a.name}</span><small class="text-faint text-xs">${a.size}</small></span>`
                )
                .join('')}</div>`
            : ''
          pane.innerHTML = `
    <div class="email-reading-scroll nc-scroll flex-1 min-h-0 overflow-auto py-5 px-6">
      <div class="email-reading-hd flex items-center gap-3">
        <span class="email-avatar lg relative flex-none w-10 h-10 rounded-full flex items-center justify-center bg-[var(--avatar-bg)] text-[var(--avatar-ink)] text-base font-bold" style="--hue:${m.hue}">${m.from.charAt(0)}</span>
        <div class="email-reading-who flex-1 min-w-0 flex flex-col [&_b]:text-sm [&_span]:text-[12.5px] [&_span]:text-muted"><b>${m.from}</b><span>${m.email}</span></div>
        <span class="email-reading-time flex-none text-xs text-faint">${m.day}, ${m.time}</span>
      </div>
      <h2 class="email-reading-subject text-[19px] font-bold my-4 mt-4 mb-3.5 text-ink">${m.subject}</h2>
      <div class="email-field flex items-center gap-2 mb-1.5 text-[12.5px] text-faint"><span>To</span>${toChips}</div>
      ${ccField}
      <div class="email-reading-body mt-4 text-sm leading-[1.65] text-ink [&_p]:mb-3 [&_p]:whitespace-pre-line">${m.body.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')}</div>
      ${attach}
    </div>
    ${composerMarkup(`<div class="email-composer-to text-[12.5px] text-muted mb-2">Reply to <b>${m.from}</b></div>`, 'Write a reply…', 'Reply')}`
          wireComposer(pane, () => `Your reply to ${m.from} was sent.`)
        }
        function renderComposeNew() {
          const pane = queryId('email-reading')
          root.querySelectorAll('.email-list-row').forEach(r => r.classList.remove('active'))
          pane.innerHTML = `
    <div class="email-reading-scroll nc-scroll flex-1 min-h-0 overflow-auto py-5 px-6">
      <h2 class="email-reading-subject text-[19px] font-bold my-4 mt-4 mb-3.5 text-ink">New message</h2>
      <div class="email-compose-row flex items-center gap-3 py-2.5 border-b border-line [&_label]:flex-none [&_label]:w-14 [&_label]:text-[12.5px] [&_label]:text-faint [&_input]:flex-1 [&_input]:min-w-0 [&_input]:border-0 [&_input]:outline-none [&_input]:font-[inherit] [&_input]:text-sm [&_input]:text-ink [&_input]:bg-transparent"><label for="email-compose-to">To</label><input type="text" id="email-compose-to" placeholder="Recipient email…"></div>
      <div class="email-compose-row flex items-center gap-3 py-2.5 border-b border-line [&_label]:flex-none [&_label]:w-14 [&_label]:text-[12.5px] [&_label]:text-faint [&_input]:flex-1 [&_input]:min-w-0 [&_input]:border-0 [&_input]:outline-none [&_input]:font-[inherit] [&_input]:text-sm [&_input]:text-ink [&_input]:bg-transparent"><label for="email-compose-subject">Subject</label><input type="text" id="email-compose-subject" placeholder="Subject…"></div>
    </div>
    ${composerMarkup('', 'Write your message…', 'Send')}`
          wireComposer(pane, () => {
            const to = pane.querySelector('#email-compose-to').value.trim()
            return `Your message${to ? ` to ${to}` : ''} was sent.`
          })
        }
        function openEmailView(id) {
          navigate('email')
          renderEmailList('')
          selectEmail(id || EMAIL_DATA[0]?.id)
          queryId('email-search-input').value = ''
        }
        function closeEmailView() {
          navigate('record')
        }
        root.querySelectorAll('.email-back').forEach(b =>
          b.addEventListener('click', e => {
            e.preventDefault()
            closeEmailView()
          }, {signal: pageAbort.signal})
        )
        root.querySelector('.email-compose')?.addEventListener('click', renderComposeNew, {signal: pageAbort.signal})
        document
          .getElementById('email-search-input')
          .addEventListener('input', e => renderEmailList(e.target.value), {signal: pageAbort.signal})

return {id: 'email', roots: [root], activate({messageId} = {}) { renderEmailList(''); selectEmail(messageId || EMAIL_DATA[0]?.id); queryId('email-search-input').value = '' }, deactivate() {}, dispose() { pageAbort.abort();  }, openEmailView, closeEmailView}
}
