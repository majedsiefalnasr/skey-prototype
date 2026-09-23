// Profile page section bodies. Each section is a `.fset`-style grouped
// card, matching appearance-dialog.html's existing convention (moved here
// per the design spec: Appearance's fields relocate verbatim, everything
// else is new markup built to the same convention).

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

function renderProfileSection(currentUser) {
  return `<fieldset class="fset [border:1px_solid_var(--line)] [border-radius:10px] [padding:12px_14px] mb-3.5! [&_legend]:text-xs [&_legend]:[text-transform:uppercase] [&_legend]:[letter-spacing:0.04em] [&_legend]:[color:var(--faint)] [&_legend]:[padding:0_6px]">
    <legend>Personal information</legend>
    <div class="grid [grid-template-columns:repeat(2,_1fr)] gap-3 [@media((max-width:560px))]:[grid-template-columns:1fr]">
      <label class="grid gap-1.5 text-[13px] font-semibold" for="profile-name">Full name<input class="w-full min-h-[32px] rounded-[7px] border border-line bg-surface px-[9px] py-1.5 font-[inherit] text-[14px] text-ink" id="profile-name" type="text" value="${currentUser.name}" /></label>
      <label class="grid gap-1.5 text-[13px] font-semibold" for="profile-job-title">Job title<input class="w-full min-h-[32px] rounded-[7px] border border-line bg-surface px-[9px] py-1.5 font-[inherit] text-[14px] text-ink" id="profile-job-title" type="text" value="${currentUser.jobTitle}" /></label>
      <label class="grid gap-1.5 text-[13px] font-semibold" for="profile-email">Email<input class="w-full min-h-[32px] rounded-[7px] border border-line bg-surface px-[9px] py-1.5 font-[inherit] text-[14px] text-ink" id="profile-email" type="email" value="${currentUser.email}" /></label>
      <label class="grid gap-1.5 text-[13px] font-semibold" for="profile-phone">Phone<input class="w-full min-h-[32px] rounded-[7px] border border-line bg-surface px-[9px] py-1.5 font-[inherit] text-[14px] text-ink" id="profile-phone" type="tel" value="${currentUser.phone}" /></label>
      <label class="grid gap-1.5 text-[13px] font-semibold" for="profile-locale">Locale<select class="w-full min-h-[32px] rounded-[7px] border border-line bg-surface px-[9px] py-1.5 font-[inherit] text-[14px] text-ink" id="profile-locale"><option value="en"${currentUser.locale === 'en' ? ' selected' : ''}>English</option><option value="ar"${currentUser.locale === 'ar' ? ' selected' : ''}>Arabic</option></select></label>
      <label class="grid gap-1.5 text-[13px] font-semibold" for="profile-timezone">Timezone<input class="w-full min-h-[32px] rounded-[7px] border border-line bg-surface px-[9px] py-1.5 font-[inherit] text-[14px] text-ink" id="profile-timezone" type="text" value="${currentUser.timezone}" /></label>
    </div>
  </fieldset>
  <fieldset class="fset [border:1px_solid_var(--line)] [border-radius:10px] [padding:12px_14px] mb-3.5! [&_legend]:text-xs [&_legend]:[text-transform:uppercase] [&_legend]:[letter-spacing:0.04em] [&_legend]:[color:var(--faint)] [&_legend]:[padding:0_6px]">
    <legend>Photo</legend>
    <div class="flex items-center gap-3">
      <span class="avatar inline-flex size-12 items-center justify-center rounded-full bg-[var(--line-2)] text-muted" aria-hidden="true"><svg width="22" height="22"><use href="#i-user" /></svg></span>
      <button type="button" class="lbtn out" id="profile-photo-select">Select photo</button>
    </div>
  </fieldset>`
}

function renderAccountSection(currentUser) {
  return `<fieldset class="fset [border:1px_solid_var(--line)] [border-radius:10px] [padding:12px_14px] mb-3.5! [&_legend]:text-xs [&_legend]:[text-transform:uppercase] [&_legend]:[letter-spacing:0.04em] [&_legend]:[color:var(--faint)] [&_legend]:[padding:0_6px]">
    <legend>Account</legend>
    <div class="grid [grid-template-columns:repeat(2,_1fr)] gap-3 [@media((max-width:560px))]:[grid-template-columns:1fr]">
      <label class="grid gap-1.5 text-[13px] font-semibold" for="profile-username">Username<input class="w-full min-h-[32px] rounded-[7px] border border-line bg-[var(--line-2)] px-[9px] py-1.5 font-[inherit] text-[14px] text-muted" id="profile-username" type="text" value="${currentUser.username}" readonly /></label>
      <label class="grid gap-1.5 text-[13px] font-semibold" for="profile-branch">Branch<input class="w-full min-h-[32px] rounded-[7px] border border-line bg-[var(--line-2)] px-[9px] py-1.5 font-[inherit] text-[14px] text-muted" id="profile-branch" type="text" value="${currentUser.branch}" readonly /></label>
      <label class="grid gap-1.5 text-[13px] font-semibold" for="profile-landing-page">Default landing page<select class="w-full min-h-[32px] rounded-[7px] border border-line bg-surface px-[9px] py-1.5 font-[inherit] text-[14px] text-ink" id="profile-landing-page"><option value="home">Home</option><option value="invoices">Sales Invoices</option><option value="customers">Customers</option></select></label>
    </div>
  </fieldset>`
}

function renderAppearanceSectionFields() {
  // Verbatim copy of appearance-dialog.html's field markup (accent,
  // interface scale, typography, theme, layout, density) — same ids, so
  // shell/appearance.js's syncAppearanceControls keeps working unmodified.
  return `<fieldset class="appearance-group-accent fset [border:1px_solid_var(--line)] [border-radius:10px] [padding:12px_14px] mb-3.5! [&_legend]:text-xs [&_legend]:[text-transform:uppercase] [&_legend]:[letter-spacing:0.04em] [&_legend]:[color:var(--faint)] [&_legend]:[padding:0_6px]">
    <legend>Accent color</legend>
    <div class="accent-swatches flex items-center gap-2.5 flex-wrap" role="radiogroup" aria-label="Accent color">
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
    </div>
  </fieldset>
  <fieldset class="appearance-group-scale fset [border:1px_solid_var(--line)] [border-radius:10px] [padding:12px_14px] mb-3.5! [&_legend]:text-xs [&_legend]:[text-transform:uppercase] [&_legend]:[letter-spacing:0.04em] [&_legend]:[color:var(--faint)] [&_legend]:[padding:0_6px]">
    <legend>Interface scale</legend>
    <div class="appearance-scale-control" aria-describedby="appearance-interface-scale-description">
      <div class="appearance-scale-head"><span>Smaller</span><span>Larger</span></div>
      <div class="appearance-scale-slider-wrap"><output class="appearance-scale-value" id="appearance-scale-value" for="appearance-interface-scale">100%</output><input class="appearance-scale-slider" type="range" id="appearance-interface-scale" min="0" max="3" step="1" value="1" aria-label="Interface scale" /></div>
      <div class="appearance-scale-ticks" aria-hidden="true"><span data-appearance-scale-tick="90">90%</span><span data-appearance-scale-tick="100">100%</span><span data-appearance-scale-tick="110">110%</span><span data-appearance-scale-tick="125">125%</span></div>
      <p id="appearance-interface-scale-description">Scales text, controls, icons, and spacing across the interface.</p>
    </div>
  </fieldset>
  <fieldset class="appearance-group-typography fset [border:1px_solid_var(--line)] [border-radius:10px] [padding:12px_14px] mb-3.5! [&_legend]:text-xs [&_legend]:[text-transform:uppercase] [&_legend]:[letter-spacing:0.04em] [&_legend]:[color:var(--faint)] [&_legend]:[padding:0_6px]">
    <legend>Typography</legend>
    <label class="grid gap-1.5 text-[13px] font-semibold" for="appearance-font-family">
      Font family
      <select id="appearance-font-family" class="w-full min-h-[32px] rounded-[7px] border border-line bg-surface px-[9px] py-1.5 font-[inherit] text-[14px] text-ink appearance-none [-webkit-appearance:none] [background-image:url(data:image/svg+xml,%3Csvg_xmlns=http://www.w3.org/2000/svg_width=12_height=12_viewBox=0_0_12_12%3E%3Cpath_fill=%2344546f_d=M2.5_4.5_6_8l3.5-3.5z/%3E%3C/svg%3E)] [background-repeat:no-repeat] [background-position:right_8px_center] [background-size:12px] [padding-inline-end:28px] focus:border-[var(--accent-line)] focus:outline-none focus:[box-shadow:0_0_0_3px_var(--accent-soft)] rtl:[background-position:left_8px_center] rtl:[padding-inline-end:9px] rtl:[padding-inline-start:28px]">
        <option value="system">System default</option>
        <option value="Inter">Inter</option>
        <option value="Roboto">Roboto</option>
        <option value="Open Sans">Open Sans</option>
        <option value="Poppins">Poppins</option>
        <option value="Montserrat">Montserrat</option>
      </select>
    </label>
  </fieldset>
  <fieldset class="appearance-group-theme fset [border:1px_solid_var(--line)] [border-radius:10px] [padding:12px_14px] mb-3.5! [&_legend]:text-xs [&_legend]:[text-transform:uppercase] [&_legend]:[letter-spacing:0.04em] [&_legend]:[color:var(--faint)] [&_legend]:[padding:0_6px]">
    <legend>Interface theme</legend>
    <div class="dgrid appearance-theme-grid grid [grid-template-columns:repeat(3,_1fr)] gap-2.5" role="radiogroup" aria-label="Interface theme">
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
    </label>
  </fieldset>
  <fieldset class="appearance-group-layout fset [border:1px_solid_var(--line)] [border-radius:10px] [padding:12px_14px] mb-3.5! [&_legend]:text-xs [&_legend]:[text-transform:uppercase] [&_legend]:[letter-spacing:0.04em] [&_legend]:[color:var(--faint)] [&_legend]:[padding:0_6px]">
    <legend>Layout</legend>
    <div class="dgrid appearance-layout-grid grid [grid-template-columns:repeat(3,_1fr)] gap-2.5" role="radiogroup" aria-label="Layout">
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
    </label>
  </fieldset>
  <fieldset class="appearance-group-density fset [border:1px_solid_var(--line)] [border-radius:10px] [padding:12px_14px] mb-3.5! [&_legend]:text-xs [&_legend]:[text-transform:uppercase] [&_legend]:[letter-spacing:0.04em] [&_legend]:[color:var(--faint)] [&_legend]:[padding:0_6px]">
    <legend>Density</legend>
    <div class="dgrid appearance-density-grid grid [grid-template-columns:repeat(3,_1fr)] gap-2.5" role="radiogroup" aria-label="Density">
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
    </div>
  </fieldset>`
}

function renderSecuritySection() {
  return `<fieldset class="fset [border:1px_solid_var(--line)] [border-radius:10px] [padding:12px_14px] mb-3.5! [&_legend]:text-xs [&_legend]:[text-transform:uppercase] [&_legend]:[letter-spacing:0.04em] [&_legend]:[color:var(--faint)] [&_legend]:[padding:0_6px]">
    <legend>Sign-in security</legend>
    <div class="flex flex-col gap-2.5">
      <div class="flex items-center justify-between gap-3">
        <span><strong class="block text-[13.5px] text-ink">Password</strong><small class="block text-xs text-muted">Change the password used to sign in.</small></span>
        <button type="button" class="lbtn out" data-profile-open-change-password>Change password</button>
      </div>
      <div class="flex items-center justify-between gap-3">
        <span><strong class="block text-[13.5px] text-ink">PIN code</strong><small class="block text-xs text-muted">Used for quick re-authentication on shared terminals.</small></span>
        <button type="button" class="lbtn out" data-profile-open-set-pin>Set / change PIN</button>
      </div>
    </div>
  </fieldset>`
}

function renderSessionsSection() {
  return `<fieldset class="fset [border:1px_solid_var(--line)] [border-radius:10px] [padding:12px_14px] mb-3.5! [&_legend]:text-xs [&_legend]:[text-transform:uppercase] [&_legend]:[letter-spacing:0.04em] [&_legend]:[color:var(--faint)] [&_legend]:[padding:0_6px]">
    <legend>Login log</legend>
    <div id="profile-login-log"></div>
  </fieldset>
  <fieldset class="fset [border:1px_solid_var(--line)] [border-radius:10px] [padding:12px_14px] mb-3.5! [&_legend]:text-xs [&_legend]:[text-transform:uppercase] [&_legend]:[letter-spacing:0.04em] [&_legend]:[color:var(--faint)] [&_legend]:[padding:0_6px]">
    <legend>Devices</legend>
    <div id="profile-device-list"></div>
  </fieldset>`
}

function renderNotificationRow(id, title, description, checked) {
  return `<label class="appearance-contrast-row">
    <span class="switch relative inline-flex h-[17px] w-[30px] flex-none"><input class="peer absolute inset-0 m-0 cursor-pointer opacity-0" type="checkbox" id="${id}"${checked ? ' checked' : ''} /><span class="pointer-events-none absolute inset-0 rounded-full bg-line transition-[background] duration-[120ms] before:absolute before:start-0.5 before:top-0.5 before:size-[13px] before:rounded-full before:bg-inverse before:transition-[translate] before:duration-[120ms] before:content-[''] peer-checked:bg-accent peer-checked:before:translate-x-[13px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)] rtl:peer-checked:before:-translate-x-[13px]"></span></span>
    <span><strong>${title}</strong><small>${description}</small></span>
  </label>`
}

function renderNotificationsSection() {
  return `<fieldset class="fset [border:1px_solid_var(--line)] [border-radius:10px] [padding:12px_14px] mb-3.5! [&_legend]:text-xs [&_legend]:[text-transform:uppercase] [&_legend]:[letter-spacing:0.04em] [&_legend]:[color:var(--faint)] [&_legend]:[padding:0_6px]">
    <legend>Email notifications</legend>
    <div class="flex flex-col gap-2">
      ${renderNotificationRow('notif-email-invoices', 'Invoice activity', 'Status changes on invoices you follow.', true)}
      ${renderNotificationRow('notif-email-mentions', 'Mentions', 'When someone mentions you in a comment.', true)}
    </div>
  </fieldset>
  <fieldset class="fset [border:1px_solid_var(--line)] [border-radius:10px] [padding:12px_14px] mb-3.5! [&_legend]:text-xs [&_legend]:[text-transform:uppercase] [&_legend]:[letter-spacing:0.04em] [&_legend]:[color:var(--faint)] [&_legend]:[padding:0_6px]">
    <legend>In-app notifications</legend>
    <div class="flex flex-col gap-2">
      ${renderNotificationRow('notif-app-approvals', 'Approvals', 'Documents waiting on your approval.', true)}
      ${renderNotificationRow('notif-app-system', 'System announcements', 'Maintenance windows and release notes.', false)}
    </div>
  </fieldset>`
}

export function renderProfileSections({currentUser, encodeHtml}) {
  const bodies = {
    profile: renderProfileSection(currentUser),
    account: renderAccountSection(currentUser),
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
