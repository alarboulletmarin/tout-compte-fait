/* ============================================================================
 * axe-core sur chaque écran, aux deux thèmes et aux deux langues.
 *
 * Trois largeurs et non huit : les règles d'axe portent sur l'arbre et sur le
 * contraste, or ni l'un ni l'autre ne dépend de la largeur — sauf pour ce qui
 * apparaît ou disparaît avec elle, d'où 375 (téléphone, barre d'onglets),
 * 768 (tablette, deux colonnes) et 1280 (bureau, colonne latérale). Ce que la
 * largeur change vraiment — débordements, chevauchements, cibles — se mesure
 * dans `capture.spec.ts`, aux huit.
 *
 * Le rapport brut part dans `audit/axe/`, un fichier par combinaison : c'est
 * lui la preuve, le résumé n'en est que la lecture.
 * ==========================================================================*/

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { type Page, test } from '@playwright/test'
import {
  APP_ROUTES,
  type AuditRoute,
  LOCALES,
  type Locale,
  PUBLIC_ROUTES,
  type Theme,
  THEMES,
} from './routes'
import { loadExample, seedPreferences, settle } from './session'

const OUT = path.resolve(import.meta.dirname)

/* Les trois largeurs où l'interface change de forme. */
const WIDTHS = [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1280, height: 900 },
] as const

type Violation = {
  route: string
  slug: string
  width: number
  theme: Theme
  locale: Locale
  id: string
  impact: string
  help: string
  wcag: string[]
  nodes: { target: string; failure: string }[]
}

async function scan(
  page: Page,
  route: AuditRoute,
  theme: Theme,
  locale: Locale,
  found: Violation[],
): Promise<void> {
  for (const viewport of WIDTHS) {
    await page.setViewportSize(viewport)
    await page.goto(route.path, { waitUntil: 'domcontentloaded' })
    await settle(page)

    const results = await new AxeBuilder({ page })
      /* Les trois niveaux que WCAG 2.2 AA recouvre, plus les règles de bonnes
         pratiques d'axe : celles-ci ne sont pas normatives, mais elles
         attrapent les landmarks manquants et les titres qui sautent un
         niveau, que la grille d'audit demande explicitement. */
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .analyze()

    for (const v of results.violations) {
      found.push({
        route: route.path,
        slug: route.slug,
        width: viewport.width,
        theme,
        locale,
        id: v.id,
        impact: v.impact ?? 'unknown',
        help: v.help,
        wcag: v.tags.filter((tag) => tag.startsWith('wcag')),
        nodes: v.nodes.slice(0, 5).map((n) => ({
          target: n.target.join(' '),
          failure: n.failureSummary ?? '',
        })),
      })
    }
  }
}

for (const locale of LOCALES) {
  for (const theme of THEMES) {
    test(`axe ${locale} ${theme}`, async ({ browser }) => {
      test.setTimeout(45 * 60_000)
      const context = await browser.newContext({
        locale: locale === 'fr' ? 'fr-FR' : 'en-GB',
        reducedMotion: 'reduce',
        colorScheme: theme,
        deviceScaleFactor: 1,
      })
      await seedPreferences(context, locale, theme)
      const found: Violation[] = []
      const page = await context.newPage()

      for (const route of PUBLIC_ROUTES) await scan(page, route, theme, locale, found)
      await loadExample(page, locale)
      for (const route of APP_ROUTES) await scan(page, route, theme, locale, found)

      await mkdir(path.join(OUT, 'axe'), { recursive: true })
      await writeFile(
        path.join(OUT, 'axe', `${locale}-${theme}.json`),
        `${JSON.stringify(found, null, 2)}\n`,
        'utf8',
      )
      await context.close()
    })
  }
}
