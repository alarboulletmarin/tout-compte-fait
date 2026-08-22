import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { eur, makeCategory, makeData, makeFamily, makeMember } from '@/domain/fixtures'
import { t } from '@/i18n/strings'
import { useStore } from '@/store/store'
import { RecurrenceQuickPage } from './RecurrenceQuickPage'

const initial = useStore.getState().data

/* Le catalogue d'amorçage, réduit aux cinq identifiants que les puces visent —
   ce sont eux, et pas des libellés, qui font la différence entre une règle
   rangée et une règle qui atterrit n'importe où. */
const FAMILIES = [
  makeFamily({ id: 'fam-housing', kind: 'charge', label: 'Logement' }),
  makeFamily({ id: 'fam-communication', kind: 'charge', label: 'Communication' }),
  makeFamily({ id: 'fam-resources', kind: 'resource', label: 'Ressources' }),
  makeFamily({ id: 'fam-credits', kind: 'debt', label: 'Crédits' }),
  makeFamily({ id: 'fam-savings', kind: 'saving', label: 'Épargne' }),
]

const CATEGORIES = [
  makeCategory({ id: 'rent', label: 'Loyer et charges', familyId: 'fam-housing' }),
  makeCategory({ id: 'streaming', label: 'Abonnements', familyId: 'fam-communication' }),
  makeCategory({ id: 'salary', label: 'Salaires', familyId: 'fam-resources', direction: 'in' }),
  makeCategory({ id: 'other-loan', label: 'Autres crédits', familyId: 'fam-credits' }),
  makeCategory({ id: 'passbook', label: 'Livrets', familyId: 'fam-savings' }),
]

function renderPage(over: Parameters<typeof makeData>[0] = {}): void {
  useStore.setState({
    ym: '2026-08',
    data: makeData({
      household: { name: 'Maison', members: [makeMember({ id: 'm1', name: 'Alix' })] },
      families: FAMILIES,
      categories: CATEGORIES,
      ...over,
    }),
  })

  render(
    <MemoryRouter>
      <RecurrenceQuickPage />
    </MemoryRouter>,
  )
}

const next = async (): Promise<void> => {
  await userEvent.click(screen.getByRole('button', { name: t.common.next }))
}

/** Frappe un montant sur le pavé, chiffre par chiffre — il ne lit que ça. */
const type = async (keys: string): Promise<void> => {
  for (const key of keys) {
    await userEvent.click(screen.getByRole('button', { name: key }))
  }
}

const created = () => useStore.getState().data.recurrences

describe('RecurrenceQuickPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 7, 15, 12, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
    useStore.setState({ data: initial })
  })

  /* Le parcours entier, et ce qu'il produit : une `Recurrence` **valide** —
     avec sa catégorie, son sens, son membre et son partage —, ce que trois
     cartes de puces en dur n'auraient jamais pu rendre. */
  it('écrit une charge complète en quatre cartes', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: t.quickRule.kindRent }))
    await next()
    await type('110000')
    await next()
    await userEvent.click(screen.getByRole('button', { name: '5' }))
    await next()

    /* La quatrième carte montre ce que les trois premières ont décidé. Le nom
       de la catégorie s'y lit deux fois — une dans le récapitulatif, une dans
       la liste du repli, que `<details>` garde montée. */
    expect(screen.getAllByText('Loyer et charges').length).toBeGreaterThan(0)
    expect(screen.getByText('le 5 de chaque mois')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: t.quickRule.write }))

    expect(created()).toHaveLength(1)
    expect(created()[0]).toMatchObject({
      label: 'Loyer',
      categoryId: 'rent',
      direction: 'out',
      amount: eur(110_000),
      period: { unit: 'month', every: 1, anchorDay: 5 },
      startedOn: '2026-08-05',
    })
    /* Sans propriétaire, une charge est commune par la règle du domaine : le
       document ne stocke donc pas de booléen redondant. */
    expect(created()[0]).not.toHaveProperty('shared')
  })

  /* Le cas que le design ne couvre pas et que `/flux` rend visible : un revenu
     sans propriétaire n'apparaît dans le mois de personne. La carte s'ouvre
     alors toute seule sur la question. */
  it('retient un revenu tant que personne ne le porte, et ouvre le repli', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: t.quickRule.kindSalary }))
    await next()
    await type('260000')
    await next()
    await userEvent.click(screen.getByRole('button', { name: '28' }))
    await next()

    await userEvent.click(screen.getByRole('button', { name: t.quickRule.write }))
    expect(created()).toHaveLength(0)
    expect(screen.getByRole('alert')).toHaveTextContent(t.entry.memberRequiredRecurring)

    await userEvent.selectOptions(screen.getByLabelText(new RegExp(t.entry.member)), 'm1')
    await userEvent.click(screen.getByRole('button', { name: t.quickRule.write }))

    expect(created()[0]).toMatchObject({
      label: 'Salaire',
      categoryId: 'salary',
      direction: 'in',
      memberId: 'm1',
    })
  })

  it('refuse d’avancer sans nature ni nom, et le dit au-dessus du bouton', async () => {
    renderPage()

    await next()
    expect(screen.getByRole('alert')).toHaveTextContent(t.quickRule.whatRequired)
    expect(screen.getByText(t.quickRule.steps.what.title)).toBeInTheDocument()

    // Un nom libre suffit : « l'un ou l'autre », dit le design.
    await userEvent.type(screen.getByLabelText(new RegExp(t.quickRule.name)), 'Mutuelle')
    await next()
    expect(screen.getByText(t.quickRule.steps.amount.title)).toBeInTheDocument()
  })

  it('refuse un montant absent', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: t.quickRule.kindRent }))
    await next()
    await next()
    expect(screen.getByRole('alert')).toHaveTextContent(t.entry.amountRequired)
  })

  it('refuse un jour hors de 1 à 31, et « Revenir » ramène sans rien perdre', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: t.quickRule.kindRent }))
    await next()
    await type('5000')
    await next()

    const day = screen.getByLabelText(new RegExp(t.recurrences.form.monthDay))
    await userEvent.clear(day)
    await userEvent.type(day, '45')
    await next()
    expect(screen.getByRole('alert')).toHaveTextContent(t.quickRule.dayRequired)

    await userEvent.click(screen.getByRole('button', { name: t.quickRule.back }))
    expect(screen.getByText(t.quickRule.steps.amount.title)).toBeInTheDocument()
  })

  /* `knows` : on peut supprimer une catégorie, et une puce posée sur un
     identifiant mort rangerait la règle nulle part. */
  it('tait la puce dont la catégorie a été supprimée', () => {
    renderPage({ categories: CATEGORIES.filter((one) => one.id !== 'salary') })

    expect(screen.queryByRole('button', { name: t.quickRule.kindSalary })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: t.quickRule.kindRent })).toBeInTheDocument()
  })

  it('garde le formulaire complet à un doigt, sur la première carte seulement', async () => {
    renderPage()

    expect(screen.getByRole('button', { name: t.quickRule.fullForm })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: t.quickRule.kindRent }))
    await next()
    expect(screen.queryByRole('button', { name: t.quickRule.fullForm })).not.toBeInTheDocument()
  })
})
