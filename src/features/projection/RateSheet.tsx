/* ============================================================================
 * Tout ce qui décide du rendement, derrière une seule porte.
 *
 * L'écran posait quatre mécanismes en pleine page pour dire une seule chose,
 * l'incertitude : trois hypothèses libres, trois présélections, un taux par
 * compte, et un second taux « comparé » par compte. Quatre contrôles pour une
 * question, dont aucun ne disait lequel des autres il remplaçait.
 *
 * Il n'en reste qu'une **fourchette**, et elle tient sur une ligne de l'écran —
 * « Rendement · 2,4 % – 7 % ». Ce qu'il y a derrière est ce qu'on n'ouvre pas
 * tous les jours : les deux bornes, le détail compte par compte, et la lecture
 * en euros d'aujourd'hui. L'inflation y descend pour la même raison — c'est un
 * mode d'affichage et non une donnée du calcul, et elle occupait une tuile
 * entière dans le flux.
 *
 * **La fourchette ne s'applique qu'aux comptes muets**, et la feuille est
 * l'endroit où cela se voit : un compte dont le taux est posé sur sa fiche
 * affiche un chiffre, un compte sans taux affiche les deux bornes. C'est ce qui
 * fait qu'elle se referme d'elle-même sur un portefeuille entièrement
 * renseigné, sans qu'aucun champ ait bougé.
 * ==========================================================================*/

import { type Money, ZERO } from '@/domain/money'
import type { RateKind } from '@/domain/projection'
import { formatMoney, formatRoundedMoney, tpl } from '@/i18n/format'
import { projection } from '@/i18n/projection'
import { Button } from '@/ui/Button'
import { Eyebrow } from '@/ui/Eyebrow'
import { Checkbox, Field, TextInput } from '@/ui/Field'
import { Segmented } from '@/ui/Segmented'
import { Sheet } from '@/ui/Sheet'
import { useCurrency } from '@/ui/currency'
import { Unit } from './Unit'
import type { DraftErrors, ProjectionResult, SupportRateDraft, SupportSeries } from './model'

const kinds = (): { value: RateKind; label: string }[] => [
  { value: 'guaranteed', label: projection.kindGuaranteed },
  { value: 'assumed', label: projection.kindAssumed },
]

export type RateSheetProps = {
  open: boolean
  onClose: () => void
  lowText: string
  highText: string
  onRate: (next: { lowText?: string; highText?: string }) => void
  errors: DraftErrors
  /** `null` tant que rien ne se calcule : la feuille garde ses deux champs. */
  result: ProjectionResult | null
  supportRates: readonly SupportRateDraft[]
  onSupportRate: (part: SupportSeries, next: { rateText?: string; kind?: RateKind }) => void
  onSupportReset: (part: SupportSeries) => void
  constant: boolean
  onConstant: (next: boolean) => void
  inflationText: string
  onInflation: (next: string) => void
  /** Le taux d'un compte, mis en forme — l'écran décide de sa précision. */
  percent: (rateBp: number) => string
}

export function RateSheet({
  open,
  onClose,
  lowText,
  highText,
  onRate,
  errors,
  result,
  supportRates,
  onSupportRate,
  onSupportReset,
  constant,
  onConstant,
  inflationText,
  onInflation,
  percent,
}: RateSheetProps) {
  const split = result?.split ?? []

  return (
    <Sheet open={open} onClose={onClose} title={projection.rate} pullToClose>
      <div className="flex flex-col gap-5">
        <section className="flex flex-col gap-3">
          <Eyebrow>{projection.rangeAxis}</Eyebrow>
          <div className="flex flex-wrap gap-4">
            <Field
              label={projection.rangeLow}
              {...(errors.low === undefined ? {} : { error: errors.low })}
            >
              {(id, describedBy) => (
                <Unit suffix={projection.unitYear}>
                  <TextInput
                    id={id}
                    aria-describedby={describedBy}
                    className="max-w-24"
                    inputMode="decimal"
                    value={lowText}
                    invalid={errors.low !== undefined}
                    onChange={(event) => {
                      onRate({ lowText: event.target.value })
                    }}
                  />
                </Unit>
              )}
            </Field>
            <Field
              label={projection.rangeHigh}
              {...(errors.high === undefined ? {} : { error: errors.high })}
            >
              {(id, describedBy) => (
                <Unit suffix={projection.unitYear}>
                  <TextInput
                    id={id}
                    aria-describedby={describedBy}
                    className="max-w-24"
                    inputMode="decimal"
                    value={highText}
                    invalid={errors.high !== undefined}
                    onChange={(event) => {
                      onRate({ highText: event.target.value })
                    }}
                  />
                </Unit>
              )}
            </Field>
          </div>
          <p className="t-label">
            {split.length > 0 ? projection.rangeHintSplit : projection.rangeHint}
          </p>
        </section>

        {/* Le détail compte par compte, quand il y a des comptes. Projeter tout
            un portefeuille sous un taux unique n'a aucun sens : deux comptes ne
            suivent pas la même courbe, et leur somme n'est celle d'aucun taux
            moyen. */}
        {split.length > 0 && (
          <section className="flex flex-col gap-4 border-t border-border pt-4">
            <Eyebrow>{projection.supportRates}</Eyebrow>
            <div className="flex flex-col gap-4 [&>*+*]:border-t [&>*+*]:border-border [&>*+*]:pt-4">
              {split.map((part) => (
                <SupportRateFields
                  key={part.supportId}
                  part={part}
                  rateText={
                    supportRates.find((one) => one.supportId === part.supportId)?.rateText ?? ''
                  }
                  placeholder={percent(part.rateBp)}
                  arrival={part}
                  onChange={(next) => {
                    onSupportRate(part, next)
                  }}
                  onReset={() => {
                    onSupportReset(part)
                  }}
                />
              ))}
            </div>
            <p className="t-label">{projection.supportRatesHint}</p>
            {/* L'approximation de la place restante, dite une fois et là où elle
                s'applique : elle se calcule sur le capital d'aujourd'hui,
                intérêts acquis compris, donc elle est un peu sous-estimée. */}
            {split.some((part) => part.cap !== null) && (
              <p className="t-label">{projection.capNote}</p>
            )}
          </section>
        )}

        {/* La lecture en euros d'aujourd'hui : un mode d'affichage, pas une
            donnée du calcul — d'où sa place ici plutôt qu'une tuile de plus dans
            le flux. Elle est au même endroit que le rendement parce qu'elle en
            est la seconde moitié : le taux saisi est net de frais et d'impôt,
            jamais net d'inflation, et les deux couches se règlent ensemble. */}
        <section className="flex flex-col gap-3 border-t border-border pt-4">
          <Checkbox
            checked={constant}
            onChange={onConstant}
            label={projection.constant}
            hint={projection.constantHint}
          />
          {constant && (
            <Field
              label={projection.inflation}
              {...(errors.inflation === undefined ? {} : { error: errors.inflation })}
            >
              {(id, describedBy) => (
                <Unit suffix={projection.unitYear}>
                  <TextInput
                    id={id}
                    aria-describedby={describedBy}
                    className="max-w-24"
                    inputMode="decimal"
                    value={inflationText}
                    invalid={errors.inflation !== undefined}
                    onChange={(event) => {
                      onInflation(event.target.value)
                    }}
                  />
                </Unit>
              )}
            </Field>
          )}
        </section>
      </div>
    </Sheet>
  )
}

/**
 * Un compte, et le rendement qu'on lui prête pour cette simulation.
 *
 * Le champ est **vide par défaut**, et son placeholder dit ce qui s'applique en
 * attendant : le taux de la fiche, ou la fourchette de l'écran. Un champ
 * prérempli avec le taux du support laisserait croire qu'on l'édite — c'est
 * exactement ce que les deux champs de montant évitent déjà en ne s'affichant
 * pas hors simulation libre.
 *
 * **Taper un taux ici ferme la fourchette sur ce compte.** C'est la conséquence
 * directe du modèle, et la ligne le dit : on vient d'affirmer ce qu'il rapporte,
 * l'écran n'a plus d'incertitude à ajouter par-dessus.
 */
function SupportRateFields({
  part,
  rateText,
  placeholder,
  arrival,
  onChange,
  onReset,
}: {
  part: SupportSeries
  rateText: string
  placeholder: string
  arrival: SupportSeries
  onChange: (next: { rateText?: string; kind?: RateKind }) => void
  onReset: () => void
}) {
  const currency = useCurrency()
  /* Un plafond est un nombre écrit dans un contrat : il s'écrit **exact**, sans
     « ≈ ». Ce qui s'arrondit ici est ce qui sort du modèle, pas ce qui y entre. */
  const exact = (value: Money): string => formatMoney(value, currency, false)
  const approx = (value: Money): string =>
    tpl(projection.approx, formatRoundedMoney(value, currency))
  const simulated = part.origin === 'simulated'

  const low = arrival.series.balance.at(-1) ?? ZERO
  const high = arrival.highSeries.balance.at(-1) ?? ZERO

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-3">
        <Field label={part.label} className="min-w-0">
          {(id, describedBy) => (
            <Unit suffix={projection.unitYear}>
              <TextInput
                id={id}
                aria-describedby={describedBy}
                className="max-w-24"
                inputMode="decimal"
                value={rateText}
                placeholder={placeholder}
                onChange={(event) => {
                  onChange({ rateText: event.target.value })
                }}
              />
            </Unit>
          )}
        </Field>
        {simulated && (
          <Button variant="secondary" size="sm" onClick={onReset}>
            {projection.supportRateReset}
          </Button>
        )}
      </div>

      {/* Ce que ce compte donne, ici et pas seulement dans le tracé : c'est la
          réponse à la question qu'on vient de poser en tapant un taux, et aller
          la chercher ailleurs obligerait à l'aller-retour à chaque essai. Un
          chiffre quand le compte est fixé, une fourchette quand il est muet —
          la même règle que le résultat en tête d'écran. */}
      <p className="t-num-body tnum">
        {low === high ? approx(low) : tpl(projection.rangeShort, approx(low), approx(high))}
      </p>

      {/* La nature ne se demande que sur un taux qu'on a tapé : sur un taux
          repris, elle est celle de la fiche, et l'offrir ici ferait croire qu'on
          modifie le compte. */}
      {simulated && (
        <Segmented
          options={kinds()}
          value={part.kind}
          onChange={(next) => {
            onChange({ kind: next })
          }}
          label={projection.kindAxis}
          className="w-fit"
        />
      )}

      {/* D'où vient le taux qui s'applique — et il y a trois réponses, dont
          aucune ne se devine du seul chiffre affiché. */}
      <p className="t-label">
        {simulated
          ? projection.supportRateSimulated
          : part.origin === 'screen'
            ? projection.supportRateBorrowed
            : projection.supportRateOwn}
      </p>
      {!simulated && part.dated && <p className="t-label">{projection.supportRateDated}</p>}

      {/* Le plafond du contrat, et ce qu'il en reste. Sur ce qui est **versé**,
          jamais sur le solde : un livret plein rapporte encore, et la phrase le
          dit plutôt que de laisser lire une courbe qui s'arrête. */}
      {part.cap !== null && (
        <p className="t-label">
          {part.room === null || part.room <= ZERO
            ? tpl(projection.supportCapFull, exact(part.cap))
            : tpl(projection.supportCap, exact(part.cap), exact(part.room))}
        </p>
      )}
      {part.capped && <p className="t-label">{projection.supportCapped}</p>}
    </div>
  )
}
