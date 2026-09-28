import { describe, expect, it } from 'vitest'
import { initialData, type AppData } from '../domain/data'
import { carryForward, recordMonth } from '../domain/history'
import { sample } from './fixtures'
import { migrate, SCHEMA_VERSION, validateData } from './schema'
import { exportFileName, parseExport, serializeExport } from './transfer'

const exportedAt = new Date('2026-09-28T10:00:00.000Z')

const sevenMembers = () =>
  Array.from({ length: 5 }, (_, i) => ({ id: `x${i}`, name: 'X', income: 1 }))

/** Fichier exporté valide, modifié par `edit` pour fabriquer un cas invalide. */
function fileWith(edit: (file: Record<string, any>) => void): string {
  const file = JSON.parse(serializeExport(sample(), exportedAt))
  edit(file)
  return JSON.stringify(file)
}

describe('export', () => {
  it('produit l’enveloppe attendue', () => {
    expect(JSON.parse(serializeExport(sample(), exportedAt))).toEqual({
      app: 'tout-compte-fait',
      schemaVersion: SCHEMA_VERSION,
      exportedAt: '2026-09-28T10:00:00.000Z',
      data: sample(),
    })
  })

  it('se relit à l’identique', () => {
    const result = parseExport(serializeExport(sample(), exportedAt))
    expect(result).toEqual({
      ok: true,
      file: {
        app: 'tout-compte-fait',
        schemaVersion: SCHEMA_VERSION,
        exportedAt: '2026-09-28T10:00:00.000Z',
        data: sample(),
      },
    })
  })

  it('accepte les données de départ (prénoms vides, revenus absents)', () => {
    expect(parseExport(serializeExport(initialData())).ok).toBe(true)
  })

  it('nomme le fichier à la date locale', () => {
    expect(exportFileName(new Date(2026, 8, 28, 23, 59))).toBe('toutcomptefait-2026-09-28.json')
  })
})

describe('import — rejets', () => {
  it.each<[string, string]>([
    ['un texte vide', ''],
    ['du JSON illisible', '{"app": '],
    ['un tableau', '[]'],
    ['null', 'null'],
    ['un autre fichier JSON', '{"name": "package"}'],
    ['une autre app', fileWith((f) => (f.app = 'autre'))],
    ['une version future', fileWith((f) => (f.schemaVersion = SCHEMA_VERSION + 1))],
    ['une version 0', fileWith((f) => (f.schemaVersion = 0))],
    ['une version en texte', fileWith((f) => (f.schemaVersion = '1'))],
    ['une date d’export invalide', fileWith((f) => (f.exportedAt = 'hier'))],
    ['une clé en trop à la racine', fileWith((f) => (f.extra = true))],
    ['sans données', fileWith((f) => delete f.data)],
    ['un seul membre', fileWith((f) => f.data.household.members.pop())],
    ['sept membres', fileWith((f) => f.data.household.members.push(...sevenMembers()))],
    ['des membres aux ids en double', fileWith((f) => (f.data.household.members[1].id = 'lui'))],
    ['un membre sans id', fileWith((f) => delete f.data.household.members[0].id)],
    ['un membre à l’id vide', fileWith((f) => (f.data.household.members[0].id = ''))],
    ['un revenu négatif', fileWith((f) => (f.data.household.members[0].income = -1))],
    ['un revenu en euros décimaux', fileWith((f) => (f.data.household.members[0].income = 2300.5))],
    ['un revenu en texte', fileWith((f) => (f.data.household.members[0].income = '2300'))],
    ['un prénom absent', fileWith((f) => delete f.data.household.members[1].name)],
    ['un montant à 0', fileWith((f) => (f.data.charges[0].amount = 0))],
    ['un montant décimal', fileWith((f) => (f.data.charges[0].amount = 1431.29))],
    ['un montant énorme', fileWith((f) => (f.data.charges[0].amount = 2 ** 60))],
    ['un libellé vide', fileWith((f) => (f.data.charges[0].label = '  '))],
    ['une fréquence inconnue', fileWith((f) => (f.data.charges[0].frequency = 'weekly'))],
    ['un compte inconnu', fileWith((f) => (f.data.charges[0].paidFrom = 'member3'))],
    ['un compte de membre absent', fileWith((f) => (f.data.charges[0].paidFrom = 'm:zzz'))],
    ['un compte au format v1', fileWith((f) => (f.data.charges[0].paidFrom = 'member1'))],
    ['une catégorie inconnue', fileWith((f) => (f.data.charges[0].categoryId = 'nope'))],
    [
      'une charge sans catégorie (clé absente)',
      fileWith((f) => delete f.data.charges[1].categoryId),
    ],
    ['une clé en trop dans une charge', fileWith((f) => (f.data.charges[0].note = 'x'))],
    ['des charges en double', fileWith((f) => (f.data.charges[1].id = f.data.charges[0].id))],
    ['des catégories en double', fileWith((f) => (f.data.categories[1].id = 'housing'))],
    ['une catégorie sans nom', fileWith((f) => (f.data.categories[0].name = ''))],
    ['des charges qui ne sont pas une liste', fileWith((f) => (f.data.charges = {}))],
  ])('refuse %s', (_, text) => {
    const result = parseExport(text)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBeTruthy()
  })

  it('situe l’erreur pour le débogage', () => {
    const result = parseExport(fileWith((f) => (f.data.charges[1].amount = -5)))
    expect(result).toEqual({
      ok: false,
      reason: 'charges[1].amount : centimes entiers ≥ 1 attendus',
    })
  })
})

describe('import — membres de 2 à 6', () => {
  const withMembers = (n: number) =>
    fileWith((f) => {
      f.data.household.members = Array.from({ length: n }, (_, i) => ({
        id: i === 0 ? 'lui' : i === 1 ? 'elle' : `x${i}`,
        name: `M${i}`,
        income: 1000,
      }))
    })

  it.each([2, 3, 6])('accepte %i membres', (n) => {
    expect(parseExport(withMembers(n)).ok).toBe(true)
  })

  it.each([1, 7])('refuse %i membre(s)', (n) => {
    expect(parseExport(withMembers(n)).ok).toBe(false)
  })

  it('une charge peut être payée depuis le compte de n’importe quel membre', () => {
    const text = fileWith((f) => {
      f.data.household.members.push({ id: 'tiers', name: 'T', income: null })
      f.data.charges[0].paidFrom = 'm:tiers'
    })
    expect(parseExport(text).ok).toBe(true)
  })
})

describe('migration 1 → 2', () => {
  const v1 = () => ({
    app: 'tout-compte-fait',
    schemaVersion: 1,
    exportedAt: '2026-09-28T10:00:00.000Z',
    data: {
      household: {
        members: [
          { name: 'Lui', income: 230000 },
          { name: 'Elle', income: null },
        ],
      },
      categories: [{ id: 'housing', name: 'Logement' }],
      charges: ['joint', 'member1', 'member2'].map((paidFrom, i) => ({
        id: `c${i}`,
        label: `Charge ${i}`,
        amount: 1000,
        frequency: 'monthly',
        paidFrom,
        categoryId: i === 0 ? 'housing' : null,
      })),
    },
  })

  it('un export v1 reste importable : ids donnés aux membres, comptes réécrits', () => {
    const result = parseExport(JSON.stringify(v1()))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.file.schemaVersion).toBe(SCHEMA_VERSION)
    const { members } = result.file.data.household
    expect(members).toEqual([
      { id: 'member1', name: 'Lui', income: 230000 },
      { id: 'member2', name: 'Elle', income: null },
    ])
    expect(result.file.data.charges.map((c) => c.paidFrom)).toEqual([
      'joint',
      'm:member1',
      'm:member2',
    ])
    expect(result.file.data.charges[0]!.categoryId).toBe('housing')
  })

  it('migrate ne modifie pas l’entrée', () => {
    const file = v1()
    migrate(file.data, 1)
    expect(file.data.charges[1]!.paidFrom).toBe('member1')
  })

  it.each<[string, (f: ReturnType<typeof v1>) => void]>([
    ['trois membres', (f) => f.data.household.members.push({ name: 'X', income: 1 })],
    ['un compte inconnu', (f) => (f.data.charges[0]!.paidFrom = 'member3')],
    ['des charges illisibles', (f) => ((f.data as any).charges = 'x')],
    ['une charge qui n’est pas un objet', (f) => ((f.data.charges as any)[0] = 'x')],
    ['un membre qui n’est pas un objet', (f) => ((f.data.household.members as any)[0] = null)],
    ['un foyer absent', (f) => delete (f.data as any).household],
  ])('refuse un export v1 avec %s', (_, edit) => {
    const file = v1()
    edit(file)
    const result = parseExport(JSON.stringify(file))
    expect(result.ok).toBe(false)
  })

  it('un compte « constructor » n’est pas pris pour un compte connu', () => {
    const file = v1()
    file.data.charges[0]!.paidFrom = 'constructor'
    expect(parseExport(JSON.stringify(file)).ok).toBe(false)
  })
})

describe('schéma', () => {
  it('ne renvoie que les champs connus, dans des objets neufs', () => {
    const input = sample()
    const output = validateData(input)
    expect(output).toEqual(input)
    expect(output.charges[0]).not.toBe(input.charges[0])
  })

  it('laisse passer la version courante sans migration', () => {
    const data = sample()
    expect(migrate(data, SCHEMA_VERSION)).toBe(data)
  })
})

describe('migration 2 → 3', () => {
  const v2 = () => {
    const { household, charges, categories } = sample()
    const data = { household, charges, categories }
    return { app: 'tout-compte-fait', schemaVersion: 2, exportedAt: exportedAt.toISOString(), data }
  }

  it('un export v2 reste importable : historique vide, le reste intact', () => {
    const result = parseExport(JSON.stringify(v2()))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.file.schemaVersion).toBe(SCHEMA_VERSION)
    expect(result.file.data).toEqual({ ...v2().data, history: {} })
  })

  it('un export v1 traverse les deux migrations', () => {
    const v1 = {
      app: 'tout-compte-fait',
      schemaVersion: 1,
      exportedAt: exportedAt.toISOString(),
      data: {
        household: {
          members: [
            { name: 'Lui', income: 1000 },
            { name: 'Elle', income: null },
          ],
        },
        categories: [],
        charges: [],
      },
    }
    const result = parseExport(JSON.stringify(v1))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.file.data.history).toEqual({})
  })

  it('migrate ne modifie pas l’entrée', () => {
    const file = v2()
    const frozen = JSON.stringify(file.data)
    migrate(file.data, 2)
    expect(JSON.stringify(file.data)).toBe(frozen)
  })

  it('refuse un export v2 avec une clé inconnue', () => {
    const file = v2()
    ;(file.data as Record<string, unknown>).extra = true
    expect(parseExport(JSON.stringify(file)).ok).toBe(false)
  })

  it('refuse un export v3 sans historique', () => {
    expect(parseExport(fileWith((f) => delete f.data.history)).ok).toBe(false)
  })
})

describe('historique — export et import', () => {
  /** Août réel, septembre et octobre reconduits, novembre réel avec une charge en plus. */
  const withHistory = (): AppData => {
    const august = recordMonth(sample(), '2026-08')
    const carried = carryForward(august, '2026-10')
    return recordMonth(
      {
        ...carried,
        charges: [
          ...carried.charges,
          {
            id: 'z',
            label: 'Netflix',
            amount: 1299,
            frequency: 'monthly',
            paidFrom: 'joint',
            categoryId: null,
          },
        ],
      },
      '2026-11',
    )
  }
  const withHistoryFile = (edit: (file: Record<string, any>) => void) => {
    const file = JSON.parse(serializeExport(withHistory(), exportedAt))
    edit(file)
    return JSON.stringify(file)
  }

  it('fait l’aller-retour, drapeaux « reconduit » compris', () => {
    const data = withHistory()
    expect(data.history['2026-09']!.carried).toBe(true)
    const result = parseExport(serializeExport(data, exportedAt))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.file.data).toEqual(data)
    expect(result.file.data.history['2026-08']).not.toHaveProperty('carried')
    expect(result.file.data.history['2026-10']!.carried).toBe(true)
    expect(result.file.data.history['2026-11']).not.toHaveProperty('carried')
  })

  it('valide chaque instantané avec les règles des données courantes', () => {
    const result = parseExport(
      withHistoryFile((f) => (f.data.history['2026-08'].charges[1].amount = -5)),
    )
    expect(result).toEqual({
      ok: false,
      reason: 'history[2026-08].charges[1].amount : centimes entiers ≥ 1 attendus',
    })
  })

  it('un instantané est jugé avec son propre foyer', () => {
    // Un compte de membre qui n'existe pas dans CET instantané, même s'il existe aujourd'hui
    const result = parseExport(
      withHistoryFile((f) => {
        f.data.history['2026-08'].household.members.pop()
      }),
    )
    expect(result.ok).toBe(false)
  })

  it.each<[string, (f: Record<string, any>) => void]>([
    ['une clé de mois sans zéro', (f) => (f.data.history['2026-8'] = f.data.history['2026-08'])],
    ['un mois 13', (f) => (f.data.history['2026-13'] = f.data.history['2026-08'])],
    ['une clé qui n’est pas un mois', (f) => (f.data.history['août'] = f.data.history['2026-08'])],
    ['une année absurde', (f) => (f.data.history['0001-01'] = f.data.history['2026-08'])],
    ['un jour dans la clé', (f) => (f.data.history['2026-08-15'] = f.data.history['2026-08'])],
    ['un instantané qui n’est pas un objet', (f) => (f.data.history['2026-08'] = 'x')],
    ['un instantané nul', (f) => (f.data.history['2026-08'] = null)],
    ['un instantané sans charges', (f) => delete f.data.history['2026-08'].charges],
    ['une clé en trop dans un instantané', (f) => (f.data.history['2026-08'].expenses = [])],
    ['un historique imbriqué', (f) => (f.data.history['2026-08'].history = {})],
    ['un drapeau carried à false', (f) => (f.data.history['2026-09'].carried = false)],
    ['un drapeau carried en texte', (f) => (f.data.history['2026-09'].carried = 'oui')],
    ['un historique en liste', (f) => (f.data.history = [])],
    ['un historique nul', (f) => (f.data.history = null)],
    ['un instantané au foyer invalide', (f) => (f.data.history['2026-08'].household.members = [])],
    [
      'une charge sur un compte inconnu',
      (f) => (f.data.history['2026-08'].charges[0].paidFrom = 'm:zzz'),
    ],
    ['une catégorie inconnue', (f) => (f.data.history['2026-08'].charges[0].categoryId = 'nope')],
  ])('refuse %s', (_, edit) => {
    const result = parseExport(withHistoryFile(edit))
    expect(result.ok).toBe(false)
  })

  it('le nom de clé « __proto__ » est refusé, pas interprété', () => {
    const text = withHistoryFile(() => {}).replace('"2026-08":', '"__proto__":')
    expect(parseExport(text).ok).toBe(false)
  })
})
