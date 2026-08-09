/* ============================================================================
 * L'épargne — le **stock** d'un côté, les **flux** de l'autre.
 *
 * Ce sont deux questions, et les confondre est la seule façon de se tromper
 * ici :
 *
 * - « Combien vaut mon épargne aujourd'hui ? » → un `SavingValuation`, la
 *   photographie du support à une date. Elle n'entre dans aucun total du mois.
 * - « Combien ai-je versé ou repris ce mois-ci ? » → des `Entry`, comme partout
 *   ailleurs dans l'app. Une valorisation n'en produit aucune, et une `Entry` ne
 *   réécrit aucune valorisation.
 *
 * Le module est pur : il ne connaît ni le store ni la persistance, et reçoit la
 * nature d'une catégorie sous forme de fonction, comme `stats.ts` et `split.ts`.
 * ==========================================================================*/

import {
  type ISODate,
  type YearMonth,
  addDays,
  addMonthsToYm,
  endOfMonth,
  isWithin,
  parseISO,
  stackedByDate,
  startOfMonth,
  today,
  ym,
  ymOf,
} from './date'
import { kindSeries } from './history'
import { type Money, ZERO, add, divInt, ratio, sub, sum } from './money'
import { type KindOf, type MemberFilter, entriesOfMonth, totalsByKind } from './stats'
import type {
  Advance,
  Entry,
  Recurrence,
  SavingPace,
  SavingSupport,
  SavingValuation,
} from './types'

/* --- Supports -------------------------------------------------------------*/

/** Les supports encore proposés à la saisie. Un archivé sort des formulaires. */
export function activeSupports(supports: readonly SavingSupport[]): SavingSupport[] {
  return supports.filter((support) => !support.archived)
}

/** Les supports d'une personne, dans l'ordre du document. */
export function supportsOfMember(
  supports: readonly SavingSupport[],
  memberId: string,
): SavingSupport[] {
  return supports.filter((support) => support.memberId === memberId)
}

/* --- Stock : les valorisations --------------------------------------------*/

/**
 * Les valorisations d'un support, de la plus récente à la plus ancienne.
 *
 * L'ordre est total et déterministe : deux relevés du même jour — une saisie et
 * sa correction — se départagent par leur **ordre d'arrivée**, le dernier posé
 * d'abord. Faute de quoi deux lectures du même document pourraient ne pas
 * désigner le même « dernier ».
 *
 * Par l'ordre d'arrivée, et pas par l'identifiant : `makeId` rend un UUID
 * aléatoire, donc départager deux relevés du même jour par leur id, c'est tirer
 * à pile ou face entre une saisie et sa correction — déterministe, mais faux
 * une fois sur deux. Les valorisations ne sont qu'empilées (`addSavingValuation`
 * n'écrase rien) et rien ne les réordonne à la lecture du document : leur rang
 * dans le tableau *est* leur chronologie, et il survit à l'export.
 */
export function valuationsOf(
  valuations: readonly SavingValuation[],
  supportId: string,
): SavingValuation[] {
  return stackedByDate(
    valuations.filter((valuation) => valuation.supportId === supportId),
    (valuation) => valuation.date,
  )
}

const compareText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

/**
 * Ce que le support vaut de dernier connu — la valorisation la plus récente,
 * ou `null` si aucune n'a jamais été relevée.
 *
 * `null` n'est pas zéro, et c'est la règle la plus importante de ce module :
 * zéro est une information financière réelle — un livret vidé —, alors que
 * l'absence de relevé ne dit rien du tout. Les écrans doivent les distinguer,
 * et un total ne peut pas additionner l'un comme l'autre.
 */
export function latestValuation(
  valuations: readonly SavingValuation[],
  supportId: string,
  on: ISODate = today(),
): SavingValuation | null {
  return valuationsOf(valuations, supportId).find((valuation) => valuation.date <= on) ?? null
}

/** Le délai au bout duquel un relevé est attendu, par cadence. */
export const PACE_MONTHS: Record<SavingPace, number> = { yearly: 12, quarterly: 3 }

/**
 * La cadence d'un support qui n'en porte aucune — un document d'avant le champ.
 *
 * L'année, et non le trimestre : sur un écran dont tout le problème est de ne
 * pas réclamer de saisie inutile, se taire trop est un défaut réparable, alors
 * que réclamer à tort ne produit que de la culpabilité. Et c'est de surcroît la
 * cadence du support le plus répandu, le livret.
 */
export const DEFAULT_PACE: SavingPace = 'yearly'

export const paceOf = (support: Pick<SavingSupport, 'pace'>): SavingPace =>
  support.pace ?? DEFAULT_PACE

/**
 * L'âge d'un relevé, en mois entiers, et ce qu'il faut en dire.
 *
 * Un relevé se saisit à la main : il vieillit, et sa fraîcheur fait partie de ce
 * qu'il vaut. « 10 631 € » n'a pas le même poids relevé hier ou il y a huit
 * mois, et la date seule ne le dit pas — personne ne compte les mois de tête
 * devant un « 8 février » posé sous un chiffre.
 *
 * Trois paliers, et **aucune alerte** : un capital qu'on n'a pas revu n'est pas
 * une erreur, c'est un chiffre à confirmer. Le vieillissement se dit donc en
 * mots et jamais en rouge — le DS §2.3 réserve l'alerte aux dépassements, et un
 * livret dont le relevé date de l'été n'en est pas un.
 *
 * **Le dernier palier suit la cadence du support**, et c'est ce qui distingue
 * un chiffre périmé d'un chiffre simplement daté. Il valait six mois pour tout
 * le monde : un Livret A relevé en février était annoncé « à actualiser » en
 * août alors que l'app savait son capital à l'euro près, et un PEA relevé en
 * mai passait pour frais en juillet alors que le marché avait tout changé. Un
 * seuil unique se trompait donc dans les deux sens à la fois.
 *
 * En mois entiers plutôt qu'en jours : c'est le rythme réel du geste — un relevé
 * de banque arrive à la fin d'un mois ou d'un trimestre —, et « il y a 187
 * jours » demande une division mentale que « il y a 6 mois » évite.
 */
export type ValuationAge = {
  /** Frais tant qu'un mois entier ne s'est pas écoulé : la date se lit telle quelle. */
  level: 'fresh' | 'ageing' | 'stale'
  /** Le nombre de mois entiers écoulés, jamais négatif. */
  months: number
}

export function valuationAge(
  date: ISODate,
  pace: SavingPace = DEFAULT_PACE,
  on: ISODate = today(),
): ValuationAge {
  const from = parseISO(date)
  const to = parseISO(on)
  /* Le jour du mois arbitre le dernier palier : du 31 mai au 30 août il s'est
     écoulé deux mois pleins et non trois, et annoncer le troisième vieillirait
     le relevé d'un mois qu'il n'a pas.
     Jamais négatif : un relevé daté d'après-demain n'a pas −1 mois, il est
     frais — c'est une saisie en avance, pas une anomalie à signaler. */
  const elapsed = (to.y - from.y) * 12 + (to.m - from.m) - (to.d < from.d ? 1 : 0)
  const months = Math.max(0, elapsed)

  return {
    level: months === 0 ? 'fresh' : months >= PACE_MONTHS[pace] ? 'stale' : 'ageing',
    months,
  }
}

/**
 * Les supports dont le relevé est attendu — et eux seuls.
 *
 * C'est ce qui permet à l'écran de **se taire** : un raccourci « Mettre à jour
 * les relevés » posé en permanence laisse entendre un rituel mensuel, qui n'est
 * la bonne cadence d'aucun support. Réclamer une donnée qui ne produit rien ne
 * produit que de la culpabilité.
 *
 * Un support jamais relevé en fait partie : c'est le seul dont l'app ne sait
 * rien dire du tout, ni relevé ni estimation, et une première valeur est
 * exactement ce qui lui manque.
 *
 * Les archivés en sortent : un compte clôturé n'a plus de valeur à confirmer.
 */
export function supportsDue(
  supports: readonly SavingSupport[],
  valuations: readonly SavingValuation[],
  on: ISODate = today(),
): SavingSupport[] {
  return activeSupports(supports).filter((support) => {
    const latest = latestValuation(valuations, support.id, on)
    return latest === null || valuationAge(latest.date, paceOf(support), on).level === 'stale'
  })
}

/* --- Flux : les mouvements ------------------------------------------------*/

/** Ce qu'un support a reçu et rendu sur une période, bornes incluses. */
export type SupportFlows = {
  /** Ce qui y est entré — les `Entry` de sens `out`, l'argent quitte le compte. */
  contributions: Money
  /** Ce qui en est sorti — les `Entry` de sens `in`, l'argent revient au compte. */
  withdrawals: Money
  /** Versements − reprises. L'épargne se compte en net, comme partout. */
  net: Money
}

/** Une fenêtre de lecture, bornes incluses. Absente, tout l'historique compte. */
export type DateRange = { from: ISODate; to: ISODate }

/**
 * Les mouvements d'un support, lus sur les `Entry`.
 *
 * Les mêmes `Entry` que celles du mois, du tableau de bord et de la capacité
 * d'épargne : c'est ce qui garantit que la fiche d'un support et la tuile du
 * mois ne peuvent pas annoncer deux chiffres différents sous le même mot.
 *
 * `confirmedOnly` sépare le réalisé du prévisionnel, comme `totalsByKind` : la
 * valeur estimée d'un support ne se construit que sur ce qui a **eu lieu** —
 * une échéance encore prévue n'a bougé aucun livret.
 */
export function supportFlows(
  entries: readonly Entry[],
  supportId: string,
  range?: DateRange,
  confirmedOnly = false,
): SupportFlows {
  let contributions = ZERO
  let withdrawals = ZERO
  for (const entry of entries) {
    if (entry.savingSupportId !== supportId) continue
    if (confirmedOnly && entry.status !== 'confirmed') continue
    if (range !== undefined && !isWithin(entry.date, range.from, range.to)) continue
    if (entry.direction === 'out') contributions = add(contributions, entry.amount)
    else withdrawals = add(withdrawals, entry.amount)
  }
  return { contributions, withdrawals, net: sub(contributions, withdrawals) }
}

/** Les mouvements d'un support sur un mois — la lecture de sa fiche. */
export function supportMonthFlows(
  entries: readonly Entry[],
  supportId: string,
  month: YearMonth,
  confirmedOnly = false,
): SupportFlows {
  return supportFlows(
    entries,
    supportId,
    { from: startOfMonth(month), to: endOfMonth(month) },
    confirmedOnly,
  )
}

/** Les `Entry` d'un support, de la plus récente à la plus ancienne. */
export function supportEntries(entries: readonly Entry[], supportId: string): Entry[] {
  return entries
    .filter((entry) => entry.savingSupportId === supportId)
    .sort((a, b) => compareText(b.date, a.date))
}

/* --- Stock + flux : la valeur estimée -------------------------------------*/

/**
 * Ce qu'on sait du capital d'un support, et ce qu'on en déduit.
 *
 * Deux chiffres, jamais confondus :
 *
 * - `known` est la **valeur renseignée** — un fait, relevé à `knownOn`.
 * - `estimated` est la valeur **estimée** : le dernier relevé plus les
 *   mouvements confirmés depuis. Ce n'est pas une vérité, et elle ne s'écrit
 *   jamais : sur un placement, la valeur bouge aussi avec le marché, et le
 *   relevé du 1er août plus 300 € versés le 10 ne dit pas ce que vaut le PEA le
 *   15. L'écran l'affiche donc **qualifiée comme telle**, ou pas du tout.
 *
 * Le même moteur pour tous les supports, livrets compris : deux façons de
 * calculer un capital — l'une dérivée pour le cash, l'autre relevée pour les
 * placements — donneraient deux vérités à tenir d'accord.
 *
 * Sans relevé, les deux sont `null` : les mouvements du mois ne font pas une
 * valeur — on saurait ce qu'on a versé, pas ce qu'on possède.
 */
export type SupportValue = {
  /** Le dernier relevé, ou `null` s'il n'y en a jamais eu. */
  known: Money | null
  /** Le jour de ce relevé. */
  knownOn: ISODate | null
  /** Les mouvements confirmés depuis ce relevé, en net. */
  movedSince: Money
  /** `known + movedSince`, ou `null` faute de relevé. Jamais enregistré. */
  estimated: Money | null
}

export function supportValue(
  supportId: string,
  valuations: readonly SavingValuation[],
  entries: readonly Entry[],
  on: ISODate = today(),
  /**
   * Les seuls mouvements **confirmés**, et c'est la valeur de référence — celle
   * du total, de la couverture, de la fiche.
   *
   * Le faux existe pour une lecture et une seule : la **trajectoire**, celle
   * que suit la génération des échéances d'un mois (`planMonth`). Elle ne dit
   * pas ce que le support vaut, mais ce qu'il vaudra si tout ce qui est déjà
   * posé tombe — et sans elle, douze mois de versements prévus liraient tous la
   * même place restante, donc aucun ne serait jamais écrêté. Elle ne s'affiche
   * nulle part : une prévue n'a bougé aucun livret.
   */
  confirmedOnly = true,
): SupportValue {
  const latest = latestValuation(valuations, supportId, on)
  if (latest === null) return { known: null, knownOn: null, movedSince: ZERO, estimated: null }

  /* Strictement après le relevé : un versement du jour même est déjà dans le
     chiffre qu'on vient de relever — le compter en plus le doublerait. Et pas
     au-delà du jour où l'on regarde : une échéance confirmée d'avance dit
     qu'elle aura lieu, pas qu'elle a eu lieu. */
  const movedSince = supportFlows(
    entries,
    supportId,
    { from: addDays(latest.date, 1), to: on },
    confirmedOnly,
  ).net

  return {
    known: latest.amount,
    knownOn: latest.date,
    movedSince,
    estimated: add(latest.amount, movedSince),
  }
}

/* --- Totaux ---------------------------------------------------------------*/

/**
 * Ce que vaut l'épargne d'une personne : ce qui est relevé, ce qui a bougé
 * depuis, et ce qu'on ne sait pas.
 *
 * Le total ne porte que sur les supports qui ont un relevé. Les autres sont
 * **comptés à part**, jamais à zéro : additionner une inconnue comme un zéro
 * donnerait un patrimoine faux et présenté comme exact, ce qui est pire que pas
 * de chiffre du tout. L'écran dit les deux — « 32 450 €, un support sans
 * valeur ».
 *
 * `movedSince` et `estimated` sont l'agrégat de `supportValue`, et ils existent
 * pour une raison précise : quelqu'un qui verse 200 € par mois depuis six mois
 * et n'a relevé sa valeur qu'une fois voyait un total figé à son chiffre de
 * départ, alors que l'app connaît les 1 200 € partis dessus. Les taire n'est pas
 * de la prudence — c'est cacher ce qu'on sait.
 *
 * Ils ne portent que sur les supports **relevés** : sans base, un mouvement ne
 * fait pas une valeur — on saurait ce qui a été versé, pas ce qu'on possède.
 */
export type SavingTotal = {
  /** La somme des dernières valorisations connues. Un fait, à sa date. */
  known: Money
  /** Les mouvements confirmés depuis ces relevés, sur ces mêmes supports. */
  movedSince: Money
  /** `known + movedSince`. Une estimation, qui ne s'enregistre jamais. */
  estimated: Money
  /** Combien de supports y ont contribué. */
  valued: number
  /** Combien n'ont aucune valorisation, et ne comptent donc nulle part. */
  unvalued: number
}

export function savingTotal(
  supports: readonly SavingSupport[],
  valuations: readonly SavingValuation[],
  entries: readonly Entry[] = [],
  on: ISODate = today(),
): SavingTotal {
  let known = ZERO
  let movedSince = ZERO
  let valued = 0
  let unvalued = 0

  for (const support of supports) {
    /* La même fonction que la fiche d'un support, appelée une fois par
       support : le total et le détail ne peuvent pas diverger d'un centime. */
    const value = supportValue(support.id, valuations, entries, on)
    if (value.known === null) {
      unvalued += 1
      continue
    }
    known = add(known, value.known)
    movedSince = add(movedSince, value.movedSince)
    valued += 1
  }

  return { known, movedSince, estimated: add(known, movedSince), valued, unvalued }
}

/* --- Combien de temps le capital tient ------------------------------------*/

/**
 * Ce que le capital couvre de mois, si les revenus s'arrêtaient.
 *
 * C'est le seul chiffre de l'écran qu'une banque ne calculera jamais — pas par
 * paresse, par structure : elle voit le solde, elle ne sait pas ce qu'est une
 * charge chez quelqu'un. L'app tient les deux bouts, et c'est ce qui fait
 * qu'un relevé produit ici une décision plutôt qu'une transcription : « 10 450 € »
 * est une anecdote, « tu tiens 4,2 mois » n'en est pas une.
 *
 * **Le dénominateur fait toute la justesse du chiffre**, et il se lit par
 * nature, jamais par sens de trésorerie :
 *
 * - les **charges** comptent, évidemment ;
 * - les **mensualités de crédit** aussi : elles ne s'arrêtent pas quand le
 *   revenu s'arrête, c'est même tout leur problème ;
 * - les **versements d'épargne**, non : c'est la première chose qu'on coupe, et
 *   les compter reviendrait à exiger de continuer d'épargner pendant qu'on vit
 *   sur son épargne.
 *
 * Le piège est que les trois sortent du compte : lus en trésorerie ils se
 * confondent, et un foyer qui met 500 € de côté chaque mois se verrait tenir un
 * tiers de temps de moins qu'il ne tient. D'où `kindSeries` plutôt que
 * `monthSeries`.
 *
 * **Sur des mois révolus seulement.** Un mois en cours n'a pas encore tout
 * dépensé : le compter tirerait la moyenne vers le bas et gonflerait d'autant
 * le nombre de mois annoncé — c'est-à-dire que le chiffre serait le plus faux
 * le jour où on le regarde. Les mois qui n'ont rien du tout sont écartés de
 * même : diviser par douze un foyer qui saisit depuis trois mois inventerait
 * neuf mois sans charges.
 */
export type SavingCoverage = {
  /** Le capital divisé — les supports relevés, mouvements depuis compris. */
  capital: Money
  /** Ce que coûte un mois moyen : charges et crédits, jamais les versements. */
  monthly: Money
  /** Sur combien de mois révolus la moyenne est faite. Zéro : rien à dire. */
  months: number
  /** Le nombre de mois couverts. `null` quand il n'y a rien à diviser. */
  covered: number | null
}

/** Douze mois : une année pleine, donc chaque charge annuelle comptée une fois. */
export const COVERAGE_MONTHS = 12

export function savingCoverage(
  capital: Money,
  entries: readonly Entry[],
  kindOf: KindOf,
  on: ISODate = today(),
  memberId?: MemberFilter,
  count = COVERAGE_MONTHS,
): SavingCoverage {
  /* Le mois d'avant : celui où l'on regarde n'est pas encore un mois. */
  const last = addMonthsToYm(ymOf(on), -1)
  const lived = kindSeries(
    entries,
    addMonthsToYm(last, -(count - 1)),
    last,
    kindOf,
    memberId,
    /* Échéances prévues comprises : un mois passé porte souvent des `planned`
       que personne n'a confirmées — elles ont pourtant été payées, et les
       exclure ferait passer un mois entier pour un mois sans loyer. */
    true,
  ).filter((point) => point.hasData)

  const monthly =
    lived.length === 0
      ? ZERO
      : divInt(
          sum(lived.map((point) => add(point.totals.charge, point.totals.debt))),
          lived.length,
        )

  return {
    capital,
    monthly,
    months: lived.length,
    /* Un foyer sans aucune charge sur l'année ne « tient pas l'infini » : il n'y
       a rien à diviser, et un ratio sans dénominateur ne vaut pas zéro non plus
       — il ne veut rien dire. C'est la règle de `savingRate`. */
    covered: monthly <= 0 ? null : capital / monthly,
  }
}

/* --- L'accumulation, année après année ------------------------------------*/

/**
 * Ce qui est mis de côté mois après mois, et son cumul depuis janvier.
 *
 * L'app est une machine à mois : tout y est borné par `ym`, et l'épargne est la
 * seule notion qui n'ait aucun sens à l'intérieur d'un mois. D'où la sensation
 * que rien ne s'additionne jamais — on voit douze états mensuels, pas une
 * trajectoire, alors que la donnée est là depuis le premier jour.
 *
 * C'est du **flux pur** : les mêmes `Entry` que la capacité et la ventilation,
 * comptées en net comme partout — verser 300 € puis en reprendre 600 € n'a pas
 * mis 900 € de côté. Aucun relevé n'y entre, et c'est ce qui rend la lecture
 * gratuite : elle répond à « est-ce que ça monte » sans rien demander de plus
 * que ce qui est déjà saisi.
 *
 * `hasData` se lit sur le mois entier et non sur ses seuls versements : un mois
 * vécu sans rien mettre de côté est un vrai zéro — le cumul y reste plat, et
 * c'est une information —, quand un mois jamais ouvert n'est pas un mois à
 * zéro et ne se trace pas (cahier §4.7).
 */
export type SavingYearPoint = {
  /** De 1 à 12. */
  month: number
  /** Versements − reprises du mois. */
  net: Money
  /** Le cumul depuis janvier. */
  cumulative: Money
  hasData: boolean
}

export function savingYearSeries(
  entries: readonly Entry[],
  year: number,
  kindOf: KindOf,
  memberId?: MemberFilter,
): SavingYearPoint[] {
  let running = ZERO
  return Array.from({ length: 12 }, (_, index) => {
    const month = ym(year, index + 1)
    /* Le mois entier, échéances prévues comprises : c'est le chiffre de la
       tuile Capacité et du « versé ce mois », et deux totaux d'épargne qui
       diffèrent d'un écran à l'autre sous le même mot ne s'expliquent pas. */
    const net = totalsByKind(entries, month, kindOf, memberId, true).saving
    running = add(running, net)
    return {
      month: index + 1,
      net,
      cumulative: running,
      hasData: entriesOfMonth(entries, month, memberId).length > 0,
    }
  })
}

/* --- Ventilation du mois --------------------------------------------------*/

/**
 * Les mouvements d'épargne du mois qu'aucun support ne porte.
 *
 * Un document d'avant les supports peut en avoir — ses versements désignaient
 * une catégorie, pas un compte —, et la ventilation les montre sous cette clef
 * plutôt que de les taire.
 */
export const UNLINKED_SUPPORT = '__unlinked__'

/** Une part de la ventilation du mois : un support, et ce qu'il a reçu en net. */
export type SavingSlice = {
  /** L'identifiant du support, ou `UNLINKED_SUPPORT`. */
  supportId: string
  total: Money
  /** Part du total, entre 0 et 1. */
  share: number
}

/**
 * Où va l'épargne du mois, **par support**.
 *
 * Elle se lisait par catégorie, ce qui revenait à faire de la catégorie le
 * support : le livret d'Andrea et celui de Marie se confondaient sous
 * « Livrets », et deux personnes ne pouvaient pas avoir chacune le sien. Le
 * support répond seul, désormais, à « où va l'argent » — et ce sont les mêmes
 * `Entry` que celles comptées par la capacité du mois.
 *
 * Compté en net, comme partout : un livret dans lequel on a repris 600 € et
 * remis 50 € n'a pas reçu 650 € ce mois-ci.
 *
 * Le plafond est haut — un foyer tient rarement plus de six ou sept supports —
 * parce que les regrouper sous « Autres » retirerait à l'écran la seule chose
 * qu'il a à dire : où l'argent est placé.
 */
export function savingsBySupport(
  entries: readonly Entry[],
  month: YearMonth,
  kindOf: KindOf,
  memberId?: MemberFilter,
  limit = 8,
): SavingSlice[] {
  const scoped = entriesOfMonth(entries, month, memberId).filter(
    (entry) => kindOf(entry.categoryId) === 'saving',
  )

  const bySupport = new Map<string, Money>()
  for (const entry of scoped) {
    const key = entry.savingSupportId ?? UNLINKED_SUPPORT
    const current = bySupport.get(key) ?? ZERO
    bySupport.set(
      key,
      entry.direction === 'in' ? sub(current, entry.amount) : add(current, entry.amount),
    )
  }

  // Un support autant repris que reconstitué dans le même mois n'a rien reçu :
  // l'afficher à zéro ajouterait une ligne qui ne dit rien.
  for (const [id, total] of bySupport) if (total === ZERO) bySupport.delete(id)

  const total = sum([...bySupport.values()])
  return [...bySupport.entries()]
    .map(([supportId, amount]) => ({ supportId, total: amount, share: ratio(amount, total) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}

/* --- Ce qu'un support retient ---------------------------------------------*/

/**
 * Ce qui empêche un support d'être simplement supprimé.
 *
 * Un support créé par erreur il y a dix secondes n'a rien derrière lui et se
 * retire pour de bon. Dès qu'il porte une valorisation, un mouvement, une règle
 * ou une avance, la suppression détruirait de l'historique : c'est l'archivage
 * qui s'applique alors — il sort des formulaires, il reste dans les lectures.
 * C'est la règle des catégories, qui ne s'effacent jamais non plus.
 */
export type SupportUsage = {
  valuations: number
  entries: number
  recurrences: number
  /** Les règles encore actives : ce sont elles qui poseront des échéances. */
  runningRecurrences: number
  advances: number
}

export type SupportLinks = {
  savingValuations: readonly SavingValuation[]
  entries: readonly Entry[]
  recurrences: readonly Recurrence[]
  advances: readonly Advance[]
}

export function supportUsage(
  supportId: string,
  data: SupportLinks,
  on: ISODate = today(),
): SupportUsage {
  const recurrences = data.recurrences.filter((r) => r.savingSupportId === supportId)
  return {
    valuations: data.savingValuations.filter((v) => v.supportId === supportId).length,
    entries: data.entries.filter((e) => e.savingSupportId === supportId).length,
    recurrences: recurrences.length,
    runningRecurrences: recurrences.filter((r) => r.endedOn === undefined || r.endedOn > on).length,
    advances: data.advances.filter((a) => a.savingSupportId === supportId).length,
  }
}

/** Vrai quand rien n'est derrière lui : la suppression pure est alors permise. */
export function isSupportEmpty(usage: SupportUsage): boolean {
  return (
    usage.valuations === 0 && usage.entries === 0 && usage.recurrences === 0 && usage.advances === 0
  )
}
