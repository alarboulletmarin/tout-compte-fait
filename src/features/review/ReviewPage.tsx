import { useNavigate } from 'react-router-dom'
import { RECURRENCE_NEW_PATH } from '@/app/routes'
import { t } from '@/i18n/strings'
import { tpl } from '@/i18n/format'
import { useHasAnyData, useMonthPending } from '@/store/selectors'
import { Button } from '@/ui/Button'
import { EmptyState } from '@/ui/EmptyState'
import { PageTitle } from '@/ui/PageTitle'

/**
 * La revue du mois — la file des échéances qui attendent d'être confirmées.
 *
 * Elle n'a pas de porte permanente : on y arrive par la tuile du mois, qui
 * n'existe que lorsqu'il reste quelque chose à confirmer (`REVIEW_PATH`). C'est
 * ce qui donne son sens à sa sortie, qui est un retour au mois et non la
 * fermeture d'une surcouche.
 *
 * **Son état vide a deux causes, et elles n'appellent pas le même geste.** Un
 * mois dont tout est confirmé est un mois fini : il n'y a rien à faire, et le
 * dire est déjà la réponse. Un document qui n'a encore posé aucune règle, lui,
 * n'aura jamais rien à confirmer tant qu'on ne lui en donne pas une — ce n'est
 * pas une tâche finie, c'est une tâche qui n'a pas pu commencer, et l'envoyer
 * vers « ajoute une dépense » lui ferait recommencer tous les mois ce qu'une
 * récurrence écrit une fois. Les deux phrases sont celles de l'écran du mois,
 * au mot près : le même état ne se raconte pas de deux façons selon l'écran
 * d'où on le regarde.
 */
export function ReviewPage() {
  const navigate = useNavigate()
  const pending = useMonthPending()
  const hasData = useHasAnyData()
  const waiting = pending.fixed.length + pending.variable.length

  const toMonth = (): void => {
    void navigate('/')
  }

  if (waiting === 0) {
    return (
      <div className="flex flex-col gap-4">
        <PageTitle title={t.review.title} onBack={toMonth} />
        {hasData ? (
          <EmptyState message={t.month.done} actionLabel={t.review.back} onAction={toMonth} />
        ) : (
          <EmptyState
            message={t.month.emptyStart}
            actionLabel={t.recurrences.add}
            onAction={() => {
              void navigate(RECURRENCE_NEW_PATH)
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <PageTitle title={t.review.title} onBack={toMonth} />
      <p className="t-label">
        {tpl(waiting === 1 ? t.review.waitingOne : t.review.waiting, waiting)}
      </p>
      <Button variant="ghost" size="sm" className="self-start" onClick={toMonth}>
        {t.review.quit}
      </Button>
    </div>
  )
}
