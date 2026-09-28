import { Link } from 'wouter'
import { memberAccount } from '../domain/types'
import { sharePercents } from '../i18n/format'
import { useI18n } from '../i18n/i18n'
import { useStore } from '../storage/store'
import { ArrowRightIcon, CheckIcon } from '../ui/icons'
import { TabScreen } from '../ui/Screens'
import { Shape } from '../ui/Shape'
import { SplitBar } from '../ui/SplitBar'
import { MEMBERS, useNames } from './common'

export function Transfers() {
  const { t, euros, decimal } = useI18n()
  const { data, split } = useStore()
  const names = useNames()
  const [p1, p2] = sharePercents(split.shares[0])

  return (
    <TabScreen kicker={t.transfers.kicker} className="transfers">
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

      <Link href="/detail" className="link-row">
        <span>{t.transfers.seeDetail}</span>
        <ArrowRightIcon />
      </Link>
    </TabScreen>
  )
}
