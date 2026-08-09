/* ============================================================================
 * La projection **de ce qu'on possède**, par opposition à celle qu'on tape.
 *
 * `domain/projection.ts` est une calculatrice : on lui donne quatre nombres,
 * elle capitalise. Ce module-ci est ce qui va les chercher dans le document —
 * et c'est tout ce qu'il fait de plus. Il ne capitalise rien lui-même : chaque
 * trajectoire sort de `projectSeries`, y compris le total. **Un seul moteur**
 * (cahier §4.6 ter), sans quoi le chiffre d'un support et celui de la somme
 * auraient deux façons d'exister et finiraient par ne plus tomber d'accord.
 *
 * Les trois nombres qu'il va chercher, et d'où :
 *
 * - le **point de départ** est la valeur estimée d'un support — dernier relevé
 *   plus les mouvements confirmés depuis —, lue par `supportValue` : la même
 *   fonction que la tuile Capital et que la fiche du support, donc le même
 *   centime sur les trois écrans ;
 * - le **versement mensuel** est celui que les récurrences d'épargne posent
 *   déjà, à l'équivalent mensuel de `monthlyEquivalent` : le chiffre de la
 *   fiche d'une récurrence, et non un second calcul à côté ;
 * - le **taux** ne se lit nulle part, parce qu'il n'existe nulle part. Le
 *   document ne porte aucun rendement, et n'en portera pas « au cas où »
 *   (cahier §2) : c'est une hypothèse, elle vient de qui la pose, et elle est
 *   passée à ce module de l'extérieur.
 *
 * **Rien n'y est écrit.** Ce module lit le document ; il n'a aucune mutation,
 * et la projection ne s'enregistre pas — c'est une lecture qui change dès qu'on
 * change d'avis sur le taux.
 *
 * **Une inconnue n'est jamais un zéro.** Un support sans relevé n'est pas
 * projeté depuis zéro : il est mis à part et nommé. Zéro est une information
 * financière réelle — un livret vidé — quand l'absence de relevé ne dit rien du
 * tout, et un patrimoine faux présenté comme exact est pire que pas de chiffre.
 * C'est la règle de `savingTotal`, et elle vaut à dix ans comme à aujourd'hui.
 * ==========================================================================*/

import { type ISODate, today } from './date'
import { type Money, ZERO, add, sub, sum } from './money'
import { type ProjectionSeries, type RateKind, projectSeries } from './projection'
import { monthlyEquivalent } from './recurrence'
import { supportValue } from './saving'
import type { Entry, Recurrence, SavingSupport, SavingValuation } from './types'

/* --- Ce que les récurrences posent chaque mois -----------------------------*/

/**
 * Ce qu'un support reçoit tous les mois **sans qu'on ait à le dire** — c'est la
 * moitié de ce que cet écran sait faire et qu'un simulateur ne sait pas.
 *
 * Compté en **net**, comme partout dans l'épargne : une règle de sens `out`
 * ajoute, une règle de sens `in` retranche. Reprendre 100 € par mois sur un
 * livret qu'on alimente de 300 € n'y met pas 400 €.
 *
 * **À l'équivalent mensuel**, par la fonction qu'emploie déjà la liste des
 * récurrences : un versement trimestriel de 300 € pèse 100 € par mois ici comme
 * là-bas. Deux façons de mensualiser une règle donneraient deux chiffres sous
 * le même mot, à un écran d'écart.
 *
 * **Les règles arrêtées sortent**, et les montants variables ne sont pas
 * devinés : une récurrence sans montant fixe n'a pas de chiffre tant qu'une
 * échéance n'est pas tombée, et lui en prêter un — zéro, ou sa dernière valeur
 * — ferait passer une estimation pour une donnée. Elle est comptée à part, pour
 * que l'écran puisse dire ce qu'il n'a pas mis dans la courbe.
 */
export type SupportContribution = {
  /** Versements − reprises, ramenés au mois. */
  monthly: Money
  /** Combien de règles actives alimentent ou entament ce support. */
  feeders: number
  /** Combien d'entre elles n'ont pas de montant fixe, et ne comptent donc pas. */
  variable: number
}

export const NO_CONTRIBUTION: SupportContribution = { monthly: ZERO, feeders: 0, variable: 0 }

export function supportContribution(
  recurrences: readonly Recurrence[],
  supportId: string,
  on: ISODate = today(),
): SupportContribution {
  let monthly = ZERO
  let feeders = 0
  let variable = 0

  for (const recurrence of recurrences) {
    if (recurrence.savingSupportId !== supportId) continue
    /* `endedOn` est la dernière date couverte, borne incluse : une règle
       arrêtée aujourd'hui ne pose plus d'échéance, et la compter encore
       projetterait un versement que personne ne fera. C'est la lecture de
       `useRecurrenceRows`. */
    if (recurrence.endedOn !== undefined && recurrence.endedOn <= on) continue

    feeders += 1
    const amount = monthlyEquivalent(recurrence)
    if (amount === null) {
      variable += 1
      continue
    }
    monthly =
      recurrence.direction === 'out' ? add(monthly, amount) : sub(monthly, amount)
  }

  return { monthly, feeders, variable }
}

/* --- Le point de départ d'un support --------------------------------------*/

/**
 * Ce qu'on sait d'un support avant de projeter quoi que ce soit.
 *
 * `initial` est **la valeur estimée**, pas le dernier relevé : c'est la
 * meilleure réponse que l'app ait à « combien j'ai aujourd'hui », et partir du
 * relevé seul sous-estimerait de tous les versements tombés depuis — c'est-à-
 * dire exactement de ce que cet écran existe pour ne plus faire ressaisir.
 * C'est aussi le chiffre que divise « combien de temps ça tient »
 * (`useSavingCoverage`) : le point 0 d'une projection et le capital d'une
 * couverture sont le même nombre, et il n'y a qu'un endroit où il se calcule.
 *
 * `null` quand aucun relevé n'existe. Le support est alors hors de la courbe et
 * hors du total : les mouvements du mois ne font pas une valeur — on saurait ce
 * qui a été versé, pas ce qu'on possède.
 */
export type SupportBasis = {
  support: SavingSupport
  /** Le capital estimé au jour de lecture, ou `null` faute de relevé. */
  initial: Money | null
  /** Le jour du dernier relevé, pour que l'écran dise l'âge du point de départ. */
  knownOn: ISODate | null
  contribution: SupportContribution
}

export function supportBasis(
  support: SavingSupport,
  valuations: readonly SavingValuation[],
  entries: readonly Entry[],
  recurrences: readonly Recurrence[],
  on: ISODate = today(),
): SupportBasis {
  const value = supportValue(support.id, valuations, entries, on)
  return {
    support,
    initial: value.estimated,
    knownOn: value.knownOn,
    contribution: supportContribution(recurrences, support.id, on),
  }
}

export function supportBases(
  supports: readonly SavingSupport[],
  valuations: readonly SavingValuation[],
  entries: readonly Entry[],
  recurrences: readonly Recurrence[],
  on: ISODate = today(),
): SupportBasis[] {
  return supports.map((support) => supportBasis(support, valuations, entries, recurrences, on))
}

/* --- La projection --------------------------------------------------------*/

/**
 * Ce qu'on suppose d'un support : un taux, sa nature, et le versement qu'on
 * projette.
 *
 * `monthly` est **facultatif** et c'est tout le sens du champ : absent, c'est
 * le versement que les récurrences posent réellement qui court — l'écran est
 * alors une lecture. Renseigné, il le remplace pour la durée de la question
 * (« et si je mettais 300 au lieu de 200 »), sans rien changer aux récurrences :
 * une simulation ne modifie pas un fait, et le versement réel reste affiché à
 * côté.
 */
export type SupportAssumption = {
  /** Taux annuel **net**, en points de base. 300 = 3,00 %. */
  rateBp: number
  kind: RateKind
  /** Le versement simulé. Absent, celui des récurrences. */
  monthly?: Money
}

export type SupportPlan = {
  basis: SupportBasis
  rateBp: number
  kind: RateKind
  /** Le versement effectivement projeté — réel, ou simulé. */
  monthly: Money
  /** Vrai quand ce versement ne vient pas des récurrences. */
  simulated: boolean
  series: ProjectionSeries
}

export type SavingProjection = {
  months: number
  /** Les supports projetés, dans l'ordre du document. */
  plans: SupportPlan[]
  /** Ceux qu'aucun relevé ne permet de projeter. Comptés à part, jamais à zéro. */
  unvalued: SavingSupport[]
  /** La somme des trajectoires. `null` quand il n'y a rien à sommer. */
  total: ProjectionSeries | null
}

/**
 * Les trajectoires, une par support, et leur somme.
 *
 * **La somme se fait rang par rang, sur les séries elles-mêmes**, et jamais en
 * reprojetant un capital agrégé à un taux moyen : un livret à 2 % et un PEA à
 * 7 % ne font pas un patrimoine à 4,5 %, et la moyenne se tromperait d'autant
 * plus que l'horizon est long. C'est la même règle qu'ailleurs — le total et le
 * détail sortent du même calcul, donc ils ne peuvent pas diverger.
 *
 * L'inflation traverse jusqu'à `projectSeries`, qui déflate **au rang de chaque
 * point** : sommer des séries déjà déflatées donne le même nombre que déflater
 * leur somme rang par rang, ce qui n'est vrai que parce que la déflation est
 * linéaire à rang égal.
 */
export function projectSupports(
  bases: readonly SupportBasis[],
  assumptionOf: (supportId: string) => SupportAssumption,
  months: number,
  inflationBp = 0,
): SavingProjection {
  const horizon = Math.max(0, Math.trunc(months))
  const plans: SupportPlan[] = []
  const unvalued: SavingSupport[] = []

  for (const basis of bases) {
    if (basis.initial === null) {
      unvalued.push(basis.support)
      continue
    }
    const assumption = assumptionOf(basis.support.id)
    const monthly = assumption.monthly ?? basis.contribution.monthly
    plans.push({
      basis,
      rateBp: assumption.rateBp,
      kind: assumption.kind,
      monthly,
      simulated: assumption.monthly !== undefined,
      series: projectSeries({
        initial: basis.initial,
        monthly,
        months: horizon,
        rateBp: assumption.rateBp,
        inflationBp,
      }),
    })
  }

  return { months: horizon, plans, unvalued, total: mergeSeries(plans.map((plan) => plan.series)) }
}

/**
 * L'addition de plusieurs trajectoires, point par point.
 *
 * `null` sur une liste vide, et c'est une distinction qui compte : personne
 * n'a « 0 € dans dix ans » parce qu'aucun de ses comptes n'a été relevé. Une
 * courbe plate à zéro serait un chiffre, et il serait faux.
 */
export function mergeSeries(series: readonly ProjectionSeries[]): ProjectionSeries | null {
  const first = series[0]
  if (first === undefined) return null

  const at = (values: readonly Money[], rank: number): Money => values[rank] ?? ZERO
  return {
    balance: first.balance.map((_, rank) => sum(series.map((one) => at(one.balance, rank)))),
    contributed: first.contributed.map((_, rank) =>
      sum(series.map((one) => at(one.contributed, rank))),
    ),
  }
}
