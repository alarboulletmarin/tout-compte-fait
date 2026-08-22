import { useNavigate } from 'react-router-dom'
import { CREDIT_NEW_PATH, creditEditPath } from '@/app/routes'
import { totalRemaining } from '@/domain/debt'
import type { DebtStatus } from '@/domain/debt'
import { sum } from '@/domain/money'
import { t } from '@/i18n/strings'
import { formatDate, formatPercent, tpl } from '@/i18n/format'
import { useCategoryMap, useDebtStatuses } from '@/store/selectors'
import { AdvancesRow } from '@/features/advances/AdvancesRow'
import { Amount } from '@/ui/Amount'
import { Button } from '@/ui/Button'
import { EmptyState } from '@/ui/EmptyState'
import { Eyebrow } from '@/ui/Eyebrow'
import { CreditsIcon, Plus } from '@/ui/Icons'
import { PageTitle } from '@/ui/PageTitle'
import { Ring } from '@/ui/Ring'
import { RowGroup } from '@/ui/RowGroup'
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
        {/* `fit-box` : le montant se dimensionne sur **cette colonne**, et non
            sur la tuile — l'anneau lui prend 88px, et sans ce second conteneur
            un capital à six chiffres débordait par la droite, symbole coupé. */}
        <div className="fit-box flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="t-body truncate font-medium">{debt.label}</span>
          <Amount value={remaining} size="tile-fit" />
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

/**
 * Les avances, en section à part sous les crédits.
 *
 * Elles y sont parce que c'est de l'argent qu'on doit encore, comme un crédit —
 * et **pas** parce que c'en serait une charge : c'est la seule chose que la
 * phrase du dessous existe pour dire. Une avance sort de l'épargne et y
 * retourne ; elle ne pèse sur aucun mois, et aucun total de cet écran ne la
 * compte.
 *
 * Une rangée, et non la liste que le design dessine : `/avances` reste l'écran
 * des avances — il porte leur création, leur suppression et ses cinq lectures
 * par fiche —, et il est aussi la destination de la liste des récurrences. Le
 * doubler ici ferait deux endroits où l'on croirait agir, et retirerait une
 * destination de la navigation sans que personne l'ait décidé.
 */
function AdvancesSection() {
  return (
    <section className="flex flex-col gap-2">
      <Eyebrow className="text-muted">{t.advances.section}</Eyebrow>
      <RowGroup>
        <AdvancesRow />
      </RowGroup>
      <p className="t-label">{t.advances.notACharge}</p>
    </section>
  )
}

export function CreditsPage() {
  const statuses = useDebtStatuses()
  const navigate = useNavigate()

  /* La part remboursée de l'ensemble : un moins ce qui reste sur ce qui a été
     emprunté. Elle se prend sur les capitaux et non sur la moyenne des parts —
     un prêt de 2 000 € remboursé à 90 % ne rattrape pas un prêt de 200 000 € à
     10 %, et une moyenne le laisserait croire. `Ring` borne lui-même entre 0
     et 1 ; un capital total nul rendrait un anneau plein, ce qui est juste :
     il n'y a plus rien à devoir. */
  const borrowed = sum(statuses.map((status) => status.debt.principal))
  const repaid = borrowed <= 0 ? 1 : 1 - totalRemaining(statuses) / borrowed

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
        <div className="flex flex-col gap-4">
          {/* Le chiffre et son anneau, comme sur chaque crédit en dessous. La
              tuile portait le capital restant seul, dans un format à deux
              rangées où il tenait sur une : le DS §5 refuse la tuile qui laisse
              un vide de quarante pixels sous son chiffre pendant que ses
              voisines portent un anneau, et c'est exactement ce qu'elle
              faisait.

              La part est celle de l'ensemble — un moins ce qui reste sur ce qui
              a été emprunté —, calculée sur les mêmes deux nombres que la part
              d'un crédit isolé (`debtStatus`). Aucun prêt n'y pèse plus que son
              capital, ce qu'une moyenne des pourcentages aurait fait. */}
          <Tile variant="accent">
            <Eyebrow icon={CreditsIcon}>{t.credits.total}</Eyebrow>
            <div className="mt-3 flex items-center gap-4">
              <Ring
                size={72}
                thickness={10}
                value={repaid}
                label={tpl(t.credits.progress, formatPercent(repaid))}
                color="var(--accent-fg)"
                trackColor="var(--track-on-accent)"
                className="shrink-0"
              />
              <span className="fit-box min-w-0 flex-1">
                <Amount value={totalRemaining(statuses)} size="hero-fit" />
              </span>
            </div>
          </Tile>

          {/* Chaque crédit est une carte entière — sa jauge, son capital, son
              échéance —, et deux cartes se comparent bien mieux côte à côte que
              l'une sous l'autre : c'est la même question posée à chacune, « où
              en est celui-là ». Deux colonnes au-delà de 768px, donc.

              Sauf s'il n'y en a qu'un : une carte seule sur une demi-largeur ne
              se compare à rien, elle se lit juste comme une mise en page
              inachevée. La grille n'arrive qu'avec le second crédit, c'est-à-dire
              au moment exact où elle sert. */}
          <div className={statuses.length > 1 ? 'cols' : 'flex flex-col gap-3'}>
            {statuses.map((status) => (
              <DebtRow key={status.debt.id} status={status} />
            ))}
          </div>

          <AdvancesSection />
        </div>
      )}
    </>
  )
}
