import { useMemo, useState } from 'react'
import { CumulativeLines, type ExtraRead, type Serie } from '@/charts/CumulativeLines'
import { coveredYears, cumulativeLine, yearHorizon } from '@/domain/history'
import type { Money } from '@/domain/money'
import type { SavingYearPoint } from '@/domain/saving'
import { t } from '@/i18n/strings'
import { NO_VALUE, formatMoney, monthName, tpl } from '@/i18n/format'
import { useEntries, useSavingYearSeries } from '@/store/selectors'
import { Eyebrow } from '@/ui/Eyebrow'
import { Field, Select } from '@/ui/Field'
import { useCurrency } from '@/ui/currency'

/**
 * Ce qui est mis de côté au fil de l'année, année N contre année N−1.
 *
 * **L'app est une machine à mois**, et l'épargne est la seule notion qu'on y ait
 * greffée qui n'ait aucun sens à l'intérieur d'un mois : c'est un stock sur un
 * corps de flux. D'où la sensation que rien ne s'additionne jamais — on voit
 * douze états mensuels, pas une trajectoire —, alors que la donnée est
 * intégralement là depuis le premier jour.
 *
 * **Et elle ne demande aucun relevé.** C'est du flux pur, les mêmes `Entry` que
 * la capacité et la ventilation, comptées en net comme partout. Rien de neuf
 * n'est saisi : la question ne se posait simplement nulle part.
 *
 * La machine à cumuler existait déjà, testée, pour le solde du mois — elle
 * n'était pas branchée ici. Le graphique, la coupe des mois vides et l'horizon
 * commun aux deux années sont donc exactement ceux de la comparaison d'années
 * de l'historique : deux tracés du même cumul finiraient par ne plus se lire
 * pareil.
 */
/** L'année lue quand le document n'en couvre aucune. Voir `current`. */
const EMPTY_YEAR = 1

export function YearSection() {
  const entries = useEntries()
  const currency = useCurrency()
  const [pick, setPick] = useState<number | null>(null)

  /* Les années proposées se lisent sur le document entier et non sur la portée
     courante : le sélecteur dit ce que les données couvrent, et une année qui
     disparaîtrait en changeant de personne ferait croire à une perte. */
  const years = useMemo(() => coveredYears(entries), [entries])
  const last = years.at(-1)
  const year = pick !== null && years.includes(pick) ? pick : last

  /* Les hooks se réclament avant toute sortie, y compris quand le document ne
     couvre aucune année. Le repli vaut **1** et non 0 : l'année d'avant est
     toujours lue, et `ym(-1, 1)` ne s'écrit pas — « 00-1-01 » n'est pas un mois,
     et la lecture jetait. Une année 1 ne couvre rien, donc rend douze points
     vides, ce qui est exactement l'état qu'on veut ici. */
  const current = useSavingYearSeries(year ?? EMPTY_YEAR)
  const before = useSavingYearSeries((year ?? EMPTY_YEAR) - 1)

  if (year === undefined) {
    return (
      <section className="flex flex-col gap-3">
        <Eyebrow>{t.savings.years}</Eyebrow>
        <p className="t-label">{t.savings.yearsEmpty}</p>
      </section>
    )
  }
  const previous = year - 1

  const hasPrevious = before.some((point) => point.hasData)

  const series: Serie[] = [
    {
      id: String(year),
      label: String(year),
      values: cumulativeLine(current),
      color: 'var(--accent-2)',
    },
  ]
  if (hasPrevious) {
    series.push({
      id: String(previous),
      label: String(previous),
      values: cumulativeLine(before),
      color: 'var(--text-muted)',
      dashed: true,
    })
  }

  /* L'horizon commun : le dernier mois que l'année choisie sait chiffrer. Une
     année en cours lue jusqu'à son dernier mois contre une année pleine lue
     jusqu'en décembre compare huit mois à douze, et annonce comme un écart ce
     qui n'est qu'un tiers d'année de plus. */
  const horizon = yearHorizon(current)
  const partial = horizon !== -1 && horizon < current.length - 1
  const cumulativeAt = (points: readonly SavingYearPoint[]): Money | null =>
    horizon === -1 ? null : (points[horizon]?.cumulative ?? null)

  const money = (value: Money | null): string =>
    value === null ? NO_VALUE : formatMoney(value, currency, false)

  const currentLine = series[0]?.values ?? []
  const beforeLine = series[1]?.values ?? []
  const extra: ExtraRead | undefined = hasPrevious
    ? {
        label: t.savings.yearsDelta,
        values: currentLine.map((value, index) => {
          const other = beforeLine[index]
          return value === null || other === null || other === undefined ? null : value - other
        }),
      }
    : undefined

  return (
    <section className="flex flex-col gap-3">
      <Eyebrow>{t.savings.years}</Eyebrow>

      <div className="flex flex-col gap-4">
        {/* La comparaison n'a qu'un sélecteur et se fait toujours contre
            l'année d'avant : on le dit à côté plutôt que de le laisser deviner
            au tracé. */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Field label={t.savings.year} className="max-w-40">
            {(id) => (
              <Select
                id={id}
                value={String(year)}
                onChange={(event) => {
                  setPick(Number(event.target.value))
                }}
              >
                {years.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <span className="t-axis tnum pb-4">{tpl(t.savings.yearsVersus, year, previous)}</span>
        </div>

        <CumulativeLines
          series={series}
          {...(extra === undefined ? {} : { extra })}
          label={t.savings.yearsCumulative}
          srText={
            horizon === -1
              ? tpl(t.savings.srYearsEmpty, year)
              : tpl(
                  t.savings.srYears,
                  year,
                  previous,
                  monthName(horizon + 1),
                  `${money(cumulativeAt(current))} / ${money(hasPrevious ? cumulativeAt(before) : null)}`,
                )
          }
        />

        {partial && (
          <p className="t-label">{tpl(t.savings.yearsPartial, year, monthName(horizon + 1))}</p>
        )}
        {!hasPrevious && <p className="t-label">{tpl(t.savings.yearsNoPrevious, previous)}</p>}
      </div>
    </section>
  )
}
