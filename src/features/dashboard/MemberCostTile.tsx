import { type Money, add } from '@/domain/money'
import { fr } from '@/i18n/fr'
import { tpl } from '@/i18n/format'
import { useMemberCharges, useMemberFilter, useMemberMap } from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Eyebrow } from '@/ui/Eyebrow'
import { ChargesIcon } from '@/ui/Icons'
import { Tile } from '@/ui/Tile'

/** Un terme de la somme, et ce qu'il vaut. Le gabarit d'« À verser ». */
function Line({ label, value }: { label: string; value: Money }) {
  return (
    <li className="flex items-baseline gap-2">
      <span className="t-label min-w-0 flex-1 truncate">{label}</span>
      <Amount value={value} size="label" direction="out" className="shrink-0" />
    </li>
  )
}

/**
 * Ce que le mois coûte réellement à la personne filtrée, et de quoi ce coût est
 * fait : ce qu'elle paie pour elle, plus sa part du pot commun.
 *
 * **C'est la tuile Charges décomposée, et c'est tout ce qu'elle est.** Le
 * chiffre de tête vaut celui de Charges au centime — délibérément : un total
 * qu'on retrouve à l'identique est ce qui autorise à lire les deux lignes
 * dessous comme ses deux moitiés. Charges les mêle sans les séparer, et cette
 * séparation-là ne se fait nulle part ailleurs sur l'écran du mois : les
 * chiffres d'un mois filtré comprennent déjà la part du pot commun — sans quoi
 * chacun se lirait comme s'il vivait sans loyer —, mais une fois fondue dans le
 * total, cette part ne se voit plus. Le solde du mois valait bien ses revenus
 * moins ses charges moins sa part du foyer, et le troisième terme n'était à
 * l'écran nulle part.
 *
 * **Elle vit à côté d'« À verser sur le commun » et ne s'y confond pas.** Les
 * deux tuiles portent la même forme — un chiffre, puis les deux termes qui le
 * donnent — et c'est ce qui les distingue le mieux : l'une additionne un
 * virement, l'autre un coût. Le report du mois précédent n'est donc ici nulle
 * part, et c'est la règle : ce qu'une dépense a coûté à quelqu'un est arrêté au
 * mois où elle a eu lieu ; ce qui se rattrape est un virement, pas un coût.
 *
 * « Sa part du commun » porte le même libellé sur les deux tuiles parce que
 * c'est le même montant : deux noms pour un nombre, sur un même écran, se
 * lisent comme deux nombres qui tombent juste par hasard.
 *
 * **Aucun repère d'action, parce qu'aucun clic.** Ses deux lignes mènent à deux
 * endroits — les lignes du mois pour le perso, l'écran Répartition pour la
 * part —, et le DS §6 tranche : un chevron promet un écran, et il n'y en a pas
 * un. Une tuile sans repère est une tuile qu'on lit.
 *
 * Elle s'efface dès qu'un des deux termes est nul : hors filtre et sans charge
 * commune, il n'y a rien à séparer, et une somme dont un terme vaut zéro n'est
 * pas une somme — Charges dit alors déjà tout, et cette tuile ne ferait que le
 * répéter avec une ligne à zéro.
 */
export function MemberCostTile() {
  const charges = useMemberCharges()
  const filter = useMemberFilter()
  const members = useMemberMap()

  if (filter === undefined || charges === null) return null
  if (charges.own <= 0 || charges.common <= 0) return null

  const member = members.get(filter)
  const cost = add(charges.own, charges.common)

  return (
    /* `4x2`, comme sa voisine et pour la même raison : elle aligne des montants
       là où la Répartition aligne des pourcentages. « 1 659,83 € » prend 68 des
       94 pixels qu'une demi-colonne laisserait, et deux rangées sont ce que le
       chiffre plus ses deux termes demandent. */
    <Tile
      span="4x2"
      className="gap-3"
      /* Le nom du membre nomme la région : rien dans le contenu ne le porte, il
         vient du filtre — et un lecteur d'écran parcourt les régions d'une page
         hors de leur voisinage. */
      label={tpl(fr.dashboard.memberCostOf, member?.name ?? '')}
    >
      <Eyebrow icon={ChargesIcon}>{fr.dashboard.memberCost}</Eyebrow>
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-1">
        <Amount value={cost} size="tile-fit" direction="out" />
        {/* Le perso d'abord : c'est le terme qu'on ne trouve nulle part
            ailleurs, quand la part du commun se relit sur la tuile voisine et
            sur l'écran Répartition. */}
        <ul className="flex flex-col gap-1 border-t border-border pt-2">
          <Line label={fr.dashboard.memberCostOwn} value={charges.own} />
          <Line label={fr.dashboard.memberShareCommon} value={charges.common} />
        </ul>
      </div>
    </Tile>
  )
}
