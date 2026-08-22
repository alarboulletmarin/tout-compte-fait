import { useNavigate } from 'react-router-dom'
import { RECURRENCE_NEW_PATH, entryNewPath } from '@/app/routes'
import { t } from '@/i18n/strings'
import { de, formatMonthName, tpl } from '@/i18n/format'
import { useCurrentYm } from '@/store/selectors'
import { Button } from '@/ui/Button'
import { Eyebrow } from '@/ui/Eyebrow'
import { RecurrencesIcon } from '@/ui/Icons'
import { Tile } from '@/ui/Tile'

/**
 * « Août est vide » — l'écran d'un document qui n'a encore rien.
 *
 * **Ni ligne ni récurrence**, et c'est `useHasAnyData` qui le dit, pas le
 * `status` du store : la présentation est l'écran d'avant le document, pas
 * l'écran du document vide. Un foyer créé puis vidé est dans l'app, et sa
 * réponse est celle-ci.
 *
 * La récurrence passe devant, en action principale, et la dépense reste en
 * fantôme : « ajoute une dépense » n'amorce aucune prévision, alors que toute
 * la thèse de l'app est qu'on écrit une fois ce qui revient. C'est la règle
 * qu'appliquaient déjà l'état vide du mois et celui de la revue.
 *
 * Le bento et la liste ne s'affichent pas derrière : six tuiles à zéro ne sont
 * pas une situation, ce sont six cases vides qui font descendre la seule chose
 * à faire.
 */
export function MonthEmptyTile() {
  const navigate = useNavigate()
  const ym = useCurrentYm()

  return (
    <Tile className="gap-3">
      <Eyebrow icon={RecurrencesIcon}>{t.month.nothingYet}</Eyebrow>
      <span className="t-tile-num">{tpl(t.month.monthIsEmpty, de(formatMonthName(ym)))}</span>
      <p className="t-body max-w-[44ch]">{t.month.emptyStart}</p>
      {/* `data-empty` : la même promesse que sur `EmptyState`, et vérifiée au
          même endroit — ce que l'écran vide offre est sous les yeux. */}
      <div data-empty className="flex flex-wrap gap-2">
        <Button
          onClick={() => {
            void navigate(RECURRENCE_NEW_PATH)
          }}
        >
          {t.recurrences.add}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            void navigate(entryNewPath({ direction: 'out' }))
          }}
        >
          {t.month.justAnExpense}
        </Button>
      </div>
    </Tile>
  )
}
