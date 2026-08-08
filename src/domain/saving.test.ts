import { describe, expect, it } from 'vitest'
import { eur, makeEntry, makeRecurrence, makeSavingSupport, makeSavingValuation } from './fixtures'
import {
  UNLINKED_SUPPORT,
  activeSupports,
  isSupportEmpty,
  savingTotal,
  latestValuation,
  savingsBySupport,
  supportEntries,
  supportFlows,
  supportMonthFlows,
  supportUsage,
  supportValue,
  supportsOfMember,
  valuationAge,
  valuationsOf,
} from './saving'
import type { CategoryKind } from './types'

const kindOf = (id: string): CategoryKind =>
  id === 'passbook' || id === 'plans' ? 'saving' : id === 'salaire' ? 'resource' : 'charge'

const livret = makeSavingSupport({ id: 's-livret', label: 'Livret A', memberId: 'm1' })
const pea = makeSavingSupport({
  id: 's-pea',
  label: 'PEA',
  memberId: 'm1',
  categoryId: 'plans',
})

/* --- Le stock -------------------------------------------------------------*/

describe('la dernière valeur connue', () => {
  const valuations = [
    makeSavingValuation({ id: 'v1', supportId: 's-livret', amount: eur(1000000), date: '2026-06-08' }),
    makeSavingValuation({ id: 'v3', supportId: 's-livret', amount: eur(1140000), date: '2026-08-08' }),
    makeSavingValuation({ id: 'v2', supportId: 's-livret', amount: eur(1065000), date: '2026-07-08' }),
    makeSavingValuation({ id: 'v4', supportId: 's-pea', amount: eur(1800000), date: '2026-08-01' }),
  ]

  it('range l’historique du plus récent au plus ancien', () => {
    expect(valuationsOf(valuations, 's-livret').map((v) => v.id)).toEqual(['v3', 'v2', 'v1'])
  })

  it('ne mélange pas les supports', () => {
    expect(valuationsOf(valuations, 's-pea').map((v) => v.id)).toEqual(['v4'])
  })

  it('rend le relevé le plus récent à la date où l’on regarde', () => {
    expect(latestValuation(valuations, 's-livret', '2026-08-20')?.amount).toBe(1140000)
    expect(latestValuation(valuations, 's-livret', '2026-07-20')?.amount).toBe(1065000)
  })

  /* La règle la plus importante du module : inconnu n'est pas zéro. Un livret
     vidé vaut zéro et c'est une information ; un support jamais relevé ne dit
     rien, et ne peut donc entrer dans aucune addition. */
  it('rend null plutôt que zéro quand rien n’a jamais été relevé', () => {
    expect(latestValuation(valuations, 's-inconnu')).toBeNull()
    expect(latestValuation(valuations, 's-livret', '2026-01-01')).toBeNull()
  })

  /* Deux relevés du même jour, c'est une saisie et sa correction — et c'est la
     correction qu'on veut lire. Les départager par leur identifiant, comme on
     le faisait, revenait à tirer à pile ou face : `makeId` rend un UUID
     aléatoire, donc le typo l'emportait une fois sur deux. */
  it('fait gagner le dernier relevé posé le même jour', () => {
    const typo = makeSavingValuation({
      id: 'a',
      supportId: 's-livret',
      amount: eur(100),
      date: '2026-08-08',
    })
    const fix = makeSavingValuation({
      id: 'b',
      supportId: 's-livret',
      amount: eur(200),
      date: '2026-08-08',
    })
    expect(latestValuation([typo, fix], 's-livret', '2026-08-08')?.amount).toBe(eur(200))
    /* Le rang décide seul : les mêmes identifiants dans l'autre sens désignent
       l'autre relevé. L'ordre est donc bien celui de l'arrivée, et il est
       total — deux lectures du même document rendent le même « dernier ». */
    expect(latestValuation([fix, typo], 's-livret', '2026-08-08')?.amount).toBe(eur(100))
  })
})

describe('l’âge d’un relevé', () => {
  it('reste frais tant qu’un mois entier ne s’est pas écoulé', () => {
    expect(valuationAge('2026-08-08', '2026-08-08')).toEqual({ level: 'fresh', months: 0 })
    expect(valuationAge('2026-08-08', '2026-09-07')).toEqual({ level: 'fresh', months: 0 })
  })

  it('compte des mois entiers, et le jour du mois arbitre', () => {
    expect(valuationAge('2026-08-08', '2026-09-08')).toEqual({ level: 'ageing', months: 1 })
    /* Du 31 mai au 30 août, deux mois pleins et non trois : annoncer le
       troisième vieillirait le relevé d'un mois qu'il n'a pas. */
    expect(valuationAge('2026-05-31', '2026-08-30')).toEqual({ level: 'ageing', months: 2 })
    expect(valuationAge('2026-05-31', '2026-08-31')).toEqual({ level: 'ageing', months: 3 })
  })

  it('bascule sur « à actualiser » au sixième mois, pas avant', () => {
    expect(valuationAge('2026-03-09', '2026-08-08')).toEqual({ level: 'ageing', months: 4 })
    expect(valuationAge('2026-03-08', '2026-08-08')).toEqual({ level: 'ageing', months: 5 })
    expect(valuationAge('2026-02-08', '2026-08-08')).toEqual({ level: 'stale', months: 6 })
    expect(valuationAge('2025-08-08', '2026-08-08')).toEqual({ level: 'stale', months: 12 })
  })

  /* Un relevé daté d'après-demain n'a pas −1 mois : c'est une saisie en avance,
     pas une anomalie, et l'écran n'a rien de spécial à en dire. */
  it('ne rend jamais un âge négatif', () => {
    expect(valuationAge('2026-09-08', '2026-08-08')).toEqual({ level: 'fresh', months: 0 })
  })
})

describe('le total de l’épargne renseignée', () => {
  const valuations = [
    makeSavingValuation({ id: 'v1', supportId: 's-livret', amount: eur(1245000), date: '2026-08-08' }),
  ]

  /* « 12 450 €, un support sans valeur » plutôt que « 12 450 € » tout court :
     un patrimoine faux présenté comme exact est pire que pas de chiffre. */
  it('n’additionne que ce qui est relevé, et compte le reste à part', () => {
    expect(savingTotal([livret, pea], valuations)).toEqual({
      known: 1245000,
      movedSince: 0,
      estimated: 1245000,
      valued: 1,
      unvalued: 1,
    })
  })

  it('ne compte pas une inconnue comme un zéro', () => {
    expect(savingTotal([pea], valuations)).toEqual({
      known: 0,
      movedSince: 0,
      estimated: 0,
      valued: 0,
      unvalued: 1,
    })
  })

  it('compte bien un zéro relevé, qui est une information', () => {
    const empty = [
      makeSavingValuation({ id: 'v', supportId: 's-pea', amount: eur(0), date: '2026-08-08' }),
    ]
    expect(savingTotal([pea], empty)).toMatchObject({ known: 0, valued: 1, unvalued: 0 })
  })
})

/* --- Les flux -------------------------------------------------------------*/

describe('les mouvements d’un support', () => {
  const entries = [
    makeEntry({ id: 'a', savingSupportId: 's-livret', date: '2026-08-05', amount: eur(30000) }),
    makeEntry({
      id: 'b',
      savingSupportId: 's-livret',
      direction: 'in',
      date: '2026-08-12',
      amount: eur(60000),
    }),
    makeEntry({ id: 'c', savingSupportId: 's-pea', date: '2026-08-10', amount: eur(30000) }),
    makeEntry({ id: 'd', savingSupportId: 's-livret', date: '2026-07-05', amount: eur(30000) }),
    makeEntry({
      id: 'e',
      savingSupportId: 's-livret',
      date: '2026-08-28',
      amount: eur(30000),
      status: 'planned',
    }),
  ]

  it('sépare ce qui entre de ce qui sort, et rend le net', () => {
    expect(supportMonthFlows(entries, 's-livret', '2026-08')).toEqual({
      contributions: 60000,
      withdrawals: 60000,
      net: 0,
    })
  })

  /* Une échéance encore prévue n'a bougé aucun livret : elle compte dans le
     prévisionnel du mois, jamais dans ce que le support a reçu. */
  it('sait ne compter que le confirmé', () => {
    expect(supportMonthFlows(entries, 's-livret', '2026-08', true)).toEqual({
      contributions: 30000,
      withdrawals: 60000,
      net: -30000,
    })
  })

  it('ne compte que les mouvements du support demandé', () => {
    expect(supportFlows(entries, 's-pea').net).toBe(30000)
  })

  it('rend les mouvements du plus récent au plus ancien', () => {
    expect(supportEntries(entries, 's-livret').map((e) => e.id)).toEqual(['e', 'b', 'a', 'd'])
  })
})

/* --- Stock et flux ensemble -----------------------------------------------*/

describe('la valeur estimée depuis le dernier relevé', () => {
  const valuations = [
    makeSavingValuation({ id: 'v', supportId: 's-pea', amount: eur(1832000), date: '2026-08-08' }),
  ]

  it('ajoute au relevé les mouvements confirmés postérieurs', () => {
    const entries = [
      makeEntry({ id: 'a', savingSupportId: 's-pea', date: '2026-08-10', amount: eur(30000) }),
    ]
    expect(supportValue('s-pea', valuations, entries, '2026-08-20')).toEqual({
      known: 1832000,
      knownOn: '2026-08-08',
      movedSince: 30000,
      estimated: 1862000,
    })
  })

  /* Un versement du jour même est déjà dans le chiffre qu'on vient de relever :
     le compter en plus le doublerait. */
  it('ignore ce qui est daté du relevé lui-même', () => {
    const entries = [
      makeEntry({ id: 'a', savingSupportId: 's-pea', date: '2026-08-08', amount: eur(30000) }),
    ]
    expect(supportValue('s-pea', valuations, entries, '2026-08-20').movedSince).toBe(0)
  })

  it('ignore une échéance encore prévue', () => {
    const entries = [
      makeEntry({
        id: 'a',
        savingSupportId: 's-pea',
        date: '2026-08-10',
        amount: eur(30000),
        status: 'planned',
      }),
    ]
    expect(supportValue('s-pea', valuations, entries, '2026-08-20').movedSince).toBe(0)
  })

  it('retranche une reprise', () => {
    const entries = [
      makeEntry({
        id: 'a',
        savingSupportId: 's-pea',
        direction: 'in',
        date: '2026-08-10',
        amount: eur(60000),
      }),
    ]
    expect(supportValue('s-pea', valuations, entries, '2026-08-20').estimated).toBe(1772000)
  })

  /* Sans relevé, les mouvements ne font pas une valeur : on saurait ce qu'on a
     versé, pas ce qu'on possède. */
  it('ne devine aucune valeur faute de relevé', () => {
    const entries = [
      makeEntry({ id: 'a', savingSupportId: 's-livret', date: '2026-08-10', amount: eur(30000) }),
    ]
    expect(supportValue('s-livret', [], entries, '2026-08-20')).toEqual({
      known: null,
      knownOn: null,
      movedSince: 0,
      estimated: null,
    })
  })

  /* Un relevé n'est pas un mouvement : il n'apparaît nulle part dans les flux
     du support, et n'a donc aucun effet sur le mois. */
  it('n’ajoute aucun mouvement au support', () => {
    expect(supportMonthFlows([], 's-pea', '2026-08')).toEqual({
      contributions: 0,
      withdrawals: 0,
      net: 0,
    })
  })
})

/* --- La ventilation du mois -----------------------------------------------*/

describe('où va l’épargne du mois', () => {
  const month = [
    makeEntry({ id: 'a', categoryId: 'salaire', direction: 'in', date: '2026-07-01', amount: eur(200000) }),
    makeEntry({ id: 'b', categoryId: 'loyer', date: '2026-07-05', amount: eur(80000) }),
    makeEntry({
      id: 'c',
      categoryId: 'passbook',
      savingSupportId: 's-livret',
      date: '2026-07-10',
      amount: eur(15000),
    }),
    makeEntry({
      id: 'd',
      categoryId: 'plans',
      savingSupportId: 's-pea',
      date: '2026-07-10',
      amount: eur(30000),
    }),
    makeEntry({
      id: 'e',
      categoryId: 'passbook',
      savingSupportId: 's-livret',
      date: '2026-07-25',
      amount: eur(5000),
    }),
  ]

  it('groupe par support, du plus gros au plus petit', () => {
    const slices = savingsBySupport(month, '2026-07', kindOf)
    expect(slices.map((s) => s.supportId)).toEqual(['s-pea', 's-livret'])
    expect(slices.map((s) => s.total)).toEqual([30000, 20000])
  })

  /* Ce que la catégorie seule ne savait pas dire : deux personnes ont chacune
     leur « Livret A », sous la même catégorie et sur deux comptes distincts. */
  it('sépare deux supports de même catégorie', () => {
    const shared = [
      makeEntry({ id: 'x', categoryId: 'passbook', savingSupportId: 's-alix', date: '2026-07-10', amount: eur(30000) }),
      makeEntry({ id: 'y', categoryId: 'passbook', savingSupportId: 's-marie', date: '2026-07-10', amount: eur(20000) }),
    ]
    expect(savingsBySupport(shared, '2026-07', kindOf).map((s) => s.supportId)).toEqual([
      's-alix',
      's-marie',
    ])
  })

  it('donne à chaque support sa part du versé, pas du mois', () => {
    expect(savingsBySupport(month, '2026-07', kindOf)[0]?.share).toBeCloseTo(0.6, 5)
  })

  it('ne rend rien quand le mois ne place rien', () => {
    const plain = month.filter((e) => kindOf(e.categoryId) !== 'saving')
    expect(savingsBySupport(plain, '2026-07', kindOf)).toEqual([])
  })

  it('compte en net, comme partout', () => {
    const withdrawn = [
      ...month,
      makeEntry({
        id: 'f',
        categoryId: 'passbook',
        savingSupportId: 's-livret',
        direction: 'in',
        date: '2026-07-15',
        amount: eur(60000),
      }),
    ]
    const slices = savingsBySupport(withdrawn, '2026-07', kindOf)
    expect(slices.find((s) => s.supportId === 's-livret')?.total).toBe(-40000)
  })

  it('retire un support autant repris que reconstitué : il n’a rien reçu', () => {
    const wash = [
      makeEntry({ id: 'x', categoryId: 'passbook', savingSupportId: 's-livret', date: '2026-07-10', amount: eur(60000) }),
      makeEntry({
        id: 'y',
        categoryId: 'passbook',
        savingSupportId: 's-livret',
        direction: 'in',
        date: '2026-07-15',
        amount: eur(60000),
      }),
    ]
    expect(savingsBySupport(wash, '2026-07', kindOf)).toEqual([])
  })

  /* Un document d'avant les supports en a forcément : les taire ferait une
     ventilation dont la somme ne vaudrait plus le versé du mois. */
  it('range sous une clef à part ce qui ne désigne aucun support', () => {
    const legacy = [
      makeEntry({ id: 'x', categoryId: 'passbook', date: '2026-07-10', amount: eur(25000) }),
    ]
    expect(savingsBySupport(legacy, '2026-07', kindOf)).toEqual([
      { supportId: UNLINKED_SUPPORT, total: 25000, share: 1 },
    ])
  })
})

/* --- Ce qu'un support retient ---------------------------------------------*/

describe('ce qui empêche de supprimer un support', () => {
  const empty = { savingValuations: [], entries: [], recurrences: [], advances: [] }

  it('laisse partir un support qui n’a rien derrière lui', () => {
    expect(isSupportEmpty(supportUsage('s-livret', empty))).toBe(true)
  })

  it('retient un support qui porte un relevé', () => {
    const usage = supportUsage('s-livret', {
      ...empty,
      savingValuations: [makeSavingValuation({ id: 'v', supportId: 's-livret' })],
    })
    expect(usage.valuations).toBe(1)
    expect(isSupportEmpty(usage)).toBe(false)
  })

  it('retient un support qui porte un mouvement', () => {
    const usage = supportUsage('s-livret', {
      ...empty,
      entries: [makeEntry({ id: 'e', savingSupportId: 's-livret', date: '2026-08-01' })],
    })
    expect(isSupportEmpty(usage)).toBe(false)
  })

  /* Archiver un support qui reçoit encore 300 € par mois ferait un compte
     invisible qui grossit tout seul : l'écran doit pouvoir le dire. */
  it('compte à part les règles encore actives', () => {
    const usage = supportUsage(
      's-livret',
      {
        ...empty,
        recurrences: [
          makeRecurrence({
            id: 'r1',
            savingSupportId: 's-livret',
            period: { unit: 'month', every: 1, anchorDay: 1 },
          }),
          makeRecurrence({
            id: 'r2',
            savingSupportId: 's-livret',
            endedOn: '2026-01-31',
            period: { unit: 'month', every: 1, anchorDay: 1 },
          }),
        ],
      },
      '2026-08-08',
    )
    expect(usage.recurrences).toBe(2)
    expect(usage.runningRecurrences).toBe(1)
  })
})

describe('lectures élémentaires', () => {
  const archived = makeSavingSupport({ id: 's-vieux', memberId: 'm1', archived: true })

  it('ne propose plus un support archivé', () => {
    expect(activeSupports([livret, archived]).map((s) => s.id)).toEqual(['s-livret'])
  })

  it('rend les supports d’une personne', () => {
    const other = makeSavingSupport({ id: 's-marie', memberId: 'm2' })
    expect(supportsOfMember([livret, other], 'm2').map((s) => s.id)).toEqual(['s-marie'])
  })
})
