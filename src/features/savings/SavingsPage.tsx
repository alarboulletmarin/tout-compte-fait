import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MonthHeader } from '@/app/MonthHeader'
import {
  PROJECTION_PATH,
  SAVINGS_ANALYSIS_PATH,
  SUPPORT_NEW_PATH,
  entryNewPath,
} from '@/app/routes'
import { coveredYears, yearHorizon } from '@/domain/history'
import { ZERO, add, sub } from '@/domain/money'
import { savingCapacity, savingLeft, savingRate } from '@/domain/stats'
import { t } from '@/i18n/strings'
import { formatSignedMoney, tpl } from '@/i18n/format'
import {
  useEntries,
  useKindTotals,
  useMemberMap,
  useMembers,
  useSavingYearSeries,
  useScopedSavingSupports,
} from '@/store/selectors'
import { Button } from '@/ui/Button'
import { EmptyState } from '@/ui/EmptyState'
import { ForecastIcon, YearsIcon } from '@/ui/Icons'
import { PageTitle } from '@/ui/PageTitle'
import { Row, RowGroup } from '@/ui/RowGroup'
import { useCurrency } from '@/ui/currency'
import { CapitalTile } from './CapitalTile'
import { CoverageTile } from './CoverageTile'
import { GoalsSection } from './GoalsSection'
import { MonthTile } from './MonthTile'
import { PlacedSection } from './PlacedSection'
import { SupportsOverview } from './SupportsSection'
import { useIndividualScope } from './individualScope'

/** L'année lue quand le document n'en couvre aucune — voir `YearSection`. */
const EMPTY_YEAR = 1

/**
 * Ce que l'année a accumulé, en deux chiffres et un lien — jamais le tracé.
 *
 * La trajectoire support par support et le cumul de l'année contre l'année
 * d'avant sont les deux seules lectures de cet écran qui **capitalisent**, et
 * elles ont longtemps vécu ici, en bas de page, avec leur graphique entier.
 * Elles n'y agissent jamais — on ne décide rien en les regardant, on regarde —
 * et c'est ce qui les envoie sur `/epargne/analyse` : la vue d'ensemble n'a
 * besoin que de leur réponse, pas de leur tracé.
 *
 * Les deux chiffres sont ceux que `YearSection` calcule déjà, au même mois
 * d'arrêt qu'elle — un seul moteur, deux lectures.
 */
function AnalysisPreview() {
  const entries = useEntries()
  const currency = useCurrency()
  const years = useMemo(() => coveredYears(entries), [entries])
  const year = years.at(-1)

  const current = useSavingYearSeries(year ?? EMPTY_YEAR)
  const previous = useSavingYearSeries((year ?? EMPTY_YEAR) - 1)

  if (year === undefined) return null

  const horizon = yearHorizon(current)
  if (horizon === -1) return null

  const cumulated = current[horizon]?.cumulative ?? ZERO
  const hasPrevious = previous.some((point) => point.hasData)
  const before = hasPrevious ? previous[horizon]?.cumulative ?? null : null

  const description =
    before === null
      ? tpl(t.savings.analysisPreviewOnly, formatSignedMoney(cumulated, currency), String(year))
      : tpl(
          t.savings.analysisPreview,
          formatSignedMoney(cumulated, currency),
          String(year),
          formatSignedMoney(sub(cumulated, before), currency),
          String(year - 1),
        )

  return (
    <RowGroup>
      <Row
        label={t.savings.analysis}
        description={description}
        icon={YearsIcon}
        to={SAVINGS_ANALYSIS_PATH}
      />
    </RowGroup>
  )
}

/**
 * L'écran de l'épargne — celui qu'ouvre la tuile Capacité du mois.
 *
 * **Une vue d'ensemble, pas l'écran exhaustif de tout ce qui concerne
 * l'épargne.** Elle répond en quelques secondes à quatre questions — combien
 * j'ai, combien de temps ça tient, où c'est placé, ce que le mois me permet
 * d'y mettre — et renvoie le reste à deux sous-vues : la gestion complète des
 * supports (`/epargne/supports`) et l'analyse de leur évolution
 * (`/epargne/analyse`). Les deux vivaient ici, en pleine page, avec leurs
 * gestes de patrimoine et leur graphique : le stock s'y lisait bien, mais
 * l'écran ne savait plus dire *dans quel ordre* le lire, ni où s'arrêter.
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
 * **Les gestes sont rangés par nature, pas alignés en tête d'écran.** Placer et
 * reprendre suivent le chiffre qui les appelle, sous « Encore disponible » ;
 * relever ses comptes et en ouvrir un vivent désormais sur l'écran dédié des
 * supports, dont ils sont la gestion.
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
          {/* Le seul bloc de l'écran qui conclut, et c'est pourquoi il passe
              devant la liste des comptes : « à l'heure » ou « sept mois de
              retard » est ce qu'aucun relevé de banque ne dit, quand « où
              c'est placé » se lit ailleurs et en mieux. */}
          <GoalsSection />

          {/* Un aperçu, pas la gestion : relever un compte ou en ouvrir un se
              fait sur l'écran dédié, vers lequel ce bloc renvoie. */}
          <SupportsOverview />

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

          {/* « Où c'est parti ce mois-ci » appelle immédiatement « et est-ce
              que ça monte, au fond ? » — mais la réponse s'y arrête, elle ne
              s'y décide pas : un aperçu et un lien vers `/epargne/analyse`,
              où vivent le tracé, sa fenêtre et le cumul de l'année. */}
          <AnalysisPreview />

          {/* Et après l'année, les années. Cette porte-ci est celle du
              contexte — on est en train de regarder ce qu'on place, et la
              question « ça donne quoi dans dix ans » se pose là. Elle n'est pas
              la seule : « Plus » porte la même destination sous « Simuler »,
              parce qu'un écran qu'on n'atteint qu'en descendant tout un autre
              écran n'a pas d'adresse. Ce que le simulateur n'a toujours pas,
              c'est un rang dans « Gérer » — il ne décide de rien (voir
              `PROJECTION_PATH` dans `app/routes.ts`). */}
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
