import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { openDB } from 'idb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sample } from './fixtures'

// L'ancienne app a créé la même base : version 2, magasins « document » et « backups »
async function seedLegacy(version: 1 | 2) {
  const legacy = await openDB('tout-compte-fait', version, {
    upgrade(database) {
      database.createObjectStore('document')
      if (version === 2) database.createObjectStore('backups')
    },
  })
  await legacy.put('document', { ancien: true }, 'current')
  legacy.close()
}

beforeEach(() => {
  vi.resetModules()
  // Fabrique neuve : la connexion ouverte par le test précédent bloquerait un deleteDatabase
  globalThis.indexedDB = new IDBFactory()
})

describe('base laissée par l’ancienne app', () => {
  it.each([1, 2] as const)('se lance comme un premier lancement (ancienne base v%i)', async (v) => {
    await seedLegacy(v)
    const { loadData, saveData } = await import('./db')
    expect(await loadData()).toBeNull()
    await saveData(sample())
    expect(await loadData()).toEqual(sample())
  })

  it('ne touche pas aux données de l’ancienne app', async () => {
    await seedLegacy(2)
    const { saveData } = await import('./db')
    await saveData(sample())
    const db = await openDB('tout-compte-fait')
    expect(await db.get('document', 'current')).toEqual({ ancien: true })
    db.close()
  })
})
