import { Link } from 'wouter'
import { computeSplit } from '../domain/split'
import { monthOf } from '../domain/history'
import { at } from '../domain/at'
import { useI18n } from '../i18n/i18n'
import { useStore } from '../storage/store'
import { ChevronIcon } from '../ui/icons'
import { TabScreen } from '../ui/Screens'

/** Les mois gardés, du plus récent au plus ancien : T et virements de chacun. */
export function History() {
  const { t, euros, monthTitle } = useI18n()
  const { data } = useStore()
  // Les clés « AAAA-MM » se trient comme du texte
  const months = Object.entries(data.history).sort(([a], [b]) => (a < b ? 1 : -1))
  const now = monthOf()

  return (
    <TabScreen title={t.nav.history} kicker={t.history.kicker} className="history">
      <h1 className="lead">{t.history.lead}</h1>
      <ul className="group">
        {months.map(([key, { household, charges, carried }]) => {
          const split = computeSplit(household, charges)
          return (
            <li key={key}>
              <Link href={`/history/${key}`} className="month-row">
                <span className="between between--baseline">
                  <span className="month-row__month">{monthTitle(key)}</span>
                  <span className="month-row__total">
                    <span className="visually-hidden">{t.history.totalLabel}</span>
                    <span className="num">{euros(split.total)}</span>
                    <ChevronIcon />
                  </span>
                </span>
                {(key === now || carried) && (
                  <span className="month-row__tags">
                    {key === now && <span className="tag">{t.history.current}</span>}
                    {carried && <span className="tag">{t.history.carried}</span>}
                  </span>
                )}
                <span className="month-row__who">
                  {household.members.map((m, i) => (
                    <span key={m.id}>
                      {m.name.trim() || t.memberFallback(i)}{' '}
                      <span className="num">{euros(at(split.toJoint, i))}</span>
                    </span>
                  ))}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
      {months.length < 2 && (
        <section className="card card--large stack stack--6">
          <h2 className="history__empty-title">{t.history.emptyTitle}</h2>
          <p className="detail__intro">{t.history.emptyText}</p>
        </section>
      )}
    </TabScreen>
  )
}
