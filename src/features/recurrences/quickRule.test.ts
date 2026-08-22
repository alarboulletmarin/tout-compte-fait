import { describe, expect, it } from 'vitest'
import { eur } from '@/domain/fixtures'
import {
  buildQuickRule,
  emptyQuickRule,
  isValidDay,
  knownRuleKinds,
  quickRuleDay,
  quickRuleError,
  quickRuleLabel,
  quickStartedOn,
} from './quickRule'

const ALL = (): string[] => knownRuleKinds(() => true).map((kind) => kind.categoryId)

describe('quickRule', () => {
  describe('les puces', () => {
    /* La décision D14 : ce ne sont pas des libellés en dur, ce sont de vrais
       identifiants du catalogue d'amorçage — sans quoi la règle n'aurait pas de
       catégorie, donc ni sens ni section dans `/flux`. */
    it('portent de vrais identifiants du catalogue', () => {
      expect(ALL()).toEqual(['rent', 'streaming', 'salary', 'other-loan', 'passbook'])
    })

    it('se taisent quand la catégorie n’existe plus dans le document', () => {
      const kinds = knownRuleKinds((id) => id !== 'salary')
      expect(kinds.map((kind) => kind.categoryId)).not.toContain('salary')
      expect(kinds).toHaveLength(4)
    })
  })

  describe('le nom', () => {
    const kinds = knownRuleKinds(() => true)

    it('vient de la puce tant qu’on n’en donne pas d’autre', () => {
      expect(quickRuleLabel({ ...emptyQuickRule(), kindId: 'rent' }, kinds)).toBe('Loyer')
    })

    it('est celui qu’on écrit dès qu’on en écrit un', () => {
      const draft = { ...emptyQuickRule(), kindId: 'rent', name: '  Studio  ' }
      expect(quickRuleLabel(draft, kinds)).toBe('Studio')
    })
  })

  describe('le jour', () => {
    it('reste borné à 1–31 : 31 *est* le dernier jour, il n’est jamais reporté', () => {
      expect(isValidDay(31)).toBe(true)
      expect(isValidDay(32)).toBe(false)
      expect(isValidDay(0)).toBe(false)
      expect(isValidDay(Number.NaN)).toBe(false)
    })

    it('se lit comme un nombre une seule fois, et vaut NaN tant qu’il n’en est pas un', () => {
      expect(quickRuleDay({ ...emptyQuickRule(), dayText: '' })).toBeNaN()
      expect(quickRuleDay({ ...emptyQuickRule(), dayText: '17' })).toBe(17)
    })

    /* La première échéance tombe dans le mois qu'on regarde, même si le jour
       est passé : l'état vide du mois envoie ici en disant « août est vide », et
       une règle qui ne commencerait qu'en septembre répondrait à côté. */
    it('pose la première échéance dans le mois affiché, borné au dernier jour', () => {
      expect(quickStartedOn('2026-08', 5)).toBe('2026-08-05')
      expect(quickStartedOn('2026-02', 31)).toBe('2026-02-28')
    })
  })

  describe('la validation', () => {
    const base = { amount: eur(1_000), kind: 'charge' as const, hasMembers: true }

    it('demande une puce ou un nom à la première carte', () => {
      expect(quickRuleError('what', emptyQuickRule(), base)).not.toBeNull()
      expect(quickRuleError('what', { ...emptyQuickRule(), name: 'Mutuelle' }, base)).toBeNull()
    })

    it('refuse un montant absent ou nul', () => {
      expect(quickRuleError('amount', emptyQuickRule(), { ...base, amount: null })).not.toBeNull()
      expect(quickRuleError('amount', emptyQuickRule(), base)).toBeNull()
    })

    /* Sans catégorie, la règle n'a ni sens ni section : c'est le champ que les
       trois cartes du design ne produisent pas, et il est obligatoire. */
    it('exige une catégorie à la dernière carte', () => {
      const draft = { ...emptyQuickRule(), kindId: 'rent' }
      expect(quickRuleError('details', draft, base)).not.toBeNull()
      expect(
        quickRuleError('details', { ...draft, categoryId: 'rent' }, base),
      ).toBeNull()
    })

    /* Un revenu sans propriétaire n'apparaît dans le mois de personne, et la
       somme des soldes individuels cesse de valoir celui du foyer. */
    it('exige un membre sur un revenu, et se tait sur une charge commune', () => {
      const income = { ...emptyQuickRule(), kindId: 'salary', categoryId: 'salary' }
      expect(quickRuleError('details', income, { ...base, kind: 'resource' })).not.toBeNull()
      expect(
        quickRuleError('details', { ...income, memberId: 'm1' }, { ...base, kind: 'resource' }),
      ).toBeNull()

      const charge = { ...emptyQuickRule(), kindId: 'rent', categoryId: 'rent' }
      expect(quickRuleError('details', charge, base)).toBeNull()
    })

    it('ne demande personne dans un foyer sans membre', () => {
      const income = { ...emptyQuickRule(), kindId: 'salary', categoryId: 'salary' }
      expect(
        quickRuleError('details', income, { ...base, kind: 'resource', hasMembers: false }),
      ).toBeNull()
    })
  })

  describe('le payload', () => {
    const kinds = knownRuleKinds(() => true)

    it('rend une règle mensuelle complète, sens déduit de la catégorie', () => {
      const draft = {
        ...emptyQuickRule(),
        kindId: 'salary',
        dayText: '28',
        categoryId: 'salary',
        memberId: 'm1',
      }
      expect(
        buildQuickRule(draft, kinds, { amount: eur(260_000), kind: 'resource', ym: '2026-08' }),
      ).toEqual({
        label: 'Salaire',
        categoryId: 'salary',
        memberId: 'm1',
        direction: 'in',
        amount: eur(260_000),
        period: { unit: 'month', every: 1, anchorDay: 28 },
        startedOn: '2026-08-28',
      })
    })

    /* `shared` ne part que lorsqu'il diverge de la règle : tant que la case dit
       ce que `defaultShared` dirait, le document ne se remplit pas de booléens
       redondants. */
    it('n’écrit ni membre ni partage quand rien ne diverge', () => {
      const draft = { ...emptyQuickRule(), kindId: 'rent', categoryId: 'rent', dayText: '5' }
      const built = buildQuickRule(draft, kinds, {
        amount: eur(110_000),
        kind: 'charge',
        ym: '2026-08',
      })
      expect(built).not.toHaveProperty('memberId')
      expect(built).not.toHaveProperty('shared')
      expect(built.direction).toBe('out')
    })
  })
})
