import type { SavingValuation } from '@/domain/types'
import { formatDate, formatMoney, tpl } from '@/i18n/format'
import { t } from '@/i18n/strings'
import { polylinePath } from '@/charts/path'
import { useCurrency } from '@/ui/currency'

const HEIGHT = 88
const WIDTH = 240
/* Sans marge, le point du maximum tombe exactement sur le bord et son trait de
   deux pixels s'y coupe en deux. C'est la marge des deux autres graphiques. */
const PAD = 6

/**
 * L'évolution d'un support, relevé par relevé.
 *
 * **Ne sont tracés que les points relevés.** Le trait qui les relie est une
 * représentation, pas une donnée : entre le 8 juin et le 8 juillet, personne ne
 * sait ce que le PEA valait, et une interpolation lue comme un historique
 * inventerait trente jours de valeurs. C'est la règle du cahier §4.7 appliquée
 * au stock — « les périodes sans donnée affichent un état vide explicite, pas un
 * graphique à zéro » —, et c'est pour ça que les points restent visibles sur le
 * trait : ce sont eux les faits.
 *
 * L'échelle part du **minimum relevé**, pas de zéro : un capital qui passe de
 * 17 200 € à 18 320 € sur une échelle partant de zéro est une ligne plate, donc
 * un graphique qui ne dit rien. La lecture chiffrée est juste en dessous, sur la
 * fiche, et c'est elle qui porte les montants.
 *
 * Aucune librairie : le SVG maison, comme les trois autres graphiques de l'app.
 */
export function ValuationChart({
  valuations,
  color,
}: {
  /** Du plus récent au plus ancien — l'ordre de `valuationsOf`. */
  valuations: readonly SavingValuation[]
  color: string
}) {
  const currency = useCurrency()
  // Le temps va de gauche à droite : la liste, elle, se lit du plus récent.
  const points = [...valuations].reverse()
  const first = points[0]
  const last = points.at(-1)
  if (first === undefined || last === undefined || points.length < 2) return null

  const amounts = points.map((valuation) => valuation.amount)
  const min = Math.min(...amounts)
  const max = Math.max(...amounts)
  /* Un support qui n'a jamais bougé donnerait une division par zéro : sa ligne
     se pose alors au milieu, ce qu'elle est — plate. */
  const span = max - min === 0 ? 1 : max - min
  const slot = points.length === 1 ? 0 : (WIDTH - 2 * PAD) / (points.length - 1)

  const plotted = points.map((valuation, index) => ({
    x: PAD + index * slot,
    y: PAD + (1 - (valuation.amount - min) / span) * (HEIGHT - 2 * PAD),
  }))

  return (
    <figure className="flex flex-col gap-1">
      <svg
        viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`}
        preserveAspectRatio="none"
        className="h-24 w-full"
        role="img"
        aria-label={tpl(
          t.savings.srHistory,
          formatMoney(first.amount, currency, false),
          formatDate(first.date),
          formatMoney(last.amount, currency, false),
          formatDate(last.date),
        )}
      >
        {/* `vector-effect` garde le trait à deux pixels malgré l'étirement
            horizontal du `preserveAspectRatio` : sans lui, il s'épaissit avec
            la largeur de l'écran. */}
        <path
          d={polylinePath(plotted)}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {plotted.map((point, index) => (
          <circle
            key={points[index]?.id ?? String(index)}
            cx={point.x}
            cy={point.y}
            r={2.5}
            fill={color}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      {/* Les deux bornes, en clair : un graphique sans échelle se croit sur
          parole, et celui-ci ne part pas de zéro. */}
      <figcaption className="t-axis flex justify-between gap-3">
        <span>{formatDate(first.date)}</span>
        <span>{formatDate(last.date)}</span>
      </figcaption>
    </figure>
  )
}
