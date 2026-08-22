import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MonthHeader } from '@/app/MonthHeader'
import { RECURRENCE_NEW_PATH, entryNewPath, entryPath } from '@/app/routes'
import { type ISODate, today, ymOf } from '@/domain/date'
import { t } from '@/i18n/strings'
import { useCurrentYm, useMonthBounds } from '@/store/selectors'
import { useStore } from '@/store/store'
import { Button } from '@/ui/Button'
import { EmptyState } from '@/ui/EmptyState'
import { PageTitle } from '@/ui/PageTitle'
import { Tile } from '@/ui/Tile'
import { CalendarGrid } from './CalendarGrid'
import { DaySheet } from './DaySheet'
import { defaultAnchor, isInGrid } from './grid'
import { entriesOn, useCalendarWindow } from './useCalendarWindow'

export function CalendarPage() {
  const ym = useCurrentYm()
  const setYm = useStore((s) => s.setYm)
  /* Ce qui remplit un calendrier n'est pas une dépense, c'est une règle : elle
     seule pose des échéances sur les jours à venir. La distinction est celle du
     mois vide (`month.emptyStart`), au mot près — un document sans aucune règle
     n'a pas le même geste devant lui qu'un mois que les règles ne touchent
     pas. */
  const hasRecurrence = useStore((s) => s.data.recurrences.length > 0)
  const bounds = useMonthBounds()
  const grid = useCalendarWindow()
  const navigate = useNavigate()

  const [opened, setOpened] = useState<ISODate | null>(null)
  const [anchor, setAnchor] = useState<ISODate | null>(null)
  const [focusOn, setFocusOn] = useState<{ date: ISODate } | null>(null)

  /* Lu au rendu et non mémorisé : un onglet laissé ouvert la nuit du 31 doit
     désigner le jour qu'on est le lendemain, pas celui qu'on était en
     l'ouvrant. C'est déjà la règle du bandeau du mois et de tous les sélecteurs
     voisins, qui appellent tous `today()` au calcul. */
  const now = today()

  /* Deux états dérivés plutôt que synchronisés, pour la même raison : un jour
     d'un autre mois ne se retrouve simplement pas dans la fenêtre, sans effet
     ni remise à zéro. Changer de mois referme donc la feuille et rend l'ancre
     au jour d'arrivée, sans qu'aucun code n'ait à s'en occuper. */
  const day = opened !== null && ymOf(opened) === ym ? opened : null
  const active = anchor !== null && isInGrid(ym, anchor) ? anchor : defaultAnchor(ym, now)

  /* Les jours de débord mènent à leur mois, comme un chevron. Ceux dont le mois
     sort des bornes n'y mènent pas : `useMonthBounds` refuse déjà de proposer
     un mois que le store n'ouvrirait pas — c'est-à-dire un mois vide sans
     explication. */
  const reachable = (date: ISODate): boolean => {
    const month = ymOf(date)
    return month >= bounds.min && month <= bounds.max
  }

  /* Un jour voisin change de mois en s'ouvrant : la fenêtre de six semaines les
     montre, c'est donc qu'on peut les atteindre, et le mois suit le jour qu'on
     a demandé. Les mois voisins n'affichent que ce qui est déjà écrit — ouvrir
     un mois grave toutes ses échéances prévues dans le document, et une lecture
     n'écrit pas douze lignes en passant. Toucher la case est justement le geste
     qui l'ouvre. */
  const goTo = (date: ISODate): void => {
    if (ymOf(date) !== ym) setYm(ymOf(date))
    setAnchor(date)
  }

  /* Le clavier déplace le focus autant que l'ancre : sans ça l'arrêt de
     tabulation avancerait pendant que le focus resterait sur la case de départ,
     et la flèche suivante repartirait d'un endroit qu'on ne voit pas.
     Une flèche ne change de mois qu'en sortant de la fenêtre — un jour voisin
     déjà affiché se rejoint sans que la grille bascule sous les doigts. */
  const move = (date: ISODate, paging: boolean): void => {
    if (ymOf(date) !== ym && (paging || !isInGrid(ym, date))) setYm(ymOf(date))
    setAnchor(date)
    setFocusOn({ date })
  }

  const open = (date: ISODate): void => {
    goTo(date)
    setOpened(date)
  }

  /* La feuille rend le focus à la case d'où elle vient. `<dialog>` le fait tout
     seul quand cette case existe encore — mais ouvrir un jour voisin change de
     mois, et la case cliquée est démontée avant la fermeture. On le repose donc
     nous-mêmes, dans les deux cas. */
  const close = (): void => {
    if (day !== null) setFocusOn({ date: day })
    setOpened(null)
  }

  const create = (nature: 'in' | 'out' | 'saving', date?: ISODate): void => {
    // L'épargne part en « je place » : c'est le geste le plus courant, et le
    // formulaire porte la bascule pour reprendre.
    const options =
      nature === 'saving' ? { direction: 'out' as const, saving: true } : { direction: nature }
    void navigate(entryNewPath(date === undefined ? options : { ...options, date }))
  }

  /* Il y avait ici un « Aujourd'hui », et il est parti.
   *
   * Il n'apparaissait pas quand on était parti — il apparaissait quand l'ancre
   * du clavier n'était plus sur aujourd'hui, ce qui n'est *pas* la même chose :
   * l'ancre suit la dernière case touchée, et rien à l'écran ne la montre. Sur
   * le mois courant, ouvrir puis refermer un jour le faisait donc apparaître
   * sans que rien n'ait bougé, et l'appuyer ne rouvrait qu'une feuille — la
   * grille, elle, ne bougeait pas d'un pixel, puisqu'on y était déjà. Un bouton
   * dont la condition d'apparition est invisible et dont l'effet ne se voit pas
   * est exactement ce que le DS §6 voulait empêcher, retourné.
   *
   * Ce qu'il promettait existe ailleurs, et se voit : « ce mois-ci » dans le
   * bandeau ramène le mois quand on l'a quitté — la seule fois où l'on est
   * vraiment parti —, et le jour se rejoint d'un doigt sur sa case, que son
   * cadre désigne et que la légende nomme désormais.
   */

  const hasAny = grid.cells.some((cell) => cell.inMonth && entriesOn(grid, cell.date).length > 0)

  return (
    <>
      {/* Cet écran n'avait aucun titre : rien ne le nommait à un lecteur
          d'écran, et son bandeau ne dit que le mois. Comme celui du mois, il ne
          s'affiche pas — le nom de l'écran est déjà dans la navigation. */}
      <PageTitle title={t.nav.calendar} hidden />
      {/* Sans note de lecture : le calendrier montre les échéances réelles, où
          une charge commune tombe en entier et n'est à personne. */}
      <MonthHeader />
      {/* Le calendrier se borne, et c'est l'un des rares écrans qui ait une
          raison de le faire : sept colonnes de jours étalées sur les 992px d'un
          grand écran donnent des cases de 140px, qui ne sont plus un calendrier
          mais un tableau. C'est un écart assumé au bord unique de la page, et le
          seul de l'app qui soit décidé par le contenu plutôt que subi. */}
      <div className="flex max-w-2xl flex-col gap-4">
        {/* La tuile reste une tuile à toutes les largeurs — coins, cadre, ombre,
            et la marge de la page de chaque côté. Elle resserre seulement son
            propre cadre sous 480px, à la valeur qu'une tuile plate utilise déjà :
            c'est ce qui rend seize pixels à chaque colonne sans que la carte
            cesse d'en être une. Le calcul complet est dans `CalendarGrid`. */}
        <Tile className="max-[479px]:p-4">
          <CalendarGrid
            month={ym}
            window={grid}
            opened={day}
            anchor={active}
            onAnchor={move}
            onOpen={open}
            reachable={reachable}
            focusOn={focusOn}
            today={now}
          />
        </Tile>

        {/* L'invitation portait une action — « ouvre le mois » — que cet écran
            n'offre pas. Elle porte maintenant celle qu'il sait faire. */}
        {!hasAny && (
          <EmptyState message={hasRecurrence ? t.calendar.empty : t.calendar.emptyStart}>
            <div className="flex flex-wrap justify-center gap-2">
              {/* La récurrence en tête, et seulement quand il n'y en a aucune :
                  c'est elle qui pose les échéances du calendrier, et les trois
                  portes de saisie ne remplissent que le jour qu'on vise. */}
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
              <Button
                variant="secondary"
                onClick={() => {
                  create('saving')
                }}
              >
                {t.entry.addSaving}
              </Button>
            </div>
          </EmptyState>
        )}
      </div>

      <DaySheet
        date={day}
        entries={day === null ? [] : entriesOn(grid, day)}
        onOpen={(entry) => {
          void navigate(entryPath(entry.id))
        }}
        onAdd={(nature) => {
          if (day !== null) create(nature, day)
        }}
        onClose={close}
      />
    </>
  )
}
