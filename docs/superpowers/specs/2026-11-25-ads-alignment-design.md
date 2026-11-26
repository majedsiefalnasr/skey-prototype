# ADS alignment design

- Status: Approved; tickets published
- Date: 2026-11-25
- Issue: #17
- Branch: `feat/ads-alignment` (based on `0056a67`, the agreed state before 24 Nov)
- Decisions: [DESIGN.md](../../../DESIGN.md), [ADR 0001](../../adr/0001-prototype-as-design-reference.md)

## Goal

Move tokens, spacing, font sizes, line heights, breakpoints and component behaviour closer to the Atlassian Design System (ADS). The agreed screens, colours and layouts stay as they are. Each change that is visible is measured and approved before it lands.

## Scope

In scope:

- Radius, font size, line height, spacing and breakpoint tokens (#27, #28, #29, #21).
- Spacing utilities that bypass the tokens (#25).
- Button tokens (#32).
- Page grid and boxed inset (#24).
- Switch, modal and tabs behaviour and sizes (#30, #31, #33).
- Document scrolling with sticky and fixed parts (#23).

Out of scope:

- `@atlaskit/*` packages (rejected in ADR 0001).
- Atlassian Sans or any font licence work. The `system-ui` stack stays; only sizes and line heights align.
- Changing agreed screens, colours or layouts.
- Making prototype data real, or building screens that are not in the prototype.
- Screenshot baseline updates without approval.

## Rules for the work

- Use tokens, not pixel literals. Breakpoints are written in `rem`.
- Measure before any visible change and report the numbers.
- Horizontal scroll inside data tables is accepted.
- If the dev server returns `ENOTEMPTY` during a test run, rerun that test alone before judging it.
- Final visual check: compare `0056a67` with the finished branch. The user does this after the work.

## Decided

Each item is decided in DESIGN.md. "Applied" means it is in the code on this branch.

| Issue | Decision | State |
| --- | --- | --- |
| #19 | Only 5 of 22 font-size role tokens sit on an ADS size and none sets a line height. 2159 spacing utilities bypass the tokens. ADS grid sources disagree; #24 decides which one applies. | Recorded |
| #20 | Decide each value group after a live comparison with ADS, in the order radius, type and line height, spacing. The select arrow padding gets its own 28px token. | Recorded |
| #22 | ADR 0001: ADS is the default for tokens, behaviour, sizes and breakpoints. | Applied (cf66d4d) |
| #21 | `legacy-480` moves to `xs`, `legacy-1240` to `lg`, `legacy-561` is removed and the Flag value becomes `--breakpoint-flag` (35rem). `legacy-1200`, `legacy-1299` and `legacy-1600` stay custom and documented. | Applied (#39); three `md` follow-ups open |
| #23 | The document scrolls, not `.page-content`. Pinned parts use sticky or fixed. Table headers stick inside their own box. One CSS variable sets the top bar offset. | Not applied; waits for the Playwright baseline repair and its own approval |
| #24 | Page grid follows the atlassian.design Grid page: 1296px maximum including margins. Boxed inset at 768 to 1023px moves from 48px to 32px (44px to 28px compact). | Applied (#40) |
| #25 | Numeric spacing utilities read `--ds-space-*` through `@theme inline`. Off-scale utilities move to ADS steps by the #29 rule. A unit test guards it. | Applied (#38); plain CSS literals not covered |
| #26 | The four Profile field grids use `minmax(min(260px, 100%), 1fr)`. | Applied (a8b4c88, with bca612e and c8c2b46) |
| #27 | Every off-scale radius moves to an ADS step: 1→2, 3→4, 5→6, 7→8, 9→8, 10→12, 11→12, 14→12. No `xxlarge` token. `legacy-999` is renamed to `full` and stays 999px. | Applied (#34) |
| #28 | Set D for font sizes and line heights. 17 of 22 roles change size, and line heights follow ADS. | Applied (#35) |
| #29 | Every `legacy-*` spacing value moves to an ADS step. Ties go to the smaller step. No spacing value stays custom. | Applied (#36); 13 border overlaps read `--ds-border-width` instead of 0 |
| #30 | The visible switch moves to ADS 32×16 with a 12px thumb. The 34×20 dialog toggles and `switchRow` stay open. | Applied (#41); 34×20 open |
| #31 | The 33 sized modals move to the nearest ADS width: 4 to 400px, 17 to 600px, 7 to 800px, 5 to 968px. Radius 12px. | Not applied |
| #32 | `.ibtn` and `.lbtn` read `--ds-button-*` tokens set to today's values. 0 of 4284 measured values changed. The 187 inline button class strings stay. | Tokens applied (4c8a4c7); sizes applied (#37): label buttons 32px tall on desktop |
| #33 | The four underline tablists move to ADS padding (6px 8px) and weight 500. The four segmented view switches keep their look. All eight get Arrow, Home and End keys that follow the reading direction. | Not applied |

## Open before implementation

- #18: the Flag visual check.
- #31: behaviour of the other 31 modals. Focus does not return to the trigger on close, and this is not decided yet.
- #31: the dialog below 480px. ADS makes it full screen; the current 94 to 96vw needs its own decision.
- #33: the Customer record guided tablist is unreachable because `setLayout` always sets `scroll`. It is not part of this decision.
- #26 follow-up: the same 260px grid in 12 other places. Invoices record still clips 7 fields at 320px. Not approved for change.
- Playwright baseline repair, which #23 waits for.
- Dev build flake (`ENOTEMPTY`).
- #21 follow-ups for the earlier `md` move, measured in #39 and not applied: search width at 901 to 1023px, one truncated statistics label at 1024px, and the collab body inset at 621 to 1023px.

## Order

1. Tokens that do not change the look: done in Phase 1.
2. Radius (#27), type (#28) and spacing (#29), each with measurements and approval. Button tokens (#32) follow them.
3. Spacing utilities (#25), after #29.
4. Breakpoints (#21) and page grid (#24).
5. Components: switch (#30), modal widths (#31), tabs (#33).
6. Document scrolling (#23), last, after the baseline repair and its own approval.

## Draft tickets

Published on 2026-11-25 as issues #34 to #44, in the order below.

1. Radius tokens to ADS steps (#27), issue #34.
2. Font sizes and line heights to set D (#28), issue #35.
3. Spacing tokens to ADS steps (#29), issue #36.
4. Button tokens to ADS steps (#32, after 1 and 3), issue #37.
5. Spacing utilities follow the tokens (#25, after 3), issue #38.
6. Breakpoints `legacy-480`, `legacy-1240`, Flag token (#21), issue #39.
7. Page grid and boxed inset (#24), issue #40.
8. Switch to ADS 32×16 (#30), issue #41.
9. Modal widths to ADS steps (#31), issue #42.
10. Tab padding, weight and keyboard (#33), issue #43.
11. Document scrolling (#23, after the baseline repair), issue #44.

## Verification

- Unit tests: `npm run test:unit`.
- Browser tests: `npm run test:browser`, with the baseline repaired first.
- Each visible change: measurements on the affected screens at the widths named in its DESIGN.md entry, plus a visual check.
- Layout checks cover RTL and the mobile project, not only desktop.
