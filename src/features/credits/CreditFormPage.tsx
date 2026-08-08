import { useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { CREDITS_PATH } from '@/app/routes'
import { type ISODate, today } from '@/domain/date'
import { parseAmount, toAmountInput } from '@/domain/money'
import { parseRateBp, toRateInput } from '@/domain/rate'
import type { Debt } from '@/domain/types'
import { fr } from '@/i18n/fr'
import { formatMoney, formatPercent, tpl } from '@/i18n/format'
import { addDebt, removeDebt, replaceDebt, undoable } from '@/store/actions'
import { useDebtStatus, useRecurrenceRows } from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Button } from '@/ui/Button'
import { CategorySelect } from '@/ui/CategorySelect'
import { ConfirmDialog } from '@/ui/ConfirmDialog'
import { AmountInput, DateInput, Field, Select, TextInput } from '@/ui/Field'
import { PageTitle } from '@/ui/PageTitle'
import { Tile } from '@/ui/Tile'
import { useLeaveGuard } from '@/ui/useLeaveGuard'
import { useCurrency } from '@/ui/currency'
import { toast } from '@/ui/toast'

type Draft = {
  label: string
  categoryId: string
  recurrenceId: string
  principalText: string
  rateText: string
  startedOn: ISODate
  endsOn: ISODate
  note: string
}

function initial(debt: Debt | null): Draft {
  return {
    label: debt?.label ?? '',
    categoryId: debt?.categoryId ?? '',
    recurrenceId: debt?.recurrenceId ?? '',
    principalText: debt ? toAmountInput(debt.principal) : '',
    rateText: toRateInput(debt?.rateBp),
    startedOn: debt?.startedOn ?? today(),
    endsOn: debt?.endsOn ?? today(),
    note: debt?.note ?? '',
  }
}

function Form({ debt, onDone }: { debt: Debt | null; onDone: () => void }) {
  const rows = useRecurrenceRows()
  const status = useDebtStatus(debt?.id)
  const currency = useCurrency()
  const [draft, setDraft] = useState<Draft>(() => initial(debt))
  const [showErrors, setShowErrors] = useState(false)
  const guard = useLeaveGuard(draft, onDone)

  const principal = parseAmount(draft.principalText)
  const rateBp = parseRateBp(draft.rateText)
  const errors = {
    label: draft.label.trim() === '' ? fr.credits.labelRequired : undefined,
    principal: principal === null || principal <= 0 ? fr.credits.principalRequired : undefined,
    category: draft.categoryId === '' ? fr.credits.categoryRequired : undefined,
  }
  const shown = showErrors
    ? errors
    : { label: undefined, principal: undefined, category: undefined }

  const patch = (next: Partial<Draft>): void => {
    setDraft((current) => ({ ...current, ...next }))
  }

  const submit = (): void => {
    setShowErrors(true)
    if (principal === null || principal <= 0) return
    if (draft.label.trim() === '' || draft.categoryId === '' || rateBp === null) return

    const payload = {
      label: draft.label.trim(),
      categoryId: draft.categoryId,
      ...(draft.recurrenceId === '' ? {} : { recurrenceId: draft.recurrenceId }),
      principal,
      startedOn: draft.startedOn,
      endsOn: draft.endsOn,
      ...(rateBp > 0 ? { rateBp } : {}),
      ...(draft.note.trim() === '' ? {} : { note: draft.note.trim() }),
    }
    if (debt === null) {
      addDebt(payload)
      toast(fr.credits.added)
    } else {
      replaceDebt(debt.id, payload)
      toast(fr.credits.updated)
    }
    onDone()
  }

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <PageTitle title={debt === null ? fr.credits.add : fr.credits.edit} onBack={guard.request} />

      {/* Sur un crédit existant, le calcul est montré avant le formulaire :
          c'est la réponse qu'on vient chercher, pas les champs qui l'ont
          produite. */}
      {status !== null && (
        <Tile className="gap-1">
          <span className="t-label">{fr.credits.remaining}</span>
          <Amount value={status.remaining} size="tile" />
          <span className="t-axis">
            {tpl(fr.credits.progress, formatPercent(status.progress))} ·{' '}
            {fr.credits.paid} {formatMoney(status.paid, currency)}
          </span>
        </Tile>
      )}

      <form
        id="credit-form"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <Tile className="gap-4">
          <Field label={fr.entry.label} required {...(shown.label ? { error: shown.label } : {})}>
            {(id, describedBy) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                value={draft.label}
                invalid={Boolean(shown.label)}
                placeholder={fr.credits.labelPlaceholder}
                maxLength={60}
                autoFocus
                onChange={(e) => {
                  patch({ label: e.target.value })
                }}
              />
            )}
          </Field>

          <Field
            label={fr.entry.category}
            required
            {...(shown.category ? { error: shown.category } : {})}
          >
            {(id, describedBy) => (
              <CategorySelect
                id={id}
                aria-describedby={describedBy}
                direction="out"
                value={draft.categoryId}
                onChange={(e) => {
                  patch({ categoryId: e.target.value })
                }}
              />
            )}
          </Field>

          <Field
            label={fr.credits.principal}
            required
            {...(shown.principal ? { error: shown.principal } : {})}
          >
            {(id, describedBy) => (
              <AmountInput
                id={id}
                aria-describedby={describedBy}
                value={draft.principalText}
                invalid={Boolean(shown.principal)}
                placeholder="0,00"
                onChange={(e) => {
                  patch({ principalText: e.target.value })
                }}
              />
            )}
          </Field>

          {/* Un taux annuel s'écrit « 1,89 » : quatre caractères, bornés à cent
              par `parseRateBp`. Il porte donc le plafond des champs bornés, sans
              être un montant — il n'a ni symbole ni centimes. */}
          <Field label={fr.credits.rate} optional hint={fr.credits.rateHint}>
            {(id, describedBy) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                className="max-w-48"
                value={draft.rateText}
                invalid={rateBp === null}
                inputMode="decimal"
                placeholder={fr.credits.ratePlaceholder}
                onChange={(e) => {
                  patch({ rateText: e.target.value })
                }}
              />
            )}
          </Field>

          {/* Sans mensualité, le capital ne peut pas décroître. Le dire dans
              l'option elle-même vaut mieux qu'un crédit figé sans explication. */}
          <Field label={fr.credits.linked} optional hint={fr.credits.linkedHint}>
            {(id, describedBy) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                value={draft.recurrenceId}
                onChange={(e) => {
                  patch({ recurrenceId: e.target.value })
                }}
              >
                <option value="">{fr.credits.linkedNone}</option>
                {rows.map((row) => (
                  <option key={row.recurrence.id} value={row.recurrence.id}>
                    {row.recurrence.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label={fr.credits.startedOn} required>
            {(id) => (
              <DateInput
                id={id}
                value={draft.startedOn}
                onChange={(e) => {
                  if (e.target.value !== '') patch({ startedOn: e.target.value })
                }}
              />
            )}
          </Field>

          <Field label={fr.credits.endsOn} required>
            {(id) => (
              <DateInput
                id={id}
                value={draft.endsOn}
                onChange={(e) => {
                  if (e.target.value !== '') patch({ endsOn: e.target.value })
                }}
              />
            )}
          </Field>

          <Field label={fr.entry.note} optional>
            {(id) => (
              <TextInput
                id={id}
                value={draft.note}
                maxLength={140}
                onChange={(e) => {
                  patch({ note: e.target.value })
                }}
              />
            )}
          </Field>
        </Tile>
      </form>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" form="credit-form">
          {fr.common.save}
        </Button>
        <Button variant="secondary" onClick={guard.request}>
          {fr.common.cancel}
        </Button>
      </div>

      {debt !== null && <RemoveDebt debt={debt} onDone={onDone} />}

      <ConfirmDialog {...guard.dialog} />
    </div>
  )
}

function RemoveDebt({ debt, onDone }: { debt: Debt; onDone: () => void }) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="border-t border-border pt-4">
      <Button
        variant="ghost"
        onClick={() => {
          setConfirming(true)
        }}
      >
        {fr.credits.remove}
      </Button>
      <ConfirmDialog
        open={confirming}
        title={fr.credits.remove}
        steps={[{ question: fr.credits.removeConfirm, action: fr.common.delete }]}
        onCancel={() => {
          setConfirming(false)
        }}
        onConfirm={() => {
          setConfirming(false)
          undoable(fr.credits.removed, () => {
            removeDebt(debt.id)
          })
          onDone()
        }}
      />
    </div>
  )
}

/** `/credits/nouveau` pour un crédit neuf, `/credits/:id` pour en reprendre un. */
export function CreditFormPage() {
  const { id } = useParams()
  const status = useDebtStatus(id)
  const navigate = useNavigate()
  const location = useLocation()

  const goBack = (): void => {
    if (location.key === 'default') void navigate(CREDITS_PATH)
    else void navigate(-1)
  }

  if (id !== undefined && status === null) return <Navigate to={CREDITS_PATH} replace />

  return <Form key={id ?? 'new'} debt={status?.debt ?? null} onDone={goBack} />
}
