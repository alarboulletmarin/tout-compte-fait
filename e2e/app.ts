/* ============================================================================
 * Les gestes que tous les scénarios refont — écrits une fois.
 *
 * Un test de bout en bout qui recopie « ouvrir, fermer la notice, charger
 * l'exemple, attendre » finit par en avoir cinq versions dont trois attendent
 * mal. Ces trois fonctions sont donc le seul endroit qui sache comment on entre
 * dans l'app.
 * ==========================================================================*/

import { type Page, expect } from '@playwright/test'

/**
 * Ce que la console du navigateur a dit de travers pendant le scénario.
 *
 * À brancher **avant** la première navigation, sans quoi une erreur du
 * démarrage passerait inaperçue — et c'est précisément celle qu'on cherche.
 * Une app qui se charge sans rien dire est la moitié de ce qu'on vérifie ici :
 * l'autre moitié, ce sont les assertions du scénario.
 */
export function watchConsole(page: Page): string[] {
  const said: string[] = []
  page.on('pageerror', (error) => said.push(`erreur : ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') said.push(`console : ${message.text()}`)
  })
  /* Une requête qui échoue est un bundle qu'on n'a pas su aller chercher —
     exactement ce qu'un test jsdom ne peut pas voir, puisqu'il n'en demande
     aucun. */
  page.on('requestfailed', (request) => {
    said.push(`requête échouée : ${request.url()}`)
  })
  return said
}

/**
 * La notice de confidentialité, qui s'ouvre au premier lancement.
 *
 * Son bouton reste désactivé tant que la case n'est pas cochée : c'est voulu,
 * et le test la coche comme une personne le ferait plutôt que de contourner la
 * feuille. Elle est mémorisée dans `localStorage`, donc elle ne revient pas —
 * mais chaque test a son contexte, donc elle revient pour chacun d'eux.
 */
export async function dismissNotice(page: Page): Promise<void> {
  const sheet = page.locator('dialog[open]')
  if ((await sheet.count()) === 0) return
  const box = sheet.locator('input[type=checkbox]')
  if ((await box.count()) > 0) await box.first().check()
  await sheet.getByRole('button').last().click()
  await expect(sheet).toHaveCount(0)
}

/**
 * Ouvre l'app sur un document vide, notice fermée.
 *
 * L'app neuve s'ouvre sur la page de présentation : c'est là que se trouve le
 * bouton du jeu d'exemple, et c'est donc par là que passe tout scénario qui a
 * besoin de données.
 */
export async function openApp(page: Page): Promise<void> {
  await page.goto('/')
  await dismissNotice(page)
}

/**
 * Charge le jeu d'exemple, et attend qu'il soit vraiment là.
 *
 * L'attente ne porte pas sur un délai mais sur un **fait** : le module de
 * l'exemple arrive par `import()` dynamique, il construit cinq ans de document,
 * puis l'écrit en base. Attendre « deux secondes » marcherait sur cette
 * machine-ci et nulle part ailleurs. On attend donc que la barre de navigation
 * de l'app soit affichée — elle ne l'est pas sur la page de présentation — et
 * que le solde du mois soit chiffré.
 */
export async function loadExample(page: Page): Promise<void> {
  await page.getByRole('button', { name: /charger l’exemple/i }).first().click()
  await expect(page.getByRole('navigation').first()).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(/solde du mois/i).first()).toBeVisible({ timeout: 30_000 })
}

/**
 * Les écrans que le jeu d'exemple doit remplir, et le titre auquel on les
 * reconnaît.
 *
 * Le mois n'y figure pas : il n'a pas de titre, son en-tête porte le nom du
 * mois affiché, et c'est `loadExample` qui l'a déjà attendu.
 */
export const SCREENS: { path: string; heading: RegExp }[] = [
  { path: '/calendrier', heading: /calendrier/i },
  { path: '/historique', heading: /historique/i },
  { path: '/recurrences', heading: /récurrences/i },
  { path: '/epargne', heading: /épargne/i },
  { path: '/credits', heading: /crédits et dettes/i },
  { path: '/avances', heading: /avances/i },
  { path: '/repartition', heading: /répartition/i },
  { path: '/personnes', heading: /personnes/i },
  { path: '/categories', heading: /catégories/i },
  { path: '/plus', heading: /plus/i },
]
