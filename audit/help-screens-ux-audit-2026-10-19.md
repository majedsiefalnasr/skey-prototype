# Help Screens UX audit — 19 October 2026

Scope: Internal Mail, Events, Activities, Notes, and People Data in the current prototype, including the People Data changes made during this review. This is a source review and browser walkthrough, not a usability study with customers. Priorities below are product recommendations; they do not authorize implementation.

P1 means address in the next relevant product iteration. P2 means a useful follow-up after the core workflow is validated. Production prerequisites are identified separately from defects in the prototype.

## Changes completed in this review

- People Data uses the Customers content gutter and table surface. The filter cluster occupies the start of the toolbar; search and view occupy the logical end on wide layouts and wrap on phones.
- Existing people and New person open a full content page, without a modal scrim or focus trap. The page retains the shared editor's validation, duplicate warning, related items and action menu.
- Save keeps the saved person's details open; Edit enters the form; Cancel returns to saved details; Back to list restores the current search/filter/view and focuses the originating person when still present.
- Leaving an edited person through the breadcrumb, Home or application navigation uses the unsaved-change guard. Conversion remains an explicitly labelled simulation.
- The record uses the existing area URL, `/help-screens/people-data`, following the Customers convention. Reloading this area URL returns to the list.

Implementation evidence: `concepts/app/pages/people/{templates.html,people.js}`, `components/collab/panel.js`, `shell/content.js`, and `core/routes.js`.

## Notes: should users add, rename and remove columns?

**Yes, as configurable workflow statuses.** Draft and Active describe a note's state. “Note type” would instead describe its content, such as Meeting notes, Reference or Idea. Those should be a separate property or tags, and should not be mixed into a workflow board.

The current Notes screen already has a Status field, a Status column in List view, and a Kanban grouped by the fixed Draft / Active / Archived statuses. The proposed feature is customization of those groups, not another table column duplicating Status. See `components/collab/meta.js:NOTE_STATUSES` and `pages/notes/notes.js:renderBody`, `listMarkup`, `moveNote`.

Recommended interaction:

1. Keep Draft and Active as useful defaults. Offer **Add column** after the existing workflow columns, rather than requiring setup before the first note.
2. Give each column a small menu: Rename, Move left/right, Hide, and Remove. Hiding changes the view; it does not change notes or their statuses.
3. Rename changes the display name only. Stable column IDs keep existing notes, filters and links intact. Trim names, reject empty names and duplicates, and preserve user-entered Arabic names as content rather than translating them as built-in labels.
4. Removing an empty custom column needs a simple confirmation. Removing a populated one requires a destination: “Move these 8 notes to Active and remove this column.” Show the count and destination before confirmation. Removing a column must never delete its notes.
5. Keep Archive as a distinct, reversible operation with a discoverable Archived view. Protect that system meaning even if the visual archive group can be hidden. Do not let renaming a column accidentally change whether notes are archived.
6. Provide a Move to menu and keyboard column ordering alongside drag-and-drop. Keep List view's Status choices and filters in step with the board.
7. For a shared board, make workflow editing a clearly scoped board-management capability; for personal boards, let the owner manage their own columns. Decide this scope before building permissions.

Use custom stages only when users need them. Start with a short workflow such as Draft → Active → Reviewed; avoid turning Notes into a second task manager. Work requiring an assignee or deadline belongs in Activities, with a deliberate Create activity action retaining the link to the note.

Suggested model for a later implementation: column definitions with stable IDs, labels, order and an underlying lifecycle category; notes reference the column ID. Migrate existing statuses without resetting the collaboration store. Archive behavior should remain independent of a user-visible label.

This recommendation is an inference for Skey, informed by [Notion's customizable status model](https://www.notion.com/help/guides/status-property-gives-clarity-on-tasks), which keeps stable overarching categories, and [Trello's reversible list archiving](https://support.atlassian.com/trello/docs/archiving-lists-deleting-lists/). These are reference patterns, not evidence that Skey users need every option.

Acceptance criteria for the first version:

- Adding or renaming a stage updates Kanban, List, the editor and filters consistently.
- A populated stage cannot be removed until its notes have a valid destination; cancellation changes nothing.
- Renaming a stage preserves note IDs, relationships and archive semantics.
- Users can discover hidden/archived work, restore it, and operate stage controls without dragging.
- Existing saved prototype data remains readable after the schema change.

## Current capabilities worth keeping

The older `collaboration-suite-audit.md` describes an earlier baseline. Several of its gaps are already implemented and should not be treated as new work:

| Screen | Present in the current code |
|---|---|
| Internal Mail | Inbox/Sent/Drafts/Archive/Trash/Starred, custom folders with rename/delete, recipient chips and Cc, draft autosave, conversation rendering, bulk actions, related items, mobile list/reader switching. |
| Notes | Kanban and List, quick add, pinning, tags, filters, title/updated sorting, archive, related items, a guarded editor. |
| Activities | Kanban and Calendar, assignees, priority, due date distinct from scheduled time, completion, follow-up and linked event/mail actions. |
| Events | Day/week/month calendar, keyboard date navigation, all-day events, participants, location, overlap indications, related items, reminder/repeat fields with prototype limitations. |
| People Data | Bilingual names, repeatable contacts, primary contact selection, live duplicate feedback, List/Cards, filters/search, archive/restore, related items and a full-page record. |

## Findings and proposed improvements

### Shared experience

| ID | Priority | Evidence / current behavior | Proposed improvement and completion check |
|---|---|---|---|
| S1 | P1 | `main.js` passes `sessionStorage` to `createCollabStore`; `collab-store.js:commit` keeps working in memory when storage fails. Reload works in the same tab, but this is not durable shared storage. | Before production, define durable saves, visible saving/saved/failed feedback and a retry path. An interrupted save must never report success or silently lose work. Treat this as a production prerequisite, not an instruction to replace prototype storage now. |
| S2 | P1 | Collaboration factory dependencies do not receive the app's active role or an entity visibility policy; the role control currently updates Organization Center/topbar. | Define personal/shared ownership and who may read, edit, delete or manage workflows. Show the scope on a record and give a useful explanation for unavailable actions. Verify with explicit role scenarios rather than assuming a role label enforces access. |
| S3 | P1 | Archive/restore exists, but `notes.js:deleteNote`, `activities.js:deleteActivity`, `events.js:deleteEvent` and `people.js:deletePerson` permanently remove entities after confirmation. Links intentionally remain as unavailable items. | Prefer archive for ordinary removal. Consider Trash or a short Undo for recoverable deletions; reserve permanent deletion for an explicit step showing affected relationships. Verify that restoring an item restores its links. |
| S4 | P2 | Filters/view selections live in page-controller state. They generally survive in-app navigation but are not a saved workspace view. People has no saved layouts. | Offer named personal views only where repeated filtering is common, then persist view mode, sort and filters. Opening another user's shared view should not silently replace a personal default. |
| S5 | P2 | `core/routes.js` routes screen areas; record IDs are intentionally absent from URLs. | If users need to share a specific note, person, event or activity, design an explicit record-link contract across the app. Define missing/archived/forbidden record behavior and return navigation. This needs an app-wide routing decision, not an isolated People URL change. |

### Internal Mail

| ID | Priority | Evidence / current behavior | Proposed improvement and completion check |
|---|---|---|---|
| M1 | P1 | `email.js:sendDraft` files a message in Sent and explicitly says nothing is delivered. `messageMarkup` labels attachments as sample files; the composer has no upload flow. | For production, define queued/sending/sent/failed delivery and retry, then attachment upload/download with per-file progress and errors. Until supported, retain the prototype's truthful wording. A failed delivery must keep the draft and recipient list. |
| M2 | P2 | `visibleMessages` searches `searchText` within the selected folder and offers unread-only filtering. | Add visible filter chips for sender/recipient, date range, attachments and related record; make the current search scope explicit and offer “Search all mail.” Preserve query and selection when returning from a message. |
| M3 | P2 | Drafts autosave with a 600ms delay and flush on navigation/pagehide. The composer supports To and Cc, with plain-text content. | Keep autosave. Consider Bcc only if the mail model permits external recipients; for strictly internal mail, recipient groups/teams are a stronger first addition. Add recipient resolution feedback so a typed name is clearly either a selected recipient or pending text. |
| M4 | P2 | Reply/forward, threading, bulk selection and custom folders already exist. Archive/move is immediate; no delayed-send queue is modeled. | Add Undo for archive/move before considering Undo Send. A real Undo Send needs a defined delay before delivery; a local toast cannot recall delivered mail. Validate undoing a bulk action without changing unrelated messages. |

### Events

| ID | Priority | Evidence / current behavior | Proposed improvement and completion check |
|---|---|---|---|
| E1 | P1 | `events.js` stores Reminder and Repeat; field hints explicitly state that notifications are not sent and only the first occurrence is shown. | Implement recurrence and reminders as complete behaviors, or keep the fields clearly marked as preview features. A recurrence release needs occurrence generation, end rules and “this event / future events / series” editing. A reminder release needs delivery preferences, timezone handling and duplicate suppression. |
| E2 | P1 | `overlaps` / `classify` mark any same-kind overlapping events in the visible range, without checking common participants or resources. | Distinguish “Events overlap” from “You/this participant are double-booked.” Only treat shared participants or booked resources as scheduling conflicts. Two unrelated teams meeting at the same time should not trigger a personal conflict. |
| E3 | P1 | Editors use local datetime strings; no event timezone, invitation or attendee-response model is present. | Add a visible timezone for timed events and define organizer/attendee RSVP states before using this as a shared scheduling tool. Test another timezone and daylight-saving boundaries; preserve all-day dates without shifting them. |
| E4 | P2 | Events has calendar views only; Activities has its own separate scheduled calendar. | Add an optional agenda list for scanning and accessible small-screen use. Consider a combined calendar with explicit Events/Activities layers so users can see their day without creating duplicate event records. Keep sources distinguishable. |

### Activities

| ID | Priority | Evidence / current behavior | Proposed improvement and completion check |
|---|---|---|---|
| A1 | P1 | `activities.js:filtered` sorts by due date; toolbar supports Open/Done and assignee filters, but there is no named My work / Overdue / Today entry point. | Add discoverable work queues derived from current assignees and due dates. Show counts and explicit overdue text. Keep unscheduled due-only activities visible in work queues without inventing a calendar time. |
| A2 | P2 | The activity model supports status, priority, assignees, due/scheduled time and follow-up. It has no comments, checklist/subtasks or change history. | Add a lightweight completion checklist and a factual activity history when collaborative handoff becomes a validated need. Start with who changed status/assignee/due date and when; avoid workload or employee scoring. |
| A3 | P2 | `createEvent` and `linkedEvent` connect scheduled work to an event; those remain separate entities. | Make the relationship explicit: “Open linked event” when one exists; when times change, explain whether they affect the activity, the event or both. Verify a second click cannot create accidental duplicates. |
| A4 | P2 | Cards have individual completion/follow-up actions; there is no shared multi-select task action surface. | If volume warrants it, add selection with bulk reassign, due-date change and archive. Preview the count; report partial failures per item. Keep completion reversible rather than treating bulk completion as deletion. |

### Notes

| ID | Priority | Evidence / current behavior | Proposed improvement and completion check |
|---|---|---|---|
| N1 | P1 | `NOTE_STATUSES` is fixed; every board column, status filter and editor option derives from it. List already has Status. | Add controlled workflow customization using the design above. Do not add a second “Note type” field to represent the same status. |
| N2 | P2 | `editorMarkup` contains title/body/status/tags/pin; the body is plain text with an explicit Save flow. Related Items can already create an activity. | Add useful note templates and a lightweight checklist if research supports them. Expose Create activity as an obvious next action for actionable notes, preserving the original note and its link. Do not add deadlines/assignees to Notes by default. |
| N3 | P2 | Unsaved edits get a discard confirmation. Unlike Mail, a newly typed note has no autosaved draft recovery. | Consider local recovery for a new note and clear “Draft recovered” feedback after interruption. Keep editing an existing saved note explicit until autosave/versioning semantics are agreed. |
| N4 | P2 | Pins, tags, title/updated sorting and shared related items exist; sharing scope and revision history do not. | Add personal/shared scope and revision history before collaborative document editing. At minimum, users must know who can read the note and be able to recover an overwritten body. |

### People Data

| ID | Priority | Evidence / current behavior | Proposed improvement and completion check |
|---|---|---|---|
| P1 | P1 | Full-page records and Customers-aligned gutters/toolbar are implemented in this review. The table uses the shared visual skin, but its columns are a small page-specific implementation. | Follow up with the shared table's sorting, column visibility and saved layouts if directory volume needs them. Reuse the list engine rather than growing another independent configuration system. Keep Name visible and reachable on narrow screens. |
| P2 | P1 | `convert` only records a `convertedTo` mark and displays “simulated”; it never creates a Customer/Supplier/User. | Design a conversion preview with field mapping and duplicate search. Offer Link to existing or Create new, preserve the source person and show a link to the resulting record. Creating a user/account requires its own authorized workflow, not a generic contact conversion. |
| P3 | P2 | Duplicate warnings match normalized phone/email or English name. They warn but allow save; there is no merge/resolve workflow. | Add a deliberate review/merge flow with side-by-side values and a selected primary contact. Show which links will move and require confirmation; a suspected duplicate must not auto-merge. Include Arabic-name matching after defining normalization rules. |
| P4 | P2 | Phone/email values in the list/details are text; related work is available in a separate related-items section. | Add explicit Call / Email / Create activity actions when a suitable contact exists, plus a concise related-work timeline on the person page. Avoid making the whole row trigger an external action; the name should keep opening details. |

## Suggested sequence

1. Ship and validate the People Data consistency fixes completed here.
2. Prototype Notes column management with safe migration/removal, and activity queues for My work / Today / Overdue. These improve organization without introducing a new work-object model.
3. Resolve scheduling trust: accurate conflict wording, timezone rules, recurrence and reminder behavior. Add an agenda view before pursuing a complex combined calendar.
4. For a production release, establish durable storage and permissions, then real mail delivery/attachments and deliberate person conversion. These require product/backend contracts; visual controls alone do not complete them.
5. Add saved views, bulk work management, note history and duplicate merging after observing repeated user needs.

## Verification

Relevant checks live in `tests/people-page.spec.mjs`, the People sections of `tests/help-screens-consistency.spec.mjs`, and `tests/collaboration.spec.mjs`. Browser checks cover Customers/People content-edge parity, record save/return, unsaved-change protection, touch targets and Arabic layout; the collaboration suite covers existing Notes/Activities/Events/Mail and related-item flows.

Final results:

- Production build passed.
- 37 route, navigation and collaboration-store unit tests passed.
- All 71 desktop collaboration browser tests passed.
- All 27 focused People Data browser checks passed across desktop light, desktop dark and mobile Arabic/RTL, including row access while a save notification is visible.
- Visual review of People Data uses the dark-theme list and full-page record. The list has the same table-content edges as Customers; the toolbar's search/view cluster sits at the logical end.

This review does not prove production delivery, notification scheduling, multi-user permissions, persistence outside the prototype session, or usefulness with real user workloads.
