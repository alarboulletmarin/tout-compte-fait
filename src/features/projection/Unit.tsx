/* ============================================================================
 * Un champ et son unité, posée à côté de lui.
 *
 * « 0 », « 100 » et « 3 » empilés dans une colonne ne disent pas lequel est un
 * capital, lequel un versement mensuel et lequel un pourcentage : le libellé le
 * dit, mais il est au-dessus, et l'œil qui relit ses chiffres ne remonte pas.
 *
 * **À côté du champ et non dedans.** Les montants sont alignés à droite (DS §3,
 * `AmountInput`), donc un suffixe posé à l'intérieur tomberait pile sur le
 * dernier chiffre tapé. `aria-hidden` : l'étiquette du champ porte déjà l'unité
 * en toutes lettres — « Versement mensuel » —, et l'annoncer deux fois ne
 * l'apprendrait pas mieux.
 *
 * Dans son propre module parce que deux écrans s'en servent désormais : la page
 * et la feuille des rendements. Il vivait au bas de la page, ce qui obligeait
 * celle-ci à exporter un composant pour sa feuille — et un module qui exporte à
 * la fois des composants et des fonctions casse le rafraîchissement à chaud.
 * ==========================================================================*/

import type { ReactNode } from 'react'

export function Unit({ suffix, children }: { suffix: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      {children}
      <span className="t-label shrink-0" aria-hidden="true">
        {suffix}
      </span>
    </span>
  )
}
