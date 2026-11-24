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

Spacing is still written as literal values in class names, for example `[padding:6px_8px]`. Around 20 spacing values are in use, many outside the ADS scale. Tokenising them is the next roadmap item below.

## Deviations

| Area | ADS | Prototype | Status |
| --- | --- | --- | --- |
| Font | Atlassian Sans | `system-ui` stack | Accepted |
| Icons | ADS icon set | Hand-drawn SVG symbols in `concepts/app/shell/icons.html` | Accepted |
| Select | ADS Select | Native `<select>` (90 uses) | Accepted |
| Switch | Regular 32×16, thumb 12px | 30×17, thumb 13px | Accepted |
| Radius | ADS scale: 2, 4, 6, 8 and 12px | ADS tokens plus `legacy-*` tokens for 1, 3, 5, 7, 9, 10, 11, 14 and 999px | Tokenised, not normalised |
| Font sizes | ADS type scale | 22 role-based tokens with the sizes already in use | Implemented, no visual change |
| Spacing | ADS scale | About 20 px values per property in class names | Planned (phase 1) |
| Record identity card, 721 to 900px | Not specified | Customer and People squeeze the fields to 126px at 768px and 5 fields overlap the photo | Open, found in #7 |
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

Prototype breakpoints:

- `720px`: Profile section navigation and record identity layout.
- `560px`: Flag moves to the phone layout, and pages reserve room under it.
- `900px`: Profile identity card stacks the fields above the photo.
- Customer and People record identity cards still stack at `720px`, not `900px`.
- Page content is capped at `1296px` wide. This is the ADS grid maximum quoted in ADS guidance, not checked against a package in this repo.

## Roadmap

1. **Phase 1, tokens with no visual change.** Move the existing type, spacing and radius values into named tokens. Font sizes and radius are done. Spacing is next. Changing one token then updates every use. Screenshots must not change.
2. **Phase 2, normalise to the scale.** Map the values to a small set. This changes the look, so it needs approval and updated screenshot baselines.
3. **Open items.** Customer and People identity card breakpoint (#7).
