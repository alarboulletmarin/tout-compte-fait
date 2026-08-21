import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { today, ymOf } from '@/domain/date'
import { makeCategory, makeData, makeEntry, makeFamily } from '@/domain/fixtures'
import { money } from '@/domain/money'
import type { Entry } from '@/domain/types'
import { t } from '@/i18n/strings'
import { tpl } from '@/i18n/format'
import { type ReviewSession, useStore } from '@/store/store'
import { ReviewTile } from './ReviewTile'

const initial = useStore.getState().data
const current = ymOf(today())

const lines: Entry[] = [
  makeEntry({ id: 'e-1', date: `${current}-05`, label: 'Loyer', status: 'planned', amount: money(9640) }),
  makeEntry({ id: 'e-2', date: `${current}-09`, label: 'Internet', status: 'planned', amount: money(3000) }),
]

function renderTile(entries: Entry[], review: ReviewSession | null = null): void {
  useStore.setState({
    ym: current,
    review,
    filter: { kind: 'all' },
    data: makeData({
      families: [makeFamily({ id: 'f-charge', kind: 'charge' })],
      categories: [makeCategory({ id: 'cat-1', familyId: 'f-charge' })],
      entries,
    }),
  })
  render(
    <MemoryRouter>
      <ReviewTile />
    </MemoryRouter>,
  )
}

describe('ReviewTile', () => {
  afterEach(() => {
    useStore.setState({ data: initial, ym: current, review: null, filter: { kind: 'all' } })
  })

  it('ne s’affiche pas quand rien n’attend', () => {
    const { container } = render(
      <MemoryRouter>
        <ReviewTile />
      </MemoryRouter>,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('compte ce qui attend et propose de commencer', () => {
    renderTile(lines)
    expect(screen.getByText(tpl(t.review.tileTitle, 2))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t.review.start })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: t.review.restart })).toBeNull()
  })

  it('accorde le décompte au singulier', () => {
    renderTile([lines[0]!])
    expect(screen.getByText(t.review.tileTitleOne)).toBeInTheDocument()
  })

  it('pose la file au foyer entier en commençant', () => {
    renderTile(lines)
    fireEvent.click(screen.getByRole('button', { name: t.review.start }))
    expect(useStore.getState().review).toEqual({ ym: current, ids: ['e-1', 'e-2'], index: 0 })
  })

  /* Reprendre, c'est justement ne pas reposer la file : l'index survivrait mal
     à une file rebâtie sous lui. */
  it('reprend sans reposer la file', () => {
    renderTile(lines, { ym: current, ids: ['e-1', 'e-2'], index: 1 })
    expect(screen.getByText(tpl(t.review.resumeAt, 2, 2))).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: t.review.resume }))
    expect(useStore.getState().review?.index).toBe(1)
  })

  it('repart du début en reposant la file', () => {
    renderTile(lines, { ym: current, ids: ['e-1', 'e-2'], index: 1 })
    fireEvent.click(screen.getByRole('button', { name: t.review.restart }))
    expect(useStore.getState().review?.index).toBe(0)
  })

  /* La revue est une tâche du foyer : annoncer un décompte du foyer au-dessus
     d'une liste filtrée ferait deux comptes pour une même chose. */
  it('se retire quand un filtre est actif', () => {
    renderTile(lines)
    useStore.setState({ filter: { kind: 'common' } })
    const { container } = render(
      <MemoryRouter>
        <ReviewTile />
      </MemoryRouter>,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
