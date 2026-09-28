import { describe, expect, it } from 'vitest'
import { computeSplit } from '../domain/split'
import type { AccountRef, Charge } from '../domain/types'
import { formatEuros } from '../i18n/format'
import { fr } from '../i18n/fr'
import { recapText } from './recap'

const euros = (cents: number) => formatEuros(cents, 'fr-FR').replace(/\u00a0/g, ' ')
const household = {
  members: [
    { name: 'Lui', income: 230000 },
    { name: 'Elle', income: 194800 },
  ],
} as const
const charge = (label: string, amount: number, paidFrom: AccountRef): Charge => ({
  id: label,
  label,
  amount,
  frequency: 'monthly',
  paidFrom,
  categoryId: null,
})
const names = ['Lui', 'Elle'] as const

describe('recapText', () => {
  it('reprend la maquette pour le jeu de référence', () => {
    const split = computeSplit(household, [
      charge('Loyer', 143129, 'joint'),
      charge('Électricité', 4500, 'member1'),
      charge('Gaz', 2800, 'member1'),
      charge('Freebox', 3499, 'member1'),
      charge('Netflix', 799, 'member1'),
      charge('Assurance auto', 8100, 'member2'),
    ])
    expect(recapText(fr, names, split, euros)).toBe(
      [
        'Tout Compte Fait · chaque mois',
        'Lui : 765,62 € sur le joint',
        'Elle : 665,67 € sur le joint',
        'Total : 1 431,29 € (charges du joint)',
      ].join('\n'),
    )
  })

  it('dit qui ne vire rien et qui rembourse qui', () => {
    const split = computeSplit(household, [
      charge('Loyer', 143129, 'member1'),
      charge('Électricité', 4500, 'member1'),
      charge('Gaz', 2800, 'member1'),
      charge('Freebox', 3499, 'joint'),
      charge('Netflix', 799, 'joint'),
      charge('Assurance auto', 8100, 'member2'),
    ])
    expect(recapText(fr, names, split, euros).split('\n').slice(1)).toEqual([
      'Lui : rien à virer',
      'Elle : 42,98 € sur le joint + 622,69 € à Lui',
      'Total : 42,98 € (charges du joint)',
    ])
  })

  it('sans charge sur le joint, seul le remboursement reste', () => {
    const split = computeSplit(household, [charge('Loyer', 100000, 'member2')])
    expect(recapText(fr, names, split, euros).split('\n')[2]).toMatch(/^Lui : [\d ,]+ € à Elle$/)
  })
})
