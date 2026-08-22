import { useState } from 'react'
import { makeId } from '@/domain/ids'
import type { Money } from '@/domain/money'
import { tpl } from '@/i18n/format'
import { t } from '@/i18n/strings'
import { Amount } from '@/ui/Amount'
import { Button, IconButton } from '@/ui/Button'
import { AmountInput, Field, TextInput } from '@/ui/Field'
import { Close } from '@/ui/Icons'
import { ListRow } from '@/ui/ListRow'
import { type ExtraCharge, typedAmount } from './queue'

/**
 * Ce qui revient encore : une liste répétable, un nom et un montant par ligne.
 *
 * **Chaque ligne devient une `Recurrence`, jamais une `Entry`.** Une charge qui
 * revient et qui ne serait qu'une ligne d'août ne remplirait pas septembre — et
 * c'est la promesse même de l'écran. Le paiement de ce choix est visible :
 * `Recurrence.categoryId` est obligatoire, et une ligne libre ne désigne aucune
 * catégorie de façon fiable. Deviner « Netflix → Streaming » rangerait un jour
 * « cantine » sous « Loisirs » sans le dire ; le repli est donc assumé à voix
 * haute, avec le geste qui le corrige — c'est ce que porte la ligne du bas.
 *
 * Le total en pied de carte, et il vient de la liste : rien à additionner à
 * l'écran, `Amount` reçoit une somme déjà faite en centimes.
 *
 * Le montant se tape plutôt que de passer par le pavé : on en saisit plusieurs
 * d'affilée, et un pavé par ligne ferait de cette carte un écran à lui seul.
 * `AmountInput` accepte la virgule, comme partout ailleurs.
 */
export function ExtrasCard({
  extras,
  total,
  fallbackLabel,
  onAdd,
  onRemove,
}: {
  extras: readonly ExtraCharge[]
  total: Money
  /** Le nom de la catégorie de repli, ou `null` si elle a été supprimée. */
  fallbackLabel: string | null
  onAdd: (extra: ExtraCharge) => void
  onRemove: (id: string) => void
}) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')

  const trimmed = name.trim()
  const parsed = typedAmount(amount)
  const ready = trimmed.length > 0 && parsed !== null

  const submit = (): void => {
    if (!ready || parsed === null) return
    onAdd({ id: makeId(), name: trimmed, amount: parsed })
    setName('')
    setAmount('')
  }

  return (
    <div className="flex flex-col gap-4">
      {extras.length === 0 ? (
        <p className="t-label">{t.onboarding.extrasEmpty}</p>
      ) : (
        <ul aria-label={t.onboarding.extrasList} className="flex flex-col">
          {extras.map((extra) => (
            <li key={extra.id}>
              {/* `ListRow` et non une rangée à part : c'est une donnée, et la
                  liste du mois en montrera de pareilles dès demain. La pastille
                  porte la couleur du repli, qui est celle qu'elles auront. */}
              <ListRow
                color="var(--cat-rest)"
                label={extra.name}
                trailing={
                  <span className="flex items-center gap-1">
                    <Amount value={extra.amount} />
                    <IconButton
                      label={tpl(t.onboarding.extrasRemove, extra.name)}
                      onClick={() => {
                        onRemove(extra.id)
                      }}
                    >
                      <Close size={16} />
                    </IconButton>
                  </span>
                }
              />
            </li>
          ))}
        </ul>
      )}

      {/* Un `<form>` : Entrée valide depuis l'un ou l'autre champ, sans
          écouteur de touche à écrire. */}
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <Field label={t.onboarding.extrasName} className="min-w-40 flex-1">
          {(id) => (
            <TextInput
              id={id}
              value={name}
              placeholder={t.onboarding.extrasNamePlaceholder}
              maxLength={60}
              onChange={(event) => {
                setName(event.target.value)
              }}
            />
          )}
        </Field>
        <Field label={t.onboarding.extrasAmount}>
          {(id) => (
            <AmountInput
              id={id}
              value={amount}
              placeholder="0,00"
              className="w-28"
              onChange={(event) => {
                setAmount(event.target.value)
              }}
            />
          )}
        </Field>
        <Button type="submit" variant="secondary" disabled={!ready}>
          {t.onboarding.extrasAdd}
        </Button>
      </form>

      {extras.length > 0 && (
        <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
          <span className="t-label">{t.onboarding.extrasTotal}</span>
          <Amount value={total} size="body" />
        </div>
      )}

      {/* Le repli, annoncé. Il se tait quand « Divers » a été supprimé du
          catalogue — auquel cas il n'y a plus de repli du tout, et les charges
          libres ne s'écriront pas : mieux vaut ne rien poser que de poser sur
          un identifiant mort. */}
      {fallbackLabel !== null && (
        <p className="t-axis">{tpl(t.onboarding.extrasFallback, fallbackLabel)}</p>
      )}
    </div>
  )
}
