/* ============================================================================
 * Le tracé d'une projection : une courbe par hypothèse, et l'aire de ce qu'on
 * a versé en dessous.
 *
 * **L'aire, et non une quatrième courbe.** Les versements cumulés devaient
 * « rendre les intérêts visibles » (cahier §4.6 ter) ; tracés en trait, ils
 * n'étaient qu'une ligne de plus à distinguer des autres. Remplis, ils
 * découpent le graphique en deux lectures qui n'ont pas besoin d'être
 * expliquées : ce qui vient de la poche, et ce qui vient du taux. C'est aussi
 * ce qui libère la troisième couleur de trait — l'app n'en a que trois qui
 * tiennent le contraste de 3:1 dans les deux thèmes.
 *
 * **L'échelle part de zéro**, contrairement à la courbe d'un support
 * (`features/savings/ValuationChart.tsx`), qui part de son minimum relevé.
 * Elle le doit : l'aire des versements n'a de sens que mesurée depuis zéro, et
 * une base flottante lui ferait dire n'importe quoi.
 *
 * Aucune librairie, comme les quatre autres graphiques de l'app.
 * ==========================================================================*/

import type { Money } from '@/domain/money'
import { formatRoundedMoney } from '@/i18n/format'
import { projection } from '@/i18n/projection'
import { polylinePath } from '@/charts/path'
import { ChartAxis, type AxisTick } from '@/charts/ChartAxis'
import { useCurrency } from '@/ui/currency'
import { formatDuration } from './duration'

const HEIGHT = 120
const WIDTH = 240
/* La marge des autres graphiques : sans elle, le point du maximum tombe sur le
   bord et son trait de deux pixels s'y coupe en deux. */
const PAD = 6

/**
 * Le nombre de points réellement tracés.
 *
 * Une projection sur cinquante ans porte six cent un points mensuels, pour un
 * tracé large de trois cents pixels à l'écran : deux points par pixel, dont
 * aucun ne se voit, et un attribut `d` de douze kilo-octets posé dans le DOM.
 * Cent vingt suffisent à rendre une courbe lisse — et le dernier point est
 * toujours gardé, parce que c'est le seul dont le montant est écrit ailleurs.
 */
const MAX_POINTS = 120

export type ProjectionSerie = {
  id: string
  /** Ce que la courbe est : « 5 % · Hypothèse ». */
  label: string
  /** Le chiffre qui se lit sous l'étiquette — l'arrivée, ou le versement requis. */
  value: string
  color: string
  /** Le trait d'une hypothèse est tireté, celui d'un taux garanti est plein. */
  dashed: boolean
  values: readonly Money[]
}

export type ProjectionArea = {
  label: string
  value: string
  values: readonly Money[]
}

/** Un point sur deux, ou sur cinq — mais jamais sans le dernier. */
function sampled(values: readonly Money[]): { value: number; index: number }[] {
  const step = Math.max(1, Math.ceil(values.length / MAX_POINTS))
  const points: { value: number; index: number }[] = []
  for (let index = 0; index < values.length; index += step) {
    points.push({ value: values[index] ?? 0, index })
  }
  const last = values.length - 1
  if (points.at(-1)?.index !== last && last >= 0) {
    points.push({ value: values[last] ?? 0, index: last })
  }
  return points
}

/**
 * L'aire, fermée sur la ligne de base.
 *
 * Le contour du dessus est la polyligne des versements ; les deux segments qui
 * la referment descendent à zéro aux extrémités. Écrit ici et non par
 * `charts/path.ts`, qui ne connaît que des traits : une aire n'a de sens que
 * lorsqu'une base existe, et aucun autre graphique de l'app n'en a une.
 */
function areaPath(points: readonly { x: number; y: number }[], baseY: number): string {
  const first = points[0]
  const last = points.at(-1)
  if (first === undefined || last === undefined) return ''
  const top = polylinePath(points)
  return `${top} L ${String(last.x)} ${String(baseY)} L ${String(first.x)} ${String(baseY)} Z`
}

export function ProjectionChart({
  months,
  series,
  area,
  label,
  srText,
}: {
  months: number
  series: readonly ProjectionSerie[]
  area?: ProjectionArea
  label: string
  srText: string
}) {
  const currency = useCurrency()

  const all = [...series.flatMap((serie) => [...serie.values]), ...(area?.values ?? [])]
  /* Zéro est toujours dans l'échelle : c'est la base de l'aire. Le `|| 1` évite
     la division par zéro d'une projection entièrement nulle — la ligne se pose
     alors au bas du cadre, ce qu'elle est. */
  const max = Math.max(0, ...all) || 1
  const yOf = (value: number): number => PAD + (1 - value / max) * (HEIGHT - 2 * PAD)
  const xOf = (index: number): number => (months === 0 ? 0 : (index / months) * WIDTH)
  const plot = (values: readonly Money[]): { x: number; y: number }[] =>
    sampled(values).map((point) => ({ x: xOf(point.index), y: yOf(point.value) }))

  const ticks: AxisTick[] = [max, max / 2, 0].map((value) => ({
    pct: (yOf(value) / HEIGHT) * 100,
    text: formatRoundedMoney(value as Money, currency),
  }))

  return (
    <div className="flex flex-col gap-3">
      {/* La lecture au-dessus du tracé, qui tient lieu de légende — le motif des
          deux autres graphiques de l'app. Chaque entrée porte son trait, son
          libellé et son chiffre : la couleur ne désigne donc jamais seule. */}
      <div aria-hidden="true" className="flex flex-wrap gap-x-6 gap-y-2">
        {series.map((serie) => (
          <div key={serie.id} className="flex min-w-0 flex-col gap-0.5">
            <span className="flex min-w-0 items-center gap-1.5">
              {/* Le tireté de la légende reprend celui du trait : c'est la
                  forme, et non la teinte, qui dit garanti ou hypothèse — une
                  distinction qui ne survit pas au niveau de gris n'en est pas
                  une (DS §2.3). */}
              <span
                className="h-0.5 w-4 shrink-0 rounded-chip"
                style={
                  serie.dashed
                    ? {
                        backgroundImage: `repeating-linear-gradient(90deg, ${serie.color} 0 5px, transparent 5px 9px)`,
                      }
                    : { backgroundColor: serie.color }
                }
              />
              <span className="t-label tnum min-w-0 truncate">{serie.label}</span>
            </span>
            <span className="t-num-body tnum">{serie.value}</span>
          </div>
        ))}
        {area !== undefined && (
          <div className="flex min-w-0 flex-col gap-0.5 border-l border-border pl-3">
            <span className="flex min-w-0 items-center gap-1.5">
              {/* Un carré plein, pas un trait : ce qu'il désigne est une aire. */}
              <span className="size-3 shrink-0 rounded-[3px] bg-surface-2 ring-1 ring-border" />
              <span className="t-label min-w-0 truncate">{area.label}</span>
            </span>
            <span className="t-num-body tnum">{area.value}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <ChartAxis ticks={ticks} height="h-40" />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <svg
            viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`}
            role="img"
            aria-label={label}
            className="h-40 w-full"
            preserveAspectRatio="none"
          >
            {ticks.map((tick) => (
              <line
                key={tick.pct}
                x1={0}
                y1={(tick.pct / 100) * HEIGHT}
                x2={WIDTH}
                y2={(tick.pct / 100) * HEIGHT}
                stroke="var(--border)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {area !== undefined && (
              <path d={areaPath(plot(area.values), yOf(0))} fill="var(--surface-2)" />
            )}
            {series.map((serie) => (
              <path
                key={serie.id}
                d={polylinePath(plot(serie.values))}
                fill="none"
                stroke={serie.color}
                strokeWidth={2}
                strokeDasharray={serie.dashed ? '5 4' : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>

          {/* Les deux bornes de l'axe du temps, comme la courbe d'un support :
              un graphique sans échelle se croit sur parole. Les rangs
              intermédiaires, eux, sont dans le tableau des jalons — c'est lui
              la lecture précise, une courbe ne se lit pas au doigt. */}
          <div className="t-axis flex justify-between gap-3" aria-hidden="true">
            <span>{projection.start}</span>
            <span>{formatDuration(months)}</span>
          </div>
        </div>
      </div>

      <p className="sr-only-text">{srText}</p>
    </div>
  )
}
