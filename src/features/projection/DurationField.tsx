/* ============================================================================
 * La durée : une liste, et un champ pour ce qu'elle ne dit pas.
 *
 * **La forme d'un champ, et non celle d'une bascule.** Quatre raccourcis et un
 * cinquième segment tenaient dans une pilule de quatre cent quatre-vingt-dix
 * pixels de rayon, qui passait à la ligne sous 400 points : un pavé arrondi de
 * deux rangées, posé entre trois champs à douze pixels de rayon. Deux langages
 * de formes sur la même carte, et le plus bruyant portait le réglage le moins
 * intéressant — on choisit un horizon une fois, on retouche un versement dix
 * fois. La liste déroulante en fait une ligne, à la forme des champs voisins.
 *
 * Le cinquième choix ouvre le champ libre, et le champ revient de lui-même sur
 * une durée hors raccourci : sans quoi sept ans reviendraient d'une visite à
 * l'autre sans rien pour les relire.
 *
 * **Sans grille à lui** : ce sont des cases dans celle de l'écran, où la durée
 * se pose à côté du rendement. Une boîte ici l'aurait renvoyée sous les autres
 * champs, sur une rangée à elle.
 * ==========================================================================*/

import { useState } from 'react'
import { tpl } from '@/i18n/format'
import { projection } from '@/i18n/projection'
import { Field, Select, TextInput } from '@/ui/Field'
import { YEAR_PRESETS, isPreset } from './model'

/** La valeur du dernier choix — celui qui ouvre le champ. */
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
    <>
      <Field label={projection.duration}>
        {(id) => (
          <Select
            id={id}
            className="min-w-0 max-w-48"
            value={showField ? CUSTOM : String(years)}
            onChange={(event) => {
              const value = event.target.value
              if (value === CUSTOM) {
                setCustom(true)
                return
              }
              setCustom(false)
              onChange(Number(value))
            }}
          >
            {YEAR_PRESETS.map((preset) => (
              <option key={preset} value={preset}>
                {tpl(projection.durationPreset, preset)}
              </option>
            ))}
            <option value={CUSTOM}>{projection.durationOther}</option>
          </Select>
        )}
      </Field>

      {showField && (
        <Field label={projection.durationYears} {...(error === undefined ? {} : { error })}>
          {(id, describedBy) => (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              className="min-w-0 max-w-24"
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
    </>
  )
}
