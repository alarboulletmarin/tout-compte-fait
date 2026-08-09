/* ============================================================================
 * Ce que le mois permet d'épargner — l'écran, et ce qu'il range.
 *
 * Ces lectures vivaient au milieu de la vue d'ensemble, entre le capital et les
 * comptes : quatre blocs qui dépendent du mois affiché au milieu de trois qui
 * n'en dépendent pas. Elles ont leur écran, et ce fichier tient ce qui s'y joue
 * — les trois chiffres qui s'additionnent dans un seul cadre, la cascade repliée
 * qui les explique, et la ventilation qui nomme le titulaire quand deux comptes
 * portent le même nom.
 * ==========================================================================*/

import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import {
  eur,
  makeCategory,
  makeData,
  makeEntry,
  makeFamily,
  makeMember,
  makeSavingSupport,
  makeSavingValuation,
} from '@/domain/fixtures'
import { t } from '@/i18n/strings'
import { formatMoney } from '@/i18n/format'
import { ALL_FILTER, useStore } from '@/store/store'
import { ScreenTitleProvider } from '@/ui/ScreenTitleProvider'
import { SavingMonthPage } from './SavingMonthPage'

const initial = useStore.getState().data
const MONTH = '2026-07'

/* `getByText` normalise les blancs du nœud avant de comparer : l'espace
   insécable étroite qu'`Intl` glisse devant le symbole y devient une espace
   ordinaire. */
const said = (text: string): string => text.replace(/\s+/g, ' ').trim()
const spoken = (cents: number): string => said(formatMoney(eur(cents), 'EUR'))

/** `closest` rend `null`, et `within` n'en veut pas : on échoue ici plutôt que là. */
function assertElement(node: Element | null): HTMLElement {
  expect(node).not.toBeNull()
  return node as HTMLElement
}

const ANDREA = makeMember({ id: 'm-1', name: 'Andrea' })
const MARIE = makeMember({ id: 'm-2', name: 'Marie', color: 'var(--member-2)' })

function seed(members = [ANDREA, MARIE]) {
  useStore.setState({
    ym: MONTH,
    filter: ALL_FILTER,
    data: makeData({
      household: { name: '', members },
      families: [
        makeFamily({ id: 'fam-res', label: 'Ressources', kind: 'resource' }),
        makeFamily({ id: 'fam-savings', label: 'Épargne', kind: 'saving' }),
      ],
      categories: [
        makeCategory({ id: 'salaire', label: 'Salaire', familyId: 'fam-res', direction: 'in' }),
        makeCategory({ id: 'passbook', label: 'Livrets', familyId: 'fam-savings' }),
      ],
      savingSupports: [
        makeSavingSupport({ id: 's-1', label: 'Livret A', memberId: 'm-1' }),
        makeSavingSupport({ id: 's-2', label: 'Livret A', memberId: 'm-2' }),
      ],
      savingValuations: [
        makeSavingValuation({ id: 'v-1', supportId: 's-1', amount: eur(1_200_000), date: '2026-07-01' }),
        makeSavingValuation({ id: 'v-2', supportId: 's-2', amount: eur(800_000), date: '2026-07-01' }),
      ],
      entries: [
        makeEntry({ id: 'p1', date: '2026-07-01', direction: 'in', amount: eur(250_000), categoryId: 'salaire', memberId: 'm-1' }),
        makeEntry({ id: 'p2', date: '2026-07-01', direction: 'in', amount: eur(250_000), categoryId: 'salaire', memberId: 'm-2' }),
        makeEntry({ id: 'v1', date: '2026-07-05', amount: eur(20_000), categoryId: 'passbook', memberId: 'm-1', savingSupportId: 's-1' }),
        makeEntry({ id: 'v2', date: '2026-07-06', amount: eur(30_000), categoryId: 'passbook', memberId: 'm-2', savingSupportId: 's-2' }),
      ],
    }),
  })
}

function open() {
  render(
    <MemoryRouter>
      <ScreenTitleProvider>
        <SavingMonthPage />
      </ScreenTitleProvider>
    </MemoryRouter>,
  )
}

afterEach(() => {
  /* Démonter avant de remettre le document : les `afterEach` se dépilent, donc
     celui-ci passe avant le `cleanup` de `test/setup.ts`, et reposer le store
     sous un arbre encore monté ferait remonter tout l'écran hors de `act`. */
  cleanup()
  useStore.setState({ data: initial, filter: ALL_FILTER })
})

describe('les trois chiffres du mois tiennent dans un cadre', () => {
  /* Les trois chiffres qui s'additionnent — capacité, versé, reste — dans un
     seul cadre : posés à deux écrans les uns des autres, on ne pouvait pas
     vérifier qu'ils tombent. */
  it('pose la capacité, le versé et le reste dans la même tuile', () => {
    seed()
    open()

    /* Repéré par « Versé ce mois », qui n'existe qu'ici : « Capacité d'épargne »
       se dit deux fois dans cette tuile — en étiquette, puis en résultat de la
       cascade repliée. */
    const tile = screen.getByText(t.savings.placedTotal).closest('section')
    expect(tile).toContainElement(screen.getByText(t.savings.left))
    expect(tile).toContainElement(screen.getByText(t.savings.method))
  })

  /* La cascade et les quatre paragraphes restent disponibles, mais repliés :
     c'est une pédagogie qu'on ouvre une fois, pas une lecture mensuelle. */
  it('replie le calcul derrière une légende', () => {
    seed()
    open()

    const details = screen.getByText(t.savings.method).closest('details')
    expect(details).not.toBeNull()
    expect(details).not.toHaveAttribute('open')
    expect(details).toContainElement(screen.getByText(t.savings.flowIncome))
    expect(details).toContainElement(screen.getByText(t.savings.methodBalance))
    // La règle qui fait exister l'écran y est aussi, et une seule fois.
    expect(details).toContainElement(screen.getByText(t.savings.valueMethod))
  })


  /* La ventilation compte des `Entry`, et non des comptes : une mensualité
     d'avance cochée « à partager » est de nature épargne, et Marie en porte sa
     part **sur le livret d'Andrea**. Deux « Livret A » se retrouvent alors dans
     la même liste, et le titulaire est la seule chose qui les départage — c'est
     ce que le support existe pour lever. La liste des comptes, elle, ne montre
     que ceux de la personne lue : son nom n'y apprend rien, et l'écran de la
     vue d'ensemble le vérifie de son côté. */
  it('nomme le titulaire dans la ventilation', () => {
    seed()
    useStore.setState({
      data: {
        ...useStore.getState().data,
        entries: [
          ...useStore.getState().data.entries,
          /* Le versement d'Andrea sur son livret, porté par Marie : c'est la
             forme que prend une part de mensualité partagée. */
          makeEntry({
            id: 'part',
            date: '2026-07-08',
            amount: eur(2_570),
            categoryId: 'passbook',
            memberId: 'm-2',
            savingSupportId: 's-1',
          }),
        ],
      },
    })
    useStore.getState().setFilter({ kind: 'member', memberId: 'm-2' })
    open()

    // Deux lignes au même nom dans la ventilation, départagées par leur nom.
    const ventilation = within(assertElement(screen.getByText(t.savings.placed).closest('section')))
    expect(ventilation.getAllByText('Livret A')).toHaveLength(2)
    expect(ventilation.getByText(/Andrea/)).toBeInTheDocument()
    expect(ventilation.getByText(/Marie/)).toBeInTheDocument()
  })
})

/* ============================================================================
 * La cascade de la capacité nomme son troisième terme.
 *
 * « Charges » d'un bloc mêlait ses lignes à elle et sa part du pot commun, sans
 * que rien ne le dise : le seul terme sur lequel on peut agir seul·e était
 * indiscernable de celui qui se décide à deux, sur l'écran qui sert justement à
 * décider quoi changer.
 * ==========================================================================*/

describe('la cascade sépare ce qui est à soi de la part du commun', () => {
  const MONTHLY = { unit: 'month' as const, every: 1, anchorDay: 1 }

  /**
   * Deux revenus égaux — donc une part chacun —, 900 € de loyer commun, 300 €
   * de mensualité commune et 50 € de courses au seul nom d'Andrea. Sa capacité
   * vaut 2 500 − 450 − 150 − 50 = 1 850 €, et les trois termes se lisent.
   */
  function seedShared() {
    useStore.setState({
      ym: MONTH,
      filter: ALL_FILTER,
      data: makeData({
        household: { name: '', members: [ANDREA, MARIE] },
        families: [
          makeFamily({ id: 'fam-res', label: 'Ressources', kind: 'resource' }),
          makeFamily({ id: 'fam-home', label: 'Logement', kind: 'charge' }),
          makeFamily({ id: 'fam-loan', label: 'Crédits', kind: 'debt' }),
        ],
        categories: [
          makeCategory({ id: 'salaire', label: 'Salaire', familyId: 'fam-res', direction: 'in' }),
          makeCategory({ id: 'loyer', label: 'Loyer', familyId: 'fam-home' }),
          makeCategory({ id: 'courses', label: 'Courses', familyId: 'fam-home' }),
          makeCategory({ id: 'auto', label: 'Prêt auto', familyId: 'fam-loan' }),
        ],
        recurrences: [
          { id: 'r-1', label: 'Salaire', categoryId: 'salaire', memberId: 'm-1', direction: 'in', amount: eur(250_000), startedOn: '2026-01-01', period: MONTHLY },
          { id: 'r-2', label: 'Salaire', categoryId: 'salaire', memberId: 'm-2', direction: 'in', amount: eur(250_000), startedOn: '2026-01-01', period: MONTHLY },
        ],
        entries: [
          makeEntry({ id: 'p1', date: '2026-07-01', direction: 'in', amount: eur(250_000), categoryId: 'salaire', memberId: 'm-1' }),
          makeEntry({ id: 'p2', date: '2026-07-01', direction: 'in', amount: eur(250_000), categoryId: 'salaire', memberId: 'm-2' }),
          makeEntry({ id: 'loyer', date: '2026-07-05', amount: eur(90_000), categoryId: 'loyer' }),
          makeEntry({ id: 'pret', date: '2026-07-08', amount: eur(30_000), categoryId: 'auto' }),
          makeEntry({ id: 'sien', date: '2026-07-12', amount: eur(5_000), categoryId: 'courses', memberId: 'm-1' }),
        ],
      }),
    })
  }

  /* Les quatre termes, et leur soustraction qui tombe juste : trois montants
     posés à côté d'un résultat qu'ils ne redonnent pas se lisent comme une
     erreur de calcul, et c'est bien ce qu'on vient vérifier ici. */
  it('nomme les charges perso, les crédits perso et la part du commun', () => {
    seedShared()
    open()

    const details = assertElement(screen.getByText(t.savings.method).closest('details'))
    const cascade = within(details)

    expect(cascade.getByText(t.savings.flowOwnCharges)).toBeInTheDocument()
    expect(cascade.getByText(t.savings.flowCommon)).toBeInTheDocument()
    expect(cascade.queryByText(t.savings.flowCharges)).not.toBeInTheDocument()

    /* Les termes portent leur sens — `Amount` le donne à lire hors de l'œil, un
       « + » pour une entrée et le mot pour une sortie —, le résultat non :
       c'est un solde. 2 500 − 50 − 600 = 1 850. */
    const paid = (cents: number): string =>
      said(`${t.direction.out.toLowerCase()} ${formatMoney(eur(cents), 'EUR')}`)

    expect(cascade.getByText(said(`+${formatMoney(eur(250_000), 'EUR')}`))).toBeInTheDocument()
    expect(cascade.getByText(paid(5_000))).toBeInTheDocument()
    expect(cascade.getByText(paid(60_000))).toBeInTheDocument()
    expect(cascade.getByText(spoken(185_000))).toBeInTheDocument()
  })

  /* Un crédit commun n'est plus un crédit sur cette cascade : il est dans la
     part du commun, avec le loyer. Sans crédit à son seul nom, la ligne
     « Crédits perso » n'a rien à dire et s'en va — une ligne à zéro laisserait
     croire à une nature qu'on aurait oublié de renseigner. */
  it('range le crédit commun dans la part du commun, pas dans ses crédits', () => {
    seedShared()
    open()

    const cascade = within(assertElement(screen.getByText(t.savings.method).closest('details')))
    expect(cascade.queryByText(t.savings.flowOwnDebts)).not.toBeInTheDocument()
    expect(cascade.queryByText(t.savings.flowDebts)).not.toBeInTheDocument()
  })

  /* Sans prorata calculable, les chiffres du mois sont ceux de ses seules
     lignes : il n'y a aucune part à distinguer, et la cascade reprend ses deux
     termes d'origine plutôt que d'annoncer un commun à zéro. */
  it('reprend ses termes d’origine tant que le prorata ne se calcule pas', () => {
    seedShared()
    const data = useStore.getState().data
    useStore.setState({
      data: { ...data, recurrences: data.recurrences.filter((r) => r.memberId !== 'm-2') },
    })
    open()

    const cascade = within(assertElement(screen.getByText(t.savings.method).closest('details')))
    expect(cascade.getByText(t.savings.flowCharges)).toBeInTheDocument()
    expect(cascade.queryByText(t.savings.flowCommon)).not.toBeInTheDocument()
  })
})
