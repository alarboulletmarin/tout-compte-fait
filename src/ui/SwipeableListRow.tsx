import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { IconButton } from './Button'
import type { IconComponent } from './Icons'
import { SwipeRow } from './SwipeRow'

/**
 * Un côté du glissé, et le bouton qui fait exactement la même chose.
 *
 * Les deux libellés diffèrent parce qu'ils ne s'adressent pas au même sens.
 * `label` s'affiche dans le fond révélé sous le doigt, où la ligne visée est
 * sous les yeux : « Confirmer » suffit. `buttonLabel` est le nom accessible du
 * bouton, et il **nomme la ligne** — douze boutons « Confirmer » se listent
 * douze fois à l'identique dans les contrôles d'un lecteur d'écran, et rien n'y
 * dirait lequel on vise. C'est déjà la règle des coches du mois.
 */
/** La largeur d'une et de deux places d'action, gouttière comprise. */
const RESERVE: Record<1 | 2, string> = { 1: 'min-w-11', 2: 'min-w-23' }

export type SwipeSide = {
  label: string
  buttonLabel: string
  icon: IconComponent
  onAction: () => void
  /** Le bouton déplie un panneau : il porte alors l'état de ce panneau. */
  expanded?: boolean
}

/**
 * Une rangée de liste qu'on glisse — **et les boutons qui la doublent**.
 *
 * `SwipeRow` déplace la rangée et découvre le fond ; il ne prétend pas être
 * accessible, et son en-tête le dit : un glissé ne s'annonce pas. Ce composant
 * est la moitié manquante. Il pose, sur la rangée elle-même, un bouton par
 * côté offert, qui appelle **la même fonction** que le geste — DS §8, « chaque
 * geste est doublé d'un bouton ». Deux chemins, une seule écriture : c'est ce
 * qui interdit qu'un jour l'un des deux confirme et l'autre ouvre une feuille.
 *
 * **L'assemblage vient de l'en-tête de `SwipeRow`, et il n'est pas libre.** Le
 * panneau qui se déplie sous la rangée reste **dehors** : un fond de glissé
 * borné à la rangée le laisse tranquille, un fond en `inset: 0` le recouvrirait
 * — c'est le piège relevé sur le prototype. Le débordement est coupé ici et non
 * plus haut : une rangée qui part de 148px vers la droite sortirait de la tuile
 * qui la contient, et le rayon de la tuile ne la rattraperait pas.
 *
 * **Écrit une fois, pour deux écrans.** Le mois s'en sert pour confirmer et
 * ajuster une échéance ; les récurrences s'en serviront pour changer un montant
 * et supprimer une règle, avec le même seuil, la même durée et le même doublage
 * clavier. Les libellés changent, la grammaire non : c'est ce qui fait qu'un
 * geste appris sur un écran vaut sur l'autre.
 */
export function SwipeableListRow({
  right,
  left,
  destructive = false,
  disabled = false,
  children,
  trailing,
  reserve,
  panel,
  className,
}: {
  /** Vers la droite : ce qui fait avancer la ligne. */
  right?: SwipeSide
  /** Vers la gauche : ajuster, supprimer. */
  left?: SwipeSide
  /** L'action de gauche efface : fond de danger, seuil plus loin. */
  destructive?: boolean
  /**
   * Ni glissé, ni boutons.
   *
   * Une échéance déjà confirmée est dans ce cas, et un mois qu'on relit
   * seulement l'est en entier : un geste qui ne ferait rien vaut moins que son
   * absence (DS §6).
   */
  disabled?: boolean
  children: ReactNode
  /**
   * Un bouton de plus au bout de la rangée, qui ne double aucun glissé.
   *
   * C'est la place du geste inverse : une ligne confirmée n'a plus rien à
   * glisser — donc rien à doubler —, mais elle doit pouvoir revenir en arrière,
   * et l'endroit où l'on cherche ce retour est la ligne où l'on vient d'agir.
   */
  trailing?: ReactNode
  /**
   * Le nombre de places d'action que **la liste** réserve sur chaque rangée.
   *
   * Une rangée ne sait pas combien de boutons portent ses voisines, et sans
   * cette réserve la colonne d'action fait la largeur de ce que la rangée
   * porte, elle : 92px à deux boutons, 44 à un, zéro à aucun. Or c'est cette
   * largeur qui borne la boîte du contenu, donc l'abscisse où tombe le montant.
   * Mesuré sur l'écran du mois, jeu d'exemple, 390px : 38 rangées d'une même
   * liste, trois largeurs de colonne, et donc **trois colonnes de montants** à
   * 237, 285 et 329 — 92px d'écart entre deux lignes qui se suivent.
   *
   * Une colonne de montants qui ne tombe pas d'aplomb est le défaut le plus
   * visible d'une app de finances (DS §3, qui l'écrit pour les chiffres
   * tabulaires et vaut a fortiori pour la colonne elle-même). La liste déclare
   * donc sa réserve, une fois, et toutes ses rangées la portent — y compris
   * celles qui n'ont rien à y mettre.
   *
   * Les boutons se rangent à droite de cette réserve : le dernier tombe
   * toujours dans la même colonne, qu'il y en ait un ou deux.
   */
  reserve?: 1 | 2
  /** Ce qui se déplie sous la rangée. Hors du glissé, toujours. */
  panel?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('overflow-hidden', className)}>
      <SwipeRow
        {...(right === undefined ? {} : { right: { label: right.label, onAction: right.onAction } })}
        {...(left === undefined ? {} : { left: { label: left.label, onAction: left.onAction } })}
        destructive={destructive}
        disabled={disabled}
      >
        {/* Un fond opaque, et c'est ce qui rend le glissé lisible : sans lui, le
            fond révélé se verrait par transparence sous la rangée déplacée, et
            les deux libellés se superposeraient. C'est la surface de la tuile
            qui l'accueille, pas une surface de plus. */}
        <div className="flex items-center gap-1 bg-surface pr-2">
          <div className="min-w-0 flex-1">{children}</div>
          {/* Ce qui n'est pas une poignée, et le dit à `SwipeRow` : ces
              boutons-là font 44px, et un doigt qui les vise veut cliquer, pas
              glisser. La rangée, elle, garde le geste — même quand elle est un
              bouton qui ouvre la fiche de la ligne. */}
          <span
            data-no-swipe
            className={cn(
              'flex items-center justify-end gap-1',
              reserve !== undefined && RESERVE[reserve],
            )}
          >
            {!disabled &&
              [right, left].map(
                (side) =>
                  side !== undefined && (
                    <IconButton
                      key={side.buttonLabel}
                      label={side.buttonLabel}
                      onClick={side.onAction}
                      {...(side.expanded === undefined ? {} : { 'aria-expanded': side.expanded })}
                      className="shrink-0"
                    >
                      <side.icon size={18} />
                    </IconButton>
                  ),
              )}
            {trailing}
          </span>
        </div>
      </SwipeRow>
      {panel}
    </div>
  )
}
