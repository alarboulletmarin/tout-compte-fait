/* ============================================================================
 * Le document survit au rechargement — dans un vrai navigateur.
 *
 * C'est la promesse de la première ligne du README : « les données vivent dans
 * le navigateur ». Les tests du domaine la vérifient contre `fake-indexeddb`,
 * qui est une réimplémentation ; celui-ci la vérifie contre IndexedDB.
 *
 * Ce que jsdom ne pouvait pas dire : qu'un document de cinq ans — deux mille
 * cinq cents échéances, un demi-mégaoctet — passe la porte du stockage sans se
 * faire refuser, et revienne identique après un rechargement complet.
 * ==========================================================================*/

import { expect, test } from '@playwright/test'
import { loadExample, openApp, watchConsole } from './app'

test('garde le document après un rechargement complet', async ({ page }) => {
  const said = watchConsole(page)
  await openApp(page)
  await loadExample(page)

  const before = await page.locator('main').first().innerText()
  expect(before).toMatch(/solde du mois/i)

  await page.reload()

  /* Aucune notice à refermer : elle est mémorisée. Et surtout aucune page de
     présentation — l'app neuve s'y ouvre, et la voir ici voudrait dire que le
     document n'a pas été retrouvé. */
  await expect(page.getByRole('navigation').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /charger l’exemple/i })).toHaveCount(0)

  const after = await page.locator('main').first().innerText()
  expect(after).toBe(before)
  expect(said).toEqual([])
})

test('retrouve le document dans un nouvel onglet', async ({ context, page }) => {
  await openApp(page)
  await loadExample(page)
  const before = await page.locator('main').first().innerText()

  /* Un second onglet, c'est un second démarrage complet de l'app sur le même
     stockage : c'est là que se voit la différence entre « l'état vit en
     mémoire » et « l'état vit dans IndexedDB ». */
  const other = await context.newPage()
  await other.goto('/')
  await expect(other.getByRole('navigation').first()).toBeVisible()
  expect(await other.locator('main').first().innerText()).toBe(before)
  await other.close()
})

test('exporte le document, et le fichier n’est pas vide', async ({ page }) => {
  await openApp(page)
  await loadExample(page)
  await page.goto('/donnees')

  /* L'export est le seul filet de sécurité de l'app : c'est aussi la seule
     fonctionnalité dont l'échec est silencieux, puisqu'on ne s'en aperçoit que
     le jour où on en a besoin. Le fichier doit donc exister, porter le bon
     nom, et peser ce que pèse cinq ans de document. */
  const waiting = page.waitForEvent('download')
  await page.getByRole('button', { name: /exporter/i }).first().click()
  const file = await waiting

  expect(file.suggestedFilename()).toMatch(/\.json$/)
  const path = await file.path()
  const { size } = await (await import('node:fs/promises')).stat(path)
  expect(size).toBeGreaterThan(100_000)
})
