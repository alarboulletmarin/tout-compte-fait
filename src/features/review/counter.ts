import { tpl } from '@/i18n/format'
import { t } from '@/i18n/strings'

/**
 * Le compteur long de la revue : où l'on en est, et ce qui attend derrière.
 *
 * Trois formes plutôt qu'une, parce que « 3 sur 6 · 1 après celle-ci » ne
 * s'écrit pas comme « 3 sur 6 · 3 après celle-ci », et que la dernière carte ne
 * se dit pas par un zéro. Le nombre restant est la seule chose qui compte
 * vraiment ici — savoir qu'on arrive au bout change la façon dont on répond.
 *
 * Dans son propre module : la colonne de gauche l'affiche sur écran large, la
 * ligne sous l'en-tête sur écran étroit, et deux formulations pour un même
 * décompte finiraient par diverger.
 */
export function counterLong(index: number, total: number): string {
  const left = total - index - 1
  const rank = Math.min(index + 1, total)
  if (left <= 0) return tpl(t.review.counterLast, rank, total)
  if (left === 1) return tpl(t.review.counterLongOne, rank, total)
  return tpl(t.review.counterLong, rank, total, left)
}
