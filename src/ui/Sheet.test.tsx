import { createEvent, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { t } from '@/i18n/strings'
import { Sheet } from './Sheet'

/* jsdom pose la fenêtre à 1024px, donc la boîte centrée. Une feuille montante
   se déclare, et les tests qui parlent d'un téléphone le disent. */
const PHONE = 390
const DESKTOP = 1024

function width(value: number): void {
  Object.defineProperty(window, 'innerWidth', { value, configurable: true, writable: true })
}

afterEach(() => {
  width(DESKTOP)
})

/**
 * Un pointeur qui bouge, à la position et à l'instant qu'on lui donne.
 *
 * Les trois propriétés sont posées à la main : jsdom n'a pas de constructeur
 * `PointerEvent`, donc `fireEvent` retombe sur `Event`, qui ignore tout ce
 * qu'il ne connaît pas — et `timeStamp` est en lecture seule partout, alors que
 * la vitesse du lancer se mesure dessus.
 *
 * Les instants partent de `START` et jamais de zéro : React lit `timeStamp` en
 * `event.timeStamp || Date.now()`, donc un zéro se ferait remplacer par
 * l'horloge et deux événements posés au même instant se retrouveraient à
 * quelques millisecondes l'un de l'autre — c'est-à-dire lancés.
 */
const START = 1000

function pointer(
  kind: 'pointerDown' | 'pointerMove' | 'pointerUp',
  node: Element,
  { y, at = START }: { y: number; at?: number },
): void {
  const event = createEvent[kind](node, { pointerId: 1 })
  for (const [key, value] of Object.entries({ pointerId: 1, clientY: y, timeStamp: at })) {
    Object.defineProperty(event, key, { value, configurable: true })
  }
  fireEvent(node, event)
}

function open(props: Partial<Parameters<typeof Sheet>[0]> = {}, phone = true) {
  width(phone ? PHONE : DESKTOP)
  const onClose = vi.fn()
  render(
    <Sheet open onClose={onClose} title="Le jour" pullToClose {...props}>
      <p>Deux échéances</p>
    </Sheet>,
  )
  const dialog = screen.getByRole('dialog', { hidden: true })
  return { onClose, dialog }
}

/**
 * Ce que la touche Échap envoie à un `<dialog>` ouvert.
 *
 * Construit à la main : `createEvent` n'a pas de fabrique `cancel`, et jsdom
 * n'émet rien sur une vraie touche puisque son `showModal()` est un bouchon. Il
 * faut l'objet lui-même et non le booléen de `fireEvent` : c'est
 * `defaultPrevented` qui dit que la feuille a refusé de se fermer.
 */
function pressEscape(node: Element): Event {
  const event = new Event('cancel', { bubbles: false, cancelable: true })
  fireEvent(node, event)
  return event
}

/** La zone de prise : la poignée et l'en-tête, réunis sous un même parent. */
function band(): HTMLElement {
  const header = screen.getByRole('heading', { name: 'Le jour' }).closest('header')
  expect(header?.parentElement).not.toBeNull()
  return header?.parentElement as HTMLElement
}

/* `div` et pas n'importe quoi : les glyphes Phosphor portent eux aussi
   `aria-hidden`, et la croix vit dans la même feuille. */
function handle(dialog: HTMLElement): Element | null {
  return dialog.querySelector('div[aria-hidden="true"]')
}

/** Ce que le glissement a déplacé, tel que le style en ligne le dit. */
function pulled(dialog: HTMLElement): string {
  return (dialog.firstElementChild as HTMLElement).style.transform
}

describe('Sheet — la poignée', () => {
  it('n’existe que là où le geste existe', () => {
    const { dialog } = open()
    expect(handle(dialog)).not.toBeNull()
  })

  it('disparaît avec lui', () => {
    const { dialog } = open({ pullToClose: false })
    expect(handle(dialog)).toBeNull()
  })
})

describe('Sheet — tirer vers le bas', () => {
  it('referme au-delà du seuil', () => {
    const { onClose } = open()
    const zone = band()

    pointer('pointerDown', zone, { y: 100 })
    pointer('pointerMove', zone, { y: 220 })
    pointer('pointerUp', zone, { y: 220 })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('revient à sa place en deçà', () => {
    const { onClose, dialog } = open()
    const zone = band()

    pointer('pointerDown', zone, { y: 100 })
    pointer('pointerMove', zone, { y: 160 })
    expect(pulled(dialog)).toBe('translateY(60px)')

    pointer('pointerUp', zone, { y: 160 })
    expect(onClose).not.toHaveBeenCalled()
    expect(pulled(dialog)).toBe('')
  })

  /* Sans le lancer, chasser la feuille d'un coup de pouce ne ferait rien : 40px
     en 20ms, c'est 2 px/ms, et personne ne parcourt quatre-vingt-seize pixels
     pour se débarrasser de quelque chose. */
  it('referme sur un lancer, sans atteindre le seuil', () => {
    const { onClose } = open()
    const zone = band()

    pointer('pointerDown', zone, { y: 100, at: START })
    pointer('pointerMove', zone, { y: 140, at: START + 20 })
    pointer('pointerUp', zone, { y: 140, at: START + 20 })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ne monte jamais au-dessus de sa place', () => {
    const { dialog } = open()
    const zone = band()

    pointer('pointerDown', zone, { y: 200 })
    pointer('pointerMove', zone, { y: 40 })

    expect(pulled(dialog)).toBe('')
  })

  /* Le piège que `MonthNav` documente : un bouton posé sous une capture de
     pointeur attrape le glissement au lieu du clic. La croix vit dans la zone
     de prise, donc c'est exactement le cas. */
  it('ne part pas de la croix, qui reste un bouton', async () => {
    const user = userEvent.setup()
    const { onClose, dialog } = open()
    const close = screen.getByRole('button', { name: t.common.close })

    pointer('pointerDown', close, { y: 100 })
    pointer('pointerMove', close, { y: 400 })
    pointer('pointerUp', close, { y: 400 })
    expect(pulled(dialog)).toBe('')
    expect(onClose).not.toHaveBeenCalled()

    await user.click(close)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('n’existe pas sur une boîte centrée', () => {
    const { onClose, dialog } = open({}, false)
    const zone = band()

    pointer('pointerDown', zone, { y: 100 })
    pointer('pointerMove', zone, { y: 400 })
    pointer('pointerUp', zone, { y: 400 })

    expect(pulled(dialog)).toBe('')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('ne se rend pas sans y avoir été invitée', () => {
    const { onClose } = open({ pullToClose: false })
    const zone = band()

    pointer('pointerDown', zone, { y: 100 })
    pointer('pointerMove', zone, { y: 400 })
    pointer('pointerUp', zone, { y: 400 })

    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('Sheet : la feuille qu’on ne referme pas', () => {
  /* Les trois sorties sans mot, une par une. Elles restent en place par défaut :
     le dernier cas de ce bloc est là pour que retirer la garde se voie. */
  it('ignore Échap', () => {
    const { onClose, dialog } = open({ dismissible: false })
    expect(pressEscape(dialog).defaultPrevented).toBe(true)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('ignore le clic sur le fond', () => {
    const { onClose, dialog } = open({ dismissible: false })
    fireEvent.click(dialog)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('ne rend pas de croix', () => {
    open({ dismissible: false })
    expect(screen.queryByRole('button', { name: t.common.close })).not.toBeInTheDocument()
  })

  it('laisse les trois sorties en place par défaut', () => {
    const { onClose, dialog } = open()

    pressEscape(dialog)
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.click(dialog)
    expect(onClose).toHaveBeenCalledTimes(2)

    expect(screen.getByRole('button', { name: t.common.close })).toBeInTheDocument()
  })

  it('désigne son texte quand on le lui demande', () => {
    const { dialog } = open({ describedBy: 'le-corps' })
    expect(dialog).toHaveAttribute('aria-describedby', 'le-corps')
  })

  it('ne désigne rien sans qu’on le demande', () => {
    const { dialog } = open()
    expect(dialog).not.toHaveAttribute('aria-describedby')
  })

  /* `showModal()` viserait le premier élément focusable du contenu, dont un
     lecteur d'écran annoncerait le nom à la place de la description. */
  it('prend le focus elle-même', () => {
    const { dialog } = open({ dismissible: false })
    expect(dialog).toHaveFocus()
    expect(dialog).toHaveAttribute('tabindex', '-1')
  })

  it('ne le prend pas quand la croix est là pour l’avoir', () => {
    const { dialog } = open()
    expect(dialog).not.toHaveFocus()
    expect(dialog).not.toHaveAttribute('tabindex')
  })

  /* La poignée est la quatrième sortie : elle n'a pas à survivre là où les trois
     autres ont été retirées, même si les deux props se posent côte à côte. */
  it('ne prend pas le glissement, même invitée à le prendre', () => {
    const { onClose, dialog } = open({ dismissible: false, pullToClose: true })
    expect(handle(dialog)).toBeNull()

    const zone = band()
    pointer('pointerDown', zone, { y: 100 })
    pointer('pointerMove', zone, { y: 400 })
    pointer('pointerUp', zone, { y: 400 })

    expect(pulled(dialog)).toBe('')
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('Sheet — le pied de feuille', () => {
  it('n’annonce rien quand il n’y a pas d’actions à annoncer', () => {
    open({ footerLead: <p>Ajouter</p> })
    expect(screen.queryByText('Ajouter')).not.toBeInTheDocument()
  })

  it('pose la légende au-dessus des actions, qui gardent leur partage', () => {
    open({ footerLead: <p>Ajouter</p>, footer: <button type="button">Dépense</button> })

    const lead = screen.getByText('Ajouter')
    const action = screen.getByRole('button', { name: 'Dépense' })
    expect(lead.nextElementSibling).toContainElement(action)
    expect(lead.nextElementSibling).toHaveClass('[&>*]:flex-1')
  })
})
