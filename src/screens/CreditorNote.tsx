import { Amount } from '../ui/Amount'
import { useI18n } from '../i18n/i18n'
import { useStore } from '../storage/store'
import { InfoNote } from '../ui/Notes'
import { useNames } from './common'
import { at } from '../domain/at'

/** Explique à un créditeur pourquoi on le rembourse : ce qu'il paie, sa part, qui lui rembourse. */
export function CreditorNote({ index }: { index: number }) {
  const { t } = useI18n()
  const { split } = useStore()
  const names = useNames()
  const payers = split.reimbursements.filter((r) => r.to === index).map((r) => at(names, r.from))
  return (
    <InfoNote>
      {t.transfers.explainPays(at(names, index))}
      <Amount cents={at(split.paid, index)} className="info__ink" />
      {t.transfers.explainShare}
      <Amount cents={at(split.due, index)} className="info__ink" />
      {t.transfers.explainEnd(payers)}
    </InfoNote>
  )
}
