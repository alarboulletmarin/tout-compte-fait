/* ============================================================================
 * Le harnais de capture — chaque écran, à huit largeurs, deux thèmes, deux
 * langues.
 *
 * Il produit deux choses, et la seconde est la plus utile :
 *
 *  1. `audit/screenshots/<langue>-<thème>/<slug>/<largeur>.jpg` — la page
 *     entière, pour qu'un défaut de mise en page se regarde plutôt que se
 *     raconte.
 *  2. `audit/mesures/<langue>-<thème>.json` — pour chaque combinaison : le
 *     débordement horizontal, la hauteur de défilement, ce que la barre du bas
 *     recouvre, les cibles trop petites. Une capture montre ; une mesure prouve.
 *
 * Un contexte par (langue, thème) et non par écran : le jeu d'exemple met
 * plusieurs secondes à s'écrire, et le recharger trente fois par combinaison
 * ferait durer l'audit une heure pour la même information.
 * ==========================================================================*/

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { type Page, test } from '@playwright/test'
import { probePage } from './probe'
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
const SHOTS = path.join(OUT, 'screenshots')

type Measure = ReturnType<typeof probePage> & {
  route: string
  slug: string
  width: number
  theme: Theme
  locale: Locale
  /** La hauteur, exprimée en écrans pleins — la densité se lit là. */
  screens: number
}

async function shoot(
  page: Page,
  route: AuditRoute,
  width: number,
  theme: Theme,
  locale: Locale,
  rows: Measure[],
): Promise<void> {
  const viewport = viewportFor(width)
  await page.setViewportSize(viewport)
  await page.goto(route.path, { waitUntil: 'domcontentloaded' })
  await settle(page)

  const dir = path.join(SHOTS, `${locale}-${theme}`, route.slug)
  await mkdir(dir, { recursive: true })
  await page.screenshot({
    path: path.join(dir, `${String(width)}.jpg`),
    fullPage: true,
    type: 'jpeg',
    quality: 72,
  })

  /* Défiler jusqu'en bas avant de sonder : ce qu'on cherche n'est pas « le
     contenu passe-t-il sous la barre » — sur une page longue, toujours — mais
     « reste-t-il du contenu sous elle une fois qu'on a défilé autant qu'on
     peut ». C'est là que se voit le rembourrage bas manquant. */
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight)
  })
  await page.evaluate(
    async () =>
      new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  )
  const probe = await page.evaluate(probePage)
  await page.evaluate(() => {
    window.scrollTo(0, 0)
  })
  rows.push({
    ...probe,
    route: route.path,
    slug: route.slug,
    width,
    theme,
    locale,
    screens: Math.round((probe.scrollHeight / viewport.height) * 10) / 10,
  })
}

for (const locale of LOCALES) {
  for (const theme of THEMES) {
    test(`captures ${locale} ${theme}`, async ({ browser }) => {
      test.setTimeout(45 * 60_000)
      const context = await browser.newContext({
        locale: locale === 'fr' ? 'fr-FR' : 'en-GB',
        reducedMotion: 'reduce',
        colorScheme: theme,
        deviceScaleFactor: 1,
      })
      await seedPreferences(context, locale, theme)
      const rows: Measure[] = []
      const page = await context.newPage()

      /* D'abord ce qui vit avant le foyer : le contexte est encore vierge, et
         charger l'exemple donnerait à ces écrans un document qu'aucun d'eux
         n'est censé voir. */
      for (const route of PUBLIC_ROUTES) {
        for (const width of WIDTHS) await shoot(page, route, width, theme, locale, rows)
      }

      await loadExample(page, locale)
      for (const route of APP_ROUTES) {
        for (const width of WIDTHS) await shoot(page, route, width, theme, locale, rows)
      }

      await mkdir(path.join(OUT, 'mesures'), { recursive: true })
      await writeFile(
        path.join(OUT, 'mesures', `${locale}-${theme}.json`),
        `${JSON.stringify(rows, null, 2)}\n`,
        'utf8',
      )
      await context.close()
    })
  }
}
