import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { RECURRENCE_NEW_PATH } from '@/app/routes'
import { currentYm, today } from '@/domain/date'
import {
  makeCategory,
  makeData,
  makeEntry,
  makeFamily,
  makeRecurrence,
} from '@/domain/fixtures'
import { money } from '@/domain/money'
import { t } from '@/i18n/strings'
import { ALL_FILTER, useStore } from '@/store/store'
import { MonthPage } from './MonthPage'

const initial = useStore.getState().data

/* La page navigue : sans témoin, on ne saurait pas où elle mène. */
function CurrentUrl() {
  const { pathname } = useLocation()
  return <span data-testid="url">{pathname}</span>
}

function renderEmptyMonth(recurrences: ReturnType<typeof makeRecurrence>[]): void {
  /* Un mois ouvert mais sans aucune ligne : c'est l'état vide, et c'est le seul
     que cet écran-ci a à dire de deux façons. */
  useStore.setState({
    data: {
      ...makeData(),
      entries: [],
      recurrences,
      months: [{ ym: currentYm(), openedAt: today(), closed: false }],
    },
    ym: currentYm(),
  })

  render(
    <MemoryRouter>
      <MonthPage />
      <CurrentUrl />
    </MemoryRouter>,
  )
}

describe('MonthPage — l’état vide mène au bon geste', () => {
  afterEach(() => {
    useStore.setState({ data: initial })
  })

  /* Le trou que corrige cet écran : « ajoute une dépense » n'amorce aucune
     prévision, et c'était le seul geste offert à qui venait de répondre aux
     deux questions. */
  it('propose d’abord une récurrence tant qu’il n’y en a aucune', async () => {
    renderEmptyMonth([])

    expect(screen.getByText(t.month.emptyStart)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: t.recurrences.add }))

    expect(screen.getByTestId('url')).toHaveTextContent(RECURRENCE_NEW_PATH)
  })

  /* Les trois portes cohabitent : au-delà de 1024px, la rangée en flux est
     masquée sur un mois vide, et cet état-ci est alors la seule façon de
     saisir quoi que ce soit. */
  it('garde les deux portes de saisie à côté', () => {
    renderEmptyMonth([])

    expect(screen.getByRole('button', { name: t.entry.addOut })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t.entry.addIn })).toBeInTheDocument()
  })

  it('n’insiste plus dès qu’une récurrence existe', () => {
    renderEmptyMonth([makeRecurrence({ period: { unit: 'month', every: 1, anchorDay: 1 } })])

    expect(screen.getByText(t.month.empty)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: t.recurrences.add })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: t.entry.addOut })).toBeInTheDocument()
  })
})

/* ============================================================================
 * L'ordre des trois étages.
 *
 * C'est la refonte elle-même, et c'est exactement ce qu'un rangement de
 * composants défait sans que rien ne le dise : la page a montré pendant
 * longtemps toutes ses lectures d'un bloc, puis les deux soldes projetés, puis
 * les prochaines échéances, et **seulement ensuite** la seule chose qui demande
 * un geste — deux écrans de défilement plus bas sur un téléphone.
 *
 * On n'éprouve donc pas la mise en forme mais la succession, sur le document :
 * situation, puis tâche, puis analyse.
 * ==========================================================================*/

const ORDER_FAMILIES = [
  makeFamily({ id: 'fam-pay', kind: 'resource' }),
  makeFamily({ id: 'fam-home', kind: 'charge' }),
]

const ORDER_CATEGORIES = [
  makeCategory({ id: 'salaire', familyId: 'fam-pay', direction: 'in' }),
  makeCategory({ id: 'loyer', familyId: 'fam-home' }),
]

/** Un mois qui a de quoi remplir les trois étages : un revenu, une charge
 *  confirmée — donc « Où part l'argent » a une part à montrer — et une échéance
 *  encore prévue, donc « À confirmer » a une ligne. */
function renderFullMonth(): void {
  const ym = currentYm()
  useStore.setState({
    ym,
    filter: ALL_FILTER,
    data: makeData({
      families: ORDER_FAMILIES,
      categories: ORDER_CATEGORIES,
      recurrences: [
        makeRecurrence({
          id: 'r1',
          categoryId: 'loyer',
          period: { unit: 'month', every: 1, anchorDay: 20 },
        }),
      ],
      entries: [
        makeEntry({
          date: `${ym}-01`,
          label: 'Salaire',
          categoryId: 'salaire',
          direction: 'in',
          amount: money(200000),
        }),
        makeEntry({
          date: `${ym}-05`,
          label: 'Loyer',
          categoryId: 'loyer',
          amount: money(90000),
        }),
        makeEntry({
          date: `${ym}-20`,
          label: 'Électricité',
          categoryId: 'loyer',
          amount: money(8200),
          recurrenceId: 'r1',
          status: 'planned',
        }),
      ],
      months: [{ ym, openedAt: today(), closed: false }],
    }),
  })

  render(
    <MemoryRouter>
      <MonthPage />
    </MemoryRouter>,
  )
}

/** Vrai si `first` précède `second` dans le document. */
function precedes(first: Element, second: Element): boolean {
  return (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
}

describe('MonthPage — trois étages, dans l’ordre où l’on se les pose', () => {
  afterEach(() => {
    useStore.setState({ data: initial, filter: ALL_FILTER })
  })

  it('pose la situation avant la tâche, et la tâche avant l’analyse', () => {
    renderFullMonth()

    const balance = screen.getByText(t.dashboard.balance)
    const pending = screen.getByText(new RegExp(`^${t.month.toConfirm} · `))
    const spending = screen.getByText(t.dashboard.spending)

    expect(precedes(balance, pending)).toBe(true)
    expect(precedes(pending, spending)).toBe(true)
  })

  /* Le détail du mois reste en dernier : c'est là qu'on entre, pas là qu'on
     arrive. Et les prochaines échéances sont une liste qu'on parcourt, pas une
     tâche — elles passent donc derrière « À confirmer », qu'elles précédaient. */
  it('renvoie les échéances à venir derrière ce qui demande un geste', () => {
    renderFullMonth()

    const pending = screen.getByText(new RegExp(`^${t.month.toConfirm} · `))
    const upcoming = screen.getByText(t.dashboard.upcoming)
    /* Par sa bascule d'axe et non par son eyebrow : « Ce mois » se lit aussi au
       coin des deux tuiles de flux, qui nomment la section vers laquelle elles
       font défiler. */
    const entries = screen.getByRole('radiogroup', { name: t.month.groupBy })

    expect(precedes(pending, upcoming)).toBe(true)
    expect(precedes(upcoming, entries)).toBe(true)
  })

  /* La tuile de suivi vit dans la grille de la situation et désigne la section
     du dessous : sans elle, l'étage « ce que j'ai à faire » n'aurait aucun
     repère depuis le premier écran. */
  it('annonce dès le premier étage combien d’opérations restent', () => {
    renderFullMonth()

    expect(screen.getByText(t.dashboard.monthStatus)).toBeInTheDocument()
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
  })
})
