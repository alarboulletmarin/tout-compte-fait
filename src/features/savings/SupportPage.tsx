import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  SAVINGS_PATH,
  entryPath,
  rateEditPath,
  rateNewPath,
  supportEditPath,
  valuationEditPath,
  valuationNewPath,
} from '@/app/routes'
import { today } from '@/domain/date'
import { type Money, ZERO } from '@/domain/money'
import { isFull } from '@/domain/savingCap'
import { isOrigin } from '@/domain/savingRate'
import type { SavingSupport } from '@/domain/types'
import { t } from '@/i18n/strings'
import { supports } from '@/i18n/supports'
import { formatDate, formatMoney, formatPercent, tpl } from '@/i18n/format'
import { stopSupportRecurrences, undoable } from '@/store/actions'
import {
  useCapState,
  useCategoryMap,
  useMemberMap,
  useSavingSupport,
  useSupportEntries,
  useSupportMonthFlows,
  useSupportRates,
  useSupportUsage,
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
import { useCurrency } from '@/ui/currency'
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
/* Un taux change une ou deux fois l'an au plus : quatre paliers couvrent
   plusieurs années, là où huit relevés ne couvrent que huit trimestres. */
const SHOWN_RATES = 4
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
  const rates = useSupportRates(support.id)
  const flows = useSupportMonthFlows(support.id)
  const entries = useSupportEntries(support.id)
  /* La même lecture que celle que la saisie oppose à un versement : la fiche
     et le formulaire ne peuvent pas annoncer deux places différentes. */
  const cap = useCapState(support.id)
  const running = useSupportUsage(support.id).runningRecurrences
  const [allValuations, setAllValuations] = useState(false)
  const [allRates, setAllRates] = useState(false)
  const [allMovements, setAllMovements] = useState(false)

  const currency = useCurrency()
  /* Un plafond est un nombre écrit dans un contrat : il s'écrit exact. */
  const exact = (amount: Money): string => formatMoney(amount, currency, false)
  const member = members.get(support.memberId)
  const category = categories.get(support.categoryId)
  const color = category?.color ?? 'var(--cat-rest)'
  const known = value?.known ?? null

  const restValuations = valuations.length - SHOWN_VALUATIONS
  const restRates = rates.length - SHOWN_RATES
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
        <Eyebrow>{t.savings.valueKnown}</Eyebrow>
        {known === null || value === null ? (
          <p className="t-body">{t.savings.valueNone}</p>
        ) : (
          <>
            <Amount value={known} size="tile" />
            <span className="t-label">{freshness(value.knownOn, support.pace)}</span>
            {value.movedSince !== ZERO && value.estimated !== null && (
              <div className="mt-2 flex flex-col gap-1 border-t border-border pt-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="t-label min-w-0 flex-1 truncate">{t.savings.estimated}</span>
                  <Amount value={value.estimated} size="body" className="shrink-0" />
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="t-label min-w-0 flex-1 truncate">{t.savings.movedSince}</span>
                  <Amount value={value.movedSince} size="body" signed className="shrink-0" />
                </div>
                <p className="t-label mt-1">{t.savings.estimatedWarning}</p>
              </div>
            )}
          </>
        )}
        {/* Le plafond du contrat, et ce qu'il en reste. Sur ce qui est
            **versé** : un livret plein continue de rapporter, et la place
            restante est calculée sur le capital d'aujourd'hui — donc un peu
            sous-estimée, puisque les intérêts déjà acquis y sont comptés comme
            des versements. Sans relevé, il n'y a rien à retrancher : le plafond
            se lit, la place non.
            En mots et sans couleur : un livret plein n'est pas une erreur, et
            le DS §2.3 réserve l'alerte aux dépassements. */}
        {cap.kind !== 'none' && (
          <div className="mt-2 flex flex-col items-start gap-2">
            <p className="t-label">
              {cap.kind === 'unknown'
                ? tpl(supports.capUnknown, exact(cap.cap))
                : cap.room <= ZERO
                  ? tpl(supports.capFull, exact(cap.cap))
                  : tpl(supports.capLeft, exact(cap.cap), exact(cap.room))}
            </p>
            {/* Un compte plein que des règles continuent de viser : elles ne
                posent plus rien (voir `planMonth`), et un prévisionnel qui
                s'arrête sans explication se lit comme une panne. Le geste est
                proposé, jamais fait d'office — un livret plein n'est pas un
                compte fermé, et la règle peut très bien attendre janvier. */}
            {isFull(cap) && running > 0 && (
              <>
                <p className="t-label">
                  {running === 1 ? t.savings.capRunningOne : tpl(t.savings.capRunning, running)}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    undoable(t.savings.capRulesStopped, () => {
                      stopSupportRecurrences(support.id)
                    })
                  }}
                >
                  {t.savings.capStopRules}
                </Button>
              </>
            )}
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="t-label inline-flex items-center gap-2">
            <Dot color={member?.color ?? 'var(--cat-rest)'} />
            {member?.name ?? ''}
          </span>
          {category !== undefined && <span className="t-label">{category.label}</span>}
          {support.archived && <span className="t-label">{t.savings.archived}</span>}
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
          {valuations.length === 0 ? t.savings.valueFirst : t.savings.valueUpdate}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            void navigate(supportEditPath(support.id))
          }}
        >
          {t.savings.supportEdit}
        </Button>
      </div>

      {/* À quoi ce compte sert — une ligne, pas une section. C'est le seul
          champ du support dont dépende un chiffre affiché ailleurs, et la fiche
          doit pouvoir le rappeler sans qu'on ouvre le formulaire pour le
          relire. Rien du tout quand personne n'a répondu : écrire « aucun rôle »
          ferait d'un silence une catégorie, et la question se pose là où elle
          change quelque chose — le formulaire, et la tuile d'autonomie. */}
      {support.role !== undefined && (
        <p className="t-label">
          {`${t.savings.roleLabel[support.role]} · ${t.savings.roleHint[support.role]}`}
        </p>
      )}

      {support.note !== undefined && <p className="t-label">{support.note}</p>}

      {/* Le flux du mois, à côté du stock et jamais mêlé à lui : ce sont les
          mêmes `Entry` que celles du tableau de bord, au centime. */}
      <Tile className="gap-3">
        <Eyebrow>{t.savings.monthFlows}</Eyebrow>
        {/* Sans signe sur les deux termes : leur libellé dit déjà le sens, et
            « Reprises +0,00 € » se lirait comme une entrée d'argent un mois où
            il ne s'est rien passé. Le net, lui, le porte — c'est le seul des
            trois qui peut être négatif. */}
        <ul className="flex flex-col gap-1.5">
          <li className="flex items-baseline gap-3">
            <span className="t-label min-w-0 flex-1 truncate">{t.savings.contributions}</span>
            <Amount value={flows.contributions} size="body" className="shrink-0" />
          </li>
          <li className="flex items-baseline gap-3">
            <span className="t-label min-w-0 flex-1 truncate">{t.savings.withdrawals}</span>
            <Amount value={flows.withdrawals} size="body" className="shrink-0" />
          </li>
          <li className="flex items-baseline gap-3 border-t border-border pt-2">
            <span className="t-body min-w-0 flex-1 truncate">{t.savings.net}</span>
            <Amount value={flows.net} size="body" signed className="shrink-0" />
          </li>
        </ul>
      </Tile>

      {/* L'histoire du stock. La courbe ne relie que des points relevés : entre
          deux, le trait est un dessin, pas une donnée. Elle reste visible quoi
          qu'il arrive — c'est la liste qui se replie, pas ce qu'on vient voir. */}
      <Tile className="gap-3">
        <Eyebrow>{t.savings.history}</Eyebrow>
        {valuations.length === 0 ? (
          <p className="t-label">{t.savings.historyEmpty}</p>
        ) : (
          <>
            {valuations.length === 1 ? (
              <p className="t-label">{t.savings.historyOne}</p>
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
                {allValuations ? t.common.less : tpl(t.savings.historyMore, restValuations)}
              </Button>
            )}
          </>
        )}
      </Tile>

      {/* L'histoire du taux, sous celle du stock et bâtie pareil : les deux
          sont des faits datés qui s'empilent. Chaque palier porte sa date de
          début et celle où le suivant lui succède, parce qu'un taux lu sans sa
          période ne dit pas s'il court encore. */}
      <Tile className="gap-3">
        <Eyebrow>{supports.rates}</Eyebrow>
        {rates.length === 0 ? (
          <p className="t-label">{supports.ratesEmpty}</p>
        ) : (
          <>
            <ul className="flex flex-col">
              {(allRates ? rates : rates.slice(0, SHOWN_RATES)).map((rate, index) => (
                <li key={rate.id}>
                  <ListRow
                    color={color}
                    label={
                      isOrigin(rate.from)
                        ? supports.rateFromOrigin
                        : tpl(
                            /* Un palier daté dans l'avenir n'a pas encore
                               commencé : « depuis le 1er janvier 2027 » posé
                               en 2026 se lirait comme une erreur de saisie. */
                            rate.from > today() ? supports.rateAhead : supports.rateFrom,
                            formatDate(rate.from),
                          )
                    }
                    {...(index === 0
                      ? {}
                      : { meta: tpl(supports.rateUntil, formatDate(rates[index - 1]?.from ?? '')) })}
                    trailing={
                      <span className="t-num-body tnum">
                        {`${formatPercent(rate.rateBp / 10_000, rate.rateBp % 100 === 0 ? 0 : 2)} · ${
                          rate.kind === 'guaranteed'
                            ? t.savings.supportRateGuaranteed
                            : t.savings.supportRateAssumed
                        }`}
                      </span>
                    }
                    onClick={() => {
                      void navigate(rateEditPath(support.id, rate.id))
                    }}
                  />
                </li>
              ))}
            </ul>
            {restRates > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="w-fit"
                onClick={() => {
                  setAllRates((shown) => !shown)
                }}
              >
                {allRates ? t.common.less : tpl(supports.ratesMore, restRates)}
              </Button>
            )}
          </>
        )}
        <Button
          size="sm"
          variant="secondary"
          className="w-fit"
          onClick={() => {
            void navigate(rateNewPath(support.id))
          }}
        >
          {rates.length === 0 ? supports.rateFirst : supports.rateAdd}
        </Button>
      </Tile>

      {/* Les mouvements — les `Entry` liées, telles qu'elles vivent dans le
          mois. On les ouvre d'ici : c'est le même écran de saisie qu'ailleurs. */}
      <Tile className="gap-3">
        <Eyebrow>{t.savings.movements}</Eyebrow>
        {entries.length === 0 ? (
          <p className="t-label">{t.savings.movementsEmpty}</p>
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
                {allMovements ? t.common.less : tpl(t.savings.movementsMore, restMovements)}
              </Button>
            )}
          </>
        )}
      </Tile>
    </div>
  )
}
