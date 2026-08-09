import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { t } from '@/i18n/strings'
import { PageTitle } from './PageTitle'
import { ScreenTitleProvider } from './ScreenTitleProvider'

function inShell(node: React.ReactNode) {
  return render(
    <MemoryRouter>
      <ScreenTitleProvider>{node}</ScreenTitleProvider>
    </MemoryRouter>,
  )
}

const announced = () => screen.getByRole('status').textContent

describe('PageTitle', () => {
  it('porte le titre visible dans un h1', () => {
    inShell(<PageTitle title="Crédits et dettes" />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Crédits et dettes')
  })

  /* Le mois et le calendrier portent leur nom dans leur bandeau : le titre
     existe pour être entendu, pas pour être lu deux fois. */
  it('garde un h1 même quand l’écran ne l’affiche pas', () => {
    inShell(<PageTitle title="Le mois" hidden />)
    expect(screen.getByRole('heading', { level: 1, name: 'Le mois' })).toBeInTheDocument()
  })

  it('annonce le titre à l’arrivée sur l’écran', () => {
    inShell(<PageTitle title="Crédits et dettes" />)
    expect(announced()).toBe('Crédits et dettes')
  })

  it('annonce aussi un titre qui ne s’affiche pas', () => {
    inShell(<PageTitle title="Le mois" hidden />)
    expect(announced()).toBe('Le mois')
  })

  /* Une région live insérée en même temps que son contenu n'est pas annoncée :
     elle doit exister d'abord, et vide. */
  it('tient sa région prête avant qu’un titre n’arrive', () => {
    render(
      <MemoryRouter>
        <ScreenTitleProvider>
          <p>Un écran sans titre</p>
        </ScreenTitleProvider>
      </MemoryRouter>,
    )
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('rend le retour, à gauche du titre', async () => {
    const back = vi.fn()
    inShell(<PageTitle title="Ajouter un crédit" onBack={back} />)

    await userEvent.click(screen.getByRole('button', { name: t.common.back }))
    expect(back).toHaveBeenCalledOnce()
  })

  it('n’offre aucun retour aux écrans que la navigation tient déjà', () => {
    inShell(<PageTitle title="Crédits et dettes" />)
    expect(screen.queryByRole('button', { name: t.common.back })).not.toBeInTheDocument()
  })

  /* Hors coquille — le styleguide, les deux questions du début —, il n'y a
     personne pour écouter : le titre s'affiche, et rien ne casse. */
  it('s’affiche hors de toute coquille sans rien annoncer', () => {
    render(
      <MemoryRouter>
        <PageTitle title="Nuancier" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Nuancier')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
