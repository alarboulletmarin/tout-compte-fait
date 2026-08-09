/* ============================================================================
 * Les teintes d'une pile de supports.
 *
 * Un support porte déjà une couleur partout ailleurs dans l'app : celle de sa
 * **catégorie** — c'est la teinte de sa pastille dans la liste des comptes, dans
 * la ventilation du mois et sur sa fiche. La reprendre ici garde une seule
 * correspondance à apprendre, et laisse à la couleur le seul sens qu'elle a dans
 * cette app : la nature de ce qu'on place.
 *
 * Pas les teintes de membre : sur l'écran d'épargne, toutes les bandes
 * appartiennent à la même personne (cahier §4.6 bis), et une palette de membres
 * y dirait quelque chose de faux.
 *
 * **Deux comptes de même catégorie se départagent.** Deux « Livret A » sous la
 * même catégorie tomberaient sur la même teinte, et deux bandes voisines de même
 * couleur ne sont plus deux bandes. La collision glisse donc vers le premier
 * jeton libre du nuancier, dans son ordre — déterministe, donc stable d'un rendu
 * à l'autre.
 * ==========================================================================*/

import type { Category, SavingSupport } from '@/domain/types'

/**
 * Le nuancier des catégories, dans l'ordre où il se dégrade.
 *
 * Le même que celui de l'anneau « Où part l'argent » : six teintes qui tiennent
 * l'une contre l'autre dans les six palettes et les deux thèmes, plus un repli.
 */
const PALETTE = [
  'var(--cat-1)',
  'var(--cat-2)',
  'var(--cat-3)',
  'var(--cat-4)',
  'var(--cat-5)',
  'var(--cat-6)',
  'var(--cat-rest)',
] as const

/**
 * Une teinte par support, dans l'ordre du document.
 *
 * Sa catégorie d'abord, un jeton libre ensuite s'il est déjà pris. Le dernier
 * jeton du nuancier sert de repli quand tout est pris : à ce nombre de comptes,
 * la pile est de toute façon coupée par l'appelant.
 */
export function bandColors(
  supports: readonly Pick<SavingSupport, 'id' | 'categoryId'>[],
  categories: ReadonlyMap<string, Category>,
): Map<string, string> {
  const taken = new Set<string>()
  const colors = new Map<string, string>()

  const last: string = PALETTE[PALETTE.length - 1] ?? 'var(--cat-rest)'

  for (const support of supports) {
    const own = categories.get(support.categoryId)?.color
    const color: string =
      own !== undefined && !taken.has(own)
        ? own
        : (PALETTE.find((token) => !taken.has(token)) ?? last)
    taken.add(color)
    colors.set(support.id, color)
  }

  return colors
}
