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
 * **La cadence, elle, n'est plus ici.** Elle vaut pour toute la simulation — les
 * deux modes et tous les comptes —, donc elle se règle sur la page, avec la
 * durée. Cette feuille en porte l'unité (« €/trimestre ») parce que c'est elle
 * qui donne son sens au montant tapé, mais elle ne la décide plus.
 * ==========================================================================*/

import { type Money, toAmountInput } from '@/domain/money'
import type { ProjectionPart } from '@/domain/projectionStart'
import { currencySymbol, formatMoney, tpl } from '@/i18n/format'
import { projection } from '@/i18n/projection'
import { Button } from '@/ui/Button'
import { AmountInput, Field } from '@/ui/Field'
import { Sheet } from '@/ui/Sheet'
import { useCurrency } from '@/ui/currency'
import { Unit } from './Unit'
import {
  type Period,
  type SettingErrors,
  type SupportSetting,
  defaultAmount,
  perPeriod,
} from './model'

export type AmountSheetProps = {
  open: boolean
  onClose: () => void
  parts: readonly ProjectionPart[]
  settings: readonly SupportSetting[]
  errors: Record<string, SettingErrors>
  every: Period
  onChange: (supportId: string, next: Partial<Omit<SupportSetting, 'supportId'>>) => void
}

export function AmountSheet({
  open,
  onClose,
  parts,
  settings,
  errors,
  every,
  onChange,
}: AmountSheetProps) {
  const currency = useCurrency()
  const exact = (value: Money): string => formatMoney(value, currency, false)
  const unit = tpl(perPeriod(every), currencySymbol(currency))

  return (
    <Sheet open={open} onClose={onClose} title={projection.amount} pullToClose>
      <div className="flex flex-col gap-4">
        {parts.map((part, index) => {
          const setting = settings.find((one) => one.supportId === part.supportId)
          const fault = errors[part.supportId]
          const fromRules = defaultAmount(part, every)
          const typed = (setting?.amountText ?? '').trim() !== ''

          return (
            <section
              key={part.supportId}
              className={
                index === 0
                  ? 'flex flex-col gap-2'
                  : 'flex flex-col gap-2 border-t border-border pt-4'
              }
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
