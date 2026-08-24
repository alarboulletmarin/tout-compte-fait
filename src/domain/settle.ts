/* ============================================================================
 * Régularisation d'un mois sur le suivant.
 *
 * La répartition dit ce que chacun doit verser sur le pot commun. Elle ne dit
 * pas qui a sorti l'argent — et c'est souvent une seule personne. Clara règle
 * une dépense ponctuelle de 300 € qui rentre dans le commun : elle en portait
 * 47 %, elle a payé 100 %, et elle a donc avancé les 53 % de Luca. Sans rien
 * pour le rattraper, l'écart reste entre eux et l'app le tait.
 *
 * Le mois suivant le corrige : Luca verse un peu plus, Clara un peu moins.
 *
 * Ce module ne calcule pas un coût. Ce qu'une dépense coûte à quelqu'un est
 * arrêté au mois où elle a lieu, et le report n'y touche pas — c'est un
 * virement qui se rattrape, pas une charge qui se déplace. C'est ce qui lui
 * permet de n'entrer dans aucun total du mois : il se lit à côté d'eux.
 * ==========================================================================*/

import type { YearMonth } from './date'
import { type Money, ZERO, add, sub, sum } from './money'
import {
  type IncomeWeight,
  allocate,
  cappedWeights,
  isCommon,
  memberCaps,
  prorataWeights,
  sharedTotal,
} from './split'
import { type KindOf, entriesOfMonth } from './stats'
import type { Entry } from './types'

/** Ce qu'un membre a avancé sur le commun d'un mois, et ce qui lui en revenait. */
export type Settlement = {
  memberId: string
  /** Ce qu'il a réglé de sa poche sur des charges communes. */
  advanced: Money
  /** Ce qui lui en revenait, au prorata de ce mois-là. */
  owed: Money
  /**
   * Ce qui s'ajoute à sa part le mois suivant : `owed − advanced`. Négatif, il
   * a trop avancé et verse moins.
   */
  adjustment: Money
}

/**
 * Les charges communes qu'une personne a avancées — celles qui portent un
 * membre.
 *
 * Une charge commune **sans** membre a été réglée par le pot : elle n'avance
 * rien à personne, et elle est donc hors du calcul des deux côtés à la fois.
 * C'est cette symétrie qui fait que la somme des reports vaut exactement zéro,
 * et donc que le total à verser du mois suivant vaut encore, au centime, les
 * charges communes de ce mois-là.
 *
 * **Confirmées seulement.** Une échéance prévue n'a été payée par personne, et
 * dire d'elle qu'un membre l'a avancée serait inventer un fait. C'est déjà la
 * règle de tous les chiffres rétrospectifs dérivés — le capital restant dû d'un
 * crédit (`debt.ts`) et ce qui reste à remettre sur une avance (`advance.ts`)
 * ne comptent que les échéances effectivement confirmées.
 */
export function advancedEntries(
  entries: readonly Entry[],
  month: YearMonth,
  kindOf: KindOf,
): Entry[] {
  return entriesOfMonth(entries, month)
    .filter(
      (entry) =>
        isCommon(entry, kindOf) &&
        entry.status === 'confirmed' &&
        entry.memberId !== undefined &&
        entry.memberId !== '',
    )
    .sort((a, b) => b.amount - a.amount)
}

/**
 * Ce que le mois `month` reporte sur le suivant, membre par membre.
 *
 * Au prorata **de ce mois-là**, et non de celui qui suit : l'écart s'est creusé
 * sous les revenus du mois où la dépense a eu lieu, et le rattraper à un autre
 * coefficient rendrait une somme que personne n'a avancée.
 *
 * Réparti charge par charge, comme `memberShares` — répartir leur somme
 * donnerait le même total au centime près, mais seul le découpage par charge se
 * recompose, et c'est ce qui garantit que les reports s'annulent exactement.
 *
 * `null` tant que le prorata de ce mois-là ne se calcule pas : un écart au
 * dénominateur incomplet ne vaut pas zéro, il ne veut rien dire. Le membre
 * seul, lui, calcule et rend zéro : il porte 100 % de ce qu'il avance, donc
 * `owed` vaut `advanced` — personne à régulariser.
 */
export function settleMonth(
  entries: readonly Entry[],
  month: YearMonth,
  kindOf: KindOf,
  incomes: readonly IncomeWeight[],
): Settlement[] | null {
  const raw = prorataWeights(incomes)
  if (raw === null) return null

  /* Les poids de ce mois-là, plafonds compris — sur le pot **entier** du mois,
     pas sur les seules charges avancées : le plafond s'est lu là quand le mois
     s'est réparti, et un `owed` pesé autrement rendrait un report qui ne
     correspond plus aux parts que chacun devait. */
  const weights =
    cappedWeights(raw, memberCaps(entries, month, incomes), sharedTotal(entries, month, kindOf)) ??
    raw

  const advanced = incomes.map(() => ZERO)
  const owed = incomes.map(() => ZERO)

  for (const entry of advancedEntries(entries, month, kindOf)) {
    const by = incomes.findIndex((income) => income.memberId === entry.memberId)
    // Une charge avancée par quelqu'un qui n'est plus du foyer ne se rattrape
    // sur personne : la compter d'un seul côté déséquilibrerait le report.
    if (by < 0) continue

    advanced[by] = add(advanced[by] ?? ZERO, entry.amount)
    for (const [index, part] of allocate(entry.amount, weights).entries()) {
      owed[index] = add(owed[index] ?? ZERO, part)
    }
  }

  return incomes.map((income, index) => {
    const paid = advanced[index] ?? ZERO
    const share = owed[index] ?? ZERO
    return { memberId: income.memberId, advanced: paid, owed: share, adjustment: sub(share, paid) }
  })
}

/**
 * Le report sous la forme qu'attend `memberShares` : une table par membre.
 *
 * C'est `split.ts` qui applique le report, mais il ne connaît pas ce module —
 * c'est l'inverse. Lui passer une table plutôt que des `Settlement` évite un
 * cycle d'import entre deux modules qui se répondent.
 */
export function adjustments(
  settlements: readonly Settlement[] | null,
): Map<string, Money> | null {
  if (settlements === null) return null
  return new Map(settlements.map((s) => [s.memberId, s.adjustment]))
}

/**
 * Ce qu'un report ajoute à la part d'un membre. Zéro sans report — un membre
 * absent du calcul n'a rien avancé et ne doit rien de plus.
 */
export function adjustmentOf(
  settlements: readonly Settlement[] | null,
  memberId: string,
): Money {
  if (settlements === null) return ZERO
  return settlements.find((s) => s.memberId === memberId)?.adjustment ?? ZERO
}

/**
 * Le report se solde-t-il ? La somme des ajustements vaut zéro par
 * construction ; l'exposer sert à le vérifier plutôt qu'à le croire.
 */
export function settlementBalance(settlements: readonly Settlement[]): Money {
  return sum(settlements.map((s) => s.adjustment))
}
