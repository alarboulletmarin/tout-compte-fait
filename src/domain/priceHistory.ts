/* ============================================================================
 * Les montants d’une récurrence, lus sur ses échéances.
 *
 * Rien n'est stocké : une récurrence à montant variable ne porte aucun chiffre,
 * le sien se déduit des `Entry` liées à sa `recurrenceId` (cahier §3).
 *
 * Ce module est le seul endroit où cette lecture se fait. Le total des
 * récurrences, la fiche d’une récurrence, le revenu d'un membre et le montant
 * proposé à l'ouverture d'un mois posent tous la même question — « combien vaut
 * cette récurrence ? » — et trois réponses différentes à la même question, ce sont
 * trois chiffres qui se contredisent d'un écran à l'autre.
 * ==========================================================================*/

import { type ISODate, type YearMonth, endOfMonth, ymOf } from './date'
import { type Money, sub } from './money'
import type { CategoryKind, Direction, Entry, Recurrence } from './types'

/* --- Le montant en vigueur ------------------------------------------------*/

/**
 * Le montant qu'on peut attribuer à une récurrence le jour `on`, ou `null`
 * quand rien ne permet de le dire — et non zéro : un montant qu'on ne connaît
 * pas encore n'est pas un montant nul.
 *
 * Trois sources, dans cet ordre. Le montant fixe, quand il y en a un. Sinon ce
 * que disent les échéances, qui font foi dès qu'il y en a une de chiffrée.
 * Sinon seulement le montant habituel déclaré sur la récurrence : c'est une
 * estimation, et une estimation ne peut jamais couvrir un fait.
 */
export function amountOn(
  recurrence: Recurrence,
  entries: readonly Entry[],
  on: ISODate,
): Money | null {
  if (recurrence.amount !== null) return recurrence.amount
  return knownAmount(entries, recurrence.id, on) ?? recurrence.estimate ?? null
}

/**
 * Le montant de l'échéance chiffrée la plus proche de `on`, le passé d'abord.
 *
 * Une échéance confirmée est un fait. Une échéance encore prévue dont on a
 * saisi le montant en est un aussi — c'est ce qu'on s'attend à payer ou à
 * toucher, et l'ignorer revenait à répondre « je ne sais pas » d'un montant
 * qu'on venait d'écrire. Seule la case laissée à zéro par l'ouverture du mois
 * ne dit rien : c'est un emplacement vide, pas un montant nul.
 *
 * Le jour même compte : un salaire confirmé le 27 vaut le 27, pas seulement le
 * 28. Et faute de passé, la prochaine échéance déjà chiffrée fait l'affaire —
 * une récurrence qui n'est pas encore tombée n'est pas pour autant inconnue.
 */
export function knownAmount(
  entries: readonly Entry[],
  recurrenceId: string,
  on: ISODate,
): Money | null {
  let past: Entry | null = null
  let ahead: Entry | null = null

  for (const entry of entries) {
    if (entry.recurrenceId !== recurrenceId) continue
    if (entry.status !== 'confirmed' && entry.amount <= 0) continue

    if (entry.date <= on) {
      if (past === null || entry.date > past.date) past = entry
    } else if (ahead === null || entry.date < ahead.date) ahead = entry
  }

  return (past ?? ahead)?.amount ?? null
}

/**
 * Le montant qu'une récurrence porte **réellement** sur un mois donné.
 *
 * `amountOn` répond « que vaut la règle ? » ; ici la question est « combien ce
 * mois-ci ? », et l'échéance du mois passe devant la règle dès qu'elle dit
 * quelque chose d'elle-même : **confirmée** — elle a eu lieu, à ce montant,
 * quoi que la règle raconte —, ou **prévue à un montant saisi à la main**,
 * c'est-à-dire différent de celui que la règle aurait posé. La prévue restée au
 * montant de la règle suit la règle : c'est un emplacement posé par l'ouverture
 * du mois, pas une saisie, et corriger la règle doit continuer de la déplacer.
 *
 * C'est la lecture du prorata : sans elle, le salaire d'un mois corrigé ligne
 * à ligne — un congé, une paie réduite — ne déplaçait jamais la part de ce
 * mois-là, et la répartition se lisait figée quel que soit le chiffre saisi.
 * Le coefficient reste assis sur les récurrences — une prime ponctuelle, sans
 * `recurrenceId`, ne le déplace toujours pas — mais l'échéance du mois est un
 * fait, et un fait passe devant une règle.
 *
 * Plusieurs échéances chiffrées sur le mois — une règle hebdomadaire — : la
 * plus récente répond, comme `knownAmount` répond déjà de la plus proche.
 */
export function amountInMonth(
  recurrence: Recurrence,
  entries: readonly Entry[],
  month: YearMonth,
): Money | null {
  let costed: Entry | null = null
  for (const entry of entries) {
    if (entry.recurrenceId !== recurrence.id) continue
    if (ymOf(entry.date) !== month) continue
    // La case laissée à zéro par l'ouverture du mois ne dit rien.
    if (entry.status !== 'confirmed' && entry.amount <= 0) continue
    // La prévue restée au montant de la règle n'est pas une saisie.
    if (entry.status !== 'confirmed' && entry.amount === recurrence.amount) continue
    if (costed === null || entry.date > costed.date) costed = entry
  }

  if (costed !== null) return costed.amount
  return amountOn(recurrence, entries, endOfMonth(month))
}

/**
 * Dernier montant confirmé d'une récurrence *strictement avant* `before`.
 *
 * C'est la question de l'historique de prix, et elle seule : ce qui était payé
 * jusque-là. `amountOn` répond à une autre — ce que vaut la récurrence — et les
 * deux ne se remplacent pas, une échéance prévue n'étant pas un prix pratiqué.
 */
export function lastConfirmedAmount(
  entries: readonly Entry[],
  recurrenceId: string,
  before: ISODate,
): Money | null {
  let best: Entry | null = null
  for (const entry of entries) {
    if (entry.recurrenceId !== recurrenceId) continue
    if (entry.status !== 'confirmed') continue
    if (entry.date >= before) continue
    if (best === null || entry.date > best.date) best = entry
  }
  return best?.amount ?? null
}

/* --- Historique de prix ---------------------------------------------------*/

export type PricePoint = { date: ISODate; amount: Money }

/** Les montants confirmés d'une récurrence, du plus ancien au plus récent. */
export function priceHistory(entries: readonly Entry[], recurrenceId: string): PricePoint[] {
  return entries
    .filter((e) => e.recurrenceId === recurrenceId && e.status === 'confirmed')
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((e) => ({ date: e.date, amount: e.amount }))
}

export type PriceChange = {
  previous: Money
  current: Money
  /** current − previous. Positif = augmentation. */
  delta: Money
  /** Date de l'échéance qui porte le nouveau montant. */
  since: ISODate
}

/**
 * Vrai quand le changement pèse : une charge qui monte, un revenu qui baisse.
 *
 * La nature tranche avant le sens : verser plus sur un livret sort davantage
 * du compte, mais l'argent reste au foyer — rien ne coûte, rien n'alarme. Une
 * reprise récurrente qui baisse n'est pas un revenu qui fond non plus. Pour
 * les autres natures, le sens décide, sinon l'app signalerait une augmentation
 * de salaire comme une mauvaise nouvelle — et le DS §2.3 réserve le rouge aux
 * dépassements et aux erreurs. Un changement qui ne coûte rien se lit quand
 * même, sans alarme.
 */
export function isCostly(change: PriceChange, direction: Direction, kind: CategoryKind): boolean {
  if (kind === 'saving') return false
  return direction === 'out' ? change.delta > 0 : change.delta < 0
}

/**
 * Dernier changement de prix constaté, ou null si le montant n'a jamais bougé.
 * On compare le dernier montant confirmé au dernier montant *différent* qui le
 * précède, pour que la fiche continue de signaler la hausse même après
 * plusieurs mois au nouveau tarif.
 */
export function detectPriceChange(
  entries: readonly Entry[],
  recurrenceId: string,
): PriceChange | null {
  const history = priceHistory(entries, recurrenceId)
  if (history.length < 2) return null

  const current = history[history.length - 1]
  if (current === undefined) return null

  for (let i = history.length - 2; i >= 0; i--) {
    const point = history[i]
    if (point === undefined) continue
    if (point.amount === current.amount) continue
    // La première échéance au nouveau tarif est celle qui suit ce point.
    const since = history[i + 1]?.date ?? current.date
    return {
      previous: point.amount,
      current: current.amount,
      delta: sub(current.amount, point.amount),
      since,
    }
  }
  return null
}
