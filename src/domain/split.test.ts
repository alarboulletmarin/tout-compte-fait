import { describe, expect, it } from 'vitest'
import { computeSplit, MONTHS } from './split'
import type { AccountRef, Charge, Frequency, Household } from './types'

const household = (income1: number | null, income2: number | null): Household => ({
  members: [
    { name: 'Lui', income: income1 },
    { name: 'Elle', income: income2 },
  ],
})

let seq = 0
const charge = (
  label: string,
  amount: number,
  paidFrom: AccountRef,
  frequency: Frequency = 'monthly',
): Charge => ({ id: String(seq++), label, amount, frequency, paidFrom, categoryId: null })

const reference = household(230000, 194800)

describe('computeSplit — jeu de référence', () => {
  const split = computeSplit(reference, [
    charge('Loyer', 143129, 'joint'),
    charge('Électricité', 4500, 'member1'),
    charge('Gaz', 2800, 'member1'),
    charge('Freebox', 3499, 'member1'),
    charge('Netflix', 799, 'member1'),
    charge('Assurance auto', 8100, 'member2'),
  ])

  it('donne les valeurs attendues', () => {
    expect(split.total).toBe(162827)
    expect(split.joint).toBe(143129)
    expect(split.due).toEqual([88160, 74667])
    expect(split.paid).toEqual([11598, 8100])
    expect(split.balance).toEqual([76562, 66567])
    expect(split.toJoint).toEqual([76562, 66567])
    expect(split.reimbursement).toBeNull()
    expect(split.equalFallback).toBe(false)
  })

  it('arrondit les parts à 54,1 % et 45,9 %', () => {
    expect((split.shares[0] * 100).toFixed(1)).toBe('54.1')
    expect((split.shares[1] * 100).toFixed(1)).toBe('45.9')
  })

  it('fait tomber la somme des virements sur le loyer', () => {
    expect(split.toJoint[0] + split.toJoint[1]).toBe(143129)
  })
})

describe('computeSplit — virement négatif', () => {
  // Maquette Negatif : Lui paie le loyer de son compte
  const split = computeSplit(reference, [
    charge('Loyer', 143129, 'member1'),
    charge('Électricité', 4500, 'member1'),
    charge('Gaz', 2800, 'member1'),
    charge('Freebox', 3499, 'joint'),
    charge('Netflix', 799, 'joint'),
    charge('Assurance auto', 8100, 'member2'),
  ])

  it('Lui ne vire rien, Elle vire J sur le joint et rembourse Lui', () => {
    expect(split.paid[0]).toBe(150429)
    expect(split.due[0]).toBe(88160)
    expect(split.balance).toEqual([-62269, 66567])
    expect(split.toJoint).toEqual([0, 4298])
    expect(split.reimbursement).toEqual({ from: 1, to: 0, amount: 62269 })
  })

  it('fonctionne dans l’autre sens', () => {
    const s = computeSplit(reference, [
      charge('Loyer', 100000, 'member2'),
      charge('Box', 3000, 'joint'),
    ])
    expect(s.balance[1]).toBeLessThan(0)
    expect(s.toJoint).toEqual([3000, 0])
    expect(s.reimbursement).toEqual({ from: 0, to: 1, amount: -s.balance[1] })
    expect(s.due[1] + s.reimbursement!.amount).toBe(s.paid[1])
  })

  it('un solde à zéro pile ne déclenche aucun remboursement', () => {
    const s = computeSplit(household(100000, 100000), [
      charge('A', 5000, 'member1'),
      charge('B', 5000, 'member2'),
    ])
    expect(s.balance).toEqual([0, 0])
    expect(s.reimbursement).toBeNull()
  })

  it('tout payé en perso sans joint : J = 0, un seul remboursement', () => {
    const s = computeSplit(household(100000, 100000), [charge('Loyer', 80000, 'member1')])
    expect(s.joint).toBe(0)
    expect(s.toJoint).toEqual([0, 0])
    expect(s.reimbursement).toEqual({ from: 1, to: 0, amount: 40000 })
  })
})

describe('computeSplit — revenu à 0 ou absent', () => {
  const charges = [charge('Loyer', 100000, 'joint')]

  it.each([
    ['un revenu à 0', household(230000, 0)],
    ['le premier revenu à 0', household(0, 194800)],
    ['un revenu non renseigné', household(null, 194800)],
    ['les deux à 0', household(0, 0)],
    ['aucun revenu', household(null, null)],
  ])('%s → 50 / 50 signalé', (_, h) => {
    const s = computeSplit(h, charges)
    expect(s.equalFallback).toBe(true)
    expect(s.shares).toEqual([0.5, 0.5])
    expect(s.due).toEqual([50000, 50000])
  })

  it('T impair en 50 / 50 : le centime en trop va au membre 1', () => {
    const s = computeSplit(household(0, 0), [charge('X', 1001, 'joint')])
    expect(s.due).toEqual([501, 500])
  })

  it('revenus égaux et T impair : même règle', () => {
    const s = computeSplit(household(200000, 200000), [charge('X', 1001, 'joint')])
    expect(s.equalFallback).toBe(false)
    expect(s.due).toEqual([501, 500])
  })
})

describe('computeSplit — fréquences', () => {
  it('annuelle : 240 € → 20 € par mois (maquette ChargesAnnuelle)', () => {
    const s = computeSplit(reference, [
      charge('Loyer', 143129, 'joint'),
      charge('Électricité', 4500, 'member1'),
      charge('Gaz', 2800, 'member1'),
      charge('Freebox', 3499, 'member1'),
      charge('Netflix', 799, 'member1'),
      charge('Assurance auto', 8100, 'member2'),
      charge('Assurance habitation', 24000, 'member2', 'yearly'),
    ])
    expect(s.total).toBe(164827)
    expect(s.paid).toEqual([11598, 10100])
  })

  it('trimestrielle : 90 € → 30 € par mois', () => {
    const s = computeSplit(reference, [charge('Eau', 9000, 'joint', 'quarterly')])
    expect(s.total).toBe(3000)
  })

  it('les fractions de centime s’additionnent avant l’arrondi', () => {
    // 3 × 100 € / trimestre = 100 € pile par mois, pas 3 × 33,33
    const s = computeSplit(reference, [
      charge('A', 10000, 'joint', 'quarterly'),
      charge('B', 10000, 'joint', 'quarterly'),
      charge('C', 10000, 'joint', 'quarterly'),
    ])
    expect(s.total).toBe(10000)
    expect(s.joint).toBe(10000)
  })

  it('fractions réparties sur trois comptes : Σ = T, le joint prend le centime', () => {
    const s = computeSplit(reference, [
      charge('A', 10000, 'joint', 'quarterly'),
      charge('B', 10000, 'member1', 'quarterly'),
      charge('C', 10000, 'member2', 'quarterly'),
    ])
    expect(s.total).toBe(10000)
    expect([s.joint, s.paid[0], s.paid[1]]).toEqual([3334, 3333, 3333])
  })

  it('arrondit T au centime le plus proche', () => {
    // 1 € / an = 8,33 c ; 5 € / an = 41,67 c
    expect(computeSplit(reference, [charge('A', 100, 'joint', 'yearly')]).total).toBe(8)
    expect(computeSplit(reference, [charge('A', 500, 'joint', 'yearly')]).total).toBe(42)
  })
})

describe('computeSplit — liste vide', () => {
  it('tout vaut zéro, les parts suivent les revenus', () => {
    const s = computeSplit(reference, [])
    expect(s.total).toBe(0)
    expect(s.joint).toBe(0)
    expect(s.due).toEqual([0, 0])
    expect(s.paid).toEqual([0, 0])
    expect(s.balance).toEqual([0, 0])
    expect(s.toJoint).toEqual([0, 0])
    expect(s.reimbursement).toBeNull()
    expect(s.shares[0]).toBeCloseTo(230000 / 424800)
  })
})

describe('computeSplit — entrées invalides', () => {
  it.each([-1, 1.5, NaN, Infinity])('refuse un montant de %s', (amount) => {
    expect(() => computeSplit(reference, [charge('X', amount, 'joint')])).toThrow(RangeError)
  })

  it.each([-1, 0.5, NaN])('refuse un revenu de %s', (income) => {
    expect(() => computeSplit(household(income, 100), [])).toThrow(RangeError)
  })
})

describe('computeSplit — propriétés sur montants aléatoires', () => {
  // PRNG déterministe (mulberry32) : un échec se rejoue à l'identique
  function rng(seed: number) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }
  const FREQS: Frequency[] = ['monthly', 'quarterly', 'yearly']
  const ACCOUNTS: AccountRef[] = ['joint', 'member1', 'member2']

  it('respecte tous les invariants sur 5 000 foyers', () => {
    const rand = rng(20260928)
    const int = (max: number) => Math.floor(rand() * (max + 1))
    const pick = <T>(xs: readonly T[]) => xs[int(xs.length - 1)]!

    for (let run = 0; run < 5000; run++) {
      const incomes = [int(4) === 0 ? pick([0, null]) : int(2_000_000), int(2_000_000)] as const
      const h = household(...(run % 2 ? incomes : ([incomes[1], incomes[0]] as const)))
      const charges = Array.from({ length: int(15) }, (_, k) =>
        charge(`c${k}`, int(4) === 0 ? int(99) : int(500_000), pick(ACCOUNTS), pick(FREQS)),
      )
      const s = computeSplit(h, charges)
      const ctx = JSON.stringify({ run, h, charges })

      // Totaux exacts en douzièmes de centime
      const exact = (acc?: AccountRef) =>
        charges
          .filter((c) => !acc || c.paidFrom === acc)
          .reduce((sum, c) => sum + c.amount * (12 / MONTHS[c.frequency]), 0)

      expect(Math.abs(s.total * 12 - exact()), ctx).toBeLessThanOrEqual(6)
      expect(Math.abs(s.joint * 12 - exact('joint')), ctx).toBeLessThan(12)
      expect(Math.abs(s.paid[0] * 12 - exact('member1')), ctx).toBeLessThan(12)
      expect(Math.abs(s.paid[1] * 12 - exact('member2')), ctx).toBeLessThan(12)

      // Tout tombe juste au centime
      expect(s.joint + s.paid[0] + s.paid[1], ctx).toBe(s.total)
      expect(s.due[0] + s.due[1], ctx).toBe(s.total)
      expect(s.balance[0] + s.balance[1], ctx).toBe(s.joint)
      expect(s.toJoint[0] + s.toJoint[1], ctx).toBe(s.joint)
      for (const v of [s.total, s.joint, ...s.due, ...s.paid, ...s.balance, ...s.toJoint]) {
        expect(Number.isInteger(v), ctx).toBe(true)
      }

      // Dû à moins d'un centime de T × part
      for (const i of [0, 1] as const) {
        expect(Math.abs(s.due[i] - s.total * s.shares[i]), ctx).toBeLessThan(1)
      }

      // Virements positifs ; chacun finit par avoir payé exactement son dû
      expect(Math.min(...s.toJoint), ctx).toBeGreaterThanOrEqual(0)
      const r = s.reimbursement
      for (const i of [0, 1] as const) {
        const net = r ? (r.from === i ? r.amount : r.to === i ? -r.amount : 0) : 0
        expect(s.paid[i] + s.toJoint[i] + net, ctx).toBe(s.due[i])
      }
      expect(r === null, ctx).toBe(s.balance[0] >= 0 && s.balance[1] >= 0)
    }
  })
})
