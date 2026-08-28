import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { ENTRY_NEW_PATH } from '@/app/routes'
import { today, ymOf } from '@/domain/date'
import { eur, makeCategory, makeData, makeEntry, makeFamily, makeMember } from '@/domain/fixtures'
import { money } from '@/domain/money'
import type { Data, Period } from '@/domain/types'
import type { MonthFilter } from '@/store/store'
import { t } from '@/i18n/strings'
import { de, formatMoney, tpl } from '@/i18n/format'
import { ALL_FILTER, useStore } from '@/store/store'
import { FlowsPage } from './FlowsPage'

const initial = useStore.getState().data
const current = ymOf(today())

/* `getByText` normalise les blancs du nœud avant de comparer : l'espace
   insécable étroite qu'`Intl` glisse devant le symbole y devient une espace
   ordinaire. La chaîne attendue, elle, la garde telle quelle. */
const said = (text: string): string => text.replace(/\s+/g, ' ').trim()

const MONTHLY: Period = { unit: 'month', every: 1, anchorDay: 1 }

const FAMILIES = [
  makeFamily({ id: 'f-charge', kind: 'charge' }),
  makeFamily({ id: 'f-resource', kind: 'resource' }),
]

const CATEGORIES = [
  makeCategory({ id: 'cat-1', familyId: 'f-charge' }),
  makeCategory({ id: 'cat-in', familyId: 'f-resource', direction: 'in' }),
]

const ALIX = makeMember({ id: 'm-1', name: 'Alix' })
const CAMILLE = makeMember({ id: 'm-2', name: 'Camille', color: 'var(--member-2)' })

/* Deux revenus au double l'un de l'autre : les parts valent 2/3 et 1/3, et une
   charge commune de 900 € se découpe en 600 € et 300 € sans un centime perdu.
   C'est exactement ce que l'écran prétend montrer. */
const SALARIES = [
  {
    id: 'rec-1',
    label: 'Salaire',
    categoryId: 'cat-in',
    memberId: 'm-1',
    direction: 'in' as const,
    amount: money(200_000),
    startedOn: '2020-01-01',
    period: MONTHLY,
  },
  {
    id: 'rec-2',
    label: 'Salaire',
    categoryId: 'cat-in',
    memberId: 'm-2',
    direction: 'in' as const,
    amount: money(100_000),
    startedOn: '2020-01-01',
    period: MONTHLY,
  },
]

function renderPage(over: Partial<Data> = {}, filter: MonthFilter = ALL_FILTER): void {
  useStore.setState({
    ym: current,
    filter,
    data: makeData({ families: FAMILIES, categories: CATEGORIES, ...over }),
  })
  render(
    <MemoryRouter>
      <FlowsPage />
    </MemoryRouter>,
  )
}

/** Le foyer d'essai : un loyer commun, une course à chacun, deux salaires. */
function household(filter: MonthFilter = ALL_FILTER): void {
  renderPage(
    {
      household: { name: 'Foyer', members: [ALIX, CAMILLE] },
      recurrences: SALARIES,
      entries: [
        makeEntry({ date: `${current}-05`, label: 'Loyer', amount: eur(90_000) }),
        makeEntry({
          date: `${current}-08`,
          label: 'Courses d’Alix',
          amount: eur(12_000),
          memberId: 'm-1',
        }),
        makeEntry({
          date: `${current}-02`,
          label: 'Salaire',
          categoryId: 'cat-in',
          direction: 'in',
          memberId: 'm-1',
          amount: eur(200_000),
        }),
      ],
    },
    filter,
  )
}

describe('FlowsPage', () => {
  afterEach(() => {
    useStore.setState({ data: initial, ym: current, filter: ALL_FILTER })
  })

  it('porte son titre', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: t.flows.title })).toBeInTheDocument()
  })

  /* Un détail vide n'est pas un détail qui manque : c'est un mois que rien ne
     remplit encore, et le geste qui le remplit est une récurrence. */
  it('renvoie à la récurrence quand le mois n’a aucune ligne', () => {
    renderPage()
    expect(screen.getByText(t.flows.empty)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t.recurrences.add })).toBeInTheDocument()
  })

  it('sépare ce qui rentre, le commun et le perso', () => {
    household()
    expect(screen.queryByText(t.flows.empty)).not.toBeInTheDocument()
    expect(screen.getByText(t.flows.in)).toBeInTheDocument()
    expect(screen.getByText(t.flows.common)).toBeInTheDocument()
    expect(screen.getByText(t.flows.own)).toBeInTheDocument()
    // Le loyer est commun parce que personne ne le porte ; la course est à Alix.
    expect(screen.getByText('Loyer')).toBeInTheDocument()
    expect(screen.getByText('Courses d’Alix')).toBeInTheDocument()
  })

  /* La règle de partage, sous les charges communes, avec les coefficients
     qu'elle produit : c'est ce qui rend la ligne suivante vérifiable. */
  it('dit la règle de partage et les parts sous les charges communes', () => {
    household()
    expect(screen.getByText(/Au prorata des revenus/)).toHaveTextContent('Alix')
    expect(screen.getByText(/Au prorata des revenus/)).toHaveTextContent('Camille')
  })

  /**
   * Le cœur de l'écran : la quote-part ligne à ligne.
   *
   * 900 € au prorata de 2 000 / 1 000 donne 600 € à Alix, et la méta dit de
   * quel montant plein cette part est tirée. Le découpage vient de
   * `scopeToMember`, jamais d'une multiplication faite ici.
   */
  it('découpe chaque charge commune à la part du membre filtré', () => {
    household({ kind: 'member', memberId: 'm-1' })

    /* Sous-chaîne : la méta d'une rangée joint la date, la personne et la part
       dans un seul nœud, et c'est la part qu'on vient vérifier. */
    expect(
      screen.getByText(said(tpl(t.flows.share, de('Alix'), formatMoney(eur(90_000), 'EUR'))), {
        exact: false,
      }),
    ).toBeInTheDocument()
    /* Deux fois : sur la rangée, et sur le total de la section — c'est le
       même centime, et c'est ce que la somme des parts doit rendre. */
    expect(
      screen.getAllByText(
        said(`${t.direction.out.toLowerCase()} ${formatMoney(eur(60_000), 'EUR')}`),
      ),
    ).toHaveLength(2)
  })

  /* Le pot commun d'un mois sans charge partagée n'est pas un mois vide : lui
     dire « écris une récurrence » serait faux, et la rangée de pilules
     au-dessus est ce qui défait la lecture. */
  it('distingue le mois vide du filtre qui ne laisse rien', () => {
    renderPage(
      {
        household: { name: 'Foyer', members: [ALIX, CAMILLE] },
        recurrences: SALARIES,
        entries: [
          makeEntry({
            date: `${current}-08`,
            label: 'Courses d’Alix',
            amount: eur(12_000),
            memberId: 'm-1',
          }),
        ],
      },
      { kind: 'common' },
    )

    expect(screen.getByText(t.flows.filtered)).toBeInTheDocument()
    expect(screen.queryByText(t.flows.empty)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: t.recurrences.add })).not.toBeInTheDocument()
  })

  /* Les deux soldes du mois, et pas un seul sous deux noms : « reste à vivre »
     s'arrête la veille de la prochaine paie, le prévisionnel à la fin du mois. */
  it('porte le reste à vivre et le prévisionnel sur le mois courant', () => {
    household()
    expect(screen.getByText(`${t.dashboard.remaining} ${t.flows.scopeHousehold}`)).toBeInTheDocument()
    expect(screen.getByText(t.dashboard.forecast)).toBeInTheDocument()
  })

  /* Un montant qu'on lit ici se corrige sur sa fiche, et le seul écran qui
     savait l'ouvrir était celui du mois : chaque ligne est désormais une
     porte. */
  it('ouvre la fiche de la ligne qu’on touche', async () => {
    useStore.setState({
      ym: current,
      filter: ALL_FILTER,
      data: makeData({
        families: FAMILIES,
        categories: CATEGORIES,
        entries: [
          makeEntry({
            id: 'e-loyer',
            date: `${current}-05`,
            label: 'Loyer',
            categoryId: 'cat-1',
            amount: eur(90_000),
          }),
        ],
      }),
    })
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<FlowsPage />} />
          <Route path={`${ENTRY_NEW_PATH}/:id`} element={<p>fiche-entree</p>} />
        </Routes>
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('button', { name: /Loyer/ }))
    expect(screen.getByText('fiche-entree')).toBeInTheDocument()
  })
})
