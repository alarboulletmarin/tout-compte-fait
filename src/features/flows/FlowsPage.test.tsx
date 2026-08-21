import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { today, ymOf } from '@/domain/date'
import { makeCategory, makeData, makeEntry, makeFamily } from '@/domain/fixtures'
import { money } from '@/domain/money'
import type { Data } from '@/domain/types'
import { t } from '@/i18n/strings'
import { useStore } from '@/store/store'
import { FlowsPage } from './FlowsPage'

const initial = useStore.getState().data
const current = ymOf(today())

function renderPage(over: Partial<Data> = {}): void {
  useStore.setState({
    ym: current,
    data: makeData({
      families: [
        makeFamily({ id: 'f-charge', kind: 'charge' }),
        makeFamily({ id: 'f-resource', kind: 'resource' }),
      ],
      categories: [
        makeCategory({ id: 'cat-1', familyId: 'f-charge' }),
        makeCategory({ id: 'cat-in', familyId: 'f-resource', direction: 'in' }),
      ],
      ...over,
    }),
  })
  render(
    <MemoryRouter>
      <FlowsPage />
    </MemoryRouter>,
  )
}

describe('FlowsPage', () => {
  afterEach(() => {
    useStore.setState({ data: initial, ym: current })
  })

  it('porte son titre', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: t.flows.title })).toBeInTheDocument()
  })

  /* Un détail vide n'est pas un détail qui manque : c'est un mois que rien ne
     remplit encore, et le geste qui le remplit est une récurrence. */
  it('renvoie à la récurrence quand le mois n’a aucune ligne', () => {
    renderPage()
    expect(screen.getByText(t.flows.empty)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t.recurrences.add })).toBeInTheDocument()
  })

  it('sépare ce qui rentre de ce qui sort dès qu’il y a une ligne', () => {
    renderPage({
      entries: [
        makeEntry({ date: `${current}-05`, label: 'Loyer', amount: money(110_000) }),
        makeEntry({
          date: `${current}-02`,
          label: 'Salaire',
          categoryId: 'cat-in',
          direction: 'in',
          amount: money(248_000),
        }),
      ],
    })
    expect(screen.queryByText(t.flows.empty)).not.toBeInTheDocument()
    expect(screen.getByText(t.flows.in)).toBeInTheDocument()
    expect(screen.getByText(t.flows.out)).toBeInTheDocument()
  })
})
