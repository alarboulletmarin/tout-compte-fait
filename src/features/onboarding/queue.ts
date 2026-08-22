/* La file du premier lancement : de quoi elle est faite, et ce qu'elle écrit.
 *
 * Séparé des cartes pour la raison qui vaut partout ailleurs — c'est du calcul
 * pur, des réponses vers des payloads de `Recurrence`, donc ça se teste sans
 * monter un écran. Les cartes ne font que lire des champs.
 *
 * **Rien de neuf n'est construit ici.** Les payloads passent par
 * `buildQuickRule` (`features/recurrences/quickRule.ts`), qui est déjà le
 * chemin court vers une règle mensuelle : il déduit le sens de la nature de la
 * catégorie, n'écrit `shared` que lorsqu'il diverge de la règle de partage, et
 * ancre la première échéance avec `quickStartedOn`. Les identifiants de
 * catégorie, eux, viennent de `knownRuleKinds`, qui **se tait quand la
 * catégorie a été supprimée** — c'était déjà la garde de l'ancien
 * `starterRecurrences`, et il n'y a aucune raison d'en écrire une seconde.
 *
 * **Solo = zéro membre**, et c'est la décision qui commande toute la file.
 * L'ancien `starterLines` posait la ligne « ton salaire » sans `memberId` quand
 * la liste des membres était vide, et son commentaire disait pourquoi :
 * « demander à quelqu'un de se désigner lui-même serait la seule question de
 * l'app à n'avoir aucune conséquence ». En aval, `scopeToMember` et
 * `memberCharges` ont un chemin solo explicite. La file reprend ce partage au
 * mot près : aucune personne nommée → une carte de revenu, sans propriétaire ;
 * des personnes nommées → une carte par personne, chacune avec la sienne.
 *
 * Le corollaire est que **le prénom de qui répond fait partie des prénoms
 * saisis** quand on vit à plusieurs. Ce n'est pas un détail d'écriture : le
 * prorata se lit sur les récurrences de nature `resource` d'un **membre**
 * (`domain/split.ts`), donc un revenu posé sans `memberId` ne pèse rien dans le
 * dénominateur — un foyer de deux dont l'un ne serait pas membre verrait
 * l'autre porter 100 % des charges communes. La carte le dit en toutes lettres
 * plutôt que d'inventer un membre « moi » derrière le dos de qui répond.
 */

import { type YearMonth, addMonthsToYm, currentYm } from '@/domain/date'
import { type Money, ZERO, parseAmount, sub, sum } from '@/domain/money'
import type { CategoryKind, Member, Recurrence } from '@/domain/types'
import {
  type RuleKind,
  buildQuickRule,
  emptyQuickRule,
  knownRuleKinds,
} from '@/features/recurrences/quickRule'
import { amountFromKeys } from '@/ui/keypad'

/* Les identifiants des trois catégories que la file emploie. Les deux
   premières sont celles de `knownRuleKinds` — on les retrouve par leur `id` de
   puce plutôt que de recopier l'identifiant de catégorie. La troisième est le
   repli des charges libres, et elle n'a pas de puce : personne n'écrirait une
   règle en choisissant « Divers ». */
const SALARY_KIND = 'salary'
const RENT_KIND = 'rent'
export const FALLBACK_CATEGORY = 'misc'

/** La clé de la carte de revenu de qui vit seul — elle n'a pas d'id de membre. */
export const SOLO_KEY = 'solo'

/** Une charge libre, telle que la carte la retient. */
export type ExtraCharge = { id: string; name: string; amount: Money }

/** Ce que les cartes retiennent, d'un bout à l'autre de la file. */
export type OnboardingDraft = {
  /** « Je vis seul » ou « À plusieurs ». Les membres, eux, vivent dans le document. */
  multi: boolean
  /** Chiffres frappés au pavé, par clé de carte de revenu. */
  incomes: Record<string, string>
  /** Chiffres frappés au pavé. */
  rent: string
  extras: ExtraCharge[]
  /** Le mois où les règles commencent — et celui qu'on affichera en sortant. */
  start: 'current' | 'next'
}

export function emptyOnboardingDraft(): OnboardingDraft {
  return { multi: false, incomes: {}, rent: '', extras: [], start: 'current' }
}

/** Une carte de la file : ce qu'elle demande. */
export type OnboardingCard =
  | { kind: 'who' }
  | { kind: 'income'; key: string; memberId?: string; name?: string }
  | { kind: 'rent' }
  | { kind: 'extras' }
  | { kind: 'start' }
  | { kind: 'summary' }

/**
 * La file, telle que les réponses la font.
 *
 * Elle s'allonge et se raccourcit sous le doigt : ajouter un prénom ajoute une
 * carte de revenu, en retirer un la retire. C'est la seule chose que la barre de
 * segments du haut a à dire, et c'est pourquoi elle se recalcule à chaque rendu
 * plutôt que d'être figée au montage.
 *
 * Pas de carte de partage. Le modèle ne connaît qu'une règle — le prorata des
 * revenus (`memberShares`) — et une carte qui n'offrirait aucun choix serait la
 * seule de la file à ne rien demander. Ce qu'elle aurait dit se lit là où la
 * réponse se donne : sous la question du foyer, et dans le récapitulatif.
 */
export function onboardingCards(
  multi: boolean,
  members: readonly Member[],
): OnboardingCard[] {
  const incomes: OnboardingCard[] =
    !multi || members.length === 0
      ? [{ kind: 'income', key: SOLO_KEY }]
      : members.map((member) => ({
          kind: 'income' as const,
          key: member.id,
          memberId: member.id,
          name: member.name,
        }))

  return [
    { kind: 'who' },
    ...incomes,
    { kind: 'rent' },
    { kind: 'extras' },
    { kind: 'start' },
    { kind: 'summary' },
  ]
}

/** Le mois où les règles commencent : celui qu'on regarde, ou le suivant. */
export function startYm(draft: OnboardingDraft): YearMonth {
  return draft.start === 'next' ? addMonthsToYm(currentYm(), 1) : currentYm()
}

/**
 * Le montant d'un champ de pavé, ou `null` s'il ne vaut rien.
 *
 * Zéro et négatif ne sont pas des erreurs à signaler : la file est facultative
 * de bout en bout, et rien de ce qu'on y laisse vide ne bloque. Ils ne posent
 * simplement aucune règle. C'est mot pour mot le raisonnement de l'ancien
 * `starterAmount`.
 */
export function keyedAmount(keys: string): Money | null {
  const amount = amountFromKeys(keys)
  return amount === null || amount <= 0 ? null : amount
}

/** Le montant d'une charge libre, tel qu'il a été tapé. Virgule acceptée. */
export function typedAmount(text: string): Money | null {
  const amount = parseAmount(text)
  return amount === null || amount <= 0 ? null : amount
}

/** Ce que le document sait tenir : les deux puces employées, et le repli. */
export type OnboardingCategories = {
  salary: RuleKind | undefined
  rent: RuleKind | undefined
  /** `null` quand « Divers » a été supprimé : les charges libres se taisent. */
  fallback: string | null
}

export function onboardingCategories(
  knows: (categoryId: string) => boolean,
): OnboardingCategories {
  const kinds = knownRuleKinds(knows)
  return {
    salary: kinds.find((kind) => kind.id === SALARY_KIND),
    rent: kinds.find((kind) => kind.id === RENT_KIND),
    fallback: knows(FALLBACK_CATEGORY) ? FALLBACK_CATEGORY : null,
  }
}

/** Un payload de règle mensuelle, ancrée au 1er du mois de départ. */
function monthlyRule(
  label: string,
  categoryId: string,
  amount: Money,
  kind: CategoryKind,
  ym: YearMonth,
  memberId?: string,
): Omit<Recurrence, 'id'> {
  return buildQuickRule(
    {
      ...emptyQuickRule(),
      /* Le nom libre l'emporte sur la puce dans `quickRuleLabel` : on ne passe
         donc aucune puce, et le libellé est exactement celui qu'on donne. */
      name: label,
      categoryId,
      memberId: memberId ?? '',
    },
    [],
    { amount, kind, ym },
  )
}

/**
 * Toutes les règles que ces réponses décrivent.
 *
 * Le jour ne se demande pas — un champ de plus par carte aurait fait de la file
 * le questionnaire que le cahier §4.1 refuse. Le 1er est le défaut, il est
 * annoncé sous les cartes, et il se corrige d'une reprise depuis la fiche.
 *
 * Le loyer et les charges libres ne portent ni membre ni `shared` :
 * `defaultShared` les rend communs puisque ce sont des charges que personne ne
 * s'attribue. C'est la règle du formulaire de saisie, appliquée et non
 * recopiée.
 *
 * Les charges libres produisent des **récurrences**, jamais des entrées du
 * mois : une charge qui revient et qui ne serait qu'une ligne d'août ne
 * remplirait pas septembre, ce qui est la promesse même de l'écran.
 */
export function onboardingRecurrences(
  draft: OnboardingDraft,
  cards: readonly OnboardingCard[],
  categories: OnboardingCategories,
  kindOf: (categoryId: string) => CategoryKind,
  ym: YearMonth,
): Omit<Recurrence, 'id'>[] {
  const rules: Omit<Recurrence, 'id'>[] = []

  const salary = categories.salary
  if (salary !== undefined) {
    for (const card of cards) {
      if (card.kind !== 'income') continue
      const amount = keyedAmount(draft.incomes[card.key] ?? '')
      if (amount === null) continue
      rules.push(
        monthlyRule(
          salary.ruleLabel,
          salary.categoryId,
          amount,
          kindOf(salary.categoryId),
          ym,
          card.memberId,
        ),
      )
    }
  }

  const rent = categories.rent
  const rentAmount = keyedAmount(draft.rent)
  if (rent !== undefined && rentAmount !== null) {
    rules.push(
      monthlyRule(rent.ruleLabel, rent.categoryId, rentAmount, kindOf(rent.categoryId), ym),
    )
  }

  const fallback = categories.fallback
  if (fallback !== null) {
    for (const extra of draft.extras) {
      rules.push(monthlyRule(extra.name, fallback, extra.amount, kindOf(fallback), ym))
    }
  }

  return rules
}

/** Ce que le récapitulatif additionne, sans rien recalculer à l'écran. */
export type OnboardingTotals = {
  income: Money
  rent: Money
  extras: Money
  extrasCount: number
  /** Revenus moins tout ce qui est prévu. C'est le **prévisionnel**, et il porte
   *  ce nom-là : « reste à vivre » désigne autre chose dans le domaine
   *  (`stats.ts`), un solde arrêté la veille de la prochaine rentrée d'argent. */
  forecast: Money
}

export function onboardingTotals(
  draft: OnboardingDraft,
  cards: readonly OnboardingCard[],
): OnboardingTotals {
  const income = sum(
    cards
      .filter((card) => card.kind === 'income')
      .map((card) => keyedAmount(draft.incomes[card.key] ?? '') ?? ZERO),
  )
  const rent = keyedAmount(draft.rent) ?? ZERO
  const extras = sum(draft.extras.map((extra) => extra.amount))
  return {
    income,
    rent,
    extras,
    extrasCount: draft.extras.length,
    forecast: sub(sub(income, rent), extras),
  }
}
