import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeCategory, makeData, makeEntry, makeFamily } from '@/domain/fixtures'
import { money } from '@/domain/money'
import type { Entry } from '@/domain/types'
import { t } from '@/i18n/strings'
import { ALL_FILTER, useStore } from '@/store/store'
import { SituationSection } from './SituationSection'

const FAMILIES = [
  makeFamily({ id: 'fam-pay', kind: 'resource' }),
  makeFamily({ id: 'fam-home', kind: 'charge' }),
]

const CATEGORIES = [
  makeCategory({ id: 'salaire', familyId: 'fam-pay', direction: 'in' }),
  makeCategory({ id: 'loyer', familyId: 'fam-home' }),
]

/** Un salaire au 1er, un loyer au 5 — donc aucune rentrée d'argent après le 8. */
const PAID = [
  makeEntry({
    date: '2026-08-01',
    label: 'Salaire',
    categoryId: 'salaire',
    direction: 'in',
    amount: money(200000),
  }),
  makeEntry({ date: '2026-08-05', label: 'Loyer', categoryId: 'loyer', amount: money(90000) }),
]

function setUp(entries: Entry[], ym = '2026-08'): void {
  useStore.setState({
    ym,
    filter: ALL_FILTER,
    data: makeData({ families: FAMILIES, categories: CATEGORIES, entries }),
  })
}

function renderSection() {
  const onExplain = vi.fn()
  render(<SituationSection onExplain={onExplain} />)
  return { onExplain }
}

describe('« Situation » — deux soldes qui se ressemblent', () => {
  /* Le 8 août : le salaire est tombé, il n'y a plus de rentrée d'argent avant
     la fin du mois. C'est le cas qui rend les deux chiffres identiques. */
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 7, 8, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  /* La régression que ce fichier existe pour tenir. Sans rentrée d'argent en
     vue, `restToLive` prend la fin du mois pour horizon — donc exactement celui
     du prévisionnel — et les deux annoncent le même montant au centime. Ce
     n'est pas une erreur, mais rien ne le disait : la phrase qui les sépare
     vivait sur une lecture secondaire qu'aucune tuile plate n'affiche sous
     1024px. En rangée, elle se lit à toutes les largeurs.

     Et elle dit désormais la coïncidence elle-même. Chaque rangée expliquait
     son propre horizon, ce qui laissait au lecteur le soin de conclure que deux
     chiffres identiques n'étaient pas une erreur de calcul — c'est exactement ce
     qu'un écran ne doit pas laisser faire. */
  it('dit pourquoi les deux montants coïncident, quand ils coïncident', () => {
    setUp(PAID)
    renderSection()

    const amounts = screen.getAllByText('1 100,00 €')
    expect(amounts.length).toBeGreaterThanOrEqual(2)

    expect(screen.getByText(t.dashboard.forecastHint)).toBeInTheDocument()
    expect(screen.getByText(t.dashboard.remainingSame)).toBeInTheDocument()
    /* L'horizon seul ne suffit plus : il décrivait la cause sans nommer l'effet. */
    expect(screen.queryByText(t.dashboard.remainingNoIncome)).not.toBeInTheDocument()
  })

  /* Avec une rentrée d'argent encore à venir, les horizons divergent — et la
     phrase change avec eux. */
  it('nomme la prochaine rentrée d’argent quand il en reste une', () => {
    setUp([
      ...PAID,
      makeEntry({
        date: '2026-08-28',
        label: 'Prime',
        categoryId: 'salaire',
        direction: 'in',
        amount: money(50000),
        status: 'planned',
      }),
    ])
    renderSection()

    expect(screen.getByText(t.dashboard.remainingHint)).toBeInTheDocument()
    expect(screen.queryByText(t.dashboard.remainingNoIncome)).not.toBeInTheDocument()
  })

  /* Chaque rangée ouvre sa feuille : c'est là que se lit ce qui les sépare
     l'une de l'autre, en entier. */
  it('ouvre la feuille d’explication depuis la rangée', async () => {
    vi.useRealTimers()
    setUp(PAID)
    const { onExplain } = renderSection()

    await userEvent.click(screen.getByRole('button', { name: /Prévisionnel/ }))
    expect(onExplain).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'forecast', hint: t.dashboard.forecastHint }),
    )
  })

  /* « Reste à vivre » se lit depuis aujourd'hui, pas depuis le mois affiché :
     hors du mois courant, le chiffre se calcule et ne veut rien dire. */
  it('retire le reste à vivre hors du mois courant', () => {
    setUp(PAID, '2026-06')
    renderSection()

    expect(screen.getByText(t.dashboard.forecast)).toBeInTheDocument()
    expect(screen.queryByText(t.dashboard.remaining)).not.toBeInTheDocument()
  })

  /* Le pot commun n'a aucun revenu : les deux lectures y vaudraient les
     charges, au signe près. */
  it('s’efface entière sur le pot commun', () => {
    setUp(PAID)
    useStore.setState({ filter: { kind: 'common' } })
    const { container } = render(<SituationSection onExplain={vi.fn()} />)

    expect(container).toBeEmptyDOMElement()
  })
})
