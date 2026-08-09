/* ============================================================================
 * Les tests de bout en bout — l'app construite, dans un vrai navigateur.
 *
 * Les 1 400 tests de `src/**` s'exécutent dans jsdom : ils montent un composant
 * ou un écran, avec `fake-indexeddb` là où le stockage compte. C'est rapide, et
 * c'est la bonne granularité pour presque tout. Mais jsdom n'a ni moteur de
 * rendu, ni service worker, ni découpage de bundle : quatre choses qu'aucun de
 * ces tests ne peut vérifier, et qui sont pourtant celles qui cassent en
 * production.
 *
 * - **Le chargement paresseux.** Le jeu d'exemple, le schéma, la page de
 *   présentation, les graphiques cumulés arrivent tous par `import()`
 *   dynamique. Un test jsdom les importe directement : il ne dit donc rien du
 *   chemin que le navigateur emprunte pour aller les chercher, ni de ce qui se
 *   passe s'il n'y arrive pas.
 * - **La mise en page.** Le DS parle de largeurs, de débordements et d'un
 *   bouton flottant qui ne doit voler l'appui de personne. jsdom rend tous les
 *   éléments à zéro pixel — il ne peut pas répondre.
 * - **Le stockage réel.** `fake-indexeddb` est une réimplémentation ; ce qui
 *   compte à l'arrivée, c'est qu'un document survive à un vrai rechargement
 *   dans un vrai navigateur.
 * - **La taille du document.** Cinq ans font 2 500 échéances et un demi-mégaoctet.
 *   Un écran qui les recalcule mal ne se voit qu'en les ayant vraiment.
 *
 * **C'est le jeu d'exemple qui rend ces tests possibles**, et c'est pour ça
 * qu'ils arrivent avec lui : un scénario de bout en bout a besoin d'un document
 * complet, et il n'existait jusqu'ici aucun moyen d'en obtenir un sans le
 * saisir écran par écran — c'est-à-dire sans écrire, en préambule de chaque
 * test, un second jeu de données à maintenir. Le bouton « Charger l'exemple »
 * est ce préambule, déjà écrit, déjà testé, et surtout **déterministe** : le
 * même jour rend le même octet.
 *
 * Un seul navigateur, Chromium, et une seule taille d'écran par défaut : ce
 * n'est pas une matrice de compatibilité, c'est une vérification que l'app
 * construite se charge, navigue et calcule. Ce que les navigateurs font
 * différemment se règle au design system, pas ici.
 * ==========================================================================*/

import { defineConfig, devices } from '@playwright/test'

/** Le port du serveur de prévisualisation. Fixe : les traces le citent. */
const PORT = 4173

export default defineConfig({
  testDir: './e2e',
  /* Le jeu d'exemple est déterministe, mais il est **ancré sur la date du
     jour** : deux tests qui le chargent à cheval sur minuit ne verraient pas le
     même mois courant. Chaque test le recharge chez lui, et rien n'est partagé
     entre eux. */
  fullyParallel: true,
  /* Aucune reprise : un test de bout en bout qui ne passe qu'une fois sur deux
     ne dit rien, et le masquer derrière une seconde tentative revient à écrire
     un test qui ment. En intégration continue, `forbidOnly` empêche en plus
     qu'un `test.only` oublié réduise la suite à une ligne. */
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI === undefined ? [['list']] : [['github'], ['list']],
  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    /* Les montants de l'app se comptent en montant à l'écran. C'est joli, et
       c'est testé chez lui ; ici, ça rendrait toute lecture de texte dépendante
       de l'instant où on la fait — deux captures du même écran n'auraient
       jamais le même chiffre. L'app respecte déjà la préférence système, et la
       poser ici revient à regarder l'écran que voit une personne qui l'a
       réglée, non un écran de circonstance. C'est la même décision que
       `src/test/setup.ts` prend pour jsdom, et pour la même raison. */
    contextOptions: { reducedMotion: 'reduce' },
    /* La trace ne se garde que d'un échec : elle pèse quelques mégaoctets, et
       personne n'ouvre celle d'un test vert. */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      /* Un téléphone : c'est la cible de l'app, et la largeur où tout ce qui
         déborde déborde. Le grand écran a sa vérification à lui, dans
         `mise-en-page.spec.ts`, qui règle la fenêtre lui-même. */
      name: 'chromium-mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],
  /* On teste **ce qui est servi**, jamais ce que le serveur de développement
     assemble à la volée : le découpage des bundles, les URL avec empreinte et
     le service worker n'existent que dans `dist/`. La construction fait donc
     partie de la commande — un `dist/` périmé testerait le commit d'avant. */
  webServer: {
    command: `npm run build && npx vite preview --port ${String(PORT)} --strictPort`,
    url: `http://localhost:${String(PORT)}/`,
    reuseExistingServer: process.env.CI === undefined,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
