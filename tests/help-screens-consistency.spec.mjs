import {test, expect} from '@playwright/test'

const names = ['notes', 'activities', 'events', 'email']
async function control(page, id, value) {
  await page.locator('#' + id).evaluate((el, value) => {
    if (el.type === 'checkbox') el.checked = value
    else el.value = value
    el.dispatchEvent(new Event('change', {bubbles: true}))
  }, value)
}
async function go(page, name, rtl = false) {
  await page.goto('/help-screens/' + name)
  await control(page, 'simulate-loading', false)
  await control(page, 'rtl', rtl)
  if (await page.locator('#kit-hide').isVisible()) await page.locator('#kit-hide').click()
  await expectLocale(page, rtl)
  await expect(page.locator('.' + name + '-view')).toBeVisible()
}
// An RTL run must really be Arabic: the app sets both on <html>.
async function expectLocale(page, rtl) {
  await expect(page.locator('html')).toHaveAttribute('dir', rtl ? 'rtl' : 'ltr')
  await expect(page.locator('html')).toHaveAttribute('lang', rtl ? 'ar' : 'en')
}
async function entities(page, type) {
  return page.evaluate(type => JSON.parse(sessionStorage.getItem('skey-proto-collab')).entities[type], type)
}
const isRtl = testInfo => Boolean(testInfo.project.use.rtl)

// Runs in the page: WCAG ratios for an element's text over its composited
// background, and for its outline over the surface around it. Chromium
// reports some colors as `color(srgb r g b / a)` with 0–1 channels.
const measureContrast = el => {
  const parse = value => {
    const n = (value.match(/[\d.]+/g) || []).map(Number)
    const rgb = value.startsWith('color(') ? n.slice(0, 3).map(x => x * 255) : n.slice(0, 3)
    return [...rgb, n[3] ?? 1]
  }
  const lum = rgb => rgb.slice(0, 3).map(x => x / 255).map(x => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4).reduce((sum, x, i) => sum + x * [0.2126, 0.7152, 0.0722][i], 0)
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
  const over = (top, under, alpha) => under.map((x, i) => top[i] * alpha + x * (1 - alpha))
  const chain = []
  for (let p = el; p; p = p.parentElement) chain.unshift(p)
  let bg = [255, 255, 255], around = bg
  for (const p of chain) {
    const c = parse(getComputedStyle(p).backgroundColor)
    bg = over(c, bg, c[3])
    if (p === el.parentElement) around = bg
  }
  const style = getComputedStyle(el)
  const fg = parse(style.color)
  return {
    text: ratio(over(fg, bg, fg[3] * parseFloat(style.opacity)), bg),
    ring: style.outlineStyle === 'none' ? 0 : ratio(parse(style.outlineColor), around),
    ringWidth: parseFloat(style.outlineWidth),
    opacity: parseFloat(style.opacity),
    color: style.color,
  }
}

test('note identity remains readable and sortable at narrow widths', async ({page}, info) => {
  await go(page, 'notes', isRtl(info))
  await page.locator('.notes-view [data-view-menu] summary').click()
  await page.locator('[data-view-select="list"]').click()
  const title = page.locator('[data-notes-grid] th').first()
  expect((await title.boundingBox()).width).toBeGreaterThanOrEqual(190)
  await page.locator('[data-sort="title"]').click()
  await expect(title).toHaveAttribute('aria-sort', 'ascending')
  const row = page.locator('[data-row-open]').first()
  await row.click()
  await expect(page.locator('#collab-panel')).toBeVisible()
})

for (const name of ['notes', 'activities', 'events']) {
  test(`${name}: floating labels and inline inputs stay readable`, async ({page}, info) => {
    await go(page, name, isRtl(info))
    await page.locator('.' + name + '-view [data-collab-new]').click()
    await control(page, 'input-style', 'floated')
    const textarea = page.locator('#collab-panel textarea').first()
    await textarea.fill('User text must stay visible after blur.')
    await page.locator('[data-panel-save]').focus()
    const position = await textarea.evaluate(el => ({
      input: el.getBoundingClientRect().top + parseFloat(getComputedStyle(el).paddingTop),
      labelBottom: el.parentElement.querySelector('label').getBoundingClientRect().bottom,
    }))
    expect(position.labelBottom).toBeLessThanOrEqual(position.input)
    await control(page, 'input-style', 'inline')
    const overflow = await page.locator('#collab-panel').evaluate(el => ({width:el.clientWidth, scroll:el.scrollWidth}))
    expect(overflow.scroll).toBeLessThanOrEqual(overflow.width + 1)
    if (name === 'activities') {
      expect((await page.locator('[data-ms="activity-assignee"]').boundingBox()).width).toBeGreaterThan(150)
    }
    await expect(textarea).toHaveValue('User text must stay visible after blur.')
  })
}

test('calendar supports keyboard navigation, retained focus, readable narrow columns', async ({page}, info) => {
  await go(page, 'events', isRtl(info))
  const slot = page.locator('[data-cal-slot="2026-10-13"]')
  await slot.focus()
  await page.keyboard.press(isRtl(info) ? 'ArrowLeft' : 'ArrowRight')
  await expect(page.locator('[data-cal-slot="2026-10-14"]')).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.locator('[data-cal-slot="2026-10-21"]')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#event-start')).toHaveValue('2026-10-21T09:00')
  await page.locator('[data-panel-close]').click()
  await page.locator('[data-cal-next]').click()
  await expect(page.locator('[data-cal-next]')).toBeFocused()
  const width = await page.locator('[data-cal-month] [data-date]').first().evaluate(el=>el.getBoundingClientRect().width)
  expect(width).toBeGreaterThanOrEqual(118)
  await page.locator('[data-cal-modes] [data-value="week"]').click()
  expect((await page.locator('[data-cal-week]').boundingBox()).width).toBeGreaterThanOrEqual(840)
})

test('density changes card and calendar content, not only surrounding chrome', async ({page}, info) => {
  for (const name of ['notes', 'activities', 'events', 'email']) {
    await go(page, name, isRtl(info))
    const target = page.locator('.' + name + '-view').locator(name === 'events' ? '[data-date]' : name === 'email' ? '.email-list-row' : '[data-card-open]').first()
    const heights = []
    for (const mode of ['compact', 'default', 'comfortable']) {
      await control(page, 'density', mode)
      heights.push((await target.boundingBox()).height)
    }
    expect(heights[0], name).toBeLessThan(heights[1])
    expect(heights[1], name).toBeLessThan(heights[2])
    await control(page, 'density', 'default')
  }
})

test('shared text controls have readable contrast in both dark modes', async ({page}) => {
  for (const more of [false, true]) {
    for (const name of ['notes', 'events']) {
      await go(page, name)
      await control(page, 'theme', 'dark')
      await control(page, 'high-contrast', more)
      const button = page.locator(name === 'notes' ? '[data-toggle-column]' : '[data-cal-today]')
      const {text} = await button.evaluate(measureContrast)
      expect(text, `${name}, high contrast ${more}`).toBeGreaterThanOrEqual(4.5)
    }
  }
})

// One representative of each control family per screen: primary action,
// toolbar menu, plain/subtle buttons, mailbox rows.
const STATE_CONTROLS = {
  notes: ['[data-collab-new]', '[data-quick-menu] summary', '[data-toggle-column]'],
  activities: ['[data-collab-new]', '[data-quick-menu] summary'],
  events: ['[data-cal-today]', '[data-cal-next]', '[data-cal-modes] [data-value="week"]'],
  email: ['.email-compose', '[data-folder="sent"]', '[data-rail-toggle]'],
}
for (const [mode, more] of [['default', false], ['high contrast', true]]) for (const theme of ['light', 'dark']) {
  test(`${mode} ${theme}: enabled, hover, focus and disabled states stay readable`, async ({page}, info) => {
    test.skip(Boolean(info.project.use.isMobile), 'Hover needs a fine pointer.')
    for (const [name, selectors] of Object.entries(STATE_CONTROLS)) {
      await go(page, name)
      await control(page, 'theme', theme)
      await control(page, 'high-contrast', more)
      for (const selector of selectors) {
        const where = `${mode} ${theme} ${name} ${selector}`
        const target = page.locator(`.${name}-view ${selector}`).first()
        const enabled = await target.evaluate(measureContrast)
        expect(enabled.text, `${where} enabled`).toBeGreaterThanOrEqual(4.5)
        await target.hover()
        await expect.poll(async () => (await target.evaluate(measureContrast)).text, {message: `${where} hover`}).toBeGreaterThanOrEqual(4.5)
        await page.mouse.move(0, 0)
        await page.keyboard.press('Shift')
        await target.focus()
        // WCAG 1.4.11: the focus indicator needs 3:1 against its surroundings.
        await expect.poll(async () => (await target.evaluate(measureContrast)).ring, {message: `${where} focus ring`}).toBeGreaterThanOrEqual(3)
        expect((await target.evaluate(measureContrast)).ringWidth, `${where} focus width`).toBeGreaterThanOrEqual(2)
        await target.evaluate(el => el.blur())
        if (await target.evaluate(el => el.tagName === 'BUTTON')) {
          // Disabled controls are exempt from WCAG contrast; they must still
          // look different from enabled ones and stay legible.
          const disabled = await target.evaluate((el, source) => {
            el.disabled = true
            const result = (0, eval)(`(${source})`)(el)
            el.disabled = false
            return result
          }, measureContrast.toString())
          expect(disabled.opacity < enabled.opacity || disabled.color !== enabled.color, `${where} disabled looks distinct`).toBe(true)
          expect(disabled.text, `${where} disabled legible`).toBeGreaterThanOrEqual(2)
        }
      }
    }
  })
}

test('Arabic translates generated controls while preserving record content', async ({page}) => {
  for (const name of names) {
    await go(page, name, true)
    const root=page.locator('.'+name+'-view')
    await expect(root).not.toContainText('${t(')
    if(name === 'notes') {
      await expect(root.locator('[data-quick-menu] summary')).toContainText('كل الملاحظات')
      await expect(root.locator('[data-card-open]').first()).toContainText('Month-end checklist')
    } else if(name === 'activities') {
      await expect(root.locator('[data-quick-menu] summary')).toContainText('كل الأنشطة')
      await expect(root).toContainText('متأخر')
    } else if(name === 'events') {
      await expect(root.locator('[data-cal-today]')).toHaveText('اليوم')
      await expect(root.locator('[data-cal-modes]')).toContainText('شهر')
      await expect(root.locator('[data-cal-month]')).toContainText('الأحد')
    } else {
      await expect(root.locator('h1')).toHaveText('البريد الداخلي')
      await expect(root.locator('.email-compose')).toContainText('إنشاء رسالة')
      await expect(root.locator('[data-mail-folder-title]')).toHaveText('الوارد')
    }
    if(name !== 'email') {
      await root.locator('[data-collab-new]').click()
      await expect(page.locator('[data-panel-save]')).toHaveText('حفظ')
      await page.locator('[data-panel-close]').click()
    }
    await control(page, 'rtl', false)
    await expect(root.locator('h1')).toHaveText(name === 'email' ? 'Internal Mail' : name[0].toUpperCase()+name.slice(1))
  }
})

for(const [name,type,input] of [['notes','note','note-title'],['activities','activity','activity-summary'],['events','event','event-title']]) {
  test(`${name}: failed save retains input, consumes failure once, retries without duplicates`, async ({page}, info) => {
    await go(page,name,isRtl(info))
    await page.locator('.'+name+'-view [data-collab-new]').click()
    await page.locator('#'+input).fill('Consistency failure check')
    const before=await page.evaluate(()=>sessionStorage.getItem('skey-proto-collab'))
    await control(page,'failsim',true)
    await page.locator('[data-panel-save]').click()
    await expect(page.locator('#toasts')).toContainText(isRtl(info)?'تعذر تنفيذ الإجراء':'Action failed')
    expect(await page.evaluate(()=>sessionStorage.getItem('skey-proto-collab'))).toEqual(before)
    await expect(page.locator('#'+input)).toHaveValue('Consistency failure check')
    await expect(page.locator('#failsim')).not.toBeChecked()
    await page.locator('[data-panel-save]').click()
    await expect(page.locator('#collab-panel')).toBeHidden()
    expect((await entities(page,type)).filter(e=>(e.title||e.summary)==='Consistency failure check')).toHaveLength(1)
  })
}

test('mail failure keeps the draft and recipients, retry sends once', async ({page}, info) => {
  await go(page,'email',isRtl(info))
  await page.locator('.email-compose').click()
  await page.locator('#email-compose-to').fill('Mariam')
  await page.getByRole('option',{name:/Mariam Adel/}).click()
  await page.locator('#email-compose-subject').fill('Consistency mail')
  await page.locator('#email-compose-body').fill('Retain this message')
  await control(page,'failsim',true)
  await page.locator('.email-send').click()
  await expect(page.locator('#toasts')).toContainText(isRtl(info)?'تعذر تنفيذ الإجراء':'Action failed')
  await expect(page.locator('#email-compose-body')).toHaveValue('Retain this message')
  expect((await entities(page,'mail')).find(e=>e.subject==='Consistency mail').folder).toBe('drafts')
  // The error flag stays up (ADS: never auto-dismiss) and must not cover Send.
  const flag = page.locator('#toasts .toast.bad')
  await expect(flag).toBeVisible()
  await expect(flag).toHaveAttribute('role', 'alert')
  const [send, flagBox] = [await page.locator('.email-send').boundingBox(), await flag.boundingBox()]
  const apart = (a, b) => a.y + a.height <= b.y || b.y + b.height <= a.y || a.x + a.width <= b.x || b.x + b.width <= a.x
  expect(apart(flagBox, send), 'flag overlaps Send').toBe(true)
  expect(await page.locator('.email-send').evaluate(el => {
    const r = el.getBoundingClientRect()
    return el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2))
  })).toBe(true)
  await page.locator('.email-send').click()
  await expect(flag).toBeVisible()
  await expect(page.locator('#email-compose-body')).toHaveCount(0)
  const sent=(await entities(page,'mail')).filter(e=>e.subject==='Consistency mail')
  expect(sent).toHaveLength(1)
  expect(sent[0].folder).toBe('sent')
})

// Every editor control matches the app's form field: 34px, bordered once,
// drawn select arrow. Multi-selects are one box with a borderless search.
for (const name of ['notes', 'activities', 'events', 'people-data']) {
  test(`${name}: editor controls follow the app form field`, async ({page}, info) => {
    if (name === 'people-data') await goPeople(page, isRtl(info))
    else await go(page, name, isRtl(info))
    await page.locator('[data-collab-new]').first().click()
    const panel = page.locator(name === 'people-data' ? '.people-record-view' : '#collab-panel')
    await expect(panel).toBeVisible()
    await panel.locator('details').evaluateAll(els => els.forEach(el => { el.open = true }))
    const controls = await panel.evaluate(root => [...root.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select')]
      .filter(el => el.getClientRects().length)
      .map(el => {
        const s = getComputedStyle(el)
        return {id: el.id, ms: el.matches('[data-ms-input]'), select: el.tagName === 'SELECT', height: el.getBoundingClientRect().height, border: s.borderTopWidth, appearance: s.appearance, font: s.fontSize}
      }))
    expect(controls.length).toBeGreaterThan(0)
    for (const c of controls) {
      if (c.ms) {
        expect(c.border, `${c.id} search sits inside the box`).toBe('0px')
        continue
      }
      // The app's rec-field controls grow to a 44px touch target on touch screens.
      expect(c.height, `${c.id} height`).toBe(info.project.use.hasTouch ? 44 : 34)
      expect(c.border, `${c.id} border`).toBe('1px')
      expect(c.font, `${c.id} type size`).toBe('14px')
      if (c.select) expect(c.appearance, `${c.id} drawn arrow`).toBe('none')
    }
    for (const box of await panel.locator('[data-ms] > div').all()) {
      // One bordered box: a row of chips and the search, wrapping to a second
      // row only when they do not fit (two 44px touch rows on a phone).
      expect((await box.boundingBox()).height, 'multi-select is one compact box').toBeLessThanOrEqual(info.project.use.hasTouch ? 100 : 62)
    }
    for (const summary of await panel.locator('summary').all()) {
      await expect(summary, 'disclosures use the app row, not the native triangle').toHaveCSS('list-style-type', 'none')
    }
  })
}

test('the selection deck is a read-only pile: overlapping, inset by depth, capped', async ({page}, info) => {
  test.skip(Boolean(info.project.use.isMobile), 'Phones show the checked rows instead of the deck.')
  await go(page, 'email', isRtl(info))
  const rows = page.locator('.email-view .email-list-row')
  const count = await rows.count()
  for (let i = 0; i < count; i++) await rows.nth(i).locator('[data-mail-check]').check()
  const cards = page.locator('.email-sel-card')
  await expect(cards).toHaveCount(Math.min(count, 5))
  await expect(page.locator('.email-sel-deck [tabindex], .email-sel-deck button, .email-sel-deck a')).toHaveCount(0)
  const boxes = await cards.evaluateAll(els => els.map(el => el.getBoundingClientRect().toJSON()))
  for (let i = 1; i < boxes.length; i++) {
    expect(boxes[i].top, 'each card tucks under the next').toBeLessThan(boxes[i - 1].bottom)
    expect(boxes[i].width, 'nearer cards are wider').toBeGreaterThan(boxes[i - 1].width)
  }
  await cards.last().click()
  await expect(page.locator('.email-reading-body')).toHaveCount(0)
  await expect(page.locator('.email-sel-card')).toHaveCount(Math.min(count, 5))
})

test('checked messages always expose the selection bar, including on phones', async ({page}, info) => {
  await go(page,'email',isRtl(info))
  const rows = page.locator('.email-view .email-list-row')
  const ids = [await rows.nth(0).getAttribute('data-id'), await rows.nth(1).getAttribute('data-id')]
  await rows.nth(0).locator('[data-mail-check]').check()
  await rows.nth(1).locator('[data-mail-check]').check()
  const bar = page.locator('[role="toolbar"][data-mail-toolbar], [data-mail-toolbar] [role="toolbar"]')
  await expect(bar).toBeVisible()
  await expect(bar).toContainText(isRtl(info) ? '2 محدد' : '2 selected')
  await expect(page.locator('.email-view .email-list')).toBeVisible()
  await bar.locator('[data-bulk="archive"]').click()
  await expect.poll(() => page.evaluate(ids => {
    const saved = JSON.parse(sessionStorage.getItem('skey-proto-collab') || 'null')
    return saved ? saved.entities.mail.filter(m => ids.includes(m.id)).map(m => m.folder) : []
  }, ids)).toEqual(['archive','archive'])
})

// People Data: its fixed-width columns used to squeeze Name to 0px on a
// phone, so the next cell sat over the name button and swallowed taps.
async function goPeople(page, rtl) {
  await page.goto('/help-screens/people-data')
  await control(page, 'simulate-loading', false)
  await control(page, 'rtl', rtl)
  if (await page.locator('#kit-hide').isVisible()) await page.locator('#kit-hide').click()
  await expectLocale(page, rtl)
  await expect(page.locator('.people-view table')).toBeVisible()
}
const personRow = (page, name) => page.locator('.people-view [data-row-open]', {hasText: name})

test('people locale changes refresh conversion labels without resetting view or data', async ({page}) => {
  await goPeople(page, false)
  const root=page.locator('.people-view')
  const storedBefore=await page.evaluate(()=>sessionStorage.getItem('skey-proto-collab'))
  await root.locator('[data-quick-menu] summary').click()
  await root.locator('[data-quick-filter="contact"]').click()
  await root.locator('[data-collab-search]').fill('Khaled')
  for(const view of ['list','cards']) {
    if(view==='cards') {
      await root.locator('[data-view-menu] summary').click()
      await root.locator('[data-view-select="cards"]').click()
    }
    for(const rtl of [true,false]) {
      await control(page,'rtl',rtl)
      await expectLocale(page,rtl)
      expect(await page.evaluate(async()=>{
        const {uiLocale}=await import('/concepts/app/core/locale.js')
        return {locale:uiLocale.getLocale(),customer:uiLocale.t('Customer')}
      })).toEqual({locale:rtl?'ar':'en',customer:rtl?'العميل':'Customer'})
      await expect(root.locator('h1')).toHaveText(rtl?'بيانات الأشخاص':'People Data')
      await expect(root.locator('[data-collab-search]')).toHaveValue('Khaled')
      await expect(root.locator('[data-quick-filter="contact"]')).toHaveAttribute('aria-checked','true')
      await expect(root.locator('[data-row-open]')).toHaveCount(1)
      const record=view==='list'?root.locator('tbody tr'):root.locator('[data-list-row-key="per-3"]')
      await expect(record).toContainText(rtl?'Converted to العميل':'Converted to Customer')
      await expect(record).toContainText('Khaled Ibrahim')
      await expect(root.locator(view==='list'?'[data-people-grid]':'.data-card-grid')).toBeVisible()
      expect(await page.evaluate(()=>sessionStorage.getItem('skey-proto-collab'))).toBe(storedBefore)
    }
  }
})

async function expectTappable(locator, label) {
  await locator.scrollIntoViewIfNeeded()
  expect(await locator.evaluate(el => {
    const r = el.getBoundingClientRect()
    return r.width >= 44 && el.contains(document.elementFromPoint(r.left + Math.min(r.width / 2, 40), r.top + r.height / 2))
  }), `${label} is the element under its own tap point`).toBe(true)
}

test('people rows keep a readable name and open their record at every width', async ({page}, info) => {
  await goPeople(page, isRtl(info))
  const name = page.locator('[data-people-grid] th').first()
  expect((await name.boundingBox()).width).toBeGreaterThanOrEqual(190)
  for (const [person, status] of [['Ahmed Ali', 'Lead'], ['Khaled Ibrahim', 'Contact'], ['Sara Mahmoud', null]]) {
    await expectTappable(personRow(page, person), person)
    if (info.project.use.hasTouch) await personRow(page, person).tap()
    else await personRow(page, person).click()
    await expect(page.locator('.people-record-view')).toBeVisible()
    await expect(page.locator('#collab-panel')).toBeHidden()
    await expect(page.locator('.people-record-view')).toContainText(person)
    if (status && !isRtl(info)) await expect(page.locator('.people-record-view dd .badge.gray').first()).toHaveText(status)
    await page.locator('.people-record-view [data-panel-close]').click()
    await expect(page.locator('#collab-panel')).toBeHidden()
  }
})

test('people page actions work from a tapped row: archive, find in Archived, convert', async ({page}, info) => {
  await goPeople(page, isRtl(info))
  const menuItem = label => page.locator('.people-record-view [data-panel-menu-list] [role="menuitem"]', {hasText: label})
  await personRow(page, 'Sara Mahmoud').click()
  await page.locator('.people-record-view [data-panel-menu]').click()
  await menuItem(isRtl(info) ? 'الأرشيف' : 'Archive').click()
  await expect(page.locator('.people-view table')).not.toContainText('Sara Mahmoud')
  await page.locator('.people-view [data-quick-menu] summary').click()
  await page.locator('.people-view [data-quick-filter="archived"]').click()
  await expectTappable(personRow(page, 'Sara Mahmoud'), 'archived Sara Mahmoud')
  await personRow(page, 'Sara Mahmoud').click()
  await expect(page.locator('.people-record-view')).toContainText('Sara Mahmoud')
  await page.locator('.people-record-view [data-panel-close]').click()
  await page.locator('.people-view [data-clear-filters]').click()
  await personRow(page, 'Ahmed Ali').click()
  await page.locator('.people-record-view [data-panel-menu]').click()
  await menuItem(/Convert to Customer|عميل/).click()
  await page.locator('#collab-confirm [data-confirm-ok]').click()
  await expect(page.locator('.people-view tr', {hasText: 'Ahmed Ali'}).first()).toContainText(isRtl(info) ? /عميل/ : 'Converted to Customer')
})

test('a new person can be saved and other rows stay tappable while its flag shows', async ({page}, info) => {
  await goPeople(page, isRtl(info))
  await page.locator('.people-view [data-collab-new]').click()
  await page.locator('#person-name-en').fill('Phone Contact')
  await page.locator('[data-contact-value]').first().fill('+20 111 555 0100')
  await page.locator('.people-record-view [data-panel-save]').click()
  await expect(page.locator('.people-record-view')).toBeVisible()
  await page.locator('.people-record-view [data-panel-close]').click()
  await expect(page.locator('#collab-panel')).toBeHidden()
  await expect(page.locator('#toasts .toast').first()).toBeVisible()
  await expect(page.locator('.people-view table')).toContainText('Phone Contact')
  // The flag stays up; the list can be scrolled out from under it.
  await page.locator('.people-view [data-collab-body]').evaluate(el => { el.scrollTop = el.scrollHeight })
  await expect(page.locator('#toasts .toast').first()).toBeVisible()
  for (const person of ['Phone Contact', 'Sara Mahmoud']) {
    await expectTappable(personRow(page, person), person)
    await personRow(page, person).click()
    await expect(page.locator('.people-record-view')).toContainText(person)
    await page.locator('.people-record-view [data-panel-close]').click()
  }
})

test('phones switch mailboxes with the select and read one message at a time', async ({page}, info) => {
  test.skip(!info.project.use.isMobile, 'Phones swap the mailbox rail for a select and show one pane.')
  const rtl = isRtl(info)
  await go(page, 'email', rtl)
  const list = page.locator('.email-view .email-list')
  await expect(page.locator('[data-folders]')).toBeHidden()
  await page.locator('[data-folder-select]').selectOption('sent')
  await expect(page.locator('[data-mail-folder-title]')).toHaveText(rtl ? 'المرسل' : 'Sent')
  await page.locator('[data-folder-select]').selectOption('inbox')
  await expect(page.locator('[data-mail-folder-title]')).toHaveText(rtl ? 'الوارد' : 'Inbox')
  await page.locator('.email-view .email-list-row').first().tap()
  await expect(list).toBeHidden()
  await expect(page.locator('.email-reading-body')).toBeVisible()
  const back = page.locator('[data-mail-back]')
  await expect(back).toHaveText(rtl ? 'رجوع' : 'Back')
  await back.tap()
  await expect(list).toBeVisible()
  await expect(page.locator('#email-reading')).toBeHidden()
})

test('translated copy keeps its spacing and never shows template code', async ({page}) => {
  await go(page, 'email')
  await page.locator('.email-view .email-list-row', {hasText: 'Payment scheduled'}).click()
  const reading = page.locator('#email-reading')
  await expect(reading.locator('h3', {hasText: 'Related items'})).toHaveText('Related items (0)')
  await expect(reading.locator('[data-related-empty]')).toHaveText('No related items yet. Link existing work or create something new from here.')
  await expect(reading.locator('label[for="email-quick-reply"]')).toHaveText(/^Reply to \S/)
  const unread = page.locator('.email-view .email-list-row.unread').first()
  expect(await unread.evaluate(el => el.textContent.replace(/\s+/g, ' '))).toMatch(/Unread\. \S/)
  await go(page, 'notes')
  const pinned = page.locator('.notes-view [data-card-open]', {has: page.locator('.sr-only')}).first()
  expect(await pinned.evaluate(el => el.textContent.replace(/\s+/g, ' '))).toMatch(/Pinned\. \S/)
  for (const name of names) {
    await go(page, name)
    await expect(page.locator('body')).not.toContainText('${t(')
  }
})

test('mail header matches the app and breadcrumb returns to Help Screens', async ({page}, info) => {
  await go(page,'notes',isRtl(info))
  const font=await page.locator('.notes-view h1').evaluate(el=>getComputedStyle(el).fontSize)
  await go(page,'email',isRtl(info))
  await expect(page.locator('.email-view h1')).toHaveCSS('font-size',font)
  await page.locator('.email-back').click()
  await expect(page).toHaveURL(/\/help-screens$/)
})

test('font and custom accent survive reload and appearance section remount', async ({page}) => {
  await page.goto('/system/profile?section=appearance')
  await control(page,'simulate-loading',false)
  if(await page.locator('#kit-hide').isVisible()) await page.locator('#kit-hide').click()
  await page.locator('#appearance-font-family').selectOption('Inter')
  await page.locator('#appearance-custom-hex').fill('#7A3E9D')
  await page.locator('#appearance-custom-hex').press('Enter')
  const accent=await page.locator('html').evaluate(el=>el.style.getPropertyValue('--accent'))
  for(const name of names) {
    await page.goto('/help-screens/'+name)
    await expect(page.locator('.'+name+'-view h1')).toHaveCSS('font-family', /Inter/)
    expect(await page.locator('html').evaluate(el=>el.style.getPropertyValue('--accent'))).toBe(accent)
  }
  await page.goto('/system/profile?section=appearance')
  await expect(page.locator('#appearance-font-family')).toHaveValue('Inter')
  await expect(page.locator('#appearance-custom-hex')).toHaveValue('#7A3E9D')
})
