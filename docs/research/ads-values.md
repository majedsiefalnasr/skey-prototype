# ADS values for type, spacing, radius and breakpoints

Research for [#19](https://github.com/majedsiefalnasr/skey-prototype/issues/19). Checked on 2026-11-25 against the prototype at `9d3e0e5`.

"Nearest step" means the smallest pixel difference. It is not a recommendation: ties list both steps, and the choice belongs to the decision tickets.

## Findings that affect the decisions

1. **Only 5 of the 22 font-size role tokens are on an ADS size** (12, 14, 16, 20 and 28px). They cover 66 of 345 role-token uses.
2. **The smallest ADS type token is 12px.** Five role tokens are smaller (34 uses). ADS guidance says to avoid even 12px except for fine print.
3. **No role token sets a line height.** Text inherits `1.45` from `body` unless something overrides it. ADS pairs every size with a fixed line height, and its headings are much tighter than `1.45`.
4. **Tailwind `text-xs`, `text-sm` and `text-base` already match ADS body sizes and line heights** (12/16, 14/20 and 16/24). They are used 526 times, more than the role tokens.
5. **Many spacing values bypass `--ds-space-*`.** There are 2159 numeric Tailwind spacing utilities (`p-2`, `gap-2.5`), and 278 of them are off the ADS scale. Changing a `--ds-space-*` token does not affect any of them.
6. **`--ds-space-legacy-28` is mostly one pattern:** 268 of its 275 uses are the inline padding that makes room for a `select` arrow.
7. **Official ADS sources disagree about grid gutters, margins and maximum widths.** See [Grid](#grid-the-sources-disagree).
8. **atlassian.design names device roles:** mobile is 320 to 479px, tablet 480 to 1023px, desktop 1024px and up. `DESIGN.md` still takes its role names from code comments.

## Sources

Packages were downloaded from the npm registry and read, not installed or run. The SHA-1 of all five matched the registry value.

| Source | Version | Used for |
| --- | --- | --- |
| [`@atlaskit/tokens`](https://www.npmjs.com/package/@atlaskit/tokens/v/20.15.0): `dist/esm/artifacts/themes/atlassian-{typography,spacing,shape}.js` and `tokens-raw/` | 20.15.0 | Type, spacing and radius values and their state |
| [`@atlaskit/primitives`](https://www.npmjs.com/package/@atlaskit/primitives/v/22.9.0): `dist/esm/responsive/constants.js` | 22.9.0 | `UNSAFE_BREAKPOINTS_CONFIG` |
| [`@atlaskit/grid`](https://www.npmjs.com/package/@atlaskit/grid/v/1.3.4): `dist/esm/grid.compiled.css` | 1.3.4 | Grid gaps, padding and maximum widths |
| [`@atlaskit/css-reset`](https://www.npmjs.com/package/@atlaskit/css-reset/v/8.4.10): `dist/bundle.css` | 8.4.10 | Default body text |
| [`@atlaskit/flag`](https://www.npmjs.com/package/@atlaskit/flag/v/19.0.7): `dist/esm/flag-group.compiled.css` | 19.0.7 | Flag breakpoint |
| [Typography](https://atlassian.design/foundations/typography), [Applying typography](https://atlassian.design/foundations/typography/applying-typography), [Typefaces and scale](https://atlassian.design/foundations/typography/product-typefaces-and-scale) | Read 2026-11-25 | Type guidance |
| [Spacing](https://atlassian.design/foundations/spacing), [Radius](https://atlassian.design/foundations/radius), [Grid](https://atlassian.design/foundations/grid) | Read 2026-11-25 | Usage guidance |

## Type

### ADS scale

| Size / line height | Tokens | Documented use |
| --- | --- | --- |
| 12 / 16 | `font.body.small` (400), `font.heading.xxsmall` (653) | Fine print, use sparingly |
| 14 / 20 | `font.body` (400), `font.heading.xsmall` (653) | `font.body` is the default text in components |
| 16 / 24 | `font.body.large` (400) | Long-form reading |
| 16 / 20 | `font.heading.small`, `font.metric.small` (653) | Headings in small components such as flags |
| 20 / 24 | `font.heading.medium` (653) | Headings in large components such as modals |
| 24 / 28 | `font.heading.large`, `font.metric.medium` (653) | App page titles |
| 28 / 32 | `font.heading.xlarge`, `font.metric.large` (653) | Page titles, brand content |
| 32 / 36 | `font.heading.xxlarge` (653) | Brand and marketing content |

- The scale is a minor third (ratio 1.2) rounded to multiples of 4. Line height is about 1.2 times the size for headings and 1.5 times for body.
- Weights are 400, 500, 600 and 653. Medium (500) is for text in components and beside icons. ADS warns that semibold (600) falls back to bold in its fallback fonts. This matters because the prototype keeps `system-ui`.
- A feature gate, `platform-dst-tokens-finesse`, changes headings to 600. It is not the default theme.
- `css-reset` sets `body` to `font.body` (14/20). The prototype sets 14px with `1.45` (20.3px).
- `font.code` differs between sources: the typography page lists 12/20, the package has `0.875em/1`.

### Role tokens

Uses count `text-*` classes and `var()` or `theme()` references in `concepts/app`, excluding `styles/tailwind.css`. "Line height today" is the size times the inherited `1.45`; a `leading-*` class or CSS rule can override it per use.

| Token | px | Uses | Line height today | Nearest ADS | Size change | ADS token at that size |
| --- | --- | --- | --- | --- | --- | --- |
| `badge` | 9.5 | 1 | 13.8 | 12 / 16 | +2.5 | `font.body.small` |
| `caption-xs` | 10 | 3 | 14.5 | 12 / 16 | +2 | `font.body.small` |
| `stat-delta` | 10.5 | 1 | 15.2 | 12 / 16 | +1.5 | `font.body.small` |
| `caption` | 11 | 25 | 16 | 12 / 16 | +1 | `font.body.small` |
| `caption-md` | 11.5 | 4 | 16.7 | 12 / 16 | +0.5 | `font.body.small` |
| `small` | 12 | 23 | 17.4 | 12 / 16 | 0 | `font.body.small` |
| `dense` | 12.5 | 83 | 18.1 | 12 / 16 | -0.5 | `font.body.small` |
| `body` | 13 | 125 | 18.9 | tie: 12 / 16 or 14 / 20 | -1 or +1 | `font.body.small` or `font.body` |
| `body-lg` | 13.5 | 9 | 19.6 | 14 / 20 | +0.5 | `font.body` |
| `subtitle` | 14 | 22 | 20.3 | 14 / 20 | 0 | `font.body` or `font.heading.xsmall` |
| `heading-sm` | 14.5 | 1 | 21 | 14 / 20 | -0.5 | `font.heading.xsmall` |
| `heading` | 15 | 10 | 21.8 | tie: 14 / 20 or 16 / 20 | -1 or +1 | `font.heading.xsmall` or `font.heading.small` |
| `heading-md` | 16 | 1 | 23.2 | 16 / 20 | 0 | `font.heading.small` |
| `avatar-lg` | 17 | 1 | 24.7 | 16 | -1 | No avatar type token was checked |
| `card-title` | 18 | 2 | 26.1 | tie: 16 / 20 or 20 / 24 | -2 or +2 | `font.heading.small` or `font.heading.medium` |
| `subject` | 19 | 2 | 27.6 | 20 / 24 | +1 | `font.heading.medium` |
| `title` | 20 | 7 | 29 | 20 / 24 | 0 | `font.heading.medium` |
| `metric` | 22 | 4 | 31.9 | tie: 20 / 24 or 24 / 28 | -2 or +2 | `font.heading.medium` or `font.metric.medium` |
| `page-title` | 23 | 6 | 33.4 | 24 / 28 | +1 | `font.heading.large` |
| `display-sm` | 26 | 1 | 37.7 | tie: 24 / 28 or 28 / 32 | -2 or +2 | `font.heading.large` or `font.heading.xlarge` |
| `display` | 28 | 13 | 40.6 | 28 / 32 | 0 | `font.heading.xlarge` |
| `display-lg` | 36 | 1 | 52.2 | 32 / 36 (scale maximum) | -4 | `font.heading.xxlarge` |

### Text outside the role tokens

| Source | Uses | ADS match |
| --- | --- | --- |
| `text-xs` (12 / 16) | 417 | `font.body.small` |
| `text-sm` (14 / 20) | 100 | `font.body` |
| `text-base` (16 / 24) | 9 | `font.body.large` |
| Raw `font-size` px literals in `styles` and `prototype` | 105 | 12px: 43, 13px: 16, 12.5px: 12, 14px: 7, 11px: 7, 15px: 5, 20px: 4, 17px: 2, and one each of 9, 10, 14.5, 16, 18, 19, 23, 24 and 28px |

## Spacing

### ADS scale

`space.0` 0, `025` 2, `050` 4, `075` 6, `100` 8, `150` 12, `200` 16, `250` 20, `300` 24, `400` 32, `500` 40, `600` 48, `800` 64, `1000` 80px. Negative tokens run from -2 to -32px.

- Guidance: 0 to 8px for compact UI, 12 to 24px for larger components, 32 to 80px for layout.
- `space.gap.*` and `space.inset.*` are marked experimental and were revised in 20.10.0. They are not used as targets here.
- The prototype defines nine ADS steps. It does not define `0`, `400`, `600`, `800` or `1000`.

### Prototype tokens on the ADS scale

| Step | `025` | `050` | `075` | `100` | `150` | `200` | `250` | `300` | `500` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Uses | 26 | 14 | 444 | 571 | 119 | 94 | 30 | 34 | 1 |

These 1333 uses need no value change.

### Legacy tokens (1241 uses)

| Token | px | Uses | Nearest `space.*` | Change in px |
| --- | --- | --- | --- | --- |
| `legacy-0-5` | 0.5 | 1 | `0` | -0.5 |
| `legacy-1` | 1 | 48 | tie: `0` or `025` | -1 or +1 |
| `legacy-3` | 3 | 175 | tie: `025` or `050` | -1 or +1 |
| `legacy-5` | 5 | 60 | tie: `050` or `075` | -1 or +1 |
| `legacy-7` | 7 | 120 | tie: `075` or `100` | -1 or +1 |
| `legacy-9` | 9 | 154 | `100` | -1 |
| `legacy-10` | 10 | 73 | tie: `100` or `150` | -2 or +2 |
| `legacy-11` | 11 | 69 | `150` | +1 |
| `legacy-13` | 13 | 11 | `150` | -1 |
| `legacy-14` | 14 | 202 | tie: `150` or `200` | -2 or +2 |
| `legacy-15` | 15 | 2 | `200` | +1 |
| `legacy-17` | 17 | 2 | `200` | -1 |
| `legacy-18` | 18 | 34 | tie: `200` or `250` | -2 or +2 |
| `legacy-22` | 22 | 1 | tie: `250` or `300` | -2 or +2 |
| `legacy-26` | 26 | 3 | `300` | -2 |
| `legacy-28` | 28 | 275 | tie: `300` or `400` | -4 or +4 |
| `legacy-30` | 30 | 5 | `400` | +2 |
| `legacy-34` | 34 | 2 | `400` | -2 |
| `legacy-46` | 46 | 1 | `600` | +2 |
| `legacy-54` | 54 | 1 | `600` | -6 |
| `legacy-68` | 68 | 1 | `800` | -4 |
| `legacy-72` | 72 | 1 | tie: `800` or `1000` | -8 or +8 |

### Off-scale Tailwind utilities

Counted in `.js` and `.html` files for padding, margin and gap utilities. Width, height and position utilities were not counted. Plain CSS spacing literals and `calc()` expressions were not counted either.

| Step | px | Uses | Nearest `space.*` |
| --- | --- | --- | --- |
| `2.5` | 10 | 191 | tie: `100` or `150` |
| `3.5` | 14 | 44 | tie: `150` or `200` |
| `px` | 1 | 30 | tie: `0` or `025` |
| `9` | 36 | 4 | tie: `400` or `500` |
| `11` | 44 | 4 | tie: `500` or `600` |
| `7` | 28 | 3 | tie: `300` or `400` |
| `5.5` | 22 | 1 | tie: `250` or `300` |
| `14` | 56 | 1 | tie: `600` or `800` |

## Radius

| ADS token | px | Documented use | In the prototype |
| --- | --- | --- | --- |
| `radius.xsmall` | 2 | Badges, checkboxes, keyboard shortcuts | Yes |
| `radius.small` | 4 | Labels, lozenges, tags, tooltips, compact buttons | Yes |
| `radius.medium` | 6 | Buttons, inputs, selects, navigation items | Yes |
| `radius.large` | 8 | Cards, floating UI, dropdown menus | Yes |
| `radius.xlarge` | 12 | Modals, tables, Kanban columns, large containers | Yes |
| `radius.xxlarge` | 16 | Video players | No |
| `radius.full` | 999 on the page, 9999 in the package | Avatars, pills | Tailwind `rounded-full` (108 uses) and `legacy-999` |

| Legacy token | px | Uses | Nearest ADS | Change in px |
| --- | --- | --- | --- | --- |
| `legacy-1` | 1 | 1 | `xsmall` (ADS has no zero radius token) | +1 |
| `legacy-3` | 3 | 5 | tie: `xsmall` or `small` | -1 or +1 |
| `legacy-5` | 5 | 29 | tie: `small` or `medium` | -1 or +1 |
| `legacy-7` | 7 | 61 | tie: `medium` or `large` | -1 or +1 |
| `legacy-9` | 9 | 17 | `large` | -1 |
| `legacy-10` | 10 | 12 | tie: `large` or `xlarge` | -2 or +2 |
| `legacy-11` | 11 | 1 | `xlarge` | +1 |
| `legacy-14` | 14 | 1 | tie: `xlarge` or `xxlarge` | -2 or +2 |
| `legacy-999` | 999 | 11 | `full` | None visible for pills |

Radius literals in plain CSS were not counted.

## Breakpoints

### ADS steps

The package and atlassian.design agree on the ranges.

| Package name | Page name | Viewport | Device on atlassian.design |
| --- | --- | --- | --- |
| `xxs` | `xxs` | 0 to 479px (page: from 320) | Mobile |
| `xs` | `xs` | 480 to 767px | Tablet |
| `sm` | `s` | 768 to 1023px | Tablet |
| `md` | `m` | 1024 to 1439px | Desktop |
| `lg` | `l` | 1440 to 1767px | Desktop |
| `xl` | `xl` | 1768px and up | Desktop |

These device names describe the grid. Components switch layout at their own thresholds, listed in `DESIGN.md` (not rechecked here except Flag).

### Legacy tokens

| Token | px | Rule | Uses | Nearest ADS step | Distance in px |
| --- | --- | --- | --- | --- | --- |
| `legacy-480` | 480 | `min-width` | 1 | `xs` | 0 |
| `legacy-560` | 560 | `max-width` | 9 | `xs` (480) | -80. Equals the Flag value |
| `legacy-561` | 561 | `min-width` | 1 | `xs` (480) | -81. Complements 560 |
| `legacy-620` | 620 | `max` | 8 | `xs` (480) or `sm` (768) | -140 or +148. Already decided: stays custom |
| `legacy-1200` | 1200 | mixed | 7 | `md` (1024) | -176 (`lg` is +240) |
| `legacy-1240` | 1240 | `max-width` | 2 | `lg` (1440) | +200 (`md` is -216) |
| `legacy-1299` | 1299 | `max-width` | 1 | `lg` (1440) | +141 (`md` is -275) |
| `legacy-1439` | 1439 | `max-width` | 7 | `lg` | Same as "below `lg`" at whole-pixel widths |
| `legacy-1600` | 1600 | `min-width` | 1 | `lg` (1440) | -160 (`xl` is +168) |

`legacy-620` is used in the placeholder and For you templates, `organization/sections.js`, `data-list/list.js` (2), `data-list/model.js` and `shell.css` (2). The `max-legacy-620:` variant excludes 620px itself; the `max-width` media queries include it.

### Grid: the sources disagree

| Viewport from | Page: gutter / margin | `primitives` and `grid` packages: gutter / margin |
| --- | --- | --- |
| 0 | 12 / 16 | 16 / 16 |
| 480 | 12 / 16 | 16 / 16 |
| 768 | 12 / 16 | 16 / 24 |
| 1024 | 16 / 32 | 24 / 32 |
| 1440 | 16 / 32 | 32 / 32 |
| 1768 | 16 / 32 | 32 / 40 |

| Fixed grid | Page (margins included) | `@atlaskit/grid` 1.3.4 `max-width` (`border-box`) |
| --- | --- | --- |
| Wide | 1296px | 70.5rem (1128px) |
| Narrow | 864px | 46.5rem (744px) |

The page calls its values defaults and says apps may differ. This research did not establish which source is newer. The prototype caps page content at 1296px, which matches the page. `DESIGN.md` lists the package gutters and margins.

## Not covered

- Font weights and letter spacing used by the prototype.
- Computed line heights per screen in a browser.
- Colour, elevation, motion and component sizes.
