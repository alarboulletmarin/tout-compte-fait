/* ============================================================================
 * La cadence et les euros d'aujourd'hui — deux réglages, un repli.
 *
 * **Ce sont les deux seuls réglages qu'on ne tourne pas en arrivant.** Le
 * versement, l'horizon et le rendement se règlent à chaque visite ; la cadence
 * se décide une fois et l'inflation est une lecture qu'on demande. Les poser à
 * plat au milieu des autres aurait fait six contrôles pour trois questions —
 * c'est-à-dire l'écran qu'on vient de défaire.
 *
 * **Repliés, mais pas cachés** : le repli est sur la page, ouvert d'un appui, et
 * il annonce ce qu'il porte. La réserve du pied, elle, ne se replie jamais —
 * c'est la seule chose de cet écran qui soit vraie quels que soient les réglages.
 *
 * **Deux listes déroulantes, à la forme des champs.** Ce sont des choix à quatre
 * et à deux positions, qu'une bascule aurait posés en pavés de pilules sur deux
 * rangées ; ici la valeur courante se lit sur une ligne, et le reste s'ouvre.
 * La cadence n'est pas un détail d'affichage pour autant : le moteur capitalise,
 * donc 1 200 € versés une fois l'an ne valent pas 100 € versés douze fois, et
 * l'écart est exactement ce qu'on vient mesurer en la changeant.
 * ==========================================================================*/

import { projection } from '@/i18n/projection'
import { Field, Select, TextInput } from '@/ui/Field'
import { Unit } from './Unit'
import { PERIODS, type Period } from './model'

/** Le nom d'une cadence, et la valeur qu'elle porte en mois. */
const CADENCES = (): { value: Period; label: string }[] => [
  { value: 1, label: projection.cadenceMonthly },
  { value: 3, label: projection.cadenceQuarterly },
  { value: 6, label: projection.cadenceHalf },
  { value: 12, label: projection.cadenceYearly },
]

/** Les deux lectures, et elles s'excluent : euros du jour, ou euros d'aujourd'hui. */
const CURRENT = 'current'
const CONSTANT = 'constant'

export type OtherSettingsProps = {
  every: Period
  onEvery: (next: Period) => void
  constant: boolean
  onConstant: (next: boolean) => void
  inflationText: string
  onInflation: (next: string) => void
  error?: string
}

export function OtherSettings({
  every,
  onEvery,
  constant,
  onConstant,
  inflationText,
  onInflation,
  error,
}: OtherSettingsProps) {
  return (
    <div className="border-t border-border pt-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label={projection.cadence} hint={projection.cadenceHint}>
          {(id, describedBy) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              className="min-w-0 max-w-48"
              value={String(every)}
              onChange={(event) => {
                const found = PERIODS.find((one) => String(one) === event.target.value)
                if (found !== undefined) onEvery(found)
              }}
            >
              {CADENCES().map((cadence) => (
                <option key={cadence.value} value={cadence.value}>
                  {cadence.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label={projection.inflationAxis} hint={projection.inflationHint}>
          {(id, describedBy) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              className="min-w-0 max-w-48"
              value={constant ? CONSTANT : CURRENT}
              onChange={(event) => {
                onConstant(event.target.value === CONSTANT)
              }}
            >
              <option value={CURRENT}>{projection.inflationCurrent}</option>
              <option value={CONSTANT}>{projection.inflationConstant}</option>
            </Select>
          )}
        </Field>

        {constant && (
          <Field label={projection.inflation} {...(error === undefined ? {} : { error })}>
            {(id, describedBy) => (
              <Unit suffix={projection.unitYear}>
                <TextInput
                  id={id}
                  aria-describedby={describedBy}
                  className="min-w-0 max-w-24"
                  inputMode="decimal"
                  value={inflationText}
                  invalid={error !== undefined}
                  onChange={(event) => {
                    onInflation(event.target.value)
                  }}
                />
              </Unit>
            )}
          </Field>
        )}
      </div>
    </div>
  )
}
