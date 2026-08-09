/* ============================================================================
 * D'où part une projection quand elle part de l'épargne réelle.
 *
 * Ce module répond à **deux** des quatre nombres du simulateur — le capital et
 * le versement mensuel — et il s'arrête là. Il ne rend **aucun taux**, et c'est
 * la règle qui le tient tout entier : un Livret A dont le taux du jour est connu
 * n'est pas un « rendement garanti sur dix ans », et prêter à un PEA le
 * rendement de sa dernière décennie serait exactement le tour de passe-passe des
 * simulateurs de vente (cahier §4.6 ter). Le capital et le versement sont des
 * **faits** que l'app connaît déjà ; le rendement est une **hypothèse**, et elle
 * reste à la personne qui la pose.
 *
 * **Il lit, il n'écrit rien.** C'est la nuance qui a fait bouger le cahier :
 * l'écran ne posait aucun `Entry`, aucun relevé — il ne le fait toujours pas —,
 * mais il refusait aussi de *lire*, si bien qu'on retapait à la main un capital
 * que l'app affichait deux écrans plus haut. Recopier une donnée qu'on possède
 * n'est pas de la prudence, c'est une corvée ; ce qu'il fallait interdire, c'est
 * qu'une simulation redescende dans le document, et rien ici ne le permet.
 *
 * **Le capital est l'estimation, pas le dernier relevé.** C'est déjà ce que
 * l'écran Épargne divise pour dire combien de mois le foyer tient : deux
 * réponses différentes à « combien j'ai aujourd'hui », d'un écran à l'autre,
 * seraient impossibles à défendre.
 *
 * **Rien ne s'additionne entre deux personnes.** L'épargne est le seul chiffre
 * de l'app qui n'a aucun sens au foyer (cahier §4.6 bis) : une origine désigne
 * donc un support, ou toute l'épargne d'**une** personne, jamais la somme de
 * deux. C'est le seul endroit où ce module refuse quelque chose.
 * ==========================================================================*/

import type { ISODate } from './date'
import { type Money, ZERO, add, sub } from './money'
import { monthlyEquivalent } from './recurrence'
import { savingTotal, supportValue } from './saving'
import type { KindOf } from './stats'
import type { Entry, Recurrence, SavingSupport, SavingValuation } from './types'

/**
 * D'où part la simulation.
 *
 * Trois formes et pas quatre : il n'existe pas de « toute l'épargne du foyer »,
 * parce que deux personnes qui ont 12 000 € et 8 000 € de côté n'ont pas
 * 20 000 € — elles ont deux comptes et deux décisions (cahier §4.6 bis).
 *
 * Le type vit dans le domaine plutôt que dans l'écran : le sélecteur qui le lit
 * est dans `store/`, et un `store/` qui importerait un type d'écran inverserait
 * les couches.
 */
export type ProjectionSource =
  /** Quatre nombres tapés à la main, et rien d'autre — l'origine par défaut. */
  | { kind: 'free' }
  /** Toute l'épargne d'une personne. */
  | { kind: 'member'; id: string }
  /** Un support précis. */
  | { kind: 'support'; id: string }

/**
 * Ce qu'une projection reprend de l'épargne réelle.
 *
 * `capital` vaut `null` quand rien n'a jamais été relevé : zéro est une
 * information financière — un livret vidé —, l'absence de relevé n'en est pas
 * une, et le simulateur doit pouvoir dire lequel des deux il a sous la main
 * plutôt que de partir de zéro en silence.
 */
export type ProjectionStart = {
  /** Le capital estimé — dernier relevé plus les mouvements confirmés depuis. */
  capital: Money | null
  /** Les versements récurrents nets, ramenés au mois. Zéro s'il n'y en a pas. */
  monthly: Money
  /** Combien de supports comptés n'ont aucun relevé, et manquent donc au capital. */
  unvalued: number
  /**
   * Une règle d'épargne au montant variable a été laissée de côté : elle n'a
   * pas de mensualité à reprendre, et l'écran le dit plutôt que de compter
   * zéro à sa place.
   */
  variable: boolean
}

const EMPTY: ProjectionStart = { capital: null, monthly: ZERO, unvalued: 0, variable: false }

/**
 * Les versements récurrents nets d'un jeu de règles, au mois.
 *
 * En net, comme partout ailleurs : une règle qui reprend 100 € par mois sur le
 * livret qu'une autre alimente de 350 € n'en met pas 450 de côté. Une règle
 * arrêtée ne compte plus — elle ne posera plus d'échéance —, et une règle au
 * montant variable n'est pas comptée pour zéro : elle est **signalée**.
 *
 * `monthlyEquivalent` et non le montant brut : une prime versée une fois l'an
 * pèse un douzième de mois, et c'est la convention de tout le reste de l'app
 * (cahier §4.2). Deux amortissements différents feraient deux chiffres sous le
 * même mot d'un écran à l'autre.
 */
function recurringMonthly(
  recurrences: readonly Recurrence[],
  on: ISODate,
): { monthly: Money; variable: boolean } {
  let monthly = ZERO
  let variable = false

  for (const recurrence of recurrences) {
    if (recurrence.endedOn !== undefined && recurrence.endedOn <= on) continue
    const each = monthlyEquivalent(recurrence)
    if (each === null) {
      variable = true
      continue
    }
    /* `out` : l'argent quitte le compte courant pour le support — c'est un
       versement. `in` : il en revient — c'est une reprise. Le même sens de
       lecture que `supportFlows`, et pour la même raison. */
    monthly = recurrence.direction === 'out' ? add(monthly, each) : sub(monthly, each)
  }

  return { monthly, variable }
}

/** Ce que la projection reprend d'**un** support. */
export function supportStart(
  supportId: string,
  valuations: readonly SavingValuation[],
  entries: readonly Entry[],
  recurrences: readonly Recurrence[],
  on: ISODate,
): ProjectionStart {
  const value = supportValue(supportId, valuations, entries, on)
  const { monthly, variable } = recurringMonthly(
    recurrences.filter((recurrence) => recurrence.savingSupportId === supportId),
    on,
  )

  return {
    capital: value.estimated,
    monthly,
    unvalued: value.estimated === null ? 1 : 0,
    variable,
  }
}

/**
 * Ce que la projection reprend de toute l'épargne d'**une** personne.
 *
 * Les règles sans support comptent, à la différence de celles d'un support
 * précis : un versement d'épargne d'avant les supports désigne un poste et pas
 * un compte, mais il part bien tous les mois — le taire ferait annoncer un
 * effort d'épargne inférieur à celui qui est réellement fait. Il faut en
 * revanche qu'il soit **de nature épargne** et porté par la personne, sans quoi
 * on compterait un loyer.
 */
export function memberStart(
  memberId: string,
  supports: readonly SavingSupport[],
  valuations: readonly SavingValuation[],
  entries: readonly Entry[],
  recurrences: readonly Recurrence[],
  kindOf: KindOf,
  on: ISODate,
): ProjectionStart {
  const owned = supports.filter((support) => support.memberId === memberId && !support.archived)
  const total = savingTotal(owned, valuations, entries, on)
  const ownedIds = new Set(owned.map((support) => support.id))

  const { monthly, variable } = recurringMonthly(
    recurrences.filter((recurrence) => {
      if (kindOf(recurrence.categoryId) !== 'saving') return false
      if (recurrence.savingSupportId !== undefined) return ownedIds.has(recurrence.savingSupportId)
      return recurrence.memberId === memberId
    }),
    on,
  )

  return {
    /* Aucun support relevé : il n'y a pas de capital à reprendre, et zéro n'en
       est pas un. Les versements, eux, restent vrais — on sait ce qui part
       chaque mois même sans savoir ce qui est déjà là. */
    capital: total.valued === 0 ? null : total.estimated,
    monthly,
    unvalued: total.unvalued,
    variable,
  }
}

/** L'origine vide — une simulation libre n'a rien à reprendre. */
export const NO_START: ProjectionStart = EMPTY
