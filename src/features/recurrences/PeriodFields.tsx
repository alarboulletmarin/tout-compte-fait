import { fr } from '@/i18n/fr'
import { Field, Select, TextInput } from '@/ui/Field'
import { LAST_DAY, PERIOD_OPTIONS, type PeriodDraft, type PeriodKind } from './period'

/* Quelles questions une périodicité pose encore : un jour de la semaine, ou un
   jour du mois. Une annuelle ne pose ni l'un ni l'autre — sa date entière est
   celle de la première échéance. Déclaré ici plutôt qu'en conditions inversées
   dans le rendu : « ni hebdomadaire ni annuelle » avait déjà cessé d'être vrai
   à l'arrivée de deux périodicités de plus. */
const WEEKLY_KINDS: PeriodKind[] = ['weekly', 'everyNWeeks']
const MONTH_DAY_KINDS: PeriodKind[] = ['monthly', 'quarterly', 'everyNMonths']

export type PeriodFieldsProps = {
  draft: PeriodDraft
  patch: (next: Partial<PeriodDraft>) => void
}

/**
 * Ce que la périodicité demande, et rien d'autre.
 *
 * La date de première échéance n'est pas ici : c'est le champ de date de la
 * saisie, qui existe dans les deux rythmes et ne change que de libellé. Deux
 * champs de date auraient posé deux fois la même question.
 *
 * Le jour du mois et le jour de la semaine, eux, sont préremplis depuis cette
 * date-là — voir `patch` dans `useOperationForm`. « Première échéance le 1er
 * mars » répond déjà à « quel jour du mois ».
 */
export function PeriodFields({ draft, patch }: PeriodFieldsProps) {
  return (
    <>
      <Field label={fr.recurrences.form.period} required>
        {(id) => (
          <Select
            id={id}
            value={draft.kind}
            onChange={(e) => {
              patch({ kind: e.target.value as PeriodDraft['kind'] })
            }}
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        )}
      </Field>

      {WEEKLY_KINDS.includes(draft.kind) && (
        <Field label={fr.recurrences.form.weekday} required>
          {(id) => (
            <Select
              id={id}
              value={String(draft.weekday)}
              onChange={(e) => {
                patch({ weekday: Number(e.target.value) })
              }}
            >
              {fr.calendarNames.weekdays.map((day, index) => (
                <option key={day} value={index + 1}>
                  {day}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}

      {/* Les trois « tous les n » partagent une seule écriture : c'est le même
          champ à trois unités près, et trois copies auraient fini par diverger
          d'une borne ou d'un arrondi. */}
      {draft.kind === 'everyNWeeks' && (
        <IntervalField
          label={fr.recurrences.form.everyWeeks}
          max={52}
          value={draft.everyWeeks}
          onChange={(everyWeeks) => {
            patch({ everyWeeks })
          }}
        />
      )}

      {draft.kind === 'everyNMonths' && (
        <IntervalField
          label={fr.recurrences.form.everyMonths}
          max={24}
          value={draft.everyMonths}
          onChange={(everyMonths) => {
            patch({ everyMonths })
          }}
        />
      )}

      {draft.kind === 'everyNYears' && (
        <IntervalField
          label={fr.recurrences.form.everyYears}
          max={10}
          value={draft.everyYears}
          onChange={(everyYears) => {
            patch({ everyYears })
          }}
        />
      )}

      {/* Un quantième tient sur deux chiffres : le plafond des champs bornés
          (`ui/Field`) est encore quinze fois trop large pour lui, et c'est avec
          l'intervalle le seul endroit de l'app où il l'est. */}
      {MONTH_DAY_KINDS.includes(draft.kind) && (
        <Field label={fr.recurrences.form.monthDay} required hint={fr.recurrences.form.monthDayHint}>
          {(id, describedBy) => (
            <TextInput
              id={id}
              type="number"
              className="max-w-24"
              min={1}
              max={LAST_DAY}
              aria-describedby={describedBy}
              value={String(draft.monthDay)}
              onChange={(e) => {
                patch({ monthDay: Math.min(LAST_DAY, Math.max(1, Number(e.target.value) || 1)) })
              }}
            />
          )}
        </Field>
      )}
    </>
  )
}

/** Le « tous les combien » d'une périodicité, quelle que soit son unité. */
function IntervalField({
  label,
  max,
  value,
  onChange,
}: {
  label: string
  max: number
  value: number
  onChange: (value: number) => void
}) {
  return (
    /* « Tous les 2 mois » : deux chiffres, comme le quantième. */
    <Field label={label} required>
      {(id) => (
        <TextInput
          id={id}
          type="number"
          className="max-w-24"
          min={1}
          max={max}
          value={String(value)}
          onChange={(e) => {
            onChange(Math.min(max, Math.max(1, Number(e.target.value) || 1)))
          }}
        />
      )}
    </Field>
  )
}
