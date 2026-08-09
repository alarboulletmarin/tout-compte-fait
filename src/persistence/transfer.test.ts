import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { eur, makeCategory, makeData, makeEntry, makeRecurrence } from '@/domain/fixtures'
import type { Data } from '@/domain/types'
import { emptyData } from './defaults'
import { CURRENT_SCHEMA_VERSION, ImportError } from './schema'
import {
  EXPORT_REMINDER_DAYS,
  LAST_EXPORT_KEY,
  exportFilename,
  markExported,
  parseImport,
  readLastExport,
  serializeData,
  shareExport,
  shouldRemindExport,
  dismissReminder,
  readReminderDismissed,
} from './transfer'

/** Un document qui exerce tous les champs du modèle, y compris les optionnels. */
function richData(): Data {
  return makeData({
    household: {
      name: 'Chez nous',
      members: [
        { id: 'm1', name: 'Alix', color: 'var(--cat-1)' },
        { id: 'm2', name: 'Camille', color: 'var(--cat-2)' },
      ],
    },
    categories: [
      makeCategory({ id: 'logement', label: 'Logement', direction: 'out' }),
      makeCategory({ id: 'salaire', label: 'Salaire', direction: 'in', archived: true }),
    ],
    recurrences: [
      makeRecurrence({
        id: 'loyer',
        label: 'Loyer',
        categoryId: 'logement',
        memberId: 'm1',
        amount: eur(95000),
        period: { unit: 'month', every: 1, anchorDay: 5 },
        startedOn: '2026-01-05',
        note: 'virement automatique',
      }),
      makeRecurrence({
        id: 'elec',
        label: 'Électricité',
        categoryId: 'logement',
        amount: null,
        period: { unit: 'month', every: 2, anchorDay: 31 },
        startedOn: '2025-11-30',
        endedOn: '2026-09-30',
        shared: true,
      }),
    ],
    entries: [
      makeEntry({
        id: 'e1',
        recurrenceId: 'loyer',
        label: 'Loyer',
        categoryId: 'logement',
        memberId: 'm1',
        date: '2026-07-05',
        amount: eur(95000),
        status: 'confirmed',
        shared: false,
        note: 'juillet',
      }),
      makeEntry({
        id: 'e2',
        label: 'Salaire',
        categoryId: 'salaire',
        direction: 'in',
        date: '2026-07-28',
        amount: eur(240000),
        status: 'planned',
      }),
      makeEntry({ id: 'e3', categoryId: 'logement', date: '2026-07-12', amount: eur(-1250) }),
    ],
    months: [
      { ym: '2026-07', openedAt: '2026-07-01', closed: false },
      { ym: '2026-06', openedAt: '2026-06-01', closed: true },
    ],
    settings: { theme: 'dark', palette: 'vive', locale: 'en', currency: 'CHF', monthStartsOn: 1 },
  })
}

describe('aller-retour export / import', () => {
  it('restitue un état strictement identique', () => {
    const original = richData()
    const restored = parseImport(serializeData(original)).data
    expect(restored).toStrictEqual(original)
  })

  it('restitue à l’identique un document tout juste créé', () => {
    const original = emptyData()
    expect(parseImport(serializeData(original)).data).toStrictEqual(original)
  })

  it('reste stable sur un second aller-retour', () => {
    const once = parseImport(serializeData(richData())).data
    const twice = parseImport(serializeData(once)).data
    expect(twice).toStrictEqual(once)
    expect(serializeData(twice)).toBe(serializeData(once))
  })

  it('ne fabrique pas de champ optionnel absent', () => {
    const restored = parseImport(serializeData(richData())).data
    expect(restored.entries[1]).not.toHaveProperty('recurrenceId')
    expect(restored.entries[1]).not.toHaveProperty('memberId')
    expect(restored.entries[1]).not.toHaveProperty('note')
    expect(restored.recurrences[0]).not.toHaveProperty('endedOn')
  })

  it('conserve un montant variable à null, sans le confondre avec zéro', () => {
    const restored = parseImport(serializeData(richData())).data
    expect(restored.recurrences[1]?.amount).toBeNull()
  })

  it('emporte le schemaVersion', () => {
    const restored = parseImport(serializeData(richData())).data
    expect(restored.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
  })
})

describe('import — fichiers hostiles', () => {
  it('refuse ce qui n’est pas du JSON', () => {
    expect(() => parseImport('{ pas du json')).toThrow(ImportError)
  })

  it('refuse un JSON qui n’est pas un document', () => {
    expect(() => parseImport('[]')).toThrow(ImportError)
    expect(() => parseImport('"texte"')).toThrow(ImportError)
    expect(() => parseImport('null')).toThrow(ImportError)
  })

  it('refuse un schéma venu du futur, en disant quoi faire', () => {
    const future = JSON.stringify({ ...emptyData(), schemaVersion: 99 })
    expect(() => parseImport(future)).toThrow(/mets tout compte fait à jour/i)
  })

  it('écarte une entrée au montant fractionnaire plutôt que de l’arrondir', () => {
    const broken = JSON.stringify({
      schemaVersion: 1,
      entries: [{ id: 'x', date: '2026-07-01', amount: 12.5, direction: 'out' }],
    })
    expect(parseImport(broken).data.entries).toEqual([])
  })

  it('écarte une entrée dont la date n’existe pas', () => {
    const broken = JSON.stringify({
      schemaVersion: 1,
      entries: [{ id: 'x', date: '2026-02-30', amount: 1000, direction: 'out' }],
    })
    expect(parseImport(broken).data.entries).toEqual([])
  })

  it('remet les valeurs par défaut sur un document tronqué', () => {
    const data = parseImport('{}').data
    /* Le nom est facultatif et décoratif : un document qui n'en porte pas
       n'en reçoit pas d'office. Un repli inventé remettrait par l'import le
       mot que l'app a cessé de supposer. */
    expect(data.household.name).toBe('')
    expect(data.settings).toEqual({
      theme: 'system',
      palette: 'classique',
      /* Un document tronqué n'a jamais dit sa langue : il repart en français,
         et surtout pas dans celle du navigateur qui l'ouvre — voir `settings`
         dans `validate.ts`. */
      locale: 'fr',
      currency: 'EUR',
      monthStartsOn: 1,
    })
    expect(data.entries).toEqual([])
  })
})

describe('migrations', () => {
  it('migre un document sans schemaVersion et le signale', () => {
    const legacy = JSON.stringify({ household: { name: 'Maison' }, entries: [] })
    const result = parseImport(legacy)
    expect(result.from).toBe(0)
    expect(result.migrated).toBe(true)
    expect(result.data.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
  })

  it('ne signale aucune migration pour un document déjà à jour', () => {
    const result = parseImport(serializeData(emptyData()))
    expect(result.from).toBe(CURRENT_SCHEMA_VERSION)
    expect(result.migrated).toBe(false)
  })
})

describe('nom de fichier', () => {
  it('est horodaté', () => {
    expect(exportFilename('2026-07-30')).toBe('tout-compte-fait-2026-07-30.json')
  })
})

describe('rappel d’export', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('ne rappelle rien tant qu’il n’y a pas de données', () => {
    expect(shouldRemindExport(null, '2026-07-30', false)).toBe(false)
  })

  it('rappelle si aucun export n’a jamais eu lieu', () => {
    expect(shouldRemindExport(null, '2026-07-30', true)).toBe(true)
  })

  it('rappelle passé trente jours, pas avant', () => {
    expect(shouldRemindExport('2026-07-01', '2026-07-31', true)).toBe(false)
    expect(shouldRemindExport('2026-07-01', '2026-08-01', true)).toBe(true)
    expect(EXPORT_REMINDER_DAYS).toBe(30)
  })

  it('relit la date qu’il a écrite', () => {
    markExported('2026-07-30')
    expect(readLastExport()).toBe('2026-07-30')
  })

  it('se tait tant que l’écart tient, puis rappelle de nouveau', () => {
    expect(shouldRemindExport(null, '2026-07-30', true, '2026-07-30')).toBe(false)
    expect(shouldRemindExport(null, '2026-08-29', true, '2026-07-30')).toBe(false)
    expect(shouldRemindExport(null, '2026-08-30', true, '2026-07-30')).toBe(true)
  })

  it('garde l’écart d’un rendu à l’autre', () => {
    dismissReminder('2026-07-30')
    expect(readReminderDismissed()).toBe('2026-07-30')
  })

  it('oublie l’écart dès qu’un export a lieu', () => {
    dismissReminder('2026-07-30')
    markExported('2026-07-31')
    expect(readReminderDismissed()).toBeNull()
  })
})

describe('envoi de l’export vers un autre appareil', () => {
  /** jsdom n'a pas de feuille de partage : on pose celle du test. */
  function stubShare(value: unknown): void {
    Object.defineProperty(navigator, 'share', { value, configurable: true, writable: true })
  }

  /** Le nombre de fois que la date d'export a été écrite. */
  const marks = (calls: unknown[][]): number =>
    calls.filter(([key]) => key === LAST_EXPORT_KEY).length

  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'share')
    vi.restoreAllMocks()
  })

  it('marque la date une fois l’envoi abouti', async () => {
    stubShare(vi.fn().mockResolvedValue(undefined))
    await expect(shareExport(emptyData(), '2026-07-30')).resolves.toBe('shared')
    expect(readLastExport()).toBe('2026-07-30')
  })

  /* Le cas qui compte. Fermer la feuille n'envoie rien, et marquer quand même
     endormirait le rappel des trente jours sur un export qui n'a pas eu lieu —
     la façon la plus discrète de perdre des données. */
  it('ne marque rien quand la feuille est fermée', async () => {
    stubShare(vi.fn().mockRejectedValue(new DOMException('annulé', 'AbortError')))

    await expect(shareExport(emptyData(), '2026-07-30')).resolves.toBe('dismissed')

    expect(readLastExport()).toBeNull()
  })

  it('replie sur le téléchargement, et ne marque qu’une fois', async () => {
    stubShare(vi.fn().mockRejectedValue(new DOMException('refusé', 'NotAllowedError')))
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const setItem = vi.spyOn(Storage.prototype, 'setItem')

    await expect(shareExport(emptyData(), '2026-07-30')).resolves.toBe('downloaded')

    // Personne ne repart de ce bouton les mains vides.
    expect(click).toHaveBeenCalledTimes(1)
    expect(readLastExport()).toBe('2026-07-30')
    expect(marks(setItem.mock.calls)).toBe(1)
  })
})

describe('migration vers les familles', () => {
  /** Un document tel qu'écrit avant l'introduction des familles. */
  function legacy() {
    return JSON.stringify({
      schemaVersion: 1,
      household: { name: 'Maison', members: [] },
      categories: [
        { id: 'housing', label: 'Logement', icon: '', color: 'c', direction: 'out', archived: false },
        { id: 'groceries', label: 'Courses', icon: '', color: 'c', direction: 'out', archived: false },
        { id: 'salary', label: 'Salaire', icon: '', color: 'c', direction: 'in', archived: false },
        { id: 'perso', label: 'Ma catégorie', icon: '', color: 'c', direction: 'out', archived: false },
      ],
      entries: [
        { id: 'e1', label: 'Loyer', categoryId: 'housing', direction: 'out', amount: 85000, date: '2026-06-05', status: 'confirmed' },
      ],
      recurrences: [],
      months: [],
      settings: { theme: 'dark', currency: 'EUR', monthStartsOn: 1 },
    })
  }

  it('signale la migration et atteint la version courante', () => {
    const result = parseImport(legacy())
    expect(result.from).toBe(1)
    expect(result.migrated).toBe(true)
    expect(result.data.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
  })

  it('range chaque catégorie connue sous sa famille', () => {
    const { categories } = parseImport(legacy()).data
    const familyOf = (id: string) => categories.find((c) => c.id === id)?.familyId
    expect(familyOf('housing')).toBe('fam-housing')
    expect(familyOf('groceries')).toBe('fam-daily')
    expect(familyOf('salary')).toBe('fam-resources')
  })

  it('accueille une catégorie inconnue selon son sens', () => {
    const { categories } = parseImport(legacy()).data
    expect(categories.find((c) => c.id === 'perso')?.familyId).toBe('fam-leisure')
  })

  it('conserve les catégories existantes et leurs entrées', () => {
    const { categories, entries } = parseImport(legacy()).data
    expect(categories.find((c) => c.id === 'housing')?.label).toBe('Logement')
    expect(entries[0]?.categoryId).toBe('housing')
  })

  it('ajoute le catalogue par défaut à côté, sans doublon d’identifiant', () => {
    const { categories, families } = parseImport(legacy()).data
    expect(families.length).toBeGreaterThan(4)
    expect(categories.filter((c) => c.id === 'groceries')).toHaveLength(1)
    // Le catalogue est bien venu s'ajouter : des catégories qui n'existaient pas.
    expect(categories.some((c) => c.id === 'mortgage')).toBe(true)
    expect(categories.some((c) => c.id === 'passbook')).toBe(true)
  })

  it('n’écrase pas des familles déjà présentes', () => {
    const already = JSON.stringify({
      schemaVersion: 1,
      families: [{ id: 'f1', label: 'La mienne', kind: 'charge' }],
      categories: [],
    })
    expect(parseImport(already).data.families).toEqual([
      { id: 'f1', label: 'La mienne', kind: 'charge' },
    ])
  })

  it('donne une nature lisible à chaque famille du catalogue', () => {
    const { families } = parseImport(legacy()).data
    const kinds = new Set(families.map((f) => f.kind))
    expect(kinds).toEqual(new Set(['resource', 'charge', 'debt', 'saving']))
  })
})

describe('migration vers la répartition entre membres', () => {
  /** Un document tel qu'écrit avant les revenus et le partage. */
  function v2() {
    return JSON.stringify({
      schemaVersion: 2,
      household: { name: 'Maison', members: [{ id: 'm1', name: 'Alix', color: 'c' }] },
      families: [{ id: 'fam-housing', label: 'Logement', kind: 'charge' }],
      categories: [
        { id: 'housing', label: 'Loyer', familyId: 'fam-housing', icon: '', color: 'c', direction: 'out', archived: false },
      ],
      recurrences: [],
      entries: [
        { id: 'e1', label: 'Loyer', categoryId: 'housing', direction: 'out', amount: 85000, date: '2026-06-05', status: 'confirmed' },
      ],
      debts: [],
      months: [],
      settings: { theme: 'dark', currency: 'EUR', monthStartsOn: 1 },
    })
  }

  it('atteint la version courante sans rien perdre', () => {
    const result = parseImport(v2())
    expect(result.from).toBe(2)
    expect(result.migrated).toBe(true)
    expect(result.data.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(result.data.entries).toHaveLength(1)
    expect(result.data.household.members[0]?.name).toBe('Alix')
  })

  it('laisse `shared` absent, pour que la règle tranche', () => {
    const { data } = parseImport(v2())
    expect(data.entries[0]).not.toHaveProperty('shared')
  })

  it('écarte un `shared` illisible plutôt que de l’interpréter', () => {
    const bogus = JSON.stringify({
      schemaVersion: 3,
      household: { name: 'Maison', members: [] },
      categories: [],
      entries: [
        { id: 'e1', label: 'A', categoryId: 'c', direction: 'out', amount: 100, date: '2026-07-01', status: 'confirmed', shared: 'oui' },
        { id: 'e2', label: 'B', categoryId: 'c', direction: 'out', amount: 100, date: '2026-07-02', status: 'confirmed', shared: false },
      ],
    })
    const { entries } = parseImport(bogus).data
    expect(entries[0]).not.toHaveProperty('shared')
    // `false` est une exception explicite, elle survit.
    expect(entries[1]?.shared).toBe(false)
  })
})

describe('montant habituel d’une récurrence variable (v4)', () => {
  const doc = (recurrence: Record<string, unknown>) =>
    JSON.stringify({
      schemaVersion: 4,
      household: { name: 'Maison', members: [] },
      categories: [],
      recurrences: [
        {
          id: 'r1', label: 'Salaire', categoryId: 'salary', direction: 'in',
          period: { unit: 'month', every: 1, anchorDay: 27 }, startedOn: '2026-01-27',
          ...recurrence,
        },
      ],
    })

  it('survit à l’aller-retour sur un montant variable', () => {
    const { recurrences } = parseImport(doc({ amount: null, estimate: 250_000 })).data
    expect(recurrences[0]?.estimate).toBe(250_000)
  })

  it('n’a rien à faire sur un montant fixe : il n’y a rien à estimer', () => {
    const { recurrences } = parseImport(doc({ amount: 1099, estimate: 250_000 })).data
    expect(recurrences[0]).not.toHaveProperty('estimate')
  })

  it('écarte une estimation illisible ou nulle plutôt que de l’interpréter', () => {
    expect(parseImport(doc({ amount: null, estimate: 'beaucoup' })).data.recurrences[0])
      .not.toHaveProperty('estimate')
    expect(parseImport(doc({ amount: null, estimate: 0 })).data.recurrences[0])
      .not.toHaveProperty('estimate')
  })

  it('un document v3 reste lisible, simplement sans montant habituel', () => {
    const v3 = doc({ amount: null }).replace('"schemaVersion":4', '"schemaVersion":3')
    const result = parseImport(v3)
    expect(result.data.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(result.data.recurrences[0]).not.toHaveProperty('estimate')
  })
})

describe('avances (v5)', () => {
  /* Les liens de l'avance mènent quelque part : la lecture répare ceux qui ne
     mènent nulle part, et ce n'est pas ce qui se teste ici. */
  const doc = (advances: unknown) =>
    JSON.stringify({
      schemaVersion: 5,
      household: { name: 'Maison', members: [{ id: 'm1', name: 'Alix', color: 'var(--cat-1)' }] },
      categories: [makeCategory({ id: 'car-insurance' })],
      recurrences: [
        makeRecurrence({ id: 'r1', period: { unit: 'month', every: 1, anchorDay: 15 } }),
      ],
      advances,
    })

  const complete = {
    id: 'av1',
    label: 'Assurance auto',
    categoryId: 'car-insurance',
    memberId: 'm1',
    amount: 60_000,
    paidOn: '2026-01-15',
    from: '2026-01',
    to: '2026-12',
    recurrenceId: 'r1',
  }

  it('survit à l’aller-retour', () => {
    expect(parseImport(doc([complete])).data.advances[0]).toEqual(complete)
  })

  /* Le montant est le seul chiffre qu'une avance apporte : sans lui, il n'y a
     rien à reconstituer, et la ligne ne dirait rien de juste. */
  it('écarte une avance sans montant lisible', () => {
    expect(parseImport(doc([{ ...complete, amount: 'six cents' }])).data.advances).toEqual([])
  })

  /* Une épargne est toujours à quelqu'un : sans porteur, la mensualité ne
     reviendrait sur le livret de personne. */
  it('écarte une avance que personne ne porte', () => {
    const { memberId: _, ...orphan } = complete
    expect(parseImport(doc([orphan])).data.advances).toEqual([])
  })

  it('replie une période illisible sur le mois du paiement', () => {
    const vague = { ...complete, from: 'plus tard', to: 'jamais' }
    const advance = parseImport(doc([vague])).data.advances[0]
    expect(advance?.from).toBe('2026-01')
    expect(advance?.to).toBe('2026-01')
  })

  /* Une période à l'envers pose une récurrence qui s'arrête avant sa première
     mensualité : rien ne revient sur le livret, et le reste dû ne bouge plus
     d'un centime sans que rien ne dise pourquoi. Le formulaire l'interdit
     déjà ; un document venu d'ailleurs, non. */
  it('écarte une avance qui se termine avant de commencer', () => {
    const inversée = { ...complete, from: '2026-12', to: '2026-01' }
    expect(parseImport(doc([inversée])).data.advances).toEqual([])
  })

  it('accepte une avance d’un seul mois, bornes confondues', () => {
    const unMois = { ...complete, from: '2026-03', to: '2026-03' }
    expect(parseImport(doc([unMois])).data.advances[0]?.to).toBe('2026-03')
  })

  it('un document v4 reste lisible, simplement sans avance', () => {
    const v4 = doc([complete]).replace('"schemaVersion":5', '"schemaVersion":4')
    const result = parseImport(v4)
    expect(result.data.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(result.data.advances).toEqual([])
  })
})

describe('mois ouverts', () => {
  const doc = (months: unknown) =>
    JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, months })

  /* La forme seule laissait passer un treizième mois, que `startOfMonth` puis
     `parseISO` traversent ensuite sans bruit : le mois s'affichait sans nom. */
  it('écarte un mois hors des douze', () => {
    expect(parseImport(doc([{ ym: '2026-13', openedAt: '2026-01-01' }])).data.months).toEqual([])
    expect(parseImport(doc([{ ym: '2026-00', openedAt: '2026-01-01' }])).data.months).toEqual([])
  })

  it('garde les mois lisibles', () => {
    const months = parseImport(
      doc([
        { ym: '2026-12', openedAt: '2026-12-01', closed: true },
        { ym: '2026-01', openedAt: '2026-01-01' },
      ]),
    ).data.months
    expect(months.map((m) => m.ym)).toEqual(['2026-12', '2026-01'])
  })
})

describe('palette propre aux membres (v6)', () => {
  const v5 = (members: unknown[]) =>
    JSON.stringify({
      schemaVersion: 5,
      household: { name: 'Maison', members },
      categories: [],
      advances: [],
    })

  /* Le premier membre portait `var(--cat-1)`, qui vaut `--accent` : sa pastille
     se lisait comme une sélection, et disparaissait dans une pilule active. */
  it('recolore les membres d’un document v5, dans l’ordre du foyer', () => {
    const doc = v5([
      { id: 'm1', name: 'Luca', color: 'var(--cat-1)' },
      { id: 'm2', name: 'Clara', color: 'var(--cat-2)' },
    ])
    expect(parseImport(doc).data.household.members.map((m) => m.color)).toEqual([
      'var(--member-1)',
      'var(--member-2)',
    ])
  })

  it('garde le nom et l’identifiant de chacun', () => {
    const doc = v5([{ id: 'm1', name: 'Luca', color: 'var(--cat-1)' }])
    expect(parseImport(doc).data.household.members[0]).toEqual({
      id: 'm1',
      name: 'Luca',
      color: 'var(--member-1)',
    })
  })

  /* Au-delà de cinq membres la palette recommence : cinq teintes suffisent à un
     foyer, et deux pastilles identiques valent mieux qu'une teinte inventée. */
  it('reprend la palette au début au sixième membre', () => {
    const doc = v5(
      Array.from({ length: 6 }, (_, i) => ({ id: `m${String(i)}`, name: 'X', color: 'var(--cat-1)' })),
    )
    const colors = parseImport(doc).data.household.members.map((m) => m.color)
    expect(colors[5]).toBe('var(--member-1)')
    expect(colors[0]).toBe('var(--member-1)')
  })

  it('laisse passer un foyer sans membre', () => {
    expect(parseImport(v5([])).data.household.members).toEqual([])
  })

  it('n’a plus rien à recolorer sur un document déjà v6', () => {
    const doc = v5([{ id: 'm1', name: 'Luca', color: 'var(--member-3)' }]).replace(
      '"schemaVersion":5',
      '"schemaVersion":6',
    )
    expect(parseImport(doc).data.household.members[0]?.color).toBe('var(--member-3)')
  })
})

describe('langue de l’interface (v10)', () => {
  const v9 = (settings?: unknown) =>
    JSON.stringify({
      schemaVersion: 9,
      household: { name: 'Maison', members: [] },
      categories: [],
      advances: [],
      ...(settings === undefined ? {} : { settings }),
    })

  /* Le français, et **surtout pas** la langue du navigateur : un fichier écrit
     en français puis rouvert sur un appareil anglophone changerait de langue
     tout seul, ce qu'un réglage porté par le document sert à empêcher. La
     détection n'a lieu qu'à la création (`i18n/locale.ts`). */
  it('donne le français à un document qui ne dit pas sa langue', () => {
    expect(parseImport(v9()).data.settings.locale).toBe('fr')
    expect(parseImport(v9()).data.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
  })

  it('garde la langue d’un document qui en porte une', () => {
    expect(parseImport(v9({ locale: 'en' })).data.settings.locale).toBe('en')
  })

  /* Comme la palette : un réglage d'apparence venu d'une version qui en
     proposerait une troisième retombe sans que la ligne soit écartée. */
  it('ramène une langue inconnue au français, sans un mot', () => {
    const result = parseImport(v9({ theme: 'dark', locale: 'kl', currency: 'EUR' }))
    expect(result.data.settings.locale).toBe('fr')
    expect(result.data.settings.theme).toBe('dark')
    expect(result.notices).toEqual([])
  })
})

describe('palette d’apparence (v7)', () => {
  const v6 = (settings?: unknown) =>
    JSON.stringify({
      schemaVersion: 6,
      household: { name: 'Maison', members: [] },
      categories: [],
      advances: [],
      ...(settings === undefined ? {} : { settings }),
    })

  it('donne « classique » à un document qui n’en avait pas', () => {
    expect(parseImport(v6()).data.settings.palette).toBe('classique')
    expect(parseImport(v6()).data.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
  })

  /* Un réglage d'apparence n'est pas une donnée : une valeur venue d'une version
     qui proposait une palette de plus retombe sur celle par défaut, sans que la
     ligne soit écartée ni que la lecture ait quoi que ce soit à signaler. */
  it('ramène une palette inconnue à « classique », sans un mot', () => {
    const result = parseImport(v6({ theme: 'dark', palette: 'aurore', currency: 'EUR' }))
    expect(result.data.settings.palette).toBe('classique')
    expect(result.data.settings.theme).toBe('dark')
    expect(result.notices).toEqual([])
  })

  it('garde la palette d’un document qui en porte une', () => {
    expect(parseImport(v6({ palette: 'contrastee' })).data.settings.palette).toBe('contrastee')
  })

  /* Thème et palette sont deux réglages, et se règlent séparément. */
  it('laisse le thème et la palette diverger', () => {
    const data = parseImport(v6({ theme: 'light', palette: 'vive' })).data
    expect(data.settings).toMatchObject({ theme: 'light', palette: 'vive' })
  })
})

/* ============================================================================
 * La migration qui sépare le support de la catégorie (v8).
 *
 * Jusqu'à la v7, « Livrets » disait à la fois la nature du mouvement et
 * l'endroit où l'argent allait : le livret d'Alix et celui de Camille étaient le
 * même objet, et aucun capital ne pouvait s'y attacher. La v8 crée un support
 * par paire (catégorie d'épargne, personne) réellement employée — pas un de
 * plus — et relie chaque ligne au sien.
 * ==========================================================================*/
describe('supports d’épargne (v8)', () => {
  const v7 = (over: Record<string, unknown> = {}) =>
    JSON.stringify({
      schemaVersion: 7,
      household: {
        name: 'Maison',
        members: [
          { id: 'm1', name: 'Alix', color: 'var(--member-1)' },
          { id: 'm2', name: 'Camille', color: 'var(--member-2)' },
        ],
      },
      families: [
        { id: 'fam-savings', label: 'Épargne', kind: 'saving' },
        { id: 'fam-leisure', label: 'Loisirs', kind: 'charge' },
      ],
      categories: [
        makeCategory({ id: 'passbook', familyId: 'fam-savings' }),
        makeCategory({ id: 'plans', familyId: 'fam-savings' }),
        makeCategory({ id: 'outings', familyId: 'fam-leisure' }),
      ],
      recurrences: [
        {
          id: 'r-livret-alix',
          label: 'Virement livret',
          categoryId: 'passbook',
          memberId: 'm1',
          direction: 'out',
          amount: 30_000,
          period: { unit: 'month', every: 1, anchorDay: 31 },
          startedOn: '2026-01-31',
        },
        {
          id: 'r-livret-camille',
          label: 'Virement livret',
          categoryId: 'passbook',
          memberId: 'm2',
          direction: 'out',
          amount: 25_000,
          period: { unit: 'month', every: 1, anchorDay: 31 },
          startedOn: '2026-01-31',
        },
      ],
      entries: [
        {
          id: 'e1',
          recurrenceId: 'r-livret-alix',
          label: 'Virement livret',
          categoryId: 'passbook',
          memberId: 'm1',
          direction: 'out',
          amount: 30_000,
          date: '2026-01-31',
          status: 'confirmed',
        },
        {
          id: 'e2',
          label: 'Restaurant',
          categoryId: 'outings',
          memberId: 'm1',
          direction: 'out',
          amount: 4_200,
          date: '2026-01-12',
          status: 'confirmed',
        },
      ],
      advances: [],
      months: [{ ym: '2026-01', openedAt: '2026-01-01', closed: false }],
      ...over,
    })

  /* Deux personnes, un même poste : c'est exactement ce que la catégorie seule
     ne pouvait pas dire, et le premier chiffre que la migration doit rendre. */
  it('crée un support par paire (catégorie, personne) réellement employée', () => {
    const { savingSupports } = parseImport(v7()).data
    expect(savingSupports).toHaveLength(2)
    expect(savingSupports.map((s) => s.memberId).sort()).toEqual(['m1', 'm2'])
    expect(savingSupports.every((s) => s.categoryId === 'passbook')).toBe(true)
  })

  /* L'invariant du chantier : pas de doublon. La paire d'Alix est rencontrée
     par sa récurrence *et* par son échéance, et ne doit produire qu'un support. */
  it('ne duplique aucun support, même vu par plusieurs lignes', () => {
    const { savingSupports, recurrences, entries } = parseImport(v7()).data
    const alix = savingSupports.filter((s) => s.memberId === 'm1')
    expect(alix).toHaveLength(1)
    const support = alix[0]?.id
    expect(recurrences.find((r) => r.id === 'r-livret-alix')?.savingSupportId).toBe(support)
    expect(entries.find((e) => e.id === 'e1')?.savingSupportId).toBe(support)
  })

  it('ne touche pas aux lignes qui ne sont pas de l’épargne', () => {
    const entry = parseImport(v7()).data.entries.find((e) => e.id === 'e2')
    expect(entry?.savingSupportId).toBeUndefined()
    expect(entry?.amount).toBe(4_200)
  })

  /* « Ne pas inventer de capital actuel » : zéro est une information
     financière réelle, et rien dans un document v7 ne dit ce que le livret
     valait. */
  it('n’invente aucune valorisation', () => {
    expect(parseImport(v7()).data.savingValuations).toEqual([])
  })

  /* Un versement laissé « en commun » n'est à personne, et un support est
     toujours à quelqu'un : lui inventer un porteur attribuerait à quelqu'un une
     épargne qu'il n'a pas faite. */
  it('laisse sans support ce qui n’est à personne', () => {
    const orphan = JSON.parse(v7()) as Record<string, unknown>
    const entries = orphan['entries'] as Record<string, unknown>[]
    entries.push({
      id: 'e3',
      label: 'Virement',
      categoryId: 'passbook',
      direction: 'out',
      amount: 10_000,
      date: '2026-01-20',
      status: 'confirmed',
    })
    const { data } = parseImport(JSON.stringify(orphan))
    expect(data.entries.find((e) => e.id === 'e3')?.savingSupportId).toBeUndefined()
    expect(data.savingSupports).toHaveLength(2)
  })

  /* L'avance désigne son support par la catégorie de la récurrence qui la
     reconstitue : tout doit pointer vers le même compte. */
  it('fait passer une avance par le support de sa récurrence', () => {
    const { data } = parseImport(
      v7({
        advances: [
          {
            id: 'av1',
            label: 'Assurance auto',
            categoryId: 'outings',
            memberId: 'm1',
            amount: 60_000,
            paidOn: '2026-01-15',
            from: '2026-01',
            to: '2026-12',
            recurrenceId: 'r-livret-alix',
          },
        ],
      }),
    )
    const support = data.savingSupports.find((s) => s.memberId === 'm1')?.id
    expect(data.advances[0]?.savingSupportId).toBe(support)
  })

  /* Aucun montant ne bouge, aucune ligne ne disparaît : une migration qui
     réécrirait l'historique financier serait pire que pas de migration. */
  it('préserve les montants, les entrées, les règles et les mois', () => {
    const before = JSON.parse(v7()) as { entries: { amount: number }[] }
    const { data } = parseImport(v7())
    expect(data.entries.map((e) => e.amount)).toEqual(before.entries.map((e) => e.amount))
    expect(data.recurrences).toHaveLength(2)
    expect(data.months.map((m) => m.ym)).toEqual(['2026-01'])
  })

  /* Déterministe : deux lectures du même fichier donnent le même document, ce
     qui est la condition pour qu'un export réimporté ne dérive pas. */
  it('rend le même document à chaque lecture', () => {
    expect(parseImport(v7()).data).toStrictEqual(parseImport(v7()).data)
  })

  /* Le tour complet : un document migré ressort à l'identique d'un
     export / import, sans qu'une seconde migration ne s'intercale. */
  it('survit ensuite à l’aller-retour sans rien changer', () => {
    const migrated = parseImport(v7()).data
    expect(parseImport(serializeData(migrated)).data).toStrictEqual(migrated)
  })
})
