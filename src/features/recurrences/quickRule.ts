/* Le chemin rapide vers une règle : ce qu'il demande, et ce qu'il en tire.
 *
 * Séparé de l'écran pour la raison qui vaut partout ailleurs — c'est du calcul
 * pur, des réponses vers un payload de `Recurrence`, donc ça se teste sans
 * monter une carte. Le composant ne fait que lire des champs et appeler
 * `buildQuickRule`.
 *
 * **Ce fichier existe parce que trois cartes ne suffisent pas.** Le design en
 * demande trois — nature, montant, jour — et une `Recurrence` en veut plus :
 * `categoryId` est obligatoire (`domain/types.ts`), le sens s'en déduit, et
 * sans membre ni `shared` la répartition ne sait rien ranger. Depuis que
 * `/flux` classe chaque ligne par catégorie, par `isCommon` et par membre, une
 * règle écrite sans ces trois-là n'atterrit pas seulement « quelque part » :
 * elle atterrit dans la mauvaise section, et une charge sans propriétaire
 * devient **commune** par `defaultShared`, donc découpée entre tout le monde.
 *
 * Les cinq puces du prototype sont des libellés en dur. Ici elles portent de
 * vrais identifiants du catalogue d'amorçage, comme le fait déjà
 * `onboarding/starter.ts` — et elles se taisent quand l'identifiant n'existe
 * plus dans le document, parce qu'on peut supprimer une catégorie.
 */

import { type ISODate, type YearMonth } from '@/domain/date'
import type { Money } from '@/domain/money'
import { clampToMonth } from '@/domain/recurrence'
import { memberRequired } from '@/domain/split'
import { type CategoryKind, type Recurrence, directionOfKind } from '@/domain/types'
import { t } from '@/i18n/strings'

/* Les identifiants du catalogue d'amorçage (`persistence/defaults.ts`). Stables,
   mais jamais supposés présents : `knownRuleKinds` les vérifie. */
const RENT = 'rent'
const SUBSCRIPTION = 'streaming'
const SALARY = 'salary'
const LOAN = 'other-loan'
const SAVING = 'passbook'

/**
 * Une puce de la première carte : un cas courant, et la catégorie réelle qu'il
 * désigne.
 *
 * `ruleLabel` est le nom que la règle portera si l'on n'en donne pas d'autre :
 * la puce dit « Un loyer » — une question —, la ligne du mois dira « Loyer ».
 */
export type RuleKind = {
  id: string
  label: string
  ruleLabel: string
  categoryId: string
}

const KINDS = (): RuleKind[] => [
  { id: 'rent', label: t.quickRule.kindRent, ruleLabel: t.quickRule.nameRent, categoryId: RENT },
  {
    id: 'subscription',
    label: t.quickRule.kindSubscription,
    ruleLabel: t.quickRule.nameSubscription,
    categoryId: SUBSCRIPTION,
  },
  {
    id: 'salary',
    label: t.quickRule.kindSalary,
    ruleLabel: t.quickRule.nameSalary,
    categoryId: SALARY,
  },
  { id: 'loan', label: t.quickRule.kindLoan, ruleLabel: t.quickRule.nameLoan, categoryId: LOAN },
  {
    id: 'saving',
    label: t.quickRule.kindSaving,
    ruleLabel: t.quickRule.nameSaving,
    categoryId: SAVING,
  },
]

/**
 * Les puces que ce document sait tenir.
 *
 * Une puce dont la catégorie a été supprimée poserait une règle sur un
 * identifiant mort : `repairedCategory` sait rattraper ce cas, ce n'est pas une
 * raison d'en fabriquer. C'est mot pour mot la garde de `starterRecurrences`.
 */
export function knownRuleKinds(knows: (categoryId: string) => boolean): RuleKind[] {
  return KINDS().filter((kind) => knows(kind.categoryId))
}

/** Les quatre jours proposés d'un doigt. 31 *est* « le dernier jour » — voir `LAST_DAY`. */
export const DAY_SHORTCUTS = [2, 5, 28, 31] as const

/** Le jour du mois est borné, jamais reporté : 31 tombe au 28 en février. */
export function isValidDay(day: number): boolean {
  return Number.isInteger(day) && day >= 1 && day <= 31
}

/** Le quantième saisi, ou `NaN` tant qu'il n'en est pas un. */
export function quickRuleDay(draft: QuickRuleDraft): number {
  return Number.parseInt(draft.dayText, 10)
}

/**
 * Ce que les cartes retiennent. Une chaîne de chiffres pour le montant : c'est
 * ce que le pavé produit, et `amountFromKeys` le relit une seule fois.
 */
export type QuickRuleDraft = {
  /** La puce choisie, ou `null` si l'on n'a donné qu'un nom. */
  kindId: string | null
  name: string
  keys: string
  /**
   * Le jour du mois, tel qu'il est tapé.
   *
   * Une chaîne et non un nombre : un champ qu'on vide doit pouvoir l'être, et
   * un `parseInt('')` rendu à zéro rendrait le champ impossible à effacer — on
   * y lirait « 0 » au lieu du vide. La lecture numérique se fait une fois, à la
   * frontière, par `quickRuleDay`.
   */
  dayText: string
  categoryId: string
  memberId: string
  /** `undefined` = la règle de partage tranche ; voir `isSharedEntry`. */
  shared: boolean | undefined
}

/** Le brouillon d'entrée : rien de choisi, le 1er du mois, aucun propriétaire. */
export function emptyQuickRule(): QuickRuleDraft {
  return {
    kindId: null,
    name: '',
    keys: '',
    dayText: '1',
    categoryId: '',
    memberId: '',
    shared: undefined,
  }
}

/**
 * Le nom que portera la règle.
 *
 * « L'un ou l'autre suffit », dit le design : la puce donne un nom par défaut,
 * le champ libre l'emporte dès qu'il est rempli. Sans l'un ni l'autre, il n'y a
 * rien à écrire — c'est l'erreur de la première carte.
 */
export function quickRuleLabel(draft: QuickRuleDraft, kinds: readonly RuleKind[]): string {
  const typed = draft.name.trim()
  if (typed !== '') return typed
  return kinds.find((kind) => kind.id === draft.kindId)?.ruleLabel ?? ''
}

/**
 * La première échéance : le jour choisi, dans le mois qu'on regarde.
 *
 * Et non le mois suivant, même si le jour est déjà passé. L'état vide du mois
 * envoie ici en disant « Août est vide » : rendre la main sur un août toujours
 * vide, avec une règle qui ne commence qu'en septembre, répondrait à côté. La
 * ligne d'août arrive « à confirmer », ce qui est exactement son état — on
 * saura dire si elle a eu lieu.
 */
export function quickStartedOn(ym: YearMonth, day: number): ISODate {
  return clampToMonth(ym, day)
}

/** Ce que la carte visible attend encore, ou `null` si elle est complète. */
export function quickRuleError(
  step: 'what' | 'amount' | 'when' | 'details',
  draft: QuickRuleDraft,
  context: { amount: Money | null; kind: CategoryKind; hasMembers: boolean },
): string | null {
  switch (step) {
    case 'what':
      return draft.kindId === null && draft.name.trim() === '' ? t.quickRule.whatRequired : null
    case 'amount':
      /* Le montant variable n'existe pas sur ce chemin : il se règle au
         formulaire complet, et une règle sans montant posée sans le savoir
         remplirait la file variable de la revue de lignes à zéro. */
      return context.amount === null || context.amount <= 0 ? t.entry.amountRequired : null
    case 'when':
      return isValidDay(quickRuleDay(draft)) ? null : t.quickRule.dayRequired
    case 'details':
      if (draft.categoryId === '') return t.entry.categoryRequired
      if (
        context.hasMembers &&
        memberRequired(directionOfKind(context.kind), context.kind, draft.memberId, draft.shared)
      ) {
        return t.entry.memberRequiredRecurring
      }
      return null
  }
}

/**
 * Le payload de la règle. Mensuelle, ancrée au jour choisi.
 *
 * Une seule cadence, et c'est assumé : les sept de `period.ts` — hebdomadaire,
 * quinzaine, trimestre, année, « tous les n » — vivent au formulaire complet.
 * Trois cartes qui les proposeraient seraient le formulaire, en plus long.
 *
 * `shared` ne part que lorsqu'il **diverge** de la règle, comme partout
 * ailleurs : tant que la case dit ce que `defaultShared` dirait, c'est la règle
 * qui reste maîtresse et le document ne se remplit pas de booléens redondants.
 */
export function buildQuickRule(
  draft: QuickRuleDraft,
  kinds: readonly RuleKind[],
  context: { amount: Money; kind: CategoryKind; ym: YearMonth },
): Omit<Recurrence, 'id'> {
  return {
    label: quickRuleLabel(draft, kinds),
    categoryId: draft.categoryId,
    ...(draft.memberId === '' ? {} : { memberId: draft.memberId }),
    direction: directionOfKind(context.kind),
    amount: context.amount,
    period: { unit: 'month', every: 1, anchorDay: quickRuleDay(draft) },
    startedOn: quickStartedOn(context.ym, quickRuleDay(draft)),
    ...(draft.shared === undefined ? {} : { shared: draft.shared }),
  }
}
