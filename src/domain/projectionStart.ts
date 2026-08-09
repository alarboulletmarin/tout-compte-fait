/* ============================================================================
 * D'où part une projection quand elle part de l'épargne réelle.
 *
 * Ce module rend ce que le document **sait** d'un portefeuille : le capital, les
 * versements récurrents, les paliers de taux posés sur chaque compte et leur
 * plafond de versements. Il ne **devine** rien, et c'est la règle qui le tient
 * tout entier : un Livret A dont le taux du jour est connu n'est pas un
 * « rendement garanti sur dix ans », et prêter à un PEA le rendement de sa
 * dernière décennie serait exactement le tour de passe-passe des simulateurs de
 * vente (cahier §4.6 ter). Ce qu'il transporte, quelqu'un l'a écrit ; ce qu'il
 * ne transporte pas, l'écran comble en le disant.
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
import type { RateKind } from './projection'
import { type Money, ZERO, add, sub } from './money'
import { monthlyEquivalent } from './recurrence'
import { savingTotal, supportValue } from './saving'
import { roomLeft } from './savingCap'
import { type RateStep, rateOn, rateSchedule } from './savingRate'
import type { KindOf } from './stats'
import type { Entry, Recurrence, SavingRate, SavingSupport, SavingValuation } from './types'

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
/**
 * Un support, tel que la projection le reprend.
 *
 * Il existe pour une seule raison : **projeter un portefeuille support par
 * support**. Un Livret A à 3 % et un PEA à 6 % qui partent de capitaux
 * différents et reçoivent des versements différents ne suivent pas la même
 * courbe, et leur somme n'est celle d'aucun taux moyen. Le tableau de l'écran
 * en donne une colonne chacun, et le total est la somme des colonnes — pas une
 * projection de plus posée à côté.
 *
 * `rateBp` vaut `null` quand le support ne porte aucune hypothèse : c'est alors
 * celle de l'écran qui s'applique, et l'écran seul le sait.
 */
export type ProjectionPart = {
  supportId: string
  /** Le nom du support, pour l'en-tête de sa colonne. */
  label: string
  /** Son capital estimé, ou `null` faute de relevé. */
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
}

export type ProjectionStart = {
  /** Le capital estimé — dernier relevé plus les mouvements confirmés depuis. */
  capital: Money | null
  /** Les versements récurrents nets, ramenés au mois. Zéro s'il n'y en a pas. */
  monthly: Money
  /** Combien de supports relevés composent ce capital. Zéro : il n'y en a pas. */
  valued: number
  /** Combien de supports comptés n'ont aucun relevé, et manquent donc au capital. */
  unvalued: number
  /** Combien de règles récurrentes composent ce versement. */
  rules: number
  /**
   * Combien de règles s'arrêtent avant la fin de l'horizon, et sont donc
   * laissées de côté. Voir `recurringMonthly` — c'est le piège de ce module.
   */
  ending: number
  /**
   * Une règle d'épargne au montant variable a été laissée de côté : elle n'a
   * pas de mensualité à reprendre, et l'écran le dit plutôt que de compter
   * zéro à sa place.
   */
  variable: boolean
  /**
   * Le détail par support, dans l'ordre du document.
   *
   * Vide en simulation libre — il n'y a pas de support —, et vide aussi quand
   * les versements ne se rattachent à aucun compte : c'est la somme qui répond
   * alors, et une colonne par support serait une colonne vide. Les totaux
   * `capital` et `monthly` restent la vérité de l'écran ; les parts n'en sont
   * que la décomposition, et elles s'y recomposent exactement.
   */
  parts: ProjectionPart[]
}

const EMPTY: ProjectionStart = {
  capital: null,
  monthly: ZERO,
  valued: 0,
  unvalued: 0,
  rules: 0,
  ending: 0,
  variable: false,
  parts: [],
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
 * Ce que la projection reprend d'**un** support.
 *
 * `until` est le dernier jour de l'horizon simulé : c'est lui qui décide
 * quelles règles sont assez durables pour entrer dans un versement constant.
 */
export function supportStart(
  support: SavingSupport,
  valuations: readonly SavingValuation[],
  entries: readonly Entry[],
  recurrences: readonly Recurrence[],
  rates: readonly SavingRate[],
  on: ISODate,
  until: ISODate,
): ProjectionStart {
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
    capital: value.estimated,
    monthly,
    valued: value.estimated === null ? 0 : 1,
    unvalued: value.estimated === null ? 1 : 0,
    rules,
    ending,
    variable,
    /* Un support seul n'a pas besoin d'être décomposé — il *est* la
       décomposition. La part existe quand même : c'est elle qui porte son taux,
       et l'écran n'a ainsi qu'un seul chemin pour le lire. */
    parts: [
      {
        supportId: support.id,
        label: support.label,
        capital: value.estimated,
        monthly,
        rateBp: current?.rateBp ?? null,
        rateKind: current?.kind ?? null,
        steps,
        cap: support.depositCap ?? null,
        room: support.depositCap === undefined ? null : roomLeft(support.depositCap, value.estimated),
      },
    ],
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
  rates: readonly SavingRate[],
  kindOf: KindOf,
  on: ISODate,
  until: ISODate,
): ProjectionStart {
  const owned = supports.filter((support) => support.memberId === memberId && !support.archived)
  const total = savingTotal(owned, valuations, entries, on)
  const ownedIds = new Set(owned.map((support) => support.id))

  const { monthly, rules, ending, variable } = recurringMonthly(
    recurrences.filter((recurrence) => {
      if (kindOf(recurrence.categoryId) !== 'saving') return false
      if (recurrence.savingSupportId !== undefined) return ownedIds.has(recurrence.savingSupportId)
      return recurrence.memberId === memberId
    }),
    on,
    until,
  )

  /* Le détail, un support à la fois, par la **même** fonction que l'origine
     « un support » : deux façons de décomposer un portefeuille finiraient par
     ne plus donner les mêmes colonnes que le total qu'elles surplombent. */
  const parts = owned.map(
    (support) => supportStart(support, valuations, entries, recurrences, rates, on, until).parts[0],
  )

  return {
    /* Aucun support relevé : il n'y a pas de capital à reprendre, et zéro n'en
       est pas un. Les versements, eux, restent vrais — on sait ce qui part
       chaque mois même sans savoir ce qui est déjà là. */
    capital: total.valued === 0 ? null : total.estimated,
    monthly,
    valued: total.valued,
    unvalued: total.unvalued,
    rules,
    ending,
    variable,
    parts: recomposes(parts, total.estimated, monthly) ? parts.filter(isPart) : [],
  }
}

const isPart = (part: ProjectionPart | undefined): part is ProjectionPart => part !== undefined

/**
 * Les parts redonnent-elles exactement le total ?
 *
 * Elles ne le font pas toujours, et c'est voulu : un versement d'épargne
 * d'avant les supports ne désigne aucun compte, donc il pèse dans le total sans
 * appartenir à aucune colonne. Un tableau dont les colonnes ne font pas le
 * total est pire qu'un tableau absent — on cherche l'erreur, et il n'y en a
 * pas. Dans ce cas l'écran s'en tient à la somme, et la décomposition se tait.
 *
 * Une égalité stricte, en centimes : ces deux chemins additionnent les mêmes
 * entiers, et une tolérance ne servirait qu'à masquer un jour une vraie
 * divergence.
 */
function recomposes(
  parts: readonly (ProjectionPart | undefined)[],
  capital: Money,
  monthly: Money,
): boolean {
  if (parts.length === 0 || !parts.every(isPart)) return false
  const capitals = parts.reduce((sum, part) => sum + (part.capital ?? ZERO), 0)
  const monthlies = parts.reduce((sum, part) => sum + part.monthly, 0)
  return capitals === capital && monthlies === monthly
}

/** L'origine vide — une simulation libre n'a rien à reprendre. */
export const NO_START: ProjectionStart = EMPTY
