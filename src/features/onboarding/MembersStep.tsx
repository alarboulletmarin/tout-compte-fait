import { useState } from 'react'
import type { Member } from '@/domain/types'
import { tpl } from '@/i18n/format'
import { t } from '@/i18n/strings'
import { Button, IconButton } from '@/ui/Button'
import { ConfirmDialog } from '@/ui/ConfirmDialog'
import { Dot } from '@/ui/Dot'
import { Field, TextInput } from '@/ui/Field'
import { Close } from '@/ui/Icons'
import { MemberNameInput } from '@/features/settings/MemberNameInput'

/** Deuxième étape : les membres. Elle peut être passée — l'usage solo existe. */
export function MembersStep({
  members,
  onAdd,
  onRename,
  onRemove,
  onNext,
}: {
  members: readonly Member[]
  onAdd: (name: string) => void
  onRename: (id: string, name: string) => void
  onRemove: (id: string) => void
  onNext: () => void
}) {
  const [name, setName] = useState('')
  const [removing, setRemoving] = useState<Member | null>(null)
  const trimmed = name.trim()

  const submit = (): void => {
    if (trimmed.length === 0) return
    onAdd(trimmed)
    setName('')
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="t-section">{t.onboarding.membersTitle}</h1>
        <p className="t-label">{t.onboarding.membersHint}</p>
      </div>

      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <Field label={t.onboarding.membersLabel} className="flex-1">
          {(id) => (
            <TextInput
              id={id}
              value={name}
              placeholder={t.onboarding.membersPlaceholder}
              maxLength={24}
              autoFocus
              onChange={(event) => {
                setName(event.target.value)
              }}
            />
          )}
        </Field>
        <Button type="submit" variant="secondary" disabled={trimmed.length === 0}>
          {t.onboarding.membersAdd}
        </Button>
      </form>

      {members.length === 0 ? (
        <p className="t-label">{t.onboarding.membersEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex h-14 items-center gap-3 rounded-inner bg-surface-2 px-3"
            >
              <Dot color={member.color} />
              <MemberNameInput
                label={tpl(t.onboarding.membersRename, member.name)}
                name={member.name}
                onRename={(next) => {
                  onRename(member.id, next)
                }}
              />
              <IconButton
                label={tpl(t.onboarding.membersRemove, member.name)}
                className="ml-auto"
                onClick={() => {
                  setRemoving(member)
                }}
              >
                <Close size={18} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      {/* « Je suis seul·e » plutôt que « Continuer » quand personne n'est
          nommé : le bouton dit alors ce qu'on répond, et non ce qu'il fait. Il
          n'ouvre plus l'app pour autant — il mène à l'étape où se posent les
          revenus, qui existent aussi en solo. */}
      <Button onClick={onNext} full>
        {members.length === 0 ? t.onboarding.solo : t.common.next}
      </Button>

      <ConfirmDialog
        open={removing !== null}
        title={tpl(t.onboarding.membersRemove, removing?.name ?? '')}
        steps={[
          {
            question: tpl(t.onboarding.membersRemoveConfirm, removing?.name ?? ''),
            action: t.common.delete,
          },
        ]}
        onCancel={() => {
          setRemoving(null)
        }}
        onConfirm={() => {
          if (removing !== null) onRemove(removing.id)
          setRemoving(null)
        }}
      />
    </div>
  )
}
