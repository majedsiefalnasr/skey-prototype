import {uiLocale} from '../../core/locale.js'
const {t} = uiLocale
import {escapeHtml, icon, field} from './fields.js'

export const multiselect = ({id, label, options, selected = [], required = false, hint = '', placeholder = 'Search…', wide = false}) => {
  const chosen = new Set(selected)
  const chip = value => {
    const option = options.find(([optionValue]) => optionValue === value)
    const text = option ? option[1] : value
    return `<span class="inline-flex items-center gap-1 rounded-full bg-[var(--line-2)] px-2 py-0.5 text-xs text-ink">${escapeHtml(
      text
    )}<button type="button" class="grid size-[15px] place-items-center rounded-full border-0 bg-transparent p-0 text-muted hover:text-ink [@media(pointer:coarse)]:size-6 [@media(pointer:coarse)]:min-h-0! [@media(pointer:coarse)]:min-w-0! [@media(pointer:coarse)]:-my-1" data-ms-off="${escapeHtml(
      value
    )}" aria-label="Remove ${escapeHtml(text)}">${icon('i-x', 10)}</button></span>`
  }
  const control = `<div class="relative" data-ms="${escapeHtml(id)}">
    <div class="flex min-h-[34px] flex-wrap items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-[4px] hover:border-[var(--accent-line)] focus-within:border-[var(--accent)] focus-within:[box-shadow:0_0_0_3px_var(--accent-soft)]">
      <span data-ms-chips class="contents">${[...chosen].map(chip).join('')}</span>
      <input type="text" id="${escapeHtml(id)}" name="${escapeHtml(
    id
  )}" data-ms-input role="combobox" aria-expanded="false" aria-controls="${escapeHtml(id)}-list" aria-autocomplete="list" autocomplete="off" class="min-w-[120px] flex-1 w-auto! h-6! border-0! rounded-none! bg-transparent! px-0.5! py-0! text-[14px] text-ink outline-none shadow-none!" placeholder="${escapeHtml(t(placeholder))}">
      ${[...chosen].map(value => `<input type="hidden" value="${escapeHtml(value)}" data-ms-val="${escapeHtml(value)}">`).join('')}
      <button type="button" class="grid size-[22px] flex-none place-items-center rounded border-0 bg-transparent p-0 text-muted hover:text-ink" data-ms-clear aria-label="${escapeHtml(t("Clear selection"))}" title="${escapeHtml(t("Clear selection"))}"${
        chosen.size ? '' : ' hidden'
      }>${icon('i-x', 13)}</button>
    </div>
    <ul id="${escapeHtml(id)}-list" role="listbox" aria-multiselectable="true" aria-label="${escapeHtml(t(label))}" hidden class="absolute inset-x-0 top-full z-[130] mt-1 max-h-52 overflow-auto rounded-md border border-line bg-surface p-1 [box-shadow:var(--shadow-1)]">${options
      .map(
        ([value, text]) =>
          `<li role="option" id="${escapeHtml(id)}-opt-${escapeHtml(
            value
          )}" aria-selected="${chosen.has(value)}" data-ms-opt="${escapeHtml(value)}" data-ms-label="${escapeHtml(
            text
          )}" class="flex min-h-8 cursor-pointer items-center gap-2 rounded-[5px] px-2 text-[13px] text-ink hover:bg-[var(--line-2)] aria-selected:bg-[var(--line-2)]"><span class="grid size-4 flex-none place-items-center text-muted" aria-hidden="true">${
            chosen.has(value) ? icon('i-check', 13) : ''
          }</span><span class="min-w-0 flex-1 truncate">${escapeHtml(text)}</span></li>`
      )
      .join('')}</ul>
  </div>`
  return field({id, label, required, wide, hint, control})
}

export const multiselectValues = (root, id) =>
  [...root.querySelectorAll(`[data-ms="${CSS.escape(id)}"] [data-ms-val]`)].map(input => input.value)

export function bindMultiselect(root) {
  root.querySelectorAll('[data-ms]').forEach(box => {
    if (box.dataset.msBound) return
    box.dataset.msBound = '1'
    const id = box.dataset.ms
    const input = box.querySelector('[data-ms-input]')
    const list = box.querySelector(`#${CSS.escape(`${id}-list`)}`)
    const chips = box.querySelector('[data-ms-chips]')
    const options = [...list.querySelectorAll('[data-ms-opt]')]
    const labels = new Map(options.map(option => [option.dataset.msOpt, option.dataset.msLabel]))
    let active = null

    const values = () => [...box.querySelectorAll('[data-ms-val]')].map(hidden => hidden.value)
    const isOpen = () => !list.hidden

    const open = () => {
      list.hidden = false
      input.setAttribute('aria-expanded', 'true')
    }
    const close = () => {
      list.hidden = true
      input.setAttribute('aria-expanded', 'false')
      input.removeAttribute('aria-activedescendant')
      active = null
    }

    const applyFilter = () => {
      const query = input.value.trim().toLowerCase()
      options.forEach(option => {
        option.hidden = query ? !option.dataset.msLabel.toLowerCase().includes(query) : false
      })
      active = options.find(option => !option.hidden) || null
      input.removeAttribute('aria-activedescendant')
    }

    const highlight = () => {
      options.forEach(option => option.classList.toggle('bg-[var(--line-2)]', option === active))
      if (active) input.setAttribute('aria-activedescendant', active.id)
    }

    const sync = value => {
      const nowSelected = !values().includes(value)
      const option = options.find(candidate => candidate.dataset.msOpt === value)
      option?.setAttribute('aria-selected', String(nowSelected))
      if (option) option.firstElementChild.innerHTML = nowSelected ? icon('i-check', 13) : ''
      if (nowSelected) {
        chips.insertAdjacentHTML(
          'beforeend',
          `<span class="inline-flex items-center gap-1 rounded-full bg-[var(--line-2)] px-2 py-0.5 text-xs text-ink">${escapeHtml(
            labels.get(value) || value
          )}<button type="button" class="grid size-[15px] place-items-center rounded-full border-0 bg-transparent p-0 text-muted hover:text-ink [@media(pointer:coarse)]:size-6 [@media(pointer:coarse)]:min-h-0! [@media(pointer:coarse)]:min-w-0! [@media(pointer:coarse)]:-my-1" data-ms-off="${escapeHtml(
            value
          )}" aria-label="Remove ${escapeHtml(labels.get(value) || value)}">${icon('i-x', 10)}</button></span>`
        )
        chips.parentElement?.append(hiddenFor(value))
      } else {
        chips.querySelector(`[data-ms-off="${CSS.escape(value)}"]`)?.closest('span')?.remove()
        box.querySelector(`[data-ms-val="${CSS.escape(value)}"]`)?.remove()
      }
      if (input.value.trim()) applyFilter()
      if (nowSelected) {
        open()
        input.focus()
      } else {
        close()
      }
      syncClear()
    }

    const hiddenFor = value => {
      const hidden = document.createElement('input')
      hidden.type = 'hidden'
      hidden.value = value
      hidden.setAttribute('data-ms-val', value)
      return hidden
    }

    const syncClear = () => {
      const clear = box.querySelector('[data-ms-clear]')
      if (clear) clear.hidden = !values().length
    }

    const clearAll = () => {
      values().forEach(value => {
        chips.querySelector(`[data-ms-off="${CSS.escape(value)}"]`)?.closest('span')?.remove()
        box.querySelector(`[data-ms-val="${CSS.escape(value)}"]`)?.remove()
        const option = options.find(candidate => candidate.dataset.msOpt === value)
        option?.setAttribute('aria-selected', 'false')
        if (option) option.firstElementChild.innerHTML = ''
      })
      syncClear()
      input.value = ''
      applyFilter()
      open()
      input.focus()
    }

    const toggle = value => sync(value)

    input.addEventListener('focus', () => {
      open()
      applyFilter()
      highlight()
    })
    input.addEventListener('input', () => {
      open()
      applyFilter()
      highlight()
    })
    input.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        if (isOpen()) {
          event.preventDefault()
          event.stopPropagation()
          close()
        }
        return
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        if (!isOpen()) open()
        const visible = options.filter(option => !option.hidden)
        if (!visible.length) return
        const at = visible.indexOf(active)
        const next = event.key === 'ArrowDown' ? Math.min(at + 1, visible.length - 1) : Math.max(at - 1, 0)
        active = visible[next] ?? visible[0]
        highlight()
        return
      }
      if (event.key === 'Enter') {
        if (isOpen() && active) {
          event.preventDefault()
          toggle(active.dataset.msOpt)
        }
        return
      }
      if (event.key === 'Backspace' && !input.value) {
        const last = [...chips.querySelectorAll('[data-ms-off]')].pop()
        if (last) toggle(last.dataset.msOff)
      }
    })
    box.addEventListener('mousedown', event => {
      if (event.target.closest('[data-ms-opt], [data-ms-off], [data-ms-clear]')) event.preventDefault()
    })
    box.addEventListener('click', event => {
      if (event.target.closest('[data-ms-clear]')) {
        clearAll()
        return
      }
      const off = event.target.closest('[data-ms-off]')
      if (off) {
        toggle(off.dataset.msOff)
        return
      }
      const option = event.target.closest('[data-ms-opt]')
      if (option) toggle(option.dataset.msOpt)
    })
    box.addEventListener('focusout', event => {
      if (!box.contains(event.relatedTarget)) close()
    })
  })
}
