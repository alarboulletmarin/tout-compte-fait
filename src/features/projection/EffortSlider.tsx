/* ============================================================================
 * « Et si je verse davantage ? » — le curseur, à côté de l'échelle.
 *
 * `EffortTable` compare quatre versements fixes, des multiples arrondis de
 * celui qu'on simule. Utiles pour comparer d'un coup d'œil, ils restent des
 * repères et non les seuls montants qu'on puisse essayer — qui veut savoir ce
 * que 180 € donneraient, quand la table ne propose que 150 et 200, devait
 * retourner changer le versement simulé lui-même pour le savoir.
 *
 * Le curseur explore ce continu-là, sans rien changer à la simulation en
 * cours : il lit `effortAt`, la même fonction que chaque barreau de la table,
 * pour un montant qui n'a pas à tomber sur un barreau.
 * ==========================================================================*/

import { useId, useMemo, useState } from 'react'
import { type Money, ZERO, money, parseAmount, toAmountInput } from '@/domain/money'
import { formatRoundedMoney, tpl } from '@/i18n/format'
import { projection } from '@/i18n/projection'
import { AmountInput } from '@/ui/Field'
import { useCurrency } from '@/ui/currency'
import { type ProjectionResult, type ScenarioResult, effortAt, rungStep } from './model'

export function EffortSlider({
  result,
  scenario,
}: {
  result: ProjectionResult
  scenario: ScenarioResult
}) {
  const currency = useCurrency()
  const id = useId()
  const base = result.monthly ?? ZERO
  const step = rungStep(base)
  /* Le plafond du curseur dépasse le plus haut barreau de la table (2× le
     versement) : sans cette marge, glisser jusqu'au bout retomberait
     exactement sur ce que la table dit déjà. */
  const max = money(Math.max(step * 4, Math.round((base * 3) / step) * step))

  const [value, setValue] = useState<Money>(base)
  /* Le texte tapé et le montant qu'il vaut sont deux états, pas un : reformater
     le champ à chaque frappe — « 1 » en « 1,00 » avant même le second chiffre —
     effacerait ce que le clavier vient d'y poser. Le champ ne se remet en forme
     qu'au blur, ou quand c'est le curseur qui a bougé. */
  const [text, setText] = useState<string>(toAmountInput(base))

  const clamp = (next: number): Money => money(Math.min(Math.max(Math.round(next), 0), max))

  /* Le curseur, lui, ne porte que des montants déjà lisibles : il remet donc
     le champ en forme dans le même geste. */
  const slide = (next: number): void => {
    const clamped = clamp(next)
    setValue(clamped)
    setText(toAmountInput(clamped))
  }

  const { arrival } = useMemo(() => effortAt(result, scenario, value), [result, scenario, value])

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="t-label text-text">
          {projection.effortSlider}
        </label>
        <AmountInput
          aria-label={projection.effortSlider}
          value={text}
          className="max-w-28"
          onChange={(event) => {
            setText(event.target.value)
            const parsed = parseAmount(event.target.value)
            if (parsed !== null) setValue(clamp(parsed))
          }}
          onBlur={() => {
            // Une saisie illisible, ou hors échelle, retombe sur le dernier
            // montant valide plutôt que de laisser le champ dire autre chose
            // que ce que le curseur, juste dessous, pointe déjà.
            setText(toAmountInput(value))
          }}
        />
      </div>
      <input
        id={id}
        type="range"
        className="effort-slider"
        min={0}
        max={max}
        step={step}
        value={value}
        aria-label={projection.effortSlider}
        aria-valuetext={tpl(projection.approx, formatRoundedMoney(value, currency))}
        onChange={(event) => {
          slide(Number(event.target.value))
        }}
      />
      <p className="t-label">
        {tpl(projection.effortSliderArrival, tpl(projection.approx, formatRoundedMoney(arrival, currency)))}
      </p>
    </div>
  )
}
