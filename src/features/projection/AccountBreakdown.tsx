/* ============================================================================
 * Ce que fait chaque compte — la moitié de la simulation qui manquait.
 *
 * **Le tracé du haut somme, et c'est la bonne réponse à une seule question.**
 * « Combien j'aurai dans dix ans » se lit sur lui, et sa fourchette dit ce que
 * le calcul ne sait pas. Ce qu'il ne dit pas, et qu'il ne peut pas dire, c'est
 * **lequel des comptes travaille** : un Livret A plafonné qui reçoit 300 € par
 * mois et un PEA muet qui en reçoit 100 arrivent au même total par deux chemins
 * qui n'ont rien de commun — l'un a versé trois fois plus, l'autre a produit
 * trois fois plus. C'est le chemin qu'on vient regarder ici, et il n'existait
 * nulle part : l'écran chiffrait le versé du portefeuille entier, jamais celui
 * d'un compte.
 *
 * **La même décomposition que l'écran d'analyse, et c'est délibéré.** Là-bas
 * elle lit le passé — départ, versements, ce que le compte a produit —, ici elle
 * lit le projeté. Trois couches identiques, la même figure, le même œil : le
 * simulateur cesse d'être un objet à part et devient la suite de la lecture.
 *
 * **Un seul moteur.** Ce qui est tracé n'est pas un second calcul : c'est
 * littéralement `SupportSeries.series`, la trajectoire dont la somme *est* la
 * borne basse de la courbe du haut (cahier §4.6 ter). Le versé se lit sur
 * `contributed`, le rendement par différence — comme partout.
 *
 * **La borne basse, et elle seule.** Tracer les deux ferait six couches par
 * compte pour une lecture qui se veut immédiate ; l'écart d'arrivée est écrit en
 * toutes lettres sous le nom du compte quand il existe, et le seul endroit où
 * une fourchette se **dessine** reste la figure d'ensemble.
 * ==========================================================================*/

import { useState } from 'react'
import { GrowthAreas, type GrowthLayer } from '@/charts/GrowthAreas'
import { type Money, ZERO, money } from '@/domain/money'
import { formatRoundedMoney, tpl } from '@/i18n/format'
import { projection } from '@/i18n/projection'
import { Disclosure } from '@/ui/Disclosure'
import { Eyebrow } from '@/ui/Eyebrow'
import { Tile } from '@/ui/Tile'
import { useCurrency } from '@/ui/currency'
import { MilestoneTable, type MilestoneColumn } from './MilestoneTable'
import { formatDuration } from './duration'
import { breakdownOf, type ProjectionResult, type SupportSeries } from './model'

/**
 * Le nombre de rangs tracés par figure.
 *
 * Une projection sur cinquante ans porte six cent un points mensuels ; la figure
 * en dessine autant qu'on lui en donne, et six cents points par compte sur six
 * comptes feraient un DOM de plusieurs dizaines de kilo-octets pour un tracé
 * large de deux cent cinquante pixels. Soixante suffisent à rendre une courbe
 * lisse — et le dernier rang est toujours gardé, parce que c'est le seul dont le
 * montant est écrit ailleurs.
 */
const MAX_RANKS = 60

/** Les rangs, en mois : un sur N, et jamais sans le dernier. */
function ranksOf(months: number): number[] {
  const step = Math.max(1, Math.ceil((months + 1) / MAX_RANKS))
  const ranks: number[] = []
  for (let month = 0; month <= months; month += step) ranks.push(month)
  if (ranks.at(-1) !== months) ranks.push(months)
  return ranks
}

/** Les trois couches d'un compte, du sol vers le haut. */
function layersOf(part: SupportSeries, ranks: readonly number[]): GrowthLayer[] {
  const initial = part.series.contributed[0] ?? ZERO
  const at = (pick: (rank: number) => number): (Money | null)[] =>
    ranks.map((rank) => money(pick(rank)))

  return [
    /* Le capital du premier jour, sans teinte d'accent : c'est ce qui est déjà
       là, et la lecture porte sur ce qui s'ajoute par-dessus. */
    { id: 'base', label: projection.accountBase, fill: 'var(--surface-2)', values: ranks.map(() => initial) },
    {
      id: 'paid',
      label: projection.contributedArea,
      fill: 'var(--accent-2)',
      opacity: 0.22,
      values: at((rank) => (part.series.contributed[rank] ?? ZERO) - initial),
    },
    /* La teinte du rendement est celle de la bande du tracé d'ensemble, et celle
       de l'écran d'analyse : trois figures, un seul code. */
    {
      id: 'gain',
      label: projection.accountGain,
      fill: 'var(--accent)',
      opacity: 0.3,
      values: at((rank) => (part.series.balance[rank] ?? ZERO) - (part.series.contributed[rank] ?? ZERO)),
    },
  ]
}

function Account({ part, months }: { part: SupportSeries; months: number }) {
  const currency = useCurrency()
  const ranks = ranksOf(months)
  const approx = (value: Money): string =>
    tpl(projection.approx, formatRoundedMoney(value, currency))
  const exact = (value: Money): string => formatRoundedMoney(value, currency)

  const end = breakdownOf(part.series, months)
  const high = part.highSeries.balance.at(-1) ?? ZERO
  const low = part.series.balance.at(-1) ?? ZERO

  return (
    <Tile className="gap-2">
      <span className="t-body font-medium">{part.label}</span>
      {/* Le capital de départ s'écrit **exact** : il est relevé, pas projeté.
          Les deux autres portent le « ≈ » — ils sortent d'un modèle, et un
          montant recopié hors de son écran doit emporter ce fait avec lui. */}
      <span className="t-label">
        {tpl(projection.accountLine, exact(end.initial), approx(end.paid), approx(end.interest))}
      </span>
      {/* L'écart d'arrivée, quand le compte en a un : c'est ce qui remplace le
          tracé des deux bornes, et il ne s'affiche pas sur un compte fixé —
          « entre 42 000 € et 42 000 € » n'est pas une fourchette. */}
      {high !== low && (
        <span className="t-label">
          {tpl(projection.accountRange, approx(low), approx(high))}
        </span>
      )}
      {part.capped && <span className="t-label">{projection.accountCapped}</span>}
      <GrowthAreas
        compact
        layers={layersOf(part, ranks)}
        ranks={ranks.map((rank) => (rank === 0 ? projection.start : formatDuration(rank)))}
        totalLabel={projection.breakdownTotal}
        partialLabel={projection.accountShown}
        label={tpl(projection.accountChart, part.label)}
        srText={tpl(
          projection.srAccount,
          exact(end.initial),
          approx(end.total),
          formatDuration(months),
          approx(end.paid),
          approx(end.interest),
        )}
      />
    </Tile>
  )
}

/**
 * La section entière : une figure par compte, et le tableau des versements.
 *
 * Elle ne s'affiche qu'à partir de **deux** comptes. Sur un seul, elle
 * répéterait mot pour mot la figure du haut — même départ, même versé, même
 * rendement — et un écran qui dit deux fois la même chose apprend surtout qu'on
 * ne sait pas laquelle des deux lire.
 */
export function AccountBreakdown({
  result,
  marks,
}: {
  result: ProjectionResult
  /** Les jalons du tableau, en mois — les mêmes que ceux de l'écran. */
  marks: readonly number[]
}) {
  const [open, setOpen] = useState(false)

  if (result.split.length < 2) return null

  /* Le versé de chaque compte, jalon par jalon — la lecture que la refonte
     ajoute, et celle qu'aucune courbe ne donne au chiffre près. Le capital de
     départ en est retiré : ce qu'on vient chercher est ce qui sortira de la
     poche, pas ce qui était déjà sur le compte. */
  const columns: MilestoneColumn[] = [
    ...result.split.map((part) => {
      const initial = part.series.contributed[0] ?? ZERO
      return {
        id: part.supportId,
        label: part.label,
        values: marks.map((mark) => money((part.series.contributed[mark] ?? ZERO) - initial)),
      }
    }),
    {
      id: '__total__',
      label: projection.breakdownTotal,
      values: marks.map((mark) =>
        money(
          result.split.reduce(
            (sum, part) =>
              sum + (part.series.contributed[mark] ?? ZERO) - (part.series.contributed[0] ?? ZERO),
            0,
          ),
        ),
      ),
    },
  ]

  return (
    <section className="flex flex-col gap-3">
      <Eyebrow>{projection.accounts}</Eyebrow>
      <p className="t-label">{projection.accountsHint}</p>

      {result.split.map((part) => (
        <Account key={part.supportId} part={part} months={result.months} />
      ))}

      <Tile className="gap-2">
        <Disclosure
          open={open}
          onOpenChange={setOpen}
          title={<span className="t-body">{projection.accountPaidTable}</span>}
        >
          <div className="flex flex-col gap-3 pt-3">
            <p className="t-label">{projection.accountPaidHint}</p>
            <MilestoneTable marks={marks} columns={columns} label={projection.accountPaidTable} />
          </div>
        </Disclosure>
      </Tile>
    </section>
  )
}
