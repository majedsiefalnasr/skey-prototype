# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: data-list-component.spec.mjs >> toolbar data-menus dismiss with Escape and outside click
- Location: tests/data-list-component.spec.mjs:370:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('.list-view .data-list-toolbar input[type="search"]')
    - locator resolved to <input value="" type="search" data-list-search="" aria-label="Search invoices" placeholder="Search invoices" class="w-[clamp(160px,18vw,260px)] min-h-[32px] rounded-md border border-line bg-surface py-[5px] ps-[30px] pe-7 font-[inherit] text-[12.5px] text-ink focus:border-[var(--accent)] focus:outline focus:outline-2 focus:outline-[var(--accent-soft)] max-[900px]:w-full"/>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <input checked type="checkbox" data-list-column="pay"/> from <details open="" class="data-menu end relative [.rfoot_&]:ms-auto! [.rfoot_&]:flex [.rfoot_&]:gap-2 [.jbar_&]:ms-auto! [.guard_.gf_&]:ms-auto! [.guard_.gf_&]:flex [.guard_.gf_&]:flex-wrap [.guard_.gf_&]:justify-end [.guard_.gf_&]:gap-2.5 [.d2_.crow_&]:ms-auto! [.d2_.crow_&]:flex [.d2_.crow_&]:items-center [.d2_.crow_&]:gap-2 [.d3_.fbar_&]:ms-auto! [.d3_.fbar_&]:flex [.d3_.fbar_&]:gap-2 [.d4_.top_&]:ms-auto! [.d4_.top_&]:flex [.d4_.top_&]:items-center [.d4_.top_&]:gap-2 [.customer-record-footer_&]:ms-au…>…</details> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <input checked type="checkbox" data-list-column="pay"/> from <details open="" class="data-menu end relative [.rfoot_&]:ms-auto! [.rfoot_&]:flex [.rfoot_&]:gap-2 [.jbar_&]:ms-auto! [.guard_.gf_&]:ms-auto! [.guard_.gf_&]:flex [.guard_.gf_&]:flex-wrap [.guard_.gf_&]:justify-end [.guard_.gf_&]:gap-2.5 [.d2_.crow_&]:ms-auto! [.d2_.crow_&]:flex [.d2_.crow_&]:items-center [.d2_.crow_&]:gap-2 [.d3_.fbar_&]:ms-auto! [.d3_.fbar_&]:flex [.d3_.fbar_&]:gap-2 [.d4_.top_&]:ms-auto! [.d4_.top_&]:flex [.d4_.top_&]:items-center [.d4_.top_&]:gap-2 [.customer-record-footer_&]:ms-au…>…</details> subtree intercepts pointer events
  2 × retrying click action
      - waiting 100ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <label>…</label> from <details open="" class="data-menu end relative [.rfoot_&]:ms-auto! [.rfoot_&]:flex [.rfoot_&]:gap-2 [.jbar_&]:ms-auto! [.guard_.gf_&]:ms-auto! [.guard_.gf_&]:flex [.guard_.gf_&]:flex-wrap [.guard_.gf_&]:justify-end [.guard_.gf_&]:gap-2.5 [.d2_.crow_&]:ms-auto! [.d2_.crow_&]:flex [.d2_.crow_&]:items-center [.d2_.crow_&]:gap-2 [.d3_.fbar_&]:ms-auto! [.d3_.fbar_&]:flex [.d3_.fbar_&]:gap-2 [.d4_.top_&]:ms-auto! [.d4_.top_&]:flex [.d4_.top_&]:items-center [.d4_.top_&]:gap-2 [.customer-record-footer_&]:ms-au…>…</details> subtree intercepts pointer events
  13 × retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <input checked type="checkbox" data-list-column="pay"/> from <details open="" class="data-menu end relative [.rfoot_&]:ms-auto! [.rfoot_&]:flex [.rfoot_&]:gap-2 [.jbar_&]:ms-auto! [.guard_.gf_&]:ms-auto! [.guard_.gf_&]:flex [.guard_.gf_&]:flex-wrap [.guard_.gf_&]:justify-end [.guard_.gf_&]:gap-2.5 [.d2_.crow_&]:ms-auto! [.d2_.crow_&]:flex [.d2_.crow_&]:items-center [.d2_.crow_&]:gap-2 [.d3_.fbar_&]:ms-auto! [.d3_.fbar_&]:flex [.d3_.fbar_&]:gap-2 [.d4_.top_&]:ms-auto! [.d4_.top_&]:flex [.d4_.top_&]:items-center [.d4_.top_&]:gap-2 [.customer-record-footer_&]:ms-au…>…</details> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <input checked type="checkbox" data-list-column="pay"/> from <details open="" class="data-menu end relative [.rfoot_&]:ms-auto! [.rfoot_&]:flex [.rfoot_&]:gap-2 [.jbar_&]:ms-auto! [.guard_.gf_&]:ms-auto! [.guard_.gf_&]:flex [.guard_.gf_&]:flex-wrap [.guard_.gf_&]:justify-end [.guard_.gf_&]:gap-2.5 [.d2_.crow_&]:ms-auto! [.d2_.crow_&]:flex [.d2_.crow_&]:items-center [.d2_.crow_&]:gap-2 [.d3_.fbar_&]:ms-auto! [.d3_.fbar_&]:flex [.d3_.fbar_&]:gap-2 [.d4_.top_&]:ms-auto! [.d4_.top_&]:flex [.d4_.top_&]:items-center [.d4_.top_&]:gap-2 [.customer-record-footer_&]:ms-au…>…</details> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <label>…</label> from <details open="" class="data-menu end relative [.rfoot_&]:ms-auto! [.rfoot_&]:flex [.rfoot_&]:gap-2 [.jbar_&]:ms-auto! [.guard_.gf_&]:ms-auto! [.guard_.gf_&]:flex [.guard_.gf_&]:flex-wrap [.guard_.gf_&]:justify-end [.guard_.gf_&]:gap-2.5 [.d2_.crow_&]:ms-auto! [.d2_.crow_&]:flex [.d2_.crow_&]:items-center [.d2_.crow_&]:gap-2 [.d3_.fbar_&]:ms-auto! [.d3_.fbar_&]:flex [.d3_.fbar_&]:gap-2 [.d4_.top_&]:ms-auto! [.d4_.top_&]:flex [.d4_.top_&]:items-center [.d4_.top_&]:gap-2 [.customer-record-footer_&]:ms-au…>…</details> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <label>…</label> from <details open="" class="data-menu end relative [.rfoot_&]:ms-auto! [.rfoot_&]:flex [.rfoot_&]:gap-2 [.jbar_&]:ms-auto! [.guard_.gf_&]:ms-auto! [.guard_.gf_&]:flex [.guard_.gf_&]:flex-wrap [.guard_.gf_&]:justify-end [.guard_.gf_&]:gap-2.5 [.d2_.crow_&]:ms-auto! [.d2_.crow_&]:flex [.d2_.crow_&]:items-center [.d2_.crow_&]:gap-2 [.d3_.fbar_&]:ms-auto! [.d3_.fbar_&]:flex [.d3_.fbar_&]:gap-2 [.d4_.top_&]:ms-auto! [.d4_.top_&]:flex [.d4_.top_&]:items-center [.d4_.top_&]:gap-2 [.customer-record-footer_&]:ms-au…>…</details> subtree intercepts pointer events
  - retrying click action
    - waiting 500ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <input checked type="checkbox" data-list-column="pay"/> from <details open="" class="data-menu end relative [.rfoot_&]:ms-auto! [.rfoot_&]:flex [.rfoot_&]:gap-2 [.jbar_&]:ms-auto! [.guard_.gf_&]:ms-auto! [.guard_.gf_&]:flex [.guard_.gf_&]:flex-wrap [.guard_.gf_&]:justify-end [.guard_.gf_&]:gap-2.5 [.d2_.crow_&]:ms-auto! [.d2_.crow_&]:flex [.d2_.crow_&]:items-center [.d2_.crow_&]:gap-2 [.d3_.fbar_&]:ms-auto! [.d3_.fbar_&]:flex [.d3_.fbar_&]:gap-2 [.d4_.top_&]:ms-auto! [.d4_.top_&]:flex [.d4_.top_&]:items-center [.d4_.top_&]:gap-2 [.customer-record-footer_&]:ms-au…>…</details> subtree intercepts pointer events
  - retrying click action
    - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - link "Skip to main content" [ref=e2] [cursor=pointer]:
    - /url: "#app-main"
  - generic [ref=e5]:
    - generic [ref=e6]:
      - generic [ref=e7]:
        - button "Switch app" [ref=e9] [cursor=pointer]
        - button "Expand sidebar" [pressed] [ref=e12] [cursor=pointer]
        - button "lastchance, fiscal year 2026" [ref=e15] [cursor=pointer]:
          - generic [ref=e18]: lastchance
          - generic [ref=e19]: "2026"
          - generic: lastchance
      - button "Search or run an action" [ref=e22] [cursor=pointer]:
        - generic [ref=e26]: ⌘K
      - generic [ref=e27]:
        - button "AI Assistant" [ref=e28] [cursor=pointer]
        - button "System Alerts" [ref=e32] [cursor=pointer]:
          - generic [ref=e35]: "4"
          - generic: Alerts
        - button "Help" [ref=e37] [cursor=pointer]
        - button [ref=e41] [cursor=pointer]
    - generic [ref=e45]:
      - navigation "Primary navigation" [ref=e46]:
        - generic [ref=e48]:
          - generic [ref=e49]:
            - button "For You" [ref=e50] [cursor=pointer]
            - button "Starred" [ref=e54] [cursor=pointer]
            - button "Recent" [ref=e57] [cursor=pointer]
          - generic [ref=e61]:
            - button "Dashboard" [ref=e62] [cursor=pointer]
            - button "Customers" [ref=e65] [cursor=pointer]
            - button "Vendors" [ref=e68] [cursor=pointer]
            - button "Inventory Systems Management" [ref=e71] [cursor=pointer]
            - button "Sales Systems Management" [ref=e74] [cursor=pointer]
            - button "Purchase Systems Management" [ref=e77] [cursor=pointer]
            - button "POS System Management" [ref=e80] [cursor=pointer]
            - button "Finance and Accounting" [ref=e83] [cursor=pointer]
            - button "Human Capital Management" [ref=e86] [cursor=pointer]
            - button "Fixed Assests System" [ref=e89] [cursor=pointer]
            - button "Manufacturing Resource Planning" [ref=e92] [cursor=pointer]
            - button "Real Estate Management System" [ref=e95] [cursor=pointer]
            - button "Maintenance Workshop System" [ref=e98] [cursor=pointer]
            - button "Customer Relations Management" [ref=e101] [cursor=pointer]
            - button "Hospital Management" [ref=e104] [cursor=pointer]
            - button "Car rent system" [ref=e107] [cursor=pointer]
            - button "Reports" [ref=e110] [cursor=pointer]
            - button "System Administration" [ref=e113] [cursor=pointer]
            - button "System Setup" [ref=e116] [cursor=pointer]
            - button "Help Screens" [ref=e119] [cursor=pointer]
          - button "Account" [ref=e124] [cursor=pointer]
        - button "Expand sidebar" [ref=e127]
      - main [ref=e128]:
        - generic [ref=e130]:
          - generic [ref=e131]:
            - generic [ref=e132]:
              - navigation "Breadcrumb" [ref=e133]:
                - link "Home" [ref=e134] [cursor=pointer]:
                  - /url: "#"
                - generic [aria-hidden] [ref=e135]: ›
                - generic [ref=e136]: Sales Invoice
              - heading "Sales Invoice" [level=1] [ref=e138]
            - generic [ref=e139]:
              - group [ref=e140]:
                - generic "Manage" [ref=e141] [cursor=pointer]
              - button "Add" [ref=e147] [cursor=pointer]
          - generic [ref=e151]:
            - toolbar "invoices table controls" [ref=e153]:
              - generic [ref=e154]:
                - group [ref=e155]:
                  - generic "All invoices" [ref=e156] [cursor=pointer]
                - group [ref=e162]:
                  - generic "Filter" [ref=e163] [cursor=pointer]
              - generic [ref=e167]:
                - searchbox "Search invoices" [ref=e169]
                - group [ref=e170]:
                  - generic "More actions" [ref=e171] [cursor=pointer]
                - group [ref=e174]:
                  - generic "Columns" [active] [ref=e175] [cursor=pointer]
                  - group "Visible columns" [ref=e181]:
                    - generic [ref=e182] [cursor=pointer]:
                      - checkbox "Doc. Sequence" [checked] [ref=e183]
                      - generic [ref=e184]: Doc. Sequence
                    - generic [ref=e185] [cursor=pointer]:
                      - checkbox "Doc No." [checked] [ref=e186]
                      - generic [ref=e187]: Doc No.
                    - generic [ref=e188] [cursor=pointer]:
                      - checkbox "Invoice Status" [checked] [ref=e189]
                      - generic [ref=e190]: Invoice Status
                    - generic [ref=e191] [cursor=pointer]:
                      - checkbox "Doc Date" [checked] [ref=e192]
                      - generic [ref=e193]: Doc Date
                    - generic [ref=e194] [cursor=pointer]:
                      - checkbox "Due Date" [checked] [ref=e195]
                      - generic [ref=e196]: Due Date
                    - generic [ref=e197] [cursor=pointer]:
                      - checkbox "Doc Sub-type Name" [checked] [ref=e198]
                      - generic [ref=e199]: Doc Sub-type Name
                    - generic [ref=e200] [cursor=pointer]:
                      - checkbox "PO Reference" [checked] [ref=e201]
                      - generic [ref=e202]: PO Reference
                    - generic [ref=e203] [cursor=pointer]:
                      - checkbox "Customer No." [checked] [ref=e204]
                      - generic [ref=e205]: Customer No.
                    - generic [ref=e206] [cursor=pointer]:
                      - checkbox "Customer Name" [checked] [ref=e207]
                      - generic [ref=e208]: Customer Name
                    - generic [ref=e209] [cursor=pointer]:
                      - checkbox "Branch" [checked] [ref=e210]
                      - generic [ref=e211]: Branch
                    - generic [ref=e212] [cursor=pointer]:
                      - checkbox "Payment method" [checked] [ref=e213]
                      - generic [ref=e214]: Payment method
                    - generic [ref=e215] [cursor=pointer]:
                      - checkbox "Currency" [checked] [ref=e216]
                      - generic [ref=e217]: Currency
                    - generic [ref=e218] [cursor=pointer]:
                      - checkbox "Price List" [checked] [ref=e219]
                      - generic [ref=e220]: Price List
                    - generic [ref=e221] [cursor=pointer]:
                      - checkbox "Tax Amount" [checked] [ref=e222]
                      - generic [ref=e223]: Tax Amount
                    - generic [ref=e224] [cursor=pointer]:
                      - checkbox "Discount" [checked] [ref=e225]
                      - generic [ref=e226]: Discount
                    - generic [ref=e227] [cursor=pointer]:
                      - checkbox "Net Total" [checked] [ref=e228]
                      - generic [ref=e229]: Net Total
                    - generic [ref=e230] [cursor=pointer]:
                      - checkbox "Sales Rep" [checked] [ref=e231]
                      - generic [ref=e232]: Sales Rep
                    - generic [ref=e233] [cursor=pointer]:
                      - checkbox "Warehouse" [checked] [ref=e234]
                      - generic [ref=e235]: Warehouse
                    - generic [ref=e236] [cursor=pointer]:
                      - checkbox "Created By" [checked] [ref=e237]
                      - generic [ref=e238]: Created By
                    - generic [ref=e239] [cursor=pointer]:
                      - checkbox "Last Modified" [checked] [ref=e240]
                      - generic [ref=e241]: Last Modified
                - group [ref=e242]:
                  - generic "List" [ref=e243] [cursor=pointer]
            - table [ref=e251]:
              - rowgroup [ref=e252]:
                - row [ref=e253]:
                  - columnheader [ref=e254]:
                    - checkbox "Select all visible invoices" [ref=e256]
                  - columnheader [ref=e257]:
                    - button "Doc. Sequence" [ref=e258] [cursor=pointer]
                  - columnheader [ref=e260]:
                    - button "Doc No." [ref=e261] [cursor=pointer]:
                      - generic [aria-hidden] [ref=e263]: ↑
                  - columnheader [ref=e264]:
                    - button "Invoice Status" [ref=e265] [cursor=pointer]
                  - columnheader [ref=e267]:
                    - button "Doc Date" [ref=e268] [cursor=pointer]
                  - columnheader [ref=e270]:
                    - button "Due Date" [ref=e271] [cursor=pointer]
                  - columnheader [ref=e273]:
                    - button "Doc Sub-type Name" [ref=e274] [cursor=pointer]
                  - columnheader [ref=e276]:
                    - button "PO Reference" [ref=e277] [cursor=pointer]
                  - columnheader [ref=e279]:
                    - button "Customer No." [ref=e280] [cursor=pointer]
                  - columnheader [ref=e282]:
                    - button "Customer Name" [ref=e283] [cursor=pointer]
                  - columnheader [ref=e285]:
                    - button "Branch" [ref=e286] [cursor=pointer]
                  - columnheader [ref=e288]:
                    - button "Payment method" [ref=e289] [cursor=pointer]
                  - columnheader [ref=e291]:
                    - button "Currency" [ref=e292] [cursor=pointer]
                  - columnheader [ref=e294]:
                    - button "Price List" [ref=e295] [cursor=pointer]
                  - columnheader [ref=e297]:
                    - button "Tax Amount" [ref=e298] [cursor=pointer]
                  - columnheader [ref=e300]:
                    - button "Discount" [ref=e301] [cursor=pointer]
                  - columnheader [ref=e303]:
                    - button "Net Total" [ref=e304] [cursor=pointer]
                  - columnheader [ref=e306]:
                    - button "Sales Rep" [ref=e307] [cursor=pointer]
                  - columnheader [ref=e309]:
                    - button "Warehouse" [ref=e310] [cursor=pointer]
                  - columnheader [ref=e312]:
                    - button "Created By" [ref=e313] [cursor=pointer]
                  - columnheader [ref=e315]:
                    - button "Last Modified" [ref=e316] [cursor=pointer]
                  - columnheader "Record actions" [ref=e318]
              - rowgroup [ref=e319]:
                - row [ref=e320] [cursor=pointer]:
                  - cell [ref=e321]:
                    - checkbox "Select invoice 140" [ref=e323]
                  - cell "001000352026140" [ref=e324]
                  - cell [ref=e325]:
                    - button "Open invoice 140" [ref=e326]: "140"
                  - cell "Posted" [ref=e327]
                  - cell "13/08/2026" [ref=e328]
                  - cell "12/10/2026" [ref=e329]
                  - cell "عام" [ref=e330]
                  - cell "PO-88104" [ref=e331]
                  - cell "200001" [ref=e332]
                  - cell "العميل الاول" [ref=e333]
                  - cell "2 - lastchance" [ref=e334]
                  - cell "Credit" [ref=e335]
                  - cell "EGP" [ref=e336]
                  - cell "Wholesale 2026" [ref=e337]
                  - cell "784.00" [ref=e338]
                  - cell "200.00" [ref=e339]
                  - cell "5,600.00" [ref=e340]
                  - cell "Ahmed Nabil" [ref=e341]
                  - cell "WH-02 Central" [ref=e342]
                  - cell "ahmed.nabil" [ref=e343]
                  - cell "14/08/2026" [ref=e344]
                  - cell [ref=e345]:
                    - group [ref=e347]:
                      - generic "Actions for invoice 140" [ref=e348]
                - row [ref=e351] [cursor=pointer]:
                  - cell [ref=e352]:
                    - checkbox "Select invoice 142" [ref=e354]
                  - cell "001000352026142" [ref=e355]
                  - cell [ref=e356]:
                    - button "Open invoice 142" [ref=e357]: "142"
                  - cell "Posted" [ref=e358]
                  - cell "13/08/2026" [ref=e359]
                  - cell "13/09/2026" [ref=e360]
                  - cell "عام" [ref=e361]
                  - cell "PO-88190" [ref=e362]
                  - cell "200002" [ref=e363]
                  - cell "customertest" [ref=e364]
                  - cell "2 - lastchance" [ref=e365]
                  - cell "Cash" [ref=e366]
                  - cell "EGP" [ref=e367]
                  - cell "Retail 2026" [ref=e368]
                  - cell "245.00" [ref=e369]
                  - cell "50.00" [ref=e370]
                  - cell "1,750.00" [ref=e371]
                  - cell "Mona Farouk" [ref=e372]
                  - cell "WH-01 Main Store" [ref=e373]
                  - cell "mona.farouk" [ref=e374]
                  - cell "13/08/2026" [ref=e375]
                  - cell [ref=e376]:
                    - group [ref=e378]:
                      - generic "Actions for invoice 142" [ref=e379]
                - row [ref=e382] [cursor=pointer]:
                  - cell [ref=e383]:
                    - checkbox "Select invoice 143" [ref=e385]
                  - cell "001000352026143" [ref=e386]
                  - cell [ref=e387]:
                    - button "Open invoice 143" [ref=e388]: "143"
                  - cell "Posted" [ref=e389]
                  - cell "13/08/2026" [ref=e390]
                  - cell "13/09/2026" [ref=e391]
                  - cell "عام" [ref=e392]
                  - cell "PO-88213" [ref=e393]
                  - cell "200002" [ref=e394]
                  - cell "customertest" [ref=e395]
                  - cell "2 - lastchance" [ref=e396]
                  - cell "Cash" [ref=e397]
                  - cell "EGP" [ref=e398]
                  - cell "Retail 2026" [ref=e399]
                  - cell "28.00" [ref=e400]
                  - cell "0.00" [ref=e401]
                  - cell "200.00" [ref=e402]
                  - cell "Mona Farouk" [ref=e403]
                  - cell "WH-01 Main Store" [ref=e404]
                  - cell "mona.farouk" [ref=e405]
                  - cell "13/08/2026" [ref=e406]
                  - cell [ref=e407]:
                    - group [ref=e409]:
                      - generic "Actions for invoice 143" [ref=e410]
                - row [ref=e413] [cursor=pointer]:
                  - cell [ref=e414]:
                    - checkbox "Select invoice 144" [ref=e416]
                  - cell "001000352026144" [ref=e417]
                  - cell [ref=e418]:
                    - button "Open invoice 144" [ref=e419]: "144"
                  - cell "Draft" [ref=e420]
                  - cell "14/08/2026" [ref=e421]
                  - cell "14/09/2026" [ref=e422]
                  - cell "عام" [ref=e423]
                  - cell "PO-88240" [ref=e424]
                  - cell "200002" [ref=e425]
                  - cell "customertest" [ref=e426]
                  - cell "2 - lastchance" [ref=e427]
                  - cell "Cash" [ref=e428]
                  - cell "EGP" [ref=e429]
                  - cell "Retail 2026" [ref=e430]
                  - cell "133.00" [ref=e431]
                  - cell "0.00" [ref=e432]
                  - cell "950.00" [ref=e433]
                  - cell "Mona Farouk" [ref=e434]
                  - cell "WH-01 Main Store" [ref=e435]
                  - cell "mona.farouk" [ref=e436]
                  - cell "14/08/2026" [ref=e437]
                  - cell [ref=e438]:
                    - group [ref=e440]:
                      - generic "Actions for invoice 144" [ref=e441]
                - row [ref=e444] [cursor=pointer]:
                  - cell [ref=e445]:
                    - checkbox "Select invoice 145" [ref=e447]
                  - cell "001000352026145" [ref=e448]
                  - cell [ref=e449]:
                    - button "Open invoice 145" [ref=e450]: "145"
                  - cell "Open" [ref=e451]
                  - cell "14/08/2026" [ref=e452]
                  - cell "13/10/2026" [ref=e453]
                  - cell "عام" [ref=e454]
                  - cell "PO-88251" [ref=e455]
                  - cell "200001" [ref=e456]
                  - cell "العميل الاول" [ref=e457]
                  - cell "2 - lastchance" [ref=e458]
                  - cell "Credit" [ref=e459]
                  - cell "EGP" [ref=e460]
                  - cell "Wholesale 2026" [ref=e461]
                  - cell "448.00" [ref=e462]
                  - cell "100.00" [ref=e463]
                  - cell "3,200.00" [ref=e464]
                  - cell "Ahmed Nabil" [ref=e465]
                  - cell "WH-02 Central" [ref=e466]
                  - cell "ahmed.nabil" [ref=e467]
                  - cell "15/08/2026" [ref=e468]
                  - cell [ref=e469]:
                    - group [ref=e471]:
                      - generic "Actions for invoice 145" [ref=e472]
                - row [ref=e475] [cursor=pointer]:
                  - cell [ref=e476]:
                    - checkbox "Select invoice 146" [ref=e478]
                  - cell "001000352026146" [ref=e479]
                  - cell [ref=e480]:
                    - button "Open invoice 146" [ref=e481]: "146"
                  - cell "Pending" [ref=e482]
                  - cell "15/08/2026" [ref=e483]
                  - cell "15/09/2026" [ref=e484]
                  - cell "عام" [ref=e485]
                  - cell "PO-88277" [ref=e486]
                  - cell "200002" [ref=e487]
                  - cell "customertest" [ref=e488]
                  - cell "2 - lastchance" [ref=e489]
                  - cell "Cash" [ref=e490]
                  - cell "EGP" [ref=e491]
                  - cell "Retail 2026" [ref=e492]
                  - cell "157.00" [ref=e493]
                  - cell "25.00" [ref=e494]
                  - cell "1,120.00" [ref=e495]
                  - cell "Mona Farouk" [ref=e496]
                  - cell "WH-01 Main Store" [ref=e497]
                  - cell "mona.farouk" [ref=e498]
                  - cell "15/08/2026" [ref=e499]
                  - cell [ref=e500]:
                    - group [ref=e502]:
                      - generic "Actions for invoice 146" [ref=e503]
                - row [ref=e506] [cursor=pointer]:
                  - cell [ref=e507]:
                    - checkbox "Select invoice 147" [ref=e509]
                  - cell "001000352026147" [ref=e510]
                  - cell [ref=e511]:
                    - button "Open invoice 147" [ref=e512]: "147"
                  - cell "Returned" [ref=e513]
                  - cell "15/08/2026" [ref=e514]
                  - cell "14/10/2026" [ref=e515]
                  - cell "عام" [ref=e516]
                  - cell "PO-88283" [ref=e517]
                  - cell "200001" [ref=e518]
                  - cell "العميل الاول" [ref=e519]
                  - cell "2 - lastchance" [ref=e520]
                  - cell "Credit" [ref=e521]
                  - cell "EGP" [ref=e522]
                  - cell "Wholesale 2026" [ref=e523]
                  - cell "67.00" [ref=e524]
                  - cell "0.00" [ref=e525]
                  - cell "480.00" [ref=e526]
                  - cell "Ahmed Nabil" [ref=e527]
                  - cell "WH-02 Central" [ref=e528]
                  - cell "ahmed.nabil" [ref=e529]
                  - cell "16/08/2026" [ref=e530]
                  - cell [ref=e531]:
                    - group [ref=e533]:
                      - generic "Actions for invoice 147" [ref=e534]
                - row [ref=e537] [cursor=pointer]:
                  - cell [ref=e538]:
                    - checkbox "Select invoice 148" [ref=e540]
                  - cell "001000352026148" [ref=e541]
                  - cell [ref=e542]:
                    - button "Open invoice 148" [ref=e543]: "148"
                  - cell "Canceled" [ref=e544]
                  - cell "16/08/2026" [ref=e545]
                  - cell "16/09/2026" [ref=e546]
                  - cell "عام" [ref=e547]
                  - cell "PO-88301" [ref=e548]
                  - cell "200002" [ref=e549]
                  - cell "customertest" [ref=e550]
                  - cell "2 - lastchance" [ref=e551]
                  - cell "Cash" [ref=e552]
                  - cell "EGP" [ref=e553]
                  - cell "Retail 2026" [ref=e554]
                  - cell "280.00" [ref=e555]
                  - cell "0.00" [ref=e556]
                  - cell "2,000.00" [ref=e557]
                  - cell "Mona Farouk" [ref=e558]
                  - cell "WH-01 Main Store" [ref=e559]
                  - cell "mona.farouk" [ref=e560]
                  - cell "16/08/2026" [ref=e561]
                  - cell [ref=e562]:
                    - group [ref=e564]:
                      - generic "Actions for invoice 148" [ref=e565]
        - generic [ref=e568]:
          - text: "|"
          - navigation "invoices page navigation" [ref=e570]:
            - generic [ref=e571]:
              - button "First page" [disabled] [ref=e572]
              - button "Previous page" [disabled] [ref=e575]
              - button "Page 1" [ref=e578] [cursor=pointer]: "1"
              - button "Next page" [disabled] [ref=e579]
              - button "Last page" [disabled] [ref=e582]
              - generic [ref=e585]:
                - generic [ref=e586]: Go to page
                - spinbutton "Go to page" [ref=e587]: "1"
            - generic [ref=e588]: Showing 1–8 of 8
            - generic [ref=e589]:
              - text: Rows per page
              - combobox "Rows per page" [ref=e591] [cursor=pointer]:
                - option "10"
                - option "25" [selected]
                - option "50"
                - option "100"
          - text: "|"
  - text: No conditions set.
  - status
  - text: No groups yet — add one, then drag screens in from the left.
  - button "Prototype controls" [ref=e592] [cursor=pointer]
```

# Test source

```ts
  291 |   test.skip(
  292 |     testInfo.project.use.viewport?.width < 900,
  293 |     'Chart toggle is not reachable in the responsive/mobile toolbar layout.'
  294 |   );
  295 |   await page.addInitScript(() => {
  296 |     window.__chartInstances = [];
  297 |     window.ApexCharts = class {
  298 |       constructor(el, options) {
  299 |         this.el = el;
  300 |         this.options = options;
  301 |         this.destroyed = false;
  302 |         window.__chartInstances.push(this);
  303 |       }
  304 |       render() {
  305 |         return Promise.resolve();
  306 |       }
  307 |       destroy() {
  308 |         this.destroyed = true;
  309 |       }
  310 |     };
  311 |   });
  312 |   await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
  313 |   await openSurface(page, 'list');
  314 |   await settle(page);
  315 | 
  316 |   await openListChart(page);
  317 |   await expect.poll(() => page.evaluate(() => window.__chartInstances.length)).toBe(1);
  318 |   await expect(page.locator('[data-data-list="invoice"] .data-list-chart, [data-data-list="invoice"] canvas')).toBeVisible().catch(() => {});
  319 | });
  320 | 
  321 | // ---------------------------------------------------------------------
  322 | // Frozen columns
  323 | // ---------------------------------------------------------------------
  324 | test('pinning a column via the header context menu freezes it', async ({page}, testInfo) => {
  325 |   // A synthetic `button: 'right'` click doesn't reliably fire a native
  326 |   // `contextmenu` event under Playwright's touch emulation (hasTouch: true)
  327 |   // — this is a known Chromium/touch-emulation limitation, not an app
  328 |   // behavior difference, and the app itself has no touch-specific
  329 |   // long-press affordance for this menu to substitute.
  330 |   test.skip(testInfo.project.use.hasTouch, 'contextmenu is not touch-emulation-reliable.');
  331 |   await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
  332 |   await openSurface(page, 'list');
  333 |   await settle(page);
  334 | 
  335 |   const header = page.locator('[data-data-list="invoice"] th[data-col]').first();
  336 |   await header.click({button: 'right'});
  337 |   const contextMenu = page.locator('#data-list-context-menu');
  338 |   await expect(contextMenu).toBeVisible();
  339 |   const pinItem = contextMenu.locator('[data-context-column-action="pin"]');
  340 |   await pinItem.click();
  341 | 
  342 |   const colKey = await header.getAttribute('data-col');
  343 |   const frozenCell = page
  344 |     .locator(`[data-data-list="invoice"] [data-col="${colKey}"]`)
  345 |     .first();
  346 |   await expect(frozenCell).toHaveAttribute('data-frozen', 'true');
  347 | });
  348 | 
  349 | // ---------------------------------------------------------------------
  350 | // Context menus
  351 | // ---------------------------------------------------------------------
  352 | test('right-clicking a row opens the row action context menu', async ({page}, testInfo) => {
  353 |   test.skip(testInfo.project.use.hasTouch, 'contextmenu is not touch-emulation-reliable.');
  354 |   await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
  355 |   await openSurface(page, 'list');
  356 |   await settle(page);
  357 | 
  358 |   await openRowContextMenu(page);
  359 |   const contextMenu = page.locator('#data-list-context-menu');
  360 |   await expect(contextMenu).toBeVisible();
  361 |   await expect(contextMenu.locator('[data-list-row-action]').first()).toBeVisible();
  362 | 
  363 |   await page.keyboard.press('Escape');
  364 |   await expect(contextMenu).toBeHidden();
  365 | });
  366 | 
  367 | // ---------------------------------------------------------------------
  368 | // Toolbar data-menu dismissal (menu-controller Escape + outside click)
  369 | // ---------------------------------------------------------------------
  370 | test('toolbar data-menus dismiss with Escape and outside click', async ({page}) => {
  371 |   await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
  372 |   await openSurface(page, 'list');
  373 |   await settle(page);
  374 | 
  375 |   const columnsMenu = page
  376 |     .locator('.list-view')
  377 |     .locator('.data-menu')
  378 |     .filter({has: page.locator(':scope > summary', {hasText: /^Columns$/})});
  379 |   const summary = columnsMenu.locator(':scope > summary');
  380 | 
  381 |   // Escape closes the popover and returns focus to its summary.
  382 |   await summary.click();
  383 |   await expect(columnsMenu).toHaveJSProperty('open', true);
  384 |   await page.keyboard.press('Escape');
  385 |   await expect(columnsMenu).toHaveJSProperty('open', false);
  386 |   await expect(summary).toBeFocused();
  387 | 
  388 |   // A pointer interaction outside the popover closes it too.
  389 |   await summary.click();
  390 |   await expect(columnsMenu).toHaveJSProperty('open', true);
> 391 |   await page.locator('.list-view .data-list-toolbar input[type="search"]').click();
      |                                                                            ^ Error: locator.click: Test timeout of 30000ms exceeded.
  392 |   await expect(columnsMenu).toHaveJSProperty('open', false);
  393 | });
  394 | 
  395 | // ---------------------------------------------------------------------
  396 | // Constrained Kanban movement
  397 | // ---------------------------------------------------------------------
  398 | test('kanban drag to a disallowed status opens the blocked dialog instead of moving', async ({
  399 |   page,
  400 | }) => {
  401 |   test.skip(
  402 |     true,
  403 |     "Kanban is rendered with a deliberate `hidden` view-menu option (see tests/" +
  404 |       "table-customer-ux.test.mjs's 'table controls hide print, charts, and kanban' " +
  405 |       'expectation), so no visible control drives it.'
  406 |   );
  407 |   await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
  408 |   await openSurface(page, 'list');
  409 |   const kanbanOption = page.locator('[data-list-view="kanban"]');
  410 |   await kanbanOption.locator('xpath=ancestor::details/summary').click();
  411 |   await kanbanOption.click();
  412 |   await settle(page);
  413 | 
  414 |   // A Draft card may only move to Open or Canceled (INVOICE_STATUS_TRANSITIONS
  415 |   // in legacy-app.js) — dropping it on the Posted column is a known-blocked
  416 |   // transition, deterministic rather than probing every column.
  417 |   const card = page
  418 |     .locator('.data-kanban-card[data-kanban-status="Draft"]')
  419 |     .first();
  420 |   const drop = page.locator('[data-kanban-drop="Posted"]');
  421 |   await expect(card).toBeVisible();
  422 |   await expect(drop).toBeVisible();
  423 | 
  424 |   // Simulate native HTML5 drag-and-drop by dispatching the same events the
  425 |   // app's own dragstart/dragover/drop handlers listen for (canvas.addEventListener
  426 |   // in wireDataList), constructing DataTransfer in-page since it isn't
  427 |   // available in the Node test context.
  428 |   await page.evaluate(
  429 |     ({cardSelector, dropSelector}) => {
  430 |       const cardEl = document.querySelector(cardSelector);
  431 |       const dropEl = document.querySelector(dropSelector);
  432 |       const dataTransfer = new DataTransfer();
  433 |       cardEl.dispatchEvent(new DragEvent('dragstart', {bubbles: true, dataTransfer}));
  434 |       dropEl.dispatchEvent(new DragEvent('dragover', {bubbles: true, cancelable: true, dataTransfer}));
  435 |       dropEl.dispatchEvent(new DragEvent('drop', {bubbles: true, cancelable: true, dataTransfer}));
  436 |     },
  437 |     {
  438 |       cardSelector: '.data-kanban-card[data-kanban-status="Draft"]',
  439 |       dropSelector: '[data-kanban-drop="Posted"]',
  440 |     }
  441 |   );
  442 | 
  443 |   await expect(page.locator('#kanban-blocked-body')).toBeVisible();
  444 |   await expect(page.locator('#kanban-blocked-body')).toContainText("can't move directly to Posted");
  445 |   // The card must still show its original status — the move did not happen.
  446 |   await expect(card).toHaveAttribute('data-kanban-status', 'Draft');
  447 | });
  448 | 
  449 | // ---------------------------------------------------------------------
  450 | // Repeated navigation — no duplicate event registrations or leaked chart
  451 | // instances/listeners. There is no in-app "back to launchpad" control
  452 | // wired up once a list/record is open (.gtop .app's click handler,
  453 | // goToForYou, is a documented no-op stub in legacy-app.js — confirmed by
  454 | // reading legacy-app.js directly), so "repeated navigation" here exercises
  455 | // what actually re-triggers renderDataList/wireDataList repeatedly on the
  456 | // SAME canvas within one session: opening a record and returning to the
  457 | // list (openSurface's own record-open flow), and toggling the chart/view
  458 | // repeatedly — the real paths that would surface duplicate listener
  459 | // registration or leaked chart instances if the per-instance rewrite were
  460 | // wrong.
  461 | // ---------------------------------------------------------------------
  462 | test('repeated chart open/close cycles never leave more than one live chart instance', async ({
  463 |   page,
  464 | }, testInfo) => {
  465 |   test.skip(
  466 |     testInfo.project.use.viewport?.width < 900,
  467 |     'Chart toggle is not reachable in the responsive/mobile toolbar layout.'
  468 |   );
  469 |   await page.addInitScript(() => {
  470 |     window.__chartInstances = [];
  471 |     window.ApexCharts = class {
  472 |       constructor(el, options) {
  473 |         this.el = el;
  474 |         this.options = options;
  475 |         this.destroyed = false;
  476 |         window.__chartInstances.push(this);
  477 |       }
  478 |       render() {
  479 |         return Promise.resolve();
  480 |       }
  481 |       destroy() {
  482 |         this.destroyed = true;
  483 |       }
  484 |     };
  485 |   });
  486 |   await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
  487 |   await openSurface(page, 'list');
  488 |   await settle(page);
  489 | 
  490 |   for (let i = 0; i < 4; i += 1) {
  491 |     if (i % 2 === 0) {
```