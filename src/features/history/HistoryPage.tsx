import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MonthlyBars } from '@/charts/MonthlyBars'
import { RECURRENCE_NEW_PATH } from '@/app/routes'
import { type YearMonth, currentYm } from '@/domain/date'
import type { MonthPoint } from '@/domain/history'
import { type Money, money, sub, sum } from '@/domain/money'
import { t } from '@/i18n/strings'
import { history } from '@/i18n/history'
import { formatMoney, formatYearMonth, tpl } from '@/i18n/format'
import { useCurrencyCode, useEntries, useRecurrences, useTrailingMonths } from '@/store/selectors'
import { useStore } from '@/store/store'
import { Amount } from '@/ui/Amount'
import { Dot } from '@/ui/Dot'
import { EmptyState } from '@/ui/EmptyState'
import { Eyebrow } from '@/ui/Eyebrow'
import { ChevronRight, HistoryIcon } from '@/ui/Icons'
import { PageTitle } from '@/ui/PageTitle'
import { Segmented } from '@/ui/Segmented'
import { Tile } from '@/ui/Tile'
import { CompareSection } from './CompareSection'
import { SearchSection } from './SearchSection'

/**
 * Les deux fenêtres, et pas une de plus.
 *
 * Six mois est la saison — ce qu'on compare quand on cherche à savoir si le
 * mois qu'on vient de fermer sort de l'ordinaire. Douze est l'année, où les
 * dépenses annuelles ont toutes eu lieu une fois. Entre les deux il n'y a rien
 * à dire, et une troisième position ferait choisir sans qu'aucune réponse en
 * dépende.
 */
type Span = '6' | '12'

const spans = (): { value: Span; label: string }[] => [
  { value: '6', label: history.span6 },
  { value: '12', label: history.span12 },
]

/** Le plus large ou le plus serré des mois qui portent une donnée. */
function extremeOf(points: readonly MonthPoint[], widest: boolean): MonthPoint | null {
  let best: MonthPoint | null = null
  for (const point of points) {
    if (best === null) best = point
    else if (widest ? point.balance > best.balance : point.balance < best.balance) best = point
  }
  return best
}

/**
 * Une des deux tuiles d'extrême : son montant, et le mois qui le porte.
 *
 * Sans glyphe : le DS §9 n'admet l'icône que pour agir ou pour se repérer, et
 * deux tuiles voisines dont les libellés se lisent d'un coup n'ont besoin
 * d'aucun des deux. Une flèche montante en tête de « Le plus large » serait
 * décorative, et il faudrait en importer une de plus dans le morceau d'entrée,
 * que tous les écrans emportent.
 */
function ExtremeTile({ label, point }: { label: string; point: MonthPoint }) {
  return (
    <Tile className="gap-1.5">
      <Eyebrow>{label}</Eyebrow>
      <Amount value={point.balance} size="tile-fit" />
      <span className="t-axis">{formatYearMonth(point.ym)}</span>
    </Tile>
  )
}

/**
 * Une rangée de la liste mois par mois.
 *
 * **La barre compare le mois à la moyenne de la fenêtre**, et c'est ce que le
 * design appelait « l'écart au prévu ». Le prévu, sur un mois derrière soi, est
 * égal au réalisé au centime : toutes ses lignes sont confirmées, et la couleur
 * aurait dit « au-dessus du prévu » sur onze rangées sur douze, c'est-à-dire
 * rien. La moyenne, elle, est le chiffre héros de la tuile juste au-dessus :
 * chaque rangée se lit contre lui, et la comparaison porte enfin sur quelque
 * chose qu'on vient de lire.
 *
 * Lime au-dessus, violet en dessous — deux **remplissages**, jamais des encres
 * (DS §2.3), et la couleur ne porte pas seule ce qu'elle dit : l'écart est écrit
 * en toutes lettres sous la barre, et la barre elle-même est `aria-hidden`.
 *
 * La largeur se prend sur le plus grand solde **en valeur absolue** de la
 * fenêtre : un mois à −400 € est aussi loin de zéro qu'un mois à +400 €, et une
 * échelle qui ne compterait que les positifs ferait déborder les autres.
 */
function MonthRow({
  point,
  peak,
  average,
  onOpen,
}: {
  point: MonthPoint
  /** Le plus grand solde de la fenêtre, en valeur absolue. Jamais zéro ici. */
  peak: number
  average: Money
  onOpen: (ym: YearMonth) => void
}) {
  const currency = useCurrencyCode()
  const gap = sub(point.balance, average)
  const above = gap >= 0
  const width = `${String(Math.round((Math.abs(point.balance) / peak) * 100))}%`

  return (
    <button
      type="button"
      onClick={() => {
        onOpen(point.ym)
      }}
      className="flex min-h-14 w-full items-center gap-3 rounded-inner px-3 py-2 text-left transition-colors duration-[var(--dur)] ease-ds hover:bg-surface-2 active:bg-surface-2"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="t-body">{formatYearMonth(point.ym)}</span>
          {point.ym === currentYm() && <span className="t-axis">{history.spanCurrent}</span>}
        </span>
        <span
          aria-hidden="true"
          className="block h-2 max-w-48 overflow-hidden rounded-chip bg-surface-2"
        >
          <span
            className={`block h-2 rounded-chip ${above ? 'bg-accent' : 'bg-accent-2'}`}
            style={{ width }}
          />
        </span>
        <span className="t-axis">
          {tpl(
            above ? history.spanAbove : history.spanBelow,
            formatMoney(Math.abs(gap) as Money, currency, false),
          )}
        </span>
      </span>
      <Amount value={point.balance} size="body" className="shrink-0" />
      <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-muted" />
    </button>
  )
}

/**
 * L'évolution du solde, sur six ou douze mois — le bloc central de l'écran.
 *
 * Il ne portait qu'un graphique : douze barres qu'on lisait à leur hauteur,
 * sans un chiffre pour les résumer et sans un moyen d'entrer dans un mois. La
 * tuile dit maintenant ce que la série vaut — sa moyenne, son cumul, l'écart du
 * mois qu'on vit —, les deux extrêmes se nomment, et chaque mois est une porte
 * vers l'écran du mois, où il se lit ligne à ligne.
 *
 * La fenêtre est une commande de cet écran, et non plus le mois choisi
 * ailleurs : la série s'arrête à aujourd'hui quoi qu'on regarde dans le
 * bandeau du mois, et le titre annonçait « douze derniers mois » sans que rien
 * ne permette d'en demander six.
 *
 * **Les mois vides ne comptent dans aucun chiffre.** Un mois sans aucune ligne
 * n'est pas un mois à zéro (cahier §4.7) : le faire entrer dans la moyenne
 * ferait baisser le solde moyen d'un foyer qui vient d'installer l'app, et
 * l'extrême le plus serré serait toujours le premier mois du document.
 */
function Evolution() {
  const [span, setSpan] = useState<Span>('12')
  const points = useTrailingMonths(span === '6' ? 6 : 12)
  const currency = useCurrencyCode()
  const setYm = useStore((s) => s.setYm)
  const navigate = useNavigate()

  const filled = points.filter((point) => point.hasData)
  const range = tpl(
    history.trailingRange,
    formatYearMonth(points[0]?.ym ?? ''),
    formatYearMonth(points.at(-1)?.ym ?? ''),
  )

  /* Le mois se choisit ici et se lit là-bas : `ym` vit dans le store, comme
     partout — l'écran du mois n'a pas d'URL par mois, et une rangée qui
     ouvrirait un mois sans le poser mènerait à celui d'avant. */
  const open = (ym: YearMonth): void => {
    setYm(ym)
    void navigate('/')
  }

  const control = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="t-axis">{history.spanLabel}</span>
      <Segmented options={spans()} value={span} onChange={setSpan} label={history.spanLabel} />
    </div>
  )

  if (filled.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {control}
        <Tile className="gap-4">
          <Eyebrow icon={HistoryIcon}>{history.evolution}</Eyebrow>
          <p className="t-label">{history.trailingEmpty}</p>
        </Tile>
      </div>
    )
  }

  const cumulated = sum(filled.map((point) => point.balance))
  const average = money(Math.round(cumulated / filled.length))
  const peak = Math.max(...filled.map((point) => Math.abs(point.balance)))
  const widest = extremeOf(filled, true)
  const tightest = extremeOf(filled, false)

  return (
    <div className="flex flex-col gap-4">
      {control}

      <Tile className="gap-4">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          {/* `fit-box` autour du chiffre héros : il partage sa ligne avec les
              deux lectures de droite, et se taille donc sur ce qui lui reste. */}
          <span className="fit-box flex min-w-0 flex-col gap-1.5">
            <Eyebrow icon={HistoryIcon}>{history.average}</Eyebrow>
            <Amount value={average} size="hero-fit" />
            <span className="t-axis">{tpl(history.averageOn, filled.length)}</span>
          </span>
          <span className="flex flex-col gap-1">
            <span className="t-axis">{history.cumulated}</span>
            <Amount value={cumulated} size="body" />
            <span className="t-axis">{range}</span>
          </span>
        </div>

        <MonthlyBars
          points={points}
          label={tpl('%s — %s', history.evolution, range)}
          srText={tpl(
            history.srTrailing,
            filled
              .map((p) => `${formatYearMonth(p.ym)} ${formatMoney(p.balance, currency, false)}`)
              .join(', '),
          )}
        />

        {/* La légende du tracé : deux pastilles et leurs mots. Le solde, lui,
            est la courbe et non une barre — il se nomme dans le curseur. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="flex items-center gap-1.5">
            <Dot color="var(--flow-in)" size={8} />
            <span className="t-axis">{history.legendIn}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Dot color="var(--flow-out)" size={8} />
            <span className="t-axis">{history.legendOut}</span>
          </span>
        </div>
      </Tile>

      {/* Les deux bornes de la fenêtre. Empilées sous 768px, comme tout bloc
          hors bento (DS §5) : à 320 points, deux tuiles côte à côte
          n'offriraient pas les treize caractères que leur étiquette demande. */}
      {widest !== null && tightest !== null && widest.ym !== tightest.ym && (
        <div className="cols">
          <ExtremeTile label={history.widest} point={widest} />
          <ExtremeTile label={history.tightest} point={tightest} />
        </div>
      )}

      <section className="flex flex-col gap-2">
        <Eyebrow className="text-muted">{history.monthByMonth}</Eyebrow>
        <Tile className="p-2! md:p-2!">
          <ul className="flex flex-col">
            {[...filled].reverse().map((point) => (
              <li key={point.ym}>
                <MonthRow point={point} peak={peak} average={average} onOpen={open} />
              </li>
            ))}
          </ul>
        </Tile>
      </section>
    </div>
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
        {/* L'invitation renvoie à une règle et non à une dépense, et la cause
            l'impose : cet écran ne se vide que quand le document est vide — ni
            ligne, ni règle. Une dépense ponctuelle ne remplira pas le mois
            prochain, donc elle ne fera pas non plus d'historique ; ce qui pose
            des mois, c'est ce qui revient. C'est le principe que le mois, le
            calendrier et `/flux` appliquent déjà, et le seul état vide de l'app
            qui y échappait encore. */}
        <EmptyState
          message={history.empty}
          actionLabel={t.recurrences.add}
          onAction={() => {
            void navigate(RECURRENCE_NEW_PATH)
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
        <Evolution />
        <CompareSection />
      </div>
    </>
  )
}
