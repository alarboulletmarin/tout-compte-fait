import { chromium } from 'playwright'
const BASE = 'http://localhost:4173'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 1600 }, locale: 'fr-FR', reducedMotion: 'reduce' })
const page = await ctx.newPage()
await page.goto(BASE + '/')
const sheet = page.locator('dialog[open]')
if (await sheet.count()) { const b = sheet.locator('input[type=checkbox]'); if (await b.count()) await b.first().check(); await sheet.getByRole('button').last().click() }
await page.getByRole('button', { name: /charger l’exemple/i }).first().click()
await page.getByRole('navigation').first().waitFor({ timeout: 60000 })
await page.getByText(/solde du mois/i).first().waitFor({ timeout: 60000 })
await page.waitForTimeout(2500)

for (const p of ['/epargne', '/epargne/objectifs/ex-g-apport', '/epargne/objectifs/ex-g-matelas', '/epargne/objectifs/ex-g-long']) {
  await page.goto(BASE + p); await page.waitForLoadState('networkidle'); await page.waitForTimeout(400)
  const r = await page.evaluate(() => {
    const out = []
    for (const g of document.querySelectorAll('span[aria-hidden="true"].flex.items-center.gap-0\\.5')) {
      const segs = [...g.children].map(s => ({ cls: s.className, bg: getComputedStyle(s).backgroundColor }))
      const host = g.closest('.tile')
      out.push({ tileBg: host ? getComputedStyle(host).backgroundColor : null, ctx: (g.closest('a,.tile')?.textContent||'').replace(/\s+/g,' ').trim().slice(0,40), segs })
    }
    return out
  })
  console.log('\n===', p)
  for (const g of r) {
    console.log(' ctx:', g.ctx, '| tileBg', g.tileBg)
    for (const s of g.segs) console.log('   ', s.bg.padEnd(24), s.cls)
  }
}
await browser.close()
