import { describe, expect, it } from 'vitest'
import {
  eur,
  makeEntry,
  makeRecurrence,
  makeSavingSupport,
  makeSavingValuation,
} from './fixtures'
import { projectSeries } from './projection'
import {
  mergeSeries,
  projectSupports,
  supportBases,
  supportBasis,
  supportContribution,
} from './savingProjection'

const ON = '2026-08-09'
const monthly = { unit: 'month' as const, every: 1, anchorDay: 1 }

describe('ce que les récurrences posent chaque mois', () => {
  it('compte les versements et retranche les reprises', () => {
    const rules = [
      makeRecurrence({ id: 'r1', savingSupportId: 's1', amount: eur(30000), period: monthly }),
      makeRecurrence({
        id: 'r2',
        savingSupportId: 's1',
        direction: 'in',
        amount: eur(10000),
        period: monthly,
      }),
    ]
    // 300 € versés, 100 € repris : le livret reçoit 200 € par mois, pas 400.
    expect(supportContribution(rules, 's1', ON).monthly).toBe(eur(20000))
  })

  it('ramène au mois par la fonction de la fiche, jamais par une seconde règle', () => {
    const rules = [
      makeRecurrence({
        id: 'r1',
        savingSupportId: 's1',
        amount: eur(30000),
        period: { unit: 'month', every: 3, anchorDay: 1 },
      }),
      makeRecurrence({
        id: 'r2',
        savingSupportId: 's1',
        amount: eur(120000),
        period: { unit: 'year', every: 1, anchorDay: 1 },
      }),
    ]
    // 300 € par trimestre = 100 €/mois ; 1 200 € par an = 100 €/mois.
    expect(supportContribution(rules, 's1', ON).monthly).toBe(eur(20000))
  })

  it('ignore les règles d’un autre support', () => {
    const rules = [
      makeRecurrence({ id: 'r1', savingSupportId: 's2', amount: eur(50000), period: monthly }),
    ]
    expect(supportContribution(rules, 's1', ON)).toEqual({ monthly: eur(0), feeders: 0, variable: 0 })
  })

  it('laisse dehors une règle déjà arrêtée', () => {
    const rules = [
      makeRecurrence({
        id: 'r1',
        savingSupportId: 's1',
        amount: eur(20000),
        period: monthly,
        endedOn: '2026-06-30',
      }),
    ]
    // Elle ne pose plus d'échéance : la projeter promettrait un versement que
    // personne ne fera.
    expect(supportContribution(rules, 's1', ON).monthly).toBe(eur(0))
    expect(supportContribution(rules, 's1', ON).feeders).toBe(0)
  })

  it('ne devine pas un montant variable, et le compte à part', () => {
    const rules = [
      makeRecurrence({ id: 'r1', savingSupportId: 's1', amount: null, period: monthly }),
      makeRecurrence({ id: 'r2', savingSupportId: 's1', amount: eur(15000), period: monthly }),
    ]
    const contribution = supportContribution(rules, 's1', ON)
    // Le montant variable ne vaut pas zéro : il ne vaut rien du tout, et
    // l'écran a de quoi le dire.
    expect(contribution.monthly).toBe(eur(15000))
    expect(contribution).toMatchObject({ feeders: 2, variable: 1 })
  })
})

describe('le point de départ d’un support', () => {
  const support = makeSavingSupport({ id: 's1' })

  it('est la valeur estimée : le relevé, plus ce qui est tombé depuis', () => {
    const valuations = [
      makeSavingValuation({ id: 'v1', supportId: 's1', amount: eur(1000000), date: '2026-06-30' }),
    ]
    const entries = [
      makeEntry({ date: '2026-07-01', amount: eur(20000), savingSupportId: 's1' }),
      makeEntry({ date: '2026-08-01', amount: eur(20000), savingSupportId: 's1' }),
    ]
    const basis = supportBasis(support, valuations, entries, [], ON)
    // 10 000 € relevés fin juin, deux versements de 200 € confirmés depuis.
    expect(basis.initial).toBe(eur(1040000))
    expect(basis.knownOn).toBe('2026-06-30')
  })

  it('n’en a pas sans relevé — et surtout pas zéro', () => {
    const entries = [makeEntry({ date: '2026-07-01', amount: eur(20000), savingSupportId: 's1' })]
    expect(supportBasis(support, [], entries, [], ON).initial).toBeNull()
  })
})

describe('la projection des supports', () => {
  const assume = (rateBp: number) => () => ({ rateBp, kind: 'assumed' as const })

  it('rejoue le vecteur de référence du cahier par ce chemin-ci', () => {
    const support = makeSavingSupport({ id: 's1' })
    const valuations = [
      makeSavingValuation({ id: 'v1', supportId: 's1', amount: eur(0), date: '2026-01-01' }),
    ]
    const rules = [
      makeRecurrence({ id: 'r1', savingSupportId: 's1', amount: eur(25000), period: monthly }),
    ]
    const bases = supportBases([support], valuations, [], rules, ON)
    const { plans, total } = projectSupports(bases, assume(1100), 240)

    // 250 €/mois, 11 %, 20 ans → 202 136,25 €. C'est la preuve qu'il n'y a
    // qu'un moteur : le même chiffre que `domain/projection.test.ts`.
    expect(plans[0]?.series.balance.at(-1)).toBeCloseTo(20_213_625, -1)
    expect(total?.balance.at(-1)).toBeCloseTo(20_213_625, -1)
  })

  it('somme rang par rang, et non à un taux moyen', () => {
    const supports = [makeSavingSupport({ id: 's1' }), makeSavingSupport({ id: 's2' })]
    const valuations = [
      makeSavingValuation({ id: 'v1', supportId: 's1', amount: eur(1000000), date: '2026-01-01' }),
      makeSavingValuation({ id: 'v2', supportId: 's2', amount: eur(1000000), date: '2026-01-01' }),
    ]
    const rates: Record<string, number> = { s1: 200, s2: 700 }
    const bases = supportBases(supports, valuations, [], [], ON)
    const { plans, total } = projectSupports(
      bases,
      (id) => ({ rateBp: rates[id] ?? 0, kind: 'assumed' }),
      240,
    )

    const arrival = (plans[0]?.series.balance.at(-1) ?? 0) + (plans[1]?.series.balance.at(-1) ?? 0)
    expect(total?.balance.at(-1)).toBe(arrival)

    // Un livret à 2 % et un placement à 7 % ne font pas un patrimoine à 4,5 % :
    // la moyenne se trompe, et toujours dans le même sens.
    const averaged = projectSeries({
      initial: eur(2000000),
      monthly: eur(0),
      months: 240,
      rateBp: 450,
    })
    expect(total?.balance.at(-1)).not.toBeCloseTo(averaged.balance.at(-1) ?? 0, -3)
  })

  it('met à part les supports sans relevé, sans les compter pour zéro', () => {
    const supports = [
      makeSavingSupport({ id: 's1', label: 'Livret A' }),
      makeSavingSupport({ id: 's2', label: 'PEA' }),
    ]
    const valuations = [
      makeSavingValuation({ id: 'v1', supportId: 's1', amount: eur(500000), date: '2026-01-01' }),
    ]
    const bases = supportBases(supports, valuations, [], [], ON)
    const { plans, unvalued, total } = projectSupports(bases, assume(300), 120)

    expect(plans).toHaveLength(1)
    expect(unvalued.map((support) => support.label)).toEqual(['PEA'])
    // Le total ne porte que ce qui est relevé : il vaut la trajectoire du seul
    // livret, et non une somme où le PEA pèserait zéro.
    expect(total?.balance).toEqual(plans[0]?.series.balance)
  })

  it('rend `null` plutôt qu’une courbe à zéro quand rien n’est projetable', () => {
    const bases = supportBases([makeSavingSupport({ id: 's1' })], [], [], [], ON)
    const { plans, total } = projectSupports(bases, assume(300), 120)
    expect(plans).toHaveLength(0)
    // Personne n'a « 0 € dans dix ans » parce qu'il n'a rien relevé.
    expect(total).toBeNull()
    expect(mergeSeries([])).toBeNull()
  })

  it('laisse remplacer le versement réel par celui qu’on veut essayer', () => {
    const support = makeSavingSupport({ id: 's1' })
    const valuations = [
      makeSavingValuation({ id: 'v1', supportId: 's1', amount: eur(0), date: '2026-01-01' }),
    ]
    const rules = [
      makeRecurrence({ id: 'r1', savingSupportId: 's1', amount: eur(20000), period: monthly }),
    ]
    const bases = supportBases([support], valuations, [], rules, ON)

    const real = projectSupports(bases, assume(0), 12)
    const tried = projectSupports(bases, () => ({ rateBp: 0, kind: 'assumed', monthly: eur(30000) }), 12)

    expect(real.plans[0]).toMatchObject({ monthly: eur(20000), simulated: false })
    expect(tried.plans[0]).toMatchObject({ monthly: eur(30000), simulated: true })
    // Sans taux, la courbe est la somme des versements : douze fois l'un, douze
    // fois l'autre.
    expect(real.total?.balance.at(-1)).toBe(eur(240000))
    expect(tried.total?.balance.at(-1)).toBe(eur(360000))
  })
})
