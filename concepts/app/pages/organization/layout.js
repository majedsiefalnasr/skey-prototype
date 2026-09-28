export function renderOrganizationNav(sectionOrder, sections, activeKey, encodeHtml) {
  const buttons = sectionOrder.map(key => {
    const current = key === activeKey
    return `<button type="button" id="organization-tab-${encodeHtml(key)}" data-organization-section="${encodeHtml(key)}" aria-controls="organization-section-${encodeHtml(key)}"${current ? ' aria-current="page"' : ''} tabindex="${current ? '0' : '-1'}"><span>${encodeHtml(sections[key].title)}</span></button>`
  }).join('')

  return `<nav class="organization-nav sticky [top:0] [z-index:2] grid [gap:1px] [padding:8px] [border:1px_solid_var(--line)] rounded-lg bg-surface [box-shadow:var(--shadow-1)] [&_button]:[min-height:36px] [&_button]:[padding:8px_9px] [&_button]:[border:0] [&_button]:rounded-md [&_button]:text-ink [&_button]:[background:transparent] [&_button]:[font:inherit] [&_button]:text-start [&_button]:[cursor:pointer] [&_button:hover]:bg-[var(--line-2)] [&_button[aria-current=page]]:bg-[var(--accent-soft)] [&_button[aria-current=page]]:text-accent [&_button[aria-current=page]]:font-semibold [&_button:focus-visible]:[outline:2px_solid_var(--focus)] [&_button:focus-visible]:[outline-offset:-2px] [@media((max-width:720px))]:flex [@media((max-width:720px))]:overflow-x-auto [@media((max-width:720px))]:whitespace-nowrap [@media((max-width:720px))]:[&_button]:[flex:none]" aria-label="Organization sections">${buttons}</nav>`
}

