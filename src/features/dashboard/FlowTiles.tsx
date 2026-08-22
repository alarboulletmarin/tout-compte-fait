import { useNavigate } from 'react-router-dom'
import { FLOWS_PATH } from '@/app/routes'
import type { Flow } from '@/domain/stats'
import { t } from '@/i18n/strings'
import { formatMoney, tpl } from '@/i18n/format'
import { useMonthFlows } from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Eyebrow } from '@/ui/Eyebrow'
import { ChargesIcon, type IconComponent, IncomeIcon } from '@/ui/Icons'
import { Tile, type TileSpan } from '@/ui/Tile'
import { useCurrency } from '@/ui/currency'
/**
 * Les deux chiffres que les quatre soldes combinent sans jamais les dire :
 * ce qu'on gagne, et ce qu'on paie. Un solde répond « ce qu'il te reste », ce
 * qui ne répond pas à « combien je paie ce mois-ci ».
 *
 * Le chiffre est celui du mois entier, échéances prévues comprises : la
 * question se pose le 3 comme le 28, et un total qui s'arrêterait au confirmé
 * répondrait « presque rien » en début de mois. Ce qui reste à tomber se lit
 * en seconde lecture, là où les autres tuiles plates mettent la leur.
 *
 * **Elles occupent une demi-colonne, comme toute `2x1`.** Elles ont pris deux
 * colonnes sous 1024px, seules de tous les formats, pour rendre leur seconde
 * lecture visible sur un téléphone. Ça marchait — et ça coûtait les deux
 * rangées pleine largeur qui, avec celles de leurs voisines, faisaient du
 * tableau de bord une pile de cartes au lieu d'une grille. La grille bento est
 * faite de tuiles de tailles inégales (DS §5), et sur deux colonnes une paire
 * côte à côte est la seule façon d'en avoir : quatre blocs empilés n'en font
 * pas une, si inégales que soient leurs hauteurs.
 *
 * La seconde lecture suit donc le sort de toutes les tuiles plates : elle
 * s'affiche là où elle tient, à partir de 1024px, et reste dans le DOM
 * ailleurs. Ce qu'elle dit n'est perdu pour personne — le reste à payer se lit
 * sur les lignes du mois, où le clic mène précisément.
 *
 * **Le plafond de la demi-colonne, mesuré : ~100 000 € par mois.** À 320px elle
 * n'offre que 104px de contenu, et le chiffre y est déjà à son plancher de
 * 16px : onze caractères passent, douze non — « 99 999,99 € » tient,
 * « 123 456,78 € » se fait trancher au bord. C'est au-delà de ce qu'un budget
 * de foyer met sur un mois, et le cahier des charges ne promet rien d'autre.
 * Les gros montants de l'app ne sont pas ici mais sur le capital restant dû
 * d'un crédit, qui a la pleine largeur d'une `2x2` et renonce à ses centimes
 * pour cette raison précise.
 *
 * **Le clic mène à l'écran des revenus et des charges**, et ne fait plus
 * défiler vers la liste du mois. Filtrer la liste répondait « quelles lignes »
 * ; devant « Charges : 1 166 € », la question est autant « lesquelles » que
 * « à qui » et « communes ou perso », et c'est l'écran de détail qui répond aux
 * trois. Il porte le même mois et le même filtre — les deux vivent dans le
 * store, pas dans l'URL —, donc le chiffre qu'on vient de lire s'y retrouve au
 * centime.
 *
 * Elle est cliquable même sans ligne confirmée : l'écran de détail compte le
 * mois entier, échéances prévues comprises, comme le chiffre de la tuile. C'est
 * la condition qui manquait quand le clic menait à une liste de confirmées, où
 * ce chiffre-là n'était pas.
 */
function FlowTile({
  label,
  icon,
  flow,
  direction,
  hint,
  span,
}: {
  label: string
  icon: IconComponent
  flow: Flow
  direction: 'in' | 'out'
  hint: string
  span: TileSpan
}) {
  const navigate = useNavigate()

  return (
    <Tile
      span={span}
      className="justify-between"
      onClick={() => {
        void navigate(FLOWS_PATH)
      }}
      label={tpl(t.dashboard.showLines, label)}
      /* Un chevron, et sans nommer la destination : sur une 2×1 le repère
         descend au coin bas, par-dessus un chiffre taillé pour remplir la
         tuile, et un nom d'écran y mordrait sur les centimes. */
      affordance={{ kind: 'navigate' }}
    >
      <Eyebrow icon={icon}>{label}</Eyebrow>
      <div className="flex flex-wrap items-baseline gap-x-2">
        {/* Un flux, pas un solde : la valeur est absolue, et le « + » du DS §3
            distingue l'une de l'autre les deux tuiles voisines. */}
        <Amount value={flow.total} size="tile-fit" direction={direction} />
        {/* Lue par un lecteur d'écran quoi qu'il arrive, affichée dès que la
            tuile est assez large pour la porter — c'est la tuile qui décide,
            pas l'écran (voir `.tile-hint`). */}
        <span className="t-label tile-hint">{hint}</span>
      </div>
    </Tile>
  )
}

export function IncomeTile() {
  const { income } = useMonthFlows()
  const currency = useCurrency()

  const hint =
    income.total === 0
      ? t.dashboard.incomeNone
      : income.left > 0
        ? tpl(t.dashboard.incomeLeft, formatMoney(income.left, currency, false))
        : t.dashboard.incomeAllIn

  return (
    <FlowTile
      label={t.dashboard.income}
      icon={IncomeIcon}
      flow={income}
      direction="in"
      hint={hint}
      span="2x1"
    />
  )
}

/* Les charges sont la seule des deux à voir son format bouger : sur le pot
   commun, les revenus s'en vont — le pot n'en a aucun — et il ne reste pas de
   voisine à qui se ranger à côté. La paire est alors dissoute, et une demi-
   colonne seule laisse un trou que rien ne comble. */
export function ChargesTile({ span = '2x1' }: { span?: TileSpan }) {
  const { spending } = useMonthFlows()
  const currency = useCurrency()

  const hint =
    spending.total === 0
      ? t.dashboard.chargesNone
      : spending.left > 0
        ? tpl(t.dashboard.chargesLeft, formatMoney(spending.left, currency, false))
        : t.dashboard.chargesAllPaid

  return (
    <FlowTile
      label={t.dashboard.charges}
      icon={ChargesIcon}
      flow={spending}
      direction="out"
      hint={hint}
      span={span}
    />
  )
}
