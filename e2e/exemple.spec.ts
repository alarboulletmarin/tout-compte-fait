/* ============================================================================
 * Le jeu d'exemple, dans l'app construite.
 *
 * C'est le scénario qui justifie toute la mise en place : un document de cinq
 * ans, chargé d'un clic, puis chaque écran ouvert l'un après l'autre. Il ne
 * vérifie pas des calculs — c'est le travail des tests du domaine, qui les font
 * mieux et mille fois plus vite. Il vérifie ce qu'eux ne peuvent pas voir : que
 * les bundles se chargent, que rien n'explose, et que les chiffres arrivent
 * jusqu'à l'écran.
 * ==========================================================================*/

import { expect, test } from '@playwright/test'
import { SCREENS, loadExample, openApp, watchConsole } from './app'

test('charge cinq ans d’un clic, et ouvre chaque écran sans une erreur', async ({ page }) => {
  const said = watchConsole(page)
  await openApp(page)
  await loadExample(page)

  for (const screen of SCREENS) {
    await page.goto(screen.path)
    await expect(page.getByRole('heading', { name: screen.heading }).first()).toBeVisible()
  }

  expect(said).toEqual([])
})

test('remplit les tuiles du mois avec des chiffres, et non des états vides', async ({ page }) => {
  await openApp(page)
  await loadExample(page)

  /* Un montant, et non un tiret : c'est toute la différence entre un écran
     rempli et l'écran vide que le jeu d'exemple existe pour éviter. On lit le
     symbole de la devise et au moins un chiffre, sans jamais fixer la valeur —
     elle bouge avec la date du jour, et un test qui la figerait se périmerait
     au mois suivant. */
  const amount = /\d[\d\u202f\u00a0 ]*,\d{2}/

  /* Tout se lit dans `main` : la colonne latérale des grands écrans porte les
     mêmes mots dans ses liens, cachée, et un `getByText` non borné y tomberait
     — sur un lien invisible qui ne dit rien de la tuile qu'on croyait viser. */
  const body = page.locator('main').first()

  for (const tile of [/solde du mois/i, /où part l’argent/i, /capacité d’épargne/i, /répartition/i]) {
    await expect(body.getByText(tile).first()).toBeVisible()
  }
  await expect(body).toContainText(amount)

  /* Le suivi du mois annonce « n / m opérations confirmées » : le jeu laisse le
     mois courant à moitié fait, donc les deux nombres diffèrent. C'est l'état
     que l'app passe le plus de temps à afficher, et le seul qui montre à la
     fois du confirmé et du prévu. */
  const tracking = /(\d+)\s*\/\s*(\d+)\s*opérations confirmées/.exec(await body.innerText())
  expect(tracking).not.toBeNull()
  const [done, total] = tracking!.slice(1).map(Number)
  expect(done).toBeGreaterThan(0)
  expect(total).toBeGreaterThan(done)
})

test('montre les six crédits, dont ceux qui sont soldés', async ({ page }) => {
  await openApp(page)
  await loadExample(page)
  await page.goto('/credits')

  await expect(page.getByText(/reste à devoir/i).first()).toBeVisible()
  /* Trois crédits soldés : c'est l'état qu'un historique court ne peut pas
     porter, et il ne se voyait donc jamais à l'écran. Ils affichent zéro, et
     non un reliquat de quelques centimes. */
  await expect(page.getByText(/^soldé$/i)).toHaveCount(3)
  await expect(page.getByText(/mensualités restantes/i)).toHaveCount(3)
})

test('montre la même avance répétée d’une année sur l’autre', async ({ page }) => {
  await openApp(page)
  await loadExample(page)
  await page.goto('/avances')

  /* Quatre primes d'assurance auto avancées depuis le livret, une par an. Une
     avance isolée ressemble à une dépense compliquée ; quatre d'affilée
     montrent que c'est une façon de payer. */
  const body = page.locator('main').first()
  await expect(body.getByText('Assurance auto', { exact: true })).toHaveCount(4)
  /* Quatre soldées — les trois primes des années passées et la réparation —,
     deux en cours. Ce sont les deux états de la page, et aucun jeu de données
     plus court ne pouvait les montrer ensemble. */
  await expect(body.getByText(/entièrement reconstituée/i)).toHaveCount(4)
  await expect(body.getByText(/reste à remettre/i)).toHaveCount(2)
})

test('répartit les charges communes entre trois parts inégales', async ({ page }) => {
  await openApp(page)
  await loadExample(page)
  await page.goto('/repartition')

  await expect(page.getByText(/charges communes/i).first()).toBeVisible()
  for (const name of ['Alix', 'Camille', 'Sacha']) {
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible()
  }
  /* La somme des parts vaut le total au centime : l'app le dit à l'écran, et
     c'est la phrase que `largestRemainder` existe pour rendre vraie. */
  await expect(page.getByText(/somme des parts vaut le total/i)).toBeVisible()
})

test('réclame un relevé là où il en manque un, et se tait ailleurs', async ({ page }) => {
  await openApp(page)
  await loadExample(page)
  await page.goto('/epargne')

  /* Deux supports le réclament, pour deux raisons différentes — l'un n'a jamais
     été relevé, l'autre l'a été il y a une cadence entière. Les six autres se
     taisent : un écran qui réclamerait tout le temps ne réclamerait rien. */
  await expect(page.getByText(/aucun relevé/i).first()).toBeVisible()
  await expect(page.getByText(/à actualiser/i).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /mettre à jour les relevés/i })).toBeVisible()
})
