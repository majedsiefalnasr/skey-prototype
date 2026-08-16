# Document Lifecycle — Backend Proposal

Companion to `app-shell-concepts-v6.html`. Two modes are demonstrated there:

- **Mode A — Derived (ships today, zero backend change).** Builds a timeline purely from audit fields that already exist.
- **Mode B — Proposed (needs backend).** A real stage engine that records *who was asked, what they decided, why, and how long it took*.

---

## 1. What the system already stores

Verified from the shipped dictionary (`shared.auditing`) and live records.

| Data | Fields | Usable for a timeline? |
|---|---|---|
| Entry | `crtUsrNm`, `crtDate`, `crtDateClk`, `crtDurTm`, `crtTrmnlNm`, `prntCnt` | Yes — first event, with a real duration |
| Modification | `updUsrNm`, `updDate`, `updCnt`, `updTrmnlNm` | Partly — only the **last** update is kept, not each one |
| Posting | `pstFlg`, `pstUsrNm`, `pstDate`, `pstDsc` | Yes — one event with actor, time, description |
| Pending | `stndbyFlg`, `stndbyUsrNm`, `stndbyDate`, `stndbyDsc` | Yes — includes a reason field |
| Cancellation | `cnclFlg`, `cnclUsrNm`, `cnclDate`, `cnclDsc` | Yes — includes a statement field |
| Deactivation | `inactvFlg`, `inactvUsrNm`, `inactvDate`, `inactvDsc`, `inactvCnt` | Yes |
| Annual closing | `ysClsFlg`, `ysClsUsrNm`, `ysClsDate`, `ysClsCnt`, `ysUnclsUsrNm`, `ysUnclsDate` | Yes |
| Indicator flags | `rtrnFlg`, `rsrvdFlg`, `prcssdTyp`, `blkLstFlg` | Flag only — **no actor, no date** |
| Documents Flow | Notes, Status, Message, Followers | Yes — a discussion thread already exists |

**Conclusion:** a credible derived timeline is possible today with 5–7 events. It is a *state snapshot list*, not a process history.

---

## 2. What the derived mode cannot show

These are the gaps that justify the backend work. Each one is a question a manager actually asks:

| Question | Why it can't be answered today |
|---|---|
| "Who was this waiting on?" | No stage ownership/assignment is stored |
| "Why was it sent back?" | `rtrnFlg` is a boolean — no reason, no actor, no date |
| "How long did approval take?" | Only entry duration (`crtDurTm`) exists; no per-stage timing |
| "How many times did it bounce?" | Only `updCnt` (edit count), which is not the same thing |
| "Who approved it, and did they leave a note?" | **Verification** has no audit card at all — no `vrfyUsrNm` / `vrfyDate` / `vrfyDsc` |
| "Was it late?" | No due date or SLA per stage |
| "What did it look like before the change?" | `upd*` keeps only the last update; no field-level history |

Note the biggest single gap: **Verification (`verify`) is a real action in the operation menu but has no auditing card**, while Posting, Pending, Cancellation, Deactivation all have one. Adding `crdVrfyNm` alone would materially improve the derived mode.

---

## 3. Proposed backend additions

### 3.1 Minimum viable (unblocks ~80% of the value)

Add a **Verification audit card**, mirroring the existing card pattern exactly:

```
vrfyFlg      boolean     Verified
vrfyUsrNm    string      Verifying User
vrfyDate     datetime    Verification Date
vrfyDsc      string      Verification Note
```

And a **return/reject record** for the existing `rtrnFlg`:

```
rtrnUsrNm    string      Returned By
rtrnDate     datetime    Return Date
rtrnDsc      string      Return Reason
rtrnCnt      int         No. of Returns
```

This alone turns the derived timeline into a real approval history, and follows conventions already in the codebase (`cnclUsrNm` / `cnclDate` / `cnclDsc` / `inactvCnt`).

### 3.2 Full stage engine (recommended target)

Two tables, configurable per document type, so the shell stays app-wide.

**`doc_stage_def`** — the stage catalog (configured, not hardcoded):

| Column | Type | Notes |
|---|---|---|
| `doc_typ_no` | int | Sales Invoice, Purchase Order, … |
| `stage_no` | int | 1..n, display order |
| `stage_key` | string | `draft`, `verify`, `approve`, `post`, `settle` |
| `stage_nm_ar` / `stage_nm_en` | string | Label, translated like every other entity |
| `owner_role_no` | int | Which role is responsible |
| `sla_hours` | int | Optional, drives the "late" indicator |
| `is_terminal` | bool | Marks the closing stage |

**`doc_stage_log`** — one row per transition (append-only):

| Column | Type | Notes |
|---|---|---|
| `doc_srl` | string | Document sequence |
| `stage_no` | int | FK to `doc_stage_def` |
| `action` | enum | `enter`, `approve`, `return`, `skip`, `cancel` |
| `usr_no` / `usr_nm` | int/string | Who acted |
| `act_date` | datetime | When |
| `dur_sec` | int | Time spent in that stage |
| `dsc` | string | Decision note / return reason |
| `ref_doc_typ` / `ref_doc_srl` | string | Generated document (e.g. Journal Entry 4521) |

**Read endpoint** the UI needs:

```
GET /doc/{docTypNo}/{docSrl}/stages
→ {
    currentStageNo: 4,
    stages: [
      { stageNo:1, key:'draft',  label:'Draft creation',
        state:'done', owner:'Data entry · Sales team',
        action:'enter',  usrNm:'admin', actDate:'2026-02-22T08:25:32', durSec:5952 },
      { stageNo:2, key:'verify', label:'Financial review',
        state:'returned', returnCount:1, owner:'Financial manager',
        action:'return', usrNm:'fin.mgr', actDate:'2026-02-22T09:12:40',
        durSec:495, dsc:'Unit price does not match the approved February price list.' },
      …
      { stageNo:5, key:'settle', label:'Settlement',
        state:'pending', owner:'Accounts team',
        dueDate:'2026-03-08', remainingAmt:2000.00 }
    ]
  }
```

The activity trail reuses the existing **Documents Flow** thread; each note gains an optional `stage_no` so notes attach to the stage they belong to (this is what the composer at the bottom of the drawer writes).

### 3.3 Field-level change history (optional, phase 3)

Replace "last update only" with an append-only `doc_fld_log` (`fld_nm`, `old_val`, `new_val`, `usr_nm`, `chg_date`). This powers the "Changes" filter in the activity trail. Lowest priority — the approval history matters more to the business than field diffs.

---

## 4. Phasing

| Phase | Backend cost | What the user gets |
|---|---|---|
| **1 — Derived** | None | Timeline of Entry → Modification → Pending → Posted → Canceled from existing fields, plus the Documents Flow thread. Ships with the redesign. |
| **2 — Verification + Return cards** | Small (8 columns, same pattern as existing cards) | Real approval history: who verified, who returned it and why, how many times |
| **3 — Stage engine** | Medium (2 tables + 1 endpoint + config screen) | Configurable stages per document type, owners, durations, SLA/late flags, generated-document links |
| **4 — Field history** | Medium | Full "Changes" filter in the activity trail |

The UI is built so that **phase 1 and phase 3 render through the same component**. Nothing is thrown away; the derived adapter is simply replaced by the endpoint when it exists.

---

## 5. Honesty rules applied in the demo

In Derived mode the demo marks every non-stored value explicitly:

- Fields the system does not keep are shown as **"Not recorded"** rather than being invented.
- Each derived stage carries a small **`derived`** tag so no one presents it as audited process data.
- The stage names in derived mode are the audit card names themselves (Entry Data, Modification Data, Pending, Posted, Canceled) — not an invented business workflow.
