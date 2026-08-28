/* Parcours 2 — tous les écrans, sur le jeu d'exemple : chaque écran s'ouvre,
   porte son titre et ses chiffres, la revue avance, la langue bascule, et un
   export se réimporte sur un profil neuf — la promesse du fichier lisible. */
import { bodyText, check, clickButton, launch, must, report } from './harnais.mjs'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const contient = (text, needle) => text.toLowerCase().includes(needle.toLowerCase())

/** Charge le jeu d'exemple et attend qu'il soit écrit (cf. e2e/app.ts). */
async function loadExample(page) {
  await page.goto('/')
  await page.getByRole('button', { name: /charger l’exemple/i }).first().click()
  await page.getByRole('navigation').first().waitFor({ timeout: 30_000 })
  await page.getByText(/solde du mois/i).first().waitFor({ timeout: 30_000 })
}

const SCREENS = [
  { path: '/calendrier', heading: /calendrier/i },
  { path: '/historique', heading: /historique/i },
  { path: '/recurrences', heading: /récurrences/i },
  { path: '/epargne', heading: /épargne/i },
  { path: '/epargne/mois', heading: /ce mois/i },
  { path: '/epargne/supports', heading: /supports/i },
  { path: '/epargne/analyse', heading: /analyse/i },
  { path: '/epargne/objectifs/ex-g-apport', heading: /apport appartement/i },
  { path: '/credits', heading: /crédits et dettes/i },
  { path: '/avances', heading: /avances/i },
  { path: '/repartition', heading: /répartition/i },
  { path: '/flux', heading: /revenus (et|&) charges/i },
  { path: '/personnes', heading: /personnes/i },
  { path: '/categories', heading: /catégories/i },
  { path: '/simulation', heading: /simulation/i },
  { path: '/plus', heading: /plus/i },
  { path: '/donnees', heading: /données/i },
  { path: '/stockage', heading: /sur cet appareil/i },
  { path: '/apparence', heading: /apparence/i },
  { path: '/depense/rapide', heading: /ajouter une dépense/i },
  { path: '/recurrences/nouveau', heading: /revient/i },
]

const { browser, page, errors } = await launch()

await check(page, 'exemple', 'le jeu d’exemple se charge et le mois se chiffre', async () => {
  await loadExample(page)
  const text = await bodyText(page)
  must(contient(text, 'solde du mois'), 'pas de solde du mois')
})

for (const screen of SCREENS) {
  await check(page, 'écrans', `${screen.path} s’ouvre et se nomme`, async () => {
    await page.goto(screen.path)
    await page
      .getByRole('heading', { name: screen.heading })
      .first()
      .waitFor({ timeout: 10_000 })
  })
}

await check(page, 'écrans', 'aucune erreur JavaScript sur la traversée', async () => {
  must(errors.length === 0, `erreurs console : ${errors.slice(0, 3).join(' | ')}`)
})

/* --- La revue ---------------------------------------------------------------*/

await check(page, 'revue', 'la revue s’ouvre et confirmer avance d’une carte', async () => {
  await page.goto('/')
  await page.getByText(/solde du mois/i).first().waitFor()
  const start = page.getByRole('button', { name: /(commencer|reprendre) la revue/i }).first()
  await start.waitFor()
  await start.click()
  await page.waitForURL(/revue/)
  const before = await bodyText(page)
  await clickButton(page, /C’était bien ça/)
  await page.waitForTimeout(300)
  const after = await bodyText(page)
  must(before !== after, 'l’écran n’a pas bougé après la confirmation')
})

/* --- La langue --------------------------------------------------------------*/

await check(page, 'langue', 'l’app bascule en anglais, et revient', async () => {
  await page.goto('/plus')
  await page.getByRole('heading', { name: /plus/i }).first().waitFor()
  await page.getByRole('radio', { name: 'English' }).click()
  await page.getByRole('heading', { name: /^more$/i }).first().waitFor()
  await page.getByRole('radio', { name: 'Français' }).click()
  await page.getByRole('heading', { name: /^plus$/i }).first().waitFor()
})

/* --- L'export, puis l'import sur un profil neuf ----------------------------*/

const dir = mkdtempSync(join(tmpdir(), 'tcf-audit-'))
let exported = null

await check(page, 'export', 'l’export rend un fichier JSON au schéma courant', async () => {
  await page.goto('/donnees')
  const waiting = page.waitForEvent('download', { timeout: 10_000 })
  await clickButton(page, /Exporter/)
  const download = await waiting
  exported = join(dir, download.suggestedFilename())
  await download.saveAs(exported)
  const { readFileSync } = await import('node:fs')
  const doc = JSON.parse(readFileSync(exported, 'utf8'))
  must(typeof doc.schemaVersion === 'number', 'pas de schemaVersion dans l’export')
  must(Array.isArray(doc.household?.members) && doc.household.members.length > 0, 'pas de membres dans l’export')
})

await browser.close()

{
  const { browser: b2, page: p2, errors: e2 } = await launch()
  await check(p2, 'import', 'l’export se réimporte sur un profil neuf', async () => {
    must(exported !== null, 'pas de fichier exporté à réimporter')
    await p2.goto('/')
    const chooserWait = p2.waitForEvent('filechooser', { timeout: 10_000 })
    await clickButton(p2, /Importer un fichier/)
    const chooser = await chooserWait
    await chooser.setFiles(exported)
    // L'import se confirme deux fois, en feuille : on suit ce qui s'affiche.
    for (let i = 0; i < 3; i += 1) {
      const sheet = p2.locator('dialog[open]')
      if ((await sheet.count()) === 0) break
      await sheet.getByRole('button').last().click()
      await p2.waitForTimeout(200)
    }
    await p2.getByRole('navigation').first().waitFor({ timeout: 30_000 })
    await p2.getByText(/solde du mois/i).first().waitFor({ timeout: 30_000 })
    must(e2.length === 0, `erreurs console : ${e2.slice(0, 3).join(' | ')}`)
  })
  await b2.close()
}

report('parcours-ecrans.json')
