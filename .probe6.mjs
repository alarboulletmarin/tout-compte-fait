import { chromium } from 'playwright'
const BASE = 'http://localhost:4173'
const browser = await chromium.launch()
try {
const ctx = await browser.newContext({ viewport: { width: 900, height: 1200 }, locale: 'fr-FR', reducedMotion: 'reduce' })
const page = await ctx.newPage()
page.on('pageerror', e => console.log('ERR', e.message))
await page.goto(BASE + '/')
const sh = page.locator('dialog[open]')
if (await sh.count()) { const b = sh.locator('input[type=checkbox]'); if (await b.count()) await b.first().check(); await sh.getByRole('button').last().click() }
await page.getByRole('button', { name: /sans rien charger/i }).first().click()
await page.getByRole('navigation').first().waitFor({ timeout: 60000 })
await page.waitForTimeout(1500)

await page.goto(BASE + '/personnes/nouveau'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(700)
await page.locator('input').first().fill('Alix')
await page.locator('button[type=submit]').first().click()
await page.waitForTimeout(1200)
console.log('after member:', page.url())

await page.goto(BASE + '/epargne/nouveau'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(800)
await page.locator('form input[type=text]').first().fill('Livret A')
const selects = page.locator('form select')
const n = await selects.count()
console.log('selects', n)
for (let i = 0; i < n; i++) {
  const vals = await selects.nth(i).locator('option').evaluateAll(os => os.map(o => o.value).filter(Boolean))
  if (vals.length) await selects.nth(i).selectOption(vals[0])
}
await page.locator('button[type=submit]').first().click()
await page.waitForTimeout(1500)
console.log('after support:', page.url())

for (const w of [768, 1024, 1440]) {
  await page.setViewportSize({ width: w, height: 1200 })
  await page.goto(BASE + '/epargne'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(700)
  const r = await page.evaluate(() => {
    const out = []
    for (const g of document.querySelectorAll('main div')) {
      const cs = getComputedStyle(g)
      if (cs.display !== 'grid') continue
      out.push({ cls: g.className, cols: cs.gridTemplateColumns, kids: g.children.length, kidTexts: [...g.children].map(c => (c.textContent||'').replace(/\s+/g,' ').trim().slice(0,28)), w: Math.round(g.getBoundingClientRect().width) })
    }
    return out
  })
  console.log('\n== width', w); console.log(JSON.stringify(r, null, 1))
  await page.screenshot({ path: `/tmp/claude-0/-home-user-tout-compte-fait/a8195a6a-6946-55b3-afe2-3dc86ff4d9de/scratchpad/epargne-${w}.png`, fullPage: true })
}
} finally { await browser.close() }
