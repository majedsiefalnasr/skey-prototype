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
  - waiting for locator('.list-view').locator('.data-menu').filter({ has: locator(':scope > summary').filter({ hasText: /^Columns$/ }) }).locator(':scope > summary')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to main content" [ref=e2] [cursor=pointer]:
    - /url: "#app-main"
  - generic [ref=e5]:
    - generic [ref=e6]:
      - generic [ref=e7]:
        - button "تبديل التطبيق" [ref=e9] [cursor=pointer]
        - button "توسيع الشريط الجانبي" [pressed] [ref=e12] [cursor=pointer]
        - button "lastchance, fiscal year 2026" [ref=e15] [cursor=pointer]:
          - generic [ref=e18]: lastchance
          - generic [ref=e19]: "2026"
          - generic: lastchance
      - button "ابحث أو نفّذ إجراءً" [ref=e22] [cursor=pointer]:
        - generic [ref=e26]: ⌘K
      - generic [ref=e27]:
        - button "مساعد الذكاء الاصطناعي" [ref=e28] [cursor=pointer]
        - button "تنبيهات النظام" [ref=e32] [cursor=pointer]:
          - generic [ref=e35]: "4"
          - generic: التنبيهات
        - button "مساعدة" [ref=e37] [cursor=pointer]
        - button [ref=e41] [cursor=pointer]
    - generic [ref=e45]:
      - navigation "Primary navigation" [ref=e46]:
        - generic [ref=e48]:
          - generic [ref=e49]:
            - button "لك" [ref=e50] [cursor=pointer]
            - button "المفضلة" [ref=e54] [cursor=pointer]
            - button "الأخيرة" [ref=e57] [cursor=pointer]
          - generic [ref=e61]:
            - button "لوحة التحكم" [ref=e62] [cursor=pointer]
            - button "العملاء" [ref=e65] [cursor=pointer]
            - button "الموردون" [ref=e68] [cursor=pointer]
            - button "إدارة نظم المخزون" [ref=e71] [cursor=pointer]
            - button "إدارة نظم المبيعات" [ref=e74] [cursor=pointer]
            - button "إدارة نظم المشتريات" [ref=e77] [cursor=pointer]
            - button "إدارة نظام نقاط البيع" [ref=e80] [cursor=pointer]
            - button "المالية والمحاسبة" [ref=e83] [cursor=pointer]
            - button "إدارة رأس المال البشري" [ref=e86] [cursor=pointer]
            - button "نظام الأصول الثابتة" [ref=e89] [cursor=pointer]
            - button "تخطيط موارد التصنيع" [ref=e92] [cursor=pointer]
            - button "نظام إدارة العقارات" [ref=e95] [cursor=pointer]
            - button "نظام ورشة الصيانة" [ref=e98] [cursor=pointer]
            - button "إدارة علاقات العملاء" [ref=e101] [cursor=pointer]
            - button "إدارة المستشفى" [ref=e104] [cursor=pointer]
            - button "نظام تأجير السيارات" [ref=e107] [cursor=pointer]
            - button "التقارير" [ref=e110] [cursor=pointer]
            - button "إدارة النظام" [ref=e113] [cursor=pointer]
            - button "إعداد النظام" [ref=e116] [cursor=pointer]
            - button "الشاشات المساعدة" [ref=e119] [cursor=pointer]
          - button "الحساب" [ref=e124] [cursor=pointer]
        - button "Expand sidebar" [ref=e127]
      - main [ref=e128]:
        - generic [ref=e130]:
          - generic [ref=e131]:
            - generic [ref=e132]:
              - navigation "Breadcrumb" [ref=e133]:
                - link "الرئيسية" [ref=e134] [cursor=pointer]:
                  - /url: "#"
                - generic [aria-hidden] [ref=e135]: ›
                - generic [ref=e136]: فاتورة المبيعات
              - heading "فاتورة المبيعات" [level=1] [ref=e138]
            - generic [ref=e139]:
              - group [ref=e140]:
                - generic "إدارة" [ref=e141] [cursor=pointer]
              - button "إضافة" [ref=e147] [cursor=pointer]
          - generic [ref=e151]:
            - toolbar "invoices عناصر التحكم بالجدول" [ref=e153]:
              - generic [ref=e154]:
                - group [ref=e155]:
                  - generic "كل الفواتير" [ref=e156] [cursor=pointer]
                - group [ref=e162]:
                  - generic "فلتر" [ref=e163] [cursor=pointer]
              - generic [ref=e167]:
                - searchbox "بحث فواتير" [ref=e169]
                - group [ref=e170]:
                  - generic "إجراءات أخرى" [ref=e171] [cursor=pointer]
                - group [ref=e174]:
                  - generic "الأعمدة" [ref=e175] [cursor=pointer]
                - group [ref=e181]:
                  - generic "قائمة" [ref=e182] [cursor=pointer]
            - table [ref=e190]:
              - rowgroup [ref=e191]:
                - row [ref=e192]:
                  - columnheader [ref=e193]:
                    - checkbox "Select all visible invoices" [ref=e195]
                  - columnheader [ref=e196]:
                    - button "تسلسل المستند" [ref=e197] [cursor=pointer]
                  - columnheader [ref=e199]:
                    - button "رقم المستند" [ref=e200] [cursor=pointer]:
                      - generic [aria-hidden] [ref=e202]: ↑
                  - columnheader [ref=e203]:
                    - button "حالة الفاتورة" [ref=e204] [cursor=pointer]
                  - columnheader [ref=e206]:
                    - button "تاريخ المستند" [ref=e207] [cursor=pointer]
                  - columnheader [ref=e209]:
                    - button "تاريخ الاستحقاق" [ref=e210] [cursor=pointer]
                  - columnheader [ref=e212]:
                    - button "اسم النوع الفرعي للمستند" [ref=e213] [cursor=pointer]
                  - columnheader [ref=e215]:
                    - button "PO Reference" [ref=e216] [cursor=pointer]
                  - columnheader [ref=e218]:
                    - button "رقم العميل" [ref=e219] [cursor=pointer]
                  - columnheader [ref=e221]:
                    - button "اسم العميل" [ref=e222] [cursor=pointer]
                  - columnheader [ref=e224]:
                    - button "الفرع" [ref=e225] [cursor=pointer]
                  - columnheader [ref=e227]:
                    - button "طريقة الدفع" [ref=e228] [cursor=pointer]
                  - columnheader [ref=e230]:
                    - button "العملة" [ref=e231] [cursor=pointer]
                  - columnheader [ref=e233]:
                    - button "Price List" [ref=e234] [cursor=pointer]
                  - columnheader [ref=e236]:
                    - button "Tax Amount" [ref=e237] [cursor=pointer]
                  - columnheader [ref=e239]:
                    - button "Discount" [ref=e240] [cursor=pointer]
                  - columnheader [ref=e242]:
                    - button "Net Total" [ref=e243] [cursor=pointer]
                  - columnheader [ref=e245]:
                    - button "Sales Rep" [ref=e246] [cursor=pointer]
                  - columnheader [ref=e248]:
                    - button "Warehouse" [ref=e249] [cursor=pointer]
                  - columnheader [ref=e251]:
                    - button "Created By" [ref=e252] [cursor=pointer]
                  - columnheader [ref=e254]:
                    - button "Last Modified" [ref=e255] [cursor=pointer]
                  - columnheader "Record actions" [ref=e257]
              - rowgroup [ref=e258]:
                - row [ref=e259] [cursor=pointer]:
                  - cell [ref=e260]:
                    - checkbox "Select invoice 140" [ref=e262]
                  - cell "001000352026140" [ref=e263]
                  - cell [ref=e264]:
                    - button "Open invoice 140" [ref=e265]: "140"
                  - cell "مرحل" [ref=e266]
                  - cell "13/08/2026" [ref=e267]
                  - cell "12/10/2026" [ref=e268]
                  - cell "عام" [ref=e269]
                  - cell "PO-88104" [ref=e270]
                  - cell "200001" [ref=e271]
                  - cell "العميل الاول" [ref=e272]
                  - cell "2 - lastchance" [ref=e273]
                  - cell "Credit" [ref=e274]
                  - cell "EGP" [ref=e275]
                  - cell "Wholesale 2026" [ref=e276]
                  - cell "784.00" [ref=e277]
                  - cell "200.00" [ref=e278]
                  - cell "5,600.00" [ref=e279]
                  - cell "Ahmed Nabil" [ref=e280]
                  - cell "WH-02 Central" [ref=e281]
                  - cell "ahmed.nabil" [ref=e282]
                  - cell "14/08/2026" [ref=e283]
                  - cell [ref=e284]:
                    - group [ref=e286]:
                      - generic "Actions for invoice 140" [ref=e287]
                - row [ref=e290] [cursor=pointer]:
                  - cell [ref=e291]:
                    - checkbox "Select invoice 142" [ref=e293]
                  - cell "001000352026142" [ref=e294]
                  - cell [ref=e295]:
                    - button "Open invoice 142" [ref=e296]: "142"
                  - cell "مرحل" [ref=e297]
                  - cell "13/08/2026" [ref=e298]
                  - cell "13/09/2026" [ref=e299]
                  - cell "عام" [ref=e300]
                  - cell "PO-88190" [ref=e301]
                  - cell "200002" [ref=e302]
                  - cell "customertest" [ref=e303]
                  - cell "2 - lastchance" [ref=e304]
                  - cell "Cash" [ref=e305]
                  - cell "EGP" [ref=e306]
                  - cell "Retail 2026" [ref=e307]
                  - cell "245.00" [ref=e308]
                  - cell "50.00" [ref=e309]
                  - cell "1,750.00" [ref=e310]
                  - cell "Mona Farouk" [ref=e311]
                  - cell "WH-01 Main Store" [ref=e312]
                  - cell "mona.farouk" [ref=e313]
                  - cell "13/08/2026" [ref=e314]
                  - cell [ref=e315]:
                    - group [ref=e317]:
                      - generic "Actions for invoice 142" [ref=e318]
                - row [ref=e321] [cursor=pointer]:
                  - cell [ref=e322]:
                    - checkbox "Select invoice 143" [ref=e324]
                  - cell "001000352026143" [ref=e325]
                  - cell [ref=e326]:
                    - button "Open invoice 143" [ref=e327]: "143"
                  - cell "مرحل" [ref=e328]
                  - cell "13/08/2026" [ref=e329]
                  - cell "13/09/2026" [ref=e330]
                  - cell "عام" [ref=e331]
                  - cell "PO-88213" [ref=e332]
                  - cell "200002" [ref=e333]
                  - cell "customertest" [ref=e334]
                  - cell "2 - lastchance" [ref=e335]
                  - cell "Cash" [ref=e336]
                  - cell "EGP" [ref=e337]
                  - cell "Retail 2026" [ref=e338]
                  - cell "28.00" [ref=e339]
                  - cell "0.00" [ref=e340]
                  - cell "200.00" [ref=e341]
                  - cell "Mona Farouk" [ref=e342]
                  - cell "WH-01 Main Store" [ref=e343]
                  - cell "mona.farouk" [ref=e344]
                  - cell "13/08/2026" [ref=e345]
                  - cell [ref=e346]:
                    - group [ref=e348]:
                      - generic "Actions for invoice 143" [ref=e349]
                - row [ref=e352] [cursor=pointer]:
                  - cell [ref=e353]:
                    - checkbox "Select invoice 144" [ref=e355]
                  - cell "001000352026144" [ref=e356]
                  - cell [ref=e357]:
                    - button "Open invoice 144" [ref=e358]: "144"
                  - cell "مسودة" [ref=e359]
                  - cell "14/08/2026" [ref=e360]
                  - cell "14/09/2026" [ref=e361]
                  - cell "عام" [ref=e362]
                  - cell "PO-88240" [ref=e363]
                  - cell "200002" [ref=e364]
                  - cell "customertest" [ref=e365]
                  - cell "2 - lastchance" [ref=e366]
                  - cell "Cash" [ref=e367]
                  - cell "EGP" [ref=e368]
                  - cell "Retail 2026" [ref=e369]
                  - cell "133.00" [ref=e370]
                  - cell "0.00" [ref=e371]
                  - cell "950.00" [ref=e372]
                  - cell "Mona Farouk" [ref=e373]
                  - cell "WH-01 Main Store" [ref=e374]
                  - cell "mona.farouk" [ref=e375]
                  - cell "14/08/2026" [ref=e376]
                  - cell [ref=e377]:
                    - group [ref=e379]:
                      - generic "Actions for invoice 144" [ref=e380]
                - row [ref=e383] [cursor=pointer]:
                  - cell [ref=e384]:
                    - checkbox "Select invoice 145" [ref=e386]
                  - cell "001000352026145" [ref=e387]
                  - cell [ref=e388]:
                    - button "Open invoice 145" [ref=e389]: "145"
                  - cell "مفتوح" [ref=e390]
                  - cell "14/08/2026" [ref=e391]
                  - cell "13/10/2026" [ref=e392]
                  - cell "عام" [ref=e393]
                  - cell "PO-88251" [ref=e394]
                  - cell "200001" [ref=e395]
                  - cell "العميل الاول" [ref=e396]
                  - cell "2 - lastchance" [ref=e397]
                  - cell "Credit" [ref=e398]
                  - cell "EGP" [ref=e399]
                  - cell "Wholesale 2026" [ref=e400]
                  - cell "448.00" [ref=e401]
                  - cell "100.00" [ref=e402]
                  - cell "3,200.00" [ref=e403]
                  - cell "Ahmed Nabil" [ref=e404]
                  - cell "WH-02 Central" [ref=e405]
                  - cell "ahmed.nabil" [ref=e406]
                  - cell "15/08/2026" [ref=e407]
                  - cell [ref=e408]:
                    - group [ref=e410]:
                      - generic "Actions for invoice 145" [ref=e411]
                - row [ref=e414] [cursor=pointer]:
                  - cell [ref=e415]:
                    - checkbox "Select invoice 146" [ref=e417]
                  - cell "001000352026146" [ref=e418]
                  - cell [ref=e419]:
                    - button "Open invoice 146" [ref=e420]: "146"
                  - cell "معلق" [ref=e421]
                  - cell "15/08/2026" [ref=e422]
                  - cell "15/09/2026" [ref=e423]
                  - cell "عام" [ref=e424]
                  - cell "PO-88277" [ref=e425]
                  - cell "200002" [ref=e426]
                  - cell "customertest" [ref=e427]
                  - cell "2 - lastchance" [ref=e428]
                  - cell "Cash" [ref=e429]
                  - cell "EGP" [ref=e430]
                  - cell "Retail 2026" [ref=e431]
                  - cell "157.00" [ref=e432]
                  - cell "25.00" [ref=e433]
                  - cell "1,120.00" [ref=e434]
                  - cell "Mona Farouk" [ref=e435]
                  - cell "WH-01 Main Store" [ref=e436]
                  - cell "mona.farouk" [ref=e437]
                  - cell "15/08/2026" [ref=e438]
                  - cell [ref=e439]:
                    - group [ref=e441]:
                      - generic "Actions for invoice 146" [ref=e442]
                - row [ref=e445] [cursor=pointer]:
                  - cell [ref=e446]:
                    - checkbox "Select invoice 147" [ref=e448]
                  - cell "001000352026147" [ref=e449]
                  - cell [ref=e450]:
                    - button "Open invoice 147" [ref=e451]: "147"
                  - cell "مرتجع" [ref=e452]
                  - cell "15/08/2026" [ref=e453]
                  - cell "14/10/2026" [ref=e454]
                  - cell "عام" [ref=e455]
                  - cell "PO-88283" [ref=e456]
                  - cell "200001" [ref=e457]
                  - cell "العميل الاول" [ref=e458]
                  - cell "2 - lastchance" [ref=e459]
                  - cell "Credit" [ref=e460]
                  - cell "EGP" [ref=e461]
                  - cell "Wholesale 2026" [ref=e462]
                  - cell "67.00" [ref=e463]
                  - cell "0.00" [ref=e464]
                  - cell "480.00" [ref=e465]
                  - cell "Ahmed Nabil" [ref=e466]
                  - cell "WH-02 Central" [ref=e467]
                  - cell "ahmed.nabil" [ref=e468]
                  - cell "16/08/2026" [ref=e469]
                  - cell [ref=e470]:
                    - group [ref=e472]:
                      - generic "Actions for invoice 147" [ref=e473]
                - row [ref=e476] [cursor=pointer]:
                  - cell [ref=e477]:
                    - checkbox "Select invoice 148" [ref=e479]
                  - cell "001000352026148" [ref=e480]
                  - cell [ref=e481]:
                    - button "Open invoice 148" [ref=e482]: "148"
                  - cell "ملغى" [ref=e483]
                  - cell "16/08/2026" [ref=e484]
                  - cell "16/09/2026" [ref=e485]
                  - cell "عام" [ref=e486]
                  - cell "PO-88301" [ref=e487]
                  - cell "200002" [ref=e488]
                  - cell "customertest" [ref=e489]
                  - cell "2 - lastchance" [ref=e490]
                  - cell "Cash" [ref=e491]
                  - cell "EGP" [ref=e492]
                  - cell "Retail 2026" [ref=e493]
                  - cell "280.00" [ref=e494]
                  - cell "0.00" [ref=e495]
                  - cell "2,000.00" [ref=e496]
                  - cell "Mona Farouk" [ref=e497]
                  - cell "WH-01 Main Store" [ref=e498]
                  - cell "mona.farouk" [ref=e499]
                  - cell "16/08/2026" [ref=e500]
                  - cell [ref=e501]:
                    - group [ref=e503]:
                      - generic "Actions for invoice 148" [ref=e504]
        - generic [ref=e507]:
          - text: "|"
          - navigation "invoices التنقل بين الصفحات" [ref=e509]:
            - generic [ref=e510]:
              - button "الصفحة الأولى" [disabled] [ref=e511]
              - button "الصفحة السابقة" [disabled] [ref=e514]
              - button "صفحة 1" [ref=e517] [cursor=pointer]: "1"
              - button "الصفحة التالية" [disabled] [ref=e518]
              - button "الصفحة الأخيرة" [disabled] [ref=e521]
              - generic [ref=e524]:
                - generic [ref=e525]: الانتقال إلى صفحة
                - spinbutton "الانتقال إلى صفحة" [ref=e526]: "1"
            - generic [ref=e527]: عرض 1–8 من 8
            - generic [ref=e528]:
              - text: صفوف لكل صفحة
              - combobox "صفوف لكل صفحة" [ref=e530] [cursor=pointer]:
                - option "10"
                - option "25" [selected]
                - option "50"
                - option "100"
          - text: "|"
  - text: No conditions set.
  - status
  - text: No groups yet — add one, then drag screens in from the left.
  - button "Prototype controls" [ref=e531] [cursor=pointer]
```

# Test source

```ts
  282 |   await expect(activeFilterSummary).toBeVisible();
  283 | });
  284 | 
  285 | // ---------------------------------------------------------------------
  286 | // Chart open / theme refresh (extends Task 4's components.spec.mjs check
  287 | // with the invoice list explicitly, using the same deterministic ApexCharts
  288 | // spy pattern already established there).
  289 | // ---------------------------------------------------------------------
  290 | test('chart toggle opens the invoice list chart panel', async ({page}, testInfo) => {
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
> 382 |   await summary.click();
      |                 ^ Error: locator.click: Test timeout of 30000ms exceeded.
  383 |   await expect(columnsMenu).toHaveJSProperty('open', true);
  384 |   await page.keyboard.press('Escape');
  385 |   await expect(columnsMenu).toHaveJSProperty('open', false);
  386 |   await expect(summary).toBeFocused();
  387 | 
  388 |   // A pointer interaction outside the popover closes it too.
  389 |   await summary.click();
  390 |   await expect(columnsMenu).toHaveJSProperty('open', true);
  391 |   await page.locator('.list-view .data-list-toolbar input[type="search"]').click();
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
```