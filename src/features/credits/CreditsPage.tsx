import { useNavigate } from 'react-router-dom'
import { CREDIT_NEW_PATH, creditEditPath } from '@/app/routes'
import { totalRemaining } from '@/domain/debt'
import type { DebtStatus } from '@/domain/debt'
import { t } from '@/i18n/strings'
import { formatDate, formatPercent, tpl } from '@/i18n/format'
import { useCategoryMap, useDebtStatuses } from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Button } from '@/ui/Button'
import { EmptyState } from '@/ui/EmptyState'
import { Eyebrow } from '@/ui/Eyebrow'
import { CreditsIcon, Plus } from '@/ui/Icons'
import { PageTitle } from '@/ui/PageTitle'
import { Ring } from '@/ui/Ring'
import { Tile } from '@/ui/Tile'

function plural(n: number): string {
  return n > 1 ? 's' : ''
}

/**
 * Une ligne par crédit : l'anneau signature porte la part remboursée, le
 * chiffre porte ce qui reste. C'est ce qui reste qui compte — le total versé
 * inclut les intérêts, et le confondre avec l'amortissement ferait croire un
 * prêt soldé bien avant qu'il ne le soit.
 *
 * La ligne n'est pas un bouton mais une tuile à lien (DS §6). Elle empile un
 * anneau, trois lectures et un séparateur : un `<button>` n'admet rien de tout
 * cela, et le nom unique qu'il portait — le libellé du crédit — effaçait à
 * l'oreille les quatre chiffres qui font l'intérêt de la ligne. Le lien couvre
 * toute la ligne pour autant, et le repère reste au coin : elle se touche donc
 * n'importe où, comme si elle était ce bouton.
 */
function DebtRow({ status }: { status: DebtStatus }) {
  const categories = useCategoryMap()
  const { debt, remaining, progress, monthsLeft, monthly, settled } = status
  const category = categories.get(debt.categoryId)

  return (
    <Tile
      label={debt.label}
      link={{ to: creditEditPath(debt.id), label: tpl(t.credits.open, debt.label) }}
      className="gap-3"
    >
      <div className="flex items-center gap-4">
        <Ring
          size={72}
          thickness={10}
          value={progress}
          label={tpl(t.credits.progress, formatPercent(progress))}
          color={category?.color ?? 'var(--cat-rest)'}
          className="shrink-0"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="t-body truncate font-medium">{debt.label}</span>
          <Amount value={remaining} size="tile" />
          <span className="t-axis">
            {settled
              ? t.credits.settled
              : tpl(t.credits.monthsLeft, monthsLeft, plural(monthsLeft), plural(monthsLeft))}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-border pt-3">
        <span className="t-label">{t.credits.monthly}</span>
        {monthly === null ? (
          <span className="t-label">{t.credits.linkedNone}</span>
        ) : (
          <Amount value={monthly} size="body" direction="out" />
        )}
        <span className="t-axis w-full">{formatDate(debt.endsOn)}</span>
      </div>
    </Tile>
  )
}

export function CreditsPage() {
  const statuses = useDebtStatuses()
  const navigate = useNavigate()

  const openCreate = (): void => {
    void navigate(CREDIT_NEW_PATH)
  }

  return (
    <>
      {/* L'état vide porte déjà le même bouton : le garder en titre l'afficherait
          deux fois dans le même écran. */}
      <PageTitle title={t.credits.title}>
        {statuses.length > 0 && (
          <Button onClick={openCreate}>
            <Plus size={18} />
            {t.common.add}
          </Button>
        )}
      </PageTitle>

      {statuses.length === 0 ? (
        <EmptyState message={t.credits.empty} actionLabel={t.credits.add} onAction={openCreate} />
      ) : (
        <div className="flex max-w-3xl flex-col gap-4">
          <Tile variant="accent">
            <Eyebrow icon={CreditsIcon}>{t.credits.total}</Eyebrow>
            <Amount value={totalRemaining(statuses)} size="tile" className="mt-3" />
          </Tile>

          <div className="flex flex-col gap-3">
            {statuses.map((status) => (
              <DebtRow key={status.debt.id} status={status} />
            ))}
          </div>
        </div>
      )}
    </>
  )
}
