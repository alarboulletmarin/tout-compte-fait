import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { useLocation } from 'wouter'
import { initialData } from '../domain/data'
import { computeSplit } from '../domain/split'
import {
  memberAccount,
  type AccountRef,
  type Charge,
  type Household,
  type Member,
  type MemberIndex,
} from '../domain/types'
import { parseEuros } from '../i18n/format'
import { useI18n } from '../i18n/i18n'
import { useStore } from '../storage/store'
import { CheckIcon } from '../ui/icons'
import { FieldError } from '../ui/Notes'
import { Shape } from '../ui/Shape'
import { useMoneyInput } from '../ui/useMoneyInput'
import { MEMBERS } from './common'
import { useImportFlow } from './DataSheets'

const ACCOUNTS: AccountRef[] = ['joint', 'member1', 'member2']

interface Row {
  label: string
  categoryId: string
  checked: boolean
  text: string
  paidFrom: AccountRef
}

/** Premier lancement en deux étapes ; rien n'est écrit avant la fin. */
export function Onboarding() {
  const { update } = useStore()
  const [, navigate] = useLocation()
  const [step, setStep] = useState<1 | 2>(1)
  const [members, setMembers] = useState<[Member, Member]>([
    { name: '', income: null },
    { name: '', income: null },
  ])

  function finish(charges: Charge[]) {
    const household: Household = {
      members: [
        { ...members[0], name: members[0].name.trim() },
        { ...members[1], name: members[1].name.trim() },
      ],
    }
    update(() => ({ ...initialData(), household, charges }))
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
  members: [Member, Member]
  onChange: (members: [Member, Member]) => void
  onNext: () => void
}) {
  const { t } = useI18n()
  // Rien à remplacer au premier lancement : pas de confirmation
  const importFlow = useImportFlow({ confirm: false })
  const [invalid, setInvalid] = useState<[boolean, boolean]>([false, false])

  const setMember = (index: MemberIndex, patch: Partial<Member>) => {
    const next = [...props.members] as [Member, Member]
    next[index] = { ...next[index], ...patch }
    props.onChange(next)
  }

  function next() {
    const first = invalid.indexOf(true)
    if (first >= 0) return document.getElementById(`income-${first}`)?.focus()
    props.onNext()
  }

  return (
    <div className="screen onboarding">
      <Header step={1} />
      <main className="onboarding__main onboarding__main--people">
        <div className="stack stack--10">
          <h1 className="onboarding__title">{t.onboarding.title1}</h1>
          <p className="onboarding__intro">{t.onboarding.intro1}</p>
        </div>
        {MEMBERS.map((i) => (
          <Person
            key={i}
            index={i}
            member={props.members[i]}
            onChange={(patch) => setMember(i, patch)}
            onValidity={(bad) =>
              setInvalid((v) => (i === 0 ? [bad, v[1]] : [v[0], bad]) as [boolean, boolean])
            }
          />
        ))}
      </main>
      <div className="onboarding__foot onboarding__foot--people">
        <p className="onboarding__local">{t.onboarding.local}</p>
        <button type="button" className="button button--primary" onClick={next}>
          {t.onboarding.next}
        </button>
        <button type="button" className="button-link onboarding__import" onClick={importFlow.pick}>
          {t.onboarding.import}
        </button>
        {importFlow.element}
      </div>
    </div>
  )
}

function Person(props: {
  index: MemberIndex
  member: Member
  onChange: (patch: Partial<Member>) => void
  onValidity: (invalid: boolean) => void
}) {
  const { t } = useI18n()
  const ids = useId()
  const { index, onChange, onValidity } = props
  const income = useMoneyInput(props.member.income, (cents) => onChange({ income: cents }))
  const shape = <Shape account={memberAccount(index)} />

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
          placeholder={t.onboarding.placeholders[index]}
          value={props.member.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor={`income-${index}`} className="field__label field__label--shape">
          {shape}
          <span>{t.onboarding.income}</span>
        </label>
        <input
          id={`income-${index}`}
          className="input num"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00 €"
          value={income.text}
          onChange={(e) => {
            income.onChange(e.target.value)
            const text = e.target.value.trim()
            onValidity(text !== '' && parseEuros(text) === null)
          }}
          onBlur={income.onBlur}
          aria-invalid={income.invalid}
          aria-describedby={income.invalid ? `${ids}-income-error` : undefined}
        />
        {income.invalid && <FieldError id={`${ids}-income-error`}>{t.errors.income}</FieldError>}
      </div>
    </fieldset>
  )
}

function FirstCharges(props: { members: [Member, Member]; onFinish: (charges: Charge[]) => void }) {
  const { t, euros } = useI18n()
  const [rows, setRows] = useState<Row[]>(() =>
    t.examples.map((e) => ({ ...e, checked: false, text: '', paidFrom: 'joint' })),
  )
  const [submitted, setSubmitted] = useState(false)
  const title = useRef<HTMLHeadingElement>(null)
  // Nouvelle étape : le focus suit, sinon il retombe sur <body>
  useEffect(() => title.current?.focus(), [])
  const names = props.members.map((m, i) => m.name.trim() || t.memberFallback(i)) as [
    string,
    string,
  ]

  const setRow = (index: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, i) => (i === index ? { ...r, ...patch } : r)))

  // Montant lu de chaque ligne cochée ; une ligne cochée sans montant positif est en erreur
  const items = rows.map((row) => {
    const amount = parseEuros(row.text)
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

  const accountLabel = (a: AccountRef) =>
    a === 'joint'
      ? t.onboarding.paidFromJoint
      : t.onboarding.paidFromMember(names[a === 'member1' ? 0 : 1])

  return (
    <div className="screen onboarding">
      <Header step={2} />
      <main className="onboarding__main onboarding__main--charges">
        <div className="stack stack--8">
          <h1 ref={title} tabIndex={-1} className="onboarding__title">
            {t.onboarding.title2}
          </h1>
          <p className="onboarding__intro">{t.onboarding.intro2}</p>
        </div>
        <div className="onboarding__legend-row">
          <span>{t.onboarding.paidFrom}</span>
          <span className="onboarding__legend-item">
            <Shape account="joint" />
            {t.onboarding.jointAccount}
          </span>
          {MEMBERS.map((i) => (
            <span key={i} className="onboarding__legend-item">
              <Shape account={memberAccount(i)} />
              {names[i]}
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
                        placeholder="0,00 €"
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
                        {ACCOUNTS.map((a) => (
                          <button
                            key={a}
                            type="button"
                            className="account-picker__button"
                            aria-pressed={row.paidFrom === a}
                            aria-label={accountLabel(a)}
                            onClick={() => setRow(i, { paidFrom: a })}
                          >
                            <Shape account={a} />
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
      </main>
      <div className="onboarding__foot onboarding__foot--charges">
        <div className="onboarding__preview" aria-live="polite">
          {MEMBERS.map((i) => (
            <span key={i} className="onboarding__legend-item">
              <Shape account={memberAccount(i)} />
              <span className="visually-hidden">{names[i]}</span>
              <span className="num onboarding__preview-amount">{euros(preview.toJoint[i])}</span>
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
    </div>
  )
}
