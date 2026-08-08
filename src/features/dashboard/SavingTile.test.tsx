import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { makeCategory, makeData, makeEntry, makeFamily, makeMember } from '@/domain/fixtures'
import { type Money, money } from '@/domain/money'
import { t } from '@/i18n/strings'
import { formatMoney, tpl } from '@/i18n/format'
import { ALL_FILTER, useStore } from '@/store/store'
import { SavingTile } from './SavingTile'

/* Un salaire, un loyer, un livret : le minimum pour que la capacité existe et
   que les versements aient où aller. */
const FAMILIES = [
  makeFamily({ id: 'fam-pay', kind: 'resource' }),
  makeFamily({ id: 'fam-home', kind: 'charge' }),
  makeFamily({ id: 'fam-savings', kind: 'saving' }),
]

const CATEGORIES = [
  makeCategory({ id: 'salaire', familyId: 'fam-pay', direction: 'in' }),
  makeCategory({ id: 'loyer', familyId: 'fam-home' }),
  makeCategory({ id: 'livret', familyId: 'fam-savings' }),
]

/** Ressources 2 000 €, charges 900 € — donc 1 100 € de capacité. */
const BASE = [
  makeEntry({
    date: '2026-08-01',
    label: 'Salaire',
    categoryId: 'salaire',
    direction: 'in',
    amount: money(200000),
  }),
  makeEntry({ date: '2026-08-05', label: 'Loyer', categoryId: 'loyer', amount: money(90000) }),
]

function setUp(savings: ReturnType<typeof makeEntry>[]): void {
  useStore.setState({
    ym: '2026-08',
    filter: ALL_FILTER,
    data: makeData({
      household: { name: 'Maison', members: [makeMember({ id: 'm1', name: 'Dede' })] },
      families: FAMILIES,
      categories: CATEGORIES,
      entries: [...BASE, ...savings],
    }),
  })
}

function saving(over: {
  amount: Money
  direction?: 'in' | 'out'
  status?: 'planned'
  memberId?: string
}) {
  return makeEntry({
    date: '2026-08-10',
    label: 'Livret',
    categoryId: 'livret',
    ...over,
  })
}

const euros = (value: Money) => formatMoney(value, 'EUR')

/* `getByText` normalise les blancs du nœud avant de comparer : l'espace
   insécable étroite qu'`Intl` glisse devant le symbole y devient une espace
   ordinaire. La chaîne attendue, elle, la garde telle quelle — sans le même
   passage, aucune assertion sur un montant ne retrouverait jamais son texte. */
const said = (text: string): string => text.replace(/\s+/g, ' ').trim()

function renderTile() {
  return render(
    <MemoryRouter>
      <SavingTile />
    </MemoryRouter>,
  )
}

describe('« Capacité d’épargne » — ce que le mois verse', () => {
  beforeEach(() => {
    useStore.setState({ filter: ALL_FILTER })
  })

  /* La régression que ce fichier existe pour tenir : le versement ne se disait
     que sous un filtre par membre, si bien qu'un foyer qui venait de placer
     300 € lisait un mois où il n'avait fait que dépenser. */
  it('dit ce qui est versé sans filtre par membre', () => {
    setUp([saving({ amount: money(30000) })])
    renderTile()

    expect(
      screen.getByText(said(tpl(t.dashboard.savingPlaced, euros(money(30000))))),
    ).toBeInTheDocument()
  })

  /* L'invariant de la tuile, et la raison pour laquelle le versement se compte
     sur le mois entier plutôt qu'au seul confirmé : les deux clauses sont les
     deux moitiés du chiffre qu'elles accompagnent, et doivent le redonner.
     Un virement encore prévu compte donc dans les deux, sans quoi il manquerait
     à l'addition et la tuile se lirait comme une erreur de calcul. */
  it('compte un versement encore prévu, et redonne la capacité', () => {
    setUp([saving({ amount: money(30000), status: 'planned' })])
    renderTile()

    expect(
      screen.getByText(said(tpl(t.dashboard.savingPlaced, euros(money(30000))))),
    ).toBeInTheDocument()
    expect(
      screen.getByText(said(tpl(t.dashboard.savingLeft, euros(money(80000))))),
    ).toBeInTheDocument()
    // 300 versés + 800 restants = 1 100 de capacité. Le nom accessible du
    // chiffre porte le montant entier ; l'affichage le découpe en parties.
    expect(screen.getByText(said(euros(money(110000))))).toBeInTheDocument()
  })

  /* Le mois où une avance est posée : le livret paie une charge de l'année et
     rend plus qu'il n'a reçu. « −510 € versé » ne se lit pas. */
  it('nomme une reprise nette plutôt que d’afficher un montant négatif', () => {
    setUp([
      saving({ amount: money(9000) }),
      saving({ amount: money(60000), direction: 'in' }),
    ])
    renderTile()

    expect(
      screen.getByText(said(tpl(t.dashboard.savingWithdrawn, euros(money(51000))))),
    ).toBeInTheDocument()
    expect(screen.queryByText(/€ versé/)).not.toBeInTheDocument()
  })

  /* Une lecture qui n'a pas de réponse vaut mieux absente que fausse : rien
     n'a bougé, la clause n'existe pas. */
  it('ne dit rien quand le mois n’a bougé aucune épargne', () => {
    setUp([])
    renderTile()

    expect(screen.queryByText(/€ versé/)).not.toBeInTheDocument()
    expect(screen.queryByText(/repris de l’épargne/)).not.toBeInTheDocument()
    expect(
      screen.getByText(said(tpl(t.dashboard.savingLeft, euros(money(110000))))),
    ).toBeInTheDocument()
  })

  /* Sous filtre, le chiffre reste celui de la personne — `useKindTotals` passe
     par la portée du mois, et rien de ce qui précède ne l'a défait. */
  it('reste individuel sous un filtre par membre', () => {
    setUp([saving({ amount: money(30000), memberId: 'm1' })])
    useStore.setState({ filter: { kind: 'member', memberId: 'm1' } })
    renderTile()

    expect(
      screen.getByText(said(tpl(t.dashboard.savingPlaced, euros(money(30000))))),
    ).toBeInTheDocument()
  })
})
