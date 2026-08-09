/* ============================================================================
 * L'horizon — quatre raccourcis, et un champ qui reste la vérité.
 *
 * Les pilules **règlent** le champ, elles ne le remplacent pas : sans lui, un
 * horizon de sept ans serait inatteignable, et aucune pilule n'est alors active,
 * ce que `Segmented` sait faire.
 *
 * Partagé par les deux lectures de l'écran depuis qu'il y en a deux : une durée
 * saisie sous « Mes supports » vaut sous « Chiffres libres », et deux contrôles
 * pour la même question auraient fini par ne plus proposer les mêmes raccourcis.
 * ==========================================================================*/

import { tpl } from '@/i18n/format'
import { projection } from '@/i18n/projection'
import { Field, TextInput } from '@/ui/Field'
import { Segmented } from '@/ui/Segmented'
import { type Patch, type ProjectionDraft, YEAR_PRESETS } from './model'

export function YearsField({
  draft,
  patch,
  error,
}: {
  draft: ProjectionDraft
  patch: Patch
  error?: string
}) {
  return (
    <div className="flex flex-col gap-3">
      <Segmented
        options={YEAR_PRESETS.map((years) => ({
          value: String(years),
          label: tpl(projection.durationPreset, years),
        }))}
        value={String(draft.years)}
        onChange={(value) => {
          patch({ years: Number(value) })
        }}
        label={projection.duration}
        className="w-fit"
      />
      <Field label={projection.durationYears} {...(error === undefined ? {} : { error })}>
        {(id, describedBy) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            className="max-w-24"
            inputMode="numeric"
            value={String(draft.years)}
            invalid={error !== undefined}
            onChange={(e) => {
              patch({ years: Number(e.target.value.replace(/\D/g, '')) })
            }}
          />
        )}
      </Field>
    </div>
  )
}
