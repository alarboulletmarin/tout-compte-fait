import { useNavigate } from 'react-router-dom'
import { MonthHeader } from '@/app/MonthHeader'
import { RECURRENCE_NEW_PATH } from '@/app/routes'
import { t } from '@/i18n/strings'
import { useMonthEntries, useMonthFlows } from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { EmptyState } from '@/ui/EmptyState'
import { Eyebrow } from '@/ui/Eyebrow'
import { PageTitle } from '@/ui/PageTitle'

/**
 * Le détail de ce qui rentre et de ce qui sort — l'écran au bout des deux
 * tuiles du mois.
 *
 * Les tuiles Revenus et Charges portaient chacune un total et ne menaient nulle
 * part : on lisait « 2 480,00 € » sans jamais pouvoir demander « de quoi ? ».
 * C'est ce que cet écran répond, et c'est pourquoi il vit sous l'en-tête de
 * mois comme elles — les deux chiffres qu'il détaille sont ceux du mois affiché
 * et du filtre en cours, pas ceux d'un foyer hors du temps.
 *
 * Son état vide renvoie à la récurrence et non à la dépense, pour la raison qui
 * vaut sur le mois et sur la revue : un détail vide n'est pas un détail qui
 * manque, c'est un mois que rien ne remplit encore.
 */
export function FlowsPage() {
  const navigate = useNavigate()
  const entries = useMonthEntries()
  const flows = useMonthFlows()

  return (
    <div className="flex flex-col gap-4">
      <PageTitle
        title={t.flows.title}
        onBack={() => {
          void navigate('/')
        }}
      />
      <MonthHeader prorataNote />

      {entries.length === 0 ? (
        <EmptyState
          message={t.flows.empty}
          actionLabel={t.recurrences.add}
          onAction={() => {
            void navigate(RECURRENCE_NEW_PATH)
          }}
        />
      ) : (
        /* Le total à droite de son titre, comme partout où une section en porte
           un : c'est la ligne qu'on lit en descendant, avant d'entrer dans le
           détail. */
        <div className="flex flex-col gap-3">
          {[
            { label: t.flows.in, value: flows.income.total, direction: 'in' as const },
            { label: t.flows.out, value: flows.spending.total, direction: 'out' as const },
          ].map((section) => (
            <div
              key={section.label}
              className="flex items-baseline justify-between gap-3 px-0.5"
            >
              <Eyebrow className="text-muted">{section.label}</Eyebrow>
              <Amount value={section.value} size="body" direction={section.direction} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
