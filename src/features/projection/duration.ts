/* ============================================================================
 * Une durée en toutes lettres : « 5 ans », « 2 ans 6 mois », « 8 mois ».
 *
 * Ici et pas dans `i18n/format.ts` : ce module et sa prose voyagent avec
 * l'écran des projections, qui se charge à la demande, et rien d'autre dans
 * l'app n'a de durée à écrire de cette façon. C'est le motif de
 * `features/savings/freshness.ts`, qui compose de la même manière l'âge d'un
 * relevé à partir des chaînes qui le nomment.
 *
 * Les jalons tombent sur des quarts d'horizon (`domain/projection.ts`), donc
 * pas toujours sur une année pleine : arrondir « 2 ans 6 mois » à « 2 ans »
 * ferait mentir le montant posé en face.
 * ==========================================================================*/

import { tpl } from '@/i18n/format'
import { projection } from '@/i18n/projection'

const MONTHS_PER_YEAR = 12

function years(count: number): string {
  return count === 1 ? projection.yearOne : tpl(projection.years, count)
}

function months(count: number): string {
  return count === 1 ? projection.monthOne : tpl(projection.months, count)
}

export function formatDuration(monthCount: number): string {
  const total = Math.max(0, Math.trunc(monthCount))
  const wholeYears = Math.trunc(total / MONTHS_PER_YEAR)
  const restMonths = total % MONTHS_PER_YEAR

  if (wholeYears === 0) return months(restMonths)
  if (restMonths === 0) return years(wholeYears)
  return tpl(projection.yearsAndMonths, years(wholeYears), months(restMonths))
}
