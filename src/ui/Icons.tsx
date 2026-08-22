/* Adaptateur au-dessus de Phosphor. Les composants gardent des noms à nous et
 * une signature à nous : le reste de l'app ne sait pas d'où viennent les
 * glyphes, et changer de bibliothèque ne toucherait que ce fichier.
 *
 * Import par chemin direct plutôt que depuis l'index : le barrel expose neuf
 * mille icônes, que Vite doit toutes analyser au démarrage en dev même si le
 * build final n'en garde qu'une vingtaine.
 *
 * Deux familles, et pas une de plus (DS §9) :
 *   — ACTION, sur un contrôle qui fait quelque chose ;
 *   — REPÈRE, sur un onglet, une tuile ou une section, pour qu'on la retrouve
 *     à l'œil sans relire son libellé.
 * Rien en dehors : une icône qui n'aide ni à agir ni à se repérer décore, et
 * le DS ne veut pas de décor. */

import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import { ArrowsClockwise } from '@phosphor-icons/react/dist/csr/ArrowsClockwise'
import { ArrowsDownUp } from '@phosphor-icons/react/dist/csr/ArrowsDownUp'
import { Archive } from '@phosphor-icons/react/dist/csr/Archive'
import { ArrowUpRight } from '@phosphor-icons/react/dist/csr/ArrowUpRight'
import { Backspace } from '@phosphor-icons/react/dist/csr/Backspace'
import { CalendarBlank } from '@phosphor-icons/react/dist/csr/CalendarBlank'
import { CaretDown } from '@phosphor-icons/react/dist/csr/CaretDown'
import { CaretLeft } from '@phosphor-icons/react/dist/csr/CaretLeft'
import { CaretRight } from '@phosphor-icons/react/dist/csr/CaretRight'
import { ChartBar } from '@phosphor-icons/react/dist/csr/ChartBar'
import { ChartLine } from '@phosphor-icons/react/dist/csr/ChartLine'
import { ChartLineUp } from '@phosphor-icons/react/dist/csr/ChartLineUp'
import { ChartPieSlice } from '@phosphor-icons/react/dist/csr/ChartPieSlice'
import { Check as PhCheck } from '@phosphor-icons/react/dist/csr/Check'
import { CheckCircle } from '@phosphor-icons/react/dist/csr/CheckCircle'
import { CircleHalf } from '@phosphor-icons/react/dist/csr/CircleHalf'
import { Clock as PhClock } from '@phosphor-icons/react/dist/csr/Clock'
import { Bank } from '@phosphor-icons/react/dist/csr/Bank'
import { Coins } from '@phosphor-icons/react/dist/csr/Coins'
import { Database } from '@phosphor-icons/react/dist/csr/Database'
import { DotsThreeOutline } from '@phosphor-icons/react/dist/csr/DotsThreeOutline'
import { GearSix } from '@phosphor-icons/react/dist/csr/GearSix'
import { HandCoins } from '@phosphor-icons/react/dist/csr/HandCoins'
import { House } from '@phosphor-icons/react/dist/csr/House'
import { Info } from '@phosphor-icons/react/dist/csr/Info'
import { ListBullets } from '@phosphor-icons/react/dist/csr/ListBullets'
import { Palette } from '@phosphor-icons/react/dist/csr/Palette'
import { PiggyBank } from '@phosphor-icons/react/dist/csr/PiggyBank'
import { Plus as PhPlus } from '@phosphor-icons/react/dist/csr/Plus'
import { MagnifyingGlass } from '@phosphor-icons/react/dist/csr/MagnifyingGlass'
import { Minus as PhMinus } from '@phosphor-icons/react/dist/csr/Minus'
import { Money } from '@phosphor-icons/react/dist/csr/Money'
import { Moon } from '@phosphor-icons/react/dist/csr/Moon'
import { Receipt } from '@phosphor-icons/react/dist/csr/Receipt'
import { Sun } from '@phosphor-icons/react/dist/csr/Sun'
import { ShareNetwork } from '@phosphor-icons/react/dist/csr/ShareNetwork'
import { ShieldCheck } from '@phosphor-icons/react/dist/csr/ShieldCheck'
import { SquaresFour } from '@phosphor-icons/react/dist/csr/SquaresFour'
import { Tag } from '@phosphor-icons/react/dist/csr/Tag'
import { Translate } from '@phosphor-icons/react/dist/csr/Translate'
import { Trash } from '@phosphor-icons/react/dist/csr/Trash'
import { TrendUp } from '@phosphor-icons/react/dist/csr/TrendUp'
import { Users } from '@phosphor-icons/react/dist/csr/Users'
import { UsersThree } from '@phosphor-icons/react/dist/csr/UsersThree'
import { Wallet } from '@phosphor-icons/react/dist/csr/Wallet'
import { WarningCircle } from '@phosphor-icons/react/dist/csr/WarningCircle'
import { X } from '@phosphor-icons/react/dist/csr/X'

export type IconProps = { className?: string; size?: number }
/** Ce que consomment `Eyebrow` et la navigation pour recevoir un repère. */
export type IconComponent = (props: IconProps) => React.JSX.Element

/* `bold` est la graisse qui retombe sur le trait de 2px du DS ; `regular`
   maigrirait à côté du texte, et `fill` contredirait « trait fonctionnel ». */
const WEIGHT = 'bold' as const

function adapt(Glyph: PhosphorIcon): IconComponent {
  return function Adapted({ className, size = 20 }: IconProps) {
    return (
      <Glyph
        size={size}
        weight={WEIGHT}
        className={className}
        aria-hidden="true"
        focusable={false}
      />
    )
  }
}

/* --- Action ---------------------------------------------------------------*/

export const ChevronLeft = adapt(CaretLeft)
export const ChevronRight = adapt(CaretRight)
export const ChevronDown = adapt(CaretDown)
export const Plus = adapt(PhPlus)
/* Il n'existe que par paire avec `Plus`, sur le réglage d'effort du
   simulateur : « les deux sens sont deux boutons, jamais un seul » (DS §7), et
   un « − » typographique posé dans un bouton n'aurait ni la graisse ni la boîte
   du glyphe d'en face. */
export const Minus = adapt(PhMinus)
export const Close = adapt(X)
/* La touche d'effacement du pavé numérique. Elle porte son nom sur le contrôle
   et non sur le glyphe (§9.2) : c'est un bouton sans libellé visible. */
export const BackspaceIcon = adapt(Backspace)
export const Check = adapt(PhCheck)
/* La suppression d'une ligne de liste, où le mot ne tient pas : le bouton
   porte son nom et **nomme la ligne** (§9.2), le glyphe ne fait que le
   retrouver. Le seul geste destructif assez fréquent pour mériter un glyphe —
   ailleurs, « Supprimer » s'écrit en toutes lettres. */
export const TrashIcon = adapt(Trash)
export const Warning = adapt(WarningCircle)
/* Le repère d'une tuile qui s'explique sur place, par opposition au chevron de
   celle qui mène ailleurs : deux gestes, deux glyphes. */
export const InfoIcon = adapt(Info)
/* Le seul lien qui quitte l'app est celui du dépôt, et rien ne le distinguait
   d'une navigation interne — dans une app installée, où il n'y a pas de bouton
   retour, partir sans le savoir se paie cher. Une flèche sortante, et non la
   marque du service : un logo ne dit pas qu'on s'en va, il décore, et le DS §1
   n'en veut pas. Poser les deux ferait deux marqueurs côte à côte, donc aucun
   (DS §9.1). */
export const ExternalIcon = adapt(ArrowUpRight)
/* Le glyphe du partage, sur le bouton qui ouvre la feuille du système. Il est
   seul de sa rangée à en porter un, et c'est ce qui fait son travail : l'export
   voisin est le geste courant, celui-ci est la sortie de côté. */
export const ShareIcon = adapt(ShareNetwork)

/* Les trois positions du thème, sur la bascule des écrans d'avant le foyer —
   et là seulement : « Apparence » les nomme en toutes lettres, parce que c'est
   la vue du réglage et qu'on y vient exprès. Ici on ne vient pas, on passe : le
   glyphe rend au titre la largeur que trois mots lui prenaient.

   Un demi-disque pour « Système », et pas un second astre : la position ne dit
   pas une apparence, elle dit *qui décide* — le soleil et la lune sont les deux
   réponses, celle-ci est la règle qui va chercher celle de l'appareil. Elle
   reste une position visible et non un repli, parce qu'elle est le défaut :
   une bascule à deux positions ne saurait pas montrer l'état de qui n'a rien
   choisi. */
export const ThemeLightIcon = adapt(Sun)
export const ThemeDarkIcon = adapt(Moon)
export const ThemeSystemIcon = adapt(CircleHalf)

/* --- Repère — navigation --------------------------------------------------*/

/* Les destinations qui n'ont pas de tuile à leur nom. Les deux autres —
   abonnements et historique — sont déclarées plus bas, sous leur concept. */
export const NavMonth = adapt(SquaresFour)
export const NavCalendar = adapt(CalendarBlank)
export const NavSettings = adapt(GearSix)
/* Le quatrième onglet, celui qui ouvre le reste de l'app. Trois points et non
   une roue dentée : ce n'est pas la section des réglages, c'est ce qui n'a pas
   sa place dans une barre de quatre — le rangement du foyer d'un côté, les
   réglages de l'autre. Le glyphe le dit sans nommer l'un des deux. */
export const NavMore = adapt(DotsThreeOutline)

/* --- Repère — tuiles et sections ------------------------------------------*/

/* Ces deux-là servent aussi d'onglet, et c'est pour cela qu'ils sont ici :
   « abonnements » et « historique » sont un concept chacun, pas deux. Le DS
   §9.2 demande qu'un concept garde le même glyphe partout, et deux exports
   pour un même glyphe sont exactement ce qui laisse la barre d'onglets et la
   tuile diverger un jour sans que rien ne l'annonce. Déclarés une fois, sous
   le concept ; `app/routes.ts` vient les y lire. */
export const RecurrencesIcon = adapt(ArrowsClockwise)
export const HistoryIcon = adapt(ChartLine)

export const BalanceIcon = adapt(Wallet)
export const IncomeIcon = adapt(Coins)
/* La quittance, et non une flèche : c'est ce qu'on doit, pas une variation. */
export const ChargesIcon = adapt(Receipt)
export const ForecastIcon = adapt(ChartLineUp)
export const RemainingIcon = adapt(HandCoins)
/* La tirelire porte l'épargne, la main tendue le reste à vivre : deux chiffres
   voisins sur la grille, et deux mains de pièces s'y confondraient. */
export const SavingsIcon = adapt(PiggyBank)
export const BreakdownIcon = adapt(ChartPieSlice)
export const UpcomingIcon = adapt(PhClock)
export const CreditsIcon = adapt(Bank)
export const SplitIcon = adapt(UsersThree)
export const ToConfirmIcon = adapt(CheckCircle)
export const EntriesIcon = adapt(ListBullets)
/* Deux personnes et non une maison : la section qu'il repère s'appelle
   « Personnes », et l'app ne suppose plus qu'on tienne un foyer. Deux glyphes
   distincts de `SplitIcon` (trois personnes), qui repère la répartition — un
   repère qui sert deux fois n'en est plus un (DS §9). */
export const PeopleIcon = adapt(Users)
export const HouseholdIcon = adapt(House)
export const CategoriesIcon = adapt(Tag)
export const SearchIcon = adapt(MagnifyingGlass)
export const ThemeIcon = adapt(Palette)
export const DataIcon = adapt(Database)
/* Le repère des trois pages juridiques. Un bouclier plutôt qu'une balance :
   ce qu'elles disent d'abord est ce qui protège celui qui lit — rien ne sort de
   son appareil —, et non l'appareil judiciaire qui l'y oblige. */
export const ShieldIcon = adapt(ShieldCheck)
/* Le coffre, et non une seconde base : « Données » parle des fichiers qui
   sortent, « Sur cet appareil » de ce qui y reste rangé. */
export const DeviceIcon = adapt(Archive)
/* Ce qui sort et ce qui rentre, dans un seul glyphe : deux flèches opposées.
   L'écran s'appelle « Exporter / importer », et un repère qui n'en montrerait
   qu'un des deux sens désignerait la moitié de ce qu'il ouvre. Distinct de
   `ShareIcon`, qui est le geste — passer le fichier à une autre app — et non
   la destination. */
export const TransferIcon = adapt(ArrowsDownUp)
/* Le billet, et non une pièce : `IncomeIcon` tient déjà les pièces pour les
   revenus, et un repère qui sert deux concepts n'en repère plus aucun (DS §9).
   Le billet est aussi le seul glyphe d'argent de la bibliothèque qui ne porte
   aucun symbole monétaire — sur le réglage qui choisit lequel afficher, un « $»
   gravé dans l'icône aurait dit le contraire de ce que fait le sélecteur. */
export const CurrencyIcon = adapt(Money)

/* Le glyphe de traduction — deux systèmes d'écriture côte à côte —, et non un
   globe : un globe dit un pays ou une région, quand ce réglage-ci ne change que
   la langue des mots. Le drapeau était exclu d'avance, et pas seulement par le
   DS : une langue n'appartient à aucun pays, et « anglais = Royaume-Uni » est
   faux pour la plupart de ceux qui la parlent. */
export const LanguageIcon = adapt(Translate)
export const CompareIcon = adapt(ChartBar)
/* La courbe nue, et non celle du prévisionnel : les deux montaient dans le même
   cadre à axes, et le glyphe partagé disait qu'il s'agissait du même chiffre —
   le solde du mois qu'on projette, et le cumul de deux années qu'on superpose.
   Ils ne se croisent sur aucun écran, ce qui est justement ce qui rendait la
   confusion indétectable. */
export const YearsIcon = adapt(TrendUp)
