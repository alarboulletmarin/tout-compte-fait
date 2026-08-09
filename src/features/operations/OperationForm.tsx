import type { ReactNode } from 'react'
import { t } from '@/i18n/strings'
import { memberPatch } from '@/features/split/memberDraft'
import { SharedField } from '@/features/split/SharedField'
import { PeriodFields } from '@/features/recurrences/PeriodFields'
import { SupportCreateSheet, SupportSelect } from '@/features/savings/SupportSelect'
import { useSupportCreateSheet } from '@/features/savings/supportDraft'
import { useActiveSavingSupports, useMembers } from '@/store/selectors'
import { Button } from '@/ui/Button'
import { CategorySelect } from '@/ui/CategorySelect'
import { ConfirmDialog } from '@/ui/ConfirmDialog'
import { type EntryNature, kindsOfNature } from '@/ui/categoryKinds'
import { AmountInput, DateInput, Field, Select, TextInput } from '@/ui/Field'
import { PageTitle } from '@/ui/PageTitle'
import { Segmented } from '@/ui/Segmented'
import { Tile } from '@/ui/Tile'
import { useLeaveGuard } from '@/ui/useLeaveGuard'
import { saveOperation } from './save'
import { type Operation, type OperationDefaults, useOperationForm } from './useOperationForm'

/**
 * Ce qu'on enregistre, du point de vue de qui le fait.
 *
 * Le modèle n'a que deux sens, et c'est juste : un virement d'épargne sort bien
 * du compte. Mais l'écran demandait le sens, si bien que mettre 200 € de côté
 * passait par « Dépense » et allait chercher « Livrets » entre les courses et
 * le carburant. On ne dépense pas son épargne, on la déplace — et l'épargne a
 * donc sa position, d'où l'écran déduit le sens.
 */
const natures = () => [
  { value: 'expense' as const, label: t.entry.natureExpense },
  { value: 'income' as const, label: t.entry.natureIncome },
  { value: 'saving' as const, label: t.entry.natureSaving },
]

/**
 * Les deux sens d'un mouvement d'épargne. Le second n'existait pas : on pouvait
 * verser sur un livret, jamais y reprendre — l'écran n'offrait alors que des
 * catégories de revenus, et un retrait de livret n'en est pas un.
 */
const movements = () => [
  { value: 'out' as const, label: t.entry.savingIn },
  { value: 'in' as const, label: t.entry.savingOut },
]

const rhythms = () => [
  { value: 'once' as const, label: t.entry.once },
  { value: 'recurring' as const, label: t.entry.recurring },
]

const amountKinds = () => [
  { value: 'fixed' as const, label: t.recurrences.fixedAmount },
  { value: 'variable' as const, label: t.recurrences.variable },
]

/**
 * Le titre : générique à la création, précis en reprise.
 *
 * À la création, la nature et le rythme se changent d'un doigt — un titre qui
 * suivrait les six combinaisons donnerait l'impression de changer d'écran sans
 * bouger, et « Ajouter une récurrence » s'affichait déjà au-dessus d'un
 * formulaire qu'un seul geste ramenait au ponctuel. Ce qu'on enregistre se lit
 * sur les bascules, juste dessous.
 *
 * En reprise, rien ne bouge plus : ni la nature ni le rythme ne se changent, et
 * le titre peut donc dire précisément ce qu'on est en train de modifier.
 */
function titleFor(operation: Operation | null, nature: EntryNature): string {
  if (operation === null) return t.entry.addOperation
  if (operation.kind === 'recurrence') return t.recurrences.edit
  if (nature === 'saving') return t.entry.editSaving
  return nature === 'income' ? t.entry.editIn : t.entry.editOut
}

export type OperationFormProps = {
  /** Ce qu'on reprend, ou `null` pour une création. */
  operation: Operation | null
  /** Ce que la porte d'entrée transmet, et tout ce qu'elle transmet. */
  defaults: OperationDefaults
  /** Où l'on repart, une fois enregistré ou renoncé. */
  onDone: () => void
  /** Les gestes propres à ce qu'on reprend, à côté d'« Annuler ». */
  actions?: ReactNode
  /** Ce qui ne se mêle pas aux boutons qui closent la saisie — la suppression. */
  footer?: ReactNode
}

/**
 * Le formulaire de saisie — **le** formulaire, au singulier.
 *
 * Il y en avait deux : celui d'une entrée et celui d'une récurrence. Deux
 * écritures d'un même geste — décrire une opération —, qui ne différaient que
 * par la case « ça se répète ». Elles avaient donc divergé : ordre des champs,
 * libellés, messages d'erreur, champs présents d'un côté et absents de l'autre,
 * et une correction sur deux qui n'atteignait qu'une moitié des utilisateurs.
 *
 * Il n'en reste qu'un, et les portes d'entrée ne transmettent que des valeurs
 * initiales : nature présélectionnée et rythme ponctuel depuis « Ajouter une
 * dépense », rythme récurrent depuis « Ajouter une récurrence ». Rien à l'écran
 * ne dit par où l'on est passé, et c'est le but : il n'existe pas deux sortes
 * de récurrences.
 *
 * C'est un écran plein, pas une feuille : le formulaire tient d'un seul tenant,
 * sans rien à faire glisser ni couche à refermer pour revenir au mois.
 */
export function OperationForm({
  operation,
  defaults,
  onDone,
  actions,
  footer,
}: OperationFormProps) {
  const members = useMembers()
  const supports = useActiveSavingSupports()
  const { draft, patch, errors, needsMember, optionalAmount, supportMode, firstDuePaid, build } =
    useOperationForm(operation, defaults)
  const guard = useLeaveGuard(draft, onDone)
  /* Le support créé revient présélectionné : c'est la seule façon que la
     création inline ne coûte pas une seconde manipulation. */
  const sheet = useSupportCreateSheet((savingSupportId) => {
    patch({ savingSupportId })
  })

  const submit = (): void => {
    const built = build()
    if (built === null) return
    saveOperation(built, operation)
    onDone()
  }

  /* Seulement à la création. Convertir après coup une dépense passée en
     récurrence — ou l'inverse — réécrirait un historique, et c'est une autre
     histoire que celle de cet écran. */
  const canSwitchRhythm = operation === null

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <PageTitle title={titleFor(operation, draft.nature)} onBack={guard.request} />

      <form
        id="operation-form"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <Tile className="gap-4">
          {/* Les trois choix, dans l'ordre où ils se posent : ce que
              j'enregistre, à quel rythme, et — seulement alors, parce que la
              question n'existe pas ailleurs — quel genre de montant. */}
          <div className="flex flex-wrap gap-2">
            <Segmented
              options={natures()}
              value={draft.nature}
              onChange={(nature) => {
                /* Le brouillon vide seul la catégorie et le support — voir
                   `patch` : une catégorie de charge restée en place sur une
                   saisie d'épargne serait enregistrée telle quelle. L'épargne
                   arrive en versement, c'est le geste courant ; on n'y reprend
                   qu'exceptionnellement. */
                patch({ nature, direction: nature === 'income' ? 'in' : 'out' })
              }}
              label={t.entry.nature}
            />

            {/* Les deux sens d'un mouvement d'épargne. Ailleurs, le sens
                découle de la nature et n'a pas à être demandé. */}
            {draft.nature === 'saving' && (
              <Segmented
                options={movements()}
                value={draft.direction}
                onChange={(direction) => {
                  patch({ direction })
                }}
                label={t.entry.savingMovement}
              />
            )}

            {canSwitchRhythm && (
              <Segmented
                options={rhythms()}
                value={draft.recurring ? 'recurring' : 'once'}
                onChange={(rhythm) => {
                  patch({ recurring: rhythm === 'recurring' })
                }}
                label={t.entry.rhythm}
              />
            )}

            {/* Une opération ponctuelle a toujours un montant : la question ne
                se pose qu'à une règle, qui peut laisser chaque échéance le
                sien. */}
            {draft.recurring && (
              <Segmented
                options={amountKinds()}
                value={draft.variable ? 'variable' : 'fixed'}
                onChange={(kind) => {
                  patch({ variable: kind === 'variable' })
                }}
                label={t.recurrences.form.amountKind}
              />
            )}
          </div>

          <Field
            label={t.entry.amount}
            {...(optionalAmount
              ? { optional: true, hint: t.entry.variableAmountHint }
              : { required: true })}
            {...(errors.amount ? { error: errors.amount } : {})}
          >
            {(id, describedBy) => (
              <AmountInput
                id={id}
                aria-describedby={describedBy}
                value={draft.amountText}
                invalid={Boolean(errors.amount)}
                placeholder="0,00"
                autoFocus
                onChange={(e) => {
                  patch({ amountText: e.target.value })
                }}
              />
            )}
          </Field>

          {/* En épargne, la question est « où va l'argent » et le support y
              répond seul : il porte le poste et la personne. Ailleurs, c'est la
              catégorie qui dit la nature du mouvement. Jamais les deux. */}
          {supportMode ? (
            supports.length === 0 ? (
              <Field label={t.savings.support} required>
                {() => (
                  <div className="flex flex-col items-start gap-2">
                    <p className="t-label">{t.savings.supportNone}</p>
                    <Button type="button" variant="secondary" size="sm" onClick={sheet.open}>
                      {t.savings.supportCreateFirst}
                    </Button>
                  </div>
                )}
              </Field>
            ) : (
              <Field
                label={t.savings.support}
                required
                {...(errors.support ? { error: errors.support } : {})}
              >
                {(id, describedBy) => (
                  <div className="flex flex-col items-start gap-2">
                    <SupportSelect
                      id={id}
                      aria-describedby={describedBy}
                      value={draft.savingSupportId}
                      invalid={Boolean(errors.support)}
                      onChange={(e) => {
                        patch({ savingSupportId: e.target.value })
                      }}
                    />
                    {/* Créer sans quitter la saisie : partir vers la page
                        Épargne perdrait le montant et la date déjà tapés. */}
                    <Button type="button" variant="ghost" size="sm" onClick={sheet.open}>
                      {t.savings.supportCreateFirst}
                    </Button>
                  </div>
                )}
              </Field>
            )
          ) : (
            <Field label={t.entry.category} required {...(errors.category ? { error: errors.category } : {})}>
              {(id, describedBy) => (
                <CategorySelect
                  id={id}
                  aria-describedby={describedBy}
                  direction={draft.direction}
                  kinds={kindsOfNature(draft.nature)}
                  value={draft.categoryId}
                  onChange={(e) => {
                    patch({ categoryId: e.target.value })
                  }}
                />
              )}
            </Field>
          )}

          {/* Un seul champ de date, dont le libellé suit le rythme : en
              récurrence, la date saisie est la première échéance. C'est elle
              aussi qui préremplit le jour du mois et le jour de la semaine —
              « le 1er mars » répond déjà à « quel jour du mois ». */}
          <Field
            label={draft.recurring ? t.entry.firstDate : t.entry.date}
            required
            {...(draft.recurring && operation === null
              ? { hint: firstDuePaid ? t.entry.firstDatePaid : t.entry.firstDatePlanned }
              : {})}
          >
            {(id, describedBy) => (
              <DateInput
                id={id}
                aria-describedby={describedBy}
                                value={draft.startedOn}
                onChange={(e) => {
                  if (e.target.value !== '') patch({ startedOn: e.target.value })
                }}
              />
            )}
          </Field>

          {draft.recurring && <PeriodFields draft={draft} patch={patch} />}

          <Field label={t.entry.label} required {...(errors.label ? { error: errors.label } : {})}>
            {(id, describedBy) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                value={draft.label}
                invalid={Boolean(errors.label)}
                placeholder={
                  draft.recurring ? t.entry.labelPlaceholderRecurring : t.entry.labelPlaceholder
                }
                maxLength={60}
                onChange={(e) => {
                  patch({ label: e.target.value })
                }}
              />
            )}
          </Field>

          {/* Le propriétaire ne se demande pas en épargne : il vient du
              support, et un second champ laisserait poser un versement sur le
              livret d'Andrea au nom de Marie. */}
          {members.length > 0 && !supportMode && (
            /* La phrase sert d'aide tant qu'on n'a pas essayé d'enregistrer,
               puis d'erreur : c'est la même, et elle dit pourquoi ce champ,
               facultatif ailleurs, ne l'est pas ici. */
            <Field
              label={t.entry.member}
              {...(needsMember
                ? {
                    required: true,
                    hint: draft.recurring
                      ? t.entry.memberRequiredRecurring
                      : t.entry.memberRequired,
                  }
                : { optional: true })}
              {...(errors.member ? { error: errors.member } : {})}
            >
              {(id, describedBy) => (
                <Select
                  id={id}
                  aria-describedby={describedBy}
                  value={draft.memberId}
                  invalid={Boolean(errors.member)}
                  onChange={(e) => {
                    patch(memberPatch(e.target.value))
                  }}
                >
                  <option value="">{t.shell.everyone}</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}

          {/* `SharedField` décide seul de son affichage : il ne se montre que
              sur une sortie de nature charge ou dette. L'épargne et le revenu
              n'ont donc rien à écarter ici — ils tombent sous la même règle,
              au même endroit, pour la même raison. */}
          <SharedField
            categoryId={draft.categoryId}
            memberId={draft.memberId}
            value={draft.shared}
            onChange={(shared) => {
              patch({ shared })
            }}
          />

          {/* La note se lit sur la ligne du mois et se cherche depuis
              l'historique. En dernier : c'est le champ dont on se passe. */}
          <Field label={t.entry.note} optional>
            {(id) => (
              <TextInput
                id={id}
                value={draft.note}
                placeholder={
                  draft.recurring ? t.entry.notePlaceholderRecurring : t.entry.notePlaceholder
                }
                maxLength={140}
                onChange={(e) => {
                  patch({ note: e.target.value })
                }}
              />
            )}
          </Field>
        </Tile>
      </form>

      <div className="flex flex-wrap gap-2">
        {/* Le bouton nomme ce qui va être créé : c'est le dernier endroit où le
            dire, et le seul qui ne change plus rien après. En reprise, il n'y a
            rien à nommer — on enregistre ce qui existe déjà. */}
        <Button type="submit" form="operation-form">
          {operation !== null
            ? t.common.save
            : draft.recurring
              ? t.entry.saveRecurrence
              : t.entry.saveOperation}
        </Button>
        <Button variant="secondary" onClick={guard.request}>
          {t.common.cancel}
        </Button>
        {actions}
      </div>

      {footer}

      {/* Montée seulement là où elle peut s'ouvrir : une saisie de dépense n'a
          aucun support à créer, et une feuille fermée reste un formulaire posé
          dans la page. */}
      {supportMode && <SupportCreateSheet {...sheet.props} />}
      <ConfirmDialog {...guard.dialog} />
    </div>
  )
}
