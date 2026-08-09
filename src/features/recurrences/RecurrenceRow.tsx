import { diffDays, today } from '@/domain/date'
import { isCostly } from '@/domain/priceHistory'
import { t } from '@/i18n/strings'
import { formatDayMonthShort, formatMoney, formatRelativeDays, tpl } from '@/i18n/format'
import { cn } from '@/lib/cn'
import { type RecurrenceRow as Row, useKindOf } from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Dot } from '@/ui/Dot'
import { Warning } from '@/ui/Icons'
import { useCurrency } from '@/ui/currency'

/**
 * La seconde ligne : quand ça tombe, et — quand la liste ne le dit pas déjà par
 * son axe — à qui c'est.
 *
 * Les deux se joignent plutôt que de se chasser, comme sur la liste du mois :
 * « 12 janv. · dans 3 jours · Alix » répond aux trois questions sur une ligne
 * qui n'en a qu'une à donner. Un prénom y tient ; c'est la raison pour laquelle
 * l'appelant n'y met que ça (voir `whoOf`).
 */
function meta(row: Row, who: string | undefined): string {
  if (row.stopped) return t.recurrences.stoppedBadge
  const when =
    row.next === null
      ? t.recurrences.noNextDue
      : `${formatDayMonthShort(row.next)} · ${formatRelativeDays(diffDays(today(), row.next))}`
  return who === undefined ? when : `${when} · ${who}`
}

/**
 * Le coût annuel n'est une lecture que là où il en est une.
 *
 * Sur une mensuelle, il vaut douze fois le chiffre juste au-dessus : il
 * n'apprend rien et fait le quatrième nombre d'une ligne qui en portait déjà
 * trop. Sur une hebdomadaire, une trimestrielle ou une annuelle, le mensuel est
 * un amortissement — un chiffre qu'on n'a jamais payé tel quel — et l'annuel est
 * alors la somme réelle. Il reste sur la fiche dans tous les cas.
 */
function showsAnnual(row: Row): boolean {
  const { unit, every } = row.recurrence.period
  return !(unit === 'month' && every === 1)
}

/**
 * Une ligne de récurrence : prochaine échéance à gauche, coût mensuel amorti à
 * droite. Un changement de prix se signale ici.
 */
export function RecurrenceRow({
  row,
  color,
  who,
  onOpen,
}: {
  row: Row
  color: string
  /** À qui elle est, quand la liste ne le dit pas déjà par son axe. */
  who?: string
  onOpen: () => void
}) {
  const currency = useCurrency()
  const kindOf = useKindOf()
  const { recurrence, monthly, annual, priceChange, stopped } = row
  const kind = kindOf(recurrence.categoryId)
  const costly = priceChange !== null && isCostly(priceChange, recurrence.direction, kind)

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        /* Quatre chiffres par ligne — le mensuel, l'annuel, la date, le délai —
           et deux lignes de texte qui se touchaient : la liste se lisait comme
           un bloc. L'annuel n'y est plus quand il ne dit rien (voir
           `showsAnnual`) ; le reste sert, et c'est l'espace qui lui manquait.
           Le cadre passe donc de 10 à 12px, et les deux niveaux de chaque
           colonne se décollent l'un de l'autre. */
        'flex w-full items-center gap-3 rounded-inner px-3 py-3 text-left',
        'transition-colors duration-[var(--dur)] ease-ds hover:bg-surface-2 active:bg-surface-2',
      )}
    >
      <Dot color={color} outlined={stopped} />

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn('t-body truncate', stopped && 'text-muted')}>{recurrence.label}</span>
        <span className="t-axis truncate">{meta(row, who)}</span>
        {priceChange !== null && (
          /* L'alerte ne se déclenche que quand le changement coûte : une charge
             qui monte, un revenu qui baisse — jamais l'épargne, qui reste au
             foyer. Un salaire augmenté en rouge avec un panneau d'avertissement
             dirait le contraire de ce qui arrive — et le DS §2.3 réserve le
             rouge aux dépassements et aux erreurs. */
          <span
            className={cn('t-label mt-0.5 flex items-center gap-1', costly && 'text-danger-text')}
          >
            {costly && <Warning size={14} className="shrink-0" />}
            <span className="tnum truncate">
              {tpl(
                // Un virement d'épargne n'a pas de prix : son montant change.
                kind === 'saving' ? t.recurrences.amountChanged : t.recurrences.priceChanged,
                formatMoney(priceChange.previous, currency),
                formatMoney(priceChange.current, currency),
              )}
            </span>
          </span>
        )}
      </span>

      <span className="flex shrink-0 flex-col items-end gap-0.5">
        {monthly === null ? (
          <span className="t-label">{t.recurrences.variable}</span>
        ) : (
          <>
            <Amount value={monthly} direction={recurrence.direction} />
            {annual !== null && showsAnnual(row) && (
              <span className="t-axis tnum">
                {tpl(t.recurrences.perYear, formatMoney(annual, currency, false))}
              </span>
            )}
          </>
        )}
      </span>
    </button>
  )
}
