import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Segmented } from './Segmented'

const OPTIONS = [
  { value: 'mois', label: 'Mois' },
  { value: 'trimestre', label: 'Trimestre' },
  { value: 'annee', label: 'Année' },
] as const

type Axis = (typeof OPTIONS)[number]['value']

/** La bascule telle qu'elle vit dans un écran : son choix est un état. */
function Harness({ initial = 'mois' }: { initial?: Axis }) {
  const [axis, setAxis] = useState<Axis>(initial)
  return <Segmented options={OPTIONS} value={axis} onChange={setAxis} label="Regroupement" />
}

describe('Segmented', () => {
  it('ne prend qu’un seul arrêt de tabulation, sur la position cochée', () => {
    render(<Harness initial="trimestre" />)
    const radios = screen.getAllByRole('radio')
    expect(radios.map((radio) => radio.tabIndex)).toEqual([-1, 0, -1])
  })

  it('déplace le choix et le focus à la flèche', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.tab()

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'Trimestre' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Trimestre' })).toHaveFocus()
  })

  it('boucle aux deux bouts', async () => {
    const user = userEvent.setup()
    render(<Harness initial="annee" />)
    await user.tab()

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'Mois' })).toBeChecked()

    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('radio', { name: 'Année' })).toBeChecked()
  })

  it('va aux extrémités avec Origine et Fin', async () => {
    const user = userEvent.setup()
    render(<Harness initial="trimestre" />)
    await user.tab()

    await user.keyboard('{End}')
    expect(screen.getByRole('radio', { name: 'Année' })).toBeChecked()

    await user.keyboard('{Home}')
    expect(screen.getByRole('radio', { name: 'Mois' })).toBeChecked()
  })

  it('descend à la position suivante, la bascule pouvant passer à la ligne', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.tab()

    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('radio', { name: 'Trimestre' })).toBeChecked()
  })

  /* Les flèches changent aussi de mois (`useHotkeys`), qui s'efface devant une
     frappe déjà consommée : sans `preventDefault`, choisir une position à la
     flèche changeait le mois derrière. */
  it('consomme la frappe, pour que la flèche ne change pas aussi de mois', async () => {
    const user = userEvent.setup()
    const seen = vi.fn<(event: KeyboardEvent) => void>()
    window.addEventListener('keydown', seen)
    render(<Harness />)
    await user.tab()

    await user.keyboard('{ArrowRight}')
    window.removeEventListener('keydown', seen)

    const event = seen.mock.calls.at(-1)?.[0]
    expect(event?.key).toBe('ArrowRight')
    expect(event?.defaultPrevented).toBe(true)
  })

  it('laisse passer les touches qu’elle ne prend pas', async () => {
    const user = userEvent.setup()
    const seen = vi.fn<(event: KeyboardEvent) => void>()
    window.addEventListener('keydown', seen)
    render(<Harness />)
    await user.tab()

    await user.keyboard('n')
    window.removeEventListener('keydown', seen)

    expect(seen.mock.calls.at(-1)?.[0].defaultPrevented).toBe(false)
  })

  it('coche au clic, comme avant', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('radio', { name: 'Année' }))
    expect(screen.getByRole('radio', { name: 'Année' })).toBeChecked()
  })

  /* La densité courte : ce qui rétrécit est la boîte, pas le sens. Une position
     qui n'affiche plus qu'un code ou un glyphe garde son libellé complet comme
     nom accessible — sans quoi la bascule du thème n'annoncerait rien du tout,
     ses trois positions n'ayant aucun texte. */
  describe('position raccourcie', () => {
    const SHORT = [
      { value: 'fr', label: 'Français', short: 'FR' },
      { value: 'en', label: 'English', short: 'EN' },
    ] as const

    it('garde le libellé complet comme nom accessible', () => {
      render(<Segmented options={SHORT} value="fr" onChange={vi.fn()} label="Langue" />)

      expect(screen.getByRole('radio', { name: 'Français' })).toBeChecked()
      expect(screen.getByRole('radio', { name: 'English' })).toBeInTheDocument()
    })

    it('n’affiche que la forme courte', () => {
      render(<Segmented options={SHORT} value="fr" onChange={vi.fn()} label="Langue" />)

      expect(screen.getByRole('radio', { name: 'Français' })).toHaveTextContent('FR')
      expect(screen.queryByText('Français')).not.toBeInTheDocument()
    })

    /* Un glyphe est `aria-hidden` : sans le nom porté par le bouton, la
       position n'aurait aucun nom accessible du tout. */
    it('nomme une position qui n’a qu’un glyphe', () => {
      const options = [
        { value: 'light' as const, label: 'Clair', short: <svg aria-hidden="true" /> },
        { value: 'dark' as const, label: 'Sombre', short: <svg aria-hidden="true" /> },
      ]
      render(<Segmented options={options} value="light" onChange={vi.fn()} label="Thème" />)

      expect(screen.getByRole('radio', { name: 'Clair' })).toBeChecked()
      expect(screen.getByRole('radio', { name: 'Sombre' })).not.toBeChecked()
    })

    /* Le clavier ne change pas d'une densité à l'autre : c'est la même bascule,
       et non une seconde qui aurait sa propre règle. */
    it('répond aux flèches comme la bascule pleine', async () => {
      const user = userEvent.setup()
      function ShortHarness() {
        const [locale, setLocale] = useState<'fr' | 'en'>('fr')
        return <Segmented options={SHORT} value={locale} onChange={setLocale} label="Langue" />
      }
      render(<ShortHarness />)
      await user.tab()

      await user.keyboard('{ArrowRight}')
      expect(screen.getByRole('radio', { name: 'English' })).toBeChecked()
      expect(screen.getByRole('radio', { name: 'English' })).toHaveFocus()
    })
  })
})
