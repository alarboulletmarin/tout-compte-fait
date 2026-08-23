import { chromium } from 'playwright-core'
const BASE = 'http://localhost:5199'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'fr-FR' })
await ctx.addInitScript(() => { try { localStorage.setItem('tout-compte-fait.locale', 'fr') } catch {} })
const page = await ctx.newPage()
await page.goto(BASE)
const sheet = page.locator('dialog[open]')
if (await sheet.count()) { const b = sheet.locator('input[type=checkbox]'); if (await b.count()) await b.first().check(); await sheet.getByRole('button').last().click() }
await page.getByRole('button', { name: /charger l.exemple/i }).first().click()
await page.getByRole('navigation').first().waitFor({ timeout: 60000 })
await page.waitForTimeout(3000)

for (const w of [1440, 1024, 768, 390, 320]) {
  await page.setViewportSize({ width: w, height: 1000 })
  await page.goto(BASE + '/simulation')
  await page.waitForTimeout(1200)
  const r = await page.evaluate(() => {
    const q = (sel) => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.x), w: Math.round(b.width), right: Math.round(b.right), h: Math.round(b.height) } }
    const main = document.querySelector('main')
    const titleRow = main.querySelector('div.mb-5')
    const infoBtn = titleRow?.querySelector('button')
    const col = main.querySelector('div.max-w-4xl')
    const tiles = [...main.querySelectorAll('section.tile')].map(e => { const b = e.getBoundingClientRect(); return { x: Math.round(b.x), right: Math.round(b.right), w: Math.round(b.width) } })
    const box = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.x), w: Math.round(b.width), right: Math.round(b.right) } }
    return {
      main: q('main'), titleRow: box(titleRow), infoBtn: box(infoBtn), col: box(col), tiles,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }
  })
  console.log(w, JSON.stringify(r))
}
await browser.close()
