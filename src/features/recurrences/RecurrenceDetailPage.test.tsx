import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { RECURRENCES_PATH } from '@/app/routes'
import {
  eur,
  makeCategory,
  makeData,
  makeDebt,
  makeEntry,
  makeFamily,
  makeRecurrence,
} from '@/domain/fixtures'
import { t } from '@/i18n/strings'
import { useStore } from '@/store/store'
import { RecurrenceDetailPage } from './RecurrenceDetailPage'

/* Le geste inverse d'« Ajouter une récurrence » : découvrir qu'une règle ne se
   répète pas. Trois issues, et la fiche ne propose jamais la mauvaise —
   voir `updates.convertsToSingleEntry` et `useRecurrenceConvertibility`. */

const initial = useStore.getState().data

function CurrentUrl() {
  const { pathname } = useLocation()
  return <span data-testid="url">{pathname}</span>
}

function show(id: string) {
  render(
    <MemoryRouter initialEntries={[`${RECURRENCES_PATH}/${id}`]}>
      <CurrentUrl />
      <Routes>
        <Route path={`${RECURRENCES_PATH}/:id`} element={<RecurrenceDetailPage />} />
        <Route path={RECURRENCES_PATH} element={null} />
      </Routes>
    </MemoryRouter>,
  )
}

const seed = (over: Parameters<typeof makeData>[0]) => {
  useStore.setState({
    data: makeData({
      families: [makeFamily({ id: 'fam-home', kind: 'charge' })],
      categories: [makeCategory({ id: 'cat-1', familyId: 'fam-home' })],
      ...over,
    }),
  })
}

const recurrences = () => useStore.getState().data.recurrences
const entries = () => useStore.getState().data.entries

afterEach(() => {
  useStore.setState({ data: initial })
})

describe('changer une récurrence en ponctuel — ce que le bouton propose', () => {
  it('propose la bascule quand rien n’est confirmé', () => {
    seed({
      recurrences: [
        makeRecurrence({ id: 'r1', period: { unit: 'month', every: 1, anchorDay: 5 } }),
      ],
      entries: [makeEntry({ id: 'p1', recurrenceId: 'r1', date: '2026-08-05', status: 'planned' })],
    })
    show('r1')
    expect(screen.getByRole('button', { name: t.recurrences.convertToOneTime })).toBeInTheDocument()
    expect(screen.queryByText(t.recurrences.convertToOneTimeBlocked)).not.toBeInTheDocument()
  })

  it('la propose aussi quand une échéance est déjà confirmée', () => {
    seed({
      recurrences: [
        makeRecurrence({ id: 'r1', period: { unit: 'month', every: 1, anchorDay: 5 } }),
      ],
      entries: [makeEntry({ id: 'c1', recurrenceId: 'r1', date: '2026-07-05', status: 'confirmed' })],
    })
    show('r1')
    expect(screen.getByRole('button', { name: t.recurrences.convertToOneTime })).toBeInTheDocument()
  })

  /* Pas de bouton grisé sans explication : la raison se lit, elle ne se
     devine pas — même principe que `savings.removeBlocked`. */
  it('l’efface, et dit pourquoi, sur la mensualité d’un crédit', () => {
    seed({
      recurrences: [
        makeRecurrence({ id: 'r1', period: { unit: 'month', every: 1, anchorDay: 5 } }),
      ],
      debts: [makeDebt({ id: 'd1', recurrenceId: 'r1' })],
    })
    show('r1')
    expect(
      screen.queryByRole('button', { name: t.recurrences.convertToOneTime }),
    ).not.toBeInTheDocument()
    expect(screen.getByText(t.recurrences.convertToOneTimeBlocked)).toBeInTheDocument()
  })

  it('l’efface aussi sur la reconstitution d’une avance', () => {
    seed({
      recurrences: [
        makeRecurrence({ id: 'r1', period: { unit: 'month', every: 1, anchorDay: 5 } }),
      ],
      advances: [
        {
          id: 'a1',
          label: 'Assurance',
          categoryId: 'cat-1',
          memberId: 'm1',
          amount: eur(60000),
          paidOn: '2026-01-10',
          from: '2026-01',
          to: '2026-12',
          recurrenceId: 'r1',
        },
      ],
    })
    show('r1')
    expect(
      screen.queryByRole('button', { name: t.recurrences.convertToOneTime }),
    ).not.toBeInTheDocument()
  })
})

describe('changer une récurrence en ponctuel — ce que ça fait', () => {
  it('annonce une ligne unique, puis la fait, sans échéance confirmée', async () => {
    const user = userEvent.setup()
    seed({
      recurrences: [
        makeRecurrence({ id: 'r1', label: 'Abonnement', period: { unit: 'month', every: 1, anchorDay: 5 } }),
      ],
      entries: [makeEntry({ id: 'p1', recurrenceId: 'r1', date: '2026-08-05', status: 'planned' })],
    })
    show('r1')
    await user.click(screen.getByRole('button', { name: t.recurrences.convertToOneTime }))

    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText(t.recurrences.convertToOneTimeConfirmSingle)).toBeInTheDocument()
    await user.click(dialog.getByRole('button', { name: t.recurrences.convertToOneTimeAction }))

    expect(recurrences()).toEqual([])
    expect(entries().map((e) => e.id)).toEqual(['p1'])
    expect(entries()[0]).not.toHaveProperty('recurrenceId')
    expect(screen.getByTestId('url')).toHaveTextContent(RECURRENCES_PATH)
  })

  /* Deux confirmées, pas une : une seule compte comme une ligne unique — voir
     le test dédié plus bas. */
  it('annonce un détachement, puis le fait, quand l’historique porte plus d’une confirmée', async () => {
    const user = userEvent.setup()
    seed({
      recurrences: [
        makeRecurrence({ id: 'r1', label: 'Abonnement', period: { unit: 'month', every: 1, anchorDay: 5 } }),
      ],
      entries: [
        makeEntry({ id: 'c1', recurrenceId: 'r1', date: '2026-06-05', status: 'confirmed' }),
        makeEntry({ id: 'c2', recurrenceId: 'r1', date: '2026-07-05', status: 'confirmed' }),
        makeEntry({ id: 'p3', recurrenceId: 'r1', date: '2026-08-05', status: 'planned' }),
      ],
    })
    show('r1')
    await user.click(screen.getByRole('button', { name: t.recurrences.convertToOneTime }))

    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText(t.recurrences.convertToOneTimeConfirmHistory)).toBeInTheDocument()
    await user.click(dialog.getByRole('button', { name: t.recurrences.convertToOneTimeAction }))

    expect(recurrences()).toEqual([])
    expect(entries().map((e) => e.id).sort()).toEqual(['c1', 'c2'])
    expect(entries().every((e) => !('recurrenceId' in e))).toBe(true)
  })

  /* Le cas courant d'une règle tout juste créée depuis une dépense déjà
     payée : une seule échéance confirmée n'en fait pas un historique. */
  it('annonce aussi une ligne unique avec une seule échéance confirmée', async () => {
    const user = userEvent.setup()
    seed({
      recurrences: [
        makeRecurrence({ id: 'r1', label: 'Assurance', period: { unit: 'month', every: 1, anchorDay: 5 } }),
      ],
      entries: [makeEntry({ id: 'c1', recurrenceId: 'r1', date: '2026-08-05', status: 'confirmed' })],
    })
    show('r1')
    await user.click(screen.getByRole('button', { name: t.recurrences.convertToOneTime }))

    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText(t.recurrences.convertToOneTimeConfirmSingle)).toBeInTheDocument()
    await user.click(dialog.getByRole('button', { name: t.recurrences.convertToOneTimeAction }))

    expect(recurrences()).toEqual([])
    expect(entries().map((e) => e.id)).toEqual(['c1'])
  })
})
