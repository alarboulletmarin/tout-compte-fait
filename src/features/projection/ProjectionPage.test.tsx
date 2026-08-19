/* ============================================================================
 * Ce que l'écran de simulation promet, et ce qu'il refuse.
 *
 * Les règles tenues ici ne se lisent dans le code d'aucun composant : la réserve
 * ne se replie jamais, les montants n'ont pas de centimes, la figure est doublée
 * d'un tableau qui porte les mêmes nombres, la réponse ne quitte pas l'écran
 * pendant qu'on règle, chaque compte se règle **séparément**, et rien de ce
 * qu'on tape ne touche au document.
 *
 * **Ce dernier point a changé de forme, pas de fond.** L'écran lit l'épargne —
 * un capital relevé, des versements récurrents, le taux posé sur la fiche d'un
 * compte, son plafond —, mais la lecture est à sens unique : le document ne bouge
 * pas d'un octet, quoi qu'on règle ici. Ce fichier tient les deux bouts.
 *
 * La figure, elle, ne se mesure pas sous jsdom : elle se rend à zéro pixel, et
 * ce sont sa lecture textuelle et le tableau — l'autre vue — qui portent les
 * chiffres. C'est exactement ce que le cahier §5 exige d'elle, donc les tests
 * lisent ce que l'écran promet plutôt que le SVG qu'il produit.
 * ==========================================================================*/

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import {
  eur,
  makeCategory,
  makeData,
  makeFamily,
  makeMember,
  makeRecurrence,
  makeSavingRate,
  makeSavingSupport,
  makeSavingValuation,
} from '@/domain/fixtures'
import { projection } from '@/i18n/projection'
import { tpl } from '@/i18n/format'
import { ALL_FILTER, useStore } from '@/store/store'
import { ScreenTitleProvider } from '@/ui/ScreenTitleProvider'
import { PROJECTION_STORAGE_KEY } from './model'
import { ProjectionPage } from './ProjectionPage'

const said = (text: string): string => text.replace(/\s+/g, ' ').trim()

/**
 * Le chiffre de la réponse — celui qu'on vient chercher.
 *
 * Deux tailles pour un seul rôle : le chiffre héros quand la simulation arrive
 * sur un montant, la taille en dessous quand elle arrive sur une fourchette, qui
 * porte deux montants et un tiret. C'est le même chiffre, et le test le lit
 * comme tel.
 */
const hero = (): string =>
  said(document.querySelector('.t-hero-fit, .t-tile-fit')?.textContent ?? '')

/**
 * De quoi le capital est fait, tel que la réponse le décompose.
 *
 * Lu sur les rangées et non dans la page entière : la légende de la figure porte
 * les mêmes mots — c'est le même vocabulaire des deux côtés, et c'est voulu —,
 * donc une recherche globale en trouverait deux de chaque.
 */
const layers = (): string[] =>
  [...document.querySelectorAll('dl dt')].map((node) => said(node.textContent ?? ''))

/** La pilule d'un réglage, nommée par ce qu'elle règle. */
const pill = (label: string): HTMLElement =>
  screen.getByRole('button', { name: new RegExp(`^${label} :`) })

/**
 * La feuille ouverte, et elle est la seule.
 *
 * Une feuille fermée reste dans le DOM — c'est un `<dialog>` sans `open` —, donc
 * une recherche globale y trouverait « Livret A » trois fois. Tout ce qui se
 * règle se cherche donc **dans** la feuille qu'on vient d'ouvrir.
 */
const sheet = (): HTMLElement => screen.getByRole('dialog')

const open = async (label: string): Promise<HTMLElement> => {
  await userEvent.click(pill(label))
  return sheet()
}

/**
 * Passe l'écran sur les comptes du document.
 *
 * L'écran s'ouvre en mode simple — trois nombres tapés, aucun compte —, donc
 * tout ce qui se règle compte par compte commence par cette bascule.
 */
const useAccounts = async (): Promise<void> => {
  await userEvent.click(screen.getByRole('radio', { name: projection.modeAccounts }))
}

/** Déplie les deux réglages qu'on ne tourne pas en arrivant : cadence, inflation. */
const openMore = async (): Promise<void> => {
  await userEvent.click(screen.getByText(projection.more))
}

const pristine = useStore.getState().data

function show() {
  return render(
    <MemoryRouter>
      <ScreenTitleProvider>
        <ProjectionPage />
      </ScreenTitleProvider>
    </MemoryRouter>,
  )
}

/** Un foyer d'une personne, un livret relevé, et 350 € qui y tombent chaque mois. */
function seed() {
  useStore.setState({
    data: makeData({
      household: { name: 'Maison', members: [makeMember({ id: 'm-1', name: 'Andrea' })] },
      families: [makeFamily({ id: 'fam-saving', kind: 'saving' })],
      categories: [makeCategory({ id: 'passbook', familyId: 'fam-saving' })],
      savingSupports: [makeSavingSupport({ id: 's-1', memberId: 'm-1', label: 'Livret A' })],
      savingValuations: [
        makeSavingValuation({ id: 'v-1', supportId: 's-1', amount: eur(845_000), date: '2020-01-01' }),
      ],
      recurrences: [
        makeRecurrence({
          id: 'r-1',
          categoryId: 'passbook',
          savingSupportId: 's-1',
          memberId: 'm-1',
          direction: 'out',
          amount: eur(35_000),
          period: { unit: 'month', every: 1, anchorDay: 5 },
        }),
      ],
    }),
    filter: ALL_FILTER,
  })
}

/** Deux comptes, dont un seul porte un taux : c'est le cas courant. */
function seedTwo() {
  seed()
  const data = useStore.getState().data
  useStore.setState({
    data: {
      ...data,
      savingSupports: [
        makeSavingSupport({ id: 's-1', memberId: 'm-1', label: 'Livret A' }),
        makeSavingSupport({ id: 's-2', memberId: 'm-1', label: 'PEL' }),
      ],
      savingRates: [makeSavingRate({ id: 'tx-1', supportId: 's-1', rateBp: 250, from: '2020-01-01' })],
      savingValuations: [
        ...data.savingValuations,
        makeSavingValuation({ id: 'v-2', supportId: 's-2', amount: eur(300_000), date: '2020-01-01' }),
      ],
    },
  })
}

afterEach(() => {
  cleanup()
  localStorage.clear()
  useStore.setState({ data: pristine, filter: ALL_FILTER })
})

describe('l’écran de simulation', () => {
  it('pose sa réserve en clair, et ne la replie pas', () => {
    seed()
    show()
    expect(screen.getByText(new RegExp(projection.caveat.slice(0, 40)))).toBeInTheDocument()
    // Ni `<details>`, ni bouton pour la faire disparaître.
    expect(screen.getByText(new RegExp(projection.caveat.slice(0, 40))).closest('details')).toBeNull()
  })

  it('répond avant qu’on ait réglé quoi que ce soit', () => {
    /* L'écran s'ouvre sur un versement d'exemple et le taux le plus modeste
       qu'il connaisse : il n'y a rien à taper pour obtenir une réponse, et rien
       à posséder non plus. */
    seed()
    show()
    expect(hero()).toMatch(/≈/)
    expect(screen.getByText(tpl(projection.resultIn, projection.years.replace('%s', '10')))).toBeInTheDocument()
  })

  it('décompose le chiffre en versé et rendement', () => {
    // « ≈ 57 k€ » impressionne ; « 12 000 € versés, 1 900 € de rendement » informe.
    seed()
    show()
    expect(layers()).toEqual([projection.layerPaid, projection.layerGain])
  })

  it('n’affiche aucun centime, où que ce soit dans la réponse', () => {
    /* La précision affichée ne dépasse pas celle du calcul : une projection à
       taux constant sur dix ans n'est pas juste au centime, et l'annoncer ainsi
       en ferait un relevé de compte. */
    seed()
    show()
    expect(hero()).not.toMatch(/\d,\d\d\s/)
  })

  it('dit quoi faire quand on demande ses comptes et qu’il n’y en a aucun', async () => {
    useStore.setState({
      data: makeData({
        household: { name: 'Maison', members: [makeMember({ id: 'm-1', name: 'Andrea' })] },
      }),
      filter: ALL_FILTER,
    })
    show()
    await useAccounts()
    expect(screen.getByText(projection.noSupports)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: projection.newSupport })).toBeInTheDocument()
  })
})

describe('le mode simple', () => {
  it('répond sans le moindre compte dans le document', () => {
    /* C'est la première question qu'on pose — « et si je mettais 100 € par
       mois ? » —, et elle arrive avant d'avoir ouvert quoi que ce soit. */
    useStore.setState({
      data: makeData({
        household: { name: 'Maison', members: [makeMember({ id: 'm-1', name: 'Andrea' })] },
      }),
      filter: ALL_FILTER,
    })
    show()
    expect(hero()).toMatch(/≈/)
  })

  it('ne devine aucun rendement : il s’affiche, et il se tape', async () => {
    /* Le champ s'ouvre sur la valeur la plus modeste que l'app connaisse, à
       l'opposé des 11 % « constatés sur la dernière décennie » qu'un simulateur
       de vente présélectionne. */
    seed()
    show()
    const field = screen.getByLabelText(projection.simpleRate)
    expect(field).toHaveValue('2')

    const before = hero()
    await userEvent.clear(field)
    await userEvent.type(field, '6')
    expect(hero()).not.toBe(before)
  })

  it('change la réponse quand on change le versement', async () => {
    seed()
    show()
    const before = hero()
    const field = screen.getByLabelText(projection.amount)
    await userEvent.clear(field)
    await userEvent.type(field, '300')
    expect(hero()).not.toBe(before)
  })

  it('part de zéro sans capital de départ, et compte celui qu’on tape', async () => {
    seed()
    show()
    const before = hero()
    await userEvent.type(screen.getByLabelText(projection.simpleStart), '5000')
    expect(hero()).not.toBe(before)
    expect(layers()).toContain(projection.layerInitial)
  })

  it('signale un montant illisible sans vider l’écran', async () => {
    seed()
    show()
    const field = screen.getByLabelText(projection.amount)
    await userEvent.clear(field)
    await userEvent.type(field, 'beaucoup')

    expect(screen.getByText(projection.amountInvalid)).toBeInTheDocument()
    // Le capital de départ manque aussi : il n'y a rien à tracer, et c'est dit.
    expect(screen.getByText(projection.simpleEmpty)).toBeInTheDocument()
  })

  it('ne lit rien du document, et n’y écrit rien', async () => {
    seed()
    const before = JSON.stringify(useStore.getState().data)
    show()
    await userEvent.type(screen.getByLabelText(projection.simpleStart), '1000')
    expect(JSON.stringify(useStore.getState().data)).toBe(before)
  })

  it('garde le mode choisi d’une visite à l’autre', async () => {
    seed()
    show()
    await useAccounts()
    cleanup()
    show()
    expect(screen.getByRole('radio', { name: projection.modeAccounts })).toBeChecked()
    expect(pill(projection.pillAccounts)).toBeInTheDocument()
  })
})

describe('les comptes, un par un', () => {
  it('part de tous les comptes, et le dit sur sa pilule', async () => {
    seedTwo()
    show()
    await useAccounts()
    expect(pill(projection.pillAccounts)).toHaveTextContent(tpl(projection.accountsMany, 2))
  })

  it('décoche un compte, et la réponse suit', async () => {
    seedTwo()
    show()
    await useAccounts()
    const both = hero()

    const panel = await open(projection.pillAccounts)
    await userEvent.click(within(panel).getByRole('checkbox', { name: 'PEL' }))

    expect(pill(projection.pillAccounts)).toHaveTextContent(projection.accountsOne)
    expect(hero()).not.toBe(both)
  })

  it('donne à chaque compte son arrivée, dans la feuille où on le coche', async () => {
    /* C'est la lecture unitaire : cocher un seul compte fait de tout l'écran sa
       trajectoire, et la feuille dit déjà ce que chacun vaut à part. */
    seedTwo()
    show()
    await useAccounts()
    const panel = await open(projection.pillAccounts)
    expect(within(panel).getAllByText(/à l’arrivée/)).toHaveLength(2)
  })

  it('annonce un compte sans relevé plutôt que de le compter pour zéro', async () => {
    seed()
    const data = useStore.getState().data
    useStore.setState({ data: { ...data, savingValuations: [] } })
    show()
    await useAccounts()
    const panel = await open(projection.pillAccounts)
    expect(within(panel).getByText(/Aucun relevé/)).toBeInTheDocument()
  })
})

describe('le rendement, compte par compte', () => {
  it('reprend le taux de la fiche, et prête une fourchette au compte muet', async () => {
    seedTwo()
    show()
    await useAccounts()
    /* La pilule dit l'étendue de ce qui **court** — de la borne basse du compte
       muet à sa borne haute, le livret posé à 2,50 % étant au milieu. */
    expect(pill(projection.pillRate)).toHaveTextContent('2 %')
    expect(pill(projection.pillRate)).toHaveTextContent('5 %')

    const panel = await open(projection.pillRate)
    // Chaque compte annonce son taux à lui, et le livret le tient de sa fiche.
    expect(within(panel).getByText('2,50 %')).toBeInTheDocument()
    // Trois modes sur le compte qui porte un taux, deux sur celui qui n'en a pas.
    expect(within(panel).getAllByRole('radio', { name: projection.rateFlat })).toHaveLength(2)
    expect(within(panel).getAllByRole('radio', { name: projection.rateOwn })).toHaveLength(1)
  })

  it('essaie une valeur sur un compte, et la fourchette se referme', async () => {
    seed()
    show()
    await useAccounts()
    const panel = await open(projection.pillRate)
    await userEvent.click(within(panel).getByRole('radio', { name: projection.rateFlat }))

    /* Le champ part de la borne basse — celle qui promet le moins — faute de
       taux posé sur la fiche : on lit une courbe en sachant à quel taux elle
       court. */
    const field = within(panel).getByLabelText(projection.rate)
    expect(field).toHaveValue('2')

    await userEvent.clear(field)
    await userEvent.type(field, '4')
    expect(pill(projection.pillRate)).toHaveTextContent('4 %')
  })

  it('signale un taux illisible sans vider l’écran', async () => {
    seedTwo()
    show()
    await useAccounts()
    const panel = await open(projection.pillRate)
    await userEvent.click(
      within(panel).getAllByRole('radio', { name: projection.rateFlat })[0] as HTMLElement,
    )
    const field = within(panel).getAllByLabelText(projection.rate)[0] as HTMLElement
    await userEvent.clear(field)
    await userEvent.type(field, 'beaucoup')

    expect(within(panel).getByText(/Entre 0 et/)).toBeInTheDocument()
    // La réponse est toujours là : l'essai est retiré, pas le calcul.
    expect(hero()).toMatch(/≈/)
  })
})

describe('le versement et sa cadence', () => {
  it('propose ce que les règles versent, et le dit', async () => {
    seed()
    show()
    await useAccounts()
    expect(pill(projection.pillAmount)).toHaveTextContent('350')

    const panel = await open(projection.pillAmount)
    expect(within(panel).getByText(/Repris de tes règles/)).toBeInTheDocument()
  })

  it('change la cadence sur la page, et l’unité du versement avec elle', async () => {
    /* La cadence vaut pour toute la simulation — les deux modes, tous les
       comptes —, donc elle se règle sur la page et non dans la feuille d'un
       réglage qui, lui, se pose compte par compte. */
    seed()
    show()
    await useAccounts()
    await openMore()
    await userEvent.selectOptions(screen.getByLabelText(projection.cadence), '12')

    /* Le même effort à la nouvelle cadence : 350 €/mois deviennent 4 200 €/an, et
       le champ le propose plutôt que de le faire deviner. */
    expect(pill(projection.pillAmount)).toHaveTextContent('4 200')
    expect(pill(projection.pillAmount)).toHaveTextContent(/an/)
  })

  it('remplace le versement d’un compte par celui qu’on tape', async () => {
    seed()
    show()
    await useAccounts()
    const before = hero()
    const panel = await open(projection.pillAmount)
    await userEvent.type(within(panel).getByLabelText('Livret A'), '600')
    expect(hero()).not.toBe(before)
    expect(pill(projection.pillAmount)).toHaveTextContent('600')
  })
})

describe('les deux lectures', () => {
  it('double la figure d’un tableau qui porte les mêmes nombres', async () => {
    seed()
    show()
    await useAccounts()
    const arrival = hero()

    await userEvent.click(screen.getByRole('radio', { name: projection.viewTable }))
    const table = screen.getByRole('table')
    // Une ligne par année, plus le départ : onze sur dix ans.
    expect(within(table).getAllByRole('row')).toHaveLength(12)
    /* Le dernier montant du tableau est celui du chiffre héros, au signe « ≈ »
       près : les deux lisent la même série (cahier §4.6 ter). */
    const cells = within(table).getAllByRole('cell')
    const last = said(cells.at(-1)?.textContent ?? '')
    expect(arrival).toContain(last)
  })

  it('garde la lecture choisie d’une visite à l’autre', async () => {
    seed()
    show()
    await userEvent.click(screen.getByRole('radio', { name: projection.viewTable }))
    cleanup()
    show()
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('donne une lecture textuelle à la figure', () => {
    // Ce qui se lit à l'œil se lit à l'oreille, ou l'un des deux ment.
    seed()
    show()
    expect(screen.getByText(/aujourd’hui à/)).toBeInTheDocument()
  })
})

describe('la durée et l’inflation', () => {
  it('change d’horizon d’un appui, sans quitter la page', async () => {
    seed()
    show()
    await userEvent.selectOptions(screen.getByLabelText(projection.duration), '25')
    expect(
      screen.getByText(tpl(projection.resultIn, projection.years.replace('%s', '25'))),
    ).toBeInTheDocument()
  })

  it('lit en euros d’aujourd’hui à la demande, et le signale sous la figure', async () => {
    seed()
    show()
    await openMore()
    await userEvent.selectOptions(screen.getByLabelText(projection.inflationAxis), 'constant')

    expect(screen.getByText(new RegExp(projection.constantOn.replace('%s', '')))).toBeInTheDocument()
  })
})

describe('ce que l’écran ne fait pas', () => {
  it('ne modifie pas le document, quoi qu’on règle', async () => {
    seedTwo()
    const before = JSON.stringify(useStore.getState().data)
    show()
    await useAccounts()

    const accounts = await open(projection.pillAccounts)
    await userEvent.click(within(accounts).getByRole('checkbox', { name: 'PEL' }))
    await userEvent.click(screen.getByRole('button', { name: /Fermer/ }))

    const rates = await open(projection.pillRate)
    await userEvent.click(within(rates).getAllByRole('radio', { name: projection.rateFlat })[0] as HTMLElement)

    /* Aucun `Entry`, aucun relevé, aucun taux : une hypothèse n'est pas un fait
       du foyer, et elle n'a rien à faire dans un export. */
    expect(JSON.stringify(useStore.getState().data)).toBe(before)
  })

  it('garde ses réglages hors du document, dans le stockage local', async () => {
    seed()
    show()
    await userEvent.selectOptions(screen.getByLabelText(projection.duration), '15')
    expect(localStorage.getItem(PROJECTION_STORAGE_KEY)).toContain('"years":15')
  })

  it('explique ce qu’il calcule, derrière une seule porte', async () => {
    seed()
    show()
    await userEvent.click(screen.getByRole('button', { name: projection.explain }))
    const panel = sheet()
    expect(within(panel).getByText(projection.explainMethod)).toBeInTheDocument()
    expect(within(panel).getByText(projection.explainSum)).toBeInTheDocument()
  })
})
