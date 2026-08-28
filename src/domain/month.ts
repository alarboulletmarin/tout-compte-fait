/* ============================================================================
 * Ouverture d'un mois — génération des `Entry` planned.
 *
 * L'opération est idempotente : rejouer l'ouverture d'un mois ne duplique
 * jamais une échéance déjà générée, et ne touche jamais une entrée confirmée.
 * ==========================================================================*/

import {
  type ISODate,
  type YearMonth,
  addMonthsToYm,
  endOfMonth,
  startOfMonth,
  today,
  ymOf,
} from './date'
import { type Money, ZERO } from './money'
import { amountOn } from './priceHistory'
import { occurrencesInMonth } from './recurrence'
import { capStateOf, clipToCap } from './savingCap'
import type { Data, Entry, MonthState, Recurrence } from './types'

export type MonthPlan = {
  ym: YearMonth
  /** Échéances à créer — aucune n'existe encore dans le document. */
  created: Entry[]
  /** Celles dont le montant reste à saisir, listées à part (cahier §4.3). */
  variable: Entry[]
}

/** Clé d'unicité d'une échéance générée : une récurrence, une date. */
function occurrenceKey(recurrenceId: string, date: ISODate): string {
  return `${recurrenceId}@${date}`
}

function existingOccurrences(entries: readonly Entry[], month: YearMonth): Set<string> {
  const keys = new Set<string>()
  for (const entry of entries) {
    if (entry.recurrenceId === undefined) continue
    if (ymOf(entry.date) !== month) continue
    keys.add(occurrenceKey(entry.recurrenceId, entry.date))
  }
  return keys
}

/**
 * De quoi planifier un mois : les règles, ce qui est déjà posé, et — pour le
 * plafond des supports — de quoi savoir ce qu'un compte vaut.
 *
 * Les deux derniers sont facultatifs : un document sans support n'a aucun
 * plafond à faire respecter, et la planification s'y comporte exactement comme
 * avant qu'il existe.
 */
export type PlanSource = Pick<Data, 'recurrences' | 'entries'> &
  Partial<Pick<Data, 'savingSupports' | 'savingValuations' | 'advances'>>

/**
 * Calcule ce que produirait l'ouverture d'un mois, sans rien muter.
 * `makeId` est injecté pour que la fonction reste pure et testable.
 *
 * **Le plafond d'un support arrête les versements à venir.** Une règle qui
 * verse 200 € par mois sur un livret plafonné continuait d'en poser jusqu'à
 * faire monter le compte bien au-dessus de ce que le contrat autorise : le
 * prévisionnel annonçait alors un capital que la banque aurait refusé de
 * recevoir. La dernière échéance qui tient est **écrêtée** plutôt que refusée en
 * entier — il reste 120 € de place et la règle verse 200, on pose les 120 —,
 * c'est déjà la règle du simulateur (cahier §4.6 ter), et les suivantes ne se
 * posent plus tant que la place ne revient pas.
 *
 * **Seulement l'avenir, jamais le jour même ni ce qui précède.** Une échéance
 * datée d'aujourd'hui ou d'hier n'est plus une prévision qu'on corrige : c'est
 * un fait en attente de confirmation, souvent celui qu'on vient de déclarer
 * payé en créant la règle. L'écrêter reviendrait à refuser un versement que
 * quelqu'un affirme avoir fait, ce qu'aucune approximation de place restante
 * n'autorise (voir `savingCap`).
 */
export function planMonth(
  data: PlanSource,
  month: YearMonth,
  makeId: () => string,
  on: ISODate = today(),
): MonthPlan {
  const from = startOfMonth(month)
  const to = endOfMonth(month)
  const seen = existingOccurrences(data.entries, month)
  const created: Entry[] = []
  const variable: Entry[] = []

  const candidates: { recurrence: Recurrence; date: ISODate }[] = []
  for (const recurrence of data.recurrences) {
    for (const occurrence of occurrencesInMonth(recurrence, month)) {
      if (occurrence.date < from || occurrence.date > to) continue
      if (seen.has(occurrenceKey(recurrence.id, occurrence.date))) continue
      candidates.push({ recurrence, date: occurrence.date })
    }
  }

  /* Dans l'ordre du calendrier, et c'est le plafond qui l'exige : deux règles
     qui versent sur le même compte le 5 et le 20 ne consomment pas la même
     place, et les traiter règle par règle donnerait à la seconde une place que
     la première a déjà prise. Le tri est stable, donc deux échéances du même
     jour gardent l'ordre du document. */
  candidates.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  /* Ce que le document portera au fil de la planification : chaque échéance
     posée compte pour la place qui reste à celles d'après. */
  const running = [...data.entries]

  for (const { recurrence, date } of candidates) {
    const entry = buildPlannedEntry(recurrence, date, data.entries, makeId)
    const room = date <= on ? entry.amount : cappedAmount(entry, data, running)
    // Plus un centime de place : l'échéance ne se pose pas du tout. C'est la
    // fiche du support qui dit pourquoi — « plafond atteint, 1 règle verse
    // encore » —, et non une ligne à zéro dans le mois, qui ne dirait rien.
    if (room <= ZERO && room !== entry.amount) continue

    const posted = room === entry.amount ? entry : { ...entry, amount: room }
    created.push(posted)
    running.push(posted)
    if (recurrence.amount === null) variable.push(posted)
  }

  return { ym: month, created, variable }
}

/**
 * Ce qu'une échéance de versement peut encore poser sous le plafond de son
 * support — son montant tel quel partout ailleurs.
 *
 * La place se lit sur la **trajectoire** (`ahead`), échéances prévues
 * comprises : sans cela, douze mois de versements à venir liraient tous la même
 * place et aucun ne serait jamais écrêté.
 */
function cappedAmount(entry: Entry, data: PlanSource, entries: readonly Entry[]): Money {
  if (entry.direction !== 'out' || entry.savingSupportId === undefined) return entry.amount
  const support = data.savingSupports?.find((one) => one.id === entry.savingSupportId)
  if (support?.depositCap === undefined) return entry.amount
  if (restoresAdvance(entry, data)) return entry.amount
  const state = capStateOf(support, data.savingValuations ?? [], entries, entry.date, true)
  return clipToCap(state, entry.amount)
}

/**
 * Vrai quand l'échéance **reconstitue une avance** — et le plafond ne la touche
 * alors pas.
 *
 * Une mensualité d'avance n'est pas un versement de plus : c'est le retour de
 * ce que ce support-là a avancé, quelques mois plus tôt, par une reprise qui a
 * libéré exactement autant de place. Les écrêter reviendrait à compter la
 * reprise une fois et le retour deux, et le compte s'en trouve arithmétiquement
 * piégé : sur un livret dont les intérêts ont dépassé le plafond — l'état normal
 * d'un livret plein, et le cas du jeu d'exemple —, la place vaut zéro en
 * permanence, si bien qu'**aucune** mensualité ne se poserait jamais. L'avance
 * ne se reconstituerait plus, son reste dû ne bougerait plus d'un centime, et
 * l'écran des avances afficherait une dette envers soi-même sans fin ni cause
 * visible.
 *
 * C'est la contrepartie exacte de ce que dit `savingCap` : la place que l'app
 * calcule est sous-estimée, et on ne la laisse jamais refuser un mouvement dont
 * on sait par ailleurs qu'il a sa place.
 */
function restoresAdvance(entry: Entry, data: PlanSource): boolean {
  if (entry.recurrenceId === undefined) return false
  return data.advances?.some((advance) => advance.recurrenceId === entry.recurrenceId) === true
}

/** Fabrique l'échéance d'une récurrence à une date. Exportée pour `updates`. */
export function buildPlannedEntry(
  recurrence: Recurrence,
  date: ISODate,
  entries: readonly Entry[],
  makeId: () => string,
): Entry {
  // Montant variable : on propose celui que la récurrence vaut à cette date —
  // la même règle qu'ailleurs, pour que le chiffre proposé à la confirmation
  // soit celui-là même que les totaux ont déjà compté.
  const amount = amountOn(recurrence, entries, date) ?? ZERO
  return {
    id: makeId(),
    recurrenceId: recurrence.id,
    label: recurrence.label,
    categoryId: recurrence.categoryId,
    ...(recurrence.memberId === undefined ? {} : { memberId: recurrence.memberId }),
    /* Le support voyage par identifiant, jamais par libellé ni par catégorie :
       une échéance générée sait sur quel compte elle tombe parce que sa règle
       le dit, et deux supports du même poste ne peuvent pas se confondre. */
    ...(recurrence.savingSupportId === undefined
      ? {}
      : { savingSupportId: recurrence.savingSupportId }),
    direction: recurrence.direction,
    amount,
    date,
    status: 'planned',
    // La règle de partage est portée par la récurrence : ses échéances en
    // héritent, comme elles héritent du membre — et « réglé par » suit la
    // même route.
    ...(recurrence.shared === undefined ? {} : { shared: recurrence.shared }),
    ...(recurrence.paidById === undefined ? {} : { paidById: recurrence.paidById }),
  }
}

/* --- État des mois --------------------------------------------------------*/

export function findMonthState(
  months: readonly MonthState[],
  month: YearMonth,
): MonthState | undefined {
  return months.find((m) => m.ym === month)
}

export function isMonthOpened(months: readonly MonthState[], month: YearMonth): boolean {
  return findMonthState(months, month) !== undefined
}

/** Les mois couverts par les données, du plus ancien au plus récent. */
export function coveredMonths(data: Pick<Data, 'entries' | 'months'>): YearMonth[] {
  const set = new Set<YearMonth>()
  for (const entry of data.entries) set.add(ymOf(entry.date))
  for (const state of data.months) set.add(state.ym)
  return [...set].sort()
}

/**
 * Jusqu'où l'on ouvre des mois à venir.
 *
 * Ouvrir un mois y écrit toutes les échéances de toutes les récurrences, et
 * rien ne bornait ce geste : chaque « mois suivant » ouvrait le mois, ce qui
 * repoussait la borne d'un cran, ce qui permettait d'aller encore plus loin.
 * Cent clics valaient cent mois d'échéances prévisionnelles écrites pour de
 * bon dans le document, inélaguables autrement qu'entrée par entrée.
 *
 * Douze mois : c'est la fenêtre de l'historique, celle d'une assurance annuelle
 * et celle des avances — au-delà, on ne consulte plus un prévisionnel, on
 * spécule sur des récurrences qui auront changé.
 */
export const HORIZON_MONTHS = 12

/** Le mois le plus lointain qu'on ouvre. */
export function monthHorizon(on: ISODate = today()): YearMonth {
  return addMonthsToYm(ymOf(on), HORIZON_MONTHS)
}

/** Ce qu'on peut atteindre en changeant de mois. */
export type MonthBounds = { min: YearMonth; max: YearMonth }

/**
 * Les bornes de la navigation entre mois.
 *
 * En arrière, on ne remonte pas avant la première donnée. En avant, un mois
 * d'avance est toujours accessible — c'est ce qui permet d'ouvrir le mois
 * suivant et d'y voir tomber les échéances —, mais jamais au-delà de
 * l'horizon.
 *
 * Un document qui porte déjà des données plus loin reste consultable jusqu'à
 * elles : un fichier importé peut contenir des échéances lointaines, et une
 * borne qui les rendrait injoignables cacherait des données qu'on possède. Il
 * n'y gagne pas le mois d'avance pour autant — ce mois-là est une invitation à
 * ouvrir, et l'horizon dit précisément où l'on cesse d'inviter.
 */
export function navigationBounds(
  data: Pick<Data, 'entries' | 'months'>,
  on: ISODate = today(),
): MonthBounds {
  const covered = coveredMonths(data)
  const now = ymOf(on)
  const first = covered[0] ?? now
  const last = covered.at(-1) ?? now
  const reach = addMonthsToYm(last > now ? last : now, 1)
  const horizon = monthHorizon(on)

  return {
    min: first < now ? first : now,
    max: reach <= horizon ? reach : last > horizon ? last : horizon,
  }
}
