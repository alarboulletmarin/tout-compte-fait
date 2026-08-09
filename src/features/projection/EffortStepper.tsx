/* ============================================================================
 * « Et si je versais… » — une ligne, et c'est tout ce qu'il en reste.
 *
 * Deux dispositifs répondaient à cette question, côte à côte : un tableau de
 * quatre versements — des multiples arrondis de celui qu'on simule — et un
 * curseur qui explorait le continu entre eux. Le second contenait strictement le
 * premier, et le premier n'existait que parce que le second n'était pas là
 * d'abord. Deux contrôles pour une question, dont l'un est un sous-ensemble de
 * l'autre, sont un contrôle de trop.
 *
 * Ce qui reste est le geste : **moins, plus**, et ce que ça change à l'arrivée.
 * Pas un tableau à lire, pas une échelle à viser au pouce — deux cibles de 44px
 * et un écart écrit en toutes lettres. Le pas suit l'ordre de grandeur du
 * versement (`rungStep`) : personne ne programme un virement à 327 €.
 *
 * **Il ne recommande rien, et il n'adopte rien.** Il montre une pente. Le
 * versement de la simulation ne bouge pas tant qu'on ne le reprend pas
 * explicitement — c'est le bouton qui le dit, et il ne s'affiche que lorsqu'il
 * y a quelque chose à reprendre.
 * ==========================================================================*/

import { useState } from 'react'
import { type Money, ZERO, money } from '@/domain/money'
import { formatRoundedMoney, formatSignedRoundedMoney, tpl } from '@/i18n/format'
import { projection } from '@/i18n/projection'
import { Button } from '@/ui/Button'
import { Eyebrow } from '@/ui/Eyebrow'
import { Minus, Plus } from '@/ui/Icons'
import { Tile } from '@/ui/Tile'
import { useCurrency } from '@/ui/currency'
import { type ProjectionResult, effortAt, rungStep } from './model'

export function EffortStepper({
  result,
  onApply,
}: {
  result: ProjectionResult
  /** Reprendre ce versement dans la simulation. */
  onApply: (monthly: Money) => void
}) {
  const currency = useCurrency()
  const base = result.monthly ?? ZERO
  const step = rungStep(base)

  const [value, setValue] = useState<Money>(base)
  /* Le versement simulé peut bouger sans que ce composant démonte — on tape
     dans le champ au-dessus, ou on reprend le montant essayé. Le réglage
     explore *autour* du versement en cours ; s'il reste planté sur l'ancien
     après qu'il a changé, il ne compare plus rien à ce qui est affiché.
     Ajusté pendant le rendu plutôt que dans un effet — le React qui suit un
     changement de prop, sans détour par un rendu intermédiaire périmé. */
  const [tracked, setTracked] = useState<Money>(base)
  if (base !== tracked) {
    setTracked(base)
    setValue(base)
  }

  /* Jamais négatif : « verser −50 €/mois » n'est pas un effort moindre, c'est
     une reprise, et elle se saisit dans le versement lui-même. */
  const move = (by: number): void => {
    setValue(money(Math.max(0, value + by)))
  }

  const here = effortAt(result, base)
  const there = effortAt(result, value)
  const amount = (one: Money): string =>
    tpl(projection.approx, formatRoundedMoney(one, currency))

  /* L'écart, et non l'arrivée : « 208 k€ » ne dit pas ce que le geste a changé,
     et le comparer de tête à un chiffre lu en haut de l'écran est exactement le
     calcul que cette ligne existe pour éviter. La fourchette suit — un écart
     unique sous une arrivée qui est une fourchette se lirait comme une promesse
     que le reste de l'écran refuse. */
  const gapLow = money(there.low - here.low)
  const gapHigh = money(there.high - here.high)
  const gap =
    gapLow === gapHigh
      ? formatSignedRoundedMoney(gapLow, currency)
      : tpl(
          projection.rangeShort,
          formatSignedRoundedMoney(gapLow, currency),
          formatSignedRoundedMoney(gapHigh, currency),
        )

  return (
    <Tile className="gap-3">
      <Eyebrow>{projection.effort}</Eyebrow>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="t-num-body tnum">
          {tpl(projection.perMonth, formatRoundedMoney(value, currency))}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            aria-label={tpl(projection.effortLess, formatRoundedMoney(money(step), currency))}
            onClick={() => {
              move(-step)
            }}
          >
            <Minus size={18} />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            aria-label={tpl(projection.effortMore, formatRoundedMoney(money(step), currency))}
            onClick={() => {
              move(step)
            }}
          >
            <Plus size={18} />
          </Button>
        </div>
      </div>

      {/* Rien à dire tant qu'on n'a pas bougé : une ligne « + 0 € à l'arrivée »
          serait un résultat qui a l'air d'un résultat. */}
      {value === base ? (
        <p className="t-label">{projection.effortHint}</p>
      ) : (
        <>
          <p className="t-label">{tpl(projection.effortGap, gap)}</p>
          <p className="t-label">
            {tpl(
              projection.effortArrival,
              there.low === there.high
                ? amount(there.low)
                : tpl(projection.rangeShort, amount(there.low), amount(there.high)),
            )}
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="w-fit"
            onClick={() => {
              onApply(value)
            }}
          >
            {tpl(projection.effortApply, formatRoundedMoney(value, currency))}
          </Button>
        </>
      )}
    </Tile>
  )
}
