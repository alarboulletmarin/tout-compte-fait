import { describe, expect, it } from 'vitest'
import { computeSplit, creditors, MONTHS } from './split'
import {
  memberAccount,
  type AccountRef,
  type Charge,
  type Frequency,
  type Household,
} from './types'

const IDS = ['a', 'b', 'c', 'd', 'e', 'f']
const [A, B] = IDS.map(memberAccount) as [AccountRef, AccountRef]

/** Foyer de N membres (ids a, b, c…), un revenu par membre. */
const household = (...incomes: (number | null)[]): Household => ({
  members: incomes.map((income, i) => ({ id: IDS[i]!, name: `M${i + 1}`, income })),
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
    charge('Électricité', 4500, A),
    charge('Gaz', 2800, A),
    charge('Freebox', 3499, A),
    charge('Netflix', 799, A),
    charge('Assurance auto', 8100, B),
  ])

  it('donne les valeurs attendues', () => {
    expect(split.total).toBe(162827)
    expect(split.joint).toBe(143129)
    expect(split.due).toEqual([88160, 74667])
    expect(split.paid).toEqual([11598, 8100])
    expect(split.balance).toEqual([76562, 66567])
    expect(split.toJoint).toEqual([76562, 66567])
    expect(split.reimbursements).toEqual([])
    expect(split.equalFallback).toBe(false)
  })

  it('arrondit les parts à 54,1 % et 45,9 %', () => {
    expect((split.shares[0]! * 100).toFixed(1)).toBe('54.1')
    expect((split.shares[1]! * 100).toFixed(1)).toBe('45.9')
  })

  it('fait tomber la somme des virements sur le loyer', () => {
    expect(split.toJoint[0]! + split.toJoint[1]!).toBe(143129)
  })
})

describe('computeSplit — virement négatif', () => {
  // Maquette Negatif : Lui paie le loyer de son compte
  const split = computeSplit(reference, [
    charge('Loyer', 143129, A),
    charge('Électricité', 4500, A),
    charge('Gaz', 2800, A),
    charge('Freebox', 3499, 'joint'),
    charge('Netflix', 799, 'joint'),
    charge('Assurance auto', 8100, B),
  ])

  it('Lui ne vire rien, Elle vire J sur le joint et rembourse Lui', () => {
    expect(split.paid[0]).toBe(150429)
    expect(split.due[0]).toBe(88160)
    expect(split.balance).toEqual([-62269, 66567])
    expect(split.toJoint).toEqual([0, 4298])
    expect(split.reimbursements).toEqual([{ from: 1, to: 0, amount: 62269 }])
  })

  it('fonctionne dans l’autre sens', () => {
    const s = computeSplit(reference, [charge('Loyer', 100000, B), charge('Box', 3000, 'joint')])
    expect(s.balance[1]).toBeLessThan(0)
    expect(s.toJoint).toEqual([3000, 0])
    expect(s.reimbursements).toEqual([{ from: 0, to: 1, amount: -s.balance[1]! }])
    expect(s.due[1]! + s.reimbursements[0]!.amount).toBe(s.paid[1])
  })

  it('un solde à zéro pile ne déclenche aucun remboursement', () => {
    const s = computeSplit(household(100000, 100000), [charge('A', 5000, A), charge('B', 5000, B)])
    expect(s.balance).toEqual([0, 0])
    expect(s.reimbursements).toEqual([])
  })

  it('tout payé en perso sans joint : J = 0, un seul remboursement', () => {
    const s = computeSplit(household(100000, 100000), [charge('Loyer', 80000, A)])
    expect(s.joint).toBe(0)
    expect(s.toJoint).toEqual([0, 0])
    expect(s.reimbursements).toEqual([{ from: 1, to: 0, amount: 40000 }])
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
      charge('Électricité', 4500, A),
      charge('Gaz', 2800, A),
      charge('Freebox', 3499, A),
      charge('Netflix', 799, A),
      charge('Assurance auto', 8100, B),
      charge('Assurance habitation', 24000, B, 'yearly'),
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
      charge('B', 10000, A, 'quarterly'),
      charge('C', 10000, B, 'quarterly'),
    ])
    expect(s.total).toBe(10000)
    expect([s.joint, ...s.paid]).toEqual([3334, 3333, 3333])
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
    expect(s.reimbursements).toEqual([])
    expect(s.shares[0]!).toBeCloseTo(230000 / 424800)
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

describe('computeSplit — 3 membres', () => {
  const three = household(200000, 100000, 100000)

  it('parts 50 / 25 / 25, virements au prorata', () => {
    const s = computeSplit(three, [charge('Loyer', 100000, 'joint')])
    expect(s.shares).toEqual([0.5, 0.25, 0.25])
    expect(s.due).toEqual([50000, 25000, 25000])
    expect(s.toJoint).toEqual([50000, 25000, 25000])
    expect(s.reimbursements).toEqual([])
  })

  it('le reste d’un centime va au plus petit indice à reste égal', () => {
    const s = computeSplit(household(1, 1, 1), [charge('X', 1000, 'joint')])
    expect(s.due).toEqual([334, 333, 333])
    const t = computeSplit(household(1, 1, 1), [charge('X', 1001, 'joint')])
    expect(t.due).toEqual([334, 334, 333])
  })

  it('un créditeur, deux débiteurs : le remboursement se partage au prorata des dettes', () => {
    // T = 900 €, dû 300 € chacun ; a paie 600 € de son compte, le joint 300 €
    const s = computeSplit(household(1000, 1000, 1000), [
      charge('Loyer', 60000, A),
      charge('Box', 30000, 'joint'),
    ])
    expect(s.balance).toEqual([-30000, 30000, 30000])
    expect(s.toJoint).toEqual([0, 15000, 15000])
    expect(s.reimbursements).toEqual([
      { from: 1, to: 0, amount: 15000 },
      { from: 2, to: 0, amount: 15000 },
    ])
    expect(creditors(s)).toEqual([0])
  })

  it('deux créditeurs, un débiteur : il vire J sur le joint et rembourse chacun', () => {
    const s = computeSplit(household(1000, 1000, 1000), [
      charge('Loyer', 40000, A),
      charge('Courses', 40000, B),
      charge('Box', 10000, 'joint'),
    ])
    expect(s.due).toEqual([30000, 30000, 30000])
    expect(s.balance).toEqual([-10000, -10000, 30000])
    expect(s.toJoint).toEqual([0, 0, 10000])
    expect(s.reimbursements).toEqual([
      { from: 2, to: 0, amount: 10000 },
      { from: 2, to: 1, amount: 10000 },
    ])
    expect(creditors(s)).toEqual([0, 1])
  })

  it('tout payé en perso par un seul : J = 0, chaque autre le rembourse de sa part', () => {
    const s = computeSplit(household(1000, 1000, 1000), [charge('Loyer', 90000, A)])
    expect(s.joint).toBe(0)
    expect(s.toJoint).toEqual([0, 0, 0])
    expect(s.reimbursements).toEqual([
      { from: 1, to: 0, amount: 30000 },
      { from: 2, to: 0, amount: 30000 },
    ])
  })

  it('un revenu à 0 ou absent : parts égales signalées', () => {
    for (const h of [household(100000, 0, 50000), household(null, 100000, 50000)]) {
      const s = computeSplit(h, [charge('X', 1000, 'joint')])
      expect(s.equalFallback).toBe(true)
      expect(s.shares).toEqual([1 / 3, 1 / 3, 1 / 3])
      expect(s.due).toEqual([334, 333, 333])
    }
  })

  it('six membres : la somme des dûs tombe juste', () => {
    const s = computeSplit(household(1, 2, 3, 4, 5, 6), [charge('X', 10001, 'joint')])
    expect(s.due.reduce((a, b) => a + b)).toBe(10001)
    expect(s.due).toHaveLength(6)
  })

  it('refuse une charge payée depuis un membre absent du foyer', () => {
    expect(() => computeSplit(three, [charge('X', 100, memberAccount('zzz'))])).toThrow(RangeError)
  })

  it('l’ordre des membres n’a pas d’influence sur les montants de chacun', () => {
    const charges = [charge('Loyer', 60000, A), charge('Box', 30000, 'joint')]
    const s = computeSplit(household(3000, 1000, 2000), charges)
    const rev = computeSplit(
      { members: [...household(3000, 1000, 2000).members].reverse() },
      charges,
    )
    expect(rev.due).toEqual([...s.due].reverse())
    expect(rev.paid).toEqual([...s.paid].reverse())
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

  it('respecte tous les invariants sur 8 000 foyers de 2 à 6 membres', () => {
    const rand = rng(20260928)
    const int = (max: number) => Math.floor(rand() * (max + 1))
    const pick = <T>(xs: readonly T[]) => xs[int(xs.length - 1)]!

    for (let run = 0; run < 8000; run++) {
      const n = run < 3000 ? 2 : 2 + int(4)
      const incomes = Array.from({ length: n }, () =>
        int(6) === 0 ? pick([0, null]) : int(2_000_000),
      )
      const h = household(...incomes)
      const accounts: AccountRef[] = ['joint', ...h.members.map((m) => memberAccount(m.id))]
      const charges = Array.from({ length: int(15) }, (_, k) =>
        charge(`c${k}`, int(4) === 0 ? int(99) : int(500_000), pick(accounts), pick(FREQS)),
      )
      const s = computeSplit(h, charges)
      const ctx = JSON.stringify({ run, incomes, charges })

      // Totaux exacts en douzièmes de centime
      const exact = (acc?: AccountRef) =>
        charges
          .filter((c) => !acc || c.paidFrom === acc)
          .reduce((sum, c) => sum + c.amount * (12 / MONTHS[c.frequency]), 0)

      expect(Math.abs(s.total * 12 - exact()), ctx).toBeLessThanOrEqual(6)
      expect(Math.abs(s.joint * 12 - exact('joint')), ctx).toBeLessThan(12)
      h.members.forEach((m, i) => {
        expect(Math.abs(s.paid[i]! * 12 - exact(memberAccount(m.id))), ctx).toBeLessThan(12)
      })

      // Tout tombe juste au centime
      const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0)
      expect(s.joint + sum(s.paid), ctx).toBe(s.total)
      expect(sum(s.due), ctx).toBe(s.total)
      expect(sum(s.balance), ctx).toBe(s.joint)
      expect(sum(s.toJoint), ctx).toBe(s.joint)
      expect(sum(s.shares), ctx).toBeCloseTo(1, 9)
      for (const v of [s.total, s.joint, ...s.due, ...s.paid, ...s.balance, ...s.toJoint]) {
        expect(Number.isInteger(v), ctx).toBe(true)
      }

      // Dû à moins d'un centime de T × part
      for (let i = 0; i < n; i++) {
        expect(Math.abs(s.due[i]! - s.total * s.shares[i]!), ctx).toBeLessThan(1)
      }

      // Virements positifs ; chacun finit par avoir payé exactement son dû
      expect(Math.min(...s.toJoint), ctx).toBeGreaterThanOrEqual(0)
      const out = Array<number>(n).fill(0)
      const inn = Array<number>(n).fill(0)
      for (const r of s.reimbursements) {
        expect(r.amount, ctx).toBeGreaterThan(0)
        expect(s.balance[r.from]!, ctx).toBeGreaterThanOrEqual(0) // le payeur est débiteur
        expect(s.balance[r.to]!, ctx).toBeLessThan(0) // le bénéficiaire est créditeur
        out[r.from]! += r.amount
        inn[r.to]! += r.amount
      }
      for (let i = 0; i < n; i++) {
        expect(s.paid[i]! + s.toJoint[i]! + out[i]! - inn[i]!, ctx).toBe(s.due[i])
        // Un créditeur reçoit exactement ce qu'il a avancé en trop, et ne vire rien
        if (s.balance[i]! < 0) {
          expect(inn[i], ctx).toBe(-s.balance[i]!)
          expect(s.toJoint[i], ctx).toBe(0)
          expect(out[i], ctx).toBe(0)
        } else {
          expect(inn[i], ctx).toBe(0)
        }
      }
      expect(s.reimbursements.length === 0, ctx).toBe(s.balance.every((v) => v >= 0))

      // Pour 2 membres : la règle d'origine, à l'identique
      if (n === 2) {
        const [b0, b1] = s.balance as [number, number]
        if (b0 < 0) {
          expect(s.toJoint, ctx).toEqual([0, s.joint])
          expect(s.reimbursements, ctx).toEqual([{ from: 1, to: 0, amount: -b0 }])
        } else if (b1 < 0) {
          expect(s.toJoint, ctx).toEqual([s.joint, 0])
          expect(s.reimbursements, ctx).toEqual([{ from: 0, to: 1, amount: -b1 }])
        } else {
          expect(s.toJoint, ctx).toEqual(s.balance)
        }
      }
    }
  })
})
