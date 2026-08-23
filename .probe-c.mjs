import { chromium } from 'playwright-core'
const BASE = 'http://localhost:5199'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 }, locale: 'fr-FR' })
await ctx.addInitScript(() => { try { localStorage.setItem('tout-compte-fait.locale', 'fr') } catch {} })
const page = await ctx.newPage()
await page.goto(BASE)
const sheet = page.locator('dialog[open]')
if (await sheet.count()) { const b = sheet.locator('input[type=checkbox]'); if (await b.count()) await b.first().check(); await sheet.getByRole('button').last().click() }
await page.getByRole('button', { name: /charger l.exemple/i }).first().click()
await page.getByRole('navigation').first().waitFor({ timeout: 60000 })
await page.waitForTimeout(3000)

const dump = async (path, w) => {
  await page.setViewportSize({ width: w, height: 1100 })
  await page.goto(BASE + path)
  await page.waitForTimeout(1400)
  const r = await page.evaluate(() => {
    const out = []
    const walk = (el, depth) => {
      const b = el.getBoundingClientRect()
      if (b.width === 0 && b.height === 0) return
      out.push({ d: depth, t: el.tagName.toLowerCase(), c: String(el.className).slice(0,68), x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), r: Math.round(b.right) })
      if (depth < 7) for (const k of el.children) walk(k, depth + 1)
    }
    walk(document.querySelector('main'), 0)
    return { rows: out, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }
  })
  console.log('###', path, w, 'overflow=', r.overflow)
  for (const row of r.rows) console.log('  '.repeat(row.d) + `${row.t}.${row.c} | x=${row.x} y=${row.y} w=${row.w} h=${row.h} r=${row.r}`)
}
await dump(process.argv[2] ?? '/avances/nouveau', Number(process.argv[3] ?? 1440))
await browser.close()
