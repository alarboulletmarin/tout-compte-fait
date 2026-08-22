/* ============================================================================
 * Les gestes au pointeur, là où seul un vrai navigateur peut répondre.
 *
 * Trois pannes ont vécu dans le dépôt sans qu'aucun test ne bronche, et elles
 * ont toutes la même racine : jsdom n'implémente pas la capture de pointeur, et
 * ne peint rien. Il ne peut donc voir ni l'une ni l'autre des deux choses que
 * ce fichier vérifie.
 *
 * - **La capture retarge le clic.** `setPointerCapture` déplace aussi les
 *   événements de compatibilité de la souris — `mousedown`, `mouseup`, et le
 *   `click` qui en découle — vers l'élément qui capture. Armée dès la pression,
 *   elle rendait muet tout bouton posé sous elle : le bloc titre ne ramenait
 *   plus au mois courant, et une rangée encore à confirmer n'ouvrait plus sa
 *   fiche. Dans jsdom, `click` part sur sa cible quoi qu'il arrive, et les
 *   tests unitaires de `MonthNav` et de `SwipeRow` passaient — avant comme
 *   après.
 * - **Le défilement ne se mesure pas non plus.** jsdom n'a pas de mise en page :
 *   `scrollY` y vaut zéro pour toujours, et « l'écran s'ouvre au milieu » n'y a
 *   aucun sens.
 * - **Une classe sans règle ne casse rien.** Le fond révélé sous une rangée
 *   glissée demandait `inset-y-0`, que la couche d'utilitaires écrite à la main
 *   n'avait pas : il tombait à la hauteur de son propre texte, treize pixels
 *   sous une rangée de cinquante-six. `npm run classes:check` attrape désormais
 *   la classe manquante ; ce test-ci attrape la hauteur, qui est ce qu'on
 *   voulait vraiment.
 * ==========================================================================*/

import { type Locator, type Page, expect, test } from '@playwright/test'
import { loadExample, openApp } from './app'

/** Le chevron qui recule d'un mois — et, par lui, l'en-tête qui le porte. */
const backOneMonth = (page: Page): Locator => page.getByRole('button', { name: /mois précédent/i })

/**
 * L'en-tête du mois, une fois qu'il est vraiment là.
 *
 * `loadExample` rend la main dès que la barre de navigation et le solde sont à
 * l'écran, ce qui arrive un souffle avant que la route du mois ait remplacé
 * celle de la présentation : lire `header` à cet instant ramène une fois sur
 * dix le bandeau de la page d'accueil. On attend donc l'en-tête **qui porte le
 * chevron du mois** — il n'en existe qu'un, et il n'existe que là.
 */
async function monthHeader(page: Page): Promise<Locator> {
  const header = page.locator('header').filter({ has: backOneMonth(page) })
  await expect(header).toBeVisible()
  return header
}

/** Le mois affiché, tel que cet en-tête l'écrit. */
async function heading(page: Page): Promise<string> {
  return (await (await monthHeader(page)).innerText()).split('\n').slice(0, 2).join(' · ')
}

/**
 * Une échéance encore à confirmer, ouverte et amenée sous les yeux.
 *
 * Le mois groupe ses lignes par jour, et referme les jours passés : la première
 * rangée glissable du document est le plus souvent dans un groupe replié, où
 * elle a bien une boîte mais aucun pixel visible. On ouvre donc le sien avant
 * de viser.
 */
async function firstPlannedRow(page: Page): Promise<Locator> {
  await monthHeader(page)
  await expect(page.locator('button[aria-label^="Confirmer"]')).not.toHaveCount(0)
  const confirm = page.locator('button[aria-label^="Confirmer"]').first()
  await confirm.evaluate((node) => {
    node.closest('details')?.setAttribute('open', '')
  })
  const row = page.locator('div[style*="pan-y"]').filter({ has: confirm }).first()
  await row.scrollIntoViewIfNeeded()
  return row
}

test('le bloc titre ramène au mois courant quand on le tape', async ({ page }) => {
  await openApp(page)
  await loadExample(page)

  const current = await heading(page)
  await backOneMonth(page).click()
  await backOneMonth(page).click()
  expect(await heading(page)).not.toBe(current)

  /* Le nom accessible porte le mois **et** son année : c'est par lui qu'on le
     vise, parce que rien du texte visible ne nomme les deux. */
  await page.getByRole('button', { name: /^revenir à /i }).click()

  expect(await heading(page)).toBe(current)
  /* Et le bloc redevient un titre muet : un geste qui ne bougerait plus rien
     apprend à ignorer ceux qui bougent quelque chose. */
  await expect(page.getByRole('button', { name: /^revenir à /i })).toHaveCount(0)
})

test('le retour nomme son année dès qu’elle n’est plus celle qu’on lit', async ({ page }) => {
  await openApp(page)
  await loadExample(page)

  /* Douze mois en arrière : le millésime de gauche est celui du mois affiché,
     et il ne dit plus rien de la destination. */
  await monthHeader(page)
  for (let step = 0; step < 12; step += 1) {
    await backOneMonth(page).click()
  }

  await expect(page.getByRole('button', { name: /^revenir à /i })).toContainText(
    /revenir à \p{L}+ \d{4}/u,
  )
})

test('une rangée encore à confirmer ouvre sa fiche au clic', async ({ page }) => {
  await openApp(page)
  await loadExample(page)

  const row = await firstPlannedRow(page)
  await row.click({ position: { x: 60, y: 28 } })

  /* La fiche d'une ligne est un écran à elle, et l'URL le dit. */
  await expect(page).toHaveURL(/\/(depense|revenu|epargne|credit)\//)
})

test('le glissé confirme, et son fond fait la hauteur de la rangée', async ({ page }) => {
  await openApp(page)
  await loadExample(page)

  const row = await firstPlannedRow(page)
  const label = await row.locator('button[aria-label^="Confirmer"]').getAttribute('aria-label')
  const box = (await row.boundingBox())!
  const middle = box.y + box.height / 2

  await page.mouse.move(box.x + 40, middle)
  await page.mouse.down()
  await page.mouse.move(box.x + 90, middle, { steps: 6 })
  await page.mouse.move(box.x + 150, middle, { steps: 6 })

  /* Le fond révélé, mesuré pendant le geste : il tient toute la rangée, et non
     la seule ligne de son libellé. Un pixel de tolérance — les hauteurs de
     ligne tombent sur des fractions. */
  const revealed = (await row.locator('span[aria-hidden="true"]').first().boundingBox())!
  expect(revealed.height).toBeGreaterThanOrEqual(box.height - 1)

  await page.mouse.up()

  /* Et le geste écrit : l'échéance n'a plus rien à confirmer. */
  await expect(page.locator(`button[aria-label="${label!}"]`)).toHaveCount(0)
  /* Sans emporter le clic avec lui : un glissé n'ouvre pas la fiche. */
  await expect(page).not.toHaveURL(/\/(depense|revenu|epargne|credit)\//)
})

/**
 * Amène la tuile des crédits sous les yeux, et rend l'endroit où la taper.
 *
 * On ne passe pas par `locator.click()` : il ramène d'abord sa cible dans la
 * vue, donc la page défile avant le clic et la position qu'on croyait mesurer
 * n'est plus celle qu'on avait. C'est ce qui a fait passer une première version
 * de ce test pour un échec de l'app. On place la page, on lit, puis on tape les
 * coordonnées — c'est ce que fait un doigt.
 */
async function placeCreditsTile(page: Page): Promise<{ x: number; y: number }> {
  const tile = page.locator('.tile[aria-label*="rédits"]')
  await expect(tile).toHaveCount(1)
  await page.evaluate(() => {
    const node = document.querySelector('.tile[aria-label*="rédits"]')
    if (node !== null) window.scrollTo(0, window.scrollY + node.getBoundingClientRect().top - 200)
  })
  const box = (await tile.boundingBox())!
  return { x: box.x + Math.min(box.width / 2, 120), y: box.y + 30 }
}

/** Où en est le document, verticalement. */
const scrollY = (page: Page): Promise<number> => page.evaluate(() => Math.round(window.scrollY))

test('un écran qu’on ouvre s’ouvre par le haut, et un retour rend sa place', async ({ page }) => {
  await openApp(page)
  await loadExample(page)
  await monthHeader(page)

  const where = await placeCreditsTile(page)
  const left = await scrollY(page)
  /* La tuile des crédits est en bas de l'écran du mois : l'amener sous les yeux
     met la page à plus de quatre cents pixels, sans quoi le test ne mesurerait
     rien. */
  expect(left).toBeGreaterThan(400)

  await page.mouse.click(where.x, where.y)
  await expect(page).toHaveURL(/\/credits$/)
  /* Le haut, et le haut exact : `<main>` commence six pixels sous le bord du
     document, et le focus que la coquille lui donne pour les lecteurs d'écran
     l'y ramenait. */
  await expect.poll(() => scrollY(page)).toBe(0)

  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
  /* La place qu'on avait, au pixel. Elle se relève au clic et non en quittant
     l'écran : à cet instant-là, le navigateur a déjà rabattu la position sur la
     hauteur du nouvel écran — voir `ScrollMemory`. */
  await expect.poll(() => scrollY(page)).toBe(left)
})
