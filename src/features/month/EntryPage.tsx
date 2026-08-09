import { useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { isValidISO } from '@/domain/date'
import type { Entry } from '@/domain/types'
import { DIRECTION_PARAM, NATURE_PARAM, directionFromParam, natureFromParam } from '@/app/routes'
import { t } from '@/i18n/strings'
import { removeEntry, unconfirmEntry, undoable } from '@/store/actions'
import { useCurrentYm, useEntry, useKindOf } from '@/store/selectors'
import { Button } from '@/ui/Button'
import { ConfirmDialog } from '@/ui/ConfirmDialog'
import { toast } from '@/ui/toast'
import { OperationForm } from '@/features/operations/OperationForm'
import { defaultDateFor } from './defaultDate'

/**
 * Les gestes qui n'existent que sur une ligne déjà écrite.
 *
 * Ils vivent ici et non dans le formulaire : celui-ci décrit une opération, il
 * n'a pas à savoir qu'une échéance peut faire demi-tour. Ce sont d'ailleurs les
 * seuls écarts entre les deux portes qui subsistent, et ils ne tiennent pas à
 * la porte mais à ce qu'on a sous les yeux — une entrée existante.
 */
function EntryActions({ entry, onDone }: { entry: Entry; onDone: () => void }) {
  /* Ce qui peut redevenir « prévu » : une échéance de récurrence déjà
     confirmée, et rien d'autre. Confirmer n'est pas un aller simple, mais une
     saisie ponctuelle est un fait, jamais une prévision en attente — elle se
     corrige ou se supprime. Pas de confirmation, le geste se refait d'un clic. */
  if (entry.status !== 'confirmed' || entry.recurrenceId === undefined) return null

  return (
    <Button
      variant="secondary"
      onClick={() => {
        unconfirmEntry(entry.id)
        toast(t.month.unconfirmed)
        onDone()
      }}
    >
      {t.month.unconfirm}
    </Button>
  )
}

function RemoveEntry({ entry, onDone }: { entry: Entry; onDone: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const kindOf = useKindOf()
  const saving = kindOf(entry.categoryId) === 'saving'
  const removed = saving
    ? t.entry.removedSaving
    : entry.direction === 'in'
      ? t.entry.removedIn
      : t.entry.removedOut

  return (
    <div className="border-t border-border pt-4">
      <Button
        variant="ghost"
        onClick={() => {
          setConfirming(true)
        }}
      >
        {t.entry.remove}
      </Button>
      <ConfirmDialog
        open={confirming}
        title={t.entry.remove}
        steps={[{ question: t.entry.removeConfirm, action: t.common.delete }]}
        onCancel={() => {
          setConfirming(false)
        }}
        onConfirm={() => {
          setConfirming(false)
          undoable(removed, () => {
            removeEntry(entry.id)
          })
          onDone()
        }}
      />
    </div>
  )
}

/**
 * `/depense` pour une saisie neuve, `/depense/:id` pour en reprendre une.
 *
 * La page ne fait plus que trois choses : retrouver ce qu'on reprend, poser les
 * valeurs initiales du formulaire — nature présélectionnée, rythme ponctuel —
 * et savoir où revenir. Le formulaire, lui, est celui de l'écran des
 * récurrences, au champ près : c'est le même geste.
 *
 * Le paramètre `date` permet au calendrier d'ouvrir la saisie sur le jour
 * sélectionné plutôt que sur le premier du mois.
 */
export function EntryPage() {
  const { id } = useParams()
  const entry = useEntry(id)
  const ym = useCurrentYm()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()

  const goBack = (): void => {
    // Arrivé ici par un lien direct ou un rechargement, il n'y a pas d'écran
    // précédent dans l'app : revenir en arrière sortirait du site.
    if (location.key === 'default') void navigate('/')
    else void navigate(-1)
  }

  // L'entrée a pu être supprimée depuis un autre onglet, ou l'URL être fausse.
  if (id !== undefined && entry === null) return <Navigate to="/" replace />

  const asked = params.get('date')
  const defaultDate = asked !== null && isValidISO(asked) ? asked : defaultDateFor(ym)

  return (
    <OperationForm
      key={entry?.id ?? 'new'}
      operation={entry === null ? null : { kind: 'entry', entry }}
      defaults={{
        nature: natureFromParam(params.get(NATURE_PARAM), params.get(DIRECTION_PARAM)),
        direction: directionFromParam(params.get(DIRECTION_PARAM)),
        date: defaultDate,
        recurring: false,
      }}
      onDone={goBack}
      {...(entry === null
        ? {}
        : {
            actions: <EntryActions entry={entry} onDone={goBack} />,
            footer: <RemoveEntry entry={entry} onDone={goBack} />,
          })}
    />
  )
}
