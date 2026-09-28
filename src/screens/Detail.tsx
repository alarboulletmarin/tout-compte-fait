import { monthlyAmount } from '../domain/split'
import { memberAccount } from '../domain/types'
import { useI18n } from '../i18n/i18n'
import { useStore } from '../storage/store'
import { SubScreen } from '../ui/Screens'
import { Shape } from '../ui/Shape'
import { MEMBERS, useNames } from './common'

export function Detail() {
  const { t, euros, share } = useI18n()
  const { data, split } = useStore()
  const names = useNames()

  return (
    <SubScreen title={t.detail.title} back="/" backLabel={t.detail.back} className="detail">
      <p className="detail__intro">{t.detail.intro(euros(split.total))}</p>

      {MEMBERS.map((i) => {
        const own = data.charges.filter((c) => c.paidFrom === memberAccount(i))
        return (
          <section
            key={i}
            className="card card--large stack stack--12"
            aria-labelledby={`member-${i}`}
          >
            <div className="between">
              <h2 id={`member-${i}`} className="member-title">
                <Shape account={memberAccount(i)} />
                {names[i]}
              </h2>
              <span className="num detail__share">{share(split.shares[i])}</span>
            </div>
            <div className="between detail__line">
              <span>{t.detail.share}</span>
              <span className="num">{euros(split.due[i])}</span>
            </div>
            {own.length > 0 && (
              <div className="stack stack--8 detail__paid">
                <div className="caption">{t.detail.alreadyPaid}</div>
                {own.map((c) => (
                  <div key={c.id} className="between detail__line detail__line--muted">
                    <span>− {c.label}</span>
                    <span className="num">{euros(monthlyAmount(c))}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="divider" />
            <div className="between between--baseline">
              <span className="detail__result">{t.detail.toJoint}</span>
              <span className="num detail__result-amount">{euros(split.toJoint[i])}</span>
            </div>
            {split.reimbursement?.from === i && (
              <div className="between between--baseline">
                <span className="detail__result">
                  {t.detail.directly(names[split.reimbursement.to])}
                </span>
                <span className="num detail__result-amount">
                  {euros(split.reimbursement.amount)}
                </span>
              </div>
            )}
          </section>
        )
      })}

      <p className="detail__together">
        <Shape account="joint" />
        <span>
          {t.detail.together} <span className="num detail__ink">{euros(split.joint)}</span>
          {t.detail.togetherEnd}
        </span>
      </p>
    </SubScreen>
  )
}
