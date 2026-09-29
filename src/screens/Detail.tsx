import { monthlyAmount } from '../domain/split'
import { memberAccount } from '../domain/types'
import { Amount, ShareValue } from '../ui/Amount'
import { useI18n } from '../i18n/i18n'
import { useStore } from '../storage/store'
import { SubScreen } from '../ui/Screens'
import { Shape } from '../ui/Shape'
import { useLive, useNames } from './common'
import { at } from '../domain/at'

export function Detail() {
  const { t } = useI18n()
  return (
    <SubScreen title={t.detail.title} back="/" backLabel={t.detail.back} className="detail">
      <DetailBody />
    </SubScreen>
  )
}

/** Le détail du calcul du mois affiché : une carte par membre, puis le joint. */
export function DetailBody() {
  const { t, euros } = useI18n()
  const { data, split } = useStore()
  const names = useNames()
  const live = useLive()

  return (
    <>
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
              <ShareValue share={at(split.shares, i)} className="detail__share" />
            </div>
            <div className="between detail__line">
              <span>{t.detail.share}</span>
              <Amount cents={at(split.due, i)} />
            </div>
            {own.length > 0 && (
              <div className="stack stack--8 detail__paid">
                <div className="caption">{t.detail.alreadyPaid}</div>
                {own.map((c) => (
                  <div key={c.id} className="between detail__line detail__line--muted">
                    <span>− {c.label}</span>
                    <Amount cents={monthlyAmount(c)} />
                  </div>
                ))}
              </div>
            )}
            <div className="divider" />
            <div className="between between--baseline">
              <span className="detail__result">{t.detail.toJoint}</span>
              <Amount
                cents={at(split.toJoint, i)}
                className="detail__result-amount"
                id={live(`toJoint:${i}`)}
                transitionName={live(`amount-${i}`)}
              />
            </div>
            {split.reimbursements
              .filter((r) => r.from === i)
              .map((r) => (
                <div key={r.to} className="between between--baseline">
                  <span className="detail__result">{t.detail.directly(at(names, r.to))}</span>
                  <Amount cents={r.amount} className="detail__result-amount" />
                </div>
              ))}
          </section>
        )
      })}

      <p className="detail__together">
        <Shape of="joint" />
        <span>
          {t.detail.together} <Amount cents={split.joint} className="detail__ink" />
          {t.detail.togetherEnd}
        </span>
      </p>
    </>
  )
}
