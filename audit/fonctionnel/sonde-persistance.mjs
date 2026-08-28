/* La donnée survit-elle à un rechargement juste après l'onboarding ?
   Deux essais : rechargement immédiat, puis rechargement après une seconde. */
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

{
  const { browser, page } = await launch()
  await check(page, 'persistance', 'rechargement immédiat après l’onboarding', async () => {
    await onboard(page)
    await page.goto('/repartition')
    const landed = await Promise.race([
      page.getByRole('heading', { name: 'Répartition' }).first().waitFor({ timeout: 10_000 }).then(() => 'répartition'),
      page.getByRole('button', { name: /Créer mon suivi/ }).first().waitFor({ timeout: 10_000 }).then(() => 'présentation'),
    ])
    must(landed === 'répartition', `retombé sur la ${landed} : le document n'a pas survécu au rechargement immédiat`)
  })
  await browser.close()
}

{
  const { browser, page } = await launch()
  await check(page, 'persistance', 'rechargement une seconde après l’onboarding', async () => {
    await onboard(page)
    await page.waitForTimeout(1000)
    await page.goto('/repartition')
    const landed = await Promise.race([
      page.getByRole('heading', { name: 'Répartition' }).first().waitFor({ timeout: 10_000 }).then(() => 'répartition'),
      page.getByRole('button', { name: /Créer mon suivi/ }).first().waitFor({ timeout: 10_000 }).then(() => 'présentation'),
    ])
    must(landed === 'répartition', `retombé sur la ${landed}`)
  })
  await browser.close()
}

report('sonde-persistance.json')
