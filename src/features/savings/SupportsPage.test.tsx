/* ============================================================================
 * La gestion complète des supports, descendue de la vue d'ensemble.
 *
 * Relever ses comptes et en ouvrir un sont des gestes de patrimoine, plus
 * rares qu'un versement : ils vivent ici, et non plus sur `/epargne`, qui n'en
 * garde qu'un aperçu (`SavingsPage.test.tsx`).
 * ==========================================================================*/

import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import {
  eur,
  makeCategory,
  makeData,
  makeFamily,
  makeMember,
  makeSavingSupport,
  makeSavingValuation,
} from '@/domain/fixtures'
import { t } from '@/i18n/strings'
import { ALL_FILTER, useStore } from '@/store/store'
import { ScreenTitleProvider } from '@/ui/ScreenTitleProvider'
import { SupportsPage } from './SupportsPage'

const initial = useStore.getState().data
const ANDREA = makeMember({ id: 'm-1', name: 'Andrea' })

/** `closest` rend `null`, et `within` n'en veut pas : on échoue ici plutôt que là. */
function assertElement(node: Element | null): HTMLElement {
  expect(node).not.toBeNull()
  return node as HTMLElement
}

function seed() {
  useStore.setState({
    filter: { kind: 'member', memberId: 'm-1' },
    data: makeData({
      household: { name: '', members: [ANDREA] },
      families: [makeFamily({ id: 'fam-savings', label: 'Épargne', kind: 'saving' })],
      categories: [makeCategory({ id: 'passbook', label: 'Livrets', familyId: 'fam-savings' })],
      savingSupports: [makeSavingSupport({ id: 's-1', label: 'Livret A', memberId: 'm-1' })],
      savingValuations: [
        makeSavingValuation({ id: 'v-1', supportId: 's-1', amount: eur(1_200_000), date: '2026-07-01' }),
      ],
    }),
  })
}

function open() {
  render(
    <MemoryRouter>
      <ScreenTitleProvider>
        <SupportsPage />
      </ScreenTitleProvider>
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  useStore.setState({ data: initial, filter: ALL_FILTER })
})

describe('l’écran dédié des supports', () => {
  it('porte le titre, un retour, et la liste', () => {
    seed()
    open()

    expect(screen.getByRole('heading', { name: t.savings.supports })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t.common.back })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Livret A/ })).toBeInTheDocument()
  })

  /* Ce que la vue d'ensemble ne porte plus : les deux gestes de patrimoine. */
  it('porte les gestes que l’aperçu ne porte plus', () => {
    seed()
    open()

    expect(screen.getByRole('button', { name: t.savings.valuesUpdate })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t.savings.supportAdd })).toBeInTheDocument()
  })

  /* Le titre de l'écran et l'eyebrow de la section ne se répètent pas : ils
     porteraient sinon deux fois le même mot sous le même mot, juste sous lui. */
  it('ne répète pas son titre en eyebrow de section', () => {
    seed()
    open()

    const section = within(assertElement(screen.getByRole('link', { name: /Livret A/ }).closest('section')))
    expect(section.queryByText(t.savings.supports)).not.toBeInTheDocument()
  })
})
