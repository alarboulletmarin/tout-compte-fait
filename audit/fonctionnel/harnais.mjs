/* Le harnais de l'audit fonctionnel : un navigateur, des vérifications qui
   continuent après un échec, un relevé JSON + des captures des échecs. */
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

const BASE = 'http://127.0.0.1:4174'
const OUT = new URL('.', import.meta.url).pathname

export const results = []
let counter = 0

export function must(cond, message) {
  if (!cond) throw new Error(message)
}

export async function launch() {
  const browser = await chromium.launch()
  const context = await browser.newContext({
    baseURL: BASE,
    viewport: { width: 412, height: 915 },
    locale: 'fr-FR',
    /* Les chiffres héros comptent en s'animant au premier affichage : lire le
       texte pendant la montée donne 379,28 au lieu de 900,00. L'app neutralise
       tout sous prefers-reduced-motion — on le demande, et on lit des valeurs
       posées. */
    reducedMotion: 'reduce',
  })
  await context.addInitScript(() => {
    try {
      localStorage.setItem('tout-compte-fait.locale', 'fr')
      localStorage.setItem('tout-compte-fait.theme', 'light')
      localStorage.setItem('tout-compte-fait.notice', '1')
    } catch {}
  })
  const page = await context.newPage()
  page.setDefaultTimeout(7000)
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  return { browser, context, page, errors }
}

export async function check(page, area, name, fn) {
  counter += 1
  try {
    await fn()
    results.push({ area, name, ok: true })
    console.log(`  ok   ${area} · ${name}`)
  } catch (e) {
    const shot = `${OUT}échec-${String(counter).padStart(2, '0')}.png`
    try {
      await page.screenshot({ path: shot, fullPage: true })
    } catch {}
    results.push({ area, name, ok: false, error: String(e.message ?? e).slice(0, 300), shot })
    console.log(`  ÉCHEC ${area} · ${name} — ${String(e.message ?? e).split('\n')[0]}`)
  }
}

export function report(file) {
  mkdirSync(OUT, { recursive: true })
  writeFileSync(`${OUT}${file}`, JSON.stringify(results, null, 2))
  const failed = results.filter((r) => !r.ok)
  console.log(`\n${String(results.length - failed.length)}/${String(results.length)} vérifications passent`)
  for (const f of failed) console.log(`  ✗ ${f.area} · ${f.name} — ${f.error}`)
}

/* --- Gestes partagés -------------------------------------------------------*/

export async function clickButton(page, name, opts = {}) {
  await page.getByRole('button', { name, ...opts }).first().click()
}

/** Tape un montant sur le pavé numérique visible. */
export async function keypad(page, digits) {
  for (const d of digits) {
    await page.getByRole('button', { name: d, exact: true }).first().click()
  }
}

/** Le texte entier de la page, blancs normalisés. */
export async function bodyText(page) {
  const text = await page.locator('body').innerText()
  return text.replace(/\s+/g, ' ')
}

/** Un montant en euros tel que l'app l'écrit — mais avec des espaces simples,
    comme `bodyText` qui normalise tous les blancs (l'app écrit U+202F). */
export function euros(cents) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2 })
    .format(cents / 100)
    .replace(/\s+/g, ' ')
}
