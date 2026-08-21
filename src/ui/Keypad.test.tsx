import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { t } from '@/i18n/strings'
import { Keypad } from './Keypad'
import { amountFromKeys } from './keypad'

/* Le pavé est piloté par son appelant : le tester sans état revient à tester
   qu'il appelle `onChange`, ce qui n'apprend rien sur ce qu'il compose. */
function Host({ onSubmit, onClose }: { onSubmit?: () => void; onClose?: () => void }) {
  const [value, setValue] = useState('')
  return (
    <>
      <output data-testid="keys">{value}</output>
      <Keypad
        value={value}
        onChange={setValue}
        label="Montant"
        {...(onSubmit ? { onSubmit } : {})}
        {...(onClose ? { onClose } : {})}
      />
    </>
  )
}

const keys = (): string => screen.getByTestId('keys').textContent ?? ''

describe('amountFromKeys', () => {
  /* La saisie part des centimes, comme sur un terminal de paiement : « 5 » vaut
     cinq centimes, et le séparateur se pose tout seul à deux chiffres de la
     fin. C'est la seule chose délicate de la conversion. */
  it('lit les chiffres comme des centimes', () => {
    expect(amountFromKeys('5')).toBe(5)
    expect(amountFromKeys('10420')).toBe(10_420)
    expect(amountFromKeys('000')).toBe(0)
  })

  it('ne rend rien tant que rien n’est tapé', () => {
    expect(amountFromKeys('')).toBeNull()
  })
})

describe('Keypad', () => {
  it('compose un montant, chiffre à chiffre', () => {
    render(<Host />)
    for (const digit of ['1', '0', '4', '2', '0']) {
      fireEvent.click(screen.getByRole('button', { name: digit }))
    }
    expect(keys()).toBe('10420')
  })

  /* « 00 » est la touche des montants ronds : elle écrit deux zéros d'un coup,
     et non un zéro que la garde des zéros de tête effacerait. */
  it('écrit deux zéros d’un coup', () => {
    render(<Host />)
    fireEvent.click(screen.getByRole('button', { name: '9' }))
    fireEvent.click(screen.getByRole('button', { name: '00' }))
    expect(keys()).toBe('900')
  })

  it('n’accumule pas les zéros de tête', () => {
    render(<Host />)
    fireEvent.click(screen.getByRole('button', { name: '0' }))
    fireEvent.click(screen.getByRole('button', { name: '0' }))
    fireEvent.click(screen.getByRole('button', { name: '5' }))
    expect(keys()).toBe('5')
  })

  /* Le glyphe est muet (DS §9.2) : le nom vit sur le bouton, sinon la touche
     n'aurait aucun nom pour un lecteur d'écran. */
  it('nomme la touche d’effacement sur le contrôle', () => {
    render(<Host />)
    fireEvent.click(screen.getByRole('button', { name: '7' }))
    fireEvent.click(screen.getByRole('button', { name: '8' }))
    fireEvent.click(screen.getByRole('button', { name: t.keypad.erase }))
    expect(keys()).toBe('7')
  })

  it('accepte la frappe au clavier', () => {
    render(<Host />)
    fireEvent.keyDown(window, { key: '4' })
    fireEvent.keyDown(window, { key: '2' })
    expect(keys()).toBe('42')
    fireEvent.keyDown(window, { key: 'Backspace' })
    expect(keys()).toBe('4')
    fireEvent.keyDown(window, { key: 'Delete' })
    expect(keys()).toBe('')
  })

  /* Le piège que le handoff signale : un pavé monté quelque part sur la page
     ne doit pas voler les chiffres du formulaire ouvert à côté. La garde est
     celle de `useHotkeys`, et elle vaut pour tous les raccourcis de l'app. */
  it('laisse les chiffres aux champs de saisie', () => {
    render(
      <>
        <input aria-label="Libellé" />
        <Host />
      </>,
    )
    fireEvent.keyDown(screen.getByLabelText('Libellé'), { key: '4' })
    expect(keys()).toBe('')
  })

  it('branche Entrée et Échap quand l’appelant les lui donne', () => {
    let submitted = 0
    let closed = 0
    render(
      <Host
        onSubmit={() => {
          submitted += 1
        }}
        onClose={() => {
          closed += 1
        }}
      />,
    )
    fireEvent.keyDown(window, { key: 'Enter' })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect([submitted, closed]).toEqual([1, 1])
  })

  /* Chaque touche est un vrai bouton, et le DS §8 pose 44px de cible. jsdom ne
     mesure rien : ce qu'on vérifie ici est la classe de hauteur, qui est le
     seul endroit où la mesure est écrite. */
  it('tient la cible tactile sur les douze touches', () => {
    render(<Host />)
    const pad = screen.getByRole('group', { name: 'Montant' })
    const buttons = pad.querySelectorAll('button')
    expect(buttons).toHaveLength(12)
    for (const button of buttons) {
      expect(button).toHaveAttribute('type', 'button')
      expect(button.className).toContain('h-14')
    }
  })
})
