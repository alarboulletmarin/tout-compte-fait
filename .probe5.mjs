import { chromium } from 'playwright'
const BASE = 'http://localhost:4173'
const browser = await chromium.launch()
async function boot(width){
  const ctx = await browser.newContext({ viewport:{width,height:1600}, locale:'fr-FR', reducedMotion:'reduce' })
  const page = await ctx.newPage()
  await page.goto(BASE+'/')
  const sh = page.locator('dialog[open]')
  if (await sh.count()) { const b = sh.locator('input[type=checkbox]'); if (await b.count()) await b.first().check(); await sh.getByRole('button').last().click() }
  await page.getByRole('button',{name:/charger l’exemple/i}).first().click()
  await page.getByRole('navigation').first().waitFor({timeout:60000})
  await page.getByText(/solde du mois/i).first().waitFor({timeout:60000})
  await page.waitForTimeout(2500)
  return {ctx,page}
}
for (const width of [390, 1440]) {
  const {ctx,page} = await boot(width)
  console.log('\n######## width', width)

  // GoalFormPage : tile autour du form ?
  await page.goto(BASE+'/epargne/objectifs/nouveau'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(400)
  console.log('goal form:', JSON.stringify(await page.evaluate(()=>{
    const f = document.querySelector('form')
    const out = { formInTile: !!f?.closest('.tile'), tilesOnPage: document.querySelectorAll('main .tile').length,
      formBox: (()=>{const r=f.getBoundingClientRect();return [Math.round(r.left),Math.round(r.right)]})() }
    out.fields = [...document.querySelectorAll('form input, form select')].map(i=>{const r=i.getBoundingClientRect();return {t:i.type||i.tagName, w:Math.round(r.width), l:Math.round(r.left), rr:Math.round(r.right)}})
    return out
  })))

  // Support form : idem pour comparaison
  await page.goto(BASE+'/epargne/nouveau'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(400)
  console.log('support form:', JSON.stringify(await page.evaluate(()=>{
    const f = document.querySelector('form')
    return { formInTile: !!f?.closest('.tile'), tilesOnPage: document.querySelectorAll('main .tile').length }
  })))

  // GrowthSection table alignment + section gaps
  await page.goto(BASE+'/epargne/analyse'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(600)
  const det = page.locator('summary', { hasText: /détail|tableau|mois par mois/i })
  if (await det.count()) { await det.first().click(); await page.waitForTimeout(300) }
  console.log('table:', JSON.stringify(await page.evaluate(()=>{
    const t = document.querySelector('table')
    if (!t) return null
    const heads = [...t.querySelectorAll('thead th')].map(h=>({t:h.textContent.trim(), ta:getComputedStyle(h).textAlign, l:Math.round(h.getBoundingClientRect().left), r:Math.round(h.getBoundingClientRect().right)}))
    const cells = [...t.querySelectorAll('tbody tr')].slice(0,3).map(tr=>[...tr.children].map(c=>({t:c.textContent.trim(), ta:getComputedStyle(c).textAlign, l:Math.round(c.getBoundingClientRect().left), r:Math.round(c.getBoundingClientRect().right)})))
    return {heads, cells}
  })))
  console.log('sections gaps:', JSON.stringify(await page.evaluate(()=>
    [...document.querySelectorAll('main section')].map(s=>({cls:s.className, gap:getComputedStyle(s).rowGap, first:(s.textContent||'').replace(/\s+/g,' ').trim().slice(0,30)}))
  )))
  await ctx.close()
}
await browser.close()
