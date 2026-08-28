import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { addMonthsToYm, startOfMonth, today, ymOf } from '@/domain/date'
import { eur, makeCategory, makeData, makeEntry, makeFamily, makeRecurrence } from '@/domain/fixtures'
import { ENTRY_NEW_PATH, RECURRENCES_PATH } from '@/app/routes'
import { ALL_FILTER, useStore } from '@/store/store'
import { UpcomingSection } from './UpcomingSection'

const initial = useStore.getState().data
const current = ymOf(today())
const next = addMonthsToYm(current, 1)

const FAMILIES = [makeFamily({ id: 'f-charge', kind: 'charge' })]
const CATEGORIES = [makeCategory({ id: 'cat-1', familyId: 'f-charge' })]

/**
 * Deux sortes de lignes, deux portes.
 *
 * Une échéance **posée** vit dans le document : sa porte est sa fiche, où le
 * montant se corrige. Une échéance **projetée** vient d'un mois jamais ouvert
 * (`upcomingDue`) : elle n'existe nulle part, et sa seule porte honnête est la
 * règle qui la projette.
 */
function mount(): void {
  useStore.setState({
    ym: current,
    filter: ALL_FILTER,
    data: makeData({
      families: FAMILIES,
      categories: CATEGORIES,
      /* La règle projette dans tous les mois non ouverts de l'horizon ; le
         mois suivant, lui, est ouvert et porte une échéance posée. */
      recurrences: [
        makeRecurrence({
          id: 'r-elec',
          label: 'Électricité',
          categoryId: 'cat-1',
          amount: eur(9_000),
          startedOn: '2020-01-15',
          period: { unit: 'month', every: 1, anchorDay: 15 },
        }),
      ],
      months: [{ ym: next, openedAt: startOfMonth(next), closed: false }],
      entries: [
        makeEntry({
          id: 'e-loyer',
          date: `${next}-05`,
          label: 'Loyer',
          categoryId: 'cat-1',
          amount: eur(90_000),
          status: 'planned',
        }),
      ],
    }),
  })

  render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<UpcomingSection />} />
        <Route path={`${ENTRY_NEW_PATH}/:id`} element={<p>fiche-entree</p>} />
        <Route path={`${RECURRENCES_PATH}/:id`} element={<p>fiche-regle</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('les prochaines échéances, chacune une porte', () => {
  afterEach(() => {
    useStore.setState({ data: initial })
  })

  it('ouvre la fiche d’une échéance posée dans le document', async () => {
    mount()
    await userEvent.click(screen.getByRole('link', { name: /Loyer/ }))
    expect(screen.getByText('fiche-entree')).toBeInTheDocument()
  })

  it('ouvre la règle d’une échéance projetée, qui n’a pas de fiche', async () => {
    mount()
    const projected = screen.getAllByRole('link', { name: /Électricité/ })
    await userEvent.click(projected[0]!)
    expect(screen.getByText('fiche-regle')).toBeInTheDocument()
  })
})
