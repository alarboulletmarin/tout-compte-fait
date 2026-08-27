import { describe, expect, it } from 'vitest'
import { today, ymOf } from './date'
import type { Entry } from './types'
import {
  eur,
  makeAdvance,
  makeCategory,
  makeData,
  makeDebt,
  makeEntry,
  makeMember,
  makeRecurrence,
  makeSavingSupport,
  makeSavingValuation,
  sequentialIds,
} from './fixtures'
import {
  addEntry,
  addMember,
  addSavingValuation,
  applyEntryEditToRule,
  archiveCategory,
  archiveSavingSupport,
  confirmEntries,
  confirmEntry,
  confirmOccurrence,
  convertEntryToRecurrence,
  convertRecurrenceToEntry,
  convertsToSingleEntry,
  createAdvance,
  createSavingSupport,
  openMonth,
  removeMember,
  removeRecurrence,
  removeSavingSupport,
  renameMember,
  replaceEntry,
  replaceRecurrence,
  resumeRecurrence,
  setHouseholdName,
  stopRecurrence,
  stopSupportRecurrences,
  syncRecurrenceEntries,
  unconfirmEntries,
  updateRecurrence,
  updateSettings,
} from './updates'

describe('foyer et membres', () => {
  it('renomme le foyer sans toucher au reste', () => {
    const before = makeData({ entries: [makeEntry({ date: '2026-07-01' })] })
    const after = setHouseholdName(before, 'Chez nous')
    expect(after.household.name).toBe('Chez nous')
    expect(after.entries).toBe(before.entries)
  })

  it('ajoute un membre', () => {
    const after = addMember(makeData(), { id: 'm1', name: 'Alix', color: 'c' })
    expect(after.household.members).toHaveLength(1)
  })

  it('retirer un membre libère ses entrées au lieu de les perdre', () => {
    const before = makeData({
      household: { name: 'Maison', members: [{ id: 'm1', name: 'Alix', color: 'c' }] },
      entries: [
        makeEntry({ id: 'e1', date: '2026-07-01', memberId: 'm1' }),
        makeEntry({ id: 'e2', date: '2026-07-02', memberId: 'm2' }),
      ],
      recurrences: [
        makeRecurrence({
          id: 'r1',
          memberId: 'm1',
          period: { unit: 'month', every: 1, anchorDay: 1 },
        }),
      ],
    })
    const after = removeMember(before, 'm1')
    expect(after.household.members).toEqual([])
    expect(after.entries).toHaveLength(2)
    expect(after.entries[0]).not.toHaveProperty('memberId')
    expect(after.entries[1]?.memberId).toBe('m2')
    expect(after.recurrences[0]).not.toHaveProperty('memberId')
  })

  /* `Advance.memberId` n'est pas facultatif : faute de pouvoir la détacher, on
     la retirait de fait sans le faire — l'avance gardait l'identifiant d'un
     membre disparu, et l'écran d'épargne cherchait un porteur introuvable. */
  it('emporte les avances du membre retiré, qui ne peuvent être à personne', () => {
    const before = makeData({
      household: { name: 'Maison', members: [makeMember({ id: 'm1' }), makeMember({ id: 'm2' })] },
      advances: [
        makeAdvance({ id: 'av1', memberId: 'm1' }),
        makeAdvance({ id: 'av2', memberId: 'm2' }),
      ],
    })
    const after = removeMember(before, 'm1')
    expect(after.advances.map((a) => a.id)).toEqual(['av2'])
  })

  /* La récurrence qui reconstitue le livret reste, comme après `removeAdvance` :
     ce qui est déjà revenu y est revenu. Elle repasse simplement au foyer. */
  it('garde la récurrence de l’avance, rendue au foyer', () => {
    const before = makeData({
      household: { name: 'Maison', members: [makeMember({ id: 'm1' })] },
      advances: [makeAdvance({ id: 'av1', memberId: 'm1', recurrenceId: 'r1' })],
      recurrences: [
        makeRecurrence({
          id: 'r1',
          memberId: 'm1',
          period: { unit: 'month', every: 1, anchorDay: 15 },
        }),
      ],
      entries: [makeEntry({ id: 'e1', recurrenceId: 'r1', date: '2026-02-15', memberId: 'm1' })],
    })
    const after = removeMember(before, 'm1')
    expect(after.recurrences).toHaveLength(1)
    expect(after.recurrences[0]).not.toHaveProperty('memberId')
    expect(after.entries).toHaveLength(1)
  })

  it('renomme un membre sans toucher aux autres', () => {
    const before = makeData({
      household: { name: 'Maison', members: [makeMember({ id: 'm1' }), makeMember({ id: 'm2' })] },
      entries: [makeEntry({ date: '2026-07-01' })],
    })
    const after = renameMember(before, 'm1', 'Alix')
    expect(after.household.members[0]?.name).toBe('Alix')
    expect(after.household.members[1]).toBe(before.household.members[1])
    expect(after.entries).toBe(before.entries)
  })
})

describe('échéance payée d’avance', () => {
  const monthly = makeRecurrence({
    id: 'r1',
    amount: eur(1399),
    startedOn: '2026-07-31',
    period: { unit: 'month', every: 1, anchorDay: 31 },
  })

  it('confirme l’échéance déjà posée par la synchronisation', () => {
    const opened = makeData({
      recurrences: [monthly],
      months: [{ ym: '2026-07', openedAt: '2026-07-01', closed: false }],
    })
    const planned = syncRecurrenceEntries(opened, 'r1', sequentialIds(), '2026-07-01')
    const after = confirmOccurrence(planned, 'r1', '2026-07-31', sequentialIds('bis'))

    const july = after.entries.filter((e) => e.date === '2026-07-31')
    expect(july).toHaveLength(1)
    expect(july[0]?.status).toBe('confirmed')
  })

  it('crée l’échéance quand son mois n’a jamais été ouvert', () => {
    const before = makeData({ recurrences: [monthly] })
    const after = confirmOccurrence(before, 'r1', '2026-07-31', sequentialIds())

    expect(after.entries).toHaveLength(1)
    expect(after.entries[0]).toMatchObject({
      recurrenceId: 'r1',
      date: '2026-07-31',
      status: 'confirmed',
      amount: 1399,
    })
  })

  it('ne fabrique rien pour une récurrence inconnue', () => {
    const before = makeData({ recurrences: [monthly] })
    expect(confirmOccurrence(before, 'inconnue', '2026-07-31', sequentialIds())).toBe(before)
  })
})

describe('poser une avance', () => {
  const support = makeSavingSupport({ id: 's-livret', memberId: 'm1', categoryId: 'passbook' })
  const base = makeData({ savingSupports: [support] })
  const input = {
    label: 'Assurance auto',
    categoryId: 'car-insurance',
    savingSupportId: 's-livret',
    memberId: 'm1',
    amount: eur(60000),
    paidOn: '2026-01-15',
    from: '2026-01',
    to: '2026-12',
  }

  it('pose la reprise, la récurrence qui la rend, et l’avance', () => {
    const { data, advance } = createAdvance(base, input, sequentialIds(), '2026-01-15')
    expect(data.advances).toEqual([advance])
    expect(data.recurrences).toHaveLength(1)
    // La reprise part confirmée : l'argent est déjà sorti du livret.
    expect(data.entries.some((e) => e.direction === 'in' && e.status === 'confirmed')).toBe(true)
  })

  /* Tout ce que l'avance produit pointe vers le même compte, par identifiant :
     la reprise, la récurrence de reconstitution et l'avance elle-même. C'est
     l'invariant qui empêche une avance de vider un livret et d'en remplir un
     autre. */
  it('relie la reprise, la récurrence et l’avance au même support', () => {
    const { data, advance } = createAdvance(base, input, sequentialIds(), '2026-01-15')
    expect(advance.savingSupportId).toBe('s-livret')
    expect(data.recurrences[0]?.savingSupportId).toBe('s-livret')
    expect(data.entries.every((e) => e.savingSupportId === 's-livret')).toBe(true)
  })

  /* La catégorie du mouvement se lit sur le support, elle ne se saisit pas :
     deux réponses pour un seul fait finiraient par se contredire. */
  it('prend la catégorie du support pour la reprise et les mensualités', () => {
    const { data } = createAdvance(base, input, sequentialIds(), '2026-01-15')
    expect(data.recurrences[0]?.categoryId).toBe('passbook')
    expect(data.entries.every((e) => e.categoryId === 'passbook')).toBe(true)
  })

  /* Une période à l'envers pose une récurrence qui s'arrête avant sa première
     mensualité : rien ne revient jamais sur le livret, et le reste dû ne bouge
     plus d'un centime sans que rien ne dise pourquoi. Le formulaire le
     refusait déjà, mais il n'est plus le seul appelant. */
  it('refuse une période qui se termine avant de commencer', () => {
    expect(() =>
      createAdvance(base, { ...input, from: '2026-12', to: '2026-01' }, sequentialIds()),
    ).toThrow(RangeError)
  })

  it('refuse un support qui n’existe pas', () => {
    expect(() =>
      createAdvance(base, { ...input, savingSupportId: 's-fantome' }, sequentialIds()),
    ).toThrow(RangeError)
  })

  it('accepte une avance d’un seul mois, bornes confondues', () => {
    const { advance } = createAdvance(
      base,
      { ...input, from: '2026-03', to: '2026-03' },
      sequentialIds(),
      '2026-03-15',
    )
    expect(advance.to).toBe('2026-03')
  })
})

describe('supports d’épargne', () => {
  const base = makeData({ household: { name: '', members: [makeMember({ id: 'm1' })] } })

  /* Le montant ne s'écrit jamais sur le support : il n'existe que comme
     valorisation. Un `currentAmount` mutable à côté serait une seconde vérité,
     et la première mise à jour les ferait diverger. */
  it('pose le support et sa première valorisation, jamais le montant deux fois', () => {
    const { data, support, valuation } = createSavingSupport(
      base,
      {
        label: 'Livret A',
        memberId: 'm1',
        categoryId: 'passbook',
        pace: 'yearly',
        value: { amount: eur(1245000), date: '2026-08-08' },
      },
      sequentialIds(),
    )
    expect(data.savingSupports).toEqual([support])
    expect(data.savingValuations).toEqual([valuation])
    expect(valuation?.amount).toBe(1245000)
    expect(Object.keys(support)).not.toContain('amount')
  })

  /* Sans montant, pas de valorisation : un capital inconnu n'est pas un capital
     à zéro, et poser un relevé à zéro dirait « ce livret est vide ». */
  it('ne pose aucune valorisation quand la valeur n’est pas connue', () => {
    const { data, valuation } = createSavingSupport(
      base,
      { label: 'PEA', memberId: 'm1', categoryId: 'plans', pace: 'quarterly' },
      sequentialIds(),
    )
    expect(valuation).toBeNull()
    expect(data.savingValuations).toEqual([])
  })

  it('empile les relevés plutôt que d’écraser le précédent', () => {
    const { data } = createSavingSupport(
      base,
      {
        label: 'Livret A',
        memberId: 'm1',
        categoryId: 'passbook',
        pace: 'yearly',
        value: { amount: eur(1000000), date: '2026-07-08' },
      },
      sequentialIds(),
    )
    const after = addSavingValuation(data, {
      id: 'v2',
      supportId: data.savingSupports[0]?.id ?? '',
      amount: eur(1065000),
      date: '2026-08-08',
    })
    expect(after.savingValuations).toHaveLength(2)
  })

  /* Un support supprimé ne laisse derrière lui ni relevé orphelin ni lien mort :
     les mouvements restent, détachés — c'est le geste de `removeRecurrence`. */
  it('emporte ses valorisations et coupe les liens, sans toucher aux montants', () => {
    const support = makeSavingSupport({ id: 's1', memberId: 'm1' })
    const before = makeData({
      savingSupports: [support],
      savingValuations: [makeSavingValuation({ id: 'v1', supportId: 's1' })],
      entries: [makeEntry({ id: 'e1', savingSupportId: 's1', date: '2026-08-01', amount: eur(30000) })],
    })
    const after = removeSavingSupport(before, 's1')
    expect(after.savingSupports).toEqual([])
    expect(after.savingValuations).toEqual([])
    expect(after.entries[0]?.amount).toBe(30000)
    expect(after.entries[0]?.savingSupportId).toBeUndefined()
  })

  it('archive sans rien perdre', () => {
    const before = makeData({ savingSupports: [makeSavingSupport({ id: 's1', memberId: 'm1' })] })
    const after = archiveSavingSupport(before, 's1')
    expect(after.savingSupports[0]?.archived).toBe(true)
  })

  /* Un compte archivé qui continue de recevoir un virement chaque mois est
     l'état incohérent qu'on refuse de créer. */
  it('arrête les règles encore actives d’un support', () => {
    const before = makeData({
      savingSupports: [makeSavingSupport({ id: 's1', memberId: 'm1' })],
      recurrences: [
        makeRecurrence({
          id: 'r1',
          savingSupportId: 's1',
          period: { unit: 'month', every: 1, anchorDay: 1 },
        }),
      ],
      entries: [
        makeEntry({
          id: 'e1',
          recurrenceId: 'r1',
          savingSupportId: 's1',
          date: '2026-09-01',
          status: 'planned',
        }),
      ],
    })
    const after = stopSupportRecurrences(before, 's1', '2026-08-08')
    expect(after.recurrences[0]?.endedOn).toBe('2026-08-08')
    expect(after.entries).toEqual([])
  })
})

describe('catégories', () => {
  it('archive plutôt que d’effacer', () => {
    const before = makeData({ categories: [makeCategory({ id: 'c1' })] })
    const after = archiveCategory(before, 'c1')
    expect(after.categories[0]?.archived).toBe(true)
    expect(after.categories).toHaveLength(1)
  })
})

describe('récurrences', () => {
  const base = makeData({
    recurrences: [
      makeRecurrence({ id: 'r1', period: { unit: 'month', every: 1, anchorDay: 5 } }),
    ],
    entries: [
      makeEntry({ id: 'passe', recurrenceId: 'r1', date: '2026-06-05', status: 'confirmed' }),
      makeEntry({ id: 'futur', recurrenceId: 'r1', date: '2026-08-05', status: 'planned' }),
    ],
  })

  it('arrête une récurrence et retire ses échéances seulement prévues', () => {
    const after = stopRecurrence(base, 'r1', '2026-07-15')
    expect(after.recurrences[0]?.endedOn).toBe('2026-07-15')
    expect(after.entries.map((e) => e.id)).toEqual(['passe'])
  })

  it('garde les échéances confirmées : elles ont eu lieu', () => {
    const after = stopRecurrence(base, 'r1', '2026-01-01')
    expect(after.entries.some((e) => e.id === 'passe')).toBe(true)
  })

  it('relance une récurrence arrêtée', () => {
    const stopped = stopRecurrence(base, 'r1', '2026-07-15')
    expect(resumeRecurrence(stopped, 'r1').recurrences[0]).not.toHaveProperty('endedOn')
  })

  it('supprime vraiment une récurrence sans aucune échéance confirmée', () => {
    const fresh = makeData({
      recurrences: [makeRecurrence({ id: 'r1', period: { unit: 'month', every: 1, anchorDay: 5 } })],
      entries: [makeEntry({ id: 'p', recurrenceId: 'r1', date: '2026-08-05', status: 'planned' })],
    })
    const after = removeRecurrence(fresh, 'r1')
    expect(after.recurrences).toEqual([])
    expect(after.entries).toEqual([])
  })

  /* Supprimer et arrêter sont deux gestes distincts : le premier ne se rabat
     jamais sur le second, sinon la règle reste dans la liste sous « Arrêtée »
     alors que l'écran vient d'annoncer qu'elle était supprimée. */
  it('supprime la règle même quand une échéance a été confirmée', () => {
    const after = removeRecurrence(base, 'r1')
    expect(after.recurrences).toEqual([])
  })

  it('détache les échéances confirmées au lieu de les perdre', () => {
    const after = removeRecurrence(base, 'r1')
    expect(after.entries.map((e) => e.id)).toEqual(['passe'])
    expect(after.entries[0]).not.toHaveProperty('recurrenceId')
  })

  it('retire le lien d’un crédit et d’une avance vers la règle disparue', () => {
    const linked = makeData({
      recurrences: [
        makeRecurrence({ id: 'r1', period: { unit: 'month', every: 1, anchorDay: 5 } }),
        makeRecurrence({ id: 'r2', period: { unit: 'month', every: 1, anchorDay: 8 } }),
      ],
      debts: [
        makeDebt({ id: 'd1', recurrenceId: 'r1' }),
        makeDebt({ id: 'd2', recurrenceId: 'r2' }),
      ],
      advances: [
        {
          id: 'a1',
          label: 'Assurance',
          categoryId: 'cat-1',
          memberId: 'm1',
          amount: eur(60000),
          paidOn: '2026-01-10',
          from: '2026-01',
          to: '2026-12',
          recurrenceId: 'r1',
        },
      ],
    })
    const after = removeRecurrence(linked, 'r1')
    expect(after.debts[0]).not.toHaveProperty('recurrenceId')
    expect(after.debts[1]?.recurrenceId).toBe('r2')
    expect(after.advances[0]).not.toHaveProperty('recurrenceId')
  })

  /* Le formulaire envoie l'état complet de ce qu'il montre : remettre un
     récurrence à « en commun » doit effacer le membre, pas le laisser. */
  it('rend la récurrence au foyer quand le formulaire n’envoie plus de membre', () => {
    const owned = makeData({
      recurrences: [
        makeRecurrence({
          id: 'r1',
          memberId: 'm1',
          shared: false,
          note: 'à moi',
          period: { unit: 'month', every: 1, anchorDay: 5 },
        }),
      ],
    })
    const { id: _dropped, memberId: _m, shared: _s, note: _n, ...kept } = owned.recurrences[0]!
    const after = replaceRecurrence(owned, 'r1', kept)
    expect(after.recurrences[0]).not.toHaveProperty('memberId')
    expect(after.recurrences[0]).not.toHaveProperty('shared')
    expect(after.recurrences[0]).not.toHaveProperty('note')
    expect(after.recurrences[0]?.id).toBe('r1')
  })
})

describe('convertir une entrée ponctuelle en récurrence', () => {
  const TODAY = today()
  const anchor = Number(TODAY.slice(8, 10))
  const period = { unit: 'month', every: 1, anchorDay: anchor } as const

  it('supprime l’ancienne ligne et pose la règle à sa date', () => {
    const before = makeData({
      entries: [makeEntry({ id: 'e1', date: TODAY, label: 'Loyer', amount: eur(80000) })],
    })
    const recurrence = makeRecurrence({
      id: 'r1',
      label: 'Loyer',
      amount: eur(80000),
      startedOn: TODAY,
      period,
    })
    const after = convertEntryToRecurrence(before, 'e1', recurrence, sequentialIds())
    expect(after.recurrences.map((r) => r.id)).toEqual(['r1'])
    expect(after.entries.some((e) => e.id === 'e1')).toBe(false)
  })

  it('part payée à la date de l’entrée, quand celle-ci était confirmée', () => {
    const before = makeData({
      entries: [
        makeEntry({ id: 'e1', date: TODAY, amount: eur(80000), status: 'confirmed' }),
      ],
    })
    const recurrence = makeRecurrence({ id: 'r1', amount: eur(80000), startedOn: TODAY, period })
    const after = convertEntryToRecurrence(before, 'e1', recurrence, sequentialIds())
    const posed = after.entries.find((e) => e.recurrenceId === 'r1')
    expect(posed).toMatchObject({ date: TODAY, amount: eur(80000), status: 'confirmed' })
  })

  it('ne confirme rien de plus quand l’entrée n’était que prévue', () => {
    const before = makeData({
      months: [{ ym: ymOf(TODAY), openedAt: TODAY, closed: false }],
      entries: [makeEntry({ id: 'e1', date: TODAY, amount: eur(80000), status: 'planned' })],
    })
    const recurrence = makeRecurrence({ id: 'r1', amount: eur(80000), startedOn: TODAY, period })
    const after = convertEntryToRecurrence(before, 'e1', recurrence, sequentialIds())
    const posed = after.entries.find((e) => e.recurrenceId === 'r1' && e.date === TODAY)
    expect(posed?.status).toBe('planned')
  })

  /* `buildPlannedEntry` ne connaît que l'ordre de grandeur d'une règle à
     montant variable — le montant réel, lui, ne vit que sur l'entrée qu'on
     remplace, et la conversion doit le lui rendre. */
  it('garde le montant réel de l’entrée, même sur une règle à montant variable', () => {
    const before = makeData({
      entries: [makeEntry({ id: 'e1', date: TODAY, amount: eur(12345), status: 'confirmed' })],
    })
    const recurrence = makeRecurrence({
      id: 'r1',
      amount: null,
      estimate: eur(5000),
      startedOn: TODAY,
      period,
    })
    const after = convertEntryToRecurrence(before, 'e1', recurrence, sequentialIds())
    const posed = after.entries.find((e) => e.recurrenceId === 'r1')
    expect(posed?.amount).toBe(eur(12345))
  })

  it('ne fait rien si l’entrée a disparu entre-temps', () => {
    const before = makeData()
    const recurrence = makeRecurrence({ id: 'r1', startedOn: TODAY, period })
    expect(convertEntryToRecurrence(before, 'inconnue', recurrence, sequentialIds())).toBe(before)
  })
})

describe('convertir une récurrence en entrée ponctuelle', () => {
  const period = { unit: 'month', every: 1, anchorDay: 5 } as const

  it('devient une ligne unique sans aucune échéance confirmée', () => {
    const before = makeData({
      recurrences: [
        makeRecurrence({ id: 'r1', amount: eur(3000), startedOn: '2026-01-05', period }),
      ],
      entries: [
        makeEntry({ id: 'p1', recurrenceId: 'r1', date: '2026-01-05', status: 'planned' }),
        makeEntry({ id: 'p2', recurrenceId: 'r1', date: '2026-02-05', status: 'planned' }),
      ],
    })
    expect(convertsToSingleEntry(before, 'r1')).toBe(true)
    const after = convertRecurrenceToEntry(before, 'r1', sequentialIds())
    expect(after.recurrences).toEqual([])
    expect(after.entries.map((e) => e.id)).toEqual(['p1'])
    expect(after.entries[0]).not.toHaveProperty('recurrenceId')
  })

  /* Une seule confirmée compte aussi comme une ligne unique — c'est le cas
     courant d'une règle tout juste créée, dont la première échéance est déjà
     payée. Le chemin reste `removeRecurrence` : détacher LA confirmée plutôt
     que de chercher « la plus proche du début » évite de garder une prévue
     par erreur si son tour venait à tomber avant celui de la confirmée. */
  it('devient une ligne unique aussi avec une seule échéance confirmée, sans en choisir une autre', () => {
    const before = makeData({
      recurrences: [
        makeRecurrence({ id: 'r1', amount: eur(3000), startedOn: '2026-01-05', period }),
      ],
      entries: [
        // Datée avant la confirmée : si le geste se trompait de ligne, c'est
        // elle qu'il garderait.
        makeEntry({ id: 'p0', recurrenceId: 'r1', date: '2025-12-05', status: 'planned' }),
        makeEntry({ id: 'c1', recurrenceId: 'r1', date: '2026-01-05', status: 'confirmed' }),
      ],
    })
    expect(convertsToSingleEntry(before, 'r1')).toBe(true)
    const after = convertRecurrenceToEntry(before, 'r1', sequentialIds())
    expect(after.recurrences).toEqual([])
    expect(after.entries.map((e) => e.id)).toEqual(['c1'])
    expect(after.entries[0]).not.toHaveProperty('recurrenceId')
  })

  it('fabrique l’échéance manquante quand aucune n’a encore été posée', () => {
    const before = makeData({
      recurrences: [
        makeRecurrence({ id: 'r1', amount: eur(3000), startedOn: '2026-05-05', period }),
      ],
    })
    const after = convertRecurrenceToEntry(before, 'r1', sequentialIds())
    expect(after.entries).toHaveLength(1)
    expect(after.entries[0]).toMatchObject({ date: '2026-05-05', amount: eur(3000), status: 'planned' })
    expect(after.entries[0]).not.toHaveProperty('recurrenceId')
  })

  it('détache chaque échéance confirmée plutôt que d’en choisir une', () => {
    const before = makeData({
      recurrences: [
        makeRecurrence({ id: 'r1', amount: eur(3000), startedOn: '2026-01-05', period }),
      ],
      entries: [
        makeEntry({ id: 'c1', recurrenceId: 'r1', date: '2026-01-05', status: 'confirmed' }),
        makeEntry({ id: 'c2', recurrenceId: 'r1', date: '2026-02-05', status: 'confirmed' }),
        makeEntry({ id: 'p3', recurrenceId: 'r1', date: '2026-03-05', status: 'planned' }),
      ],
    })
    expect(convertsToSingleEntry(before, 'r1')).toBe(false)
    const after = convertRecurrenceToEntry(before, 'r1', sequentialIds())
    expect(after.recurrences).toEqual([])
    expect(after.entries.map((e) => e.id).sort()).toEqual(['c1', 'c2'])
    expect(after.entries.every((e) => !('recurrenceId' in e))).toBe(true)
  })

  it('ne transporte rien d’une règle à montant variable qui n’a jamais servi', () => {
    const before = makeData({
      recurrences: [
        makeRecurrence({ id: 'r1', amount: null, estimate: eur(3000), startedOn: '2026-01-05', period }),
      ],
      entries: [makeEntry({ id: 'p1', recurrenceId: 'r1', date: '2026-01-05', status: 'planned' })],
    })
    expect(convertsToSingleEntry(before, 'r1')).toBe(false)
    const after = convertRecurrenceToEntry(before, 'r1', sequentialIds())
    expect(after.recurrences).toEqual([])
    expect(after.entries).toEqual([])
  })

  it('retire le lien d’un crédit même sur une conversion propre', () => {
    const before = makeData({
      recurrences: [
        makeRecurrence({ id: 'r1', amount: eur(3000), startedOn: '2026-01-05', period }),
      ],
      debts: [makeDebt({ id: 'd1', recurrenceId: 'r1' })],
    })
    const after = convertRecurrenceToEntry(before, 'r1', sequentialIds())
    expect(after.debts[0]).not.toHaveProperty('recurrenceId')
  })

  it('ne fait rien si la récurrence a disparu entre-temps', () => {
    const before = makeData()
    expect(convertRecurrenceToEntry(before, 'inconnue', sequentialIds())).toBe(before)
  })
})

describe('entrées', () => {
  it('confirme une échéance', () => {
    const before = makeData({ entries: [makeEntry({ id: 'e1', date: '2026-07-01', status: 'planned' })] })
    expect(confirmEntry(before, 'e1').entries[0]?.status).toBe('confirmed')
  })

  it('confirme en bloc, sans toucher aux autres', () => {
    const before = makeData({
      entries: [
        makeEntry({ id: 'a', date: '2026-07-01', status: 'planned' }),
        makeEntry({ id: 'b', date: '2026-07-02', status: 'planned' }),
        makeEntry({ id: 'c', date: '2026-07-03', status: 'planned' }),
      ],
    })
    const after = confirmEntries(before, ['a', 'c'])
    expect(after.entries.map((e) => e.status)).toEqual(['confirmed', 'planned', 'confirmed'])
  })

  it('remet une échéance confirmée en prévue, sans toucher à son montant', () => {
    const before = makeData({
      entries: [
        makeEntry({
          id: 'e1',
          recurrenceId: 'r1',
          date: '2026-07-01',
          amount: eur(4237),
          status: 'confirmed',
        }),
      ],
    })
    const after = unconfirmEntries(before, ['e1'])
    expect(after.entries[0]?.status).toBe('planned')
    // Le montant a pu être saisi à la main sur une échéance variable : le
    // rendre à la règle perdrait la saisie, et reconfirmer le retrouve tel quel.
    expect(after.entries[0]?.amount).toBe(4237)
  })

  /* Une saisie ponctuelle est un fait, pas une prévision en attente : la
     renvoyer dans « À confirmer » ne voudrait rien dire. */
  it('laisse une saisie ponctuelle confirmée où elle est', () => {
    const before = makeData({
      entries: [makeEntry({ id: 'e1', date: '2026-07-01', status: 'confirmed' })],
    })
    expect(unconfirmEntries(before, ['e1']).entries[0]?.status).toBe('confirmed')
  })

  it('efface le membre vidé sans couper l’entrée de sa récurrence', () => {
    const before = makeData({
      entries: [
        makeEntry({ id: 'e1', recurrenceId: 'r1', date: '2026-07-05', memberId: 'm1', shared: false }),
      ],
    })
    const { id: _dropped, recurrenceId: _link, memberId: _m, shared: _s, ...kept } =
      before.entries[0]!
    const after = replaceEntry(before, 'e1', kept)
    expect(after.entries[0]).not.toHaveProperty('memberId')
    expect(after.entries[0]).not.toHaveProperty('shared')
    expect(after.entries[0]?.recurrenceId).toBe('r1')
  })

  it('ajoute une saisie ponctuelle', () => {
    const entry = makeEntry({ id: 'x', date: '2026-07-09', amount: eur(2350) })
    expect(addEntry(makeData(), entry).entries).toEqual([entry])
  })
})

describe('ouverture du mois', () => {
  const data = makeData({
    recurrences: [
      makeRecurrence({ id: 'loyer', amount: eur(95000), period: { unit: 'month', every: 1, anchorDay: 5 } }),
    ],
  })

  it('génère les échéances et enregistre l’ouverture', () => {
    const result = openMonth(data, '2026-07', sequentialIds(), '2026-07-01')
    expect(result.created).toBe(1)
    expect(result.data.entries).toHaveLength(1)
    expect(result.data.months).toEqual([{ ym: '2026-07', openedAt: '2026-07-01', closed: false }])
  })

  it('est rejouable sans rien dupliquer', () => {
    const once = openMonth(data, '2026-07', sequentialIds(), '2026-07-01')
    const twice = openMonth(once.data, '2026-07', sequentialIds(), '2026-07-20')
    expect(twice.created).toBe(0)
    expect(twice.data.entries).toHaveLength(1)
    expect(twice.data.months).toHaveLength(1)
    // La date d'ouverture d'origine n'est pas réécrite.
    expect(twice.data.months[0]?.openedAt).toBe('2026-07-01')
  })

  it('compte les échéances à montant variable', () => {
    const withVariable = makeData({
      recurrences: [
        makeRecurrence({ id: 'elec', amount: null, period: { unit: 'month', every: 1, anchorDay: 12 } }),
      ],
    })
    expect(openMonth(withVariable, '2026-07', sequentialIds()).variable).toBe(1)
  })

  it('ouvre un mois sans aucune échéance sans rien créer', () => {
    const result = openMonth(makeData(), '2026-07', sequentialIds(), '2026-07-01')
    expect(result.created).toBe(0)
    expect(result.data.months).toHaveLength(1)
  })
})

describe('réglages', () => {
  it('modifie un réglage sans écraser les autres', () => {
    const after = updateSettings(makeData(), { theme: 'dark' })
    expect(after.settings).toEqual({
      theme: 'dark',
      palette: 'classique',
      locale: 'fr',
      currency: 'EUR',
      monthStartsOn: 1,
    })
  })
})

describe('synchronisation d’une récurrence', () => {
  /** Deux mois ouverts et une récurrence mensuelle qui n'y a encore rien posé. */
  function twoOpenMonths() {
    return makeData({
      recurrences: [
        makeRecurrence({ id: 'r1', period: { unit: 'month', every: 1, anchorDay: 10 } }),
      ],
      months: [
        { ym: '2026-07', openedAt: '2026-07-01', closed: false },
        { ym: '2026-08', openedAt: '2026-08-01', closed: false },
      ],
    })
  }

  it('pose les échéances dans tous les mois ouverts à partir du mois courant', () => {
    const after = syncRecurrenceEntries(twoOpenMonths(), 'r1', sequentialIds(), '2026-07-15')
    expect(after.entries.map((e) => e.date)).toEqual(['2026-07-10', '2026-08-10'])
    expect(after.entries.every((e) => e.status === 'planned')).toBe(true)
  })

  it('ne remonte pas dans un mois antérieur au mois de référence', () => {
    const data = makeData({
      ...twoOpenMonths(),
      months: [
        { ym: '2026-05', openedAt: '2026-05-01', closed: false },
        { ym: '2026-08', openedAt: '2026-08-01', closed: false },
      ],
    })
    const after = syncRecurrenceEntries(data, 'r1', sequentialIds(), '2026-07-15')
    expect(after.entries.map((e) => e.date)).toEqual(['2026-08-10'])
  })

  it('refait les prévues à venir quand la règle change', () => {
    const before = syncRecurrenceEntries(twoOpenMonths(), 'r1', sequentialIds(), '2026-07-15')
    const moved = updateRecurrence(before, 'r1', {
      period: { unit: 'month', every: 1, anchorDay: 25 },
    })
    const after = syncRecurrenceEntries(moved, 'r1', sequentialIds('b'), '2026-07-15')
    expect(after.entries.map((e) => e.date)).toEqual(['2026-07-25', '2026-08-25'])
  })

  it('ne touche jamais une échéance confirmée', () => {
    const data = {
      ...twoOpenMonths(),
      entries: [
        makeEntry({ id: 'paid', recurrenceId: 'r1', date: '2026-07-10', status: 'confirmed' }),
      ],
    }
    const after = syncRecurrenceEntries(data, 'r1', sequentialIds(), '2026-07-15')
    expect(after.entries.find((e) => e.id === 'paid')).toBeDefined()
    // Juillet est déjà servi par l'échéance confirmée : rien n'y est ajouté.
    expect(after.entries.filter((e) => e.date.startsWith('2026-07'))).toHaveLength(1)
  })

  /** Confirmer d'avance dit qu'une échéance aura lieu, pas qu'elle a eu lieu. */
  describe('échéance confirmée d’avance', () => {
    const owned = () =>
      makeData({
        ...twoOpenMonths(),
        recurrences: [
          makeRecurrence({
            id: 'r1',
            memberId: 'm1',
            period: { unit: 'month', every: 1, anchorDay: 10 },
          }),
        ],
        entries: [
          makeEntry({
            id: 'juillet',
            recurrenceId: 'r1',
            date: '2026-07-10',
            status: 'confirmed',
            memberId: 'm1',
            amount: eur(1500),
          }),
          makeEntry({
            id: 'aout',
            recurrenceId: 'r1',
            date: '2026-08-10',
            status: 'confirmed',
            memberId: 'm1',
            amount: eur(1500),
          }),
        ],
      })

    it('suit la règle quand la récurrence passe au foyer', () => {
      const { id: _dropped, memberId: _m, ...household } = owned().recurrences[0]!
      const moved = replaceRecurrence(owned(), 'r1', household)
      const after = syncRecurrenceEntries(moved, 'r1', sequentialIds(), '2026-07-15')

      expect(after.entries.find((e) => e.id === 'aout')).not.toHaveProperty('memberId')
      // Le passé, lui, ne se réécrit pas : juillet a eu lieu (cahier §3).
      expect(after.entries.find((e) => e.id === 'juillet')?.memberId).toBe('m1')
    })

    it('garde le montant et la date saisis à la main', () => {
      const { id: _dropped, ...rule } = owned().recurrences[0]!
      const relabelled = replaceRecurrence(owned(), 'r1', {
        ...rule,
        label: 'Nouveau nom',
        amount: eur(9900),
      })
      const after = syncRecurrenceEntries(relabelled, 'r1', sequentialIds(), '2026-07-15')
      const aout = after.entries.find((e) => e.id === 'aout')

      expect(aout?.label).toBe('Nouveau nom')
      expect(aout?.amount).toBe(eur(1500))
      expect(aout?.date).toBe('2026-08-10')
      expect(aout?.status).toBe('confirmed')
    })
  })

  /* Une prévue peut porter un montant saisi à la main : `/depense/:id` conserve
     le statut de l'échéance qu'on y ouvre, donc corriger le montant d'une
     prévue l'enregistre sans la confirmer. Le tour jette-puis-refait ne pouvait
     pas le relire — l'entrée venait d'être retirée. */
  describe('montant saisi sur une prévue', () => {
    const variable = () =>
      makeData({
        ...twoOpenMonths(),
        recurrences: [
          makeRecurrence({
            id: 'r1',
            amount: null,
            period: { unit: 'month', every: 1, anchorDay: 10 },
          }),
        ],
        entries: [
          makeEntry({
            id: 'juillet',
            recurrenceId: 'r1',
            date: '2026-07-10',
            status: 'planned',
            amount: eur(8742),
          }),
        ],
      })

    it('survit à une modification de la règle, tant que l’échéance est datée', () => {
      const relabelled = updateRecurrence(variable(), 'r1', { label: 'Électricité' })
      const after = syncRecurrenceEntries(relabelled, 'r1', sequentialIds('b'), '2026-07-15')
      const juillet = after.entries.find((e) => e.date === '2026-07-10')

      expect(juillet?.amount).toBe(eur(8742))
      expect(juillet?.label).toBe('Électricité')
      expect(juillet?.status).toBe('planned')
    })

    it('survit aussi sur une récurrence à montant fixe', () => {
      const fixe = makeData({
        ...variable(),
        recurrences: [
          makeRecurrence({
            id: 'r1',
            amount: eur(5000),
            period: { unit: 'month', every: 1, anchorDay: 10 },
          }),
        ],
      })
      const raised = updateRecurrence(fixe, 'r1', { amount: eur(6000) })
      const after = syncRecurrenceEntries(raised, 'r1', sequentialIds('b'), '2026-07-15')

      // Le passé ne bouge pas ; c'est le mois d'après qui prend le nouveau prix.
      expect(after.entries.find((e) => e.date === '2026-07-10')?.amount).toBe(eur(8742))
      expect(after.entries.find((e) => e.date === '2026-08-10')?.amount).toBe(eur(6000))
    })

    /* À venir, c'est bien la règle qui dit ce qui va tomber : rien à préserver,
       et préserver serait ici rendre la règle sans effet. */
    it('ne s’applique pas à une prévue encore à venir', () => {
      const data = makeData({
        ...variable(),
        entries: [
          makeEntry({
            id: 'aout',
            recurrenceId: 'r1',
            date: '2026-08-10',
            status: 'planned',
            amount: eur(8742),
          }),
        ],
        recurrences: [
          makeRecurrence({
            id: 'r1',
            amount: eur(5000),
            period: { unit: 'month', every: 1, anchorDay: 10 },
          }),
        ],
      })
      const after = syncRecurrenceEntries(data, 'r1', sequentialIds('b'), '2026-07-15')
      expect(after.entries.find((e) => e.date === '2026-08-10')?.amount).toBe(eur(5000))
    })

    /* Zéro est l'emplacement vide que l'ouverture du mois pose sur un montant
       variable, pas un montant saisi : le préserver figerait la case vide. */
    it('ne préserve pas une case laissée à zéro', () => {
      const vide = makeData({
        ...variable(),
        entries: [
          makeEntry({
            id: 'juillet',
            recurrenceId: 'r1',
            date: '2026-07-10',
            status: 'planned',
            amount: eur(0),
          }),
          makeEntry({
            id: 'juin',
            recurrenceId: 'r1',
            date: '2026-06-10',
            status: 'confirmed',
            amount: eur(7000),
          }),
        ],
      })
      const after = syncRecurrenceEntries(vide, 'r1', sequentialIds('b'), '2026-07-15')
      // La règle reprend la main : le dernier montant connu est celui de juin.
      expect(after.entries.find((e) => e.date === '2026-07-10')?.amount).toBe(eur(7000))
    })
  })

  it('est rejouable sans rien dupliquer', () => {
    const once = syncRecurrenceEntries(twoOpenMonths(), 'r1', sequentialIds(), '2026-07-15')
    const twice = syncRecurrenceEntries(once, 'r1', sequentialIds('b'), '2026-07-15')
    expect(twice.entries.map((e) => e.date)).toEqual(once.entries.map((e) => e.date))
  })

  it('laisse tranquilles les échéances des autres récurrences', () => {
    const data = {
      ...twoOpenMonths(),
      recurrences: [
        makeRecurrence({ id: 'r1', period: { unit: 'month', every: 1, anchorDay: 10 } }),
        makeRecurrence({ id: 'r2', period: { unit: 'month', every: 1, anchorDay: 20 } }),
      ],
      entries: [
        makeEntry({ id: 'autre', recurrenceId: 'r2', date: '2026-08-20', status: 'planned' }),
      ],
    }
    const after = syncRecurrenceEntries(data, 'r1', sequentialIds(), '2026-07-15')
    expect(after.entries.find((e) => e.id === 'autre')).toBeDefined()
  })
})

describe('reporter une correction d’échéance sur sa règle', () => {
  const FROM = '2026-07-15'

  /** Deux mois ouverts, une règle fixe, et ses deux échéances déjà posées. */
  function posed(rule: Partial<Parameters<typeof makeRecurrence>[0]> = {}) {
    return syncRecurrenceEntries(
      makeData({
        recurrences: [
          makeRecurrence({
            id: 'r1',
            label: 'Loyer',
            amount: eur(95000),
            period: { unit: 'month', every: 1, anchorDay: 10 },
            ...rule,
          }),
        ],
        months: [
          { ym: '2026-07', openedAt: '2026-07-01', closed: false },
          { ym: '2026-08', openedAt: '2026-08-01', closed: false },
        ],
      }),
      'r1',
      sequentialIds(),
      FROM,
    )
  }

  const edited = (over: Partial<Entry> = {}): Omit<Entry, 'id' | 'recurrenceId'> => ({
    label: 'Nouveau loyer',
    categoryId: 'cat-1',
    direction: 'out',
    amount: eur(99000),
    date: '2026-08-10',
    status: 'planned',
    ...over,
  })

  it('reporte le libellé et le montant sur la règle, et les échéances à venir suivent', () => {
    const data = posed()
    const aout = data.entries.find((e) => e.date === '2026-08-10')
    const after = applyEntryEditToRule(data, aout?.id ?? '', edited(), sequentialIds('b'), FROM)

    expect(after.recurrences[0]).toMatchObject({ label: 'Nouveau loyer', amount: eur(99000) })
    // L'échéance corrigée garde son identifiant, sa saisie, et reste seule sur son mois.
    const kept = after.entries.find((e) => e.id === aout?.id)
    expect(kept).toMatchObject({ label: 'Nouveau loyer', amount: eur(99000), date: '2026-08-10' })
    expect(after.entries.filter((e) => e.date.startsWith('2026-08'))).toHaveLength(1)
    // Le montant déjà daté de juillet survit, sous le libellé neuf de la règle.
    const juillet = after.entries.find((e) => e.date === '2026-07-10')
    expect(juillet).toMatchObject({ label: 'Nouveau loyer', amount: eur(95000) })
  })

  it('réécrit aussi une échéance confirmée, que la synchronisation ne touche pas', () => {
    const data = posed()
    const juillet = data.entries.find((e) => e.date === '2026-07-10')
    const confirmed = confirmEntries(data, [juillet?.id ?? ''])
    const after = applyEntryEditToRule(
      confirmed,
      juillet?.id ?? '',
      edited({ date: '2026-07-10', status: 'confirmed' }),
      sequentialIds('b'),
      FROM,
    )

    expect(after.entries.find((e) => e.id === juillet?.id)).toMatchObject({
      amount: eur(99000),
      status: 'confirmed',
    })
    // La règle et l'échéance d'août suivent le nouveau prix.
    expect(after.recurrences[0]?.amount).toBe(eur(99000))
    expect(after.entries.find((e) => e.date === '2026-08-10')?.amount).toBe(eur(99000))
  })

  it('laisse son montant à une règle variable : chaque échéance chiffre la sienne', () => {
    const data = posed({ amount: null })
    const aout = data.entries.find((e) => e.date === '2026-08-10')
    const after = applyEntryEditToRule(
      data,
      aout?.id ?? '',
      edited({ label: 'Électricité', amount: eur(8742) }),
      sequentialIds('b'),
      FROM,
    )

    expect(after.recurrences[0]).toMatchObject({ label: 'Électricité', amount: null })
    expect(after.entries.find((e) => e.id === aout?.id)?.amount).toBe(eur(8742))
  })

  it('garde à l’échéance sa date et sa note, sous son identifiant d’origine', () => {
    const data = posed()
    const aout = data.entries.find((e) => e.date === '2026-08-10')
    const after = applyEntryEditToRule(
      data,
      aout?.id ?? '',
      edited({ date: '2026-08-12', note: 'reporté' }),
      sequentialIds('b'),
      FROM,
    )

    expect(after.entries.find((e) => e.id === aout?.id)).toMatchObject({
      date: '2026-08-12',
      note: 'reporté',
      recurrenceId: 'r1',
    })
    expect(after.entries.filter((e) => e.recurrenceId === 'r1' && e.date.startsWith('2026-08'))).toHaveLength(1)
  })

  it('efface de la règle le membre et le partage que le formulaire a vidés', () => {
    const data = posed({ memberId: 'm1', shared: true })
    const aout = data.entries.find((e) => e.date === '2026-08-10')
    const after = applyEntryEditToRule(data, aout?.id ?? '', edited(), sequentialIds('b'), FROM)

    expect(after.recurrences[0]).not.toHaveProperty('memberId')
    expect(after.recurrences[0]).not.toHaveProperty('shared')
  })

  it('retombe sur la simple réécriture quand l’entrée n’a pas de règle', () => {
    const data = makeData({
      entries: [makeEntry({ id: 'seule', date: '2026-07-03', amount: eur(2500) })],
    })
    const after = applyEntryEditToRule(
      data,
      'seule',
      edited({ date: '2026-07-03', status: 'confirmed' }),
      sequentialIds('b'),
      FROM,
    )

    expect(after.entries.find((e) => e.id === 'seule')?.amount).toBe(eur(99000))
    expect(after.recurrences).toHaveLength(0)
  })
})
