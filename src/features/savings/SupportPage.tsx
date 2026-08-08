import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  SAVINGS_PATH,
  entryPath,
  supportEditPath,
  valuationEditPath,
  valuationNewPath,
} from '@/app/routes'
import { ZERO } from '@/domain/money'
import type { SavingSupport } from '@/domain/types'
import { fr } from '@/i18n/fr'
import { formatDate, tpl } from '@/i18n/format'
import {
  useCategoryMap,
  useMemberMap,
  useSavingSupport,
  useSupportEntries,
  useSupportMonthFlows,
  useSupportValuations,
  useSupportValue,
} from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Button } from '@/ui/Button'
import { Dot } from '@/ui/Dot'
import { Eyebrow } from '@/ui/Eyebrow'
import { ListRow } from '@/ui/ListRow'
import { PageTitle } from '@/ui/PageTitle'
import { Tile } from '@/ui/Tile'
import { ValuationChart } from './ValuationChart'
import { freshness } from './freshness'

/**
 * Au-delà, la liste devient l'écran plutôt qu'une lecture de la fiche — et le
 * reste s'ouvre d'un bouton, jamais d'une phrase.
 *
 * « et 15 de plus » annonçait quinze lignes sans donner le moyen de les
 * atteindre : un compte sans geste est une impasse, et c'est la seule chose que
 * la coupe ne doit pas produire.
 */
const SHOWN_VALUATIONS = 8
const SHOWN_MOVEMENTS = 12

/**
 * La fiche d'un support — ce qu'il vaut, ce qu'il a reçu, et son histoire.
 *
 * Quatre lectures dans cet ordre, parce que c'est celui des questions : combien
 * ça vaut, ce que le mois y a mis, comment la valeur a évolué, et quels
 * mouvements l'ont traversé. Le **dernier relevé** est nommé comme tel, avec son
 * âge : c'est un fait daté, pas un solde de compte que l'app connaîtrait.
 *
 * **La gestion du support n'est plus ici.** Archiver, rouvrir, supprimer sont
 * des gestes rares, dont l'un est destructif, et ils occupaient une tuile
 * permanente sous l'historique — c'est-à-dire le même poids qu'une lecture
 * quotidienne. Ils vivent au bout de « Modifier le support », où l'on va
 * justement quand on veut agir sur le compte plutôt que le lire.
 */
export function SupportPage() {
  const { id } = useParams()
  const support = useSavingSupport(id)
  if (support === null) return <Navigate to={SAVINGS_PATH} replace />
  return <SupportView key={support.id} support={support} />
}

function SupportView({ support }: { support: SavingSupport }) {
  const navigate = useNavigate()
  const members = useMemberMap()
  const categories = useCategoryMap()
  const value = useSupportValue(support.id)
  const valuations = useSupportValuations(support.id)
  const flows = useSupportMonthFlows(support.id)
  const entries = useSupportEntries(support.id)
  const [allValuations, setAllValuations] = useState(false)
  const [allMovements, setAllMovements] = useState(false)

  const member = members.get(support.memberId)
  const category = categories.get(support.categoryId)
  const color = category?.color ?? 'var(--cat-rest)'
  const known = value?.known ?? null

  const restValuations = valuations.length - SHOWN_VALUATIONS
  const restMovements = entries.length - SHOWN_MOVEMENTS

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <PageTitle
        title={support.label}
        onBack={() => {
          void navigate(SAVINGS_PATH)
        }}
      >
        <Dot color={color} size={10} className="shrink-0" />
      </PageTitle>

      {/* Ce que ça vaut. Le relevé porte son âge ; l'estimation porte sa
          réserve — jamais « valeur actuelle » tout court, qui promettrait une
          précision que ce calcul n'a pas. */}
      <Tile variant="accent" className="gap-2">
        <Eyebrow>{fr.savings.valueKnown}</Eyebrow>
        {known === null || value === null ? (
          <p className="t-body">{fr.savings.valueNone}</p>
        ) : (
          <>
            <Amount value={known} size="tile" />
            <span className="t-label">{freshness(value.knownOn)}</span>
            {value.movedSince !== ZERO && value.estimated !== null && (
              <div className="mt-2 flex flex-col gap-1 border-t border-border pt-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="t-label min-w-0 flex-1 truncate">{fr.savings.estimated}</span>
                  <Amount value={value.estimated} size="body" className="shrink-0" />
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="t-label min-w-0 flex-1 truncate">{fr.savings.movedSince}</span>
                  <Amount value={value.movedSince} size="body" signed className="shrink-0" />
                </div>
                <p className="t-label mt-1">{fr.savings.estimatedWarning}</p>
              </div>
            )}
          </>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="t-label inline-flex items-center gap-2">
            <Dot color={member?.color ?? 'var(--cat-rest)'} />
            {member?.name ?? ''}
          </span>
          {category !== undefined && <span className="t-label">{category.label}</span>}
          {support.archived && <span className="t-label">{fr.savings.archived}</span>}
        </div>
      </Tile>

      {/* Le geste principal nomme ce qu'il fait : un relevé s'empile, il ne
          réécrit pas le précédent. Sans historique, il invite au premier. */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => {
            void navigate(valuationNewPath(support.id))
          }}
        >
          {valuations.length === 0 ? fr.savings.valueFirst : fr.savings.valueUpdate}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            void navigate(supportEditPath(support.id))
          }}
        >
          {fr.savings.supportEdit}
        </Button>
      </div>

      {support.note !== undefined && <p className="t-label">{support.note}</p>}

      {/* Le flux du mois, à côté du stock et jamais mêlé à lui : ce sont les
          mêmes `Entry` que celles du tableau de bord, au centime. */}
      <Tile className="gap-3">
        <Eyebrow>{fr.savings.monthFlows}</Eyebrow>
        {/* Sans signe sur les deux termes : leur libellé dit déjà le sens, et
            « Reprises +0,00 € » se lirait comme une entrée d'argent un mois où
            il ne s'est rien passé. Le net, lui, le porte — c'est le seul des
            trois qui peut être négatif. */}
        <ul className="flex flex-col gap-1.5">
          <li className="flex items-baseline gap-3">
            <span className="t-label min-w-0 flex-1 truncate">{fr.savings.contributions}</span>
            <Amount value={flows.contributions} size="body" className="shrink-0" />
          </li>
          <li className="flex items-baseline gap-3">
            <span className="t-label min-w-0 flex-1 truncate">{fr.savings.withdrawals}</span>
            <Amount value={flows.withdrawals} size="body" className="shrink-0" />
          </li>
          <li className="flex items-baseline gap-3 border-t border-border pt-2">
            <span className="t-body min-w-0 flex-1 truncate">{fr.savings.net}</span>
            <Amount value={flows.net} size="body" signed className="shrink-0" />
          </li>
        </ul>
      </Tile>

      {/* L'histoire du stock. La courbe ne relie que des points relevés : entre
          deux, le trait est un dessin, pas une donnée. Elle reste visible quoi
          qu'il arrive — c'est la liste qui se replie, pas ce qu'on vient voir. */}
      <Tile className="gap-3">
        <Eyebrow>{fr.savings.history}</Eyebrow>
        {valuations.length === 0 ? (
          <p className="t-label">{fr.savings.historyEmpty}</p>
        ) : (
          <>
            {valuations.length === 1 ? (
              <p className="t-label">{fr.savings.historyOne}</p>
            ) : (
              <ValuationChart valuations={valuations} color={color} />
            )}
            <ul className="flex flex-col">
              {(allValuations ? valuations : valuations.slice(0, SHOWN_VALUATIONS)).map(
                (valuation) => (
                  <li key={valuation.id}>
                    <ListRow
                      color={color}
                      label={formatDate(valuation.date)}
                      trailing={<Amount value={valuation.amount} />}
                      onClick={() => {
                        void navigate(valuationEditPath(support.id, valuation.id))
                      }}
                    />
                  </li>
                ),
              )}
            </ul>
            {restValuations > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="w-fit"
                onClick={() => {
                  setAllValuations((shown) => !shown)
                }}
              >
                {allValuations ? fr.common.less : tpl(fr.savings.historyMore, restValuations)}
              </Button>
            )}
          </>
        )}
      </Tile>

      {/* Les mouvements — les `Entry` liées, telles qu'elles vivent dans le
          mois. On les ouvre d'ici : c'est le même écran de saisie qu'ailleurs. */}
      <Tile className="gap-3">
        <Eyebrow>{fr.savings.movements}</Eyebrow>
        {entries.length === 0 ? (
          <p className="t-label">{fr.savings.movementsEmpty}</p>
        ) : (
          <>
            <ul className="flex flex-col">
              {(allMovements ? entries : entries.slice(0, SHOWN_MOVEMENTS)).map((entry) => (
                <li key={entry.id}>
                  <ListRow
                    color={color}
                    label={entry.label}
                    meta={formatDate(entry.date)}
                    planned={entry.status === 'planned'}
                    trailing={<Amount value={entry.amount} direction={entry.direction} />}
                    onClick={() => {
                      void navigate(entryPath(entry.id))
                    }}
                  />
                </li>
              ))}
            </ul>
            {restMovements > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="w-fit"
                onClick={() => {
                  setAllMovements((shown) => !shown)
                }}
              >
                {allMovements ? fr.common.less : tpl(fr.savings.movementsMore, restMovements)}
              </Button>
            )}
          </>
        )}
      </Tile>
    </div>
  )
}
