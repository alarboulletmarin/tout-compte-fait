import { useNavigate } from 'react-router-dom'
import { SAVINGS_PATH } from '@/app/routes'
import { t } from '@/i18n/strings'
import { PageTitle } from '@/ui/PageTitle'
import { GrowthSection } from './GrowthSection'
import { IndividualScope } from './IndividualScope'

/**
 * D'où vient l'épargne d'une personne — un seul bloc, et il conclut.
 *
 * L'écran en portait deux : la pile des comptes dans le temps, et le cumul des
 * versements de l'année contre l'année d'avant. Aucun des deux ne répondait à ce
 * qu'on vient chercher ici. Le premier disait *où* l'argent est — la banque le
 * dit déjà, mieux et sans recopie. Le second comptait ce qui sort du compte
 * courant, du flux pur : il ne savait pas dire si ces versements avaient produit
 * quatre euros ou quatre cents.
 *
 * Ce qui reste est la seule lecture que l'app soit **seule** à pouvoir faire,
 * parce qu'elle seule tient à la fois les relevés et les mouvements : de quoi le
 * capital est fait — un départ, des versements, et ce que les comptes ont produit
 * par-dessus.
 */
/* La portée individuelle se pose par-dessus le filtre du mois, sans
   l'écrire : « Commun » et « Tout le monde » survivent au détour par
   l'épargne. Le fournisseur enveloppe le contenu parce qu'un composant ne
   peut pas consommer le contexte qu'il fournit lui-même. */
export function AnalysisPage() {
  return (
    <IndividualScope>
      <AnalysisPageContent />
    </IndividualScope>
  )
}

function AnalysisPageContent() {
  const navigate = useNavigate()

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <PageTitle
        title={t.savings.analysis}
        onBack={() => {
          void navigate(SAVINGS_PATH)
        }}
      />
      <GrowthSection />
    </div>
  )
}
