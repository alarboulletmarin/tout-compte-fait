import { describe, expect, it } from 'vitest'
import { eur, makeEntry } from './fixtures'
import { sum } from './money'
import { adjustmentOf, adjustments, advancedEntries, settleMonth, settlementBalance } from './settle'
import { type IncomeWeight, memberShares, totalDue, totalToPay } from './split'
import type { CategoryKind, Entry } from './types'

const KINDS: Record<string, CategoryKind> = {
  logement: 'charge',
  courses: 'charge',
  auto: 'debt',
  livret: 'saving',
  salaire: 'resource',
}
const kindOf = (categoryId: string): CategoryKind => KINDS[categoryId] ?? 'charge'

/** Luca et Clara, 2 500 € et 2 000 € : 55,56 % et 44,44 %. */
const INCOMES: IncomeWeight[] = [
  { memberId: 'luca', income: eur(250_000) },
  { memberId: 'clara', income: eur(200_000) },
]

const settle = (entries: readonly Entry[], incomes = INCOMES) =>
  settleMonth(entries, '2026-07', kindOf, incomes)

describe('ce qu’un mois reporte sur le suivant', () => {
  it('rend à celui qui a avancé la part de l’autre', () => {
    // 300 € de charge commune réglés par Clara, qui n'en portait que 44,44 %.
    const july = [
      makeEntry({ date: '2026-07-15', amount: eur(30_000), categoryId: 'courses', memberId: 'clara', shared: true }),
    ]
    const [luca, clara] = settle(july) ?? []

    expect(clara).toEqual({
      memberId: 'clara',
      advanced: 30_000,
      owed: 13_333,
      adjustment: -16_667,
    })
    expect(luca).toEqual({ memberId: 'luca', advanced: 0, owed: 16_667, adjustment: 16_667 })
  })

  it('ne reporte rien quand chacun a avancé sa part', () => {
    // 900 € et 720 € : sur des poids 5 / 4, les deux lignes se répartissent
    // sans reste, et chacun a réglé au centime ce qui lui en revenait.
    const july = [
      makeEntry({ date: '2026-07-05', amount: eur(90_000), categoryId: 'courses', memberId: 'luca', shared: true }),
      makeEntry({ date: '2026-07-06', amount: eur(72_000), categoryId: 'courses', memberId: 'clara', shared: true }),
    ]
    const report = settle(july) ?? []
    expect(report.map((s) => s.adjustment)).toEqual([0, 0])
  })

  it('pèse le « owed » aux poids du mois, plafonds compris', () => {
    const reduced: IncomeWeight[] = [
      { memberId: 'luca', income: eur(298_500) },
      { memberId: 'clara', income: eur(210_000) },
    ]
    const july = [
      // Les paies réellement rentrées : celle de Clara réduite par un congé.
      makeEntry({ date: '2026-07-01', direction: 'in', amount: eur(298_500), categoryId: 'salaire', memberId: 'luca' }),
      makeEntry({ date: '2026-07-01', direction: 'in', amount: eur(126_000), categoryId: 'salaire', memberId: 'clara' }),
      // Le pot du mois, avancé en entier par Luca.
      makeEntry({ date: '2026-07-05', amount: eur(313_200), categoryId: 'logement', memberId: 'luca', shared: true }),
    ]
    const [luca, clara] = settle(july, reduced) ?? []
    // La part de Clara est plafonnée à ses 1 260 € de paie : le report lui
    // réclame cette part-là, pas les 1 293,45 € du prorata pur — sinon la
    // régularisation referait par-derrière le mois négatif que le plafond
    // vient d'empêcher.
    expect(clara?.owed).toBe(126_000)
    expect(clara?.adjustment).toBe(126_000)
    expect(luca?.adjustment).toBe(-126_000)
  })
})

describe('la somme des reports vaut zéro', () => {
  const zeroSum = (entries: readonly Entry[], incomes = INCOMES): void => {
    const report = settleMonth(entries, '2026-07', kindOf, incomes)
    expect(report).not.toBeNull()
    expect(settlementBalance(report ?? [])).toBe(0)
  }

  it('sur deux membres', () => {
    zeroSum([
      makeEntry({ date: '2026-07-15', amount: eur(30_000), categoryId: 'courses', memberId: 'clara', shared: true }),
    ])
  })

  it('sur trois membres', () => {
    const three: IncomeWeight[] = [...INCOMES, { memberId: 'sacha', income: eur(180_000) }]
    zeroSum(
      [
        makeEntry({ date: '2026-07-15', amount: eur(30_000), categoryId: 'courses', memberId: 'clara', shared: true }),
        makeEntry({ date: '2026-07-18', amount: eur(7_777), categoryId: 'logement', memberId: 'sacha', shared: true }),
      ],
      three,
    )
  })

  it('même quand l’arrondi aux plus forts restes joue', () => {
    // 100,01 € entre 53 et 47 ne tombe juste sur personne : le centime
    // restant va au plus fort reste, et il doit rester dans la balance.
    const odd: IncomeWeight[] = [
      { memberId: 'luca', income: eur(53) },
      { memberId: 'clara', income: eur(47) },
    ]
    zeroSum(
      [
        makeEntry({ date: '2026-07-15', amount: eur(10_001), categoryId: 'courses', memberId: 'clara', shared: true }),
        makeEntry({ date: '2026-07-16', amount: eur(3), categoryId: 'courses', memberId: 'luca', shared: true }),
      ],
      odd,
    )
  })

  it('quand une seule personne a tout avancé', () => {
    zeroSum([
      makeEntry({ date: '2026-07-01', amount: eur(95_000), categoryId: 'logement', memberId: 'luca', shared: true }),
      makeEntry({ date: '2026-07-10', amount: eur(30_000), categoryId: 'auto', memberId: 'luca', shared: true }),
    ])
  })
})

describe('ce qui n’avance rien à personne', () => {
  it('écarte une charge commune que personne ne s’est attribuée', () => {
    // Payée par le pot : elle se répartit, mais elle n'avance rien.
    const july = [makeEntry({ date: '2026-07-05', amount: eur(95_000), categoryId: 'logement' })]
    expect((settle(july) ?? []).map((s) => s.adjustment)).toEqual([0, 0])
  })

  it('écarte une échéance encore prévue', () => {
    // Personne ne l'a payée : dire qu'elle a été avancée inventerait un fait.
    const july = [
      makeEntry({
        date: '2026-07-15',
        amount: eur(30_000),
        categoryId: 'courses',
        memberId: 'clara',
        shared: true,
        status: 'planned',
      }),
    ]
    expect((settle(july) ?? []).map((s) => s.adjustment)).toEqual([0, 0])
  })

  it('écarte une charge personnelle, qui n’est pas commune', () => {
    const july = [
      makeEntry({ date: '2026-07-15', amount: eur(30_000), categoryId: 'courses', memberId: 'clara' }),
    ]
    expect((settle(july) ?? []).map((s) => s.adjustment)).toEqual([0, 0])
  })

  it('écarte un versement d’épargne, qui ne se partage jamais', () => {
    // La saisie n'offre même pas la case sur une catégorie d'épargne : elle
    // sort du compte, mais elle reste à qui la met de côté.
    const july = [
      makeEntry({ date: '2026-07-12', amount: eur(20_000), categoryId: 'livret', memberId: 'clara' }),
    ]
    expect((settle(july) ?? []).map((s) => s.adjustment)).toEqual([0, 0])
  })

  it('écarte ce qu’a avancé quelqu’un qui n’est plus du foyer', () => {
    // Le compter d'un seul côté déséquilibrerait le report des autres.
    const july = [
      makeEntry({ date: '2026-07-15', amount: eur(30_000), categoryId: 'courses', memberId: 'parti', shared: true }),
    ]
    const report = settle(july) ?? []
    expect(report.map((s) => s.adjustment)).toEqual([0, 0])
    expect(settlementBalance(report)).toBe(0)
  })

  it('ne regarde que le mois demandé', () => {
    const june = [
      makeEntry({ date: '2026-06-15', amount: eur(30_000), categoryId: 'courses', memberId: 'clara', shared: true }),
    ]
    expect((settle(june) ?? []).map((s) => s.adjustment)).toEqual([0, 0])
  })
})

describe('quand le report ne se calcule pas', () => {
  const july = [
    makeEntry({ date: '2026-07-15', amount: eur(30_000), categoryId: 'courses', memberId: 'clara', shared: true }),
  ]

  it('rend null sans aucun membre', () => {
    expect(settle(july, [])).toBeNull()
  })

  it('calcule et rend zéro pour le membre seul : il porte 100 % de ce qu’il avance', () => {
    // La charge de Clara est hors foyer ici — écartée des deux côtés à la
    // fois, comme celle de « parti » plus haut.
    const solo = settle(july, [{ memberId: 'luca', income: eur(250_000) }]) ?? []
    expect(solo).toEqual([{ memberId: 'luca', advanced: 0, owed: 0, adjustment: 0 }])

    // Sa propre avance sur le commun lui revient en entier : rien à rattraper.
    const avance = [
      makeEntry({ date: '2026-07-15', amount: eur(30_000), categoryId: 'courses', memberId: 'luca', shared: true }),
    ]
    const report = settle(avance, [{ memberId: 'luca', income: eur(250_000) }]) ?? []
    expect(report).toEqual([{ memberId: 'luca', advanced: 30_000, owed: 30_000, adjustment: 0 }])
    expect(settlementBalance(report)).toBe(0)
  })

  it('rend null quand un revenu n’est pas connu', () => {
    // Un écart au dénominateur incomplet ne vaut pas zéro, il ne veut rien
    // dire : l'écran doit nommer ce qui manque plutôt qu'afficher un chiffre.
    expect(settle(july, [INCOMES[0]!, { memberId: 'clara', income: null }])).toBeNull()
  })

  it('rend null quand tous les revenus sont nuls', () => {
    expect(
      settle(july, [
        { memberId: 'luca', income: eur(0) },
        { memberId: 'clara', income: eur(0) },
      ]),
    ).toBeNull()
  })

  it('rend un report à zéro sur un mois sans rien — pas null', () => {
    // Le prorata se calcule, il n'y a simplement rien à rattraper. C'est un
    // fait, et non une impasse : les deux ne se disent pas pareil à l'écran.
    expect((settle([]) ?? []).map((s) => s.adjustment)).toEqual([0, 0])
  })
})

describe('le détail du report', () => {
  const july = [
    makeEntry({ date: '2026-07-15', amount: eur(4_000), categoryId: 'courses', memberId: 'clara', shared: true }),
    makeEntry({ date: '2026-07-05', amount: eur(95_000), categoryId: 'logement', memberId: 'luca', shared: true }),
    makeEntry({ date: '2026-07-08', amount: eur(12_000), categoryId: 'courses' }),
  ]

  it('liste les charges avancées, de la plus lourde à la plus légère', () => {
    expect(advancedEntries(july, '2026-07', kindOf).map((e) => e.amount)).toEqual([95_000, 4_000])
  })

  it('ne liste que ce qui produit le report', () => {
    const listed = advancedEntries(july, '2026-07', kindOf)
    const report = settle(july) ?? []
    expect(sum(listed.map((e) => e.amount))).toBe(sum(report.map((s) => s.advanced)))
  })
})

describe('le report appliqué aux parts du mois suivant', () => {
  const july = [
    makeEntry({ date: '2026-07-15', amount: eur(30_000), categoryId: 'courses', memberId: 'clara', shared: true }),
  ]
  /** 900 € de charges communes en août, réparties charge par charge. */
  const august = [eur(60_000), eur(30_000)]

  it('fait verser plus à l’un et moins à l’autre, sans changer le total', () => {
    const report = settle(july)
    const shares = memberShares(INCOMES, august, adjustments(report)) ?? []
    const [luca, clara] = shares

    expect(luca?.toPay).toBe((luca?.due ?? 0) + 16_667)
    expect(clara?.toPay).toBe((clara?.due ?? 0) - 16_667)
    // La régularisation ne crée ni ne détruit d'argent : le total à verser
    // vaut encore, au centime, les charges communes du mois.
    expect(totalToPay(shares)).toBe(90_000)
    expect(totalToPay(shares)).toBe(totalDue(shares))
  })

  it('laisse les parts intactes sans report — le coût n’a pas bougé', () => {
    const withReport = memberShares(INCOMES, august, adjustments(settle(july))) ?? []
    const without = memberShares(INCOMES, august) ?? []
    expect(withReport.map((s) => s.due)).toEqual(without.map((s) => s.due))
    expect(without.map((s) => s.adjustment)).toEqual([0, 0])
    expect(without.map((s) => s.toPay)).toEqual(without.map((s) => s.due))
  })

  it('ne reporte rien quand le mois précédent ne se répartissait pas', () => {
    // Premier mois de l'app, ou revenu manquant : `settleMonth` rend `null`,
    // et chacun verse sa part sans plus.
    const shares = memberShares(INCOMES, august, adjustments(null)) ?? []
    expect(shares.map((s) => s.toPay)).toEqual(shares.map((s) => s.due))
  })
})

describe('lecture d’un report', () => {
  const report = settle([
    makeEntry({ date: '2026-07-15', amount: eur(30_000), categoryId: 'courses', memberId: 'clara', shared: true }),
  ])

  it('rend l’ajustement d’un membre', () => {
    expect(adjustmentOf(report, 'clara')).toBe(-16_667)
  })

  it('rend zéro pour qui n’y figure pas, et sans report du tout', () => {
    expect(adjustmentOf(report, 'inconnu')).toBe(0)
    expect(adjustmentOf(null, 'clara')).toBe(0)
  })

  it('rend null en table quand il n’y a pas de report', () => {
    expect(adjustments(null)).toBeNull()
  })
})
