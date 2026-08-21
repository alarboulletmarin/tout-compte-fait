import { cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SwipeRow } from './SwipeRow'

/* jsdom ne fabrique pas d'événement de pointeur complet : `clientX` et
   `clientY` ne sont pas dans les options qu'il connaît, et ils se posent donc à
   la main — c'est le même gréement que `Sheet.test.tsx`. */
function pointer(
  kind: 'pointerDown' | 'pointerMove' | 'pointerUp' | 'pointerCancel',
  node: Element,
  { x, y = 0 }: { x: number; y?: number },
): void {
  const event = createEvent[kind](node, { pointerId: 1 })
  for (const [key, value] of Object.entries({ pointerId: 1, clientX: x, clientY: y })) {
    Object.defineProperty(event, key, { value, configurable: true })
  }
  fireEvent(node, event)
}

function setup(props: Partial<Parameters<typeof SwipeRow>[0]> = {}) {
  const right = { label: 'Confirmer', onAction: vi.fn() }
  const left = { label: 'Ajuster', onAction: vi.fn() }
  render(
    <SwipeRow right={right} left={left} {...props}>
      <div data-testid="rangee">Électricité</div>
    </SwipeRow>,
  )
  const row = screen.getByTestId('rangee')
  /* La piste est le cadre du composant ; la rangée est ce qui se déplace
     dedans. Le geste se joue sur la première, le `transform` se lit sur la
     seconde. */
  const track = row.parentElement?.parentElement as HTMLElement
  return { right, left, row, track }
}

const moved = (row: HTMLElement): string => (row.parentElement as HTMLElement).style.transform

function swipe(track: HTMLElement, to: number): void {
  pointer('pointerDown', track, { x: 0 })
  pointer('pointerMove', track, { x: to })
  pointer('pointerUp', track, { x: to })
}

describe('SwipeRow — le geste', () => {
  it('suit le doigt pendant le glissé', () => {
    const { track, row } = setup()
    pointer('pointerDown', track, { x: 0 })
    pointer('pointerMove', track, { x: 40 })
    expect(moved(row)).toBe('translateX(40px)')
  })

  /* Au-delà, la rangée ne suit plus : elle a dit tout ce qu'elle avait à dire,
     et continuer découvrirait du vide derrière elle. */
  it('borne le déplacement à 148px à droite et 132px à gauche', () => {
    const { track, row } = setup()
    pointer('pointerDown', track, { x: 0 })
    pointer('pointerMove', track, { x: 400 })
    expect(moved(row)).toBe('translateX(148px)')
    pointer('pointerMove', track, { x: -400 })
    expect(moved(row)).toBe('translateX(-132px)')
  })

  it('ne confirme pas à 92px', () => {
    const { track, right } = setup()
    swipe(track, 92)
    expect(right.onAction).not.toHaveBeenCalled()
  })

  it('confirme au-delà de 92px', () => {
    const { track, right } = setup()
    swipe(track, 93)
    expect(right.onAction).toHaveBeenCalledTimes(1)
  })

  it('ne déclenche pas l’action secondaire à 70px', () => {
    const { track, left } = setup()
    swipe(track, -70)
    expect(left.onAction).not.toHaveBeenCalled()
  })

  it('déclenche l’action secondaire au-delà de 70px vers la gauche', () => {
    const { track, left } = setup()
    swipe(track, -71)
    expect(left.onAction).toHaveBeenCalledTimes(1)
  })

  /* Quatorze pixels de plus, parce que c'est le seul des trois gestes qu'un
     second glissé ne défait pas. */
  it('éloigne le seuil d’une suppression à 84px', () => {
    const short = vi.fn()
    const a = setup({ destructive: true, left: { label: 'Supprimer', onAction: short } })
    /* Quatre-vingts pixels suffiraient à une action secondaire ordinaire ; ils
       ne suffisent pas à effacer. */
    swipe(a.track, -80)
    expect(short).not.toHaveBeenCalled()
    cleanup()

    const remove = vi.fn()
    const b = setup({ destructive: true, left: { label: 'Supprimer', onAction: remove } })
    swipe(b.track, -85)
    expect(remove).toHaveBeenCalledTimes(1)
  })

  it('revient à sa place quand le seuil n’est pas atteint', () => {
    const { track, row } = setup()
    swipe(track, 40)
    expect(moved(row)).toBe('')
  })

  it('ne fait rien du tout quand la rangée ne se glisse pas', () => {
    const { track, row, right } = setup({ disabled: true })
    swipe(track, 120)
    expect(right.onAction).not.toHaveBeenCalled()
    expect(moved(row)).toBe('')
  })

  /* Le fond découvert dit ce que le doigt promet — et il ne couvre que la
     rangée, jamais ce qui se déplie sous elle. */
  it('découvre le libellé du côté vers lequel on va', () => {
    const { track } = setup()
    expect(screen.queryByText('Confirmer')).not.toBeInTheDocument()

    pointer('pointerDown', track, { x: 0 })
    pointer('pointerMove', track, { x: 60 })
    expect(screen.getByText('Confirmer')).toBeInTheDocument()
    expect(screen.queryByText('Ajuster')).not.toBeInTheDocument()

    pointer('pointerMove', track, { x: -60 })
    expect(screen.getByText('Ajuster')).toBeInTheDocument()
    expect(screen.queryByText('Confirmer')).not.toBeInTheDocument()
  })

  /* Viser la corbeille d'une rangée ne doit pas produire un micro-glissement au
     lieu d'un clic : c'est la garde de `SwipeAway` et de `MonthNav`. Elle se
     marque, parce qu'une rangée entière est souvent un bouton elle aussi. */
  it('ne part jamais d’un contrôle marqué', async () => {
    const onClick = vi.fn()
    render(
      <SwipeRow right={{ label: 'Confirmer', onAction: vi.fn() }}>
        <span data-no-swipe>
          <button type="button" onClick={onClick}>
            Supprimer la ligne
          </button>
        </span>
      </SwipeRow>,
    )
    const button = screen.getByRole('button', { name: 'Supprimer la ligne' })
    const row = button.parentElement?.parentElement as HTMLElement

    pointer('pointerDown', button, { x: 0 })
    pointer('pointerMove', button, { x: 120 })
    expect(row.style.transform).toBe('')

    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  /* Le pendant, et c'est lui qui a fait inverser la règle : la rangée qui ouvre
     la fiche de sa ligne est un bouton, et le doigt part de là. */
  it('part d’une rangée qui est elle-même un bouton', () => {
    const right = vi.fn()
    render(
      <SwipeRow right={{ label: 'Confirmer', onAction: right }}>
        <button type="button">Électricité · 96,40 €</button>
      </SwipeRow>,
    )
    const button = screen.getByRole('button', { name: 'Électricité · 96,40 €' })

    pointer('pointerDown', button, { x: 0 })
    pointer('pointerMove', button, { x: 120 })
    pointer('pointerUp', button, { x: 120 })

    expect(right).toHaveBeenCalledTimes(1)
  })

  /* Un défilement de page qui dérive un peu ne doit pas emporter la rangée. */
  it('laisse passer un geste plus vertical qu’horizontal', () => {
    const { track, row } = setup()
    pointer('pointerDown', track, { x: 0, y: 0 })
    pointer('pointerMove', track, { x: 20, y: 60 })
    expect(moved(row)).toBe('')
  })

  it('abandonne sans rien déclencher quand le pointeur est repris', () => {
    const { track, row, right } = setup()
    pointer('pointerDown', track, { x: 0 })
    pointer('pointerMove', track, { x: 120 })
    pointer('pointerCancel', track, { x: 120 })
    expect(right.onAction).not.toHaveBeenCalled()
    expect(moved(row)).toBe('')
  })
})
