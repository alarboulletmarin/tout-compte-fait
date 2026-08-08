/* ============================================================================
 * L'âge d'un relevé, en toutes lettres.
 *
 * La date seule ne dit pas ce qu'elle vaut : « 8 février » posé sous un chiffre
 * n'apprend rien tant qu'on n'a pas compté les mois de tête. Passé le premier
 * mois, la lecture bascule donc sur l'écart ; passé la **cadence du support**,
 * elle dit ce qu'il faut en faire.
 *
 * La cadence, et non un seuil unique : « à actualiser » se disait au sixième
 * mois pour tout le monde, ce qui se trompait dans les deux sens à la fois — un
 * Livret A dont l'app connaît le capital à l'euro près était réputé périmé, et
 * un PEA que le marché avait refait passait pour frais.
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
import type { SavingPace } from '@/domain/types'
import { t } from '@/i18n/strings'
import { formatDayMonthShort, tpl } from '@/i18n/format'

/** `null` quand le support n'a jamais été relevé — jamais « le 0 ». */
export function freshness(date: ISODate | null, pace?: SavingPace): string {
  if (date === null) return t.savings.valueNever

  const age = valuationAge(date, pace)
  /* Sans l'année : la date ne s'affiche que sous le mois, où elle est
     forcément proche, et « relevé le 8 août 2026 » passait à la ligne sur une
     rangée de 320px. Passé un mois, il n'y a plus de date du tout — c'est
     l'écart qui se lit. L'historique, lui, garde les dates entières : là, deux
     relevés peuvent être à des années l'un de l'autre. */
  if (age.level === 'fresh') return tpl(t.savings.valueOn, formatDayMonthShort(date))
  if (age.level === 'stale') return tpl(t.savings.valueStale, age.months)
  return age.months === 1 ? t.savings.valueAgeOne : tpl(t.savings.valueAge, age.months)
}
