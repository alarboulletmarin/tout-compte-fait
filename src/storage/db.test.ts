import 'fake-indexeddb/auto'
import { openDB } from 'idb'
import { beforeEach, describe, expect, it } from 'vitest'
import { initialData } from '../domain/data'
import { clearAll, importFromText, loadData, saveData } from './db'
import { InvalidDataError, SCHEMA_VERSION } from './schema'
import { serializeExport } from './transfer'
import { sample } from './fixtures'

beforeEach(clearAll)

describe('IndexedDB', () => {
  it('ne renvoie rien au premier lancement', async () => {
    expect(await loadData()).toBeNull()
  })

  it('relit ce qui a été enregistré', async () => {
    await saveData(sample())
    expect(await loadData()).toEqual(sample())
  })

  it('remplace l’enregistrement précédent', async () => {
    const initial = initialData()
    await saveData(sample())
    await saveData(initial)
    expect(await loadData()).toEqual(initial)
  })

  it('refuse d’enregistrer des données invalides, sans toucher aux existantes', async () => {
    await saveData(sample())
    const bad = sample()
    bad.charges[0]!.amount = -1
    await expect(saveData(bad)).rejects.toThrow(InvalidDataError)
    expect(await loadData()).toEqual(sample())
  })

  it('tout effacer revient au premier lancement', async () => {
    await saveData(sample())
    await clearAll()
    expect(await loadData()).toBeNull()
  })

  it('signale une base corrompue plutôt que de la lire de travers', async () => {
    const db = await openDB('tout-compte-fait', 1)
    await db.put('app', { schemaVersion: 1, data: { charges: 'x' } }, 'data')
    db.close()
    await expect(loadData()).rejects.toThrow(InvalidDataError)
  })
})

describe('migration à la lecture', () => {
  it('une base en version 1 est migrée puis réécrite en version courante', async () => {
    const db = await openDB('tout-compte-fait', 1)
    const v1 = {
      household: {
        members: [
          { name: 'Lui', income: 1000 },
          { name: 'Elle', income: 2000 },
        ],
      },
      categories: [],
      charges: [
        {
          id: 'a',
          label: 'Loyer',
          amount: 500,
          frequency: 'monthly',
          paidFrom: 'member2',
          categoryId: null,
        },
      ],
    }
    await db.put('app', { schemaVersion: 1, data: v1 }, 'data')
    const data = await loadData()
    expect(data?.household.members.map((m) => m.id)).toEqual(['member1', 'member2'])
    expect(data?.charges[0]?.paidFrom).toBe('m:member2')
    expect((await db.get('app', 'data'))?.schemaVersion).toBe(SCHEMA_VERSION)
    db.close()
  })
})

describe('import', () => {
  it('remplace les données par celles du fichier', async () => {
    await saveData(initialData())
    const result = await importFromText(serializeExport(sample()))
    expect(result.ok).toBe(true)
    expect(await loadData()).toEqual(sample())
  })

  it.each(['pas du json', '{}', serializeExport(sample()).replace('"monthly"', '"daily"')])(
    'un fichier invalide ne touche à rien (%#)',
    async (text) => {
      await saveData(sample())
      const result = await importFromText(text)
      expect(result.ok).toBe(false)
      expect(await loadData()).toEqual(sample())
    },
  )
})
