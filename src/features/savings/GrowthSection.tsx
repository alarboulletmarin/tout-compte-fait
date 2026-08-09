/* ============================================================================
 * D'où vient ce que tu as — et c'est la seule analyse que l'app soit seule à
 * pouvoir faire.
 *
 * **Ce qui était là avant ne concluait rien.** L'écran empilait les comptes les
 * uns sur les autres, puis comparait les versements de l'année à ceux de l'année
 * d'avant. La première figure répond à « où est mon argent » — la banque le dit
 * déjà, plus vite, et sans qu'on recopie quoi que ce soit. La seconde compte ce
 * qui sort du compte courant, ce qui est du flux pur : elle ne sait pas dire si
 * les 4 200 € mis de côté ont produit quatre euros ou quatre cents. Deux
 * lectures, aucune conclusion, et surtout aucune des deux ne demandait à l'app
 * de connaître quoi que ce soit que la banque ignore.
 *
 * **Ce qui la remplace tient en une identité.** Ce que le compte vaut = ce qu'il
 * valait au départ + ce qu'on y a versé depuis + ce qu'il a produit tout seul.
 * Trois nombres qui se referment au centime sur le quatrième, et dont le
 * troisième est le seul chiffre intéressant de tout l'écran — celui qu'aucun
 * relevé n'écrit, parce qu'il faut connaître **à la fois** les valeurs et les
 * mouvements pour le calculer. C'est exactement ce que le document porte.
 *
 * **Le rendement est mesuré, jamais recalculé.** Il n'est pas la somme des
 * intérêts d'un barème : c'est `valeur − départ − versé`. La différence compte —
 * un PEA qui prend 9 % ou en perd 4 le dit, quand aucun taux du document ne
 * l'aurait vu venir. Et il peut donc être négatif, ce qui est une lecture et non
 * une erreur : pas de rouge (DS §2.3), le signe suffit.
 *
 * **Tout est relatif à la période lue.** « Au départ » n'est pas le premier euro
 * jamais posé — le document ne le connaît pas —, c'est ce que le compte valait
 * au premier mois affiché. Changer de fenêtre change les trois nombres, et c'est
 * précisément ce qu'on demande au sélecteur.
 * ==========================================================================*/

import { useMemo, useState } from 'react'
import { GrowthAreas, type GrowthLayer } from '@/charts/GrowthAreas'
import { today } from '@/domain/date'
import type { Money } from '@/domain/money'
import { type GrowthBand, type GrowthPoint, growthBands, growthTotal, stockRange } from '@/domain/savingSeries'
import type { SavingSupport } from '@/domain/types'
import { supports } from '@/i18n/supports'
import {
  NO_VALUE,
  formatMoney,
  formatPercent,
  formatRoundedMoney,
  formatSignedRoundedMoney,
  formatYearMonthShort,
  tpl,
} from '@/i18n/format'
import { useEntries, useSavingRates, useSavingValuations, useScopedSavingSupports } from '@/store/selectors'
import { Disclosure } from '@/ui/Disclosure'
import { Eyebrow } from '@/ui/Eyebrow'
import { Segmented } from '@/ui/Segmented'
import { Tile } from '@/ui/Tile'
import { useCurrency } from '@/ui/currency'

/**
 * La décomposition des comptes d'une personne, mois par mois.
 *
 * Ici et non dans `store/selectors.ts`, qui est dans le graphe initial de tout
 * le monde : le sélecteur y ferait entrer `domain/savingSeries.ts` et sa
 * capitalisation pour une lecture qui vit derrière un `lazy`.
 */
function useGrowthBands(owned: readonly SavingSupport[], months: number): GrowthBand[] {
  const valuations = useSavingValuations()
  const rates = useSavingRates()
  const entries = useEntries()

  return useMemo(() => {
    const on = today()
    const { from, to } = stockRange(months, on)
    return growthBands(owned, { savingValuations: valuations, savingRates: rates, entries }, from, to, on)
  }, [owned, months, valuations, rates, entries])
}

/**
 * Les fenêtres proposées. `Segmented` travaille sur des chaînes — c'est un
 * groupe de boutons radio —, et la valeur en mois vit à côté de son libellé
 * plutôt que d'être reconstruite à la lecture.
 */
const WINDOWS = [
  { value: '12', months: 12, label: () => tpl(supports.growthMonths, 12) },
  { value: '60', months: 60, label: () => tpl(supports.growthYears, 5) },
  { value: '120', months: 120, label: () => tpl(supports.growthYears, 10) },
] as const
type Window = (typeof WINDOWS)[number]['value']

/** Au-delà de deux ans, un point par mois ne se lit plus : un par année. */
const YEARLY_ABOVE = 24

/**
 * Le nombre de comptes qui reçoivent leur propre tracé.
 *
 * Six, comme le nuancier : au-delà, l'écran devient une pile de figures qu'on ne
 * compare plus, et le total du haut dit déjà l'essentiel. Ce qui n'est pas tracé
 * est **compté à l'écran** — un plafond silencieux se lit comme une couverture
 * complète.
 */
const MAX_CHARTS = 6

/** Les rangs gardés : un par pas, et **toujours le dernier**. */
function kept(count: number, step: number): number[] {
  return Array.from({ length: count }, (_, index) => index).filter(
    (index) => index % step === 0 || index === count - 1,
  )
}

/** Les trois couches, dans l'ordre où elles s'empilent — du sol vers le haut. */
function layersOf(points: readonly GrowthPoint[], ranks: readonly number[]): GrowthLayer[] {
  const at = (pick: (point: GrowthPoint) => Money) =>
    ranks.map((rank) => {
      const point = points[rank]
      return point === undefined ? null : pick(point)
    })

  return [
    /* Le départ en bas et sans teinte d'accent : c'est ce qui était déjà là, et
       la lecture porte sur ce qui s'est ajouté par-dessus. */
    { id: 'base', label: supports.growthBase, fill: 'var(--surface-2)', values: at((p) => p.base) },
    {
      id: 'paid',
      label: supports.growthPaid,
      fill: 'var(--accent-2)',
      opacity: 0.22,
      values: at((p) => p.paid),
    },
    /* Le rendement dans l'accent du rendement — le même que la bande du
       simulateur, pour que les deux écrans se lisent avec le même œil. */
    { id: 'gain', label: supports.growthGain, fill: 'var(--accent)', opacity: 0.3, values: at((p) => p.gain) },
  ]
}

/** La phrase des trois montants — la lecture chiffrée, sans le tracé. */
function LineOf({ point }: { point: GrowthPoint }) {
  const currency = useCurrency()
  /* Le versé et le produit portent leur signe : une reprise est un versement
     négatif, et un placement qui baisse produit un rendement négatif. Le départ
     n'en porte pas — un capital n'est pas un mouvement. */
  const share =
    point.base + point.paid > 0 ? formatPercent(point.gain / (point.base + point.paid), 1) : null

  return (
    <span className="t-label">
      {tpl(
        supports.growthLine,
        formatRoundedMoney(point.base, currency),
        formatSignedRoundedMoney(point.paid, currency),
        formatSignedRoundedMoney(point.gain, currency),
      )}
      {share !== null && ` — ${tpl(supports.growthShare, share)}`}
    </span>
  )
}

export function GrowthSection() {
  const owned = useScopedSavingSupports()
  const currency = useCurrency()
  const [window, setWindow] = useState<Window>('12')
  const [detailed, setDetailed] = useState(false)
  const months = WINDOWS.find((one) => one.value === window)?.months ?? 12

  const active = useMemo(() => owned.filter((support) => !support.archived), [owned])
  const bands = useGrowthBands(active, months)
  const total = useMemo(() => growthTotal(bands), [bands])

  /* Les plus gros d'abord : ce qui compte est où le capital est, et un PEE de
     200 € tracé avant un livret de 40 000 € retirerait à l'écran ce qu'il a à
     dire. */
  const ordered = useMemo(
    () => [...bands].sort((a, b) => (b.points.at(-1)?.value ?? 0) - (a.points.at(-1)?.value ?? 0)),
    [bands],
  )
  const drawn = ordered.slice(0, MAX_CHARTS)
  const rest = ordered.length - drawn.length

  const step = months > YEARLY_ABOVE ? 12 : 1
  const ranks = kept(total.length, step)
  const last = total.at(-1)

  if (total.length < 2 || last === undefined) {
    return (
      <section className="flex flex-col gap-3">
        <Eyebrow>{supports.growth}</Eyebrow>
        <p className="t-label">{supports.growthEmpty}</p>
      </section>
    )
  }

  const labelAt = (points: readonly GrowthPoint[], rank: number): string =>
    formatYearMonthShort(points[rank]?.month ?? '')

  /** La lecture accessible d'un tracé — les quatre nombres, en une phrase. */
  const srOf = (points: readonly GrowthPoint[], marks: readonly number[]): string => {
    const first = points[marks[0] ?? 0]
    const end = points[marks.at(-1) ?? 0]
    if (first === undefined || end === undefined) return ''
    return tpl(
      supports.srGrowth,
      formatRoundedMoney(first.value, currency),
      labelAt(points, marks[0] ?? 0),
      formatRoundedMoney(end.value, currency),
      labelAt(points, marks.at(-1) ?? 0),
      formatSignedRoundedMoney(end.paid, currency),
      formatSignedRoundedMoney(end.gain, currency),
    )
  }

  /** Les rangs qui portent un vrai relevé : les points d'appui du tracé. */
  const dotsOf = (points: readonly GrowthPoint[], marks: readonly number[]): number[] =>
    marks.map((rank, index) => ({ rank, index })).filter(({ rank }) => points[rank]?.known === true).map(({ index }) => index)

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Eyebrow>{supports.growth}</Eyebrow>
        <Segmented
          options={WINDOWS.map((option) => ({ value: option.value, label: option.label() }))}
          value={window}
          onChange={setWindow}
          label={supports.growthWindow}
          className="w-fit"
        />
      </div>

      {/* L'ensemble d'abord, et il conclut : « 410 € produits, soit 1,9 % de ce
          que tu y as mis » est la phrase que personne d'autre n'écrit. */}
      <Tile className="gap-3">
        <Eyebrow>{supports.growthTotal}</Eyebrow>
        <Amounted value={last.value} />
        <LineOf point={last} />
        <GrowthAreas
          layers={layersOf(total, ranks)}
          ranks={ranks.map((rank) => labelAt(total, rank))}
          totalLabel={supports.growthTotal}
          partialLabel={supports.growthShown}
          dots={dotsOf(total, ranks)}
          label={supports.growth}
          srText={srOf(total, ranks)}
        />
      </Tile>

      {/* La réserve, sous le tracé et jamais repliée : ce qui est estimé doit se
          dire là où on le lit. */}
      <p className="t-label">{supports.growthMethod}</p>

      {/* Compte par compte — les petits multiples. Un seul graphique d'ensemble
          dit ce que l'épargne a fait ; il ne dit pas **lequel** des comptes l'a
          fait, et c'est pourtant la seule chose qui se décide ensuite. */}
      {drawn.length > 1 && (
        <div className="flex flex-col gap-4">
          <Eyebrow>{supports.growthAccounts}</Eyebrow>
          {drawn.map((band) => {
            const marks = kept(band.points.length, step)
            const end = band.points.at(-1)
            if (end === undefined || marks.length < 2) return null
            return (
              <Tile key={band.supportId} className="gap-2">
                <span className="t-body font-medium">{band.label}</span>
                <LineOf point={end} />
                <GrowthAreas
                  compact
                  layers={layersOf(band.points, marks)}
                  ranks={marks.map((rank) => labelAt(band.points, rank))}
                  totalLabel={supports.growthTotal}
                  partialLabel={supports.growthShown}
                  dots={dotsOf(band.points, marks)}
                  label={tpl(supports.growthChart, band.label)}
                  srText={srOf(band.points, marks)}
                />
              </Tile>
            )
          })}
          {rest > 0 && <p className="t-label">{tpl(supports.growthRest, rest)}</p>}
        </div>
      )}

      {/* Le tableau double le graphique au chiffre près — le cahier §5 le
          demande de tout graphique, et une courbe ne se lit jamais au centime.
          Replié, parce que la légende répond déjà à la même question au doigt. */}
      <Disclosure
        open={detailed}
        onOpenChange={setDetailed}
        title={<span className="t-body">{supports.growthDetail}</span>}
      >
        <div className="overflow-x-auto pt-3">
          <table className="w-full border-collapse text-left" aria-label={supports.growthDetail}>
            <thead>
              <tr className="t-axis">
                {[
                  supports.growthWhen,
                  supports.growthBase,
                  supports.growthPaid,
                  supports.growthGain,
                  supports.growthTotal,
                ].map((head) => (
                  <th key={head} scope="col" className="py-2 pr-3 font-normal whitespace-nowrap">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranks.map((rank) => {
                const point = total[rank]
                return (
                  <tr key={rank} className="border-t border-border">
                    <th scope="row" className="t-body py-2 pr-3 font-normal whitespace-nowrap">
                      {labelAt(total, rank)}
                    </th>
                    {[point?.base, point?.paid, point?.gain, point?.value].map((value, column) => (
                      <td
                        key={column}
                        className="t-num-body tnum py-2 pr-3 whitespace-nowrap"
                      >
                        {value === undefined ? NO_VALUE : formatMoney(value, currency, false)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Disclosure>
    </section>
  )
}

/** Le capital d'arrivée, à la taille d'une tuile et jamais plus grande. */
function Amounted({ value }: { value: Money }) {
  const currency = useCurrency()
  return <p className="t-tile-fit tnum">{formatMoney(value, currency, false)}</p>
}
