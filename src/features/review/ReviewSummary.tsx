import { type CSSProperties, type ReactNode } from 'react'
import type { YearMonth } from '@/domain/date'
import { type Money, abs, isZero, sub } from '@/domain/money'
import { de, formatMonthName, formatYearMonth, tpl } from '@/i18n/format'
import { t } from '@/i18n/strings'
import { useHouseholdReport } from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Button } from '@/ui/Button'
import { Eyebrow } from '@/ui/Eyebrow'
import { BalanceIcon } from '@/ui/Icons'
import { cascadeStyle, useCascade } from '@/ui/cascade'

/* La cascade vit dans `ui/cascade.ts` : le récapitulatif du premier lancement
   compose ses lignes de la même façon, et deux cadences différentes pour le
   même geste se verraient d'un écran à l'autre. */

/** Une ligne du bilan : ce qu'on lit, et ce que ça vaut. */
function SummaryLine({
  label,
  value,
  rank,
  shown,
}: {
  label: string
  value: ReactNode
  rank: number
  shown: number
}) {
  return (
    <div
      className="flex items-baseline justify-between gap-3 transition-[transform,opacity] ease-ds"
      style={cascadeStyle(rank, shown)}
    >
      <span className="t-body text-muted">{label}</span>
      {value}
    </div>
  )
}

/** L'écart au prévu, dit en mots plutôt qu'en signe. */
function gapLabel(balance: Money, forecast: Money): { text: string; value: Money | null } {
  const gap = sub(balance, forecast)
  if (isZero(gap)) return { text: t.review.gapNone, value: null }
  return { text: gap < 0 ? t.review.gapUnder : t.review.gapOver, value: abs(gap) }
}

/**
 * Le bilan — la fin visible de la tâche.
 *
 * Aucun chiffre n'y est calculé : les quatre lignes et les deux soldes viennent
 * de `useHouseholdReport`, qui rejoue les fonctions du domaine sur le foyer
 * entier. Un bilan qui referait ses additions à l'écran finirait par ne plus
 * dire la même chose que le mois qu'il ferme.
 *
 * « Fermer le mois » **n'écrit rien**. `MonthState.closed` est un champ réservé,
 * écrit à `false` et jamais lu, et le design nie lui-même le verrou en écrivant
 * qu'un mois fermé reste modifiable. Le bouton est donc une navigation : il fait
 * passer au mois suivant, que l'app ouvre toute seule en y arrivant — jamais une
 * tâche pour l'utilisateur.
 */
export function ReviewSummary({
  ym,
  reviewed,
  canClose,
  onClose,
}: {
  ym: YearMonth
  /** Combien de lignes la file portait. */
  reviewed: number
  /**
   * Le mois suivant est dans l'horizon d'écriture de l'app.
   *
   * Faux, il n'y a nulle part où aller : ouvrir un mois écrit toutes les
   * échéances de toutes les règles, définitivement, et la borne des douze mois
   * existe pour que la navigation ne se repousse pas elle-même.
   */
  canClose: boolean
  onClose: () => void
}) {
  const report = useHouseholdReport()
  /* Quatre lignes, la tuile du solde, le pied : six temps. Le pied vient en
     dernier parce qu'il porte le seul geste — on ne propose pas de fermer un
     mois dont le bilan n'a pas fini de s'écrire. */
  const shown = useCascade(6)
  const gap = gapLabel(report.balance, report.forecast)
  const month = formatMonthName(ym)

  const footer: CSSProperties = {
    opacity: shown >= 6 ? 1 : 0,
    transitionDuration: 'var(--dur-view)',
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <span className="t-eyebrow text-muted">
        {tpl(t.review.summaryEyebrow, formatYearMonth(ym))}
      </span>

      <section className="tile flex flex-col gap-3 p-5 md:p-6">
        <SummaryLine
          rank={0}
          shown={shown}
          label={t.review.summaryIn}
          value={<Amount value={report.income} size="body" direction="in" />}
        />
        <SummaryLine
          rank={1}
          shown={shown}
          label={t.review.summaryOut}
          value={<Amount value={report.spending} size="body" />}
        />
        <SummaryLine
          rank={2}
          shown={shown}
          label={t.review.summarySaved}
          value={<Amount value={report.saved} size="body" />}
        />
        <SummaryLine
          rank={3}
          shown={shown}
          label={t.review.summaryLines}
          value={
            <span className="t-num-body tnum">
              {tpl(reviewed === 1 ? t.review.summaryLinesOne : t.review.summaryLinesValue, reviewed)}
            </span>
          }
        />
      </section>

      <section
        className="tile flex flex-col gap-3 p-5 transition-[transform,opacity] ease-ds md:p-6"
        style={cascadeStyle(4, shown)}
      >
        <Eyebrow icon={BalanceIcon}>{tpl(t.review.summaryBalance, de(month))}</Eyebrow>
        <span className="fit-box block">
          <Amount value={report.balance} size="hero-fit" />
        </span>
        <span className="t-axis flex items-center gap-1">
          {gap.value !== null && <Amount value={gap.value} size="label" />}
          {gap.text}
        </span>
      </section>

      <div
        className="flex flex-col gap-3 transition-opacity ease-ds"
        style={footer}
      >
        <Button full onClick={onClose}>
          {canClose ? tpl(t.review.close, month) : t.review.back}
        </Button>
        <span className="t-axis text-center">
          {canClose ? t.review.closeHint : t.review.nextBeyond}
        </span>
      </div>
    </div>
  )
}
