/* ============================================================================
 * D'où part une simulation : un support, et ce que le document sait de lui.
 *
 * Ce module rend ce que le document **sait** d'un compte d'épargne : son
 * capital, les versements récurrents qui y tombent, les paliers de taux posés
 * sur sa fiche et son plafond de versements. Il ne **devine** rien, et c'est la
 * règle qui le tient tout entier : un Livret A dont le taux du jour est connu
 * n'est pas un « rendement garanti sur dix ans », et prêter à un PEA le
 * rendement de sa dernière décennie serait exactement le tour de passe-passe des
 * simulateurs de vente (cahier §4.6 ter). Ce qu'il transporte, quelqu'un l'a
 * écrit ; ce qu'il ne transporte pas, l'écran comble en le disant.
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
 * **Une part par support, et rien qui les additionne.** Le module rendait aussi
 * un total — « toute l'épargne de Camille », un capital et un versement pour un
 * portefeuille entier — que la simulation prenait pour point de départ. Ce total
 * ne décrivait aucune trajectoire : un Livret A à 2,4 % et un PEA muet ne
 * suivent pas la même courbe, et leur somme n'est celle d'aucun taux moyen. La
 * somme se fait donc **après**, sur des séries, à l'écran qui la trace — et elle
 * n'existe que pour les comptes qu'on a choisis. Ce qui reste ici est la brique
 * unitaire : un support, ses quatre nombres, ses paliers.
 * ==========================================================================*/

import type { ISODate } from './date'
import type { RateKind } from './projection'
import { type Money, ZERO, add, sub } from './money'
import { monthlyEquivalent } from './recurrence'
import { supportValue } from './saving'
import { roomLeft } from './savingCap'
import { type RateStep, rateOn, rateSchedule } from './savingRate'
import type { Entry, Recurrence, SavingRate, SavingSupport, SavingValuation } from './types'

/**
 * Un support, tel qu'une simulation le reprend.
 *
 * Il existe pour une seule raison : **projeter un portefeuille support par
 * support**. Un Livret A à 3 % et un PEA à 6 % qui partent de capitaux
 * différents et reçoivent des versements différents ne suivent pas la même
 * courbe, et leur somme n'est celle d'aucun taux moyen. L'écran donne donc une
 * trajectoire à chacun, et le total est la somme de ces trajectoires — pas une
 * projection de plus posée à côté.
 *
 * `rateBp` vaut `null` quand le support ne porte aucune hypothèse : c'est alors
 * celle de l'écran qui s'applique, et l'écran seul le sait.
 */
export type ProjectionPart = {
  supportId: string
  /** Le nom du support, tel qu'il s'affiche partout ailleurs dans l'app. */
  label: string
  /**
   * À qui il est. L'épargne est individuelle (cahier §4.6 bis), et deux
   * personnes du même foyer ont souvent un livret du même nom : c'est l'écran
   * qui décide s'il faut le préciser, mais il ne peut le faire que s'il le sait.
   */
  memberId: string
  /**
   * Son capital estimé, ou `null` faute de relevé.
   *
   * `null` et non zéro : zéro est une information financière — un livret vidé —,
   * l'absence de relevé n'en est pas une, et les confondre donnerait un
   * patrimoine faux présenté comme exact.
   */
  capital: Money | null
  /** Ce que ses règles récurrentes y versent, au mois, en net. */
  monthly: Money
  /** Son taux **du jour du départ**, ou `null` — l'écran comble alors. */
  rateBp: number | null
  /** Ce que ce taux engage. `null` avec le taux. */
  rateKind: RateKind | null
  /**
   * Les paliers déjà datés qui tombent dans l'horizon, celui du départ compris.
   *
   * Un seul terme quand rien ne change — et c'est le cas courant. Le barème
   * n'invente aucun changement : il transporte ceux que quelqu'un a posés, si
   * bien qu'un taux daté du 1er janvier prochain s'applique dans la projection
   * au rang qui lui revient, et pas avant.
   *
   * Vide quand le support ne porte aucun palier : `rateBp` vaut alors `null`, et
   * c'est l'écran qui comble.
   */
  steps: readonly RateStep[]
  /** Le plafond de versements du contrat, ou `null` si personne n'en a posé. */
  cap: Money | null
  /**
   * Ce qui reste à verser avant le plafond, ou `null` sans plafond.
   *
   * **`plafond − capital estimé`, et c'est une approximation qu'il faut dire.**
   * Le plafond porte sur les versements **cumulés depuis l'ouverture**, que
   * l'app ne connaît pas : elle connaît le capital d'aujourd'hui, qui contient
   * aussi les intérêts déjà capitalisés. La place réelle est donc un peu plus
   * grande que celle-ci — l'écart vaut exactement les intérêts acquis.
   *
   * Se tromper dans ce sens-là est le seul défendable : entre deux conventions,
   * l'app prend celle qui promet le moins (`projection.ts`), et une place
   * surestimée ferait projeter des versements que le contrat refuserait.
   *
   * Jamais négatif : un compte déjà au-dessus de son plafond a zéro de place,
   * pas une place négative qui viendrait retrancher des versements.
   */
  room: Money | null
  /** Combien de règles récurrentes composent son versement. */
  rules: number
  /**
   * Combien de ses règles s'arrêtent avant la fin de l'horizon, et sont donc
   * laissées de côté. Voir `recurringMonthly` — c'est le piège de ce module.
   */
  ending: number
  /**
   * Une règle au montant variable a été laissée de côté : elle n'a pas de
   * mensualité à reprendre, et l'écran le dit plutôt que de compter zéro à sa
   * place.
   */
  variable: boolean
}

/**
 * Les versements récurrents nets d'un jeu de règles, au mois.
 *
 * En net, comme partout ailleurs : une règle qui reprend 100 € par mois sur le
 * livret qu'une autre alimente de 350 € n'en met pas 450 de côté. Une règle
 * arrêtée ne compte plus — elle ne posera plus d'échéance —, et une règle au
 * montant variable n'est pas comptée pour zéro : elle est **signalée**.
 *
 * **Une règle qui s'arrête avant la fin de l'horizon n'est pas comptée non
 * plus**, et c'est le piège de tout ce module. Le moteur ne sait projeter qu'un
 * versement **constant** : une mensualité de reconstitution d'avance, qui court
 * six mois, y serait multipliée par cent vingt. Sur le jeu d'exemple, 66 €/mois
 * d'avance en cours ajoutaient huit mille euros à dix ans — de l'argent que
 * personne n'a jamais eu l'intention de verser. Une reconstitution d'avance
 * n'est d'ailleurs pas un effort d'épargne : c'est de l'argent qu'on remet là où
 * on l'avait pris.
 *
 * Elles sont donc **écartées et comptées**, jamais silencieusement absentes :
 * entre deux conventions défendables, l'app prend celle qui promet le moins, et
 * elle dit ce qu'elle a laissé de côté.
 *
 * `monthlyEquivalent` et non le montant brut : une prime versée une fois l'an
 * pèse un douzième de mois, et c'est la convention de tout le reste de l'app
 * (cahier §4.2). Deux amortissements différents feraient deux chiffres sous le
 * même mot d'un écran à l'autre.
 */
function recurringMonthly(
  recurrences: readonly Recurrence[],
  on: ISODate,
  until: ISODate,
): { monthly: Money; rules: number; ending: number; variable: boolean } {
  let monthly = ZERO
  let rules = 0
  let ending = 0
  let variable = false

  for (const recurrence of recurrences) {
    /* Déjà éteinte : elle ne posera plus rien, et il n'y a pas lieu de la
       signaler — elle n'appartient plus au présent du foyer. */
    if (recurrence.endedOn !== undefined && recurrence.endedOn <= on) continue
    if (recurrence.endedOn !== undefined && recurrence.endedOn < until) {
      ending += 1
      continue
    }
    const each = monthlyEquivalent(recurrence)
    if (each === null) {
      variable = true
      continue
    }
    rules += 1
    /* `out` : l'argent quitte le compte courant pour le support — c'est un
       versement. `in` : il en revient — c'est une reprise. Le même sens de
       lecture que `supportFlows`, et pour la même raison. */
    monthly = recurrence.direction === 'out' ? add(monthly, each) : sub(monthly, each)
  }

  return { monthly, rules, ending, variable }
}

/**
 * Ce qu'une simulation reprend d'**un** support.
 *
 * `until` est le dernier jour de l'horizon simulé : c'est lui qui décide
 * quelles règles sont assez durables pour entrer dans un versement constant.
 */
export function supportPart(
  support: SavingSupport,
  valuations: readonly SavingValuation[],
  entries: readonly Entry[],
  recurrences: readonly Recurrence[],
  rates: readonly SavingRate[],
  on: ISODate,
  until: ISODate,
): ProjectionPart {
  const value = supportValue(support.id, valuations, entries, on)
  const { monthly, rules, ending, variable } = recurringMonthly(
    recurrences.filter((recurrence) => recurrence.savingSupportId === support.id),
    on,
    until,
  )

  /* Le barème complet, et pas seulement le taux du jour : c'est lui qui porte
     les changements datés — un livret révisé au 1er février prochain change de
     taux dans la projection à ce rang-là, et pas au départ. Le taux du jour
     reste rendu à côté, parce que c'est celui que l'écran affiche et propose à
     la modification. */
  const steps = rateSchedule(rates, support.id)
  const current = rateOn(rates, support.id, on)

  return {
    supportId: support.id,
    label: support.label,
    memberId: support.memberId,
    capital: value.estimated,
    monthly,
    rateBp: current?.rateBp ?? null,
    rateKind: current?.kind ?? null,
    steps,
    cap: support.depositCap ?? null,
    room: support.depositCap === undefined ? null : roomLeft(support.depositCap, value.estimated),
    rules,
    ending,
    variable,
  }
}

/**
 * Les mêmes parts, pour une liste de supports.
 *
 * Les **archivés sont écartés** : un compte clôturé n'a pas de trajectoire à
 * venir, et le proposer à la simulation ferait projeter un contrat qui n'existe
 * plus. C'est le filtre que la saisie du quotidien applique déjà.
 *
 * Aucun total : la simulation choisit ses comptes, et c'est elle qui somme ce
 * qu'elle a choisi — sur des séries, jamais sur des taux.
 */
export function supportParts(
  supports: readonly SavingSupport[],
  valuations: readonly SavingValuation[],
  entries: readonly Entry[],
  recurrences: readonly Recurrence[],
  rates: readonly SavingRate[],
  on: ISODate,
  until: ISODate,
): ProjectionPart[] {
  return supports
    .filter((support) => !support.archived)
    .map((support) => supportPart(support, valuations, entries, recurrences, rates, on, until))
}
