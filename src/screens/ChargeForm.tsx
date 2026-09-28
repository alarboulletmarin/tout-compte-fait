import { useId, useRef, useState, type FormEvent } from 'react'
import { Redirect, useLocation, useSearch } from 'wouter'
import { computeSplit, MONTHS } from '../domain/split'
import { memberAccount, type AccountRef, type Charge, type Frequency } from '../domain/types'
import { useI18n } from '../i18n/i18n'
import { useStore } from '../storage/store'
import { TrashIcon } from '../ui/icons'
import { FieldError } from '../ui/Notes'
import { FormHeader } from '../ui/Screens'
import { Shape } from '../ui/Shape'
import { Sheet } from '../ui/Sheet'
import { useToast } from '../ui/Toast'
import { insertAt, MEMBERS, useNames } from './common'

const FREQUENCIES: Frequency[] = ['monthly', 'quarterly', 'yearly']
const ACCOUNTS: AccountRef[] = ['joint', 'member1', 'member2']

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
  const names = useNames()
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
    navigate('/charges', { replace: true })
  }

  const accountLabel = (account: AccountRef) =>
    account === 'joint' ? t.form.joint : names[account === 'member1' ? 0 : 1]

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

          <fieldset className="fieldset">
            <legend className="field__label legend">{t.form.paidFrom}</legend>
            <div className="segmented">
              {ACCOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  className="segment"
                  aria-pressed={paidFrom === a}
                  onClick={() => setPaidFrom(a)}
                >
                  <Shape account={a} />
                  {accountLabel(a)}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="field__label legend">{t.form.category}</legend>
            <CategoryChips value={categoryId} onChange={setCategoryId} />
          </fieldset>
        </div>

        <div className={`charge-form__foot${existing ? ' charge-form__foot--edit' : ''}`}>
          <div className="between caption-13">
            <span>{t.form.monthlyEquivalent}</span>
            <span className="num">
              {valid ? euros(Math.round(amount / MONTHS[frequency])) : '–'}
            </span>
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

function CategoryChips(props: { value: string | null; onChange: (id: string | null) => void }) {
  const { t } = useI18n()
  const { data, update } = useStore()
  const [draft, setDraft] = useState<string | null>(null)

  function create() {
    const name = draft?.trim()
    setDraft(null)
    if (!name) return
    const id = crypto.randomUUID()
    update((d) => ({ ...d, categories: [...d.categories, { id, name }] }))
    props.onChange(id)
  }

  return (
    <div className="chips">
      {data.categories.map((c) => (
        <button
          key={c.id}
          type="button"
          className="chip"
          aria-pressed={props.value === c.id}
          onClick={() => props.onChange(props.value === c.id ? null : c.id)}
        >
          {c.name}
        </button>
      ))}
      {draft === null ? (
        <button type="button" className="chip chip--new" onClick={() => setDraft('')}>
          {t.form.newCategory}
        </button>
      ) : (
        <input
          className="chip chip--input"
          aria-label={t.form.newCategoryName}
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
    </div>
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
  const account =
    charge.paidFrom === 'joint'
      ? t.deletion.jointAccount
      : t.deletion.memberAccount(names[charge.paidFrom === 'member1' ? 0 : 1])

  function confirm() {
    const index = data.charges.findIndex((c) => c.id === charge.id)
    update((d) => ({ ...d, charges: d.charges.filter((c) => c.id !== charge.id) }))
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
      <div className="impact">
        <div className="caption">{t.deletion.impact}</div>
        {MEMBERS.map((i) => (
          <div key={i} className="between impact__row">
            <span className="impact__who">
              <Shape account={memberAccount(i)} />
              {names[i]}
            </span>
            <span className="num impact__values">
              <del className="impact__old">{euros(split.toJoint[i])}</del>
              <span className="impact__arrow" aria-hidden="true">
                →
              </span>
              <ins className="impact__new">{euros(after.toJoint[i])}</ins>
            </span>
          </div>
        ))}
      </div>
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
