import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { ChevronDown, ChevronRight, InfoIcon } from './Icons'

/** Formats autorisés par le DS §5. Rien d'autre, sinon la grille se délite. */
export type TileSpan = '2x1' | '2x2' | '4x1' | '4x2' | '6x2'

export type TileVariant = 'default' | 'accent' | 'accent-2'

/**
 * Ce que le clic fait — et donc le repère posé au coin de la tuile.
 *
 * Douze tuiles rigoureusement identiques à l'œil cachaient cinq comportements :
 * ouvrir une feuille d'explication, partir sur un autre écran, faire défiler
 * vers une section plus bas, ne rien faire, ou ne rien faire sauf par un lien
 * minuscule posé à l'intérieur. Le seul indice était un survol qui soulève la
 * tuile d'un pixel — donc rien du tout au doigt.
 *
 * Un repère par comportement, et rien sur ce qui ne fait rien : c'est cette
 * dernière règle qui rend les trois autres lisibles. Une tuile sans repère est
 * une tuile qu'on lit, pas une tuile qu'on rate.
 */
export type TileAffordance =
  /**
   * Mène ailleurs. `destination` nomme l'écran d'arrivée — savoir que c'est
   * cliquable ne dit pas encore où l'on atterrit —, et se tait quand cet écran
   * porte déjà le nom de la tuile : « RÉPARTITION … Répartition › » n'apprend
   * rien de plus que le chevron seul, et prend la largeur du chiffre.
   */
  | { kind: 'navigate'; destination?: string }
  /** Ouvre une feuille sur place. Pas de destination, il n'y en a pas. */
  | { kind: 'explain' }
  /** Fait défiler vers une section de la même page. La flèche descend, elle ne
   *  pointe pas de côté : « plus bas », et non « ailleurs ». */
  | { kind: 'scroll'; destination: string }

/**
 * Le geste d'une tuile dont le contenu est une liste — **et toute la tuile est
 * la cible**.
 *
 * Une tuile actionnable est un `<button>`, qui n'admet que du contenu de
 * phrase : trois d'entre elles y plaçaient une liste, ce qu'aucun navigateur ne
 * valide et qu'un lecteur d'écran aplatit derrière le nom unique du bouton. Le
 * DS §6 prescrit alors la tuile non cliquable avec un vrai lien, pour que ses
 * lignes continuent de se lire une à une.
 *
 * **Ce lien couvrait 44px au coin, et c'était le défaut de la solution.** La
 * règle règle un problème d'oreille et en créait un de doigt : la tuile fait
 * 300px de large et n'en offrait qu'une quarantaine à viser, dans un coin, sans
 * rien pour dire où. À côté, la Capacité d'épargne se touche n'importe où
 * puisqu'elle est un bouton — deux tuiles voisines, de même taille, de même
 * apparence, et l'une des deux ne répondait qu'au coin.
 *
 * Le lien s'étend donc à toute la tuile (`.tile-stretch`), et le coin ne garde
 * que le **repère**, en `aria-hidden` — exactement le partage que connaît déjà
 * une tuile-bouton. Rien ne change pour l'oreille : c'est toujours une section
 * qu'on parcourt ligne à ligne, avec un lien nommé dedans. Ce qui change est
 * qu'on peut la toucher.
 *
 * Le repère reste en position absolue : il ne coûte donc ni la hauteur ni la
 * largeur qu'une 2×2 n'a pas — son budget vertical est compté au pixel dans
 * `donut.ts`.
 *
 * **Corollaire à connaître : plus rien d'autre n'est actionnable dans la
 * tuile.** La surface du lien passe devant le contenu, et un bouton posé dans
 * une ligne ne recevrait plus le doigt. Une tuile dont la légende s'ouvre part
 * en part — « Où part l'argent » — ne prend donc pas de `link` : ses parts sont
 * des boutons, et c'est le contenu qui porte les gestes.
 */
export type TileLink = {
  to: string
  /** Ce que le lien dit hors de son contexte : « Le détail de la répartition ». */
  label: string
  /** Nomme l'écran d'arrivée à côté du chevron, comme `TileAffordance`. */
  destination?: string
}

export type TileProps = {
  children: ReactNode
  variant?: TileVariant
  /** Omis, la tuile n'est pas posée dans une grille bento et occupe son flux. */
  span?: TileSpan
  className?: string
  /** Rend la tuile actionnable. La cible tactile fait alors toute la tuile. */
  onClick?: () => void
  label?: string
  /** Sans objet sans `onClick` : on n'annonce pas un geste qui n'existe pas. */
  affordance?: TileAffordance
  /** Exclusif d'`onClick` : le repère du coin devient le seul geste de la tuile. */
  link?: TileLink
}

const VARIANT_CLASS: Record<TileVariant, string> = {
  default: '',
  accent: 'tile--accent',
  'accent-2': 'tile--accent-2',
}

const PADDING = 'p-5 md:p-6'

/**
 * Une tuile d'une seule rangée fait 88px de haut : à 20px de cadre il ne reste
 * que 48px, et l'eyebrow avec le chiffre en demandent 57. Elle resserre donc
 * son cadre — sans quoi la lecture secondaire, puis le chiffre lui-même, se
 * coupent au bord. Le chiffre s'y réduit aussi, dans `base.css`.
 *
 * **Le pendant en largeur, qui décide d'un `span` autant que la hauteur.** Une
 * `2x1` reste en demi-colonne sur mobile, seule de tous les formats : elle
 * n'offre que ~104px de contenu à 320px. L'eyebrow y est en `nowrap` et se
 * dégrade en trois paliers (`components.css`) — marges et interlettrage, puis
 * l'icône, puis le reste de l'interlettrage — après quoi il déborde et se fait
 * trancher par l'`overflow-hidden` ci-dessous.
 *
 * Mesuré, pas calculé : le plafond d'une `2x1` est de **13 caractères**.
 * « Reste à vivre » (13) tient, et ne tenait pas avant le troisième palier ;
 * « Capacité d'épargne » (18) déborde de 35px, d'où la `4x1` de `SavingTile`.
 * Passé 13 caractères, le format est `4x1` — c'est au format d'être choisi pour
 * le libellé, pas au libellé d'être raboté pour le format.
 */
const PADDING_FLAT = 'p-4'
const FLAT: readonly TileSpan[] = ['2x1', '4x1']

/**
 * Le repère, au coin haut-droit, hors du flux du contenu.
 *
 * En position absolue et non dans une rangée avec l'eyebrow : les tuiles ne
 * s'accordent pas sur ce qu'elles posent en tête — certaines une étiquette
 * seule, d'autres un chiffre héros collé dessous — et un repère qui participe
 * au flux les décalerait chacune différemment. Aligné sur le cadre de la tuile,
 * il tombe toujours sur la ligne de l'eyebrow.
 *
 * `aria-hidden` : le nom accessible de la tuile dit déjà où elle mène (« Voir
 * où placer 2 500 € »), et l'annoncer deux fois ne l'apprendrait pas mieux.
 */
function cornerClass(span: TileSpan | undefined): string {
  const flat = span !== undefined && FLAT.includes(span)

  return cn(
    'absolute flex max-w-[60%] items-center',
    flat ? 'right-4' : 'right-5 md:right-6',
    /* Une 2×1 étroite n'offre qu'une centaine de pixels utiles, et
       « PRÉVISIONNEL » les consomme déjà à lui seul — le repère posé en
       haut lui passait dessus. Il descend donc au coin bas, libre tant que
       la lecture secondaire est masquée à cette largeur ; dès qu'elle
       s'affiche, la rangée du bas se remplit, celle du haut se dégage, et
       le repère remonte. Deux coins, jamais deux en même temps.
       C'est la largeur de la tuile qui arbitre, pas celle de l'écran :
       `.tile-affordance-flat` porte exactement le seuil de `.tile-hint`,
       sans quoi une tuile large sur un petit écran verrait les deux se
       disputer la ligne du bas. */
    span === '2x1' ? 'tile-affordance-flat' : flat ? 'top-4' : 'top-5 md:top-6',
  )
}

/** Le nom de la destination puis le glyphe — le repère lui-même, sans sa boîte. */
function Marker({
  destination,
  glyph: Glyph,
  span,
}: {
  destination: string | undefined
  glyph: typeof ChevronRight
  span: TileSpan | undefined
}) {
  return (
    <>
      {destination !== undefined && (
        <span className={cn('t-axis truncate', span === '2x1' && 'tile-affordance-name')}>
          {destination}
        </span>
      )}
      {/* Sans pilule, une 2×1 garde le budget de pixels d'origine — voir
          `Corner` : c'est là, et seulement là, que le glyphe se pose sur un
          chiffre taillé au bord. */}
      <Glyph size={span === '2x1' ? 14 : 16} />
    </>
  )
}

/**
 * Le repère posé au coin, en décor : il dit ce que le geste fait, il n'est pas
 * le geste. `aria-hidden`, parce que le nom accessible de la cible le dit déjà.
 *
 * **Sa pilule, et pas seulement le glyphe nu.** Un chevron seul, flottant dans
 * le coin d'une tuile aussi large que celle-ci, se perdait : rien ne le
 * reliait à un fond, à un contour, à quoi que ce soit qui dise « ceci se
 * touche ». La pilule reprend le traitement de l'eyebrow d'en face — même
 * fond, même coin arrondi — pour que les deux se répondent comme les deux
 * bouts d'une même rangée d'en-tête, plutôt qu'une étiquette pleine d'un côté
 * et un pixel muet de l'autre.
 *
 * **Sauf sur une `2x1` repliée au coin bas.** Là, le repère se pose par-dessus
 * le chiffre héros et non plus à côté — voir `cornerClass` — et ce chiffre est
 * taillé pour remplir la tuile jusqu'au bord (`FlowTiles` : onze caractères sur
 * 104px de contenu). Une pilule pleine y mordrait sur les derniers chiffres ;
 * le glyphe nu, lui, tient dans l'espace qu'un zéro ou un centime laisse libre.
 */
function Corner({
  destination,
  glyph,
  span,
}: {
  destination: string | undefined
  glyph: typeof ChevronRight
  span: TileSpan | undefined
}) {
  const marker = <Marker destination={destination} glyph={glyph} span={span} />

  return (
    <span aria-hidden="true" className={cn('pointer-events-none', cornerClass(span))}>
      {span === '2x1' ? (
        marker
      ) : (
        <span className="inline-flex items-center gap-1 rounded-chip bg-surface-2 px-2 py-1 text-text">
          {marker}
        </span>
      )}
    </span>
  )
}

function Affordance({ affordance, span }: { affordance: TileAffordance; span?: TileSpan }) {
  const Glyph =
    affordance.kind === 'explain'
      ? InfoIcon
      : affordance.kind === 'scroll'
        ? ChevronDown
        : ChevronRight

  return (
    <Corner
      destination={affordance.kind === 'explain' ? undefined : affordance.destination}
      glyph={Glyph}
      span={span}
    />
  )
}

/**
 * Le geste d'une tuile à liste : un lien vide, étendu sur toute la tuile.
 *
 * Vide, et c'est ce qui le rend possible. Le repère visible est resté au coin,
 * en `aria-hidden` (`Corner`) : ce lien-ci n'a donc rien à afficher, seulement
 * une surface à couvrir et un nom à porter. Il ne s'insère pas dans le flux,
 * donc il ne coûte pas un pixel de hauteur — ce qui compte sur une 2×2, dont le
 * budget vertical est mesuré au pixel (`donut.ts`).
 *
 * Il porte son nom accessible plutôt que de compter sur son entourage : un
 * lecteur d'écran sait lister les liens d'une page hors de leur contexte, et
 * « › » n'y dit rien. C'est aussi ce qui autorise le chevron nu à l'écran, là où
 * l'eyebrow de la tuile nomme déjà la destination.
 *
 * L'anneau de focus ne se dessine pas sur lui mais sur la tuile
 * (`components.css`) : posé ici, il serait rogné par l'`overflow-hidden` du
 * cadre, et il doit de toute façon entourer ce qu'on actionne — c'est la tuile
 * entière, comme sur une tuile-bouton.
 */
function StretchedLink({ link }: { link: TileLink }) {
  return <Link to={link.to} aria-label={link.label} className="tile-stretch" />
}

/**
 * Le retour qu'une tuile actionnable donne au geste.
 *
 * Le survol n'existe pas au doigt : sans état pressé, la moitié des
 * utilisateurs n'a aucun retour que le geste a été pris (DS §6). Il vaut pour
 * les deux formes — bouton et tuile à lien étendu —, parce que les deux se
 * touchent de la même façon et doivent donc répondre pareil.
 */
const ACTIONABLE = cn(
  'transition-[transform,box-shadow,filter] duration-[var(--dur)] ease-ds',
  'hover:-translate-y-px active:translate-y-0 active:brightness-95',
)

export function Tile({
  children,
  variant = 'default',
  span,
  className,
  onClick,
  label,
  affordance,
  link,
}: TileProps) {
  const flat = span !== undefined && FLAT.includes(span)
  const classes = cn(
    'tile flex min-w-0 flex-col overflow-hidden',
    flat ? PADDING_FLAT : PADDING,
    VARIANT_CLASS[variant],
    span && `span-${span}`,
    className,
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={cn(classes, 'text-left', ACTIONABLE)}
      >
        {affordance && <Affordance affordance={affordance} {...(span ? { span } : {})} />}
        {children}
      </button>
    )
  }

  return (
    /* La tuile reste une `<section>` — un `<button>` n'admettrait pas la liste
       qu'elle porte —, mais elle se touche partout : le lien s'étend dessous,
       et le coin ne garde que le repère. Voir `TileLink`. */
    <section className={cn(classes, link && ACTIONABLE)} aria-label={label}>
      {link && (
        <>
          <Corner destination={link.destination} glyph={ChevronRight} span={span} />
          <StretchedLink link={link} />
        </>
      )}
      {children}
    </section>
  )
}

export function BentoGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('bento', className)}>{children}</div>
}
