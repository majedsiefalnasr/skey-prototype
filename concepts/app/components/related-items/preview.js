import {uiLocale} from '../../core/locale.js'
import {formatDate, formatTime} from '../../core/collab-dates.js'
import {DEFAULT_EVENT_ZONE} from '../../core/event-scheduling.js'
import {escapeHtml, icon, CHIP_CLASS} from '../collab/fields.js'
import {holdFocus} from '../collab/panel.js'
import {TYPE_META, titleOf, kindLabel, kindIcon, statusLabel, noteStatusLabel, folderLabel, conversionLabel, assigneeIdsOf, userName, isOverdue, isOpenActivity} from '../collab/meta.js'

const {t} = uiLocale
const text = value => `<span class="whitespace-pre-line" dir="auto">${escapeHtml(value || '—')}</span>`
const stamp = value => value ? `${formatDate(value)}${value.includes('T') ? ` ${formatTime(value)}` : ''}` : '—'
const chip = (label, tone = 'gray', name = '') => `<span class="badge ${tone} inline-flex items-center gap-1.5">${name ? icon(name, 13) : ''}${escapeHtml(label)}</span>`
const field = (label, value) => `<div class="min-w-0"><dt class="mb-1 text-xs text-muted">${escapeHtml(t(label))}</dt><dd class="m-0 text-sm text-ink [overflow-wrap:anywhere]">${value}</dd></div>`
const grid = rows => `<dl class="m-0 grid grid-cols-1 gap-x-5 gap-y-4 min-[480px]:grid-cols-2">${rows.join('')}</dl>`
const section = (label, content) => `<section class="border-t border-line pt-4"><h4 class="mb-2 text-xs font-medium text-muted">${escapeHtml(t(label))}</h4>${content}</section>`
const prose = value => `<p class="m-0 whitespace-pre-wrap text-sm leading-relaxed [overflow-wrap:anywhere]" dir="auto">${escapeHtml(value || '—')}</p>`
const chips = values => `<div class="flex flex-wrap gap-1.5">${values.join('')}</div>`

/** A separate, read-only popup: never opens or repaints the source panel. */
export function createRelatedPreview({store, users, openItem}) {
  function activitySignal(item) {
    if (item.archived) return null
    if (isOverdue(item, store.now().slice(0, 10))) return {tone: 'danger', label: 'Overdue', badge: 'danger'}
    if (item.status === 'done') return {tone: 'success', label: 'Done', badge: 'ok'}
    if (!item.archived && isOpenActivity(item)) {
      if (item.dueDate === store.now().slice(0, 10)) return {tone: 'warning', label: 'Due today', badge: 'warn'}
      if (item.priority === 'high') return {tone: 'warning', label: 'High priority', badge: 'warn'}
      if (item.status === 'in_progress') return {tone: 'info', label: 'In progress', badge: 'fix'}
    }
    return null
  }

  function details(item) {
    const names = ids => chips(ids.map(id => `<span class="${CHIP_CLASS}">${icon('i-user', 13)}${escapeHtml(userName(id, users))}</span>`))
    let summary = ''
    let content = ''
    switch (item.type) {
      case 'note': {
        const status = store.listNoteColumns().find(column => column.id === item.status)?.label || noteStatusLabel(item.status)
        summary = chips([chip(status, item.status === 'active' ? 'ok' : 'gray'), ...(item.pinned ? [chip(t('Pinned'), 'fix', 'i-spark')] : [])])
        content = prose(item.body)
        if (item.tags?.length) content += section('Tags', chips(item.tags.map(tag => `<span class="${CHIP_CLASS}">${escapeHtml(tag)}</span>`)))
        break
      }
      case 'activity': {
        const signal = activitySignal(item)
        summary = chips([chip(kindLabel(item.kind), 'gray', kindIcon(item.kind)), chip(statusLabel(item.status), item.status === 'done' ? 'ok' : 'gray'), ...(signal && t(signal.label) !== statusLabel(item.status) ? [chip(t(signal.label), signal.badge, 'i-clock')] : [])])
        const assigned = assigneeIdsOf(item)
        content = grid([
          field('Assigned to', assigned.length ? names(assigned) : text(t('Unassigned'))),
          field('Priority', chip(t({low: 'Low', normal: 'Normal', high: 'High'}[item.priority] || item.priority), item.priority === 'high' ? 'warn' : 'gray')),
          field('Due date', text(item.dueDate ? formatDate(item.dueDate) : t('No due date'))),
          field('Scheduled', item.scheduledStart ? `${text(stamp(item.scheduledStart))}<span class="mt-1 block text-xs text-muted">${escapeHtml(t('{count} minutes').replace('{count}', String(item.durationMin || 30)))}</span>` : text(t('Not scheduled'))),
        ])
        if (item.notes) content += section('Notes', prose(item.notes))
        break
      }
      case 'event': {
        summary = chips([chip(t({general: 'General', company: 'Company', customer: 'Customer', sales: 'Sales'}[item.category] || 'General'), 'fix', 'i-cal'), ...(item.allDay ? [chip(t('All day'))] : [])])
        content = grid([
          field('Starts', text(stamp(item.start))),
          field('Ends', text(stamp(item.end))),
          ...(!item.allDay ? [field('Event timezone', text(item.timeZone || DEFAULT_EVENT_ZONE))] : []),
          field('Location', text(item.location)),
          field('Repeat', text(t({daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly'}[item.repeat] || 'Does not repeat'))),
          field('Reminder', text(t({'10m': '10 minutes before', '1h': '1 hour before', '1d': '1 day before'}[item.reminder] || 'No reminder'))),
        ])
        if (item.participantIds?.length) content += section('Participants', names(item.participantIds))
        if (item.description) content += section('Description', prose(item.description))
        break
      }
      case 'person': {
        summary = chips([chip(item.convertedTo ? `${t('Converted to')} ${conversionLabel(item.convertedTo.target)}` : t(item.lifecycle === 'contact' ? 'Contact' : 'Lead'), 'fix', 'i-user')])
        content = grid([
          ...(item.nameAr ? [field('Name (Arabic)', `<span lang="ar" dir="rtl">${escapeHtml(item.nameAr)}</span>`)] : []),
          field('Job title', text(item.jobTitle)),
          field('Company', text(item.company)),
          field('Address', text([item.city, item.country].filter(Boolean).join(', '))),
        ])
        if (item.contacts?.length) content += section('Contacts', `<ul class="m-0 grid list-none gap-3 p-0">${item.contacts.map(contact => `<li class="flex min-w-0 items-start gap-2.5"><span class="mt-0.5 text-muted">${icon(contact.kind === 'email' ? 'i-mail' : 'i-chat', 15)}</span><div class="min-w-0"><div class="mb-0.5 flex items-center gap-2 text-xs text-muted">${escapeHtml(t({email: 'Email', phone: 'Phone', mobile: 'Mobile'}[contact.kind] || contact.kind))}${contact.primary ? chip(t('Primary')) : ''}</div><span class="block text-sm [overflow-wrap:anywhere]" dir="ltr">${escapeHtml(contact.value)}</span></div></li>`).join('')}</ul>`)
        if (item.notes) content += section('Notes', prose(item.notes))
        break
      }
      case 'mail': {
        const address = person => [person?.name, person?.email].filter(Boolean).join(' · ')
        summary = chips([chip(t(folderLabel(item.folder, store.listFolders())), 'gray', 'i-mail')])
        content = `<dl class="m-0 grid gap-3">${field('From', text(address(item.from)))}${field('To', text((item.to || []).map(address).join(', ')))}${item.cc?.length ? field('Cc', text(item.cc.map(address).join(', '))) : ''}${field(item.sentAt ? 'Sent' : 'Saved', text(stamp(item.sentAt || item.savedAt || item.createdAt)))}</dl>`
        content += section('Message', prose(Array.isArray(item.body) ? item.body.join('\n\n') : item.body))
        if (item.attachments?.length) content += section('Attachments', chips(item.attachments.map(file => `<span class="${CHIP_CLASS}">${icon('i-doc', 13)}${escapeHtml(file.name || file.filename || file)}</span>`)))
        break
      }
    }
    return `<div class="grid gap-4">${summary}${content}</div>`
  }

  function open(ref) {
    const item = store.getEntity(ref.type, ref.id)
    if (!item) return
    const dialog = document.getElementById('collab-preview')
    const box = dialog.querySelector('[data-preview-box]')
    box.dataset.tone = item.type === 'activity' ? activitySignal(item)?.tone || 'default' : 'default'
    const returnTo = document.activeElement
    dialog.querySelector('#collab-preview-title').textContent = titleOf(item)
    dialog.querySelector('#collab-preview-meta').textContent = `${t(TYPE_META[ref.type].label)} · ${t('Preview')}`
    dialog.querySelector('[data-preview-body]').innerHTML = details(item)
    dialog.querySelector('[data-preview-close]').setAttribute('aria-label', t('Close preview'))
    const controller = new AbortController()
    const {signal} = controller
    // Inert the background without replacing its focus trap or touching its
    // DOM, draft values, scroll position, or record selection.
    const background = []
    for (let node = dialog; node.parentElement; node = node.parentElement) {
      for (const sibling of node.parentElement.children) {
        if (sibling !== node && !sibling.inert) {
          sibling.inert = true
          background.push(sibling)
        }
      }
      if (node.parentElement === document.body) break
    }
    function close() {
      release()
      controller.abort()
      dialog.classList.remove('open')
      for (const sibling of background) sibling.inert = false
      dialog.querySelector('[data-preview-body]').innerHTML = ''
      if (returnTo?.isConnected) returnTo.focus({preventScroll: true})
    }
    const release = holdFocus(box, close)
    dialog.querySelector('[data-preview-close]').addEventListener('click', close, {signal})
    dialog.querySelector('[data-preview-done]').addEventListener('click', close, {signal})
    dialog.querySelector('[data-preview-full]').addEventListener('click', () => {
      close()
      openItem(ref, {fullPage: true})
    }, {signal})
    dialog.addEventListener('click', event => {
      if (event.target === dialog) close()
    }, {signal})
    dialog.classList.add('open')
    box.focus()
  }

  return {open}
}
