import {EMAIL_DATA, NOTIF_DATA} from '../../prototype/fixtures/messages.js'
export function createNotifications({closeAllMenus, openEmailView, closeMenuAndRestoreFocus}) {
const pageAbort = new AbortController()
        const emailAvatarTone = hue => (Math.abs(Math.round(Number(hue) / 60)) % 5) + 1
        const unreadOnly = () => document.getElementById('notif-unread-only')?.checked
        const renderEmailTab = body => {
          const messages = unreadOnly() ? EMAIL_DATA.filter(message => message.unread) : EMAIL_DATA
          if (!messages.length) {
            body.innerHTML = `<div class="notif-empty flex flex-col items-center gap-2.5 px-6 pb-[30px] pt-9 text-center text-faint"><svg width="34" height="34" aria-hidden="true"><use href="#i-mail"/></svg><p class="max-w-[26ch] text-[13px] text-muted">No email yet.</p></div>`
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
            row.className = 'notif-row flex w-full cursor-pointer items-start gap-2.5 rounded-lg border-none bg-none px-2.5 py-[9px] text-start font-[inherit] hover:bg-[var(--hover-overlay)]' + (m.unread ? ' unread' : '')
            row.innerHTML = `<span class="notif-icn email-avatar relative mt-px flex size-7 shrink-0 items-center justify-center rounded-full" data-avatar-tone="${emailAvatarTone(m.hue)}"></span>
      <span class="notif-txt flex-1 min-w-0 pt-px text-[13px] leading-[1.5] text-ink${m.unread ? ' font-semibold' : ''}">${m.unread ? '<span class="visually-hidden">Unread. </span>' : ''}<b class="font-semibold"></b> <span class="notif-what text-muted"></span></span>
      <span class="notif-time shrink-0 pt-[3px] text-xs text-faint"></span>`
            row.querySelector('.email-avatar').textContent = m.from.charAt(0)
            row.querySelector('b').textContent = m.from
            row.querySelector('.notif-what').textContent = m.subject
            row.querySelector('.notif-time').textContent = m.time
            row.addEventListener('click', () => {
              closeAllMenus()
              openEmailView(m.id)
            }, {signal: pageAbort.signal})
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
            body.innerHTML = `<div class="notif-empty flex flex-col items-center gap-2.5 px-6 pb-[30px] pt-9 text-center text-faint"><svg width="34" height="34" aria-hidden="true"><use href="#i-bell"/></svg>
      <p class="max-w-[26ch] text-[13px] text-muted">You're all caught up — no notifications yet.</p></div>`
            return
          }
          body.innerHTML = ''
          items.forEach(n => {
            const row = document.createElement('div')
            row.className = 'notif-row flex w-full cursor-pointer items-start gap-2.5 rounded-lg border-none bg-none px-2.5 py-[9px] text-start font-[inherit] hover:bg-[var(--hover-overlay)]' + (n.unread ? ' unread' : '')
            row.innerHTML = `<span class="notif-icn relative mt-px flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--hover-overlay)] text-muted"><svg width="15" height="15" aria-hidden="true"><use href="#${n.icon}"/></svg></span>
      <span class="notif-txt flex-1 min-w-0 pt-px text-[13px] leading-[1.5] text-ink${n.unread ? ' font-semibold' : ''}">${n.unread ? '<span class="visually-hidden">Unread. </span>' : ''}<b class="font-semibold"></b> <span class="notif-what text-muted"></span></span>
      <span class="notif-time shrink-0 pt-[3px] text-xs text-faint"></span>`
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
          tab.addEventListener('click', () => selectNotificationTab(tab), {signal: pageAbort.signal})
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
          }, {signal: pageAbort.signal})
        })
        document.getElementById('notif-unread-only').addEventListener('change', () => {
          const selectedTab = document.querySelector('.notif-tabs [aria-selected="true"]')
          renderNotif(selectedTab?.dataset.tab || 'direct')
        }, {signal: pageAbort.signal})
        const notificationsTrigger = document.querySelector(
          '[aria-controls="notifications-popover"]'
        )
        document.getElementById('notifications-popover').addEventListener('keydown', event => {
          if (event.key !== 'Escape') return
          event.preventDefault()
          closeMenuAndRestoreFocus(notificationsTrigger)
        }, {signal: pageAbort.signal})
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

return {refresh: syncNotifBadge, dispose() { pageAbort.abort();  }, syncNotifBadge}
}
