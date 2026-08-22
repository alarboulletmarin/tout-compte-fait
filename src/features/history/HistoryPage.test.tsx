import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  makeCategory,
  makeData,
  makeEntry,
  makeFamily,
  makeRecurrence,
} from '@/domain/fixtures'
import { money } from '@/domain/money'
import type { Entry } from '@/domain/types'
import { history } from '@/i18n/history'
import { tpl } from '@/i18n/format'
import { ALL_FILTER, useStore } from '@/store/store'
import { HistoryPage } from './HistoryPage'

const FAMILIES = [makeFamily({ id: 'fam-charge', kind: 'charge' })]
const CATEGORIES = [makeCategory({ id: 'courses', label: 'Courses', familyId: 'fam-charge' })]

const out = (date: string, amount: number, label = 'Courses'): Entry =>
  makeEntry({ date, label, categoryId: 'courses', direction: 'out', amount: money(amount) })

const ENTRIES = [
  out('2026-05-03', 67000),
  out('2026-06-03', 53600),
  out('2026-06-11', 4200, 'EDF'),
]

function setup(data = makeData({ families: FAMILIES, categories: CATEGORIES, entries: ENTRIES })) {
  useStore.setState({ ym: '2026-06', filter: ALL_FILTER, data })
  return render(
    <MemoryRouter>
      <HistoryPage />
    </MemoryRouter>,
  )
}

describe('l’écran Historique', () => {
  beforeEach(() => {
    useStore.setState({ ym: '2026-06', filter: ALL_FILTER, data: makeData() })
  })

  it('invite à saisir tant qu’il n’y a rien du tout', () => {
    setup(makeData())
    expect(screen.getByText(history.empty)).toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })

  /* Une règle arrêtée sans aucune entrée n'a pas de courbe, mais elle a quelque
     chose à chercher : l'état vide global ne vaut que si les quatre lectures
     sont muettes en même temps. */
  it('reste ouvert dès qu’il y a une récurrence à retrouver', () => {
    setup(makeData({ recurrences: [makeRecurrence({ period: { unit: 'month', every: 1, anchorDay: 5 } })] }))
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('pose trois blocs, dans l’ordre des trois questions', () => {
    const { container } = setup()
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    // « Évolution » ne nomme plus que le tracé : la tuile porte le chiffre
    // qu'elle donne à lire, et c'est le solde moyen.
    expect(screen.getByText(history.average)).toBeInTheDocument()
    expect(screen.getByText(history.compare)).toBeInTheDocument()
    /* Cinq tuiles au repos : l'évolution, ses deux extrêmes, la liste mois par
       mois, la comparaison. La recherche, elle, n'en pose aucune tant qu'on ne
       lui a rien demandé. */
    expect(container.querySelectorAll('.tile')).toHaveLength(5)
  })

  /* La fenêtre se nomme par ses deux bornes, en mono sous le cumul : « douze
     derniers mois » devenait faux dès qu'on en demandait six. */
  it('nomme la fenêtre par ses deux bornes', () => {
    setup()
    expect(
      screen.getByText(tpl(history.trailingRange, 'septembre 2025', 'août 2026')),
    ).toHaveClass('t-axis')
  })

  /* Deux fenêtres, et la série suit. Le contrôle vit sur cet écran : la série
     s'arrête à aujourd'hui quoi qu'on choisisse dans le bandeau du mois. */
  it('bascule la fenêtre de douze à six mois', async () => {
    setup()
    const window_ = screen.getByRole('radiogroup', { name: history.spanLabel })
    await userEvent.click(within(window_).getByRole('radio', { name: history.span6 }))

    expect(
      screen.getByText(tpl(history.trailingRange, 'mars 2026', 'août 2026')),
    ).toBeInTheDocument()
  })

  /* Chaque mois est une porte : `ym` vit dans le store, et l'écran du mois n'a
     pas d'URL par mois. */
  it('ouvre le mois qu’on touche dans la liste', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: /mai 2026/ }))
    expect(useStore.getState().ym).toBe('2026-05')
  })

  /* Les mois vides ne comptent nulle part : deux mois portent des lignes, la
     moyenne se lit sur eux, et le mot le dit. */
  it('ne compte que les mois qui portent des lignes', () => {
    setup()
    expect(screen.getByText(tpl(history.averageOn, 2))).toBeInTheDocument()
  })

  /* Le champ n'a plus de libellé visible, mais il en a un : sans nom
     accessible, un champ n'a pas de nom (DS §8). */
  it('garde le nom et l’aide du champ pour qui les écoute', () => {
    setup()
    const field = screen.getByRole('searchbox', { name: history.searchLabel })
    const hint = document.getElementById(field.getAttribute('aria-describedby') ?? '')
    expect(hint).toHaveTextContent(history.searchHint)
    expect(hint).toHaveClass('sr-only-text')
  })

  /* Rien de réservé à vide : la surface n'apparaît qu'avec ce qu'elle porte.
     « EDF » puis chercher les résultats sous deux graphiques ne serait pas
     acceptable — ils arrivent juste sous le champ, avant l'évolution. */
  it('ne pose la surface des résultats qu’une fois qu’on cherche, et en tête', async () => {
    const { container } = setup()
    expect(container.querySelectorAll('.tile')).toHaveLength(5)

    await userEvent.type(screen.getByRole('searchbox'), 'edf')

    const tiles = [...container.querySelectorAll('.tile')]
    expect(tiles).toHaveLength(6)
    const results = tiles[0] as HTMLElement
    expect(within(results).getByText('EDF')).toBeInTheDocument()
    expect(within(tiles[1] as HTMLElement).getByText(history.average)).toBeInTheDocument()
  })

  it('dit où il a cherché quand il ne trouve rien', async () => {
    setup()
    await userEvent.type(screen.getByRole('searchbox'), 'zzz')
    const message = screen.getByText(tpl(history.searchEmpty, 'zzz'), { exact: false })
    expect(message).toHaveTextContent(history.searchHint)
  })

  /* Une seule comparaison à la fois : c'est tout l'objet du regroupement. */
  it('bascule d’une comparaison à l’autre sans les montrer ensemble', async () => {
    setup()
    expect(screen.getByLabelText(history.compareLeft)).toBeInTheDocument()
    expect(screen.queryByLabelText(history.year)).not.toBeInTheDocument()

    await userEvent.click(
      within(screen.getByRole('radiogroup', { name: history.compareAxis })).getByRole('radio', {
        name: history.compareModeYears,
      }),
    )

    expect(screen.getByLabelText(history.year)).toBeInTheDocument()
    expect(screen.queryByLabelText(history.compareLeft)).not.toBeInTheDocument()
  })

  /* La bascule démonte le corps qu'elle quitte : le couple de mois vit sur la
     section, faute de quoi un aller-retour l'aurait perdu. */
  it('retrouve le couple de mois après un aller-retour', async () => {
    setup()
    await userEvent.selectOptions(screen.getByLabelText(history.compareRight), '2026-05')

    const modes = within(screen.getByRole('radiogroup', { name: history.compareAxis }))
    await userEvent.click(modes.getByRole('radio', { name: history.compareModeYears }))
    await userEvent.click(modes.getByRole('radio', { name: history.compareModeMonths }))

    expect(screen.getByLabelText(history.compareRight)).toHaveValue('2026-05')
  })
})
