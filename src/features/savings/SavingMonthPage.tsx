/* ============================================================================
 * Ce que le mois permet d'épargner — un écran, et non quatre blocs au milieu
 * du patrimoine.
 *
 * L'écran d'épargne mélangeait deux temporalités qui ne se lisent pas ensemble.
 * Le patrimoine — capital, autonomie, comptes — se consulte **au trimestre** :
 * il est ancré sur aujourd'hui, il ne bouge pas parce qu'on est allé regarder
 * mars. Le flux du mois — capacité, versé, reste à placer, ventilation — se
 * consulte **à la semaine**, et dépend entièrement du mois affiché. Les alterner
 * dans une même page faisait changer l'œil trois fois de registre, et surtout
 * posait un navigateur de mois au-dessus d'une page dont la moitié ne le suivait
 * pas.
 *
 * Ce n'est donc pas un défaut de mise en forme, c'est un défaut de découpage —
 * et il se règle en séparant les deux, comme `CreditsPage` a réglé le sien en
 * retirant son en-tête de mois.
 *
 * **L'en-tête de mois vit ici, et nulle part ailleurs dans l'épargne.** Tout ce
 * que cet écran montre en dépend, et rien de ce que montre `/epargne` n'en
 * dépend.
 * ==========================================================================*/

import { useNavigate } from 'react-router-dom'
import { MonthHeader } from '@/app/MonthHeader'
import { SAVINGS_PATH, entryNewPath } from '@/app/routes'
import { savingCapacity, savingLeft, savingRate } from '@/domain/stats'
import { t } from '@/i18n/strings'
import { useKindTotals } from '@/store/selectors'
import { Button } from '@/ui/Button'
import { PageTitle } from '@/ui/PageTitle'
import { MonthTile } from './MonthTile'
import { PlacedSection } from './PlacedSection'
import { IndividualScope } from './IndividualScope'

/* La portée individuelle se pose par-dessus le filtre du mois, sans
   l'écrire : « Commun » et « Tout le monde » survivent au détour par
   l'épargne. Le fournisseur enveloppe le contenu parce qu'un composant ne
   peut pas consommer le contexte qu'il fournit lui-même. */
export function SavingMonthPage() {
  return (
    <IndividualScope>
      <SavingMonthPageContent />
    </IndividualScope>
  )
}

function SavingMonthPageContent() {
  const navigate = useNavigate()
  const totals = useKindTotals(true)

  return (
    <>
      <PageTitle
        title={t.savings.month}
        onBack={() => {
          void navigate(SAVINGS_PATH)
        }}
      />
      <MonthHeader prorataNote personsOnly />

      <div className="flex max-w-3xl flex-col gap-4">
        <MonthTile
          capacity={savingCapacity(totals)}
          saved={totals.saving}
          left={savingLeft(totals)}
          rate={savingRate(totals)}
        />

        {/* Les deux sens sont deux boutons, jamais un seul (DS §7), et ils
            suivent le chiffre qui les appelle. Le bouton flottant ne porte que
            la porte du versement : s'en remettre à lui rendrait la reprise
            inatteignable au doigt. */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              void navigate(entryNewPath({ direction: 'out', saving: true }))
            }}
          >
            {t.entry.savingIn}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              void navigate(entryNewPath({ direction: 'in', saving: true }))
            }}
          >
            {t.entry.savingOut}
          </Button>
        </div>

        <PlacedSection saved={totals.saving} />
      </div>
    </>
  )
}
