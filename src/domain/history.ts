/* ============================================================================
 * Historique et comparatifs.
 *
 * Toute série renvoie un point par période, y compris vides — c'est l'appelant
 * qui décide d'afficher un état vide plutôt qu'un graphique à zéro (cahier
 * §4.7), et il lui faut pour cela savoir qu'une période est vide, pas absente.
 * ==========================================================================*/

import { type YearMonth, addMonthsToYm, monthRange, ym, ymOf } from './date'
import { type Money, ZERO, add, sub, sum } from './money'
import { type KindOf, type KindTotals, type MemberFilter, entriesOfMonth, totalsByKind } from './stats'
import type { Direction, Entry } from './types'

export type MonthPoint = {
  ym: YearMonth
  in: Money
  out: Money
  balance: Money
  /** Faux dès qu'aucune entrée ne tombe dans le mois. */
  hasData: boolean
}

/** Série mensuelle sur [from, to], bornes incluses, sans trou. */
export function monthSeries(
  entries: readonly Entry[],
  from: YearMonth,
  to: YearMonth,
  memberId?: MemberFilter,
): MonthPoint[] {
  return monthRange(from, to).map((month) => {
    const scoped = entriesOfMonth(entries, month, memberId)
    const inflow = sum(scoped.filter((e) => e.direction === 'in').map((e) => e.amount))
    const outflow = sum(scoped.filter((e) => e.direction === 'out').map((e) => e.amount))
    return {
      ym: month,
      in: inflow,
      out: outflow,
      balance: sub(inflow, outflow),
      hasData: scoped.length > 0,
    }
  })
}

/** Les `count` derniers mois, `endYm` inclus. */
export function trailingMonths(
  entries: readonly Entry[],
  endYm: YearMonth,
  count = 12,
  memberId?: MemberFilter,
): MonthPoint[] {
  return monthSeries(entries, addMonthsToYm(endYm, -(count - 1)), endYm, memberId)
}

/* --- Série par nature -----------------------------------------------------*/

/**
 * Un mois lu **par nature**, et non par sens de trésorerie.
 *
 * `MonthPoint` ne connaît que des entrées et des sorties : un versement
 * d'épargne y pèse dans `out`, à côté du loyer et de la mensualité du crédit.
 * Cela suffit à dessiner douze barres, jamais à répondre « combien me coûte un
 * mois » — la réponse serait gonflée de tout ce qu'on a mis de côté,
 * c'est-à-dire précisément de ce qu'on cesserait de faire le mois où le revenu
 * s'arrête.
 *
 * D'où une seconde série, aux mêmes bornes et au même `hasData` : ce sont les
 * mêmes mois, lus avec une autre question. `totalsByKind` fait la lecture, comme
 * pour le mois affiché — il n'y a qu'une façon de compter une nature.
 */
export type KindPoint = {
  ym: YearMonth
  totals: KindTotals
  /** Faux dès qu'aucune entrée ne tombe dans le mois. */
  hasData: boolean
}

/**
 * Série mensuelle par nature sur [from, to], bornes incluses, sans trou.
 *
 * `forecast` a ici le sens qu'il a partout : échéances prévues comprises ou
 * non. Un mois passé porte souvent des `planned` que personne n'a confirmées —
 * elles ont pourtant été payées — et les exclure ferait passer un mois entier
 * pour un mois sans loyer.
 */
export function kindSeries(
  entries: readonly Entry[],
  from: YearMonth,
  to: YearMonth,
  kindOf: KindOf,
  memberId?: MemberFilter,
  forecast = false,
): KindPoint[] {
  return monthRange(from, to).map((month) => ({
    ym: month,
    totals: totalsByKind(entries, month, kindOf, memberId, forecast),
    hasData: entriesOfMonth(entries, month, memberId).length > 0,
  }))
}

/* --- Comparaison de deux mois --------------------------------------------*/

export type CategoryDelta = {
  categoryId: string
  left: Money
  right: Money
  /** right − left. */
  delta: Money
  /** Écart relatif. null quand le mois de gauche est à zéro : rien à diviser. */
  deltaRatio: number | null
}

function totalsByCategory(
  entries: readonly Entry[],
  month: YearMonth,
  direction: Direction,
  memberId?: MemberFilter,
): Map<string, Money> {
  const totals = new Map<string, Money>()
  for (const entry of entriesOfMonth(entries, month, memberId)) {
    if (entry.direction !== direction) continue
    totals.set(entry.categoryId, add(totals.get(entry.categoryId) ?? ZERO, entry.amount))
  }
  return totals
}

/** Écart par catégorie entre deux mois, en valeur et en proportion. */
export function compareMonths(
  entries: readonly Entry[],
  left: YearMonth,
  right: YearMonth,
  direction: Direction = 'out',
  memberId?: MemberFilter,
): CategoryDelta[] {
  const a = totalsByCategory(entries, left, direction, memberId)
  const b = totalsByCategory(entries, right, direction, memberId)
  const ids = new Set([...a.keys(), ...b.keys()])

  return [...ids]
    .map((categoryId) => {
      const leftTotal = a.get(categoryId) ?? ZERO
      const rightTotal = b.get(categoryId) ?? ZERO
      return {
        categoryId,
        left: leftTotal,
        right: rightTotal,
        delta: sub(rightTotal, leftTotal),
        deltaRatio: leftTotal === 0 ? null : (rightTotal - leftTotal) / leftTotal,
      }
    })
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
}

export type DeltaSplit = {
  /** Écart non nul, du plus gros au plus petit — l'ordre de `compareMonths`. */
  changed: CategoryDelta[]
  /** Même montant des deux côtés, du plus lourd au plus léger. */
  unchanged: CategoryDelta[]
}

/**
 * Ce qui a changé d'un mois à l'autre, et ce qui n'a pas bougé.
 *
 * `compareMonths` rend l'union des catégories des deux mois : une catégorie
 * présente de part et d'autre au même montant y figure avec un écart de zéro.
 * Affichées ensemble, ces lignes-là noient les autres — sur un catalogue réel,
 * quinze « 0,00 € · 0 % » pour deux vraies variations, et la lecture qu'on est
 * venu chercher se trouve à la quinzième ligne.
 *
 * La partition vit ici et non dans le composant parce que c'est une distinction
 * métier — « ça a bougé » ou « ça n'a pas bougé » — et non une mise en page.
 *
 * Les inchangées se reclassent par montant commun décroissant. Elles arrivent
 * toutes à égalité sous le tri de `compareMonths`, qui classe par ampleur
 * d'écart : leur ordre y est celui de l'itération d'un `Set`, c'est-à-dire
 * celui de la première rencontre dans les entrées. Ce qui distingue encore
 * deux catégories qui n'ont pas bougé, c'est ce qu'elles pèsent.
 */
export function splitDeltas(deltas: readonly CategoryDelta[]): DeltaSplit {
  return {
    changed: deltas.filter((delta) => delta.delta !== 0),
    unchanged: deltas.filter((delta) => delta.delta === 0).sort((a, b) => b.right - a.right),
  }
}

/* --- Comparaison d'années ------------------------------------------------*/

export type YearPoint = {
  month: number
  in: Money
  out: Money
  balance: Money
  /** Cumul du solde depuis janvier. */
  cumulative: Money
  hasData: boolean
}

export function yearSeries(
  entries: readonly Entry[],
  year: number,
  memberId?: MemberFilter,
): YearPoint[] {
  const points = monthSeries(entries, ym(year, 1), ym(year, 12), memberId)
  let running = ZERO
  return points.map((point, index) => {
    running = add(running, point.balance)
    return {
      month: index + 1,
      in: point.in,
      out: point.out,
      balance: point.balance,
      cumulative: running,
      hasData: point.hasData,
    }
  })
}

/**
 * L'index du dernier mois que l'année sait chiffrer — son horizon.
 *
 * C'est lui qui rend deux années comparables quand l'une n'est pas finie :
 * arrêter 2026 en novembre et lire 2025 jusqu'en décembre compare onze mois à
 * douze, et l'écart annoncé est alors celui d'un mois de plus, pas celui d'une
 * année qui va mieux. Le cumul de `yearSeries` court sur les douze mois quoi
 * qu'il arrive — c'est ce qui permet de lire les deux années *au même index*
 * plutôt que chacune à sa fin.
 *
 * `-1` sur une année entièrement vide : il n'y a alors aucun mois où s'arrêter,
 * et rendre zéro aurait désigné janvier.
 *
 * Il ne demande que `hasData` : le solde et l'épargne se cumulent tous deux au
 * fil de l'année, et l'horizon d'une année est le même quelle que soit la
 * question qu'on lui pose.
 */
export function yearHorizon(points: readonly { hasData: boolean }[]): number {
  return points.reduce((last, point, index) => (point.hasData ? index : last), -1)
}

/**
 * Le cumul d'une année en une ligne de graphique, borné aux mois qui portent
 * des données.
 *
 * Un mois vide n'est pas un cumul plat : il n'est pas tracé du tout (cahier
 * §4.7). Sans cette coupe, une année en cours plongerait sur sa dernière valeur
 * jusqu'en décembre, et l'œil lirait « ça s'arrête » là où il n'y a rien encore.
 */
export function cumulativeLine(
  points: readonly { cumulative: Money; hasData: boolean }[],
): (Money | null)[] {
  const first = points.findIndex((point) => point.hasData)
  if (first === -1) return points.map(() => null)
  const last = yearHorizon(points)
  return points.map((point, index) => (index >= first && index <= last ? point.cumulative : null))
}

/** Les années couvertes par les données, de la plus ancienne à la plus récente. */
export function coveredYears(entries: readonly Entry[]): number[] {
  const years = new Set<number>()
  for (const entry of entries) years.add(Number(ymOf(entry.date).slice(0, 4)))
  return [...years].sort((a, b) => a - b)
}

export function hasDataInYear(entries: readonly Entry[], year: number): boolean {
  const prefix = String(year)
  return entries.some((e) => e.date.startsWith(prefix))
}
