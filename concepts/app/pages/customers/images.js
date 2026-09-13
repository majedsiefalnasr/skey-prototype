// Customer avatar/photo and image-preview-popover behavior — moved out of
// concepts/app/legacy-app.js as part of Task 7. `createImagePreview({popover})`
// mirrors Task 6's createListChart({root}) -> {...} factory pattern: it
// closes over its own DOM refs and timers instead of module-level mutable
// bindings, so record.js can own exactly one instance of this preview
// behavior per customer page (there is only ever one
// #customer-image-popover in the document, matching the original).
//
// Wires every original document-delegated listener verbatim, not just
// hover: pointerover/pointerout (hover-intent open/close), error (fallback
// to initials), focusin/focusout (keyboard access), click (click-to-pin
// toggle + the popover's own close button), the popover's own pointerenter/
// pointerleave (moving the pointer onto the popover itself cancels the
// close timer) and toggle (native popover dismissal, e.g. Escape, resets
// trigger/pinned state), plus document-capture scroll (closes the popover)
// and window resize (repositions it while pinned open).

// Only these two fixture photo sources render a real preview; anything else
// (including a null/never-set photo) falls back to initials, exactly as
// the original.
const CUSTOMER_IMAGE_SOURCES = new Set([
  'assets/customers/customer-200010-portrait.webp',
  'assets/customers/customer-200002-organization.webp',
])

/**
 * @param {string} value
 * @returns {string} up to 2 uppercase initials, '?' for an empty value
 */
export function dataRecordInitials(value) {
  return String(value || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0] || '')
    .join('')
    .toUpperCase()
}

/**
 * @param {{src?: string, alt?: string, fit?: string}|null} photo
 * @returns {{src: string, alt: string, fit: 'contain'|'cover'}|null}
 */
export function customerImageData(photo) {
  if (!photo || !CUSTOMER_IMAGE_SOURCES.has(photo.src)) return null
  return {
    src: photo.src,
    alt: String(photo.alt || 'Customer image'),
    fit: photo.fit === 'contain' ? 'contain' : 'cover',
  }
}

/**
 * @param {{customerName: string, customerNo: string}} row
 * @param {{src: string, alt: string, fit: string}} image
 * @returns {string} the data-customer-image-* attribute string shared by
 * every preview trigger.
 */
export function customerImagePreviewAttributes(row, image, {encodeHtml}) {
  return `data-customer-image-preview data-customer-image-src="${encodeHtml(image.src)}" data-customer-image-alt="${encodeHtml(image.alt)}" data-customer-image-fit="${image.fit}" data-customer-image-name="${encodeHtml(row.customerName)}" data-customer-image-number="${encodeHtml(row.customerNo)}" aria-controls="customer-image-popover" aria-haspopup="dialog" aria-expanded="false" aria-label="Preview image for ${encodeHtml(row.customerName)}"`
}

/**
 * Data-list row avatar (used by the customer list's adaptive/card views via
 * actions.cardModel, unchanged from the original's renderCustomerAvatar).
 * @param {object} row
 * @param {{encodeHtml: Function}} deps
 */
export function renderCustomerAvatar(row, deps) {
  const {encodeHtml} = deps
  const initials = encodeHtml(dataRecordInitials(row.customerName))
  const image = customerImageData(row.photo)
  const fallback = `<span class="data-record-avatar customer-avatar-fallback" aria-hidden="true">${initials}</span>`
  if (!image) return fallback
  return `<button type="button" class="data-record-avatar customer-avatar-trigger image-fit-${image.fit}" ${customerImagePreviewAttributes(row, image, deps)}><img src="${encodeHtml(image.src)}" alt="" data-customer-image><span class="data-record-avatar customer-avatar-fallback" aria-hidden="true" hidden>${initials}</span></button>`
}

/**
 * Record-page photo field (renderCustomerField's 'photo' type), reading the
 * currently open record's own data rather than a list row.
 * @param {{src?: string, alt?: string, fit?: string}|null} photo
 * @param {{customerName: string, customerNo: string}} recordIdentity
 * @param {{encodeHtml: Function}} deps
 */
export function renderCustomerRecordPhoto(photo, recordIdentity, deps) {
  const {encodeHtml} = deps
  const row = {
    customerName: recordIdentity.customerName || 'New customer',
    customerNo: recordIdentity.customerNo || 'Unsaved',
  }
  const initials = encodeHtml(dataRecordInitials(row.customerName))
  const image = customerImageData(photo)
  if (!image) return `<span class="customer-photo-preview customer-avatar-fallback" aria-hidden="true">${initials}</span>`
  return `<button type="button" class="customer-photo-preview customer-avatar-trigger image-fit-${image.fit}" ${customerImagePreviewAttributes(row, image, deps)}><img src="${encodeHtml(image.src)}" alt="${encodeHtml(image.alt)}" data-customer-image><span class="customer-photo-preview customer-avatar-fallback" aria-hidden="true" hidden>${initials}</span></button>`
}

/**
 * Owns the single shared #customer-image-popover element's open/position/
 * close/hover-intent-timer behavior, plus the page-wide pointerover/
 * pointerout/error delegated listeners the original registered once on
 * `document` (image preview triggers can appear inside the customer list
 * OR the customer record, so this stays document-delegated exactly as
 * before — not root-scoped, since the popover itself is a single page-wide
 * singleton, same reasoning Task 6 applied to the data-list context menu).
 * @param {{popover: HTMLElement}} options
 * @returns {{dispose: Function}}
 */
export function createImagePreview({popover}) {
  const media = popover.querySelector('.customer-image-popover-media')
  const image = media.querySelector('img')
  const nameEl = document.getElementById('customer-image-popover-name')
  const numberEl = document.getElementById('customer-image-popover-number')
  let trigger = null
  let pinned = false
  let openTimer = 0
  let closeTimer = 0

  function clearTimers() {
    clearTimeout(openTimer)
    clearTimeout(closeTimer)
    openTimer = 0
    closeTimer = 0
  }

  function position(anchorTrigger) {
    if (!anchorTrigger?.isConnected || !popover.matches(':popover-open')) return
    const margin = 8
    const gap = 8
    const anchor = anchorTrigger.getBoundingClientRect()
    const preview = popover.getBoundingClientRect()
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
    const top = Math.max(margin, Math.min(centeredTop, window.innerHeight - preview.height - margin))
    popover.style.left = `${Math.round(left)}px`
    popover.style.top = `${Math.round(top)}px`
  }

  function resetState() {
    trigger?.setAttribute('aria-expanded', 'false')
    trigger = null
    pinned = false
    clearTimers()
  }

  function open(anchorTrigger, {pinned: pin = false} = {}) {
    const src = anchorTrigger?.dataset.customerImageSrc
    if (!CUSTOMER_IMAGE_SOURCES.has(src)) return
    clearTimers()
    if (trigger !== anchorTrigger) trigger?.setAttribute('aria-expanded', 'false')
    trigger = anchorTrigger
    pinned = pin
    trigger.setAttribute('aria-expanded', 'true')
    image.src = src
    image.alt = trigger.dataset.customerImageAlt || 'Customer image'
    media.dataset.fit = trigger.dataset.customerImageFit === 'contain' ? 'contain' : 'cover'
    nameEl.textContent = trigger.dataset.customerImageName || 'Customer'
    numberEl.textContent = trigger.dataset.customerImageNumber || ''
    if (!popover.matches(':popover-open')) popover.showPopover()
    requestAnimationFrame(() => position(trigger))
  }

  function close() {
    clearTimers()
    if (popover.matches(':popover-open')) popover.hidePopover()
    resetState()
  }

  function scheduleOpen(anchorTrigger) {
    clearTimeout(closeTimer)
    if (pinned) return
    clearTimeout(openTimer)
    openTimer = setTimeout(() => open(anchorTrigger), 120)
  }

  function scheduleClose() {
    clearTimeout(openTimer)
    if (pinned) return
    clearTimeout(closeTimer)
    closeTimer = setTimeout(close, 160)
  }

  function handleImageError(event) {
    const img = event.target
    if (!(img instanceof HTMLImageElement) || !img.matches('[data-customer-image]')) return
    const errorTrigger = img.closest('[data-customer-image-preview]')
    const fallback = errorTrigger?.querySelector('.customer-avatar-fallback')
    if (!errorTrigger || !fallback) return
    if (errorTrigger === trigger) close()
    fallback.hidden = false
    errorTrigger.replaceWith(fallback)
  }

  function handlePointerOver(event) {
    const anchorTrigger = event.target.closest?.('[data-customer-image-preview]')
    if (!anchorTrigger || (event.pointerType && event.pointerType !== 'mouse')) return
    if (event.relatedTarget && anchorTrigger.contains(event.relatedTarget)) return
    scheduleOpen(anchorTrigger)
  }

  function handlePointerOut(event) {
    const anchorTrigger = event.target.closest?.('[data-customer-image-preview]')
    if (!anchorTrigger || (event.pointerType && event.pointerType !== 'mouse')) return
    if (event.relatedTarget && anchorTrigger.contains(event.relatedTarget)) return
    if (event.relatedTarget && popover.contains(event.relatedTarget)) return
    scheduleClose()
  }

  function handleFocusIn(event) {
    const anchorTrigger = event.target.closest?.('[data-customer-image-preview]')
    if (anchorTrigger) open(anchorTrigger)
  }

  function handleFocusOut(event) {
    const anchorTrigger = event.target.closest?.('[data-customer-image-preview]')
    if (!anchorTrigger || pinned) return
    if (event.relatedTarget && popover.contains(event.relatedTarget)) return
    scheduleClose()
  }

  function handleClick(event) {
    if (event.target.closest?.('[data-customer-image-close]')) {
      close()
      return
    }
    const anchorTrigger = event.target.closest?.('[data-customer-image-preview]')
    if (!anchorTrigger) return
    event.preventDefault()
    if (anchorTrigger === trigger && pinned) close()
    else open(anchorTrigger, {pinned: true})
  }

  function handlePopoverPointerEnter() {
    clearTimeout(closeTimer)
  }

  function handlePopoverToggle(event) {
    if (event.newState === 'closed') resetState()
  }

  function handleScroll() {
    if (popover.matches(':popover-open')) close()
  }

  function handleResize() {
    if (trigger) position(trigger)
  }

  document.addEventListener('error', handleImageError, true)
  document.addEventListener('pointerover', handlePointerOver)
  document.addEventListener('pointerout', handlePointerOut)
  document.addEventListener('focusin', handleFocusIn)
  document.addEventListener('focusout', handleFocusOut)
  document.addEventListener('click', handleClick)
  popover.addEventListener('pointerenter', handlePopoverPointerEnter)
  popover.addEventListener('pointerleave', scheduleClose)
  popover.addEventListener('toggle', handlePopoverToggle)
  document.addEventListener('scroll', handleScroll, true)
  window.addEventListener('resize', handleResize)

  return {
    open,
    close,
    scheduleOpen,
    scheduleClose,
    dispose() {
      clearTimers()
      document.removeEventListener('error', handleImageError, true)
      document.removeEventListener('pointerover', handlePointerOver)
      document.removeEventListener('pointerout', handlePointerOut)
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
      document.removeEventListener('click', handleClick)
      popover.removeEventListener('pointerenter', handlePopoverPointerEnter)
      popover.removeEventListener('pointerleave', scheduleClose)
      popover.removeEventListener('toggle', handlePopoverToggle)
      document.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
    },
  }
}
