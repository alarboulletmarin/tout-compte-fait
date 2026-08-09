/* ============================================================================
 * Le réel posé sur le prévu — et c'est ce qui distingue un suivi d'un gadget.
 *
 * Le simulateur trace une courbe qu'on regarde et qu'on quitte. Ici la même
 * courbe porte des **points** : les relevés des comptes rattachés, aux dates où
 * ils ont été saisis. Aucune donnée nouvelle n'est nécessaire — tout est déjà
 * dans le document —, et pourtant la lecture change de nature : on ne demande
 * plus « qu'est-ce que ça donnerait », on voit « est-ce que ça suit ».
 *
 * **Le trait est une représentation, les points sont les faits.** C'est la règle
 * de `ValuationChart`, et elle vaut ici deux fois : entre deux relevés personne
 * ne sait ce que le capital valait, et au-delà d'aujourd'hui personne ne sait ce
 * qu'il vaudra. Le prévu est donc tireté sur toute sa longueur — c'est une
 * hypothèse d'un bout à l'autre —, et seuls les points sont pleins.
 *
 * **L'échelle part de zéro**, contrairement à la courbe d'un support : elle
 * porte une **cible**, et une cible mesurée depuis une base flottante ne dit
 * rien de la distance qui reste.
 *
 * Aucune librairie : le SVG maison, comme les cinq autres graphiques de l'app.
 * ==========================================================================*/

import { type YearMonth, addMonthsToYm, diffMonths, ymOf } from '@/domain/date'
import type { Money } from '@/domain/money'
import type { SavingValuation } from '@/domain/types'
import { supports } from '@/i18n/supports'
import { formatRoundedMoney, formatYearMonth, tpl } from '@/i18n/format'
import { polylinePath } from '@/charts/path'
import { useCurrency } from '@/ui/currency'

const HEIGHT = 120
const WIDTH = 240
/* La marge des autres graphiques : sans elle, le point du maximum tombe sur le
   bord et son trait de deux pixels s'y coupe en deux. */
const PAD = 6

export type GoalPoint = { month: YearMonth; amount: Money }

export function GoalChart({
  /** La trajectoire prévue, rang par rang depuis le mois courant. */
  planned,
  /** Le mois du premier rang — celui d'aujourd'hui. */
  from,
  /** Les relevés des comptes rattachés, du plus ancien au plus récent. */
  actual,
  target,
}: {
  planned: readonly Money[]
  from: YearMonth
  actual: readonly SavingValuation[]
  target: Money
}) {
  const currency = useCurrency()
  const months = planned.length - 1
  if (months <= 0) return null

  /* Les relevés antérieurs au premier rang tombent hors du cadre : la courbe
     commence aujourd'hui, et un point posé à gauche du départ n'aurait pas
     d'abscisse. Ils restent lisibles sur la fiche du compte, qui est leur
     écran. */
  const points = actual
    .map((valuation) => ({
      rank: diffMonths(from, ymOf(valuation.date)),
      amount: valuation.amount,
    }))
    .filter((point) => point.rank >= 0 && point.rank <= months)

  /* La cible est toujours dans l'échelle : c'est elle qu'on regarde, et une
     courbe qui la dépasserait hors cadre ne dirait pas qu'elle l'a dépassée. */
  const max = Math.max(target, ...planned, ...points.map((one) => one.amount)) || 1
  const yOf = (value: number): number => PAD + (1 - value / max) * (HEIGHT - 2 * PAD)
  const xOf = (rank: number): number => (rank / months) * WIDTH

  const plotted = planned.map((value, rank) => ({ x: xOf(rank), y: yOf(value) }))
  const arrival = planned.at(-1) ?? target

  return (
    <figure className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`}
        role="img"
        aria-label={tpl(supports.goalChartLabel, formatRoundedMoney(target, currency))}
        className="h-44 w-full"
        preserveAspectRatio="none"
      >
        {/* La cible, en filet horizontal : c'est la seule ligne du graphique
            qui soit un fait — quelqu'un l'a tapée. Le trait du prévu la
            croisera, ou non, et c'est cette intersection qu'on vient lire. */}
        <line
          x1={0}
          y1={yOf(target)}
          x2={WIDTH}
          y2={yOf(target)}
          stroke="var(--text-muted)"
          strokeWidth={1}
          strokeDasharray="2 3"
          vectorEffect="non-scaling-stroke"
        />

        <path
          d={polylinePath(plotted)}
          fill="none"
          stroke="var(--accent-2)"
          strokeWidth={2}
          /* Tireté d'un bout à l'autre : le prévu est une hypothèse sur toute sa
             longueur, et un trait plein promettrait une trajectoire. */
          strokeDasharray="5 4"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Les faits. Pleins et non tiretés : ce sont les seuls points du
            graphique que quelqu'un a relevés. */}
        {points.map((point) => (
          <circle
            key={`${String(point.rank)}-${String(point.amount)}`}
            cx={xOf(point.rank)}
            cy={yOf(point.amount)}
            r={3}
            fill="var(--accent)"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {/* Les deux bornes de l'axe du temps : un graphique sans échelle se croit
          sur parole. */}
      <div className="t-axis flex justify-between gap-3" aria-hidden="true">
        <span>{formatYearMonth(from)}</span>
        <span>{formatYearMonth(addMonthsToYm(from, months))}</span>
      </div>

      <figcaption className="sr-only-text">
        {tpl(
          supports.goalSrChart,
          formatRoundedMoney(planned[0] ?? target, currency),
          formatRoundedMoney(arrival, currency),
          formatYearMonth(addMonthsToYm(from, months)),
          points.length,
        )}
      </figcaption>
    </figure>
  )
}
