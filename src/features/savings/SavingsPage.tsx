import { Suspense, lazy } from 'react'
import { useNavigate } from 'react-router-dom'
import { MonthHeader } from '@/app/MonthHeader'
import { PROJECTION_PATH, SUPPORT_NEW_PATH, entryNewPath } from '@/app/routes'
import { ZERO, add } from '@/domain/money'
import { savingCapacity, savingLeft, savingRate } from '@/domain/stats'
import { t } from '@/i18n/strings'
import {
  useKindTotals,
  useMemberMap,
  useMembers,
  useScopedSavingSupports,
} from '@/store/selectors'
import { Button } from '@/ui/Button'
import { EmptyState } from '@/ui/EmptyState'
import { ForecastIcon } from '@/ui/Icons'
import { PageTitle } from '@/ui/PageTitle'
import { Row, RowGroup } from '@/ui/RowGroup'
import { CapitalTile } from './CapitalTile'
import { CoverageTile } from './CoverageTile'
import { MonthTile } from './MonthTile'
import { PlacedSection } from './PlacedSection'
import { SupportsSection } from './SupportsSection'
import { useIndividualScope } from './individualScope'

/**
 * Le cumul de l'année arrive à la demande — et c'est le seul bloc de cet écran
 * dans ce cas.
 *
 * Il emporte les lignes cumulées, l'axe et le curseur de `src/charts`, que seul
 * l'historique servait jusqu'ici et qui vivent pour cette raison dans son
 * morceau (`Routes.tsx`). Cet écran-ci, lui, est sur le chemin quotidien : il se
 * charge avec le mois, donc tout ce qu'il importe statiquement pèse sur le
 * premier chargement de tout le monde — mesuré, quatre kibioctets compressés, de
 * quoi passer le budget de `npm run size`.
 *
 * Le repli est **vide** plutôt qu'une ligne d'attente : la section est la
 * dernière de la page, donc sous le pli sur un téléphone, et un « chargement… »
 * qui clignote sous le pli n'est vu de personne — sauf de qui descend pile à ce
 * moment-là, à qui il ne dit rien de plus que le graphique qui le remplace.
 */
const YearSection = lazy(async () => ({
  default: (await import('./YearSection')).YearSection,
}))

/**
 * L'écran de l'épargne — celui qu'ouvre la tuile Capacité du mois.
 *
 * **Une question, une zone, un chiffre, une action.** Les blocs se suivent dans
 * l'ordre où les questions se posent : ce que je possède, **combien de temps ça
 * tient**, où c'est placé, ce que le mois me permet d'y mettre, où c'est parti,
 * et ce que l'année a accumulé. Tout était déjà là — le même calcul, les mêmes
 * `Entry`, les mêmes relevés — mais en sept cadres de même poids, dont une
 * grille de tuiles pleine largeur : sur un téléphone, six écrans de défilement,
 * et rien pour dire dans quel ordre les lire.
 *
 * **L'écran ne concourt pas sur « combien j'ai ».** La banque y répond mieux,
 * plus vite et sans qu'on recopie quoi que ce soit ; ce que l'app est seule à
 * savoir, c'est ce que ce capital tient face aux charges qu'elle connaît, et ce
 * qu'on a réussi à mettre de côté depuis janvier. Ce sont les deux lectures que
 * personne d'autre ne produit, et ce sont elles qui rendent un relevé utile.
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
      <PageTitle title={t.savings.title} />
      <MonthHeader prorataNote personsOnly />

      {nothing ? (
        <EmptyState
          message={members.length === 0 ? t.savings.supportsNoMember : t.savings.supportsEmpty}
          {...(members.length === 0
            ? {}
            : {
                actionLabel: t.savings.supportAdd,
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
          {/* Puis ce que ce stock permet — la seule question de cet écran à
              laquelle une banque ne sait pas répondre. Elle vient juste après
              le capital parce qu'elle en est la lecture : « combien j'ai » n'a
              d'intérêt que par « est-ce que ça tient ». */}
          <CoverageTile />
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

          {/* En dernier, et c'est sa place : le mois se décide en tête d'écran,
              l'année se contemple. C'est aussi la seule lecture d'ici qui ne
              demande rien — ni relevé, ni saisie de plus. */}
          <Suspense fallback={null}>
            <YearSection />
          </Suspense>

          {/* Et après l'année, les années. Cette porte-ci est celle du
              contexte — on est en train de regarder ce qu'on place, et la
              question « ça donne quoi dans dix ans » se pose là. Elle n'est pas
              la seule : « Plus » porte la même destination sous « Simuler »,
              parce qu'un écran qu'on n'atteint qu'en descendant tout un autre
              écran n'a pas d'adresse. Ce que le simulateur n'a toujours pas,
              c'est un rang dans « Gérer » — il ne décide de rien (voir
              `PROJECTION_PATH` dans `app/routes.ts`).
              Elle ne dépend pas de la section d'année, qui arrive par le
              réseau : une porte qui n'apparaîtrait qu'une fois le graphique
              chargé serait une porte qu'on rate. */}
          <RowGroup>
            <Row
              label={t.nav.projections}
              description={t.nav.projectionsHint}
              icon={ForecastIcon}
              to={PROJECTION_PATH}
            />
          </RowGroup>
        </div>
      )}
    </>
  )
}
