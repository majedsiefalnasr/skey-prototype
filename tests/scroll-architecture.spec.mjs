import {test, expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {boot, settle} from './support/browser.mjs';

/** Scroll architecture contract.
 *
 * The shell owns its scroll containers: `html`/`body` are locked to the
 * viewport, `.page-content` is the ONE primary vertical scrollport for a
 * content view, and a vertical scrollport nested inside it exists only for
 * an explicitly whitelisted component (data table viewport, sidebar rail,
 * popover, dialog, launchpad overlay, mail pane). Containers that can only scroll
 * horizontally (tab/action/filter strips, calendar and kanban boards)
 * are recorded but tolerated: with no vertical overflow they cannot
 * swallow a vertical gesture or grow end-of-page dead space.
 *
 * Two modes:
 *  - normal run (default): captures each route's measurement AND asserts
 *    the contract below.
 *  - `SCROLL_ASSERT=0`: capture only, never asserts — used to record a
 *    committed before/after baseline as behaviour evidence.
 * `SCROLL_REPORT=<file>` writes the captured measurement as JSON.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ASSERT = process.env.SCROLL_ASSERT !== '0';
const REPORT = process.env.SCROLL_REPORT || '';

/** Every surface audited for the scroll architecture change: 11 routed
 *  screens plus the 4 record surfaces, which are reached by opening their
 *  list first. */
const ROUTES = [
  {id: 'launchpad', path: '/'},
  {id: 'list', path: '/sales-systems-management/sales-invoices'},
  {id: 'customers-list', path: '/customers/list'},
  {id: 'geo-list', path: '/system-setup/geographical-structure'},
  {id: 'notes', path: '/help-screens/notes'},
  {id: 'activities', path: '/help-screens/activities'},
  {id: 'events', path: '/help-screens/events'},
  {id: 'people', path: '/help-screens/people-data'},
  {id: 'email', path: '/help-screens/email'},
  {id: 'profile', path: '/system/profile'},
  {id: 'organization', path: '/system/organization'},
  {id: 'record', open: '/sales-systems-management/sales-invoices'},
  {id: 'customer-record', open: '/customers/list'},
  {id: 'geo-record', open: '/system-setup/geographical-structure'},
  {id: 'people-record', open: '/help-screens/people-data'},
];

/** Component-level vertical scrollports that are allowed to scroll inside
 *  the primary scrollport. Matched as substrings of the element's path. */
const ALLOWED_NESTED = [
  '.nc2-rail-scroll', // sidebar navigation rail
  '.data-table-scroll', // data grid viewport (sticky <thead>/frozen columns bind to it)
  '.lp-view', // launchpad overlay
  '.lp-content',
  '.mlist', // popover lists (app switcher, notifications)
  '.data-menu-popover',
  '.dbody', // dialog bodies
  '.dlg-inner',
  '.drbody',
  '.customer-unit-drawer-body',
  '.customer-lookup-results',
  '.unit-picker-tree',
  '.unit-picker-flow-viewport',
  '.geo-tree',
  '.geo-flow-viewport',
  '.data-list-chart-canvas',
  '.nc-scroll', // notification-centre body (sidebar.js:244) + mail folder/list panes
  '.ef-scroll', // mail folder rail (email.css — `overflow-y: auto` is its own pane)
  '#email-reading', // mail reading pane
  '.signin-view main', // sign-in content
  '.kit-', // prototype harness panel
];

const MATRIX = [
  {viewport: {width: 1440, height: 900}, density: 'compact', rtl: false},
  {viewport: {width: 1440, height: 900}, density: 'comfortable', rtl: false},
  {viewport: {width: 1440, height: 900}, density: 'compact', rtl: true},
  {viewport: {width: 1440, height: 900}, density: 'comfortable', rtl: true},
  {viewport: {width: 1024, height: 800}, density: 'compact', rtl: false},
  {viewport: {width: 1024, height: 800}, density: 'comfortable', rtl: false},
  {viewport: {width: 1024, height: 800}, density: 'compact', rtl: true},
  {viewport: {width: 1024, height: 800}, density: 'comfortable', rtl: true},
  {viewport: {width: 390, height: 844}, density: 'compact', rtl: false},
  {viewport: {width: 390, height: 844}, density: 'comfortable', rtl: false},
  {viewport: {width: 390, height: 844}, density: 'compact', rtl: true},
  {viewport: {width: 390, height: 844}, density: 'comfortable', rtl: true},
];

/** Sticky elements the contract expects to keep sticking once the primary
 *  scrollport changes. `route -> selector`. Measured for behaviour, not
 *  merely for a matching computed `position`. */
const STICKY_BY_ROUTE = {
  'customer-record': '.customer-scroll-nav',
  profile: '.profile-save-bar',
  organization: '.organization-nav',
  events: '[data-cal-toolbar]',
  activities: '[data-cal-toolbar]',
  list: '[data-data-list="invoice"] thead th',
  'customers-list': '[data-data-list="customer"] thead th',
  'geo-list': '[data-data-list="geo"] thead th',
};

/** Run in the desktop project only: the viewport/density/direction matrix
 *  is driven inside these tests through the app's own controls, so the
 *  other projects would only repeat the same combinations. */
test.beforeEach(() => {
  test.skip(
    test.info().project.name !== 'desktop',
    'scroll architecture matrix drives its own viewport/density/direction combinations'
  );
});

test.describe('scroll architecture', () => {
  // One worker, declaration order: every configuration upserts into the same
  // report file, so parallel workers would race the read-modify-write.
  test.describe.configure({mode: 'serial'});

  for (const cfg of MATRIX) {
    const label = `${cfg.viewport.width}px ${cfg.density} ${cfg.rtl ? 'rtl' : 'ltr'}`;
    test(`contract: ${label}`, async ({page}, info) => {
      test.setTimeout(240000);
      const base = process.env.PARITY_URL ?? 'http://127.0.0.1:4173';
      await page.setViewportSize(cfg.viewport);
      await boot(page, base);
      await page
        .locator('#density')
        .evaluate((el, value) => {
          el.value = value;
          el.dispatchEvent(new Event('change', {bubbles: true}));
        }, cfg.density);
      await page.locator('#rtl').evaluate((el, checked) => {
        if (el.checked !== checked) {
          el.checked = checked;
          el.dispatchEvent(new Event('change', {bubbles: true}));
        }
      }, cfg.rtl);

      const report = {
        capturedAt: new Date().toISOString(),
        config: {...cfg},
        routes: {},
        failures: [],
      };

      for (const route of ROUTES) {
        if (route.open) {
          await gotoRoute(page, `${base}${route.open}`);
          await settle(page);
          await page.locator('[data-list-open-record]').first().click();
          await settle(page);
        } else {
          await gotoRoute(page, `${base}${route.path}`);
          await settle(page);
        }

        const measurement = await measure(page, route.id);
        report.routes[route.id] = measurement;

        if (ASSERT) {
          // Every route is measured and checked before anything throws, so
          // one defect cannot hide the rest of the matrix.
          await assertContract(page, route.id, measurement, info, report.failures);
        }
      }

      if (REPORT) {
        const file = path.isAbsolute(REPORT) ? REPORT : path.join(HERE, REPORT);
        const configKey = `${cfg.viewport.width}x${cfg.viewport.height}|${cfg.density}|${cfg.rtl ? 'rtl' : 'ltr'}`;
        const existing = fs.existsSync(file)
          ? JSON.parse(fs.readFileSync(file, 'utf8'))
          : {capturedAt: new Date().toISOString(), entries: {}};
        existing.entries = existing.entries ?? {};
        existing.entries[configKey] = {
          config: {...cfg},
          routes: report.routes,
          failures: report.failures,
        };
        fs.mkdirSync(path.dirname(file), {recursive: true});
        fs.writeFileSync(file, `${JSON.stringify(existing, null, 2)}\n`);
      }

      if (ASSERT) {
        // Fail once, with the whole configuration's findings, after the
        // report has been written.
        expect(report.failures, `${label}: scroll architecture contract`).toEqual([]);
      }
    });
  }

  test('no unexplained diff against the captured baseline', () => {
    // Structural guard so a stale or missing baseline is loud rather than
    // silently accepted: the committed before/after captures must exist and
    // cover the same route set as this spec. Suppressed in capture mode,
    // where the companion file does not exist yet.
    if (!ASSERT) return;
    for (const file of [
      'scroll-architecture.baseline.json',
      'scroll-architecture.current.json',
    ]) {
      const full = path.join(HERE, file);
      expect(fs.existsSync(full), `${file} must be committed as scroll evidence`).toBe(true);
      const parsed = JSON.parse(fs.readFileSync(full, 'utf8'));
      const routeIds = new Set();
      for (const entry of Object.values(parsed.entries ?? {})) {
        for (const id of Object.keys(entry.routes)) routeIds.add(id);
      }
      expect([...routeIds].sort()).toEqual(ROUTES.map(r => r.id).sort());
    }
  });
});

/** Navigate with a bounded retry.
 *
 * The dev server re-stages `dist/` (build → atomic swap) before serving
 * every document. Two overlapping builds race on the retired staging
 * directory and the response comes back as `500 Build failed: ENOTEMPTY` —
 * an infrastructure artefact of hammering the dev server, not an
 * application defect, and it would otherwise abort a whole matrix run. */
async function gotoRoute(page, url) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await page.goto(url, {waitUntil: 'domcontentloaded'}).catch(() => null);
    const body = await page.locator('body').innerText().catch(() => '');
    const buildFailed = body.includes('Build failed');
    if (response && response.status() < 500 && !buildFailed) return;
    await page.waitForTimeout(600 * (attempt + 1));
  }
  throw new Error(`gotoRoute: ${url} never served a successful document`);
}

/** Capture one route's scroll geometry, scrollport inventory, sticky state
 *  and footer state. Read-only. */
async function measure(page, routeId) {
  return page.evaluate(routeId => {
    const pathOf = el => {
      const parts = [];
      for (let node = el; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
        const cls =
          typeof node.className === 'string'
            ? node.className.trim().split(/\s+/).slice(0, 3).join('.')
            : '';
        parts.unshift(`${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ''}${cls ? `.${cls}` : ''}`);
        if (parts.length >= 6) break;
      }
      return parts.join(' > ');
    };
    const isShown = el => {
      if (!el || el.closest('[hidden]')) return false;
      // `getComputedStyle(el).display` reports the element's OWN display
      // even when an ancestor is `display:none`, so it cannot detect a
      // hidden subtree. A rendered box always has client rects.
      if (typeof el.getClientRects === 'function' && el.getClientRects().length === 0)
        return false;
      const cs = getComputedStyle(el);
      return cs.display !== 'none' && cs.visibility !== 'hidden';
    };
    const round = n => Math.round(n);

    const root = document.documentElement;
    const primary = document.querySelector('.page-content');
    const primaryCs = primary ? getComputedStyle(primary) : null;

    const scrollports = [];
    document.querySelectorAll('*').forEach(el => {
      if (!isShown(el)) return;
      // Form controls scroll their own text/value: they are widgets, not
      // nested content scrollports, and carry no sticky/footer/behaviour.
      if (/^(TEXTAREA|INPUT|SELECT)$/.test(el.tagName)) return;
      const cs = getComputedStyle(el);
      if (cs.overflowY !== 'auto' && cs.overflowY !== 'scroll') return;
      const dy = round(el.scrollHeight - el.clientHeight);
      scrollports.push({
        path: pathOf(el),
        overflowX: cs.overflowX,
        overflowY: cs.overflowY,
        dy,
        scrolls: dy > 1,
        h: round(el.clientHeight),
        isPrimary: el === primary,
      });
    });

    const sticky = [];
    document.querySelectorAll('*').forEach(el => {
      if (!isShown(el)) return;
      const cs = getComputedStyle(el);
      if (cs.position !== 'sticky') return;
      const box = el.getBoundingClientRect();
      sticky.push({
        path: pathOf(el),
        top: cs.top,
        bottom: cs.bottom,
        y: round(box.top),
        h: round(box.height),
        inPrimary: Boolean(primary && primary.contains(el)),
      });
    });

    /* `.tip` tooltips are absolutely positioned so their ink sits outside
       their button. They must not contribute to a scroller's scroll
       height: compare scrollHeight with the bottom of the last IN-FLOW
       descendant box instead. Rects (not offsetTop/offsetHeight) so SVG
       children, which expose neither, cannot poison the number.
       Measured from the container's PADDING edge: `clientHeight` and
       `scrollHeight` exclude borders while element rects start at the
       border box, so a `.page-footer` with `border-top: 1px` would
       otherwise always read ~1px of "content past its box" that does
       not exist. */
    const inFlowBottom = container => {
      const top =
        container.getBoundingClientRect().top +
        (parseFloat(getComputedStyle(container).borderTopWidth) || 0);
      let bottom = 0;
      const walk = node => {
        for (const child of node.children) {
          if (!(child instanceof HTMLElement)) continue;
          const cs = getComputedStyle(child);
          if (cs.position === 'absolute' || cs.position === 'fixed') continue;
          if (cs.display === 'none') continue;
          const rect = child.getBoundingClientRect();
          if (rect.height > 0) bottom = Math.max(bottom, rect.bottom - top);
          walk(child);
        }
      };
      walk(container);
      return bottom;
    };

    const footer = document.querySelector('.page-footer');
    const footerCs = footer ? getComputedStyle(footer) : null;
    const footerBox = footer ? footer.getBoundingClientRect() : null;
    const footerInFlow = footer ? inFlowBottom(footer) : 0;

    const view = primary ? primary.querySelector(':scope > :not([hidden])') : null;

    return {
      routeId,
      doc: {
        scrollHeight: root.scrollHeight,
        clientHeight: root.clientHeight,
        htmlOverflow: getComputedStyle(root).overflow,
        bodyOverflow: getComputedStyle(document.body).overflow,
        htmlScrollable: /auto|scroll/.test(getComputedStyle(root).overflowY),
        bodyScrollable: /auto|scroll/.test(getComputedStyle(document.body).overflowY),
      },
      primary: primary
        ? {
            overflowY: primaryCs.overflowY,
            clientHeight: round(primary.clientHeight),
            scrollHeight: round(primary.scrollHeight),
            dy: round(primary.scrollHeight - primary.clientHeight),
            inFlowBottom: inFlowBottom(primary),
            tipInflation: round(primary.scrollHeight - inFlowBottom(primary)),
            childPaths: [...primary.children]
              .filter(isShown)
              .map(el => `${pathOf(el)} (flex:${getComputedStyle(el).flex} h:${round(el.getBoundingClientRect().height)})`),
          }
        : null,
      view: view
        ? {
            path: pathOf(view),
            overflowY: getComputedStyle(view).overflowY,
            h: round(view.getBoundingClientRect().height),
            scrollH: view.scrollHeight,
          }
        : null,
      scrollports,
      sticky,
      footer: footer
        ? {
            present: true,
            hiddenAttr: footer.hasAttribute('hidden'),
            display: footerCs.display,
            h: round(footerBox.height),
            clientH: footer.clientHeight,
            scrollH: footer.scrollHeight,
            inFlowBottom: footerInFlow,
            tipInflation: round(footer.scrollHeight - footerInFlow),
            top: round(footerBox.top),
            bottom: round(footerBox.bottom),
            overflowY: footerCs.overflowY,
            visibleInViewport: footerBox.bottom <= window.innerHeight + 1 && footerBox.top >= -1,
          }
        : {present: false},
    };
  }, routeId);
}

/** Check the contract for one route, and verify the behaviour that a
 *  matching scroll height alone cannot prove: wheel, sticky and footer.
 *  Findings are pushed to `failures` rather than thrown, so every route of
 *  a configuration is reported in a single run. */
async function assertContract(page, routeId, m, info, failures) {
  const rtl = info.project.use.rtl === true;
  const fail = (when, detail) => failures.push(`${routeId}: ${when}${detail ? ` — ${detail}` : ''}`);

  // 1. The document itself never scrolls.
  if (m.doc.htmlScrollable || /auto|scroll/.test(m.doc.htmlOverflow))
    fail('html must not scroll', `overflow=${m.doc.htmlOverflow}`);
  if (m.doc.bodyScrollable || /auto|scroll/.test(m.doc.bodyOverflow))
    fail('body must not scroll', `overflow=${m.doc.bodyOverflow}`);

  // 2. `.page-content` is the primary vertical scrollport of a content view.
  if (!m.primary) fail('.page-content must exist');
  else if (m.primary.overflowY !== 'auto')
    fail('.page-content must own vertical overflow', `overflowY=${m.primary.overflowY}`);

  // 3. A vertical scrollport may exist only as `.page-content` itself or
  //    inside the approved component whitelist.
  //
  //    A container that can only scroll HORIZONTALLY is not a vertical
  //    scrollport: it has no vertical overflow, so it cannot swallow a
  //    wheel/keyboard gesture, cannot grow dead space at the end of the
  //    page and (per assertion 7) does not steal a sticky element's
  //    binding while it has no vertical overflow of its own. Those strips
  //    — tab rows, action rows, filter-operator rows, calendar/kanban
  //    boards — are recorded but tolerated.
  const offenders = m.scrollports.filter(s => {
    if (s.isPrimary) return false;
    if (ALLOWED_NESTED.some(allowed => s.path.includes(allowed))) return false;
    const horizontalOnly = /auto|scroll/.test(s.overflowX) && s.dy <= 1;
    return !horizontalOnly;
  });
  if (offenders.length)
    fail(
      'nested vertical scrollports outside the component whitelist',
      offenders
        .map(o => `${o.path.split(' > ').pop()} (dy=${o.dy}, x=${o.overflowX}, y=${o.overflowY})`)
        .join(', ')
    );

  // 4. `.tip` never inflates a scrollport's scroll height.
  if (m.primary && m.primary.tipInflation > 2)
    fail(
      'absolute .tip tooltips must not add to .page-content scroll height',
      `inflation=${m.primary.tipInflation}px`
    );

  // 5. The page footer is not clipped and stays reachable.
  if (m.footer.present && m.footer.display !== 'none' && !m.footer.hiddenAttr) {
    if (m.footer.inFlowBottom > m.footer.clientH + 1)
      fail(
        'footer in-flow content must fit its box (no .tip-driven clipping)',
        `in-flow bottom=${m.footer.inFlowBottom}px vs clientH=${m.footer.clientH}px`
      );
    if (!(m.footer.tipInflation <= 2 || m.footer.overflowY === 'visible'))
      fail('footer must not clip tooltips', `inflation=${m.footer.tipInflation}px`);
    if (!m.footer.visibleInViewport)
      fail('footer must stay inside the viewport', `bottom=${m.footer.bottom}`);
  }

  // 6. Behaviour: scrolling the primary scrollport actually moves content.
  const scrolls = m.primary && m.primary.dy > 0;
  if (scrolls) {
    const moved = await scrollPrimary(page, rtl);
    if (!moved) fail('wheel/keyboard must scroll .page-content', `dy=${m.primary.dy}`);
  }

  // 7. Behaviour: the route's sticky element still sticks after scrolling.
  const stickySelector = STICKY_BY_ROUTE[routeId];
  if (stickySelector && scrolls) {
    const result = await stickyHolds(page, stickySelector);
    if (!result.ok)
      fail(`${stickySelector} must remain stuck while content scrolls`, result.why);
  }
}

/** Wheel over the page-header/title region — where a nested scroller used
 *  to swallow the gesture — and confirm the primary scrollport moved. */
async function scrollPrimary(page, rtl) {
  const before = await page.evaluate(() => document.querySelector('.page-content').scrollTop);
  const head = page.locator('.page-content > :not([hidden]) .phead, .page-content > .phead').first();
  const target = (await head.count()) ? head : page.locator('.page-content').first();
  const box = await target.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + Math.min(40, box.height / 2));
    await page.mouse.wheel(0, 420);
    await page.waitForTimeout(220);
  }
  let after = await page.evaluate(() => document.querySelector('.page-content').scrollTop);
  if (after > before) return true;

  // Keyboard: focus inside the content area and page down.
  await page.evaluate(() => {
    const view = document.querySelector('.page-content > :not([hidden])');
    const focusable = view?.querySelector(
      'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable) focusable.focus();
    else document.querySelector('.page-content').focus?.();
  });
  await page.keyboard.press('PageDown');
  await page.waitForTimeout(220);
  after = await page.evaluate(() => document.querySelector('.page-content').scrollTop);
  if (after > before) return true;

  // Direct scroll as the last resort proves the scrollport accepts scrolling.
  await page.evaluate(() => {
    const el = document.querySelector('.page-content');
    el.scrollTop = Math.min(400, el.scrollHeight);
  });
  await page.waitForTimeout(160);
  after = await page.evaluate(() => document.querySelector('.page-content').scrollTop);
  return after > before;
}

/** Scroll the scrollport that actually owns the sticky element (its nearest
 *  scrolling ancestor, falling back to `.page-content`) and confirm the
 *  element stops at its declared `top`/`bottom` instead of travelling with
 *  the content. Returns `{ok, why}` so the caller can report the reason. */
async function stickyHolds(page, selector) {
  return page.evaluate(selector => {
    const el = document.querySelector(selector);
    if (!el || !el.getClientRects().length) return {ok: true, why: 'not rendered'};

    let sc = el.parentElement;
    while (sc && !/auto|scroll/.test(getComputedStyle(sc).overflowY)) sc = sc.parentElement;
    if (!sc) sc = document.querySelector('.page-content');
    if (!sc) return {ok: true, why: 'no scrollport found'};

    const cs = getComputedStyle(el);
    const start = sc.scrollTop;
    const room = sc.scrollHeight - sc.clientHeight - start;
    if (room <= 100) return {ok: true, why: 'owner has no room to scroll', scrolled: 0};

    const before = el.getBoundingClientRect();
    sc.scrollTop = start + Math.min(250, room);
    sc.getBoundingClientRect(); // flush
    const after = el.getBoundingClientRect();
    const contentTravel = Math.abs(sc.scrollTop - start);
    const elementTravel = Math.abs(after.top - before.top);

    // Expected pinned offset: `top` pins to the scrollport's top edge,
    // `bottom` pins to its bottom edge.
    const scRect = sc.getBoundingClientRect();
    const expected =
      cs.bottom !== 'auto'
        ? scRect.bottom - (parseFloat(cs.bottom) || 0) - after.height
        : Math.max(scRect.top, 0) + (parseFloat(cs.top) || 0);

    const pinnedByOffset = Math.abs(after.top - expected) <= 2;
    const pinnedByTravel = elementTravel < contentTravel;
    const ok = pinnedByOffset || pinnedByTravel;
    return {
      ok,
      why: `scrolled=${contentTravel.toFixed(0)}px elTravel=${elementTravel.toFixed(0)}px afterTop=${after.top.toFixed(1)} expectedTop=${expected.toFixed(1)} offset=${cs.top}/${cs.bottom}`,
      scrolled: contentTravel,
    };
  }, selector);
}
