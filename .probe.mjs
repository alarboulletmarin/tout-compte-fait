import { chromium } from 'playwright'
const BASE = 'http://localhost:4173'

const PATHS = [
  '/epargne',
  '/epargne/mois',
  '/epargne/supports',
  '/epargne/analyse',
  '/epargne/valeurs',
  '/epargne/objectifs/ex-g-apport',
  '/epargne/objectifs/ex-g-apport/modifier',
  '/epargne/objectifs/nouveau',
  '/epargne/ex-s-livret-alix',
  '/epargne/ex-s-assurance-vie',
  '/epargne/ex-s-livret-alix/modifier',
  '/epargne/nouveau',
  '/epargne/ex-s-livret-alix/taux',
  '/epargne/ex-s-livret-alix/valeur',
]

const browser = await chromium.launch()

async function run(width) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale: 'fr-FR', reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto(BASE + '/')
  const sheet = page.locator('dialog[open]')
  if (await sheet.count()) {
    const box = sheet.locator('input[type=checkbox]')
    if (await box.count()) await box.first().check()
    await sheet.getByRole('button').last().click()
  }
  await page.getByRole('button', { name: /charger l’exemple/i }).first().click()
  await page.getByRole('navigation').first().waitFor({ timeout: 60000 })
  await page.getByText(/solde du mois/i).first().waitFor({ timeout: 60000 })
  await page.waitForTimeout(2500)

  console.log('\n########## width =', width)
  for (const p of PATHS) {
    await page.goto(BASE + p)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    const res = await page.evaluate(() => {
      const out = { h1: document.querySelector('h1')?.textContent ?? '?', over: document.documentElement.scrollWidth - document.documentElement.clientWidth, cut: [] }
      const name = (el) => (el.textContent ?? '').replace(/\s+/g,' ').trim().slice(0,55)
      for (const t of document.querySelectorAll('.tile')) {
        const w = t.scrollWidth - t.clientWidth, h = t.scrollHeight - t.clientHeight
        if (w > 1) out.cut.push(`TILE-W +${w} « ${name(t)} »`)
        if (h > 1) out.cut.push(`TILE-H +${h} « ${name(t)} »`)
      }
      for (const pill of document.querySelectorAll('.eyebrow-pill')) {
        const w = pill.scrollWidth - pill.clientWidth
        if (w > 1) out.cut.push(`EYEBROW +${w} « ${name(pill)} »`)
      }
      // text nodes clipped: any element whose right edge exceeds its nearest overflow-hidden ancestor
      const clipRoots = [...document.querySelectorAll('main *')].filter(e => getComputedStyle(e).overflow !== 'visible')
      for (const root of clipRoots) {
        const rr = root.getBoundingClientRect()
        for (const el of root.querySelectorAll('*')) {
          if (el.children.length) continue
          const r = el.getBoundingClientRect()
          if (r.width === 0) continue
          const ex = Math.round(r.right - rr.right)
          if (ex > 1) out.cut.push(`CLIPPED +${ex} « ${name(el)} » in <${root.tagName.toLowerCase()}.${String(root.className).slice(0,30)}>`)
        }
      }
      return out
    })
    console.log(`\n--- ${p}  [${res.h1}]  pageOverflow=${res.over}`)
    for (const c of [...new Set(res.cut)]) console.log('   ', c)
  }
  await ctx.close()
}

await run(320)
await run(390)
await browser.close()
