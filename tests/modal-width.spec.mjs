import {expect, test} from '@playwright/test'

const BASE_URL = process.env.PARITY_URL ?? 'http://127.0.0.1:4173'
const ADS_WIDTHS = [400, 600, 800, 968]

test('every sized modal renders at an ADS width at 1440px, including the wide state', async ({page}) => {
  test.skip(page.viewportSize().width !== 1440, 'ADS steps are measured at 1440px; narrower viewports cap at 94-96vw')
  await page.route('https://cdn.jsdelivr.net/**', route => route.abort())
  await page.goto(`${BASE_URL}/concepts/app-shell.html`)
  await expect(page.locator('.skeleton-overlay')).toBeHidden()
  const widths = await page.evaluate(() => {
    const measure = element => {
      const forced = []
      for (let node = element; node && node !== document.documentElement; node = node.parentElement) {
        if (getComputedStyle(node).display === 'none') {
          forced.push(node)
          node.style.setProperty('display', 'block', 'important')
        }
      }
      const width = Math.round(element.getBoundingClientRect().width)
      for (const node of forced) node.style.removeProperty('display')
      return width
    }
    const rows = []
    for (const element of document.querySelectorAll('.dlg, .kbdsheet')) {
      const name = element.getAttribute('aria-label') || element.id || element.className.split(' ').slice(0, 2).join(' ')
      rows.push([name, measure(element)])
      if (/\[&\.wide\]/.test(element.className)) {
        const hadWide = element.classList.contains('wide')
        element.classList.add('wide')
        rows.push([`${name} (wide)`, measure(element)])
        if (!hadWide) element.classList.remove('wide')
      }
    }
    return rows
  })
  expect(widths.length).toBeGreaterThan(30)
  expect(widths.filter(([, width]) => !ADS_WIDTHS.includes(width))).toEqual([])
})

test('every sized modal fills the screen below 480px', async ({page}) => {
  test.skip(page.viewportSize().width >= 480, 'ADS makes the modal full screen below 30rem only')
  await page.route('https://cdn.jsdelivr.net/**', route => route.abort())
  await page.goto(`${BASE_URL}/concepts/app-shell.html`)
  await expect(page.locator('.skeleton-overlay')).toBeHidden()
  const boxes = await page.evaluate(() => {
    const rows = []
    for (const element of document.querySelectorAll('.dlg, .kbdsheet')) {
      let scrim = element.parentElement
      while (getComputedStyle(scrim).position !== 'fixed') scrim = scrim.parentElement
      const forced = []
      const force = (node, display) => {
        forced.push(node)
        node.style.setProperty('display', display, 'important')
      }
      for (let node = scrim.parentElement; node && node !== document.body; node = node.parentElement) {
        if (getComputedStyle(node).display === 'none') force(node, 'block')
      }
      force(scrim, 'flex')
      for (const sibling of scrim.querySelectorAll('.dlg, .kbdsheet')) if (sibling !== element) force(sibling, 'none')
      if (getComputedStyle(element).display === 'none') force(element, 'flex')
      const box = element.getBoundingClientRect()
      const name = element.getAttribute('aria-label') || element.querySelector('h2, h3')?.textContent.trim() || element.id
      rows.push([name, Math.round(box.left), Math.round(box.top), Math.round(box.width), Math.round(box.height), getComputedStyle(element).borderTopLeftRadius])
      for (const node of forced) node.style.removeProperty('display')
    }
    return rows
  })
  const {width, height} = page.viewportSize()
  expect(boxes.length).toBeGreaterThan(30)
  expect(boxes.filter(([, left, top, boxWidth, boxHeight, radius]) => left !== 0 || top !== 0 || boxWidth !== width || boxHeight !== height || radius !== '0px')).toEqual([])
})
