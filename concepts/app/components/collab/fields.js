// Form + toolbar building blocks shared by the collaboration screens.
// The field look is the same `rec-field` treatment the Customers dialogs
// use (bordered 6px/8px controls, accent-line hover, accent-soft focus
// ring, RTL-aware select arrow), so every editor shares one form framework.
import {encodeHtml} from '../../core/locale.js'

export const escapeHtml = encodeHtml

export const FIELD_CLASS =
  'rec-field grid gap-1 [&>label]:text-xs [&>label]:text-muted [&_input:not([type=checkbox]):not([type=radio])]:w-full [&_input:not([type=checkbox]):not([type=radio])]:[padding:6px_8px] [&_input:not([type=checkbox]):not([type=radio])]:[border:1px_solid_var(--line)] [&_input]:rounded-md [&_input]:[font:inherit] [&_input]:text-ink [&_input]:bg-surface [&_select]:w-full [&_select]:[padding:6px_28px_6px_8px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-md [&_select]:[font:inherit] [&_select]:text-ink [&_select]:bg-surface [&_select]:[appearance:none] [&_select]:[background-image:url(data:image/svg+xml,%3Csvg_xmlns=http://www.w3.org/2000/svg_width=12_height=12_viewBox=0_0_12_12%3E%3Cpath_fill=%2344546f_d=M2.5_4.5_6_8l3.5-3.5z/%3E%3C/svg%3E)] [&_select]:[background-repeat:no-repeat] [&_select]:[background-position:right_8px_center] [&_select]:[background-size:12px] [[dir=rtl]_&_select]:[padding:6px_8px_6px_28px] [[dir=rtl]_&_select]:[background-position:left_8px_center] [&_textarea]:w-full [&_textarea]:[padding:6px_8px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-md [&_textarea]:[font:inherit] [&_textarea]:text-ink [&_textarea]:bg-surface [&_textarea]:[resize:vertical] [&_:is(input,select,textarea):hover]:[border-color:var(--accent-line)] [&_:is(input,select,textarea):focus-visible]:[outline:none] [&_:is(input,select,textarea):focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_:is(input,select,textarea):focus-visible]:[border-color:var(--accent)] [&_[aria-invalid=true]]:[border-color:var(--danger)]!'

export const GRID_CLASS = 'grid grid-cols-1 gap-3 sm:grid-cols-2'
export const SECTION_TITLE_CLASS = 'mb-2 text-xs font-semibold uppercase tracking-[.04em] text-faint'
export const ERROR_CLASS = 'text-xs text-[color:var(--danger)]'
export const HINT_CLASS = 'text-xs text-muted'
export const CHIP_CLASS =
  'inline-flex items-center gap-1 rounded-full bg-[var(--line-2)] px-2 py-0.5 text-xs text-ink'
/** Read-only record view: a definition list of label/value rows, the
 *  panel's view mode counterpart to the editor grid. */
export const VIEW_LIST_CLASS = 'm-0 grid grid-cols-[minmax(88px,auto)_minmax(0,1fr)] items-baseline gap-x-4 gap-y-3 text-sm'
export const VIEW_LABEL_CLASS = 'text-xs font-semibold uppercase tracking-[.04em] text-faint'

/** One read-only row; `valueHtml` is trusted (already escaped or built
 *  from the icon/chip helpers above). */
export const viewRow = (label, valueHtml) =>
  `<dt class="${VIEW_LABEL_CLASS}">${escapeHtml(label)}</dt><dd class="m-0 min-w-0 text-ink [overflow-wrap:anywhere]">${valueHtml}</dd>`

const attrs = map =>
  Object.entries(map)
    .filter(([, value]) => value !== undefined && value !== false && value !== null)
    .map(([key, value]) => (value === true ? ` ${key}` : ` ${key}="${escapeHtml(value)}"`))
    .join('')

/** A labelled field wrapper; `control` is trusted markup built by the
 *  helpers below. `wide` spans both grid columns. */
export function field({id, label, required = false, control, hint = '', wide = false}) {
  const mark = required ? ' <span aria-hidden="true" class="text-[color:var(--danger)]">*</span>' : ''
  return `<div class="${FIELD_CLASS}${wide ? ' sm:col-span-2' : ''}" data-field="${escapeHtml(id)}">
    <label for="${escapeHtml(id)}">${escapeHtml(label)}${mark}</label>${control}
    ${hint ? `<p class="${HINT_CLASS}" id="${escapeHtml(id)}-hint">${escapeHtml(hint)}</p>` : ''}
    <p class="${ERROR_CLASS}" id="${escapeHtml(id)}-error" hidden></p>
  </div>`
}

export const textInput = ({id, value = '', required = false, type = 'text', placeholder, describedBy, extra = {}}) =>
  `<input${attrs({id, name: id, type, value, required, placeholder, dir: type === 'text' ? 'auto' : undefined, 'aria-describedby': describedBy, ...extra})}>`

export const selectInput = ({id, value = '', options, extra = {}}) =>
  `<select${attrs({id, name: id, ...extra})}>${options
    .map(([optionValue, label]) => `<option value="${escapeHtml(optionValue)}"${String(optionValue) === String(value) ? ' selected' : ''}>${escapeHtml(label)}</option>`)
    .join('')}</select>`

export const textarea = ({id, value = '', rows = 4, placeholder}) =>
  `<textarea${attrs({id, name: id, rows, placeholder, dir: 'auto'})}>${escapeHtml(value)}</textarea>`

/** Atlassian-style switch. The real checkbox stays in the DOM — so it can be
 *  checked, labelled and collected by the panel — and the `peer` styling
 *  does the rest; the same pattern the Profile appearance toggles use. Every
 *  boolean control on the collaboration screens is one of these. */
export const switchInput = ({id, label, checked = false} = {}) =>
  `<label class="inline-flex min-h-8 items-center gap-2 text-[13px] text-ink" for="${escapeHtml(id)}">
    <span class="switch relative inline-flex h-[17px] w-[30px] flex-none">
      <input type="checkbox" role="switch" id="${escapeHtml(id)}" name="${escapeHtml(id)}" class="peer absolute inset-0 m-0 cursor-pointer opacity-0"${checked ? ' checked' : ''}>
      <span class="pointer-events-none absolute inset-0 rounded-full bg-line transition-[background] duration-[120ms] before:absolute before:start-0.5 before:top-0.5 before:size-[13px] before:rounded-full before:bg-inverse before:transition-[translate] before:duration-[120ms] before:content-[''] peer-checked:bg-accent peer-checked:before:translate-x-[13px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)] rtl:peer-checked:before:-translate-x-[13px]"></span>
    </span> ${escapeHtml(label)}
  </label>`

/** Show/clear an inline error under a field built with field(). */
export function setFieldError(root, id, message) {
  const control = root.querySelector(`#${CSS.escape(id)}`)
  const error = root.querySelector(`#${CSS.escape(id)}-error`)
  if (!control || !error) return
  error.textContent = message || ''
  error.hidden = !message
  if (message) {
    control.setAttribute('aria-invalid', 'true')
    control.setAttribute('aria-describedby', `${id}-error`)
  } else {
    control.removeAttribute('aria-invalid')
    control.removeAttribute('aria-describedby')
  }
}

export const icon = (name, size = 14) =>
  `<svg width="${size}" height="${size}" aria-hidden="true"><use href="#${name}"/></svg>`

/* ---------- toolbar pieces ---------- */
/* One control box for every toolbar input on the collaboration screens —
   the same 32px height, border, radius and type the rest of the app's
   toolbars use. Selects swap the browser's arrow for the same drawn one
   `rec-field` uses, so a toolbar select and a form select are one control. */
const CONTROL_BASE =
  'min-h-8 rounded-md border border-line bg-surface py-1 text-[13px] text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)]'
const SELECT_SKIN =
  '[appearance:none] [background-image:url(data:image/svg+xml,%3Csvg_xmlns=http://www.w3.org/2000/svg_width=12_height=12_viewBox=0_0_12_12%3E%3Cpath_fill=%2344546f_d=M2.5_4.5_6_8l3.5-3.5z/%3E%3C/svg%3E)] [background-repeat:no-repeat] [background-position:right_8px_center] [background-size:12px] rtl:[background-position:left_8px_center]'

export const TOOLBAR_CONTROL_CLASS = `${CONTROL_BASE} ps-2 pe-2`
export const SELECT_CONTROL_CLASS = `${CONTROL_BASE} ps-2 pe-7 ${SELECT_SKIN}`

export const searchBox = ({id, label, value = ''}) =>
  `<label class="flex min-h-8 min-w-[160px] flex-1 items-center gap-2 rounded-md border border-line bg-surface px-2 text-faint sm:max-w-[240px] focus-within:[box-shadow:0_0_0_3px_var(--accent-soft)]" for="${id}">${icon('i-search', 13)}<input type="search" id="${id}" class="min-w-0 flex-1 border-0 bg-transparent py-1 text-[13px] text-ink outline-none" placeholder="${escapeHtml(label)}" aria-label="${escapeHtml(label)}" value="${escapeHtml(value)}" autocomplete="off"></label>`

export const toolbarSelect = ({id, label, value, options}) =>
  `<label class="inline-flex items-center gap-1.5 text-xs text-muted" for="${id}">${escapeHtml(label)} ${selectInput({id, value, options, extra: {class: SELECT_CONTROL_CLASS}})}</label>`

/** A hairline between toolbar groups, the same rule the message action row
 *  uses. Hidden from assistive tech: it separates, it isn't content. */
export const TOOLBAR_SEP = '<span class="mx-1 h-5 w-px flex-none bg-line" aria-hidden="true"></span>'

export const toolbarToggle = ({id, label, checked}) => switchInput({id, label, checked})

/** A pressed-state filter chip for the toolbar row: reads as a filter you
 *  toggle on/off (not a form control), announces its state through
 *  aria-pressed, and only spends accent color while it is on. */
export const toolbarChip = ({id, label, pressed, iconName}) =>
  `<button type="button" id="${escapeHtml(id)}" aria-pressed="${pressed}" class="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-[13px] font-medium text-muted hover:bg-[var(--line-2)] hover:text-ink aria-pressed:border-[var(--accent-line)] aria-pressed:bg-[var(--accent-soft)] aria-pressed:text-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)]">${iconName ? icon(iconName, 12) : ''}<span>${escapeHtml(label)}</span></button>`

/** Segmented view switch. Buttons carry aria-pressed so the current view
 *  is announced, not just colored, and each view names itself with an icon
 *  plus its label. */
export const segmented = ({label, views, current, dataAttr = 'data-view-switch'}) =>
  `<div class="inline-flex overflow-hidden rounded-md border border-line" role="group" aria-label="${escapeHtml(label)}" ${dataAttr}>${views
    .map(([id, text, iconName]) =>
      `<button type="button" data-value="${escapeHtml(id)}" aria-pressed="${id === current}" class="inline-flex min-h-8 items-center gap-1.5 border-0 border-e border-line bg-surface px-2.5 text-[13px] font-medium text-ink last:border-e-0 hover:bg-[var(--line-2)] aria-pressed:bg-[var(--accent-soft)] aria-pressed:text-accent focus-visible:relative focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)]">${iconName ? icon(iconName, 14) : ''}<span>${escapeHtml(text)}</span></button>`
    )
    .join('')}</div>`

export const emptyState = ({iconName = 'i-info', title, body = ''}) =>
  `<div class="mx-auto my-10 grid max-w-[420px] justify-items-center gap-1.5 text-center" data-empty>
    <span class="grid size-9 place-items-center rounded-full bg-[var(--line-2)] text-muted">${icon(iconName, 16)}</span>
    <h3 class="text-sm font-semibold text-ink">${escapeHtml(title)}</h3>
    ${body ? `<p class="text-[13px] text-muted">${escapeHtml(body)}</p>` : ''}
  </div>`

export const TABLE_CLASS =
  'w-full border-collapse text-[13px] [&_th]:border-b [&_th]:border-line [&_th]:px-3 [&_th]:py-2 [&_th]:text-start [&_th]:text-xs [&_th]:font-semibold [&_th]:text-muted [&_td]:border-b [&_td]:border-[var(--line-2)] [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_tbody_tr:hover]:bg-[var(--hover-overlay)]'
export const ROW_BUTTON_CLASS =
  'border-0 bg-transparent p-0 text-start font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] [overflow-wrap:anywhere]'
