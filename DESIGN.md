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
| Viewport breakpoints | `xs` 480, `sm` 768, `md` 1024, `lg` 1440, `xl` 1768px | 17 `--breakpoint-legacy-*` tokens named by pixel value, one per value in use | Tokenised, not normalised (#12) |
| Flag title | `h2` heading | `h2` heading | Implemented, not visually verified |
| Flag Escape | Closes the topmost dismissible flag | Closes the topmost dismissible flag when focus is inside a flag | Implemented, not visually verified |
| Flag tones | Success, warning and error are bold and not dismissible | Same | Implemented, not visually verified |
| Flag font | 14px / 20px (`@atlaskit/flag` 19.0.7, `ds-font-body`) | 14px / 20px for title, body and action | Implemented, not visually verified |
| Flag mobile breakpoint | `max-width: 560px` (`@atlaskit/flag` 19.0.7, flag group) | 560px for Flag placement and the pages that reserve room for it | Implemented, not visually verified |
| Spotlight fallbacks | Tokens only | Tokens only (hex fallbacks removed) | Implemented, not visually verified |

## Responsive breakpoints

ADS breakpoints, from `UNSAFE_BREAKPOINTS_CONFIG` in `@atlaskit/primitives` 22.8.0:

| Name | Range | Grid margin | Grid gutter |
| --- | --- | --- | --- |
| `xxs` | 0 to 479px | `space.200` | `space.200` |
| `xs` | 480 to 767px | `space.200` | `space.200` |
| `sm` | 768 to 1023px | `space.300` | `space.200` |
| `md` | 1024 to 1439px | `space.400` | `space.300` |
| `lg` | 1440 to 1767px | `space.400` | `space.400` |
| `xl` | 1768px and up | `space.500` | `space.400` |

ADS does not define `720px` or `900px`. Those are prototype choices. The `560px` Flag breakpoint comes from the ADS Flag component, not from the grid.

### How breakpoints are written

Every viewport breakpoint value lives once, in the `--breakpoint-legacy-*` block in `concepts/app/styles/tailwind.css`. Each token is named for its own pixel value, for example `--breakpoint-legacy-720`, so a later phase can point it at an ADS step. Use the token, never a pixel literal:

- Class names, exclusive (`width < N`): `max-legacy-720:` and `min-legacy-721:`. Tailwind sorts these by value, so a narrower rule still wins over a wider one.
- Class names, inclusive (`width <= N`): `[@media(max-width:theme(--breakpoint-legacy-720))]:`. Tailwind sorts these by their text, so the order between breakpoints follows the token names. The names are all digits after the same prefix to keep the order the prototype already had.
- Plain CSS in `concepts/app/styles/tailwind/*.css`: `@media (max-width: theme(--breakpoint-legacy-720))`.
- Script: `maxWidthQuery('legacy720')` from `concepts/app/core/breakpoints.js`. A media query string cannot read a CSS variable, so the values are mirrored there and `tests/breakpoints.test.mjs` fails if they drift from the tokens.

Not tokenised: the prototype control kit (`concepts/app/prototype/controls.css` and `controls.js`, which are not compiled by Tailwind), and `@container` queries, which size a component and not the viewport.

Adding a new value means adding a token first. `--breakpoint-*` also feeds Tailwind's `container` utility, which nothing applies, but it now carries one rule per token.

Prototype breakpoints:

- `1439px` (stack below ADS `lg`, 1440px): record identity card in Profile, Customer, People and the contact dialog.
- `720px`: Profile, Customer and People section navigation.
- `560px`: Flag moves to the phone layout, and pages reserve room under it.
- Page content is capped at `1296px` wide. This is the ADS grid maximum quoted in ADS guidance, not checked against a package in this repo.

## Roadmap

1. **Phase 1, tokens with no visual change.** Move the existing type, spacing and radius values into named tokens. Font sizes, radius and spacing are done. Changing one token then updates every use. Screenshots must not change.
2. **Phase 2, normalise to the scale.** Map the values to a small set. This changes the look, so it needs approval and updated screenshot baselines.
3. **Open items.** Section navigation, footers and other layouts still use `720px` and `900px`, which are not ADS breakpoints. Each needs a decision to align with ADS or to stay as a documented custom choice. Breakpoints are tokenised, so each group can move one value at a time (#12).
