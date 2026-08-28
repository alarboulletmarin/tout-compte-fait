/* ============================================================================
 * Ce que la lecture d'un document écarte, répare, et dit avoir fait.
 *
 * Les deux vont ensemble : rien ne vérifiait les liens, et rien ne racontait
 * les lignes perdues — or un import remplace tout le document, donc c'est le
 * seul moment où l'on peut encore comparer avec ce qu'il y avait avant.
 * ==========================================================================*/

import { describe, expect, it } from 'vitest'
import {
  makeAdvance,
  makeCategory,
  makeData,
  makeEntry,
  makeFamily,
  makeRecurrence,
  makeSavingSupport,
  makeSavingValuation,
} from '@/domain/fixtures'
import { kindOfCategory } from '@/domain/types'
import { repairedCategory } from './defaults'
import { type ImportNotice, normalizeDocument } from './validate'

/** Le document tel qu'il part à l'export, en JSON brut. */
const raw = (data: unknown): unknown => JSON.parse(JSON.stringify(data))

const reasons = (notices: readonly ImportNotice[]): string[] => notices.map((n) => n.reason)

/** Un foyer minimal mais cohérent : tous ses liens mènent quelque part. */
function sound() {
  return makeData({
    household: { name: 'Maison', members: [{ id: 'm1', name: 'Alix', color: 'c' }] },
    families: [makeFamily({ id: 'fam-leisure' })],
    categories: [makeCategory({ id: 'courses' })],
    recurrences: [
      makeRecurrence({
        id: 'r1',
        categoryId: 'courses',
        memberId: 'm1',
        period: { unit: 'month', every: 1, anchorDay: 5 },
      }),
    ],
    entries: [
      makeEntry({
        id: 'e1',
        categoryId: 'courses',
        memberId: 'm1',
        recurrenceId: 'r1',
        date: '2026-07-05',
      }),
    ],
  })
}

describe('un document cohérent', () => {
  it('traverse la lecture sans une réparation ni un mot', () => {
    const { data, notices } = normalizeDocument(raw(sound()))
    expect(notices).toEqual([])
    expect(data).toStrictEqual(sound())
  })
})

describe('ce que la lecture écarte', () => {
  it('nomme la ligne, son rang et la raison', () => {
    const document = raw(sound()) as Record<string, unknown>
    const { data, notices } = normalizeDocument({
      ...document,
      entries: [
        ...(document['entries'] as unknown[]),
        { id: 'e2', label: 'Courses', categoryId: 'courses', amount: 12.5, date: '2026-07-06' },
      ],
    })

    expect(data.entries).toHaveLength(1)
    expect(notices).toEqual([
      { kind: 'discarded', collection: 'entries', index: 1, reason: 'amount', label: 'Courses' },
    ])
  })

  it('se rabat sur le rang quand la ligne n’a pas de nom lisible', () => {
    const { notices } = normalizeDocument({ debts: [{ id: 'd1' }] })
    expect(notices).toEqual([
      { kind: 'discarded', collection: 'debts', index: 0, reason: 'principal' },
    ])
  })

  it('dit chaque ligne, pas seulement la première', () => {
    const { notices } = normalizeDocument({
      entries: [{ amount: 1.5, date: '2026-07-05' }, 'pas un objet', { amount: 100 }],
    })
    expect(reasons(notices)).toEqual(['amount', 'shape', 'date'])
  })
})

describe('les liens qui ne mènent nulle part', () => {
  it('range une catégorie inconnue dans « À ranger », plutôt que de la taire', () => {
    /* Le repli silencieux de `kindOfCategory` en faisait une charge, donc une
       dépense commune et partagée entre les membres. */
    const document = raw(makeData({ entries: [makeEntry({ id: 'e1', date: '2026-07-05' })] }))
    const { data, notices } = normalizeDocument(document)

    const entry = data.entries[0]
    expect(entry?.categoryId).toBe(repairedCategory('out').id)
    expect(data.categories.map((c) => c.id)).toContain(repairedCategory('out').id)
    expect(notices).toEqual([
      { kind: 'repaired', collection: 'entries', index: 0, reason: 'unknownCategory', label: 'Entrée' },
    ])
    // La nature ne change pas : c'est la même famille d'accueil qu'avant.
    expect(kindOfCategory(data.families, data.categories, entry?.categoryId ?? '')).toBe('charge')
  })

  it('n’ajoute la catégorie de réparation que si elle sert', () => {
    const { data } = normalizeDocument(raw(sound()))
    expect(data.categories.map((c) => c.id)).not.toContain(repairedCategory('out').id)
  })

  it('rend au foyer une entrée dont le membre n’existe pas', () => {
    const document = raw(
      makeData({
        categories: [makeCategory({ id: 'courses' })],
        entries: [makeEntry({ id: 'e1', categoryId: 'courses', memberId: 'fantôme', date: '2026-07-05' })],
      }),
    )
    const { data, notices } = normalizeDocument(document)

    // Elle disparaissait de toutes les vues filtrées tout en pesant sur le
    // foyer : la somme des mois de chacun cessait de valoir celui du foyer.
    expect(data.entries[0]).not.toHaveProperty('memberId')
    expect(reasons(notices)).toEqual(['unknownMember'])
  })

  it('coupe le « réglé par » qui ne désigne personne, et garde l’autre', () => {
    const document = raw(
      makeData({
        household: { name: '', members: [{ id: 'm-1', name: 'Alix', color: 'c' }, { id: 'm-2', name: 'Camille', color: 'c' }] },
        categories: [makeCategory({ id: 'courses' })],
        entries: [
          makeEntry({ id: 'e1', categoryId: 'courses', memberId: 'm-2', paidById: 'fantôme', date: '2026-07-05' }),
          makeEntry({ id: 'e2', categoryId: 'courses', memberId: 'm-2', paidById: 'm-1', date: '2026-07-06' }),
        ],
      }),
    )
    const { data, notices } = normalizeDocument(document)

    // Réglée par quelqu'un qui n'est plus du foyer : le lien se coupe, la
    // ligne reste — même geste que le membre.
    expect(data.entries[0]).not.toHaveProperty('paidById')
    expect(data.entries[1]?.paidById).toBe('m-1')
    expect(reasons(notices)).toEqual(['unknownMember'])
  })

  it('ne garde pas un « réglé par » égal au membre : une exception, jamais une copie', () => {
    const document = raw(
      makeData({
        household: { name: '', members: [{ id: 'm-1', name: 'Alix', color: 'c' }] },
        categories: [makeCategory({ id: 'courses' })],
        entries: [
          makeEntry({ id: 'e1', categoryId: 'courses', memberId: 'm-1', paidById: 'm-1', date: '2026-07-05' }),
        ],
      }),
    )
    const { data, notices } = normalizeDocument(document)

    expect(data.entries[0]).not.toHaveProperty('paidById')
    expect(notices).toEqual([])
  })

  it('coupe le lien d’une entrée vers une récurrence absente', () => {
    const document = raw(
      makeData({
        categories: [makeCategory({ id: 'courses' })],
        entries: [
          makeEntry({ id: 'e1', categoryId: 'courses', recurrenceId: 'r-parti', date: '2026-07-05' }),
        ],
      }),
    )
    const { data, notices } = normalizeDocument(document)

    expect(data.entries[0]).not.toHaveProperty('recurrenceId')
    expect(reasons(notices)).toEqual(['unknownRecurrence'])
  })

  it('délie un crédit de la mensualité qui n’existe plus', () => {
    const { data, notices } = normalizeDocument({
      categories: [makeCategory({ id: 'car-loan' })],
      debts: [
        { id: 'd1', label: 'Auto', categoryId: 'car-loan', principal: 1_200_000, recurrenceId: 'r-parti' },
      ],
    })
    expect(data.debts[0]).not.toHaveProperty('recurrenceId')
    expect(reasons(notices)).toEqual(['unknownRecurrence'])
  })

  /* Une avance dont le porteur n'existe pas ne se répare pas : `memberId` n'est
     pas facultatif, et lui en inventer un attribuerait à quelqu'un une épargne
     qu'il n'a pas reprise. */
  it('écarte une avance dont le porteur n’existe pas', () => {
    const { data, notices } = normalizeDocument({
      advances: [
        {
          id: 'av1',
          label: 'Assurance',
          categoryId: 'car-insurance',
          memberId: 'fantôme',
          amount: 60_000,
          paidOn: '2026-01-15',
          from: '2026-01',
          to: '2026-12',
        },
      ],
    })
    expect(data.advances).toEqual([])
    expect(notices).toEqual([
      { kind: 'discarded', collection: 'advances', index: 0, reason: 'unknownMember', label: 'Assurance' },
    ])
  })

  it('rattache une catégorie dont la famille a disparu', () => {
    const { data, notices } = normalizeDocument({
      families: [makeFamily({ id: 'fam-leisure' })],
      categories: [makeCategory({ id: 'courses', familyId: 'fam-partie' })],
    })
    expect(data.categories[0]?.familyId).toBe('fam-leisure')
    expect(reasons(notices)).toEqual(['unknownFamily'])
  })
})

describe('identifiants en double', () => {
  /* Le doublon est renommé, jamais supprimé : rien ne dit laquelle des deux
     lignes est la bonne, et en jeter une perdrait une dépense. */
  it('renomme le second au lieu de le perdre', () => {
    const { data, notices } = normalizeDocument({
      categories: [makeCategory({ id: 'courses' })],
      entries: [
        { id: 'e1', label: 'Un', categoryId: 'courses', amount: 100, date: '2026-07-05' },
        { id: 'e1', label: 'Deux', categoryId: 'courses', amount: 200, date: '2026-07-06' },
      ],
    })
    expect(data.entries.map((e) => e.id)).toEqual(['e1', 'e1~2'])
    expect(data.entries.map((e) => e.label)).toEqual(['Un', 'Deux'])
    expect(reasons(notices)).toEqual(['duplicateId'])
  })

  it('rend deux lectures du même fichier identiques', () => {
    const document = {
      categories: [makeCategory({ id: 'courses' })],
      entries: [
        { id: 'e1', categoryId: 'courses', amount: 100, date: '2026-07-05' },
        { id: 'e1', categoryId: 'courses', amount: 200, date: '2026-07-06' },
        { id: 'e1', categoryId: 'courses', amount: 300, date: '2026-07-07' },
      ],
    }
    expect(normalizeDocument(document).data).toStrictEqual(normalizeDocument(document).data)
    expect(normalizeDocument(document).data.entries.map((e) => e.id)).toEqual([
      'e1',
      'e1~2',
      'e1~3',
    ])
  })

  /* Un mois ouvert deux fois est une redite, pas une donnée : personne ne l'a
     saisi, et le second n'apporte rien que le premier n'ait déjà. */
  it('écarte un mois ouvert deux fois', () => {
    const { data, notices } = normalizeDocument({
      months: [
        { ym: '2026-07', openedAt: '2026-07-01' },
        { ym: '2026-07', openedAt: '2026-07-09' },
      ],
    })
    expect(data.months).toHaveLength(1)
    expect(data.months[0]?.openedAt).toBe('2026-07-01')
    expect(reasons(notices)).toEqual(['duplicateId'])
  })
})

/* ============================================================================
 * Les supports d'épargne et leurs valorisations.
 *
 * Trois liens à tenir : un support pointe vers un membre et vers une catégorie
 * d'épargne, une valorisation pointe vers un support, et une ligne d'épargne
 * pointe vers le support qu'elle alimente. Chacun a sa réparation, et le plus
 * doux qui règle le cas.
 * ==========================================================================*/
describe('les supports d’épargne', () => {
  const savings = () =>
    makeData({
      household: { name: '', members: [{ id: 'm1', name: 'Alix', color: 'c' }] },
      families: [makeFamily({ id: 'fam-savings', kind: 'saving' }), makeFamily({ id: 'fam-leisure' })],
      categories: [
        makeCategory({ id: 'passbook', familyId: 'fam-savings' }),
        makeCategory({ id: 'outings', familyId: 'fam-leisure' }),
      ],
      savingSupports: [makeSavingSupport({ id: 's1', memberId: 'm1', categoryId: 'passbook' })],
      savingValuations: [makeSavingValuation({ id: 'v1', supportId: 's1' })],
    })

  it('traverse la lecture sans une réparation quand tout se tient', () => {
    const { data, notices } = normalizeDocument(raw(savings()))
    expect(notices).toEqual([])
    expect(data.savingSupports).toHaveLength(1)
    expect(data.savingValuations).toHaveLength(1)
  })

  /* Une épargne est toujours à quelqu'un : lui inventer un porteur
     attribuerait à une personne un compte qui n'est pas le sien. C'est la
     règle des avances, au même endroit et pour la même raison. */
  it('écarte un support dont le porteur n’existe pas, et ses relevés avec lui', () => {
    const document = raw(
      makeData({
        ...savings(),
        savingSupports: [makeSavingSupport({ id: 's1', memberId: 'fantôme' })],
      }),
    )
    const { data, notices } = normalizeDocument(document)
    expect(data.savingSupports).toEqual([])
    expect(data.savingValuations).toEqual([])
    expect(reasons(notices)).toEqual(['unknownMember', 'unknownSupport'])
  })

  /* Le rôle décide de ce que l'autonomie divise : un rôle abîmé qui
     retomberait sur « précaution » ferait entrer un plan d'actions dans la
     réserve de secours, sans que personne l'ait dit. Il devient donc absent,
     et l'absence n'a pas de valeur de repli. */
  it('retire un rôle illisible plutôt que de le ramener à un défaut', () => {
    const document = raw(makeData(savings())) as Record<string, unknown>
    document['savingSupports'] = [
      { ...makeSavingSupport({ id: 's1', memberId: 'm1', categoryId: 'passbook' }), role: 'coussin' },
    ]
    const { data } = normalizeDocument(document)
    expect(data.savingSupports[0]).not.toHaveProperty('role')
  })

  it('garde un rôle connu tel quel', () => {
    const document = raw(
      makeData({
        ...savings(),
        savingSupports: [
          makeSavingSupport({ id: 's1', memberId: 'm1', categoryId: 'passbook', role: 'growth' }),
        ],
      }),
    )
    const { data } = normalizeDocument(document)
    expect(data.savingSupports[0]?.role).toBe('growth')
  })

  it('écarte un support que personne ne porte du tout', () => {
    const { memberId: _dropped, ...orphan } = makeSavingSupport({ id: 's1', memberId: 'm1' })
    const document = raw(makeData(savings())) as Record<string, unknown>
    document['savingSupports'] = [orphan]
    const { data, notices } = normalizeDocument(document)
    expect(data.savingSupports).toEqual([])
    expect(reasons(notices)).toContain('noMember')
  })

  /* La catégorie ne dit que la nature du compte : la perdre ne justifie pas de
     perdre le compte, qui porte des relevés et des mouvements. */
  it('redirige un support vers une catégorie d’épargne quand la sienne n’en est pas une', () => {
    const document = raw(
      makeData({
        ...savings(),
        savingSupports: [makeSavingSupport({ id: 's1', memberId: 'm1', categoryId: 'outings' })],
      }),
    )
    const { data, notices } = normalizeDocument(document)
    expect(data.savingSupports[0]?.categoryId).toBe('passbook')
    expect(reasons(notices)).toEqual(['unknownCategory'])
  })

  /* Une valorisation orpheline ne décrit rien : le compte qu'elle photographie
     n'existe pas, et rien ne permettrait de la rattacher à un autre. */
  it('écarte une valorisation qui ne désigne aucun support', () => {
    const document = raw(
      makeData({
        ...savings(),
        savingValuations: [makeSavingValuation({ id: 'v1', supportId: 's-parti' })],
      }),
    )
    const { data, notices } = normalizeDocument(document)
    expect(data.savingValuations).toEqual([])
    expect(reasons(notices)).toEqual(['unknownSupport'])
  })

  /* Un palier orphelin ne qualifie rien : le compte auquel il prêtait un taux
     n'existe pas. La même règle qu'une valorisation, et non celle du lien
     coupé — un taux sans support ne vaut plus rien du tout. */
  it('écarte un palier de taux qui ne désigne aucun support', () => {
    const document = raw(makeData(savings())) as Record<string, unknown>
    document['savingRates'] = [
      { id: 'tx1', supportId: 's-parti', rateBp: 250, kind: 'assumed', from: '2026-01-01' },
    ]
    const { data, notices } = normalizeDocument(document)
    expect(data.savingRates).toEqual([])
    expect(reasons(notices)).toEqual(['unknownSupport'])
  })

  /* Un taux illisible ne se remplace pas par zéro : zéro est une hypothèse
     qu'on peut poser volontairement — un compte courant —, et l'inventer à la
     place d'un champ abîmé ferait dire à l'app ce qu'elle ne sait pas. */
  it('écarte un palier au taux illisible, garde un zéro', () => {
    const document = raw(makeData(savings())) as Record<string, unknown>
    document['savingRates'] = [
      { id: 'tx1', supportId: 's1', rateBp: 2.5, kind: 'assumed', from: '2026-01-01' },
      { id: 'tx2', supportId: 's1', rateBp: 20_000, kind: 'assumed', from: '2026-01-01' },
      { id: 'tx3', supportId: 's1', rateBp: 0, kind: 'assumed', from: '2026-01-01' },
    ]
    const { data, notices } = normalizeDocument(document)
    expect(data.savingRates.map((rate) => rate.id)).toEqual(['tx3'])
    expect(reasons(notices)).toEqual(['rate', 'rate'])
  })

  it('écarte un palier sans date lisible, et lit toute nature inconnue en hypothèse', () => {
    const document = raw(makeData(savings())) as Record<string, unknown>
    document['savingRates'] = [
      { id: 'tx1', supportId: 's1', rateBp: 250, kind: 'assumed', from: '2026-02-30' },
      { id: 'tx2', supportId: 's1', rateBp: 250, kind: 'sûr', from: '2026-01-01' },
    ]
    const { data, notices } = normalizeDocument(document)
    expect(data.savingRates.map((rate) => rate.id)).toEqual(['tx2'])
    expect(data.savingRates[0]?.kind).toBe('assumed')
    expect(reasons(notices)).toEqual(['date'])
  })

  /* Un montant illisible n'est pas une observation. Zéro, en revanche, en est
     une — un livret vidé —, et il passe. */
  it('écarte une valorisation sans montant lisible, garde un zéro', () => {
    const document = raw(makeData(savings())) as Record<string, unknown>
    document['savingValuations'] = [
      { id: 'v1', supportId: 's1', amount: 'beaucoup', date: '2026-08-08' },
      { id: 'v2', supportId: 's1', amount: 0, date: '2026-08-09' },
    ]
    const { data, notices } = normalizeDocument(document)
    expect(data.savingValuations.map((v) => v.id)).toEqual(['v2'])
    expect(reasons(notices)).toEqual(['amount'])
  })

  /* Le lien d'une ligne vers un support disparu se **coupe**, comme celui d'un
     membre ou d'une règle : la ligne reste, à son montant et à sa date. */
  it('coupe le lien d’une entrée vers un support absent, sans toucher au montant', () => {
    const document = raw(
      makeData({
        ...savings(),
        savingSupports: [],
        savingValuations: [],
        entries: [
          makeEntry({
            id: 'e1',
            categoryId: 'passbook',
            savingSupportId: 's-parti',
            date: '2026-08-05',
          }),
        ],
      }),
    )
    const { data, notices } = normalizeDocument(document)
    expect(data.entries[0]).not.toHaveProperty('savingSupportId')
    expect(data.entries[0]?.amount).toBe(1000)
    expect(reasons(notices)).toEqual(['unknownSupport'])
  })

  it('coupe aussi celui d’une récurrence et d’une avance', () => {
    const document = raw(
      makeData({
        ...savings(),
        savingSupports: [],
        savingValuations: [],
        recurrences: [
          makeRecurrence({
            id: 'r1',
            categoryId: 'passbook',
            savingSupportId: 's-parti',
            period: { unit: 'month', every: 1, anchorDay: 1 },
          }),
        ],
        advances: [
          makeAdvance({ id: 'av1', categoryId: 'outings', memberId: 'm1', savingSupportId: 's-parti' }),
        ],
      }),
    )
    const { data } = normalizeDocument(document)
    expect(data.recurrences[0]).not.toHaveProperty('savingSupportId')
    expect(data.advances[0]).not.toHaveProperty('savingSupportId')
  })

  it('renomme un support en double plutôt que d’en perdre un', () => {
    const document = raw(
      makeData({
        ...savings(),
        savingSupports: [
          makeSavingSupport({ id: 's1', memberId: 'm1', categoryId: 'passbook' }),
          makeSavingSupport({ id: 's1', memberId: 'm1', categoryId: 'passbook', label: 'PEA' }),
        ],
      }),
    )
    const { data, notices } = normalizeDocument(document)
    expect(data.savingSupports.map((s) => s.id)).toEqual(['s1', 's1~2'])
    expect(reasons(notices)).toContain('duplicateId')
  })
})
