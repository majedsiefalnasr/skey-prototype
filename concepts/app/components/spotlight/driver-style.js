// driver.js base stylesheet, vendored verbatim as a JS string so the
// prototype needs no extra <link> or build-pipeline change (the
// architecture tests pin the exact stylesheet set).
//
// Source: driver.js@1.9.0, dist/driver.css (MIT, https://driverjs.com).
// ESM companion lives at ../../third-party/driver.js/driver.js.mjs.
// Atlassian restyle lives in ATLASSIAN_SPOTLIGHT_CSS below.

export const DRIVER_BASE_CSS = `.driver-popover{all:unset;font-family:var(--driver-popover-font-family,"Helvetica Neue", Inter, ui-sans-serif, "Apple Color Emoji", Helvetica, Arial, sans-serif);box-sizing:border-box;color:#2d2d2d;z-index:1000000000;background-color:#fff;border-radius:5px;min-width:250px;max-width:300px;margin:0;padding:15px;position:fixed;top:0;right:0;box-shadow:0 1px 10px #0006}.driver-popover-title{zoom:1;margin:0;font-size:19px;font-weight:700;line-height:1.5;display:block;position:relative}.driver-popover-close-btn{all:unset;cursor:pointer;color:#d2d2d2;z-index:1;text-align:center;width:32px;height:28px;font-size:18px;font-weight:500;transition:color .2s;position:absolute;top:0;right:0}.driver-popover-close-btn:hover,.driver-popover-close-btn:focus{color:#2d2d2d}.driver-popover-title[style*=block]+.driver-popover-description{margin-top:5px}.driver-popover-description{zoom:1;margin-bottom:0;font-size:14px;font-weight:400;line-height:1.5}.driver-popover-footer{text-align:right;zoom:1;justify-content:space-between;align-items:center;margin-top:15px;display:flex}.driver-popover-progress-text{color:#727272;zoom:1;font-size:13px;font-weight:400}.driver-popover-footer-btn{all:unset;box-sizing:border-box;color:#2d2d2d;cursor:pointer;zoom:1;background-color:#fff;border:1px solid #ccc;border-radius:3px;outline:0;padding:3px 7px;font-size:12px;line-height:1.3;text-decoration:none;display:inline-block}.driver-popover-footer .driver-popover-btn-disabled{opacity:.5;pointer-events:none}.driver-popover-footer-btn:hover,.driver-popover-footer-btn:focus{background-color:#f7f7f7}.driver-popover-navigation-btns{flex-grow:1;justify-content:flex-end;display:flex}.driver-popover-navigation-btns button+button{margin-left:4px}.driver-popover-arrow{content:"";border:5px solid #fff;position:absolute}.driver-popover-arrow-side-over{display:none}.driver-popover-arrow-side-left{border-top-color:#0000;border-bottom-color:#0000;border-right-color:#0000;left:100%}.driver-popover-arrow-side-right{border-top-color:#0000;border-bottom-color:#0000;border-left-color:#0000;right:100%}.driver-popover-arrow-side-top{border-bottom-color:#0000;border-left-color:#0000;border-right-color:#0000;top:100%}.driver-popover-arrow-side-bottom{border-top-color:#0000;border-left-color:#0000;border-right-color:#0000;bottom:100%}.driver-popover-arrow-side-center,.driver-popover-arrow-none{display:none}.driver-active .driver-overlay{pointer-events:none}.driver-active.driver-no-scroll{overflow:hidden}.driver-active *{pointer-events:none}.driver-active .driver-active-element,.driver-active .driver-active-element *,.driver-popover,.driver-popover *{pointer-events:auto}@keyframes animate-fade-in{0%{opacity:0}to{opacity:1}}.driver-fade .driver-overlay{animation:animate-fade-in var(--driver-animation-duration,.4s) ease-in-out}.driver-fade .driver-popover{animation:animate-fade-in var(--driver-animation-duration,.4s)}.driver-active-element-parent-no-scroll{overflow:hidden!important}.driver-no-interaction,.driver-no-interaction *{pointer-events:none!important}`

// Atlassian restyle for driver.js popovers (mirrors the former hand-built
// SpotlightCard): app surface/border/shadow tokens, 14px semibold
// headline, 13px muted body, accent primary button, quiet secondary
// button, step count pinned LTR. Scoped to POPOVER_CLASS so the library
// defaults survive elsewhere. The tour target itself carries no extra
// ring — driver's overlay cutout is the only highlight.
export const ATLASSIAN_SPOTLIGHT_CSS = `
.driver-popover.skey-spotlight{background:var(--surface,#fff);color:var(--ink,#1b2230);border:1px solid var(--line,#e2e5ea);border-radius:12px;box-shadow:var(--shadow-2,0 18px 44px rgba(8,12,20,.25));min-width:0;width:320px;max-width:calc(100vw - 24px);padding:16px;font-family:inherit;text-align:start}
.skey-spotlight .driver-popover-title{font-size:14px;font-weight:600;line-height:1.45;margin:0;padding-inline-end:28px}
.skey-spotlight .driver-popover-description{font-size:13px;line-height:1.55;color:var(--muted,#5c6673)}
.skey-spotlight .driver-popover-close-btn{color:var(--muted,#5c6673);width:28px;height:28px;font-size:16px;line-height:1;border-radius:6px;top:8px;left:auto;right:8px}
[dir="rtl"] .skey-spotlight .driver-popover-close-btn{left:8px;right:auto}
.skey-spotlight .driver-popover-close-btn:hover,.skey-spotlight .driver-popover-close-btn:focus{color:var(--ink,#1b2230);background:var(--line-2,#eef1f6)}
.skey-spotlight .driver-popover-footer{margin-top:12px}
.skey-spotlight .driver-popover-progress-text{font-size:12px;color:var(--muted,#5c6673);direction:ltr}
.skey-spotlight .driver-popover-navigation-btns{gap:8px}
.skey-spotlight .driver-popover-navigation-btns button+button{margin:0}
.skey-spotlight .driver-popover-footer-btn{min-height:32px;padding:4px 12px;font-size:12.5px;font-weight:600;border-radius:6px;border:1px solid var(--line,#e2e5ea);background:var(--surface,#fff);color:var(--ink,#1b2230)}
.skey-spotlight .driver-popover-footer-btn:hover,.skey-spotlight .driver-popover-footer-btn:focus{background:var(--line-2,#eef1f6)}
.skey-spotlight .driver-popover-next-btn{background:var(--accent,#1d4ed8);border-color:transparent;color:var(--inverse,#fff)}
.skey-spotlight .driver-popover-next-btn:hover,.skey-spotlight .driver-popover-next-btn:focus{background:var(--accent,#1d4ed8);opacity:.9}

/* Prototype harness hole: driver.js makes the whole page inert during a
   tour (driver-active star rule + a z-10000 overlay), but
   the floating Prototype Controls panel is demo chrome, not product UI —
   it must stay operable mid-tour so the Tour kill switch, mode/status
   selects, and RTL toggle can be flipped while a tour runs. */
#kit,#kit-pill{z-index:1000000001!important}
#kit,#kit-pill,#kit *{pointer-events:auto!important}`
