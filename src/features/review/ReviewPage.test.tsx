import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { addMonthsToYm, today, ymOf } from '@/domain/date'
import { makeCategory, makeData, makeEntry, makeFamily, makeRecurrence } from '@/domain/fixtures'
import { money } from '@/domain/money'
import type { Data, Entry } from '@/domain/types'
import { t } from '@/i18n/strings'
import { formatMonthName, tpl } from '@/i18n/format'
import { useStore } from '@/store/store'
import { ReviewPage } from './ReviewPage'

const initial = useStore.getState().data
const current = ymOf(today())

/* Un foyer avec une règle à montant fixe et une règle à montant variable :
   c'est le seul assemblage qui fasse exister les deux moitiés de la file. */
function base(entries: Entry[]): Partial<Data> {
  return {
    families: [makeFamily({ id: 'f-charge', kind: 'charge' })],
    categories: [makeCategory({ id: 'cat-1', familyId: 'f-charge' })],
    recurrences: [
      makeRecurrence({ id: 'r-fixe', amount: money(9640), period: { unit: 'month', every: 1, anchorDay: 8 } }),
      makeRecurrence({ id: 'r-var', amount: null, period: { unit: 'month', every: 1, anchorDay: 20 } }),
    ],
    entries,
  }
}

function renderPage(over: Partial<Data> = {}): void {
  useStore.setState({
    ym: current,
    review: null,
    data: makeData(over),
  })
  render(
    <MemoryRouter>
      <ReviewPage />
    </MemoryRouter>,
  )
}

const button = (name: string): HTMLElement => screen.getByRole('button', { name })

describe('ReviewPage', () => {
  afterEach(() => {
    useStore.setState({ data: initial, ym: current, review: null })
  })

  /* Un document sans la moindre règle n'aura jamais rien à confirmer tant qu'on
     ne lui en donne pas une : ce n'est pas une tâche finie, c'est une tâche qui
     n'a pas pu commencer. */
  it('renvoie à la récurrence quand le document est vide', () => {
    renderPage({
      families: [makeFamily({ id: 'f-charge', kind: 'charge' })],
      categories: [makeCategory({ id: 'cat-1', familyId: 'f-charge' })],
    })
    expect(screen.getByText(t.month.emptyStart)).toBeInTheDocument()
    expect(button(t.recurrences.add)).toBeInTheDocument()
  })

  /* Un mois dont tout est confirmé est un mois fini : le dire est déjà la
     réponse, et l'envoyer écrire une récurrence serait un contresens. */
  it('dit que tout est confirmé quand plus rien n’attend', () => {
    renderPage({
      ...base([makeEntry({ date: `${current}-05`, status: 'confirmed' })]),
    })
    expect(screen.getByText(t.month.done)).toBeInTheDocument()
    expect(button(t.review.back)).toBeInTheDocument()
  })

  /* L'ordre de la file est une décision : une ligne variable ouvre le pavé
     d'emblée, donc la mettre en tête ferait commencer la revue par de la
     saisie, quand tout le reste ne demande qu'un oui. */
  it('range les montants fixes avant ceux qui restent à saisir', () => {
    renderPage(
      base([
        makeEntry({
          id: 'e-var',
          date: `${current}-02`,
          label: 'Électricité',
          status: 'planned',
          recurrenceId: 'r-var',
          amount: money(0),
        }),
        makeEntry({
          id: 'e-fixe',
          date: `${current}-08`,
          label: 'Loyer',
          status: 'planned',
          recurrenceId: 'r-fixe',
          amount: money(9640),
        }),
      ]),
    )
    /* La carte porte le libellé en titre : c'est elle qu'on lit, pas la
       colonne, qui les porte tous les deux. */
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Loyer')
    /* Et la colonne les liste dans le même ordre. */
    const rows = screen.getAllByRole('button', { name: /^Aller à / })
    expect(rows.map((row) => row.getAttribute('aria-label'))).toEqual([
      tpl(t.review.goTo, 'Loyer'),
      tpl(t.review.goTo, 'Électricité'),
    ])
  })

  it('ouvre le pavé d’emblée sur une ligne à montant variable', () => {
    renderPage(
      base([
        makeEntry({
          id: 'e-var',
          date: `${current}-02`,
          label: 'Électricité',
          status: 'planned',
          recurrenceId: 'r-var',
          amount: money(0),
        }),
      ]),
    )
    expect(screen.getByRole('group', { name: t.review.padLabel })).toBeInTheDocument()
    expect(screen.getByText(t.review.padNoteVariable)).toBeInTheDocument()
    /* Et « C'était bien ça » n'existe pas : il confirmerait zéro. */
    expect(screen.queryByRole('button', { name: t.review.yes })).toBeNull()
  })

  it('confirme au montant prévu et passe à la suivante', () => {
    renderPage(
      base([
        makeEntry({ id: 'e-1', date: `${current}-05`, label: 'Loyer', status: 'planned', amount: money(9640) }),
        makeEntry({ id: 'e-2', date: `${current}-09`, label: 'Internet', status: 'planned', amount: money(3000) }),
      ]),
    )
    fireEvent.click(button(t.review.yes))

    const entry = useStore.getState().data.entries.find((e) => e.id === 'e-1')
    expect(entry?.status).toBe('confirmed')
    expect(entry?.amount).toBe(9640)
    expect(useStore.getState().review?.index).toBe(1)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Internet')
  })

  it('confirme au montant saisi au pavé', () => {
    renderPage(
      base([
        makeEntry({
          id: 'e-1',
          date: `${current}-08`,
          label: 'Électricité',
          status: 'planned',
          recurrenceId: 'r-fixe',
          amount: money(9640),
        }),
      ]),
    )
    fireEvent.click(button(t.review.other))
    /* Et la carte dit alors la vérité sur ce que ça change au-delà du mois :
       une règle à montant fixe ne bouge pas. */
    expect(screen.getByText(t.review.padNoteFixed)).toBeInTheDocument()

    for (const digit of ['1', '0', '4', '2', '0']) fireEvent.click(button(digit))
    fireEvent.click(screen.getByRole('button', { name: /104/ }))

    expect(useStore.getState().data.entries[0]?.amount).toBe(10_420)
    expect(useStore.getState().data.entries[0]?.status).toBe('confirmed')
  })

  /* Le défaut que ce test existe pour empêcher : le prototype confirme à zéro.
     Une échéance confirmée à zéro entre dans tous les totaux et dans
     l'historique de prix, où elle annonce une baisse de 100 %. */
  it('retire la ligne au lieu de la confirmer à zéro', () => {
    renderPage(
      base([
        makeEntry({ id: 'e-1', date: `${current}-05`, label: 'Loyer', status: 'planned', amount: money(9640) }),
        makeEntry({ id: 'e-2', date: `${current}-09`, label: 'Internet', status: 'planned', amount: money(3000) }),
      ]),
    )
    fireEvent.click(button(t.review.skip))

    const { data, review } = useStore.getState()
    expect(data.entries.map((e) => e.id)).toEqual(['e-2'])
    /* L'index ne bouge pas : la ligne a quitté le document, donc la suivante
       prend sa place. Avancer en plus sauterait une ligne. */
    expect(review?.index).toBe(0)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Internet')
  })

  it('saute directement à une ligne depuis la colonne', () => {
    renderPage(
      base([
        makeEntry({ id: 'e-1', date: `${current}-05`, label: 'Loyer', status: 'planned', amount: money(9640) }),
        makeEntry({ id: 'e-2', date: `${current}-09`, label: 'Internet', status: 'planned', amount: money(3000) }),
      ]),
    )
    fireEvent.click(button(tpl(t.review.goTo, 'Internet')))
    expect(useStore.getState().review?.index).toBe(1)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Internet')
  })

  /* La file survit à une sortie : c'est ce qui permet à la tuile du mois de
     proposer « Reprendre » plutôt que de tout recommencer. */
  it('reprend la file là où elle était', () => {
    const entries = [
      makeEntry({ id: 'e-1', date: `${current}-05`, label: 'Loyer', status: 'planned', amount: money(9640) }),
      makeEntry({ id: 'e-2', date: `${current}-09`, label: 'Internet', status: 'planned', amount: money(3000) }),
    ]
    useStore.setState({
      ym: current,
      data: makeData(base(entries)),
      review: { ym: current, ids: ['e-1', 'e-2'], index: 1 },
    })
    render(
      <MemoryRouter>
        <ReviewPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Internet')
  })

  /* Une ligne effacée ailleurs — un autre onglet, la liste du mois — n'est plus
     dans le document, et c'est le document qui a raison : la file l'oublie
     plutôt que de montrer une carte vide. */
  it('oublie une ligne qui a disparu du document', () => {
    useStore.setState({
      ym: current,
      data: makeData(
        base([
          makeEntry({ id: 'e-2', date: `${current}-09`, label: 'Internet', status: 'planned', amount: money(3000) }),
        ]),
      ),
      review: { ym: current, ids: ['e-disparue', 'e-2'], index: 0 },
    })
    render(
      <MemoryRouter>
        <ReviewPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Internet')
  })

  it('compose le bilan quand la file est épuisée', () => {
    renderPage(
      base([
        makeEntry({ id: 'e-1', date: `${current}-05`, label: 'Loyer', status: 'planned', amount: money(9640) }),
      ]),
    )
    fireEvent.click(button(t.review.yes))

    expect(screen.getByText(t.review.summaryOut)).toBeInTheDocument()
    expect(screen.getByText(t.review.summaryLines)).toBeInTheDocument()
    expect(screen.getByText(t.review.closeHint)).toBeInTheDocument()
  })

  /* « Fermer le mois » n'écrit rien : `MonthState.closed` est un champ réservé
     que rien ne lit. C'est une navigation — le curseur passe au mois suivant,
     que l'app ouvre toute seule en y arrivant. */
  it('ferme le mois en passant au suivant, sans rien verrouiller', () => {
    renderPage(
      base([
        makeEntry({ id: 'e-1', date: `${current}-05`, label: 'Loyer', status: 'planned', amount: money(9640) }),
      ]),
    )
    fireEvent.click(button(t.review.yes))
    fireEvent.click(screen.getByRole('button', { name: /^Fermer/ }))

    const next = addMonthsToYm(current, 1)
    expect(useStore.getState().ym).toBe(next)
    expect(useStore.getState().data.months.every((m) => !m.closed)).toBe(true)
    expect(screen.getByText(tpl(t.review.nextDone, formatMonthName(current)))).toBeInTheDocument()
  })

  /* Le mode d'échec à éviter : une carte qui n'arrive jamais parce que son
     avancement attendait une transition. Les tests tournent sous
     `prefers-reduced-motion`, où les tokens valent zéro et où aucune transition
     ne se termine — ce cas-ci rétablit la préférence pour exercer la machine à
     trois temps pour de bon. */
  it('arrive à la carte suivante, animation comprise', () => {
    const real = window.matchMedia.bind(window)
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({ ...real(query), matches: false }),
    })
    vi.useFakeTimers()
    try {
      renderPage(
        base([
          makeEntry({ id: 'e-1', date: `${current}-05`, label: 'Loyer', status: 'planned', amount: money(9640) }),
          makeEntry({ id: 'e-2', date: `${current}-09`, label: 'Internet', status: 'planned', amount: money(3000) }),
        ]),
      )
      fireEvent.click(button(t.review.yes))
      /* Pendant la sortie, c'est encore la carte d'avant qu'on lit : celle
         qu'on vient de valider s'en va, elle ne se remplace pas d'un coup. */
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Loyer')
      act(() => {
        vi.advanceTimersByTime(400)
      })
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Internet')
    } finally {
      vi.useRealTimers()
      Object.defineProperty(window, 'matchMedia', { writable: true, value: real })
    }
  })

  /* Le clavier fait la même chose que les boutons — DS §8 : chaque geste est
     doublé, et l'inverse est vrai aussi. */
  it('confirme à la touche Entrée', () => {
    renderPage(
      base([
        makeEntry({ id: 'e-1', date: `${current}-05`, label: 'Loyer', status: 'planned', amount: money(9640) }),
      ]),
    )
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(useStore.getState().data.entries[0]?.status).toBe('confirmed')
  })
})
