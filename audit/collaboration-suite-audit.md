# Skey ERP — Collaboration Suite Audit (Internal Mail, Calendar, Schedule Activity, Notes, People Data)

**Scope**: The five collaboration screens listed under the last nav group in `concepts/app/prototype/fixtures/navigation.js:481-491` — **Internal Mail**, **Calendar**, **Schedule Activity**, **Notes**, **People Data**. Smart Query Engine, AI Dashboard, Sales Forecast and Help Screens are out of scope.

**Evidence**:
- Internal Mail: the prototype in this repo — `concepts/app/pages/email/email.js`, `concepts/app/pages/email/templates.html`, fixtures in `concepts/app/prototype/fixtures/messages.js`.
- Calendar, Schedule Activity, Notes, People Data: screenshots of the live product (`app.skeyerp.com`) supplied on 2026-10-13. These are not in the prototype yet, so the findings come from what the screenshots show; behaviour that isn't visible in them is marked *(verify)*.

**Benchmarks**: Odoo (Discuss, Calendar, Activities, To-Do, Contacts), Microsoft Dynamics 365 (Activities, the "Regarding" field, timeline, lead qualification), Salesforce (Tasks/Events, Activity Timeline, Person Accounts), SAP Fiori (My Inbox, Calendar), Zoho CRM / HubSpot (contact lifecycle stages), plus Gmail/Outlook and Google Calendar for patterns users already know. These references show patterns, not proof. No metrics are claimed.

**Severity**: **P0** blocks the module's core job · **P1** major friction or missing table-stakes feature · **P2** polish / power-user.

---

## 0. The cross-cutting finding: five silos that should be one system

These five screens are the ERP's **collaboration layer**. In every benchmark they share one data model. Today in Skey they are separate forms that don't reference each other or the business records (customers, invoices) they exist to serve.

| # | Finding | Sev |
|---|---|---|
| X-1 | **No "Related to" link anywhere.** A mail, event, activity or note can't point at a Customer, Sales Invoice, Supplier, Item or Person. In Dynamics 365 this is the *Regarding* field; in Odoo it is `res_model`/`res_id`, and every activity, note and message hangs off a record. Without it, these modules are personal notepads, not ERP tools. | P0 |
| X-2 | **No shared timeline on business records.** The Sales Invoice already has a "History of this invoice" drawer (`concepts/app/pages/invoices/activity-dialog.html`) with User Log + notes. That is where scheduled activities, related mail and notes should also appear (Odoo *chatter*, Dynamics *Timeline*, Salesforce *Activity Timeline*). | P0 |
| X-3 | **Overlapping concepts.** Schedule Activity has a "To Do" type. Notes have Phase + Priority + From/To dates (which makes them tasks). Calendar events and "Meeting" activities are separate entities. Users won't know where a piece of work belongs. | P1 |
| X-4 | **Inconsistent form framework.** The Calendar "Add Event" modal uses Material-style underline fields, uppercase text buttons and a pink accent. Activity, Notes and People use the boxed label-left ERP form with blue accent. The today marker and the active view are pink/magenta, not the brand blue. | P1 |
| X-5 | **No "My work" entry point.** Nothing shows "what's due for me today" across activities, events, unread mail and notes. The prototype already has a For You page (`concepts/app/pages/for-you/`), which would be the natural home. | P1 |
| X-6 | **No reminders / notifications wiring.** Due activities and upcoming events should feed the existing notifications panel (`NOTIF_DATA`) and the topbar badge *(verify whether live product does this)*. | P1 |

### Proposed unified model

```
Person / User / Customer / Supplier / any document   ← "Related to" (polymorphic, 0..n)
          ▲                ▲               ▲
      Activity  ──(Meeting/Call with time)──▶ shows on Calendar
          │                                      ▲
          └──(type = Email)──▶ Internal Mail ────┘ (invites are mails)
      Note  ── personal/shared, pinnable to a record, optional checklist
```

**Recommendation — rationalize the three "work" objects:**
1. **Activity** = assignable work with a due date. Types: To-Do, Call, Meeting, Email, Follow-up, plus custom. A Meeting/Call with a time range appears on the Calendar automatically, so there's no separate "event" for business meetings.
2. **Calendar event** = time-blocked items that aren't work items (holidays, leave, company events). The Calendar renders *both* events and timed activities as layers.
3. **Note** = free-form knowledge, optionally organised on a personal kanban (this matches the user's intent). If a note needs an assignee + due date, offer **"Convert to activity"** rather than growing task fields on notes.

---

## 1. Internal Mail

### Current inventory (prototype)
- Two-pane layout: 300px list (search + day-grouped rows: avatar, sender, time, subject, unread state) + reading pane (sender, subject, To/Cc chips, body, attachment chips, pinned reply composer).
- "Compose" replaces the reading pane with To (free-text email), Subject, body, a B/I/U/S toolbar, an attach button (inert), and Send.
- Search matches `from` and `subject` only. No other filters.

### Findings

| # | Finding | Evidence | Sev |
|---|---|---|---|
| M-1 | **No folders / mailboxes**: no Inbox, Sent, Drafts, Trash, Archive, Starred, or custom folders/labels. Everything is one flat list. | `email.js` `renderEmailList` iterates all of `EMAIL_DATA` | P0 |
| M-2 | **No Sent or Drafts.** Sending clears the textarea, and the message goes nowhere visible. Navigating away loses an unsent draft (the empty-send toast even promises "the draft is kept here"). | `wireComposer` | P0 |
| M-3 | **No message actions**: no delete, archive, mark unread, star/flag, move, forward, reply-all, print. Only "Reply". | reading pane markup | P0 |
| M-4 | **Recipient is free-text "Recipient email…"**. Internal mail should pick **users, roles/groups and departments** with autocomplete chips, plus Cc/Bcc. | `renderComposeNew` | P1 |
| M-5 | **No record linking.** Can't attach "Sales Invoice 126" as a live entity chip, and an invoice can't show its related mail (see X-1). The fixtures literally talk about invoices ("Payment scheduled for Sales Invoice 126") but offer no link. | `messages.js` | P0 |
| M-6 | **No threading / conversation view.** Replies aren't grouped under the original. | — | P1 |
| M-7 | **No bulk selection** (checkbox column, select all, bulk archive/delete/mark read). This is an ERP anti-pattern per `PRODUCT.md` ("avoid … hiding bulk actions"). | — | P1 |
| M-8 | **Search is shallow**: no body/recipient/attachment search, no filter chips (Unread, Has attachment, From me, Linked to record, Date range). | `renderEmailList` | P1 |
| M-9 | **Compose replaces the reading pane**, so the user loses the message they were reading. Benchmarks use a docked/pop-out composer (Gmail) or a new window (Outlook). | `renderComposeNew` | P2 |
| M-10 | **Attach button is inert** and has no drag-and-drop, size limit or progress. | composer toolbar | P1 |
| M-11 | **List semantics**: rows are plain `<button>`s with no `role="listbox"/"option"` or `aria-selected`, no ↑/↓ navigation, and unread state is conveyed visually only. | `email.js:37-55` | P1 |
| M-12 | **No keyboard shortcuts** (c compose, r reply, a reply-all, f forward, e archive, # delete, j/k next/prev, / search, Esc close). Keyboard-first is a product principle. | — | P2 |
| M-13 | **No "no message selected" empty state**, and no empty state per folder ("Drafts is empty"). | `activate` auto-selects first | P2 |
| M-14 | **Fixed 300px list, no responsive single-pane mode** for mobile (list → detail with back). | `templates.html` | P1 |

### Enhancements (ranked)

**Must have (P0/P1)**
1. **Folder rail** (left of the list, collapsible): Inbox · Starred · Sent · Drafts · Scheduled · Archive · Trash · **Linked to records** · custom folders. Each shows an unread count.
2. **Drafts autosave** every few seconds and on navigation, plus "Draft saved" status text in the composer.
3. **Message toolbar** in the reading pane: Reply · Reply all · Forward · Archive · Delete · Mark unread · Star · Move to… · Print · More (⋯). Use labeled icons with tooltips and shortcut hints, not icon-only (PRODUCT.md anti-pattern).
4. **Recipient picker**: users, groups (e.g. "Accounts"), departments; chips; Cc/Bcc toggle; show the recipient's job title on hover.
5. **Related records**: an "Attach record" button in the composer inserts an entity chip (`Sales Invoice 126 · Posted`) that opens the record. Mail sent from a record's ⋯ menu ("Send by internal mail") pre-fills the chip. The record's History drawer gains a **Mail** tab.
6. **Bulk mode**: hover checkbox on the avatar (Gmail pattern) → sticky bulk bar (Archive, Delete, Mark read/unread, Move, Star).
7. **Threaded conversations** with collapse/expand of older messages.
8. **Filter chips** under search: Unread · Starred · Has attachment · Linked to record · From: · Date.

**Should have (P2)**
- **Undo send** (5–10s toast with Undo), **schedule send**, **snooze** (resurfaces in Inbox at a chosen time).
- **Importance flag** (High) and **read receipts** for internal users ("Seen by 3 of 4").
- **Signatures** (per user, bilingual AR/EN).
- **Templates / quick replies** for repetitive finance messages.
- **"Create activity from this mail"** (follow-up), with the mail linked to the activity.
- **Reading pane position** toggle (right / bottom / off) and a **density** toggle (already exists app-wide via `body.density-*`).
- **RTL**: auto-detect paragraph direction (`dir="auto"`) per message body, since Arabic and English mix in one thread.

---

## 2. Calendar

### Current inventory (screenshots 1–3)
- Header: breadcrumb (Home › Calendar), a lone **Create** button in its own toolbar band, then an empty band.
- Calendar toolbar: ‹ › arrows, "October 2026 ▾" picker, **TODAY**, **TIMELINE DAY · DAY · WEEK · MONTH · YEAR** (uppercase text tabs, active in pink).
- Month grid starts Sunday, today shown as a pink filled circle; Day view 7:00 AM – 6:00 PM with off-hours shading and a red now-line (1:24 PM).
- **Add Event** modal: Title, Location, Start, End (date + time pickers), All Day, Timezone, Repeat (Never ▾), Calendar Tags, Calendar Type ▾, Description; buttons **ADD/EDIT** and **CLOSE** plus an ✕.

### Findings

| # | Finding | Sev |
|---|---|---|
| C-1 | **No attendees / invitees.** Can't invite users or people, no RSVP (Accept / Tentative / Decline), no organizer. A business calendar without attendees is a personal diary. | P0 |
| C-2 | **No calendar sidebar**: no mini-month, no list of calendars/layers with color toggles (My calendar, Team, Company holidays, Activities due, Invoice due dates, Leave). No way to view a colleague's calendar. | P0 |
| C-3 | **No "Related to" link** (customer, invoice, person) on events (X-1). | P0 |
| C-4 | **Start = End by default** (`10/13/26 1:24 PM` → `10/13/26 1:24 PM`), which creates a zero-length event at an odd minute. Benchmarks round to the next 30 min and apply a default duration (30/60 min), and moving Start shifts End by the same amount. | P1 |
| C-5 | **No reminders** (e.g. 10 min / 1 day before, in-app + mail). | P1 |
| C-6 | **No click-/drag-to-create** on a slot or day cell *(verify)*. The only path is the detached **Create** button, which also opens with "now" instead of the clicked slot. | P1 |
| C-7 | **No drag to move/resize** events *(verify)*. | P1 |
| C-8 | **Modal labelling**: "ADD/EDIT" is a mode-agnostic label, so use **Create event** / **Save changes**. CLOSE + ✕ are duplicate exits. There are no required markers (Title should be required). "Timezone" as a checkbox is unclear (it should reveal a timezone picker defaulting to the user's zone). | P1 |
| C-9 | **"Calendar Tags" vs "Calendar Type"**: two classification fields with no explanation, and Type has no default. Merge into one **Calendar** (which layer/color) + optional **Tags**. | P1 |
| C-10 | **Repeat is a bare dropdown** *(verify options)*. It needs custom rules (every N weeks on Sun/Tue, end after N / on date) and edit-scope prompts ("This event / This and following / All"). | P1 |
| C-11 | **No Agenda/List view** and no search/filter over events. Timeline Day is unexplained (timeline of what? It's normally used for resources such as rooms, users or vehicles). | P1 |
| C-12 | **No all-day row** in Day/Week views (visible in screenshot 3: hours start immediately under the day header). | P2 |
| C-13 | **Visual inconsistency** (X-4): pink accent, Material underline fields, uppercase tabs; Create sits in a separate band with an empty strip below it (wasted ~80px of vertical space). | P2 |
| C-14 | **Locale**: no week-start setting (Saturday is common in Egypt/KSA), no **Hijri date** secondary label, and no weekend shading per locale (Fri/Sat). RTL mirroring of ‹ › arrows *(verify)*. | P1 |
| C-15 | **No external sync / export**: no iCal (.ics) export/subscribe and no Google/Outlook sync. | P2 |
| C-16 | **No working-hours / free-busy** awareness when inviting. | P2 |

### Enhancements (ranked)

**Layout (target)**
```
┌ Home › Calendar ─────────────────────────────────────────────────────┐
│ [+ Create ▾]  ‹ ›  Today   October 2026 ▾        [Day|Week|Month|Year|Agenda|Timeline]  🔍  ⚙ │
├───────────────┬──────────────────────────────────────────────────────┤
│ mini-month    │                                                      │
│ ─────────     │                 calendar canvas                      │
│ My calendars  │                                                      │
│ ■ Me          │                                                      │
│ ■ Activities  │                                                      │
│ ■ Holidays    │                                                      │
│ Team          │                                                      │
│ □ Sales team  │                                                      │
│ + Add person  │                                                      │
└───────────────┴──────────────────────────────────────────────────────┘
```

**Must have**
1. **Left sidebar**: mini-month (jump to date), calendar layers with color swatches + show/hide, "Add a colleague's calendar", **Activities due** layer (from Schedule Activity), optional **Document dates** layer (invoice due dates, cheque dates — high ERP value).
2. **Event form → side panel or larger dialog** using the app's standard form components:
   - Title* · Calendar (color) · Start/End with smart defaults (next half-hour, 30/60 min) · All day · Timezone (picker, collapsed by default)
   - **Attendees** (users, people, customer contacts) with availability hints · **Organizer**
   - **Related to** (record picker)
   - **Location / Online meeting link**
   - **Reminders** (multi) · **Repeat** (custom rule builder)
   - Description (rich text) · Attachments
   - Buttons: **Create event** (primary) · Cancel. Edit mode: **Save changes** · Delete · Duplicate.
3. **Quick-create popover** on slot click/drag (title + time + Save / "More options"), Google Calendar style. This is the fastest path for keyboard-first users.
4. **Event popover on click**: title, time, attendees + RSVP state, related record chip, Edit / Delete / Join / Copy link.
5. **Drag to move, drag edge to resize**, with Undo toast.
6. **Agenda view** (chronological list grouped by day) for scanning and printing.

**Should have**
- Hijri secondary dates and a locale week start; working-hours shading per user.
- **Find a time** (overlay attendees' busy blocks).
- Resource booking (meeting rooms, cars) using Timeline view with resources as rows.
- iCal export/subscribe; Outlook/Google two-way sync later.
- Keyboard: `t` today, `d/w/m/y/a` views, `←/→` prev/next, `c` create, `/` search.
- Print view (week/agenda).

---

## 3. Schedule Activity

### Current inventory (screenshots 4–5)
- Record form (with pager in header): **Activity Type*** (E-mail, Call, Meeting, To Do), **Date*** (date only), **Priority*** (no default), **Remarks*** (textarea).
- **User** section: single lookup "1 - Administrator" with a ☰ lookup button.
- Right column: a grey avatar circle placeholder (purpose unclear).
- **Statistics** section *on the record form*: All / Year / Month / Day segmented filter; three big counters All / Done / Not Done (all 0).

### Findings

| # | Finding | Sev |
|---|---|---|
| A-1 | **Can't link to customer, invoice or any record**, which is the core requirement. Needs a polymorphic **Related to** field (multiple allowed: e.g. a Customer *and* Invoice 126). | P0 |
| A-2 | **Date only, no time / duration / deadline distinction.** A Call or Meeting needs a time and duration, and a To-Do needs a due date. There's also no reminder time. | P0 |
| A-3 | **Single assignee, no assigner/owner, no watchers.** Benchmarks record *Assigned to* and *Created by* and notify the assignee. Team/role assignment ("Accounts team") is missing. | P1 |
| A-4 | **No status lifecycle** beyond the implicit Done/Not Done: no Planned → In progress → Done / Cancelled, no **Mark as done with feedback** (Odoo), no **Reschedule / Snooze**. | P1 |
| A-5 | **"Not Done" conflates Overdue, Due today and Upcoming.** Overdue is the most actionable state and it's invisible. | P1 |
| A-6 | **Statistics live on the single-record form.** Aggregates belong on the list/dashboard (or the user's For You page), not inside one activity's edit form. The giant 0/0/0 circles take more space than the form itself. | P1 |
| A-7 | **Remarks required, no Summary/Title.** Lists can't show a scannable one-liner. Replace with **Summary*** (one line) + **Notes** (optional, rich text). | P1 |
| A-8 | **Priority required with no default** adds friction to every entry. Default to Normal and render as a flag/stars. | P2 |
| A-9 | **Activity types are hard-coded** *(verify)*: no icon, color, default duration, default summary, or **chained next activity** ("after Call → schedule Follow-up in 3 days", Odoo pattern). | P1 |
| A-10 | **Type doesn't drive behaviour**: "E-mail" should open the Internal Mail composer pre-linked, "Meeting" should create a calendar entry with attendees, "Call" should log an outcome (Answered / No answer / Call back). | P1 |
| A-11 | **No list views**: My activities, Assigned by me, Overdue, Today, This week, Kanban by due bucket (Overdue / Today / This week / Later / Done), Calendar layer. | P0 |
| A-12 | **Unexplained avatar placeholder** (top-right). If it's the assignee photo, show the name with it, otherwise remove it. | P2 |
| A-13 | **Lookup "☰" button and "1 - Administrator" ID-prefixed label** expose internal IDs. Show name + role, and search by name. | P2 |
| A-14 | **No recurrence** (weekly follow-up calls, monthly reconciliations). | P2 |

### Enhancements (ranked)

**Activity form (target fields)**
| Field | Notes |
|---|---|
| Type* | Icon chips (✉ Email · ☎ Call · 👥 Meeting · ☑ To-Do · ↻ Follow-up · custom). Choosing a type sets defaults |
| Summary* | One line, shown in lists and timeline |
| Related to | Multi-record picker: Customer, Supplier, Person, Sales Invoice, Quotation, Item… shown as chips |
| Assigned to* | User or team; defaults to me. "Assigned by" auto-recorded |
| Due* | Date (+ time and duration for Call/Meeting) with quick picks: Today · Tomorrow · Next week · In 3 days |
| Reminder | None / at due / 15 min / 1 day before |
| Priority | Default Normal |
| Notes | Rich text, @mentions, attachments |
| Repeat | Optional |

**Behaviour**
1. **Activity list as the default screen**, not a blank form. Saved views: *My open*, *Overdue*, *Today*, *Assigned by me*, *All team*. Columns: type icon, summary, related record chip, assignee, due (relative: "Overdue 2d" in danger color), priority.
2. **Kanban by due bucket**: Overdue · Today · This week · Later · Done. Drag between buckets to reschedule.
3. **On every business record**: an **"Schedule activity"** action and a **Planned activities** section in the History drawer, with overdue/today/planned color coding (Odoo's red/orange/green clock on list rows).
4. **Mark done** → optional feedback text → optional **"Schedule next"** (pre-filled from the type's chain).
5. **Snooze / reschedule** quick actions: +1 day, +1 week, pick date.
6. **Notifications**: assignee gets an in-app notification + optional mail on assignment and at the reminder time.
7. **Statistics moved** to the list header (counters as filter chips: *Overdue 4 · Today 2 · Upcoming 9 · Done this month 31*) and to For You. Clicking a counter filters the list.

---

## 4. Notes

### Current inventory (screenshots 6–7)
- Board: **New Note** button; three column headers **New / In Progress / Done** with "0 items" counts. Columns render as header boxes with no visible drop area.
- Note form: **Subject***, **Phase*** (▾), **Priority*** (▾), **From Date**, **To Date**, **Inactive** (checkbox), **Favorites** (checkbox), **Notes Tags** (multi lookup), **Description*** (textarea), **Upload** area.

### Findings

| # | Finding | Sev |
|---|---|---|
| N-1 | **Three required fields + Phase + Priority before a note exists.** A note should be capturable in one keystroke + one line. Benchmarks (Odoo To-Do, Trello, Notion) need only a title. | P0 |
| N-2 | **Empty columns have no drop zone / empty-state / quick add.** Headers look like buttons, and nothing invites "+ Add a note" per column. | P1 |
| N-3 | **Phase field duplicates the column**, and it's unclear whether phases are user-configurable. Boards need **custom columns** (add/rename/reorder/fold) per user. | P1 |
| N-4 | **From Date / To Date on a note** make it a task (X-3), and "From/To" is ambiguous for notes. Offer an optional **Due date** or "Convert to activity". | P1 |
| N-5 | **"Inactive" checkbox** is system jargon. Use **Archive** (with an Archived filter). "Favorites" should be a **Pin/★** toggle on the card, not a form checkbox. | P2 |
| N-6 | **No sharing / collaboration**: private vs shared with users/teams, no @mentions, no comments. | P1 |
| N-7 | **No record linking** (X-1): can't pin a note to a customer or invoice ("Customer prefers payment by cheque"). | P0 |
| N-8 | **Plain textarea**: no rich text, checklists (`[ ]` items with progress "2/5" on the card), links, or images inline. | P1 |
| N-9 | **No card anatomy defined**: the card should show title, first lines, tag chips, priority, due, checklist progress, attachment count, related-record chip, shared-with avatars. | P1 |
| N-10 | **No view toggle / search / filter**: Kanban ↔ List ↔ Grid (sticky-note style), filter by tag, priority, pinned, shared with me. | P1 |
| N-11 | **No card color** (common in note apps for quick visual grouping). | P2 |
| N-12 | **Board uses a separate full-page form** *(verify)* instead of an inline editor or side panel, which breaks flow when capturing many notes. | P1 |

### Enhancements (ranked)

1. **Quick capture**: "+ Add note" at the top of each column and a global shortcut (`n`). Only a title is required, Enter to save, Shift+Enter for body. Defaults: column = where you clicked, priority = Normal.
2. **Card → side panel editor** (keeps the board visible), autosave, rich text + checklists + attachments + tags + color + related records + share.
3. **Configurable columns per user** (default: To do · Doing · Done), fold Done, optional WIP count, drag to reorder columns and cards (keyboard alternative: "Move to…" menu, since drag isn't keyboard-accessible).
4. **Pinned** row/section at the top. **Archive** replaces Inactive.
5. **Views**: Kanban · List · Grid. Filters: Tag, Priority, Pinned, Shared with me, Linked to record.
6. **Share** with users/teams (view / edit). Shared notes show avatars on the card.
7. **Pin a note to a record**: it appears in that record's History drawer under a **Notes** tab and optionally as a banner on the record ("📌 Customer requires PO number on invoices"), which is very high ERP value.
8. **Convert to activity** (adds assignee + due, removes from board or keeps linked).

---

## 5. People Data

### Current inventory (screenshot 8)
- Record form with pager (empty position boxes in the header), **Number** (read-only, 2), **Name*** (greyed, appears computed), First Name*, Middle Name, Third Name, Surname, Date of Birth, Dealing Date, Gender, Social Status, Children Count, Title, Job Title, Company Name, Phone, Mobile No., E-Mail, Website, Fax, P.O. Box, Postal Code, Address, City, State, Country, Remarks, **Select Photo**.
- Several lookups carry an unlabeled **⋮** button next to the dropdown.

### Findings

| # | Finding | Sev |
|---|---|---|
| P-1 | **No conversion path**: the stated purpose ("can become a customer, user, etc.") has no **Convert to Customer / Supplier / Employee / User** action and no backlink once converted. Dynamics 365 *Qualify lead*, Odoo *Contact → Customer*, Salesforce *Convert Lead* are the benchmarks. | P0 |
| P-2 | **No duplicate detection** on name/mobile/email before saving. People data grows fast and duplicates poison later conversion. | P0 |
| P-3 | **Name is required but disabled** (computed from parts). The red asterisk on a field the user can't edit is confusing. Show it as a read-only preview "Full name: …" or drop the asterisk. | P1 |
| P-4 | **No bilingual name**: Arabic and English full names are both needed (invoices, letters, ID matching). Arabic naming order (first · father · grandfather · family) should map explicitly to "Middle/Third". | P1 |
| P-5 | **Single-value contact fields** (one Phone, one Mobile, one E-mail). Replace with **typed, repeatable contact methods** (Mobile / Work / Home / WhatsApp, Email work/personal) with a primary flag, plus E.164 phone input with a country code and email/URL validation. | P1 |
| P-6 | **Address order is reversed**: City → State → Country. The cascade must start at **Country → State/Governorate → City** so lookups can filter (the prototype already has a Geographical Structure screen to reuse). It also supports one address only, with no type (Home/Work/Billing). | P1 |
| P-7 | **Sensitive personal data without purpose**: Gender, Social Status, Children Count, Date of Birth. Under Egypt's Personal Data Protection Law (151/2020) and Saudi PDPL, collect only with a purpose: put these in a collapsed "Personal (optional)" section, restrict by role, and record consent. | P1 |
| P-8 | **No lifecycle / type / source / owner**: Lead · Prospect · Contact · Customer (converted), source (Exhibition, Referral, Website…), owner (sales rep), tags. Without them the list can't be worked as a pipeline. | P1 |
| P-9 | **Company Name is free text**: it should link to an organization/company record (or create one), so people at the same company group together. | P1 |
| P-10 | **No activity/notes/mail timeline** on the person (X-2), the main reason to keep people in the ERP rather than a spreadsheet. | P0 |
| P-11 | **Unlabeled ⋮ buttons** next to lookups (probably "add new value" / "open list"), which is the icon-only anti-pattern named in `PRODUCT.md`. Label them or use a "+ New…" option inside the dropdown. | P2 |
| P-12 | **"Dealing Date"** is unclear (first contact? relationship start?). Rename to "First contact date" or "Relationship since". | P2 |
| P-13 | **Flat 30-field two-column form** with legacy fields (Fax, P.O. Box) at equal weight. Group into sections and collapse rarely used ones. | P2 |
| P-14 | **Pager header shows empty position/total boxes** (screenshot), so record position isn't legible ("State always visible" principle). | P2 |
| P-15 | **No import/export** (Excel, vCard) or **scan business card** *(verify)*. | P2 |

### Enhancements (ranked)

**Form structure (target)**
```
┌ Header: photo · Full name (AR / EN) · Lifecycle badge [Lead ▾] · Owner · Tags
│         Actions: Convert to ▾ (Customer · Supplier · Employee · User) · Schedule activity · Send mail · ⋯
├ Tabs:  Overview | Contact | Addresses | Personal | Activity & Notes | Linked records
│ Overview   — first/middle/third/surname (AR + EN), title, job title, company (link), source, first contact
│ Contact    — repeatable phones/emails/websites (typed, primary ★), preferred channel, Fax/P.O. Box under "More"
│ Addresses  — repeatable, typed; Country → Governorate → City cascade; postal code
│ Personal   — DOB, gender, marital status, children (role-restricted, consent checkbox + date)
│ Activity   — unified timeline: activities, mail, notes, meetings
│ Linked     — Customer/Supplier/User records created from this person
```

1. **List view first** with saved views (My people, Leads, Unconverted, Duplicates suspected), columns (name, company, mobile, email, lifecycle, owner, last activity), bulk actions (assign owner, tag, merge, export).
2. **Duplicate check** inline while typing mobile/email/name ("Possible match: Ahmed Ali · 010… — Open / Merge / Ignore") plus a **Merge** tool.
3. **Convert to…** wizard: pick the target (Customer etc.), map fields, keep the person ↔ customer link, and carry over the timeline.
4. **Lifecycle badge + Kanban by lifecycle** (Lead → Qualified → Converted), which gives People Data a pipeline without needing a full CRM.
5. **Quick-add** dialog (name + mobile + email + company) for capture during calls, with the full form later.
6. Click-to-call / WhatsApp / mail actions next to contact values.

---

## 6. Shared UX standards for all five modules

| Area | Standard |
|---|---|
| **Form framework** | One form system (boxed label-left fields, blue accent) everywhere; drop the Material underline/pink styling in Calendar. Required = asterisk + `aria-required`; smart defaults so required ≠ friction |
| **Primary entry** | Each module opens on its **list/board/calendar**, never a blank record form. "New" opens a side panel or quick-create, not a page swap |
| **Related records** | One reusable **Record picker + entity chip** component (`Sales Invoice 126 · Posted`, `Customer · العميل الأول`), the same as the chip already used in the invoice History drawer |
| **Timeline** | One reusable **Timeline** component on every record: User log · Activities · Mail · Notes · Meetings, filterable by type |
| **Notifications** | Assignment, @mention, reminder, invite, RSVP → in-app notification panel + optional internal mail; per-user preferences |
| **Permissions** | Private / shared / team visibility on notes, calendars, activities; managers see their team's activities |
| **Keyboard** | Global: `c` create in context, `/` search, `j/k` move, `Enter` open, `Esc` close, `?` shortcut sheet; all reachable via ⌘K palette (see `concepts/erp-shell-market-notes.md`) |
| **Bilingual / RTL** | `dir="auto"` on user content; mirrored layouts; Hijri dates on Calendar; Arabic + English name fields; locale week start and weekend |
| **Empty states** | Each list/board/folder explains what goes there and offers the first action (pattern already used by `EMPTY()` in `activity.js`) |
| **Accessibility** | WCAG 2.1 AA (PRODUCT.md): listbox/grid semantics on mail list and calendar, keyboard alternative for every drag (Move to…, Reschedule…), visible focus, 4.5:1 contrast (check pink-on-white today marker) |
| **Mobile** | Single-pane list → detail; agenda as the default calendar view on small screens; quick-add FAB for notes/activities |

---

## 7. Suggested roadmap

| Phase | Theme | Items |
|---|---|---|
| **1 — Foundation** | Make the modules ERP-aware | X-1 Related-to picker + entity chip · X-2 record Timeline (extend History drawer) · A-1/A-2/A-11 Activity rework + list views · M-1/M-2/M-3 mail folders, drafts, actions · P-1/P-2 convert + duplicate check |
| **2 — Daily flow** | Speed for clerks/managers | X-5 For You "My day" (due activities, today's events, unread mail, pinned notes) · Calendar sidebar + attendees + quick-create (C-1, C-2, C-6) · Notes quick capture + side panel (N-1, N-12) · reminders/notifications (X-6) |
| **3 — Consistency** | One system | X-3 rationalize Activity / Event / Note · X-4 unify form framework and accent · bilingual names, Hijri, week start · accessibility pass |
| **4 — Power** | Delight & scale | Mail threading, undo/schedule send, templates · recurrence rules · find-a-time / resources · activity chaining · people lifecycle kanban · iCal / Outlook / Google sync · import/merge tools |

---

## 8. Open questions for product

1. Are Calendar "Calendar Type" and "Calendar Tags" admin-defined lookups? Who manages them?
2. Is Internal Mail strictly internal (users only), or should it send to People/customer emails via SMTP? This changes the recipient picker and compliance requirements.
3. Should Notes stay strictly personal (current impression) or become team-shareable boards?
4. Which records must support "Related to" in phase 1? (Suggest: Customer, Supplier, Person, Sales Invoice, Quotation, Purchase Invoice.)
5. Does People Data feed HR (Employee) as well as Sales (Customer)? If yes, the Personal section needs HR-grade permissions.
6. Is there an approval/workflow tie-in (e.g. "Doc Approval Define" generating activities for approvers)? That would make activities the ERP's universal to-do inbox, which is how SAP Fiori *My Inbox* works.
