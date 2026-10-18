# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: messaging.spec.mjs >> reading a notification email preserves unread state and appearance
- Location: tests/messaging.spec.mjs:16:1

# Error details

```
Error: expect(locator).toHaveScreenshot(expected) failed

Locator: locator('.email-view')
  1172 pixels (ratio 0.01 of all image pixels) are different.

  Snapshot: email-reading.png

Call log:
  - Expect "toHaveScreenshot(email-reading.png)" locator('.email-view') with timeout 5000ms
    - verifying given screenshot expectation
  - waiting for locator('.email-view')
    - locator resolved to <div class="email-view flex flex-1 min-h-0 flex-col">…</div>
  - taking element screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - attempting scroll into view action
    - waiting for element to be stable
  - 1172 pixels (ratio 0.01 of all image pixels) are different.
  - waiting 100ms before taking screenshot
  - waiting for locator('.email-view')
    - locator resolved to <div class="email-view flex flex-1 min-h-0 flex-col">…</div>
  - taking element screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - attempting scroll into view action
    - waiting for element to be stable
  - captured a stable screenshot
  - 1172 pixels (ratio 0.01 of all image pixels) are different.

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to main content" [ref=e2] [cursor=pointer]:
    - /url: "#app-main"
  - generic [ref=e5]:
    - generic [ref=e6]:
      - generic [ref=e7]:
        - button "Switch app" [ref=e9] [cursor=pointer]
        - button "Collapse sidebar" [ref=e12] [cursor=pointer]
        - button "lastchance, fiscal year 2026" [ref=e15] [cursor=pointer]:
          - generic [ref=e18]: lastchance
          - generic [ref=e19]: "2026"
          - generic: lastchance
      - button "Search or run an action" [ref=e22] [cursor=pointer]:
        - generic [ref=e26]: ⌘K
      - generic [ref=e27]:
        - button "AI Assistant" [ref=e28] [cursor=pointer]
        - button "System Alerts" [ref=e33] [cursor=pointer]:
          - generic [ref=e36]: "3"
          - generic: Alerts
        - button "Help" [ref=e38] [cursor=pointer]
        - button [ref=e42] [cursor=pointer]
    - generic [ref=e46]:
      - navigation "Primary navigation" [ref=e47]:
        - generic [ref=e48]:
          - generic [ref=e49]:
            - generic [ref=e50]:
              - button "For You" [ref=e51] [cursor=pointer]
              - button "Starred" [ref=e55] [cursor=pointer]
              - button "Recent" [ref=e58] [cursor=pointer]
            - generic [ref=e62]:
              - button "Dashboard" [ref=e63] [cursor=pointer]
              - button "Customers" [ref=e66] [cursor=pointer]
              - button "Vendors" [ref=e69] [cursor=pointer]
              - button "Inventory Systems Management" [ref=e72] [cursor=pointer]
              - button "Sales Systems Management" [ref=e75] [cursor=pointer]
              - button "Purchase Systems Management" [ref=e78] [cursor=pointer]
              - button "POS System Management" [ref=e81] [cursor=pointer]
              - button "Finance and Accounting" [ref=e84] [cursor=pointer]
              - button "Human Capital Management" [ref=e87] [cursor=pointer]
              - button "Fixed Assests System" [ref=e90] [cursor=pointer]
              - button "Manufacturing Resource Planning" [ref=e93] [cursor=pointer]
              - button "Real Estate Management System" [ref=e96] [cursor=pointer]
              - button "Maintenance Workshop System" [ref=e99] [cursor=pointer]
              - button "Customer Relations Management" [ref=e102] [cursor=pointer]
              - button "Hospital Management" [ref=e105] [cursor=pointer]
              - button "Car rent system" [ref=e108] [cursor=pointer]
              - button "Reports" [ref=e111] [cursor=pointer]
              - button "System Administration" [ref=e114] [cursor=pointer]
              - button "System Setup" [ref=e117] [cursor=pointer]
              - button "Help Screens" [ref=e120] [cursor=pointer]
            - button "Account" [ref=e125] [cursor=pointer]
          - generic [ref=e129]:
            - generic [ref=e130]: Help Screens
            - button "For You" [ref=e132] [cursor=pointer]
            - button "Internal Mail" [ref=e135] [cursor=pointer]
            - button "Events" [ref=e138] [cursor=pointer]
            - button "Activities" [ref=e141] [cursor=pointer]
            - button "Notes" [ref=e144] [cursor=pointer]
            - button "People Data" [ref=e147] [cursor=pointer]
            - button "Smart Query Engine" [ref=e150] [cursor=pointer]
            - button "AI Dashboard" [ref=e153] [cursor=pointer]
            - button "Sales Forecast" [ref=e156] [cursor=pointer]
        - button "Collapse sidebar" [ref=e158]
      - main [ref=e159]:
        - generic [ref=e161]:
          - generic [ref=e162]:
            - generic [ref=e163]:
              - navigation "Breadcrumb" [ref=e164]:
                - link "Help Screens" [ref=e165] [cursor=pointer]:
                  - /url: "#"
                - generic [aria-hidden] [ref=e166]: ›
                - generic [ref=e167]: Internal Mail
              - heading "Internal Mail" [level=1] [ref=e169]
            - button "Compose" [ref=e171] [cursor=pointer]
          - generic [ref=e175]:
            - navigation "Mailboxes" [ref=e176]:
              - generic [ref=e177]:
                - list [ref=e178]:
                  - listitem [ref=e179]:
                    - button "Inbox 1 unread" [ref=e180] [cursor=pointer]:
                      - generic [ref=e183]: Inbox
                      - generic [ref=e184]:
                        - text: "1"
                        - generic [ref=e185]: unread
                  - listitem [ref=e186]:
                    - button "Starred" [ref=e187] [cursor=pointer]
                  - listitem [ref=e191]:
                    - button "Sent" [ref=e192] [cursor=pointer]
                  - listitem [ref=e196]:
                    - button "Drafts 1 drafts" [ref=e197] [cursor=pointer]:
                      - generic [ref=e200]: Drafts
                      - generic [ref=e201]:
                        - text: "1"
                        - generic [ref=e202]: drafts
                  - listitem [ref=e203]:
                    - button "Archive" [ref=e204] [cursor=pointer]
                  - listitem [ref=e208]:
                    - button "Trash" [ref=e209] [cursor=pointer]
                - generic [ref=e213]: Folders
            - generic [ref=e216]:
              - generic [ref=e217]: Mailbox
              - generic [ref=e218]:
                - button "Expand mailboxes" [ref=e219] [cursor=pointer]
                - generic [ref=e222]: Inbox
                - generic [ref=e223]: 1 unread
              - searchbox "Search this mailbox" [ref=e228]
              - generic [ref=e230]:
                - generic [ref=e231] [cursor=pointer]:
                  - generic [ref=e232]: Select all
                  - switch "Select all" [ref=e234]
                - generic [ref=e235] [cursor=pointer]:
                  - generic [ref=e236]: Unread only
                  - switch "Unread only" [ref=e238]
              - listbox "Inbox messages" [ref=e240]:
                - text: Today
                - option "Select “Payment scheduled for Sales Invoice 126” F Finance Team 13:05 Payment scheduled for Sales Invoice 126 Starred Has attachments" [selected] [ref=e241] [cursor=pointer]:
                  - checkbox "Select “Payment scheduled for Sales Invoice 126”" [checked] [ref=e243]
                  - generic [ref=e244]: F
                  - generic [ref=e245]:
                    - generic [ref=e246]:
                      - generic [ref=e247]: Finance Team
                      - generic [ref=e248]: 13:05
                    - generic [ref=e249]:
                      - generic [ref=e250]: Payment scheduled for Sales Invoice 126
                      - generic [ref=e251]: Starred
                      - generic [ref=e255]: Has attachments
                - option "Select “Stock check needed before Bill Outgoing Order ships” W Unread. Warehouse Ops 12:20 Stock check needed before Bill Outgoing Order ships 2 related items" [ref=e259] [cursor=pointer]:
                  - checkbox "Select “Stock check needed before Bill Outgoing Order ships”" [ref=e261]
                  - generic [ref=e262]: W
                  - generic [ref=e263]:
                    - generic [ref=e264]:
                      - generic [ref=e265]:
                        - generic [ref=e266]: Unread.
                        - text: Warehouse Ops
                      - generic [ref=e267]: 12:20
                    - generic [ref=e268]:
                      - generic [ref=e269]: Stock check needed before Bill Outgoing Order ships
                      - generic [ref=e270]:
                        - text: "2"
                        - generic [ref=e273]: related items
                - option "Select “Your password expires in 5 days” System Admin 11:05 Your password expires in 5 days" [ref=e274] [cursor=pointer]:
                  - checkbox "Select “Your password expires in 5 days”" [ref=e276]
                  - generic [ref=e280]:
                    - generic [ref=e281]:
                      - generic [ref=e282]: System Admin
                      - generic [ref=e283]: 11:05
                    - generic [ref=e284]: Your password expires in 5 days
                - text: Yesterday
                - option "Select “Quotation request from Al Noor Trading” C Customer Portal 17:40 Quotation request from Al Noor Trading Has attachments 1 related items" [ref=e286] [cursor=pointer]:
                  - checkbox "Select “Quotation request from Al Noor Trading”" [ref=e288]
                  - generic [ref=e289]: C
                  - generic [ref=e290]:
                    - generic [ref=e291]:
                      - generic [ref=e292]: Customer Portal
                      - generic [ref=e293]: 17:40
                    - generic [ref=e294]:
                      - generic [ref=e295]: Quotation request from Al Noor Trading
                      - generic [ref=e296]: Has attachments
                      - generic [ref=e300]:
                        - text: "1"
                        - generic [ref=e303]: related items
                - option "Select “Undo request approved on Invoice 118” F Finance Team 09:15 Undo request approved on Invoice 118" [ref=e304] [cursor=pointer]:
                  - checkbox "Select “Undo request approved on Invoice 118”" [ref=e306]
                  - generic [ref=e307]: F
                  - generic [ref=e308]:
                    - generic [ref=e309]:
                      - generic [ref=e310]: Finance Team
                      - generic [ref=e311]: 09:15
                    - generic [ref=e312]: Undo request approved on Invoice 118
            - generic [ref=e314]:
              - toolbar "Message actions" [ref=e316]:
                - generic [ref=e317]:
                  - button "Reply" [ref=e318] [cursor=pointer]
                  - button "Forward" [ref=e322] [cursor=pointer]
                - generic [ref=e327]:
                  - button "Archive" [ref=e328] [cursor=pointer]
                  - button "Move to" [ref=e333] [cursor=pointer]
                - button "More actions" [ref=e341] [cursor=pointer]
              - generic [ref=e344]:
                - heading "Payment scheduled for Sales Invoice 126" [level=2] [ref=e345]
                - paragraph [ref=e346]: Inbox
                - article [ref=e347]:
                  - generic [ref=e348]:
                    - generic [ref=e349]: F
                    - generic [ref=e350]:
                      - generic [ref=e351]: Finance Team
                      - generic [ref=e352]: finance@lastchance.local
                    - generic [ref=e353]: Today, 13:05
                  - generic [ref=e354]:
                    - generic [ref=e355]: To
                    - generic [ref=e356]: Majed Sief Alnasr
                  - generic [ref=e357]:
                    - generic [ref=e358]: Cc
                    - generic [ref=e359]: Kane
                  - generic [ref=e360]:
                    - paragraph [ref=e361]: Good morning,
                    - paragraph [ref=e362]: Your payment for Sales Invoice 126 is scheduled for processing on 29/07/2026, for 20,000.00 EGP on credit terms.
                    - paragraph [ref=e363]: No action is needed on your side — the receipt voucher will be generated automatically once the payment clears. If the amount or due date looks wrong, reply to this email and Finance will take a look.
                    - paragraph [ref=e364]: Thanks, Finance Team
                  - generic [ref=e365]:
                    - generic [ref=e366]:
                      - generic [ref=e369]: invoice-126.pdf
                      - generic [ref=e370]: 214 KB
                    - generic [ref=e371]: Attachments are sample files in the prototype.
                - region "Related items" [ref=e372]:
                  - heading "Related items (0)" [level=3] [ref=e374]
                  - paragraph [ref=e375]: No related items yet. Link existing work or create something new from here.
                  - generic [ref=e376]:
                    - button "Link existing…" [ref=e377] [cursor=pointer]
                    - button "Create related" [ref=e381] [cursor=pointer]
              - generic [ref=e384]:
                - generic [ref=e385]: Reply to Finance Team
                - textbox "Reply to Finance Team" [ref=e386]:
                  - /placeholder: Write a reply…
                - generic [ref=e387]:
                  - generic [ref=e388]: Typing saves a reply draft.
                  - button "Reply" [ref=e389] [cursor=pointer]
        - generic [ref=e392]: "| |"
  - text: No conditions set.
  - status
  - text: No groups yet — add one, then drag screens in from the left.
  - button "Prototype controls" [ref=e393] [cursor=pointer]
```

# Test source

```ts
  1  | import {test, expect} from '@playwright/test';
  2  | import {boot, openSurface, settle} from './support/browser.mjs';
  3  | 
  4  | test.beforeEach(async ({page, baseURL}) => {
  5  |   await boot(page, baseURL);
  6  | });
  7  | 
  8  | test('Home restores the same topbar actions and releases the inert shell', async ({page}) => {
  9  |   await expect(page.locator('.fbody')).toHaveAttribute('inert', '');
  10 |   const actions = await page.locator('.lp-actions .right').elementHandle();
  11 |   await openSurface(page, 'list');
  12 |   await expect(page.locator('.fbody')).not.toHaveAttribute('inert', '');
  13 |   expect(await page.locator('.gtop .right').evaluate((node, original) => node === original, actions)).toBe(true);
  14 | });
  15 | 
  16 | test('reading a notification email preserves unread state and appearance', async ({page}) => {
  17 |   await openSurface(page, 'list');
  18 |   const unread = Number(await page.locator('#notif-badge').textContent());
  19 |   await openSurface(page, 'email');
  20 |   await settle(page);
  21 |   await expect(page.locator('.email-reading-scroll')).toBeVisible();
  22 |   await expect(page.locator('#notif-badge')).toHaveText(String(unread - 1));
> 23 |   await expect(page.locator('.email-view')).toHaveScreenshot('email-reading.png', {animations: 'disabled', maxDiffPixels: 0});
     |                                             ^ Error: expect(locator).toHaveScreenshot(expected) failed
  24 | });
  25 | 
  26 | test('email compose retains send feedback', async ({page}, testInfo) => {
  27 |   test.skip(testInfo.project.use.viewport.width < 900, 'Known baseline mobile email layout clips the composer.');
  28 |   await openSurface(page, 'list');
  29 |   await openSurface(page, 'email');
  30 |   await settle(page);
  31 |   await page.locator('.email-compose').click();
  32 |   await page.locator('#email-compose-to').fill('reader@example.com');
  33 |   await page.locator('.email-composer-input').fill('Test message');
  34 |   await page.locator('.email-send').click();
  35 |   await expect(page.getByText('Message sent', {exact: true})).toBeVisible();
  36 |   await expect(page.locator('.email-composer-input')).toHaveValue('');
  37 | });
  38 | 
  39 | test('notification tabs preserve keyboard selection', async ({page}) => {
  40 |   // The alerts button's aria-label is data-i18n'd (System Alerts /
  41 |   // تنبيهات النظام), so key the locator off aria-controls, which never
  42 |   // translates.
  43 |   const alertsButton = page.locator('button[aria-controls="notifications-popover"]');
  44 |   await alertsButton.click();
  45 |   const direct = page.locator('.notif-tabs [data-tab="direct"]');
  46 |   await direct.focus();
  47 |   await page.keyboard.press('ArrowRight');
  48 |   await expect(page.locator('.notif-tabs [data-tab="email"]')).toHaveAttribute('aria-selected', 'true');
  49 |   await page.keyboard.press('Escape');
  50 |   await expect(alertsButton).toBeFocused();
  51 | });
  52 | 
  53 | test('assistant proposal answers and closes with Escape', async ({page}) => {
  54 |   await openSurface(page, 'list');
  55 |   await page.locator('.right button.chip').click();
  56 |   await expect(page.locator('#aiscrim')).toBeVisible();
  57 |   await page.locator('[data-ai="Summarize this invoice"]').first().click();
  58 |   await expect(page.locator('#ai-thread')).toContainText('Sales Invoice 126');
  59 |   await page.keyboard.press('Escape');
  60 |   await expect(page.locator('#aiscrim')).toBeHidden();
  61 | });
  62 | 
```