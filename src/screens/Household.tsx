import { useId, useState } from 'react'
import { newMember, removeMember, restoreMember } from '../domain/data'
import { computeSplit } from '../domain/split'
import { MAX_MEMBERS, MIN_MEMBERS, memberAccount, type Member } from '../domain/types'
import { useI18n } from '../i18n/i18n'
import { useStore } from '../storage/store'
import { PlusIcon, TrashIcon } from '../ui/icons'
import { Amount, ShareValue } from '../ui/Amount'
import { Impact } from '../ui/Impact'
import { FieldError } from '../ui/Notes'
import { TabScreen } from '../ui/Screens'
import { Shape } from '../ui/Shape'
import { Sheet } from '../ui/Sheet'
import { useToast } from '../ui/Toast'
import { useMoneyInput } from '../ui/useMoneyInput'
import { useNames } from './common'
import { EqualFallbackNote } from './EqualFallbackNote'
import { at } from '../domain/at'

export function Household() {
  const { t } = useI18n()
  const { data, update } = useStore()
  const { members } = data.household
  const total = members.reduce((sum, m) => sum + (m.income ?? 0), 0)
  // Nouvelle personne : son champ prénom prend le focus ; à retirer : feuille de confirmation
  const [added, setAdded] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  function add() {
    const member = newMember()
    setAdded(member.id)
    update((d) => ({ ...d, household: { members: [...d.household.members, member] } }))
  }

  return (
    <TabScreen title={t.nav.household} kicker={t.household.kicker} className="household">
      <div className="stack stack--6">
        <h1 className="lead">{t.household.title}</h1>
        <p className="caption-13">{t.household.hint}</p>
      </div>
      {members.map((member, i) => (
        <MemberCard
          key={member.id}
          index={i}
          autoFocus={member.id === added}
          onRemove={members.length > MIN_MEMBERS ? () => setRemoving(member.id) : undefined}
        />
      ))}
      {members.length < MAX_MEMBERS ? (
        <button type="button" className="button-dashed" onClick={add}>
          <PlusIcon />
          {t.household.add}
        </button>
      ) : (
        <p className="caption-13 household__full">{t.household.full}</p>
      )}
      <EqualFallbackNote />
      <div className="between between--baseline household__total">
        <span>{t.household.total}</span>
        <Amount cents={total} />
      </div>
      {removing && <RemoveSheet id={removing} onClose={() => setRemoving(null)} />}
    </TabScreen>
  )
}

function MemberCard(props: { index: number; autoFocus: boolean; onRemove?: () => void }) {
  const { t } = useI18n()
  const { data, split, update } = useStore()
  const member = at(data.household.members, props.index)
  const name = at(useNames(), props.index)
  const ids = useId()

  const setMember = (patch: Partial<Member>) =>
    update((d) => ({
      ...d,
      household: {
        members: d.household.members.map((m) => (m.id === member.id ? { ...m, ...patch } : m)),
      },
    }))

  const income = useMoneyInput(member.income, (cents) => setMember({ income: cents }))

  return (
    <section className="card member-card" aria-label={name}>
      <div className="between">
        <Shape of={props.index} />
        <ShareValue share={at(split.shares, props.index)} className="member-card__share" />
      </div>
      <div className="field field--tight">
        <label htmlFor={`${ids}-name`} className="field__label field__label--small">
          {t.household.firstName}
        </label>
        <input
          id={`${ids}-name`}
          className="input"
          autoComplete="off"
          autoCapitalize="words"
          enterKeyHint="next"
          autoFocus={props.autoFocus}
          placeholder={t.memberFallback(props.index)}
          value={member.name}
          onChange={(e) => setMember({ name: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') document.getElementById(`${ids}-income`)?.focus()
          }}
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
          enterKeyHint="done"
          autoComplete="off"
          value={income.text}
          onChange={(e) => income.onChange(e.target.value)}
          onBlur={income.onBlur}
          // Tout est déjà enregistré à la frappe : Entrée referme le clavier
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          aria-invalid={income.invalid}
          aria-describedby={income.invalid ? `${ids}-income-error` : undefined}
        />
        {income.invalid && <FieldError id={`${ids}-income-error`}>{t.errors.income}</FieldError>}
      </div>
      {props.onRemove && (
        <button type="button" className="button-link button-link--danger" onClick={props.onRemove}>
          <TrashIcon />
          {t.household.remove(name)}
        </button>
      )}
    </section>
  )
}

/** Confirmation : montre ce que change le départ pour les virements ; « Annuler » reste possible ensuite. */
function RemoveSheet(props: { id: string; onClose: () => void }) {
  const { t } = useI18n()
  const { data, split, update } = useStore()
  const names = useNames()
  const toast = useToast()
  const index = data.household.members.findIndex((m) => m.id === props.id)
  const member = data.household.members[index]
  if (!member) return null

  const moved = data.charges.filter((c) => c.paidFrom === memberAccount(member.id))
  const next = removeMember(data, member.id)
  const after = computeSplit(next.household, next.charges)
  // Les membres restants, chacun avec sa forme actuelle ; `after` est sans le membre retiré
  const rows = names.flatMap((name, who) =>
    who === index
      ? []
      : [
          {
            who,
            name,
            before: at(split.toJoint, who),
            after: at(after.toJoint, who < index ? who : who - 1),
          },
        ],
  )

  const confirm = () => {
    const chargeIds = new Set(moved.map((c) => c.id))
    update((d) => removeMember(d, member.id))
    props.onClose()
    toast({
      message: t.household.removed(at(names, index)),
      action: {
        label: t.undo,
        run: () => update((d) => restoreMember(d, member, index, chargeIds)),
      },
    })
  }

  return (
    <Sheet open onClose={props.onClose} labelledBy="remove-title">
      <div className="stack stack--6">
        <h2 id="remove-title" className="sheet__title">
          {t.household.removal.title(at(names, index))}
        </h2>
        <p className="sheet__text">
          {moved.length > 0
            ? t.household.removal.charges(moved.length)
            : t.household.removal.noCharges}
        </p>
      </div>
      <Impact rows={rows} />
      <div className="stack stack--8">
        <button type="button" className="button button--danger" onClick={confirm}>
          {t.household.removal.confirm}
        </button>
        <button type="button" className="button-plain" onClick={props.onClose} data-autofocus>
          {t.household.removal.cancel}
        </button>
      </div>
    </Sheet>
  )
}
