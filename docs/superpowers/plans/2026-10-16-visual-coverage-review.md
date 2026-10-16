# Proposed visual coverage — review required

No new snapshots have been captured or updated. This proposal follows the
email-first functional work. Existing parity baselines stay unchanged;
the known 76 failures require their own disposition before any refresh.

Run every proposed state on the existing seven projects: desktop,
mobile-touch, desktop-dark, desktop-high-contrast-light,
desktop-high-contrast-dark, mobile-rtl, desktop-reduced-motion.

| Surface | Proposed states | States × projects |
| --- | --- | ---: |
| Notes | Kanban with seeded cards; List with archived filter visible | 2 × 7 = 14 |
| Activities | Kanban by status; Calendar with scheduled activity and unscheduled notice | 2 × 7 = 14 |
| Events | Calendar with timed and all-day seeded events | 1 × 7 = 7 |
| People Data | List; Cards | 2 × 7 = 14 |
| Internal Mail | Inbox list; selected thread (mobile reading pane); Compose with recipient chips | 3 × 7 = 21 |
| Collaboration detail | Note editor with related items; activity/event editor with date/time and validation | 2 × 7 = 14 |
| Invoice below the fold | Populated lines grid at a fixed row; invoice charges; summary/tax/grand total | 3 × 7 = 21 |
| Sign-in | Email + unknown-workspace response; password identity; saved-account PIN | 3 × 7 = 21 |
| **Total proposed** | **18 states** | **126 captures** |

The existing email parity surface opens Internal Mail through notifications.
Compare its state to the first proposed Mail state before implementation;
reuse it if identical rather than add a duplicate. If reused, the net new
capture count falls to 119. The exact list of capture names must be agreed
before generation. No other baseline refresh is included in that count.

For invoices, use section/element captures or intentional scrolling in the
actual canvas, not just a taller outer-page screenshot: nested scrolling can
still clip lines, charges and totals. Require an assertion that each target
is visible and contains seeded data before capturing. Check sticky/frozen
headers and horizontal overflow separately with geometry assertions.

Use the same frozen static build and deterministic fixtures. Freeze the
application clock/calendar date, clear collaboration/sign-in storage to the
specified state, wait for fonts, disable capture animations, and collapse
prototype controls. Use the real RTL/language controls for mobile-rtl.
The Arabic functional toggle must be enabled where required. Preserve LTR
email, amounts and identifiers within RTL.

Review must decide: reuse versus replace the existing Mail state; the exact
activity/event editor fixture; viewport versus element crop bounds; and
whether the three sign-in states belong in this first visual batch.
Capture approval is separate from approval of this written proposal.
