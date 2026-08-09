/* ============================================================================
 * La lecture en euros d'aujourd'hui — éteinte par défaut, et signalée quand elle
 * est allumée.
 *
 * Elle change le sens de **tous** les chiffres de l'écran, ce qui est la raison
 * pour laquelle elle ne se coche pas dans un coin sans que rien ne le redise
 * à côté de la courbe (voir `constantOn`).
 *
 * Partagée par les deux lectures pour la même raison que l'horizon : c'est une
 * façon de lire, pas une propriété de la question posée.
 * ==========================================================================*/

import { projection } from '@/i18n/projection'
import { Checkbox, Field, TextInput } from '@/ui/Field'
import { Tile } from '@/ui/Tile'
import type { Patch, ProjectionDraft } from './model'

export function ConstantMoney({
  draft,
  patch,
  error,
}: {
  draft: ProjectionDraft
  patch: Patch
  error?: string
}) {
  return (
    <Tile className="gap-3">
      <Checkbox
        checked={draft.constant}
        onChange={(constant) => {
          patch({ constant })
        }}
        label={projection.constant}
        hint={projection.constantHint}
      />
      {draft.constant && (
        <Field label={projection.inflation} {...(error === undefined ? {} : { error })}>
          {(id, describedBy) => (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              className="max-w-24"
              inputMode="decimal"
              value={draft.inflationText}
              invalid={error !== undefined}
              onChange={(e) => {
                patch({ inflationText: e.target.value })
              }}
            />
          )}
        </Field>
      )}
    </Tile>
  )
}
