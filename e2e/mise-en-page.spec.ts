/* ============================================================================
 * Aucun écran ne déborde, et aucune tuile ne coupe ce qu'elle porte.
 *
 * C'est la vérification que jsdom ne peut littéralement pas faire : il rend
 * tous les éléments à zéro pixel, donc « ça déborde » n'y a aucun sens. Et
 * c'est aussi celle qu'aucune relecture ne fait de façon fiable — un
 * débordement horizontal se voit sur l'écran qu'on n'a pas ouvert, avec le
 * document qu'on n'a pas chargé.
 *
 * 320 points de large : c'est l'iPhone SE de première génération, la borne
 * basse que le DS s'impose. Ce qui tient là tient partout.
 *
 * Le jeu d'exemple est ce qui rend le test utile : un document vide ne déborde
 * jamais. Ce sont les montants à sept chiffres, les libellés longs, les listes
 * à quinze lignes et les tableaux comparatifs qui poussent les murs, et il
 * n'existait pas d'autre moyen de les avoir tous d'un coup.
 * ==========================================================================*/

import { type Page, expect, test } from '@playwright/test'
import { SCREENS, loadExample, openApp } from './app'

/** La plus petite largeur que le design system s'engage à tenir. */
const NARROW = { width: 320, height: 640 }

/**
 * De combien la page dépasse sa propre fenêtre, horizontalement.
 *
 * Mesuré sur l'élément racine plutôt qu'en cherchant le coupable : un
 * débordement se propage, et le premier élément trop large n'est pas toujours
 * celui qui a tort. Le test dit qu'il y en a un ; le trouver est le travail de
 * qui corrige, et la capture d'échec le montre.
 */
async function overflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
}

/**
 * Ce qu'une tuile coupe de son propre contenu, en pixels et en clair.
 *
 * La mesure du dessus ne voit qu'une chose : la **page** dépasse-t-elle sa
 * fenêtre. Une tuile qui rogne son contenu ne dépasse rien du tout — c'est
 * précisément sa façon d'échouer, elle garde sa boîte et jette ce qui n'y
 * rentre pas. La grille bento pose des rangées d'une hauteur fixe, l'étiquette
 * d'une tuile étroite tient sur une ligne, et un chiffre se dimensionne sur la
 * largeur de son conteneur : trois mécanismes qui, chacun, préfèrent couper
 * plutôt que pousser. Aucun test ne les regardait, et c'est ce qui a laissé
 * passer une tuile d'autonomie amputée de 203px de hauteur.
 *
 * Deux comparaisons suffisent, et ce sont celles que l'architecture décrit :
 * le `scrollWidth` d'une étiquette contre sa boîte de contenu, le `scrollHeight`
 * d'une tuile contre le sien. Un pixel de tolérance parce que les hauteurs de
 * ligne tombent sur des fractions, et qu'un demi-pixel arrondi n'est pas une
 * coupe.
 */
async function clipped(page: Page, path: string): Promise<string[]> {
  return page.evaluate((where) => {
    const found: string[] = []
    const name = (el: Element): string =>
      (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40)

    for (const pill of document.querySelectorAll('.eyebrow-pill')) {
      const excess = pill.scrollWidth - pill.clientWidth
      if (excess > 1) found.push(`${where} — l’étiquette « ${name(pill)} » perd ${excess} px`)
    }
    for (const tile of document.querySelectorAll('.tile')) {
      const tall = tile.scrollHeight - tile.clientHeight
      const wide = tile.scrollWidth - tile.clientWidth
      if (tall > 1) found.push(`${where} — la tuile « ${name(tile)} » perd ${tall} px en hauteur`)
      if (wide > 1) found.push(`${where} — la tuile « ${name(tile)} » perd ${wide} px en largeur`)
    }
    return found
  }, path)
}

test.describe('sur un écran de 320 points', () => {
  test.use({ viewport: NARROW })

  /* Les deux mesures partagent une seule traversée : charger le jeu d'exemple
     et ouvrir quinze écrans coûte une quinzaine de secondes, et les refaire pour
     lire l'autre moitié du même DOM n'apprendrait rien de plus. */
  test('ne déborde et ne coupe rien, jeu d’exemple chargé', async ({ page }) => {
    await openApp(page)
    await loadExample(page)

    const guilty: string[] = []
    const cut: string[] = []
    for (const screen of [{ path: '/', heading: /./ }, ...SCREENS]) {
      await page.goto(screen.path)
      await page.waitForLoadState('networkidle')
      const excess = await overflow(page)
      if (excess > 0) guilty.push(`${screen.path} dépasse de ${String(excess)} px`)
      cut.push(...(await clipped(page, screen.path)))
    }

    expect(guilty).toEqual([])
    expect(cut).toEqual([])
  })

  /* Le bouton flottant a déjà volé les appuis d'un coin entier de l'écran une
     fois (voir le journal). Il est au-dessus de tout, donc rien ne dit qu'il ne
     recouvre pas une commande — sauf de vérifier que ce qui est sous lui reçoit
     bien les appuis. */
  test('laisse la barre de navigation cliquable sous le bouton flottant', async ({ page }) => {
    await openApp(page)
    await loadExample(page)

    const nav = page.getByRole('navigation').first()
    for (const label of ['Calendrier', 'Historique', 'Le mois']) {
      await nav.getByRole('link', { name: label }).click()
      await expect(page).toHaveURL(/\/(calendrier|historique)?$/)
    }
  })
})
