/* ============================================================================
 * Le brouillon d'un objectif — l'état et la validation, à un seul endroit.
 *
 * Trois questions obligatoires : ce qu'on vise, pour qui, combien. Le reste est
 * facultatif, et son absence a un sens à chaque fois — pas d'échéance veut dire
 * « je l'atteindrai quand je l'atteindrai », pas de compte veut dire « je n'ai
 * pas encore décidé où », pas de versement engagé veut dire « ce sont mes
 * règles qui disent le rythme ».
 *
 * Rien de ce qui se calcule n'est ici : ni capital, ni taux, ni date d'arrivée.
 * C'est ce qui rend l'objet tenable — voir `SavingGoal`.
 * ==========================================================================*/

import { useMemo, useState } from 'react'
import { type Money, parseAmount, toAmountInput } from '@/domain/money'
import type { SavingGoal } from '@/domain/types'
import type { SavingGoalInput } from '@/domain/updates'
import { t } from '@/i18n/strings'
import { supports } from '@/i18n/supports'

export type GoalDraft = {
  label: string
  memberId: string
  targetText: string
  /** Le mois visé, au format `YYYY-MM`. Vide = aucun cap dans le temps. */
  targetOn: string
  supportIds: string[]
  /** Vide veut dire « lis-le sur mes règles », jamais « zéro ». */
  monthlyText: string
}

export type GoalErrors = Partial<Record<'label' | 'member' | 'target' | 'monthly', string>>

export function emptyGoalDraft(defaults: { memberId?: string } = {}): GoalDraft {
  return {
    label: '',
    memberId: defaults.memberId ?? '',
    targetText: '',
    targetOn: '',
    supportIds: [],
    monthlyText: '',
  }
}

export function goalDraftFrom(goal: SavingGoal): GoalDraft {
  return {
    label: goal.label,
    memberId: goal.memberId,
    targetText: toAmountInput(goal.target),
    targetOn: goal.targetOn ?? '',
    supportIds: [...goal.supportIds],
    monthlyText: goal.monthly === undefined ? '' : toAmountInput(goal.monthly),
  }
}

export type GoalDraftState = {
  draft: GoalDraft
  patch: (next: Partial<GoalDraft>) => void
  /** Les erreurs à afficher — vides tant qu'on n'a pas essayé d'enregistrer. */
  errors: GoalErrors
  /** Le payload prêt pour le domaine, ou `null` si quelque chose manque. */
  build: () => SavingGoalInput | null
}

export function useGoalDraft(initial: GoalDraft): GoalDraftState {
  const [draft, setDraft] = useState<GoalDraft>(initial)
  const [showErrors, setShowErrors] = useState(false)

  const target: Money | null = useMemo(() => parseAmount(draft.targetText), [draft.targetText])
  const monthly: Money | null = useMemo(() => parseAmount(draft.monthlyText), [draft.monthlyText])
  const typedMonthly = draft.monthlyText.trim() !== ''

  const errors: GoalErrors = useMemo(() => {
    const found: GoalErrors = {}
    if (draft.label.trim() === '') found.label = supports.goalLabelRequired
    if (draft.memberId === '') found.member = t.savings.supportOwnerRequired
    /* Strictement positif : « viser zéro euro » n'est pas un cap, et une jauge
       sans dénominateur ne veut rien dire — c'est la règle de `savingRate` et
       de `savingCoverage`, appliquée à l'objectif. */
    if (target === null || target <= 0) found.target = supports.goalTargetRequired
    /* Même règle que le plafond d'un support : un versement engagé nul n'est
       pas un engagement, c'est l'absence d'engagement — et c'est déjà ce que le
       champ vide veut dire. */
    if (typedMonthly && (monthly === null || monthly <= 0)) {
      found.monthly = supports.goalMonthlyInvalid
    }
    return found
  }, [draft.label, draft.memberId, target, typedMonthly, monthly])

  return {
    draft,
    patch: (next) => {
      setDraft((current) => ({ ...current, ...next }))
    },
    errors: showErrors ? errors : {},
    build: () => {
      setShowErrors(true)
      if (Object.keys(errors).length > 0 || target === null) return null
      return {
        label: draft.label.trim(),
        memberId: draft.memberId,
        supportIds: draft.supportIds,
        target,
        ...(draft.targetOn === '' ? {} : { targetOn: draft.targetOn }),
        ...(typedMonthly && monthly !== null && monthly > 0 ? { monthly } : {}),
      }
    },
  }
}
