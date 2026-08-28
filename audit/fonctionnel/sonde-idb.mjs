/* Que contient IndexedDB après l'onboarding, et après le jeu d'exemple ? */
import { check, clickButton, keypad, launch, must, report } from './harnais.mjs'

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

async function idbDump(page) {
  return page.evaluate(async () => {
    const dbs = await indexedDB.databases()
    const out = { dbs: dbs.map((d) => `${d.name ?? '?'}@${String(d.version)}`), keys: {} }
    for (const info of dbs) {
      if (info.name === undefined) continue
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open(info.name)
        req.onsuccess = () => { resolve(req.result) }
        req.onerror = () => { reject(new Error('open')) }
      })
      for (const store of db.objectStoreNames) {
        const keys = await new Promise((resolve) => {
          const tx = db.transaction(store, 'readonly').objectStore(store).getAllKeys()
          tx.onsuccess = () => { resolve(tx.result) }
          tx.onerror = () => { resolve(['<erreur>']) }
        })
        out.keys[`${info.name}/${store}`] = keys
      }
      db.close()
    }
    return out
  })
}

const { browser, page } = await launch()
await check(page, 'idb', 'la base après l’onboarding, tout de suite puis après 1,5 s', async () => {
  await onboard(page)
  const right = await idbDump(page)
  await page.waitForTimeout(1500)
  const later = await idbDump(page)
  console.log('  tout de suite :', JSON.stringify(right))
  console.log('  après 1,5 s  :', JSON.stringify(later))
  must(Object.keys(later.keys).length > 0, 'aucune base IndexedDB')
})
await browser.close()
report('sonde-idb.json')
