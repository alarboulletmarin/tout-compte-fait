import { Navigate, useParams } from 'react-router-dom'
import { useBackTo } from '@/ui/useBackTo'
import { RECURRENCES_PATH } from '@/app/routes'
import { useCurrentYm, useRecurrenceRow } from '@/store/selectors'
import { OperationForm } from '@/features/operations/OperationForm'
import { defaultDateFor } from '@/features/month/defaultDate'

/**
 * `/recurrences/nouveau`, et `/recurrences/:id/modifier` pour en reprendre une.
 *
 * Le formulaire est celui de la saisie d'une dépense, sans une différence :
 * c'est le même geste — décrire une opération —, et la seule chose que cette
 * porte-ci transmet est un rythme déjà réglé sur « Récurrence ». À la création,
 * la bascule reste offerte : arrivé ici pour poser un abonnement puis constatant
 * qu'il s'agit d'un achat unique, on n'a pas à ressortir pour changer de porte.
 *
 * La catégorie ne se pré-remplit pas : avec une quarantaine de choix rangés sous
 * onze familles, en imposer une au hasard ferait saisir des dépenses sous la
 * première venue.
 */
export function RecurrenceFormPage() {
  const { id } = useParams()
  const row = useRecurrenceRow(id)
  const ym = useCurrentYm()

  const goBack = useBackTo(RECURRENCES_PATH)

  if (id !== undefined && row === null) return <Navigate to={RECURRENCES_PATH} replace />

  const recurrence = row?.recurrence ?? null

  return (
    <OperationForm
      key={id ?? 'new'}
      operation={recurrence === null ? null : { kind: 'recurrence', recurrence }}
      /* Dépense par défaut : c'est le cas courant d'une récurrence, et un
         formulaire qui s'ouvrirait chaque fois sur autre chose selon ce qu'on a
         saisi la veille ne s'ouvrirait jamais deux fois pareil. */
      defaults={{ nature: 'expense', direction: 'out', date: defaultDateFor(ym), recurring: true }}
      onDone={goBack}
    />
  )
}
