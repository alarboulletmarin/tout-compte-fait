import { useNavigate } from 'react-router-dom'
import { SAVINGS_PATH } from '@/app/routes'
import { t } from '@/i18n/strings'
import { PageTitle } from '@/ui/PageTitle'
import { IndividualScope } from './IndividualScope'
import { SupportsSection } from './SupportsSection'

/**
 * Les supports d'une personne, en entier — relever, ouvrir, archiver.
 *
 * `/epargne` n'en montre plus qu'un aperçu : la liste, sans les gestes de
 * patrimoine qui vont avec elle. Ils vivent ici, où l'on descend pour les
 * chercher plutôt que d'y trouver deux boutons de gestion au-dessus du
 * premier chiffre du mois.
 */
/* La portée individuelle se pose par-dessus le filtre du mois, sans
   l'écrire : « Commun » et « Tout le monde » survivent au détour par
   l'épargne. Le fournisseur enveloppe le contenu parce qu'un composant ne
   peut pas consommer le contexte qu'il fournit lui-même. */
export function SupportsPage() {
  return (
    <IndividualScope>
      <SupportsPageContent />
    </IndividualScope>
  )
}

function SupportsPageContent() {
  const navigate = useNavigate()

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
