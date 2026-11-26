# Design system

The prototype's visual language is based on the Atlassian Design System (ADS). ADS is a reference, not a dependency: no `@atlaskit/*` package is installed, and the components are hand-written HTML, CSS and JavaScript.

## Source of truth

- ADS is the default for tokens, component behaviour, sizes and breakpoints. The agreed prototype screens, colours and layouts are the reference for the look. Every difference from ADS is an exception listed in this file with its reason. See [ADR 0001](docs/adr/0001-prototype-as-design-reference.md).
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

Font sizes are role-based tokens in the `@theme` block of `concepts/app/styles/tailwind.css`, used as utilities such as `text-body` and `text-caption`. Each role also has a line height token, such as `--text-body--line-height`, so the utility sets both. An element with its own `leading-*` class keeps its line height. There are 22 tokens, from `--text-badge` (12px) to `--text-display-lg` (32px), and several roles share a size. The 96 raw `font-size` literals in `concepts/app/styles` are not tokenised yet.

Decided in #28 on 2026-11-25, applied in #35. Role names stay and only their values changed. The ADS line heights were applied directly. The planned first step, which kept the earlier line heights, was skipped because they differed between elements that share `body`, `dense` or `subtitle`. Sizes and line heights are in px.

| Role | Type | Size before | Size | Line height |
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

Measured when applied, on 29 screen states at 390, 768, 1024 and 1440px, and at 390px right-to-left. All 6,465 size changes match the table. 2,664 element boxes changed height by more than 1px (661 taller, 2,003 shorter), and no control at 390px dropped below 44px or 24px. No new page overflow, off-screen element or horizontal scroll appeared. `stat-delta` appears only in the hidden Performance section and `heading-md` was not opened. Dialogs were not measured. Totals are in `docs/prototype/35-font-size-measure.json`. The earlier comparison is in `docs/prototype/28-font-size-measure.json` on branch `prototype/28-font-size-comparison`.

Two fixes landed with the change. Between `sm` and `md` (768 to 1023px) the gap in a Home app tile is 12px instead of 20px, so "Dashboard" and "Customers" are not cut at 768px. The notification badge is 16px high with a 12px line height, so its digit stays inside the border.

Accepted truncation: "Wholesale customer" on customer cards at 390 to 1024px and one email stack subject at 1440px now end with an ellipsis. On invoice cards at 390px, titles and document numbers were already cut before this change; they now lose a few more pixels, and in right-to-left more of them are cut (9 to 14 on a touch viewport). Three long Home app names also end with an ellipsis after two lines where they did not before: one at 767px, and one each at 768 and 800px in compact density.

### Radius

Radii are `--ds-radius-*` tokens in `concepts/app/styles/tailwind/base.css`. Five follow the ADS scale: `xsmall` 2px, `small` 4px, `medium` 6px, `large` 8px and `xlarge` 12px. They back the Tailwind `rounded-xs`, `rounded-sm`, `rounded-md`, `rounded-lg` and `rounded-xl` utilities. A sixth token, `full` (999px), is for pills and circles; no `legacy-*` radius token remains. In class names use `rounded-md`, or `[border-radius:var(--ds-radius-large)]` for shorthand and logical corners. The radius literals in `concepts/app/styles` are not tokenised yet.

Decided in #27 on 2026-11-25, applied in #34. Phase 2 moves every `legacy-*` radius to an ADS step. No radius stays custom and no `xxlarge` token is added. `legacy-1` becomes `xsmall` (2px), `legacy-3` becomes `small` (4px), `legacy-5` becomes `medium` (6px), `legacy-7` and `legacy-9` become `large` (8px), and `legacy-10`, `legacy-11` and `legacy-14` become `xlarge` (12px). Each `legacy-*` token is then removed. Pills were left to the implementation ticket: #34 renames `legacy-999` to `full` and keeps 999px, the value on the atlassian.design Radius page (the token list there shows 9999px). On seven screens at 390, 768, 1024 and 1440px, every visible change is 1px, except `legacy-10` and `legacy-14` at 2px. Dialogs and menus were not measured. Radius literals in plain CSS do not read the tokens and stay as they are. Measurements are in `docs/prototype/27-radius-measure.json` on branch `prototype/27-radius-comparison`. Measured again when applied, on 20 screens at 390, 768, 1024 and 1440px: 70,864 computed radius readings match the mapping with no unexpected change, and none of 38,745 compared element boxes changed size by more than 1px. `legacy-1` did not appear on a measured screen, and `legacy-11` appeared only on hidden elements. The totals are in `docs/prototype/34-radius-measure.json`.

### Spacing

Spacing is `--ds-space-*` tokens in `concepts/app/styles/tailwind/base.css`, written in class names as arbitrary values such as `p-[var(--ds-space-075)]` or `[margin:var(--ds-space-150)_0]`. Every token is an ADS step and uses the ADS step name: `0`, `025` 2px, `050` 4px, `075` 6px, `100` 8px, `150` 12px, `200` 16px, `250` 20px, `300` 24px, `400` 32px, `500` 40px, `600` 48px and `800` 64px. The select arrow keeps its own 28px token, `--ds-select-arrow-space`, decided in #20. Negative values are written as `calc(var(--ds-space-100)*-1)`. Controls joined so that their borders overlap use `calc(var(--ds-border-width)*-1)`, where `--ds-border-width` is the ADS `border.width` token, 1px. Spacing literals in the plain CSS files in `concepts/app/styles` and `calc()` expressions such as `pb-[calc(1rem+var(--flag-reserve,0px))]` are not tokenised yet.

Decided in #29 on 2026-11-25, applied in #36. Every `legacy-*` spacing token moved to an ADS step and was removed. When a value was exactly between two steps, the smaller step was used. No spacing stays custom.

| Before (px) | Step |
| --- | --- |
| 0.5, 1 | `0` |
| 3 | `025` |
| 5 | `050` |
| 7 | `075` |
| 9, 10 | `100` |
| 11, 13, 14 | `150` |
| 15, 17, 18 | `200` |
| 22 | `250` |
| 26, and the three 28px paddings that are not a select arrow | `300` |
| 28 on a select arrow | `--ds-select-arrow-space` |
| 30, 34 | `400` |
| 46, 54 | `600` |
| 68, 72 | `800` |

One exception: 13 uses of `legacy-1` were not spacing but border overlaps, 8 lookup and picker buttons joined to their field and 5 dialog toggles whose input covers the border. At 0 the border between a field and its lookup button was drawn twice, so they read `--ds-border-width` and stay at -1px. The other `legacy-1` uses moved to 0 with no visible problem: the 1px gap between items in the Profile and Organization section navigation, the presence dot on Organization avatars, which moves 1px into the corner, and the bottom margin of the remove button in invoice charge rows. The 0.5px gap between uptime segments is gone; it is in the hidden Performance section. `--ds-button-label-padding-inline` read `legacy-11`, so label buttons have 12px inline padding instead of 11px; #37 compares button sizes.

Measured when applied, on 27 screen states at 390, 768, 1024 and 1440px, and at 390px right-to-left. Each spacing reading before the change was traced to its token with a sentinel value. All 20,338 traced readings match the table, apart from the 195 border-overlap readings above, which keep their value on purpose. 2,296 element boxes changed height by more than 1px (777 taller by up to 35px, 1,519 shorter by up to 188px; the largest is the whole Customer record, 5,810px to 5,622px). No new page overflow, off-screen element or horizontal scroll appeared. On invoice cards at 390px right-to-left two more titles end with an ellipsis, the case tracked in #45. `legacy-0-5`, `-13`, `-15`, `-22`, `-34`, `-46`, `-54` and `-68` did not appear on a measured screen and were not checked visually. Dialogs were not measured. Totals are in `docs/prototype/36-spacing-measure.json`. The earlier comparison is in `docs/prototype/29-spacing-measure.json` on branch `prototype/29-spacing-comparison`.

Decided in #25 on 2026-11-26, applied in #38. Numeric spacing utilities such as `px-2` read the same `--ds-space-*` tokens through `@theme inline`, so a token change reaches them. Off-scale utilities moved to the smaller ADS step: 2.5 to 2, 3.5 to 3, 5.5 to 5, 7 to 6, 9 to 8, 11 to 10, 14 to 12, and `px` to 0. `tests/tailwind.test.mjs` fails when an off-scale utility is written in `concepts`, `tests` or `scripts`; `tests/build.test.mjs` is excluded because it holds legacy markup as fixture input. Four exceptions keep the current look: the mobile page gutter `px-2.5` in `for-you` and `placeholder` stays 10px so it matches the `.phead` gutter until #40; search fields use `pe-8` (32px), not 24px, because the clear button needs 28px; the email compact density moves one step down to 6px so compact, default and comfortable stay distinct; the sign-in Change button has a 44px minimum width on coarse pointers because its Arabic label is 42px without it. Spacing literals in plain CSS are not covered by #25 and remain custom (383 off-scale values, mostly in `shell.css`). Measurements are in `docs/prototype/38-spacing-utilities-measure.json`.

The spacing token commit (`fd27932`) changed some paddings. These elements carried two conflicting padding classes, and renaming the values changed which class wins. The new values were accepted as the current design on 2026-11-25. Renaming the values again in #36 would have flipped them back, so the overridden class was removed from these elements and the accepted value moved to its ADS step:

| Element | Before `fd27932` | Accepted | Now |
| --- | --- | --- | --- |
| `.dbody` in dialogs that carry both classes (Customer, Geography, data list) | `16px 20px` | `10px 14px` | `8px 12px` |
| `.customer-unit-drawer-header` | `16px 20px` | `10px 14px` | `8px 12px` |
| `.customer-unit-drawer-body` | `16px 20px 24px` | `10px 14px` | `8px 12px` |
| `.prototype-surface-card-header` | `8px 12px` | `7px 9px` | `6px 8px` |
| `.prototype-surface-card-body` | `12px` | `7px 9px` | `6px 8px` |
| `.customer-section-heading` | `8px 12px` | `5px 8px` | `4px 8px` |

Two classes that set the same property under the same variant are ordered by their text in the generated CSS, so renaming a value can change which one wins. In the files #36 changed, 36 such pairs remain with a `--ds-space-*` value, and none of them changed its winner.

### Buttons

`.ibtn` (icon) and `.lbtn` (label) in `concepts/app/styles/tailwind/shell.css` read the `--ds-button-*` tokens in `concepts/app/styles/tailwind/base.css`: 6px gap, 6px radius, 32px icon button, 4px 8px icon padding, and 6px 12px label padding. These are the ADS default button values (`@atlaskit/button` 25.8.3): 32px tall, 14px / 20px text, weight 500.

Applied in #37. A label button is 32px tall on desktop. It sets the 20px body line height and keeps a real 1px border, and its block padding is `calc(var(--ds-button-label-padding-block) - var(--ds-border-width))`, so the border sits inside the 6px inset and the outside height stays 32px. ADS draws the border on an `::after` layer instead; the split New and Save buttons remove one side of the real border, so the border stays on the element. The inline padding is still 12px plus the 1px border, 1px more than ADS. Label buttons inside a `.menu` (Transition, New, Save) used the `.menu > button` padding of 6px 10px and were 34px tall; that rule now skips `.lbtn`, so they are 32px tall and 4px wider. Compact density sets `line-height: inherit` on `.lbtn` and keeps its earlier 28.13px height.

Measured when applied, on 28 screen states at 390, 768, 1024 and 1440px, and at 390px right-to-left: 936 buttons. On desktop, 156 label buttons became 32px (141 from 34.3px, 15 with 13px text from 32.84px). The 3 sign-in Continue buttons stay 44px from their own `min-h-11`. Icon buttons did not change. At 390px every button stays 44px tall, from the coarse-pointer rule; ADS does not set a touch size. The only width changes are the `.menu` label buttons, 4px wider on 20 measured buttons, with no new overflow or off-screen button at 390px in either direction. On the invoice record at 1440px, label buttons are 32px in forced-colors mode and 40px (was 40.3px) in comfortable density. Dialogs were not opened. Totals are in `docs/prototype/37-button-measure.json`.

Still open: the other `.menu > button` triggers, such as Switch app, System Alerts, Help and More actions in the top bar, are 36px wide because of the 10px inline padding of that rule. The compact (26px) and comfortable (36px) density overrides are not tokens.

## Deviations

| Area | ADS | Prototype | Status |
| --- | --- | --- | --- |
| Font | Atlassian Sans | `system-ui` stack | Accepted |
| Icons | ADS icon set | Hand-drawn SVG symbols in `concepts/app/shell/icons.html` | Accepted |
| Select | ADS Select | Native `<select>` (90 uses) | Accepted |
| Switch | Regular 32×16, thumb 12px | 32×16, thumb 12px, from `--ds-switch-*` tokens; the 34×20 `switchRow` and dialog toggles keep their size | Applied (#41); 34×20 open |
| Radius | ADS scale: 2, 4, 6, 8 and 12px | ADS tokens; radius literals in plain CSS do not read them | Tokenised, literals remain |
| Font sizes | ADS type scale | 22 role-based tokens at ADS sizes (12 to 32px) with ADS line heights; elements with `leading-*` classes and raw `font-size` literals keep their own values | Applied (#35) |
| Spacing | ADS scale | ADS steps only, plus the 28px select arrow token (#20); border overlaps read `--ds-border-width`; off-scale utilities move to ADS steps (#25). Spacing literals in plain CSS are not tokenised | Applied (#36, #38); accepted padding changes are listed under [Spacing](#spacing) |
| Buttons | Default 32px tall, 6px 12px padding, border drawn inside | Label and icon buttons 32px tall on desktop; the border is a real 1px border inside the 6px block inset, so the inline inset is 13px. The other `.menu > button` triggers are 36px wide. 44px on touch | Applied (#37); top-bar triggers open |
| Record identity card | Not specified; stacks below `lg` (1440px) | Profile, Customer, People and the contact dialog stack the fields above the photo below 1440px | Implemented (#11, #1), no overlap measured at 390 to 1440px |
| Viewport breakpoints | `xs` 30, `sm` 48, `md` 64, `lg` 90, `xl` 110.5rem (480, 768, 1024, 1440, 1768px at a 16px root) | ADS steps as `--breakpoint-xs` to `--breakpoint-xl`, plus `--breakpoint-flag` (35rem, the ADS Flag value) and 5 `--breakpoint-legacy-*` tokens named by pixel value at a 16px root for values that have not moved to a step. All are written in `rem`, like ADS | Below `sm` (48rem, 768px) follows ADS (#12); `legacy-480` and `legacy-1240` moved to `xs` and `lg` (#39); the remaining `legacy` values are custom |
| Flag title | `h2` heading | `h2` heading | Implemented, not visually verified |
| Flag Escape | Closes the topmost dismissible flag | Closes the topmost dismissible flag when focus is inside a flag | Implemented, not visually verified |
| Flag tones | Success, warning and error are bold and not dismissible | Same | Implemented, not visually verified |
| Flag font | 14px / 20px (`@atlaskit/flag` 19.0.7, `ds-font-body`) | 14px / 20px for title, body and action | Implemented, not visually verified |
| Flag mobile breakpoint | `max-width: 560px` (`@atlaskit/flag` 19.0.7, flag group) | 560px for Flag placement and the pages that reserve room for it | Implemented, not visually verified |
| Spotlight fallbacks | Tokens only | Tokens only (hex fallbacks removed) | Implemented, not visually verified |

Decided in #18 on 2026-11-25, not yet applied. In the first pass, the switch, the modal and the tabs move to ADS behaviour and sizes. Each one is measured and shown before its change lands: the switch in #30, the modal widths and behaviour in #31, and the tab padding and font weight in #33. Modal widths move to ADS steps only after every dialog is measured. The modal's Escape, backdrop click and focus return move with the behaviour change. Buttons get shared, tokenised variants first, with no visible change (#32). Button sizes are compared after that. The select stays native. The Flag visual check is still open.

Decided in #30 on 2026-11-25, applied (#41). The visible switch moves from 30×17 with a 13px thumb to the ADS size, 32×16 with a 12px thumb. The sizes come from `--ds-switch-width`, `--ds-switch-height`, `--ds-switch-thumb-size` and `--ds-switch-thumb-travel` in `concepts/app/styles/tailwind/base.css`. Thumb travel is 16px in both directions with a 2px inset on each side, measured in #41 (`docs/prototype/41-switch-measure.json`). The visible switches are the notifications filter, the events reminder and the two Email selection switches at 390, 768, 1024 and 1440px, and the Profile appearance pair at 390, 768 and 1440px (1024px was not measured on that route). The notifications panel filter uses the same 30×17 switch but was not visible on any measured screen. The 34×20 dialog toggles and the 34×20 `switchRow` (event all-day, note pinned) were not visible on any measured screen, are not part of this decision and stay open. Measurements are in `docs/prototype/30-switch-measure.json`; its rows mark the two Email switches as `switchRow`, but they are inline 30×17 switches. In #41 the notifications panel filter, the Profile pair at 1024px and both `switchRow` uses were opened and measured, as were the five 34×20 toggles on the customer record (Linked To Beneficiaries, Black List, Salesperson, and the two inactivation toggles). The `switchRow` uses and the toggles kept their size. The four toggles inside dialogs (Calculate Tax On Free Qty, Deactivate, Affected By Transactions, Staff only) were not opened.

Decided in #31 on 2026-11-25, not yet applied. Option A: every sized modal moves to the nearest ADS width, 400, 600, 800 or 968px. No width is exactly between two steps. The measurement covers the 46 `role="dialog"` elements that render when the app loads. The 47th in the source is the Email "Search filters" dialog, which sits in a `<template>` and was not measured; it declares `min(520px, 96vw)` and moves to 600px. Of the 46, 33 are sized modals and move, all with a 12px radius (ADS `radius.xlarge`). The other 13 are drawers, popovers, full-viewport panels and the prototype's own "About this prototype" box, and this decision does not cover them. Steps are taken from the width rendered at 1440px: 400 for 4 modals (Change password, Set / change PIN code, Revoke session, Log out), 600 for 17, 800 for 7, and 968 for 5 (Find value at 1040px, the Customer contact dialog at 1100px, Customize your sidebar at 980px, and Display Journal Entry and Screen Parameters at 1180px). Customize your sidebar declares `min(720px, 96vw)` but renders at 980px; the rule that widens it was not traced. Post, Delete and Cancel invoice render at 640px; their `.wide` state was not opened. Before the change lands, check visually the dialogs that shrink the most: Journal Entry and Screen Parameters (1180px to 968px) and the contact dialog (1100px to 968px). Behaviour, measured on Keyboard shortcuts and Log out only: Escape and backdrop click close the dialog, and focus moves inside on open. Focus does not return to the trigger on close; it lands on `<body>`, because both triggers are menu items that close before the dialog opens. The other 31 modals were not tested, and Escape handling is per dialog, not shared. Mobile: ADS makes the dialog full screen below 480px; the current 94–96vw is unchanged by this decision and needs its own decision. Measurements are in `docs/prototype/31-modal-measure.json`.

Decided in #21 on 2026-11-25, applied (#39). `legacy-480` moved to `xs`, `legacy-1240` moved to `lg`, and `legacy-561` is removed: the Flag value is the named token `--breakpoint-flag` (35rem). The Flag phone layout stays at `max-width: 35rem` and its other side is `width > 35rem`. At 1280 and 1366px the People, Customer and Invoice card grids go from 3 to 2 columns; truncated card texts at 1280px drop from 13 to 0 on invoices, 4 to 0 on People and 1 to 0 on Customers. Statistics go single-column below `xs` (480px) instead of at 560px and under; at 520px they are two columns of 206px. `legacy-1200`, `legacy-1299` and `legacy-1600` stay custom (see [Prototype breakpoints](#responsive-breakpoints)). The three follow-ups #21 recorded for the earlier `md` move are measured and not applied: at 901–1023px the invoice list overflow menu holds Group by, but the search is 566 to 698px wide, not 160–260px; at 1024–1100px the statistics cards are 106px tall and one support label is still truncated at 1024px (left to right); at 621–1023px the 8px `max-md:mx-2` inset on collab bodies remains. Removing only that inset would leave the body at 16px while the collab toolbar, the Customers list, Email, For you and the placeholder page keep their content at 24px (measured from the page content edge). Measurements are in `docs/prototype/39-breakpoints-measure.json`.

Decided in #33 on 2026-11-25, not yet applied. The four underline tablists move to the ADS tab padding, 6px block and 8px inline, and to font weight 500: Invoice sections, Notification type, Operation unit details and the invoice activity drawer tabs. Today they use 8px 14px (the activity tabs 8px 2px), 13px and weight 600. The four segmented view switches keep their look, because ADS Tabs are underline tabs and the switches are a different control: Home quick tabs, Geography hierarchy view, Parent picker view and Unit picker view (5px 9px, 12.5px, weight 600). All eight get the same keyboard behaviour: Arrow keys move focus and select, Home and End go to the first and last tab, the arrows follow the reading direction in RTL, and only the selected tab is in the Tab order. Measured live at 1440px: Invoice sections and Notification type already do this. Operation unit details handles the keys in code but was not tested live, and its arrows do not flip in RTL. The activity tabs and the four switches do not handle the keys. The Customer record guided tablist is not reachable, because `setLayout` always sets `scroll`; it is not part of this decision. The ADS values come from the issue and were not reread from `@atlaskit/tabs`. The size change is derived, not measured: each underline tab becomes 12px narrower and about 4px shorter on desktop. At 390px every tab measured 44px tall; what sets that height was not traced. Measurements are in `docs/prototype/33-tabs-measure.json`.
Decided in #23 on 2026-11-25, not yet applied. The document scrolls, not `.page-content`, as ADS does. Pinned parts stay in place with `position: sticky` or `fixed`: the top bar, the side navigation, the record action bar, the section navigation in Profile, Customer and People, and the Flag. Data table headers keep sticking inside their own table box, not under the top bar, so tables keep their own vertical scroll box and their horizontal scroll. Sticky offsets read one CSS variable for the top bar height, not a value per component. Scroll position save, restore and jump use the document scroller. Fixed popovers keep their `100vh` limits. The change touches `core/scroll.js`, `resolveScroller()` and its 7 callers in 4 files, the 19 files that use `sticky`, the `--flag-reserve` space in 5 files, and `tests/scroll-architecture.spec.mjs`, which asserts the locked document and is rewritten with the change. It waits for the Playwright baseline repair and gets its own approval before any code changes.

Decided in #26 on 2026-11-25, applied. The four Profile field grids (personal information, employee details, employee contact and contact details) change their minimum column from 260px to `min(260px, 100%)`, so a column shrinks to the card width below 260px. Before the change, Profile clipped the right side of its fields at 320, 360 and 375px (confirmed on a screenshot at 320px). After it, no Profile field extends past its card at 320, 360, 375, 390 or 1440px. Widths of 260px and above are unchanged. The same pattern in 12 other grids is not changed by this decision: Invoices record still clips 7 fields at 320px, and the others were not measured. Long email values still scroll inside their input at 320px. Measurements are in `docs/prototype/26-phone-field-measure.json` and `docs/prototype/26-phone-clip-measure.json`.

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

Below `sm` (`width < 48rem`) is the compact layout: section navigation, record footers, the single-pane email and the calendar context strip. The Organization overview gauge cards also switch at `sm`. ADS does not define the remaining `legacy` values. Those are prototype choices. The `560px` Flag breakpoint (`--breakpoint-flag`) comes from the ADS Flag component, not from the grid.

### How breakpoints are written

Every viewport breakpoint value lives once, in the `--breakpoint-*` blocks in `concepts/app/styles/tailwind.css`. ADS steps are named for the step (`--breakpoint-sm`). A value that has not moved to a step is named for its own pixel value (`--breakpoint-legacy-620`), so a later phase can move it to an ADS step one group at a time. Use the token, never a pixel literal.

All values are in `rem`, like ADS (`48rem`, not `768px`). At the default 16px browser font size nothing changes: `legacy-620` is `38.75rem`, which is 620px. Media queries read `rem` from the browser's default font size, not from any `font-size` set on `html`. If a user raises the default font size, every breakpoint moves up together and the layout switches to its compact form earlier, as in ADS. `--ui-scale` is a `zoom` on the frame and does not affect media queries.

Do not mix units in the theme. Tailwind sorts named variants by value inside each unit and puts all `px` rules before all `rem` rules, so one `px` token among `rem` ones would reorder the cascade (for example a `900px` rule would come before `max-md` at 64rem, and `max-md` would override it below 900px). Add new tokens in `rem`.

- Class names, exclusive (`width < N`): `max-sm:`, `min-sm:` and `max-md:`. Tailwind sorts these by value, so a narrower rule still wins over a wider one.
- Class names, inclusive (`width <= N`): `[@media(max-width:theme(--breakpoint-legacy-620))]:`. Tailwind sorts these by their text, so the order between breakpoints follows the token names. The `legacy` names are all digits after the same prefix to keep the order the prototype already had. `flag` sorts before them; no element combines it with a `legacy` breakpoint on the same property. The wider side of the Flag is `[@media(width>theme(--breakpoint-flag))]:`.
- Plain CSS in `concepts/app/styles/tailwind/*.css`: `@media (width < theme(--breakpoint-sm))` for an ADS step, `@media (max-width: theme(--breakpoint-legacy-1200))` for a legacy value.
- Script: `belowQuery('md')` or `maxWidthQuery('legacy1200')` from `concepts/app/core/breakpoints.js`, for example `window.matchMedia(belowQuery('md')).matches`. A media query string cannot read a CSS variable, so the values are mirrored there in `rem` and `tests/breakpoints.test.mjs` fails if they drift from the tokens. Do not compare `window.innerWidth` to a number.

Not tokenised: the prototype control kit (`concepts/app/prototype/controls.css` and `controls.js`, which are not compiled by Tailwind, still `720px`), and `@container` queries, which size a component and not the viewport. The `@container` queries stay in `px`; ADS also uses `px` in some container queries.

Adding a new value means adding a token first. `--breakpoint-*` also feeds Tailwind's `container` utility, which nothing applies, but it now carries one rule per token.

Prototype breakpoints:

- `1439px` (stack below ADS `lg`, 1440px): record identity card in Profile, Customer, People and the contact dialog.
- Below `sm` (768px): Profile, Customer, People and Organization section navigation.
- `560px` (`--breakpoint-flag`): Flag moves to the phone layout, and pages reserve room under it.
- `1200px` (`--breakpoint-legacy-1200`): the Geography side tree and the Organization performance grid. Moving to `lg` would collapse the Geography tree into a 44px rail with a modal at 1280 and 1366px.
- `1299px` (`--breakpoint-legacy-1299`): the Organization gauges. Moving to `lg` would stack the cards at 1366px (371px to 753px).
- `1600px` (`--breakpoint-legacy-1600`): the Customer guided layout. It cannot be reached today because `setLayout` always sets `scroll`.
- `620px` (`--breakpoint-legacy-620`): a documented custom value, not an ADS step. The data list starts with its statistics collapsed (`concepts/app/components/data-list/model.js`), the home launchpad chrome goes compact, the invoice adjustment actions wrap, and the placeholder and For you pages tighten their padding. The statistics default is tied to the collapsed toolbar, so moving only one of them would separate the two. Keep it at 620px unless the toolbar breakpoint moves with it.
- `1023px` (below ADS `md`, 1024px): the shell sidebar collapses and the top bar goes compact, the Email screen swaps its folder rail for a select, and the invoice settlement stacks. This was 900px. At 901 to 1023px the open sidebar left the Email reading pane 200 to 320px wide, so the switch now sits on the same ADS step as the side navigation.
- Also below `md`: the data list toolbar wraps to a second row and moves Print, Chart and Group by into its overflow menu, the data list statistics drop to two columns (the exceptions layout stacks), and the Notes, Events, Activities, For you, placeholder and kanban content takes an 8px inset. These were 900px, except the statistics, which were 1100px. They moved to align with ADS, with two known effects: between 1024 and 1100px the four statistics columns are narrow, and below `md` the inset content sits 8px inside the page heading from 621px up.
- Page content is capped at `1296px` wide, including the page margins. This is the ADS grid maximum from atlassian.design/foundations/grid. Decided in #24 on 2026-11-25, applied (#40). The page grid follows that page, not the `@atlaskit/grid` package (1128px maximum). Boxed margins follow the page's breakpoint margins (16px below 1024px, 32px from 1024px), and the density padding (16px default, 12px compact) stays on top as a prototype choice. The page action bar and footer rows use the same margin as the content. Boxed content at 768–1023px moved from a 48px inset to 32px (44px to 28px compact). Every other width, and Fluid, stayed as it was, because the density padding already brings those to the ADS margin. Gutters and the 20px card gap are not covered here; the card gap is an ADS spacing step governed by #29. Measurements are in `docs/prototype/40-grid-measure.json`.

## Roadmap

1. **Phase 1, tokens with no visual change.** Move the existing type, spacing and radius values into named tokens. Font sizes, radius and spacing are done. Changing one token then updates every use. Screenshots must not change.
2. **Phase 2, normalise to the scale.** Map the values to a small set. This changes the look, so it needs approval and updated screenshot baselines.
3. **Open items.** The shell, Email, invoice, data list, data list statistics, collaboration pages and kanban inset are on `md`. The remaining `legacy` values (620, 1200, 1299, 1439 and 1600px) are documented custom choices (#12, #21). The three `md` follow-ups listed under #21 are open. Breakpoints are tokenised, so each group can move one value at a time.
