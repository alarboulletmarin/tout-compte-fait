import { describe, expect, it } from 'vitest'
import type { Period } from '@/domain/types'
import { t } from '@/i18n/strings'
import {
  LAST_DAY,
  type PeriodDraft,
  describePeriod,
  kindOf,
  monthlyDraftFrom,
  periodOf,
} from './period'

const START = '2026-03-15'

function draft(patch: Partial<PeriodDraft> = {}): PeriodDraft {
  return { ...monthlyDraftFrom(START), ...patch }
}

describe('kindOf — l’option qui décrit une période', () => {
  const cases: [Period, string][] = [
    [{ unit: 'week', every: 1, anchorDay: 1 }, 'weekly'],
    [{ unit: 'week', every: 2, anchorDay: 1 }, 'everyNWeeks'],
    [{ unit: 'month', every: 1, anchorDay: 5 }, 'monthly'],
    [{ unit: 'month', every: 3, anchorDay: 5 }, 'quarterly'],
    [{ unit: 'month', every: 4, anchorDay: 5 }, 'everyNMonths'],
    [{ unit: 'year', every: 1, anchorDay: 15 }, 'yearly'],
    [{ unit: 'year', every: 3, anchorDay: 15 }, 'everyNYears'],
  ]

  it.each(cases)('range %o sous %s', (period, expected) => {
    expect(kindOf(period)).toBe(expected)
  })
})

describe('l’aller-retour formulaire ↔ modèle', () => {
  /* Le cœur du bug : le formulaire renvoie l'état complet de ce qu'il montre
     (cahier §3), donc ce qu'il ne sait pas montrer s'efface à l'enregistrement.
     Une quinzaine importée s'affichait juste et se faisait réécrire en
     hebdomadaire à la première reprise de sa fiche, en silence. */
  const periods: Period[] = [
    { unit: 'week', every: 1, anchorDay: 3 },
    { unit: 'week', every: 2, anchorDay: 3 },
    { unit: 'week', every: 6, anchorDay: 7 },
    { unit: 'month', every: 1, anchorDay: 5 },
    { unit: 'month', every: 3, anchorDay: 5 },
    { unit: 'month', every: 4, anchorDay: 28 },
    { unit: 'year', every: 1, anchorDay: 15 },
    { unit: 'year', every: 3, anchorDay: 15 },
  ]

  it.each(periods)('rend %o inchangée', (period) => {
    const reopened = draft({
      kind: kindOf(period),
      ...(period.unit === 'week' ? { weekday: period.anchorDay, everyWeeks: period.every } : {}),
      ...(period.unit === 'month' ? { monthDay: period.anchorDay, everyMonths: period.every } : {}),
      ...(period.unit === 'year' ? { everyYears: period.every } : {}),
    })
    expect(periodOf(reopened)).toEqual(period)
  })

  /* Le jour d'une annuelle vient de la date de première échéance, jamais d'un
     champ à part : deux endroits pour un même jour finiraient par diverger. */
  it('tire le jour d’une annuelle de sa date de départ', () => {
    expect(periodOf(draft({ kind: 'yearly' })).anchorDay).toBe(15)
  })

  it('refuse un intervalle nul ou négatif plutôt que de poser une période folle', () => {
    expect(periodOf(draft({ kind: 'everyNWeeks', everyWeeks: 0 })).every).toBe(1)
    expect(periodOf(draft({ kind: 'everyNYears', everyYears: -3 })).every).toBe(1)
  })
})

describe('describePeriod', () => {
  it('nomme le dernier jour du mois au lieu d’annoncer un 31 qui ne tombe pas', () => {
    const summary = describePeriod({ unit: 'month', every: 1, anchorDay: LAST_DAY }, START)
    expect(summary).toContain(t.recurrences.summary.lastDay)
    expect(summary).not.toContain('31')
  })

  it('garde le jour quand il tombe vraiment', () => {
    expect(describePeriod({ unit: 'month', every: 1, anchorDay: 5 }, START)).toContain('5')
  })

  it('dit l’intervalle des périodicités qui en ont un', () => {
    expect(describePeriod({ unit: 'week', every: 2, anchorDay: 1 }, START)).toContain('2')
    expect(describePeriod({ unit: 'year', every: 3, anchorDay: 15 }, START)).toContain('3')
  })
})
