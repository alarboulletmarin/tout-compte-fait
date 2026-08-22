import { Warning } from './Icons'

/**
 * Le refus d'un écran, dit au-dessus de son bouton — jamais à sa place.
 *
 * **Trois écrans l'écrivaient à l'identique**, à la balise près : la saisie
 * rapide, l'écriture d'une règle, et la liste répétable de l'onboarding, qui ne
 * l'écrivait pas du tout et se contentait de griser « Ajouter ». C'est le motif
 * que l'étape 6 a déjà appliqué à `StepBar` et à la cascade — deux occurrences
 * se tolèrent, trois demandent un fichier.
 *
 * **Il n'est pas rattaché à un champ, et c'est ce qui le distingue de
 * `Field`.** Un `Field` porte son erreur sous son contrôle, dans son
 * `aria-describedby` : c'est la bonne place quand la cause tient dans une case.
 * Ici la cause est l'écran entier — un pavé numérique à zéro, une puce non
 * choisie, deux champs dont l'un manque —, et l'accrocher à l'un des deux
 * désignerait le mauvais.
 *
 * **Au-dessus du bouton primaire, jamais en remplacement.** Le geste refusé se
 * relit en allant appuyer une seconde fois : le message est sur le chemin du
 * doigt. Et le bouton reste actif — un bouton grisé sans phrase est un refus
 * sans cause, ce que le DS §6 range avec les contrôles qui ne tiennent pas leur
 * promesse.
 *
 * `role="alert"` parce que la phrase **arrive** après coup, en réponse à un
 * geste : c'est exactement le cas d'une région live, et l'inverse d'un état
 * vide, qui est déjà là quand l'écran s'annonce.
 */
export function InlineError({ message }: { message: string | null }) {
  /* Le `null` est porté ici plutôt que chez chaque appelant : les trois
     écrivaient la même garde autour du même bloc, et une garde recopiée est
     une occasion de plus d'oublier le `role`. */
  if (message === null) return null

  return (
    <p className="t-label flex items-center gap-2 text-danger-text" role="alert">
      {/* Un repère, pas un ornement (DS §9.1) : l'encre de danger ne doit pas
          porter seule ce qu'elle dit (DS §8). Le texte à côté porte le sens, et
          l'adaptateur d'`Icons` pose déjà `aria-hidden` sur tout glyphe. */}
      <Warning size={16} className="shrink-0" />
      {message}
    </p>
  )
}
