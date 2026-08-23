import { chromium } from 'playwright'
const BASE = 'http://localhost:4173'
const browser = await chromium.launch()
try {
const ctx = await browser.newContext({ viewport: { width: 390, height: 1800 }, locale: 'fr-FR', reducedMotion: 'reduce' })
const page = await ctx.newPage()
await page.goto(BASE + '/')
const sh = page.locator('dialog[open]')
if (await sh.count()) { const b = sh.locator('input[type=checkbox]'); if (await b.count()) await b.first().check(); await sh.getByRole('button').last().click() }
await page.getByRole('button', { name: /charger l’exemple/i }).first().click()
await page.getByRole('navigation').first().waitFor({ timeout: 60000 })
await page.getByText(/solde du mois/i).first().waitFor({ timeout: 60000 })
await page.waitForTimeout(2500)

for (const p of ['/epargne/objectifs/ex-g-apport/modifier', '/epargne/objectifs/nouveau', '/epargne/nouveau', '/epargne/ex-s-livret-alix']) {
  await page.goto(BASE + p); await page.waitForLoadState('networkidle'); await page.waitForTimeout(600)
  const info = await page.evaluate(() => ({
    tiles: [...document.querySelectorAll('main .tile')].map(t => (t.textContent||'').replace(/\s+/g,' ').trim().slice(0,30)),
    fields: [...document.querySelectorAll('form input, form select')].map(i=>{const r=i.getBoundingClientRect();return {t:i.type||i.tagName, w:Math.round(r.width)}}),
  }))
  console.log(p, JSON.stringify(info))
  await page.screenshot({ path: `/tmp/claude-0/-home-user-tout-compte-fait/a8195a6a-6946-55b3-afe2-3dc86ff4d9de/scratchpad/s${p.replace(/\//g,'_')}.png`, fullPage: true })
}
} finally { await browser.close() }
