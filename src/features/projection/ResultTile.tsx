/* ============================================================================
 * La réponse, et elle ne quitte jamais l'écran.
 *
 * L'ordre était : explication, paramètres, taux, inflation, résultat, paliers.
 * Il fallait donc traverser presque tout l'écran pour trouver « ≈ 14 k€ », qui
 * est pourtant la seule chose qu'on vient y chercher. Le résultat est passé en
 * tête — puis il y est **resté** : collé en haut pendant qu'on règle, parce que
 * régler sans voir ce qu'on change revient à jouer à un jeu dont le score est
 * derrière soi. C'est la seule façon qu'un écran de réglages ait de se lire
 * comme un instrument plutôt que comme un formulaire.
 *
 * **Une fourchette, pas un chiffre.** Deux nombres ne sont pas deux fois plus
 * durs à lire qu'un seul quand ils sont posés sur le même axe : « entre 148 k€
 * et 224 k€ » dit ce qu'un chiffre unique cache — que personne ne connaît le
 * rendement des quinze prochaines années. Un chiffre seul reste possible, et il
 * apparaît tout seul : quand tous les comptes portent leur taux, il n'y a plus
 * d'incertitude à montrer.
 *
 * **Ce qui n'est pas ici.** La décomposition en quatre lignes et la réserve
 * vivent dans le flux, sous le tracé : elles se lisent une fois, et une tuile
 * collée en haut de l'écran ne peut pas faire six lignes de haut sans manger le
 * graphique qu'elle commente.
 * ==========================================================================*/

import { Eyebrow } from '@/ui/Eyebrow'
import { Tile } from '@/ui/Tile'

export type ResultTileProps = {
  /** Le surtitre : « Dans 10 ans », ou « Pour atteindre 50 000 € dans 10 ans ». */
  heading: string
  /** Le chiffre héros, déjà mis en forme — un capital, une fourchette, un versement. */
  hero: string
  /**
   * La lecture de dessous : la décomposition en une ligne, ou l'écart de la
   * fourchette. `null` quand il n'y a rien à en dire.
   */
  hint: string | null
}

export function ResultTile({ heading, hero, hint }: ResultTileProps) {
  return (
    /* `sticky top-0` et non `fixed` : la tuile reste dans le flux, donc elle
       garde la largeur de la colonne et ne recouvre rien à l'arrivée en bas de
       page. `-mx-*` puis `px-*` lui rendent le bord perdu qu'elle perdrait à
       rester dans la colonne : collée, elle doit masquer ce qui passe dessous
       sur toute la largeur, sinon le tracé réapparaît dans ses marges. */
    <div className="sticky top-0 z-10 -mx-4 bg-bg px-4 pt-1 pb-2 md:-mx-6 md:px-6">
      <Tile className="gap-1">
        <Eyebrow>{heading}</Eyebrow>
        {/* `t-hero-fit` plutôt que `t-hero` : « ≈ 148 k€ – 224 k€ » déborde
            d'une colonne de téléphone à la taille pleine. */}
        <p className="t-hero-fit tnum">{hero}</p>
        {hint !== null && <p className="t-label">{hint}</p>}
      </Tile>
    </div>
  )
}
