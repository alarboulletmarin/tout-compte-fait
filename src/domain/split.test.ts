import { describe, expect, it } from 'vitest'
import { ymOf } from './date'
import { eur, makeEntry, makeMember, makeRecurrence } from './fixtures'
import { money, sum } from './money'
import { amountOn } from './priceHistory'
import {
  type MemberBalance,
  advancedEntries,
  allocate,
  cappedIncomes,
  cappedWeights,
  isSharedEntry,
  largestRemainder,
  memberCaps,
  memberCharges,
  memberIncomes,
  memberRequired,
  memberShares,
  monthBalances,
  monthlyIncome,
  scopeToMember,
  scopeToMembers,
  sharedEntries,
  sharedTotal,
  totalDue,
  totalToPay,
  unassignedIncomes,
} from './split'
import { type CategoryKind, type Entry, type EntryStatus, type Recurrence, isSpending } from './types'

/* --- Répartition d'un entier ----------------------------------------------*/

describe('plus forts restes', () => {
  it('répartit au prorata des poids', () => {
    expect(largestRemainder(10_000, [2500, 2000])).toEqual([5556, 4444])
  })

  it('ne perd ni n’invente une unité', () => {
    const parts = largestRemainder(10, [1, 1, 1])
    expect(parts).toEqual([4, 3, 3])
    expect(parts.reduce((a, b) => a + b, 0)).toBe(10)
  })

  it('donne l’unité restante au plus fort reste', () => {
    // 100 entre 3 et 1 : 75 et 25 pile, aucun reste à distribuer.
    expect(largestRemainder(100, [3, 1])).toEqual([75, 25])
    // 100 entre 1 et 2 : 33,33 et 66,67 — le reste va au second.
    expect(largestRemainder(100, [1, 2])).toEqual([33, 67])
  })

  it('départage deux restes égaux par le poids le plus à gauche', () => {
    expect(largestRemainder(1, [1, 1])).toEqual([1, 0])
  })

  it('rend des parts nulles quand tous les poids sont nuls', () => {
    expect(largestRemainder(500, [0, 0])).toEqual([0, 0])
  })

  it('refuse un total fractionnaire', () => {
    expect(() => largestRemainder(10.5, [1, 1])).toThrow(TypeError)
  })

  it('reste exact sur un montant négatif', () => {
    const parts = largestRemainder(-10, [1, 1, 1])
    expect(parts.reduce((a, b) => a + b, 0)).toBe(-10)
  })
})

describe('allocate', () => {
  it('répartit un montant sans qu’un centime se perde', () => {
    const parts = allocate(eur(200_000), [250_000, 200_000])
    expect(parts).toEqual([money(111_111), money(88_889)])
    expect(parts.reduce((a, b) => a + b, 0)).toBe(200_000)
  })

  it('répartit zéro en parts nulles', () => {
    expect(allocate(eur(0), [1, 2])).toEqual([money(0), money(0)])
  })
})

/* --- Ce qui se partage ----------------------------------------------------*/

const shared = (over: Parameters<typeof makeEntry>[0], kind: CategoryKind): boolean =>
  isSharedEntry(makeEntry(over), kind)

describe('ce qui entre dans les charges communes', () => {
  it('prend une charge que personne ne s’est attribuée', () => {
    expect(shared({ date: '2026-07-05' }, 'charge')).toBe(true)
  })

  it('prend aussi une mensualité de crédit', () => {
    expect(shared({ date: '2026-07-05' }, 'debt')).toBe(true)
  })

  it('laisse l’épargne à qui la met de côté', () => {
    expect(shared({ date: '2026-07-05' }, 'saving')).toBe(false)
  })

  it('ne partage pas une ressource', () => {
    expect(shared({ date: '2026-07-05', direction: 'in' }, 'resource')).toBe(false)
  })

  it('sort du partage une charge attribuée à un membre', () => {
    expect(shared({ date: '2026-07-05', memberId: 'm-1' }, 'charge')).toBe(false)
  })

  it('la case cochée l’emporte sur la règle', () => {
    expect(shared({ date: '2026-07-05', memberId: 'm-1', shared: true }, 'charge')).toBe(true)
    expect(shared({ date: '2026-07-05', shared: true }, 'saving')).toBe(true)
  })

  it('la case décochée l’emporte aussi', () => {
    expect(shared({ date: '2026-07-05', shared: false }, 'charge')).toBe(false)
  })
})

const KINDS: Record<string, CategoryKind> = {
  logement: 'charge',
  courses: 'charge',
  auto: 'debt',
  livret: 'saving',
  salaire: 'resource',
  prime: 'resource',
}
const kindOf = (categoryId: string): CategoryKind => KINDS[categoryId] ?? 'charge'

describe('total des charges communes', () => {
  const july = [
    makeEntry({ date: '2026-07-05', amount: eur(95_000), categoryId: 'logement' }),
    makeEntry({ date: '2026-07-08', amount: eur(12_000), categoryId: 'courses' }),
    makeEntry({ date: '2026-07-10', amount: eur(30_000), categoryId: 'auto' }),
    makeEntry({ date: '2026-07-12', amount: eur(20_000), categoryId: 'livret' }),
    makeEntry({ date: '2026-07-15', amount: eur(4_000), categoryId: 'courses', memberId: 'm-1' }),
    makeEntry({
      date: '2026-07-01',
      direction: 'in',
      amount: eur(250_000),
      categoryId: 'salaire',
    }),
    makeEntry({ date: '2026-08-03', amount: eur(9_999), categoryId: 'courses' }),
  ]

  it('somme les charges et les crédits sans membre', () => {
    expect(sharedTotal(july, '2026-07', kindOf)).toBe(137_000)
  })

  it('compte les échéances prévues, parce qu’il reste à les payer', () => {
    const withPlanned = [
      ...july,
      makeEntry({
        date: '2026-07-28',
        amount: eur(3_000),
        categoryId: 'courses',
        status: 'planned',
      }),
    ]
    expect(sharedTotal(withPlanned, '2026-07', kindOf)).toBe(140_000)
  })

  it('reprend une dépense attribuée dès qu’elle est cochée « à partager »', () => {
    const withFlag = july.map((e) =>
      e.memberId === 'm-1' ? { ...e, shared: true } : e,
    )
    expect(sharedTotal(withFlag, '2026-07', kindOf)).toBe(141_000)
  })

  it('détaille le total, du plus lourd au plus léger', () => {
    const detail = sharedEntries(july, '2026-07', kindOf)
    expect(detail.map((e) => e.categoryId)).toEqual(['logement', 'auto', 'courses'])
    expect(sum(detail.map((e) => e.amount))).toBe(sharedTotal(july, '2026-07', kindOf))
  })
})

/* --- Parts de chacun ------------------------------------------------------*/

describe('le revenu d’un membre, lu sur ses récurrences', () => {
  const MONTHLY = { unit: 'month' as const, every: 1, anchorDay: 28 }
  const salaire = makeRecurrence({
    id: 'r-1', categoryId: 'salaire', memberId: 'm-1', direction: 'in',
    amount: eur(250_000), startedOn: '2025-01-28', period: MONTHLY,
  })
  /* Le résolveur du domaine : c'est lui qui répond pour chaque récurrence,
     fixe ou variable. `unpriced` est celui d'un variable dont rien ne dit encore
     le montant. */
  const unpriced: Parameters<typeof monthlyIncome>[3] = (r) => r.amount
  const income = (recurrences: Parameters<typeof monthlyIncome>[0], amountOf = unpriced) =>
    monthlyIncome(recurrences, 'm-1', kindOf, amountOf, '2026-07').income
  const gap = (recurrences: Parameters<typeof monthlyIncome>[0], amountOf = unpriced) =>
    monthlyIncome(recurrences, 'm-1', kindOf, amountOf, '2026-07').gap

  it('somme les ressources du membre', () => {
    const apl = makeRecurrence({
      id: 'r-2', categoryId: 'salaire', memberId: 'm-1', direction: 'in',
      amount: eur(12_000), startedOn: '2025-01-05', period: MONTHLY,
    })
    expect(income([salaire, apl])).toBe(262_000)
  })

  it('ramène une périodicité non mensuelle au mois', () => {
    const annuel = makeRecurrence({
      id: 'r-3', categoryId: 'salaire', memberId: 'm-1', direction: 'in',
      amount: eur(120_000), startedOn: '2025-06-01',
      period: { unit: 'year', every: 1, anchorDay: 1 },
    })
    expect(income([annuel])).toBe(10_000)
  })

  it('ignore ce qui n’est pas une ressource', () => {
    const loyer = makeRecurrence({
      id: 'r-4', categoryId: 'logement', memberId: 'm-1',
      amount: eur(95_000), startedOn: '2025-01-05', period: MONTHLY,
    })
    expect(income([salaire, loyer])).toBe(250_000)
  })

  it('ignore les ressources d’un autre membre', () => {
    const autre = makeRecurrence({
      id: 'r-5', categoryId: 'salaire', memberId: 'm-2', direction: 'in',
      amount: eur(200_000), startedOn: '2025-01-28', period: MONTHLY,
    })
    expect(income([salaire, autre])).toBe(250_000)
  })

  it('ignore un salaire arrêté avant le mois', () => {
    expect(income([{ ...salaire, endedOn: '2026-03-31' }])).toBeNull()
  })

  it('compte un salaire arrêté en cours de mois : il a bien couru', () => {
    expect(income([{ ...salaire, endedOn: '2026-07-15' }])).toBe(250_000)
  })

  it('compte un salaire dont la première échéance est encore à venir', () => {
    // Le foyer qui vient de poser ses salaires au 1er du mois prochain n'a pas
    // à attendre ce 1er pour savoir dans quelle proportion il partage.
    expect(income([{ ...salaire, startedOn: '2026-09-01' }])).toBe(250_000)
  })

  /* « À venir » veut dire bientôt, pas un jour : sans borne, une ressource
     déclarée pour dans quatre ans déplaçait la part de chacun dès aujourd'hui,
     et rien à l'écran ne pouvait l'expliquer. */
  it('ignore un salaire déclaré au-delà de l’horizon', () => {
    expect(income([{ ...salaire, startedOn: '2030-01-01' }])).toBeNull()
    expect(gap([{ ...salaire, startedOn: '2030-01-01' }])).toBe('none')
  })

  it('compte encore un salaire au bord de l’horizon, pas un mois plus loin', () => {
    expect(income([{ ...salaire, startedOn: '2026-10-01' }])).toBe(250_000)
    expect(income([{ ...salaire, startedOn: '2026-11-01' }])).toBeNull()
  })

  /* Une échéance confirmée est un fait, y compris confirmée à zéro. Mais le
     fait « ce salaire vaut zéro » ne fabrique pas un revenu de zéro : il dit
     qu'on ne sait pas ce que cette personne gagne. */
  it('ne prend pas un revenu déclaré à zéro pour un revenu', () => {
    expect(income([{ ...salaire, amount: eur(0) }])).toBeNull()
    expect(income([{ ...salaire, amount: null }], () => eur(0))).toBeNull()
  })

  it('dit lequel des trois manques c’est', () => {
    // Sans la distinction, l'écran envoie créer une récurrence qui existe déjà,
    // ou n'envoie nulle part sur un chiffre qu'il suffit de corriger.
    expect(gap([])).toBe('none')
    expect(gap([{ ...salaire, amount: null }])).toBe('unpriced')
    expect(gap([{ ...salaire, amount: eur(0) }])).toBe('zero')
    expect(gap([salaire])).toBeNull()
  })

  it('ne sait rien dire sans aucune ressource', () => {
    expect(income([])).toBeNull()
  })

  it('estime un montant variable sur ce que le résolveur en dit', () => {
    const variable = { ...salaire, amount: null }
    expect(income([variable], () => eur(232_000))).toBe(232_000)
  })

  it('un revenu variable qu’on ne sait pas encore ne vaut pas zéro', () => {
    expect(income([{ ...salaire, amount: null }])).toBeNull()
  })

  it('rend un revenu par membre, dans l’ordre du foyer', () => {
    const autre = makeRecurrence({
      id: 'r-6', categoryId: 'salaire', memberId: 'm-2', direction: 'in',
      amount: eur(200_000), startedOn: '2025-01-28', period: MONTHLY,
    })
    expect(
      memberIncomes(
        [makeMember({ id: 'm-1' }), makeMember({ id: 'm-2' }), makeMember({ id: 'm-3' })],
        [salaire, autre],
        kindOf,
        unpriced,
        '2026-07',
      ),
    ).toEqual([
      { memberId: 'm-1', income: 250_000, gap: null },
      { memberId: 'm-2', income: 200_000, gap: null },
      { memberId: 'm-3', income: null, gap: 'none' },
    ])
  })
})

describe('ressources que personne ne porte', () => {
  const MONTHLY = { unit: 'month' as const, every: 1, anchorDay: 28 }
  const commun = makeRecurrence({
    id: 'r-caf', label: 'CAF', categoryId: 'salaire', direction: 'in',
    amount: eur(15_000), startedOn: '2025-01-28', period: MONTHLY,
  })

  it('signale un revenu resté au foyer entier', () => {
    // Il rentre bien sur le mois, mais ne pèse dans la part de personne : c'est
    // la première explication d'une répartition qui ne se calcule pas.
    expect(unassignedIncomes([commun], kindOf, '2026-07').map((r) => r.id)).toEqual(['r-caf'])
  })

  it('ignore ce qui est attribué, ce qui n’est pas une ressource, et ce qui est arrêté', () => {
    const àQuelquun = { ...commun, id: 'r-1', memberId: 'm-1' }
    const charge = { ...commun, id: 'r-2', categoryId: 'logement' }
    const arrêté = { ...commun, id: 'r-3', endedOn: '2026-03-31' }
    expect(unassignedIncomes([àQuelquun, charge, arrêté], kindOf, '2026-07')).toEqual([])
  })
})

describe('parts au prorata des revenus', () => {
  const foyer = [
    { memberId: 'm-1', income: eur(250_000) },
    { memberId: 'm-2', income: eur(200_000) },
  ]

  it('donne le coefficient de chacun en points de base', () => {
    const shares = memberShares(foyer, [eur(200_000)])
    expect(shares?.map((s) => s.shareBp)).toEqual([5556, 4444])
  })

  /* Ce qui entre dans le pot sans se consommer : la mensualité d'une avance,
     que le foyer rembourse à qui a réglé une dépense commune depuis son
     épargne. Elle est due — donc dans `due` et dans `toPay` — et elle ne coûte
     rien au mois : `due − refund` est le seul montant que la tuile Charges
     compte, et c'est lui que les deux écrans doivent annoncer. */
  it('nomme la part du pot qui ne se consomme pas', () => {
    const refund = eur(5_600)
    const shares = memberShares(foyer, [eur(200_000), refund], null, [refund])

    expect(shares?.map((s) => s.due)).toEqual([money(114_222), money(91_378)])
    expect(shares?.map((s) => s.refund)).toEqual([money(3_111), money(2_489)])
    // Ce que le mois coûte, terme à terme : le pot moins ce qui s'y rembourse,
    // et c'est exactement la part des 2 000 € de charges communes.
    expect(shares?.map((s) => s.due - s.refund)).toEqual([111_111, 88_889])
  })

  /* Découpé par le même chemin que le reste, entrée par entrée : allouer la
     somme des remboursements plutôt que chacun ferait diverger les arrondis, et
     ce centime-là se verrait — les deux moitiés doivent redonner le pot. */
  it('ne perd pas un centime entre le pot et ce qui s’y rembourse', () => {
    const refunds = [eur(3_333), eur(1_667), eur(9_999)]
    const shares = memberShares(foyer, [eur(200_000), ...refunds], null, refunds)

    expect(shares?.reduce((acc, s) => acc + s.refund, 0)).toBe(3_333 + 1_667 + 9_999)
    expect(shares?.reduce((acc, s) => acc + s.due, 0)).toBe(200_000 + 3_333 + 1_667 + 9_999)
    // Aucune part ne dépasse ce dont elle est tirée.
    expect(shares?.every((s) => s.refund <= s.due)).toBe(true)
  })

  it('répartit les charges au centime près', () => {
    const shares = memberShares(foyer, [eur(200_000)])
    expect(shares?.map((s) => s.due)).toEqual([money(111_111), money(88_889)])
    expect(shares && totalDue(shares)).toBe(200_000)
  })

  it('la somme des parts vaut toujours le total, quel qu’il soit', () => {
    for (const total of [1, 7, 99, 100_001, 333_333]) {
      const shares = memberShares(foyer, [money(total)])
      expect(shares && totalDue(shares)).toBe(total)
    }
  })

  it('ne dit rien tant qu’un revenu n’est pas connu', () => {
    expect(memberShares([foyer[0]!, { memberId: 'm-2', income: null }], [eur(200_000)])).toBeNull()
  })

  it('donne tout au membre seul : un prorata à un participant vaut 100 %', () => {
    expect(memberShares([foyer[0]!], [eur(200_000)])).toEqual([
      {
        memberId: 'm-1',
        income: money(250_000),
        shareBp: 10_000,
        due: money(200_000),
        // Rien qui ne se consomme pas dans ce pot-ci : aucune mensualité
        // d'avance n'y a été passée.
        refund: money(0),
        advanced: money(0),
        lent: money(0),
        borrowed: money(0),
        toPay: money(200_000),
      },
    ])
  })

  it('ne dit rien sans aucun membre', () => {
    expect(memberShares([], [eur(200_000)])).toBeNull()
  })

  it('ne dit rien quand tous les revenus sont à zéro', () => {
    const shares = memberShares(
      [{ memberId: 'm-1', income: eur(0) }, { memberId: 'm-2', income: eur(0) }],
      [eur(200_000)],
    )
    expect(shares).toBeNull()
  })

  /* Le contrat de la répartition pure, et lui seul : des poids, un total. Un
     tel poids ne vient plus d'un membre — `monthlyIncome` refuse désormais de
     répondre sur une ressource à zéro, précisément parce que ce partage-là
     donnait 0 % des charges à quelqu'un sans un mot. */
  it('donne tout à celui qui gagne, si l’autre poids est à zéro', () => {
    const shares = memberShares([foyer[0]!, { memberId: 'm-2', income: eur(0) }], [eur(200_000)])
    expect(shares?.map((s) => s.due)).toEqual([money(200_000), money(0)])
  })

  /* Le chemin complet, celui que le foyer emprunte : une ressource à zéro
     remonte `income: null`, et le prorata refuse de répondre plutôt que
     d'attribuer 0 % en silence. */
  it('ne répartit rien quand la ressource d’un membre vaut zéro', () => {
    const MONTHLY = { unit: 'month' as const, every: 1, anchorDay: 28 }
    const resource = (id: string, memberId: string, amount: number) =>
      makeRecurrence({
        id, categoryId: 'salaire', memberId, direction: 'in',
        amount: eur(amount), startedOn: '2025-01-28', period: MONTHLY,
      })
    const incomes = memberIncomes(
      [makeMember({ id: 'm-1' }), makeMember({ id: 'm-2' })],
      [resource('r-1', 'm-1', 250_000), resource('r-2', 'm-2', 0)],
      kindOf,
      (r) => r.amount,
      '2026-07',
    )
    expect(incomes[1]).toEqual({ memberId: 'm-2', income: null, gap: 'zero' })
    expect(memberShares(incomes, [eur(200_000)])).toBeNull()
  })

  it('garde l’ordre du foyer', () => {
    const shares = memberShares([foyer[1]!, foyer[0]!], [eur(200_000)])
    expect(shares?.map((s) => s.memberId)).toEqual(['m-2', 'm-1'])
  })

  it('répartit charge par charge, et la somme des parts vaut le total', () => {
    const amounts = [money(1), money(7), money(99), money(100_001), money(333_333)]
    const shares = memberShares(foyer, amounts)
    expect(shares && totalDue(shares)).toBe(sum(amounts))
  })

  /* Ce qu'un membre a déjà réglé sur le mois — voir `monthBalances`. Ça se
     déduit de son virement sans toucher à sa part : ce qu'un mois coûte ne
     bouge pas, seul ce qu'il reste à verser se réduit de ce qui est déjà
     sorti de sa poche. */
  const balanceOf = (over: Partial<MemberBalance>): MemberBalance => ({
    advanced: money(0),
    lent: money(0),
    borrowed: money(0),
    ...over,
  })
  it('ne bouge ni les parts ni les versements sans avance', () => {
    const shares = memberShares(foyer, [eur(200_000)]) ?? []
    expect(shares.map((s) => s.advanced)).toEqual([money(0), money(0)])
    expect(shares.map((s) => s.toPay)).toEqual(shares.map((s) => s.due))
  })

  it('déduit l’avance du versement, jamais de la part', () => {
    const advanced = new Map([['m-1', balanceOf({ advanced: money(1_500) })]])
    const shares = memberShares(foyer, [eur(200_000)], advanced) ?? []
    expect(shares.map((s) => s.due)).toEqual([money(111_111), money(88_889)])
    expect(shares.map((s) => s.toPay)).toEqual([money(109_611), money(88_889)])
  })

  it('rend négatif le versement de qui a avancé plus que sa part', () => {
    // Tout le pot avancé par m-2 : le pot lui doit, il ne verse plus.
    const advanced = new Map([['m-2', balanceOf({ advanced: money(200_000) })]])
    const shares = memberShares(foyer, [eur(200_000)], advanced) ?? []
    expect(shares.map((s) => s.toPay)).toEqual([money(111_111), money(-111_111)])
  })

  it('laisse le total des versements valoir le pot moins ce qui est avancé', () => {
    const advanced = new Map([
      ['m-1', balanceOf({ advanced: money(30_000) })],
      ['m-2', balanceOf({ advanced: money(20_000) })],
    ])
    const shares = memberShares(foyer, [eur(200_000)], advanced) ?? []
    expect(totalDue(shares)).toBe(200_000)
    expect(totalToPay(shares)).toBe(150_000)
  })

  /* Le geste Tricount : la ligne de m-2, l'argent de m-1. Le coût ne bouge
     pas — seule la balance des virements se déplace, et elle se compense au
     centime d'un membre à l'autre. */
  it('déplace la balance d’un prêt entre membres, sans toucher au total', () => {
    const balances = new Map([
      ['m-1', balanceOf({ lent: money(4_000) })],
      ['m-2', balanceOf({ borrowed: money(4_000) })],
    ])
    const shares = memberShares(foyer, [eur(200_000)], balances) ?? []
    expect(shares.map((s) => s.due)).toEqual([money(111_111), money(88_889)])
    expect(shares.map((s) => s.toPay)).toEqual([money(107_111), money(92_889)])
    // Les prêts se compensent : la somme des virements vaut encore le pot.
    expect(totalToPay(shares)).toBe(200_000)
  })

  it('ignore une avance qui ne nomme personne du foyer', () => {
    const shares =
      memberShares(foyer, [eur(200_000)], new Map([['parti', balanceOf({ advanced: money(900) })]])) ?? []
    expect(shares.map((s) => s.toPay)).toEqual(shares.map((s) => s.due))
  })
})

/* --- Ce qu'une seule personne a déjà réglé ---------------------------------*/

describe('les charges avancées d’un mois', () => {
  const MEMBERS = new Set(['luca', 'clara'])

  it('liste les charges communes confirmées qui portent un membre, de la plus lourde à la plus légère', () => {
    const july = [
      makeEntry({ date: '2026-07-15', amount: eur(4_000), categoryId: 'courses', memberId: 'clara', shared: true }),
      makeEntry({ date: '2026-07-05', amount: eur(95_000), categoryId: 'logement', memberId: 'luca', shared: true }),
      makeEntry({ date: '2026-07-08', amount: eur(12_000), categoryId: 'courses' }),
    ]
    expect(advancedEntries(july, '2026-07', kindOf).map((e) => e.amount)).toEqual([95_000, 4_000])
  })

  it('écarte ce que personne n’a avancé', () => {
    const july = [
      // Payée par le pot : elle se répartit, mais elle n'avance rien.
      makeEntry({ date: '2026-07-05', amount: eur(95_000), categoryId: 'logement' }),
      // Personne ne l'a payée : dire qu'elle a été avancée inventerait un fait.
      makeEntry({ date: '2026-07-15', amount: eur(30_000), categoryId: 'courses', memberId: 'clara', shared: true, status: 'planned' }),
      // Personnelle : elle n'est pas commune.
      makeEntry({ date: '2026-07-16', amount: eur(30_000), categoryId: 'courses', memberId: 'clara' }),
      // Un versement d'épargne ne se partage jamais.
      makeEntry({ date: '2026-07-12', amount: eur(20_000), categoryId: 'livret', memberId: 'clara' }),
      // Un autre mois que celui demandé.
      makeEntry({ date: '2026-06-15', amount: eur(30_000), categoryId: 'courses', memberId: 'clara', shared: true }),
    ]
    expect(advancedEntries(july, '2026-07', kindOf)).toEqual([])
  })

  it('somme par membre, bornée au foyer', () => {
    const july = [
      makeEntry({ date: '2026-07-05', amount: eur(95_000), categoryId: 'logement', memberId: 'luca', shared: true }),
      makeEntry({ date: '2026-07-10', amount: eur(30_000), categoryId: 'auto', memberId: 'luca', shared: true }),
      makeEntry({ date: '2026-07-15', amount: eur(4_000), categoryId: 'courses', memberId: 'clara', shared: true }),
      // Avancée par quelqu'un qui n'est plus du foyer : elle ne se déduit du
      // virement de personne — la compter ferait mentir la vérification.
      makeEntry({ date: '2026-07-18', amount: eur(7_777), categoryId: 'courses', memberId: 'parti', shared: true }),
    ]
    const balances = monthBalances(july, '2026-07', kindOf, MEMBERS)
    expect(balances.get('luca')?.advanced).toBe(125_000)
    expect(balances.get('clara')?.advanced).toBe(4_000)
    expect(balances.has('parti')).toBe(false)
  })

  it('compte la mensualité d’avance que son porteur règle lui-même', () => {
    // De nature épargne et pourtant « à partager » : elle est dans le pot, et
    // confirmée au nom de son porteur, c'est lui qui l'a réglée.
    const july = [
      makeEntry({ date: '2026-07-05', amount: eur(5_600), categoryId: 'livret', memberId: 'luca', shared: true }),
    ]
    expect(monthBalances(july, '2026-07', kindOf, MEMBERS).get('luca')?.advanced).toBe(5_600)
  })

  /* « Réglé par » sur une ligne du pot : l'avance sans avoir à s'attribuer la
     ligne — c'est la réponse à « j'ai payé le loyer commun, et l'écran ne le
     savait pas ». */
  it('crédite l’avance à qui a réglé une ligne du pot, « réglé par » compris', () => {
    const july = [
      makeEntry({ date: '2026-07-05', amount: eur(95_000), categoryId: 'logement', paidById: 'clara' }),
    ]
    expect(advancedEntries(july, '2026-07', kindOf).map((e) => e.amount)).toEqual([95_000])
    expect(monthBalances(july, '2026-07', kindOf, MEMBERS).get('clara')?.advanced).toBe(95_000)
  })

  /* Le geste Tricount, du côté des entrées : la ligne de clara, l'argent de
     luca. Elle lui doit le montant, et les deux colonnes se compensent. */
  it('inscrit un prêt quand quelqu’un règle la ligne d’un autre', () => {
    const july = [
      makeEntry({ date: '2026-07-08', amount: eur(4_000), categoryId: 'courses', memberId: 'clara', paidById: 'luca' }),
    ]
    const balances = monthBalances(july, '2026-07', kindOf, MEMBERS)
    expect(balances.get('luca')?.lent).toBe(4_000)
    expect(balances.get('clara')?.borrowed).toBe(4_000)
    // Pas une avance sur le pot : la ligne n'est pas commune.
    expect(balances.get('luca')?.advanced ?? 0).toBe(0)
  })

  it('n’inscrit rien d’une prévue, ni d’un prêt dont un bout manque', () => {
    const july = [
      // Prévue : personne n'a encore rien réglé.
      makeEntry({ date: '2026-07-08', amount: eur(4_000), categoryId: 'courses', memberId: 'clara', paidById: 'luca', status: 'planned' }),
      // Réglée par quelqu'un qui n'est plus du foyer.
      makeEntry({ date: '2026-07-09', amount: eur(2_000), categoryId: 'courses', memberId: 'clara', paidById: 'parti' }),
      // La ligne de personne n'endette personne.
      makeEntry({ date: '2026-07-10', amount: eur(3_000), categoryId: 'livret', paidById: 'luca', shared: false }),
    ]
    const balances = monthBalances(july, '2026-07', kindOf, MEMBERS)
    expect(balances.get('luca')?.lent ?? 0).toBe(0)
    expect(balances.get('clara')?.borrowed ?? 0).toBe(0)
  })
})

/* --- Le plafond de chacun -------------------------------------------------*/

describe('le plafond de chacun : ce qui rentre sur son mois', () => {
  const foyer = [
    { memberId: 'm-1', income: eur(250_000) },
    { memberId: 'm-2', income: eur(200_000) },
  ]

  const paie = (over: Parameters<typeof makeEntry>[0]): Entry =>
    makeEntry({ direction: 'in', categoryId: 'salaire', ...over })

  it('somme les rentrées du mois, échéances prévues comprises', () => {
    const entries = [
      paie({ date: '2026-07-01', amount: eur(210_000), memberId: 'm-1' }),
      paie({ date: '2026-07-15', amount: eur(12_000), memberId: 'm-1', status: 'planned' }),
      paie({ date: '2026-07-02', amount: eur(200_000), memberId: 'm-2' }),
    ]
    expect(memberCaps(entries, '2026-07', foyer)).toEqual([money(222_000), money(200_000)])
  })

  it('ignore les rentrées d’un autre mois', () => {
    const entries = [
      paie({ date: '2026-06-30', amount: eur(210_000), memberId: 'm-1' }),
      paie({ date: '2026-07-02', amount: eur(200_000), memberId: 'm-2' }),
    ]
    expect(memberCaps(entries, '2026-07', foyer)).toEqual([null, money(200_000)])
  })

  it('ne dit rien sans aucune rentrée : un plafond inconnu ne plafonne rien', () => {
    expect(memberCaps([], '2026-07', foyer)).toEqual([null, null])
  })

  it('ne dit rien quand une rentrée prévue attend encore son montant', () => {
    const entries = [
      paie({ date: '2026-07-01', amount: eur(0), memberId: 'm-1', status: 'planned' }),
      paie({ date: '2026-07-15', amount: eur(12_000), memberId: 'm-1' }),
    ]
    // La case vide n'est pas un montant nul : rien ne permet de dire ce qui
    // rentre, donc pas de plafond — la règle de `knownAmount`.
    expect(memberCaps(entries, '2026-07', foyer)[0]).toBeNull()
  })

  it('une rentrée confirmée à zéro est un fait, et le plafond vaut zéro', () => {
    const entries = [paie({ date: '2026-07-01', amount: eur(0), memberId: 'm-1' })]
    expect(memberCaps(entries, '2026-07', foyer)[0]).toBe(0)
  })
})

describe('les poids plafonnés', () => {
  const weights = [eur(250_000), eur(200_000)]

  it('ne dit rien quand aucun plafond ne mord : le prorata pur suffit', () => {
    expect(cappedWeights(weights, [eur(250_000), eur(200_000)], eur(200_000))).toBeNull()
    expect(cappedWeights(weights, [null, null], eur(200_000))).toBeNull()
  })

  it('ne dit rien pour le membre seul, ni sur un pot vide', () => {
    expect(cappedWeights([eur(1)], [eur(0)], eur(200_000))).toBeNull()
    expect(cappedWeights(weights, [eur(1), eur(1)], eur(0))).toBeNull()
  })

  it('ramène celui qui déborde à son plafond, et l’excédent bascule sur l’autre', () => {
    // Sa part serait de 1 111,11 € ; il ne rentre que 900 € chez lui ce mois-ci.
    const capped = cappedWeights(weights, [eur(90_000), null], eur(200_000))
    expect(capped).toEqual([money(90_000), money(110_000)])
  })

  it('cascade : l’excédent peut faire déborder le suivant', () => {
    const three = [eur(100_000), eur(100_000), eur(100_000)]
    // Le premier tombe à 10 €, son excédent pousse le deuxième au-dessus de
    // son propre plafond, et le troisième ramasse le reste.
    const capped = cappedWeights(three, [eur(1_000), eur(35_000), null], eur(90_000))
    expect(capped).toEqual([money(1_000), money(35_000), money(54_000)])
  })

  it('retombe sur le prorata pur quand tout le monde est au plafond', () => {
    // Le pot dépasse ce qui rentre au foyer : chacun porte le découvert à
    // proportion de ce qu'il gagne, exactement comme sans plafond.
    const capped = cappedWeights(weights, [eur(250_000), eur(200_000)], eur(450_100))
    expect(capped).toEqual(largestRemainder(450_100, weights).map((v) => money(v)))
  })

  it('la somme des parts vaut toujours le total, plafonds ou pas', () => {
    for (const total of [1, 99, 200_000, 333_333, 450_100]) {
      const capped = cappedWeights(weights, [eur(90_000), eur(150_000)], money(total))
      if (capped === null) continue
      const dues = largestRemainder(total, capped)
      expect(dues.reduce((a, b) => a + b, 0)).toBe(total)
    }
  })
})

describe('la part plafonnée à ce qui rentre', () => {
  /* Le cas qui a fait naître la règle : un congé parental fait tomber la paie
     du mois à 60 % — l'échéance est réduite, la récurrence non. Le coefficient
     reste assis sur les récurrences, et la part dépassait ce qui rentre. */
  const foyer = [
    { memberId: 'm-1', income: eur(210_000) },
    { memberId: 'm-2', income: eur(298_500) },
  ]
  const september = [
    makeEntry({ id: 'paie-1', date: '2026-09-01', direction: 'in', amount: eur(126_000), categoryId: 'salaire', memberId: 'm-1', status: 'planned' }),
    makeEntry({ id: 'paie-2', date: '2026-09-01', direction: 'in', amount: eur(298_500), categoryId: 'salaire', memberId: 'm-2', status: 'planned' }),
    makeEntry({ id: 'loyer', date: '2026-09-01', amount: eur(129_000), categoryId: 'logement', status: 'planned' }),
    makeEntry({ id: 'credit', date: '2026-09-05', amount: eur(184_200), categoryId: 'auto', status: 'planned' }),
  ]
  const caps = memberCaps(september, '2026-09', foyer)
  const commun = sharedEntries(september, '2026-09', kindOf)

  it('ne fait jamais payer plus que ce qui rentre sur le mois', () => {
    const shares = memberShares(foyer, commun.map((e) => e.amount), null, [], caps)
    // Sa part au prorata aurait été de 1 293,45 € pour 1 260 € de paie : le
    // mois entier dans le rouge. Le plafond la ramène à ce qui rentre, et
    // l'excédent bascule sur celui qui a de la marge.
    expect(shares?.map((s) => s.due)).toEqual([money(126_000), money(187_200)])
    expect(shares && totalDue(shares)).toBe(313_200)
  })

  it('le coefficient affiché suit les parts réellement portées', () => {
    const shares = memberShares(foyer, commun.map((e) => e.amount), null, [], caps)
    expect(shares?.map((s) => s.shareBp)).toEqual(largestRemainder(10_000, [126_000, 187_200]))
    // Et le revenu affiché reste le revenu déclaré, pas le poids plafonné.
    expect(shares?.map((s) => s.income)).toEqual([money(210_000), money(298_500)])
  })

  it('sans plafond fourni, le prorata s’applique comme avant', () => {
    const shares = memberShares(foyer, commun.map((e) => e.amount))
    expect(shares?.map((s) => s.shareBp)).toEqual([4130, 5870])
  })

  it('le mois vu par le membre découpe aux mêmes poids, au centime', () => {
    const scoped = scopeToMember(september, 'm-1', kindOf, cappedIncomes(foyer, september, '2026-09', kindOf))
    const sienne = sum(
      (scoped ?? []).filter((e) => commun.some((c) => c.id === e.id)).map((e) => e.amount),
    )
    const due = memberShares(foyer, commun.map((e) => e.amount), null, [], caps)?.[0]?.due
    expect(sienne).toBe(due)
    expect(sienne).toBe(126_000)
  })

  it('ce qu’un membre porte du mois suit le même plafond', () => {
    const charges = memberCharges(september, '2026-09', 'm-1', kindOf, foyer)
    expect(charges?.common).toBe(126_000)
    expect(charges?.commonTotal).toBe(313_200)
  })

  it('rend les revenus tels quels — la référence comprise — quand rien ne mord', () => {
    const calm = [
      ...september.filter((e) => e.direction === 'in'),
      makeEntry({ id: 'loyer', date: '2026-09-01', amount: eur(95_000), categoryId: 'logement', status: 'planned' }),
    ]
    expect(cappedIncomes(foyer, calm, '2026-09', kindOf)).toBe(foyer)
  })

  it('remplace les revenus par les parts plafonnées quand un plafond mord', () => {
    const weighted = cappedIncomes(foyer, september, '2026-09', kindOf)
    expect(weighted.map((w) => w.income)).toEqual([money(126_000), money(187_200)])
  })
})

/* --- À quelqu'un, ou à tout le monde ---------------------------------------*/

describe('une ligne doit être à quelqu’un, ou à tout le monde', () => {
  it('laisse le membre facultatif sur ce que le partage prendra en charge', () => {
    expect(memberRequired('out', 'charge', '', undefined)).toBe(false)
    expect(memberRequired('out', 'debt', '', undefined)).toBe(false)
  })

  it('exige un membre sur une dépense sortie du partage à la main', () => {
    expect(memberRequired('out', 'charge', '', false)).toBe(true)
  })

  it('exige un membre sur un versement d’épargne : il ne se partage jamais', () => {
    expect(memberRequired('out', 'saving', '', undefined)).toBe(true)
  })

  it('exige un membre sur une entrée d’argent : elle ne se partage pas davantage', () => {
    expect(memberRequired('in', 'resource', '', undefined)).toBe(true)
    // Cocher « à partager » sur une entrée n'y change rien : seules les sorties
    // se répartissent.
    expect(memberRequired('in', 'resource', '', true)).toBe(true)
  })

  it('n’exige plus rien dès que la ligne est à quelqu’un', () => {
    expect(memberRequired('out', 'saving', 'm-1', undefined)).toBe(false)
    expect(memberRequired('in', 'resource', 'm-1', undefined)).toBe(false)
    expect(memberRequired('out', 'charge', 'm-1', false)).toBe(false)
  })

  it('couvre exactement ce qui n’apparaîtrait dans le mois de personne', () => {
    const orphan = (kind: CategoryKind, shared?: boolean): boolean => {
      const entry = makeEntry({
        date: '2026-07-10',
        direction: kind === 'resource' ? 'in' : 'out',
        categoryId: kind,
        ...(shared === undefined ? {} : { shared }),
      })
      const scoped = scopeToMember([entry], 'm-1', () => kind, [
        { memberId: 'm-1', income: eur(250_000) },
        { memberId: 'm-2', income: eur(200_000) },
      ])
      return scoped?.length === 0
    }

    for (const [kind, shared] of [
      ['charge', undefined],
      ['charge', false],
      ['saving', undefined],
      ['resource', undefined],
    ] as [CategoryKind, boolean | undefined][]) {
      expect(orphan(kind, shared)).toBe(
        memberRequired(kind === 'resource' ? 'in' : 'out', kind, '', shared),
      )
    }
  })
})

/* --- Le mois vu par un membre ---------------------------------------------*/

describe('le mois vu par un membre', () => {
  const foyer = [
    { memberId: 'm-1', income: eur(250_000) },
    { memberId: 'm-2', income: eur(200_000) },
  ]

  const july = [
    /* Communes : personne ne se les est attribuées. */
    makeEntry({ id: 'loyer', date: '2026-07-05', amount: eur(95_000), categoryId: 'logement' }),
    makeEntry({ id: 'pret', date: '2026-07-10', amount: eur(30_000), categoryId: 'auto' }),
    /* À lui, à elle, et un versement d'épargne qui ne se partage pas. */
    makeEntry({ id: 'sien', date: '2026-07-15', amount: eur(4_000), categoryId: 'courses', memberId: 'm-1' }),
    makeEntry({ id: 'elle', date: '2026-07-16', amount: eur(6_000), categoryId: 'courses', memberId: 'm-2' }),
    makeEntry({ id: 'livret', date: '2026-07-12', amount: eur(20_000), categoryId: 'livret', memberId: 'm-1' }),
    makeEntry({ id: 'paie', date: '2026-07-01', direction: 'in', amount: eur(250_000), categoryId: 'salaire', memberId: 'm-1' }),
  ]

  const forM1 = scopeToMember(july, 'm-1', kindOf, foyer)

  it('garde ses lignes et sa part de chaque charge commune', () => {
    expect(forM1?.map((e) => e.id).sort()).toEqual(['livret', 'loyer', 'paie', 'pret', 'sien'])
    // 55,56 % de 950 € et de 300 €.
    expect(forM1?.find((e) => e.id === 'loyer')?.amount).toBe(52_778)
    expect(forM1?.find((e) => e.id === 'pret')?.amount).toBe(16_667)
  })

  it('laisse les lignes des autres dehors, et ne touche pas aux siennes', () => {
    expect(forM1?.find((e) => e.id === 'elle')).toBeUndefined()
    expect(forM1?.find((e) => e.id === 'sien')?.amount).toBe(4_000)
    expect(forM1?.find((e) => e.id === 'paie')?.amount).toBe(250_000)
  })

  it('ne partage pas un versement d’épargne : il reste à qui le fait', () => {
    expect(forM1?.find((e) => e.id === 'livret')?.amount).toBe(20_000)
    expect(scopeToMember(july, 'm-2', kindOf, foyer)?.find((e) => e.id === 'livret')).toBeUndefined()
  })

  it('partage une dépense avancée par quelqu’un dès qu’elle est cochée', () => {
    const avancee = july.map((e) => (e.id === 'sien' ? { ...e, shared: true } : e))
    expect(scopeToMember(avancee, 'm-1', kindOf, foyer)?.find((e) => e.id === 'sien')?.amount).toBe(
      2_222,
    )
    expect(scopeToMember(avancee, 'm-2', kindOf, foyer)?.find((e) => e.id === 'sien')?.amount).toBe(
      1_778,
    )
  })

  it('les parts de tous redonnent exactement chaque charge commune', () => {
    const part = (member: string, id: string): number =>
      scopeToMember(july, member, kindOf, foyer)?.find((e) => e.id === id)?.amount ?? 0
    expect(part('m-1', 'loyer') + part('m-2', 'loyer')).toBe(95_000)
    expect(part('m-1', 'pret') + part('m-2', 'pret')).toBe(30_000)
  })

  it('donne le même chiffre que l’écran Répartition, au centime près', () => {
    const commun = sharedEntries(july, '2026-07', kindOf)
    const due = memberShares(foyer, commun.map((e) => e.amount))?.[0]?.due
    const sienne = sum(
      (forM1 ?? [])
        .filter((e) => commun.some((c) => c.id === e.id))
        .map((e) => e.amount),
    )
    expect(sienne).toBe(due)
  })

  it('ne dit rien tant que le prorata ne se calcule pas', () => {
    expect(scopeToMember(july, 'm-1', kindOf, [foyer[0]!, { memberId: 'm-2', income: null }])).toBeNull()
    expect(scopeToMember(july, 'm-3', kindOf, foyer)).toBeNull()
  })

  /* La version en un balayage doit rendre exactement la même chose que la
     version membre par membre : c'est tout ce qu'on lui demande, et c'est ce
     qui permet de la substituer là où le coût se multipliait par le nombre de
     personnes. */
  describe('tout le foyer d’un seul balayage', () => {
    it('donne à chacun ce que la lecture membre par membre lui donnait', () => {
      const all = scopeToMembers(july, kindOf, foyer)
      for (const { memberId } of foyer) {
        expect(all?.get(memberId)).toEqual(scopeToMember(july, memberId, kindOf, foyer))
      }
    })

    it('garde l’ordre des entrées', () => {
      const all = scopeToMembers(july, kindOf, foyer)
      expect(all?.get('m-1')?.map((e) => e.id)).toEqual(
        scopeToMember(july, 'm-1', kindOf, foyer)?.map((e) => e.id),
      )
    })

    it('découpe chaque charge commune sans qu’un centime se perde', () => {
      const all = scopeToMembers(july, kindOf, foyer)
      const part = (member: string, id: string): number =>
        all?.get(member)?.find((e) => e.id === id)?.amount ?? 0
      expect(part('m-1', 'loyer') + part('m-2', 'loyer')).toBe(95_000)
      expect(part('m-1', 'pret') + part('m-2', 'pret')).toBe(30_000)
    })

    it('ne dit rien tant que le prorata ne se calcule pas', () => {
      expect(scopeToMembers(july, kindOf, [foyer[0]!, { memberId: 'm-2', income: null }])).toBeNull()
    })

    it('n’a pas de clé pour qui n’est pas du foyer, comme l’autre rendait null', () => {
      expect(scopeToMembers(july, kindOf, foyer)?.has('m-3')).toBe(false)
      expect(scopeToMember(july, 'm-3', kindOf, foyer)).toBeNull()
    })
  })
})

/* --- Ce qu'un membre porte du mois ----------------------------------------*/

describe('les charges d’un membre, les siennes et sa part du foyer', () => {
  const foyer = [
    { memberId: 'm-1', income: eur(250_000) },
    { memberId: 'm-2', income: eur(200_000) },
  ]

  const july = [
    /* Communes : 950 € de loyer et 300 € de mensualité. */
    makeEntry({ id: 'loyer', date: '2026-07-05', amount: eur(95_000), categoryId: 'logement' }),
    makeEntry({ id: 'pret', date: '2026-07-10', amount: eur(30_000), categoryId: 'auto' }),
    /* À lui : des courses, et un versement d'épargne qui n'est pas une charge. */
    makeEntry({ id: 'sien', date: '2026-07-15', amount: eur(4_000), categoryId: 'courses', memberId: 'm-1' }),
    makeEntry({ id: 'livret', date: '2026-07-12', amount: eur(20_000), categoryId: 'livret', memberId: 'm-1' }),
    /* À elle, et une paie : ni l'une ni l'autre n'est à sa charge. */
    makeEntry({ id: 'elle', date: '2026-07-16', amount: eur(6_000), categoryId: 'courses', memberId: 'm-2' }),
    makeEntry({ id: 'paie', date: '2026-07-01', direction: 'in', amount: eur(250_000), categoryId: 'salaire', memberId: 'm-1' }),
    /* Un autre mois : il ne compte pas dans celui-ci. */
    makeEntry({ id: 'aout', date: '2026-08-03', amount: eur(9_999), categoryId: 'courses' }),
  ]

  const charges = memberCharges(july, '2026-07', 'm-1', kindOf, foyer)

  it('sépare ce qu’il porte seul de ce qu’il porte pour le foyer', () => {
    // 55,56 % de 950 € et de 300 €, contre 40 € de courses à son seul nom.
    expect(charges).toEqual({
      own: money(4_000),
      common: money(69_445),
      commonCharge: money(52_778),
      commonDebt: money(16_667),
      commonTotal: money(125_000),
      shareBp: 5556,
    })
  })

  it('laisse l’épargne, les entrées et les lignes des autres en dehors', () => {
    const forM2 = memberCharges(july, '2026-07', 'm-2', kindOf, foyer)
    expect(forM2?.own).toBe(6_000)
    expect(forM2?.commonTotal).toBe(125_000)
  })

  it('les deux morceaux redonnent le total des charges de son mois filtré', () => {
    const scoped = scopeToMember(july, 'm-1', kindOf, foyer) ?? []
    const spending = sum(
      scoped
        .filter((e) => ymOf(e.date) === '2026-07')
        .filter((e) => e.direction === 'out' && isSpending(kindOf(e.categoryId)))
        .map((e) => e.amount),
    )
    expect((charges?.own ?? 0) + (charges?.common ?? 0)).toBe(spending)
  })

  it('donne le même chiffre et le même coefficient que l’écran Répartition', () => {
    const commun = sharedEntries(july, '2026-07', kindOf)
    const share = memberShares(foyer, commun.map((e) => e.amount))?.[0]
    expect(charges?.common).toBe(share?.due)
    expect(charges?.shareBp).toBe(share?.shareBp)
    expect(charges?.commonTotal).toBe(sharedTotal(july, '2026-07', kindOf))
  })

  /* La cascade de la capacité d'épargne lit « charges » et « crédits »
     séparément : elle ne peut retrancher du commun que ce qui vient de la même
     nature qu'elle, sans quoi un crédit commun se déduirait des charges et les
     deux lignes annonceraient chacune un chiffre faux dont la somme, elle,
     tomberait juste. */
  it('ventile la part du commun par nature, sans en perdre un centime', () => {
    expect((charges?.commonCharge ?? 0) + (charges?.commonDebt ?? 0)).toBe(charges?.common)
    // Le prêt auto est commun : sa part est un crédit, pas une charge.
    expect(charges?.commonDebt).toBe(allocate(money(30_000), [250_000, 200_000])[0])
    expect(charges?.commonCharge).toBe(allocate(money(95_000), [250_000, 200_000])[0])
  })

  it('une dépense cochée « à partager » quitte ses charges pour le pot commun', () => {
    const avancee = july.map((e) => (e.id === 'sien' ? { ...e, shared: true } : e))
    const partagee = memberCharges(avancee, '2026-07', 'm-1', kindOf, foyer)
    expect(partagee?.own).toBe(0)
    // 55,56 % des 40 € qu'il a avancés lui reviennent, le reste passe à l'autre.
    expect(partagee?.common).toBe(71_667)
    expect(partagee?.commonTotal).toBe(129_000)
  })

  it('ne dit rien tant que le prorata ne se calcule pas', () => {
    const incomplet = [foyer[0]!, { memberId: 'm-2', income: null }]
    expect(memberCharges(july, '2026-07', 'm-1', kindOf, incomplet)).toBeNull()
    expect(memberCharges(july, '2026-07', 'm-3', kindOf, foyer)).toBeNull()
  })

  it('rend un mois sans charge commune sans rien inventer', () => {
    const seul = memberCharges([july[2]!], '2026-07', 'm-1', kindOf, foyer)
    expect(seul).toEqual({
      own: money(4_000),
      common: money(0),
      commonCharge: money(0),
      commonDebt: money(0),
      commonTotal: money(0),
      shareBp: 5556,
    })
  })
})

/* --- Le foyer d'une seule personne -----------------------------------------*/

/**
 * Seul du foyer, le prorata n'a personne à comparer : la part vaut 100 %, sans
 * qu'aucun revenu soit exigé, et le mois filtré sur le membre est le mois du
 * foyer entier — lignes de personne comprises, qu'un découpage du commun ne
 * saurait pas lui rendre. C'est l'identité qui manquait : solde et capacité
 * d'épargne divergeaient entre « tout le monde » et sa pilule à lui.
 */
describe('un foyer d’une seule personne', () => {
  const seul = [{ memberId: 'm-1', income: eur(250_000) }]
  const sansRevenu = [{ memberId: 'm-1', income: null }]

  const july = [
    /* Commune : personne ne se l'est attribuée. */
    makeEntry({ id: 'loyer', date: '2026-07-05', amount: eur(95_000), categoryId: 'logement' }),
    /* À lui. */
    makeEntry({ id: 'sien', date: '2026-07-15', amount: eur(4_000), categoryId: 'courses', memberId: 'm-1' }),
    /* Laissés « en commun » : ni communs ni à lui — le découpage du prorata
       ne les voit pas, seule la règle solo les lui rend. */
    makeEntry({ id: 'paie', date: '2026-07-01', direction: 'in', amount: eur(250_000), categoryId: 'salaire' }),
    makeEntry({ id: 'livret', date: '2026-07-12', amount: eur(20_000), categoryId: 'livret', memberId: '' }),
    /* Héritée d'avant la règle « à quelqu'un, ou à tout le monde » : sortie du
       partage sans propriétaire. */
    makeEntry({ id: 'orpheline', date: '2026-07-18', amount: eur(2_500), categoryId: 'courses', shared: false }),
  ]

  it('le coefficient vaut 100 %, revenu connu ou non', () => {
    expect(memberShares(seul, [eur(200_000)])?.[0]).toMatchObject({ shareBp: 10_000, due: 200_000 })
    expect(memberShares(sansRevenu, [eur(200_000)])?.[0]).toMatchObject({ shareBp: 10_000, due: 200_000 })
  })

  it('n’affiche pas le poids factice comme un revenu', () => {
    expect(memberShares(sansRevenu, [eur(200_000)])?.[0]?.income).toBe(0)
  })

  it('son mois est le mois du foyer, montants intacts et rien d’écarté', () => {
    const scoped = scopeToMember(july, 'm-1', kindOf, seul)
    expect(scoped?.map((e) => e.id)).toEqual(july.map((e) => e.id))
    expect(scoped?.map((e) => e.amount)).toEqual(july.map((e) => e.amount))
    expect(scoped?.every((e) => e.memberId === 'm-1')).toBe(true)
  })

  it('même sans revenu déclaré', () => {
    expect(scopeToMember(july, 'm-1', kindOf, sansRevenu)?.length).toBe(july.length)
  })

  it('les sommes par sens valent celles des entrées brutes', () => {
    const scoped = scopeToMember(july, 'm-1', kindOf, seul) ?? []
    const par = (entries: readonly Entry[], direction: 'in' | 'out') =>
      sum(entries.filter((e) => e.direction === direction).map((e) => e.amount))
    expect(par(scoped, 'in')).toBe(par(july, 'in'))
    expect(par(scoped, 'out')).toBe(par(july, 'out'))
  })

  it('une ligne d’un id étranger passe telle quelle : le foyer la compte', () => {
    const etrangere = makeEntry({
      id: 'ex', date: '2026-07-20', amount: eur(1_000), categoryId: 'courses', memberId: 'm-9',
    })
    const scoped = scopeToMember([...july, etrangere], 'm-1', kindOf, seul)
    expect(scoped?.find((e) => e.id === 'ex')?.memberId).toBe('m-9')
  })

  it('le balayage du foyer rend la même chose que la lecture du membre', () => {
    const all = scopeToMembers(july, kindOf, seul)
    expect([...(all?.keys() ?? [])]).toEqual(['m-1'])
    expect(all?.get('m-1')).toEqual(scopeToMember(july, 'm-1', kindOf, seul))
  })

  it('perso et part du commun redonnent le total des charges de son mois', () => {
    const charges = memberCharges(july, '2026-07', 'm-1', kindOf, seul)
    // 950 € de commun à 100 % ; 40 € à lui, plus 25 € hérités de personne.
    expect(charges).toEqual({
      own: money(6_500),
      common: money(95_000),
      commonCharge: money(95_000),
      commonDebt: money(0),
      commonTotal: money(95_000),
      shareBp: 10_000,
    })
    const scoped = scopeToMember(july, 'm-1', kindOf, seul) ?? []
    const spending = sum(
      scoped
        .filter((e) => e.direction === 'out' && isSpending(kindOf(e.categoryId)))
        .map((e) => e.amount),
    )
    expect((charges?.own ?? 0) + (charges?.common ?? 0)).toBe(spending)
  })

  it('sa part vaut aussi sans revenu déclaré', () => {
    expect(memberCharges(july, '2026-07', 'm-1', kindOf, sansRevenu)?.shareBp).toBe(10_000)
  })

  it('un filtre resté sur quelqu’un d’autre ne dit rien, comme avant', () => {
    expect(scopeToMember(july, 'm-2', kindOf, seul)).toBeNull()
    expect(memberCharges(july, '2026-07', 'm-2', kindOf, seul)).toBeNull()
  })

  it('sans aucun membre, rien ne change : null partout', () => {
    expect(memberShares([], [eur(200_000)])).toBeNull()
    expect(scopeToMember(july, 'm-1', kindOf, [])).toBeNull()
    expect(scopeToMembers(july, kindOf, [])).toBeNull()
    expect(memberCharges(july, '2026-07', 'm-1', kindOf, [])).toBeNull()
  })
})

/* --- Le chemin complet, tel qu'on le vit -----------------------------------*/

/**
 * Deux salaires notés en récurrences à montant variable, et la répartition qui
 * doit en sortir.
 *
 * C'est le montage le plus courant d'un foyer à deux salaires qui bougent, et
 * il ne produisait aucun prorata : le revenu ne se lisait que sur une échéance
 * *confirmée* et *strictement antérieure* au jour même. Un foyer tout neuf
 * n'en avait aucune, un salaire confirmé le jour de son versement ne comptait
 * pas non plus, et un montant saisi sur l'échéance prévue était ignoré. Les
 * charges communes restaient alors partagées… nulle part.
 */
describe('un foyer à salaires variables se répartit', () => {
  const MONTHLY = { unit: 'month' as const, every: 1, anchorDay: 27 }
  const foyer = [makeMember({ id: 'm-1' }), makeMember({ id: 'm-2' })]

  const salaire = (id: string, memberId: string, over: Partial<Recurrence> = {}) =>
    makeRecurrence({
      id, memberId, categoryId: 'salaire', direction: 'in',
      amount: null, startedOn: '2026-06-27', period: MONTHLY, ...over,
    })

  const paie = (recurrenceId: string, date: string, amount: number, status: EntryStatus) =>
    makeEntry({ recurrenceId, date, amount: eur(amount), direction: 'in', categoryId: 'salaire', status })

  /** Le câblage réel : `amountOn` répond, `memberIncomes` en déduit les parts. */
  const parts = (recurrences: Recurrence[], entries: Entry[], on: string) =>
    memberShares(
      memberIncomes(foyer, recurrences, kindOf, (r) => amountOn(r, entries, on), ymOf(on)),
      [eur(100_000)],
    )

  it('sur un montant habituel déclaré, avant toute échéance', () => {
    const recurrences = [
      salaire('r-1', 'm-1', { estimate: eur(250_000) }),
      salaire('r-2', 'm-2', { estimate: eur(200_000) }),
    ]
    expect(parts(recurrences, [], '2026-07-15')?.map((s) => s.shareBp)).toEqual([5556, 4444])
  })

  it('sur des salaires confirmés le jour même', () => {
    const recurrences = [salaire('r-1', 'm-1'), salaire('r-2', 'm-2')]
    const entries = [
      paie('r-1', '2026-07-27', 250_000, 'confirmed'),
      paie('r-2', '2026-07-27', 200_000, 'confirmed'),
    ]
    expect(parts(recurrences, entries, '2026-07-27')?.map((s) => s.shareBp)).toEqual([5556, 4444])
  })

  it('sur des montants saisis sur les échéances encore prévues', () => {
    const recurrences = [salaire('r-1', 'm-1'), salaire('r-2', 'm-2')]
    const entries = [
      paie('r-1', '2026-07-27', 250_000, 'planned'),
      paie('r-2', '2026-07-27', 200_000, 'planned'),
    ]
    expect(parts(recurrences, entries, '2026-07-15')?.map((s) => s.shareBp)).toEqual([5556, 4444])
  })

  it('mais pas tant qu’un seul des deux salaires reste sans chiffre', () => {
    // Un dénominateur incomplet ne vaut pas zéro : il ne veut rien dire, et
    // l'écran doit nommer qui manque plutôt qu'afficher une part fausse.
    const recurrences = [salaire('r-1', 'm-1', { estimate: eur(250_000) }), salaire('r-2', 'm-2')]
    expect(parts(recurrences, [], '2026-07-15')).toBeNull()
  })

  it('même quand la première échéance tombe le mois suivant', () => {
    /* Le foyer qui se met en place le 31 juillet pose ses salaires au 1er août.
       Lu au jour dit, aucun des deux n'existait encore : les deux membres se
       lisaient « aucun revenu enregistré », le montant habituel n'était même
       pas consulté, et la répartition serait apparue le lendemain. Un chiffre
       de partage ne peut pas dépendre du moment où on ouvre l'écran. */
    const recurrences = [
      salaire('r-1', 'm-1', { startedOn: '2026-08-01', estimate: eur(250_000) }),
      salaire('r-2', 'm-2', { startedOn: '2026-08-01', estimate: eur(200_000) }),
    ]
    expect(parts(recurrences, [], '2026-07-31')?.map((s) => s.shareBp)).toEqual([5556, 4444])
  })

  it('et l’échéance réelle l’emporte sur le montant habituel', () => {
    const recurrences = [
      salaire('r-1', 'm-1', { estimate: eur(250_000) }),
      salaire('r-2', 'm-2', { estimate: eur(200_000) }),
    ]
    // m-1 a touché 200 000 en juin : les deux gagnent désormais autant.
    const entries = [paie('r-1', '2026-06-27', 200_000, 'confirmed')]
    expect(parts(recurrences, entries, '2026-07-15')?.map((s) => s.shareBp)).toEqual([5000, 5000])
  })
})
