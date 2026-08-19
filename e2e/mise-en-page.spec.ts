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

    /* La simulation a deux modes, deux vues et trois feuilles, et la boucle
       ci-dessus n'ouvre que le mode simple et sa figure : le tableau — six
       colonnes de « ≈ 202 k€ » sur un écran de 320 points — et la feuille des
       comptes — une case, un capital, une arrivée et un plafond par compte du
       jeu d'exemple — ne seraient mesurés nulle part. C'est la moitié la plus
       dense de l'écran. */
    await page.goto('/simulation')
    await page.waitForLoadState('networkidle')
    await page.getByRole('radio', { name: 'Tableau' }).click()
    expect(await overflow(page)).toBe(0)
    expect(await clipped(page, '/simulation (tableau)')).toEqual([])

    await page.getByRole('radio', { name: 'Mes comptes' }).click()
    expect(await overflow(page)).toBe(0)
    expect(await clipped(page, '/simulation (comptes)')).toEqual([])

    await page.getByRole('button', { name: /^Comptes simulés :/ }).click()
    expect(await overflow(page)).toBe(0)
    expect(await clipped(page, '/simulation (feuille des comptes)')).toEqual([])

    expect(guilty).toEqual([])
    expect(cut).toEqual([])
  })

  /* La barre d'onglets porte une fente de 64px en son milieu, pour le disque de
     saisie qui descend dedans (DS §6). Ces 64px sont pris aux quatre onglets, et
     c'est la seule chose que cette mise en page puisse casser sans rien faire
     déborder : un libellé trop long ne pousse pas, il se fait trancher par le
     `truncate` qui le tient sur une ligne.
     320 points est la borne, « Calendrier » le mot le plus long, et le français
     la langue de référence — mais le test lit ce qui est rendu plutôt que de
     nommer un onglet, faute de quoi il resterait vert le jour où l'on ajoute une
     destination au libellé plus long. */
  test('ne tranche aucun libellé de la barre d’onglets', async ({ page }) => {
    await openApp(page)
    await loadExample(page)

    /* Par un locator et non par une lecture du DOM d'un seul coup : `evaluate`
       ne réessaie pas, et il tombait sur une barre pas encore montée. La
       première version rendait alors « aucune barre d'onglets » — un test rouge
       pour la seule raison qu'il avait regardé trop tôt, sur une mise en page
       qui, elle, était juste.
       La barre est la seule `nav` qui porte une liste : la colonne latérale
       range ses liens en `div`, et le pied de la présentation en rangée. */
    const bar = page.locator('nav').filter({ has: page.locator('ul') })
    await expect(bar).toBeVisible()

    const coupes = await bar.evaluate((nav) =>
      Array.from(nav.querySelectorAll('a'))
        .map((link) => link.querySelector('span:last-child'))
        .filter((label): label is HTMLElement => label !== null)
        .filter((label) => label.scrollWidth - label.clientWidth > 1)
        .map(
          (label) =>
            `« ${label.textContent ?? ''} » perd ${label.scrollWidth - label.clientWidth} px`,
        ),
    )

    expect(coupes).toEqual([])
  })

  /* Le bouton flottant a déjà volé les appuis d'un coin entier de l'écran une
     fois (voir le journal). Il est au-dessus de tout, donc rien ne dit qu'il ne
     recouvre pas une commande — sauf de vérifier que ce qui est sous lui reçoit
     bien les appuis. Depuis qu'il est centré, ce n'est plus un coin qu'il
     surplombe mais le milieu de la rangée : les deux onglets que ce scénario
     ouvre sont précisément ceux qui bordent la fente. */
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

/* ----------------------------------------------------------------------------
 * Les deux largeurs où la grille de contenu bascule.
 *
 * 320 points prouve que rien ne déborde ; il ne prouve rien de ce qui n'existe
 * qu'au-dessus. La grille de contenu hors bento (`.cols`, DS §5) passe à deux
 * colonnes à 768px, et les colonnes les plus étroites qu'elle produise ne sont
 * pas à 768 mais à **1024** — c'est là que la colonne latérale apparaît et
 * reprend 264 points au contenu, sans que la grille change de nombre de
 * colonnes. Une bascule qui ne serait mesurée qu'en bas de sa plage laisserait
 * donc passer exactement le cas qui casse.
 *
 * Ce que le test refuse est le même qu'à 320 : un débordement, une tuile qui
 * rogne, une étiquette tranchée. Plus une chose qu'on ne pouvait pas vérifier
 * en colonne unique — **qu'aucune grille ne tourne à une seule colonne
 * remplie**. Une `.cols` dont un seul enfant est rendu occupe la moitié gauche
 * et laisse l'autre vide : ce n'est pas une coupe, rien ne déborde, et ça se
 * voit immédiatement. C'est le mode d'échec propre à cette mise en page, et il
 * naît d'un état de données — un seul crédit, plus aucune récurrence active —
 * que personne ne pense à rouvrir à la main.
 * --------------------------------------------------------------------------*/
const WIDE = [
  { name: 'tablette', width: 768, height: 1024 },
  { name: 'desktop étroit', width: 1024, height: 900 },
  { name: 'desktop', width: 1440, height: 900 },
]

/**
 * Les grilles de contenu qui n'ont qu'un enfant à placer.
 *
 * On compte les enfants *rendus* : c'est React qui décide, et une condition
 * fausse ne laisse pas de trace dans le DOM. Une grille à deux colonnes qui
 * n'en remplit qu'une est un défaut de mise en page, jamais un état légitime —
 * l'écran doit alors reprendre la pile, comme le font `/recurrences` quand
 * toutes les règles sont arrêtées et `/credits` quand il n'y en a qu'un.
 */
async function lonelyGrid(page: Page, path: string): Promise<string[]> {
  return page.evaluate((where) => {
    const found: string[] = []
    for (const grid of document.querySelectorAll('.cols')) {
      const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').length
      if (columns > 1 && grid.children.length < 2) {
        found.push(`${where} — une grille de ${String(columns)} colonnes n’a qu’un enfant`)
      }
    }
    return found
  }, path)
}

for (const size of WIDE) {
  test.describe(`sur un écran de ${String(size.width)} points (${size.name})`, () => {
    test.use({ viewport: { width: size.width, height: size.height } })

    test('ne déborde, ne coupe rien et ne laisse pas de colonne vide', async ({ page }) => {
      await openApp(page)
      await loadExample(page)

      const guilty: string[] = []
      const cut: string[] = []
      const lonely: string[] = []
      for (const screen of [{ path: '/', heading: /./ }, ...SCREENS]) {
        await page.goto(screen.path)
        await page.waitForLoadState('networkidle')
        const excess = await overflow(page)
        if (excess > 0) guilty.push(`${screen.path} dépasse de ${String(excess)} px`)
        cut.push(...(await clipped(page, screen.path)))
        lonely.push(...(await lonelyGrid(page, screen.path)))
      }

      expect(guilty).toEqual([])
      expect(cut).toEqual([])
      expect(lonely).toEqual([])
    })
  })
}
