import { useI18n } from '../i18n/i18n'
import { useStore } from '../storage/store'
import { InfoNote } from '../ui/Notes'
import { useNames } from './common'
import { at } from '../domain/at'

/** Explique à un créditeur pourquoi on le rembourse : ce qu'il paie, sa part, qui lui rembourse. */
export function CreditorNote({ index }: { index: number }) {
  const { t, euros } = useI18n()
  const { split } = useStore()
  const names = useNames()
  const payers = split.reimbursements.filter((r) => r.to === index).map((r) => at(names, r.from))
  return (
    <InfoNote>
      {t.transfers.explainPays(at(names, index))}
      <span className="num info__ink">{euros(at(split.paid, index))}</span>
      {t.transfers.explainShare}
      <span className="num info__ink">{euros(at(split.due, index))}</span>
      {t.transfers.explainEnd(payers)}
    </InfoNote>
  )
}
