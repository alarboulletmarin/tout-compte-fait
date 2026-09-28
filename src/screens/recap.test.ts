import { describe, expect, it } from 'vitest'
import { computeSplit } from '../domain/split'
import { memberAccount, type AccountRef, type Charge } from '../domain/types'
import { formatEuros } from '../i18n/format'
import { fr } from '../i18n/fr'
import { recapText } from './recap'

const euros = (cents: number) => formatEuros(cents, 'fr-FR').replace(/\u00a0/g, ' ')
const [A, B, C] = ['a', 'b', 'c'].map(memberAccount) as [AccountRef, AccountRef, AccountRef]
const household = {
  members: [
    { id: 'a', name: 'Lui', income: 230000 },
    { id: 'b', name: 'Elle', income: 194800 },
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
const names = ['Lui', 'Elle']

describe('recapText', () => {
  it('reprend la maquette pour le jeu de référence', () => {
    const split = computeSplit(household, [
      charge('Loyer', 143129, 'joint'),
      charge('Électricité', 4500, A),
      charge('Gaz', 2800, A),
      charge('Freebox', 3499, A),
      charge('Netflix', 799, A),
      charge('Assurance auto', 8100, B),
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
      charge('Loyer', 143129, A),
      charge('Électricité', 4500, A),
      charge('Gaz', 2800, A),
      charge('Freebox', 3499, 'joint'),
      charge('Netflix', 799, 'joint'),
      charge('Assurance auto', 8100, B),
    ])
    expect(recapText(fr, names, split, euros).split('\n').slice(1)).toEqual([
      'Lui : rien à virer',
      'Elle : 42,98 € sur le joint + 622,69 € à Lui',
      'Total : 42,98 € (charges du joint)',
    ])
  })

  it('sans charge sur le joint, seul le remboursement reste', () => {
    const split = computeSplit(household, [charge('Loyer', 100000, B)])
    expect(recapText(fr, names, split, euros).split('\n')[2]).toMatch(/^Lui : [\d ,]+ € à Elle$/)
  })

  it('à trois, chaque débiteur nomme ses remboursements', () => {
    const three = {
      members: [...household.members, { id: 'c', name: 'Sam', income: 100000 }],
    }
    // Lui avance 900 € sur son compte : Elle et Sam le remboursent
    const split = computeSplit(three, [charge('Loyer', 90000, A), charge('Box', 3000, 'joint')])
    expect(
      recapText(fr, [...names, 'Sam'], split, euros)
        .split('\n')
        .slice(1),
    ).toEqual([
      'Lui : rien à virer',
      'Elle : 19,82 € sur le joint + 325,39 € à Lui',
      'Sam : 10,18 € sur le joint + 167,03 € à Lui',
      'Total : 30,00 € (charges du joint)',
    ])
  })

  it('un débiteur peut rembourser plusieurs créditeurs', () => {
    const three = {
      members: [
        { id: 'a', name: 'Lui', income: 100000 },
        { id: 'b', name: 'Elle', income: 100000 },
        { id: 'c', name: 'Sam', income: 100000 },
      ],
    }
    const split = computeSplit(three, [
      charge('A', 40000, A),
      charge('B', 40000, B),
      charge('C', 10000, C),
    ])
    expect(recapText(fr, ['Lui', 'Elle', 'Sam'], split, euros).split('\n').slice(1, 4)).toEqual([
      'Lui : rien à virer',
      'Elle : rien à virer',
      'Sam : 100,00 € à Lui + 100,00 € à Elle',
    ])
  })
})
