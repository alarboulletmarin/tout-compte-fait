import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CATEGORIES,
  deleteCategory,
  findCategoryByName,
  initialData,
  removeMember,
  restoreMember,
  type AppData,
} from './data'

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

  it('ont deux membres aux ids distincts', () => {
    const [a, b] = initialData().household.members
    expect(a!.id).not.toBe(b!.id)
    expect(initialData().household.members[0]!.id).not.toBe(a!.id)
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
        paidFrom: 'm:x',
        categoryId: 'energy',
      },
      {
        id: 'b',
        label: 'Élec',
        amount: 4500,
        frequency: 'monthly',
        paidFrom: 'm:x',
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

describe('removeMember / restoreMember', () => {
  const member = (id: string) => ({ id, name: id, income: 1000 })
  const charge = (id: string, paidFrom: 'joint' | `m:${string}`) => ({
    id,
    label: id,
    amount: 100,
    frequency: 'monthly' as const,
    paidFrom,
    categoryId: null,
  })
  const data: AppData = {
    household: { members: [member('a'), member('b'), member('c')] },
    categories: [],
    charges: [charge('1', 'm:b'), charge('2', 'joint'), charge('3', 'm:b'), charge('4', 'm:a')],
    history: {},
  }

  it('retire le membre et passe ses charges au joint', () => {
    const next = removeMember(data, 'b')
    expect(next.household.members.map((m) => m.id)).toEqual(['a', 'c'])
    expect(next.charges.map((c) => c.paidFrom)).toEqual(['joint', 'joint', 'joint', 'm:a'])
    expect(data.household.members).toHaveLength(3)
  })

  it('refuse de descendre sous 2 membres ou de retirer un inconnu', () => {
    const two = removeMember(data, 'c')
    expect(() => removeMember(two, 'a')).toThrow(RangeError)
    expect(() => removeMember(data, 'zzz')).toThrow(RangeError)
  })

  it('restoreMember remet le membre à sa place avec ses charges', () => {
    const next = removeMember(data, 'b')
    const back = restoreMember(next, member('b'), 1, new Set(['1', '3']))
    expect(back).toEqual(data)
  })

  it('restoreMember ne touche pas aux charges modifiées entre-temps', () => {
    const next = removeMember(data, 'b')
    next.charges[1] = charge('2', 'm:a')
    const back = restoreMember(next, member('b'), 1, new Set(['1', '3']))
    expect(back.charges.map((c) => c.paidFrom)).toEqual(['m:b', 'm:a', 'm:b', 'm:a'])
  })

  it('restoreMember ne dépasse pas 6 membres', () => {
    const full: AppData = {
      ...data,
      household: { members: 'abcdef'.split('').map(member) },
    }
    expect(restoreMember(full, member('g'), 0, new Set())).toBe(full)
  })
})

describe('findCategoryByName', () => {
  const categories = [
    { id: 'energy', name: 'Énergie' },
    { id: 'water', name: 'Eau' },
  ]

  it('ignore la casse, les accents et les espaces autour', () => {
    expect(findCategoryByName(categories, '  energie ')?.id).toBe('energy')
    expect(findCategoryByName(categories, 'EAU')?.id).toBe('water')
  })

  it('ne trouve rien pour un nom inconnu', () => {
    expect(findCategoryByName(categories, 'Gaz')).toBeUndefined()
  })

  it('laisse une catégorie garder son propre nom quand on la renomme', () => {
    expect(findCategoryByName(categories, 'énergie', 'energy')).toBeUndefined()
  })
})
