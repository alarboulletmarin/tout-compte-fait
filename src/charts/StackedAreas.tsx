/* ============================================================================
 * Des aires empilées — une bande par compte, et le haut de la pile *est* le
 * total.
 *
 * **On n'empile que ce qui s'additionne**, et c'est la seule condition. Trois
 * hypothèses de rendement posées sur le même versé ne s'additionnent pas : les
 * empiler tracerait un capital que personne n'a, et le cahier §4.6 ter
 * l'interdit à juste titre. Cinq supports d'épargne, si — leur somme *est* le
 * patrimoine —, et c'est ce qui autorise cette figure là où l'autre était
 * refusée.
 *
 * **La couleur ne dit jamais seule ce qu'est une bande** (DS §2.3), et trois
 * choses le disent à sa place. La légende au-dessus nomme **chaque** bande et
 * chiffre sa valeur au rang lu — c'est aussi la lecture textuelle que le cahier
 * §5 demande de tout graphique. L'ordre de la pile est celui de la légende, qui
 * est celui du document : la correspondance s'apprend sans teinte. Et un filet
 * de la couleur du fond sépare deux bandes voisines, si bien que deux teintes
 * proches restent deux formes.
 *
 * C'est aussi pourquoi le contraste de 3:1 exigé d'un **trait** ne s'applique
 * pas ici : une aire ne porte aucune lecture par elle-même, et l'app garde ses
 * trois seules couleurs de trait pour ce qui en est un.
 *
 * Aucune librairie, comme les cinq autres graphiques de l'app.
 * ==========================================================================*/

import { useState } from 'react'
import type { Money } from '@/domain/money'
import { NO_VALUE, formatRoundedMoney } from '@/i18n/format'
import { t } from '@/i18n/strings'
import { cn } from '@/lib/cn'
import { useCurrency } from '@/ui/currency'
import { ChartAxis, type AxisTick } from './ChartAxis'
import { ChartCursor } from './ChartCursor'
import { bandPath, polylinePath } from './path'

const HEIGHT = 120
const WIDTH = 240
/* La marge des autres graphiques : sans elle, le sommet de la pile tombe sur le
   bord et son filet de séparation s'y coupe en deux. */
const PAD = 6

/**
 * Le nombre d'arrêts du curseur.
 *
 * Le même que le tracé des projections, et pour la même raison : une période de
 * lecture se vise au doigt, et vingt-quatre sur les ~250px utiles d'un téléphone
 * en donnent dix. Au-delà, on ne vise plus rien.
 */
const MAX_STOPS = 24

/**
 * Le nombre de bandes tracées.
 *
 * Six, comme le nuancier `--cat-1..6` : un foyer tient rarement plus de six ou
 * sept comptes, et au-delà la pile devient un dégradé. Ce qui dépasse est
 * regroupé par l'appelant, qui seul sait le nommer.
 */
export const MAX_BANDS = 6

export type StackedBand = {
  id: string
  label: string
  color: string
  /** Un point par rang. `null` : rien à empiler ici — jamais zéro. */
  values: readonly (Money | null)[]
}

/** Un fait posé sur le haut de la pile : un relevé, à son rang. */
export type StackedDot = { rank: number }

/**
 * Un trait posé **par-dessus** la pile, qui ne s'y ajoute pas.
 *
 * Une bande dit « et ça, en plus » ; celui-ci dit « et si c'était ça, à la
 * place ». C'est ce qui le distingue d'une septième bande, et c'est pourquoi il
 * est tireté : cet écran réserve le trait plein à ce qui est garanti, et le
 * tireté à ce qui est supposé.
 */
export type StackedOverlay = {
  label: string
  values: readonly (Money | null)[]
}

export type StackedAreasProps = {
  bands: readonly StackedBand[]
  /** Le libellé de chaque rang — le curseur et la lecture accessible le lisent. */
  ranks: readonly string[]
  /** Le nom du haut de la pile. Sa valeur au curseur est la somme des bandes. */
  totalLabel: string
  /**
   * Les rangs où le total est un fait relevé, et non une estimation. Ils sont
   * marqués d'un point sur le sommet de la pile : une courbe estimée qui ne
   * montrerait pas ses points d'appui se croirait sur parole.
   */
  dots?: readonly StackedDot[]
  /** Une lecture de plus, tracée par-dessus la pile sans s'y ajouter. */
  overlay?: StackedOverlay
  /** Le nom du graphique, pour l'oreille. */
  label: string
  srText: string
  className?: string
}

/** Les rangs où le curseur s'arrête : le départ, l'arrivée, et l'entre-deux. */
function stops(count: number): number[] {
  const last = count - 1
  if (last <= 0) return count === 1 ? [0] : []
  const kept = Math.min(MAX_STOPS, count)
  const marks: number[] = []
  for (let stop = 0; stop < kept; stop += 1) {
    const mark = Math.round((last * stop) / (kept - 1))
    if (!marks.includes(mark)) marks.push(mark)
  }
  return marks
}

export function StackedAreas({
  bands,
  ranks,
  totalLabel,
  dots = [],
  overlay,
  label,
  srText,
  className,
}: StackedAreasProps) {
  const currency = useCurrency()
  const marks = stops(ranks.length)
  /* La lecture s'ouvre sur le dernier rang : c'est le chiffre qu'on vient
     chercher, et un graphique qui s'ouvrirait sur son premier mois montrerait
     l'état d'il y a cinq ans. Elle reste ensuite où on l'a laissée. */
  const [read, setRead] = useState(marks.length - 1)
  /* Changer de fenêtre renvoie la lecture à l'arrivée — sans quoi le curseur
     resterait à un rang que personne n'a désigné. La forme que React donne à un
     état qui doit se remettre à zéro quand une valeur change. */
  const [span, setSpan] = useState(marks.length)
  if (span !== marks.length) {
    setSpan(marks.length)
    setRead(marks.length - 1)
  }
  const shown = Math.min(Math.max(read, 0), Math.max(marks.length - 1, 0))
  const at = marks[shown] ?? 0

  /* Les sommets cumulés, bande par bande. Un `null` interrompt **toute** la
     pile à ce rang : une bande manquante rendrait fausses toutes celles du
     dessus, et un total partiel se lirait comme une chute. */
  const tops: (number | null)[][] = []
  let running: (number | null)[] = ranks.map(() => 0)
  for (const band of bands) {
    running = running.map((sum, rank) => {
      const value = band.values[rank] ?? null
      return sum === null || value === null ? null : sum + value
    })
    tops.push(running)
  }

  const totals = tops.at(-1) ?? ranks.map(() => null)
  /* L'échelle tient compte du trait posé par-dessus : une fourchette haute qui
     sortirait du cadre se lirait comme une pile arrêtée net. */
  const max = Math.max(
    1,
    ...totals.filter((value): value is number => value !== null),
    ...(overlay?.values ?? []).filter((value): value is Money => value !== null),
  )

  const xOf = (rank: number): number =>
    ranks.length <= 1 ? WIDTH / 2 : (rank / (ranks.length - 1)) * WIDTH
  const yOf = (value: number): number => PAD + (1 - value / max) * (HEIGHT - 2 * PAD)

  /* Une bande n'a de sens que là où ses deux bords existent : on ne garde donc
     que les tranches continues, et la pile s'interrompt ailleurs plutôt que de
     se refermer sur un bord inventé. C'est la règle de `polylinePath`, appliquée
     à une figure qui a deux contours. */
  const slices = (top: readonly (number | null)[], base: readonly (number | null)[]): string[] => {
    const paths: string[] = []
    let highs: { x: number; y: number }[] = []
    let lows: { x: number; y: number }[] = []

    const close = (): void => {
      if (highs.length > 1) paths.push(bandPath(highs, lows))
      highs = []
      lows = []
    }

    for (let rank = 0; rank < ranks.length; rank += 1) {
      const high = top[rank] ?? null
      const low = base[rank] ?? null
      if (high === null || low === null) {
        close()
        continue
      }
      highs.push({ x: xOf(rank), y: yOf(high) })
      lows.push({ x: xOf(rank), y: yOf(low) })
    }
    close()
    return paths
  }

  const money = (value: number | null): string =>
    value === null ? NO_VALUE : formatRoundedMoney(value as Money, currency)

  const ticks: AxisTick[] = [max, max / 2, 0].map((value) => ({
    pct: (yOf(value) / HEIGHT) * 100,
    text: formatRoundedMoney(value as Money, currency),
  }))

  const marked = new Set(dots.map((dot) => dot.rank))

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* La lecture au-dessus du tracé, qui tient lieu de légende — le motif
          des cinq autres graphiques de l'app. Chaque entrée porte sa pastille,
          son nom et son chiffre au rang lu : la couleur ne désigne donc jamais
          seule, et le bloc *est* la lecture textuelle du cahier §5. */}
      <div aria-hidden="true" className="flex flex-col gap-2">
        <span className="t-eyebrow text-text-muted">{ranks[at] ?? ''}</span>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {bands.map((band) => (
            <div key={band.id} className="flex min-w-0 flex-col gap-0.5">
              <span className="flex min-w-0 items-center gap-1.5">
                {/* Un carré plein, et non un trait : ce qu'il désigne est une
                    aire. C'est la pastille que `ProjectionChart` réserve déjà
                    à son aire du versé. */}
                <span
                  className="size-3 shrink-0 rounded-[3px]"
                  style={{ backgroundColor: band.color }}
                />
                <span className="t-label min-w-0 truncate">{band.label}</span>
              </span>
              <span className="t-num-body tnum">{money(band.values[at] ?? null)}</span>
            </div>
          ))}
          {/* Le total derrière un filet, sans pastille : il ne désigne aucune
              bande — il est leur somme, c'est-à-dire le sommet de la pile. */}
          <div className="flex min-w-0 flex-col gap-0.5 border-l border-border pl-3">
            <span className="t-label min-w-0 truncate text-text">{totalLabel}</span>
            <span className="t-num-body tnum">{money(totals[at] ?? null)}</span>
          </div>
          {overlay !== undefined && (
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="flex min-w-0 items-center gap-1.5">
                {/* Un trait tireté, et non un carré : ce qu'il désigne n'est
                    pas une aire — c'est une seconde lecture du même sommet. */}
                <span
                  className="h-0.5 w-4 shrink-0 rounded-chip"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(90deg, var(--text) 0 5px, transparent 5px 9px)',
                  }}
                />
                <span className="t-label min-w-0 truncate">{overlay.label}</span>
              </span>
              <span className="t-num-body tnum">{money(overlay.values[at] ?? null)}</span>
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

              {/* De bas en haut : chaque bande est fermée sur celle d'en
                  dessous, et la première sur la ligne de base. Le filet qui la
                  borde est de la couleur du fond — c'est lui qui garde deux
                  teintes voisines lisibles comme deux formes. */}
              {bands.map((band, index) => {
                const base = index === 0 ? ranks.map(() => 0) : (tops[index - 1] ?? [])
                return slices(tops[index] ?? [], base).map((d, slice) => (
                  <path
                    key={`${band.id}-${String(slice)}`}
                    d={d}
                    fill={band.color}
                    stroke="var(--surface)"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                ))
              })}

              {/* Le trait posé par-dessus la pile, quand il y en a un. Tracé
                  avant les points de relevé, pour qu'un fait reste au-dessus
                  d'une hypothèse. */}
              {overlay !== undefined && (
                <path
                  d={polylinePath(
                    ranks.map((_, rank) => {
                      const value = overlay.values[rank] ?? null
                      return value === null ? null : { x: xOf(rank), y: yOf(value) }
                    }),
                  )}
                  fill="none"
                  stroke="var(--text)"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              )}

              {/* Les relevés, posés sur le sommet : ce sont les faits, et ils
                  doivent rester visibles sur une courbe qui, entre eux, estime. */}
              {ranks.map((_, rank) => {
                const total = totals[rank] ?? null
                if (total === null || !marked.has(rank)) return null
                return (
                  <circle
                    key={`dot-${String(rank)}`}
                    cx={xOf(rank)}
                    cy={yOf(total)}
                    r={2.5}
                    fill="var(--text)"
                  />
                )
              })}

              {/* Le repère de lecture, à l'aplomb du rang lu. */}
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
              labels={marks.map((mark) => ranks[mark] ?? '')}
              shown={shown}
              onShow={setRead}
              label={t.a11y.chartCursor}
            />
          </div>

          {/* Les deux bornes de l'axe du temps : un graphique sans échelle se
              croit sur parole. */}
          <div className="t-axis flex justify-between gap-3" aria-hidden="true">
            <span>{ranks[0] ?? ''}</span>
            <span>{ranks.at(-1) ?? ''}</span>
          </div>
        </div>
      </div>

      <p className="sr-only-text">{srText}</p>
    </div>
  )
}
