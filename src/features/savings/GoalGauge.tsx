/* ============================================================================
 * L'avancement d'un objectif, en segments.
 *
 * **Segmentée et non continue**, et c'est la raison pour laquelle elle existe
 * plutôt qu'une simple barre : le DS §2.3 interdit de faire porter une
 * information à la seule couleur, et une barre pleine ne se distingue d'une
 * barre vide que par sa teinte. Sept cases pleines sur dix se comptent, y
 * compris en niveaux de gris et y compris de très loin — c'est une **forme**,
 * qui double le mot du verdict posé à côté.
 *
 * Sept segments : assez pour que la différence entre 60 % et 75 % se voie,
 * assez peu pour tenir dans la colonne de droite d'une rangée à 320px sans que
 * chaque case tombe sous le pixel.
 *
 * `aria-hidden` : la rangée écrit déjà l'avancement en toutes lettres juste
 * dessous — « 28 400 € sur 42 000 € » —, et l'annoncer deux fois ne
 * l'apprendrait pas mieux.
 */

import { cn } from '@/lib/cn'

const SEGMENTS = 7

export function GoalGauge({
  progress,
  tone,
}: {
  /** De 0 à 1, déjà borné par le domaine. */
  progress: number
  tone: 'ok' | 'attention' | 'neutral'
}) {
  /* Arrondi **au plus bas** : une case pleine promet une case pleine, et
     arrondir au plus près ferait afficher sept segments sur sept à 93 %,
     c'est-à-dire « atteint » sur un objectif qui ne l'est pas. La première se
     remplit quand même dès qu'il y a quelque chose : zéro segment sur un
     objectif commencé se lit comme un objectif qui n'a rien reçu. */
  const filled =
    progress <= 0 ? 0 : Math.max(1, Math.min(SEGMENTS, Math.floor(progress * SEGMENTS)))

  return (
    <span aria-hidden="true" className="flex items-center gap-0.5">
      {Array.from({ length: SEGMENTS }, (_, index) => (
        /* `cn` et non un gabarit : `bg-text-muted` n'a jamais eu de règle — la
           classe qui pose `background-color: var(--text-muted)` s'appelle
           `bg-muted` —, si bien que les cases **pleines** d'un objectif en
           retard ne recevaient aucun fond quand les vides gardaient le leur.
           La jauge se lisait donc à l'envers, exactement sur les objectifs
           qu'elle doit signaler. `classes:check` ne l'a pas vu parce qu'il
           relève les classes littérales et non celles nées d'un gabarit : les
           composer avec `cn`, comme partout ailleurs, les lui rend visibles. */
        <span
          key={index}
          className={cn(
            'h-2 w-2 rounded-[2px]',
            index < filled ? (tone === 'attention' ? 'bg-muted' : 'bg-accent') : 'bg-surface-2',
          )}
        />
      ))}
    </span>
  )
}
