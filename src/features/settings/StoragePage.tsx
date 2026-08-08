import { useNavigate } from 'react-router-dom'
import { MORE_PATH } from '@/app/routes'
import { fr } from '@/i18n/fr'
import { PageTitle } from '@/ui/PageTitle'
import { StorageSection } from './StorageSection'

/**
 * Ce que ce navigateur garde, et les sauvegardes qu'il tient tout seul.
 *
 * Elle porte le titre et le retour ; `StorageSection` garde l'état, les gestes
 * et la restauration — c'est aussi ce qui permet de l'éprouver seule.
 */
export function StoragePage() {
  const navigate = useNavigate()

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <PageTitle
        title={fr.storage.title}
        onBack={() => {
          void navigate(MORE_PATH)
        }}
      />
      <StorageSection />
    </div>
  )
}
