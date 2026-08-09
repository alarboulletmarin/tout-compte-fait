import { useNavigate } from 'react-router-dom'
import { SAVINGS_PATH } from '@/app/routes'
import { t } from '@/i18n/strings'
import { PageTitle } from '@/ui/PageTitle'
import { EvolutionSection } from './EvolutionSection'
import { YearSection } from './YearSection'
import { useIndividualScope } from './individualScope'

/**
 * Ce que l'épargne d'une personne a fait, dans le temps.
 *
 * Les deux seules lectures de l'écran qui **capitalisent** — la trajectoire
 * support par support, et le cumul de l'année contre l'année d'avant — vivaient
 * en bas de `/epargne`, après tout ce qui se décide ce mois-ci. Elles ne s'y
 * décident plus : on vient les *regarder*, pas y agir, et la vue d'ensemble
 * n'en garde qu'un chiffre et un lien.
 */
export function AnalysisPage() {
  const navigate = useNavigate()
  useIndividualScope()

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <PageTitle
        title={t.savings.analysis}
        onBack={() => {
          void navigate(SAVINGS_PATH)
        }}
      />
      <EvolutionSection />
      <YearSection />
    </div>
  )
}
