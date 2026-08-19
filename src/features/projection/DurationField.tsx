/* ============================================================================
 * La durée : quatre raccourcis, et un champ pour le reste.
 *
 * Sur la page et non dans une feuille — l'horizon est le deuxième réglage qu'on
 * tourne, et il valait un aller-retour modal pour quatre boutons. Le cinquième
 * segment ouvre le champ, et le champ revient de lui-même sur une durée hors
 * raccourci : sans quoi sept ans reviendraient d'une visite à l'autre sans rien
 * pour les relire.
 * ==========================================================================*/

import { useState } from 'react'
import { tpl } from '@/i18n/format'
import { projection } from '@/i18n/projection'
import { Field, TextInput } from '@/ui/Field'
import { Segmented } from '@/ui/Segmented'
import { YEAR_PRESETS, isPreset } from './model'

/** La valeur du cinquième segment — celui qui ouvre le champ. */
const CUSTOM = 'custom'

export type DurationFieldProps = {
  years: number
  onChange: (years: number) => void
  error?: string
}

export function DurationField({ years, onChange, error }: DurationFieldProps) {
  /* En état local et non dans le brouillon : ce qui doit survivre à une visite,
     c'est la **durée**, et une durée hors raccourci ramène son champ toute
     seule. Le garder dans le brouillon en aurait fait un second réglage pour une
     donnée qui en a déjà un. */
  const [custom, setCustom] = useState(false)
  const showField = custom || !isPreset(years)

  return (
    <div className="flex flex-col gap-1.5">
      {/* Le nom du réglage se voit, comme celui des champs voisins : une bascule
          dont le libellé ne vit que dans son étiquette accessible se lit à
          l'oreille et pas à l'œil, et la page en aligne trois. */}
      <p className="t-label text-text">{projection.duration}</p>
      <Segmented
        options={[
          ...YEAR_PRESETS.map((preset) => ({
            value: String(preset),
            label: tpl(projection.durationPreset, preset),
          })),
          { value: CUSTOM, label: projection.durationOther },
        ]}
        value={showField ? CUSTOM : String(years)}
        onChange={(value) => {
          if (value === CUSTOM) {
            setCustom(true)
            return
          }
          setCustom(false)
          onChange(Number(value))
        }}
        label={projection.duration}
      />

      {showField && (
        <Field label={projection.durationYears} {...(error === undefined ? {} : { error })}>
          {(id, describedBy) => (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              className="max-w-24"
              inputMode="numeric"
              value={String(years)}
              invalid={error !== undefined}
              onChange={(event) => {
                onChange(Number(event.target.value.replace(/\D/g, '')))
              }}
            />
          )}
        </Field>
      )}
    </div>
  )
}
