import { sharePercents } from '../i18n/format'
import { useI18n } from '../i18n/i18n'

/** Barre de répartition : membre 1 plein, membre 2 hachuré. */
export function SplitBar(props: { share1: number; names: readonly [string, string] }) {
  const { decimal } = useI18n()
  const [p1, p2] = sharePercents(props.share1)
  return (
    <div
      className="split-bar"
      role="img"
      aria-label={`${props.names[0]} ${decimal(p1)} %, ${props.names[1]} ${decimal(p2)} %`}
    >
      <div className="split-bar__member1" style={{ width: `${p1}%` }} />
      <div className="split-bar__member2" />
    </div>
  )
}
