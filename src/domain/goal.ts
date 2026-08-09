/* ============================================================================
 * Ce qu'un objectif dit de lui-même — et `drift` est le chiffre de tout ça.
 *
 * Un objectif ne stocke que trois choses tapées : un nom, une cible, une
 * échéance. Tout le reste est **lu** : le capital sur les `SavingValuation` de
 * ses comptes, le versement sur les récurrences qui les alimentent, le
 * rendement sur les `SavingRate` qui y sont posés. C'est ce qui le rend
 * tenable — il n'y a pas de seconde vérité à tenir d'accord avec la première,
 * et un relevé saisi ailleurs le met à jour tout seul.
 *
 * **`drift` est la seule chose que ni la banque ni un tableur ne produisent
 * sans travail.** « 28 400 € sur 42 000 » se lit sur un relevé ; « sept mois de
 * retard, il faudrait 85 € de plus par mois » demande de croiser un capital,
 * des versements, un rendement et une date — c'est-à-dire exactement les quatre
 * choses que cette app est seule à tenir ensemble. C'est aussi la seule raison
 * de rouvrir l'écran quand rien n'a bougé.
 *
 * **Aucun rendement n'est deviné.** Un compte qui porte un palier de taux le
 * garde, daté ; un compte qui n'en porte aucun est projeté **à 0 %** — pas à
 * l'hypothèse d'un écran, pas à une moyenne de marché. Le prix est assumé :
 * l'arrivée annoncée est alors plus tardive que la réalité probable. C'est le
 * seul sens dans lequel on ait le droit de se tromper ici — un verdict qui
 * flatterait ferait rater une échéance à quelqu'un qui l'avait crue tenue.
 *
 * **Un seul moteur.** Chaque compte est projeté par `projectSeries`, comme dans
 * le simulateur, et la trajectoire de l'objectif est la somme des leurs : il
 * n'existe pas de taux moyen, et il n'existe pas de formule fermée posée à côté
 * (cahier §4.6 ter).
 * ==========================================================================*/

import { type ISODate, type YearMonth, addMonthsToYm, endOfMonth, today, ymOf } from './date'
import { type Money, ZERO, money, ratio } from './money'
import { type ProjectionSeries, projectSeries } from './projection'
import { type ProjectionPart, supportPart } from './projectionStart'
import { monthlyRateBps } from './savingRate'
import type {
  Entry,
  Recurrence,
  SavingGoal,
  SavingRate,
  SavingSupport,
  SavingValuation,
} from './types'

/**
 * Jusqu'où on cherche la date d'arrivée : cinquante ans.
 *
 * La même borne que le simulateur, et pour la même raison — au-delà, une
 * projection à taux constant ne décrit plus rien. Ce qui n'est pas atteint dans
 * cette fenêtre ne rend pas une date lointaine : il rend `null`, et l'écran dit
 * « pas à ce rythme » plutôt qu'une année que personne ne peut se représenter.
 */
export const GOAL_HORIZON_MONTHS = 600

/** Ce qu'un objectif lit sur ses comptes, avant tout calcul. */
export type GoalBasis = {
  /** Les comptes rattachés, tels que la projection les reprend. */
  parts: readonly ProjectionPart[]
  /**
   * Le capital relevé de ces comptes, mouvements confirmés compris. `null`
   * quand aucun n'a jamais été relevé : zéro est une information financière —
   * un livret vidé —, l'absence de relevé n'en est pas une.
   */
  capital: Money | null
  /**
   * Le versement retenu : celui que l'objectif engage, ou la somme des règles
   * durables posées sur ses comptes.
   */
  monthly: Money
}

/**
 * Ce que les comptes d'un objectif apportent, lu sur le document.
 *
 * Le **même** chemin que le simulateur, compte par compte : `supportPart` rend
 * déjà le capital, les versements durables, le barème daté et le plafond d'un
 * support, et deux façons de lire un portefeuille finiraient par ne plus donner
 * les mêmes chiffres à un écran d'écart.
 *
 * **L'horizon des règles est celui de l'échéance**, et il change la réponse :
 * une règle qui s'arrête avant la date visée n'est pas un rythme qu'on tient, et
 * la compter promettrait des versements que personne n'a l'intention de faire —
 * c'est le piège que `recurringMonthly` existe pour éviter. Sans échéance,
 * l'horizon est celui de la recherche d'arrivée : un cap sans date se poursuit
 * aussi longtemps qu'il le faut, donc une règle qui s'éteint n'y contribue pas
 * davantage.
 *
 * Le versement **engagé** l'emporte quand il est posé : c'est le seul cas où
 * quelqu'un a affirmé un rythme que les règles ne disent pas encore.
 */
export function goalBasis(
  goal: Pick<SavingGoal, 'supportIds' | 'targetOn' | 'monthly'>,
  document: {
    supports: readonly SavingSupport[]
    valuations: readonly SavingValuation[]
    entries: readonly Entry[]
    recurrences: readonly Recurrence[]
    rates: readonly SavingRate[]
  },
  on: ISODate = today(),
): GoalBasis {
  const until = endOfMonth(goal.targetOn ?? addMonthsToYm(ymOf(on), GOAL_HORIZON_MONTHS))
  const linked = goal.supportIds.flatMap((id) => {
    const support = document.supports.find((one) => one.id === id)
    return support === undefined ? [] : [support]
  })

  const parts = linked.map((support) =>
    supportPart(
      support,
      document.valuations,
      document.entries,
      document.recurrences,
      document.rates,
      on,
      until,
    ),
  )

  /* Un compte sans relevé ne compte pas dans le capital, et l'objectif n'en a
     donc aucun tant qu'aucun de ses comptes n'a été relevé : zéro est une
     information financière, l'absence de relevé n'en est pas une. */
  const valued = parts.filter((part) => part.capital !== null)
  return {
    parts,
    capital: valued.length === 0 ? null : money(valued.reduce((sum, p) => sum + (p.capital ?? 0), 0)),
    monthly: goal.monthly ?? money(parts.reduce((sum, part) => sum + part.monthly, 0)),
  }
}

/**
 * Le verdict d'un objectif.
 *
 * Quatre nombres, et ils ne se déduisent pas les uns des autres : l'avancement
 * dit où l'on en est, la date d'arrivée dit où l'on va, l'écart dit si ça va, et
 * le versement requis dit ce qu'il faudrait pour que ça aille. Un écran qui
 * n'en montrerait qu'un ne conclurait sur rien.
 */
export type GoalRead = {
  /** Le capital des comptes rattachés. `null` faute du moindre relevé. */
  capital: Money | null
  /** Ce qu'il reste à réunir, jamais négatif. Zéro quand la cible est atteinte. */
  left: Money
  /** L'avancement, de 0 à 1. Borné à 1 : on ne dépasse pas 100 % d'un cap. */
  progress: number
  /** Le versement mensuel retenu — engagé, ou lu des récurrences. */
  monthly: Money
  /**
   * Le mois où la cible est atteinte à ce rythme et à ces taux. `null` quand
   * elle ne l'est pas dans l'horizon : à versement nul et sans rendement, une
   * date d'arrivée n'existe pas, et en inventer une serait pire que se taire.
   */
  reachOn: YearMonth | null
  /**
   * L'écart avec le mois visé, en mois. Négatif = en avance, zéro = à l'heure.
   * `null` sans échéance, ou quand l'arrivée est hors d'atteinte.
   *
   * **C'est le chiffre de l'écran.** Le reste se lit sur un relevé de banque.
   */
  drift: number | null
  /**
   * Ce qu'il faudrait verser chaque mois pour tenir la date. `null` sans
   * échéance, quand elle est déjà tenue, ou quand elle est déjà passée — il n'y
   * a alors plus de versement qui rattrape quoi que ce soit.
   */
  neededMonthly: Money | null
  /** La cible est atteinte : le capital relevé la couvre déjà. */
  reached: boolean
}

/**
 * La trajectoire d'un objectif, compte par compte, sommée rang par rang.
 *
 * Exportée parce que la fiche la trace : c'est **la même** série que celle dont
 * `readGoal` tire sa date d'arrivée, et non un second calcul posé à côté — sans
 * quoi la courbe pourrait croiser la cible à un mois que le verdict ne dirait
 * pas.
 *
 * `monthly` est le versement **total** de l'objectif, et non celui de chaque
 * compte : l'écart avec ce que les règles posent déjà se répartit au prorata de
 * ce que chacun reçoit. C'est la même règle que le réglage d'effort du
 * simulateur — verser 50 % de plus, c'est verser 50 % de plus partout —, et
 * c'est aussi ce qui donne un sens au versement **engagé** sur l'objectif :
 * sans cette répartition, `SavingGoal.monthly` s'afficherait sans jamais
 * toucher la courbe.
 *
 * Quand rien ne coule encore, l'écart va au premier compte plutôt que d'être
 * découpé en parts égales dont la somme retomberait à un centime près : ce que
 * la répartition change est un rendement de second ordre, ce qu'elle ne doit pas
 * changer est le total versé.
 */
export function goalTrajectory(
  basis: GoalBasis,
  months: number,
  monthly: Money = basis.monthly,
  on: YearMonth = ymOf(today()),
): ProjectionSeries {
  const parts = basis.parts
  if (parts.length === 0) {
    return projectSeries({ initial: basis.capital ?? ZERO, monthly, months, rateBp: 0 })
  }

  const posed = parts.reduce((sum, part) => sum + part.monthly, 0)
  const delta = monthly - posed
  const share = (part: ProjectionPart, index: number): number =>
    posed > 0 ? Math.round((delta * part.monthly) / posed) : index === 0 ? delta : 0

  const series = parts.map((part, index) =>
    projectSeries({
      initial: part.capital ?? ZERO,
      monthly: money(part.monthly + share(part, index)),
      months,
      /* Le barème daté du compte, exactement comme dans le simulateur — et
         zéro quand il n'en porte aucun : l'app ne devine aucun rendement. */
      rateBp:
        part.rateBp === null
          ? 0
          : part.steps.length > 1
            ? monthlyRateBps(part.steps, on, months, part.rateBp)
            : part.rateBp,
      ...(part.room === null ? {} : { room: part.room }),
    }),
  )

  const first = series[0]
  if (first === undefined) return { balance: [], contributed: [] }
  const sum = (pick: (one: ProjectionSeries) => readonly Money[]): Money[] =>
    pick(first).map((_, rank) =>
      money(series.reduce((running, one) => running + (pick(one)[rank] ?? ZERO), 0)),
    )
  return { balance: sum((one) => one.balance), contributed: sum((one) => one.contributed) }
}

/** Le premier rang où la trajectoire atteint la cible, ou `null`. */
function rankReaching(series: ProjectionSeries, target: Money): number | null {
  const found = series.balance.findIndex((value) => value >= target)
  return found === -1 ? null : found
}

/**
 * Ce qu'il faudrait verser chaque mois pour arriver à la date visée.
 *
 * Par **dichotomie sur le versement**, et non par la formule fermée de
 * `requiredMonthly` : celle-ci suppose un taux unique, et un objectif porté par
 * un livret à 2,40 % et un plan muet n'en a pas — sa trajectoire est la somme
 * de deux courbes, et aucun taux moyen ne la redonne. La dichotomie interroge
 * le **même** moteur que la courbe affichée, donc le montant qu'elle rend
 * arrive exactement là où l'écran promet qu'il arrive.
 *
 * Quarante tours au plus sur une borne haute déduite de l'écart restant : c'est
 * largement au-delà de ce que le centime demande, et ça borne le pire cas.
 */
function solveMonthly(basis: GoalBasis, target: Money, months: number, on: YearMonth): Money {
  const reaches = (monthly: Money): boolean =>
    (goalTrajectory(basis, months, monthly, on).balance.at(-1) ?? ZERO) >= target

  /* Sans rendement du tout, verser l'écart restant divisé par la durée suffit :
     c'est donc une borne haute valide dans tous les cas, puisqu'un rendement ne
     peut qu'aider. */
  let high = money(
    Math.max(
      basis.monthly,
      Math.ceil((target - (basis.capital ?? ZERO)) / Math.max(1, months)),
    ),
  )
  let tries = 0
  /* Un plafond de versements peut rendre la borne insuffisante : on la double
     jusqu'à ce qu'elle tienne, ou jusqu'à admettre qu'aucun versement ne
     rattrape — un compte plein ne reçoit plus rien, quoi qu'on y mette. */
  while (!reaches(high) && tries < 40) {
    high = money(Math.max(1, high * 2))
    tries += 1
  }
  if (!reaches(high)) return high

  let low = ZERO
  for (let step = 0; step < 40 && high - low > 1; step += 1) {
    const middle = money(Math.floor((low + high) / 2))
    if (reaches(middle)) high = middle
    else low = middle
  }
  return high
}

/**
 * Le verdict, à partir de ce que les comptes disent.
 *
 * `on` est le mois de lecture : il est passé plutôt que lu, comme partout dans
 * le domaine, pour qu'un test n'ait pas à voyager dans le temps.
 */
export function readGoal(
  goal: Pick<SavingGoal, 'target' | 'targetOn'>,
  basis: GoalBasis,
  on: ISODate = today(),
): GoalRead {
  const month = ymOf(on)
  const capital = basis.capital
  const held = capital ?? ZERO
  const left = money(Math.max(0, goal.target - held))
  const reached = goal.target > 0 && held >= goal.target

  const series = goalTrajectory(basis, GOAL_HORIZON_MONTHS, basis.monthly, month)
  const rank = reached ? 0 : rankReaching(series, goal.target)
  const reachOn = rank === null ? null : addMonthsToYm(month, rank)

  /* L'échéance, en mois d'ici. Une date déjà passée donne un nombre négatif, et
     c'est une lecture juste : le retard est réel, il ne se rattrape plus par un
     versement. */
  const due =
    goal.targetOn === undefined ? null : monthsBetween(month, goal.targetOn)

  return {
    capital,
    left,
    /* Borné à 1 : dépasser sa cible est une bonne nouvelle, pas 118 % d'un cap
       — et une jauge qui déborderait de son cadre ne dirait plus rien. */
    progress: goal.target <= 0 ? 0 : Math.min(1, ratio(held, goal.target)),
    monthly: basis.monthly,
    reachOn,
    drift: due === null || rank === null ? null : rank - due,
    neededMonthly:
      due === null || due <= 0 || reached || (rank !== null && rank <= due)
        ? null
        : solveMonthly(basis, goal.target, due, month),
    reached,
  }
}

/** Le nombre de mois entre deux `YearMonth`, signé. */
function monthsBetween(from: YearMonth, to: YearMonth): number {
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  return ((ty ?? 0) - (fy ?? 0)) * 12 + ((tm ?? 0) - (fm ?? 0))
}

/**
 * Les objectifs encore en cours, dans l'ordre du document.
 *
 * Un objectif archivé sort des listes mais garde son passé, comme un support
 * clôturé : on ne supprime pas ce qui a été visé, on cesse de le poursuivre.
 */
export function activeGoals(goals: readonly SavingGoal[]): SavingGoal[] {
  return goals.filter((goal) => !goal.archived)
}

/** Les objectifs d'une personne. L'épargne ne s'additionne pas entre deux. */
export function goalsOfMember(
  goals: readonly SavingGoal[],
  memberId: string,
): SavingGoal[] {
  return goals.filter((goal) => goal.memberId === memberId)
}

/**
 * Ce qui empêche de retirer un compte d'un objectif sans le dire.
 *
 * Un support supprimé se coupe des objectifs qui le désignaient, exactement
 * comme il se coupe d'une `Entry` : l'objectif reste, il vise toujours la même
 * somme, et sa lecture repart sur les comptes qui restent. Le taire ferait
 * chuter un avancement sans cause visible.
 */
export function goalsUsingSupport(
  goals: readonly SavingGoal[],
  supportId: string,
): SavingGoal[] {
  return goals.filter((goal) => goal.supportIds.includes(supportId))
}
