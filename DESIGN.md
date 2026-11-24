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

### Radius

Radii are `--ds-radius-*` tokens in `concepts/app/styles/tailwind/base.css`. Five follow the ADS scale: `xsmall` 2px, `small` 4px, `medium` 6px, `large` 8px and `xlarge` 12px. They back the Tailwind `rounded-xs`, `rounded-sm`, `rounded-md`, `rounded-lg` and `rounded-xl` utilities. Nine `legacy-*` tokens hold the off-scale sizes the prototype already used: 1, 3, 5, 7, 9, 10, 11, 14 and 999px. They are named by pixel size, so phase 2 can point each one at an ADS step. In class names use `rounded-legacy-5`, or `[border-radius:var(--ds-radius-legacy-7)]` for shorthand and logical corners. The radius literals in `concepts/app/styles` are not tokenised yet.

### Spacing

Spacing is `--ds-space-*` tokens in `concepts/app/styles/tailwind/base.css`, written in class names as arbitrary values such as `p-[var(--ds-space-075)]` or `[margin:var(--ds-space-150)_0]`. Nine tokens follow the ADS scale and use the ADS step names: `025` 2px, `050` 4px, `075` 6px, `100` 8px, `150` 12px, `200` 16px, `250` 20px, `300` 24px and `500` 40px. Twenty-two `legacy-*` tokens hold the off-scale values the prototype already used, named by pixel size, for example `--ds-space-legacy-14`. Phase 2 can point each one at an ADS step. Negative values are written as `calc(var(--ds-space-100)*-1)`. Spacing literals in the plain CSS files in `concepts/app/styles` and `calc()` expressions such as `pb-[calc(1rem+var(--flag-reserve,0px))]` are not tokenised yet.

## Deviations

| Area | ADS | Prototype | Status |
| --- | --- | --- | --- |
| Font | Atlassian Sans | `system-ui` stack | Accepted |
| Icons | ADS icon set | Hand-drawn SVG symbols in `concepts/app/shell/icons.html` | Accepted |
| Select | ADS Select | Native `<select>` (90 uses) | Accepted |
| Switch | Regular 32×16, thumb 12px | 30×17, thumb 13px | Accepted |
| Radius | ADS scale: 2, 4, 6, 8 and 12px | ADS tokens plus `legacy-*` tokens for 1, 3, 5, 7, 9, 10, 11, 14 and 999px | Tokenised, not normalised |
| Font sizes | ADS type scale | 22 role-based tokens with the sizes already in use | Implemented, no visual change |
| Spacing | ADS scale | ADS tokens plus `legacy-*` tokens for 0.5, 1, 3, 5, 7, 9, 10, 11, 13, 14, 15, 17, 18, 22, 26, 28, 30, 34, 46, 54, 68 and 72px | Tokenised, not normalised |
| Record identity card | Not specified; stacks below `lg` (1440px) | Profile, Customer, People and the contact dialog stack the fields above the photo below 1440px | Implemented (#11, #1), no overlap measured at 390 to 1440px |
| Viewport breakpoints | `xs` 30, `sm` 48, `md` 64, `lg` 90, `xl` 110.5rem (480, 768, 1024, 1440, 1768px at a 16px root) | ADS steps as `--breakpoint-xs` to `--breakpoint-xl`, plus 12 `--breakpoint-legacy-*` tokens named by pixel value at a 16px root for values that have not moved to a step. All are written in `rem`, like ADS | Below `sm` (48rem, 768px) follows ADS; the rest is tokenised, not normalised (#12) |
| Flag title | `h2` heading | `h2` heading | Implemented, not visually verified |
| Flag Escape | Closes the topmost dismissible flag | Closes the topmost dismissible flag when focus is inside a flag | Implemented, not visually verified |
| Flag tones | Success, warning and error are bold and not dismissible | Same | Implemented, not visually verified |
| Flag font | 14px / 20px (`@atlaskit/flag` 19.0.7, `ds-font-body`) | 14px / 20px for title, body and action | Implemented, not visually verified |
| Flag mobile breakpoint | `max-width: 560px` (`@atlaskit/flag` 19.0.7, flag group) | 560px for Flag placement and the pages that reserve room for it | Implemented, not visually verified |
| Spotlight fallbacks | Tokens only | Tokens only (hex fallbacks removed) | Implemented, not visually verified |

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

Below `sm` (`width < 48rem`) is the compact layout: section navigation, record footers, the single-pane email and the calendar context strip. The Organization overview gauge cards also switch at `sm`. ADS does not define `900px` or the other remaining `legacy` values. Those are prototype choices. The `560px` Flag breakpoint comes from the ADS Flag component, not from the grid.

### How breakpoints are written

Every viewport breakpoint value lives once, in the `--breakpoint-*` blocks in `concepts/app/styles/tailwind.css`. ADS steps are named for the step (`--breakpoint-sm`). A value that has not moved to a step is named for its own pixel value (`--breakpoint-legacy-900`), so a later phase can move it to an ADS step one group at a time. Use the token, never a pixel literal.

All values are in `rem`, like ADS (`48rem`, not `768px`). At the default 16px browser font size nothing changes: `legacy-900` is `56.25rem`, which is 900px. Media queries read `rem` from the browser's default font size, not from any `font-size` set on `html`. If a user raises the default font size, every breakpoint moves up together and the layout switches to its compact form earlier, as in ADS. `--ui-scale` is a `zoom` on the frame and does not affect media queries.

Do not mix units in the theme. Tailwind sorts named variants by value inside each unit and puts all `px` rules before all `rem` rules, so one `px` token among `rem` ones would reorder the cascade (for example `max-md` at 64rem would land after `max-legacy-900` and override it between 900 and 1023px). Add new tokens in `rem`.

- Class names, exclusive (`width < N`): `max-sm:`, `min-sm:` and `max-legacy-900:`. Tailwind sorts these by value, so a narrower rule still wins over a wider one.
- Class names, inclusive (`width <= N`): `[@media(max-width:theme(--breakpoint-legacy-900))]:`. Tailwind sorts these by their text, so the order between breakpoints follows the token names. The names are all digits after the same prefix to keep the order the prototype already had.
- Plain CSS in `concepts/app/styles/tailwind/*.css`: `@media (width < theme(--breakpoint-sm))` for an ADS step, `@media (max-width: theme(--breakpoint-legacy-900))` for a legacy value.
- Script: `belowQuery('sm')` or `maxWidthQuery('legacy900')` from `concepts/app/core/breakpoints.js`, for example `window.matchMedia(maxWidthQuery('legacy900')).matches`. A media query string cannot read a CSS variable, so the values are mirrored there in `rem` and `tests/breakpoints.test.mjs` fails if they drift from the tokens. Do not compare `window.innerWidth` to a number.

Not tokenised: the prototype control kit (`concepts/app/prototype/controls.css` and `controls.js`, which are not compiled by Tailwind, still `720px`), and `@container` queries, which size a component and not the viewport. The `@container` queries stay in `px`; ADS also uses `px` in some container queries.

Adding a new value means adding a token first. `--breakpoint-*` also feeds Tailwind's `container` utility, which nothing applies, but it now carries one rule per token.

Prototype breakpoints:

- `1439px` (stack below ADS `lg`, 1440px): record identity card in Profile, Customer, People and the contact dialog.
- Below `sm` (768px): Profile, Customer, People and Organization section navigation.
- `560px`: Flag moves to the phone layout, and pages reserve room under it.
- `620px` (`--breakpoint-legacy-620`): a documented custom value, not an ADS step. The data list starts with its statistics collapsed (`concepts/app/components/data-list/model.js`), the home launchpad chrome goes compact, the invoice adjustment actions wrap, and the placeholder and For you pages tighten their padding. The statistics default is tied to the collapsed toolbar, so moving only one of them would separate the two. Keep it at 620px unless the toolbar breakpoint moves with it.
- `1023px` (below ADS `md`, 1024px): the shell sidebar collapses and the top bar goes compact, the Email screen swaps its folder rail for a select, and the invoice settlement stacks. This was 900px. At 901 to 1023px the open sidebar left the Email reading pane 200 to 320px wide, so the switch now sits on the same ADS step as the side navigation.
- Page content is capped at `1296px` wide. This is the ADS grid maximum quoted in ADS guidance, not checked against a package in this repo.

## Roadmap

1. **Phase 1, tokens with no visual change.** Move the existing type, spacing and radius values into named tokens. Font sizes, radius and spacing are done. Changing one token then updates every use. Screenshots must not change.
2. **Phase 2, normalise to the scale.** Map the values to a small set. This changes the look, so it needs approval and updated screenshot baselines.
3. **Open items.** The data list and its statistics (900px and 1100px), notes, events, activities, For you, placeholder and the kanban inset (900px) still use legacy values, which are not ADS breakpoints. The shell, Email and invoice moved to `md`. Each remaining value needs a decision to align with ADS or to stay as a documented custom choice. Breakpoints are tokenised, so each group can move one value at a time (#12).
