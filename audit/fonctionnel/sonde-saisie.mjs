/* Une saisie survit-elle ? Deux essais : navigation immédiate après l'ajout,
   puis navigation après 800 ms (le debounce de 400 ms largement passé).
   Si l'essai patient passe et l'impatient échoue, la saisie se perd dans la
   fenêtre du debounce ; si les deux échouent, c'est le formulaire. */
import { bodyText, check, clickButton, keypad, launch, must, report } from './harnais.mjs'

async function onboard(page) {
  await page.goto('/')
  await page.getByRole('button', { name: /Créer mon suivi/ }).first().click()
  await page.waitForURL(/demarrer/)
  await page.getByRole('radio', { name: 'À plusieurs' }).click()
  await page.getByLabel(/Prénom/).fill('Alix')
  await clickButton(page, /^Ajouter$/)
  await page.getByLabel(/Prénom/).fill('Camille')
  await clickButton(page, /^Ajouter$/)
  await clickButton(page, /^Continuer$/)
  await page.getByText(/Ce que gagne Alix/).waitFor()
  await keypad(page, ['2', '0', '0', '0', '0', '0'])
  await clickButton(page, /^Continuer$/)
  await page.getByText(/Ce que gagne Camille/).waitFor()
  await keypad(page, ['1', '0', '0', '0', '0', '0'])
  await clickButton(page, /^Continuer$/)
  await page.getByText(/te loger/).waitFor()
  await keypad(page, ['9', '0', '0', '0', '0'])
  await clickButton(page, /^Continuer$/)
  await page.getByText(/revient encore/).waitFor()
  await clickButton(page, /^Continuer$/)
  await page.getByText(/Point de départ/).waitFor()
  await clickButton(page, /^Continuer$/)
  await page.getByText(/Voilà ton mois/).waitFor()
  await clickButton(page, /^Commencer$/)
  await page.waitForURL((url) => url.pathname === '/')
  await page.getByText(/lignes? à confirmer/i).first().waitFor()
}

async function addPharmacie(page) {
  await page.goto('/depense?sens=sortie')
  const amount = page.getByLabel(/Montant/).first()
  await amount.waitFor()
  await amount.fill('60')
  await page.getByLabel(/Catégorie/).first().selectOption({ index: 1 })
  await page.getByLabel(/Libellé/).first().fill('Pharmacie')
  await page.getByLabel(/^Membre/).first().selectOption({ label: 'Camille' })
  await page.getByLabel(/Réglé par/).first().selectOption({ label: 'Alix' })
  await clickButton(page, /Ajouter l’opération/)
  await page.waitForURL((url) => !url.pathname.startsWith('/depense'))
}

{
  const { browser, page } = await launch()
  await check(page, 'saisie', 'ajout puis navigation immédiate — la dépense survit', async () => {
    await onboard(page)
    await addPharmacie(page)
    await page.goto('/repartition')
    await page.getByText(/Total des parts/i).first().waitFor()
    const text = await bodyText(page)
    must(
      text.toLowerCase().includes('payé pour quelqu’un d’autre'),
      'la ligne du prêt manque — la saisie n’a pas survécu à la navigation immédiate',
    )
  })
  await browser.close()
}

{
  const { browser, page } = await launch()
  await check(page, 'saisie', 'ajout puis navigation 800 ms après — la dépense survit', async () => {
    await onboard(page)
    await addPharmacie(page)
    await page.waitForTimeout(800)
    await page.goto('/repartition')
    await page.getByText(/Total des parts/i).first().waitFor()
    const text = await bodyText(page)
    must(
      text.toLowerCase().includes('payé pour quelqu’un d’autre'),
      'la ligne du prêt manque même en laissant le temps d’écrire — le formulaire ou la répartition sont en cause',
    )
  })
  await browser.close()
}

report('sonde-saisie.json')
