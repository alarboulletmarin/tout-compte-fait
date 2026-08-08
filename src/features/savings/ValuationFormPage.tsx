import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { SAVINGS_PATH, supportPath } from '@/app/routes'
import { parseAmount } from '@/domain/money'
import type { SavingValuation } from '@/domain/types'
import { fr } from '@/i18n/fr'
import { formatDate } from '@/i18n/format'
import {
  addSavingValuation,
  removeSavingValuation,
  replaceSavingValuation,
  undoable,
} from '@/store/actions'
import { useSavingSupport, useSupportValuations } from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Button } from '@/ui/Button'
import { ConfirmDialog } from '@/ui/ConfirmDialog'
import { AmountInput, Field, TextInput } from '@/ui/Field'
import { PageTitle } from '@/ui/PageTitle'
import { Tile } from '@/ui/Tile'
import { toast } from '@/ui/toast'
import { useLeaveGuard } from '@/ui/useLeaveGuard'
import { type ValuationDraft, valuationDraftFrom, valuationError } from './supportDraft'

/**
 * Relever la valeur d'un support — ou corriger un relevé.
 *
 * Ajouter **empile**, ça n'écrase rien : c'est toute la différence avec un
 * capital stocké sur le support. Le relevé du mois dernier reste lisible, la
 * courbe existe, et la future comparaison d'une projection au réel aura de quoi
 * se faire.
 *
 * Corriger, en revanche, réécrit **une** ligne et une seule : un chiffre mal
 * tapé se rattrape, sinon il reste faux pour toujours dans l'historique. Aucune
 * `Entry` ne bouge dans un cas comme dans l'autre — un relevé n'est pas un
 * mouvement d'argent.
 */
export function ValuationFormPage() {
  const { id, valuationId } = useParams()
  const support = useSavingSupport(id)
  const valuations = useSupportValuations(id)
  const valuation = valuations.find((one) => one.id === valuationId) ?? null

  if (support === null) return <Navigate to={SAVINGS_PATH} replace />
  // Corrigé ou supprimé depuis un autre onglet : la fiche reste la bonne cible.
  if (valuationId !== undefined && valuation === null) {
    return <Navigate to={supportPath(support.id)} replace />
  }

  return (
    <ValuationForm
      key={valuation?.id ?? 'nouvelle'}
      supportId={support.id}
      supportLabel={support.label}
      {...(valuation === null ? {} : { valuationId: valuation.id })}
      initial={valuationDraftFrom(valuation)}
      previous={valuations.find((one) => one.id !== valuation?.id) ?? null}
    />
  )
}

function ValuationForm({
  supportId,
  supportLabel,
  valuationId,
  initial,
  previous,
}: {
  supportId: string
  supportLabel: string
  valuationId?: string
  initial: ValuationDraft
  previous: SavingValuation | null
}) {
  const navigate = useNavigate()
  const [draft, setDraft] = useState<ValuationDraft>(initial)
  const [showError, setShowError] = useState(false)
  const [removing, setRemoving] = useState(false)

  const back = (): void => {
    void navigate(supportPath(supportId))
  }
  const guard = useLeaveGuard(draft, back)
  const error = valuationError(draft)

  const submit = (): void => {
    const amount = parseAmount(draft.amountText)
    if (error !== undefined || amount === null) {
      setShowError(true)
      return
    }
    if (valuationId === undefined) {
      addSavingValuation({ supportId, amount, date: draft.date })
      toast(fr.savings.valueAdded)
    } else {
      replaceSavingValuation(valuationId, { supportId, amount, date: draft.date })
      toast(fr.savings.valueUpdated)
    }
    back()
  }

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <PageTitle
        title={valuationId === undefined ? fr.savings.valueUpdate : fr.savings.valueEdit}
        onBack={guard.request}
      />
      <p className="t-label">{supportLabel}</p>

      <form
        id="valuation-form"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <Tile className="gap-4">
          <Field
            label={fr.savings.value}
            required
            {...(showError && error !== undefined ? { error } : {})}
          >
            {/* « Nouvelle valeur » et non « 0,00 » : posé au-dessus du relevé
                précédent, un placeholder chiffré se lit comme une valeur déjà
                saisie — et laisser le champ tel quel enregistrerait alors non
                pas « rien » mais « ce compte est vide ». */}
            {(fieldId, describedBy) => (
              <AmountInput
                id={fieldId}
                aria-describedby={describedBy}
                value={draft.amountText}
                invalid={showError && error !== undefined}
                placeholder={fr.savings.valueNew}
                autoFocus
                onChange={(event) => {
                  setDraft((current) => ({ ...current, amountText: event.target.value }))
                }}
              />
            )}
          </Field>

          <Field label={fr.savings.valueDate} required>
            {(fieldId) => (
              <TextInput
                id={fieldId}
                type="date"
                value={draft.date}
                onChange={(event) => {
                  if (event.target.value !== '') {
                    setDraft((current) => ({ ...current, date: event.target.value }))
                  }
                }}
              />
            )}
          </Field>

          {/* Le relevé d'avant, pour comparer sans quitter l'écran : c'est la
              seule chose qui permette de repérer un chiffre tapé de travers.
              Sous le champ et non dedans : c'est une référence, pas une valeur
              par défaut. */}
          {previous !== null && (
            <div className="flex items-baseline justify-between gap-3 border-t border-border pt-4">
              <span className="t-label min-w-0 flex-1 truncate">
                {`${fr.savings.valueKnown} · ${formatDate(previous.date)}`}
              </span>
              <Amount value={previous.amount} size="body" className="shrink-0" />
            </div>
          )}
        </Tile>
      </form>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" form="valuation-form">
          {fr.common.save}
        </Button>
        <Button variant="secondary" onClick={guard.request}>
          {fr.common.cancel}
        </Button>
      </div>

      {/* À distance des boutons qui closent la saisie, comme partout : ce n'est
          pas une façon de sortir de l'écran, c'est une suppression. */}
      {valuationId !== undefined && (
        <Tile className="gap-3">
          <p className="t-label">{fr.savings.valueMethod}</p>
          <Button
            variant="ghost"
            className="w-fit"
            onClick={() => {
              setRemoving(true)
            }}
          >
            {fr.savings.valueRemove}
          </Button>
        </Tile>
      )}

      <ConfirmDialog
        open={removing}
        title={fr.savings.valueRemove}
        steps={[{ question: fr.savings.valueRemoveConfirm, action: fr.common.delete }]}
        onCancel={() => {
          setRemoving(false)
        }}
        onConfirm={() => {
          setRemoving(false)
          if (valuationId === undefined) return
          undoable(fr.savings.valueRemoved, () => {
            removeSavingValuation(valuationId)
          })
          back()
        }}
      />

      <ConfirmDialog {...guard.dialog} />
    </div>
  )
}
