/* ============================================================================
 * Aucun écran ne déborde, sur le plus étroit des téléphones.
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

test.describe('sur un écran de 320 points', () => {
  test.use({ viewport: NARROW })

  test('ne déborde sur aucun écran, jeu d’exemple chargé', async ({ page }) => {
    await openApp(page)
    await loadExample(page)

    const guilty: string[] = []
    for (const screen of [{ path: '/', heading: /./ }, ...SCREENS]) {
      await page.goto(screen.path)
      await page.waitForLoadState('networkidle')
      const excess = await overflow(page)
      if (excess > 0) guilty.push(`${screen.path} dépasse de ${String(excess)} px`)
    }

    expect(guilty).toEqual([])
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
