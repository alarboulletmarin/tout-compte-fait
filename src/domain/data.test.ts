import { describe, expect, it } from 'vitest'
import { DEFAULT_CATEGORIES, deleteCategory, initialData, type AppData } from './data'

describe('données de départ', () => {
  it('contiennent les 8 catégories par défaut, sans charge', () => {
    const data = initialData()
    expect(data.categories.map((c) => c.name)).toEqual([
      'Logement',
      'Énergie',
      'Eau',
      'Internet & téléphone',
      'Assurances',
      'Abonnements',
      'Transport',
      'Divers',
    ])
    expect(data.charges).toEqual([])
    expect(data.household.members.map((m) => m.income)).toEqual([null, null])
  })

  it('sont neuves à chaque appel', () => {
    initialData().categories[0]!.name = 'Modifié'
    expect(initialData().categories[0]!.name).toBe('Logement')
    expect(DEFAULT_CATEGORIES[0]!.name).toBe('Logement')
  })
})

describe('deleteCategory', () => {
  const data: AppData = {
    ...initialData(),
    charges: [
      {
        id: 'a',
        label: 'Gaz',
        amount: 2800,
        frequency: 'monthly',
        paidFrom: 'member1',
        categoryId: 'energy',
      },
      {
        id: 'b',
        label: 'Élec',
        amount: 4500,
        frequency: 'monthly',
        paidFrom: 'member1',
        categoryId: 'energy',
      },
      {
        id: 'c',
        label: 'Loyer',
        amount: 143129,
        frequency: 'monthly',
        paidFrom: 'joint',
        categoryId: 'housing',
      },
    ],
  }

  it('garde les charges, qui passent en « Sans catégorie »', () => {
    const next = deleteCategory(data, 'energy')
    expect(next.categories.some((c) => c.id === 'energy')).toBe(false)
    expect(next.charges.map((c) => [c.id, c.categoryId])).toEqual([
      ['a', null],
      ['b', null],
      ['c', 'housing'],
    ])
  })

  it('ne modifie pas les données d’origine', () => {
    deleteCategory(data, 'energy')
    expect(data.charges[0]!.categoryId).toBe('energy')
    expect(data.categories).toHaveLength(8)
  })
})
