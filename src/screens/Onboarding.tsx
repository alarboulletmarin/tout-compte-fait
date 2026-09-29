import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { useLocation } from 'wouter'
import { initialData, newMember } from '../domain/data'
import { computeSplit } from '../domain/split'
import {
  MAX_MEMBERS,
  MIN_MEMBERS,
  memberAccount,
  type AccountRef,
  type Charge,
  type Household,
  type Member,
} from '../domain/types'
import { useI18n } from '../i18n/i18n'
import { useStore } from '../storage/store'
import { CheckIcon, PlusIcon, TrashIcon } from '../ui/icons'
import { FieldError } from '../ui/Notes'
import { Shape } from '../ui/Shape'
import { useMoneyInput } from '../ui/useMoneyInput'
import { useImportFlow } from './DataSheets'
import { ReceiveSheet } from './SyncSheets'
import { syncSupported } from '../storage/sync'
import { at } from '../domain/at'

interface Row {
  label: string
  categoryId: string
  checked: boolean
  text: string
  paidFrom: AccountRef
}

/** Premier lancement en deux étapes ; rien n'est écrit avant la fin. */
export function Onboarding() {
  const { t } = useI18n()
  const { update } = useStore()
  const [, navigate] = useLocation()
  const [step, setStep] = useState<1 | 2>(1)
  const [members, setMembers] = useState<Member[]>(() => [newMember(), newMember()])

  function finish(charges: Charge[]) {
    const household: Household = {
      members: members.map((m) => ({ ...m, name: m.name.trim() })),
    }
    update(() => ({ ...initialData(t.defaultCategories), household, charges }))
    navigate('/', { replace: true })
  }

  return step === 1 ? (
    <People
      members={members}
      onChange={setMembers}
      onNext={() => {
        setStep(2)
        window.scrollTo(0, 0)
      }}
    />
  ) : (
    <FirstCharges members={members} onFinish={finish} />
  )
}

function Header({ step }: { step: 1 | 2 }) {
  const { t } = useI18n()
  return (
    <header className="topbar topbar--center">
      <div className="topbar__brand">{t.brand}</div>
      <div className="num topbar__step">{t.onboarding.step(step)}</div>
    </header>
  )
}

function People(props: {
  members: Member[]
  onChange: (members: Member[]) => void
  onNext: () => void
}) {
  const { t } = useI18n()
  // Rien à remplacer au premier lancement : pas de confirmation
  const importFlow = useImportFlow({ confirm: false })
  const [receiving, setReceiving] = useState(false)
  // Revenu illisible, par id de membre ; une personne retirée n'y compte plus
  const [invalid, setInvalid] = useState<Record<string, boolean>>({})
  // Personne ajoutée : son champ prénom prend le focus
  const [added, setAdded] = useState<string | null>(null)

  const setMember = (id: string, patch: Partial<Member>) =>
    props.onChange(props.members.map((m) => (m.id === id ? { ...m, ...patch } : m)))

  function add() {
    const member = newMember()
    setAdded(member.id)
    props.onChange([...props.members, member])
  }

  function next() {
    const first = props.members.find((m) => invalid[m.id])
    if (first) return document.getElementById(`income-${first.id}`)?.focus()
    props.onNext()
  }

  return (
    <div className="screen onboarding">
      <Header step={1} />
      <main className="onboarding__body">
        <div className="onboarding__main onboarding__main--people">
          <div className="stack stack--10">
            <h1 className="onboarding__title">{t.onboarding.title1}</h1>
            <p className="onboarding__intro">{t.onboarding.intro1}</p>
          </div>
          {props.members.map((member, i) => (
            <Person
              key={member.id}
              index={i}
              member={member}
              autoFocus={member.id === added}
              onChange={(patch) => setMember(member.id, patch)}
              onValidity={(bad) => setInvalid((v) => ({ ...v, [member.id]: bad }))}
              onSubmit={i === props.members.length - 1 ? next : undefined}
              onRemove={
                props.members.length > MIN_MEMBERS
                  ? () => props.onChange(props.members.filter((m) => m.id !== member.id))
                  : undefined
              }
            />
          ))}
          {props.members.length < MAX_MEMBERS && (
            <button type="button" className="button-dashed" onClick={add}>
              <PlusIcon />
              {t.onboarding.addPerson}
            </button>
          )}
        </div>
        <div className="onboarding__foot onboarding__foot--people">
          <p className="onboarding__local">{t.onboarding.local}</p>
          <button type="button" className="button button--primary" onClick={next}>
            {t.onboarding.next}
          </button>
          <button
            type="button"
            className="button-link onboarding__import"
            onClick={importFlow.pick}
          >
            {t.onboarding.import}
          </button>
          {syncSupported() && (
            <button
              type="button"
              className="button-link onboarding__import"
              onClick={() => setReceiving(true)}
            >
              {t.sync.onboardingReceive}
            </button>
          )}
          {importFlow.element}
          {receiving && (
            <ReceiveSheet
              onClose={() => setReceiving(false)}
              onReceived={(file) => {
                setReceiving(false)
                importFlow.propose(file, t.sync.deviceName, true)
              }}
            />
          )}
        </div>
      </main>
    </div>
  )
}

function Person(props: {
  index: number
  member: Member
  autoFocus: boolean
  onChange: (patch: Partial<Member>) => void
  onValidity: (invalid: boolean) => void
  /** Sur la dernière personne : Entrée passe à l'étape suivante. */
  onSubmit?: () => void
  onRemove?: () => void
}) {
  const { t, parse } = useI18n()
  const ids = useId()
  const { index, onChange, onValidity } = props
  const income = useMoneyInput(props.member.income, (cents) => onChange({ income: cents }))
  const shape = <Shape of={index} />

  return (
    <fieldset className="fieldset onboarding__person">
      <legend className="section-title onboarding__legend">{t.onboarding.person(index + 1)}</legend>
      <div className="field">
        <label htmlFor={`${ids}-name`} className="field__label field__label--shape">
          {shape}
          <span>{t.onboarding.firstName}</span>
        </label>
        <input
          id={`${ids}-name`}
          className="input"
          autoComplete="off"
          autoCapitalize="words"
          enterKeyHint="next"
          autoFocus={props.autoFocus}
          placeholder={t.onboarding.placeholders[index]}
          value={props.member.name}
          onChange={(e) => onChange({ name: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') document.getElementById(`income-${props.member.id}`)?.focus()
          }}
        />
      </div>
      <div className="field">
        <label htmlFor={`income-${props.member.id}`} className="field__label field__label--shape">
          {shape}
          <span>{t.onboarding.income}</span>
        </label>
        <input
          id={`income-${props.member.id}`}
          className="input num"
          inputMode="decimal"
          enterKeyHint={props.onSubmit ? 'go' : 'next'}
          autoComplete="off"
          placeholder={t.form.amountPlaceholder}
          value={income.text}
          onChange={(e) => {
            income.onChange(e.target.value)
            const text = e.target.value.trim()
            onValidity(text !== '' && parse(text) === null)
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            if (props.onSubmit) return props.onSubmit()
            // Sinon : la personne suivante
            const next = e.currentTarget.closest('fieldset')?.nextElementSibling
            next?.querySelector<HTMLElement>('input')?.focus()
          }}
          onBlur={income.onBlur}
          aria-invalid={income.invalid}
          aria-describedby={income.invalid ? `${ids}-income-error` : undefined}
        />
        {income.invalid && <FieldError id={`${ids}-income-error`}>{t.errors.income}</FieldError>}
      </div>
      {props.onRemove && (
        <button type="button" className="button-link button-link--danger" onClick={props.onRemove}>
          <TrashIcon />
          {t.onboarding.removePerson(props.member.name.trim() || t.memberFallback(index))}
        </button>
      )}
    </fieldset>
  )
}

function FirstCharges(props: { members: Member[]; onFinish: (charges: Charge[]) => void }) {
  const { t, euros, parse } = useI18n()
  const [rows, setRows] = useState<Row[]>(() =>
    t.examples.map((e) => ({ ...e, checked: false, text: '', paidFrom: 'joint' })),
  )
  const [submitted, setSubmitted] = useState(false)
  const title = useRef<HTMLHeadingElement>(null)
  // Nouvelle étape : le focus suit, sinon il retombe sur <body>
  useEffect(() => title.current?.focus(), [])
  const names = props.members.map((m, i) => m.name.trim() || t.memberFallback(i))
  const accounts = [
    { ref: 'joint' as AccountRef, who: 'joint' as 'joint' | number },
    ...props.members.map((m, who) => ({ ref: memberAccount(m.id), who })),
  ]

  const setRow = (index: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, i) => (i === index ? { ...r, ...patch } : r)))

  // Montant lu de chaque ligne cochée ; une ligne cochée sans montant positif est en erreur
  const items = rows.map((row) => {
    const amount = parse(row.text)
    const ok = amount !== null && amount > 0
    return { row, amount, error: row.checked && !ok, counted: row.checked && ok }
  })
  const charges: Charge[] = items.flatMap(({ row, amount, counted }) =>
    counted && amount !== null
      ? [
          {
            id: crypto.randomUUID(),
            label: row.label,
            amount,
            frequency: 'monthly',
            paidFrom: row.paidFrom,
            categoryId: row.categoryId,
          },
        ]
      : [],
  )
  // Aperçu en direct des virements
  const preview = computeSplit({ members: props.members }, charges)

  function finish() {
    setSubmitted(true)
    const first = items.findIndex((item) => item.error)
    if (first >= 0) return document.getElementById(`example-${first}`)?.focus()
    props.onFinish(charges)
  }

  const accountLabel = (who: 'joint' | number) =>
    who === 'joint' ? t.onboarding.paidFromJoint : t.onboarding.paidFromMember(at(names, who))

  return (
    <div className="screen onboarding">
      <Header step={2} />
      <main className="onboarding__body">
        <div className="onboarding__main onboarding__main--charges">
          <div className="stack stack--8">
            <h1 ref={title} tabIndex={-1} className="onboarding__title">
              {t.onboarding.title2}
            </h1>
            <p className="onboarding__intro">{t.onboarding.intro2}</p>
          </div>
          <div className="onboarding__legend-row">
            <span>{t.onboarding.paidFrom}</span>
            <span className="onboarding__legend-item">
              <Shape of="joint" />
              {t.onboarding.jointAccount}
            </span>
            {names.map((name, i) => (
              <span key={i} className="onboarding__legend-item">
                <Shape of={i} />
                {name}
              </span>
            ))}
          </div>
          <ul className="group">
            {items.map(({ row, amount, error: invalid }, i) => {
              const errorId = `example-${i}-error`
              const error = submitted && invalid
              return (
                <li key={row.label} className={`example${row.checked ? ' example--checked' : ''}`}>
                  <button
                    type="button"
                    className="example__toggle"
                    aria-pressed={row.checked}
                    onClick={() => setRow(i, { checked: !row.checked })}
                  >
                    <span className="checkbox" aria-hidden="true">
                      {row.checked && <CheckIcon />}
                    </span>
                    {row.label}
                  </button>
                  {row.checked && (
                    <>
                      <div className="example__controls">
                        <input
                          id={`example-${i}`}
                          className="input input--compact num"
                          inputMode="decimal"
                          autoComplete="off"
                          placeholder={t.form.amountPlaceholder}
                          aria-label={t.onboarding.amountOf(row.label)}
                          value={row.text}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setRow(i, { text: e.target.value })
                          }
                          onBlur={() => amount !== null && setRow(i, { text: euros(amount) })}
                          aria-invalid={error}
                          aria-describedby={error ? errorId : undefined}
                        />
                        <div className="account-picker">
                          {accounts.map((a) => (
                            <button
                              key={a.ref}
                              type="button"
                              className="account-picker__button"
                              aria-pressed={row.paidFrom === a.ref}
                              aria-label={accountLabel(a.who)}
                              onClick={() => setRow(i, { paidFrom: a.ref })}
                            >
                              <Shape of={a.who} />
                            </button>
                          ))}
                        </div>
                      </div>
                      {error && <FieldError id={errorId}>{t.errors.amount}</FieldError>}
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
        <div className="onboarding__foot onboarding__foot--charges">
          <div className="onboarding__preview" aria-live="polite">
            {names.map((name, i) => (
              <span key={i} className="onboarding__legend-item">
                <Shape of={i} />
                <span className="visually-hidden">{name}</span>
                <span className="num onboarding__preview-amount">
                  {euros(at(preview.toJoint, i))}
                </span>
              </span>
            ))}
            <span>{t.onboarding.onJoint}</span>
          </div>
          <button type="button" className="button button--primary" onClick={finish}>
            {t.onboarding.finish}
          </button>
          <button type="button" className="button-plain" onClick={() => props.onFinish([])}>
            {t.onboarding.skip}
          </button>
        </div>
      </main>
    </div>
  )
}
