import { useState } from 'react'
import { Link } from 'wouter'
import { monthlyAmount } from '../domain/split'
import { memberAccount, type AccountRef } from '../domain/types'
import { sharePercents } from '../i18n/format'
import { useI18n } from '../i18n/i18n'
import { useStore } from '../storage/store'
import { ShareIcon } from '../ui/icons'
import { InfoNote } from '../ui/Notes'
import { Shape } from '../ui/Shape'
import { SplitBar } from '../ui/SplitBar'
import { MEMBERS, useNames } from './common'
import { EqualFallbackNote } from './EqualFallbackNote'
import { RecapSheet } from './RecapSheet'

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
  const r = split.reimbursement

  return (
    <section className="card card--dash" aria-labelledby="dash-transfers">
      <h1 id="dash-transfers" className="card__title">
        {r ? t.transfers.titleNegative : t.transfers.title}
      </h1>
      {r ? (
        <>
          <div className="transfer">
            <span className="transfer__who">
              <Shape account={memberAccount(r.to)} />
              {names[r.to]}
            </span>
            <span className="transfer__nothing">{t.transfers.nothing}</span>
          </div>
          <div className="transfer">
            <span className="transfer__who">
              <Shape account={memberAccount(r.from)} />
              {names[r.from]}
            </span>
            <span className="num dashboard__amount">{euros(split.joint)}</span>
          </div>
          <div className="transfer transfer--sub">
            <span className="transfer__to">
              <Shape account={memberAccount(r.to)} />
              {t.transfers.directly(names[r.to])}
            </span>
            <span className="num transfer__amount--sub">{euros(r.amount)}</span>
          </div>
          <InfoNote>
            {t.transfers.explainPays(names[r.to])}
            <span className="num info__ink">{euros(split.paid[r.to])}</span>
            {t.transfers.explainShare}
            <span className="num info__ink">{euros(split.due[r.to])}</span>
            {t.transfers.explainEnd(names[r.from])}
          </InfoNote>
        </>
      ) : (
        MEMBERS.map((i) => (
          <div key={i} className="transfer">
            <span className="transfer__who">
              <Shape account={memberAccount(i)} />
              {names[i]}
            </span>
            <span className="num dashboard__amount">{euros(split.toJoint[i])}</span>
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
  const { t, decimal } = useI18n()
  const { split } = useStore()
  const names = useNames()
  const [p1, p2] = sharePercents(split.shares[0])
  return (
    <section className="card card--dash" aria-label={t.transfers.split}>
      <div className="split-head">
        <span>{t.transfers.split}</span>
        <span className="num">
          {decimal(p1)} / {decimal(p2)}
        </span>
      </div>
      <SplitBar share1={split.shares[0]} names={names} />
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
        {MEMBERS.map((i) => (
          <div key={i} className="stack stack--10">
            <h3 className="dashboard__member">
              <Shape account={memberAccount(i)} />
              {names[i]}
            </h3>
            <div className="between dashboard__line">
              <span>{t.detail.share}</span>
              <span className="num">{euros(split.due[i])}</span>
            </div>
            {data.charges
              .filter((c) => c.paidFrom === memberAccount(i))
              .map((c) => (
                <div key={c.id} className="between dashboard__line dashboard__line--muted">
                  <span>− {c.label}</span>
                  <span className="num">{euros(monthlyAmount(c))}</span>
                </div>
              ))}
            <div className="between dashboard__line dashboard__line--total">
              <span>{t.dashboard.toJoint}</span>
              <span className="num">{euros(split.toJoint[i])}</span>
            </div>
            {split.reimbursement?.from === i && (
              <div className="between dashboard__line dashboard__line--total">
                <span>{t.detail.directly(names[split.reimbursement.to])}</span>
                <span className="num">{euros(split.reimbursement.amount)}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function ChargesCard() {
  const { t, euros } = useI18n()
  const { data, split } = useStore()
  const names = useNames()
  const accounts: [AccountRef, string, number][] = [
    ['joint', t.charges.joint, split.joint],
    ['member1', t.charges.accountOf(names[0]), split.paid[0]],
    ['member2', t.charges.accountOf(names[1]), split.paid[1]],
  ]

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
      {accounts.map(([account, title, subtotal]) => {
        const charges = data.charges.filter((c) => c.paidFrom === account)
        if (charges.length === 0) return null
        return (
          <div key={account} className="stack stack--4">
            <div className="between dashboard__account">
              <span className="dashboard__account-name">
                <Shape account={account} />
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
