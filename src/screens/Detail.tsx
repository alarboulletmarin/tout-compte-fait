import { monthlyAmount } from '../domain/split'
import { memberAccount } from '../domain/types'
import { useI18n } from '../i18n/i18n'
import { useStore } from '../storage/store'
import { SubScreen } from '../ui/Screens'
import { Shape } from '../ui/Shape'
import { useNames } from './common'
import { at } from '../domain/at'

export function Detail() {
  const { t, euros, share } = useI18n()
  const { data, split } = useStore()
  const names = useNames()

  return (
    <SubScreen title={t.detail.title} back="/" backLabel={t.detail.back} className="detail">
      <p className="detail__intro">{t.detail.intro(euros(split.total))}</p>

      {data.household.members.map((member, i) => {
        const own = data.charges.filter((c) => c.paidFrom === memberAccount(member.id))
        return (
          <section
            key={member.id}
            className="card card--large stack stack--12"
            aria-labelledby={`member-${i}`}
          >
            <div className="between">
              <h2 id={`member-${i}`} className="member-title">
                <Shape of={i} />
                {names[i]}
              </h2>
              <span className="num detail__share">{share(at(split.shares, i))}</span>
            </div>
            <div className="between detail__line">
              <span>{t.detail.share}</span>
              <span className="num">{euros(at(split.due, i))}</span>
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
              <span className="num detail__result-amount">{euros(at(split.toJoint, i))}</span>
            </div>
            {split.reimbursements
              .filter((r) => r.from === i)
              .map((r) => (
                <div key={r.to} className="between between--baseline">
                  <span className="detail__result">{t.detail.directly(at(names, r.to))}</span>
                  <span className="num detail__result-amount">{euros(r.amount)}</span>
                </div>
              ))}
          </section>
        )
      })}

      <p className="detail__together">
        <Shape of="joint" />
        <span>
          {t.detail.together} <span className="num detail__ink">{euros(split.joint)}</span>
          {t.detail.togetherEnd}
        </span>
      </p>
    </SubScreen>
  )
}
