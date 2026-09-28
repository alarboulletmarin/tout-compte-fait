import { Fragment, useState } from 'react'
import { Link } from 'wouter'
import { creditors, debtors, monthlyAmount } from '../domain/split'
import { memberAccount } from '../domain/types'
import { useI18n } from '../i18n/i18n'
import { useStore } from '../storage/store'
import { ShareIcon } from '../ui/icons'
import { Shape } from '../ui/Shape'
import { SplitBar } from '../ui/SplitBar'
import { useAccountTotals, useNames } from './common'
import { CreditorNote } from './CreditorNote'
import { EqualFallbackNote } from './EqualFallbackNote'
import { RecapSheet } from './RecapSheet'
import { at } from '../domain/at'

/** Virements sur tablette et desktop : virements, répartition, détail et charges d'un coup d'œil. */
export function Dashboard() {
  const [recap, setRecap] = useState(false)
  return (
    <div className="dashboard">
      <div className="dashboard__main">
        <TransfersCard onRecap={() => setRecap(true)} />
        <SplitCard />
        <EqualFallbackNote />
        <DetailCard />
      </div>
      <ChargesCard />
      <RecapSheet open={recap} onClose={() => setRecap(false)} />
    </div>
  )
}

function TransfersCard({ onRecap }: { onRecap: () => void }) {
  const { t, euros } = useI18n()
  const { split } = useStore()
  const names = useNames()
  const negative = split.reimbursements.length > 0

  return (
    <section className="card card--dash" aria-labelledby="dash-transfers">
      <h1 id="dash-transfers" className="card__title">
        {negative ? t.transfers.titleNegative : t.transfers.title}
      </h1>
      {negative ? (
        <>
          {creditors(split).map((to) => (
            <div key={to} className="transfer">
              <span className="transfer__who">
                <Shape of={to} />
                {names[to]}
              </span>
              <span className="transfer__nothing">{t.transfers.nothing}</span>
            </div>
          ))}
          {debtors(split).map((from) => (
            <Fragment key={from}>
              <div className="transfer">
                <span className="transfer__who">
                  <Shape of={from} />
                  {names[from]}
                </span>
                <span className="num dashboard__amount">{euros(at(split.toJoint, from))}</span>
              </div>
              {split.reimbursements
                .filter((r) => r.from === from)
                .map((r) => (
                  <div key={r.to} className="transfer transfer--sub">
                    <span className="transfer__to">
                      <Shape of={r.to} />
                      {t.transfers.directly(at(names, r.to))}
                    </span>
                    <span className="num transfer__amount--sub">{euros(r.amount)}</span>
                  </div>
                ))}
            </Fragment>
          ))}
          {creditors(split).map((to) => (
            <CreditorNote key={to} index={to} />
          ))}
        </>
      ) : (
        names.map((name, i) => (
          <div key={i} className="transfer">
            <span className="transfer__who">
              <Shape of={i} />
              {name}
            </span>
            <span className="num dashboard__amount">{euros(at(split.toJoint, i))}</span>
          </div>
        ))
      )}
      <div className="card__foot">
        <span className="caption-13">{t.dashboard.total(euros(split.joint))}</span>
        <button type="button" className="button-compact" onClick={onRecap}>
          <ShareIcon />
          {t.recap.open}
        </button>
      </div>
    </section>
  )
}

function SplitCard() {
  const { t } = useI18n()
  const { split } = useStore()
  const names = useNames()
  return (
    <section className="card card--dash" aria-label={t.transfers.split}>
      <SplitBar shares={split.shares} names={names} />
    </section>
  )
}

function DetailCard() {
  const { t, euros } = useI18n()
  const { data, split } = useStore()
  const names = useNames()
  return (
    <section className="card card--dash" aria-labelledby="dash-detail">
      <h2 id="dash-detail" className="card__title">
        {t.detail.title}
      </h2>
      <div className="dashboard__detail">
        {data.household.members.map((member, i) => (
          <div key={member.id} className="stack stack--10">
            <h3 className="dashboard__member">
              <Shape of={i} />
              {names[i]}
            </h3>
            <div className="between dashboard__line">
              <span>{t.detail.share}</span>
              <span className="num">{euros(at(split.due, i))}</span>
            </div>
            {data.charges
              .filter((c) => c.paidFrom === memberAccount(member.id))
              .map((c) => (
                <div key={c.id} className="between dashboard__line dashboard__line--muted">
                  <span>− {c.label}</span>
                  <span className="num">{euros(monthlyAmount(c))}</span>
                </div>
              ))}
            <div className="between dashboard__line dashboard__line--total">
              <span>{t.dashboard.toJoint}</span>
              <span className="num">{euros(at(split.toJoint, i))}</span>
            </div>
            {split.reimbursements
              .filter((r) => r.from === i)
              .map((r) => (
                <div key={r.to} className="between dashboard__line dashboard__line--total">
                  <span>{t.detail.directly(at(names, r.to))}</span>
                  <span className="num">{euros(r.amount)}</span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </section>
  )
}

function ChargesCard() {
  const { t, euros } = useI18n()
  const { data, split } = useStore()
  const accounts = useAccountTotals()

  return (
    <section className="card card--dash" aria-labelledby="dash-charges">
      <div className="between">
        <h2 id="dash-charges" className="card__title">
          {t.charges.kicker}
        </h2>
        <Link href="/charges/new" className="button-outline">
          <span aria-hidden="true">+</span>
          {t.charges.add}
        </Link>
      </div>
      <div className="num dashboard__total">{euros(split.total)}</div>
      {accounts.map(({ ref, who, title, subtotal }) => {
        const charges = data.charges.filter((c) => c.paidFrom === ref)
        if (charges.length === 0) return null
        return (
          <div key={ref} className="stack stack--4">
            <div className="between dashboard__account">
              <span className="dashboard__account-name">
                <Shape of={who} />
                {title}
              </span>
              <span className="num dashboard__subtotal">{euros(subtotal)}</span>
            </div>
            <ul className="dashboard__rows">
              {charges.map((c) => (
                <li key={c.id}>
                  <Link href={`/charges/${c.id}`} className="dashboard__row">
                    <span>{c.label}</span>
                    <span className="num">{euros(monthlyAmount(c))}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </section>
  )
}
