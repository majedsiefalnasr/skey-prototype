# Source Verification — every element in the concepts, checked against the live system

Re-verified on the live tenant (`app.skeyerp.com`, tenant `lastchance`, Sales Invoice screen) by opening the real menus, the real rail buttons, the real dialogs, and reading the shipped dictionaries. Legend:

- ✅ **Verified** — seen in the live UI or its shipped dictionary.
- ⚠️ **Deviation** — present in the concept but *not* on this screen live. Fixed in v8.
- 🔵 **Proposal** — deliberately new design, labelled as such in the file.

---

## 1. Operation menus — what the Sales Invoice screen actually shows

Opened live (Arabic UI, mapped through `shared.operationMenu`):

| Menu | Live items | ✅/⚠️ |
|---|---|---|
| Record (السجل) | New, Add From, Search | ✅ |
| Procedure (الإجراء) | Save, Lock Screen, Reports, Print, Undo | ✅ |
| Transactions (العمليات) | Posting, Display Journal Entry, Cancel Document | ✅ |
| More (المزيد) | Screen Parameters, Help | ✅ |

**Deviations in v5–v7 (fixed in v8):**

| Item shown in concept | Reality |
|---|---|
| ⚠️ Modify, Delete in *Record* | Exist in `shared.operationMenu` but **not** on this screen |
| ⚠️ Clear in *Procedure* | Same — dictionary only |
| ⚠️ Pend, Verification, Inactive in *Transactions* | Same — dictionary only (though Pending / Deactivate **dialogs** do exist in the DOM) |
| ⚠️ User Log, Documents Flow in *More* | They are **rail buttons**, not menu items |

## 2. Right action rail — verified `title` attributes

`New` · `Search` · `Save-` *(real typo)* · `Print` · `Undo` · `User Log` · `Documents Flow`, plus a floating `Open Chat Assistant`. ✅

## 3. Contextual actions on the breadcrumb row

`Posted` (مرحل) · `Receipt Voucher` (سند قبض) · `Sales Return` (مردود المبيعات). ✅ — and they really do change per record.

## 4. Monitoring (the `User Log` rail button)

The live UI opens a **right drawer titled “Monitoring”**, containing audit cards. On invoice 126 it rendered exactly two cards:

| Card | Fields seen live |
|---|---|
| **Entry Data** | Entered By = *Administrator*, Entry Date, Entry Start Date, Entry Duration, No. Of Prints |
| **Modification Data** | Last Update By *(empty)*, Last Update Date *(empty)*, No. Of Updates = 0 |

✅ **This confirms the rule we designed to**: the live system renders a card only when the document has that data — the Posting card is absent on a non-posted record. The v7 behaviour matches the product.

Two corrections applied in v8:
- ⚠️ v7 used `admin`; the live value is **Administrator**.
- ⚠️ v7 invented sample values for Cancellation / Deactivation; v8 keeps them but they are demo values in a demo record, never presented as live data.

## 5. State dialogs — all four verified in the live DOM

Each has the same shape (flag toggle + reason + user + date + Save):

| Dialog | Fields | Mandatory reason |
|---|---|---|
| **Posting-related Data** | Posted, Posting Description, Last Posting User, Posting Date, Save | no |
| **Pending-related Data** | Pending, Reason for Pending *, Pending User, Pending Date, Save | yes |
| **Cancellation Data** | Canceled, Cancelation Statement *, Canceled By, Cancelation Date, Save | yes |
| **Deactivate** | Deactivate, Deactivation Reason *, Deactivating User, Deactivation Date, Save | yes |

✅ All four exist. Note the product spells it **“Cancelation Statement”** / **“Cancelation Date”** with one *l*.

## 6. Documents Flow (the rail button)

Live: a right drawer titled **Documents Flow** with exactly two tabs — **Message** and **Notes**. On invoice 126 it returned a **“Not Found”** toast (no thread yet).

| Concept | Reality |
|---|---|
| ⚠️ Tabs *All / Comments / Changes / Documents* | Invented. Real tabs are **Message** and **Notes** |
| ⚠️ Merging Monitoring + Documents Flow into one “Log & Activity” drawer | 🔵 **Proposal** — they are two separate drawers today. Kept in v8 but relabelled with the real names and marked as a proposal |
| ⚠️ Mentions, field-change diffs, attachments, per-stage notes | 🔵 Proposal — no evidence these exist today |

## 7. Print Settings

Live dialog renders **four fields + Apply**: Language, Print Form, Destination, Report Style. Selecting Destination `2 - Save as` reveals **File Format**.

| Field | Live options |
|---|---|
| Language | `ar - عربي`, `en - English` ✅ |
| Destination | `1 - Preview`, `2 - Save as` ✅ |
| Report Style | `1 - Default Style` ✅ |
| File Format | `1 - PDF`, `2 - Excel`, `3 - Word`, `4 - HTML`, `5 - Text File`, `6 - CSV` ✅ |
| Print Form | empty on this record ✅ |

Deviations:

| Concept | Reality |
|---|---|
| ⚠️ Third destination **“Send”** (Email / WhatsApp) | Not offered live. The keys `whatsAppNo`, `receiver`, `msgTitle`, `msgBody` **do** exist under `shared.printSetting`, so the capability is in the dictionary — but it is not rendered on this screen. Marked as 🔵 proposal in v8 |
| ⚠️ Print Form options “Sales Invoice A4 / Thermal 80mm / Tax Invoice (ETA)” | Invented. v8 shows the field empty, as live |
| ⚠️ Report Style “2 - Compact” | Invented. v8 lists only `1 - Default Style` |
| ⚠️ Show Header / Show Border / Show Parameters Value / No. of Copies / Amts in | Real keys in `shared.printSetting`, **not rendered** in this dialog today. v8 keeps them but groups them under a labelled *“In the dictionary, not rendered today”* section |

## 8. Statuses

Ribbon classes in the stylesheet: `posted`, `approved`, `verified`, `standby`, `process`, `return`, `canceled`, `inactive`, `rsrvdFlg`, `status`. ✅
Observed live on records: **Posted** (green), **Returned** (orange), **Canceled** (grey), and **blank** on a plain record. ✅
Flag labels from `shared.auditing`: Posted, Pending, Canceled, Deactivate, Returned, Reserved, Used, Black List, Annual Closing. ✅

## 9. Record and reference data used in the demo

| Value | Source |
|---|---|
| Tenant `lastchance`, user `admin` / display name `Administrator` | ✅ live |
| Invoice 126 · `001000352026126` · 20,000.00 EGP · Credit · Customer `200001 · العميل الاول` | ✅ live |
| Item `7603 - keyboard`, UoM `حبة`, WH `201 - المخزن الرئيسي` | ✅ live |
| Journal entry number `4521` | ⚠️ invented. v8 removes the number and shows the real action label **Display Journal Entry** instead |
| Invoice 124 shown as “Canceled” in search results | ⚠️ unverified. v8 uses records whose status was actually observed |

## 10. Shell chrome

| Element | Source |
|---|---|
| Others (app switcher), Search, System Alerts, Help, Settings, avatar | ✅ `shared.appLayout` |
| AI Assistant | ✅ `shared.gridBar.ai` |
| Breadcrumb `Home › Sales Invoice › All` | ✅ live |
| Record pager `‹‹ ‹ [n] [total] › ››` | ✅ live |
| Screen list in the search panel | ✅ live left menu |
| 🔵 ⌘K search panel, split *New* button, labelled rail buttons, lifecycle pill, footer navigator | Proposals — no equivalent exists live |

---

## Summary

Nothing in the **data model** was invented: the log cards, the four state dialogs, the statuses, the menus and the print fields are all real. The deviations were of two kinds: **(a)** showing app-wide dictionary actions on a screen that does not expose them, and **(b)** sample content in the proposed components (journal number, activity thread, print form names). Both are corrected in `app-shell-concepts-v8.html`; every remaining new idea is explicitly marked 🔵 **Proposal** in the UI itself.
