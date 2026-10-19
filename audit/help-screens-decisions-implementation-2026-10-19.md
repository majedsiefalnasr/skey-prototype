# Help Screens decisions — implementation

Scope: every item in the audit summary's **Do next** column, as selected by the user. Subtasks/comments, rich notes, duplicate merging, combined calendars, real mail delivery and file attachments remain deferred.

## Delivered behavior

| Area | Implementation |
|---|---|
| Notes | Add, rename, reorder, hide and remove custom status columns through Manage columns. Removing a populated column requires a destination and confirmation. Notes and links survive. Draft/Active/Archived keep stable IDs and lifecycle meanings; Archive remains reversible and discoverable through its quick filter. Hidden statuses remain available in the editor and Move to controls. |
| Activities | My work, Today and Overdue shortcuts with counts, derived from assignees and due dates. Completed/cancelled/archived work is excluded from those queues. Existing Open/Done and field filters remain. Due-only work does not acquire a calendar time. |
| Events | Participant/resource-specific conflicts, a selectable calendar timezone, an event timezone, recurrence expansion with end dates and exceptions, edits for one occurrence/future occurrences/the series, scoped deletion, an agenda view and in-app reminders. Filtering does not conceal a conflict with another event outside the filter. |
| Internal Mail | Sender/recipient, inclusive date range, attachments and related-record filters; explicit search across all mail except Trash; visible filter summaries and reset. Archive and move offer Undo for single and bulk actions. Undo restores folder metadata only, preserves message edits/read state, and skips items moved again or removed. |
| People Data | Uses the shared data-list engine for rows, sorting and column controls. Name stays available; layouts can be saved/reset. Conversion provides field mapping, duplicate hints and an explicit Link to existing / Create new choice for Customers. Linking does not modify the Customer. Creation opens the normal prefilled Customer form and marks conversion only after successful Save. The source person and related work remain. |

## Scheduling decisions

- Existing timed event strings are interpreted in **Africa/Cairo**, matching the prototype's workspace context. New events carry an explicit IANA timezone. Changing the viewer timezone changes presentation, not the stored event timezone or all-day dates.
- Recurrence is generated in the event's local timezone. Monthly events clamp to the month's final date without drifting subsequent months. Per-occurrence overrides and cancelled dates are stored against the original series date; moved occurrences remain discoverable on their new date.
- Invalid and ambiguous daylight-saving wall times require correction. Invalid generated occurrences are surfaced with a warning rather than silently moved to a different time.
- A future-series edit preserves earlier occurrences and copies related-item links to the new segment. One-occurrence changes leave other occurrences untouched. Ending or deleting the future portion preserves the earlier series and its links.
- Reminder preferences and read state are persisted in the existing prototype store. Reminders appear under System Alerts while the app is open, using the advancing prototype clock, and link to their event occurrence. All-day reminders use 09:00 in the event timezone. This does not claim background delivery while the app is closed or external notification delivery.

## Conversion boundaries

- Customers support selecting an actual existing record or entering the normal create form. Cancellation/validation failure does not mark the person as converted. Customers created through this flow are retained with the existing session's collaboration state so a restored person link has a destination after reload.
- Supplier and Employee do not have destination record forms in this prototype. Their mapping is previewable and explicitly explains that no destination record or conversion mark will be created. Building those product modules is outside the accepted Do next scope.
- User conversion opens the existing Organization Center workflow; it does not create/invite an account or bypass its role controls.
- Production storage, multi-user ownership/permissions, real delivery and external attachments still need their separate product/backend contracts. These are not represented as completed backend capabilities.

## Implementation references

- `core/collab-store.js`: compatible store normalization and atomic note-column migration.
- `core/event-scheduling.js`: timezone conversion, recurrence expansion, overlap rules and due reminders.
- `pages/notes/notes.js`, `components/collab/kanban.js`: column management and accessible moves.
- `pages/activities/activities.js`: work queues.
- `pages/events/events.js`, `components/notifications/notifications.js`: scheduling UI and alert navigation.
- `pages/email/{templates.html,email.js}`: search filters and guarded Undo.
- `pages/people/people.js`, `components/data-list/*`, `pages/customers/record.js`: shared table and explicit Customer conversion.
- `core/collaboration-translations.js`: Arabic UI copy for the new controls.

## Verification

### UI follow-up

- Activities now keeps My work / Today / Overdue in the existing quick-filter dropdown and removes the duplicate queue row. Kind has a contextual icon; assignees occupy a full row. Due-date adjustment buttons preview their resulting dates, explain their base date and offer Clear. Record view and edit mode emphasize overdue, due today and high priority; edit highlights update with field changes.
- Shared record status pills and danger descriptions have clearer emphasis. Notes highlights pinned/archived context, Mail highlights starred/trashed messages, Events highlights timing/recurrence, and the shared calendar highlights today's cell and column across month/week/day views.
- Every breadcrumb begins with Home. The existing guarded Home handler remains in use. People details omits Back to list; the People Data breadcrumb returns to the list with the existing unsaved-change guard.
- Activity/navigation follow-up validation: build passed, **173 unit tests passed**, **63 focused browser checks passed** across light/dark/Arabic mobile, and **85 desktop collaboration/routing regressions passed**. Visual review confirmed the activity editor and today's calendar treatment; `git diff --check` passed.
- Notes places Manage columns between Search and View. The manager supports drag ordering and touch handles alongside keyboard arrow controls; Save persists the order.
- Mail uses an icon filter button beside Search with an active-filter badge. The centered dialog follows the shared `.dlg` / `.dhd` / `.dbody` / `.dfoot` shell, supports Apply/Cancel, validates date ranges and retains applied filters when cancelled. Selection counts appear once, in the action bar.
- Events uses the shared reminder switch, styled timezone select and Calendar/Agenda view menu. Agenda cards include time status, location, participants, recurrence, reminders, related-item counts and conflict styling.
- Related-item mutation controls are disabled in record View mode, including Mail reading. Opening related records remains available. Entering Edit enables link/create/remove; Cancel returns them to read-only.
- Follow-up control checks: **45 passed** across desktop light, desktop dark and Arabic mobile/RTL. Visual review covered the centered Mail filter dialog and agenda in dark desktop and Arabic mobile layouts.
- Final follow-up validation: production build passed, **173 unit tests passed**, **71 desktop collaboration regressions passed**, and `git diff --check` passed.

### Original decision implementation

- Production build passed; `git diff --check` passed.
- Full unit suite: **173 passed**, including store migration, scheduling, timezone and recurrence cases.
- Help-screen decisions, People Data and consistency browser suites across desktop light, desktop dark and mobile Arabic/RTL: **128 passed, 7 intentional skips**.
- Desktop collaboration and routing regressions: **85 passed**.
- Final visual review covered the Notes column manager, Activities queues, Events agenda, Mail filters and People table. The mobile RTL board focus/scroll regression was corrected by keeping document scrolling inside the app shell.

These checks establish prototype behavior. They do not establish production delivery, shared permissions, persistence outside the existing session store or usefulness with real user workloads.
