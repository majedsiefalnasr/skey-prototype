# Skey ERP — Verified Action & Status Inventory

Everything below was read from the running system: menus opened live on the Sales Invoice screen, `title` attributes on shell controls, CSS status classes, and the shipped i18n dictionaries (`/assets/i18n/en.json` for the shared shell, `:31013/assets/i18n/en.json` for the Sales module). **No invented labels.** This file is the source of truth for the concept files — anything not listed here must not appear in a mockup.

## 1. Shell operation menus — `shared.operationMenu`

The full app-wide vocabulary. Any screen composes its menus from this list; the Sales Invoice screen currently shows only a subset (marked ✓ = seen live on Sales Invoice).

| Key | English label | Menu | Seen on Sales Invoice |
|---|---|---|---|
| `record` | **Record** | (menu title) | ✓ |
| `new` | New | Record | ✓ |
| `duplicate` | Add From | Record | ✓ |
| `upd` | Modify | Record | — |
| `del` | Delete | Record | — |
| `search` | Search | Record | ✓ |
| `procedure` | **Procedure** | (menu title) | ✓ |
| `save` | Save | Procedure | ✓ (disabled until dirty) |
| `undo` | Undo | Procedure | ✓ (disabled until dirty) |
| `clear` | Clear | Procedure | — |
| `print` | Print | Procedure | ✓ |
| `scrReport` | Reports | Procedure | ✓ |
| `lock` | Lock Screen | Procedure | ✓ |
| `unlock` | Unlock | Procedure | — |
| `process` | **Transactions** | (menu title) | ✓ |
| `stndBy` | Pend | Transactions | — |
| `verify` | Verification | Transactions | — |
| `post` | Posting | Transactions | ✓ |
| `showJournal` | Display Journal Entry | Transactions | ✓ |
| `inactive` | Inactive | Transactions | — |
| `cancelTrns` | Cancel Document | Transactions | ✓ |
| `more` | **More** | (menu title) | ✓ |
| `prmtrScr` | Screen Parameters | More | ✓ |
| `help` | Help | More | ✓ |
| `usrLog` | User Log | More / rail | ✓ (rail) |

**Note:** there is no "Approve" action in this system. The equivalent is **Verification** (`verify`). There is no "Edit" — it is **Modify** (`upd`).

## 2. Right action rail — verified `title` attributes

| Order | Title (verbatim) | State observed |
|---|---|---|
| 1 | `New` | always enabled |
| 2 | `Search` | always enabled |
| 3 | `Save-` | disabled until dirty *(trailing hyphen is a real typo in the product)* |
| 4 | `Print` | always enabled |
| 5 | `Undo` | disabled until dirty |
| 6 | `User Log` | always enabled |
| 7 | `Documents Flow` | always enabled |

Plus a floating `Open Chat Assistant` button (bottom-right, outside the rail).

## 3. Contextual actions on the breadcrumb bar

| Control | Source of label | Behavior verified |
|---|---|---|
| `Posted` (file-export icon) | `shared.auditing.pstFlg` | Opens the **Posting-related Data** dialog (`crdPstNm`) |
| `Receipt Voucher` | `salesinvoice.salBillMst.btnRcptVchrScr` | Appears on some invoices only (seen on doc #126, credit); related flag `vchrRcptFlg` = *Used In Receipt Voucher* |
| `Sales Return` | `salesinvoice.salBillMst.btnSalRtrn` | Appears on active invoices; hidden on Canceled ones; related flag `rtrnFlg` = *Used in Sales Returns* |

Record pager (‹‹ ‹ [n] [total] › ››) sits to their right. No labels or tooltips exist on it today.

## 4. Document status — the real model

**This system has no linear stage machine.** Status is a set of independent audit flags, each with its own data card in `shared.auditing`:

| Flag | Status label | Data card | Fields on the card |
|---|---|---|---|
| `crt` | (entry) | **Entry Data** | Entered By, Entry Date, Entry Start Date, Entry Duration, Device Used, No. of Prints |
| `upd` | (modified) | **Modification Data** | Last Update By, Last Update Date, No. of Updates, Device Used For Update |
| `pstFlg` | **Posted** | **Posting-related Data** | Posted (toggle), Posting Description, Last Posting User, Posting Date |
| `stndbyFlg` | **Pending** | **Pending-related Data** | Pending, Pending User, Pending Date, Reason for Pending |
| `cnclFlg` | **Canceled** | **Cancellation Data** | Canceled By, Cancelation Date, Cancelation Statement |
| `inactvFlg` | **Deactivate** | **Deactivation Data** | Deactivating User, Deactivation Date, Deactivation Reason, No. of Deactivation |
| `ysClsFlg` | **Annual Closing** | **Annual Closing** | Closed By, Closing Date, Count, User who undo Close, Undo Closing Date |
| `rtrnFlg` | **Returned** | — | (indicator only) |
| `rsrvdFlg` | **Reserved** | — | (indicator only) |
| `prcssdTyp` | **Used** | — | (indicator only) |
| `blkLstFlg` | **Black List** | — | (indicator only) |

The umbrella label for this whole area is `auditingNm` = **Monitoring**.

### Status ribbon variants present in the stylesheet
`posted`, `approved`, `verified`, `standby`, `process`, `return`, `canceled`, `inactive`, `rsrvdFlg`, `status`.

### Observed live on records
`Posted` (green), `Returned` (orange), `Canceled` (gray/inactive), and **blank** — a normal unposted invoice renders an empty ribbon element with no label, which is the audit's P1-3 finding.

## 5. Other real shell vocabulary worth reusing

- `shared.docFlow`: **Documents Flow** — Notes, Status, Message, Filter, Send, Followers.
- `shared.gridBar` (list screens): Add, Display, Modify, Delete, Auditing, Adaptive, Print, PDF, Excel, CSV, Word, Chart, AI Assistant, Save Columns, Default Columns, Recycle Bin, Import, Export, Transactions, Reports.
- `shared.appLayout` (global top bar): Home, Profile, Edit Profile, Inbox, Settings, Logout, Direct Manager, Operation Unit, System Alerts, Mark all as read, Search, Dashboard, Favorite Screens, Recent Screens, Internal Mail, Schedule Activity, Calendar, Add to Favorites, More.
- `shared.common`: Save, Close, Delete, Cancel, Confirm, Restore, Display, Import, Show Details, Sync.

## 6. Corrections applied to earlier concept files (v1–v3)

| Invented in v1–v3 | Real equivalent |
|---|---|
| Approve | **Verification** |
| Edit | **Modify** |
| View Journal Entry | **Display Journal Entry** |
| Draft → Approved → Posted → Paid → Locked (linear stages) | Independent flags: Posted / Pending / Canceled / Returned / Deactivate / Annual Closing / Reserved / Used |
| "Posting Data" button | **Posted** (opens *Posting-related Data*) |
| Lifecycle "stage 3 of 5" | No such concept; use the flag set + audit cards |
| Open log & activity | **User Log** and **Documents Flow** (two separate real actions) |
