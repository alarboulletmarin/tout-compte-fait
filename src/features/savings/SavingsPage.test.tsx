/* ============================================================================
 * L'épargne se lit au nom d'une personne, et n'a pas d'autre lecture.
 *
 * C'est la règle que ce fichier protège, et elle ne se lit dans le code d'aucun
 * composant : le bandeau ne propose que des personnes, une est toujours active,
 * et le total dit laquelle. Deux personnes qui ont 12 000 € et 8 000 € de côté
 * n'ont pas « 20 000 € » — un total du foyer ne se place nulle part.
 * ==========================================================================*/

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
import { de, formatMoney, tpl } from '@/i18n/format'
import { ALL_FILTER, useStore } from '@/store/store'
import { ScreenTitleProvider } from '@/ui/ScreenTitleProvider'
import { SavingsPage } from './SavingsPage'

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
        <SavingsPage />
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

describe('l’épargne se lit au nom d’une personne', () => {
  /* « Tout le monde » rendrait une somme, « Commun » rendrait des zéros :
     ni l'une ni l'autre n'est une lecture de l'épargne. */
  it('ne propose que les personnes dans le bandeau', () => {
    seed()
    open()

    expect(screen.queryByRole('button', { name: t.shell.all })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: t.shell.common })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Andrea' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Marie' })).toBeInTheDocument()
  })

  /* Une rangée de pilules dont aucune n'est active laisserait croire à une
     lecture qui n'existe pas — et le total afficherait la somme du foyer. */
  it('pose une personne quand le filtre n’en portait aucune', () => {
    seed()
    expect(useStore.getState().filter).toEqual(ALL_FILTER)
    open()

    expect(useStore.getState().filter).toEqual({ kind: 'member', memberId: 'm-1' })
    expect(screen.getByText(tpl(t.savings.totalHintOf, de('Andrea')))).toBeInTheDocument()
    // Deux fois : le capital, et la rangée du seul support qu'elle porte.
    expect(screen.getAllByText(spoken(1_200_000))).toHaveLength(2)
    // Jamais la somme des deux personnes.
    expect(screen.queryByText(spoken(2_000_000))).not.toBeInTheDocument()
  })

  it('garde la personne déjà filtrée en arrivant', () => {
    seed()
    useStore.getState().setFilter({ kind: 'member', memberId: 'm-2' })
    open()

    expect(screen.getByText(tpl(t.savings.totalHintOf, de('Marie')))).toBeInTheDocument()
    expect(screen.getAllByText(spoken(800_000))).toHaveLength(2)
  })

  it('change de personne à la pilule, stock et flux ensemble', async () => {
    seed()
    open()
    expect(screen.getAllByText(spoken(1_200_000))).toHaveLength(2)

    await userEvent.click(screen.getByRole('button', { name: 'Marie' }))

    expect(screen.getByText(tpl(t.savings.totalHintOf, de('Marie')))).toBeInTheDocument()
    expect(screen.getAllByText(spoken(800_000))).toHaveLength(2)
    expect(screen.queryByText(spoken(1_200_000))).not.toBeInTheDocument()
  })

  /* Seul·e du foyer, il n'y a personne entre qui choisir — mais le total porte
     quand même son nom : c'est son épargne, pas celle d'un foyer. */
  it('nomme la personne même seule du foyer', () => {
    seed([ANDREA])
    open()

    expect(useStore.getState().filter).toEqual({ kind: 'member', memberId: 'm-1' })
    expect(screen.getByText(tpl(t.savings.totalHintOf, de('Andrea')))).toBeInTheDocument()
  })

  /* Sans personne au foyer, il n'y a rien à filtrer et rien à posséder :
     l'écran demande quelqu'un avant de parler d'épargne. */
  it('ne force aucun filtre quand le foyer n’a personne', () => {
    seed([])
    /* Un support est toujours à quelqu'un : sans membre, le document n'en porte
       aucun — c'est ce que la lecture d'un fichier garantit déjà (`validate`). */
    useStore.setState({
      data: { ...useStore.getState().data, savingSupports: [], savingValuations: [], entries: [] },
    })
    open()

    expect(useStore.getState().filter).toEqual(ALL_FILTER)
    expect(screen.getByText(t.savings.supportsNoMember)).toBeInTheDocument()
  })
})

/* ============================================================================
 * Une question, une zone, un chiffre, une action.
 *
 * Ce que ce bloc protège n'est pas une apparence mais une architecture : les
 * supports se lisent en rangées et non en tuiles pleine largeur, les gestes du
 * patrimoine vivent avec eux plutôt qu'en tête d'écran, et la pédagogie du
 * calcul se replie au lieu d'occuper le dernier tiers de la page.
 * ==========================================================================*/

describe('l’écran range chaque question dans sa zone', () => {
  /* Une tuile `2x2` prend toute la largeur sous 768px : quatre supports
     faisaient quatre écrans de défilement. Une rangée les tient tous. */
  it('lit un support par rangée, et toute la rangée mène à sa fiche', () => {
    seed()
    open()

    const row = screen.getByRole('link', { name: /Livret A/ })
    expect(row).toHaveAttribute('href', '/epargne/s-1')
    // Le montant relevé se lit sur la rangée, avec la date de son relevé.
    expect(row).toHaveTextContent(spoken(1_200_000))
  })

  /* Relever ses comptes et en ouvrir un sont deux gestes de gestion : ils ne
     vivent plus sur la vue d'ensemble, mais sur l'écran dédié
     (`/epargne/supports`, voir `SupportsPage.test.tsx`) vers lequel « Gérer »
     renvoie. */
  it('renvoie vers la gestion des supports, sans la porter elle-même', () => {
    seed()
    open()

    const section = screen.getByText(t.savings.supports).closest('section')
    expect(section).toContainElement(screen.getByRole('link', { name: /Livret A/ }))
    expect(section).toContainElement(screen.getByRole('button', { name: t.nav.manage }))
    expect(screen.queryByRole('button', { name: t.savings.valuesUpdate })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: t.savings.supportAdd })).not.toBeInTheDocument()
  })

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

  /* La liste des supports ne montre que les comptes de la personne lue, donc
     son nom n'y apprend rien. La ventilation, elle, compte des `Entry` : une
     mensualité d'avance cochée « à partager » est de nature épargne, et Camille
     en porte sa part **sur le livret d'Alix**. Deux « Livret A » se retrouvent
     alors dans la même liste, et le titulaire est la seule chose qui les
     départage — c'est ce que le support existe pour lever. */
  it('nomme le titulaire dans la ventilation, jamais dans la liste des supports', () => {
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

    // La liste des supports, elle, n'a qu'une personne et ne la répète pas.
    const supports = within(assertElement(screen.getByText(t.savings.supports).closest('section')))
    expect(supports.queryByText(/Andrea/)).not.toBeInTheDocument()
    expect(supports.queryByText(/Marie/)).not.toBeInTheDocument()
  })

  /* Le tracé et le cumul de l'année vivent sur `/epargne/analyse` ; la vue
     d'ensemble n'en garde que ce qu'ils répondent, en un aperçu qui y renvoie. */
  it('renvoie vers l’analyse avec un aperçu, jamais le tracé', () => {
    seed()
    open()

    const link = screen.getByRole('link', { name: new RegExp(t.savings.analysis) })
    expect(link).toHaveAttribute('href', '/epargne/analyse')
    // 200 € versés par Andrea en juillet 2026, rien l'année précédente.
    expect(link).toHaveTextContent(spoken(20_000))
    expect(screen.queryByText(t.savings.yearsCumulative)).not.toBeInTheDocument()
  })

  /* La section disparaissait quand la personne n'avait aucun support — y
     compris quand ses versements du mois disaient qu'elle en aurait besoin.
     Un écran vide est une invitation, pas une absence (DS §7). */
  it('invite à ouvrir un support quand la personne n’en a aucun', () => {
    seed()
    const data = useStore.getState().data
    useStore.setState({
      data: {
        ...data,
        savingSupports: data.savingSupports.filter((support) => support.memberId !== 'm-1'),
      },
    })
    open()

    expect(screen.getByText(t.savings.supportsEmpty)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t.savings.supportAdd })).toBeInTheDocument()
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
