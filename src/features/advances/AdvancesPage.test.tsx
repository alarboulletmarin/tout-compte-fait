import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { ADVANCE_NEW_PATH, RECURRENCES_PATH, SUPPORT_NEW_PATH } from '@/app/routes'
import {
  makeAdvance,
  makeCategory,
  makeData,
  makeFamily,
  makeMember,
  makeSavingSupport,
} from '@/domain/fixtures'
import { t } from '@/i18n/strings'
import { useStore } from '@/store/store'
import { AdvancesPage } from './AdvancesPage'

const initial = useStore.getState().data

function CurrentUrl() {
  const { pathname } = useLocation()
  return <span data-testid="url">{pathname}</span>
}

/* Un support d'épargne par défaut : c'est ce que le formulaire d'une avance
   exige, et l'écran change d'invitation quand il n'y en a aucun. */
function renderPage(
  advances: ReturnType<typeof makeAdvance>[],
  { withSupport = true }: { withSupport?: boolean } = {},
): void {
  useStore.setState({
    data: makeData({
      household: { name: 'Maison', members: [makeMember({ id: 'm1', name: 'Alix' })] },
      families: [makeFamily({ id: 'f-charge', kind: 'charge' })],
      categories: [
        makeCategory({ id: 'car-insurance', label: 'Assurance véhicule', familyId: 'f-charge' }),
      ],
      savingSupports: withSupport ? [makeSavingSupport({ id: 's1' })] : [],
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

  /* Principe 4 : la phrase d'un vide dépend de sa cause. Sans support
     d'épargne, le formulaire d'une avance ne peut pas être fini — il en exige
     un —, et « Ajoute la première » menait donc à une impasse. */
  it('renvoie au support d’épargne quand il n’y en a aucun', async () => {
    renderPage([], { withSupport: false })

    expect(screen.getByText(t.advances.emptyNoSupport)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: t.advances.add })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: t.savings.supportAdd }))
    expect(screen.getByTestId('url')).toHaveTextContent(SUPPORT_NEW_PATH)
  })
})
