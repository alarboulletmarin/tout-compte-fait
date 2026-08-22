/* Les puces de la saisie rapide : quelles catégories proposer, et dans quel
 * ordre.
 *
 * Le prototype en pose quatre, écrites en dur — « Courses, Restaurant,
 * Transport, Maison ». Le catalogue réel en compte une quarantaine, rangées
 * sous onze familles, et il se modifie : quatre noms figés seraient faux dès la
 * première catégorie renommée, et muets pour un foyer qui n'utilise aucune des
 * quatre.
 *
 * La règle est donc celle de l'usage : **ce qu'on a déjà saisi le plus
 * souvent**, du même côté. C'est la seule information que le document possède
 * sur ce qu'on est en train de faire, et elle se lit sans rien stocker de neuf.
 * Un document neuf n'en a aucune, et retombe alors sur l'ordre du catalogue —
 * qui est celui des familles, donc du plus courant au plus rare.
 */

import type { Category, CategoryKind, Entry } from '@/domain/types'

/**
 * Combien de pilules.
 *
 * Six, et c'est mesuré comme le reste : une pilule tient en deux lignes de
 * quarante caractères sur un écran de 320 points, et au-delà de deux lignes la
 * rangée pousse le pavé numérique hors de l'écran, c'est-à-dire hors du geste
 * qu'elle est censée accélérer. Ce qui n'y tient pas se choisit au formulaire
 * complet, à un doigt en dessous.
 */
export const QUICK_CATEGORIES = 6

/**
 * Les catégories à proposer : les plus employées d'abord, le catalogue ensuite.
 *
 * `kinds` restreint à ce que la porte annonce — on ne propose pas « Salaires »
 * sous « Dépense ». Les catégories archivées sont écartées : elles restent
 * lisibles sur les lignes qui les portent, mais on n'en pose plus de nouvelles.
 */
export function quickCategories(
  entries: readonly Entry[],
  categories: readonly Category[],
  kindOf: (categoryId: string) => CategoryKind,
  kinds: readonly CategoryKind[],
): Category[] {
  const allowed = categories.filter(
    (category) => !category.archived && kinds.includes(kindOf(category.id)),
  )

  const uses = new Map<string, number>()
  for (const entry of entries) {
    uses.set(entry.categoryId, (uses.get(entry.categoryId) ?? 0) + 1)
  }

  /* Tri stable sur l'ordre du catalogue : deux catégories jamais employées
     gardent leur rang de famille plutôt que de dépendre de l'algorithme de
     tri. `Array.prototype.sort` est stable depuis ES2019, la garantie est
     donc dans le langage et non dans une supposition. */
  return [...allowed]
    .sort((a, b) => (uses.get(b.id) ?? 0) - (uses.get(a.id) ?? 0))
    .slice(0, QUICK_CATEGORIES)
}
