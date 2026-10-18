# Visual QA audit — all 128 approved captures

## Executive summary

Reviewed **128/128 images across all seven profiles**. The captures provide useful coverage, but they do **not** establish design consistency. This audit identifies **eight grouped findings: P0 0, P1 3, P2 5**. Seven findings have confirmed visual symptoms; one P2 item (VQA-07) is an RTL formatting candidate whose intended presentation needs a product decision. Counts represent shared issues, not the number of affected screenshots or newly failing tests.

The highest priorities are mobile Mail's poor allocation of reading space, overlapping mobile shell controls, and invoice fields that visually truncate meaningful identifiers and prices. Address those three issues in separate, narrowly scoped changes in the first remediation batch. No remediation was performed during this audit.

The approved invoice limitations remain accepted: **fixed subtotal 200, zero tax, and zero line-money outputs**. They are excluded from findings and severity counts. Nothing in this report proposes calculating substitute values or changing the fixtures to make the screenshots look better.

## Evidence and method

Source of truth:

- [Completed capture report](2026-10-16-visual-coverage-final.md).
- [Original integrity inventory](2026-10-16-visual-coverage-final-integrity.json).
- [Audit evidence and explicit 128-image review inventory](2026-10-16-visual-qa-audit-evidence.json).
- Originals under `tests/visual-coverage.spec.mjs-snapshots/{projectName}/{name}`. Every exact path and associated finding appears in the appendix below and in the evidence JSON.

| Capture identity | Value |
| --- | --- |
| Source revision | `76f427645ba981d753729448bcf6bfdb7be68b38` |
| Manifest SHA-256 | `84a6ca14241b2b8246420c031918ed4d45eca3895da7cf00a227d7d65aed09c5` |
| Runner SHA-256 | `a5c7e29fb0b64004188e1398c9ead2f093790ad3f3a7f8e8efd5bd8a917e3114` |
| Frozen inventory SHA-256 | `2ebd66bff3f0df7b32d03dc9c14b9807f9810e41183f102ae04720dbd3d3150f` |
| Recorded image inventory SHA-256 | `3d8264fdb47756db6eeba37e8f6e9dffe1bc72e5bb9701fd6c479f4c77c91280` |

Verified all 128 PNG hashes against the integrity inventory and checked their dimensions. Compared every image in 19 state-based comparison sheets, including all seven profile variants where applicable and both trailing invoice captures. Suspect details were also inspected in original-size images. Comparison sheets were temporary review aids outside the repository; no original image was rewritten or regenerated.

Supplemented image review with read-only source inspection and DOM measurements against the **existing exact frozen build**, served temporarily on localhost port 4194. Reverified its complete 278-file inventory and absence of symlinks. Browser measurements used the pinned date, viewport, touch setting and relevant setup from the capture workflow. They are diagnostic observations, not another official preflight, capture run or test suite. No screenshot API was invoked.

The working tree already contained the later demo-email hint edits in `concepts/app/core/locale.js` and `concepts/app/pages/signin/templates.html`. Those edits were preserved byte-for-byte. They are not part of the frozen images; their absence from these historical captures is not a defect.

Priority definitions: P0 blocks essential use with no practical recovery; P1 materially compromises a core task, readable data or control separation; P2 is a local usability, context or presentation defect. No P0 was demonstrated in this captured scope. This does not revise any historical severity in the existing defect ledger.

## Prioritized findings

### VQA-01 — P1 — Mobile Mail opens a reading state with no body text visible

**Status:** confirmed visual and layout defect. **Affected images:**

- `mobile-touch/mail-reading-e1.png`
- `mobile-rtl/mail-reading-e1.png`

Paths above are relative to `tests/visual-coverage.spec.mjs-snapshots/`; the appendix provides full paths.

**Evidence:** At 390 × 844, the toolbar wraps into four rows and occupies **199 px**. The Mail container is about **539 px** tall. A fixed reply composer consumes another **172 px**, leaving a **166 px** reading scrollport. That scrollport shows only the subject, folder and sender at scrollTop 0. The message body starts around y=729, outside the reading scrollport's y=492–658 bounds; the payment text and attachment are absent from the initial view. Desktop variants display the body and attachment alongside a single-row toolbar.

**Impact:** opening a message prioritizes actions and an empty reply over reading the message. The body exists in a scrollable region; this is not evidence that the message cannot ever be read. Both mobile directions show the same defect.

**Shared mechanism and likely scope:** nested fixed-height flex layout, nonshrinking toolbar/composer and wrapping action groups. See `concepts/app/pages/email/email.js` (`toolbarMarkup`, `renderReading`), `concepts/app/pages/email/templates.html` and `concepts/app/styles/tailwind/email.css`. Exact measurements are retained in the evidence JSON.

**Recommended fix:** give mobile reading a deliberate compact action arrangement and defer or collapse the empty quick-reply composer until requested, or use a coherent scrolling layout that preserves reading space. Keep Reply, Back, filing actions and draft behavior available. Verify actual body/attachment visibility and normal scroll access, rather than relying on DOM text presence. The existing preflight's `toContainText` checks for attachment/payment content do not prove that content is inside the visible scrollport.

**Baseline relationship:** the historical ledger already records a mobile Mail layout issue (#1, formerly a nearly zero-width reader). This audit observes a different current vertical-space failure after the narrow-pane redesign. It does not call the historical issue fixed, reclassify it or change the 76-failure baseline.

### VQA-02 — P1 — Mobile workspace identity and utility controls overlap

**Status:** confirmed visual overlap. **Affected images:** all ten full-shell states in each mobile profile: Notes Kanban/list, Activities Kanban/week, Events month, People list/cards, and Mail inbox/reading/compose. The appendix enumerates all **20 paths**. Editor and invoice element crops do not show this header and are not counted as image evidence.

**Evidence:** the mobile header visibly places the circular assistant control over `lastchance`, with the fiscal-year badge colliding with the alert area. LTR DOM measurements put the workspace button at x=116, width=68, but its name extends from x=148 to 221 and its year badge from x=229 to 273. The utility group begins at x=192; the assistant occupies x=192–236. RTL reproduces the overlap in the mirrored layout: name x=169–242, year x=117–161, assistant x=154–198. The workspace label visibly extends outside its allocated button box.

**Impact:** identity and action boundaries become ambiguous; typography paints into adjacent controls. Rectangle overlap is confirmed. This audit does not assert that every overlapping pixel activates the wrong action.

**Shared mechanism and likely scope:** mobile header width budgeting plus coarse-pointer minimum sizes. `concepts/app/shell/topbar.js` rebuilds `.app-name` without the original `min-w-0 truncate` classes present in `shell.html`. Responsive/coarse rules in `concepts/app/styles/tailwind/shell.css` further constrain the available width. Recreating the header loses the intended truncation contract.

**Recommended fix:** restore identity sizing/truncation when rebuilding the header and explicitly budget workspace, year and utility controls at touch widths. If the year must move into a workspace menu, make that a deliberate product choice. Preserve accessible names and touch sizes. Verify nonoverlapping painted text and target bounds in both directions.

### VQA-03 — P1 — Invoice input interiors truncate identifiers, dates and prices

**Status:** confirmed visual truncation; the exact width contribution of browser number controls remains a root-cause candidate. **Affected images:** `invoice-lines-start.png` in **all seven profiles**. The five desktop variants show the price issue; the mobile leading-edge captures directly show identifier/date truncation. Offscreen mobile price fields are not claimed as direct image evidence.

**Evidence:** at original size the desktop item fields show `VIS-` for both seeded `VIS-001` and `VIS-002`, making the two identities visually indistinguishable. The seeded date `2027-12-31` shows as `2027-12-3` on desktop and a shorter prefix on mobile. The desktop Price fields show the leading `10` of the seeded value `100`. The manifest pins 100, and the capture setup verifies each input's complete value before capture. The element crop includes each affected input's entire border box: this is text clipped **inside** a control, not the screenshot's outer crop.

**Impact:** a displayed price can be misread by a factor of ten, and seeded item identities cannot be distinguished at rest. This finding concerns representation of entered values, not the accepted zero line-money outputs or fixed subtotal.

**Shared mechanism and likely scope:** auto-sized invoice table columns, full-width inputs, cell/input padding and native numeric-control space. Inspect `concepts/app/pages/invoices/templates.html` (`.inv-grid`), `concepts/app/pages/invoices/lines.js` and related responsive table rules before selecting exact widths. No width or browser-control behavior was changed in the audit.

**Recommended fix:** define content-appropriate minimum widths for item codes, ISO dates and numeric amounts, allowing the existing table scroller to carry extra width. Preserve leading/trailing mobile capture semantics. Verify full visible fixture values at rest, not just `inputValue()`. Avoid hiding overflow or shortening fixture values to conceal the problem.

### VQA-04 — P2 — Panned mobile calendars lose date and time context

**Status:** confirmed captured-state usability defect. **Affected images:**

- `mobile-touch/activities-calendar-week.png`
- `mobile-rtl/activities-calendar-week.png`
- `mobile-touch/events-calendar-month.png`
- `mobile-rtl/events-calendar-month.png`

**Evidence:** the approved week pan leaves the 15:00 event visible below the controls, but the seven column dates and time gutter are outside the visible segment. The user sees a week range and an event time without the selected event's column date. In month captures the day numbers remain, but weekday labels are above the clipped scroll region. Desktop retains these contextual labels.

**Shared mechanism and likely scope:** the 840 px minimum-width calendar is nested in a second vertical scrollport; native event/cell centering scrolls that outer region. In the LTR diagnostic, the week column-header row was at y=283 while its clipping ancestor began at y=440; the month weekday row was at y=414 while its clipping ancestor began at y=563. Neither header is sticky. See `components/collab/calendar.js`, collaboration page layout and `.collab-calendar-scroll` rules.

**Recommended fix:** preserve date/time context within the calendar's actual scrolling hierarchy, or provide a deliberate mobile agenda/date-context treatment. Keep the Sunday-start October 11–17 range and accessible event identity. The approved pan itself is not a capture error; do not revise the manifest or substitute a more flattering pan as remediation.

### VQA-05 — P2 — Prototype launcher partially covers mobile Reply

**Status:** confirmed partial visual obstruction, limited to prototype chrome. **Affected images:**

- `mobile-touch/mail-reading-e1.png`
- `mobile-rtl/mail-reading-e1.png`

**Evidence:** the fixed 44 × 44 `#kit-pill` overlaps the Reply button's border box by **13 × 32 px** in each direction. LTR launcher x=332, y=786; Reply x≈264, y=774, width≈81. RTL launcher x=14, y=786; Reply x=45, y=774, width≈56. The launcher covers part of the button edge/affordance. The Reply center still hit-tests to Reply; this is not a claim that the whole button is blocked.

**Shared mechanism and likely scope:** fixed prototype launcher with no reservation in the Mail reading footer. Collaboration editors already hide the launcher while modal panels are open, so the obstruction treatment differs between components. Inspect prototype launcher rules and Mail layout.

**Recommended fix:** establish an explicit prototype-chrome policy for Mail reading: reserve space or relocate/hide the launcher in this state while retaining a normal way to reopen the kit. Do not mask it in screenshots. If prototype chrome is intentionally excluded from production, classify this as a test/demo usability fix rather than a production feature defect.

### VQA-06 — P2 — Password identity breaks readable workspace names mid-word

**Status:** confirmed readability defect. **Affected images:**

- `mobile-touch/signin-password-identity.png`
- `mobile-rtl/signin-password-identity.png`

**Evidence:** the LTR identity chip breaks `lastchance.skeyerp.com` after `la` and breaks `Cairo HQ` into `Cair` / `o HQ`. RTL similarly splits the workspace hostname. The email itself remains readable and directionally isolated; the failure is arbitrary breaking across the concatenated identity/context string. Desktop has enough width and does not exhibit the problem.

**Shared mechanism and likely scope:** `#si-who` applies `break-all` to the complete email, workspace and branch string while the Change button shares the same flex row. See the frozen sign-in template and identity rendering in `signin.js`.

**Recommended fix:** separate email, workspace and branch into semantic pieces with deliberate wrapping. Allow long email/hostname fallback breaks without applying character breaks to ordinary branch words; keep LTR isolation and a usable Change button. This recommendation concerns the frozen password state and does not alter the later email-hint edit.

### VQA-07 — P2 — RTL financial-token ordering needs an explicit formatting decision

**Status:** confirmed visual discrepancy; **defect candidate pending the intended Arabic formatting rule**, not a confirmed calculation or localization-policy failure. **Affected image:** `mobile-rtl/invoice-tax-totals.png`. The six LTR counterparts provide comparison evidence.

**Evidence:** the same output text `− 20.00` appears with its sign after the Latin digits, and `205.00 EGP` visually becomes `EGP 205.00`. Plain output elements inherit RTL direction and have no token isolation. Labels mirror correctly, while value token order changes through bidirectional layout. Numbers and amounts themselves are unchanged.

**Likely scope:** invoice-summary output presentation in `concepts/app/pages/invoices/templates.html`. English summary labels remaining visible are a documented prototype limitation and are not counted again here.

**Recommended resolution:** choose the intended Arabic monetary representation first. If the prototype retains Latin financial tokens as authored, isolate each signed amount/currency token with an explicit direction; if it adopts localized currency formatting, specify and use that exact convention consistently. Do not assume that a currency prefix is inherently wrong in Arabic, reverse strings manually, change amounts, or silently accept multiple presentations. This audit does not authorize either implementation choice.

### VQA-08 — P2 — Touch minimum height distorts calendar duration geometry

**Status:** confirmed layout mechanism in the frozen touch profile; corresponding symptom visible in both mobile week images. **Affected images:**

- `mobile-touch/activities-calendar-week.png`
- `mobile-rtl/activities-calendar-week.png`

**Evidence:** the 15:00–15:30 call has inline `height:22px`. Desktop renders it at **22 px**; the touch profile renders it at **44 px** because the global coarse-pointer button rule supplies `min-height:44px`. The 10:00–11:00 meeting stays at 46 px in both profiles. Thus a half-hour event is visually almost as tall as a one-hour event on mobile. Wrapped call text is also cut off within that block. This is separate from the loss of headers in VQA-04.

**Shared mechanism and likely scope:** timed calendar buttons inherit `@media (pointer: coarse) { button { min-height:44px } }` from `styles/tailwind/shell.css`, overriding the effective height calculated in `components/collab/calendar.js`. The existing preflight checks the inline style's 22 px, so it does not detect the computed 44 px height.

**Recommended fix:** reconcile timed-event geometry with accessible touch targets deliberately: for example, separate the painted duration block from its interaction area or provide an explicit mobile agenda treatment. Preserve reachable controls and their accessible event labels. Do not simply remove touch-size protections globally. Verify computed geometry, adjacent-event interactions and label readability in both mobile directions.

## Cross-profile consistency matrix

Legend: **O** = reviewed, no additional concrete issue identified in that image; it is not a design or accessibility sign-off. Numbers refer to VQA findings. **07?** is the formatting candidate. **—** = no approved capture for that profile/state. Header finding 02 is included whenever the full mobile shell is visible.

| State | Desktop | Mobile touch | Dark | HC light | HC dark | Mobile RTL | Reduced motion |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Notes Kanban | O | 02 | O | O | O | 02 | O |
| Notes archived list | O | 02 | O | O | O | 02 | O |
| Activities Kanban | O | 02 | O | O | O | 02 | O |
| Activities week | O | 02,04,08 | O | O | O | 02,04,08 | O |
| Events month | O | 02,04 | O | O | O | 02,04 | O |
| People list | O | 02 | O | O | O | 02 | O |
| People cards | O | 02 | O | O | O | 02 | O |
| Mail inbox | O | 02 | O | O | O | 02 | O |
| Mail reading | O | 01,02,05 | O | O | O | 01,02,05 | O |
| Mail compose draft | O | 02 | O | O | O | 02 | O |
| Note editor / related | O | O | O | O | O | O | O |
| Event editor / validation | O | O | O | O | O | O | O |
| Invoice lines leading | 03 | 03 | 03 | 03 | 03 | 03 | 03 |
| Invoice charges | O | O | O | O | O | O | O |
| Invoice tax / totals | O | O | O | O | O | 07? | O |
| Sign-in empty email | O | O | O | O | O | O | O |
| Sign-in unknown workspace | O | O | O | O | O | O | O |
| Sign-in password identity | O | 06 | O | O | O | 06 | O |
| Invoice lines trailing | — | O | — | — | — | O | — |
| **Images reviewed** | **18** | **19** | **18** | **18** | **18** | **19** | **18** |

Cross-profile observations:

- **Theme and contrast:** dark variants retain component hierarchy and readable primary text in the inspected states. Both high-contrast profiles strengthen borders, separators and field boundaries. No additional contrast failure was substantiated by this image review. That is not a measured WCAG pass; the historical light selected-navigation contrast issue remains in the unchanged ledger. Branding on dark backgrounds is a possible design refinement, not a newly demonstrated functional contrast failure.
- **RTL:** shell/rail placement, panel actions and field alignment generally mirror. The invoice value-token question is isolated as 07; header overlap and calendar/reader problems are shared with LTR rather than unique Arabic failures. English fixture names and untranslated controls remain as documented; Arabic is actually active, not inferred from the project name. The generated People conversion label may be outside the mobile list crop; its DOM preflight coverage is not visual proof of that offscreen label.
- **Motion:** desktop and reduced-motion screenshots are pixel-identical in 16 of 18 states. The other two differences are confined to a 2 × 2 bounding region in draft compose and a one-pixel-high bounding region in invoice lines, with no substantive hierarchy/state difference observed. Crucially, the approved manifest sets `reducedMotion: reduce` in **all seven profiles**. This corpus cannot validate a reduce-versus-no-preference transition or animation behavior.
- **Hierarchy and typography:** desktop spacing/hierarchy is consistent across the reviewed theme variants. Mobile shared shell/page padding and wrapped controls reduce usable content width; specific harmful consequences are recorded above. More compact headings or less whitespace are product preferences until supported by a concrete task failure, and are not additional defects here.
- **Editors:** validation remains visibly associated with the invalid End field across all seven profiles. Related rows and Save/Cancel remain visible in the note crops. The note form is intentionally scrolled to related rows, so its clipped upper form content is not a new defect. The event header's original saved time versus the invalid unsaved field is expected editor state, not a mismatch to repair.

## Accepted limitations, preferences and unproven behavior

Accepted and excluded from new findings:

1. Invoice fixed subtotal 200, tax zero, and zero line-money outputs after entered prices. Summary 205.00 EGP reflects the approved fixture and does not prove calculated line/tax correctness.
2. Horizontal scrolling for mobile boards, lists and invoice tables, including the approved leading/trailing invoice segments. Offscreen columns or cards are not themselves defects. VQA-03 concerns text clipped inside fully shown input boxes.
3. The approved native-panned mobile calendar segments and exact Sunday-start October 11–17 week. VQA-04 concerns the context lost during that valid state; it does not reject the fixture or broaden its dates.
4. Existing English fixture content and incomplete translation resources in Arabic mode. No additional localization work is prescribed merely because a label is English.
5. Prototype-only Mail delivery, recurrence/reminder notices, map illustration and unchanged invoice behavior. No backend capability is inferred from the images.

Subjective preferences excluded from severity totals: desktop whitespace/density, sign-in background orbs, stronger dark-mode brand artwork, more compact mobile titles, and ordinary card text ellipsis when the detail view is the intended expansion surface. These may merit design discussion but are not confirmed defects from this corpus.

Not established by this audit: keyboard order, screen-reader announcements, interactive error recovery, all hover/focus states, performance, real Mail delivery, full nonzero-tax arithmetic, every contrast ratio, or actual motion preference switching. The read-only diagnostic interactions were limited to reproducing the listed layout evidence. Existing preflight/capture success is not substituted for these checks. No broad test suite was rerun and no claim is made that any of the 76 known failures changed.

## Recommended remediation batches

| Batch | Findings | Proposed scope and completion evidence |
| --- | --- | --- |
| **1 — Readable core data and distinct controls** | **01,02,03 (P1)** | Separate small changes for Mail reading layout, mobile header identity sizing and invoice input widths. Demonstrate useful body/attachment visibility on opening Mail, nonoverlapping identity/utility targets at 390 px in LTR/RTL, and fully readable seeded item/date/price values. Keep authentication, fixture values, invoice arithmetic and existing snapshots unchanged during diagnosis. Add focused regressions for changed behavior before proposing any new baselines. |
| 2 — Mobile calendar context and prototype obstruction | 04,05,08 | Treat the two calendar findings together because they share the timed-grid/scroll hierarchy, but verify each separately. Preserve dates, positioning and accessible touch behavior. Address prototype launcher reservation in a separate focused change. Verify header context after normal panning and the actual painted 30-minute geometry. |
| 3 — Identity readability and RTL formatting decision | 06,07 | Fix semantic wrapping in password identity; establish the intended RTL monetary-token convention before implementing 07. Verify exact rendered token order with the agreed convention, without changing numeric outputs or inventing translations. |

These are recommendations only. This audit authorizes no application/test/snapshot edits, capture updates or manifest changes. Existing screenshots remain evidence of the reviewed revision.

## Preservation verification

Only this report and its evidence JSON were added. All 128 audited capture hashes still match the original inventory. All 124 pre-existing PNGs were checked against the historical preservation inventory and remain unchanged. The baseline ledger, baseline data, approved manifest, runner, three `.shot*.mjs` scripts, branch refs and worktree registrations were preserved. Existing application changes present before the audit, including the demo-email hint, were preserved. No image was created in a snapshot destination, regenerated or overwritten; no push, commit, branch deletion or cleanup was performed. The temporary audit server was stopped without touching the user's dev server.

## Appendix — explicit review inventory

Each row below identifies an original image that was visually reviewed. `O` means no additional concrete issue identified in that image; it does not mean defect-free or approved. Paths are repository-relative and link directly to the originals.

### desktop — 18 images reviewed

| Original image | Findings |
| --- | --- |
| [tests/visual-coverage.spec.mjs-snapshots/desktop/notes-kanban.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop/notes-kanban.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop/notes-list-archived.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop/notes-list-archived.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop/activities-kanban.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop/activities-kanban.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop/activities-calendar-week.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop/activities-calendar-week.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop/events-calendar-month.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop/events-calendar-month.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop/people-list.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop/people-list.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop/people-cards.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop/people-cards.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop/mail-inbox-list.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop/mail-inbox-list.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop/mail-reading-e1.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop/mail-reading-e1.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop/mail-compose-draft.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop/mail-compose-draft.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop/note-editor-related.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop/note-editor-related.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop/event-editor-validation.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop/event-editor-validation.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop/invoice-lines-start.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop/invoice-lines-start.png) | VQA-03 |
| [tests/visual-coverage.spec.mjs-snapshots/desktop/invoice-charges.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop/invoice-charges.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop/invoice-tax-totals.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop/invoice-tax-totals.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop/signin-email.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop/signin-email.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop/signin-unknown-workspace.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop/signin-unknown-workspace.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop/signin-password-identity.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop/signin-password-identity.png) | O |

### mobile-touch — 19 images reviewed

| Original image | Findings |
| --- | --- |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-touch/notes-kanban.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-touch/notes-kanban.png) | VQA-02 |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-touch/notes-list-archived.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-touch/notes-list-archived.png) | VQA-02 |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-touch/activities-kanban.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-touch/activities-kanban.png) | VQA-02 |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-touch/activities-calendar-week.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-touch/activities-calendar-week.png) | VQA-02, VQA-04, VQA-08 |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-touch/events-calendar-month.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-touch/events-calendar-month.png) | VQA-02, VQA-04 |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-touch/people-list.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-touch/people-list.png) | VQA-02 |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-touch/people-cards.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-touch/people-cards.png) | VQA-02 |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-touch/mail-inbox-list.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-touch/mail-inbox-list.png) | VQA-02 |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-touch/mail-reading-e1.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-touch/mail-reading-e1.png) | VQA-01, VQA-02, VQA-05 |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-touch/mail-compose-draft.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-touch/mail-compose-draft.png) | VQA-02 |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-touch/note-editor-related.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-touch/note-editor-related.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-touch/event-editor-validation.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-touch/event-editor-validation.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-touch/invoice-lines-start.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-touch/invoice-lines-start.png) | VQA-03 |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-touch/invoice-lines-end.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-touch/invoice-lines-end.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-touch/invoice-charges.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-touch/invoice-charges.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-touch/invoice-tax-totals.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-touch/invoice-tax-totals.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-touch/signin-email.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-touch/signin-email.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-touch/signin-unknown-workspace.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-touch/signin-unknown-workspace.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-touch/signin-password-identity.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-touch/signin-password-identity.png) | VQA-06 |

### desktop-dark — 18 images reviewed

| Original image | Findings |
| --- | --- |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-dark/notes-kanban.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-dark/notes-kanban.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-dark/notes-list-archived.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-dark/notes-list-archived.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-dark/activities-kanban.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-dark/activities-kanban.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-dark/activities-calendar-week.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-dark/activities-calendar-week.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-dark/events-calendar-month.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-dark/events-calendar-month.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-dark/people-list.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-dark/people-list.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-dark/people-cards.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-dark/people-cards.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-dark/mail-inbox-list.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-dark/mail-inbox-list.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-dark/mail-reading-e1.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-dark/mail-reading-e1.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-dark/mail-compose-draft.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-dark/mail-compose-draft.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-dark/note-editor-related.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-dark/note-editor-related.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-dark/event-editor-validation.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-dark/event-editor-validation.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-dark/invoice-lines-start.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-dark/invoice-lines-start.png) | VQA-03 |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-dark/invoice-charges.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-dark/invoice-charges.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-dark/invoice-tax-totals.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-dark/invoice-tax-totals.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-dark/signin-email.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-dark/signin-email.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-dark/signin-unknown-workspace.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-dark/signin-unknown-workspace.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-dark/signin-password-identity.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-dark/signin-password-identity.png) | O |

### desktop-high-contrast-light — 18 images reviewed

| Original image | Findings |
| --- | --- |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/notes-kanban.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/notes-kanban.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/notes-list-archived.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/notes-list-archived.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/activities-kanban.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/activities-kanban.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/activities-calendar-week.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/activities-calendar-week.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/events-calendar-month.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/events-calendar-month.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/people-list.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/people-list.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/people-cards.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/people-cards.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/mail-inbox-list.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/mail-inbox-list.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/mail-reading-e1.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/mail-reading-e1.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/mail-compose-draft.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/mail-compose-draft.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/note-editor-related.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/note-editor-related.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/event-editor-validation.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/event-editor-validation.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/invoice-lines-start.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/invoice-lines-start.png) | VQA-03 |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/invoice-charges.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/invoice-charges.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/invoice-tax-totals.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/invoice-tax-totals.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/signin-email.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/signin-email.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/signin-unknown-workspace.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/signin-unknown-workspace.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/signin-password-identity.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/signin-password-identity.png) | O |

### desktop-high-contrast-dark — 18 images reviewed

| Original image | Findings |
| --- | --- |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/notes-kanban.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/notes-kanban.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/notes-list-archived.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/notes-list-archived.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/activities-kanban.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/activities-kanban.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/activities-calendar-week.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/activities-calendar-week.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/events-calendar-month.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/events-calendar-month.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/people-list.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/people-list.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/people-cards.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/people-cards.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/mail-inbox-list.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/mail-inbox-list.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/mail-reading-e1.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/mail-reading-e1.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/mail-compose-draft.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/mail-compose-draft.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/note-editor-related.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/note-editor-related.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/event-editor-validation.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/event-editor-validation.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/invoice-lines-start.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/invoice-lines-start.png) | VQA-03 |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/invoice-charges.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/invoice-charges.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/invoice-tax-totals.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/invoice-tax-totals.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/signin-email.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/signin-email.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/signin-unknown-workspace.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/signin-unknown-workspace.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/signin-password-identity.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/signin-password-identity.png) | O |

### mobile-rtl — 19 images reviewed

| Original image | Findings |
| --- | --- |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/notes-kanban.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/notes-kanban.png) | VQA-02 |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/notes-list-archived.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/notes-list-archived.png) | VQA-02 |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/activities-kanban.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/activities-kanban.png) | VQA-02 |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/activities-calendar-week.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/activities-calendar-week.png) | VQA-02, VQA-04, VQA-08 |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/events-calendar-month.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/events-calendar-month.png) | VQA-02, VQA-04 |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/people-list.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/people-list.png) | VQA-02 |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/people-cards.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/people-cards.png) | VQA-02 |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/mail-inbox-list.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/mail-inbox-list.png) | VQA-02 |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/mail-reading-e1.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/mail-reading-e1.png) | VQA-01, VQA-02, VQA-05 |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/mail-compose-draft.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/mail-compose-draft.png) | VQA-02 |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/note-editor-related.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/note-editor-related.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/event-editor-validation.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/event-editor-validation.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/invoice-lines-start.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/invoice-lines-start.png) | VQA-03 |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/invoice-lines-end.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/invoice-lines-end.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/invoice-charges.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/invoice-charges.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/invoice-tax-totals.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/invoice-tax-totals.png) | VQA-07 |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/signin-email.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/signin-email.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/signin-unknown-workspace.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/signin-unknown-workspace.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/signin-password-identity.png](../../../tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/signin-password-identity.png) | VQA-06 |

### desktop-reduced-motion — 18 images reviewed

| Original image | Findings |
| --- | --- |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/notes-kanban.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/notes-kanban.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/notes-list-archived.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/notes-list-archived.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/activities-kanban.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/activities-kanban.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/activities-calendar-week.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/activities-calendar-week.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/events-calendar-month.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/events-calendar-month.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/people-list.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/people-list.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/people-cards.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/people-cards.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/mail-inbox-list.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/mail-inbox-list.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/mail-reading-e1.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/mail-reading-e1.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/mail-compose-draft.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/mail-compose-draft.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/note-editor-related.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/note-editor-related.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/event-editor-validation.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/event-editor-validation.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/invoice-lines-start.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/invoice-lines-start.png) | VQA-03 |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/invoice-charges.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/invoice-charges.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/invoice-tax-totals.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/invoice-tax-totals.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/signin-email.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/signin-email.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/signin-unknown-workspace.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/signin-unknown-workspace.png) | O |
| [tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/signin-password-identity.png](../../../tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/signin-password-identity.png) | O |

