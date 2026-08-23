import { chromium } from 'playwright'
const BASE = 'http://localhost:4173'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 900 }, locale: 'fr-FR' })
const page = await ctx.newPage()
await page.goto(BASE + '/')
await page.waitForLoadState('networkidle')
const r = await page.evaluate(() => {
  const mk = (cls) => { const s = document.createElement('span'); s.className = cls; s.textContent='x'; document.body.append(s); const bg = getComputedStyle(s).backgroundColor; const c = getComputedStyle(s).color; s.remove(); return {cls, bg, c} }
  return [mk('bg-text-muted'), mk('bg-muted'), mk('bg-surface-2'), mk('bg-accent'), mk('h-2 w-2 rounded-[2px] bg-text-muted')]
})
console.log(JSON.stringify(r, null, 1))
await browser.close()
