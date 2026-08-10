/* ============================================================================
 * Ce qu'on verse, et tous les combien.
 *
 * **Le versement est le seul réglage qu'on tourne vraiment.** Le rendement se
 * suppose, la durée se choisit une fois ; ce qu'on met de côté chaque mois est la
 * seule variable sur laquelle on décide quelque chose, et « et si je mettais
 * 50 € de plus ? » est la question de tout l'écran. Elle se pose donc dans un
 * champ, compte par compte, et non dans un pas de réglage à côté du résultat —
 * un dispositif de plus pour la même question.
 *
 * **Le champ part de ce que le document sait, et le dit.** Vide, il vaut ce que
 * les règles récurrentes du compte y versent, ramené à la cadence choisie : un
 * compte qui reçoit 350 €/mois propose 1 050 € par trimestre, parce que c'est le
 * même effort. Ce qu'on tape par-dessus ne descend nulle part.
 *
 * **La cadence n'est pas un détail d'affichage.** C'est le seul endroit de l'app
 * où une échéance n'est pas ramenée au mois (cahier §4.2), et c'est délibéré : le
 * moteur capitalise, donc 1 200 € versés une fois l'an rendent moins que 100 €
 * versés douze fois — l'argent passe moins de temps à produire. Ramener la
 * cadence au mois aurait effacé exactement ce qu'on vient mesurer.
 * ==========================================================================*/

import { type Money, toAmountInput } from '@/domain/money'
import type { ProjectionPart } from '@/domain/projectionStart'
import { currencySymbol, formatMoney, tpl } from '@/i18n/format'
import { projection } from '@/i18n/projection'
import { Button } from '@/ui/Button'
import { AmountInput, Field } from '@/ui/Field'
import { Segmented } from '@/ui/Segmented'
import { Sheet } from '@/ui/Sheet'
import { useCurrency } from '@/ui/currency'
import { Unit } from './Unit'
import {
  PERIODS,
  type Period,
  type SettingErrors,
  type SupportSetting,
  defaultAmount,
  perPeriod,
} from './model'

/** Le nom d'une cadence, et le gabarit de l'unité qui va avec. */
const CADENCES = (): { value: string; label: string }[] => [
  { value: '1', label: projection.cadenceMonthly },
  { value: '3', label: projection.cadenceQuarterly },
  { value: '6', label: projection.cadenceHalf },
  { value: '12', label: projection.cadenceYearly },
]

export type AmountSheetProps = {
  open: boolean
  onClose: () => void
  parts: readonly ProjectionPart[]
  settings: readonly SupportSetting[]
  errors: Record<string, SettingErrors>
  every: Period
  onEvery: (next: Period) => void
  onChange: (supportId: string, next: Partial<Omit<SupportSetting, 'supportId'>>) => void
}

export function AmountSheet({
  open,
  onClose,
  parts,
  settings,
  errors,
  every,
  onEvery,
  onChange,
}: AmountSheetProps) {
  const currency = useCurrency()
  const exact = (value: Money): string => formatMoney(value, currency, false)
  const unit = tpl(perPeriod(every), currencySymbol(currency))

  return (
    <Sheet open={open} onClose={onClose} title={projection.amount} pullToClose>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
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

        {parts.map((part) => {
          const setting = settings.find((one) => one.supportId === part.supportId)
          const fault = errors[part.supportId]
          const fromRules = defaultAmount(part, every)
          const typed = (setting?.amountText ?? '').trim() !== ''

          return (
            <section
              key={part.supportId}
              className="flex flex-col gap-2 border-t border-border pt-4"
            >
              <Field
                label={part.label}
                {...(fault?.amount === undefined ? {} : { error: fault.amount })}
              >
                {(id, describedBy) => (
                  <Unit suffix={unit}>
                    <AmountInput
                      id={id}
                      aria-describedby={describedBy}
                      value={setting?.amountText ?? ''}
                      invalid={fault?.amount !== undefined}
                      /* Le champ vide n'est pas zéro : il vaut ce que le
                         document verse, et l'invite le montre plutôt que de
                         laisser deviner. */
                      placeholder={toAmountInput(fromRules)}
                      onChange={(event) => {
                        onChange(part.supportId, { amountText: event.target.value })
                      }}
                    />
                  </Unit>
                )}
              </Field>

              {/* D'où sort l'invite, et comment y revenir. Un compte sans règle
                  récurrente le dit aussi : sans quoi un champ vide et un zéro se
                  ressembleraient. */}
              {part.rules === 0 ? (
                <p className="t-label">{projection.accountNoRule}</p>
              ) : (
                <p className="t-label">
                  {tpl(projection.amountFromRules, tpl(perPeriod(every), exact(fromRules)))}
                </p>
              )}
              {typed && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="self-start"
                  onClick={() => {
                    onChange(part.supportId, { amountText: '' })
                  }}
                >
                  {tpl(projection.amountReset, tpl(perPeriod(every), exact(fromRules)))}
                </Button>
              )}
            </section>
          )
        })}
      </div>
    </Sheet>
  )
}
