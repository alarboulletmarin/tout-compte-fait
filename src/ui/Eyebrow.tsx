import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { IconComponent } from './Icons'

/**
 * L'étiquette d'une tuile — mono 11px majuscules. Une tuile n'a pas de titre,
 * elle a un eyebrow (DS §6). C'est lui qui donne le rythme.
 *
 * L'icône est un repère, pas un ornement : à onze pixels et en majuscules, un
 * libellé se relit plus qu'il ne se reconnaît, et c'est le glyphe qui permet
 * de retrouver la bonne tuile d'un coup d'œil dans la grille.
 *
 * **Le rembourrage horizontal n'est plus posé ici**, et c'est ce qui permet à
 * la pilule de fond de se réserver aux tuiles accentuées : un utilitaire
 * l'emporte sur une règle de composant, `px-2` écrit ici aurait donc décalé
 * toutes les étiquettes sans fond. Il vit désormais avec le fond qu'il borde,
 * dans `components.css`.
 */
export function Eyebrow({
  children,
  icon: Icon,
  className,
}: {
  children: ReactNode
  icon?: IconComponent
  className?: string
}) {
  return (
    <span
      className={cn(
        'eyebrow-pill t-eyebrow inline-flex w-fit items-center gap-1.5 rounded-chip py-1.5',
        className,
      )}
    >
      {Icon !== undefined && <Icon size={13} className="shrink-0" />}
      {children}
    </span>
  )
}
