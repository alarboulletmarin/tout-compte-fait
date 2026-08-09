import { useMemo, useState } from 'react'
import { StackedAreas, type StackedBand, type StackedDot, MAX_BANDS } from '@/charts/StackedAreas'
import { today } from '@/domain/date'
import { type Money, ZERO, money } from '@/domain/money'
import { type StockBand, stockBands, stockRange } from '@/domain/savingSeries'
import type { SavingSupport } from '@/domain/types'
import { t } from '@/i18n/strings'
import { NO_VALUE, formatMoney, formatRoundedMoney, formatYearMonthShort, tpl } from '@/i18n/format'
import {
  useCategoryMap,
  useEntries,
  useSavingRates,
  useSavingValuations,
  useScopedSavingSupports,
} from '@/store/selectors'
import { Disclosure } from '@/ui/Disclosure'
import { Eyebrow } from '@/ui/Eyebrow'
import { Segmented } from '@/ui/Segmented'
import { useCurrency } from '@/ui/currency'
import { bandColors } from './bandColors'

/**
 * La trajectoire des supports d'une personne, mois par mois.
 *
 * Ici et non dans `store/selectors.ts`, qui est dans le graphe initial de tout
 * le monde : le sélecteur y ferait entrer `domain/savingSeries.ts` et sa
 * capitalisation pour une lecture qui vit derrière un `lazy`.
 */
function useStockBands(supports: readonly SavingSupport[], months: number): StockBand[] {
  const valuations = useSavingValuations()
  const rates = useSavingRates()
  const entries = useEntries()

  return useMemo(() => {
    const on = today()
    const { from, to } = stockRange(months, on)
    return stockBands(
      supports,
      { savingValuations: valuations, savingRates: rates, entries },
      from,
      to,
      on,
    )
  }, [supports, months, valuations, rates, entries])
}

/**
 * L'évolution de l'épargne, support par support.
 *
 * **C'est la lecture qui manquait, et elle ne demande rien de plus.** L'écran
 * savait dire ce qu'un compte vaut aujourd'hui et ce qu'on a mis de côté cette
 * année ; il ne savait pas dire la trajectoire — un capital, puis des virements,
 * puis des intérêts, mois après mois —, alors que les relevés, les `Entry` et
 * les paliers de taux étaient là depuis le premier jour.
 *
 * **Une estimation, dite comme telle.** Entre deux relevés, personne ne sait ce
 * que valait le PEA : ce qui est tracé est dérivé des mouvements confirmés et du
 * taux en vigueur ce mois-là. Les mois qui portent un **vrai relevé** sont donc
 * marqués d'un point sur le sommet de la pile : ce sont les faits, et une courbe
 * estimée qui ne montrerait pas ses points d'appui se croirait sur parole.
 *
 * **La pile est légitime ici** parce que les supports **s'additionnent** : leur
 * somme *est* le patrimoine de la personne. C'est exactement ce que trois
 * hypothèses de rendement ne font pas, et c'est pourquoi l'écran des projections
 * ne les empile pas (cahier §4.6 ter).
 *
 * La lecture est individuelle, comme tout l'écran (`useScopedSavingSupports`) :
 * une somme de deux personnes ne se décide nulle part.
 */

/**
 * Les fenêtres proposées. `Segmented` travaille sur des chaînes — c'est un
 * groupe de boutons radio —, et la valeur en mois vit à côté de son libellé
 * plutôt que d'être reconstruite à la lecture.
 */
const WINDOWS = [
  { value: '12', months: 12, label: () => tpl(t.savings.evolutionMonths, 12) },
  { value: '60', months: 60, label: () => tpl(t.savings.evolutionYears, 5) },
  { value: '120', months: 120, label: () => tpl(t.savings.evolutionYears, 10) },
] as const
type Window = (typeof WINDOWS)[number]['value']

/** Au-delà de deux ans, un point par mois ne se lit plus : un par année. */
const YEARLY_ABOVE = 24

export function EvolutionSection() {
  const supports = useScopedSavingSupports()
  const categories = useCategoryMap()
  const currency = useCurrency()
  const [window, setWindow] = useState<Window>('12')
  const [detailed, setDetailed] = useState(false)
  const months = WINDOWS.find((one) => one.value === window)?.months ?? 12

  const active = useMemo(() => supports.filter((support) => !support.archived), [supports])
  const bands = useStockBands(active, months)
  const colors = useMemo(() => bandColors(active, categories), [active, categories])

  /* La coupe se fait sur les **plus gros** : ce qui compte est où le capital
     est, et ranger un livret de 40 000 € sous « Autres » pour garder un PEE de
     200 € retirerait à l'écran ce qu'il a à dire. */
  const ordered = useMemo(
    () => [...bands].sort((a, b) => lastValue(b) - lastValue(a)),
    [bands],
  )
  const shown = ordered.slice(0, MAX_BANDS)
  const rest = ordered.slice(MAX_BANDS)

  const ranks = shown[0]?.points.map((point) => point.month) ?? []
  const step = months > YEARLY_ABOVE ? 12 : 1
  /* Un point par pas, et **toujours le dernier** : c'est le seul dont le montant
     est écrit ailleurs, et le rater ferait finir la courbe un an trop tôt. */
  const kept = ranks
    .map((_, index) => index)
    .filter((index) => index % step === 0 || index === ranks.length - 1)

  const at = (band: StockBand, index: number): Money | null => band.points[index]?.value ?? null

  const stacked: StackedBand[] = shown.map((band) => ({
    id: band.supportId,
    label: band.label,
    color: colors.get(band.supportId) ?? 'var(--cat-rest)',
    values: kept.map((index) => at(band, index)),
  }))
  if (rest.length > 0) {
    stacked.push({
      id: '__rest__',
      label: tpl(t.savings.evolutionRest, rest.length),
      color: 'var(--cat-rest)',
      values: kept.map((index) =>
        rest.some((band) => at(band, index) === null)
          ? null
          : money(rest.reduce((sum, band) => sum + (at(band, index) ?? ZERO), 0)),
      ),
    })
  }

  /* Un rang porte un point dès qu'un des comptes y a été relevé : c'est bien un
     appui réel sous le sommet de la pile, même si les autres bandes y sont
     estimées. Le dire autrement — n'admettre que les rangs où *tout* est relevé
     — ne marquerait presque jamais rien. */
  const dots: StackedDot[] = kept
    .map((index, rank) => ({ index, rank }))
    .filter(({ index }) => ordered.some((band) => band.points[index]?.known !== null))
    .map(({ rank }) => ({ rank }))

  const labels = kept.map((index) => formatYearMonthShort(ranks[index] ?? ''))
  const totalAt = (rank: number): Money | null => {
    const values = stacked.map((band) => band.values[rank] ?? null)
    return values.some((value) => value === null)
      ? null
      : money(values.reduce((sum: number, value) => sum + (value ?? ZERO), 0))
  }

  if (stacked.length === 0 || kept.length < 2) {
    return (
      <section className="flex flex-col gap-3">
        <Eyebrow>{t.savings.evolution}</Eyebrow>
        <p className="t-label">{t.savings.evolutionEmpty}</p>
      </section>
    )
  }

  const first = totalAt(0)
  const last = totalAt(kept.length - 1)

  return (
    <section className="flex flex-col gap-3">
      <Eyebrow>{t.savings.evolution}</Eyebrow>

      <Segmented
        options={WINDOWS.map((option) => ({ value: option.value, label: option.label() }))}
        value={window}
        onChange={setWindow}
        label={t.savings.evolutionWindow}
        className="w-fit"
      />

      <StackedAreas
        bands={stacked}
        ranks={labels}
        totalLabel={t.savings.evolutionTotal}
        dots={dots}
        label={t.savings.evolution}
        srText={tpl(
          t.savings.srEvolution,
          first === null ? NO_VALUE : formatRoundedMoney(first, currency),
          labels[0] ?? '',
          last === null ? NO_VALUE : formatRoundedMoney(last, currency),
          labels.at(-1) ?? '',
        )}
      />

      {/* La réserve, sous le tracé et jamais repliée : ce qui est estimé doit se
          dire là où on le lit. */}
      <p className="t-label">{t.savings.evolutionMethod}</p>

      {/* Le tableau double le graphique au chiffre près — le cahier §5 le
          demande de tout graphique, et une courbe ne se lit jamais au centime.
          Replié, parce que le curseur répond déjà à la même question au doigt. */}
      <Disclosure
        open={detailed}
        onOpenChange={setDetailed}
        title={<span className="t-body">{t.savings.evolutionDetail}</span>}
      >
        <div className="overflow-x-auto pt-3">
          <table className="w-full border-collapse text-left" aria-label={t.savings.evolutionDetail}>
            <thead>
              <tr className="t-axis">
                <th scope="col" className="py-2 pr-3 font-normal">
                  {t.savings.evolutionWhen}
                </th>
                {stacked.map((band) => (
                  <th key={band.id} scope="col" className="py-2 pr-3 font-normal whitespace-nowrap">
                    {band.label}
                  </th>
                ))}
                <th scope="col" className="py-2 pr-3 font-normal whitespace-nowrap">
                  {t.savings.evolutionTotal}
                </th>
              </tr>
            </thead>
            <tbody>
              {labels.map((label, rank) => (
                <tr key={label} className="border-t border-border">
                  <th scope="row" className="t-body py-2 pr-3 font-normal whitespace-nowrap">
                    {label}
                  </th>
                  {stacked.map((band) => (
                    <td key={band.id} className="t-num-body tnum py-2 pr-3 whitespace-nowrap">
                      {cell(band.values[rank] ?? null, currency)}
                    </td>
                  ))}
                  <td className="t-num-body tnum py-2 pr-3 whitespace-nowrap">
                    {cell(totalAt(rank), currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Disclosure>
    </section>
  )
}

/** Le dernier montant connu d'une bande — ce qui décide de son rang. */
function lastValue(band: StockBand): number {
  for (let index = band.points.length - 1; index >= 0; index -= 1) {
    const value = band.points[index]?.value
    if (value !== null && value !== undefined) return value
  }
  return 0
}

/**
 * Une case du tableau. Le montant s'écrit **exact** : c'est la contrepartie du
 * graphique, et une lecture au chiffre près qui arrondirait ne servirait à rien.
 * Le « ≈ » n'y est pas non plus — la réserve est écrite une fois, au-dessus.
 */
function cell(value: Money | null, currency: string): string {
  return value === null ? NO_VALUE : formatMoney(value, currency, false)
}
