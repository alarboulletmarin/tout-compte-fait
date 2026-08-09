import { describe, expect, it } from 'vitest'
import { eur, makeEntry, makeSavingRate, makeSavingSupport, makeSavingValuation } from './fixtures'
import {
  type StockSource,
  growthBands,
  growthOf,
  growthTotal,
  stockBands,
  stockRange,
  supportStockSeries,
} from './savingSeries'

const ON = '2026-06-15'

const source = (over: Partial<StockSource> = {}): StockSource => ({
  savingValuations: [],
  savingRates: [],
  entries: [],
  ...over,
})

const pays = (date: string, amount: number) =>
  makeEntry({
    date,
    amount: eur(amount),
    direction: 'out',
    categoryId: 'passbook',
    savingSupportId: 's-1',
    status: 'confirmed',
  })

describe('avant le premier relevé', () => {
  it('rend `null` plutôt que zéro — une inconnue n’est pas un compte vide', () => {
    const data = source({
      savingValuations: [
        makeSavingValuation({ id: 'v-1', supportId: 's-1', amount: eur(100_000), date: '2026-04-10' }),
      ],
    })
    const points = supportStockSeries('s-1', data, '2026-02', '2026-05', ON)
    expect(points.map((point) => point.value)).toEqual([null, null, 100_000, 100_000])
  })

  it('compte quand même les mouvements du mois, sans en faire une valeur', () => {
    const data = source({ entries: [pays('2026-02-10', 20_000)] })
    const points = supportStockSeries('s-1', data, '2026-02', '2026-03', ON)
    expect(points[0]?.moved).toBe(20_000)
    expect(points[0]?.value).toBeNull()
  })
})

describe('le relevé fait foi', () => {
  const data = source({
    savingValuations: [
      makeSavingValuation({ id: 'v-1', supportId: 's-1', amount: eur(100_000), date: '2026-01-05' }),
      makeSavingValuation({ id: 'v-2', supportId: 's-1', amount: eur(500_000), date: '2026-03-20' }),
    ],
    entries: [pays('2026-02-10', 20_000)],
  })

  it('reprend la main sur l’estimation, au lieu de s’y ajouter', () => {
    const points = supportStockSeries('s-1', data, '2026-01', '2026-03', ON)
    expect(points[1]?.value).toBe(120_000)
    // Mars repart du relevé, et n'y ajoute pas les 120 000 estimés de février.
    expect(points[2]?.value).toBe(500_000)
    expect(points[2]?.known).toBe(500_000)
  })

  it('ne compte pas deux fois un versement antérieur au relevé du mois', () => {
    const before = source({
      savingValuations: [
        makeSavingValuation({ id: 'v', supportId: 's-1', amount: eur(300_000), date: '2026-02-20' }),
      ],
      entries: [pays('2026-02-10', 20_000)],
    })
    // Le versement du 10 est déjà dans le relevé du 20 : le mois vaut 300 000.
    expect(supportStockSeries('s-1', before, '2026-02', '2026-02', ON)[0]?.value).toBe(300_000)
  })

  it('ajoute en revanche ce qui bouge après le relevé', () => {
    const after = source({
      savingValuations: [
        makeSavingValuation({ id: 'v', supportId: 's-1', amount: eur(300_000), date: '2026-02-10' }),
      ],
      entries: [pays('2026-02-20', 20_000)],
    })
    expect(supportStockSeries('s-1', after, '2026-02', '2026-02', ON)[0]?.value).toBe(320_000)
  })

  it('n’attribue aucun intérêt au mois qui porte un relevé', () => {
    /* Le relevé contient déjà ce que le taux a produit : l'écrire à côté le
       compterait deux fois. */
    const rated = source({
      savingValuations: [
        makeSavingValuation({ id: 'v', supportId: 's-1', amount: eur(300_000), date: '2026-02-10' }),
      ],
      savingRates: [makeSavingRate({ id: 'tx', supportId: 's-1', rateBp: 1_000, from: '2020-01-01' })],
    })
    expect(supportStockSeries('s-1', rated, '2026-02', '2026-02', ON)[0]?.interest).toBe(0)
  })
})

describe('les intérêts', () => {
  const opened = makeSavingValuation({
    id: 'v',
    supportId: 's-1',
    amount: eur(1_200_000),
    date: '2025-12-31',
  })

  it('valent zéro sans palier — jamais un taux par défaut', () => {
    const data = source({ savingValuations: [opened] })
    const points = supportStockSeries('s-1', data, '2026-01', '2026-03', ON)
    expect(points.map((point) => point.interest)).toEqual([0, 0, 0])
    expect(points.at(-1)?.value).toBe(1_200_000)
  })

  it('portent sur le capital d’entrée, jamais sur le versement du mois', () => {
    /* La convention de fin de mois de `projectSeries` : entre deux conventions
       défendables, celle qui promet le moins. */
    const data = source({
      savingValuations: [opened],
      savingRates: [makeSavingRate({ id: 'tx', supportId: 's-1', rateBp: 1_200, from: '2020-01-01' })],
      entries: [pays('2026-01-05', 100_000)],
    })
    const january = supportStockSeries('s-1', data, '2026-01', '2026-01', ON)[0]
    // 1 % mensuel équivalent sur 12 000 € = ~94,89 €, et rien sur les 1 000 € versés.
    expect(january?.interest).toBe(Math.round(1_200_000 * (Math.pow(1.12, 1 / 12) - 1)))
    expect(january?.value).toBe(1_200_000 + (january?.interest ?? 0) + 100_000)
  })

  it('changent de taux au mois du palier, et laissent les mois d’avant intacts', () => {
    /* C'est la propriété qui a fait exister le taux daté : poser un palier en
       2027 ne doit pas réécrire 2026. */
    const withoutLater = source({
      savingValuations: [opened],
      savingRates: [makeSavingRate({ id: 'a', supportId: 's-1', rateBp: 300, from: '2020-01-01' })],
    })
    const withLater = source({
      ...withoutLater,
      savingRates: [
        ...withoutLater.savingRates,
        makeSavingRate({ id: 'b', supportId: 's-1', rateBp: 1_500, from: '2026-04-01' }),
      ],
    })
    const before = supportStockSeries('s-1', withoutLater, '2026-01', '2026-03', ON)
    const after = supportStockSeries('s-1', withLater, '2026-01', '2026-03', ON)
    expect(after).toEqual(before)
    // Et le palier s'applique bien, une fois sa date atteinte.
    expect(
      supportStockSeries('s-1', withLater, '2026-04', '2026-04', ON)[0]?.interest,
    ).toBeGreaterThan(supportStockSeries('s-1', withoutLater, '2026-04', '2026-04', ON)[0]?.interest ?? 0)
  })
})

describe('les bornes de la lecture', () => {
  const data = source({
    savingValuations: [
      makeSavingValuation({ id: 'v', supportId: 's-1', amount: eur(100_000), date: '2026-01-01' }),
    ],
  })

  it('ne dépasse jamais le mois où l’on regarde — ceci est le passé', () => {
    const points = supportStockSeries('s-1', data, '2026-01', '2027-12', ON)
    expect(points.at(-1)?.month).toBe('2026-06')
  })

  it('ignore les échéances encore prévues', () => {
    const planned = source({
      ...data,
      entries: [{ ...pays('2026-02-10', 20_000), status: 'planned' as const }],
    })
    expect(supportStockSeries('s-1', planned, '2026-02', '2026-02', ON)[0]?.value).toBe(100_000)
  })

  it('rend une liste vide quand la fenêtre est à l’envers', () => {
    expect(supportStockSeries('s-1', data, '2026-05', '2026-02', ON)).toEqual([])
  })
})

describe('la pile des supports', () => {
  const supports = [
    makeSavingSupport({ id: 's-1', label: 'Livret A', memberId: 'm-1' }),
    makeSavingSupport({ id: 's-2', label: 'PEA', memberId: 'm-1' }),
  ]
  const data = source({
    savingValuations: [
      makeSavingValuation({ id: 'v', supportId: 's-1', amount: eur(100_000), date: '2026-01-01' }),
    ],
  })

  it('écarte un support qu’aucun relevé ne chiffre, plutôt que de l’empiler à zéro', () => {
    /* Empiler une inconnue comme un zéro ferait passer une ignorance pour un
       compte vide, et le total de la pile serait faux en se présentant comme
       exact. */
    const bands = stockBands(supports, data, '2026-01', '2026-03', ON)
    expect(bands.map((band) => band.supportId)).toEqual(['s-1'])
  })

  it('garde l’ordre du document', () => {
    const both = source({
      ...data,
      savingValuations: [
        ...data.savingValuations,
        makeSavingValuation({ id: 'v2', supportId: 's-2', amount: eur(50_000), date: '2026-01-01' }),
      ],
    })
    expect(stockBands(supports, both, '2026-01', '2026-02', ON).map((band) => band.label)).toEqual([
      'Livret A',
      'PEA',
    ])
  })
})

describe('stockRange', () => {
  it('compte le mois courant dans la fenêtre', () => {
    expect(stockRange(12, ON)).toEqual({ from: '2025-07', to: '2026-06' })
    expect(stockRange(1, ON)).toEqual({ from: '2026-06', to: '2026-06' })
  })
})

/* ============================================================================
 * D'où vient ce que le compte vaut.
 *
 * Trois nombres qui doivent s'additionner au quatrième, quoi qu'il arrive — un
 * relevé qui reprend la main, une reprise qui vide le compte, un placement qui
 * perd. C'est la seule propriété qui rende la lecture utilisable : un « rendement »
 * qui ne se referme pas sur le capital n'est qu'un chiffre de plus.
 * ==========================================================================*/

describe('la décomposition d’un compte', () => {
  const withRate = source({
    savingValuations: [
      makeSavingValuation({ id: 'v-1', supportId: 's-1', amount: eur(100_000), date: '2026-01-05' }),
    ],
    savingRates: [makeSavingRate({ id: 'r-1', supportId: 's-1', rateBp: 1_200, from: '2026-01-01' })],
    entries: [pays('2026-02-10', 10_000), pays('2026-03-10', 10_000)],
  })

  it('part de ce que le compte valait au premier mois lu, et pas d’ailleurs', () => {
    const split = growthOf(supportStockSeries('s-1', withRate, '2026-01', '2026-04', ON))
    expect(split[0]?.base).toBe(100_000)
    /* À son propre rang, rien n'a encore été versé ni produit : le départ *est*
       la valeur, sans quoi le premier point mentirait sur les deux autres. */
    expect(split[0]?.paid).toBe(0)
    expect(split[0]?.gain).toBe(0)
    expect(split.every((point) => point.base === 100_000)).toBe(true)
  })

  it('cumule les versements, et se referme au centime sur la valeur', () => {
    const split = growthOf(supportStockSeries('s-1', withRate, '2026-01', '2026-04', ON))
    expect(split.at(-1)?.paid).toBe(20_000)
    for (const point of split) {
      expect(point.base + point.paid + point.gain).toBe(point.value)
    }
  })

  /* Le point de la refonte : sans taux posé, un compte ne « produit » rien tant
     qu'aucun relevé ne dit le contraire — et dès qu'un relevé le dit, c'est lui
     qui fait le rendement, pas un barème. */
  it('lit le rendement sur les relevés, et non sur le taux', () => {
    const jumped = source({
      savingValuations: [
        makeSavingValuation({ id: 'v-1', supportId: 's-1', amount: eur(100_000), date: '2026-01-05' }),
        makeSavingValuation({ id: 'v-2', supportId: 's-1', amount: eur(140_000), date: '2026-03-20' }),
      ],
      entries: [pays('2026-02-10', 10_000)],
    })
    const split = growthOf(supportStockSeries('s-1', jumped, '2026-01', '2026-03', ON))
    /* 140 000 relevés, 100 000 au départ, 10 000 versés : le compte a produit
       30 000, qu'aucun taux du document n'aurait donnés — il n'y en a aucun. */
    expect(split.at(-1)?.gain).toBe(30_000)
    expect(split.at(-1)?.known).toBe(true)
  })

  it('dit la perte plutôt que de la taire', () => {
    const fell = source({
      savingValuations: [
        makeSavingValuation({ id: 'v-1', supportId: 's-1', amount: eur(200_000), date: '2026-01-05' }),
        makeSavingValuation({ id: 'v-2', supportId: 's-1', amount: eur(180_000), date: '2026-03-20' }),
      ],
    })
    const split = growthOf(supportStockSeries('s-1', fell, '2026-01', '2026-03', ON))
    expect(split.at(-1)?.gain).toBe(-20_000)
  })

  it('ne commence qu’au premier relevé — avant, il n’y a pas de départ', () => {
    const late = source({
      savingValuations: [
        makeSavingValuation({ id: 'v-1', supportId: 's-1', amount: eur(50_000), date: '2026-03-10' }),
      ],
      entries: [pays('2026-02-10', 10_000)],
    })
    const split = growthOf(supportStockSeries('s-1', late, '2026-01', '2026-04', ON))
    expect(split.map((point) => point.month)).toEqual(['2026-03', '2026-04'])
    expect(split[0]?.base).toBe(50_000)
  })
})

describe('la décomposition de l’ensemble', () => {
  const supports = [
    makeSavingSupport({ id: 's-1', label: 'Livret A', memberId: 'm-1' }),
    makeSavingSupport({ id: 's-2', label: 'PEA', memberId: 'm-1' }),
  ]

  /* Un compte ouvert plus tard ne doit pas faire bondir le total : c'est la
     marche qui rendrait toute la lecture fausse, et elle se voit tout de suite
     sur un graphique. */
  it('ne commence qu’au premier mois où tous les comptes sont chiffrés', () => {
    const data = source({
      savingValuations: [
        makeSavingValuation({ id: 'v-1', supportId: 's-1', amount: eur(100_000), date: '2026-01-05' }),
        makeSavingValuation({ id: 'v-2', supportId: 's-2', amount: eur(300_000), date: '2026-03-05' }),
      ],
    })
    const total = growthTotal(growthBands(supports, data, '2026-01', '2026-04', ON))
    expect(total.map((point) => point.month)).toEqual(['2026-03', '2026-04'])
    expect(total[0]?.base).toBe(400_000)
  })

  it('somme les versements de tous les comptes, et se referme comme un seul', () => {
    const data = source({
      savingValuations: [
        makeSavingValuation({ id: 'v-1', supportId: 's-1', amount: eur(100_000), date: '2026-01-05' }),
        makeSavingValuation({ id: 'v-2', supportId: 's-2', amount: eur(300_000), date: '2026-01-05' }),
      ],
      entries: [
        pays('2026-02-10', 10_000),
        makeEntry({
          date: '2026-02-10',
          amount: eur(5_000),
          direction: 'out',
          categoryId: 'passbook',
          savingSupportId: 's-2',
          status: 'confirmed',
        }),
      ],
    })
    const total = growthTotal(growthBands(supports, data, '2026-01', '2026-03', ON))
    expect(total.at(-1)?.paid).toBe(15_000)
    for (const point of total) {
      expect(point.base + point.paid + point.gain).toBe(point.value)
    }
  })

  it('ne rend rien quand aucun compte n’est chiffré', () => {
    expect(growthTotal([])).toEqual([])
    expect(growthTotal(growthBands(supports, source(), '2026-01', '2026-03', ON))).toEqual([])
  })
})
