/* ============================================================================
 * En quels euros lire — et c'est une lecture, pas un calcul.
 *
 * Le rendement saisi est net de frais et d'impôt, mais jamais net d'inflation :
 * ce sont deux couches distinctes, et l'option les sépare au lieu de les
 * confondre. En euros d'aujourd'hui, chaque montant est déflaté **à sa propre
 * date** — un versement fait dans dix ans n'a pas le pouvoir d'achat de celui
 * d'aujourd'hui —, ce qui n'est pas la même chose que déflater la somme finale.
 *
 * Éteint par défaut, parce que la lecture en euros courants est celle des relevés
 * qu'on recevra ; et **signalé quand il est allumé**, sous la figure, parce qu'un
 * chiffre en euros constants sans un mot pour le dire se lit comme un rendement
 * décevant.
 * ==========================================================================*/

import { projection } from '@/i18n/projection'
import { Field, TextInput } from '@/ui/Field'
import { Segmented } from '@/ui/Segmented'
import { Sheet } from '@/ui/Sheet'
import { Unit } from './Unit'

export type InflationSheetProps = {
  open: boolean
  onClose: () => void
  constant: boolean
  onConstant: (next: boolean) => void
  inflationText: string
  onInflation: (next: string) => void
  error?: string
}

export function InflationSheet({
  open,
  onClose,
  constant,
  onConstant,
  inflationText,
  onInflation,
  error,
}: InflationSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={projection.pillInflation} pullToClose>
      <div className="flex flex-col gap-3">
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
    </Sheet>
  )
}
