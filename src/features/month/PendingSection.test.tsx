import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { makeCategory, makeData, makeEntry, makeFamily } from '@/domain/fixtures'
import { money } from '@/domain/money'
import type { Entry } from '@/domain/types'
import { t } from '@/i18n/strings'
import { tpl } from '@/i18n/format'
import { ALL_FILTER, useStore } from '@/store/store'
import { PendingSection } from './PendingSection'

const FAMILIES = [makeFamily({ id: 'fam-home', kind: 'charge' })]
const CATEGORIES = [makeCategory({ id: 'loyer', familyId: 'fam-home' })]

/** `n` échéances prévues, une par jour, avec des libellés distincts. */
function planned(n: number): Entry[] {
  return Array.from({ length: n }, (_, index) =>
    makeEntry({
      date: `2026-08-${String(index + 1).padStart(2, '0')}`,
      label: `Échéance ${String(index + 1)}`,
      categoryId: 'loyer',
      amount: money(1000 * (index + 1)),
      status: 'planned',
    }),
  )
}

function setUp(entries: Entry[]): void {
  useStore.setState({
    ym: '2026-08',
    filter: ALL_FILTER,
    data: makeData({ families: FAMILIES, categories: CATEGORIES, entries }),
  })
}

function renderSection() {
  return render(
    <MemoryRouter>
      <PendingSection />
    </MemoryRouter>,
  )
}

const rows = (): number => screen.getAllByRole('listitem').length

describe('« À confirmer » — une tâche, pas un inventaire', () => {
  /* La régression que ce fichier existe pour tenir : douze lignes de 56px
     repoussaient le détail du mois d'un écran entier, et la section se lisait
     comme une liste à parcourir plutôt que comme un geste à faire. */
  it('n’affiche que les cinq plus proches quand il y en a beaucoup', () => {
    setUp(planned(20))
    renderSection()

    expect(rows()).toBe(5)
    // Les cinq premières par date : la liste est triée, on traite par le haut.
    expect(screen.getByText('Échéance 1')).toBeInTheDocument()
    expect(screen.queryByText('Échéance 6')).not.toBeInTheDocument()
  })

  /* Une coupe muette se lit comme une liste complète, et l'on croit avoir tout
     confirmé. Elle se compte, et elle se lève. */
  it('compte ce qu’elle laisse, et le montre à la demande', async () => {
    setUp(planned(20))
    renderSection()

    expect(screen.getByText(tpl(t.month.pendingMore, 15))).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: t.month.pendingShowAll }))

    expect(rows()).toBe(20)
    expect(screen.getByText('Échéance 20')).toBeInTheDocument()
    expect(screen.queryByText(tpl(t.month.pendingMore, 15))).not.toBeInTheDocument()
  })

  /* Cacher une seule ligne derrière un bouton n'économise pas sa hauteur : il
     l'échange contre celle du bouton, et demande un geste pour rien. */
  it('ne coupe pas pour une seule ligne de trop', () => {
    setUp(planned(6))
    renderSection()

    expect(rows()).toBe(6)
    expect(screen.queryByRole('button', { name: t.month.pendingShowAll })).not.toBeInTheDocument()
  })

  /* Douze boutons « Confirmer » se listent douze fois à l'identique dans les
     contrôles d'un lecteur d'écran, et rien n'y dit lequel on vise. */
  it('nomme l’échéance sur chaque bouton de confirmation', () => {
    setUp(planned(3))
    renderSection()

    expect(
      screen.getByRole('button', { name: tpl(t.month.confirmEntry, 'Échéance 2') }),
    ).toBeInTheDocument()
  })

  /* Le mois bouclé n'efface pas la section : c'est ici qu'on a confirmé, c'est
     donc ici qu'on doit pouvoir revenir dessus. */
  it('garde le retour en arrière une fois tout confirmé', () => {
    setUp([
      makeEntry({
        date: '2026-08-04',
        label: 'Loyer',
        categoryId: 'loyer',
        recurrenceId: 'rec-1',
      }),
    ])
    renderSection()

    expect(screen.getByText(t.month.done)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t.month.unconfirmAll })).toBeInTheDocument()
  })
})
