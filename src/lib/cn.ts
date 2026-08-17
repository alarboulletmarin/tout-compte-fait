/** Concatène des classes conditionnelles. Rien de plus : aucune fusion, aucun
    arbitrage — c'est l'ordre d'`utilities.css` qui départage deux règles. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter((p): p is string => typeof p === 'string' && p.length > 0).join(' ')
}
