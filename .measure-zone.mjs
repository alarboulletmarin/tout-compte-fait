import { chromium } from 'playwright-core'
const BASE = 'http://localhost:5199'
const W = Number(process.argv[2] ?? 1440)
const PATHS = (process.argv[3] ?? '/simulation,/credits,/avances,/epargne,/historique').split(',')

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const ctx = await browser.newContext({ viewport: { width: W, height: 900 }, locale: 'fr-FR' })
await ctx.addInitScript(() => { try { localStorage.setItem('tout-compte-fait.locale', 'fr') } catch {} })
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('ERREUR', e.message))

await page.goto(BASE)
const sheet = page.locator('dialog[open]')
if (await sheet.count()) {
  const box = sheet.locator('input[type=checkbox]')
  if (await box.count()) await box.first().check()
  await sheet.getByRole('button').last().click()
}
await page.getByRole('button', { name: /charger l.exemple/i }).first().click()
await page.getByRole('navigation').first().waitFor({ timeout: 60000 })
await page.waitForTimeout(3000)

for (const p of PATHS) {
  await page.goto(BASE + p)
  await page.waitForTimeout(1500)
  const info = await page.evaluate(() => {
    const main = document.querySelector('main')
    const mb = main.getBoundingClientRect()
    const cs = getComputedStyle(main)
    const kids = [...main.children].flatMap((el) => {
      const r = el.getBoundingClientRect()
      return [{ tag: el.tagName, cls: String(el.className).slice(0, 60), x: Math.round(r.x), w: Math.round(r.width), right: Math.round(r.right) }]
    })
    return {
      mainX: Math.round(mb.x), mainW: Math.round(mb.width), pad: cs.paddingLeft + '/' + cs.paddingRight,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      kids,
    }
  })
  console.log('===', p, JSON.stringify(info))
}
await browser.close()
