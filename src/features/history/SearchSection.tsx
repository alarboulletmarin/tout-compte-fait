import { useId, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { entryPath, recurrencePath } from '@/app/routes'
import { isSearchable, searchEntries, searchRecurrences } from '@/domain/search'
import { t } from '@/i18n/strings'
import { history } from '@/i18n/history'
import { formatDate, tpl } from '@/i18n/format'
import { useCategoryMap, useEntries, useRecurrences } from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Button } from '@/ui/Button'
import { TextInput } from '@/ui/Field'
import { ListRow } from '@/ui/ListRow'
import { Tile } from '@/ui/Tile'

/**
 * Assez pour répondre, pas assez pour noyer.
 *
 * Une recherche qui rend deux cents lignes ne réduit rien : elle remplace un
 * défilement mois par mois par un défilement d'un seul tenant. Ce qui dépasse
 * est compté et dit — une coupe silencieuse se lirait comme « il n'y a que
 * ça », c'est-à-dire comme une réponse.
 */
const LIMIT = 20

/**
 * Ce qu'on affiche quand on demande à tout voir.
 *
 * La coupe à vingt était annoncée — « … et 94 de plus » —, ce qui vaut mieux
 * qu'une coupe muette, mais elle n'offrait aucune issue : « précise la
 * recherche » est un conseil, pas une commande, et il ne sert à rien quand les
 * cent quatorze lignes portent réellement le même mot. Elle se lève donc, et
 * l'écran redevient ce qu'il était sans elle : long, mais complet.
 *
 * Elle ne disparaît pas pour autant : le premier écran reste court, parce que
 * répondre à « ce prélèvement de mars » demande dix lignes et non deux cents.
 */
const ALL = Number.MAX_SAFE_INTEGER

/**
 * Retrouver une ligne sans naviguer mois par mois.
 *
 * Elle vit sur l'historique, et non derrière un sixième onglet — la barre en
 * porte cinq et n'en tient pas six à 320px (DS §5). C'est de toute façon
 * l'écran de la question : « ce prélèvement de mars » est un regard en arrière,
 * et l'historique est ce qu'on ouvre pour en jeter un. Les récurrences y
 * figurent aussi parce que la question suivante est presque toujours la même —
 * est-ce que ça revient tous les mois, et combien.
 *
 * Chaque résultat mène à sa fiche : une recherche qui montre sans laisser
 * ouvrir oblige à retrouver une deuxième fois ce qu'elle vient de trouver.
 *
 * **Un champ, et rien autour tant qu'on n'a rien demandé.** Elle occupait une
 * tuile entière — cadre, étiquette de tuile, libellé de champ, champ, phrase
 * d'aide : cinq éléments et cent quatre-vingt-dix pixels posés en tête de
 * l'écran pour un outil dont on ne se sert pas à chaque visite. Trois des cinq
 * disaient la même chose que le quatrième. Le champ vit donc nu dans la colonne
 * de page, comme le filtre du catalogue (`CategoriesPage`), et la surface
 * n'apparaît qu'avec les résultats — c'est eux qu'elle porte, pas l'attente.
 *
 * La phrase d'aide reste, mais là où elle sert : branchée en description du
 * champ pour qui l'écoute, et écrite à l'œil quand la recherche ne rend rien —
 * c'est le seul moment où savoir ce qu'elle a fouillé change quelque chose.
 */
export function SearchSection() {
  const fieldId = useId()
  const hintId = `${fieldId}-hint`
  const [query, setQuery] = useState('')
  /* Se referme dès que la recherche change : une liste complète héritée du mot
     précédent n'a pas été demandée pour celui-ci. */
  const [showAll, setShowAll] = useState(false)
  const entries = useEntries()
  const recurrences = useRecurrences()
  const categories = useCategoryMap()
  const navigate = useNavigate()

  const limit = showAll ? ALL : LIMIT
  const found = useMemo(
    () => ({
      entries: searchEntries(entries, query, limit),
      recurrences: searchRecurrences(recurrences, query, limit),
    }),
    [entries, recurrences, query, limit],
  )
  const hidden = found.entries.hidden + found.recurrences.hidden

  const searching = isSearchable(query)
  const nothing =
    searching && found.entries.items.length === 0 && found.recurrences.items.length === 0

  const colorOf = (categoryId: string): string =>
    categories.get(categoryId)?.color ?? 'var(--cat-rest)'

  /** La date, et la note quand il y en a une. */
  const metaOf = (entry: { date: string; note?: string }): string => {
    const note = entry.note?.trim()
    return note === undefined || note === '' ? formatDate(entry.date) : `${formatDate(entry.date)} · ${note}`
  }

  return (
    <>
      {/* Le libellé existe, il ne s'affiche pas : c'est lui le nom accessible du
          champ, et l'espace réservé porte le même mot à l'œil. */}
      <div>
        <label htmlFor={fieldId} className="sr-only">
          {history.searchLabel}
        </label>
        <TextInput
          id={fieldId}
          type="search"
          value={query}
          placeholder={history.searchPlaceholder}
          aria-describedby={hintId}
          maxLength={60}
          onChange={(event) => {
            setQuery(event.target.value)
            setShowAll(false)
          }}
        />
        <p id={hintId} className="sr-only-text">
          {history.searchHint}
        </p>
      </div>

      {/* Rien tant qu'on n'a rien tapé : ni tuile vide, ni hauteur réservée. */}
      {searching && (
        <Tile className="gap-4">
          {nothing && (
            /* La portée de la recherche se dit ici, et nulle part ailleurs :
               c'est le seul moment où « je n'ai rien trouvé » demande de savoir
               où l'on a cherché. */
            <p className="t-label">
              {tpl(history.searchEmpty, query.trim())} {history.searchHint}
            </p>
          )}

          {found.entries.items.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="t-label font-medium">{history.searchEntries}</span>
              {/* La note se joint à la date plutôt que de rester invisible
                  jusqu'à ce qu'on rouvre la ligne — c'est souvent elle qui
                  distingue deux résultats au même libellé. */}
              <ul className="flex flex-col">
                {found.entries.items.map((entry) => (
                  <li key={entry.id}>
                    <ListRow
                      color={colorOf(entry.categoryId)}
                      label={entry.label}
                      meta={metaOf(entry)}
                      planned={entry.status === 'planned'}
                      trailing={<Amount value={entry.amount} direction={entry.direction} />}
                      onClick={() => {
                        void navigate(entryPath(entry.id))
                      }}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {found.recurrences.items.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="t-label font-medium">{history.searchRecurrences}</span>
              <ul className="flex flex-col">
                {found.recurrences.items.map((recurrence) => (
                  <li key={recurrence.id}>
                    <ListRow
                      color={colorOf(recurrence.categoryId)}
                      label={recurrence.label}
                      meta={
                        recurrence.endedOn === undefined
                          ? (categories.get(recurrence.categoryId)?.label ?? t.common.other)
                          : t.recurrences.stoppedBadge
                      }
                      trailing={
                        recurrence.amount === null ? (
                          <span className="t-label">{t.recurrences.variable}</span>
                        ) : (
                          <Amount value={recurrence.amount} direction={recurrence.direction} />
                        )
                      }
                      onClick={() => {
                        void navigate(recurrencePath(recurrence.id))
                      }}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Une coupe annoncée vaut mieux qu'une coupe muette — c'était déjà
              le cas —, mais « précise la recherche » est un conseil et non une
              commande : il ne sert à rien quand les cent quatorze lignes
              portent réellement le même mot. Le compte des deux listes se dit
              d'un seul endroit, sous les deux, parce que c'est une seule
              décision : on demande à tout voir, pas à tout voir des entrées. */}
          {hidden > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <p className="t-label">{tpl(history.searchMore, hidden)}</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowAll(true)
                }}
              >
                {history.searchShowAll}
              </Button>
            </div>
          )}
        </Tile>
      )}
    </>
  )
}
