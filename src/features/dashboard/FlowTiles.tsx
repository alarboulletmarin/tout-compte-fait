import type { Flow } from '@/domain/stats'
import { t } from '@/i18n/strings'
import { formatMoney, tpl } from '@/i18n/format'
import { useMonthFlows } from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Eyebrow } from '@/ui/Eyebrow'
import { ChargesIcon, type IconComponent, IncomeIcon } from '@/ui/Icons'
import { Tile } from '@/ui/Tile'
import { useCurrency } from '@/ui/currency'
/** Ce qu'une tuile de flux fait au clic, quand il y a des lignes à montrer.
 *  Elle passe une nature, pas un sens : la liste filtre comme la tuile compte
 *  — charges et crédits d'un côté, ressources de l'autre, épargne à part. */
export type ShowNature = (nature: 'expense' | 'income') => void

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
 * Le clic filtre la liste du mois sur cette nature-là et l'amène sous les
 * yeux. Sur la nature, pas le sens : la tuile Charges exclut l'épargne, et un
 * clic qui ouvrirait une liste où les versements d'épargne se mêlent aux
 * courses montrerait plus que le chiffre qu'on vient de lire. Il ouvrait une
 * feuille qui définissait le chiffre : devant « Charges : 1 166 € », la
 * question suivante n'est pas « qu'est-ce qu'une charge » mais « lesquelles ».
 * Le rangement de la liste n'y touche pas — filtrer n'est pas ranger, et l'axe
 * choisi est celui de l'utilisateur.
 *
 * Sans ligne confirmée de cette nature, la tuile n'est pas cliquable : mieux
 * vaut qu'elle ne réponde pas que de mener à une liste où son chiffre n'est
 * pas.
 */
function FlowTile({
  label,
  icon,
  flow,
  direction,
  nature,
  hint,
  onShow,
}: {
  label: string
  icon: IconComponent
  flow: Flow
  direction: 'in' | 'out'
  nature: 'expense' | 'income'
  hint: string
  onShow?: ShowNature
}) {
  return (
    <Tile
      span="2x1"
      className="justify-between"
      {...(onShow === undefined
        ? {}
        : {
            onClick: () => {
              onShow(nature)
            },
            label: tpl(t.dashboard.showLines, label),
            // Une flèche vers le bas, pas un chevron : la liste est plus bas
            // sur cette page, elle n'est pas sur un autre écran.
            affordance: { kind: 'scroll' as const, destination: t.month.entries },
          })}
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

export function IncomeTile({ onShow }: { onShow?: ShowNature }) {
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
      nature="income"
      hint={hint}
      {...(onShow === undefined ? {} : { onShow })}
    />
  )
}

export function ChargesTile({ onShow }: { onShow?: ShowNature }) {
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
      nature="expense"
      hint={hint}
      {...(onShow === undefined ? {} : { onShow })}
    />
  )
}
