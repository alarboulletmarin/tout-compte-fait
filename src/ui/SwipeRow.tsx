import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useRef,
  useState,
} from 'react'
import { cn } from '@/lib/cn'

/**
 * Ce qu'un côté du glissé déclenche.
 *
 * Le libellé n'est pas décoratif : il s'affiche dans le fond révélé, et c'est
 * lui qui dit ce que le doigt est en train de promettre. Le geste étant
 * inannonçable, il porte aussi le nom accessible du bouton équivalent, que
 * l'appelant doit poser sur la rangée — DS §8 : chaque geste est doublé d'un
 * bouton.
 */
export type SwipeRowAction = {
  label: string
  onAction: () => void
}

/* Les bornes du déplacement. Au-delà, la rangée ne suit plus le doigt : elle a
   déjà dit tout ce qu'elle avait à dire, et continuer découvrirait du vide
   derrière elle. Asymétriques parce que les deux côtés ne demandent pas le même
   engagement — l'action positive va plus loin, la secondaire s'arrête plus tôt. */
const CLAMP_RIGHT = 148
const CLAMP_LEFT = -132

/* Les seuils de déclenchement, mesurés depuis le point de départ du doigt.
   L'action positive en demande plus que la secondaire : c'est celle qui écrit
   dans le document, et un frôlement ne doit pas confirmer une échéance. */
const TRIGGER_RIGHT = 92
const TRIGGER_LEFT = -70
/* Une suppression en demande encore quatorze de plus. Elle est la seule des
   trois qu'on ne défait pas d'un second glissé — seul un toast la rattrape. */
const TRIGGER_LEFT_DESTRUCTIVE = -84

/**
 * Une rangée qu'on glisse : à droite l'action positive, à gauche la secondaire.
 *
 * **Ce n'est pas `SwipeAway`**, et les deux ne se remplacent pas. Celui-là
 * écarte un bandeau vers le haut et le fait disparaître ; celui-ci déplace une
 * rangée à l'horizontale au-dessus d'un fond qu'il découvre, et la remet en
 * place. Un seul composant pour les deux aurait porté deux axes, deux jeux de
 * seuils et deux issues.
 *
 * **Le fond révélé est borné à la rangée, jamais en `inset: 0`.** C'est le piège
 * relevé sur le prototype : une liste dont une rangée déplie un panneau sous
 * elle verrait le fond du glissé recouvrir le panneau. D'où la règle
 * d'assemblage — ce composant n'enveloppe que la **rangée**, et ce qui se
 * déplie sous elle reste dehors, dans le même élément de liste.
 *
 * **La manipulation n'est pas de l'animation** (DS §4) : pendant le geste, la
 * rangée suit le doigt sans transition, y compris sous
 * `prefers-reduced-motion`. Seul le retour à sa place en est, et il se
 * neutralise avec le reste — `--dur` vaut 0 sous cette préférence.
 *
 * **Le clavier et les lecteurs d'écran ne passent pas par ici.** Un glissé ne
 * s'annonce pas, et ce composant n'invente aucun rôle pour faire croire le
 * contraire : c'est à la rangée de porter les boutons qui font la même chose,
 * et ce composant n'est qu'un accélérateur au pouce.
 */
export function SwipeRow({
  right,
  left,
  destructive = false,
  disabled = false,
  children,
  className,
}: {
  /** Vers la droite : confirmer, valider — ce qui fait avancer la ligne. */
  right?: SwipeRowAction
  /** Vers la gauche : ajuster, supprimer. */
  left?: SwipeRowAction
  /**
   * L'action de gauche efface quelque chose.
   *
   * Elle passe alors en `--danger-fill` et son seuil s'éloigne de quatorze
   * pixels : c'est le seul des trois gestes qu'un second glissé ne défait pas.
   */
  destructive?: boolean
  /**
   * La rangée ne se glisse plus.
   *
   * Une échéance déjà confirmée est dans ce cas : il n'y a plus rien à
   * confirmer, et le geste inverse — la remettre en prévu — est un bouton sur
   * la rangée, pas un glissé de plus. Un geste qui ne ferait rien vaut moins
   * que son absence (DS §6).
   */
  disabled?: boolean
  children: ReactNode
  className?: string
}) {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ x: number; y: number } | null>(null)

  const canRight = right !== undefined
  const canLeft = left !== undefined
  const triggerLeft = destructive ? TRIGGER_LEFT_DESTRUCTIVE : TRIGGER_LEFT

  const reset = (): void => {
    start.current = null
    setDragging(false)
    setOffset(0)
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (disabled) return
    /* Le geste ne part jamais d'un contrôle : viser la corbeille d'une rangée
       produirait un micro-glissement au lieu d'un clic. C'est la garde de
       `SwipeAway` et de `MonthNav`, pour la même raison. */
    if ((event.target as HTMLElement).closest('button, a, input, select, label')) return
    start.current = { x: event.clientX, y: event.clientY }
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const from = start.current
    if (from === null) return
    const dx = event.clientX - from.x
    /* Plus horizontal que vertical, sinon un défilement de page qui dérive
       emporterait la rangée avec lui. Une fois le geste engagé, on ne repose
       plus la question : `touch-action: pan-y` a déjà donné la verticale au
       navigateur, qui ne nous enverrait plus rien. */
    if (offset === 0 && Math.abs(dx) < Math.abs(event.clientY - from.y)) return
    setOffset(Math.max(CLAMP_LEFT, Math.min(CLAMP_RIGHT, canRight ? dx : Math.min(0, dx))))
  }

  const end = (): void => {
    const moved = offset
    reset()
    if (canRight && moved > TRIGGER_RIGHT) right.onAction()
    else if (canLeft && moved < triggerLeft) left.onAction()
  }

  const style: CSSProperties = {
    transform: offset === 0 ? undefined : `translateX(${String(offset)}px)`,
    /* Zéro pendant le geste, la durée du système au relâchement. Écrit ici et
       non en classe : le passage de l'un à l'autre doit avoir lieu dans le même
       rendu que le retour à zéro, sinon la rangée saute. */
    transitionDuration: dragging ? '0ms' : undefined,
  }

  return (
    <div
      className={cn('relative', className)}
      /* La verticale reste au navigateur — sans quoi la page ne défilerait plus
         en partant d'une rangée, ce qui est le geste le plus fréquent d'une
         liste. L'horizontale nous revient. */
      style={{ touchAction: 'pan-y' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={reset}
    >
      {/* Les deux fonds, `inset-y-0` et non `inset-0` : ils ne couvrent que la
          hauteur de la rangée, quelle qu'elle soit. Chacun n'est monté que
          lorsque le doigt part de son côté — deux fonds superposés en
          permanence donneraient la couleur du dernier écrit. */}
      {offset > 0 && canRight && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 flex items-center rounded-inner bg-accent px-4 t-label text-accent-fg"
          style={{ width: offset }}
        >
          {right.label}
        </span>
      )}
      {offset < 0 && canLeft && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute inset-y-0 right-0 flex items-center justify-end rounded-inner px-4 t-label',
            /* `--danger-fill` déclare son encre, et c'est `--danger-fg` (DS §2.3).
               `--danger-text` est l'encre d'une *surface* : en thème clair elle
               vaut #b73a3e, c'est-à-dire exactement le remplissage — le libellé
               y aurait disparu dans son propre fond. */
            destructive ? 'bg-danger-fill text-danger-fg' : 'bg-surface-2 text-text',
          )}
          style={{ width: -offset }}
        >
          {left.label}
        </span>
      )}

      <div
        className={cn(
          'relative select-none',
          !dragging && 'transition-transform duration-[var(--dur)] ease-ds',
        )}
        style={style}
      >
        {children}
      </div>
    </div>
  )
}
