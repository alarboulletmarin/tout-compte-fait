/* ============================================================================
 * La pile d'un compte — départ, versements, rendement.
 *
 * Trois choses à tenir, et aucune n'est une question de dessin.
 *
 * La **légende nomme et chiffre chaque couche** : c'est elle qui empêche la
 * couleur de dire seule ce qu'est une aire (DS §2.3), et c'est aussi la lecture
 * textuelle que le cahier §5 demande de tout graphique.
 *
 * Elle est **actionnable**, donc atteignable : ce qui s'éteint d'un clic doit
 * s'éteindre au clavier, et dire son état — un `aria-pressed`, pas une opacité.
 *
 * Et l'**échelle suit le réglage**. Éteindre une couche la retire de la pile et
 * de l'échelle : c'est ce qui rend le geste utile — sur un capital où le départ
 * pèse quarante fois le rendement, les deux couches intéressantes ne se voient
 * qu'une fois la première éteinte. Le sommet change alors de nom, parce qu'une
 * somme amputée n'est plus « la valeur ».
 * ==========================================================================*/

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { eur } from '@/domain/fixtures'
import { NO_VALUE, formatRoundedMoney } from '@/i18n/format'
import { GrowthAreas } from './GrowthAreas'

afterEach(cleanup)

const layers = [
  { id: 'base', label: 'Départ', fill: 'var(--surface-2)', values: [eur(100_000), eur(100_000), eur(100_000)] },
  { id: 'paid', label: 'Versements', fill: 'var(--accent-2)', values: [eur(0), eur(20_000), eur(40_000)] },
  { id: 'gain', label: 'Rendement', fill: 'var(--accent)', values: [eur(0), eur(500), eur(1_200)] },
]

const show = (over: Partial<Parameters<typeof GrowthAreas>[0]> = {}) =>
  render(
    <GrowthAreas
      layers={layers}
      ranks={['janv.', 'févr.', 'mars']}
      totalLabel="Valeur"
      partialLabel="Somme affichée"
      label="Décomposition"
      srText="De 1 000 € à 1 412 €."
      {...over}
    />,
  )

/* Les montants portent des espaces insécables ; `getByText` les normalise à la
   lecture, donc l'attente doit l'être aussi. Un nom accessible, lui, n'est pas
   normalisé — d'où la lecture par `within` plutôt que par `name:`. */
const euros = (amount: number): string =>
  formatRoundedMoney(eur(amount), 'EUR').replace(/\s+/g, ' ')

/** L'entrée de légende d'une couche, visée par son nom seul. */
const legend = (label: string) => screen.getByRole('button', { name: new RegExp(`^${label}`) })

describe('la légende', () => {
  it('nomme chaque couche et chiffre la valeur au dernier rang', () => {
    show()
    /* La lecture s'ouvre sur l'arrivée : c'est le chiffre qu'on vient chercher,
       et un graphique qui s'ouvrirait sur son premier rang montrerait l'état
       d'il y a cinq ans. */
    expect(within(legend('Versements')).getByText(euros(40_000))).toBeInTheDocument()
    expect(within(legend('Rendement')).getByText(euros(1_200))).toBeInTheDocument()
    expect(screen.getByText('Valeur')).toBeInTheDocument()
    expect(screen.getAllByText(euros(141_200)).length).toBeGreaterThan(0)
  })

  it('suit le curseur, au clavier', async () => {
    const user = userEvent.setup()
    show()
    /* Trois boutons de légende avant le curseur : c'est lui qu'on vise, et il
       n'a qu'un seul arrêt de tabulation. */
    await user.tab()
    await user.tab()
    await user.tab()
    await user.tab()
    await user.keyboard('{Home}')
    expect(within(legend('Versements')).getByText(euros(0))).toBeInTheDocument()
  })

  it('porte la lecture accessible sous le tracé', () => {
    show()
    expect(screen.getByText('De 1 000 € à 1 412 €.')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Décomposition' })).toBeInTheDocument()
  })
})

describe('éteindre une couche', () => {
  it('la dit éteinte, et la rallume', async () => {
    const user = userEvent.setup()
    show()
    const gain = legend('Rendement')
    expect(gain).toHaveAttribute('aria-pressed', 'true')
    await user.click(gain)
    expect(gain).toHaveAttribute('aria-pressed', 'false')
    /* Son chiffre reste lisible : on a masqué une aire, pas une information. */
    expect(within(gain).getByText(euros(1_200))).toBeInTheDocument()
    await user.click(gain)
    expect(gain).toHaveAttribute('aria-pressed', 'true')
  })

  it('retire la couche de la somme, et le sommet change de nom', async () => {
    const user = userEvent.setup()
    show()
    expect(screen.getByText('Valeur')).toBeInTheDocument()

    await user.click(legend('Rendement'))
    /* La somme tombe à 140 000 € — départ plus versements — et ne s'appelle
       plus « Valeur » : le compte en vaut toujours 141 200. */
    expect(screen.getByText('Somme affichée')).toBeInTheDocument()
    expect(screen.queryByText('Valeur')).not.toBeInTheDocument()
    expect(screen.getAllByText(euros(140_000)).length).toBeGreaterThan(0)
  })

  /* La contrepartie honnête du réglage : un point marque un mois où le sommet
     est un fait relevé. Dès qu'une couche manque, il ne l'est plus. */
  it('efface les points de relevé tant qu’une couche manque', async () => {
    const user = userEvent.setup()
    const { container } = show({ dots: [0, 2] })
    expect(container.querySelectorAll('circle')).toHaveLength(2)
    await user.click(legend('Rendement'))
    expect(container.querySelectorAll('circle')).toHaveLength(0)
  })

  /* Un cadre vide n'est pas une lecture : la dernière couche allumée se
     désactive plutôt que de refuser le clic sans rien expliquer. */
  it('refuse d’éteindre la dernière', async () => {
    const user = userEvent.setup()
    show()
    await user.click(legend('Rendement'))
    await user.click(legend('Versements'))
    expect(legend('Départ')).toBeDisabled()
  })
})

describe('une couche négative', () => {
  it('se chiffre signée plutôt que de disparaître', () => {
    show({
      layers: [
        layers[0] as (typeof layers)[0],
        layers[1] as (typeof layers)[0],
        { ...(layers[2] as (typeof layers)[0]), values: [eur(0), eur(-2_000), eur(-5_000)] },
      ],
    })
    expect(within(legend('Rendement')).getByText(euros(-5_000))).toBeInTheDocument()
  })
})

describe('un trou dans une couche', () => {
  it('se lit « — » et non zéro', async () => {
    const user = userEvent.setup()
    show({
      layers: [{ ...(layers[0] as (typeof layers)[0]), values: [null, eur(100_000), eur(100_000)] }],
    })
    await user.tab()
    await user.keyboard('{Home}')
    expect(screen.getAllByText(NO_VALUE).length).toBeGreaterThan(0)
  })
})

describe('une pile vide', () => {
  it('tient debout sans couche du tout', () => {
    show({ layers: [] })
    expect(screen.getByRole('img', { name: 'Décomposition' })).toBeInTheDocument()
  })
})
