/* ============================================================================
 * Créer un objectif, ou en corriger un.
 *
 * Un seul écran pour les deux, comme la fiche d'un membre ou celle d'un
 * support : ce sont les mêmes champs, la même validation et le même retour, et
 * deux composants auraient fini par ne plus poser les mêmes questions.
 *
 * **Trois questions, et rien de ce qui se calcule.** Pas de capital, pas de
 * taux, pas de date d'arrivée : ils vivent déjà sur les comptes, datés, et les
 * redemander ici en ferait autant de secondes vérités (voir `SavingGoal`). Ce
 * qui reste tient sur un écran de téléphone sans replier quoi que ce soit —
 * c'est précisément ce qui rend l'objet tenable.
 *
 * **Les comptes se cochent, ils ne se saisissent pas.** C'est le lien au réel,
 * et le seul : sans lui, l'objectif n'a ni capital, ni versement, ni
 * rendement — l'écran le dit plutôt que d'afficher zéro.
 *
 * **C'est aussi ici que l'objectif se gère**, en fin d'écran : ranger, reprendre,
 * supprimer. Des gestes rares, dont l'un est destructif — le motif de la fiche
 * d'un support.
 * ==========================================================================*/

import { useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PEOPLE_PATH, SAVINGS_PATH, goalPath } from '@/app/routes'
import { isValidYm } from '@/domain/date'
import { money, toAmountInput } from '@/domain/money'
import type { SavingGoal } from '@/domain/types'
import { t } from '@/i18n/strings'
import { supports } from '@/i18n/supports'
import {
  addSavingGoal,
  archiveSavingGoal,
  removeSavingGoal,
  replaceSavingGoal,
  undoable,
} from '@/store/actions'
import { useMembers, useSavingGoal, useScopedSavingSupports } from '@/store/selectors'
import { Button } from '@/ui/Button'
import { ConfirmDialog } from '@/ui/ConfirmDialog'
import { EmptyState } from '@/ui/EmptyState'
import { Eyebrow } from '@/ui/Eyebrow'
import { AmountInput, Checkbox, Field, Select, TextInput } from '@/ui/Field'
import { PageTitle } from '@/ui/PageTitle'
import { Tile } from '@/ui/Tile'
import { toast } from '@/ui/toast'
import { useLeaveGuard } from '@/ui/useLeaveGuard'
import { type GoalDraft, emptyGoalDraft, goalDraftFrom, useGoalDraft } from './goalDraft'
import { IndividualScope } from './IndividualScope'

/* Sous la même portée que l'écran d'épargne d'où l'on vient : la liste des
   comptes à rattacher (`useScopedSavingSupports`) se lit au nom de quelqu'un,
   et elle ne tenait jusqu'ici que parce que l'écran précédent écrasait le
   filtre du mois. */
export function GoalFormPage() {
  return (
    <IndividualScope>
      <GoalFormPageContent />
    </IndividualScope>
  )
}

function GoalFormPageContent() {
  const { id } = useParams()
  const goal = useSavingGoal(id)
  const [params] = useSearchParams()

  // Supprimé depuis un autre onglet, ou URL fausse.
  if (id !== undefined && goal === null) return <Navigate to={SAVINGS_PATH} replace />

  /* La clef porte l'identité : le brouillon vit en état local, et passer d'un
     objectif à l'autre sans remonter le composant y laisserait le précédent. */
  return (
    <GoalForm
      key={goal?.id ?? 'nouveau'}
      {...(goal === null ? {} : { goal })}
      seed={seedFrom(params)}
    />
  )
}

/**
 * Ce que le simulateur envoie, relu et borné — parce qu'une URL vient du dehors.
 *
 * La même méfiance que `readDraft` applique au brouillon local et que
 * `validate.ts` applique à un document importé : un lien s'édite dans la barre
 * d'adresse, et un montant illisible n'a pas à faire d'un formulaire un écran
 * cassé. Ce qui ne se lit pas est simplement absent, et le champ reste vide.
 */
function seedFrom(params: URLSearchParams): Partial<GoalDraft> {
  const cents = (value: string | null): number | null => {
    const parsed = Number(value)
    return value !== null && Number.isInteger(parsed) && parsed > 0 ? parsed : null
  }
  const target = cents(params.get('cible'))
  const monthly = cents(params.get('versement'))
  const targetOn = params.get('echeance')
  const supportIds = (params.get('comptes') ?? '').split(',').filter((one) => one !== '')
  const memberId = params.get('titulaire')

  return {
    ...(target === null ? {} : { targetText: toAmountInput(money(target)) }),
    ...(monthly === null ? {} : { monthlyText: toAmountInput(money(monthly)) }),
    ...(targetOn !== null && isValidYm(targetOn) ? { targetOn } : {}),
    ...(supportIds.length === 0 ? {} : { supportIds }),
    ...(memberId === null ? {} : { memberId }),
  }
}

function GoalForm({ goal, seed }: { goal?: SavingGoal; seed: Partial<GoalDraft> }) {
  const navigate = useNavigate()
  const members = useMembers()
  /* `accounts` et non `supports` : le catalogue de chaînes porte déjà ce nom
     dans ce fichier, et deux `supports` à deux lignes d'écart ne se relisent
     pas. */
  const accounts = useScopedSavingSupports()
  const editing = goal !== undefined
  const [removing, setRemoving] = useState(false)

  /* Le préréglage ne s'applique qu'à la **création** : rouvrir un objectif
     existant avec une URL qui porte une cible réécrirait ce qu'on vient
     corriger, et c'est exactement ce qu'un formulaire de modification ne doit
     pas faire. */
  const { draft, patch, errors, build } = useGoalDraft(
    editing
      ? goalDraftFrom(goal)
      : {
          ...emptyGoalDraft(members.length === 1 ? { memberId: members[0]?.id ?? '' } : {}),
          ...seed,
        },
  )

  const back = (): void => {
    void navigate(editing ? goalPath(goal.id) : SAVINGS_PATH)
  }
  const guard = useLeaveGuard(draft, back)

  const submit = (): void => {
    const input = build()
    if (input === null) return
    if (editing) {
      /* L'état complet de ce que l'écran montre, jamais un correctif : une
         échéance qu'on vient de vider doit disparaître du document. C'est la
         règle de `replaceRecurrence`. L'archivage ne se saisit pas sur ce
         formulaire — il a son geste, plus bas. */
      replaceSavingGoal(goal.id, { ...input, startedOn: goal.startedOn, archived: goal.archived })
      toast(supports.goalUpdated)
      void navigate(goalPath(goal.id))
      return
    }
    const created = addSavingGoal(input)
    toast(supports.goalAdded)
    void navigate(goalPath(created.id), { replace: true })
  }

  /* Sans personne, rien à enregistrer : une épargne est toujours à quelqu'un,
     et l'écran le dit plutôt que de proposer un champ vide — la même règle que
     pour un support, au même endroit du geste. */
  if (members.length === 0) {
    return (
      <div className="flex max-w-xl flex-col gap-5">
        <PageTitle title={supports.goalNew} onBack={back} />
        <EmptyState
          message={t.savings.supportsNoMember}
          actionLabel={t.split.goToSettings}
          onAction={() => {
            void navigate(PEOPLE_PATH)
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <PageTitle
        title={editing ? supports.goalEdit : supports.goalNew}
        onBack={guard.request}
      />

      <form
        id="goal-form"
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        {/* Les champs dans une tuile, comme sur l'écran d'un support
            (`SupportFormPage`) et comme partout où l'app fait remplir
            quelque chose : cet écran-ci n'en portait aucune, et ses
            champs — fond `--surface-2` — flottaient donc à même le fond
            de page, sans le cadre qui les rassemble ailleurs. */}
        <Tile className="gap-4">
          <Field
            label={supports.goalLabel}
            required
            {...(errors.label === undefined ? {} : { error: errors.label })}
          >
            {(id, describedBy) => (
              <TextInput
                id={id}
                aria-describedby={describedBy}
                value={draft.label}
                invalid={errors.label !== undefined}
                placeholder={supports.goalLabelPlaceholder}
                maxLength={40}
                autoFocus
                onChange={(event) => {
                  patch({ label: event.target.value })
                }}
              />
            )}
          </Field>

          <Field
            label={supports.goalOwner}
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
            label={supports.goalTarget}
            required
            {...(errors.target === undefined ? {} : { error: errors.target })}
          >
            {(id, describedBy) => (
              <AmountInput
                id={id}
                aria-describedby={describedBy}
                value={draft.targetText}
                invalid={errors.target !== undefined}
                onChange={(event) => {
                  patch({ targetText: event.target.value })
                }}
              />
            )}
          </Field>

          {/* L'échéance est facultative, et son absence a un sens : un cap sans
              date s'atteint quand il s'atteint. C'est elle, en revanche, qui fait
              exister le verdict — sans elle, l'app dit « quand », jamais « si ».
              Un `<input type="month">` et non deux sélecteurs : c'est le contrôle
              natif de ce qu'on saisit, il porte le clavier et le calendrier du
              système, et il rend exactement le `YYYY-MM` du modèle. */}
          <Field label={supports.goalDate} optional hint={supports.goalDateHint}>
            {(id, describedBy) => (
              /* Borné comme les deux montants de l'écran : un `YYYY-MM` a une
                 longueur connue, et pleine largeur il faisait sauter le bord
                 droit de la colonne une troisième fois. */
              <TextInput
                id={id}
                type="month"
                className="max-w-48"
                aria-describedby={describedBy}
                value={draft.targetOn}
                onChange={(event) => {
                  patch({ targetOn: event.target.value })
                }}
              />
            )}
          </Field>

          {/* Le lien au réel, et le seul : cocher un compte suffit à donner à
              l'objectif son capital, ses versements et son rendement. */}
          <fieldset className="flex flex-col gap-2">
            <legend className="t-label text-text">{supports.goalSupports}</legend>
            <p className="t-label">{supports.goalSupportsHint}</p>
            {accounts.length === 0 ? (
              <p className="t-label">{t.savings.supportsEmpty}</p>
            ) : (
              <div className="flex flex-col gap-2 pt-1">
                {accounts.map((support) => (
                  <Checkbox
                    key={support.id}
                    checked={draft.supportIds.includes(support.id)}
                    label={support.label}
                    onChange={(checked) => {
                      patch({
                        supportIds: checked
                          ? [...draft.supportIds, support.id]
                          : draft.supportIds.filter((one) => one !== support.id),
                      })
                    }}
                  />
                ))}
              </div>
            )}
          </fieldset>

          <Field
            label={supports.goalMonthly}
            optional
            hint={supports.goalMonthlyHint}
            {...(errors.monthly === undefined ? {} : { error: errors.monthly })}
          >
            {(id, describedBy) => (
              <AmountInput
                id={id}
                aria-describedby={describedBy}
                value={draft.monthlyText}
                invalid={errors.monthly !== undefined}
                onChange={(event) => {
                  patch({ monthlyText: event.target.value })
                }}
              />
            )}
          </Field>
        </Tile>

        <div className="flex flex-wrap gap-2">
          <Button type="submit">{t.common.save}</Button>
          <Button variant="secondary" onClick={guard.request}>
            {t.common.cancel}
          </Button>
        </div>
      </form>

      {/* La gestion, en fin d'écran : des gestes rares, dont l'un est
          destructif. Ils n'ont pas leur place au-dessus des champs qu'on vient
          corriger. */}
      {editing && (
        <Tile className="gap-3">
          <Eyebrow>{supports.goalManage}</Eyebrow>
          <p className="t-label">{supports.goalArchiveHint}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                undoable(
                  goal.archived ? supports.goalUnarchived : supports.goalArchived,
                  () => {
                    archiveSavingGoal(goal.id, !goal.archived)
                  },
                )
                void navigate(SAVINGS_PATH)
              }}
            >
              {goal.archived ? supports.goalUnarchive : supports.goalArchive}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setRemoving(true)
              }}
            >
              {supports.goalRemove}
            </Button>
          </div>
        </Tile>
      )}

      <ConfirmDialog
        open={removing}
        title={supports.goalRemove}
        steps={[{ question: supports.goalRemoveConfirm, action: t.common.delete }]}
        onCancel={() => {
          setRemoving(false)
        }}
        onConfirm={() => {
          setRemoving(false)
          if (!editing) return
          undoable(supports.goalRemoved, () => {
            removeSavingGoal(goal.id)
          })
          void navigate(SAVINGS_PATH)
        }}
      />

      <ConfirmDialog {...guard.dialog} />
    </div>
  )
}
