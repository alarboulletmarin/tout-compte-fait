import type { SavingPace } from '@/domain/types'
import { t } from '@/i18n/strings'
import { useCategoriesByFamily, useMembers } from '@/store/selectors'
import { AmountInput, DateInput, Field, Select, TextInput } from '@/ui/Field'
import type { SupportDraft, SupportErrors } from './supportDraft'

/**
 * Les champs d'un support d'épargne — les mêmes partout où l'on en crée un.
 *
 * Le nom d'abord, parce que c'est lui qui compte : « Livret A », « PEA
 * Boursorama ». Le propriétaire ensuite, jamais facultatif — une épargne est
 * toujours à quelqu'un. Le type ne sert qu'à ranger et à colorer : c'est une
 * catégorie du catalogue, celle-là même sous laquelle les mouvements du support
 * se rangeront, et non un second classement à tenir d'accord avec le premier.
 *
 * **Aucun rendement, aucun objectif, aucune échéance.** Ce formulaire répond à
 * « combien j'ai, et où », et s'arrête là. La cadence n'y déroge pas : elle dit
 * quand un relevé sera attendu, jamais ce que le support rapportera d'ici là —
 * c'est le champ qui permet à l'écran de **se taire**, et non de projeter.
 */
export function SupportFields({
  draft,
  patch,
  errors,
  /** À la création seulement : un relevé s'empile, il ne se réécrit pas ici. */
  withValue = true,
  autoFocus = false,
}: {
  draft: SupportDraft
  patch: (next: Partial<SupportDraft>) => void
  errors: SupportErrors
  withValue?: boolean
  autoFocus?: boolean
}) {
  const members = useMembers()
  const groups = useCategoriesByFamily(['saving'])

  return (
    <>
      <Field
        label={t.savings.supportLabel}
        required
        {...(errors.label === undefined ? {} : { error: errors.label })}
      >
        {(id, describedBy) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            value={draft.label}
            invalid={errors.label !== undefined}
            placeholder={t.savings.supportLabelPlaceholder}
            maxLength={40}
            autoFocus={autoFocus}
            onChange={(event) => {
              patch({ label: event.target.value })
            }}
          />
        )}
      </Field>

      <Field
        label={t.savings.supportOwner}
        required
        {...(errors.member === undefined ? {} : { error: errors.member })}
      >
        {(id, describedBy) => (
          <Select
            id={id}
            aria-describedby={describedBy}
            value={draft.memberId}
            invalid={errors.member !== undefined}
            onChange={(event) => {
              patch({ memberId: event.target.value })
            }}
          >
            <option value="">{t.savings.supportOwnerPlaceholder}</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field
        label={t.savings.supportKind}
        required
        hint={t.savings.supportKindHint}
        {...(errors.category === undefined ? {} : { error: errors.category })}
      >
        {(id, describedBy) => (
          <Select
            id={id}
            aria-describedby={describedBy}
            value={draft.categoryId}
            invalid={errors.category !== undefined}
            onChange={(event) => {
              patch({ categoryId: event.target.value })
            }}
          >
            <option value="">{t.entry.categoryPlaceholder}</option>
            {groups.map((group) => (
              <optgroup key={group.family.id} label={group.family.label}>
                {group.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        )}
      </Field>

      {/* La cadence, et non un rendement : elle ne sert à projeter aucune
          valeur, seulement à savoir quand l'écran doit réclamer un relevé et
          quand il doit se taire. C'est une question à laquelle on répond sans
          rien consulter — « est-ce que ce compte bouge tout seul ? » — d'où
          deux réponses et pas un champ libre, et une présélection plutôt qu'une
          case vide : elle n'exige rien de plus qu'un regard. */}
      <Field label={t.savings.supportPace} hint={t.savings.supportPaceHint}>
        {(id, describedBy) => (
          <Select
            id={id}
            aria-describedby={describedBy}
            value={draft.pace}
            onChange={(event) => {
              patch({ pace: event.target.value as SavingPace })
            }}
          >
            <option value="yearly">{t.savings.paceYearly}</option>
            <option value="quarterly">{t.savings.paceQuarterly}</option>
          </Select>
        )}
      </Field>

      {/* Le premier relevé est facultatif, et son absence a un sens : on ne
          connaît pas le capital. Le laisser vide n'écrit rien — surtout pas
          zéro, qui dirait « ce livret est vide ».
          Sans placeholder : « 0,00 » dans un champ vide est précisément le
          chiffre qu'on ne veut pas voir enregistré, et un champ de relevé ne
          peut pas se permettre de le suggérer. */}
      {withValue && (
        <>
          <Field
            label={t.savings.valueInitial}
            optional
            hint={t.savings.valueHint}
            {...(errors.amount === undefined ? {} : { error: errors.amount })}
          >
            {(id, describedBy) => (
              <AmountInput
                id={id}
                aria-describedby={describedBy}
                value={draft.amountText}
                invalid={errors.amount !== undefined}
                onChange={(event) => {
                  patch({ amountText: event.target.value })
                }}
              />
            )}
          </Field>

          {/* La date du relevé, et non celle du jour : on saisit souvent le
              chiffre d'un relevé qui date de la semaine dernière, et le dater
              d'aujourd'hui décalerait toute la courbe. */}
          {draft.amountText.trim() !== '' && (
            <Field label={t.savings.valueDate} required>
              {(id) => (
                <DateInput
                  id={id}
                  value={draft.valueDate}
                  onChange={(event) => {
                    if (event.target.value !== '') patch({ valueDate: event.target.value })
                  }}
                />
              )}
            </Field>
          )}
        </>
      )}

      <Field label={t.savings.supportNote} optional>
        {(id) => (
          <TextInput
            id={id}
            value={draft.note}
            placeholder={t.savings.supportNotePlaceholder}
            maxLength={140}
            onChange={(event) => {
              patch({ note: event.target.value })
            }}
          />
        )}
      </Field>
    </>
  )
}
