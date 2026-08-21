import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { IconComponent } from './Icons'

export type BannerTone = 'default' | 'danger'

export type BannerProps = {
  /** La phrase qui dit ce qui se passe. Une ligne, en encre pleine. */
  title: ReactNode
  /** Ce qu'on peut y faire, ou pourquoi ça arrive. Facultatif. */
  body?: ReactNode
  /** Les gestes, à droite sur une ligne, sous le texte quand la place manque. */
  children?: ReactNode
  /** `danger` teinte la bordure. Le DS §2.3 la réserve à ce qui a échoué. */
  tone?: BannerTone
  /**
   * Le glyphe posé devant le titre.
   *
   * Un repère, pas un ornement (DS §9.1) : il permet de reconnaître la nature
   * du message avant de l'avoir lu, ce qui est tout ce qu'on demande à un
   * bandeau qui s'intercale au-dessus d'un écran. Le titre porte déjà le sens,
   * il est donc `aria-hidden` comme partout ailleurs.
   */
  icon?: IconComponent
  /** Renseigné, le bandeau devient une région annoncée — un échec, pas un avis. */
  role?: 'alert'
  label?: string
  className?: string
}

/**
 * Le bandeau de la coquille — un message, une raison, un ou deux gestes.
 *
 * **Quatre endroits l'écrivaient, dont un qui recopiait la définition de
 * `.tile`.** L'avis de conservation, le rappel d'export et l'échec d'écriture
 * posaient les mêmes onze classes à la main ; le bandeau de mise à jour, lui,
 * réécrivait `rounded-tile border border-border bg-surface shadow-tile` — donc
 * une surface qui ne suivrait pas `components.css` le jour où il change. Quatre
 * messages du même genre, dessinés de quatre façons dont une divergente : c'est
 * exactement le doublon que l'audit relève.
 *
 * Ils ne s'affichent jamais ensemble — `dataNoticeLevel` en choisit un —, et
 * c'est ce qui rend le gabarit commun évident : ce qu'on voit à cet endroit de
 * l'écran doit être le même objet, quelle que soit la nouvelle qu'il apporte.
 *
 * La rangée passe en colonne sous 640px : deux boutons `shrink-0` sur une seule
 * ligne ne laissent pas de quoi lire le message sur un téléphone.
 */
export function Banner({
  title,
  body,
  children,
  tone = 'default',
  icon: Icon,
  role,
  label,
  className,
}: BannerProps) {
  return (
    <div
      {...(role === undefined ? {} : { role })}
      {...(label === undefined ? {} : { 'aria-label': label })}
      className={cn(
        'tile flex flex-col gap-3 p-4 sm:flex-row sm:items-center',
        tone === 'danger' && 'border-danger',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Le titre porte l'encre de danger, pas la bordure seule : une bordure
            rouge est une information portée par la couleur, et le DS §8 demande
            qu'elle soit doublée. Ici c'est le texte qui la double. */}
        <p
          className={cn(
            'flex items-center gap-2 t-body',
            tone === 'danger' && 'font-semibold text-danger-text',
          )}
        >
          {Icon !== undefined && <Icon size={16} className="shrink-0" aria-hidden="true" />}
          {title}
        </p>
        {body !== undefined && <p className="t-label">{body}</p>}
      </div>
      {children !== undefined && (
        <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">{children}</div>
      )}
    </div>
  )
}
