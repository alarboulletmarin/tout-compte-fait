import { Link } from 'wouter'
import type { Split } from '../domain/split'
import { memberAccount } from '../domain/types'
import { sharePercents } from '../i18n/format'
import { useI18n } from '../i18n/i18n'
import { useStore } from '../storage/store'
import { ArrowRightIcon, CheckIcon, PlusIcon } from '../ui/icons'
import { InfoNote } from '../ui/Notes'
import { TabScreen } from '../ui/Screens'
import { Shape } from '../ui/Shape'
import { SplitBar } from '../ui/SplitBar'
import { MEMBERS, useNames } from './common'
import { EqualFallbackNote } from './EqualFallbackNote'

export function Transfers() {
  const { t } = useI18n()
  const { data, split } = useStore()

  if (data.charges.length === 0) {
    return (
      <TabScreen kicker={t.transfers.kicker} className="empty-state">
        <Empty />
      </TabScreen>
    )
  }
  return (
    <TabScreen kicker={t.transfers.kicker} className="transfers">
      {split.reimbursement ? (
        <Reimbursement split={split} reimbursement={split.reimbursement} />
      ) : (
        <Regular />
      )}
      <EqualFallbackNote />
      <Link href="/detail" className="link-row">
        <span>{t.transfers.seeDetail}</span>
        <ArrowRightIcon />
      </Link>
    </TabScreen>
  )
}

function Regular() {
  const { t, euros, decimal } = useI18n()
  const { data, split } = useStore()
  const names = useNames()
  const [p1, p2] = sharePercents(split.shares[0])

  return (
    <>
      <section className="stack stack--20">
        <h1 className="lead">{t.transfers.title}</h1>
        <div className="stack stack--14">
          {MEMBERS.map((i) => (
            <div className="transfer" key={i}>
              <div className="transfer__who">
                <Shape account={memberAccount(i)} />
                {names[i]}
              </div>
              <div className="num transfer__amount">{euros(split.toJoint[i])}</div>
            </div>
          ))}
        </div>
        <p className="note">
          <CheckIcon />
          <span>{t.transfers.total(euros(split.joint))}</span>
        </p>
      </section>

      <section className="stack stack--10">
        <div className="split-head">
          <span>{t.transfers.split}</span>
          <span className="num">
            {decimal(p1)} / {decimal(p2)}
          </span>
        </div>
        <SplitBar share1={split.shares[0]} names={names} />
      </section>

      <section className="stats">
        <div className="card stat">
          <div className="stat__label">{t.transfers.fixedPerMonth}</div>
          <div className="num stat__value">{euros(split.total)}</div>
          <div className="stat__label">{t.chargesCount(data.charges.length)}</div>
        </div>
        <div className="card stat">
          <div className="stat__label">{t.transfers.paidDirect}</div>
          <div className="num stat__value">{euros(split.paid[0] + split.paid[1])}</div>
          <div className="stat__label">{t.transfers.fromPersonal}</div>
        </div>
      </section>
    </>
  )
}

/** Un membre paie déjà plus que sa part : il ne vire rien, l'autre le rembourse. */
function Reimbursement(props: {
  split: Split
  reimbursement: NonNullable<Split['reimbursement']>
}) {
  const { t, euros } = useI18n()
  const names = useNames()
  const { from, to, amount } = props.reimbursement
  const { split } = props

  return (
    <>
      <h1 className="lead">{t.transfers.titleNegative}</h1>
      <section className="stack stack--6">
        <div className="transfer">
          <div className="transfer__who">
            <Shape account={memberAccount(to)} />
            {names[to]}
          </div>
          <div className="transfer__nothing">{t.transfers.nothing}</div>
        </div>
        <p className="transfer__why">{t.transfers.alreadyMore(names[to])}</p>
      </section>

      <section className="stack stack--12">
        <div className="transfer__who">
          <Shape account={memberAccount(from)} />
          {names[from]}
        </div>
        {split.joint > 0 && (
          <div className="transfer transfer--sub">
            <span className="transfer__to">
              <Shape account="joint" />
              {t.transfers.onJoint}
            </span>
            <span className="num transfer__amount--sub">{euros(split.joint)}</span>
          </div>
        )}
        <div className="transfer transfer--sub">
          <span className="transfer__to">
            <Shape account={memberAccount(to)} />
            {t.transfers.directly(names[to])}
          </span>
          <span className="num transfer__amount--sub">{euros(amount)}</span>
        </div>
      </section>

      <InfoNote>
        {t.transfers.explainPays(names[to])}
        <span className="num info__ink">{euros(split.paid[to])}</span>
        {t.transfers.explainShare}
        <span className="num info__ink">{euros(split.due[to])}</span>
        {t.transfers.explainEnd(names[from])}
      </InfoNote>
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
        {MEMBERS.map((i) => (
          <span key={i} className="share-legend__item">
            <Shape account={memberAccount(i)} />
            {names[i]} {share(split.shares[i])}
          </span>
        ))}
      </div>
      <EqualFallbackNote />
    </>
  )
}
