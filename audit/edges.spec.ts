/* ============================================================================
 * Les bords des blocs, mesurés — la cohérence des largeurs ne se juge pas à
 * l'œil.
 *
 * Un écran bien réglé n'a qu'un bord gauche et qu'un bord droit pour tout ce
 * qui s'empile dans sa colonne. Ce harnais relève, pour chaque bloc de premier
 * niveau, ses deux bords à toutes les largeurs, puis compte combien de valeurs
 * distinctes il trouve : deux bords droits sur un même écran est un défaut, et
 * le nom du bloc qui s'en écarte est ce qu'il faut pour le corriger.
 *
 * Il relève au passage l'axe de centrage de chaque bloc, parce qu'un en-tête
 * centré sur une bande plus étroite que les cartes qu'il coiffe se voit
 * exactement là.
 * ==========================================================================*/

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { type Page, test } from '@playwright/test'
import {
  APP_ROUTES,
  type AuditRoute,
  LOCALES,
  type Locale,
  PUBLIC_ROUTES,
  type Theme,
  THEMES,
  WIDTHS,
  viewportFor,
} from './routes'
import { loadExample, seedPreferences, settle } from './session'

const OUT = path.resolve(import.meta.dirname)

type Block = { tag: string; left: number; right: number; width: number; text: string }
type EdgeRow = {
  route: string
  slug: string
  width: number
  theme: Theme
  locale: Locale
  blocks: Block[]
  /** Les bords droits distincts trouvés, arrondis au pixel. */
  distinctRights: number[]
  /** Idem à gauche. */
  distinctLefts: number[]
  /** Ce que le viewport laisse inoccupé à droite du bloc le plus large. */
  deadRight: number
}

/** Les bords de chaque bloc de premier niveau du contenu principal. */
function readEdges(): { blocks: Block[]; deadRight: number } {
  const main = document.querySelector('main') ?? document.body
  const blocks: Block[] = []
  for (const el of main.children) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    /* On descend d'un cran dans les conteneurs transparents — un `div` sans
       fond qui prend toute la largeur ne dit rien du bord de ses cartes. */
    const style = getComputedStyle(el)
    const transparent =
      style.backgroundColor === 'rgba(0, 0, 0, 0)' && style.borderTopWidth === '0px'
    const targets = transparent && el.children.length > 0 ? [...el.children] : [el]
    for (const target of targets) {
      const tr = target.getBoundingClientRect()
      if (tr.width === 0 || tr.height === 0) continue
      blocks.push({
        tag:
          target.tagName.toLowerCase() +
          (typeof target.className === 'string' && target.className.trim() !== ''
            ? `.${target.className.trim().split(/\s+/).slice(0, 2).join('.')}`
            : ''),
        left: Math.round(tr.left),
        right: Math.round(tr.right),
        width: Math.round(tr.width),
        text: (target.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40),
      })
    }
  }
  const widest = blocks.reduce((acc, b) => Math.max(acc, b.right), 0)
  return { blocks, deadRight: Math.round(document.documentElement.clientWidth - widest) }
}

async function measure(
  page: Page,
  route: AuditRoute,
  width: number,
  theme: Theme,
  locale: Locale,
  rows: EdgeRow[],
): Promise<void> {
  await page.setViewportSize(viewportFor(width))
  await page.goto(route.path, { waitUntil: 'domcontentloaded' })
  await settle(page)
  const { blocks, deadRight } = await page.evaluate(readEdges)
  /* Les blocs trop courts ne comptent pas dans la colonne : un séparateur ou
     une puce ne définit pas le bord de la page. */
  const columnar = blocks.filter((b) => b.width > 120)
  rows.push({
    route: route.path,
    slug: route.slug,
    width,
    theme,
    locale,
    blocks: columnar,
    distinctRights: [...new Set(columnar.map((b) => b.right))].sort((a, b) => a - b),
    distinctLefts: [...new Set(columnar.map((b) => b.left))].sort((a, b) => a - b),
    deadRight,
  })
}

for (const locale of LOCALES) {
  for (const theme of THEMES) {
    test(`bords ${locale} ${theme}`, async ({ browser }) => {
      test.setTimeout(45 * 60_000)
      const context = await browser.newContext({
        locale: locale === 'fr' ? 'fr-FR' : 'en-GB',
        reducedMotion: 'reduce',
        colorScheme: theme,
        deviceScaleFactor: 1,
      })
      await seedPreferences(context, locale, theme)
      const rows: EdgeRow[] = []
      const page = await context.newPage()

      for (const route of PUBLIC_ROUTES) {
        for (const width of WIDTHS) await measure(page, route, width, theme, locale, rows)
      }
      await loadExample(page, locale)
      for (const route of APP_ROUTES) {
        for (const width of WIDTHS) await measure(page, route, width, theme, locale, rows)
      }

      await mkdir(path.join(OUT, 'bords'), { recursive: true })
      await writeFile(
        path.join(OUT, 'bords', `${locale}-${theme}.json`),
        `${JSON.stringify(rows, null, 2)}\n`,
        'utf8',
      )
      await context.close()
    })
  }
}
