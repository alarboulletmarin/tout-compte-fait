import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
  makeCategory,
  makeData,
  makeEntry,
  makeFamily,
  makeMember,
  makeRecurrence,
} from '@/domain/fixtures'
import { money } from '@/domain/money'
import type { Entry } from '@/domain/types'
import { t } from '@/i18n/strings'
import { tpl } from '@/i18n/format'
import { ALL_FILTER, useStore } from '@/store/store'
import { MonthStatusTile } from './MonthStatusTile'

const FAMILIES = [makeFamily({ id: 'fam-home', kind: 'charge' })]
const CATEGORIES = [makeCategory({ id: 'loyer', familyId: 'fam-home' })]

/* Une échéance de récurrence : c'est ce qui peut être prévu, et donc ce qui
   fait bouger le compte d'un mois à l'autre. */
function line(index: number, status: 'planned' | 'confirmed'): Entry {
  return makeEntry({
    date: `2026-08-${String(index).padStart(2, '0')}`,
    label: `Échéance ${String(index)}`,
    categoryId: 'loyer',
    amount: money(1000 * index),
    recurrenceId: 'r1',
    status,
  })
}

function setUp(entries: Entry[]): void {
  useStore.setState({
    ym: '2026-08',
    filter: ALL_FILTER,
    data: makeData({
      families: FAMILIES,
      categories: CATEGORIES,
      recurrences: [
        makeRecurrence({
          id: 'r1',
          categoryId: 'loyer',
          period: { unit: 'month', every: 1, anchorDay: 1 },
        }),
      ],
      entries,
    }),
  })
}

/** `n` confirmées et `m` prévues, avec des libellés distincts. */
function month(confirmed: number, planned: number): Entry[] {
  return [
    ...Array.from({ length: confirmed }, (_, i) => line(i + 1, 'confirmed')),
    ...Array.from({ length: planned }, (_, i) => line(confirmed + i + 1, 'planned')),
  ]
}

describe('« Suivi du mois » — l’avancement des confirmations', () => {
  /* Ce que la tuile existe pour dire, et qui ne se lisait nulle part : chaque
     ligne portait son état, le mois ne portait pas le compte. */
  it('compte les confirmées sur le total du mois', () => {
    setUp(month(12, 4))
    render(<MonthStatusTile />)

    expect(screen.getByText('12 / 16')).toBeInTheDocument()
  })

  /* Le compte est celui de la section « À confirmer », par les mêmes
     sélecteurs : deux chiffres voisins qui se compteraient chacun de leur côté
     finiraient par diverger, et c'est ce qui se lit comme une erreur. */
  it('dit son compte en une phrase au lecteur d’écran', () => {
    setUp(month(12, 4))
    render(<MonthStatusTile />)

    expect(screen.getByText(tpl(t.dashboard.srMonthStatus, 12, 16))).toBeInTheDocument()
  })

  /* « 0 / 0 » n'est pas un vide, c'est une division qui n'a pas lieu d'être.
     L'écran du mois montre alors son état vide, qui dit quoi faire. */
  it('s’efface sur un mois sans aucune opération', () => {
    setUp([])
    const { container } = render(<MonthStatusTile />)

    expect(container).toBeEmptyDOMElement()
  })

  /* La règle du DS §6 : un repère n'existe que là où le geste existe. Tout
     confirmé, il n'y a plus rien à aller voir — la tuile se lit, elle ne
     s'actionne pas. */
  it('n’est plus actionnable quand tout est confirmé', () => {
    setUp(month(16, 0))
    render(<MonthStatusTile onShowPending={vi.fn()} />)

    expect(screen.getByText('16 / 16')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('mène à la section à confirmer tant qu’il reste des échéances', async () => {
    const show = vi.fn()
    setUp(month(12, 4))
    render(<MonthStatusTile onShowPending={show} />)

    await userEvent.click(
      screen.getByRole('button', { name: tpl(t.dashboard.srMonthStatusGo, 12, 16) }),
    )

    expect(show).toHaveBeenCalledOnce()
  })

  /* L'invariant de la tuile : elle annonce exactement ce que la section du
     dessous liste, filtre compris. Elle lit donc la portée des **listes** —
     entières, jamais proratisées (cahier §4.6) — et non celle des chiffres. Un
     ratio à 6,2 / 14,8 ne correspondrait à rien de cliquable.

     Deux membres, sans quoi la règle ne s'applique pas : seul du foyer, tout
     revient à la même personne et la liste ne retranche rien. */
  it('compte ce que la liste montre sous un filtre par membre', () => {
    const mine = month(12, 4).map((entry, index) =>
      index % 2 === 0 ? { ...entry, memberId: 'm1' } : { ...entry, memberId: 'm2' },
    )
    useStore.setState({
      ym: '2026-08',
      filter: { kind: 'member', memberId: 'm1' },
      data: makeData({
        household: {
          name: 'Maison',
          members: [makeMember({ id: 'm1', name: 'Alix' }), makeMember({ id: 'm2', name: 'Cam' })],
        },
        families: FAMILIES,
        categories: CATEGORIES,
        recurrences: [
          makeRecurrence({
            id: 'r1',
            categoryId: 'loyer',
            period: { unit: 'month', every: 1, anchorDay: 1 },
          }),
        ],
        entries: mine,
      }),
    })
    render(<MonthStatusTile />)

    // Une ligne sur deux est à Alix : six confirmées, deux prévues.
    expect(screen.getByText('6 / 8')).toBeInTheDocument()
  })
})
