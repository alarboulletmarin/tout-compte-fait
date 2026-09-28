import { useId } from 'react'
import { memberAccount, type Member, type MemberIndex } from '../domain/types'
import { useI18n } from '../i18n/i18n'
import { useStore } from '../storage/store'
import { FieldError } from '../ui/Notes'
import { TabScreen } from '../ui/Screens'
import { Shape } from '../ui/Shape'
import { useMoneyInput } from '../ui/useMoneyInput'
import { MEMBERS } from './common'
import { EqualFallbackNote } from './EqualFallbackNote'

export function Household() {
  const { t, euros } = useI18n()
  const { members } = useStore().data.household
  const total = (members[0].income ?? 0) + (members[1].income ?? 0)

  return (
    <TabScreen title={t.nav.household} kicker={t.household.kicker} className="household">
      <div className="stack stack--6">
        <h1 className="lead">{t.household.title}</h1>
        <p className="caption-13">{t.household.hint}</p>
      </div>
      {MEMBERS.map((i) => (
        <MemberCard key={i} index={i} />
      ))}
      <EqualFallbackNote />
      <div className="between between--baseline household__total">
        <span>{t.household.total}</span>
        <span className="num">{euros(total)}</span>
      </div>
    </TabScreen>
  )
}

function MemberCard({ index }: { index: MemberIndex }) {
  const { t, share } = useI18n()
  const { data, split, update } = useStore()
  const member = data.household.members[index]
  const ids = useId()

  const setMember = (patch: Partial<Member>) =>
    update((d) => {
      const members = [...d.household.members] as [Member, Member]
      members[index] = { ...members[index], ...patch }
      return { ...d, household: { members } }
    })

  const income = useMoneyInput(member.income, (cents) => setMember({ income: cents }))

  return (
    <section className="card member-card" aria-label={member.name || t.memberFallback(index)}>
      <div className="between">
        <Shape account={memberAccount(index)} />
        <span className="num member-card__share">{share(split.shares[index])}</span>
      </div>
      <div className="field field--tight">
        <label htmlFor={`${ids}-name`} className="field__label field__label--small">
          {t.household.firstName}
        </label>
        <input
          id={`${ids}-name`}
          className="input"
          autoComplete="off"
          placeholder={t.memberFallback(index)}
          value={member.name}
          onChange={(e) => setMember({ name: e.target.value })}
        />
      </div>
      <div className="field field--tight">
        <label htmlFor={`${ids}-income`} className="field__label field__label--small">
          {t.household.income}
        </label>
        <input
          id={`${ids}-income`}
          className="input num"
          inputMode="decimal"
          autoComplete="off"
          value={income.text}
          onChange={(e) => income.onChange(e.target.value)}
          onBlur={income.onBlur}
          aria-invalid={income.invalid}
          aria-describedby={income.invalid ? `${ids}-income-error` : undefined}
        />
        {income.invalid && <FieldError id={`${ids}-income-error`}>{t.errors.income}</FieldError>}
      </div>
    </section>
  )
}
