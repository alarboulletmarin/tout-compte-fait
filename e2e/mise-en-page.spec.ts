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
import { SCREENS, enterEmpty, loadExample, openApp } from './app'

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

/**
 * Les cases d'une grille bento que rien ne couvre.
 *
 * C'est le mode d'échec propre au bento, et le seul que rien ne signalait :
 * une tuile qui s'efface — le cahier §4.6 veut qu'une tuile sans rien à dire
 * s'en aille — laisse un trou dans le pavage, et un trou ne déborde pas, ne
 * coupe rien, ne lève aucune erreur. Il se voit, c'est tout, sur l'écran qu'on
 * n'a pas ouvert à la largeur qu'on n'a pas essayée.
 *
 * On lit les pistes résolues plutôt que les propriétés déclarées : avec
 * `grid-auto-flow: row dense`, la place d'une tuile n'est nulle part dans son
 * style — c'est le navigateur qui la trouve, et la géométrie est le seul endroit
 * où la réponse existe. `src/features/dashboard/pavage.test.ts` tient l'autre
 * bout, sur les compositions que le jeu d'exemple ne produit pas.
 */
async function hollow(page: Page, path: string): Promise<string[]> {
  return page.evaluate((where) => {
    const found: string[] = []
    for (const grid of document.querySelectorAll('.bento')) {
      const box = grid.getBoundingClientRect()
      const style = getComputedStyle(grid)
      const gap = Number.parseFloat(style.gap) || 0
      /* Les bornes de chaque piste, en coordonnées de la grille. */
      const bands = (tracks: number[]): [number, number][] => {
        const at: [number, number][] = []
        let edge = 0
        for (const size of tracks) {
          at.push([edge, edge + size])
          edge += size + gap
        }
        return at
      }
      const columns = bands(style.gridTemplateColumns.split(' ').map(Number.parseFloat))
      const rows = bands(style.gridTemplateRows.split(' ').map(Number.parseFloat))

      const covered = new Set<string>()
      for (const tile of grid.children) {
        const r = tile.getBoundingClientRect()
        const left = r.left - box.left
        const top = r.top - box.top
        columns.forEach(([a, b], column) => {
          if (b <= left + 1 || a >= left + r.width - 1) return
          rows.forEach(([u, v], row) => {
            if (v <= top + 1 || u >= top + r.height - 1) return
            covered.add(`${String(column)}:${String(row)}`)
          })
        })
      }
      let empty = 0
      for (let row = 0; row < rows.length; row += 1)
        for (let column = 0; column < columns.length; column += 1)
          if (!covered.has(`${String(column)}:${String(row)}`)) empty += 1
      if (empty > 0) {
        const formats = [...grid.children]
          .map((tile) => [...tile.classList].find((c) => c.startsWith('span-')) ?? '?')
          .join(' ')
        found.push(
          `${where} — une grille de ${String(columns.length)} colonnes laisse ${String(empty)} case(s) vide(s) : ${formats}`,
        )
      }
    }
    return found
  }, path)
}

/**
 * Les lectures du mois, l'une après l'autre.
 *
 * La composition d'une grille dépend du filtre : le pot commun retire le solde,
 * les revenus et l'épargne ; une personne retire la Répartition et fait
 * apparaître deux tuiles de membre. Trois compositions par grille, qu'une seule
 * ouverture de l'écran ne montre jamais.
 */
async function eachReading(page: Page, look: (where: string) => Promise<void>): Promise<void> {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const chips = page.locator('header button[role="radio"], header button')
  const labels = (await chips.allInnerTexts())
    .map((text) => text.trim())
    .filter((text) => text !== '' && !/\d/.test(text))
  for (const label of [...new Set(labels)]) {
    const chip = page.locator('header button', { hasText: new RegExp(`^${label}$`) }).first()
    if ((await chip.count()) === 0) continue
    await chip.click()
    await page.waitForTimeout(300)
    await look(`/ (${label})`)
  }
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
    const gaps: string[] = []
    for (const screen of [{ path: '/', heading: /./ }, ...SCREENS]) {
      await page.goto(screen.path)
      await page.waitForLoadState('networkidle')
      const excess = await overflow(page)
      if (excess > 0) guilty.push(`${screen.path} dépasse de ${String(excess)} px`)
      cut.push(...(await clipped(page, screen.path)))
      gaps.push(...(await hollow(page, screen.path)))
    }

    /* Le pavage du bento dépend du filtre, et une seule ouverture du mois n'en
       montre qu'une composition sur trois. */
    await eachReading(page, async (where) => {
      gaps.push(...(await hollow(page, where)))
      cut.push(...(await clipped(page, where)))
    })

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
    expect(gaps).toEqual([])
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
      const gaps: string[] = []
      for (const screen of [{ path: '/', heading: /./ }, ...SCREENS]) {
        await page.goto(screen.path)
        await page.waitForLoadState('networkidle')
        const excess = await overflow(page)
        if (excess > 0) guilty.push(`${screen.path} dépasse de ${String(excess)} px`)
        cut.push(...(await clipped(page, screen.path)))
        lonely.push(...(await lonelyGrid(page, screen.path)))
        gaps.push(...(await hollow(page, screen.path)))
      }

      /* Les trois lectures du mois, où le pavage se joue vraiment : c'est en
         retirant des tuiles qu'une grille perd son pavage, et c'est le filtre
         qui en retire. */
      await eachReading(page, async (where) => {
        gaps.push(...(await hollow(page, where)))
        cut.push(...(await clipped(page, where)))
      })

      expect(guilty).toEqual([])
      expect(cut).toEqual([])
      expect(lonely).toEqual([])
      expect(gaps).toEqual([])
    })
  })
}

/* ----------------------------------------------------------------------------
 * Les deux écrans d'avant le document.
 *
 * Ils échappaient à tout ce qui précède, et pour une raison mécanique : la
 * boucle ci-dessus charge le jeu d'exemple avant d'ouvrir quoi que ce soit, or
 * ces deux-là ne s'affichent qu'avant qu'un document existe — la présentation
 * change de boutons, et les questions ne sont plus routées du tout. Ils sont
 * pourtant les seuls que voit quelqu'un qui arrive pour la première fois, et ils
 * portent ce qu'aucun autre ne porte à cette largeur : deux colonnes dont la
 * droite est plafonnée à 440px, trois tuiles de démonstration, un pavé numérique
 * et un chiffre héros.
 *
 * La file des questions se parcourt vraiment, carte par carte : la première ne
 * dit rien de la hauteur d'un pavé sur un écran de 320 points, ni de celle du
 * récapitulatif.
 * --------------------------------------------------------------------------*/
for (const size of [{ name: 'téléphone', ...NARROW }, ...WIDE]) {
  test.describe(`avant le document, sur un écran de ${String(size.width)} points`, () => {
    test.use({ viewport: { width: size.width, height: size.height } })

    test('ne déborde, ne coupe rien et ne laisse pas de colonne vide', async ({ page }) => {
      await openApp(page)

      const guilty: string[] = []
      const cut: string[] = []
      const lonely: string[] = []

      const measure = async (where: string): Promise<void> => {
        const excess = await overflow(page)
        if (excess > 0) guilty.push(`${where} dépasse de ${String(excess)} px`)
        cut.push(...(await clipped(page, where)))
        lonely.push(...(await lonelyGrid(page, where)))
      }

      await page.goto('/bienvenue')
      await page.waitForLoadState('networkidle')
      /* La page arrive par `import()` : sans cette attente, on mesurerait la
         coquille vide, qui ne déborde jamais. */
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await measure('/bienvenue')

      await page.goto('/demarrer')
      await page.waitForLoadState('networkidle')
      await expect(page.getByRole('radiogroup')).toBeVisible()
      /* Six cartes en solo : le foyer, un revenu, le logement, les autres
         charges, le point de départ, le récapitulatif. « Plus tard » les
         traverse sans rien saisir, ce qui est exactement le parcours qu'on veut
         mesurer — les cartes vides sont les plus hautes, puisque leurs états
         vides prennent la place que les données prendraient. */
      for (let card = 1; card <= 6; card += 1) {
        await measure(`/demarrer (carte ${String(card)})`)
        if (card < 6) await page.getByRole('button', { name: 'Plus tard' }).click()
      }

      expect(guilty).toEqual([])
      expect(cut).toEqual([])
      expect(lonely).toEqual([])
    })
  })
}

/* ----------------------------------------------------------------------------
 * Le document vide.
 *
 * Aucun scénario ne l'ouvrait : tous chargent le jeu d'exemple, qui est le
 * contraire de ce qu'on mesure ici. Un écran vide n'a ni tuile à couper ni liste
 * à faire déborder — et c'est précisément pour ça qu'il n'était jamais regardé.
 *
 * Ce qu'on lui demande est d'une autre nature : **le geste qu'il propose doit
 * être sous les yeux**. Un état vide est une invitation (cahier §4.6), et une
 * invitation qu'il faut aller chercher en défilant n'en est pas une. Le
 * calendrier l'a montré — sa grille fait la hauteur d'un mois, et l'invitation
 * tombait dessous aux deux formats.
 * --------------------------------------------------------------------------*/
const BARE: string[] = [
  '/',
  '/calendrier',
  '/historique',
  '/recurrences',
  '/epargne',
  '/epargne/supports',
  '/credits',
  '/avances',
  '/repartition',
  '/flux',
]

for (const size of [{ name: 'téléphone', ...NARROW }, ...WIDE]) {
  test.describe(`sur un document vide, écran de ${String(size.width)} points`, () => {
    test.use({ viewport: { width: size.width, height: size.height } })

    test('offre son geste sans qu’il faille défiler, et ne coupe rien', async ({ page }) => {
      await openApp(page)
      await enterEmpty(page)

      const guilty: string[] = []
      const cut: string[] = []
      const buried: string[] = []
      /* Combien d'écrans ont vraiment montré une invitation. Sans ce compte, un
         scénario qui mesurerait la page de présentation à la place de l'app
         resterait vert : il ne trouverait aucune invitation, donc aucun
         reproche. C'est arrivé. */
      let seen = 0
      for (const path of BARE) {
        await page.goto(path)
        await page.waitForLoadState('networkidle')
        expect(new URL(page.url()).pathname, 'l’app doit être entrée').not.toBe('/bienvenue')
        const excess = await overflow(page)
        if (excess > 0) guilty.push(`${path} dépasse de ${String(excess)} px`)
        cut.push(...(await clipped(page, path)))

        /* Ce que l'écran vide **offre** doit tenir dans la fenêtre, en entier,
           sans qu'on l'ait fait défiler : c'est `[data-empty]`, la rangée que
           `EmptyState` et `MonthEmptyTile` marquent eux-mêmes. On ne cherche pas
           « le premier bouton de la page » — une grille de calendrier porte une
           case cliquable par jour, et la première est en haut quoi qu'il
           arrive : la mesure resterait verte avec l'invitation enterrée
           dessous, ce qu'elle a fait avant qu'on la corrige. */
        const offered = await page.evaluate(() => {
          const row = document.querySelector('main [data-empty]')
          return row === null ? null : Math.round(row.getBoundingClientRect().bottom)
        })
        if (offered !== null) seen += 1
        if (offered !== null && offered > size.height) {
          buried.push(
            `${path} — ce qu’il offre finit à ${String(offered)} px, hors des ${String(size.height)}`,
          )
        }
      }

      expect(guilty).toEqual([])
      expect(cut).toEqual([])
      expect(buried).toEqual([])
      /* Le mois, le calendrier, les récurrences, les crédits, les avances et le
         détail en offrent un ; l'historique, l'épargne et la répartition disent
         seulement pourquoi ils sont vides. */
      expect(seen).toBeGreaterThanOrEqual(5)
    })
  })
}
