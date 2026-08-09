import { describe, expect, it } from 'vitest'
import { addMonthsToYm } from './date'
import {
  eur,
  makeAdvance,
  makeEntry,
  makeRecurrence,
  makeSavingSupport,
  makeSavingValuation,
  sequentialIds,
} from './fixtures'
import { coveredMonths, isMonthOpened, monthHorizon, navigationBounds, planMonth } from './month'

const loyer = makeRecurrence({
  id: 'loyer',
  label: 'Loyer',
  amount: eur(95000),
  period: { unit: 'month', every: 1, anchorDay: 5 },
})

const electricite = makeRecurrence({
  id: 'elec',
  label: 'Électricité',
  amount: null, // montant variable
  period: { unit: 'month', every: 1, anchorDay: 12 },
})

describe('ouverture du mois', () => {
  it('génère une échéance planned par occurrence de récurrence', () => {
    const plan = planMonth({ recurrences: [loyer], entries: [] }, '2026-07', sequentialIds())
    expect(plan.created).toHaveLength(1)
    expect(plan.created[0]).toMatchObject({
      recurrenceId: 'loyer',
      label: 'Loyer',
      date: '2026-07-05',
      status: 'planned',
      amount: 95000,
    })
  })

  it('liste à part les récurrences à montant variable', () => {
    const plan = planMonth(
      { recurrences: [loyer, electricite], entries: [] },
      '2026-07',
      sequentialIds(),
    )
    expect(plan.created).toHaveLength(2)
    expect(plan.variable.map((e) => e.recurrenceId)).toEqual(['elec'])
  })

  it('propose le montant du mois précédent pour une échéance variable', () => {
    const entries = [
      makeEntry({ recurrenceId: 'elec', date: '2026-06-12', amount: eur(8450) }),
    ]
    const plan = planMonth({ recurrences: [electricite], entries }, '2026-07', sequentialIds())
    expect(plan.created[0]?.amount).toBe(8450)
  })

  it('retombe à zéro plutôt que d’inventer, faute d’historique', () => {
    const plan = planMonth({ recurrences: [electricite], entries: [] }, '2026-07', sequentialIds())
    expect(plan.created[0]?.amount).toBe(0)
  })

  it('est idempotente : rejouer une ouverture ne duplique rien', () => {
    const first = planMonth({ recurrences: [loyer], entries: [] }, '2026-07', sequentialIds())
    const second = planMonth(
      { recurrences: [loyer], entries: first.created },
      '2026-07',
      sequentialIds(),
    )
    expect(second.created).toEqual([])
  })

  it('ne régénère pas une échéance déjà confirmée', () => {
    const entries = [
      makeEntry({ recurrenceId: 'loyer', date: '2026-07-05', status: 'confirmed' }),
    ]
    const plan = planMonth({ recurrences: [loyer], entries }, '2026-07', sequentialIds())
    expect(plan.created).toEqual([])
  })

  it('génère quand même l’échéance si la précédente était à une autre date', () => {
    const entries = [makeEntry({ recurrenceId: 'loyer', date: '2026-06-05' })]
    const plan = planMonth({ recurrences: [loyer], entries }, '2026-07', sequentialIds())
    expect(plan.created).toHaveLength(1)
  })

  it('ne génère rien pour un mois sans aucune échéance', () => {
    const annuelle = makeRecurrence({
      id: 'assurance',
      period: { unit: 'year', every: 1, anchorDay: 15 },
      startedOn: '2026-03-15',
    })
    const plan = planMonth({ recurrences: [annuelle], entries: [] }, '2026-07', sequentialIds())
    expect(plan.created).toEqual([])
    expect(plan.variable).toEqual([])
  })

  it('ne génère rien du tout sans récurrence', () => {
    const plan = planMonth({ recurrences: [], entries: [] }, '2026-07', sequentialIds())
    expect(plan).toEqual({ ym: '2026-07', created: [], variable: [] })
  })

  it('rend les échéances triées par date', () => {
    const plan = planMonth(
      { recurrences: [electricite, loyer], entries: [] },
      '2026-07',
      sequentialIds(),
    )
    expect(plan.created.map((e) => e.date)).toEqual(['2026-07-05', '2026-07-12'])
  })

  it('borne l’échéance au dernier jour d’un mois court', () => {
    const r = makeRecurrence({ id: 'r31', period: { unit: 'month', every: 1, anchorDay: 31 } })
    const plan = planMonth({ recurrences: [r], entries: [] }, '2026-02', sequentialIds())
    expect(plan.created[0]?.date).toBe('2026-02-28')
  })

  it('ignore une récurrence arrêtée avant le mois', () => {
    const stopped = makeRecurrence({
      id: 'stop',
      period: { unit: 'month', every: 1, anchorDay: 5 },
      endedOn: '2026-05-31',
    })
    const plan = planMonth({ recurrences: [stopped], entries: [] }, '2026-07', sequentialIds())
    expect(plan.created).toEqual([])
  })

  it('reporte le membre de la récurrence sur l’échéance', () => {
    const r = makeRecurrence({
      id: 'r',
      memberId: 'm1',
      period: { unit: 'month', every: 1, anchorDay: 5 },
    })
    const plan = planMonth({ recurrences: [r], entries: [] }, '2026-07', sequentialIds())
    expect(plan.created[0]?.memberId).toBe('m1')
  })

  it('n’invente pas de membre quand la récurrence n’en porte pas', () => {
    const plan = planMonth({ recurrences: [loyer], entries: [] }, '2026-07', sequentialIds())
    expect(plan.created[0]).not.toHaveProperty('memberId')
  })

  it('reporte la règle de partage de la récurrence sur l’échéance', () => {
    const r = makeRecurrence({
      id: 'r',
      shared: false,
      period: { unit: 'month', every: 1, anchorDay: 5 },
    })
    const plan = planMonth({ recurrences: [r], entries: [] }, '2026-07', sequentialIds())
    expect(plan.created[0]?.shared).toBe(false)
  })

  it('laisse la règle trancher quand la récurrence ne dit rien', () => {
    const plan = planMonth({ recurrences: [loyer], entries: [] }, '2026-07', sequentialIds())
    expect(plan.created[0]).not.toHaveProperty('shared')
  })
})

describe('état des mois', () => {
  it('sait si un mois a déjà été ouvert', () => {
    const months = [{ ym: '2026-07', openedAt: '2026-07-01', closed: false }]
    expect(isMonthOpened(months, '2026-07')).toBe(true)
    expect(isMonthOpened(months, '2026-08')).toBe(false)
    expect(isMonthOpened([], '2026-07')).toBe(false)
  })

  it('énumère les mois couverts, triés, sans doublon', () => {
    const data = {
      entries: [makeEntry({ date: '2026-03-04' }), makeEntry({ date: '2026-01-15' })],
      months: [{ ym: '2026-03', openedAt: '2026-03-01', closed: false }],
    }
    expect(coveredMonths(data)).toEqual(['2026-01', '2026-03'])
  })

  it('ne couvre aucun mois sur un document vide', () => {
    expect(coveredMonths({ entries: [], months: [] })).toEqual([])
  })
})

/* --- Jusqu'où l'on navigue ------------------------------------------------*/

describe('les bornes de la navigation', () => {
  const on = '2026-07-15'
  const months = (...ym: string[]) =>
    ym.map((m) => ({ ym: m, openedAt: `${m}-01`, closed: false }))

  it('offre un mois d’avance sur un document neuf', () => {
    const bounds = navigationBounds({ entries: [], months: [] }, on)
    expect(bounds).toEqual({ min: '2026-07', max: '2026-08' })
  })

  it('ne remonte pas avant la première donnée', () => {
    const data = { entries: [makeEntry({ date: '2025-11-03' })], months: [] }
    expect(navigationBounds(data, on).min).toBe('2025-11')
  })

  it('fait toujours entrer le mois courant entre ses bornes', () => {
    const data = { entries: [makeEntry({ date: '2030-01-03' })], months: [] }
    const bounds = navigationBounds(data, on)
    expect(bounds.min <= '2026-07').toBe(true)
    expect(bounds.max >= '2026-07').toBe(true)
  })

  /* Le geste que la borne coupe : chaque « mois suivant » ouvrait le mois, ce
     qui repoussait la borne d'un cran, ce qui laissait aller plus loin. */
  it('cesse d’avancer une fois les douze mois ouverts', () => {
    /* Le mois d'avance, ouvert, en offrait un autre : douze clics valaient
       douze mois d'échéances écrites, et le treizième était toujours là. */
    const opened = months(
      ...Array.from({ length: 12 }, (_, i) => addMonthsToYm('2026-08', i)),
    )
    expect(navigationBounds({ entries: [], months: opened }, on).max).toBe('2027-07')
  })

  it('s’arrête à douze mois même si le mois d’après est déjà ouvert', () => {
    const data = { entries: [], months: months('2027-07') }
    expect(navigationBounds(data, on).max).toBe('2027-07')
  })

  it('laisse consulter des données plus lointaines que l’horizon', () => {
    const data = { entries: [makeEntry({ date: '2030-01-03' })], months: [] }
    // Jusqu'à elles, mais pas un mois de plus : au-delà, on n'invite plus.
    expect(navigationBounds(data, on).max).toBe('2030-01')
  })

  it('nomme le mois le plus lointain qu’on ouvre', () => {
    expect(monthHorizon(on)).toBe('2027-07')
  })
})

/* --- Le plafond d'un support ----------------------------------------------
   Une règle qui verse sur un livret plafonné ne peut pas continuer d'y poser
   des échéances au-delà de ce que le contrat autorise : le prévisionnel
   annoncerait un capital que la banque aurait refusé de recevoir. La dernière
   qui tient est écrêtée, les suivantes ne se posent plus. */

const SUPPORT = 's-livret'
const ON = '2026-06-15'

const versement = makeRecurrence({
  id: 'versement',
  label: 'Versement Livret A',
  amount: eur(20000),
  savingSupportId: SUPPORT,
  direction: 'out',
  period: { unit: 'month', every: 1, anchorDay: 5 },
})

/** Un livret dont il reste `room` centimes de place au 1er juin. */
const capped = (room: number, over: Partial<Parameters<typeof planMonth>[0]> = {}) => ({
  recurrences: [versement],
  entries: [],
  savingSupports: [makeSavingSupport({ id: SUPPORT, depositCap: eur(2295000) })],
  savingValuations: [
    makeSavingValuation({
      id: 'v1',
      supportId: SUPPORT,
      amount: eur(2295000 - room),
      date: '2026-05-31',
    }),
  ],
  ...over,
})

describe('le plafond d’un support', () => {
  it('laisse passer un versement qui tient sous le plafond', () => {
    const plan = planMonth(capped(50000), '2026-07', sequentialIds(), ON)
    expect(plan.created).toHaveLength(1)
    expect(plan.created[0]?.amount).toBe(eur(20000))
  })

  it('écrête la dernière échéance qui tient plutôt que de la refuser en entier', () => {
    const plan = planMonth(capped(12000), '2026-07', sequentialIds(), ON)
    expect(plan.created[0]?.amount).toBe(eur(12000))
  })

  it('ne pose plus rien une fois la place épuisée', () => {
    const plan = planMonth(capped(0), '2026-07', sequentialIds(), ON)
    expect(plan.created).toEqual([])
  })

  it('épuise la place de mois en mois plutôt que de la relire à neuf', () => {
    // 50 000 de place, 20 000 par mois : juillet et août pleins, septembre
    // écrêté à 10 000, octobre vide.
    let entries: ReturnType<typeof planMonth>['created'] = []
    const amounts: (number | undefined)[] = []
    for (const month of ['2026-07', '2026-08', '2026-09', '2026-10']) {
      const plan = planMonth(capped(50000, { entries }), month, sequentialIds(month), ON)
      entries = [...entries, ...plan.created]
      amounts.push(plan.created[0]?.amount)
    }
    expect(amounts).toEqual([eur(20000), eur(20000), eur(10000), undefined])
  })

  it('partage la place entre deux règles, dans l’ordre du calendrier', () => {
    const tardif = makeRecurrence({
      ...versement,
      id: 'tardif',
      period: { unit: 'month', every: 1, anchorDay: 20 },
    })
    const plan = planMonth(
      capped(25000, { recurrences: [tardif, versement] }),
      '2026-07',
      sequentialIds(),
      ON,
    )
    expect(plan.created.map((e) => [e.date, e.amount])).toEqual([
      ['2026-07-05', eur(20000)],
      ['2026-07-20', eur(5000)],
    ])
  })

  it('ne touche ni le jour même ni le passé : ce n’est plus une prévision à corriger', () => {
    const plan = planMonth(capped(0), '2026-06', sequentialIds(), ON)
    expect(plan.created.map((e) => e.date)).toEqual(['2026-06-05'])
    expect(plan.created[0]?.amount).toBe(eur(20000))
  })

  it('ne borne pas une reprise : elle rend de la place', () => {
    const reprise = makeRecurrence({ ...versement, id: 'reprise', direction: 'in' })
    const plan = planMonth(
      capped(0, { recurrences: [reprise] }),
      '2026-07',
      sequentialIds(),
      ON,
    )
    expect(plan.created[0]?.amount).toBe(eur(20000))
  })

  it('ne borne pas la reconstitution d’une avance : elle rend ce que le support a avancé', () => {
    const plan = planMonth(
      capped(0, {
        advances: [makeAdvance({ id: 'a1', recurrenceId: 'versement', savingSupportId: SUPPORT })],
      }),
      '2026-07',
      sequentialIds(),
      ON,
    )
    expect(plan.created[0]?.amount).toBe(eur(20000))
  })

  it('ignore un support sans plafond, et un document qui n’en porte aucun', () => {
    const sansPlafond = capped(0)
    sansPlafond.savingSupports = [makeSavingSupport({ id: SUPPORT })]
    expect(planMonth(sansPlafond, '2026-07', sequentialIds(), ON).created).toHaveLength(1)
    expect(
      planMonth({ recurrences: [versement], entries: [] }, '2026-07', sequentialIds(), ON).created,
    ).toHaveLength(1)
  })
})
