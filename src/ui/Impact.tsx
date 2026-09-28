import { useI18n } from '../i18n/i18n'
import { Shape } from './Shape'

export interface ImpactRow {
  /** Indice du membre, pour sa forme. */
  who: number
  name: string
  /** Virement vers le joint avant et après le changement, en centimes. */
  before: number
  after: number
}

/** Ce que change une suppression pour les virements de chacun. */
export function Impact({ rows }: { rows: readonly ImpactRow[] }) {
  const { t, euros } = useI18n()
  return (
    <div className="impact">
      <div className="caption">{t.deletion.impact}</div>
      {rows.map((row) => (
        <div key={row.who} className="between impact__row">
          <span className="impact__who">
            <Shape of={row.who} />
            {row.name}
          </span>
          <span className="num impact__values">
            <del className="impact__old">{euros(row.before)}</del>
            <span className="impact__arrow" aria-hidden="true">
              →
            </span>
            <ins className="impact__new">{euros(row.after)}</ins>
          </span>
        </div>
      ))}
    </div>
  )
}
