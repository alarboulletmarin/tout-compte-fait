/* ============================================================================
 * Taux — entier de points de base, et la saisie qui y mène.
 *
 * 450 points de base = 4,50 %. Le pendant exact de `money.ts` : aucun flottant
 * ne touche un calcul financier, pas plus un taux qu'un montant, et le seul
 * endroit où une saisie devient un taux est ici.
 *
 * Ces deux fonctions vivaient dans `features/credits/CreditFormPage.tsx`, où
 * elles étaient nées. Les projections posent exactement la même question — un
 * pourcentage tapé à la main, borné, rendu en points de base —, et une
 * primitive nommée d'après son premier appelant est une primitive qu'on
 * recopie au deuxième.
 * ==========================================================================*/

/**
 * Le plafond d'un taux saisi : 100 %.
 *
 * Il ne prétend pas qu'un rendement de 100 % soit vraisemblable — il refuse ce
 * qui ne peut être qu'une faute de frappe. Quelqu'un qui tape « 450 » en
 * pensant en points de base doit obtenir un refus visible, pas une projection
 * à quatre cent cinquante pour cent qui a l'air d'un résultat.
 */
export const MAX_RATE_PERCENT = 100

/**
 * Un taux se saisit en pourcent — « 4,5 » — et se stocke en points de base.
 *
 * Un champ vide vaut zéro et non `null` : sur un crédit, c'est un prêt sans
 * intérêts ; sur un scénario de projection, c'est un placement qui ne rapporte
 * rien. Les deux sont des réponses, pas des absences de réponse. `null` est
 * réservé à ce qui est illisible — hors bornes, ou pas un nombre —, que
 * l'appelant signale au lieu de l'enregistrer.
 */
export function parseRateBp(text: string): number | null {
  const cleaned = text.trim().replace(',', '.')
  if (cleaned === '') return 0
  const value = Number(cleaned)
  if (!Number.isFinite(value) || value < 0 || value > MAX_RATE_PERCENT) return null
  return Math.round(value * 100)
}

/** Rend un taux dans la forme attendue par un champ de saisie : « 4,5 ». */
export function toRateInput(rateBp: number | undefined): string {
  if (rateBp === undefined || rateBp === 0) return ''
  return String(rateBp / 100).replace('.', ',')
}
