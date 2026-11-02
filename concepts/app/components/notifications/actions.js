import {encodeHtml} from '../../core/locale.js'

/** Shared controls for notification table and cards. The page owns their delegated events. */
export function notificationActionButtons(row) {
  const key = encodeHtml(row.id)
  const pinLabel = row.pinned ? 'Unstar notification' : 'Star notification'
  const readLabel = row.unread ? 'Mark as read' : 'Mark as unread'
  return `<span class="inline-flex items-center gap-1.5 whitespace-nowrap">
    <button type="button" class="lbtn out [min-height:30px]! px-2!" data-notification-action="read" data-notification-id="${key}" aria-label="${readLabel}" title="${readLabel}">${row.unread ? 'Mark as read' : 'Mark as unread'}</button>
    <button type="button" class="lbtn out [min-height:30px]! px-2! ${row.pinned ? 'text-accent!' : ''}" data-notification-action="pin" data-notification-id="${key}" aria-label="${pinLabel}" aria-pressed="${Boolean(row.pinned)}" title="${pinLabel}">${row.pinned ? '★' : '☆'}</button>
  </span>`
}
