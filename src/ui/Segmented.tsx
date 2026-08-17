import { type KeyboardEvent, type ReactNode, useRef } from 'react'
import { cn } from '@/lib/cn'

export type SegmentedOption<T extends string> = {
  value: T
  label: string
  /**
   * Ce qu'on voit, quand ce n'est pas ce qui se dit — « FR » pour
   * « Français », un soleil pour « Clair ». Le libellé reste le **nom
   * accessible** du bouton : ce qui rétrécit est la boîte, pas le sens.
   *
   * Un groupe l'emploie pour toutes ses positions ou pour aucune. Trois
   * pilules dont une seule serait un carré ne se liraient plus comme un même
   * choix, et les cibles cesseraient d'avoir la même valeur.
   */
  short?: ReactNode
}

export type SegmentedProps<T extends string> = {
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (next: T) => void
  label: string
  className?: string
}

/**
 * Bascule à quelques positions — sens d'un flux, choix de thème, axe de
 * regroupement.
 *
 * Elle passe à la ligne plutôt que de déborder : trois positions aux libellés
 * un peu longs frôlent déjà la largeur d'une tuile sur un écran de 320px, et la
 * dernière sortait du cadre. Un débordement horizontal aurait rogné le focus
 * clavier, dont l'`outline-offset` mord de deux pixels hors du bouton.
 *
 * La rangée de filtres du mois, elle, défile (`.filter-scroller`) — ce n'est pas
 * une contradiction. Elle vit à bord perdu dans un bandeau, où une piste peut se
 * donner les quatre pixels de cadre qui logent l'anneau ; une bascule vit dans
 * une tuile, dont la largeur est le cadre lui-même. Et son nombre de positions
 * est connu d'avance, quand la rangée de filtres compte autant de pilules qu'il
 * y a de personnes.
 *
 * **Elle annonce un groupe de boutons radio, et se comporte comme tel.** Elle
 * n'en portait que les rôles : chaque position était un arrêt de tabulation, et
 * les flèches ne faisaient rien — l'écran de saisie en aligne trois, soit neuf
 * arrêts pour trois choix. Un lecteur d'écran promettait pourtant « 2 sur 3 »
 * et le geste qui va avec.
 *
 * La règle des radios (APG) : une seule tabulation pour tout le groupe, sur la
 * position cochée ; les flèches déplacent le choix et le focus ensemble, en
 * boucle ; Origine et Fin vont aux extrémités. Le choix suit le focus, comme
 * sur des radios natifs — une bascule change une lecture, jamais un fait.
 *
 * `preventDefault` sur les touches prises : c'est ce qui empêche les flèches de
 * changer aussi de mois (voir `useHotkeys`), et le motif que suit déjà le
 * curseur des graphiques.
 *
 * **Une position peut se dire court** (`short`) : un carré de 44px où tient un
 * code de langue ou un glyphe, le libellé complet passant en nom accessible.
 * C'est la même bascule et non une seconde — la forme, le vert de la position
 * active, le clavier et le repli sont ceux d'au-dessus. Elle sert là où le
 * réglage n'est pas le sujet de l'écran : voir `app/PublicPreferences.tsx`, qui
 * dit à quelle condition on a le droit de raccourcir.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: SegmentedProps<T>) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const checked = options.findIndex((option) => option.value === value)
  /* Aucune position cochée — une valeur qui n'est plus dans la liste : c'est la
     première qui prend la tabulation. Sans elle, `tabIndex` vaudrait -1 partout
     et le groupe entier sortirait du parcours clavier. */
  const stop = checked === -1 ? 0 : checked

  const move = (next: number): void => {
    const option = options[next]
    if (option === undefined) return
    onChange(option.value)
    buttons.current[next]?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const count = options.length
    if (count === 0) return

    switch (event.key) {
      /* Les deux axes, sur une bascule qui passe à la ligne : elle est une
         rangée jusqu'à ce que la largeur en fasse deux, et la flèche du bas
         doit alors continuer de mener à la position suivante. */
      case 'ArrowRight':
      case 'ArrowDown':
        move((stop + 1) % count)
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        move((stop - 1 + count) % count)
        break
      case 'Home':
        move(0)
        break
      case 'End':
        move(count - 1)
        break
      default:
        return
    }

    event.preventDefault()
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn('inline-flex max-w-full flex-wrap gap-1 rounded-chip bg-surface-2 p-1', className)}
    >
      {options.map((option, index) => {
        const active = option.value === value
        const short = option.short !== undefined
        return (
          <button
            key={option.value}
            ref={(node) => {
              buttons.current[index] = node
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={index === stop ? 0 : -1}
            /* Le libellé complet reste le nom accessible d'une position
               raccourcie : la boîte rétrécit, ce qu'un lecteur d'écran annonce
               ne bouge pas. Rien quand le bouton porte déjà son libellé — un
               `aria-label` qui répète le texte visible n'ajoute que le risque
               qu'ils divergent un jour. */
            aria-label={short ? option.label : undefined}
            onClick={() => {
              onChange(option.value)
            }}
            className={cn(
              'min-h-11 rounded-chip text-[13px] font-medium',
              'transition-colors duration-[var(--dur)] ease-ds',
              /* Le carré exact du §8 plutôt qu'une pilule de deux lettres :
                 « FR » et « EN » n'ont pas la même largeur de rendu, et deux
                 cibles inégales pour deux choix de même poids se lisent comme
                 une hiérarchie qui n'existe pas. */
              short ? 'inline-flex w-11 items-center justify-center' : 'px-3.5',
              active ? 'bg-accent text-accent-fg' : 'text-muted hover:text-text',
            )}
          >
            {option.short ?? option.label}
          </button>
        )
      })}
    </div>
  )
}
