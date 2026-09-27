# Launchpad Quick Access Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the launchpad quick-access tabs compact and start-aligned, place “More” at the row end, show up to 10 items, and size cards like content-width tags.

**Architecture:** Keep the existing Starred/Recent tab state and navigation behavior. Restructure only the quick-access header and adjust the item cap and sizing utilities in `home.js`; verify the resulting geometry and both tab states in a focused Playwright test.

**Tech Stack:** Browser DOM APIs, Tailwind utility classes, Playwright Test.

## Global Constraints

- Preserve the existing launchpad behavior, visual language, localization, RTL mirroring, and navigation callbacks.
- Keep the current uncommitted session work intact.
- Show at most 10 cards per tab and keep “More” available as the full-list destination.
- Cards wrap naturally and use intrinsic content width rather than equal-width grid or flex growth.

---

### Task 1: Refine quick-access layout

**Files:**
- Modify: `concepts/app/pages/home/home.js`
- Create: `tests/launchpad-quick-access.spec.mjs`

**Interfaces:**
- Consumes: `NAV_FAVORITES`, `NAV_RECENTS`, `launchpadTag()`, and the existing `.nc2.activateByLabel()` navigation hook.
- Produces: `.lp-quick-header`, `.lp-quick-tabs`, `.lp-quick-more`, and `.lp-tag` geometry that the browser test can verify.

- [x] **Step 1: Write the failing browser test**

Create a focused Playwright test that boots the launchpad and asserts the compact tab width, opposite-edge “More” placement when present, non-equal intrinsic card widths, wrapping behavior, and the 10-item cap for both tabs.

- [x] **Step 2: Run the focused test to verify it fails**

Run: `npx playwright test tests/launchpad-quick-access.spec.mjs`

Expected: FAIL because the current tabs fill the available width, the “More” button is in a separate row, cards flex-grow equally, and the item cap is 5.

- [x] **Step 3: Implement the minimal layout change**

In `home.js`, place tabs and “More” in one flex header, change the cap to 10, remove card flex growth and fixed basis, and retain responsive wrapping plus the existing interaction and localization behavior.

- [x] **Step 4: Run the focused and unit test suites**

Run: `npx playwright test tests/launchpad-quick-access.spec.mjs`

Expected: PASS.

Run: `npm run test:unit`

Expected: all tests pass.

Observed: the focused suite passes all 7 configured projects. The unit suite passes 71/73; its two failures are pre-existing appearance/dialog CSS contract failures outside the launchpad scope.

- [x] **Step 5: Visually verify representative states**

Use `playwright-cli` at desktop and mobile widths to inspect Starred, Recent, and RTL states in one bounded pass. Check console output and run the Impeccable detector once over the changed UI targets.
