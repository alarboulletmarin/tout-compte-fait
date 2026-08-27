/* Parcours 1 — l'argent, de zéro : onboarding, saisies, balance, répartition.
   Chaque vérification est sémantique : les chiffres doivent se recomposer.

   Deux leçons du harnais, apprises à la dure :
   - `innerText` rend le texte APRÈS text-transform : les étiquettes de section
     se lisent « À CONFIRMER ». Toute recherche de texte est insensible à la
     casse (`contient`).
   - chaque `goto` recharge l'app entière : on attend une ancre de l'écran
     avant de lire son texte, sinon on lit l'écran de démarrage. */
import { bodyText, check, clickButton, euros, keypad, launch, must, report } from './harnais.mjs'

const { browser, page, errors } = await launch()

const contient = (text, needle) => text.toLowerCase().includes(needle.toLowerCase())
const amountField = () => page.getByLabel(/Montant/).first()
const selectByLabel = (re) => page.getByLabel(re).first()

/** Attend une ancre de l'écran, puis rend le texte entier, blancs normalisés. */
async function lireApres(anchor) {
  await page.getByText(anchor).first().waitFor()
  return bodyText(page)
}

/** Ouvre la fiche d'une ligne du mois. Le groupe du 1ᵉʳ se replie dès qu'un
    autre jour existe : on l'ouvre d'abord si la ligne ne se voit pas. */
async function openMonthRow(re) {
  await page.goto('/')
  await page.getByText(/ligne à ligne/i).first().waitFor()
  const row = page.getByRole('button', { name: re }).first()
  if (!(await row.isVisible().catch(() => false))) {
    // Les groupes sont des <details> natifs : l'en-tête est un <summary>.
    await page.locator('summary').filter({ hasText: '1 août' }).first().click()
  }
  await row.click()
  await page.waitForURL(/\/depense\//)
}

async function fullExpense({ amount, label, member, paidBy, category }) {
  await page.goto('/depense?sens=sortie')
  await amountField().waitFor()
  await amountField().fill(amount)
  await selectByLabel(/Catégorie/).selectOption({ index: category ?? 1 })
  await page.getByLabel(/Libellé/).first().fill(label)
  if (member !== undefined) await selectByLabel(/^Membre/).selectOption({ label: member })
  if (paidBy !== undefined) await selectByLabel(/Réglé par/).selectOption({ label: paidBy })
  await clickButton(page, /Ajouter l’opération/)
  await page.waitForURL((url) => !url.pathname.startsWith('/depense'))
}

/* --- L'arrivée et l'onboarding --------------------------------------------*/

await check(page, 'démarrage', 'l’arrivée offre ses portes', async () => {
  await page.goto('/')
  await page.getByRole('button', { name: /charger l’exemple/i }).first().waitFor()
  const text = await bodyText(page)
  must(contient(text, 'créer mon suivi'), 'pas de porte « Créer mon suivi »')
})

await check(page, 'démarrage', 'l’onboarding pose un foyer de deux', async () => {
  const door = page.getByRole('button', { name: /Créer mon suivi/ }).first()
  if (await door.isVisible().catch(() => false)) await door.click()
  else await page.getByRole('link', { name: /Créer mon suivi/ }).first().click()
  await page.waitForURL(/demarrer/)

  // 1. Qui vit ici ? — à plusieurs, deux prénoms.
  await page.getByRole('radio', { name: 'À plusieurs' }).click()
  await page.getByLabel(/Prénom/).fill('Alix')
  await clickButton(page, /^Ajouter$/)
  await page.getByLabel(/Prénom/).fill('Camille')
  await clickButton(page, /^Ajouter$/)
  await clickButton(page, /^Continuer$/)

  // 2 & 3. Les revenus, au pavé — qui lit les chiffres comme des centimes :
  // 2 000,00 € se tape « 200000 », depuis la droite, façon terminal.
  await page.getByText(/Ce que gagne Alix/).waitFor()
  await keypad(page, ['2', '0', '0', '0', '0', '0'])
  await clickButton(page, /^Continuer$/)
  await page.getByText(/Ce que gagne Camille/).waitFor()
  await keypad(page, ['1', '0', '0', '0', '0', '0'])
  await clickButton(page, /^Continuer$/)

  // 4. Le toit.
  await page.getByText(/te loger/).waitFor()
  await keypad(page, ['9', '0', '0', '0', '0'])
  await clickButton(page, /^Continuer$/)

  // 5. Les autres charges — rien.
  await page.getByText(/revient encore/).waitFor()
  await clickButton(page, /^Continuer$/)

  // 6. Point de départ — ce mois-ci (défaut).
  await page.getByText(/Point de départ/).waitFor()
  await clickButton(page, /^Continuer$/)

  // 7. Récapitulatif : le prévisionnel se recompose (3 000 − 900).
  await page.getByText(/Voilà ton mois/).waitFor()
  const summary = await bodyText(page)
  must(summary.includes(euros(210_000)), `prévisionnel attendu 2 100,00 — écran : ${summary.slice(0, 300)}`)
  await clickButton(page, /^Commencer$/)
  await page.waitForURL((url) => url.pathname === '/')
})

await check(page, 'mois', 'le mois s’ouvre avec les trois échéances et les bons totaux', async () => {
  const text = await lireApres(/lignes? à confirmer/i)
  must(contient(text, 'à confirmer'), 'pas de section « À confirmer »')
  must(text.includes(euros(300_000)), 'les revenus de 3 000,00 ne se lisent pas')
  must(text.includes(euros(90_000)), 'les charges de 900,00 ne se lisent pas')
})

/* --- La répartition, avant toute avance -----------------------------------*/

await check(page, 'répartition', 'les parts font le prorata des revenus', async () => {
  await page.goto('/repartition')
  const text = await lireApres(/Total des parts/i)
  must(text.includes('66,7'), 'la part d’Alix (66,7 %) manque')
  must(text.includes('33,3'), 'la part de Camille (33,3 %) manque')
  must(text.includes(euros(60_000)), 'le dû d’Alix (600,00) manque')
  must(text.includes(euros(30_000)), 'le dû de Camille (300,00) manque')
})

/* --- « Réglé par » : le prêt, puis l'avance sur le pot ---------------------*/

await check(page, 'balance', 'Alix règle la pharmacie de Camille — la balance s’inscrit', async () => {
  await fullExpense({ amount: '60', label: 'Pharmacie', member: 'Camille', paidBy: 'Alix' })
  await page.goto('/repartition')
  const text = await lireApres(/Total des parts/i)
  must(contient(text, 'Payé pour quelqu’un d’autre'), 'la ligne du prêt manque chez Alix')
  must(contient(text, 'Payé par quelqu’un d’autre'), 'la ligne du prêt manque chez Camille')
  // La pharmacie est à Camille, pas commune : pot 900, dûs 600/300,
  // Alix −60 (prêté), Camille +60 (doit) → virements 540 / 360.
  must(text.includes(euros(54_000)), 'le versement d’Alix (540,00) manque')
  must(text.includes(euros(36_000)), 'le versement de Camille (360,00) manque')
})

await check(page, 'balance', 'une charge du pot « réglée par » Alix se déduit sans s’attribuer', async () => {
  await fullExpense({ amount: '100', label: 'Électricité', paidBy: 'Alix' })
  await page.goto('/repartition')
  const text = await lireApres(/Total des parts/i)
  must(contient(text, 'Déjà avancé'), 'la ligne « Déjà avancé » manque')
  must(text.includes(euros(100_000)), 'le pot de 1 000,00 manque')
  // Dûs 666,67/333,33 ; Alix − 100 d'avance − 60 de prêt = 506,67.
  must(text.includes(euros(50_667)), 'le versement d’Alix (506,67) manque')
  must(text.includes(euros(39_333)), 'le versement de Camille (393,33) manque')
  must(contient(text, 'Total des virements'), 'la seconde ligne de vérification manque')
})

/* --- Le salaire du mois corrigé déplace la part ----------------------------*/

await check(page, 'prorata', 'corriger la paie du mois déplace la part de ce mois', async () => {
  // La ligne « Salaire » d'Alix, encore prévue : sa fiche, montant 1 500.
  await openMonthRow(/Salaire/)
  await amountField().waitFor()
  await amountField().fill('1500')
  await clickButton(page, /^Enregistrer$/)
  await page.waitForURL((url) => !url.pathname.startsWith('/depense'))
  await page.goto('/repartition')
  const text = await lireApres(/Total des parts/i)
  // Selon la ligne ouverte (Alix 2 000 → 1 500 : 60/40 ; Camille 1 000 → 1 500 : 57,1/42,9).
  must(text.includes('60,0') || text.includes('57,1'), 'la part n’a pas suivi la paie corrigée')
})

/* --- La portée « toute la règle » ------------------------------------------*/

await check(page, 'portée', 'corriger le loyer « toute la règle » déplace le pot', async () => {
  await openMonthRow(/Loyer/)
  await page.getByRole('radio', { name: /Toute la règle/ }).click()
  await amountField().fill('950')
  await clickButton(page, /^Enregistrer$/)
  await page.waitForURL((url) => !url.pathname.startsWith('/depense'))
  await page.goto('/repartition')
  const text = await lireApres(/Total des parts/i)
  must(text.includes(euros(105_000)), 'le pot n’est pas passé à 1 050,00 (950 + 100)')
  await page.goto('/recurrences')
  const rules = await lireApres(/Loyer/)
  must(contient(rules, '950'), 'la règle du loyer ne dit pas 950')
})

/* --- Défaire ---------------------------------------------------------------*/

await check(page, 'défaire', 'supprimer puis rétablir rend la ligne', async () => {
  await page.goto('/')
  await page.getByRole('button', { name: /Pharmacie/ }).first().click()
  await page.waitForURL(/\/depense\//)
  await clickButton(page, /Supprimer l’entrée/)
  await page.locator('dialog[open]').getByRole('button', { name: 'Supprimer' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/depense'))
  await clickButton(page, /Rétablir/)
  await page.goto('/')
  await page.getByRole('button', { name: /Pharmacie/ }).first().waitFor()
})

/* --- Le mois suivant : les règles suivent ----------------------------------*/

await check(page, 'mois', 'le mois suivant s’ouvre seul, au nouveau prix du loyer', async () => {
  await page.goto('/')
  await page.getByRole('button', { name: /Mois suivant/ }).first().waitFor()
  await page.getByRole('button', { name: /Mois suivant/ }).click()
  await page.getByText(/Loyer/).first().waitFor()
  const text = await bodyText(page)
  must(text.includes('950'), 'le loyer du mois suivant n’est pas au nouveau prix')
})

await check(page, 'santé', 'aucune erreur JavaScript sur tout le parcours', async () => {
  must(errors.length === 0, `erreurs console : ${errors.slice(0, 3).join(' | ')}`)
})

report('parcours-argent.json')
await browser.close()
