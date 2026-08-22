import { describe, expect, it } from 'vitest'
import { addMonthsToYm, currentYm, startOfMonth } from '@/domain/date'
import { money } from '@/domain/money'
import type { CategoryKind, Member } from '@/domain/types'
import {
  FALLBACK_CATEGORY,
  SOLO_KEY,
  type OnboardingDraft,
  emptyOnboardingDraft,
  keyedAmount,
  onboardingCards,
  onboardingCategories,
  onboardingRecurrences,
  onboardingTotals,
  startYm,
  typedAmount,
} from './queue'

const member = (id: string, name: string): Member => ({
  id,
  name,
  color: 'var(--member-1)',
})

/** Ce que le document par défaut sait : les trois catégories que la file pose. */
const KNOWS = new Set(['salary', 'rent', FALLBACK_CATEGORY, 'streaming', 'other-loan', 'passbook'])
const knows = (id: string): boolean => KNOWS.has(id)

/* La nature d'une catégorie, telle que le catalogue d'amorçage la range. La
   file ne la devine pas : elle la demande au document, exactement comme le
   chemin rapide vers une règle. */
const kindOf = (id: string): CategoryKind => (id === 'salary' ? 'resource' : 'charge')

const draftWith = (patch: Partial<OnboardingDraft>): OnboardingDraft => ({
  ...emptyOnboardingDraft(),
  ...patch,
})

describe('la longueur de la file', () => {
  it('compte six cartes en solo, quoi qu’il arrive', () => {
    expect(onboardingCards(false, []).map((card) => card.kind)).toStrictEqual([
      'who',
      'income',
      'rent',
      'extras',
      'start',
      'summary',
    ])
  })

  /* Le mode « à plusieurs » ne suffit pas : tant que personne n'est nommé, il
     n'y a personne à qui attribuer un revenu, et la carte reste celle de qui
     répond — sans propriétaire. C'est le partage exact de l'ancien
     `starterLines`, qui commandait sur `members.length === 0`. */
  it('reste sur la carte « toi » tant qu’aucun prénom n’est saisi', () => {
    const cards = onboardingCards(true, [])
    expect(cards).toHaveLength(6)
    expect(cards[1]).toStrictEqual({ kind: 'income', key: SOLO_KEY })
  })

  it('ajoute une carte de revenu par personne nommée', () => {
    const members = [member('a', 'Alix'), member('b', 'Camille')]
    const cards = onboardingCards(true, members)
    expect(cards).toHaveLength(7)
    expect(cards.filter((card) => card.kind === 'income')).toStrictEqual([
      { kind: 'income', key: 'a', memberId: 'a', name: 'Alix' },
      { kind: 'income', key: 'b', memberId: 'b', name: 'Camille' },
    ])
  })

  it('repasse à six cartes quand on retire tout le monde', () => {
    expect(onboardingCards(true, [member('a', 'Alix')])).toHaveLength(6)
    expect(onboardingCards(false, [])).toHaveLength(6)
  })
})

describe('la lecture des montants', () => {
  /* Le pavé produit une chaîne de chiffres qui se lit en centimes, comme sur un
     terminal de paiement : « 5 » vaut cinq centimes. La conversion est celle de
     `ui/keypad`, pas une seconde. */
  it('lit les chiffres du pavé comme des centimes', () => {
    expect(keyedAmount('5')).toBe(5)
    expect(keyedAmount('170000')).toBe(170_000)
  })

  /* Un champ vide, un zéro ou un négatif ne sont pas des erreurs à signaler :
     la file est facultative de bout en bout. Ils ne posent aucune règle. */
  it('ne rend rien d’un champ vide ou nul', () => {
    expect(keyedAmount('')).toBeNull()
    expect(keyedAmount('0')).toBeNull()
    expect(keyedAmount('000')).toBeNull()
  })

  it('accepte la virgule sur une charge libre', () => {
    expect(typedAmount('13,49')).toBe(1_349)
    expect(typedAmount('42')).toBe(4_200)
    expect(typedAmount('')).toBeNull()
    expect(typedAmount('pas un montant')).toBeNull()
  })
})

describe('les catégories que la file emploie', () => {
  it('retrouve le salaire, le loyer et le repli dans le catalogue', () => {
    const categories = onboardingCategories(knows)
    expect(categories.salary?.categoryId).toBe('salary')
    expect(categories.rent?.categoryId).toBe('rent')
    expect(categories.fallback).toBe(FALLBACK_CATEGORY)
  })

  /* La garde de `knownRuleKinds`, reprise telle quelle : une catégorie
     supprimée ne se remplace pas par un identifiant mort. `repairedCategory`
     sait rattraper ce cas, ce n'est pas une raison d'en fabriquer. */
  it('se tait sur ce que le document ne connaît plus', () => {
    const categories = onboardingCategories(() => false)
    expect(categories.salary).toBeUndefined()
    expect(categories.rent).toBeUndefined()
    expect(categories.fallback).toBeNull()
  })
})

describe('les règles que la file écrit', () => {
  const categories = onboardingCategories(knows)
  const members = [member('a', 'Alix'), member('b', 'Camille')]

  it('pose un salaire par personne, avec son propriétaire', () => {
    const cards = onboardingCards(true, members)
    const draft = draftWith({ multi: true, incomes: { a: '240000', b: '185000' } })
    const rules = onboardingRecurrences(draft, cards, categories, kindOf, currentYm())

    expect(rules).toHaveLength(2)
    expect(rules.map((rule) => rule.memberId)).toStrictEqual(['a', 'b'])
    expect(rules.map((rule) => rule.amount)).toStrictEqual([240_000, 185_000])
    expect(rules.every((rule) => rule.direction === 'in')).toBe(true)
  })

  /* Solo : pas de `memberId` du tout. `scopeToMember` et `memberCharges` ont un
     chemin solo explicite qui n'existe que là, et une ligne attribuée à un
     membre fantôme les enverrait sur l'autre. */
  it('pose le revenu de qui vit seul sans propriétaire', () => {
    const cards = onboardingCards(false, [])
    const draft = draftWith({ incomes: { [SOLO_KEY]: '170000' } })
    const rules = onboardingRecurrences(draft, cards, categories, kindOf, currentYm())

    expect(rules).toHaveLength(1)
    expect(rules[0]?.memberId).toBeUndefined()
  })

  /* Le logement et les charges libres ne portent ni membre ni `shared` :
     `defaultShared` les rend communs, et recopier la règle ici les empêcherait
     de la suivre si elle changeait. */
  it('laisse le logement et les charges libres communs par défaut', () => {
    const cards = onboardingCards(false, [])
    const draft = draftWith({
      rent: '98000',
      extras: [{ id: 'x', name: 'Netflix', amount: money(1_349) }],
    })
    const rules = onboardingRecurrences(draft, cards, categories, kindOf, currentYm())

    expect(rules).toHaveLength(2)
    for (const rule of rules) {
      expect(rule.memberId).toBeUndefined()
      expect(rule.shared).toBeUndefined()
      expect(rule.direction).toBe('out')
    }
  })

  /* E16 : chaque charge libre atterrit sur le repli, et sur rien d'autre.
     `Recurrence.categoryId` est obligatoire, et deviner une catégorie sur un nom
     libre rangerait un jour « cantine » sous « Loisirs » sans le dire. */
  it('range chaque charge libre sous le repli, en gardant son nom', () => {
    const cards = onboardingCards(false, [])
    const draft = draftWith({
      extras: [
        { id: 'x', name: 'Netflix', amount: money(1_349) },
        { id: 'y', name: 'Mutuelle', amount: money(4_200) },
      ],
    })
    const rules = onboardingRecurrences(draft, cards, categories, kindOf, currentYm())

    expect(rules.map((rule) => rule.label)).toStrictEqual(['Netflix', 'Mutuelle'])
    expect(rules.every((rule) => rule.categoryId === FALLBACK_CATEGORY)).toBe(true)
  })

  it('n’écrit aucune charge libre quand le repli a été supprimé', () => {
    const cards = onboardingCards(false, [])
    const draft = draftWith({ extras: [{ id: 'x', name: 'Netflix', amount: money(1_349) }] })
    const without = onboardingCategories((id) => id !== FALLBACK_CATEGORY && knows(id))
    expect(onboardingRecurrences(draft, cards, without, kindOf, currentYm())).toStrictEqual([])
  })

  /* E17 : le mois de départ décide du 1er que portent les règles. Le mois
     courant, lui, s'ouvre de toute façon — ce n'est pas cette fonction qui le
     décide, et c'est justement le point. */
  it('ancre les règles au 1er du mois de départ', () => {
    const cards = onboardingCards(false, [])
    const draft = draftWith({ rent: '98000', start: 'next' })
    const ym = startYm(draft)
    expect(ym).toBe(addMonthsToYm(currentYm(), 1))

    const rules = onboardingRecurrences(draft, cards, categories, kindOf, ym)
    expect(rules[0]?.startedOn).toBe(startOfMonth(ym))
    expect(rules[0]?.period).toStrictEqual({ unit: 'month', every: 1, anchorDay: 1 })
  })

  it('ignore un champ vide sans retenir les autres', () => {
    const cards = onboardingCards(false, [])
    const draft = draftWith({ incomes: { [SOLO_KEY]: '240000' }, rent: '' })
    const rules = onboardingRecurrences(draft, cards, categories, kindOf, currentYm())
    expect(rules).toHaveLength(1)
    expect(rules[0]?.categoryId).toBe('salary')
  })
})

describe('le récapitulatif', () => {
  it('additionne les revenus de tout le monde et retire ce qui est prévu', () => {
    const members = [member('a', 'Alix'), member('b', 'Camille')]
    const cards = onboardingCards(true, members)
    const draft = draftWith({
      multi: true,
      incomes: { a: '300000', b: '100000' },
      rent: '90000',
      extras: [{ id: 'x', name: 'Netflix', amount: money(1_000) }],
    })

    const totals = onboardingTotals(draft, cards)
    expect(totals.income).toBe(400_000)
    expect(totals.rent).toBe(90_000)
    expect(totals.extras).toBe(1_000)
    expect(totals.extrasCount).toBe(1)
    /* Le prévisionnel, et il porte ce nom-là : « reste à vivre » désigne autre
       chose dans le domaine — un solde arrêté la veille de la prochaine rentrée
       d'argent (`domain/stats.ts`). */
    expect(totals.forecast).toBe(309_000)
  })

  it('ne compte que les cartes de la file, pas les revenus d’un membre retiré', () => {
    const draft = draftWith({ multi: true, incomes: { a: '300000', b: '100000' } })
    // Camille a été retirée : sa carte n'existe plus, son montant non plus.
    const totals = onboardingTotals(draft, onboardingCards(true, [member('a', 'Alix')]))
    expect(totals.income).toBe(300_000)
  })
})
