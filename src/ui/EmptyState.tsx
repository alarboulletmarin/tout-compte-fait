import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Button } from './Button'
import { Tile } from './Tile'

export type EmptyStateProps = {
  /** Une invitation, pas un constat (DS §7). */
  message: string
  actionLabel?: string
  onAction?: () => void
  children?: ReactNode
  className?: string
}

/**
 * Une tuile, une phrase qui dit quoi faire, le geste qui la suit.
 *
 * **C'est la grammaire du handoff, et elle est la même sur les huit écrans qu'il
 * dessine** : une tuile alignée à gauche, une phrase bornée à 44 caractères, un
 * geste primaire au plus. Ce composant en avait pris une autre — un anneau vide
 * de 96px, un bloc centré, du texte gris sans cadre — et cette autre-là ne se
 * termine nulle part : un anneau à zéro ressemble à un chargement qui n'aboutit
 * pas, et un bloc centré sans boîte flotte au milieu du vide qu'il est censé
 * remplir. Mesuré sur un document neuf, l'écran du mois laissait 427px de vide
 * sous lui au téléphone et 549 au bureau, où la phrase s'étalait en plus sur
 * 990px de tuile.
 *
 * La borne à 44 caractères est ce qui règle le bureau : une ligne de texte se
 * lit mal au-delà, et c'est la mesure que le handoff pose sur chacune de ses
 * huit phrases. La tuile, elle, garde sa largeur — c'est une tuile comme les
 * autres, et l'écran ne change pas de rythme parce qu'il est vide.
 *
 * **Aligné à gauche**, comme tout le reste de l'app. Le centrage était le seul
 * endroit où un contenu ne commençait pas sur la même verticale que ses
 * voisins, et il se voyait surtout quand l'état vide partageait l'écran avec
 * autre chose — le calendrier, par exemple, où la grille est à gauche et
 * l'invitation était au milieu.
 */
export function EmptyState({
  message,
  actionLabel,
  onAction,
  children,
  className,
}: EmptyStateProps) {
  const action = actionLabel !== undefined && onAction !== undefined

  return (
    /* Sans `role="status"` : c'était une région live posée en permanence sur un
       texte qui ne change jamais. Une région live sert à annoncer ce qui arrive
       après coup — un état vide, lui, est déjà là quand l'écran s'annonce, et
       il se lit dans le flux comme le reste. */
    <Tile className={cn('gap-4', className)}>
      <p className="t-body max-w-[44ch] text-muted">{message}</p>
      {(action || children !== undefined) && (
        /* `data-empty` marque la rangée des gestes qu'un écran vide propose, et
           ce n'est pas une prise de test : c'est le nom de la promesse qu'on lui
           attache — une invitation qu'il faut aller chercher en défilant n'en
           est pas une (cahier §4.6). `mise-en-page.spec.ts` la vérifie aux
           quatre largeurs, sur un document neuf. */
        <div data-empty className="flex flex-wrap items-center gap-2">
          {action && <Button onClick={onAction}>{actionLabel}</Button>}
          {children}
        </div>
      )}
    </Tile>
  )
}
