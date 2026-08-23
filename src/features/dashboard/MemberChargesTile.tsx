import { type Money, add } from '@/domain/money'
import { t } from '@/i18n/strings'
import { formatMoney, tpl } from '@/i18n/format'
import { useMemberCharges, useMemberFilter, useMemberMap } from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Dot } from '@/ui/Dot'
import { Eyebrow } from '@/ui/Eyebrow'
import { ChargesIcon } from '@/ui/Icons'
import { Ring, type RingSegment } from '@/ui/Ring'
import { Tile, type TileSpan } from '@/ui/Tile'
import { useHasMemberCharges } from './composition'
import { useCurrency } from '@/ui/currency'
import { DONUT_SIZE, DONUT_THICKNESS } from './donut'
import type { Metric } from './MetricInfo'

/** La couleur du pot : aucune personne ne le porte, aucune couleur de membre
 *  ne peut donc le dire. C'est celle que la grille réserve à ce qui n'a pas
 *  d'identité propre, et l'anneau n'a que deux parts à distinguer. */
const COMMON_COLOR = 'var(--cat-rest)'

/**
 * Ce que le mois coûte à la personne filtrée, et **d'où ça vient** : ses lignes
 * à elle d'un côté, sa part du pot commun de l'autre.
 *
 * C'est la seule chose que ses chiffres ne disent jamais. `scopeToMember` fond
 * les deux dans chaque total — sans quoi elle se lirait comme si elle vivait
 * sans loyer ni électricité (cahier §4.6) —, mais une fois fondue, la part du
 * commun ne se voit plus : la tuile Charges, « Où part l'argent » et la capacité
 * d'épargne annoncent toutes un montant dont on ne sait plus quelle fraction on
 * a choisie, et le seul terme sur lequel on peut agir seul·e — ses dépenses à
 * elle — est indiscernable de celui qui se décide à deux.
 *
 * **Elle ne dit pas un mot du virement, et c'est tout son propos.** Ces deux
 * montants vivaient jusqu'ici sur « À verser sur le commun », qui est une carte
 * de virement : le report entrait dans son chiffre de tête et pas dans eux — un
 * coût est arrêté au mois où la dépense a eu lieu, un virement se rattrape
 * (§4.7 ter) —, si bien qu'un « Total à payer » s'y affichait plus petit que le
 * « À verser » juste au-dessus. Deux questions, deux tuiles.
 *
 * Le total est celui de la tuile Charges de la même page, au centime : elle ne
 * le contredit pas, elle l'éclate. C'est ce qui interdit d'arrondir ici — deux
 * moitiés arrondies ne redonnent plus le tout annoncé trois cases plus haut.
 *
 * **Et c'est ce qui décide de quelle part du commun elle prend.** `common` est
 * la part du *pot*, celle qu'on verse ; `commonCharge + commonDebt` est la part
 * des seules natures que `spendingFlow` compte, celle que le mois coûte. Les
 * deux diffèrent dès qu'une ligne « à partager » n'est pas une dépense, et ce
 * n'est pas un document tordu à la main : une **avance** en produit une à chaque
 * mensualité. Quelqu'un règle l'assurance auto du foyer depuis son livret,
 * l'app pose une récurrence qui le reconstitue — nature « épargne », prise sur
 * la catégorie du support — et la marque « à partager », puisque le foyer la lui
 * rembourse. Cette mensualité est un virement dû, pas un coût consommé : elle
 * entre dans « À verser sur le commun » et pas dans la tuile Charges.
 *
 * Prendre `common` ici faisait donc annoncer un coût **supérieur** à la tuile
 * Charges de la même page — 1 697,80 € contre 1 672,42 € sur le jeu d'exemple,
 * soit les 25,38 € de part d'une mensualité de 56 € —, dans une tuile dont tout
 * le propos est d'éclater ce chiffre-là sans le contredire.
 *
 * `2×2` et l'anneau de `BreakdownTile`, dont elle est l'autre découpe du même
 * montant : par famille chez l'une, par ce qui se décide seul·e ou à deux chez
 * l'autre. Elle s'efface sans filtre, sans prorata calculable — l'en-tête du
 * mois nomme alors ce qui manque — et quand le mois n'a coûté à cette personne
 * ni en propre ni en commun : une répartition de rien n'est pas une répartition.
 */
export function MemberChargesTile({
  span = '2x2',
  onExplain,
}: {
  span?: TileSpan
  onExplain: (metric: Metric) => void
}) {
  const charges = useMemberCharges()
  const filter = useMemberFilter()
  const members = useMemberMap()
  const currency = useCurrency()
  const visible = useHasMemberCharges()

  if (!visible || filter === undefined || charges === null) return null

  /* La part des seules natures que compte la tuile Charges — voir plus haut :
     `common` y ajouterait la mensualité d'une avance partagée, qui est un
     virement dû et non un coût du mois. */
  const common = add(charges.commonCharge, charges.commonDebt)
  const total = add(charges.own, common)

  const member = members.get(filter)
  const color = member?.color ?? 'var(--cat-rest)'
  /* Les parts de l'anneau se prennent sur le total affiché, et non sur le
     prorata des revenus : celui-ci dit quelle fraction du pot lui revient — il
     a sa jauge sur la tuile voisine —, quand la question posée ici est quelle
     fraction de *son* mois se décide à deux. */
  const shareOf = (value: Money): number => (total > 0 ? value / total : 0)

  const segments: RingSegment[] = [
    {
      id: 'own',
      value: shareOf(charges.own),
      color,
      label: t.dashboard.memberChargesOwn,
    },
    {
      id: 'common',
      value: shareOf(common),
      color: COMMON_COLOR,
      label: t.dashboard.memberChargesCommon,
    },
  ]

  const spoken = tpl(
    t.dashboard.srMemberCharges,
    formatMoney(total, currency),
    member?.name ?? '',
    formatMoney(charges.own, currency),
    formatMoney(common, currency),
  )
  /* La feuille reprend le chiffre **et** la moitié qui vient du foyer : c'est
     celle des deux qu'on ne décide pas seul·e, donc celle dont on vient
     chercher l'explication, et une explication qui parle d'un montant qu'on ne
     voit plus oblige à refermer la feuille pour le retrouver. */
  const hint = tpl(t.dashboard.memberChargesOfWhich, formatMoney(common, currency))

  return (
    /* **Aucun chevron, et une feuille à la place.** Ses deux moitiés viennent
       de deux endroits — ses lignes du mois pour l'une, l'écran Répartition
       pour l'autre —, et un chevron unique promettrait un écran qui les
       montrerait ensemble : il n'y en a pas. Restait une tuile qui ne faisait
       rien, seule de la grille à porter deux montants sans que rien nulle part
       ne dise ce qu'ils sont — quand sa voisine, elle, mène à l'écran où son
       calcul est posé ligne à ligne.
       C'est exactement le cas que le DS §6 range sous « ouvre une feuille sur
       place », et que les quatre soldes de la grille du haut utilisent déjà :
       un chiffre à définir, pas un détail à ouvrir. Le glyphe d'information au
       coin, sans nom de destination, parce qu'il n'y en a pas.

       Toute la tuile est la cible, comme les soldes : à 152px de colonne, un
       bouton « i » et l'eyebrow ne tiennent pas côte à côte, et le glyphe du
       coin reste donc un repère et non une cible.

       **Sa légende n'est plus une `<ul>`, et c'est ce qui l'autorise.** Le DS
       §6 réserve le vrai lien aux tuiles « dont le contenu est une liste à
       lire » — une liste de personnes, une preuve qu'on suit ligne à ligne.
       Ces deux rangées-ci ne sont pas ça : ce sont les deux parts de l'anneau,
       nommées, et l'anneau porte déjà leur lecture parlée en une phrase
       (`srMemberCharges`). Un lecteur d'écran n'y perd donc rien, et un
       `<button>` n'admettrait pas la liste. */
    <Tile
      span={span}
      className="gap-3"
      onClick={() => {
        onExplain({ key: 'memberCharges', value: total, hint })
      }}
      label={tpl(t.dashboard.explain, t.dashboard.memberCharges)}
      affordance={{ kind: 'explain' }}
    >
      <Eyebrow icon={ChargesIcon}>{t.dashboard.memberCharges}</Eyebrow>
      <div className="flex min-h-0 flex-1 items-center gap-4">
        <Ring
          size={DONUT_SIZE}
          thickness={DONUT_THICKNESS}
          segments={segments}
          label={t.dashboard.memberCharges}
          srText={spoken}
          className="shrink-0"
        >
          {/* Sans centimes au centre de l'anneau, comme `BreakdownTile` : les
              deux lignes à côté les portent, et c'est là qu'on vérifie que le
              compte tombe. */}
          <Amount value={total} size="label" direction="out" withCents={false} />
        </Ring>
        {/* Le montant passe sous son libellé plutôt que de le tronquer : à
            320px la colonne posée à côté de l'anneau fait 152px, où « Charges
            perso » et son montant ne tiennent pas sur une ligne. Deux lignes
            par poste, quatre en tout, c'est ce que les 83px laissés à
            l'anneau permettent (voir `donut.ts`) — à condition qu'aucune
            lecture ne vienne se poser sous eux, et il n'y en a pas.

            **Et le libellé ne se tronquait pas non plus, en principe.** Il
            portait `truncate`, si bien que le `flex-wrap` ne se déclenchait
            jamais : la ligne tenait toujours, le libellé se faisait couper au
            milieu d'un mot, et l'on lisait « Part du c… » à 320px — c'est-à-dire
            plus rien. C'est ce que le DS §5 interdit. Sans lui, le libellé prend
            sa largeur et c'est le montant qui descend, comme écrit ici.

            Avec leurs centimes : les deux moitiés doivent redonner le total de
            la tuile Charges de la même page, et arrondies elles ne le
            redonnent plus (cahier §4.6). */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {/* `ml-auto` sur le montant plutôt que `flex-1` sur le libellé : le
              `flex-1` prenait toute la place restante, si bien que le repli
              promis par `flex-wrap` n'arrivait jamais — le libellé se cassait
              en deux lignes à l'intérieur de sa boîte et le montant, aligné sur
              la ligne de base, se posait entre les deux. À 320px, « Charges
              perso » tombait sur deux lignes avec son montant à mi-hauteur.
              Sans `flex-1`, la boîte du libellé fait sa largeur : la rangée
              tient sur une ligne tant qu'elle peut, et passe proprement à la
              ligne quand elle ne peut plus — d'où `gap-y-1`, qui n'avait
              personne à espacer jusqu'ici. */}
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="flex min-w-0 items-center gap-2">
              <Dot color={color} />
              <span className="t-label min-w-0">{t.dashboard.memberChargesOwn}</span>
            </span>
            <Amount value={charges.own} size="label" direction="out" className="ml-auto" />
          </p>
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="flex min-w-0 items-center gap-2">
              <Dot color={COMMON_COLOR} />
              <span className="t-label min-w-0">{t.dashboard.memberChargesCommon}</span>
            </span>
            <Amount value={common} size="label" direction="out" className="ml-auto" />
          </p>
        </div>
      </div>
    </Tile>
  )
}
