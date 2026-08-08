/* ============================================================================
 * Le type qui transforme un catalogue français en *forme* de catalogue.
 *
 * Les quatre catalogues sont écrits `as const` : chaque chaîne y a son propre
 * type littéral, ce qui est parfait tant qu'il n'y a qu'une langue et impossible
 * dès qu'il y en a deux — « Light » ne sera jamais du type `'Clair'`. `Widen`
 * élargit les feuilles à `string` et **ne touche pas à l'arbre** : une clé
 * oubliée ou une clé en trop dans une traduction reste une erreur de
 * compilation, ce qui est tout l'intérêt de dériver le type du français plutôt
 * que de l'écrire à la main.
 *
 * Un module à part parce que les quatre catalogues s'en servent — `fr.ts`,
 * `history.ts`, `landing.ts` et `legal.ts` — et qu'aucun des trois derniers n'a
 * de raison d'importer le premier, qui pèse dans le graphe initial.
 * ==========================================================================*/

export type Widen<T> = T extends string
  ? string
  : T extends readonly (infer Item)[]
    ? readonly Widen<Item>[]
    : { readonly [K in keyof T]: Widen<T[K]> }
