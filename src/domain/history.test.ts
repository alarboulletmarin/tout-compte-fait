import { describe, expect, it } from 'vitest'
import { sample } from '../storage/fixtures'
import type { Charge } from './types'
import {
  carryForward,
  compareMonths,
  monthOf,
  recordMonth,
  snapshotOf,
  sortedMonths,
} from './history'

const charge = (id: string, amount: number, extra: Partial<Charge> = {}): Charge => ({
  id,
  label: `Charge ${id}`,
  amount,
  frequency: 'monthly',
  paidFrom: 'joint',
  categoryId: null,
  ...extra,
})

describe('monthOf', () => {
  it('lit le mois à l’horloge locale', () => {
    expect(monthOf(new Date(2026, 8, 28, 12))).toBe('2026-09')
    expect(monthOf(new Date(2026, 11, 31, 23, 59))).toBe('2026-12')
    expect(monthOf(new Date(2027, 0, 1, 0, 0))).toBe('2027-01')
  })
})

describe('snapshotOf', () => {
  it('garde le foyer, les charges et les catégories, sans l’historique', () => {
    const data = recordMonth(sample(), '2026-08')
    expect(Object.keys(snapshotOf(data)).sort()).toEqual(['categories', 'charges', 'household'])
  })
})

describe('recordMonth', () => {
  it('écrit l’instantané du mois courant, sans drapeau', () => {
    const data = recordMonth(sample(), '2026-09')
    expect(data.history['2026-09']).toEqual(snapshotOf(sample()))
    expect(data.history['2026-09']).not.toHaveProperty('carried')
  })

  it('un mois passé ne bouge pas quand on modifie le mois courant', () => {
    const august = recordMonth(sample(), '2026-08')
    const edited = { ...august, charges: [...august.charges, charge('z', 5000)] }
    const september = recordMonth(edited, '2026-09')

    expect(september.history['2026-08']).toEqual(august.history['2026-08'])
    expect(september.history['2026-08']!.charges).toHaveLength(2)
    expect(september.history['2026-09']!.charges).toHaveLength(3)
    // Et rejouer une modification du mois courant ne touche toujours pas au passé
    const again = recordMonth({ ...september, charges: [] }, '2026-09')
    expect(again.history['2026-08']).toEqual(august.history['2026-08'])
    expect(again.history['2026-09']!.charges).toEqual([])
  })

  it('retire le drapeau « reconduit » du mois courant', () => {
    const carried = carryForward(recordMonth(sample(), '2026-08'), '2026-09')
    expect(carried.history['2026-09']!.carried).toBe(true)

    const saved = recordMonth({ ...carried, charges: [charge('z', 1000)] }, '2026-09')
    expect(saved.history['2026-09']).not.toHaveProperty('carried')
    // Même sans modification, enregistrer suffit
    const same = recordMonth(carried, '2026-09')
    expect(same.history['2026-09']).not.toHaveProperty('carried')
    // Les mois reconduits plus anciens gardent le leur
    const older = recordMonth(carryForward(recordMonth(sample(), '2026-06'), '2026-09'), '2026-09')
    expect(older.history['2026-07']!.carried).toBe(true)
    expect(older.history['2026-08']!.carried).toBe(true)
    expect(older.history['2026-09']).not.toHaveProperty('carried')
  })

  it('reconduit les mois manquants avant d’écrire le mois courant', () => {
    const data = recordMonth(recordMonth(sample(), '2026-08'), '2026-11')
    expect(sortedMonths(data.history)).toEqual(['2026-08', '2026-09', '2026-10', '2026-11'])
    expect(data.history['2026-09']!.carried).toBe(true)
    expect(data.history['2026-10']!.carried).toBe(true)
    expect(data.history['2026-11']).not.toHaveProperty('carried')
  })

  it('ne modifie pas ses arguments', () => {
    const before = sample()
    const frozen = JSON.stringify(before)
    recordMonth(before, '2026-09')
    expect(JSON.stringify(before)).toBe(frozen)
  })
})

describe('carryForward', () => {
  const august = () => recordMonth(sample(), '2026-08')

  it('sans historique, le mois courant reçoit les données actuelles, sans drapeau', () => {
    const data = carryForward(sample(), '2026-09')
    expect(data.history).toEqual({ '2026-09': snapshotOf(sample()) })
  })

  it('ne fait rien quand le mois courant existe déjà', () => {
    const data = august()
    expect(carryForward(data, '2026-08')).toBe(data)
  })

  it('reconduit un mois manquant', () => {
    const data = carryForward(august(), '2026-09')
    expect(sortedMonths(data.history)).toEqual(['2026-08', '2026-09'])
    expect(data.history['2026-09']).toEqual({ ...snapshotOf(sample()), carried: true })
    expect(data.history['2026-08']).not.toHaveProperty('carried')
  })

  it('reconduit plusieurs mois manquants', () => {
    const data = carryForward(august(), '2026-12')
    expect(sortedMonths(data.history)).toEqual([
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
      '2026-12',
    ])
    for (const m of ['2026-09', '2026-10', '2026-11', '2026-12']) {
      expect(data.history[m]!.carried).toBe(true)
    }
  })

  it('passe le changement d’année', () => {
    const data = carryForward(recordMonth(sample(), '2026-11'), '2027-02')
    expect(sortedMonths(data.history)).toEqual(['2026-11', '2026-12', '2027-01', '2027-02'])
  })

  it('reprend le dernier instantané, pas les données courantes', () => {
    const data = carryForward({ ...august(), charges: [] }, '2026-10')
    expect(data.history['2026-10']!.charges).toHaveLength(2)
  })

  it('ne réécrit aucun mois existant, même après un trou', () => {
    const start = recordMonth({ ...recordMonth(sample(), '2026-06'), charges: [] }, '2026-08')
    const data = carryForward(start, '2026-10')
    expect(data.history['2026-06']).toEqual(start.history['2026-06'])
    expect(data.history['2026-07']).toEqual(start.history['2026-07'])
    expect(data.history['2026-08']).toEqual(start.history['2026-08'])
  })

  it('est idempotente', () => {
    const once = carryForward(august(), '2026-12')
    expect(carryForward(once, '2026-12')).toBe(once)
  })

  it('ne modifie pas ses arguments', () => {
    const before = august()
    const frozen = JSON.stringify(before)
    carryForward(before, '2026-12')
    expect(JSON.stringify(before)).toBe(frozen)
  })
})

describe('compareMonths', () => {
  const base = snapshotOf(sample())

  it('deux mois identiques : aucun écart', () => {
    expect(compareMonths(base, { ...base })).toEqual({
      totalDelta: 0,
      added: [],
      removed: [],
      changed: [],
    })
  })

  it('charge ajoutée : écart de T et liste des ajouts', () => {
    const added = charge('z', 12000)
    const diff = compareMonths(base, { ...base, charges: [...base.charges, added] })
    expect(diff.totalDelta).toBe(12000)
    expect(diff.added).toEqual([added])
    expect(diff.removed).toEqual([])
    expect(diff.changed).toEqual([])
  })

  it('charge retirée : écart négatif', () => {
    const [loyer, ...rest] = base.charges
    const diff = compareMonths(base, { ...base, charges: rest })
    expect(diff.totalDelta).toBe(-143129)
    expect(diff.removed).toEqual([loyer])
    expect(diff.added).toEqual([])
  })

  it('charge modifiée : avant et après', () => {
    const [loyer, ...rest] = base.charges
    const raised = { ...loyer!, amount: 150000 }
    const diff = compareMonths(base, { ...base, charges: [raised, ...rest] })
    expect(diff.totalDelta).toBe(150000 - 143129)
    expect(diff.changed).toEqual([{ before: loyer, after: raised, fields: ['amount'] }])
    expect(diff.added).toEqual([])
    expect(diff.removed).toEqual([])
  })

  it.each<[string, Partial<Charge>, string]>([
    ['le libellé', { label: 'Autre' }, 'label'],
    ['la fréquence', { frequency: 'quarterly' }, 'frequency'],
    ['le compte payeur', { paidFrom: 'm:lui' }, 'paidFrom'],
    ['la catégorie', { categoryId: null }, 'categoryId'],
  ])('une charge dont seul %s change est « modifiée »', (_, patch, field) => {
    const [loyer, ...rest] = base.charges
    const diff = compareMonths(base, { ...base, charges: [{ ...loyer!, ...patch }, ...rest] })
    expect(diff.changed.map((c) => c.fields)).toEqual([[field]])
  })

  it('liste tous les champs modifiés, dans l’ordre', () => {
    const [loyer, ...rest] = base.charges
    const edited = { ...loyer!, label: 'Loyer 2', amount: 1, paidFrom: 'm:lui' as const }
    const diff = compareMonths(base, { ...base, charges: [edited, ...rest] })
    expect(diff.changed[0]!.fields).toEqual(['label', 'amount', 'paidFrom'])
  })

  it('chaque instantané se calcule avec son propre foyer', () => {
    const grown = {
      ...base,
      household: {
        members: [...base.household.members, { id: 'tiers', name: 'Tiers', income: 100000 }],
      },
      charges: [...base.charges, charge('t', 6000, { paidFrom: 'm:tiers' as const })],
    }
    // Le membre « tiers » n'existe pas dans `base` : aucun des deux calculs ne doit échouer
    expect(compareMonths(base, grown).totalDelta).toBe(6000)
    expect(compareMonths(grown, base).totalDelta).toBe(-6000)
  })
})
