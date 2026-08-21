import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { RECURRENCE_NEW_PATH } from '@/app/routes'
import { addMonthsToYm, currentYm, today } from '@/domain/date'
import {
  makeCategory,
  makeData,
  makeEntry,
  makeFamily,
  makeRecurrence,
} from '@/domain/fixtures'
import { money } from '@/domain/money'
import { t } from '@/i18n/strings'
import { de, formatMonthName, tpl } from '@/i18n/format'
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
     deux questions. Sans une ligne ni une règle, la tuile prend toute la place
     et le bento se tait — six tuiles à zéro ne sont pas une situation. */
  it('propose d’abord une récurrence quand le document est vide', async () => {
    renderEmptyMonth([])

    expect(
      screen.getByText(tpl(t.month.monthIsEmpty, de(formatMonthName(currentYm())))),
    ).toBeInTheDocument()
    expect(screen.queryByText(t.dashboard.balance)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: t.recurrences.add }))

    expect(screen.getByTestId('url')).toHaveTextContent(RECURRENCE_NEW_PATH)
  })

  it('garde la porte de la dépense à côté', () => {
    renderEmptyMonth([])

    expect(screen.getByRole('button', { name: t.month.justAnExpense })).toBeInTheDocument()
  })

  /* Une règle existe, mais rien ne tombe ce mois-ci : ce n'est plus un
     amorçage, et l'écran reprend ses deux portes de saisie. */
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
 * situation, puis tâche — la revue et les lignes qui se confirment —, puis
 * analyse.
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
 *  encore prévue, donc il reste quelque chose à confirmer. */
function fullMonth(ym: string, pending: boolean) {
  return makeData({
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
        status: pending ? 'planned' : 'confirmed',
      }),
    ],
    months: [{ ym, openedAt: today(), closed: false }],
  })
}

function renderMonth({
  ym = currentYm(),
  pending = true,
}: { ym?: string; pending?: boolean } = {}): void {
  useStore.setState({ ym, filter: ALL_FILTER, data: fullMonth(ym, pending) })

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
    renderMonth()

    const balance = screen.getByText(t.dashboard.balance)
    const task = screen.getByText(t.month.toConfirm)
    const spending = screen.getByText(t.dashboard.spending)

    expect(precedes(balance, task)).toBe(true)
    expect(precedes(task, spending)).toBe(true)
  })

  /* La liste est remontée devant l'analyse : elle porte le geste — une échéance
     s'y confirme sans quitter l'écran —, donc elle appartient à l'étage de la
     tâche et non à celui du détail où l'on entre. */
  it('met les lignes du mois entre la tâche et l’analyse', () => {
    renderMonth()

    const task = screen.getByText(t.month.toConfirm)
    const lines = screen.getByText(t.month.lineByLine)
    const spending = screen.getByText(t.dashboard.spending)
    const upcoming = screen.getByText(t.dashboard.upcoming)

    expect(precedes(task, lines)).toBe(true)
    expect(precedes(lines, spending)).toBe(true)
    expect(precedes(spending, upcoming)).toBe(true)
  })

  /* La tuile de suivi vit dans la grille de la situation et désigne la liste du
     dessous : sans elle, l'étage « ce que j'ai à faire » n'aurait aucun repère
     depuis le premier écran — et sans elle, la grille ne se referme pas. */
  it('annonce dès le premier étage combien d’opérations restent', () => {
    renderMonth()

    expect(screen.getByText(t.dashboard.monthStatus)).toBeInTheDocument()
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
  })

  /* La liste porte tout le mois, prévu compris : c'est ce qui fait qu'une ligne
     y change d'état sans changer de place, et ce qui a fait disparaître la
     section « À confirmer », qui listait le même mois une seconde fois. */
  it('liste les échéances prévues avec les lignes réelles', () => {
    renderMonth()

    expect(
      screen.getByRole('button', { name: tpl(t.month.confirmEntry, 'Électricité') }),
    ).toBeInTheDocument()
    expect(screen.getByText(t.month.swipeHint)).toBeInTheDocument()
  })
})

describe('MonthPage — le mois est à jour', () => {
  afterEach(() => {
    useStore.setState({ data: initial, filter: ALL_FILTER })
  })

  /* La fin visible de la tâche. Les deux tuiles ne s'affichent jamais ensemble :
     c'est ce qui garde une seule tuile accentuée par écran (DS §6). */
  it('remplace la porte de la revue par la tuile qui clôt le mois', () => {
    renderMonth({ pending: false })

    expect(screen.queryByText(t.month.toConfirm)).not.toBeInTheDocument()
    expect(
      screen.getByText(tpl(t.month.upToDate, formatMonthName(currentYm()))),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: tpl(t.review.close, formatMonthName(currentYm())) }),
    ).toBeInTheDocument()
  })

  it('mène au mois suivant sans rien écrire au document', async () => {
    renderMonth({ pending: false })
    const before = useStore.getState().data.entries

    await userEvent.click(
      screen.getByRole('button', { name: tpl(t.review.close, formatMonthName(currentYm())) }),
    )

    expect(useStore.getState().ym).toBe(addMonthsToYm(currentYm(), 1))
    /* Le mois suivant s'ouvre tout seul en y arrivant — c'est `setYm` qui le
       fait, pas le bouton, et rien n'est marqué « fermé » sur celui qu'on
       quitte. */
    expect(useStore.getState().data.entries.filter((e) => e.date.startsWith(currentYm()))).toEqual(
      before.filter((e) => e.date.startsWith(currentYm())),
    )
  })
})

describe('MonthPage — un autre mois se lit, il ne s’écrit pas', () => {
  afterEach(() => {
    useStore.setState({ data: initial, filter: ALL_FILTER })
  })

  const past = addMonthsToYm(currentYm(), -1)
  const ahead = addMonthsToYm(currentYm(), 1)

  it('dit pourquoi rien n’y attend d’être confirmé', () => {
    renderMonth({ ym: past })

    expect(screen.getByText(t.month.pastNote)).toBeInTheDocument()
  })

  it('le dit autrement sur un mois à venir', () => {
    renderMonth({ ym: ahead })

    expect(screen.getByText(t.month.aheadNote)).toBeInTheDocument()
  })

  /* Ni revue, ni glissé, ni bouton de confirmation : confirmer, c'est constater
     qu'un mouvement a eu lieu, et il n'a pas eu lieu. */
  it('n’offre ni revue ni confirmation', () => {
    renderMonth({ ym: ahead })

    expect(screen.queryByText(t.month.toConfirm)).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: tpl(t.month.confirmEntry, 'Électricité') }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(t.month.swipeHint)).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: t.month.unconfirmAll }),
    ).not.toBeInTheDocument()
  })

  it('garde les lignes lisibles, et le chemin vers leur fiche', () => {
    renderMonth({ ym: past })

    expect(screen.getByText('Loyer')).toBeInTheDocument()
    expect(screen.getByText(t.dashboard.balance)).toBeInTheDocument()
  })
})
