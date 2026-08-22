/* ============================================================================
 * D'où vient ce qu'un compte vaut — trois couches, et un trait qui les somme.
 *
 * **Ce n'est pas la pile des comptes, c'est la pile d'un compte.** L'écran
 * d'analyse empilait les supports les uns sur les autres : leur somme *est* le
 * patrimoine, la figure était donc licite, mais elle répondait à « où est
 * l'argent » — c'est-à-dire à la question que le relevé de banque tranche déjà,
 * plus vite et sans qu'on recopie rien. Ce qu'aucun relevé ne dit, et ce que
 * l'app est seule à pouvoir dire parce qu'elle connaît les mouvements, c'est
 * **ce qui a fait la valeur** : le capital du départ, ce qu'on y a versé
 * depuis, et ce que le compte a produit tout seul.
 *
 * **La légende est un réglage, et l'échelle le suit.** Éteindre une couche la
 * retire de la pile *et* de l'échelle : c'est ce qui rend le geste utile plutôt
 * que décoratif. Un capital de 43 000 € au départ, 4 000 € versés et 900 €
 * produits donne une figure où les deux couches intéressantes tiennent dans un
 * dixième du cadre — c'est la vérité, et c'est illisible. Un appui sur « Au
 * départ » et la même figure montre exactement ce que la période a fait, à
 * l'échelle de ce qu'elle a fait. Geler les positions aurait gardé une belle
 * cohérence d'image au prix du seul réglage qui apprenne quelque chose.
 *
 * **Les points de relevé ne survivent pas au réglage**, et c'est la contrepartie
 * honnête : ils marquent les mois où le total est un **fait**. Dès qu'une couche
 * manque, le sommet de la pile n'est plus ce que le compte vaut, et y poser un
 * point le ferait passer pour une valeur relevée. Ils reviennent avec elle.
 *
 * **Une couche peut être négative**, et la figure le supporte : un placement qui
 * perd pose sa bande *sous* le trait des versements plutôt que dessus. Aucune
 * couleur d'alerte pour autant — le rouge est réservé aux dépassements et aux
 * fautes (DS §2.3), et un marché qui baisse n'en est pas une. Le signe est porté
 * par la position de l'aire et par le nombre de la légende.
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
/* La marge des autres graphiques : sans elle, le sommet tombe sur le bord et son
   trait de deux pixels s'y coupe en deux. */
const PAD = 6

/**
 * Le nombre d'arrêts du curseur.
 *
 * Le même que les deux autres tracés, et pour la même raison : une période de
 * lecture se vise au doigt, et vingt-quatre sur les ~250px utiles d'un téléphone
 * en donnent dix. Au-delà, on ne vise plus rien.
 */
const MAX_STOPS = 24

export type GrowthLayer = {
  id: string
  label: string
  /** Le remplissage — un token de la palette, jamais une couleur écrite. */
  fill: string
  /** L'opacité du remplissage. Les aires de l'app se teintent, elles ne pèsent pas. */
  opacity?: number
  /** Un point par rang. `null` : rien à empiler ici — jamais zéro. */
  values: readonly (Money | null)[]
}

export type GrowthAreasProps = {
  /** Du bas vers le haut. Leur somme est le trait du total. */
  layers: readonly GrowthLayer[]
  /** Le libellé de chaque rang — le curseur et la lecture accessible le lisent. */
  ranks: readonly string[]
  /** Le nom du trait qui somme les couches, quand elles sont toutes affichées. */
  totalLabel: string
  /** Son nom quand une couche est éteinte : la somme n'est plus le total. */
  partialLabel: string
  /**
   * Les rangs où le total est un **fait relevé** et non une estimation. Ils
   * portent un point sur le trait : une courbe estimée qui ne montrerait pas ses
   * points d'appui se croirait sur parole.
   */
  dots?: readonly number[]
  /** Le nom du graphique, pour l'oreille. */
  label: string
  srText: string
  /**
   * La version basse, pour les petits multiples : une figure par compte sur un
   * téléphone tient à trois si chacune fait 160px, pas si chacune en fait 224.
   */
  compact?: boolean
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

export function GrowthAreas({
  layers,
  ranks,
  totalLabel,
  partialLabel,
  dots = [],
  label,
  srText,
  compact = false,
  className,
}: GrowthAreasProps) {
  const currency = useCurrency()
  const [hidden, setHidden] = useState<readonly string[]>([])
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

  const visible = (id: string): boolean => !hidden.includes(id)

  /* Les sommets cumulés des couches **affichées**. Une couche éteinte sort de la
     pile et de l'échelle : c'est ce qui fait du réglage une lecture. Un `null`
     interrompt toute la pile à ce rang — une couche manquante rendrait fausses
     celles du dessus, et un total amputé se lirait comme une chute. */
  const tops: ((number | null)[] | null)[] = []
  let running: (number | null)[] = ranks.map(() => 0)
  for (const layer of layers) {
    if (!visible(layer.id)) {
      tops.push(null)
      continue
    }
    running = running.map((sum, rank) => {
      const value = layer.values[rank] ?? null
      return sum === null || value === null ? null : sum + value
    })
    tops.push(running)
  }

  const totals = running
  const drawn = tops.flat().filter((value): value is number => value !== null)
  /* Zéro est toujours dans l'échelle : c'est la base de la pile. Et le minimum
     descend avec elle — une couche négative sort du cadre sinon, et sa bande se
     lirait comme une pile arrêtée net. */
  const floor = Math.min(0, ...drawn)
  const ceiling = Math.max(1, ...drawn)
  const range = ceiling - floor || 1

  const xOf = (rank: number): number =>
    ranks.length <= 1 ? WIDTH / 2 : (rank / (ranks.length - 1)) * WIDTH
  const yOf = (value: number): number => PAD + (1 - (value - floor) / range) * (HEIGHT - 2 * PAD)

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

  const ticks: AxisTick[] = [ceiling, (ceiling + floor) / 2, floor].map((value) => ({
    pct: (yOf(value) / HEIGHT) * 100,
    text: formatRoundedMoney(value as Money, currency),
  }))

  const marked = new Set(dots)
  const height = compact ? 'h-40' : 'h-56'

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* La légende, et c'est **un réglage** : chaque couche est un bouton qui
          l'allume ou l'éteint. Elle n'est donc plus `aria-hidden` comme celle
          des autres tracés — ce qu'on peut actionner doit s'atteindre. Chaque
          entrée porte sa pastille, son nom et son chiffre au rang lu : la
          couleur ne désigne jamais seule (DS §2.3), et le bloc *est* la lecture
          textuelle que le cahier §5 demande de tout graphique. */}
      <div className="flex flex-col gap-2">
        <span className="t-eyebrow text-text-muted" aria-hidden="true">
          {ranks[at] ?? ''}
        </span>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {layers.map((layer) => {
            const on = visible(layer.id)
            /* La dernière couche allumée ne s'éteint pas : un cadre vide n'est
               pas une lecture, et le bouton le dit en se désactivant plutôt
               qu'en refusant le clic sans rien expliquer. */
            const last = on && hidden.length === layers.length - 1
            return (
              <button
                key={layer.id}
                type="button"
                aria-pressed={on}
                disabled={last}
                onClick={() => {
                  setHidden((was) =>
                    was.includes(layer.id)
                      ? was.filter((id) => id !== layer.id)
                      : [...was, layer.id],
                  )
                }}
                /* `-mx-2` : le rembourrage qui monte l'entrée à la cible de
                   44px du DS §8 est repris sur la marge, pour que la rangée
                   reste alignée sur le reste de la tuile. Le fond au survol et
                   le curseur disent ce que le seul `aria-pressed` ne dit qu'à
                   l'oreille — une entrée de légende ne ressemble à rien de
                   cliquable. */
                className={cn(
                  'flex min-h-11 min-w-0 cursor-pointer flex-col justify-center gap-0.5 rounded-input px-2 -mx-2 text-left',
                  'transition-colors duration-[var(--dur)] ease-ds hover:bg-surface-2',
                  /* Aucune classe de focus : `base.css` donne déjà son anneau à
                     tout `:focus-visible`, et celle qui traînait ici —
                     `focus-visible:outline-focus` — n'avait aucune règle en
                     face. Elle ne peignait rien, et laissait croire que cette
                     légende avait un focus à elle. */
                  'disabled:cursor-default disabled:hover:bg-transparent',
                  !on && 'opacity-45',
                )}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  {/* Un carré plein, et non un trait : ce qu'il désigne est une
                      aire. Éteint, il se vide — la forme dit l'état, pas
                      seulement l'opacité. */}
                  <span
                    className="size-3 shrink-0 rounded-[3px] ring-1 ring-border"
                    style={on ? { backgroundColor: layer.fill, opacity: layer.opacity } : {}}
                  />
                  <span className="t-label min-w-0 truncate">{layer.label}</span>
                </span>
                <span className="t-num-body tnum">{money(layer.values[at] ?? null)}</span>
              </button>
            )
          })}
          {/* Le sommet derrière un filet, et sans bouton : il ne désigne aucune
              couche — il est leur somme. Il change de nom quand la pile est
              partielle : « Valeur » sur une somme amputée serait faux, et c'est
              exactement le genre d'à-peu-près qui décrédibilise le reste. */}
          <div className="flex min-w-0 flex-col gap-0.5 border-l border-border pl-3">
            <span className="t-label min-w-0 truncate text-text">
              {hidden.length > 0 ? partialLabel : totalLabel}
            </span>
            <span className="t-num-body tnum">{money(totals[at] ?? null)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <ChartAxis ticks={ticks} height={height} />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="relative">
            <svg
              viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`}
              role="img"
              aria-label={label}
              className={cn('w-full', height)}
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

              {/* De bas en haut : chaque couche est fermée sur celle d'en
                  dessous, et la première sur la ligne de base. Le filet qui la
                  borde est de la couleur du fond — c'est lui qui garde deux
                  teintes voisines lisibles comme deux formes. */}
              {layers.map((layer, index) => {
                const top = tops[index]
                if (top === null || top === undefined) return null
                /* La base est le dernier sommet **affiché** sous cette couche, et
                   non celui du rang précédent : une couche éteinte au milieu de
                   la pile laisserait sinon un trou là où il n'y en a pas. */
                const under = tops.slice(0, index).filter((one) => one !== null).at(-1)
                const base = under ?? ranks.map(() => 0)
                return slices(top, base).map((d, slice) => (
                  <path
                    key={`${layer.id}-${String(slice)}`}
                    d={d}
                    fill={layer.fill}
                    opacity={layer.opacity}
                    stroke="var(--surface)"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                ))
              })}

              {/* Le trait du sommet — ce que le compte vaut quand tout est
                  affiché, et la somme de ce qui reste sinon. */}
              <path
                d={polylinePath(
                  ranks.map((_, rank) => {
                    const value = totals[rank] ?? null
                    return value === null ? null : { x: xOf(rank), y: yOf(value) }
                  }),
                )}
                fill="none"
                stroke="var(--accent-2)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />

              {/* Les relevés, posés sur le trait : ce sont les faits, et ils
                  doivent rester visibles sur une courbe qui, entre eux, estime.
                  Ils s'effacent dès qu'une couche manque — le sommet n'est plus
                  alors ce que le compte vaut, et un point l'y ferait croire. */}
              {ranks.map((_, rank) => {
                const total = totals[rank] ?? null
                if (total === null || hidden.length > 0 || !marked.has(rank)) return null
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
