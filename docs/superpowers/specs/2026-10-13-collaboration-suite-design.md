# Collaboration Suite — Design Spec

**Date**: 2026-10-13 · **Status**: approved in conversation (§1 + refinements), written for review
**Input**: `audit/collaboration-suite-audit.md` · **Type**: prototype only — no backend, no real delivery

## 1. Goal and scope

Make the five `Help Screens` collaboration rows real, interconnected prototype screens:
**Notes, Activities, Events, Internal Mail, People Data**, tied together by one shared **Related Items** system.

**In scope**
- 4 new pages (Notes, Activities, Events, People Data) + rework of the existing Internal Mail page.
- Shared collaboration store (`core/collab-store.js`), seed fixtures, Related Items component, side-panel editor, kanban board, calendar renderer.
- Navigation wiring of the existing `Help Screens` rows; routes for the 4 new screens.
- Notifications popover/badge reading inbox mail from the store (data-source swap only, no redesign).
- Prototype Controls: `Reset collaboration data` button.

**Out of scope / must not change**
- Invoices screens (`pages/invoices/**`) and Customers screens (`pages/customers/**`), including the invoice History drawer.
- `components/data-list/**` (coupled to protected screens — not reused).
- App-shell layout, topbar, sidebar visuals, launchpad.
- Real email delivery, server persistence, recurrence expansion, drag-to-reschedule on the calendar, external calendar sync.

## 2. Repository facts this design relies on

| Fact | Where |
|---|---|
| Page contract `{id, roots, activate(data), deactivate(), dispose()}` registered in `pageRegistry` | `concepts/app/main.js` |
| Page templates are `<template class="x-tpl">` cloned into `.page-content` | `concepts/app/shell/shell.js`; templates included from `pages/invoices/templates.html:682` |
| View visibility toggled by selector map | `concepts/app/shell/content.js` (`attachAndShowView`, `currentSkeletonContainer`) |
| Sidebar leaf label → view map; unknown labels fall back to `'record'` (invoice) | `concepts/app/shell/sidebar.js:107-111` |
| Help Screens rows: `Internal Mail, Calendar, Schedule Activity, Notes, People Data` | `concepts/app/prototype/fixtures/navigation.js:481-491` |
| Mail view `email` lives at `/system/email`, also reachable from the Account rail group | `core/routes.js`, `NAV_ACCOUNT_GROUP` |
| Mail fixtures `EMAIL_DATA` (no `threadId` today), read directly by notifications | `prototype/fixtures/messages.js`, `components/notifications/notifications.js` |
| Users for assignees/recipients | `ORGANIZATION_USERS`, `CURRENT_USER` fixtures |
| Arch rule: no circular imports; `core/` and `components/data-list/` never import `pages/` | `tests/architecture.test.mjs` |
| Route counts asserted (20 apps, 27 paths) | `tests/routes.test.mjs` |
| Tailwind compiled-size budget (baseline + 10%) | `tests/tailwind.test.mjs` |
| Pixel snapshots of the email view | `tests/messaging.spec.mjs` (`email-reading.png`), `tests/parity.spec.mjs` (`email.png`) |
| Shared UI primitives: `.lbtn`, `.lbtn.pri`, `.ibtn`, `.badge`, `.crumbs`, `.phead`, `rec-field` input styling, `createToast`, `createDialogFocus` / `trapFocus` | `styles/tailwind/shell.css`, `components/toast`, `components/dialog` |

## 3. Navigation and routes

Keep the `Help Screens` group. Rows become (order): **Internal Mail, Events, Activities, Notes, People Data** (labels renamed from `Calendar` → `Events`, `Schedule Activity` → `Activities`).

| Row | View id | URL |
|---|---|---|
| Internal Mail | `email` (existing) | `/system/email` (unchanged; Account group `Email` row stays) |
| Events | `events` | `/help-screens/events` |
| Activities | `activities` | `/help-screens/activities` |
| Notes | `notes` | `/help-screens/notes` |
| People Data | `people` | `/help-screens/people-data` |

- `sidebar.js` `viewByNavLabel` gains the 5 mappings; `main.js` `NAV_ITEM_LABEL_BY_ID` gains the 4 new ids (rail highlight + boot deep link).
- `routes.js` `AREA_VIEW_BY_PATH` + `PATH_BY_VIEW` gain 4 paths → `ROUTE_PATHS` 27 → 31 (test updated, comment updated).
- Opening Internal Mail from Help Screens moves the rail to the Account group (existing `syncRailToRoute` behavior for `email`) — accepted.

## 4. Data model (`core/collab-store.js`)

Pure module, no DOM, no page imports. Created by `createCollabStore({storage, seed, now})` in `main.js`; fixtures and the demo clock are injected.

**Demo clock**: `PROTOTYPE_NOW = 2026-10-13T13:24` (fixture). All "today", "overdue", default times derive from it — deterministic for tests and screenshots.

### Entities (stable seeded ids, e.g. `note-1`, `act-3`, `evt-2`, `per-4`; seeded mail keeps its existing ids `e1`–`e5`)

Common: `{id, type, createdAt, updatedAt}`. Type-specific fields only:

| Type | Fields |
|---|---|
| `note` | `title`, `body`, `status: draft\|active\|archived`, `tags: string[]`, `pinned: bool` |
| `activity` | `kind: todo\|call\|meeting\|email`, `summary`, `notes`, `assigneeId`, `status: planned\|in_progress\|done\|cancelled`, `priority: low\|normal\|high`, `dueDate?: 'YYYY-MM-DD'`, `scheduledStart?: 'YYYY-MM-DDTHH:mm'`, `durationMin?: number`, `archived: bool` |
| `event` | `title`, `allDay: bool`, `start`, `end` (date for all-day, datetime otherwise), `location`, `participantIds: string[]`, `reminder: none\|10m\|1h\|1d`, `repeat: none\|daily\|weekly\|monthly`, `description` |
| `mail` | `folder: inbox\|sent\|drafts\|archive\|trash`, `threadId`, `from {name,email}`, `to/cc: [{id?,name,email}]`, `subject`, `body: string[]`, `attachments`, `unread`, `starred`, `sentAt?`, `savedAt?`, `hue` |
| `person` | `nameEn`, `nameAr`, `company`, `jobTitle`, `contacts: [{kind: mobile\|phone\|email, value, primary}]`, `city`, `country`, `lifecycle: lead\|contact`, `convertedTo?: {target: customer\|supplier\|employee\|user, at}`, `archived: bool`, `notes` |

Activity scheduling rule: `dueDate`, `scheduledStart`, `durationMin` are independent and optional. **Only a valid `scheduledStart` makes an activity a timed calendar item.** No defaults are invented.

### Links table

`links: [{id, a: {type, id}, b: {type, id}, createdAt}]` — undirected, single source of truth. Mail entities hold no relationship data.

### API

| Function | Behavior |
|---|---|
| `getEntity(type, id)` | entity or `null` |
| `listEntities(type, filter?)` | array; `filter` is a predicate |
| `createEntity(type, data)` | assigns id + timestamps, persists, notifies, returns entity |
| `updateEntity(type, id, changes)` | shallow merge, bumps `updatedAt` |
| `deleteEntity(type, id)` | removes entity; **keeps its links** |
| `link(a, b)` | no-op if same pair exists in either direction or `a` equals `b`; returns `{created: bool}` |
| `unlink(a, b)` | removes the link row only |
| `getRelatedItems(type, id)` | `[{ref, entity \| null}]` — `null` ⇒ unavailable item |
| `eventsInRange(from, to)` | events overlapping the range |
| `scheduledActivitiesInRange(from, to)` | activities with valid `scheduledStart` in range, not archived |
| `now()` | demo clock |
| `subscribe(fn)` → unsubscribe | called after every mutation |
| `reset()` | restores seed, persists, notifies |

**Persistence**: whole state serialized to `sessionStorage['skey-proto-collab']` after each mutation. On create: if a parseable saved state with the current schema `version` exists, load it; otherwise load the seed. Storage errors are swallowed (store still works in memory). Only the store touches this key; reset touches only this key.

### Lifecycle rules

- **Archive** (notes: `status: archived`; activities/people: `archived: true`): hidden from default views, still linkable, restorable.
- **Delete**: confirm dialog → entity removed, links kept → the other side shows **Unavailable item** with a Remove link action.
- **Unlink**: removes only the link.
- Linking never changes status, schedule, or any field of either entity.

## 5. Shared components

### 5.1 Related Items (`components/related-items/related-items.js`)

`createRelatedItems({store, t, toast, trapFocus, releaseFocus, openItem, createItem})` returns `{render(container, ref), openPicker(ref)}`.

**Section** (inside every editor/reading pane): heading `Related items (n)`, rows grouped flat and sorted by type then title. Each row:
- type icon + **type label text** (`Note`, `Activity`, `Event`, `Mail`, `Person`) — never color alone;
- title (note title / activity summary / event title / mail subject / person name);
- meta: note status · activity status + due/scheduled · event date-time · mail folder + date · person lifecycle/converted;
- actions: **Open** (row click / Enter) and **Remove link** (`ibtn` with label `Remove link to <title>`).
- Unavailable: muted row "Unavailable item (deleted <type>)" + Remove link.
- Footer buttons: **Link existing…** and **Create related ▾** (Note / Activity / Event).

**Picker dialog**: search input (title/body text), type filter segmented buttons (All + 5 types), result listbox (`role=listbox`, ↑/↓/Enter, Esc closes, focus trapped). Excludes the current item and already-linked items. Selecting links and keeps the dialog open for multiple picks; `Done` closes. Toast `Linked to <title>`.

**Create related**: creates the new entity with minimal defaults (note `draft` "Untitled note"; activity `todo` "Follow up"; event next half-hour + 60 min), links it to the source, then opens it in its own screen's panel. The relationship exists before the user edits anything.

**Open**: `openItem(ref)` → navigates to the owning screen with `{openId}` (mail: `{messageId}`); the screen opens that item's panel. Search/filters/view of the target screen are preserved in its page state.

### 5.2 Side panel editor (`components/collab/panel.js`)

One right-side drawer (`role=dialog`, `aria-modal`, labelled by title, focus trap, Esc closes, returns focus) used by Notes, Activities, Events, People. Header: type badge + title + overflow (`Archive/Restore`, `Delete`) + close. Body: page-supplied form sections (progressive disclosure via `<details>` for secondary fields) + Related Items section. Footer: `Save` (primary) · `Cancel`. Save validates required fields inline, then `updateEntity`/`createEntity` and toast. Unsaved edits on close → confirm "Discard changes?".

### 5.3 Kanban board (`components/collab/kanban.js`)

`renderBoard(container, {columns:[{id,label,items,collapsed?}], renderCard, onMove, onQuickAdd?})`. Columns show count; empty column shows hint + quick add when supported. Cards are buttons (open). Move: HTML5 drag between columns **and** keyboard alternative: each card has a `Move to…` menu. `onMove(id, columnId)` updates status only.

### 5.4 Calendar (`components/collab/calendar.js`)

`renderCalendar(container, {mode: day|week|month, date, items, onSlot, onOpen, now})`. Items are pre-filtered by the caller: `{ref, title, start, end, allDay, kindLabel}`.
- Toolbar (rendered by page): `‹` `›` `Today`, period title, segmented `Day | Week | Month`.
- Month: 6×7 grid, week starts **Sunday** (matches the current product), today marked with accent ring + "Today" sr text; up to 3 chips/day then `+n more` (opens Day view).
- Week/Day: separate **all-day row** on top, then hour grid 00–24 scrolled to 07:00, items positioned by start/end, overlap side-by-side, "now" line on today.
- Clicking an empty slot calls `onSlot({date, time?})`; clicking an item calls `onOpen(ref)`.
- Changing mode/date never mutates items.

### 5.5 Shared field classes (`components/collab/fields.js`)

Exports class-string constants reusing the existing `rec-field` input styling (same visuals as Customers dialogs) and small helpers (`field`, `select`, `textarea`, `toggle`) so all four editors share one form framework.

## 6. Screens

All screens share the header pattern of `pages/email/templates.html`: crumbs `Home › <Screen>`, `h1`, primary action on the right, then a toolbar row: search · filters · view switch (segmented, `aria-pressed`) where applicable.

### 6.1 Notes (`notes`) — views: **Kanban | List**

- Primary: `New note` → panel with only **Title** required (body optional). Kanban column quick add: `+ Add note` inline input; Enter creates note in that column.
- Columns: **Draft · Active · Archived**. Archived column is collapsed by default (header with count + `Show`), satisfying "archive hides from default views". Moving a card changes `status` only.
- Card: pin icon if pinned, title, 2-line body excerpt, tag chips, related-items count, updated relative date.
- List: table (Title, Status, Tags, Related, Updated), archived hidden unless filter `Show archived`.
- Search: title + body. Filters: Tag (select), Pinned only (toggle), Show archived (List). Sort (List): Updated ↓ (default), Title A–Z.
- Editor: Title*, Body (textarea), Status select, Tags (comma input → chips), Pinned toggle; Related Items. **No dates, priority, or assignee on notes.**
- Empty states: board-level "No notes yet — capture one with New note"; search no match "No notes match "…"".

### 6.2 Activities (`activities`) — views: **Kanban | Calendar**

- Primary: `New activity` → panel. Required: **Kind**, **Summary**, **Assignee** (default current user). Optional: Due date; `Schedule a time` disclosure → Start date-time + Duration (15/30/45/60/90/120 min); Priority (default Normal); Notes.
- Kinds with icon + label: To-do (`i-check`), Call (`i-chat`), Meeting (`i-user`), Email (`i-mail`).
- Kanban columns by status: **Planned · In progress · Done**. Cancelled and archived hidden by default (filter `Show cancelled & archived`).
- Card: kind icon+label, summary, assignee initials+name, priority badge (High only shows), due chip: `Overdue · <date>` (warn icon + text, danger tone) when `dueDate < today` and status open, `Due today`, or `Due <date>`; `Scheduled <date time>` chip when scheduled.
- Calendar: shows **only** activities with valid `scheduledStart`, via `scheduledActivitiesInRange`. A notice above the calendar: `n unscheduled activities aren't shown — they stay in Kanban.` (link switches to Kanban). Clicking a slot opens a new activity with `scheduledStart` = that slot (this is the user choosing a time, not an invented one).
- Search: summary + notes. Filters: Assignee (All / Me / user), Kind, Overdue only.
- Actions in panel/card menu:
  - **Mark done** → status `done` + toast with `Schedule follow-up` action → creates a `todo` activity "Follow up: <summary>" linked to the done activity, opens it.
  - **Reschedule**: due-date quick buttons `+1 day`, `+1 week` (edit due date); scheduled time edited in fields.
  - **Kind = Email**: `Compose email` → navigates to Internal Mail composer with a new draft already linked to this activity.
  - **Kind = Meeting**: if a linked event exists → `Open linked event`; else `Create event` (requires `scheduledStart`; event start/end from schedule; linked) and `Link existing event…` (picker filtered to events). Never creates a second event when one is linked.
- Status/overdue never driven by links.

### 6.3 Events (`events`) — view: **Calendar only** (Day | Week | Month)

- Default Month, date = demo today. Primary `New event`.
- Editor: Title*, All day toggle; Start + End (date-only inputs when all-day, datetime-local otherwise; default next half-hour + 60 min from demo now or from clicked slot; end ≥ start validated); Location; Participants (multi-select of organization users, chips); Reminder (None/10 min/1 hour/1 day — stored, shown in panel, label "Reminder (prototype: no notification is sent)"); Repeat (None/Daily/Weekly/Monthly — stored, shown as "Repeats weekly"; hint "Only the first occurrence is shown in this prototype"); Description; Related Items.
- All-day events render in the all-day row/month chip without time; timed events in the grid.
- No Kanban, no List.

### 6.4 Internal Mail (`email`, reworked in place)

Layout: folder rail (left) · message list · reading/compose pane — three columns ≥ 1100px; folder rail collapses into a select above the list below that; list → pane single-column under 720px with Back.
- **Folders**: Inbox, Starred (virtual: starred & not trash), Sent, Drafts, Archive, Trash — counts (unread for Inbox, total for Drafts).
- **List**: day groups (relative to demo now), sender/recipient (Sent/Drafts show "To: …"), subject, time, unread dot + bold, star, attachment clip, linked-items clip icon with count. `role=listbox`, ↑/↓ moves, Enter opens.
- **Reading pane**: thread view (messages sharing `threadId`, oldest→newest, latest expanded), toolbar with labeled icon buttons: Reply, Forward, Archive / Move to Inbox, Delete (→Trash; in Trash: `Delete permanently` with confirm), Mark unread, Star/Unstar, **Create activity**. Then Related Items section for the selected message.
- **Compose** (new / reply / forward / open draft): To + Cc recipient pickers (chip input with suggestions from `ORGANIZATION_USERS`; free email allowed and validated), Subject, Body, Related Items section (links attach to the draft entity), `Send`, `Save draft`, `Discard`.
  - Draft entity created on first keystroke; autosaved (debounced 600 ms) and on leaving the view/closing compose; `savedAt` shown "Draft saved 13:24".
  - Send: validates ≥1 recipient + subject or body; moves entity to `sent`, sets `sentAt`, keeps `threadId` (reply) and links; toast "Sent — prototype only, nothing is delivered."
- **Create activity** from a message: creates `email`/`todo` activity "Follow up: <subject>" assigned to current user, **linked to the message**, opens it in Activities.
- **Search**: subject, body, from, to — within the current folder; `No messages match "…"`.
- Notifications popover + badge read inbox messages from the store (via an injected getter); opening one calls the existing `openEmailView(messageId)`.

### 6.5 People Data (`people`)

- Primary `New person`. List view only (table): Name (EN + AR, `dir=auto`), Company, Primary mobile, Primary email, Lifecycle badge, Converted badge. Search name/company/contacts; filters: Lifecycle, Show archived.
- Editor sections: **Identity** (Name EN*, Name AR, Job title, Company), **Contact** (repeatable rows: kind select + value + primary radio; email/phone format validated), **Address** (Country, City — `<details>`), **Notes**, Related Items.
- **Duplicate feedback**: while editing, if another person matches normalized mobile/phone, email, or case-insensitive EN name → inline warning `Possible duplicate: <name> (<matched field>)` with `Open` button. Save is still allowed.
- **Convert to ▾** (Customer, Supplier, Employee, User): confirm dialog states "Prototype: this marks the person as converted. No Customer/Supplier/Employee/User record is created." → sets `convertedTo`, badge `Converted to Customer`. Repeat conversion asks to replace. Customers fixtures/screens are never read for writing.

## 7. UX standards (all five)

- Type always shown by icon + text label. Existing tokens/classes only (`lbtn`, `ibtn`, `badge`, `rec-field`, `--accent`, `--line`, …).
- Toasts for create/save/archive/restore/delete/link/unlink/convert/send/draft discard.
- Empty states for every list/board/folder/related section.
- Keyboard: every action reachable by Tab; listboxes support arrows; Esc closes panel/picker; visible focus via existing `focus-visible` patterns.
- RTL: logical properties (`ms-/me-/start/end`), `dir="auto"` on user text; works with the `#rtl` prototype control.
- Page state (view mode, search, filters, calendar mode/date, selected folder) lives in the page module and survives navigation away and back.
- Unsupported things are labeled as prototype limitations in place (reminder, repeat, delivery).

## 8. Prototype Controls

New group **Collaboration** (shown on `notes`, `activities`, `events`, `email`, `people`): button `Reset collaboration data` → `store.reset()` + toast. Touches only `skey-proto-collab`.

## 9. Representative flows

1. Notes → New note "Payment terms for Al Noor" → Link existing… → pick activity "Call Al Noor about quotation" → open activity from the Related row → the note appears in the activity's Related Items.
2. Mail → message e1 → Create activity → Activities panel opens with the message in Related Items → Mail reading pane of e1 shows the activity.
3. Activities → set kind Meeting with scheduled time → Create event → Events calendar shows it at that time; Activities calendar shows the activity; pressing Create event again is impossible (button becomes Open linked event).
4. Activity with only a due date → absent from Activities calendar; notice counts it.
5. Mail compose → type → go to Notes → back to Mail → Drafts holds it with content → Send → appears in Sent.
6. People → New person with existing mobile → duplicate warning → Convert to Customer → badge; Customers list unchanged.
7. Delete a note linked to an event → event shows "Unavailable item" → Remove link.

## 10. Acceptance criteria

1. Five Help Screens rows open their screens; deep links `/help-screens/{notes,activities,events,people-data}` boot to them; Back/Forward works.
2. Notes exposes exactly Kanban + List; Activities exactly Kanban + Calendar; Events exactly Calendar with Day/Week/Month; no other view switches.
3. Link from either side is visible on both; linking the same pair twice creates one link; unlink removes only the link; entity counts unchanged by link/unlink.
4. Deleted linked entity shows "Unavailable item" on the other side.
5. Activities with only `dueDate` never appear on any calendar; notes never appear on calendars.
6. Mail→Create activity yields an activity linked to the message (visible both sides).
7. Drafts survive navigation and reload (same tab); Send moves to Sent; no claim of delivery.
8. State survives navigation and reload; `Reset collaboration data` restores seed and touches no other storage key.
9. People conversion never changes customers fixtures or Customers screens.
10. Invoices and Customers screens unchanged: their unit tests and pixel snapshots pass unmodified.
11. `npm run test:unit`, `npm run build`, and the Playwright suite pass. Email pixel snapshots (`email-reading.png`, parity `email.png`) are regenerated **only after the user approves the new mail UI**; never deleted.

## 11. Verification

- **Unit (`node --test`)**: `tests/collab-store.test.mjs` — CRUD, link dedupe (both directions, self-link), bidirectional `getRelatedItems`, unlink keeps entities, delete keeps links → `entity: null`, calendar inclusion (dueDate-only excluded, archived excluded, range overlap, all-day), persistence load/seed fallback/corrupt JSON, reset key isolation (fake storage with other keys). `tests/routes.test.mjs` updated for 31 paths + new parse/format cases.
- **Browser**: `tests/collaboration.spec.mjs` — flows 1–7, view availability, keyboard picker, RTL smoke.
- **Regression**: full `npm run test:browser` (parity + existing specs) with dev server; Tailwind budget raised with a dated addendum in `docs/tailwind-migration-report.md` if needed.
- **Arch**: `tests/architecture.test.mjs` passes (no page imports from `core`/`components`).

## 12. Risks and decisions

- **Tailwind budget**: new screens add utilities; mitigate with shared class constants; raise baseline with documented addendum (existing practice).
- **Email snapshot churn**: intentional; approval checkpoint before regenerating.
- **Rail jump for Internal Mail** to the Account group: accepted to avoid changing `/system/email`.
- **Recurrence/reminders** stored but not executed — labeled in UI.
- **Mail fixtures migration**: `EMAIL_DATA` stays exported as the seed source; the seed maps each message to a `mail` entity with the same id plus `folder`, `threadId`, `starred`, `sentAt`. Notifications switch to an injected store getter.
