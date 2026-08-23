import { useState } from 'react'
import { makeId } from '@/domain/ids'
import type { Money } from '@/domain/money'
import { tpl } from '@/i18n/format'
import { t } from '@/i18n/strings'
import { Amount } from '@/ui/Amount'
import { Button, IconButton } from '@/ui/Button'
import { AmountInput, Field, TextInput } from '@/ui/Field'
import { Close } from '@/ui/Icons'
import { InlineError } from '@/ui/InlineError'
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
  /* Le refus ne se lit qu'après un essai : afficher « donne un nom » sur une
     carte qu'on vient d'ouvrir gronderait quelqu'un qui n'a rien fait. Même
     grammaire que la saisie rapide et que l'écriture d'une règle. */
  const [tried, setTried] = useState(false)

  const trimmed = name.trim()
  const parsed = typedAmount(amount)
  /* Le nom d'abord : c'est le champ de gauche, et on ne dit qu'une chose à la
     fois. `typedAmount` refuse aussi bien le vide que l'illisible et le zéro —
     les trois se répondent par la même phrase, celle de la saisie rapide. */
  const error =
    trimmed.length === 0
      ? t.onboarding.extrasNameRequired
      : parsed === null
        ? t.entry.amountRequired
        : null

  const submit = (): void => {
    setTried(true)
    if (error !== null || parsed === null) return
    onAdd({ id: makeId(), name: trimmed, amount: parsed })
    setName('')
    setAmount('')
    setTried(false)
  }

  return (
    <div className="flex flex-col gap-4">
      {extras.length === 0 ? (
        <p className="t-label">{t.onboarding.extrasEmpty}</p>
      ) : (
        /* `-mx-3` : `ListRow` porte son propre `px-3`, et sans le rattraper
           ici la pastille et le libellé partaient 12px à l'intérieur de la
           colonne de la carte — c'est la convention que `PeoplePage` et
           `MonthTile` posent déjà, et c'est ce qui fait déborder le fond de
           survol du texte plutôt que de le coller au mot. */
        <ul aria-label={t.onboarding.extrasList} className="-mx-3 flex flex-col">
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
          écouteur de touche à écrire. Il passe en colonne pour porter le refus :
          « Ajouter » vit au bout de la rangée des champs, et le message ne peut
          donc pas se poser au-dessus de lui sans désaligner les deux autres. Il
          se pose sous la rangée entière, ce qui revient au même pour le doigt
          qui remonte appuyer une seconde fois. */}
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <div className="flex flex-wrap items-end gap-2">
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
          {/* La largeur est posée sur l'enveloppe, jamais sur le contrôle :
              `AmountInput` porte déjà `w-full`, `cn` concatène sans fusionner,
              et `.w-full` passe après `.w-28` dans `utilities.css` — un `w-28`
              posé ici ne faisait donc rien, et la case prenait ses 192px de
              plafond au lieu de 112. C'est le piège que l'en-tête de `Field`
              décrit ; le `w-full` du contrôle remplit maintenant l'enveloppe. */}
          <Field label={t.onboarding.extrasAmount} className="w-28">
            {(id) => (
              <AmountInput
                id={id}
                value={amount}
                placeholder="0,00"
                onChange={(event) => {
                  setAmount(event.target.value)
                }}
              />
            )}
          </Field>
          {/* Actif, et non grisé : un bouton mort qui ne dit pas pourquoi est un
              refus sans cause, et le DS §6 le range avec les contrôles qui ne
              tiennent pas leur promesse. C'est le message qui dit ce qui
              manque. */}
          <Button type="submit" variant="secondary">
            {t.onboarding.extrasAdd}
          </Button>
        </div>
        <InlineError message={tried ? error : null} />
      </form>

      {extras.length > 0 && (
        /* Le total réserve la colonne du bouton de suppression que portent
           les rangées au-dessus. Sans elle, son montant se posait 60px à droite
           de ceux qu'il additionne : la colonne de chiffres se cassait sur la
           ligne même qui prétend en faire la somme. 4px de gouttière plus les
           44px du bouton, soit le gabarit exact du `trailing` d'une rangée. */
        <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
          <span className="t-label">{t.onboarding.extrasTotal}</span>
          <span className="flex items-center gap-1">
            <Amount value={total} size="body" />
            <span aria-hidden="true" className="w-11" />
          </span>
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
