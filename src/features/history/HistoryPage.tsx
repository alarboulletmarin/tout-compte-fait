import { useNavigate } from 'react-router-dom'
import { MonthlyBars } from '@/charts/MonthlyBars'
import { entryNewPath } from '@/app/routes'
import { t } from '@/i18n/strings'
import { history } from '@/i18n/history'
import { formatMoney, formatYearMonth, tpl } from '@/i18n/format'
import { useCurrencyCode, useEntries, useRecurrences, useTrailingMonths } from '@/store/selectors'
import { EmptyState } from '@/ui/EmptyState'
import { Eyebrow } from '@/ui/Eyebrow'
import { HistoryIcon } from '@/ui/Icons'
import { PageTitle } from '@/ui/PageTitle'
import { Tile } from '@/ui/Tile'
import { CompareSection } from './CompareSection'
import { SearchSection } from './SearchSection'

/** Entrées, sorties et solde sur les douze derniers mois. */
function Trailing() {
  const points = useTrailingMonths(12)
  const currency = useCurrencyCode()
  const filled = points.filter((point) => point.hasData)
  /* La fenêtre se nomme par ses deux bornes, et non plus par le mois choisi
     ailleurs : elle s'arrête à aujourd'hui, et le titre disait un mois qu'aucune
     commande de cet écran ne réglait. */
  const from = points[0]?.ym
  const to = points.at(-1)?.ym

  return (
    <Tile className="gap-4">
      {/* L'étiquette nomme le sujet, la fenêtre le cadre. « DOUZE DERNIERS
          MOIS » en eyebrow nommait le cadre et laissait la tuile sans sujet, et
          la même phrase se relisait ensuite dans le nom accessible du
          graphique. Les deux tiennent sur une ligne : deux étiquettes empilées
          n'auraient été qu'une information écrite deux fois. */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <Eyebrow icon={HistoryIcon}>{history.evolution}</Eyebrow>
        <span className="t-axis">{history.trailing}</span>
      </div>
      {filled.length === 0 ? (
        <p className="t-label">{history.trailingEmpty}</p>
      ) : (
        /* Plus de légende sous le tracé : elle nommait les trois séries sans
           les chiffrer, et la lecture au-dessus du graphique dit désormais les
           deux — mêmes pastilles, mêmes mots, plus la valeur du mois lu. Deux
           blocs pour un seul sens, c'était le second qui ne servait pas. */
        <MonthlyBars
          points={points}
          label={tpl(
            '%s — %s',
            history.trailing,
            tpl(history.trailingRange, formatYearMonth(from ?? ''), formatYearMonth(to ?? '')),
          )}
          srText={tpl(
            history.srTrailing,
            filled
              .map((p) => `${formatYearMonth(p.ym)} ${formatMoney(p.balance, currency, false)}`)
              .join(', '),
          )}
        />
      )}
    </Tile>
  )
}

export function HistoryPage() {
  const entries = useEntries()
  const recurrences = useRecurrences()
  const navigate = useNavigate()

  /* Rien du tout, et non « pas assez pour cette tuile-ci » : c'est le seul cas
     où les quatre n'ont rien à dire à la fois, donc le seul où les remplacer ne
     cache rien. Les récurrences comptent parce que la recherche les trouve —
     un foyer qui n'a posé que des règles arrêtées n'a aucune entrée, et il
     aurait pourtant quelque chose à chercher. */
  if (entries.length === 0 && recurrences.length === 0) {
    return (
      <>
        <PageTitle title={history.title} />
        <EmptyState
          message={history.empty}
          actionLabel={t.entry.addOut}
          onAction={() => {
            void navigate(entryNewPath({ direction: 'out' }))
          }}
        >
          <p className="t-label max-w-sm">{history.emptyHint}</p>
        </EmptyState>
      </>
    )
  }

  return (
    <>
      <PageTitle title={history.title} />
      {/* Trois blocs et non quatre, dans l'ordre des trois questions qu'on pose
          à un historique : où est cette ligne, comment ça évolue, qu'est-ce qui
          a changé. La recherche est un champ nu — elle n'occupe l'écran qu'une
          fois qu'on lui a demandé quelque chose, et ses résultats arrivent
          alors juste sous le doigt plutôt que sous deux graphiques. */}
      <div className="flex max-w-3xl flex-col gap-4">
        <SearchSection />
        <Trailing />
        <CompareSection />
      </div>
    </>
  )
}
