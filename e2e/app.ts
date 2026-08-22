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

/* La base, le magasin et la clé où l'app pose son document. Recopiés de
   `src/persistence/db.ts` plutôt qu'importés : ces tests lisent l'app
   **construite**, et n'ont aucun accès à ses modules. S'ils changeaient là-bas,
   `storedMembers` ne trouverait plus rien et l'attente ci-dessous échouerait en
   le disant — c'est le prix, et il est visible. */
const DB_NAME = 'tout-compte-fait'
const DOCUMENT_STORE = 'document'
const DOCUMENT_KEY = 'current'

/**
 * Le nombre de membres du foyer **enregistré en base**, et zéro tant qu'il n'y
 * a rien à lire.
 *
 * C'est la seule question dont la réponse ne dépend pas de ce que l'écran
 * montre : le document vit en mémoire dès que l'app l'a construit, et l'écran
 * l'affiche à cet instant — mais un rechargement, lui, ne relit que ce qui a
 * atteint IndexedDB.
 */
async function storedMembers(page: Page): Promise<number> {
  return page.evaluate(
    ({ name, store, key }) =>
      new Promise<number>((resolve, reject) => {
        const opening = indexedDB.open(name)
        /* La base n'existe pas encore : l'ouverture sans numéro de version en
           créerait une, vide, sous le nez de l'app qui ouvre la sienne en v2.
           On annule, et on répond « rien d'enregistré » — ce qui est le cas. */
        let absent = false
        opening.onupgradeneeded = () => {
          absent = true
          opening.transaction?.abort()
        }
        opening.onerror = () => {
          if (absent) resolve(0)
          else reject(opening.error ?? new Error('ouverture de la base refusée'))
        }
        opening.onsuccess = () => {
          const db = opening.result
          if (!db.objectStoreNames.contains(store)) {
            db.close()
            resolve(0)
            return
          }
          const read = db.transaction(store, 'readonly').objectStore(store).get(key)
          read.onerror = () => {
            db.close()
            reject(read.error ?? new Error('lecture du document refusée'))
          }
          read.onsuccess = () => {
            db.close()
            const saved = read.result as { household?: { members?: unknown[] } } | undefined
            resolve(saved?.household?.members?.length ?? 0)
          }
        }
      }),
    { name: DB_NAME, store: DOCUMENT_STORE, key: DOCUMENT_KEY },
  )
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
 *
 * Puis on attend un second fait, que l'écran ne dit pas : que le document soit
 * **enregistré**. L'app pose le document dans son état, rend l'écran, et écrit
 * ensuite — un demi-mégaoctet, cinq ans d'échéances. Tout scénario qui enchaîne
 * sur un `goto` ou un `reload` recharge l'app pour de bon, et une écriture
 * encore en vol se fait interrompre par la navigation : l'app repart alors sans
 * document, c'est-à-dire sur la page de présentation. Elle y montre un exemple
 * de répartition entre Alix et Camille — de quoi faire passer les premières
 * assertions d'un scénario et échouer sur la troisième personne du foyer, à
 * cinq secondes de là. C'est arrivé en intégration continue, où la machine est
 * lente et deux navigateurs se partagent deux cœurs.
 */
export async function loadExample(page: Page): Promise<void> {
  await page.getByRole('button', { name: /charger l’exemple/i }).first().click()
  await expect(page.getByRole('navigation').first()).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(/solde du mois/i).first()).toBeVisible({ timeout: 30_000 })
  await expect.poll(() => storedMembers(page), { timeout: 30_000 }).toBeGreaterThan(0)
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
  /* Le flux du mois a quitté la vue d'ensemble : c'est un écran, et il porte
     ses propres gestes. Sans lui dans cette liste, la moitié de ce que l'épargne
     savait faire ne serait plus ouverte par aucun scénario. */
  { path: '/epargne/mois', heading: /ce mois/i },
  { path: '/epargne/supports', heading: /supports/i },
  /* La décomposition : trois couches, une légende qu'on peut éteindre, un tracé
     par compte et un tableau à cinq colonnes. Rien de tout cela ne se mesure
     dans jsdom, et c'est l'écran de l'épargne qui porte le plus de figures. */
  { path: '/epargne/analyse', heading: /analyse/i },
  /* La fiche d'un objectif, prise sur le jeu d'exemple : c'est le seul écran qui
     porte un verdict, une jauge, une courbe et deux montants sur la même ligne
     — « 28 400 € sur 42 000 € », la plus longue chaîne de l'app. Rien de tout
     cela ne se mesure dans jsdom. */
  { path: '/epargne/objectifs/ex-g-apport', heading: /apport appartement/i },
  { path: '/credits', heading: /crédits et dettes/i },
  { path: '/avances', heading: /avances/i },
  { path: '/repartition', heading: /répartition/i },
  { path: '/personnes', heading: /personnes/i },
  { path: '/categories', heading: /catégories/i },
  /* Il manquait à la liste, et c'est l'écran qui en avait le plus besoin : un
     tracé, deux tableaux et une décomposition à deux colonnes, dont rien ne se
     mesure dans jsdom. Le tableau des jalons porte quatre colonnes de
     « ≈ 202 k€ » dès qu'on compare trois hypothèses — il défile dans son cadre,
     et c'est exactement le genre de chose qui pousse les murs quand le cadre
     manque. */
  { path: '/simulation', heading: /simulation/i },
  { path: '/plus', heading: /plus/i },
  /* Les deux écrans d'écriture courts de la refonte. Ils sont dans cette liste
     et pas les formulaires : ceux-là posent un pavé numérique, une rangée de
     pilules et un chiffre héros — trois choses dont la hauteur et la largeur ne
     se mesurent nulle part ailleurs, et qui doivent tenir à 320 points. */
  { path: '/depense/rapide', heading: /ajouter une dépense/i },
  { path: '/recurrences/nouveau', heading: /revient/i },
]
