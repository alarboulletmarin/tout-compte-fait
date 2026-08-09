/* ============================================================================
 * Ce que l'écran des projections promet, et ce qu'il refuse.
 *
 * Les règles tenues ici ne se lisent dans le code d'aucun composant : la réserve
 * ne se replie jamais, les montants n'ont pas de centimes, le graphique est
 * doublé d'un tableau, les hypothèses sont plafonnées à trois, la réponse arrive
 * avant les paramètres, et rien de ce qu'on tape ne touche au document.
 *
 * **Le dernier point a changé de forme, pas de fond.** L'écran lit désormais
 * l'épargne — un capital relevé, des versements récurrents, et le taux posé sur
 * la fiche d'un compte —, mais la lecture est à sens unique : le document ne
 * bouge pas d'un octet, quoi qu'on tape ici. Ce fichier tient les deux bouts.
 * ==========================================================================*/

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { addMonthsToYm, endOfMonth, today, ymOf } from '@/domain/date'
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

/** Le tableau des jalons — l'écran en porte deux, et ils se nomment. */
const milestones = (): HTMLElement => screen.getByRole('table', { name: projection.milestones })

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
      savingSupports: [
        makeSavingSupport({ id: 's-1', memberId: 'm-1', label: 'Livret A' }),
      ],
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

afterEach(() => {
  cleanup()
  localStorage.clear()
  useStore.setState({ data: pristine, filter: ALL_FILTER })
})

describe('l’écran des projections', () => {
  it('pose sa réserve sous le résultat, et ne la replie pas', () => {
    show()
    expect(screen.getByText(projection.caveat)).toBeInTheDocument()
    // Ni `<details>`, ni bouton pour la faire disparaître.
    expect(screen.getByText(projection.caveat).closest('details')).toBeNull()
  })

  it('répond avant de demander : le résultat précède les paramètres', () => {
    show()
    /* Le premier des deux : le surtitre du résultat, et le curseur du graphique
       qui lit la même date plus bas. C'est celui d'en haut qui nous intéresse. */
    const heading = screen.getAllByText(tpl(projection.resultIn, tpl(projection.years, 10)))[0]
    const params = screen.getByText(projection.params)
    if (heading === undefined) throw new Error('pas de résultat')
    /* `DOCUMENT_POSITION_FOLLOWING` : les paramètres viennent *après* le
       résultat dans l'ordre du document, donc dans l'ordre de lecture et dans
       celui de la tabulation. C'est le renversement que tout l'écran porte. */
    expect(heading.compareDocumentPosition(params) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('décompose le chiffre au lieu de le laisser seul', () => {
    show()
    for (const label of [
      projection.breakdownPaid,
      projection.breakdownInterest,
      projection.breakdownTotal,
    ]) {
      // Les mêmes mots servent de légende au tracé : c'est voulu — le
      // graphique et la décomposition disent la même chose.
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    }
  })

  it('trace quelque chose dès l’arrivée, sans rien demander', () => {
    show()
    expect(screen.getByRole('img', { name: /projection/i })).toBeInTheDocument()
  })

  it('donne au graphique une lecture au doigt et au clavier', () => {
    show()
    const cursor = screen.getByRole('listbox', { name: projection.chartCursor })
    // La lecture s'ouvre sur l'arrivée : c'est le chiffre qu'on vient chercher.
    const stops = within(cursor).getAllByRole('option')
    expect(stops.at(-1)).toHaveAttribute('aria-selected', 'true')
  })

  it('double le graphique d’un tableau de jalons, derrière un repli', async () => {
    const user = userEvent.setup()
    show()
    // `<details>` garde son contenu dans le DOM : ce qui compte est qu'il ne
    // se lise pas — ni à l'œil, ni au lecteur d'écran — tant qu'il est replié.
    expect(milestones()).not.toBeVisible()

    await user.click(screen.getByText(projection.milestones))
    expect(milestones()).toBeVisible()
    const rows = within(milestones()).getAllByRole('row')
    // Quatre jalons plus l'en-tête.
    expect(rows).toHaveLength(5)
  })

  it('porte le versé, le rendement et le total quand une seule hypothèse est posée', async () => {
    const user = userEvent.setup()
    show()
    await user.click(screen.getByText(projection.milestones))
    const headers = within(milestones()).getAllByRole('columnheader')
    expect(headers.map((cell) => said(cell.textContent ?? ''))).toEqual([
      projection.milestoneWhen,
      projection.contributedArea,
      projection.interest,
      projection.breakdownTotal,
    ])
  })

  it('n’écrit jamais un centime dans le tableau', async () => {
    const user = userEvent.setup()
    show()
    await user.click(screen.getByText(projection.milestones))
    for (const cell of within(milestones()).getAllByRole('cell')) {
      expect(said(cell.textContent ?? '')).toMatch(/^≈ /)
      expect(said(cell.textContent ?? '')).not.toMatch(/,\d\d/)
    }
  })

  it('plafonne les hypothèses à trois, puis retire le bouton', async () => {
    const user = userEvent.setup()
    show()
    await user.click(screen.getByRole('button', { name: projection.scenarioAdd }))
    await user.click(screen.getByRole('button', { name: projection.scenarioAdd }))
    expect(screen.queryByRole('button', { name: projection.scenarioAdd })).toBeNull()

    await user.click(screen.getByText(projection.milestones))
    // Trois colonnes d'hypothèse, plus celle des durées.
    expect(within(milestones()).getAllByRole('columnheader')).toHaveLength(4)
  })

  it('n’affirme pas qu’un taux est garanti à la place de qui le coche', async () => {
    const user = userEvent.setup()
    show()
    // Le libellé dit le *type* de taux, il ne le certifie pas — et la mise en
    // garde n'apparaît que là où elle corrige quelque chose.
    expect(screen.queryByText(projection.kindGuaranteedHint)).toBeNull()
    await user.click(screen.getByRole('radio', { name: projection.kindGuaranteed }))
    expect(screen.getByText(projection.kindGuaranteedHint)).toBeInTheDocument()
  })

  it('bascule sur l’objectif, et le demande avant de répondre', async () => {
    const user = userEvent.setup()
    show()
    await user.click(screen.getByRole('radio', { name: projection.modeTarget }))
    expect(screen.getByText(projection.targetMissing)).toBeInTheDocument()

    await user.type(screen.getByLabelText(new RegExp(projection.target)), '100000')
    /* La réponse du mode inverse est un versement mensuel, pas un capital —
       et c'est bien le chiffre héros qui le porte, pas une ligne de détail. */
    const hero = document.querySelector('.t-hero-fit')
    expect(hero?.textContent).toMatch(new RegExp(said(tpl(projection.perMonth, ''))))
    // Et l'objectif se relit tel qu'il a été tapé, pas arrondi par le modèle.
    expect(
      screen.getByText(
        tpl(projection.targetHeading, '100 000 €', tpl(projection.years, 10)),
      ),
    ).toBeInTheDocument()
  })

  it('signale la lecture en euros constants dès qu’elle est active', async () => {
    const user = userEvent.setup()
    show()
    expect(screen.queryByText(/euros d’aujourd’hui, inflation/)).toBeNull()
    await user.click(screen.getByRole('checkbox', { name: projection.constant }))
    expect(screen.getByText(/euros d’aujourd’hui, inflation/)).toBeInTheDocument()
  })

  it('signale un taux illisible plutôt que de le lire comme zéro', async () => {
    const user = userEvent.setup()
    show()
    const rate = screen.getByLabelText(new RegExp(projection.scenarioRate))
    await user.clear(rate)
    await user.type(rate, '450')
    expect(screen.getByText(tpl(projection.rateInvalid, 100))).toBeInTheDocument()
  })

  it('ne montre le champ de durée que sur demande', async () => {
    const user = userEvent.setup()
    show()
    expect(screen.queryByLabelText(new RegExp(projection.durationYears))).toBeNull()
    await user.click(screen.getByRole('button', { name: projection.durationOther }))
    expect(screen.getByLabelText(new RegExp(projection.durationYears))).toBeInTheDocument()
  })

  it('range la pédagogie derrière une seule porte', async () => {
    const user = userEvent.setup()
    show()
    // La feuille vit dans le DOM en permanence — c'est un `<dialog>` — mais
    // elle n'est lue et visible qu'une fois ouverte.
    expect(screen.getByText(projection.explainMethodBody)).not.toBeVisible()
    await user.click(screen.getByRole('button', { name: projection.explain }))
    expect(screen.getByText(projection.explainMethodBody)).toBeVisible()
    expect(screen.getByText(projection.explainNetBody)).toBeVisible()
  })

  it('garde les réglages pour la prochaine visite, et rien de plus', async () => {
    const user = userEvent.setup()
    const before = useStore.getState().data
    show()

    await user.click(screen.getByRole('radio', { name: tpl(projection.durationPreset, 20) }))

    expect(localStorage.getItem(PROJECTION_STORAGE_KEY)).toContain('"years":20')
    // Rien de ce qu'on tape ici n'est un fait du foyer : le document ne bouge pas.
    expect(useStore.getState().data).toBe(before)
  })
})

describe('quand la simulation part de l’épargne réelle', () => {
  it('ne propose que la simulation libre tant qu’il n’y a pas de support', () => {
    show()
    const options = within(screen.getByLabelText(projection.source)).getAllByRole('option')
    expect(options).toHaveLength(1)
    expect(options[0]).toHaveTextContent(projection.sourceFree)
  })

  it('reprend le capital relevé et les versements récurrents', async () => {
    const user = userEvent.setup()
    seed()
    show()

    await user.selectOptions(screen.getByLabelText(projection.source), 'support:s-1')

    // 8 450 € de capital, 350 €/mois — à l'euro près et sans « ≈ » : ce sont
    // des faits relevés, pas des sorties de modèle.
    expect(screen.getByText(projection.sourceCapital).nextElementSibling).toHaveTextContent(
      '8 450 €',
    )
    expect(screen.getByText(projection.sourceMonthly).nextElementSibling).toHaveTextContent(
      tpl(projection.perMonth, '350 €'),
    )
  })

  it('ne se contredit pas d’un bloc à l’autre sur le capital de départ', async () => {
    const user = userEvent.setup()
    seed()
    show()
    await user.selectOptions(screen.getByLabelText(projection.source), 'support:s-1')

    // Le « ≈ » commence à la première capitalisation, pas avant : ce qui entre
    // dans le calcul se relit tel qu'il est entré.
    const row = screen.getByText(projection.breakdownInitial).nextElementSibling
    expect(row).toHaveTextContent('8 450 €')
    expect(row?.textContent).not.toContain('≈')
  })

  it('dit d’où sortent les deux chiffres repris', async () => {
    const user = userEvent.setup()
    seed()
    show()
    await user.selectOptions(screen.getByLabelText(projection.source), 'support:s-1')

    // Un montant repris sans sa provenance est un montant qu'il faut croire.
    expect(screen.getByText(projection.sourceFromOne)).toBeInTheDocument()
    expect(screen.getByText(projection.sourceRulesOne)).toBeInTheDocument()
    // Et la question qu'on se pose juste après : les virements ponctuels ?
    expect(screen.getByText(projection.sourceOneOff)).toBeInTheDocument()
  })

  it('dit ce que « Versements » recouvre, plutôt que de laisser deviner', async () => {
    const user = userEvent.setup()
    seed()
    show()
    await user.selectOptions(screen.getByLabelText(projection.source), 'support:s-1')

    /* « Versements ≈ 42 k€ » ne répond pas à « c'est le total sur dix ans,
       ça ? ». « 350 €/mois pendant 10 ans » y répond sans qu'on demande. */
    expect(
      screen.getByText(
        tpl(
          projection.breakdownPaidFrom,
          tpl(projection.perMonth, '350 €'),
          tpl(projection.years, 10),
        ),
      ),
    ).toBeInTheDocument()
  })

  it('n’étale pas sur dix ans une règle qui s’arrête dans six mois', async () => {
    const user = userEvent.setup()
    seed()
    /* Une reconstitution d'avance : elle court quelques mois, et le moteur ne
       sait projeter qu'un versement constant. La compter la multiplierait par
       cent vingt — et remettre de l'argent là où on l'a pris n'est de toute
       façon pas un effort d'épargne. */
    const data = useStore.getState().data
    useStore.setState({
      data: {
        ...data,
        recurrences: [
          ...data.recurrences,
          makeRecurrence({
            id: 'r-avance',
            categoryId: 'passbook',
            savingSupportId: 's-1',
            memberId: 'm-1',
            direction: 'out',
            amount: eur(6_600),
            period: { unit: 'month', every: 1, anchorDay: 5 },
            /* Six mois d'ici, et non une date en dur : l'horizon se mesure
               depuis aujourd'hui, donc une date écrite ici sortirait de la
               fenêtre au bout d'un an et ferait tomber le test sans qu'une
               ligne de code ait bougé. */
            endedOn: endOfMonth(addMonthsToYm(ymOf(today()), 6)),
          }),
        ],
      },
    })
    show()
    await user.selectOptions(screen.getByLabelText(projection.source), 'support:s-1')

    expect(screen.getByText(projection.sourceMonthly).nextElementSibling).toHaveTextContent(
      tpl(projection.perMonth, '350 €'),
    )
    expect(screen.getByText(projection.sourceEndingOne)).toBeInTheDocument()
  })

  it('ne prête aucun rendement au support, et le dit', async () => {
    const user = userEvent.setup()
    seed()
    show()
    await user.selectOptions(screen.getByLabelText(projection.source), 'support:s-1')
    expect(screen.getByText(projection.sourceNoRate)).toBeInTheDocument()
  })

  it('affiche les chiffres repris en lecture, jamais dans un champ éditable', async () => {
    const user = userEvent.setup()
    seed()
    show()
    await user.selectOptions(screen.getByLabelText(projection.source), 'support:s-1')
    // On ne tape pas par-dessus l'épargne : on ne peut donc pas croire qu'on la
    // modifie.
    expect(screen.queryByLabelText(new RegExp(projection.monthly))).toBeNull()
    expect(screen.queryByLabelText(new RegExp(projection.initial))).toBeNull()
  })

  it('rend les champs en recopiant les valeurs, et coupe le lien', async () => {
    const user = userEvent.setup()
    seed()
    show()
    await user.selectOptions(screen.getByLabelText(projection.source), 'support:s-1')
    await user.click(screen.getByRole('button', { name: projection.sourceEdit }))

    expect(screen.getByLabelText(new RegExp(projection.monthly))).toHaveValue('350,00')
    expect(screen.getByLabelText(new RegExp(projection.initial))).toHaveValue('8450,00')
    expect(screen.getByLabelText(projection.source)).toHaveValue('free')
  })

  it('n’écrit rien dans le document en lisant l’épargne', async () => {
    const user = userEvent.setup()
    seed()
    const before = useStore.getState().data
    show()

    await user.selectOptions(screen.getByLabelText(projection.source), 'support:s-1')
    await user.click(screen.getByRole('button', { name: projection.sourceEdit }))

    expect(useStore.getState().data).toBe(before)
  })

  it('dit qu’un support sans relevé ne vaut pas zéro', async () => {
    const user = userEvent.setup()
    seed()
    useStore.setState({ data: { ...useStore.getState().data, savingValuations: [] } })
    show()

    await user.selectOptions(screen.getByLabelText(projection.source), 'support:s-1')
    expect(screen.getByText(projection.sourceNoValue)).toBeInTheDocument()
  })

  it('retombe en simulation libre quand le support choisi n’existe plus', async () => {
    const user = userEvent.setup()
    seed()
    const { unmount } = show()
    await user.selectOptions(screen.getByLabelText(projection.source), 'support:s-1')
    unmount()

    useStore.setState({ data: { ...useStore.getState().data, savingSupports: [] } })
    show()
    expect(screen.getByLabelText(projection.source)).toHaveValue('free')
  })
})

describe('un portefeuille support par support', () => {
  /** Deux comptes à deux taux : c'est la situation que la décomposition sert. */
  function twoSupports() {
    seed()
    const data = useStore.getState().data
    useStore.setState({
      data: {
        ...data,
        savingSupports: [
          makeSavingSupport({ id: 's-1', memberId: 'm-1', label: 'Livret A' }),
          makeSavingSupport({ id: 's-2', memberId: 'm-1', label: 'PEL' }),
        ],
        savingRates: [
          makeSavingRate({ id: 'tx-1', supportId: 's-1', rateBp: 250, from: '2020-01-01' }),
        ],
        savingValuations: [
          ...data.savingValuations,
          makeSavingValuation({
            id: 'v-2',
            supportId: 's-2',
            amount: eur(300_000),
            date: '2020-01-01',
          }),
        ],
      },
    })
  }

  it('donne une colonne à chaque support, plus le total', async () => {
    const user = userEvent.setup()
    twoSupports()
    show()
    await user.selectOptions(screen.getByLabelText(projection.source), 'member:m-1')
    await user.click(screen.getByText(projection.milestones))

    const headers = within(milestones())
      .getAllByRole('columnheader')
      .map((cell) => said(cell.textContent ?? ''))
    expect(headers[0]).toBe(projection.milestoneWhen)
    expect(headers[1]).toContain('Livret A')
    expect(headers[2]).toContain('PEL')
    expect(headers.at(-1)).toBe(projection.splitTotal)
  })

  it('dit quelle colonne emprunte l’hypothèse de l’écran', async () => {
    const user = userEvent.setup()
    twoSupports()
    show()
    await user.selectOptions(screen.getByLabelText(projection.source), 'member:m-1')
    await user.click(screen.getByText(projection.milestones))

    const headers = within(milestones())
      .getAllByRole('columnheader')
      .map((cell) => said(cell.textContent ?? ''))
    // Le Livret A porte 2,5 % ; le PEL n'en porte aucun et le dit.
    expect(headers[1]).not.toContain(said(tpl(projection.splitBorrowed, '')))
    expect(headers[2]).toContain(said(tpl(projection.splitBorrowed, '')))
  })

  it('n’annonce plus un taux unique quand il y en a plusieurs', async () => {
    const user = userEvent.setup()
    twoSupports()
    show()
    await user.selectOptions(screen.getByLabelText(projection.source), 'member:m-1')

    // « 3 %/an » sous le rendement serait faux, et faux dans le sens qui
    // rassure. La mention vit dans une phrase — d'où la recherche par contenu.
    expect(
      screen.getAllByText((text) => said(text).includes(said(projection.splitRates))).length,
    ).toBeGreaterThan(0)
  })

  it('renonce à la décomposition dès qu’on compare deux hypothèses', async () => {
    const user = userEvent.setup()
    twoSupports()
    show()
    await user.selectOptions(screen.getByLabelText(projection.source), 'member:m-1')
    await user.click(screen.getByRole('button', { name: projection.scenarioAdd }))
    await user.click(screen.getByText(projection.milestones))

    expect(
      within(milestones())
        .getAllByRole('columnheader')
        .map((cell) => said(cell.textContent ?? '')),
    ).not.toContain(projection.splitTotal)
  })
})

/* ============================================================================
 * Le rendement, compte par compte.
 *
 * Trois choses à tenir. Chaque compte a **sa ligne**, préremplie de ce que sa
 * fiche porte — projeter un Livret A et un PEA sous un taux unique n'a aucun
 * sens. Ce qu'on y tape ne vaut que pour la **simulation** : rien ne redescend
 * dans le document, et c'est la règle qui tient tout l'écran (cahier §4.6 ter).
 * Et la provenance de chaque taux se **dit** — un compte muet ne doit pas
 * passer pour un compte renseigné.
 * ==========================================================================*/

describe('le rendement par support', () => {
  const rateField = (label: string) => screen.getByLabelText(label, { exact: false })

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
        savingRates: [
          makeSavingRate({ id: 'tx-1', supportId: 's-1', rateBp: 250, from: '2020-01-01' }),
        ],
        savingValuations: [
          ...data.savingValuations,
          makeSavingValuation({
            id: 'v-2',
            supportId: 's-2',
            amount: eur(300_000),
            date: '2020-01-01',
          }),
        ],
      },
    })
  }

  async function portfolio() {
    const user = userEvent.setup()
    seedTwo()
    show()
    await user.selectOptions(screen.getByLabelText(projection.source), 'member:m-1')
    return user
  }

  it('donne une ligne à chaque compte, préremplie de ce que sa fiche porte', async () => {
    await portfolio()
    // Le placeholder porte le taux repris : le champ reste vide, parce qu'un
    // champ prérempli laisserait croire qu'on édite le support.
    expect(rateField('Livret A')).toHaveValue('')
    expect(rateField('Livret A')).toHaveAttribute('placeholder', expect.stringContaining('2,5'))
    expect(screen.getByText(projection.supportRateOwn)).toBeInTheDocument()
  })

  it('dit qu’un compte sans taux emprunte l’hypothèse de l’écran', async () => {
    await portfolio()
    expect(screen.getByText(projection.supportRateBorrowed)).toBeInTheDocument()
    expect(rateField('PEL')).toHaveAttribute(
      'placeholder',
      projection.supportRateEmpty,
    )
  })

  /** Le chiffre héros — celui qu'on vient chercher, et le seul en `t-hero-fit`. */
  const hero = (): string =>
    said(document.querySelector('.t-hero-fit')?.textContent ?? '')

  it('change l’arrivée quand on essaie un autre taux', async () => {
    const user = await portfolio()
    const before = hero()
    await user.type(rateField('Livret A'), '9')

    expect(screen.getByText(projection.supportRateSimulated)).toBeInTheDocument()
    expect(hero()).not.toBe(before)
  })

  it('n’écrit rien dans le document', async () => {
    /* La règle qui tient l'écran : une simulation ne redescend jamais. Le
       document doit être identique au caractère près après la saisie. */
    const user = await portfolio()
    const before = JSON.stringify(useStore.getState().data)
    await user.type(rateField('Livret A'), '9')
    expect(JSON.stringify(useStore.getState().data)).toBe(before)
  })

  it('rend le taux du support quand on retire l’essai', async () => {
    const user = await portfolio()
    await user.type(rateField('Livret A'), '9')
    await user.click(screen.getByRole('button', { name: projection.supportRateReset }))

    expect(rateField('Livret A')).toHaveValue('')
    expect(screen.queryByText(projection.supportRateSimulated)).not.toBeInTheDocument()
  })

  it('ne s’affiche pas en simulation libre — il n’y a aucun compte', () => {
    seed()
    show()
    expect(screen.queryByText(projection.supportRates)).not.toBeInTheDocument()
  })
})

describe('le tracé décomposé', () => {
  async function portfolio() {
    const user = userEvent.setup()
    seed()
    const data = useStore.getState().data
    useStore.setState({
      data: {
        ...data,
        savingSupports: [
          makeSavingSupport({ id: 's-1', memberId: 'm-1', label: 'Livret A' }),
          makeSavingSupport({ id: 's-2', memberId: 'm-1', label: 'PEL' }),
        ],
        savingValuations: [
          ...data.savingValuations,
          makeSavingValuation({
            id: 'v-2',
            supportId: 's-2',
            amount: eur(300_000),
            date: '2020-01-01',
          }),
        ],
      },
    })
    show()
    await user.selectOptions(screen.getByLabelText(projection.source), 'member:m-1')
    return user
  }

  it('empile une bande par compte, et nomme chacune', async () => {
    await portfolio()
    expect(screen.getByRole('img', { name: projection.chartStack })).toBeInTheDocument()
    // La légende nomme chaque bande : la couleur ne dit jamais seule (DS §2.3).
    expect(screen.getAllByText('Livret A').length).toBeGreaterThan(0)
    expect(screen.getAllByText('PEL').length).toBeGreaterThan(0)
  })

  it('revient au tracé habituel dès qu’on compare deux hypothèses', async () => {
    /* Trois rendements posés sur le même versé ne s'additionnent pas : les
       empiler tracerait un capital que personne n'a (cahier §4.6 ter). */
    const user = await portfolio()
    await user.click(screen.getByRole('button', { name: projection.scenarioAdd }))
    expect(screen.queryByRole('img', { name: projection.chartStack })).toBeNull()
  })

  it('revient au tracé habituel en simulation libre', () => {
    seed()
    show()
    expect(screen.queryByRole('img', { name: projection.chartStack })).toBeNull()
  })
})
