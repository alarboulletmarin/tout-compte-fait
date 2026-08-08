import { type FocusEvent, type KeyboardEvent, type PointerEvent, useId, useRef } from 'react'
import { t } from '@/i18n/strings'

/** Où va le curseur, par touche. Il ne boucle pas : une année a un début. */
const MOVE: Record<string, (index: number, count: number) => number> = {
  ArrowLeft: (index) => index - 1,
  ArrowRight: (index) => index + 1,
  Home: () => 0,
  End: (_index, count) => count - 1,
}

export type ChartCursorProps = {
  /** Un nom accessible par période, dans l'ordre du graphique. */
  labels: readonly string[]
  /** La période lue — celle qui porte le focus et l'arrêt de tabulation. */
  shown: number
  onShow: (index: number) => void
  /** Le nom du curseur. Pas celui du graphique : l'image porte déjà le sien. */
  label: string
}

/** L'index porté par la cible d'un événement, ou `null` hors des périodes. */
function indexOf(target: EventTarget): number | null {
  if (!(target instanceof Element)) return null
  const raw = target.closest('[data-index]')?.getAttribute('data-index')
  return raw === null || raw === undefined ? null : Number(raw)
}

/**
 * Le curseur de lecture d'un graphique : une période focusable par mois, qui
 * sert la souris et le clavier.
 *
 * **En HTML au-dessus du SVG, et non en `tabindex` sur un `<g>`.** Les deux
 * graphiques sont en `preserveAspectRatio="none"` : leur échelle n'est pas
 * uniforme, et un anneau de focus tracé dans cet espace serait étiré en largeur
 * — il n'existe pas d'équivalent de `vector-effect` pour un contour. S'ajoute
 * que le `<svg>` porte `role="img"`, ce qui retire son contenu de l'arbre
 * d'accessibilité : un `<g>` focusable posé dedans ne serait pas annoncé. C'est
 * la même raison qui fait déjà vivre la bande des mois en HTML sous le SVG.
 *
 * **Un seul arrêt de tabulation, pas douze.** `tabindex` roulant : la période
 * lue porte `0`, les autres `-1`, et les flèches déplacent le focus. Douze
 * périodes sur deux graphiques feraient vingt-quatre arrêts sur le seul écran
 * de l'historique, entre une recherche et deux sélecteurs — pour une lecture,
 * pas pour douze gestes. Rien ici n'est actionnable séparément, ce qui est le
 * seul cas où douze arrêts se justifieraient.
 *
 * **Le survol change la lecture, jamais le focus.** Une souris qui promènerait
 * l'anneau de focus à travers la page en déplacerait le clavier sans le dire.
 * Et la lecture reste où on l'a laissée quand le pointeur ressort : un
 * graphique qui se vide dès qu'on le quitte oblige à viser pour relire.
 *
 * **Cible tactile.** Une période fait toute la hauteur du tracé mais ne peut
 * pas faire 44px de large : douze sur les ~190px d'un téléphone de 320 en
 * donnent seize. L'écart est mesuré et inscrit à l'architecture ; il est tenu
 * par ailleurs — la lecture existe aussi au clavier et dans la lecture
 * accessible du graphique.
 */
export function ChartCursor({ labels, shown, onShow, label }: ChartCursorProps) {
  const hintId = useId()
  const options = useRef<(HTMLDivElement | null)[]>([])

  const read = (target: EventTarget): void => {
    const index = indexOf(target)
    if (index !== null && index !== shown) onShow(index)
  }

  return (
    <>
      <div
        role="listbox"
        aria-label={label}
        aria-describedby={hintId}
        aria-orientation="horizontal"
        /* `touch-pan-y` : un glissement vertical parti du graphique fait défiler
           la page. C'est l'arbitrage que le DS §6 pose déjà pour la rangée de
           filtres et pour la navigation du mois. */
        className="absolute inset-0 flex touch-pan-y"
        /* Un seul écouteur pour douze périodes. `pointerover` remonte, à la
           différence de `pointerenter` : douze fermetures par rendu ne
           diraient rien de plus. */
        onPointerOver={(event: PointerEvent<HTMLDivElement>) => {
          read(event.target)
        }}
        onFocus={(event: FocusEvent<HTMLDivElement>) => {
          read(event.target)
        }}
        onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
          const move = MOVE[event.key]
          if (move === undefined || labels.length === 0) return
          const next = Math.min(Math.max(move(shown, labels.length), 0), labels.length - 1)
          /* `preventDefault` pour que la page ne défile pas sous les flèches,
             et parce que `useHotkeys` s'efface sur une frappe déjà consommée :
             sans lui, une flèche lirait un mois du graphique *et* changerait le
             mois de l'app, à un écran de distance. */
          event.preventDefault()
          onShow(next)
          options.current[next]?.focus()
        }}
      >
        {labels.map((text, index) => (
          <div
            key={text}
            ref={(element) => {
              options.current[index] = element
            }}
            role="option"
            aria-selected={index === shown}
            aria-label={text}
            data-index={index}
            tabIndex={index === shown ? 0 : -1}
            className="min-w-0 flex-1"
          />
        ))}
      </div>
      {/* Un raccourci que personne ne découvre ne sert personne. Il n'y a ici
          aucun bouton à survoler pour le dire en infobulle : il se dit donc au
          lecteur d'écran, sur le curseur lui-même. */}
      <p id={hintId} className="sr-only-text">
        {t.a11y.chartCursorHint}
      </p>
    </>
  )
}
