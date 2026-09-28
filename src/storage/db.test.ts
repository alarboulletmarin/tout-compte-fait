import 'fake-indexeddb/auto'
import { openDB } from 'idb'
import { beforeEach, describe, expect, it } from 'vitest'
import { initialData } from '../domain/data'
import { recordMonth } from '../domain/history'
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
    const db = await openDB('tout-compte-fait')
    await db.put('app', { schemaVersion: 1, data: { charges: 'x' } }, 'data')
    db.close()
    await expect(loadData()).rejects.toThrow(InvalidDataError)
  })
})

describe('migration à la lecture', () => {
  it('une base en version 1 est migrée puis réécrite en version courante', async () => {
    const db = await openDB('tout-compte-fait')
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

describe('migration 2 → 3 à la lecture', () => {
  it('une base en version 2 reçoit un historique vide et est réécrite en version courante', async () => {
    const db = await openDB('tout-compte-fait')
    const { household, charges, categories } = sample()
    const v2 = { household, charges, categories }
    await db.put('app', { schemaVersion: 2, data: v2 }, 'data')
    expect(await loadData()).toEqual({ ...v2, history: {} })
    expect((await db.get('app', 'data'))?.schemaVersion).toBe(SCHEMA_VERSION)
    db.close()
  })
})

describe('historique', () => {
  const withHistory = () => recordMonth(sample(), '2026-09')

  it('est enregistré et relu avec les données', async () => {
    await saveData(withHistory())
    expect(await loadData()).toEqual(withHistory())
  })

  it('un historique invalide n’est pas enregistré et ne touche pas aux données existantes', async () => {
    await saveData(sample())
    const bad = withHistory()
    bad.history['2026-09']!.charges[0]!.amount = -1
    await expect(saveData(bad)).rejects.toThrow(InvalidDataError)
    const malformed = withHistory()
    malformed.history['sept'] = malformed.history['2026-09']!
    await expect(saveData(malformed)).rejects.toThrow(InvalidDataError)
    expect(await loadData()).toEqual(sample())
  })

  it('un fichier importé à l’historique invalide ne touche à rien', async () => {
    await saveData(withHistory())
    const file = JSON.parse(serializeExport(withHistory()))
    file.data.history['2026-09'].charges[0].frequency = 'daily'
    const result = await importFromText(JSON.stringify(file))
    expect(result.ok).toBe(false)
    expect(await loadData()).toEqual(withHistory())
  })

  it('un fichier importé avec historique le remplace d’un bloc', async () => {
    await saveData(withHistory())
    const other = recordMonth({ ...sample(), charges: [] }, '2026-07')
    expect((await importFromText(serializeExport(other))).ok).toBe(true)
    expect(await loadData()).toEqual(other)
  })

  it('tout effacer efface aussi l’historique', async () => {
    await saveData(withHistory())
    await clearAll()
    expect(await loadData()).toBeNull()
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
