/* ============================================================================
 * La grille du calendrier, sans React et sans DOM.
 *
 * Tout ce que l'écran sait faire est ici : découper un mois en cases, déplacer
 * le focus d'une touche, décider combien de pastilles tiennent dans une case,
 * ordonner les échéances d'un jour. Le rendu, lui, ne fait que du rendu.
 *
 * Deux conséquences, et ce sont les deux raisons de la séparation :
 *
 * — `grid.test.ts` vérifie qu'un février fait quarante-deux cases sans monter
 *   de jsdom, sans amorcer de store et sans rendre un composant. Ce qui se
 *   teste en arithmétique se teste vite, et se relit.
 * — `today()` n'entre jamais ici : `defaultAnchor` reçoit le jour en paramètre,
 *   comme `navigationBounds(data, on)` et `monthHorizon(on)` le font déjà dans
 *   `domain/month.ts`. Une fonction pure qui lirait l'horloge ne serait pure
 *   qu'un jour sur deux.
 *
 * Aucune bibliothèque de dates n'est ajoutée : `domain/date.ts` tient déjà le
 * rôle. Une date est une chaîne ISO `'AAAA-MM-JJ'` en heure civile locale, donc
 * comparable par `<` et `===`, et l'arithmétique passe par les jours de
 * l'époque — jamais par un `Date`, qui décalerait d'un jour selon le fuseau.
 * ==========================================================================*/

import {
  type ISODate,
  type YearMonth,
  addDays,
  addMonths,
  dayOfWeek,
  parseISO,
  startOfMonth,
  ymOf,
} from '@/domain/date'
import { type Money, ZERO, compare, sub, sum } from '@/domain/money'
import type { Entry } from '@/domain/types'
import { weekdayNames, weekdayNarrow } from '@/i18n/format'

export const DAYS = 7

/**
 * Six semaines, toujours, et pas « autant que le mois en demande ».
 *
 * Un mois occupe naturellement quatre, cinq ou six rangées, et la grille
 * changeait donc de hauteur d'un mois à l'autre : la tuile grandissait et
 * rétrécissait sous le pouce à chaque balayage. Le prix de la hauteur fixe est
 * un février de vingt-huit jours commençant un lundi — deux semaines pleines du
 * mois suivant, tous les six ans environ (2021, 2027). Ça reste un calendrier ;
 * une tuile qui saute reste un défaut.
 */
export const WEEKS = 6
export const CELLS = WEEKS * DAYS

/**
 * Quatre pastilles, et c'est une mesure, pas un chiffre rond.
 *
 * La colonne la plus étroite que l'app serve fait 44px (320px de fenêtre, bord
 * perdu, gouttières abandonnées — le calcul est dans `CalendarGrid`), dont 36
 * de contenu une fois le cadre de la case retiré. Quatre pastilles de 6px avec
 * 2px de gouttière en prennent 30 : elles tiennent sur une ligne, partout.
 *
 * Faire varier le nombre selon la largeur était l'autre piste, et elle est
 * fausse : le « +N » compte ce que la case ne montre pas, donc une pastille
 * masquée par une media query lui ferait dire un nombre faux.
 */
export const MAX_DOTS = 4

export type GridCell = {
  date: ISODate
  /** Le quantième, 1 à 31. C'est ce qui s'affiche. */
  day: number
  /** Faux pour un jour de débord, qui appartient à un mois voisin. */
  inMonth: boolean
}

/**
 * Les sept en-têtes, dérivés de la locale et jamais écrits en dur.
 *
 * Le nom complet accompagne l'initiale parce que les initiales ne sont pas
 * uniques en français — mardi et mercredi donnent tous deux « M » —, et qu'une
 * clé de rendu doit l'être.
 */
export function weekdays(): { name: string; initial: string }[] {
  return weekdayNames().map((name, index) => ({
    name,
    initial: weekdayNarrow(index + 1),
  }))
}

/** La fenêtre de six semaines d'un mois, bornes incluses. */
export function gridRange(month: YearMonth): { from: ISODate; to: ISODate } {
  const first = startOfMonth(month)
  // `dayOfWeek` rend 1 pour lundi : reculer d'autant moins un ouvre la semaine.
  const from = addDays(first, -(dayOfWeek(first) - 1))
  return { from, to: addDays(from, CELLS - 1) }
}

/** Les quarante-deux cases du mois, débords des mois voisins compris. */
export function monthGrid(month: YearMonth): GridCell[] {
  const { from } = gridRange(month)
  return Array.from({ length: CELLS }, (_, index) => {
    const date = addDays(from, index)
    return { date, day: parseISO(date).d, inMonth: ymOf(date) === month }
  })
}

/** Vrai si la date est l'une des cases affichées par ce mois-là. */
export function isInGrid(month: YearMonth, date: ISODate): boolean {
  const { from, to } = gridRange(month)
  return date >= from && date <= to
}

/**
 * Le jour qui porte l'arrêt de tabulation à l'arrivée sur un mois.
 *
 * Aujourd'hui quand on le regarde, le 1er sinon : c'est la même règle que
 * `defaultDateFor` applique à la date d'une saisie, et il n'y a pas de raison
 * que le clavier atterrisse ailleurs que le formulaire.
 */
export function defaultAnchor(month: YearMonth, on: ISODate): ISODate {
  return ymOf(on) === month ? on : startOfMonth(month)
}

export type Move = {
  date: ISODate
  /**
   * Vrai pour Page précédente et Page suivante, qui changent de mois même si le
   * jour d'arrivée était déjà affiché.
   *
   * Une flèche, elle, ne fait que déplacer le focus : le 1er du mois suivant est
   * souvent l'une des cases de débord, et rebasculer le mois entier pour un pas
   * d'un jour ferait sauter la grille sous les doigts. Ces deux touches-ci n'ont
   * pas d'autre emploi que de paginer, donc elles paginent.
   */
  paging: boolean
}

/**
 * Où va le focus, par touche. `null` quand la touche ne nous regarde pas —
 * c'est ce qui laisse Échap, Tab et les lettres passer leur chemin.
 *
 * Page précédente et Page suivante n'ont aucun cas particulier à écrire pour le
 * 31 : `addMonths` ramène déjà le 31 janvier au 28 février.
 */
export function keyboardMove(key: string, from: ISODate): Move | null {
  switch (key) {
    case 'ArrowLeft':
      return { date: addDays(from, -1), paging: false }
    case 'ArrowRight':
      return { date: addDays(from, 1), paging: false }
    case 'ArrowUp':
      return { date: addDays(from, -DAYS), paging: false }
    case 'ArrowDown':
      return { date: addDays(from, DAYS), paging: false }
    case 'Home':
      return { date: addDays(from, -(dayOfWeek(from) - 1)), paging: false }
    case 'End':
      return { date: addDays(from, DAYS - dayOfWeek(from)), paging: false }
    case 'PageUp':
      return { date: addMonths(from, -1), paging: true }
    case 'PageDown':
      return { date: addMonths(from, 1), paging: true }
    default:
      return null
  }
}

/** Combien de pastilles s'affichent, et combien passent dans le « +N ». */
export function density(total: number, budget: number = MAX_DOTS): { shown: number; rest: number } {
  const shown = Math.min(total, budget)
  return { shown, rest: total - shown }
}

/**
 * L'ordre des échéances d'un jour : confirmé avant prévu, puis du plus gros au
 * plus petit.
 *
 * Le seau suivait jusqu'ici l'ordre d'insertion du document, si bien que les
 * quatre pastilles affichées étaient quatre au hasard : un loyer pouvait tomber
 * dans le « +3 » derrière trois cafés. Ordonné, ce sont les quatre qui pèsent
 * qui restent visibles — et la feuille du jour se lit dans l'ordre exact des
 * pastilles de sa case, ce qui est une correspondance qu'on peut vérifier à
 * l'œil.
 *
 * Le libellé puis l'identifiant ferment la comparaison : deux montants égaux
 * doivent se ranger toujours dans le même sens, sinon la liste bouge au premier
 * re-rendu sans que rien n'ait changé.
 */
export function compareForDay(a: Entry, b: Entry): number {
  return (
    Number(a.status === 'planned') - Number(b.status === 'planned') ||
    compare(b.amount, a.amount) ||
    a.label.localeCompare(b.label, 'fr') ||
    a.id.localeCompare(b.id)
  )
}

/** Ce que le jour laisse : ce qui rentre moins ce qui sort, prévu compris. */
export function dayNet(entries: readonly Entry[]): Money {
  const of = (direction: 'in' | 'out'): Money =>
    sum(entries.filter((entry) => entry.direction === direction).map((entry) => entry.amount))
  if (entries.length === 0) return ZERO
  return sub(of('in'), of('out'))
}
