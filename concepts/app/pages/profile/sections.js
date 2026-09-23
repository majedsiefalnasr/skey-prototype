// Profile page section bodies. Each group of fields is wrapped in the
// codebase's shared .rec-card/.rec-card-hd/.rec-card-body primitive (the
// same one pages/invoices/templates.html and the customer record's own
// renderSection/renderCollapsible already use) instead of a bespoke
// fieldset-legend pattern, so these cards automatically follow the
// prototype's card-style toggle (standard vs. fieldset, body.cards-fieldset
// in styles/tailwind/customers.css) exactly like every other record page.
// The Appearance section's field markup (ids, structure) stays verbatim —
// only its outer wrapper changes — since shell/appearance.js's
// bindAppearanceSection() depends on those exact ids existing.

// .rec-card-hd is the clickable collapse toggle — same contract
// pages/invoices/record.js wires for its own .rec-card instances
// (click flips aria-expanded and hides/shows nextElementSibling), so the
// same delegated listener works for both without a profile-specific
// collapse mechanism.
function renderCard(title, bodyHtml, extraClass = '') {
  const classAttr = extraClass ? `${extraClass} rec-card` : 'rec-card'
  return `<div class="${classAttr} [border:1px_solid_var(--line)] rounded-lg mb-3! overflow-hidden">
    <button type="button" class="rec-card-hd flex items-center justify-between gap-2.5 w-full text-start [padding:8px_12px] [font-size:12.5px]! font-bold! bg-[var(--line-2)]! border-0! [cursor:pointer]" aria-expanded="true">${title}</button>
    <div class="rec-card-body [padding:12px]">${bodyHtml}</div>
  </div>`
}

// .rec-field is the app's shared field-wrapper class: the prototype's
// #input-style demo control (standard/floating/inline) targets .rec-field
// directly, so every real field on every record page (pages/customers/
// fields.js, pages/invoices/templates.html) carries this exact class plus
// this exact utility set — copied verbatim here rather than inventing a
// separate input treatment for the profile page.
const REC_FIELD_CLASS =
  'rec-field [&_label]:block [&_label]:text-xs [&_label]:text-muted [&_label]:[margin-bottom:3px]! [&_input]:w-full [&_input]:[padding:6px_8px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-md [&_input]:[font:inherit] [&_input]:text-ink [&_input]:bg-surface [&_select]:w-full [&_select]:[padding:6px_8px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-md [&_select]:[font:inherit] [&_select]:text-ink [&_select]:bg-surface [&_textarea]:w-full [&_textarea]:[padding:6px_8px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-md [&_textarea]:[font:inherit] [&_textarea]:text-ink [&_textarea]:bg-surface [&_textarea]:[resize:vertical] [&_input:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_select:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_textarea:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_input:focus-visible]:[outline:none] [&_input:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_select:focus-visible]:[outline:none] [&_select:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_textarea:focus-visible]:[outline:none] [&_textarea:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_input:disabled]:bg-[var(--line-2)]! [&_input:disabled]:text-muted! [&_select:disabled]:bg-[var(--line-2)]! [&_select:disabled]:text-muted! [&_textarea:disabled]:bg-[var(--line-2)]! [&_textarea:disabled]:text-muted! [&_select]:[appearance:none] [&_select]:[-webkit-appearance:none] [&_select]:[padding-inline-end:28px] [&_select]:[background-image:url(data:image/svg+xml,%3Csvg_xmlns=http://www.w3.org/2000/svg_width=12_height=12_viewBox=0_0_12_12%3E%3Cpath_fill=%2344546f_d=M2.5_4.5_6_8l3.5-3.5z/%3E%3C/svg%3E)] [&_select]:[background-repeat:no-repeat] [&_select]:[background-position:right_8px_center] [&_select]:[background-size:12px] [[dir=rtl]_&_select]:[padding-inline-end:8px] [[dir=rtl]_&_select]:[padding-inline-start:28px] [[dir=rtl]_&_select]:[background-position:left_8px_center]'

function renderProfileField({id, label, type = 'text', value, encodeHtml, readonly = false, options}) {
  const disabledAttr = readonly ? ' disabled' : ''
  if (type === 'select') {
    const optionMarkup = options
      .map(opt => `<option value="${encodeHtml(opt.value)}"${opt.value === value ? ' selected' : ''}>${encodeHtml(opt.label)}</option>`)
      .join('')
    return `<div class="${REC_FIELD_CLASS}"><label for="${id}">${encodeHtml(label)}</label><select id="${id}"${disabledAttr}>${optionMarkup}</select></div>`
  }
  return `<div class="${REC_FIELD_CLASS}"><label for="${id}">${encodeHtml(label)}</label><input id="${id}" type="${type}" value="${encodeHtml(value)}"${disabledAttr}></div>`
}

function renderProfileIdentityHeader(currentUser, encodeHtml) {
  return `<div class="profile-identity-header flex items-center gap-3 [padding:16px] [border-bottom:1px_solid_var(--line)]">
    <span class="avatar inline-flex size-14 items-center justify-center rounded-full bg-[var(--line-2)] text-muted" aria-hidden="true"><svg width="26" height="26"><use href="#i-user" /></svg></span>
    <div>
      <b class="block text-[16px] text-ink">${encodeHtml(currentUser.name)}</b>
      <span class="block text-[13px] text-muted">${encodeHtml(currentUser.jobTitle)} · ${encodeHtml(currentUser.branch)}</span>
      <span class="block text-[13px] text-muted">${encodeHtml(currentUser.email)}</span>
    </div>
  </div>`
}

function renderProfileSection(currentUser, encodeHtml) {
  // Single identity card, fields + photo side-by-side — same
  // customer-identity-body layout the customer record's identity section
  // uses (pages/customers/record.js:160): a fields grid on the start side,
  // a photo box pinned to the end, one card instead of two.
  const initials = encodeHtml(
    (currentUser.name || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase() || '?'
  )
  const fieldsHtml = [
    renderProfileField({id: 'profile-name', label: 'Full name', value: currentUser.name, encodeHtml}),
    renderProfileField({id: 'profile-job-title', label: 'Job title', value: currentUser.jobTitle, encodeHtml}),
    renderProfileField({id: 'profile-email', label: 'Email', type: 'email', value: currentUser.email, encodeHtml}),
    renderProfileField({id: 'profile-phone', label: 'Phone', type: 'tel', value: currentUser.phone, encodeHtml}),
    renderProfileField({
      id: 'profile-locale',
      label: 'Locale',
      type: 'select',
      value: currentUser.locale,
      encodeHtml,
      options: [
        {value: 'en', label: 'English'},
        {value: 'ar', label: 'Arabic'},
      ],
    }),
    renderProfileField({id: 'profile-timezone', label: 'Timezone', value: currentUser.timezone, encodeHtml}),
  ].join('')
  // Photo box matches the customer record's identity-section photo field
  // (pages/customers/record.js: `[border:1px_dashed_var(--line)] rounded-lg`
  // dashed placeholder, label above, action button below) — kept to a
  // static initials circle rather than customer's full image-preview/zoom
  // popover, which is a separate component (images.js) out of this scope.
  const photoBoxHtml = `<div class="${REC_FIELD_CLASS} grid [place-items:center] gap-2 [min-height:120px] [padding:12px] [border:1px_dashed_var(--line)] rounded-lg h-full [min-height:280px]">
    <label for="profile-photo-select">Profile photo</label>
    <span class="grid [place-items:center] [width:min(164px,_100%)] [aspect-ratio:1] [padding:0] overflow-hidden text-muted [border:1px_solid_var(--line)] [border-radius:999px] bg-[var(--line-2)] [font-size:20px] font-bold" aria-hidden="true">${initials}</span>
    <button type="button" class="lbtn out" id="profile-photo-select"><svg width="15" height="15" aria-hidden="true"><use href="#i-clip" /></svg> Select photo</button>
  </div>`
  return renderCard(
    'Personal information',
    `<div class="grid [grid-template-columns:minmax(0,_1fr)_minmax(150px,_260px)] items-start [@media((max-width:720px))]:[grid-template-columns:minmax(0,_1fr)]">
      <div class="grid [grid-template-columns:repeat(auto-fit,_minmax(260px,_1fr))] [gap:10px_16px] [padding:12px]">${fieldsHtml}</div>
      <div class="[padding:12px_12px_12px_0] [@media((max-width:720px))]:[padding:0_12px_12px]">${photoBoxHtml}</div>
    </div>`
  )
}

function renderAccountSection(currentUser, encodeHtml) {
  const fieldsHtml = [
    renderProfileField({id: 'profile-username', label: 'Username', value: currentUser.username, encodeHtml, readonly: true}),
    renderProfileField({id: 'profile-branch', label: 'Branch', value: currentUser.branch, encodeHtml, readonly: true}),
    renderProfileField({
      id: 'profile-landing-page',
      label: 'Default landing page',
      type: 'select',
      value: 'home',
      encodeHtml,
      options: [
        {value: 'home', label: 'Home'},
        {value: 'invoices', label: 'Sales Invoices'},
        {value: 'customers', label: 'Customers'},
      ],
    }),
  ].join('')
  return renderCard(
    'Account',
    `<div class="grid [grid-template-columns:repeat(auto-fit,_minmax(260px,_1fr))] [gap:10px_16px] [padding:12px]">${fieldsHtml}</div>`
  )
}

function renderAppearanceSectionFields() {
  // Field markup (accent, interface scale, typography, theme, layout,
  // density) keeps every id/attribute verbatim — shell/appearance.js's
  // syncAppearanceControls/bindAppearanceSection query these exact ids —
  // only the outer wrapper changed from a fieldset to the shared .rec-card
  // primitive (renderCard, above), same as every other section on this page.
  return renderCard(
    'Accent color',
    `<div class="accent-swatches flex items-center gap-2.5 flex-wrap" role="radiogroup" aria-label="Accent color">
      <button type="button" class="accent-swatch [width:28px] [height:28px] [border-radius:999px] [background:var(--sw)] [border:2px_solid_transparent] [padding:0] [cursor:pointer] [box-shadow:inset_0_0_0_1px_var(--line)]" role="radio" data-accent="#1868DB" data-accent-dark="#669DF1" aria-checked="true" aria-label="Blue (default)" style="--sw: #1868db"></button>
      <button type="button" class="accent-swatch [width:28px] [height:28px] [border-radius:999px] [background:var(--sw)] [border:2px_solid_transparent] [padding:0] [cursor:pointer] [box-shadow:inset_0_0_0_1px_var(--line)]" role="radio" data-accent="#5B7F24" data-accent-dark="#82B536" aria-checked="false" aria-label="Green" style="--sw: #5b7f24"></button>
      <button type="button" class="accent-swatch [width:28px] [height:28px] [border-radius:999px] [background:var(--sw)] [border:2px_solid_transparent] [padding:0] [cursor:pointer] [box-shadow:inset_0_0_0_1px_var(--line)]" role="radio" data-accent="#803FA5" data-accent-dark="#B57EDC" aria-checked="false" aria-label="Purple" style="--sw: #803fa5"></button>
      <button type="button" class="accent-swatch [width:28px] [height:28px] [border-radius:999px] [background:var(--sw)] [border:2px_solid_transparent] [padding:0] [cursor:pointer] [box-shadow:inset_0_0_0_1px_var(--line)]" role="radio" data-accent="#AE2E24" data-accent-dark="#F87168" aria-checked="false" aria-label="Red" style="--sw: #ae2e24"></button>
      <button type="button" class="accent-swatch [width:28px] [height:28px] [border-radius:999px] [background:var(--sw)] [border:2px_solid_transparent] [padding:0] [cursor:pointer] [box-shadow:inset_0_0_0_1px_var(--line)]" role="radio" data-accent="#946F00" data-accent-dark="#E2B203" aria-checked="false" aria-label="Amber" style="--sw: #946f00"></button>
      <button type="button" class="accent-swatch [width:28px] [height:28px] [border-radius:999px] [background:var(--sw)] [border:2px_solid_transparent] [padding:0] [cursor:pointer] [box-shadow:inset_0_0_0_1px_var(--line)]" role="radio" data-accent="#206A83" data-accent-dark="#6CC3D5" aria-checked="false" aria-label="Teal" style="--sw: #206a83"></button>
      <div class="accent-custom grid [grid-template-columns:28px_auto_minmax(112px,_1fr)] items-center gap-2 [min-width:min(100%,_240px)]" data-custom-accent data-selected="false">
        <label class="accent-custom-picker relative [width:28px] [height:28px] [border-radius:999px] [cursor:pointer] [&_input]:absolute [&_input]:[inset:0] [&_input]:w-full [&_input]:h-full [&_input]:[padding:0] [&_input]:[opacity:0] [&_input]:[cursor:pointer]" for="appearance-custom-color">
          <input type="color" id="appearance-custom-color" value="#1868db" aria-label="Choose a custom accent color" />
          <span class="accent-custom-swatch block [width:28px] [height:28px] [border:2px_solid_transparent] [border-radius:999px] [background:var(--custom-accent,_#1868db)] [box-shadow:inset_0_0_0_1px_var(--line)] [pointer-events:none] [border-color:var(--ink)] [box-shadow:0_0_0_2px_var(--surface),_0_0_0_3.5px_var(--custom-accent,_#1868db)] [outline:2px_solid_var(--focus)] [outline-offset:3px]" aria-hidden="true"></span>
        </label>
        <label class="accent-custom-label text-xs font-semibold text-ink" for="appearance-custom-hex">Custom</label>
        <input class="accent-custom-hex w-full [min-height:32px] [padding:5px_9px] [border:1px_solid_var(--line)] [border-radius:7px] [font:inherit] [font-variant-numeric:tabular-nums] [text-transform:uppercase] bg-surface text-ink" id="appearance-custom-hex" type="text" value="#1868DB" inputmode="text" maxlength="7" spellcheck="false" aria-describedby="appearance-custom-error" />
        <span class="accent-custom-error [grid-column:1_/_-1] [font-size:11px] [line-height:1.35] [color:var(--danger)] [&:empty]:hidden" id="appearance-custom-error" role="status"></span>
      </div>
    </div>`,
    'appearance-group-accent'
  ) + renderCard(
    'Interface scale',
    `<div class="appearance-scale-control" aria-describedby="appearance-interface-scale-description">
      <div class="appearance-scale-head"><span>Smaller</span><span>Larger</span></div>
      <div class="appearance-scale-slider-wrap"><output class="appearance-scale-value" id="appearance-scale-value" for="appearance-interface-scale">100%</output><input class="appearance-scale-slider" type="range" id="appearance-interface-scale" min="0" max="3" step="1" value="1" aria-label="Interface scale" /></div>
      <div class="appearance-scale-ticks" aria-hidden="true"><span data-appearance-scale-tick="90">90%</span><span data-appearance-scale-tick="100">100%</span><span data-appearance-scale-tick="110">110%</span><span data-appearance-scale-tick="125">125%</span></div>
      <p id="appearance-interface-scale-description">Scales text, controls, icons, and spacing across the interface.</p>
    </div>`,
    'appearance-group-scale'
  ) + renderCard(
    'Typography',
    `<label class="grid gap-1.5 text-[13px] font-semibold" for="appearance-font-family">
      Font family
      <select id="appearance-font-family" class="w-full min-h-[32px] rounded-[7px] border border-line bg-surface px-[9px] py-1.5 font-[inherit] text-[14px] text-ink appearance-none [-webkit-appearance:none] [background-image:url(data:image/svg+xml,%3Csvg_xmlns=http://www.w3.org/2000/svg_width=12_height=12_viewBox=0_0_12_12%3E%3Cpath_fill=%2344546f_d=M2.5_4.5_6_8l3.5-3.5z/%3E%3C/svg%3E)] [background-repeat:no-repeat] [background-position:right_8px_center] [background-size:12px] [padding-inline-end:28px] focus:border-[var(--accent-line)] focus:outline-none focus:[box-shadow:0_0_0_3px_var(--accent-soft)] rtl:[background-position:left_8px_center] rtl:[padding-inline-end:9px] rtl:[padding-inline-start:28px]">
        <option value="system">System default</option>
        <option value="Inter">Inter</option>
        <option value="Roboto">Roboto</option>
        <option value="Open Sans">Open Sans</option>
        <option value="Poppins">Poppins</option>
        <option value="Montserrat">Montserrat</option>
      </select>
    </label>`,
    'appearance-group-typography'
  ) + renderCard(
    'Interface theme',
    `<div class="dgrid appearance-theme-grid grid [grid-template-columns:repeat(3,_1fr)] gap-2.5" role="radiogroup" aria-label="Interface theme">
      <button type="button" class="appearance-theme-card" role="radio" data-appearance-theme="system" aria-checked="true">
        <span class="theme-preview theme-preview-system" data-theme-preview aria-hidden="true"><span class="theme-preview-chrome"><i></i><i></i><i></i></span><span class="theme-preview-sidebar"></span><span class="theme-preview-toolbar"></span><span class="theme-preview-lines"><i></i><i></i><i></i></span></span>
        <span class="theme-choice-label"><span class="theme-choice-radio" aria-hidden="true"></span><span>System preference</span></span>
      </button>
      <button type="button" class="appearance-theme-card" role="radio" data-appearance-theme="light" aria-checked="false">
        <span class="theme-preview theme-preview-light" data-theme-preview aria-hidden="true"><span class="theme-preview-chrome"><i></i><i></i><i></i></span><span class="theme-preview-sidebar"></span><span class="theme-preview-toolbar"></span><span class="theme-preview-lines"><i></i><i></i><i></i></span></span>
        <span class="theme-choice-label"><span class="theme-choice-radio" aria-hidden="true"></span><span>Light</span></span>
      </button>
      <button type="button" class="appearance-theme-card" role="radio" data-appearance-theme="dark" aria-checked="false">
        <span class="theme-preview theme-preview-dark" data-theme-preview aria-hidden="true"><span class="theme-preview-chrome"><i></i><i></i><i></i></span><span class="theme-preview-sidebar"></span><span class="theme-preview-toolbar"></span><span class="theme-preview-lines"><i></i><i></i><i></i></span></span>
        <span class="theme-choice-label"><span class="theme-choice-radio" aria-hidden="true"></span><span>Dark</span></span>
      </button>
    </div>
    <label class="appearance-contrast-row">
      <span class="switch relative inline-flex h-[17px] w-[30px] flex-none"><input class="peer absolute inset-0 m-0 cursor-pointer opacity-0" type="checkbox" id="appearance-high-contrast" /><span class="pointer-events-none absolute inset-0 rounded-full bg-line transition-[background] duration-[120ms] before:absolute before:start-0.5 before:top-0.5 before:size-[13px] before:rounded-full before:bg-inverse before:transition-[translate] before:duration-[120ms] before:content-[''] peer-checked:bg-accent peer-checked:before:translate-x-[13px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)] rtl:peer-checked:before:-translate-x-[13px]"></span></span>
      <span><strong>High contrast</strong><small>Increase text, border, focus, and control distinction.</small></span>
    </label>`,
    'appearance-group-theme'
  ) + renderCard(
    'Layout',
    `<div class="dgrid appearance-layout-grid grid [grid-template-columns:repeat(3,_1fr)] gap-2.5" role="radiogroup" aria-label="Layout">
      <button type="button" class="dcard appearance-option-card [border:1.5px_solid_var(--line)] [border-radius:9px] [padding:11px] text-start flex [gap:9px] items-start" role="radio" data-appearance-layout="fluid" aria-checked="true">
        <span class="appearance-option-preview layout-preview-fluid" data-option-preview aria-hidden="true"><span class="layout-preview-chrome"><i></i><i></i><i></i></span><span class="layout-preview-rail"></span><span class="layout-preview-content"></span></span>
        <span class="appearance-option-label"><span class="theme-choice-radio" aria-hidden="true"></span><span><span class="t">Fluid</span></span></span>
      </button>
      <button type="button" class="dcard appearance-option-card [border:1.5px_solid_var(--line)] [border-radius:9px] [padding:11px] text-start flex [gap:9px] items-start" role="radio" data-appearance-layout="boxed" aria-checked="false">
        <span class="appearance-option-preview layout-preview-boxed" data-option-preview aria-hidden="true"><span class="layout-preview-chrome"><i></i><i></i><i></i></span><span class="layout-preview-rail"></span><span class="layout-preview-content"></span></span>
        <span class="appearance-option-label"><span class="theme-choice-radio" aria-hidden="true"></span><span><span class="t">Boxed</span></span></span>
      </button>
    </div>
    <label class="appearance-contrast-row">
      <span class="switch relative inline-flex h-[17px] w-[30px] flex-none"><input class="peer absolute inset-0 m-0 cursor-pointer opacity-0" type="checkbox" id="appearance-launchpad" checked /><span class="pointer-events-none absolute inset-0 rounded-full bg-line transition-[background] duration-[120ms] before:absolute before:start-0.5 before:top-0.5 before:size-[13px] before:rounded-full before:bg-inverse before:transition-[translate] before:duration-[120ms] before:content-[''] peer-checked:bg-accent peer-checked:before:translate-x-[13px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)] rtl:peer-checked:before:-translate-x-[13px]"></span></span>
      <span><strong>Show App Launchpad</strong><small>Show the app home screen and app switcher.</small></span>
    </label>`,
    'appearance-group-layout'
  ) + renderCard(
    'Density',
    `<div class="dgrid appearance-density-grid grid [grid-template-columns:repeat(3,_1fr)] gap-2.5" role="radiogroup" aria-label="Density">
      <button type="button" class="dcard appearance-option-card [border:1.5px_solid_var(--line)] [border-radius:9px] [padding:11px] text-start flex [gap:9px] items-start" role="radio" data-appearance-density="default" aria-checked="true">
        <span class="appearance-option-preview density-preview-default" data-option-preview aria-hidden="true"><span class="density-preview-chrome"><i></i><i></i><i></i></span><span class="density-preview-rail"></span><span class="density-preview-toolbar"></span><span class="density-preview-rows"><i></i><i></i><i></i></span></span>
        <span class="appearance-option-label"><span class="theme-choice-radio" aria-hidden="true"></span><span><span class="t">Default</span></span></span>
      </button>
      <button type="button" class="dcard appearance-option-card [border:1.5px_solid_var(--line)] [border-radius:9px] [padding:11px] text-start flex [gap:9px] items-start" role="radio" data-appearance-density="compact" aria-checked="false">
        <span class="appearance-option-preview density-preview-compact" data-option-preview aria-hidden="true"><span class="density-preview-chrome"><i></i><i></i><i></i></span><span class="density-preview-rail"></span><span class="density-preview-toolbar"></span><span class="density-preview-rows"><i></i><i></i><i></i><i></i><i></i></span></span>
        <span class="appearance-option-label"><span class="theme-choice-radio" aria-hidden="true"></span><span><span class="t">Compact</span></span></span>
      </button>
      <button type="button" class="dcard appearance-option-card [border:1.5px_solid_var(--line)] [border-radius:9px] [padding:11px] text-start flex [gap:9px] items-start" role="radio" data-appearance-density="comfortable" aria-checked="false">
        <span class="appearance-option-preview density-preview-default" data-option-preview aria-hidden="true"><span class="density-preview-chrome"><i></i><i></i><i></i></span><span class="density-preview-rail"></span><span class="density-preview-toolbar"></span><span class="density-preview-rows"><i></i><i></i><i></i></span></span>
        <span class="appearance-option-label"><span class="theme-choice-radio" aria-hidden="true"></span><span><span class="t">Comfortable</span></span></span>
      </button>
    </div>`,
    'appearance-group-density'
  )
}

function renderSecuritySection() {
  return renderCard(
    'Sign-in security',
    `<div class="flex flex-col gap-2.5">
      <div class="flex items-center justify-between gap-3">
        <span><strong class="block text-[13.5px] text-ink">Password</strong><small class="block text-xs text-muted">Change the password used to sign in.</small></span>
        <button type="button" class="lbtn out" data-profile-open-change-password>Change password</button>
      </div>
      <div class="flex items-center justify-between gap-3">
        <span><strong class="block text-[13.5px] text-ink">PIN code</strong><small class="block text-xs text-muted">Used for quick re-authentication on shared terminals.</small></span>
        <button type="button" class="lbtn out" data-profile-open-set-pin>Set / change PIN</button>
      </div>
    </div>`
  )
}

function renderSessionsSection() {
  return renderCard('Login log', `<div id="profile-login-log"></div>`) +
    renderCard('Devices', `<div id="profile-device-list"></div>`)
}

function renderNotificationRow(id, title, description, checked) {
  return `<label class="appearance-contrast-row">
    <span class="switch relative inline-flex h-[17px] w-[30px] flex-none"><input class="peer absolute inset-0 m-0 cursor-pointer opacity-0" type="checkbox" id="${id}"${checked ? ' checked' : ''} /><span class="pointer-events-none absolute inset-0 rounded-full bg-line transition-[background] duration-[120ms] before:absolute before:start-0.5 before:top-0.5 before:size-[13px] before:rounded-full before:bg-inverse before:transition-[translate] before:duration-[120ms] before:content-[''] peer-checked:bg-accent peer-checked:before:translate-x-[13px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)] rtl:peer-checked:before:-translate-x-[13px]"></span></span>
    <span><strong>${title}</strong><small>${description}</small></span>
  </label>`
}

function renderNotificationsSection() {
  return renderCard(
    'Email notifications',
    `<div class="flex flex-col gap-2">
      ${renderNotificationRow('notif-email-invoices', 'Invoice activity', 'Status changes on invoices you follow.', true)}
      ${renderNotificationRow('notif-email-mentions', 'Mentions', 'When someone mentions you in a comment.', true)}
    </div>`
  ) + renderCard(
    'In-app notifications',
    `<div class="flex flex-col gap-2">
      ${renderNotificationRow('notif-app-approvals', 'Approvals', 'Documents waiting on your approval.', true)}
      ${renderNotificationRow('notif-app-system', 'System announcements', 'Maintenance windows and release notes.', false)}
    </div>`
  )
}

export function renderProfileSections({currentUser, encodeHtml}) {
  const bodies = {
    profile: renderProfileSection(currentUser, encodeHtml),
    account: renderAccountSection(currentUser, encodeHtml),
    appearance: renderAppearanceSectionFields(),
    security: renderSecuritySection(),
    sessions: renderSessionsSection(),
    notifications: renderNotificationsSection(),
  }
  return Object.entries(bodies)
    .map(
      ([key, body]) =>
        `<div id="profile-section-${key}" data-profile-scroll-target="${key}"><h2 class="profile-section-heading text-[15px] font-semibold text-ink mb-2.5">${encodeHtml(key)}</h2>${body}</div>`
    )
    .join('')
}

export {renderProfileIdentityHeader}
