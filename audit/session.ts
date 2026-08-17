/* ============================================================================
 * Entrer dans l'app dans un état connu — langue, thème, notice, document.
 *
 * Le harnais d'audit ne peut pas se contenter des gestes de `e2e/app.ts` : il
 * lui faut la langue et le thème **avant** le premier rendu, sinon la première
 * capture montre l'app dans la langue du navigateur puis la bascule, et les
 * quatre combinaisons ne sont plus comparables entre elles.
 *
 * Les préférences voyagent donc par `localStorage`, posé par un script
 * d'initialisation : c'est exactement le miroir que l'app lit au démarrage
 * (`theme/theme.ts`, `i18n/locale.ts`), et le régler revient à ouvrir l'app sur
 * un appareil qui l'a déjà réglée — pas à la piloter par une porte dérobée.
 * ==========================================================================*/

import { type BrowserContext, type Page, expect } from '@playwright/test'
import {
  type Locale,
  LOCALE_STORAGE_KEY,
  NOTICE_STORAGE_KEY,
  type Theme,
  THEME_STORAGE_KEY,
} from './routes'

/**
 * Pose langue, thème et accusé de lecture avant le premier rendu.
 *
 * `addInitScript` s'exécute sur chaque document du contexte, donc aussi après
 * une navigation : une capture ne peut pas retomber sur la notice à la
 * quinzième route.
 */
export async function seedPreferences(
  context: BrowserContext,
  locale: Locale,
  theme: Theme,
): Promise<void> {
  await context.addInitScript(
    ({ localeKey, localeValue, themeKey, themeValue, noticeKey }) => {
      try {
        localStorage.setItem(localeKey, localeValue)
        localStorage.setItem(themeKey, themeValue)
        localStorage.setItem(noticeKey, '1')
      } catch {
        /* Rien à faire : le contexte de Playwright n'est jamais en mode privé,
           et une capture qui montrerait la notice se verrait tout de suite. */
      }
    },
    {
      localeKey: LOCALE_STORAGE_KEY,
      localeValue: locale,
      themeKey: THEME_STORAGE_KEY,
      themeValue: theme,
      noticeKey: NOTICE_STORAGE_KEY,
    },
  )
}

/** Le libellé du bouton du jeu d'exemple, dans les deux langues. */
const EXAMPLE_BUTTON: Record<Locale, RegExp> = {
  fr: /charger l’exemple/i,
  en: /load the example/i,
}

/**
 * Charge le jeu d'exemple, et attend qu'il soit vraiment écrit.
 *
 * L'attente porte sur un **fait**, jamais sur un délai : le module arrive par
 * `import()`, construit cinq ans de document, puis l'écrit en base.
 *
 * Le fait choisi ne se lit pas dans un libellé, et c'est le premier essai qui
 * l'a montré : « Solde du mois » devient « Balance » en anglais, et une attente
 * écrite sur l'un des deux ne vaut que pour une langue. On attend donc la barre
 * de navigation — absente de la présentation, présente dès qu'un foyer existe —
 * puis la tuile accentuée du solde, que sa classe désigne dans les deux langues.
 */
export async function loadExample(page: Page, locale: Locale): Promise<void> {
  await page.goto('/')
  const button = page.getByRole('button', { name: EXAMPLE_BUTTON[locale] }).first()
  await button.waitFor({ state: 'visible', timeout: 30_000 })
  await button.click()
  await expect(page.getByRole('navigation').first()).toBeVisible({ timeout: 60_000 })
  await expect(page.locator('main .tile').first()).toBeVisible({ timeout: 60_000 })
}

/**
 * Attend qu'un écran ait fini d'arriver.
 *
 * **Pas de `networkidle`**, et c'est le premier essai qui l'a montré : l'app
 * est une PWA, son service worker garde le trafic ouvert, et l'état n'arrive
 * jamais — le harnais restait bloqué sur la deuxième capture. On attend donc
 * des faits qui, eux, se produisent : le contenu principal existe, les fontes
 * sont prêtes — une capture prise avant mesure la largeur d'une fonte de
 * secours —, et deux repaints sont passés.
 *
 * Chaque attente a son délai de garde : un écran qui n'arrive pas doit donner
 * une capture ratée qu'on regarde, pas un audit qui ne finit jamais.
 */
export async function settle(page: Page): Promise<void> {
  await page
    .locator('main, [role=main], #root > *')
    .first()
    .waitFor({ state: 'attached', timeout: 15_000 })
    .catch(() => {
      /* Un écran qui n'a rien monté se verra sur sa capture. */
    })
  await page
    .evaluate(async () => {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ])
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    })
    .catch(() => {
      /* Une navigation qui repart pendant l'évaluation : la capture suivante
         la rattrape. */
    })
}
