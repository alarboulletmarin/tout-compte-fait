/* ============================================================================
 * Les aires empilées.
 *
 * Deux règles à tenir, et aucune n'est une question de dessin.
 *
 * La **légende nomme et chiffre chaque bande** : c'est elle qui empêche la
 * couleur de dire seule ce qu'est une bande (DS §2.3), et c'est aussi la lecture
 * textuelle que le cahier §5 demande de tout graphique.
 *
 * Un **trou interrompt toute la pile** à son rang. Une bande manquante rendrait
 * fausses celles du dessus, et un total amputé se lirait comme une chute — c'est
 * la règle du cahier §4.7, « pas de graphique à zéro », appliquée à une figure
 * qui a deux contours.
 * ==========================================================================*/

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { eur } from '@/domain/fixtures'
import { NO_VALUE, formatRoundedMoney } from '@/i18n/format'
import { StackedAreas } from './StackedAreas'

afterEach(cleanup)

const bands = [
  {
    id: 'a',
    label: 'Livret A',
    color: 'var(--cat-1)',
    values: [eur(100_000), eur(200_000), eur(300_000)],
  },
  { id: 'b', label: 'PEA', color: 'var(--cat-2)', values: [eur(50_000), eur(50_000), eur(50_000)] },
]

const show = (over: Partial<Parameters<typeof StackedAreas>[0]> = {}) =>
  render(
    <StackedAreas
      bands={bands}
      ranks={['janv.', 'févr.', 'mars']}
      totalLabel="Total"
      label="Évolution"
      srText="De 1 500 € à 3 500 €."
      {...over}
    />,
  )

/* Les montants portent des espaces insécables ; testing-library les normalise à
   la lecture, donc l'attente doit l'être aussi. */
const euros = (amount: number): string =>
  formatRoundedMoney(eur(amount), 'EUR').replace(/\s+/g, ' ')

describe('la légende', () => {
  it('nomme chaque bande et chiffre le total au dernier rang', () => {
    show()
    expect(screen.getByText('Livret A')).toBeInTheDocument()
    expect(screen.getByText('PEA')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    /* La lecture s'ouvre sur l'arrivée : c'est le chiffre qu'on vient
       chercher, et un graphique qui s'ouvrirait sur son premier rang
       montrerait l'état d'il y a cinq ans. */
    expect(screen.getByText(euros(300_000))).toBeInTheDocument()
    /* Le total tombe aussi sur la graduation haute de l'axe : c'est bien le
       sommet de la pile, et les deux doivent donc dire la même chose. */
    expect(screen.getAllByText(euros(350_000)).length).toBeGreaterThan(0)
  })

  it('suit le curseur, au clavier', async () => {
    const user = userEvent.setup()
    show()
    await user.tab()
    await user.keyboard('{Home}')
    expect(screen.getByText(euros(100_000))).toBeInTheDocument()
    expect(screen.getByText(euros(150_000))).toBeInTheDocument()
  })

  it('porte la lecture accessible sous le tracé', () => {
    show()
    expect(screen.getByText('De 1 500 € à 3 500 €.')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Évolution' })).toBeInTheDocument()
  })
})

describe('un trou dans une bande', () => {
  it('se lit « — » et non zéro', async () => {
    const user = userEvent.setup()
    show({
      bands: [{ ...bands[0], values: [null, eur(200_000), eur(300_000)] } as (typeof bands)[0]],
    })
    await user.tab()
    await user.keyboard('{Home}')
    expect(screen.getAllByText(NO_VALUE).length).toBeGreaterThan(0)
  })
})

describe('une pile vide', () => {
  it('tient debout sans bande du tout', () => {
    show({ bands: [] })
    expect(screen.getByRole('img', { name: 'Évolution' })).toBeInTheDocument()
  })
})
