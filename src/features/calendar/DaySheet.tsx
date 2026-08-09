import type { ISODate } from '@/domain/date'
import type { Entry } from '@/domain/types'
import { t } from '@/i18n/strings'
import { formatWeekdayDate, tpl } from '@/i18n/format'
import { useCategoryMap, useMemberMap } from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Button } from '@/ui/Button'
import { Eyebrow } from '@/ui/Eyebrow'
import { ListRow } from '@/ui/ListRow'
import { Sheet } from '@/ui/Sheet'
import { dayNet } from './grid'

function countLabel(count: number): string {
  if (count === 0) return t.calendar.noEntry
  if (count === 1) return t.calendar.oneEntry
  return tpl(t.calendar.someEntries, count)
}

export type DaySheetProps = {
  /** Le jour ouvert, ou `null` — la feuille reste montée, fermée. */
  date: ISODate | null
  entries: readonly Entry[]
  onOpen: (entry: Entry) => void
  onAdd: (nature: 'in' | 'out' | 'saving') => void
  onClose: () => void
}

/**
 * Le jour ouvert, en feuille montante.
 *
 * Il vivait en tuile sous la grille, et devait alors se réécrire ce que
 * `<dialog>` donne : la touche Échap, le clic à côté, le piège de focus, et le
 * retour du focus à la case d'où l'on vient. Le DS §6 réserve la feuille aux
 * questions fermées et l'interdit à la saisie — celle-ci ne saisit rien, elle
 * lit, et passe la main à l'écran plein pour créer.
 *
 * Le total est la somme des lignes juste en dessous, entières, jamais à la part
 * de quelqu'un : c'est pourquoi cet écran monte son bandeau sans note de
 * lecture. La note existe pour les totaux dont les lignes ne sont nulle part à
 * l'écran ; ici elles y sont toutes, et le chiffre se vérifie à l'œil.
 */
export function DaySheet({ date, entries, onOpen, onAdd, onClose }: DaySheetProps) {
  const categories = useCategoryMap()
  const members = useMemberMap()

  return (
    <Sheet
      open={date !== null}
      onClose={onClose}
      title={date === null ? '' : formatWeekdayDate(date)}
      pullToClose
      footerLead={
        /* Le verbe, que la rangée n'a pas la place de porter trois fois.
           `aria-hidden` parce que chaque bouton le porte déjà dans son nom
           accessible : un lecteur d'écran l'entendrait sinon quatre fois. Et
           `t-eyebrow` nu, pas le composant `Eyebrow` — celui-ci rend une pilule
           `--surface-2`, qui est une étiquette de tuile et non une légende. */
        <p aria-hidden="true" className="t-eyebrow text-muted">
          {t.calendar.addLead}
        </p>
      }
      footer={
        /* Le jour ouvert est déjà la réponse à « quelle date ? » : la saisie
           s'ouvre dessus plutôt que de la redemander. Et la nature se choisit
           ici, pas dans un formulaire intitulé « dépense » — l'épargne a sa
           porte, comme sur le mois et le bouton flottant.

           Toujours sans le « + » que portait le panneau, et la mesure est plus
           dure qu'on ne l'avait écrite : le pied partage 280px en trois, moins
           deux gouttières, donc 88px par bouton à 320px de fenêtre. En taille
           `md` il ne reste que 48px de texte pour « Dépense », qui en demande
           52 — la rangée débordait déjà sans aucun glyphe. `sm` rend douze
           pixels par bouton sans toucher aux 44px de haut du DS §8, où le glyphe
           en réclamerait vingt-quatre de plus.

           « Dépense » mène, comme sur l'état vide de cet écran et sur les portes
           du bouton flottant : trois endroits, un seul ordre.

           Le nom accessible porte le verbe et contient le libellé visible — la
           légende au-dessus est une affordance pour l'œil, elle n'est reliée à
           rien pour un lecteur d'écran. La relier en `aria-labelledby` dirait
           « Ajouter Dépense », qui n'est pas du français. */
        <>
          <Button
            size="sm"
            variant="secondary"
            aria-label={t.entry.addOut}
            onClick={() => {
              onAdd('out')
            }}
          >
            {t.entry.newOut}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            aria-label={t.entry.addIn}
            onClick={() => {
              onAdd('in')
            }}
          >
            {t.entry.newIn}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            aria-label={t.entry.addSavingAction}
            onClick={() => {
              onAdd('saving')
            }}
          >
            {t.entry.newSaving}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <Eyebrow>{t.calendar.dayTotal}</Eyebrow>
          {/* Sans `direction` : c'est un solde, donc le « − » s'affiche (DS §3).
              Un jour n'a pas de sens propre — il en a deux, et leur différence
              est justement ce qu'on vient chercher. */}
          <Amount value={dayNet(entries)} />
        </div>
        <p className="t-label">{countLabel(entries.length)}</p>

        {entries.length === 0 ? (
          <p className="t-body">{t.calendar.emptyDay}</p>
        ) : (
          /* La liste se lit dans l'ordre exact des pastilles de la case : le tri
             est posé une fois pour toutes dans `useCalendarWindow`. */
          <ul className="flex flex-col">
            {entries.map((entry) => {
              const name =
                entry.memberId === undefined ? undefined : members.get(entry.memberId)?.name
              return (
                <li key={entry.id}>
                  <ListRow
                    color={categories.get(entry.categoryId)?.color ?? 'var(--cat-rest)'}
                    label={entry.label}
                    {...(name === undefined ? {} : { meta: name })}
                    planned={entry.status === 'planned'}
                    trailing={<Amount value={entry.amount} direction={entry.direction} />}
                    onClick={() => {
                      onOpen(entry)
                    }}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Sheet>
  )
}
