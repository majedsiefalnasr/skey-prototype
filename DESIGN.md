# Design system

The prototype's visual language is based on the Atlassian Design System (ADS). ADS is a reference, not a dependency: no `@atlaskit/*` package is installed, and the components are hand-written HTML, CSS and JavaScript.

## Source of truth

- The agreed prototype screens, colours and spacing are the reference. Where they differ from ADS, the prototype wins. See [ADR 0001](docs/adr/0001-prototype-as-design-reference.md).
- ADS is used for tokens and component behaviour where the prototype has mapped it.
- Every known difference is listed under [Deviations](#deviations). Each one is either accepted, open, or planned.

## Tokens

### Semantic tokens

`concepts/app/styles/tailwind/base.css` defines 45 `--ds-*` tokens with ADS semantic names and values, for light and dark themes.

### Local aliases

Components use short aliases defined in the same file. Each alias points to one `--ds-*` token:

| Alias | Points to | Used for |
| --- | --- | --- |
| `--ink` | `--ds-text` | Body text |
| `--muted` | `--ds-text-subtle` | Secondary text |
| `--faint` | `--ds-text-subtlest` | Tertiary text |
| `--line` | `--ds-border` | Borders |
| `--line-2` | `--ds-background-neutral` | Hover and quiet fills |
| `--surface` | `--ds-surface` | Cards and inputs |
| `--bg` | `--ds-surface-sunken` | Page background |
| `--accent` | `--ds-background-brand-bold` | Primary actions |
| `--accent-soft` | `--ds-background-selected` | Selected state |
| `--accent-line` | `--ds-border-selected` | Selected border |
| `--focus` | `--ds-border-focused` | Focus ring |
| `--danger` | `--ds-text-danger` | Danger text |
| `--success` | `--ds-text-success` | Success text |

### Font sizes

Font sizes are role-based tokens in the `@theme` block of `concepts/app/styles/tailwind.css`, used as utilities such as `text-body` and `text-caption`. Each token keeps the exact size the prototype already used, so changing one token updates every use. There are 22 tokens, from `--text-badge` (9.5px) to `--text-display-lg` (36px). The 96 raw `font-size` literals in `concepts/app/styles` are not tokenised yet.

Decided in #28 on 2026-11-25, not yet applied. Role names stay and only their values change. Each role gets a line height token, set to today's value first and then to the ADS value below. An element with its own `leading-*` class keeps its line height. Sizes and line heights are in px.

| Role | Type | Size now | New size | New line height |
| --- | --- | --- | --- | --- |
| `badge` | body | 9.5 | 12 | 16 |
| `caption-xs` | body | 10 | 12 | 16 |
| `stat-delta` | body | 10.5 | 12 | 16 |
| `caption` | body | 11 | 12 | 16 |
| `caption-md` | body | 11.5 | 12 | 16 |
| `small` | body | 12 | 12 | 16 |
| `dense` | body | 12.5 | 12 | 16 |
| `body` | body | 13 | 14 | 20 |
| `body-lg` | body | 13.5 | 14 | 20 |
| `subtitle` | body | 14 | 14 | 20 |
| `heading-sm` | heading | 14.5 | 14 | 20 |
| `heading` | heading | 15 | 16 | 20 |
| `heading-md` | heading | 16 | 16 | 20 |
| `avatar-lg` | heading | 17 | 16 | 20 |
| `card-title` | heading | 18 | 16 | 20 |
| `subject` | heading | 19 | 20 | 24 |
| `title` | heading | 20 | 20 | 24 |
| `metric` | heading | 22 | 24 | 28 |
| `page-title` | heading | 23 | 24 | 28 |
| `display-sm` | heading | 26 | 24 | 28 |
| `display` | heading | 28 | 28 | 32 |
| `display-lg` | heading | 36 | 32 | 36 |

The comparison covered 8 screens at 390, 768, 1024 and 1440px. It found 627 size changes, 501 box height changes and 2 newly clipped elements, on Home at 768px. Line height was not measured separately from size. Nine of the 17 roles that change size did not appear on any measured screen: `caption-xs`, `stat-delta`, `caption-md`, `heading-sm`, `avatar-lg`, `card-title`, `metric`, `display-sm` and `display-lg`. Check them visually when they are applied. Dialogs and menus were not measured. Measurements are in `docs/prototype/28-font-size-measure.json` on branch `prototype/28-font-size-comparison`.

### Radius

Radii are `--ds-radius-*` tokens in `concepts/app/styles/tailwind/base.css`. Five follow the ADS scale: `xsmall` 2px, `small` 4px, `medium` 6px, `large` 8px and `xlarge` 12px. They back the Tailwind `rounded-xs`, `rounded-sm`, `rounded-md`, `rounded-lg` and `rounded-xl` utilities. Nine `legacy-*` tokens hold the off-scale sizes the prototype already used: 1, 3, 5, 7, 9, 10, 11, 14 and 999px. They are named by pixel size, so phase 2 can point each one at an ADS step. In class names use `rounded-legacy-5`, or `[border-radius:var(--ds-radius-legacy-7)]` for shorthand and logical corners. The radius literals in `concepts/app/styles` are not tokenised yet.

Decided in #27 on 2026-11-25, not yet applied. Phase 2 moves every `legacy-*` radius to an ADS step. No radius stays custom and no `xxlarge` token is added. `legacy-1` becomes `xsmall` (2px), `legacy-3` becomes `small` (4px), `legacy-5` becomes `medium` (6px), `legacy-7` and `legacy-9` become `large` (8px), and `legacy-10`, `legacy-11` and `legacy-14` become `xlarge` (12px). Each `legacy-*` token is then removed. Pills (`legacy-999`) are left to the implementation ticket. On seven screens at 390, 768, 1024 and 1440px, every visible change is 1px, except `legacy-10` and `legacy-14` at 2px. Dialogs and menus were not measured. Radius literals in plain CSS do not read the tokens and stay as they are. Measurements are in `docs/prototype/27-radius-measure.json` on branch `prototype/27-radius-comparison`.

### Spacing

Spacing is `--ds-space-*` tokens in `concepts/app/styles/tailwind/base.css`, written in class names as arbitrary values such as `p-[var(--ds-space-075)]` or `[margin:var(--ds-space-150)_0]`. Nine tokens follow the ADS scale and use the ADS step names: `025` 2px, `050` 4px, `075` 6px, `100` 8px, `150` 12px, `200` 16px, `250` 20px, `300` 24px and `500` 40px. Twenty-two `legacy-*` tokens hold the off-scale values the prototype already used, named by pixel size, for example `--ds-space-legacy-14`. Phase 2 can point each one at an ADS step. Negative values are written as `calc(var(--ds-space-100)*-1)`. Spacing literals in the plain CSS files in `concepts/app/styles` and `calc()` expressions such as `pb-[calc(1rem+var(--flag-reserve,0px))]` are not tokenised yet.

Decided in #29 on 2026-11-25, not yet applied. Phase 2 moves every `legacy-*` spacing token to an ADS step. When a value is exactly between two steps, the smaller step is used. No spacing stays custom. The select arrow keeps its own 28px token, `--ds-select-arrow-space`, decided in #20. The steps `0`, `400`, `600` and `800` need new tokens, because the prototype defines only nine ADS steps. Each `legacy-*` token is then removed. `legacy-0-5` and `legacy-22` do not appear on any measured screen, and `legacy-13`, `legacy-15` and `legacy-34` were not measured. Check them visually when they are applied, and check the borders and separators that `legacy-1` moves to 0. Measurements are in `docs/prototype/29-spacing-measure.json` on branch `prototype/29-spacing-comparison`.

The spacing token commit (`fd27932`) changed some paddings. These elements carry two conflicting padding classes, and renaming the values changed which class wins. The new values were accepted as the current design on 2026-11-25:

| Element | Before | Accepted |
| --- | --- | --- |
| `.dbody` in dialogs that carry both classes (Customer, Geography, data list) | `16px 20px` | `10px 14px` |
| `.customer-unit-drawer-header` | `16px 20px` | `10px 14px` |
| `.customer-unit-drawer-body` | `16px 20px 24px` | `10px 14px` |
| `.prototype-surface-card-header` | `8px 12px` | `7px 9px` |
| `.prototype-surface-card-body` | `12px` | `7px 9px` |
| `.customer-section-heading` | `8px 12px` | `5px 8px` |

The overridden class is still in the markup of these elements, so changing its token has no effect there.

## Deviations

| Area | ADS | Prototype | Status |
| --- | --- | --- | --- |
| Font | Atlassian Sans | `system-ui` stack | Accepted |
| Icons | ADS icon set | Hand-drawn SVG symbols in `concepts/app/shell/icons.html` | Accepted |
| Select | ADS Select | Native `<select>` (90 uses) | Accepted |
| Switch | Regular 32×16, thumb 12px | 30×17, thumb 13px | Decided in #30, not applied yet |
| Radius | ADS scale: 2, 4, 6, 8 and 12px | ADS tokens plus `legacy-*` tokens for 1, 3, 5, 7, 9, 10, 11, 14 and 999px | Tokenised, not normalised |
| Font sizes | ADS type scale | 22 role-based tokens with the sizes already in use | Implemented, no visual change |
| Spacing | ADS scale | ADS tokens plus `legacy-*` tokens for 0.5, 1, 3, 5, 7, 9, 10, 11, 13, 14, 15, 17, 18, 22, 26, 28, 30, 34, 46, 54, 68 and 72px | Tokenised, not normalised; accepted padding changes are listed under [Spacing](#spacing) |
| Record identity card | Not specified; stacks below `lg` (1440px) | Profile, Customer, People and the contact dialog stack the fields above the photo below 1440px | Implemented (#11, #1), no overlap measured at 390 to 1440px |
| Viewport breakpoints | `xs` 30, `sm` 48, `md` 64, `lg` 90, `xl` 110.5rem (480, 768, 1024, 1440, 1768px at a 16px root) | ADS steps as `--breakpoint-xs` to `--breakpoint-xl`, plus 9 `--breakpoint-legacy-*` tokens named by pixel value at a 16px root for values that have not moved to a step. All are written in `rem`, like ADS | Below `sm` (48rem, 768px) follows ADS; the rest is tokenised, not normalised (#12) |
| Flag title | `h2` heading | `h2` heading | Implemented, not visually verified |
| Flag Escape | Closes the topmost dismissible flag | Closes the topmost dismissible flag when focus is inside a flag | Implemented, not visually verified |
| Flag tones | Success, warning and error are bold and not dismissible | Same | Implemented, not visually verified |
| Flag font | 14px / 20px (`@atlaskit/flag` 19.0.7, `ds-font-body`) | 14px / 20px for title, body and action | Implemented, not visually verified |
| Flag mobile breakpoint | `max-width: 560px` (`@atlaskit/flag` 19.0.7, flag group) | 560px for Flag placement and the pages that reserve room for it | Implemented, not visually verified |
| Spotlight fallbacks | Tokens only | Tokens only (hex fallbacks removed) | Implemented, not visually verified |

Decided in #18 on 2026-11-25, not yet applied. In the first pass, the switch, the modal and the tabs move to ADS behaviour and sizes. Each one is measured and shown before its change lands: the switch in #30, the modal widths and behaviour in #31, and the tab padding and font weight in #33. Modal widths move to ADS steps only after every dialog is measured. The modal's Escape, backdrop click and focus return move with the behaviour change. Buttons get shared, tokenised variants first, with no visible change (#32). Button sizes are compared after that. The select stays native. The Flag visual check is still open.

Decided in #30 on 2026-11-25, not yet applied. The visible switch moves from 30×17 with a 13px thumb to the ADS size, 32×16 with a 12px thumb. Thumb travel becomes 16px in both directions (derived from the 2px inset on each side, not measured). The visible switches are the notifications filter, the events reminder and the two Email selection switches at 390, 768, 1024 and 1440px, and the Profile appearance pair at 390, 768 and 1440px (1024px was not measured on that route). The notifications panel filter uses the same 30×17 switch but was not visible on any measured screen. The 34×20 dialog toggles and the 34×20 `switchRow` (event all-day, note pinned) were not visible on any measured screen, are not part of this decision and stay open. Measurements are in `docs/prototype/30-switch-measure.json`; its rows mark the two Email switches as `switchRow`, but they are inline 30×17 switches.

Decided in #31 on 2026-11-25, not yet applied. Option A: every sized modal moves to the nearest ADS width, 400, 600, 800 or 968px. No width is exactly between two steps. The measurement covers the 46 `role="dialog"` elements that render when the app loads. The 47th in the source is the Email "Search filters" dialog, which sits in a `<template>` and was not measured; it declares `min(520px, 96vw)` and moves to 600px. Of the 46, 33 are sized modals and move, all with a 12px radius (ADS `radius.xlarge`). The other 13 are drawers, popovers, full-viewport panels and the prototype's own "About this prototype" box, and this decision does not cover them. Steps are taken from the width rendered at 1440px: 400 for 4 modals (Change password, Set / change PIN code, Revoke session, Log out), 600 for 17, 800 for 7, and 968 for 5 (Find value at 1040px, the Customer contact dialog at 1100px, Customize your sidebar at 980px, and Display Journal Entry and Screen Parameters at 1180px). Customize your sidebar declares `min(720px, 96vw)` but renders at 980px; the rule that widens it was not traced. Post, Delete and Cancel invoice render at 640px; their `.wide` state was not opened. Before the change lands, check visually the dialogs that shrink the most: Journal Entry and Screen Parameters (1180px to 968px) and the contact dialog (1100px to 968px). Behaviour, measured on Keyboard shortcuts and Log out only: Escape and backdrop click close the dialog, and focus moves inside on open. Focus does not return to the trigger on close; it lands on `<body>`, because both triggers are menu items that close before the dialog opens. The other 31 modals were not tested, and Escape handling is per dialog, not shared. Mobile: ADS makes the dialog full screen below 480px; the current 94–96vw is unchanged by this decision and needs its own decision. Measurements are in `docs/prototype/31-modal-measure.json`.

## Responsive breakpoints

ADS breakpoints, from `UNSAFE_BREAKPOINTS_CONFIG` in `@atlaskit/primitives` 22.8.0:

| Name | Range | Role in the ADS comments | Grid margin | Grid gutter |
| --- | --- | --- | --- | --- |
| `xxs` | 0 to 29.99rem (479px) | Mobile | `space.200` | `space.200` |
| `xs` | 30 to 47.99rem (480 to 767px) | Phablet | `space.200` | `space.200` |
| `sm` | 48 to 63.99rem (768 to 1023px) | Tablet | `space.300` | `space.200` |
| `md` | 64 to 89.99rem (1024 to 1439px) | Laptop and desktop | `space.400` | `space.300` |
| `lg` | 90 to 110.49rem (1440 to 1767px) | Monitor | `space.400` | `space.400` |
| `xl` | 110.5rem and up (1768px and up) | Large, high resolution | `space.500` | `space.400` |

The roles come from comments next to `UNSAFE_BREAKPOINTS_CONFIG`. ADS has no single "mobile" threshold. Each component picks its own switch (versions: `@atlaskit/navigation-system` 12.1.0, `@atlaskit/page-layout` 5.5.9, `@atlaskit/modal-dialog` 17.3.0, `@atlaskit/flag` 19.0.7):

| Threshold | Where ADS switches |
| --- | --- |
| `md`, 64rem (1024px) | The side navigation is desktop at and above it and uses a separate mobile state below it. The flyout only exists on desktop, and the Panel becomes an overlay below it. The Aside stacks below it (only its `64rem` query was read). |
| `sm`, 48rem (768px) | The top navigation goes compact, and the legacy page-layout sidebar becomes a flyout. |
| `xs`, 30rem (480px) | The modal dialog goes full screen below `29.9375rem`. |
| 35rem (560px) | The Flag phone layout. This is specific to Flag and is not a grid step. |

So a tablet (768 to 1023px) gets the wider content layout but the mobile shell. The role names above were read from code comments, not from the atlassian.design pages.

Below `sm` (`width < 48rem`) is the compact layout: section navigation, record footers, the single-pane email and the calendar context strip. The Organization overview gauge cards also switch at `sm`. ADS does not define the remaining `legacy` values. Those are prototype choices. The `560px` Flag breakpoint comes from the ADS Flag component, not from the grid.

### How breakpoints are written

Every viewport breakpoint value lives once, in the `--breakpoint-*` blocks in `concepts/app/styles/tailwind.css`. ADS steps are named for the step (`--breakpoint-sm`). A value that has not moved to a step is named for its own pixel value (`--breakpoint-legacy-620`), so a later phase can move it to an ADS step one group at a time. Use the token, never a pixel literal.

All values are in `rem`, like ADS (`48rem`, not `768px`). At the default 16px browser font size nothing changes: `legacy-620` is `38.75rem`, which is 620px. Media queries read `rem` from the browser's default font size, not from any `font-size` set on `html`. If a user raises the default font size, every breakpoint moves up together and the layout switches to its compact form earlier, as in ADS. `--ui-scale` is a `zoom` on the frame and does not affect media queries.

Do not mix units in the theme. Tailwind sorts named variants by value inside each unit and puts all `px` rules before all `rem` rules, so one `px` token among `rem` ones would reorder the cascade (for example a `900px` rule would come before `max-md` at 64rem, and `max-md` would override it below 900px). Add new tokens in `rem`.

- Class names, exclusive (`width < N`): `max-sm:`, `min-sm:` and `max-md:`. Tailwind sorts these by value, so a narrower rule still wins over a wider one.
- Class names, inclusive (`width <= N`): `[@media(max-width:theme(--breakpoint-legacy-560))]:`. Tailwind sorts these by their text, so the order between breakpoints follows the token names. The names are all digits after the same prefix to keep the order the prototype already had.
- Plain CSS in `concepts/app/styles/tailwind/*.css`: `@media (width < theme(--breakpoint-sm))` for an ADS step, `@media (max-width: theme(--breakpoint-legacy-1200))` for a legacy value.
- Script: `belowQuery('md')` or `maxWidthQuery('legacy1200')` from `concepts/app/core/breakpoints.js`, for example `window.matchMedia(belowQuery('md')).matches`. A media query string cannot read a CSS variable, so the values are mirrored there in `rem` and `tests/breakpoints.test.mjs` fails if they drift from the tokens. Do not compare `window.innerWidth` to a number.

Not tokenised: the prototype control kit (`concepts/app/prototype/controls.css` and `controls.js`, which are not compiled by Tailwind, still `720px`), and `@container` queries, which size a component and not the viewport. The `@container` queries stay in `px`; ADS also uses `px` in some container queries.

Adding a new value means adding a token first. `--breakpoint-*` also feeds Tailwind's `container` utility, which nothing applies, but it now carries one rule per token.

Prototype breakpoints:

- `1439px` (stack below ADS `lg`, 1440px): record identity card in Profile, Customer, People and the contact dialog.
- Below `sm` (768px): Profile, Customer, People and Organization section navigation.
- `560px`: Flag moves to the phone layout, and pages reserve room under it.
- `620px` (`--breakpoint-legacy-620`): a documented custom value, not an ADS step. The data list starts with its statistics collapsed (`concepts/app/components/data-list/model.js`), the home launchpad chrome goes compact, the invoice adjustment actions wrap, and the placeholder and For you pages tighten their padding. The statistics default is tied to the collapsed toolbar, so moving only one of them would separate the two. Keep it at 620px unless the toolbar breakpoint moves with it.
- `1023px` (below ADS `md`, 1024px): the shell sidebar collapses and the top bar goes compact, the Email screen swaps its folder rail for a select, and the invoice settlement stacks. This was 900px. At 901 to 1023px the open sidebar left the Email reading pane 200 to 320px wide, so the switch now sits on the same ADS step as the side navigation.
- Also below `md`: the data list toolbar wraps to a second row and moves Print, Chart and Group by into its overflow menu, the data list statistics drop to two columns (the exceptions layout stacks), and the Notes, Events, Activities, For you, placeholder and kanban content takes an 8px inset. These were 900px, except the statistics, which were 1100px. They moved to align with ADS, with two known effects: between 1024 and 1100px the four statistics columns are narrow, and below `md` the inset content sits 8px inside the page heading from 621px up.
- Page content is capped at `1296px` wide. This is the ADS grid maximum quoted in ADS guidance, not checked against a package in this repo.

## Roadmap

1. **Phase 1, tokens with no visual change.** Move the existing type, spacing and radius values into named tokens. Font sizes, radius and spacing are done. Changing one token then updates every use. Screenshots must not change.
2. **Phase 2, normalise to the scale.** Map the values to a small set. This changes the look, so it needs approval and updated screenshot baselines.
3. **Open items.** The shell, Email, invoice, data list, data list statistics, collaboration pages and kanban inset are on `md`. The other `legacy` values (for example 1200px in Geography and Organization) still need a decision to align with ADS or to stay as a documented custom choice. Breakpoints are tokenised, so each group can move one value at a time (#21).
