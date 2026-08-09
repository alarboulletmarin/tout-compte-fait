/* ============================================================================
 * Le tracé d'une simulation — et c'est la pièce maîtresse de l'écran, pas son
 * illustration.
 *
 * **Une fourchette en aire, et non trois courbes.** L'écran superposait jusqu'à
 * trois traits, un par hypothèse, ce qui posait à qui le lisait une question
 * qu'aucune donnée ne tranche : laquelle croire. Une aire ne demande pas de
 * choisir — elle montre l'écart, et l'écart *est* la réponse honnête. Elle se
 * referme d'elle-même quand il n'y a plus d'incertitude à montrer, c'est-à-dire
 * quand tous les comptes portent leur taux : il ne reste alors qu'un trait, ce
 * qui est exact.
 *
 * **Les versements restent une aire en dessous.** Le haut de la pile — versé,
 * puis rendement — est la borne basse du capital ; la fourchette s'ouvre
 * au-dessus. C'est la seule représentation qui réponde d'un coup d'œil aux deux
 * questions que l'écran existe pour poser : quelle part vient de la poche, et
 * quelle part dépend d'un taux que personne ne connaît.
 *
 * **Il se lit au doigt.** Le tableau des paliers donnait quatre rangs et rien
 * entre eux ; le curseur donne n'importe quel rang, avec sa décomposition. C'est
 * le même `charts/ChartCursor` que l'historique — un seul arrêt de tabulation,
 * les flèches pour se déplacer, le survol qui lit sans voler le focus.
 *
 * **L'échelle part de zéro**, contrairement à la courbe d'un support
 * (`features/savings/ValuationChart.tsx`), qui part de son minimum relevé. Elle
 * le doit : une aire mesurée depuis une base flottante ne dit rien.
 *
 * Aucune librairie, comme les quatre autres graphiques de l'app.
 * ==========================================================================*/

import { useState } from 'react'
import type { Money } from '@/domain/money'
import { formatRoundedMoney, tpl } from '@/i18n/format'
import { projection } from '@/i18n/projection'
import { bandPath, polylinePath } from '@/charts/path'
import { ChartAxis, type AxisTick } from '@/charts/ChartAxis'
import { ChartCursor } from '@/charts/ChartCursor'
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

/**
 * Le nombre d'arrêts du curseur, et il est bien plus bas que celui des points.
 *
 * Une période de lecture se vise au doigt : vingt-quatre sur les ~250px utiles
 * d'un téléphone en donnent dix, ce qui est déjà sous les 44px du DS §6 — et
 * l'écart est le même que celui, mesuré et inscrit à l'architecture, des douze
 * mois de l'historique. Cent vingt en donneraient deux, c'est-à-dire aucune.
 * L'écart est tenu ailleurs : la lecture existe au clavier, le tableau des
 * paliers porte les rangs qui comptent, et le résultat porte l'arrivée.
 */
const MAX_STOPS = 24

export type ProjectionArea = {
  label: string
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

/** Les rangs où le curseur s'arrête : le départ, l'arrivée, et l'entre-deux. */
function stops(months: number): number[] {
  const count = Math.min(MAX_STOPS, months + 1)
  if (count <= 1) return [0]
  const marks: number[] = []
  for (let stop = 0; stop < count; stop += 1) {
    const mark = Math.round((months * stop) / (count - 1))
    if (!marks.includes(mark)) marks.push(mark)
  }
  return marks
}

export type ProjectionChartProps = {
  months: number
  /** La borne basse — celle qui promet le moins, et le trait qu'on lit. */
  low: readonly Money[]
  /** La borne haute. Confondue avec la basse quand il n'y a rien d'incertain. */
  high: readonly Money[]
  /** Les deux bornes coïncident : un seul trait, et aucune aire de fourchette. */
  single: boolean
  /** Tout ce qui court est contractuel : le trait est plein, jamais tireté. */
  guaranteed: boolean
  area?: ProjectionArea
  label: string
  srText: string
}

export function ProjectionChart({
  months,
  low,
  high,
  single,
  guaranteed,
  area,
  label,
  srText,
}: ProjectionChartProps) {
  const currency = useCurrency()
  const marks = stops(months)
  /* La lecture s'ouvre sur l'arrivée : c'est le chiffre qu'on vient chercher, et
     un graphique qui s'ouvrirait sur son premier mois montrerait zéro. Elle
     reste ensuite où on l'a laissée — un tracé qui se vide dès que le pointeur
     sort oblige à viser pour relire (`ChartCursor`). */
  const [read, setRead] = useState(marks.length - 1)
  /* Changer d'horizon renvoie la lecture à l'arrivée. Sans ça, passer de vingt
     ans à cinq laisserait le curseur au rang qu'il occupait, c'est-à-dire à un
     endroit que personne n'a désigné — et un rang au-delà du dernier lirait la
     dernière valeur en montrant le trait ailleurs. Ajusté au rendu, la forme que
     React donne à un état qui doit se remettre à zéro quand une valeur change. */
  const [span, setSpan] = useState(marks.length)
  if (span !== marks.length) {
    setSpan(marks.length)
    setRead(marks.length - 1)
  }
  const shown = Math.min(read, marks.length - 1)
  const at = marks[shown] ?? months

  const all = [...low, ...high, ...(area?.values ?? [])]
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

  const money = (value: Money | undefined): string =>
    tpl(projection.approx, formatRoundedMoney(value ?? (0 as Money), currency))
  const when = at === 0 ? projection.start : tpl(projection.chartAt, formatDuration(at))

  const lowPoints = plot(low)
  const highPoints = plot(high)
  const baseline = lowPoints.map((point) => ({ x: point.x, y: yOf(0) }))
  const areaTop = area === undefined ? [] : plot(area.values)

  return (
    <div className="flex flex-col gap-3">
      {/* La lecture au-dessus du tracé, qui tient lieu de légende — le motif des
          deux autres graphiques de l'app. Chaque entrée porte sa marque, son
          libellé et son chiffre : la couleur ne désigne donc jamais seule.
          Elle suit le curseur, et c'est ce qui fait du graphique une lecture
          plutôt qu'une image : le même bloc dit l'arrivée à l'ouverture et
          n'importe quel rang une fois qu'on y a promené le doigt. */}
      <div aria-hidden="true" className="flex flex-col gap-2">
        <span className="t-eyebrow text-text-muted">{when}</span>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="flex min-w-0 items-center gap-1.5">
              {/* Le tireté de la légende reprend celui du trait : c'est la
                  forme, et non la teinte, qui dit garanti ou hypothèse — une
                  distinction qui ne survit pas au niveau de gris n'en est pas
                  une (DS §2.3). */}
              <span
                className="h-0.5 w-4 shrink-0 rounded-chip"
                style={
                  guaranteed
                    ? { backgroundColor: 'var(--accent-2)' }
                    : {
                        backgroundImage:
                          'repeating-linear-gradient(90deg, var(--accent-2) 0 5px, transparent 5px 9px)',
                      }
                }
              />
              <span className="t-label min-w-0 truncate">
                {single ? projection.chartCapital : projection.chartRange}
              </span>
            </span>
            <span className="t-num-body tnum">
              {single
                ? money(low[at])
                : tpl(projection.rangeShort, money(low[at]), money(high[at]))}
            </span>
          </div>
          {area !== undefined && (
            <div className="flex min-w-0 flex-col gap-0.5 border-l border-border pl-3">
              <span className="flex min-w-0 items-center gap-1.5">
                {/* Un carré plein, pas un trait : ce qu'il désigne est une aire. */}
                <span className="size-3 shrink-0 rounded-[3px] bg-surface-2 ring-1 ring-border" />
                <span className="t-label min-w-0 truncate">{area.label}</span>
              </span>
              <span className="t-num-body tnum">{money(area.values[at])}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <ChartAxis ticks={ticks} height="h-56" />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="relative">
            <svg
              viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`}
              role="img"
              aria-label={label}
              className="h-56 w-full"
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

              {area !== undefined && <path d={bandPath(areaTop, baseline)} fill="var(--surface-2)" />}

              {/* La bande du rendement : entre le versé et la borne basse du
                  capital. Teintée de l'accent à faible opacité plutôt que d'une
                  couleur de plus : la palette n'en a pas de quatrième qui tienne
                  le contraste, et une aire n'a pas à en tenir un — c'est le
                  trait posé dessus qui porte la lecture. */}
              {area !== undefined && (
                <path d={bandPath(lowPoints, areaTop)} fill="var(--accent)" opacity={0.22} />
              )}

              {/* L'aire de la fourchette : entre les deux bornes, et c'est elle
                  qui remplace les trois courbes d'avant. Plus claire que la
                  bande du rendement, parce qu'elle dit exactement l'inverse —
                  celle du dessous est ce que le calcul produit, celle-ci est ce
                  qu'il ne sait pas. */}
              {!single && (
                <path
                  d={bandPath(highPoints, lowPoints)}
                  fill="var(--accent-2)"
                  opacity={0.16}
                />
              )}

              {[
                { id: 'low', points: lowPoints },
                ...(single ? [] : [{ id: 'high', points: highPoints }]),
              ].map((line) => (
                <path
                  key={line.id}
                  d={polylinePath(line.points)}
                  fill="none"
                  stroke="var(--accent-2)"
                  strokeWidth={2}
                  strokeDasharray={guaranteed ? undefined : '5 4'}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              {/* Le repère de lecture, à l'aplomb du rang lu. Un trait et non un
                  point par borne : deux points sur une même verticale se
                  chevauchent dès que la fourchette est étroite, alors que la
                  verticale dit exactement la même chose — *où* on lit. Les
                  montants, eux, sont écrits au-dessus. */}
              <line
                x1={xOf(at)}
                y1={0}
                x2={xOf(at)}
                y2={HEIGHT}
                stroke="var(--text-muted)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            <ChartCursor
              labels={marks.map((mark) =>
                mark === 0 ? projection.start : tpl(projection.chartAt, formatDuration(mark)),
              )}
              shown={shown}
              onShow={setRead}
              label={projection.chartCursor}
            />
          </div>

          {/* Les deux bornes de l'axe du temps, comme la courbe d'un support :
              un graphique sans échelle se croit sur parole. */}
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
