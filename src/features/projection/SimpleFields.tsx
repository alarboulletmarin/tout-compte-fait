/* ============================================================================
 * Le mode simple : ce qu'on met, ce qu'on a déjà, et à quel taux.
 *
 * **Trois champs, et ils sont sur la page.** L'écran rangeait ses cinq réglages
 * dans autant de feuilles montantes, parce qu'il tenait dans une hauteur de
 * fenêtre sans défiler. La contrainte a sauté : une page qui défile peut poser
 * ses champs à plat, et un simulateur dont on voit les entrées se règle sans
 * apprendre où elles sont rangées.
 *
 * **Deux colonnes, dès le plus petit écran.** Empilés, quatre champs et leurs
 * aides poussaient la réponse à huit cents pixels du haut : on réglait un
 * versement en ne voyant plus le chiffre qu'il produit. Appariés — ce qu'on
 * verse et ce qu'on a déjà, le taux et l'horizon —, ils tiennent en deux
 * rangées. Les paires ne sont pas arbitraires : chacune est une question et sa
 * voisine immédiate.
 *
 * **Le rendement se tape, il ne se devine pas.** Un seul chiffre ici — la
 * fourchette reste au mode comptes, où l'incertitude se pose compte par compte —
 * et sa valeur d'ouverture est la plus modeste que l'app connaisse
 * (`DEFAULT_LOW`). C'est le contraire d'un simulateur de vente, qui
 * présélectionne le taux le plus flatteur de la dernière décennie et le présente
 * comme une donnée du problème.
 *
 * **Un champ vide n'est pas une faute.** Sans capital de départ on part de zéro,
 * ce qui est le cas de qui commence ; sans versement on regarde ce qu'un capital
 * fait tout seul. Ce qui est refusé, c'est l'illisible — et il retire l'essai
 * sans vider la figure.
 * ==========================================================================*/

import { currencySymbol, tpl } from '@/i18n/format'
import { projection } from '@/i18n/projection'
import { AmountInput, Field, TextInput } from '@/ui/Field'
import { useCurrency } from '@/ui/currency'
import { Unit } from './Unit'
import { type DraftErrors, type Period, perPeriod } from './model'

export type SimpleFieldsProps = {
  startText: string
  payText: string
  rateText: string
  /** La cadence des versements — elle décide de l'unité du champ. */
  every: Period
  errors: DraftErrors
  onStart: (next: string) => void
  onPay: (next: string) => void
  onRate: (next: string) => void
}

/**
 * Les champs, **sans leur grille** : c'est l'écran qui la pose, parce que la
 * durée y entre aussi et qu'elle vaut pour les deux modes. Un fragment plutôt
 * qu'une boîte, donc, sans quoi la durée se retrouverait sous la grille au lieu
 * d'y prendre sa case.
 */
export function SimpleFields({
  startText,
  payText,
  rateText,
  every,
  errors,
  onStart,
  onPay,
  onRate,
}: SimpleFieldsProps) {
  const currency = useCurrency()
  /* « €/mois » plutôt que « € » : deux montants posés l'un à côté de l'autre ne
     disent pas lequel tombe tous les mois, et le libellé seul ne le rattrape pas
     pour l'œil qui relit ses chiffres. */
  const unit = tpl(perPeriod(every), currencySymbol(currency))

  return (
    <>
      {/* Le versement d'abord : c'est le seul réglage sur lequel on décide
          vraiment quelque chose, et « et si je mettais 50 € de plus ? » est la
          question de tout l'écran. */}
      <Field
        label={projection.amount}
        {...(errors.pay === undefined ? {} : { error: errors.pay })}
      >
        {(id, describedBy) => (
          <Unit suffix={unit}>
            {/* `min-w-0` : un `<input>` porte une largeur intrinsèque d'une
                vingtaine de caractères, et un élément flex ne descend pas sous
                son contenu minimal sans qu'on le lui dise. Dans une colonne de
                cent trente points, il déborderait de la carte. */}
            <AmountInput
              id={id}
              aria-describedby={describedBy}
              className="min-w-0"
              value={payText}
              invalid={errors.pay !== undefined}
              onChange={(event) => {
                onPay(event.target.value)
              }}
            />
          </Unit>
        )}
      </Field>

      <Field
        label={projection.simpleStart}
        {...(errors.start === undefined ? {} : { error: errors.start })}
      >
        {(id, describedBy) => (
          <Unit suffix={currencySymbol(currency)}>
            <AmountInput
              id={id}
              aria-describedby={describedBy}
              className="min-w-0"
              value={startText}
              invalid={errors.start !== undefined}
              /* Zéro en invite et non en valeur : un champ qui contient déjà
                 « 0 » se vide avant de se remplir, et l'invite dit d'où l'on
                 part sans qu'une ligne d'aide ait à l'écrire. */
              placeholder="0"
              onChange={(event) => {
                onStart(event.target.value)
              }}
            />
          </Unit>
        )}
      </Field>

      <Field
        label={projection.simpleRate}
        hint={projection.simpleRateHint}
        {...(errors.rate === undefined ? {} : { error: errors.rate })}
      >
        {(id, describedBy) => (
          <Unit suffix={projection.unitYear}>
            <TextInput
              id={id}
              aria-describedby={describedBy}
              className="min-w-0 max-w-24"
              inputMode="decimal"
              value={rateText}
              invalid={errors.rate !== undefined}
              onChange={(event) => {
                onRate(event.target.value)
              }}
            />
          </Unit>
        )}
      </Field>
    </>
  )
}
