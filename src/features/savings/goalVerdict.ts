/* ============================================================================
 * Le verdict d'un objectif, en toutes lettres.
 *
 * Ici et pas dans un composant : la liste de l'écran Épargne et la fiche d'un
 * objectif disent la même chose du même écart, et deux formulations pour un
 * seul fait finiraient par diverger. C'est le motif de `freshness.ts`, qui
 * compose de la même façon l'âge d'un relevé.
 *
 * **Un mot, une forme, une icône — la teinte en quatrième.** Le DS §2.3
 * interdit la couleur seule, et il a raison ici plus qu'ailleurs : « à
 * l'heure » et « sept mois de retard » sont la conclusion de tout l'écran, et
 * une conclusion qui ne survit pas au niveau de gris n'en est pas une. Le mot
 * porte donc l'état, la jauge le double, l'icône le triple.
 *
 * **Le rouge est réservé à ce qui a échoué** (DS §2.3), et un objectif en
 * retard n'a rien raté : il dérive. Le retard se dit donc dans le registre de
 * l'attention — le même que le relevé périmé — et jamais dans celui de
 * l'erreur.
 * ==========================================================================*/

import type { GoalRead } from '@/domain/goal'
import { t } from '@/i18n/strings'
import { tpl } from '@/i18n/format'
import { Check, UpcomingIcon, Warning, type IconComponent } from '@/ui/Icons'

/** Ce que l'état d'un objectif porte, et dans quel ordre on le lit. */
export type Verdict = {
  /** Le mot. C'est lui qui conclut, et il suffit à lui seul. */
  label: string
  icon: IconComponent
  /**
   * La teinte, en quatrième signal.
   *
   * `attention` et non `danger` : le rouge du DS est réservé à ce qui a échoué,
   * et un objectif en retard n'a rien raté — il dérive, ce qui se rattrape.
   */
  tone: 'ok' | 'attention' | 'neutral'
}

export function verdictOf(read: GoalRead): Verdict {
  if (read.reached) return { label: t.savings.goalReached, icon: Check, tone: 'ok' }

  /* Pas de date d'arrivée du tout : à versement nul et sans rendement, il n'en
     existe pas, et en inventer une serait pire que se taire. */
  if (read.reachOn === null) {
    return {
      label: read.capital === null ? t.savings.goalNoCapital : t.savings.goalNoReach,
      icon: Warning,
      tone: 'attention',
    }
  }

  if (read.drift === null) return { label: '', icon: UpcomingIcon, tone: 'neutral' }
  if (read.drift <= 0) {
    /* Zéro et l'avance ne se disent pas pareil : « à l'heure » est la
       conclusion qu'on attend, « trois mois d'avance » est une nouvelle. */
    if (read.drift === 0) return { label: t.savings.goalOn, icon: Check, tone: 'ok' }
    const early = -read.drift
    return {
      label: early === 1 ? t.savings.goalAheadOne : tpl(t.savings.goalAhead, early),
      icon: Check,
      tone: 'ok',
    }
  }
  return {
    label: read.drift === 1 ? t.savings.goalLateOne : tpl(t.savings.goalLate, read.drift),
    icon: Warning,
    tone: 'attention',
  }
}

/** La classe de texte d'une teinte de verdict. */
export const verdictClass = (tone: Verdict['tone']): string =>
  tone === 'attention' ? 'text-text' : 'text-muted'
