import { describe, expect, it } from 'vitest'
import { makeSavingRate } from './fixtures'
import {
  RATE_ORIGIN,
  isOrigin,
  monthlyRateBps,
  rateOn,
  rateSchedule,
  ratesOf,
} from './savingRate'

const rates = [
  makeSavingRate({ id: 'r1', supportId: 's1', rateBp: 300, from: '2024-02-01' }),
  makeSavingRate({ id: 'r2', supportId: 's1', rateBp: 240, from: '2025-02-01' }),
  makeSavingRate({ id: 'r3', supportId: 's2', rateBp: 175, from: '2024-01-01' }),
]

describe('ratesOf', () => {
  it('ne rend que les paliers du support, du plus récent au plus ancien', () => {
    expect(ratesOf(rates, 's1').map((rate) => rate.id)).toEqual(['r2', 'r1'])
    expect(ratesOf(rates, 's2').map((rate) => rate.id)).toEqual(['r3'])
    expect(ratesOf(rates, 'inconnu')).toEqual([])
  })

  it('départage deux paliers du même jour par leur ordre d’arrivée', () => {
    /* Une saisie et sa correction : c'est la seconde qui fait foi, et pas celle
       dont l'identifiant serait tiré au sort. */
    const sameDay = [
      makeSavingRate({ id: 'zzz', supportId: 's1', rateBp: 100, from: '2026-01-01' }),
      makeSavingRate({ id: 'aaa', supportId: 's1', rateBp: 200, from: '2026-01-01' }),
    ]
    expect(ratesOf(sameDay, 's1').map((rate) => rate.id)).toEqual(['aaa', 'zzz'])
  })
})

describe('rateOn', () => {
  it('rend `null` avant le premier palier — pas zéro', () => {
    expect(rateOn(rates, 's1', '2024-01-31')).toBeNull()
  })

  it('inclut le jour du palier', () => {
    expect(rateOn(rates, 's1', '2024-02-01')?.rateBp).toBe(300)
  })

  it('garde le palier tant que le suivant n’a pas commencé', () => {
    expect(rateOn(rates, 's1', '2025-01-31')?.rateBp).toBe(300)
    expect(rateOn(rates, 's1', '2025-02-01')?.rateBp).toBe(240)
    expect(rateOn(rates, 's1', '2030-06-15')?.rateBp).toBe(240)
  })

  it('rend `null` sur un support sans palier', () => {
    expect(rateOn(rates, 'inconnu', '2030-01-01')).toBeNull()
  })
})

describe('rateSchedule', () => {
  it('borne chaque palier par le suivant, dans le sens du temps', () => {
    expect(rateSchedule(rates, 's1')).toEqual([
      { rateBp: 300, kind: 'assumed', from: '2024-02-01', to: '2025-02-01' },
      { rateBp: 240, kind: 'assumed', from: '2025-02-01', to: null },
    ])
  })

  it('fusionne deux paliers identiques qui se suivent', () => {
    const repeated = [
      makeSavingRate({ id: 'a', supportId: 's', rateBp: 300, from: '2024-01-01' }),
      makeSavingRate({ id: 'b', supportId: 's', rateBp: 300, from: '2025-01-01' }),
    ]
    expect(rateSchedule(repeated, 's')).toEqual([
      { rateBp: 300, kind: 'assumed', from: '2024-01-01', to: null },
    ])
  })

  it('ne fusionne pas deux paliers de même taux et de nature différente', () => {
    const changed = [
      makeSavingRate({ id: 'a', supportId: 's', rateBp: 300, kind: 'assumed', from: '2024-01-01' }),
      makeSavingRate({
        id: 'b',
        supportId: 's',
        rateBp: 300,
        kind: 'guaranteed',
        from: '2025-01-01',
      }),
    ]
    expect(rateSchedule(changed, 's')).toHaveLength(2)
  })

  it('la correction du jour même remplace, et n’ouvre pas un palier vide', () => {
    const corrected = [
      makeSavingRate({ id: 'a', supportId: 's', rateBp: 300, from: '2024-01-01' }),
      makeSavingRate({ id: 'b', supportId: 's', rateBp: 250, from: '2024-01-01' }),
    ]
    expect(rateSchedule(corrected, 's')).toEqual([
      { rateBp: 250, kind: 'assumed', from: '2024-01-01', to: null },
    ])
  })

  it('rend une liste vide sans palier', () => {
    expect(rateSchedule(rates, 'inconnu')).toEqual([])
  })
})

describe('monthlyRateBps', () => {
  const steps = rateSchedule(rates, 's1')

  it('porte un terme par mois, et pas un de plus', () => {
    expect(monthlyRateBps(steps, '2025-01', 6, 0)).toHaveLength(6)
    expect(monthlyRateBps(steps, '2025-01', 0, 0)).toEqual([])
    expect(monthlyRateBps(steps, '2025-01', -3, 0)).toEqual([])
  })

  it('change de taux au mois du palier, et jamais avant', () => {
    /* Janvier 2025 court encore à 3 %, février prend les 2,40 %. */
    expect(monthlyRateBps(steps, '2024-12', 4, 0)).toEqual([300, 300, 240, 240])
  })

  it('comble les mois d’avant le premier palier par le repli', () => {
    expect(monthlyRateBps(steps, '2023-12', 3, 500)).toEqual([500, 500, 300])
  })

  it('rend un barème plat quand le support n’a aucun palier', () => {
    expect(monthlyRateBps([], '2026-01', 3, 500)).toEqual([500, 500, 500])
  })

  it('tient le dernier palier jusqu’au bout de l’horizon', () => {
    expect(monthlyRateBps(steps, '2030-01', 3, 0)).toEqual([240, 240, 240])
  })
})

describe('RATE_ORIGIN', () => {
  it('précède tout ce que le document sait dater', () => {
    expect(isOrigin(RATE_ORIGIN)).toBe(true)
    expect(isOrigin('2024-01-01')).toBe(false)
    const since = [makeSavingRate({ id: 'a', supportId: 's', from: RATE_ORIGIN })]
    expect(rateOn(since, 's', '1999-12-31')?.rateBp).toBe(250)
  })
})
