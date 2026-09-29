import { sharePercents } from '../i18n/format'
import { useI18n } from '../i18n/i18n'
import { Odometer } from './Amount'
import { Shape } from './Shape'

/**
 * Répartition au prorata : une part par membre, chacune avec sa hachure
 * (pleine, puis hachures distinctes). À plus de deux, la légende nomme chaque part.
 */
export function SplitBar(props: { shares: readonly number[]; names: readonly string[] }) {
  const { t, decimal } = useI18n()
  const percents = sharePercents(props.shares)
  const many = percents.length > 2
  // Parts égales : un repère au milieu de la barre le dit, sans avoir à lire les pourcentages
  const even = percents.length === 2 && percents[0] === percents[1]

  return (
    <>
      <div className="split-head">
        <span>{t.transfers.split}</span>
        {!many && <Odometer value={percents[0] ?? 0} text={percents.map(decimal).join(' / ')} />}
      </div>
      <div
        className="split-bar"
        data-even={even || undefined}
        role="img"
        aria-label={percents.map((p, i) => `${props.names[i]} ${decimal(p)} %`).join(', ')}
      >
        {percents.map((p, i) => (
          <div
            key={i}
            className={`split-bar__part split-bar__part--${i}`}
            style={{ flexGrow: p }}
          />
        ))}
      </div>
      {many && (
        <ul className="split-legend">
          {percents.map((p, i) => (
            <li key={i}>
              <Shape of={i} />
              {props.names[i]} <span className="num">{decimal(p)} %</span>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
