import type { ReactNode } from 'react'
import { t } from '@/i18n/strings'
import { IconButton } from './Button'
import { ChevronLeft } from './Icons'
import { useAnnounceScreen } from './screenTitle'

export type PageTitleProps = {
  title: string
  /**
   * Le titre ne s'affiche pas — mais il existe.
   *
   * Le mois et le calendrier portent leur nom autrement : leur bandeau dit quel
   * mois on lit, et un titre par-dessus l'aurait dit deux fois. Ce n'est pas
   * une raison pour n'en avoir aucun — un écran sans `<h1>` ne se repère pas au
   * lecteur d'écran, et ne s'annonce pas en changeant.
   */
  hidden?: boolean
  /**
   * Le retour, à gauche du titre. Les fiches et les écrans de saisie s'ouvrent
   * par-dessus un écran auquel il faut revenir ; les autres vivent dans la
   * navigation, qui les tient déjà — sauf ceux qu'une tuile du mois ouvre
   * (Épargne, Répartition, Crédits, Flux) : sur téléphone la barre y allume
   * « Plus », et sans retour l'écran était un cul-de-sac. `useBackTo` donne le
   * geste : l'écran précédent quand il existe, un repli sinon.
   */
  onBack?: () => void
  /** La zone d'actions, à droite du titre — ou son complément, avec un retour. */
  children?: ReactNode
}

/**
 * Le titre d'un écran, et le seul endroit où il s'écrit.
 *
 * Il s'écrivait de trois façons : ce composant, un `sr-only` posé à la main sur
 * le mois, et une rangée « retour + `<h1>` » recopiée sur cinq écrans — quand un
 * sixième, le calendrier, n'avait pas de titre du tout. Trois écritures, c'est
 * trois occasions de diverger, et c'est surtout aucun endroit où brancher ce qui
 * a besoin du titre : l'annonce du changement d'écran le prend ici.
 */
export function PageTitle({ title, hidden = false, onBack, children }: PageTitleProps) {
  /* Avant tout retour anticipé : c'est un hook, et les trois formes du titre
     s'annoncent pareil — un écran dont le titre ne s'affiche pas est un écran
     comme un autre pour qui l'écoute. */
  useAnnounceScreen(title)

  if (hidden) return <h1 className="sr-only">{title}</h1>

  /* Pas de marge basse sur cette variante-ci : les écrans qui portent un retour
     empilent leur contenu dans une colonne à gouttière, et la marge s'y
     ajouterait à la gouttière. */
  if (onBack !== undefined) {
    return (
      <div className="flex items-center gap-1">
        <IconButton label={t.common.back} onClick={onBack}>
          <ChevronLeft />
        </IconButton>
        <h1 className="t-section min-w-0 truncate">{title}</h1>
        {children}
      </div>
    )
  }

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="t-section">{title}</h1>
      {children !== undefined && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}
