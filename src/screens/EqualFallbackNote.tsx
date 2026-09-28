import { useI18n } from '../i18n/i18n'
import { useStore } from '../storage/store'
import { InfoNote } from '../ui/Notes'

/** Dit que la répartition passe à 50 / 50 tant qu'un revenu manque ou vaut 0. */
export function EqualFallbackNote() {
  const { t } = useI18n()
  const { data, split } = useStore()
  if (!split.equalFallback) return null
  const zero = data.household.members.some((m) => m.income === 0)

  return (
    <InfoNote strong status>
      {zero ? (
        <>
          {t.equalFallback.zero} <span className="num">0 €</span>
        </>
      ) : (
        t.equalFallback.missing
      )}
      {t.equalFallback.rest}
      <span className="num">50 / 50</span>
      {t.equalFallback.end}
    </InfoNote>
  )
}
