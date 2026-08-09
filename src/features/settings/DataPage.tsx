import { useNavigate } from 'react-router-dom'
import { MORE_PATH } from '@/app/routes'
import { t } from '@/i18n/strings'
import { PageTitle } from '@/ui/PageTitle'
import { DataSection } from './DataSection'

/**
 * Les fichiers qui sortent, ceux qui rentrent, et l'effacement.
 *
 * La vue ne fait que porter le titre et le retour : tout ce qu'elle montre vit
 * dans `DataSection`, qui garde ses gestes et ses confirmations intacts.
 */
export function DataPage() {
  const navigate = useNavigate()

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <PageTitle
        title={t.settings.transfer}
        onBack={() => {
          void navigate(MORE_PATH)
        }}
      />
      <DataSection />
    </div>
  )
}
