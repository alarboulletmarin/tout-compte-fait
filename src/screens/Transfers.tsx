import { useState } from 'react'
import { Link } from 'wouter'
import { creditors, debtors, type Split } from '../domain/split'
import { useI18n } from '../i18n/i18n'
import { useStore } from '../storage/store'
import { ArrowRightIcon, CheckIcon, PlusIcon, ShareIcon } from '../ui/icons'
import { TabScreen } from '../ui/Screens'
import { Shape } from '../ui/Shape'
import { SplitBar } from '../ui/SplitBar'
import { useMediaQuery, WIDE } from '../ui/useMediaQuery'
import { useNames } from './common'
import { CreditorNote } from './CreditorNote'
import { Dashboard } from './Dashboard'
import { EqualFallbackNote } from './EqualFallbackNote'
import { RecapSheet } from './RecapSheet'
import { at } from '../domain/at'

export function Transfers() {
  const { t } = useI18n()
  const { data, split } = useStore()
  const [recap, setRecap] = useState(false)
  const wide = useMediaQuery(WIDE)

  if (data.charges.length === 0) {
    return (
      <TabScreen title={t.nav.transfers} kicker={t.transfers.kicker} className="empty-state">
        <Empty />
      </TabScreen>
    )
  }
  if (wide) {
    return (
      <TabScreen title={t.nav.transfers} kicker={t.transfers.kicker} className="dashboard-screen">
        <Dashboard />
      </TabScreen>
    )
  }
  return (
    <TabScreen title={t.nav.transfers} kicker={t.transfers.kicker} className="transfers">
      {split.reimbursements.length > 0 ? <Reimbursement split={split} /> : <Regular />}
      <EqualFallbackNote />
      <Link href="/detail" className="link-row">
        <span>{t.transfers.seeDetail}</span>
        <ArrowRightIcon />
      </Link>
      <button
        type="button"
        className="button button--primary button--icon transfers__recap"
        onClick={() => setRecap(true)}
      >
        <ShareIcon />
        {t.recap.open}
      </button>
      <RecapSheet open={recap} onClose={() => setRecap(false)} />
    </TabScreen>
  )
}

function Regular() {
  const { t, euros } = useI18n()
  const { data, split } = useStore()
  const names = useNames()

  return (
    <>
      <section className="stack stack--20">
        <h1 className="lead">{t.transfers.title}</h1>
        <div className="stack stack--14">
          {names.map((name, i) => (
            <div className="transfer" key={i}>
              <div className="transfer__who">
                <Shape of={i} />
                {name}
              </div>
              <div className="num transfer__amount">{euros(at(split.toJoint, i))}</div>
            </div>
          ))}
        </div>
        <p className="note">
          <CheckIcon />
          <span>{t.transfers.total(euros(split.joint))}</span>
        </p>
      </section>

      <section className="stack stack--10">
        <SplitBar shares={split.shares} names={names} />
      </section>

      <section className="stats">
        <div className="card stat">
          <div className="stat__label">{t.transfers.fixedPerMonth}</div>
          <div className="num stat__value">{euros(split.total)}</div>
          <div className="stat__label">{t.chargesCount(data.charges.length)}</div>
        </div>
        <div className="card stat">
          <div className="stat__label">{t.transfers.paidDirect}</div>
          <div className="num stat__value">{euros(split.paid.reduce((a, b) => a + b, 0))}</div>
          <div className="stat__label">{t.transfers.fromPersonal}</div>
        </div>
      </section>
    </>
  )
}

/** Des membres paient déjà plus que leur part : ils ne virent rien, les autres les remboursent. */
function Reimbursement({ split }: { split: Split }) {
  const { t, euros } = useI18n()
  const names = useNames()

  return (
    <>
      <h1 className="lead">{t.transfers.titleNegative}</h1>
      {creditors(split).map((to) => (
        <section key={to} className="stack stack--6">
          <div className="transfer">
            <div className="transfer__who">
              <Shape of={to} />
              {names[to]}
            </div>
            <div className="transfer__nothing">{t.transfers.nothing}</div>
          </div>
          <p className="transfer__why">{t.transfers.alreadyMore(at(names, to))}</p>
        </section>
      ))}

      {debtors(split).map((from) => {
        const payments = split.reimbursements.filter((r) => r.from === from)
        const onJoint = at(split.toJoint, from)
        const who = (
          <div className="transfer__who">
            <Shape of={from} />
            {names[from]}
          </div>
        )
        if (onJoint === 0 && payments.length === 0) {
          return (
            <section key={from} className="transfer">
              {who}
              <div className="transfer__nothing">{t.transfers.nothing}</div>
            </section>
          )
        }
        return (
          <section key={from} className="stack stack--12">
            {who}
            {onJoint > 0 && (
              <div className="transfer transfer--sub">
                <span className="transfer__to">
                  <Shape of="joint" />
                  {t.transfers.onJoint}
                </span>
                <span className="num transfer__amount--sub">{euros(onJoint)}</span>
              </div>
            )}
            {payments.map((r) => (
              <div key={r.to} className="transfer transfer--sub">
                <span className="transfer__to">
                  <Shape of={r.to} />
                  {t.transfers.directly(at(names, r.to))}
                </span>
                <span className="num transfer__amount--sub">{euros(r.amount)}</span>
              </div>
            ))}
          </section>
        )
      })}

      {creditors(split).map((to) => (
        <CreditorNote key={to} index={to} />
      ))}
    </>
  )
}

function Empty() {
  const { t, share } = useI18n()
  const { split } = useStore()
  const names = useNames()

  return (
    <>
      <div className="ghosts" aria-hidden="true">
        <span className="ghost ghost--member1" />
        <span className="ghost ghost--joint" />
        <span className="ghost ghost--member2" />
      </div>
      <div className="stack stack--10 empty-state__text">
        <h1 className="empty-state__title">{t.transfers.emptyTitle}</h1>
        <p>{t.transfers.emptyText}</p>
      </div>
      <Link href="/charges/new" className="button button--primary button--inline">
        <PlusIcon />
        {t.transfers.emptyAdd}
      </Link>
      <div className="share-legend">
        {names.map((name, i) => (
          <span key={i} className="share-legend__item">
            <Shape of={i} />
            {name} {share(at(split.shares, i))}
          </span>
        ))}
      </div>
      <EqualFallbackNote />
    </>
  )
}
