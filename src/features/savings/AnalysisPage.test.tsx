/* ============================================================================
 * Le tracé et le cumul de l'année, descendus de la vue d'ensemble.
 *
 * Les deux seules lectures de l'épargne qui capitalisent vivent ici — voir
 * `SavingsPage.test.tsx`, qui protège l'aperçu que la vue d'ensemble en garde.
 * ==========================================================================*/

import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import {
  eur,
  makeCategory,
  makeData,
  makeEntry,
  makeFamily,
  makeMember,
  makeSavingSupport,
} from '@/domain/fixtures'
import { supports } from '@/i18n/supports'
import { t } from '@/i18n/strings'
import { ALL_FILTER, useStore } from '@/store/store'
import { ScreenTitleProvider } from '@/ui/ScreenTitleProvider'
import { AnalysisPage } from './AnalysisPage'

const initial = useStore.getState().data
const ANDREA = makeMember({ id: 'm-1', name: 'Andrea' })

function seed() {
  useStore.setState({
    filter: { kind: 'member', memberId: 'm-1' },
    data: makeData({
      household: { name: '', members: [ANDREA] },
      families: [makeFamily({ id: 'fam-savings', label: 'Épargne', kind: 'saving' })],
      categories: [makeCategory({ id: 'passbook', label: 'Livrets', familyId: 'fam-savings' })],
      savingSupports: [makeSavingSupport({ id: 's-1', label: 'Livret A', memberId: 'm-1' })],
      entries: [
        makeEntry({
          id: 'v1',
          date: '2026-07-05',
          amount: eur(20_000),
          categoryId: 'passbook',
          memberId: 'm-1',
          savingSupportId: 's-1',
        }),
      ],
    }),
  })
}

function open() {
  render(
    <MemoryRouter>
      <ScreenTitleProvider>
        <AnalysisPage />
      </ScreenTitleProvider>
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  useStore.setState({ data: initial, filter: ALL_FILTER })
})

describe('l’écran dédié de l’analyse', () => {
  it('porte le titre, un retour, le tracé et le cumul de l’année', async () => {
    seed()
    open()

    expect(screen.getByRole('heading', { name: t.savings.analysis })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t.common.back })).toBeInTheDocument()
    expect(screen.getByText(supports.evolution)).toBeInTheDocument()
    expect(await screen.findByText(t.savings.years)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: t.savings.yearsCumulative })).toBeInTheDocument()
  })
})
