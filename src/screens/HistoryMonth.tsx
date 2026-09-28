import { Fragment } from 'react'
import { Redirect } from 'wouter'
import { compareMonths, sortedMonths, type ChargeField } from '../domain/history'
import type { Snapshot } from '../domain/data'
import { monthlyAmount } from '../domain/split'
import type { Charge } from '../domain/types'
import { useI18n } from '../i18n/i18n'
import { MonthView, useStore } from '../storage/store'
import { ArrowRightIcon } from '../ui/icons'
import { InfoNote } from '../ui/Notes'
import { SubScreen } from '../ui/Screens'
import { DetailBody } from './Detail'
import { TransferBody } from './Transfers'

/** Un mois figé, en lecture seule : virements, comparaison avec le mois d'avant, détail du calcul. */
export function HistoryMonth({ month }: { month: string }) {
  const { t, month: monthName, monthTitle } = useI18n()
  const { data } = useStore()
  // Le mois vient de l'adresse : hasOwn écarte « __proto__ » et consorts
  const snapshot = Object.hasOwn(data.history, month) ? data.history[month] : undefined
  if (!snapshot) return <Redirect to="/history" replace />
  const months = sortedMonths(data.history)
  const previousMonth = months[months.indexOf(month) - 1]
  const previous = previousMonth === undefined ? undefined : data.history[previousMonth]

  return (
    <SubScreen
      title={monthTitle(month)}
      back="/history"
      backLabel={t.history.back}
      className="month"
    >
      <MonthView snapshot={snapshot}>
        {snapshot.carried && <InfoNote>{t.history.carriedNote(monthName(month))}</InfoNote>}
        <TransferBody level="h2" />
        {previousMonth === undefined || previous === undefined ? (
          <p className="detail__intro">{t.history.compare.first}</p>
        ) : (
          <Comparison previousMonth={previousMonth} previous={previous} month={snapshot} />
        )}
        <div className="stack stack--12">
          <h2 className="section-title">{t.detail.title}</h2>
          <DetailBody />
        </div>
      </MonthView>
    </SubScreen>
  )
}

function Comparison(props: { previousMonth: string; previous: Snapshot; month: Snapshot }) {
  const { t, euros, month: monthName } = useI18n()
  const { totalDelta, added, removed, changed } = compareMonths(props.previous, props.month)
  const c = t.history.compare
  const unchanged = added.length + removed.length + changed.length === 0

  return (
    <section className="card card--large stack stack--12" aria-labelledby="compare-title">
      <h2 id="compare-title" className="member-title">
        {c.title(monthName(props.previousMonth))}
      </h2>
      <div className="between between--baseline detail__line">
        <span>{c.total}</span>
        <span className="num compare__delta">
          {totalDelta === 0
            ? c.same
            : `${totalDelta > 0 ? '+' : '−'}\u00a0${euros(Math.abs(totalDelta))}`}
        </span>
      </div>
      {unchanged && <p className="caption-13">{c.nothing}</p>}
      <ChargeGroup title={c.added} sign="+" charges={added} />
      <ChargeGroup title={c.removed} sign="−" charges={removed} />
      {changed.length > 0 && (
        <div className="stack stack--8">
          <div className="caption">{c.changed}</div>
          {changed.map(({ before, after, fields }) => (
            <div key={after.id} className="stack stack--4">
              <div className="between detail__line">
                <span>{after.label}</span>
                <span className="num compare__amounts">
                  {monthlyAmount(before) !== monthlyAmount(after) && (
                    <Fragment>
                      {euros(monthlyAmount(before))}
                      <ArrowRightIcon />
                      <span className="visually-hidden">{c.becomes}</span>
                    </Fragment>
                  )}
                  {euros(monthlyAmount(after))}
                </span>
              </div>
              <div className="caption">
                {c.changedFields(fields.map((f) => c.fields[FIELD_NAME[f]]))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

/** Le nom d'un champ de charge dans les messages. */
const FIELD_NAME = {
  label: 'label',
  amount: 'amount',
  frequency: 'frequency',
  paidFrom: 'account',
  categoryId: 'category',
} as const satisfies Record<ChargeField, string>

function ChargeGroup(props: { title: string; sign: '+' | '−'; charges: readonly Charge[] }) {
  const { euros } = useI18n()
  if (props.charges.length === 0) return null
  return (
    <div className="stack stack--8">
      <div className="caption">{props.title}</div>
      {props.charges.map((c) => (
        <div key={c.id} className="between detail__line">
          <span>
            {props.sign} {c.label}
          </span>
          <span className="num">{euros(monthlyAmount(c))}</span>
        </div>
      ))}
    </div>
  )
}
