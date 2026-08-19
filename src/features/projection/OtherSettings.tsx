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
 * La cadence n'est pas un détail d'affichage : le moteur capitalise, donc
 * 1 200 € versés une fois l'an ne valent pas 100 € versés douze fois, et l'écart
 * est exactement ce qu'on vient mesurer en la changeant.
 * ==========================================================================*/

import { projection } from '@/i18n/projection'
import { Field, TextInput } from '@/ui/Field'
import { Segmented } from '@/ui/Segmented'
import { Unit } from './Unit'
import { PERIODS, type Period } from './model'

/** Le nom d'une cadence, et la valeur qu'elle porte en mois. */
const CADENCES = (): { value: string; label: string }[] => [
  { value: '1', label: projection.cadenceMonthly },
  { value: '3', label: projection.cadenceQuarterly },
  { value: '6', label: projection.cadenceHalf },
  { value: '12', label: projection.cadenceYearly },
]

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
    <div className="flex flex-col gap-4 border-t border-border pt-4">
      <div className="flex flex-col gap-1.5">
        <p className="t-label text-text">{projection.cadence}</p>
        <Segmented
          options={CADENCES()}
          value={String(every)}
          onChange={(next) => {
            const found = PERIODS.find((one) => String(one) === next)
            if (found !== undefined) onEvery(found)
          }}
          label={projection.cadence}
        />
        <p className="t-label">{projection.cadenceHint}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="t-label text-text">{projection.inflationAxis}</p>
        {/* Une bascule à deux positions nommées, et non une case à cocher : ce
            n'est pas un attribut vrai ou faux, c'est le choix entre deux lectures
            qui s'excluent — et les deux méritent leur nom. */}
        <Segmented
          options={[
            { value: 'current', label: projection.inflationCurrent },
            { value: 'constant', label: projection.inflationConstant },
          ]}
          value={constant ? 'constant' : 'current'}
          onChange={(next) => {
            onConstant(next === 'constant')
          }}
          label={projection.inflationAxis}
        />

        {constant && (
          <Field label={projection.inflation} {...(error === undefined ? {} : { error })}>
            {(id, describedBy) => (
              <Unit suffix={projection.unitYear}>
                <TextInput
                  id={id}
                  aria-describedby={describedBy}
                  className="max-w-24"
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

        <p className="t-label">{projection.inflationHint}</p>
      </div>
    </div>
  )
}
