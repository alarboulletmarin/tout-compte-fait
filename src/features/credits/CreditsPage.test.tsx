/* ============================================================================
 * Ce que l'écran des crédits dit de l'ensemble, et ce qu'il range à côté.
 *
 * Deux choses se tiennent ici : que la part remboursée soit celle des capitaux
 * et non la moyenne des parts — un petit prêt presque soldé ne rachète pas un
 * gros prêt à peine entamé —, et que les avances y aient leur section sans
 * cesser d'avoir leur écran.
 * ==========================================================================*/

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { ADVANCES_PATH } from '@/app/routes'
import {
  eur,
  makeAdvance,
  makeCategory,
  makeData,
  makeDebt,
  makeEntry,
  makeFamily,
  makeMember,
} from '@/domain/fixtures'
import type { Advance, Debt } from '@/domain/types'
import { t } from '@/i18n/strings'
import { formatPercent, tpl } from '@/i18n/format'
import { useStore } from '@/store/store'
import { CreditsPage } from './CreditsPage'

const initial = useStore.getState().data

function renderPage(debts: Debt[], advances: Advance[] = []): void {
  useStore.setState({
    data: makeData({
      household: { name: 'Maison', members: [makeMember({ id: 'm1', name: 'Alix' })] },
      families: [makeFamily({ id: 'f-debt', kind: 'debt' })],
      categories: [makeCategory({ id: 'car-loan', label: 'Prêt auto', familyId: 'f-debt' })],
      debts,
      advances,
    }),
  })

  render(
    <MemoryRouter>
      <CreditsPage />
    </MemoryRouter>,
  )
}

describe('CreditsPage', () => {
  afterEach(() => {
    useStore.setState({ data: initial })
  })

  /* La tuile Crédits du mois ouvre cet écran, et la barre d'onglets y allume
     « Plus » : sans retour, c'était un cul-de-sac. */
  it('porte un retour', () => {
    renderPage([makeDebt({ id: 'd-1', principal: eur(1_200_000) })])

    expect(screen.getByRole('button', { name: t.common.back })).toBeInTheDocument()
  })

  /* Aucune mensualité confirmée : rien n'est remboursé, et l'anneau le dit.
     Le nom accessible porte le pourcentage — un arc ne se lit pas tout seul. */
  it('porte la part remboursée de l’ensemble à côté du capital restant', () => {
    renderPage([makeDebt({ id: 'd-1', principal: eur(1_200_000) })])

    expect(screen.getByText(t.credits.total)).toBeInTheDocument()
    /* Deux anneaux : celui du total et celui du seul crédit. Ils annoncent le
       même pourcentage ici, et c'est bien ce qu'on veut vérifier — la part de
       l'ensemble se prend sur les capitaux, pas sur une moyenne de parts. */
    const rings = screen.getAllByRole('img', {
      name: tpl(t.credits.progress, formatPercent(0)),
    })
    expect(rings).toHaveLength(2)
  })

  /**
   * La part de l'ensemble se prend sur les capitaux.
   *
   * 10 000 € empruntés dont 4 000 € versés (40 %) et 30 000 € intacts (0 %) :
   * l'ensemble est remboursé à 10 %, jamais à 20 % — un petit prêt presque
   * soldé ne rachète pas un gros prêt à peine entamé, et c'est exactement ce
   * qu'une moyenne des parts laisserait croire.
   */
  it('pèse chaque crédit à son capital, et non à sa part', () => {
    useStore.setState({
      data: makeData({
        families: [makeFamily({ id: 'f-debt', kind: 'debt' })],
        categories: [makeCategory({ id: 'car-loan', label: 'Prêt auto', familyId: 'f-debt' })],
        debts: [
          makeDebt({ id: 'd-1', label: 'Petit', principal: eur(1_000_000), recurrenceId: 'r-1' }),
          makeDebt({ id: 'd-2', label: 'Gros', principal: eur(3_000_000) }),
        ],
        entries: [
          makeEntry({
            id: 'e-1',
            date: '2026-02-05',
            label: 'Mensualité',
            categoryId: 'car-loan',
            recurrenceId: 'r-1',
            amount: eur(400_000),
          }),
        ],
      }),
    })
    render(
      <MemoryRouter>
        <CreditsPage />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('img', { name: tpl(t.credits.progress, formatPercent(0.1)) }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('img', { name: tpl(t.credits.progress, formatPercent(0.2)) }),
    ).not.toBeInTheDocument()
  })

  /* Une avance n'est pas une charge, et c'est la seule chose que l'écran a
     besoin de dire d'elle ici : elle voisine des crédits, pas des charges. */
  it('range les avances en section, avec leur contrepartie écrite', () => {
    renderPage([makeDebt({ id: 'd-1' })], [makeAdvance({ id: 'a-1' })])

    expect(screen.getByText(t.advances.notACharge)).toBeInTheDocument()
    const row = screen.getByRole('link', { name: new RegExp(t.advances.section) })
    expect(row).toHaveAttribute('href', ADVANCES_PATH)
  })

  /* La section reste sur un foyer sans avance : elle dit « aucune », ce qui est
     une réponse, et c'est la porte d'un écran qui sait en créer une. */
  it('garde la porte des avances quand il n’y en a aucune', () => {
    renderPage([makeDebt({ id: 'd-1' })])

    expect(screen.getByText(t.advances.empty)).toBeInTheDocument()
  })

  /* Rien à devoir, rien à suivre : l'écran s'efface derrière son invitation, et
     la section des avances avec lui — elle n'a pas de sens sans crédits à
     côté d'elle, c'est `/recurrences` qui la porte alors. */
  it('n’affiche ni anneau ni avances sans un seul crédit', () => {
    renderPage([], [makeAdvance({ id: 'a-1' })])

    expect(screen.getByText(t.credits.empty)).toBeInTheDocument()
    expect(screen.queryByText(t.advances.notACharge)).not.toBeInTheDocument()
  })
})
