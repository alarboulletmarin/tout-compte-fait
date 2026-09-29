import { useId, useRef, useState, type FormEvent } from 'react'
import { Redirect, useLocation, useSearch } from 'wouter'
import { findCategoryByName } from '../domain/data'
import { computeSplit, MONTHS } from '../domain/split'
import type { AccountRef, Charge, Frequency } from '../domain/types'
import { Amount } from '../ui/Amount'
import { useI18n } from '../i18n/i18n'
import { useStore } from '../storage/store'
import { tap } from '../ui/haptics'
import { TrashIcon } from '../ui/icons'
import { Impact } from '../ui/Impact'
import { FieldError } from '../ui/Notes'
import { FormHeader } from '../ui/Screens'
import { Shape } from '../ui/Shape'
import { Sheet } from '../ui/Sheet'
import { useToast } from '../ui/Toast'
import { insertAt, useAccounts, useNames } from './common'
import { at } from '../domain/at'

// Valeur de l'option qui ouvre la saisie d'une nouvelle catégorie
const NEW_CATEGORY = '__new'

// Au-delà, le compte payeur se choisit dans une liste plutôt qu'avec des boutons
const MAX_SEGMENTS = 4

const FREQUENCIES: Frequency[] = ['monthly', 'quarterly', 'yearly']

export function ChargeForm({ id }: { id?: string }) {
  const existing = useStore().data.charges.find((c) => c.id === id)
  if (id && !existing) return <Redirect to="/charges" replace />
  return <Form existing={existing} />
}

function Form({ existing }: { existing?: Charge }) {
  const { t, euros, parse } = useI18n()
  const { data, update } = useStore()
  // Exemple choisi dans la liste vide : libellé et catégorie pré-remplis
  const example = t.examples[Number(new URLSearchParams(useSearch()).get('example') ?? -1)]
  const exampleCategory = data.categories.some((c) => c.id === example?.categoryId)
    ? (example?.categoryId ?? null)
    : null
  const accounts = useAccounts()
  const [, navigate] = useLocation()
  const ids = useId()
  const amountRef = useRef<HTMLInputElement>(null)
  const labelRef = useRef<HTMLInputElement>(null)

  const [amountText, setAmountText] = useState(existing ? euros(existing.amount) : '')
  const [label, setLabel] = useState(existing?.label ?? example?.label ?? '')
  const [frequency, setFrequency] = useState<Frequency>(existing?.frequency ?? 'monthly')
  const [paidFrom, setPaidFrom] = useState<AccountRef>(existing?.paidFrom ?? 'joint')
  const [categoryId, setCategoryId] = useState(existing ? existing.categoryId : exampleCategory)
  const [deleting, setDeleting] = useState(false)
  // Les erreurs n'apparaissent qu'après une première tentative, puis suivent la saisie
  const [submitted, setSubmitted] = useState(false)

  const amount = parse(amountText)
  const valid = amount !== null && amount > 0
  const amountError = submitted && !valid
  const labelError = submitted && !label.trim()

  function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (!valid) return amountRef.current?.focus()
    if (!label.trim()) return labelRef.current?.focus()
    const charge: Charge = {
      id: existing?.id ?? crypto.randomUUID(),
      label: label.trim(),
      amount,
      frequency,
      paidFrom,
      categoryId,
    }
    update((d) => ({
      ...d,
      charges: existing
        ? d.charges.map((c) => (c.id === charge.id ? charge : c))
        : [...d.charges, charge],
    }))
    tap()
    navigate('/charges', { replace: true })
  }

  return (
    <form className="screen charge-form" onSubmit={submit} noValidate>
      <FormHeader title={existing ? t.form.editTitle : t.form.newTitle} close="/charges" />

      <main className="charge-form__body">
        <div className={`charge-form__fields${submitted ? ' charge-form__fields--checked' : ''}`}>
          <div className="field">
            <label htmlFor={`${ids}-amount`} className="field__label">
              {t.form.amount}
            </label>
            <input
              id={`${ids}-amount`}
              ref={amountRef}
              className="num input-amount"
              inputMode="decimal"
              enterKeyHint="next"
              autoComplete="off"
              placeholder={t.form.amountPlaceholder}
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              onBlur={() => amount !== null && setAmountText(euros(amount))}
              aria-invalid={amountError}
              aria-describedby={amountError ? `${ids}-amount-error` : undefined}
            />
            {amountError && <FieldError id={`${ids}-amount-error`}>{t.errors.amount}</FieldError>}
          </div>

          <div className="field">
            <label htmlFor={`${ids}-label`} className="field__label">
              {t.form.label}
            </label>
            <input
              id={`${ids}-label`}
              ref={labelRef}
              className="input"
              autoComplete="off"
              autoCapitalize="sentences"
              enterKeyHint="done"
              placeholder={t.form.labelPlaceholder}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              aria-invalid={labelError}
              aria-describedby={labelError ? `${ids}-label-error` : undefined}
            />
            {labelError && <FieldError id={`${ids}-label-error`}>{t.errors.label}</FieldError>}
          </div>

          <fieldset className="fieldset">
            <legend className="field__label legend">{t.form.frequency}</legend>
            <div className="segmented">
              {FREQUENCIES.map((f) => (
                <button
                  key={f}
                  type="button"
                  className="segment"
                  aria-pressed={frequency === f}
                  onClick={() => setFrequency(f)}
                >
                  {t.form.frequencies[f]}
                </button>
              ))}
            </div>
          </fieldset>

          {accounts.length > MAX_SEGMENTS ? (
            // Trop de comptes pour des boutons : liste native
            <div className="field">
              <label htmlFor={`${ids}-paid`} className="field__label">
                {t.form.paidFrom}
              </label>
              <select
                id={`${ids}-paid`}
                className="input select"
                value={paidFrom}
                onChange={(e) => setPaidFrom(e.target.value as AccountRef)}
              >
                {accounts.map((a) => (
                  <option key={a.ref} value={a.ref}>
                    {a.who === 'joint' ? t.form.joint : a.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <fieldset className="fieldset">
              <legend className="field__label legend">{t.form.paidFrom}</legend>
              <div className={`segmented${accounts.length > 3 ? ' segmented--wrap' : ''}`}>
                {accounts.map((a) => (
                  <button
                    key={a.ref}
                    type="button"
                    className="segment"
                    aria-pressed={paidFrom === a.ref}
                    onClick={() => setPaidFrom(a.ref)}
                  >
                    <Shape of={a.who} />
                    {a.who === 'joint' ? t.form.joint : a.name}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <div className="field">
            <label htmlFor={`${ids}-category`} className="field__label">
              {t.form.category}
            </label>
            <CategoryField id={`${ids}-category`} value={categoryId} onChange={setCategoryId} />
          </div>
        </div>

        <div className={`charge-form__foot${existing ? ' charge-form__foot--edit' : ''}`}>
          <div className="between caption-13">
            <span>{t.form.monthlyEquivalent}</span>
            {valid ? (
              <Amount cents={Math.round(amount / MONTHS[frequency])} />
            ) : (
              <span className="num">–</span>
            )}
          </div>
          <button type="submit" className="button button--primary">
            {existing ? t.form.save : t.form.add}
          </button>
          {existing && (
            <button
              type="button"
              className="button-link button-link--danger"
              onClick={() => setDeleting(true)}
            >
              <TrashIcon />
              {t.form.delete}
            </button>
          )}
        </div>
      </main>

      {existing && (
        <DeleteSheet charge={existing} open={deleting} onClose={() => setDeleting(false)} />
      )}
    </form>
  )
}

function CategoryField(props: {
  id: string
  value: string | null
  onChange: (id: string | null) => void
}) {
  const { t } = useI18n()
  const { data, update } = useStore()
  const [draft, setDraft] = useState<string | null>(null)

  function create() {
    const name = draft?.trim()
    setDraft(null)
    if (!name) return
    // Un nom déjà pris sélectionne la catégorie existante au lieu d'en créer une seconde
    const same = findCategoryByName(data.categories, name)
    if (same) return props.onChange(same.id)
    const id = crypto.randomUUID()
    update((d) => ({ ...d, categories: [...d.categories, { id, name }] }))
    props.onChange(id)
  }

  return (
    <>
      {/* Liste native : roue sur iOS, feuille sur Android, menu sur ordinateur */}
      <select
        id={props.id}
        className="input select"
        value={props.value ?? ''}
        onChange={(e) => {
          if (e.target.value === NEW_CATEGORY) return setDraft('')
          setDraft(null)
          props.onChange(e.target.value || null)
        }}
      >
        <option value="">{t.charges.noCategory}</option>
        {data.categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
        <option value={NEW_CATEGORY}>{t.form.newCategory}</option>
      </select>
      {draft !== null && (
        <input
          className="input"
          aria-label={t.form.newCategoryName}
          placeholder={t.form.newCategoryName}
          autoComplete="off"
          autoCapitalize="sentences"
          enterKeyHint="done"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={create}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              create()
            }
            if (e.key === 'Escape') setDraft(null)
          }}
        />
      )}
    </>
  )
}

function DeleteSheet(props: { charge: Charge; open: boolean; onClose: () => void }) {
  const { t, euros } = useI18n()
  const { data, split, update } = useStore()
  const names = useNames()
  const [, navigate] = useLocation()
  const toast = useToast()
  const { charge } = props

  const remaining = data.charges.filter((c) => c.id !== charge.id)
  const after = computeSplit(data.household, remaining)
  const payer = useAccounts().find((a) => a.ref === charge.paidFrom)
  const account =
    payer?.who === 'joint' ? t.deletion.jointAccount : t.deletion.memberAccount(payer?.name ?? '')

  function confirm() {
    const index = data.charges.findIndex((c) => c.id === charge.id)
    update((d) => ({ ...d, charges: d.charges.filter((c) => c.id !== charge.id) }))
    tap()
    navigate('/charges', { replace: true })
    toast({
      message: t.charges.deleted(charge.label),
      action: {
        label: t.undo,
        run: () => update((d) => ({ ...d, charges: insertAt(d.charges, index, charge) })),
      },
    })
  }

  return (
    <Sheet open={props.open} onClose={props.onClose} labelledBy="delete-title">
      <div className="stack stack--6">
        <h2 id="delete-title" className="sheet__title">
          {t.deletion.title(charge.label)}
        </h2>
        <p className="sheet__text">
          {t.deletion.summary(euros(charge.amount), t.charges.per[charge.frequency], account)}
        </p>
      </div>
      <Impact
        rows={names.map((name, who) => ({
          who,
          name,
          before: at(split.toJoint, who),
          after: at(after.toJoint, who),
        }))}
      />
      <div className="stack stack--8">
        <button type="button" className="button button--danger" onClick={confirm}>
          {t.deletion.confirm}
        </button>
        <button type="button" className="button-plain" onClick={props.onClose} data-autofocus>
          {t.deletion.cancel}
        </button>
      </div>
    </Sheet>
  )
}
