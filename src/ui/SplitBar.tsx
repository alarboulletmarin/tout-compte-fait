import { sharePercents } from '../i18n/format'
import { useI18n } from '../i18n/i18n'
import { Shape } from './Shape'

/**
 * Répartition au prorata : une part par membre, chacune avec sa hachure
 * (pleine, puis hachures distinctes). À plus de deux, la légende nomme chaque part.
 */
export function SplitBar(props: { shares: readonly number[]; names: readonly string[] }) {
  const { t, decimal } = useI18n()
  const percents = sharePercents(props.shares)
  const many = percents.length > 2

  return (
    <>
      <div className="split-head">
        <span>{t.transfers.split}</span>
        {!many && <span className="num">{percents.map(decimal).join(' / ')}</span>}
      </div>
      <div
        className="split-bar"
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
