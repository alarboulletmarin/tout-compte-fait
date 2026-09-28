import { describe, expect, it } from 'vitest'
import { initialData } from '../domain/data'
import { sample } from './fixtures'
import { migrate, SCHEMA_VERSION, validateData } from './schema'
import { exportFileName, parseExport, serializeExport } from './transfer'

const exportedAt = new Date('2026-09-28T10:00:00.000Z')

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
    ['trois membres', fileWith((f) => f.data.household.members.push({ name: 'X', income: 1 }))],
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
