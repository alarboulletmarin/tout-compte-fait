import { useNavigate } from 'react-router-dom'
import { MonthHeader } from '@/app/MonthHeader'
import { SUPPORT_NEW_PATH, entryNewPath } from '@/app/routes'
import { ZERO, add } from '@/domain/money'
import { savingCapacity, savingLeft, savingRate } from '@/domain/stats'
import { fr } from '@/i18n/fr'
import {
  useKindTotals,
  useMemberMap,
  useMembers,
  useScopedSavingSupports,
} from '@/store/selectors'
import { Button } from '@/ui/Button'
import { EmptyState } from '@/ui/EmptyState'
import { PageTitle } from '@/ui/PageTitle'
import { CapitalTile } from './CapitalTile'
import { MonthTile } from './MonthTile'
import { PlacedSection } from './PlacedSection'
import { SupportsSection } from './SupportsSection'
import { useIndividualScope } from './individualScope'

/**
 * L'écran de l'épargne — celui qu'ouvre la tuile Capacité du mois.
 *
 * **Une question, une zone, un chiffre, une action.** Cinq blocs, dans l'ordre
 * où les questions se posent : ce que je possède, où c'est placé, ce que le mois
 * me permet d'y mettre, et où c'est parti. Tout était déjà là — le même calcul,
 * les mêmes `Entry`, les mêmes relevés — mais en sept cadres de même poids, dont
 * une grille de tuiles pleine largeur : sur un téléphone, six écrans de
 * défilement, et rien pour dire dans quel ordre les lire.
 *
 * Les deux lectures ne s'additionnent jamais. Une valorisation n'est pas une
 * opération — elle n'entre ni dans le solde du mois, ni dans la capacité, ni
 * dans le versé — et un versement n'écrase aucune valorisation : sur un
 * placement, la valeur bouge aussi avec le marché.
 *
 * **La lecture est individuelle, et elle n'a pas d'autre forme.** L'épargne est
 * le seul chiffre de l'app qui n'a aucun sens au foyer : deux personnes qui ont
 * 12 000 € et 8 000 € de côté n'ont pas « 20 000 € », et deux qui dégagent 300 €
 * et 900 € n'ont pas « 1 200 € à placer » — elles ont deux comptes, deux
 * capacités et deux décisions, dont aucune ne se prend sur une somme. L'écran ne
 * propose donc ni « Tout le monde » ni « Commun », seulement les personnes, et
 * il s'assure qu'une est choisie (`useIndividualScope`). Le stock et le flux
 * suivent la même personne, par le même filtre.
 *
 * **Les gestes sont rangés par nature, pas alignés en tête d'écran.** Trois
 * boutons y tenaient le même rang — ouvrir un compte, verser, reprendre — quand
 * le premier se fait une fois et les deux autres tous les mois. Placer et
 * reprendre suivent donc le chiffre qui les appelle, sous « reste à placer » ;
 * relever ses comptes et en ouvrir un vivent dans la section des supports, dont
 * ils sont la gestion.
 */
export function SavingsPage() {
  const navigate = useNavigate()
  const totals = useKindTotals(true)
  const members = useMembers()
  const memberMap = useMemberMap()
  const supports = useScopedSavingSupports()
  /* Pose une personne quand aucune ne l'est : une rangée de pilules dont aucune
     n'est active laisserait croire à une lecture qui n'existe pas. */
  const owner = useIndividualScope()

  const capacity = savingCapacity(totals)
  const left = savingLeft(totals)
  const rate = savingRate(totals)
  const noFlow = add(totals.resource, add(totals.charge, add(totals.debt, totals.saving))) === ZERO
  const nothing = noFlow && supports.length === 0

  return (
    <>
      <PageTitle title={fr.savings.title} />
      <MonthHeader prorataNote personsOnly />

      {nothing ? (
        <EmptyState
          message={members.length === 0 ? fr.savings.supportsNoMember : fr.savings.supportsEmpty}
          {...(members.length === 0
            ? {}
            : {
                actionLabel: fr.savings.supportAdd,
                onAction: () => {
                  void navigate(SUPPORT_NEW_PATH)
                },
              })}
        />
      ) : (
        <div className="flex max-w-3xl flex-col gap-4">
          {/* Le stock d'abord : c'est la question qu'on se pose en arrivant. */}
          <CapitalTile
            net={totals.saving}
            owner={owner === null ? null : (memberMap.get(owner)?.name ?? null)}
          />
          <SupportsSection />

          {/* Puis le mois : ce qu'il dégage, ce qu'on y a mis, ce qu'il reste. */}
          <MonthTile capacity={capacity} saved={totals.saving} left={left} rate={rate} />

          {/* Les deux sens sont deux boutons, jamais un seul (DS §7), et ils
              suivent le chiffre qui les appelle. Le bouton flottant ne porte
              que la porte du versement : s'en remettre à lui rendrait la reprise
              inatteignable au doigt. */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                void navigate(entryNewPath({ direction: 'out', saving: true }))
              }}
            >
              {fr.entry.savingIn}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                void navigate(entryNewPath({ direction: 'in', saving: true }))
              }}
            >
              {fr.entry.savingOut}
            </Button>
          </div>

          <PlacedSection saved={totals.saving} />
        </div>
      )}
    </>
  )
}
