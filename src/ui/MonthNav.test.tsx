import { createEvent, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { formatYearMonth, tpl } from '@/i18n/format'
import { t } from '@/i18n/strings'
import { MonthNav } from './MonthNav'

/* Même gréement que `Sheet.test.tsx` et `SwipeRow.test.tsx` : jsdom ne connaît
   pas `clientX` dans les options d'un événement de pointeur. */
function pointer(
  kind: 'pointerDown' | 'pointerUp',
  node: Element,
  { x }: { x: number },
): void {
  const event = createEvent[kind](node, { pointerId: 1 })
  for (const [key, value] of Object.entries({ pointerId: 1, clientX: x, clientY: 0 })) {
    Object.defineProperty(event, key, { value, configurable: true })
  }
  fireEvent(node, event)
}

const title = (returnTo: string) =>
  screen.getByRole('button', { name: tpl(t.shell.thisMonthTitle, formatYearMonth(returnTo)) })

describe('MonthNav — le bloc titre', () => {
  it('n’est pas un bouton tant qu’il ne ramène nulle part', () => {
    render(<MonthNav value="2026-08" onChange={vi.fn()} />)
    /* Trois boutons seraient deux chevrons et un titre ; il n'y en a que
       deux. */
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  it('ne l’est pas non plus sur le mois où il ramènerait', () => {
    render(<MonthNav value="2026-08" onChange={vi.fn()} returnTo="2026-08" />)
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  it('ramène au mois courant quand on le tape', async () => {
    const onChange = vi.fn()
    render(<MonthNav value="2025-02" onChange={onChange} returnTo="2026-08" />)

    await userEvent.click(title('2026-08'))

    expect(onChange).toHaveBeenCalledWith('2026-08')
  })

  /* Le bloc titre est la moitié de la piste de balayage : l'en retirer aurait
     coûté le geste au pouce sur un téléphone. */
  it('reste sur la piste du balayage', () => {
    const onChange = vi.fn()
    render(<MonthNav value="2025-02" onChange={onChange} returnTo="2026-08" />)
    const block = title('2026-08')

    pointer('pointerDown', block, { x: 200 })
    pointer('pointerUp', block, { x: 300 })

    expect(onChange).toHaveBeenCalledWith('2025-01')
  })

  /* Le navigateur émet le `click` juste après le `pointerup` : sans le drapeau,
     le balayage changeait de mois puis repartait aussitôt au mois courant. */
  it('n’enchaîne pas le retour au mois courant derrière un balayage', async () => {
    const onChange = vi.fn()
    render(<MonthNav value="2025-02" onChange={onChange} returnTo="2026-08" />)
    const block = title('2026-08')

    pointer('pointerDown', block, { x: 200 })
    pointer('pointerUp', block, { x: 300 })
    fireEvent.click(block)

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('2025-01')

    /* Et la pression suivante, elle, retrouve son clic : le drapeau se remet à
       zéro au `pointerdown`, jamais à la lecture. */
    await userEvent.click(block)
    expect(onChange).toHaveBeenLastCalledWith('2026-08')
  })

  /* Un chevron reste un chevron : viser le bouton ne doit pas produire un
     micro-glissement au lieu d'un clic. */
  it('ne part jamais d’un chevron', () => {
    const onChange = vi.fn()
    render(<MonthNav value="2025-02" onChange={onChange} returnTo="2026-08" />)
    const previous = screen.getByRole('button', { name: t.a11y.previousMonth })

    pointer('pointerDown', previous, { x: 0 })
    pointer('pointerUp', previous, { x: 200 })

    expect(onChange).not.toHaveBeenCalled()
  })
})
