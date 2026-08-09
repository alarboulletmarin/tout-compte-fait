/* ============================================================================
 * Le rendement, compte par compte — et les trois façons de le poser.
 *
 * **Projeter un portefeuille sous un taux unique n'a aucun sens.** Un Livret A
 * et un PEA ne suivent pas la même courbe, et leur somme n'est celle d'aucun
 * taux moyen : c'est pour ça que chaque compte a sa ligne ici, et que la courbe
 * de l'écran est l'addition de leurs trajectoires.
 *
 * **Trois modes, et un seul à la fois.** Le taux de la fiche — daté, et le seul
 * qui engage le document —, une valeur qu'on essaie, une fourchette. L'écran en
 * proposait quatre à la fois : trois hypothèses libres, trois présélections, un
 * taux par compte et un second taux « comparé » par compte. C'étaient quatre
 * façons de poser une seule chose, l'incertitude, dont aucune ne disait laquelle
 * remplaçait les autres. Un choix explicite le dit.
 *
 * **La fourchette est le défaut d'un compte muet, et le mode « valeur » ne l'est
 * jamais.** L'app ne devine aucun rendement : entre suggérer un chiffre flatteur
 * et montrer un écart large, elle montre l'écart. C'est le contraire des 11 %
 * « constatés sur la dernière décennie » que les simulateurs de vente
 * présélectionnent.
 *
 * **Rien ne redescend dans le document** : ce qui se tape ici vit dans
 * `localStorage`, et la fiche du support reste le seul endroit où un taux
 * s'enregistre — daté.
 * ==========================================================================*/

import type { ProjectionPart } from '@/domain/projectionStart'
import { formatPercent } from '@/i18n/format'
import { projection } from '@/i18n/projection'
import { Field, TextInput } from '@/ui/Field'
import { Segmented } from '@/ui/Segmented'
import { Sheet } from '@/ui/Sheet'
import { Unit } from './Unit'
import {
  DEFAULT_HIGH,
  DEFAULT_LOW,
  type RateMode,
  type SettingErrors,
  type SupportRun,
  type SupportSetting,
} from './model'

export type RateSheetProps = {
  open: boolean
  onClose: () => void
  /** Les comptes cochés, et rien d'autre : on ne règle pas ce qu'on ne trace pas. */
  parts: readonly ProjectionPart[]
  runs: readonly SupportRun[]
  settings: readonly SupportSetting[]
  errors: Record<string, SettingErrors>
  onChange: (supportId: string, next: Partial<Omit<SupportSetting, 'supportId'>>) => void
}

/** Le pourcentage d'un taux en points de base — deux décimales s'il en faut. */
const percent = (rateBp: number): string =>
  formatPercent(rateBp / 10_000, rateBp % 100 === 0 ? 0 : 2)

export function RateSheet({
  open,
  onClose,
  parts,
  runs,
  settings,
  errors,
  onChange,
}: RateSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={projection.rate} pullToClose>
      <div className="flex flex-col gap-4">
        {parts.map((part, index) => {
          const run = runs.find((one) => one.supportId === part.supportId)
          const setting = settings.find((one) => one.supportId === part.supportId)
          const fault = errors[part.supportId]
          const mode: RateMode = run?.mode ?? 'range'

          /* « Taux du support » n'est proposé qu'à un compte qui en porte un :
             il n'y aurait rien à reprendre, et un 0 % emprunté à l'absence
             passerait pour une réponse. */
          const options: { value: RateMode; label: string }[] = [
            ...(part.rateBp === null
              ? []
              : [{ value: 'own' as const, label: projection.rateOwn }]),
            { value: 'flat', label: projection.rateFlat },
            { value: 'range', label: projection.rateRange },
          ]

          return (
            <section
              key={part.supportId}
              className={
                index === 0 ? 'flex flex-col gap-2' : 'flex flex-col gap-2 border-t border-border pt-4'
              }
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <h3 className="t-body font-medium">{part.label}</h3>
                {/* Ce qui **court**, et non ce qui est tapé : un compte réglé
                    sur sa fiche affiche 2,40 %, un compte en fourchette affiche
                    ses deux bornes. */}
                <p className="t-label">
                  {run === undefined
                    ? projection.rangeUnknown
                    : run.lowBp === run.highBp
                      ? percent(run.lowBp)
                      : `${percent(run.lowBp)} – ${percent(run.highBp)}`}
                </p>
              </div>

              <Segmented
                options={options}
                value={mode}
                onChange={(next) => {
                  onChange(part.supportId, { mode: next })
                }}
                label={projection.rateAxis}
              />

              {mode === 'own' && (
                <>
                  <p className="t-label">{projection.rateOwnNote}</p>
                  <p className="t-label">
                    {part.rateKind === 'guaranteed'
                      ? projection.kindGuaranteed
                      : projection.kindAssumed}
                  </p>
                  {run?.dated === true && <p className="t-label">{projection.rateDated}</p>}
                </>
              )}

              {mode === 'flat' && (
                <>
                  <Field
                    label={projection.rate}
                    {...(fault?.rate === undefined ? {} : { error: fault.rate })}
                  >
                    {(id, describedBy) => (
                      <Unit suffix={projection.unitYear}>
                        <TextInput
                          id={id}
                          aria-describedby={describedBy}
                          className="max-w-24"
                          inputMode="decimal"
                          value={setting?.rateText ?? ''}
                          invalid={fault?.rate !== undefined}
                          onChange={(event) => {
                            onChange(part.supportId, { rateText: event.target.value })
                          }}
                        />
                      </Unit>
                    )}
                  </Field>
                  <p className="t-label">{projection.rateFlatNote}</p>
                </>
              )}

              {mode === 'range' && (
                <>
                  <div className="flex flex-wrap gap-4">
                    <Field
                      label={projection.rateLow}
                      {...(fault?.low === undefined ? {} : { error: fault.low })}
                    >
                      {(id, describedBy) => (
                        <Unit suffix={projection.unitYear}>
                          <TextInput
                            id={id}
                            aria-describedby={describedBy}
                            className="max-w-24"
                            inputMode="decimal"
                            value={setting?.lowText ?? DEFAULT_LOW}
                            invalid={fault?.low !== undefined}
                            onChange={(event) => {
                              onChange(part.supportId, { lowText: event.target.value })
                            }}
                          />
                        </Unit>
                      )}
                    </Field>
                    <Field
                      label={projection.rateHigh}
                      {...(fault?.high === undefined ? {} : { error: fault.high })}
                    >
                      {(id, describedBy) => (
                        <Unit suffix={projection.unitYear}>
                          <TextInput
                            id={id}
                            aria-describedby={describedBy}
                            className="max-w-24"
                            inputMode="decimal"
                            value={setting?.highText ?? DEFAULT_HIGH}
                            invalid={fault?.high !== undefined}
                            onChange={(event) => {
                              onChange(part.supportId, { highText: event.target.value })
                            }}
                          />
                        </Unit>
                      )}
                    </Field>
                  </div>
                  <p className="t-label">
                    {part.rateBp === null ? projection.rateNone : projection.rateRangeNote}
                  </p>
                </>
              )}
            </section>
          )
        })}
      </div>
    </Sheet>
  )
}
