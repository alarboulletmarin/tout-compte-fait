/* ============================================================================
 * L'âge d'un relevé, en toutes lettres.
 *
 * La date seule ne dit pas ce qu'elle vaut : « 8 février » posé sous un chiffre
 * n'apprend rien tant qu'on n'a pas compté les mois de tête. Passé le premier
 * mois, la lecture bascule donc sur l'écart ; passé le sixième, elle dit ce
 * qu'il faut en faire.
 *
 * **Sans une couleur, et c'est délibéré.** Un capital qu'on n'a pas revu depuis
 * six mois n'est pas une erreur : c'est un chiffre qui attend d'être confirmé.
 * Le rouge est réservé aux dépassements et aux erreurs (DS §2.3), et s'il
 * signale aussi le temps qui passe il ne signale plus rien.
 *
 * Ici et pas dans un composant : la fiche d'un support et la liste de l'écran
 * principal disent la même chose du même relevé, et deux formulations pour un
 * seul fait finiraient par diverger.
 * ==========================================================================*/

import type { ISODate } from '@/domain/date'
import { valuationAge } from '@/domain/saving'
import { fr } from '@/i18n/fr'
import { formatDate, tpl } from '@/i18n/format'

/** `null` quand le support n'a jamais été relevé — jamais « le 0 ». */
export function freshness(date: ISODate | null): string {
  if (date === null) return fr.savings.valueNever

  const age = valuationAge(date)
  if (age.level === 'fresh') return tpl(fr.savings.valueOn, formatDate(date))
  if (age.level === 'stale') return tpl(fr.savings.valueStale, age.months)
  return age.months === 1 ? fr.savings.valueAgeOne : tpl(fr.savings.valueAge, age.months)
}
