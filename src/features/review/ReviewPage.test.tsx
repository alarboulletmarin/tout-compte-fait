import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { today, ymOf } from '@/domain/date'
import { makeCategory, makeData, makeEntry, makeFamily, makeRecurrence } from '@/domain/fixtures'
import type { Data } from '@/domain/types'
import { t } from '@/i18n/strings'
import { tpl } from '@/i18n/format'
import { useStore } from '@/store/store'
import { ReviewPage } from './ReviewPage'

const initial = useStore.getState().data
const current = ymOf(today())

function renderPage(over: Partial<Data> = {}): void {
  useStore.setState({
    ym: current,
    data: makeData({
      families: [makeFamily({ id: 'f-charge', kind: 'charge' })],
      categories: [makeCategory({ id: 'cat-1', familyId: 'f-charge' })],
      ...over,
    }),
  })
  render(
    <MemoryRouter>
      <ReviewPage />
    </MemoryRouter>,
  )
}

describe('ReviewPage', () => {
  afterEach(() => {
    useStore.setState({ data: initial, ym: current })
  })

  /* Un document sans la moindre règle n'aura jamais rien à confirmer tant qu'on
     ne lui en donne pas une : ce n'est pas une tâche finie, c'est une tâche qui
     n'a pas pu commencer. */
  it('renvoie à la récurrence quand le document est vide', () => {
    renderPage()
    expect(screen.getByText(t.month.emptyStart)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t.recurrences.add })).toBeInTheDocument()
  })

  /* Un mois dont tout est confirmé est un mois fini : le dire est déjà la
     réponse, et l'envoyer écrire une récurrence serait un contresens. */
  it('dit que tout est confirmé quand plus rien n’attend', () => {
    renderPage({
      recurrences: [makeRecurrence({ period: { unit: 'month', every: 1, anchorDay: 5 } })],
      entries: [makeEntry({ date: `${current}-05`, status: 'confirmed' })],
    })
    expect(screen.getByText(t.month.done)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t.review.back })).toBeInTheDocument()
  })

  it('compte ce qui attend', () => {
    renderPage({
      entries: [
        makeEntry({ date: `${current}-05`, label: 'Loyer', status: 'planned' }),
        makeEntry({ date: `${current}-08`, label: 'Électricité', status: 'planned' }),
      ],
    })
    expect(screen.getByText(tpl(t.review.waiting, 2))).toBeInTheDocument()
  })

  it('accorde le décompte au singulier', () => {
    renderPage({ entries: [makeEntry({ date: `${current}-05`, status: 'planned' })] })
    expect(screen.getByText(tpl(t.review.waitingOne, 1))).toBeInTheDocument()
  })
})
