import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { ADVANCE_NEW_PATH, RECURRENCES_PATH } from '@/app/routes'
import { makeAdvance, makeCategory, makeData, makeFamily, makeMember } from '@/domain/fixtures'
import { t } from '@/i18n/strings'
import { useStore } from '@/store/store'
import { AdvancesPage } from './AdvancesPage'

const initial = useStore.getState().data

function CurrentUrl() {
  const { pathname } = useLocation()
  return <span data-testid="url">{pathname}</span>
}

function renderPage(advances: ReturnType<typeof makeAdvance>[]): void {
  useStore.setState({
    data: makeData({
      household: { name: 'Maison', members: [makeMember({ id: 'm1', name: 'Alix' })] },
      families: [makeFamily({ id: 'f-charge', kind: 'charge' })],
      categories: [
        makeCategory({ id: 'car-insurance', label: 'Assurance véhicule', familyId: 'f-charge' }),
      ],
      advances,
    }),
  })

  render(
    <MemoryRouter>
      <AdvancesPage />
      <CurrentUrl />
    </MemoryRouter>,
  )
}

describe('AdvancesPage', () => {
  afterEach(() => {
    useStore.setState({ data: initial })
  })

  it('met le reste à remettre en tête de chaque avance', () => {
    renderPage([makeAdvance({ id: 'a1' })])

    expect(screen.getByText('Assurance auto')).toBeInTheDocument()
    expect(screen.getByText(t.advances.remaining)).toBeInTheDocument()
    /* Rien n'est encore revenu sur le livret : le reste vaut le montant avancé,
       et c'est lui le chiffre de la carte. */
    expect(screen.getByText(/^600,00\s€$/)).toBeInTheDocument()
    expect(screen.getByText(/Alix · Assurance véhicule/)).toBeInTheDocument()
  })

  it('revient aux récurrences', async () => {
    renderPage([makeAdvance({ id: 'a1' })])

    await userEvent.click(screen.getByRole('button', { name: t.common.back }))
    expect(screen.getByTestId('url')).toHaveTextContent(RECURRENCES_PATH)
  })

  it('mène à la saisie d’une avance', async () => {
    renderPage([makeAdvance({ id: 'a1' })])

    await userEvent.click(screen.getByRole('button', { name: t.common.add }))
    expect(screen.getByTestId('url')).toHaveTextContent(ADVANCE_NEW_PATH)
  })

  it('demande avant de retirer une avance', async () => {
    renderPage([makeAdvance({ id: 'a1' })])

    await userEvent.click(screen.getByRole('button', { name: t.advances.remove }))
    expect(screen.getByText(t.advances.removeConfirm)).toBeInTheDocument()
  })

  /* Le vide occupe la page : le DS §7 y veut une invitation et non un constat,
     et le titre n'y porte pas de bouton — l'état vide en a déjà un. */
  it('invite à poser la première avance', async () => {
    renderPage([])

    expect(screen.getByText(t.advances.emptyInvite)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: t.advances.add })).toHaveLength(1)

    await userEvent.click(screen.getByRole('button', { name: t.advances.add }))
    expect(screen.getByTestId('url')).toHaveTextContent(ADVANCE_NEW_PATH)
  })
})
