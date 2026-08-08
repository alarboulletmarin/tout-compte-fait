import { today } from '@/domain/date'
import { nextIncomeDate } from '@/domain/stats'
import { t } from '@/i18n/strings'
import {
  useIsCommonFilter,
  useIsCurrentMonth,
  useMonthEntries,
  useMonthTotals,
  useRestToLive,
} from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { ForecastIcon } from '@/ui/Icons'
import { Row, RowGroup } from '@/ui/RowGroup'
import type { Metric } from './MetricInfo'

/**
 * Les deux soldes qui projettent le mois : où il atterrit, et ce qui reste
 * d'ici la prochaine paie.
 *
 * **Deux rangées, et non deux tuiles**, seules de tout le tableau de bord à
 * quitter la grille. La raison n'est pas la hiérarchie — c'est qu'elles
 * annoncent régulièrement **le même montant au centime**, et qu'aucune tuile
 * plate ne peut dire pourquoi. Sans rentrée d'argent restant à venir,
 * `restToLive` prend la fin du mois pour horizon, donc exactement celui du
 * prévisionnel : deux chiffres identiques, deux libellés différents, et la
 * phrase qui les sépare masquée sous 1024px par le seuil des tuiles plates
 * (voir `.tile-hint`). Une microcopy qui n'existe qu'au-delà de 1024px
 * n'existe pas là où on lit ce mois-ci.
 *
 * La `description` d'une rangée, elle, passe à la ligne : les deux horizons se
 * lisent à toutes les largeurs, et la coïncidence s'explique au lieu de passer
 * pour une erreur de calcul. C'est le seul format connu qui tienne cette
 * promesse — et c'est pour ça, et pour rien d'autre, que ces deux-là sont
 * sorties du bento.
 *
 * Les autres lectures dérivées restent des tuiles : la capacité d'épargne est
 * une `4x1` pleine largeur, où ses deux clauses tiennent déjà.
 *
 * Chacune ouvre sa feuille d'explication, qui donne le calcul et ce qui les
 * sépare l'une de l'autre. Le repère de la rangée le dit — glyphe
 * d'information, pas chevron : rien ne mène ailleurs, la feuille s'ouvre sur
 * place.
 *
 * Elle s'efface entière sur le commun, pour la raison qui y efface le solde :
 * le pot n'a aucun revenu, et deux lectures qui soustraient des charges à des
 * ressources y vaudraient les charges, au signe près.
 */
export function SituationSection({ onExplain }: { onExplain: (metric: Metric) => void }) {
  const totals = useMonthTotals()
  const remaining = useRestToLive()
  const entries = useMonthEntries()
  const common = useIsCommonFilter()
  const thisMonth = useIsCurrentMonth()

  if (common) return null

  /* « Reste à vivre » se lit depuis aujourd'hui, pas depuis le mois affiché :
     sur un mois passé l'horizon est déjà derrière, sur un mois à venir il est
     encore devant. Le chiffre se calcule dans les deux cas et ne veut rien dire
     ni dans l'un ni dans l'autre — d'où la rangée absente plutôt que fausse. */
  const remainingHint =
    nextIncomeDate(entries, today()) === null
      ? t.dashboard.remainingNoIncome
      : t.dashboard.remainingHint

  return (
    <RowGroup title={t.dashboard.situation} icon={ForecastIcon}>
      <Row
        label={t.dashboard.forecast}
        description={t.dashboard.forecastHint}
        affordance="explain"
        trailing={<Amount value={totals.forecastBalance} />}
        onClick={() => {
          onExplain({
            key: 'forecast',
            value: totals.forecastBalance,
            hint: t.dashboard.forecastHint,
          })
        }}
      />
      {thisMonth && (
        <Row
          label={t.dashboard.remaining}
          description={remainingHint}
          affordance="explain"
          trailing={<Amount value={remaining} tone={remaining < 0 ? 'danger' : 'default'} />}
          onClick={() => {
            onExplain({ key: 'remaining', value: remaining, hint: remainingHint })
          }}
        />
      )}
    </RowGroup>
  )
}
