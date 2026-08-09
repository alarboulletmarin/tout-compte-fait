import { useNavigate } from 'react-router-dom'
import { SAVINGS_PATH } from '@/app/routes'
import { t } from '@/i18n/strings'
import { PageTitle } from '@/ui/PageTitle'
import { useIndividualScope } from './individualScope'
import { SupportsSection } from './SupportsSection'

/**
 * Les supports d'une personne, en entier — relever, ouvrir, archiver.
 *
 * `/epargne` n'en montre plus qu'un aperçu : la liste, sans les gestes de
 * patrimoine qui vont avec elle. Ils vivent ici, où l'on descend pour les
 * chercher plutôt que d'y trouver deux boutons de gestion au-dessus du
 * premier chiffre du mois.
 */
export function SupportsPage() {
  const navigate = useNavigate()
  /* La même personne que la vue d'ensemble : descendre depuis « Gérer » ne
     doit pas retomber sur le premier membre du foyer si une autre était déjà
     lue là-haut. */
  useIndividualScope()

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <PageTitle
        title={t.savings.supports}
        onBack={() => {
          void navigate(SAVINGS_PATH)
        }}
      />
      <SupportsSection heading={false} />
    </div>
  )
}
