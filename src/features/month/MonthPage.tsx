import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MonthHeader } from '@/app/MonthHeader'
import { RECURRENCE_NEW_PATH, entryNewPath, entryPath } from '@/app/routes'
import { AnalysisGrid } from '@/features/dashboard/AnalysisGrid'
import { type Metric, MetricInfo } from '@/features/dashboard/MetricInfo'
import { SituationGrid } from '@/features/dashboard/SituationGrid'
import { SituationSection } from '@/features/dashboard/SituationSection'
import { UpcomingSection } from '@/features/dashboard/UpcomingSection'
import { t } from '@/i18n/strings'
import { useScopedMonthEntries } from '@/store/selectors'
import { useStore } from '@/store/store'
import { Button } from '@/ui/Button'
import { EmptyState } from '@/ui/EmptyState'
import { Plus } from '@/ui/Icons'
import { PageTitle } from '@/ui/PageTitle'
import { EntriesSection, type NatureFilter } from './EntriesSection'
import { PendingSection } from './PendingSection'

export function MonthPage() {
  /* Le mois d'un membre n'est pas vide parce qu'il n'a rien saisi à son nom :
     sa part des charges communes en fait partie. */
  const entries = useScopedMonthEntries()
  /* Un mois vide n'a pas la même cause selon qu'une règle existe ou non : sans
     aucune récurrence, c'est un foyer qui n'a pas encore démarré, et le geste
     qui le démarre n'est pas une dépense. Voir l'état vide plus bas. */
  const hasRecurrence = useStore((s) => s.data.recurrences.length > 0)
  const navigate = useNavigate()

  /* La nature montrée se pilote de deux endroits — les pilules de la liste, et
     les deux tuiles de flux. Elle vit donc ici, entre les deux. L'axe, lui, ne
     se pilote que de la liste et y reste : une tuile filtre ce qu'on voit, elle
     ne range pas la liste autrement que l'utilisateur l'a rangée. */
  const [nature, setNature] = useState<NatureFilter>(null)
  /* Le filtre venu de « Où part l'argent ». Il vit ici pour la même raison que
     la nature : il se pose depuis une tuile et se retire depuis la liste. */
  const [family, setFamily] = useState<string | null>(null)
  const [focus, setFocus] = useState(0)
  /* La même mécanique pour « À confirmer », et pour la même raison : la tuile de
     suivi désigne une section qui vit plus bas sur cette page. Un compteur
     plutôt qu'un drapeau — sinon redemander la section après avoir fait défiler
     ne changerait aucun état, donc ne défilerait pas. */
  const [pendingFocus, setPendingFocus] = useState(0)
  /* La feuille d'explication vit ici : la tuile du solde l'ouvre depuis la
     grille, les deux rangées de la situation depuis la section d'en dessous.
     Une par appelant en monterait deux dans le DOM pour une seule à l'écran. */
  const [metric, setMetric] = useState<Metric | null>(null)

  const showNature = (value: 'expense' | 'income'): void => {
    setNature(value)
    setFamily(null)
    setFocus((previous) => previous + 1)
  }

  /* Une famille de « Où part l'argent » relève d'une seule nature, et l'anneau
     ne compte que charges et crédits : la pilule suit, sinon le sous-total de
     la liste et la part qu'on vient de toucher parleraient deux langues. */
  const showFamily = (familyId: string): void => {
    setNature('expense')
    setFamily(familyId)
    setFocus((previous) => previous + 1)
  }

  /* Choisir une nature retire la famille : les deux se contredisent dès qu'on
     sort des charges, et une liste vide sous deux filtres dont un est invisible
     ne se comprend pas. */
  const chooseNature = (value: NatureFilter): void => {
    setNature(value)
    setFamily(null)
  }

  const showPending = (): void => {
    setPendingFocus((previous) => previous + 1)
  }

  const create = (direction: 'in' | 'out'): void => {
    void navigate(entryNewPath({ direction }))
  }

  /* Une troisième porte, parce que l'épargne se saisissait par « Dépense » :
     le geste est le même — de l'argent qui sort — mais ce n'est pas ce qu'on
     croit faire en mettant de côté. */
  const createSaving = (): void => {
    void navigate(entryNewPath({ direction: 'out', saving: true }))
  }

  const isEmpty = entries.length === 0

  return (
    <>
      {/* Le bandeau dit déjà quel mois on lit : le titre existe pour les
          lecteurs d'écran et pour l'annonce du changement d'écran, il ne
          s'affiche pas. */}
      <PageTitle title={t.month.title} hidden />
      <MonthHeader prorataNote />

      {/* Les deux sens sont deux boutons, jamais un seul. Passer par « Ajouter
          une dépense » pour saisir un salaire obligeait à découvrir, une fois
          le formulaire ouvert, une bascule dont rien n'annonçait l'existence.

          À partir de 1024px seulement : sous cette largeur, c'est le bouton
          flottant de la coquille qui porte ces trois portes, et il les porte
          partout — y compris une fois la page défilée, et sur un mois vide, où
          cette rangée-ci n'existe pas. Les garder toutes les deux ferait deux
          fois les mêmes trois boutons sur le même écran, ce qui ne fait pas
          deux occasions. */}
      {!isEmpty && (
        <div className="mb-4 hidden flex-wrap items-center gap-2 lg:flex">
          <Button
            title={t.a11y.newEntryKey}
            onClick={() => {
              create('out')
            }}
          >
            <Plus size={18} />
            {t.entry.newOut}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              create('in')
            }}
          >
            <Plus size={18} />
            {t.entry.newIn}
          </Button>
          <Button variant="secondary" onClick={createSaving}>
            <Plus size={18} />
            {t.entry.newSaving}
          </Button>
        </div>
      )}

      {/* Le mois vide d'un foyer sans aucune récurrence conduisait au mauvais
          geste : « Ajoute ta première dépense » n'amorce aucune prévision,
          alors que toute la thèse de l'app est qu'on écrit une fois ce qui
          revient. La porte des récurrences passe donc devant tant qu'il n'y en
          a aucune — après, le mois vide n'est plus un problème d'amorçage et
          les deux portes de saisie reprennent leur rang.

          Les trois restent offertes dans les deux cas : au-delà de 1024px, la
          rangée en flux est masquée sur un mois vide, et cet état-ci est alors
          la seule porte de saisie de l'écran. */}
      {isEmpty ? (
        <EmptyState message={hasRecurrence ? t.month.empty : t.month.emptyStart}>
          <div className="flex flex-wrap justify-center gap-2">
            {!hasRecurrence && (
              <Button
                onClick={() => {
                  void navigate(RECURRENCE_NEW_PATH)
                }}
              >
                {t.recurrences.add}
              </Button>
            )}
            <Button
              variant={hasRecurrence ? 'primary' : 'secondary'}
              onClick={() => {
                create('out')
              }}
            >
              {t.entry.addOut}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                create('in')
              }}
            >
              {t.entry.addIn}
            </Button>
          </div>
        </EmptyState>
      ) : (
        /* **Trois questions, dans l'ordre où on se les pose**, et cet ordre est
           la refonte elle-même :

             1. où j'en suis — la grille du solde, puis les deux soldes qui
                projettent le mois ;
             2. ce que j'ai à faire — les échéances à confirmer ;
             3. pourquoi — la grille analytique, ce qui tombe bientôt, et le
                détail où l'on entre.

           Tout était déjà là, dans le désordre. La page montrait d'abord neuf
           tuiles — c'est-à-dire toutes les questions du mois avec le même poids
           —, puis deux sections, et seulement ensuite la seule chose qui demande
           un geste. Mesuré sur un téléphone, « À confirmer » commençait à
           ~1 290px du haut, ~1 600px avec deux membres et un crédit : deux
           écrans de défilement pour trouver sa tâche du jour. Elle en est
           maintenant à moins d'un.

           Aucune section n'a disparu, aucun calcul n'a bougé : ce sont les mêmes
           composants, dans un autre ordre, et une grille coupée en deux là où la
           narration se coupe.

           Les deux grilles prennent la pleine largeur, les sections restent dans
           une colonne bornée : c'est la convention de toute l'app — un bento
           s'étale, une liste se lit. */
        <div className="flex flex-col gap-4">
          <SituationGrid
            onShowNature={showNature}
            onShowPending={showPending}
            onExplain={setMetric}
          />
          <div className="flex max-w-3xl flex-col gap-4">
            <SituationSection onExplain={setMetric} />
            <PendingSection focus={pendingFocus} />
          </div>
          <AnalysisGrid onShowFamily={showFamily} />
          <div className="flex max-w-3xl flex-col gap-4">
            <UpcomingSection />
            <EntriesSection
              nature={nature}
              onNature={chooseNature}
              family={family}
              onFamily={setFamily}
              focus={focus}
              onOpen={(entry) => {
                void navigate(entryPath(entry.id))
              }}
            />
          </div>
        </div>
      )}

      <MetricInfo
        metric={metric}
        onClose={() => {
          setMetric(null)
        }}
      />
    </>
  )
}
