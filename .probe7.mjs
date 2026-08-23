import { chromium } from 'playwright'
const BASE = 'http://localhost:4173'
const browser = await chromium.launch()
try {
for (const w of [768, 1024, 1440]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 1400 }, locale: 'fr-FR', reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto(BASE + '/')
  const sh = page.locator('dialog[open]')
  if (await sh.count()) { const b = sh.locator('input[type=checkbox]'); if (await b.count()) await b.first().check(); await sh.getByRole('button').last().click() }
  await page.getByRole('button', { name: /charger l’exemple/i }).first().click()
  await page.getByRole('navigation').first().waitFor({ timeout: 60000 })
  await page.getByText(/solde du mois/i).first().waitFor({ timeout: 60000 })
  await page.waitForTimeout(2500)
  await page.goto(BASE + '/epargne'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(700)
  const r = await page.evaluate(() => {
    const cols = document.querySelector('.cols')
    const out = { colsTop: Math.round(cols.getBoundingClientRect().top), kids: [] }
    for (const kid of cols.children) {
      const kr = kid.getBoundingClientRect()
      const eb = kid.querySelector('.eyebrow-pill')
      const ebr = eb?.getBoundingClientRect()
      out.kids.push({
        cls: kid.className.slice(0, 30),
        top: Math.round(kr.top),
        eyebrow: eb?.textContent?.trim(),
        eyebrowTop: ebr ? Math.round(ebr.top) : null,
        eyebrowH: ebr ? Math.round(ebr.height) : null,
        deltaFromKid: ebr ? Math.round(ebr.top - kr.top) : null,
      })
    }
    return out
  })
  console.log('\n== width', w, JSON.stringify(r, null, 1))
  await page.screenshot({ path: `/tmp/claude-0/-home-user-tout-compte-fait/a8195a6a-6946-55b3-afe2-3dc86ff4d9de/scratchpad/ex-epargne-${w}.png`, fullPage: true })
  await ctx.close()
}
} finally { await browser.close() }
