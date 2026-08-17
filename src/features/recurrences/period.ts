/* Traduction entre la périodicité du modèle et les choix offerts au formulaire.
 *
 * **Le formulaire doit savoir dire tout ce que le modèle sait porter.** Il ne
 * le savait pas : `Period` accepte un `every` sur les trois unités, mais les
 * options n'en proposaient que sur les mois. Une hebdomadaire y valait toujours
 * `every: 1`, une annuelle aussi — si bien qu'un document importé portant « une
 * fois tous les quinze jours » s'affichait juste, se développait juste, et se
 * faisait réécrire en hebdomadaire à la première reprise de sa fiche. Le
 * formulaire renvoie l'état complet de ce qu'il montre (cahier §3), et il ne
 * montrait pas tout : la règle était bonne, c'est ce qu'elle voyait qui ne
 * l'était pas.
 *
 * La quinzaine n'est d'ailleurs pas un cas de bord — c'est le rythme d'une paie
 * sur deux et de bien des prélèvements. */

import { type ISODate, dayOfWeek, parseISO } from '@/domain/date'
import type { Period } from '@/domain/types'
import { t } from '@/i18n/strings'
import { formatDayMonthShort, formatMonthDay, tpl, weekdayName } from '@/i18n/format'

export type PeriodKind =
  | 'weekly'
  | 'everyNWeeks'
  | 'monthly'
  | 'quarterly'
  | 'everyNMonths'
  | 'yearly'
  | 'everyNYears'

/**
 * La tranche de formulaire qui décrit une périodicité. Extraite du brouillon
 * de récurrence pour que la saisie d'une dépense puisse la porter aussi : les
 * deux écrans posent la même règle, ils ne peuvent pas la décrire deux fois.
 *
 * Les trois `every` cohabitent plutôt que de partager un champ : passer de
 * « toutes les 2 semaines » à « tous les 3 mois » et revenir ne doit pas
 * ramener 3 semaines, un chiffre que personne n'a saisi.
 */
export type PeriodDraft = {
  kind: PeriodKind
  everyWeeks: number
  everyMonths: number
  everyYears: number
  monthDay: number
  weekday: number
  startedOn: ISODate
}

/**
 * Le jour d'échéance qui vaut « le dernier du mois », quel que soit le mois.
 *
 * Ce n'est pas une convention posée ici : `clampToMonth` borne sans reporter,
 * donc 31 tombe le 31 en janvier, le 28 en février et le 30 en avril — c'est
 * déjà, exactement, « le dernier jour ». Ce qui manquait était de le *dire* :
 * l'écran annonçait « le 31 de chaque mois » pour une échéance qui tombe le 28,
 * et il fallait deviner qu'on demande le dernier jour en saisissant 31.
 */
export const LAST_DAY = 31

/** Une périodicité mensuelle ancrée sur la date donnée — le défaut partout. */
export function monthlyDraftFrom(startedOn: ISODate): PeriodDraft {
  return {
    kind: 'monthly',
    everyWeeks: 2,
    everyMonths: 2,
    everyYears: 2,
    startedOn,
    ...defaultsFrom(startedOn),
  }
}

/** Un `every` du modèle : entier, jamais nul. */
function every(value: number): number {
  return Math.max(1, Math.trunc(value) || 1)
}

/** Construit la `Period` du modèle à partir de la tranche de formulaire. */
export function periodOf(draft: PeriodDraft): Period {
  switch (draft.kind) {
    case 'weekly':
      return { unit: 'week', every: 1, anchorDay: draft.weekday }
    case 'everyNWeeks':
      return { unit: 'week', every: every(draft.everyWeeks), anchorDay: draft.weekday }
    case 'monthly':
      return { unit: 'month', every: 1, anchorDay: draft.monthDay }
    case 'quarterly':
      return { unit: 'month', every: 3, anchorDay: draft.monthDay }
    case 'everyNMonths':
      return { unit: 'month', every: every(draft.everyMonths), anchorDay: draft.monthDay }
    /* Le mois de l'ancre vient de `startedOn` ; seul le jour est porté ici. */
    case 'yearly':
      return { unit: 'year', every: 1, anchorDay: parseISO(draft.startedOn).d }
    case 'everyNYears':
      return {
        unit: 'year',
        every: every(draft.everyYears),
        anchorDay: parseISO(draft.startedOn).d,
      }
  }
}

/* L'ordre est celui de la durée croissante, et les « tous les n » suivent
   l'option fixe qu'ils généralisent : on cherche « toutes les deux semaines »
   à côté de « hebdomadaire », pas en fin de liste. */
export const periodOptions = (): { value: PeriodKind; label: string }[] => [
  { value: 'weekly', label: t.recurrences.periods.weekly },
  { value: 'everyNWeeks', label: t.recurrences.periods.everyNWeeks },
  { value: 'monthly', label: t.recurrences.periods.monthly },
  { value: 'quarterly', label: t.recurrences.periods.quarterly },
  { value: 'everyNMonths', label: t.recurrences.periods.everyNMonths },
  { value: 'yearly', label: t.recurrences.periods.yearly },
  { value: 'everyNYears', label: t.recurrences.periods.everyNYears },
]

/**
 * L'option qui décrit cette période — et qui la décrit *entièrement*.
 *
 * Rabattre `week` sur « hebdomadaire » et `year` sur « annuelle » quel que soit
 * le `every` faisait perdre le `every` à l'enregistrement suivant : le
 * formulaire renvoyant tout ce qu'il montre, ce qu'il ne montre pas s'efface.
 */
export function kindOf(period: Period): PeriodKind {
  if (period.unit === 'week') return period.every > 1 ? 'everyNWeeks' : 'weekly'
  if (period.unit === 'year') return period.every > 1 ? 'everyNYears' : 'yearly'
  if (period.every === 1) return 'monthly'
  if (period.every === 3) return 'quarterly'
  return 'everyNMonths'
}

/** Défauts du formulaire, déduits de la date de première échéance. */
export function defaultsFrom(startedOn: ISODate): { monthDay: number; weekday: number } {
  return { monthDay: parseISO(startedOn).d, weekday: dayOfWeek(startedOn) }
}

/** Résumé lisible : « le 5 de chaque mois », « chaque année le 15 mars ». */
export function describePeriod(period: Period, startedOn: ISODate): string {
  const weekday = (): string => weekdayName(period.anchorDay)
  /* Le jour du mois, ou son nom quand il en a un. Voir `LAST_DAY`. */
  const monthDay = (): string =>
    period.anchorDay >= LAST_DAY
      ? t.recurrences.summary.lastDay
      : formatMonthDay(period.anchorDay)

  switch (period.unit) {
    case 'week':
      return period.every > 1
        ? tpl(t.recurrences.summary.everyNWeeks, weekday(), period.every)
        : tpl(t.recurrences.summary.weekly, weekday())
    case 'year':
      return period.every > 1
        ? tpl(t.recurrences.summary.everyNYears, period.every, formatDayMonthShort(startedOn))
        : tpl(t.recurrences.summary.yearly, formatDayMonthShort(startedOn))
    case 'month':
      return period.every === 1
        ? tpl(t.recurrences.summary.monthly, monthDay())
        : tpl(t.recurrences.summary.everyN, monthDay(), period.every)
  }
}
