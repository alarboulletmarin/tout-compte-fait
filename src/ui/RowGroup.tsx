import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { Eyebrow } from './Eyebrow'
import { ChevronRight, type IconComponent, InfoIcon } from './Icons'
import { Tile } from './Tile'

/**
 * Un groupe de rangées : une tuile, son étiquette, et ce qu'elle contient.
 *
 * Les réglages en comptaient huit — une tuile par sujet, chacune avec son cadre,
 * son ombre et son eyebrow, qu'il s'agisse de choisir un thème ou de gérer
 * quarante-six catégories. Huit cadres identiques donnent le même poids à tout,
 * et c'est exactement ce qu'une page ne doit pas faire.
 *
 * La tuile redevient donc ce que le DS §6 en dit — un **groupe logique** — et la
 * hiérarchie passe à l'intérieur : l'étiquette nomme le groupe, les rangées
 * portent le contenu, un filet les sépare. Rien de nouveau dans le design
 * system : `Tile`, `Eyebrow`, et la même règle de filet que les sections de
 * `DataSection` posaient déjà à la main.
 *
 * **Elle vit dans `ui/` et non plus dans les réglages**, où elle est née : elle
 * n'a jamais rien su d'un réglage, et le bas de l'écran des récurrences pose
 * exactement la même question — deux portes voisines, dans un seul cadre, plutôt
 * qu'une tuile chacune. Une primitive nommée d'après son premier appelant est
 * une primitive qu'on recopie au deuxième.
 *
 * Le titre est facultatif : une liste de familles ou de résultats de recherche
 * est un groupe sans nom — la page en porte déjà un, et le répéter au-dessus de
 * la première ligne ne dirait rien de plus.
 */
export function RowGroup({
  title,
  icon,
  children,
}: {
  title?: string
  icon?: IconComponent
  children: ReactNode
}) {
  return (
    <Tile className="gap-2">
      {title !== undefined && <Eyebrow {...(icon ? { icon } : {})}>{title}</Eyebrow>}
      {/* Le filet entre deux rangées, et jamais avant la première : c'est le
          sélecteur qui le pose, pas chaque appelant — une rangée n'a pas à
          savoir si elle est la première du groupe. */}
      <div className="flex flex-col [&>*+*]:border-t [&>*+*]:border-border">{children}</div>
    </Tile>
  )
}

/**
 * Le gabarit d'une rangée.
 *
 * Le cadre de la tuile fait la marge : la rangée déborde de huit pixels de
 * chaque côté, si bien que son fond de survol dépasse le texte sans que le
 * texte, lui, sorte de la colonne où l'étiquette du groupe l'a posé. Sans ce
 * débordement, un survol collé au mot se lit comme une sélection ; avec, il se
 * lit comme une rangée.
 *
 * 56px de haut au minimum : le plancher tactile du DS §8 est de 44, et une
 * rangée qu'on vise au pouce dans une liste en prend douze de plus, comme
 * `ListRow`.
 */
const ROW = '-mx-2 flex min-h-14 gap-3 rounded-inner px-2 py-2 text-left'

/**
 * Sur quoi la pastille, le compte et le chevron se centrent.
 *
 * Sans seconde ligne, la rangée n'a qu'une ligne et `items-center` la centre
 * avec tout ce qui l'accompagne : c'est le cas courant, et il ne change pas.
 *
 * Avec une seconde ligne, `items-center` centrait ces trois-là sur le **bloc
 * entier** — libellé plus description —, c'est-à-dire à côté de la description
 * et non du libellé qu'ils accompagnent. Mesuré sur « Plus », « Réglages » et
 * « Épargne » : 9px sous la ligne du libellé quand la description tient sur une
 * ligne, 18 quand elle passe à deux. Un chevron qui promet un écran doit tomber
 * en face du nom de cet écran, pas en face de ce qu'il contient.
 *
 * Ils se posent donc en haut, et chacun se recentre dans la hauteur d'une ligne
 * de libellé (`LINE`) — sans quoi ils s'aligneraient sur le haut du glyphe et
 * non sur le milieu du mot.
 */
const LINE = 'flex min-h-6 shrink-0 items-center'

const ROW_ACTION =
  'transition-colors duration-[var(--dur)] ease-ds hover:bg-surface-2 active:bg-surface-2'

/**
 * Ce que le geste de la rangée fait — et donc le repère posé à son bout.
 *
 * C'est la taxonomie du `Tile` (voir son en-tête), transposée à une rangée et
 * réduite à ce dont une rangée a besoin. Le chevron promet une navigation :
 * posé sur une rangée qui ouvre une feuille sur place, il annonce un écran
 * qui ne vient jamais. Le glyphe d'information ne promet, lui, aucune
 * destination — il n'y en a pas.
 */
export type RowAffordance = 'navigate' | 'explain'

export type RowProps = {
  label: string
  /**
   * L'identifiant du contrôle que l'étiquette nomme. Renseigné, elle devient un
   * vrai `<label>` — c'est ce qui donne son nom accessible à un sélecteur, et
   * ce qui fait qu'on peut le déplier en touchant le mot plutôt que la flèche.
   */
  labelFor?: string
  /** Une seconde ligne : la valeur du réglage, ou ce que la vue contient. */
  description?: string
  /** À droite du libellé — un compte, un sélecteur court. */
  trailing?: ReactNode
  /** Avant le libellé — une pastille de couleur. Exclusif d'`icon`. */
  leading?: ReactNode
  /**
   * Le repère de la destination, à gauche du libellé — **le même glyphe qu'en
   * navigation**, et c'est tout l'intérêt (DS §9.2).
   *
   * Sur un écran qui n'est qu'une liste de portes, il est ce que la colonne
   * latérale offre déjà et que le téléphone n'avait pas : la barre d'onglets ne
   * porte que quatre glyphes, et tout ce qu'elle range se lisait donc en texte
   * seul. Retrouver « Répartition » demandait de lire quatre libellés au lieu
   * de reconnaître trois silhouettes.
   *
   * Il ne double pas le chevron : celui-ci dit *qu'on* navigue, le repère dit
   * *vers quoi*. Il double en revanche une pastille — d'où l'exclusivité avec
   * `leading` : deux marqueurs à la même place n'en font plus aucun.
   */
  icon?: IconComponent
  /**
   * Un contrôle posé **sous** l'étiquette, pour ceux qui ne tiennent pas à sa
   * droite : à 320px, une tuile n'offre que 250px utiles, et une bascule à
   * trois positions les prend presque tous.
   */
  control?: ReactNode
  /** Mène à une vue. Exclusif d'`onClick`. */
  to?: string
  onClick?: () => void
  /** Sans objet sans geste : on ne pose pas de repère sur ce qui n'agit pas. */
  affordance?: RowAffordance
}

/**
 * Une rangée : ce dont il s'agit, sa valeur, et où l'on va.
 *
 * Un lien quand elle mène ailleurs, un bouton quand elle agit sur place, un
 * simple bloc quand elle ne fait que porter un contrôle — jamais un `div`
 * cliquable : le chevron promet une navigation, et une navigation se tabule,
 * s'ouvre dans un onglet et s'annonce comme telle.
 *
 * Le repère n'apparaît que là où le geste existe, exactement comme celui d'une
 * tuile (`Tile`) : une rangée sans repère est une rangée qu'on lit. Et il dit
 * *lequel* de geste — chevron vers un écran, glyphe d'information pour une
 * feuille qui s'ouvre sur place (`RowAffordance`).
 */
export function Row({
  label,
  labelFor,
  description,
  trailing,
  leading,
  icon: Repere,
  control,
  to,
  onClick,
  affordance = 'navigate',
}: RowProps) {
  /* La pastille l'emporte : elle est tirée d'une donnée — la teinte d'une
     catégorie —, quand le repère est décidé par la table des routes. Une rangée
     qui aurait les deux poserait deux marques au même endroit, et le DS §9.1
     n'en veut pas.
     Atténué comme le chevron d'en face : le libellé porte le sens, ces deux-là
     l'encadrent sans lui disputer la ligne. 18px, la taille du repère en
     navigation (DS §9.1) — c'est le même glyphe au même rang. */
  const mark =
    leading ??
    (Repere === undefined ? undefined : <Repere size={18} className="shrink-0 text-muted" />)

  const heading = (
    <span className="flex min-w-0 flex-1 flex-col">
      {labelFor === undefined ? (
        <span className="t-body truncate">{label}</span>
      ) : (
        <label htmlFor={labelFor} className="t-body truncate">
          {label}
        </label>
      )}
      {/* Le libellé se tronque, la seconde ligne passe à la ligne : un nom de
          foyer trop long doit tenir sur une rangée, mais une valeur coupée —
          « Rien n'est converti : seul le s… » — ne dit plus rien de ce qu'elle
          avertit. */}
      {description !== undefined && <span className="t-label">{description}</span>}
    </span>
  )

  const Marker = affordance === 'explain' ? InfoIcon : ChevronRight

  /* Voir `LINE` : une rangée sans seconde ligne se centre en bloc, une rangée
     qui en porte une aligne ses marques sur la ligne du libellé. */
  const align = description === undefined ? 'items-center' : 'items-start'

  const content = (marker: boolean): ReactNode => (
    <>
      {mark !== undefined && <span className={LINE}>{mark}</span>}
      {heading}
      {/* Le compte, lui, garde le centre du bloc — et non la ligne du libellé.
          Il porte parfois un contrôle qui fait la hauteur d'un champ : posé sur
          la première ligne, un sélecteur de 44px déborde sous la description au
          lieu de lui faire face, et « Devise » le montrait à 11px. Une marque
          suit le mot qu'elle marque, un contrôle occupe la rangée. */}
      {trailing !== undefined && (
        <span className="flex shrink-0 items-center self-center">{trailing}</span>
      )}
      {/* `aria-hidden` : le nom accessible du lien dit déjà où il mène, et un
          chevron annoncé une seconde fois ne l'apprendrait pas mieux. */}
      {marker && (
        <span className={LINE}>
          <Marker size={16} className="shrink-0 text-muted" aria-hidden="true" />
        </span>
      )}
    </>
  )

  if (control !== undefined) {
    return (
      /* Le repère aussi sur cette branche : une rangée qui pose son contrôle
         *sous* son libellé reste une rangée du groupe, et sans lui son libellé
         partait seul dans la marge pendant que ses voisines gardaient leur
         colonne de glyphes. La rangée de titre reprend donc le gabarit des
         autres — marque sur la ligne du libellé —, et le contrôle se pose
         dessous, aligné sur le texte et non sur le glyphe. */
      <div className="-mx-2 flex flex-col gap-2 px-2 py-3">
        <div className="flex items-start gap-3">
          {mark !== undefined && <span className={LINE}>{mark}</span>}
          {heading}
        </div>
        {control}
      </div>
    )
  }

  if (to !== undefined) {
    return (
      <Link to={to} className={cn(ROW, align, ROW_ACTION)}>
        {content(true)}
      </Link>
    )
  }

  if (onClick !== undefined) {
    return (
      <button type="button" onClick={onClick} className={cn(ROW, align, ROW_ACTION)}>
        {content(true)}
      </button>
    )
  }

  return <div className={cn(ROW, align)}>{content(false)}</div>
}
