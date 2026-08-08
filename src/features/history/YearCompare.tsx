import { useMemo } from 'react'
import { CumulativeLines, type ExtraRead, type Serie } from '@/charts/CumulativeLines'
import {
  type YearPoint,
  coveredYears,
  cumulativeLine,
  yearHorizon,
  yearSeries,
} from '@/domain/history'
import type { Money } from '@/domain/money'
import { history } from '@/i18n/history'
import { NO_VALUE, formatMoney, monthName, tpl } from '@/i18n/format'
import { useEntries, useMonthScope } from '@/store/selectors'
import { Field, Select } from '@/ui/Field'
import { useCurrency } from '@/ui/currency'

export type YearCompareProps = {
  /** L'année choisie. Elle vit sur la section (voir `CompareSection`). */
  pick: number | null
  onPick: (next: number) => void
}

/* La coupe aux mois portant des données — « un mois vide n'est pas un cumul
   plat » — vit dans `domain/history`, depuis que l'écran de l'épargne trace le
   cumul de ses versements avec le même graphique. Deux copies de cette règle
   auraient fini par ne plus couper au même mois, et l'écart se serait vu d'un
   écran à l'autre sans qu'on sache lequel des deux a raison. */

/** Cumul du solde depuis janvier, année N contre année N−1. */
export function YearCompare({ pick, onPick }: YearCompareProps) {
  const entries = useEntries()
  // Voir `MonthCompare` : la portée, pas le membre.
  const { entries: scoped } = useMonthScope()
  const currency = useCurrency()

  /* Les années proposées se lisent sur le document entier et non sur la portée
     courante : le sélecteur dit ce que les données couvrent, et une année qui
     disparaîtrait en changeant de filtre ferait croire à une perte. Ce que la
     portée décide, c'est ce qui se trace — et une année choisie où elle n'a
     rien se lit alors en cadratins, pas en zéros. */
  const years = useMemo(() => coveredYears(entries), [entries])
  const last = years.at(-1)

  const year = pick !== null && years.includes(pick) ? pick : last
  const previous = year === undefined ? undefined : year - 1

  const current = useMemo(() => (year === undefined ? [] : yearSeries(scoped, year)), [scoped, year])
  const before = useMemo(
    () => (previous === undefined ? [] : yearSeries(scoped, previous)),
    [scoped, previous],
  )

  if (year === undefined || previous === undefined) {
    return <p className="t-label">{history.yearsEmpty}</p>
  }

  /* L'année d'avant se juge sur ce qu'on trace, et non sur le document : le
     contrôle lisait les entrées **non portées** pendant que le tracé lisait les
     entrées portées. Sous un filtre par membre, une année d'avant vide pour
     cette personne ajoutait une ligne de légende sans trait — un trait qu'on
     cherche et qui n'existe pas. */
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

  /* L'horizon commun : le dernier mois que l'année choisie sait chiffrer.
     Une année en cours lue jusqu'à son dernier mois contre une année pleine lue
     jusqu'en décembre comparait onze mois à douze, et annonçait comme un écart
     ce qui n'était qu'un mois de plus. Les deux se lisent donc au même rang —
     ce que la lecture au curseur fait déjà par construction, et que le résumé
     accessible, lui, ne faisait pas. */
  const horizon = yearHorizon(current)
  const partial = horizon !== -1 && horizon < current.length - 1
  const cumulativeAt = (points: readonly YearPoint[]): Money | null =>
    horizon === -1 ? null : (points[horizon]?.cumulative ?? null)
  const endCurrent = cumulativeAt(current)
  const endBefore = hasPrevious ? cumulativeAt(before) : null

  const money = (value: Money | null): string =>
    value === null ? NO_VALUE : formatMoney(value, currency, false)

  /* L'écart, mois par mois — la synthèse que demande la refonte, posée dans la
     lecture qui existe déjà plutôt qu'à côté d'elle : le curseur s'ouvre sur
     l'horizon, donc à l'arrivée ces trois chiffres *sont* le bilan de l'année.
     Un second bloc au-dessus du tracé aurait écrit les deux mêmes nombres une
     seconde fois — c'est l'argument qui a retiré les légendes d'ici. */
  const currentLine = series[0]?.values ?? []
  const beforeLine = series[1]?.values ?? []
  const extra: ExtraRead | undefined = hasPrevious
    ? {
        label: history.yearsDelta,
        values: currentLine.map((value, index) => {
          const other = beforeLine[index]
          return value === null || other === null || other === undefined ? null : value - other
        }),
      }
    : undefined

  return (
    <div className="flex flex-col gap-4">
      {/* La comparaison n'a qu'un sélecteur et se fait toujours contre l'année
          d'avant : on le dit à côté, plutôt que de le laisser deviner au
          tracé. */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Field label={history.year} className="max-w-40">
          {(id) => (
            <Select
              id={id}
              value={String(year)}
              onChange={(e) => {
                onPick(Number(e.target.value))
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
        <span className="t-axis tnum pb-4">{tpl(history.yearsVersus, year, previous)}</span>
      </div>

      {/* Ni légende ni phrase sous le tracé : la lecture au-dessus du graphique
          porte les deux années avec leur trait et leur valeur du mois lu, plus
          leur écart, et « Cumul du solde, mois après mois » était déjà le nom
          accessible du graphique — il s'écrivait donc deux fois pour un seul
          sens. */}
      <CumulativeLines
        series={series}
        {...(extra === undefined ? {} : { extra })}
        label={history.cumulative}
        /* Le résumé nomme le mois d'arrêt et donne les deux cumuls **à ce
           mois-là**. Il lisait décembre pour les deux, c'est-à-dire huit mois
           d'une année en cours contre douze de la précédente. */
        srText={
          horizon === -1
            ? tpl(history.srYearsEmpty, year)
            : tpl(
                history.srYears,
                year,
                previous,
                monthName(horizon + 1),
                `${money(endCurrent)} / ${money(endBefore)}`,
              )
        }
      />

      {/* Une année en cours ne se compare pas à une année finie sans qu'on le
          dise : un chiffre juste qu'on ne comprend pas se lit comme un chiffre
          faux. Le tracé, lui, garde les deux années entières — rogner l'année
          d'avant cacherait des données réelles, et l'œil voit très bien où
          l'année en cours s'arrête. */}
      {partial && (
        <p className="t-label">{tpl(history.yearsPartial, year, monthName(horizon + 1))}</p>
      )}
      {!hasPrevious && <p className="t-label">{tpl(history.yearsNoPrevious, previous)}</p>}
    </div>
  )
}
