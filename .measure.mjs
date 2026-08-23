import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const font = readFileSync('node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2').toString('base64')

const items = [
  ['t-label', '7 mois de retard · 42 000 € en octobre 2027'],
  ['t-label', '3 mois d’avance · 42 000 € en mars 2028'],
  ['t-body', 'Apport appartement'],
  ['t-tile-fit32', '28 400 € sur 42 000 €'],
  ['t-tile-fit32', '191 541,32 €'],
  ['t-tile-num', '191 541,32 €'],
  ['t-num-body', '3,00 % · Rendement hypothétique'],
  ['t-label', 'Précaution · relevé il y a 4 mois'],
  ['t-eyebrow', 'CROISSANCE'],
  ['t-axis', 'Produit'],
  ['t-num-body', '18 320,00 €'],
]

const rows = items.map(([cls, text], i) => `<span id="i${i}" class="${cls}">${text}</span><br>`).join('\n')

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family:'Archivo Variable'; src:url(data:font/woff2;base64,${font}) format('woff2-variations'); font-weight:100 900; font-stretch:62% 125%; font-display:block; }
body{margin:0;font-family:'Archivo Variable',system-ui,sans-serif;font-size:15px;font-weight:400;line-height:1.5}
.t-num-body,.t-tile-num,.t-tile-fit32{font-weight:700;font-stretch:112%;letter-spacing:-0.03em;font-variant-numeric:tabular-nums}
.t-num-body{font-size:15px}
.t-tile-num{font-size:32px}
.t-tile-fit32{font-size:32px}
.t-label{font-size:13px;font-weight:400;line-height:1.4}
.t-body{font-size:15px;font-weight:400;line-height:1.5}
.t-eyebrow{font-family:monospace;font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:0.08em}
.t-axis{font-family:monospace;font-size:11px}
span{display:inline-block;white-space:nowrap}
</style></head><body>${rows}</body></html>`

const browser = await chromium.launch()
const page = await browser.newPage()
await page.setContent(html)
await page.evaluate(() => document.fonts.ready)
const out = await page.evaluate((n) => {
  const r = []
  for (let i = 0; i < n; i++) {
    const el = document.getElementById('i' + i)
    r.push([el.className, el.textContent, Math.round(el.getBoundingClientRect().width * 10) / 10])
  }
  return r
}, items.length)
for (const [c, t, w] of out) console.log(String(w).padStart(7), c.padEnd(14), t)
await browser.close()
