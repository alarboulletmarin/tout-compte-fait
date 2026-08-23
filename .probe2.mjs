import { chromium } from 'playwright'
const BASE = 'http://localhost:4173'
const browser = await chromium.launch()

async function boot(width) {
  const ctx = await browser.newContext({ viewport: { width, height: 1400 }, locale: 'fr-FR', reducedMotion: 'reduce' })
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
  return { ctx, page }
}

for (const width of [320, 360, 390, 430, 768, 1440]) {
  const { ctx, page } = await boot(width)
  console.log('\n######### width', width)

  // --- SupportPage rates tile
  await page.goto(BASE + '/epargne/ex-s-livret-alix')
  await page.waitForLoadState('networkidle'); await page.waitForTimeout(400)
  console.log(JSON.stringify(await page.evaluate(() => {
    const out = {}
    for (const t of document.querySelectorAll('.tile')) {
      const eb = t.querySelector('.eyebrow-pill')?.textContent?.trim()
      if (eb === 'Rendement') {
        out.tileW = t.clientWidth
        out.tileCut = t.scrollWidth - t.clientWidth
        const row = t.querySelector('li > div, li > button')
        if (row) {
          const kids = [...row.children].map(c => ({ t: (c.textContent||'').replace(/\s+/g,' ').trim().slice(0,34), w: Math.round(c.getBoundingClientRect().width) }))
          out.row = kids
          out.rowW = Math.round(row.getBoundingClientRect().width)
        }
      }
    }
    return out
  }), null, 0))

  // --- SupportFormPage RateManagement
  await page.goto(BASE + '/epargne/ex-s-livret-alix/modifier')
  await page.waitForLoadState('networkidle'); await page.waitForTimeout(400)
  console.log('modifier:', JSON.stringify(await page.evaluate(() => {
    const out = {}
    for (const t of document.querySelectorAll('.tile')) {
      const eb = t.querySelector('.eyebrow-pill')?.textContent?.trim()
      if (eb === 'Rendement') {
        out.tileW = t.clientWidth; out.tileCut = t.scrollWidth - t.clientWidth
        const row = t.querySelector('div.flex.items-baseline')
        if (row) out.parts = [...row.children].map(c => ({ t:(c.textContent||'').replace(/\s+/g,' ').trim().slice(0,34), w: Math.round(c.getBoundingClientRect().width) }))
      }
      // the divider of a Section in SupportFields
      }
    const det = document.querySelector('details.-mx-3')
    if (det) { const r = det.getBoundingClientRect(); out.sectionBox = [Math.round(r.left), Math.round(r.right)] }
    const inp = document.querySelector('form input')
    if (inp) { const r = inp.getBoundingClientRect(); out.firstInput = [Math.round(r.left), Math.round(r.right)] }
    return out
  })))

  // --- GoalsSection rows on /epargne
  await page.goto(BASE + '/epargne')
  await page.waitForLoadState('networkidle'); await page.waitForTimeout(400)
  console.log('epargne goals:', JSON.stringify(await page.evaluate(() => {
    const rows = [...document.querySelectorAll('a[href*="/objectifs/"]')]
    return rows.map(r => {
      const kids = [...r.children].map(c => ({ t:(c.textContent||'').replace(/\s+/g,' ').trim().slice(0,26), w: Math.round(c.getBoundingClientRect().width) }))
      return { h: Math.round(r.getBoundingClientRect().height), w: Math.round(r.getBoundingClientRect().width), kids }
    })
  })))

  // --- GoalPage accent tile
  await page.goto(BASE + '/epargne/objectifs/ex-g-apport')
  await page.waitForLoadState('networkidle'); await page.waitForTimeout(400)
  console.log('goal tile:', JSON.stringify(await page.evaluate(() => {
    const p = document.querySelector('.t-tile-fit')
    if (!p) return null
    const cs = getComputedStyle(p)
    const r = p.getBoundingClientRect()
    return { text:(p.textContent||'').trim(), fs: cs.fontSize, w: Math.round(r.width), h: Math.round(r.height), sw: p.scrollWidth, lines: Math.round(r.height / Number.parseFloat(cs.lineHeight)) }
  })))

  await ctx.close()
}
await browser.close()
