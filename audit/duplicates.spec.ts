/* ============================================================================
 * Les montants affichés deux fois sur le même écran.
 *
 * Le critère est simple à énoncer et faux à mesurer naïvement : un même chiffre
 * peut légitimement revenir — un total et sa seule ligne, une valeur et son
 * rappel dans une phrase. Ce qui se cherche ici est le cas où **deux lectures
 * différentes affichent la même valeur sans que rien ne dise pourquoi**, comme
 * « Prévisionnel » et « Reste à vivre » qui tombent au centime près.
 *
 * On relève donc, par écran, chaque montant rendu et le libellé qui le
 * précède ; le tri se fait ensuite, à la lecture — un harnais ne peut pas
 * décider si deux libellés désignent deux concepts.
 * ==========================================================================*/

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { type Page, test } from '@playwright/test'
import { APP_ROUTES, type AuditRoute } from './routes'
import { loadExample, seedPreferences, settle } from './session'

const OUT = path.resolve(import.meta.dirname)

type Dup = { value: string; occurrences: { label: string; context: string }[] }
type DupRow = { route: string; slug: string; width: number; duplicates: Dup[] }

/**
 * Chaque montant de l'écran, avec ce qui le nomme.
 *
 * Le nom accessible d'`<Amount />` est un texte caché qui porte la valeur en
 * toutes lettres : c'est lui qu'on lit, pas le rendu visuel découpé en trois
 * `span`. Le libellé est cherché en remontant : le premier texte non chiffré
 * rencontré dans la rangée ou la tuile qui contient le montant.
 */
function probeAmounts(): Dup[] {
  const found = new Map<string, { label: string; context: string }[]>()

  const labelFor = (el: Element): { label: string; context: string } => {
    for (let p: Element | null = el.parentElement; p !== null; p = p.parentElement) {
      const own = [...p.querySelectorAll('.t-body, .t-label, .t-section, .t-eyebrow, h1, h2, h3')]
        .map((n) => (n.textContent ?? '').trim())
        .filter((s) => s !== '' && !/^[+\-−]?[\d\s  ,.]+[€$£%]?$/.test(s))
      if (own.length > 0) {
        return {
          label: own[0] ?? '',
          context: (p.className.toString().split(/\s+/).slice(0, 2).join('.') || p.tagName).slice(0, 40),
        }
      }
      if (p.tagName === 'MAIN') break
    }
    return { label: '?', context: '?' }
  }

  for (const el of document.querySelectorAll('.tnum')) {
    const spoken = el.querySelector('.sr-only-text')
    const text = (spoken?.textContent ?? '').trim()
    if (text === '') continue
    /* Les valeurs nulles et les petits nombres se répètent partout sans que ce
       soit une redondance : un « 0,00 € » n'est pas une lecture. */
    const digits = text.replace(/[^\d]/g, '')
    if (digits === '' || Number(digits) === 0) continue
    const list = found.get(text) ?? []
    list.push(labelFor(el))
    found.set(text, list)
  }

  return [...found.entries()]
    .filter(([, list]) => list.length > 1)
    /* Deux occurrences sous le même libellé sont un rappel, pas une
       redondance : on ne garde que les valeurs qui portent au moins deux noms
       différents. */
    .filter(([, list]) => new Set(list.map((o) => o.label)).size > 1)
    .map(([value, occurrences]) => ({ value, occurrences }))
}

async function scan(page: Page, route: AuditRoute, width: number, rows: DupRow[]): Promise<void> {
  await page.setViewportSize({ width, height: width < 500 ? 812 : 900 })
  await page.goto(route.path, { waitUntil: 'domcontentloaded' })
  await settle(page)
  const duplicates = await page.evaluate(probeAmounts)
  if (duplicates.length > 0) rows.push({ route: route.path, slug: route.slug, width, duplicates })
}

test('montants affichés deux fois', async ({ browser }) => {
  test.setTimeout(45 * 60_000)
  const context = await browser.newContext({ locale: 'fr-FR', reducedMotion: 'reduce' })
  await seedPreferences(context, 'fr', 'light')
  const page = await context.newPage()
  await loadExample(page, 'fr')
  const rows: DupRow[] = []
  for (const route of APP_ROUTES) {
    for (const width of [375, 1280]) await scan(page, route, width, rows)
  }
  await mkdir(path.join(OUT, 'doublons'), { recursive: true })
  await writeFile(path.join(OUT, 'doublons', 'fr-light.json'), `${JSON.stringify(rows, null, 2)}\n`, 'utf8')
  await context.close()
})
