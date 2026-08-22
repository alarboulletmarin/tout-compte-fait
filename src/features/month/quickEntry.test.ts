import { describe, expect, it } from 'vitest'
import { makeCategory, makeEntry } from '@/domain/fixtures'
import type { CategoryKind } from '@/domain/types'
import { QUICK_CATEGORIES, quickCategories } from './quickEntry'

const CATEGORIES = [
  makeCategory({ id: 'groceries', label: 'Alimentation', familyId: 'f-charge' }),
  makeCategory({ id: 'fuel', label: 'Carburant', familyId: 'f-charge' }),
  makeCategory({ id: 'outings', label: 'Sorties', familyId: 'f-charge' }),
  makeCategory({ id: 'gifts', label: 'Cadeaux', familyId: 'f-charge' }),
  makeCategory({ id: 'culture', label: 'Culture', familyId: 'f-charge' }),
  makeCategory({ id: 'misc', label: 'Divers', familyId: 'f-charge' }),
  makeCategory({ id: 'clothing', label: 'Habillement', familyId: 'f-charge' }),
  makeCategory({ id: 'salary', label: 'Salaires', familyId: 'f-resource' }),
  makeCategory({ id: 'old', label: 'Rangée', familyId: 'f-charge', archived: true }),
]

const kindOf = (id: string): CategoryKind => (id === 'salary' ? 'resource' : 'charge')
const OUT: readonly CategoryKind[] = ['charge', 'debt']

const ids = (kinds = OUT, entries = [] as ReturnType<typeof makeEntry>[]): string[] =>
  quickCategories(entries, CATEGORIES, kindOf, kinds).map((one) => one.id)

describe('quickCategories', () => {
  it('s’en tient au sens de la porte, et n’en propose que six', () => {
    const found = ids()
    expect(found).toHaveLength(QUICK_CATEGORIES)
    expect(found).not.toContain('salary')
  })

  it('écarte ce qui est archivé : on n’y range plus rien de neuf', () => {
    expect(ids()).not.toContain('old')
  })

  /* La seule information que le document possède sur ce qu'on est en train de
     faire : ce qu'on a déjà saisi. Quatre libellés en dur, comme dans le
     prototype, seraient faux dès la première catégorie renommée. */
  it('met en tête ce qu’on a déjà saisi le plus souvent', () => {
    const entries = [
      makeEntry({ date: '2026-08-01', categoryId: 'clothing', label: 'a' }),
      makeEntry({ date: '2026-08-02', categoryId: 'clothing', label: 'b' }),
      makeEntry({ date: '2026-08-03', categoryId: 'misc', label: 'c' }),
    ]
    expect(ids(OUT, entries).slice(0, 2)).toEqual(['clothing', 'misc'])
  })

  /* Sans historique, le catalogue tranche — et son ordre est celui des
     familles, donc du plus courant au plus rare. */
  it('retombe sur l’ordre du catalogue quand rien n’a encore été saisi', () => {
    expect(ids()).toEqual(['groceries', 'fuel', 'outings', 'gifts', 'culture', 'misc'])
  })
})
