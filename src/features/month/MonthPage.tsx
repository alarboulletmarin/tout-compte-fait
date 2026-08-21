import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MonthHeader } from '@/app/MonthHeader'
import { RECURRENCE_NEW_PATH, entryNewPath, entryPath } from '@/app/routes'
import { currentYm } from '@/domain/date'
import { AnalysisGrid } from '@/features/dashboard/AnalysisGrid'
import { type Metric, MetricInfo } from '@/features/dashboard/MetricInfo'
import { SituationGrid } from '@/features/dashboard/SituationGrid'
import { SituationSection } from '@/features/dashboard/SituationSection'
import { UpcomingSection } from '@/features/dashboard/UpcomingSection'
import { ReviewTile } from '@/features/review/ReviewTile'
import { t } from '@/i18n/strings'
import {
  useCurrentYm,
  useHasAnyData,
  useIsCurrentMonth,
  useMonthFilter,
  useReviewQueueIds,
  useScopedMonthEntries,
} from '@/store/selectors'
import { useStore } from '@/store/store'
import { Button } from '@/ui/Button'
import { EmptyState } from '@/ui/EmptyState'
import { Plus } from '@/ui/Icons'
import { PageTitle } from '@/ui/PageTitle'
import { EntriesSection, type NatureFilter } from './EntriesSection'
import { MonthDoneTile } from './MonthDoneTile'
import { MonthEmptyTile } from './MonthEmptyTile'

export function MonthPage() {
  /* Le mois d'un membre n'est pas vide parce qu'il n'a rien saisi à son nom :
     sa part des charges communes en fait partie. */
  const entries = useScopedMonthEntries()
  /* Un mois vide n'a pas la même cause selon qu'une règle existe ou non : sans
     aucune récurrence, c'est un foyer qui n'a pas encore démarré, et le geste
     qui le démarre n'est pas une dépense. Voir l'état vide plus bas. */
  const hasRecurrence = useStore((s) => s.data.recurrences.length > 0)
  /* « Ni ligne ni récurrence », sur le document entier : c'est l'état d'avant
     le premier geste, et il ne se confond pas avec un mois sans ligne. */
  const hasAnyData = useHasAnyData()
  const isCurrent = useIsCurrentMonth()
  const ym = useCurrentYm()
  const filter = useMonthFilter()
  /* Ce qui attend d'être confirmé sur le foyer entier, filtre ignoré : c'est le
     compte de la revue, et c'est lui qui décide entre la porte de la tâche et
     la tuile qui dit qu'il n'y en a plus. */
  const waiting = useReviewQueueIds().length
  const navigate = useNavigate()

  /* La nature montrée se pilote depuis les pilules de la liste, et l'axe aussi.
     Elle vit ici parce que « Où part l'argent » la pose en même temps que sa
     famille : une famille relève d'une seule nature, et deux commandes qui se
     contrediraient ne se comprennent pas. */
  const [nature, setNature] = useState<NatureFilter>(null)
  /* Le filtre venu de « Où part l'argent ». Il se pose depuis une tuile et se
     retire depuis la liste. */
  const [family, setFamily] = useState<string | null>(null)
  const [focus, setFocus] = useState(0)
  /* La feuille d'explication vit ici : la tuile du solde l'ouvre depuis la
     grille, les deux rangées de la situation depuis la section d'en dessous.
     Une par appelant en monterait deux dans le DOM pour une seule à l'écran. */
  const [metric, setMetric] = useState<Metric | null>(null)

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

  /* Un compteur et non un drapeau : redemander la liste après avoir fait
     défiler ne changerait aucun état, donc ne défilerait pas. */
  const showEntries = (): void => {
    setFocus((previous) => previous + 1)
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
          deux occasions.

          Sur un autre mois que celui qu'on vit, elles s'en vont avec le reste
          de ce qui écrit : on y saisit par la fiche d'une ligne, jamais en
          passant. */}
      {!isEmpty && isCurrent && (
        <div className="mb-4 hidden flex-wrap items-center gap-2 lg:flex">
          <Button
            variant="secondary"
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

      {/* Trois états, et le premier n'est pas celui du mois mais celui du
          document : sans une ligne ni une règle, il n'y a pas de situation à
          montrer, et le bento comme la liste s'effacent derrière le seul geste
          qui amorce quoi que ce soit. */}
      {!hasAnyData ? (
        <MonthEmptyTile />
      ) : isEmpty ? (
        /* Le mois d'un document qui, lui, n'est pas vide : une règle existe
            mais rien ne tombe ici — un mois d'avant la première échéance, ou un
            filtre qui ne laisse rien. Les trois portes restent offertes : à
            partir de 1024px la rangée en flux est masquée sur un mois vide, et
            cet état-ci est alors la seule porte de saisie de l'écran. */
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
              variant="secondary"
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
             2. ce que j'ai à faire — la revue, puis les lignes du mois, où
                chacune se confirme d'un glissé ;
             3. pourquoi — la grille analytique et ce qui tombe bientôt.

           Tout était déjà là, dans le désordre. La page montrait d'abord neuf
           tuiles — c'est-à-dire toutes les questions du mois avec le même poids
           —, puis deux sections, et seulement ensuite la seule chose qui demande
           un geste. Mesuré sur un téléphone, « À confirmer » commençait à
           ~1 290px du haut, ~1 600px avec deux membres et un crédit : deux
           écrans de défilement pour trouver sa tâche du jour.

           **La liste est remontée devant l'analyse**, et c'est le seul
           changement d'ordre de cette étape : elle porte maintenant le geste —
           une échéance s'y confirme sans quitter l'écran —, donc elle appartient
           à l'étage de la tâche, pas à celui du détail où l'on entre.

           **Tout est à la largeur de la page, sections comprises.** Elles
           étaient bornées à 768px pendant que les deux bentos prenaient les 992
           disponibles, et comme elles s'intercalent entre eux, le bord droit
           alternait quatre fois en descendant l'écran : 992, 768, 992, 768.
           Mesuré à 1920 points, 224px d'écart entre deux blocs empilés dans la
           même colonne — la grille bento se rompt à chaque section.

           La convention « un bento s'étale, une liste se lit » n'est pas
           abandonnée pour autant : ce qui borne une lecture, c'est la mesure de
           ses lignes, et c'est aux blocs de la tenir — une rangée garde son
           `max-w` sur les textes, un groupe se coupe en deux colonnes s'il s'y
           prête. Ce qui ne se négocie pas, c'est le bord : un écran n'en a
           qu'un. */
        <div className="flex flex-col gap-4">
          {/* Un autre mois se lit, il ne s'écrit pas — et il le dit avant tout
              le reste, sinon on cherche la revue qui n'y est pas. Le retour au
              mois courant n'est pas répété ici : le bloc titre de l'en-tête le
              porte déjà, et deux affordances pour un même geste valent moins
              qu'une. */}
          {!isCurrent && (
            <p className="t-axis">{ym < currentYm() ? t.month.pastNote : t.month.aheadNote}</p>
          )}

          <SituationGrid onShowEntries={showEntries} onExplain={setMetric} />
          <div className="flex flex-col gap-4">
            <SituationSection onExplain={setMetric} />
            {/* La porte de la revue ouvre l'étage de la tâche, juste avant la
                liste qui l'énumère. Elle n'est pas dans la grille : c'est un
                geste, pas une lecture, et la grille répond à « où j'en suis ».
                Quand il ne reste rien à confirmer, elle cède la place à la
                tuile qui le dit — jamais les deux, et c'est ce qui garde une
                seule tuile accentuée par écran. Sous un filtre, aucune des
                deux : la revue est une tâche du foyer (voir `ReviewTile`). */}
            <ReviewTile />
            {isCurrent && waiting === 0 && filter.kind === 'all' && (
              <MonthDoneTile onShowEntries={showEntries} />
            )}
            <EntriesSection
              nature={nature}
              onNature={chooseNature}
              family={family}
              onFamily={setFamily}
              focus={focus}
              readOnly={!isCurrent}
              onOpen={(entry) => {
                void navigate(entryPath(entry.id))
              }}
            />
          </div>
          <AnalysisGrid onShowFamily={showFamily} onExplain={setMetric} />
          <UpcomingSection />
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
