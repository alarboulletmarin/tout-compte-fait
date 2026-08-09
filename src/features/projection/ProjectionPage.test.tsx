/* ============================================================================
 * Ce que l'écran de simulation promet, et ce qu'il refuse.
 *
 * Les règles tenues ici ne se lisent dans le code d'aucun composant : la réserve
 * ne se replie jamais, les montants n'ont pas de centimes, le graphique est
 * doublé d'un tableau, l'incertitude se dit par une **fourchette** et non par
 * trois courbes concurrentes, la réponse ne quitte pas l'écran pendant qu'on
 * règle, et rien de ce qu'on tape ne touche au document.
 *
 * **Le dernier point a changé de forme, pas de fond.** L'écran lit l'épargne —
 * un capital relevé, des versements récurrents, et le taux posé sur la fiche
 * d'un compte —, mais la lecture est à sens unique : le document ne bouge pas
 * d'un octet, quoi qu'on tape ici. Ce fichier tient les deux bouts.
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
  makeEntry,
  makeFamily,
  makeMember,
  makeRecurrence,
  makeSavingRate,
  makeSavingSupport,
  makeSavingValuation,
} from '@/domain/fixtures'
import { projection } from '@/i18n/projection'
import { formatMoney, formatRoundedMoney, tpl } from '@/i18n/format'
import { ALL_FILTER, useStore } from '@/store/store'
import { ScreenTitleProvider } from '@/ui/ScreenTitleProvider'
import { PROJECTION_STORAGE_KEY } from './model'
import { ProjectionPage } from './ProjectionPage'

const said = (text: string): string => text.replace(/\s+/g, ' ').trim()

/** Le tableau des paliers — nommé, parce qu'on l'ouvre pour le lire. */
const milestones = (): HTMLElement => screen.getByRole('table', { name: projection.milestones })

/** Le chiffre héros — celui qu'on vient chercher, et le seul en `t-hero-fit`. */
const hero = (): string => said(document.querySelector('.t-hero-fit')?.textContent ?? '')

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
    show()
    expect(screen.getByText(projection.caveat)).toBeInTheDocument()
    // Ni `<details>`, ni bouton pour la faire disparaître.
    expect(screen.getByText(projection.caveat).closest('details')).toBeNull()
  })

  it('répond avant de demander : le résultat précède les paramètres', () => {
    show()
    const heading = screen.getAllByText(tpl(projection.resultIn, tpl(projection.years, 10)))[0]
    const params = screen.getByText(projection.params)
    if (heading === undefined) throw new Error('pas de résultat')
    /* `DOCUMENT_POSITION_FOLLOWING` : les paramètres viennent *après* le
       résultat dans l'ordre du document, donc dans l'ordre de lecture et dans
       celui de la tabulation. */
    expect(heading.compareDocumentPosition(params) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  /* Il ne suffit pas d'être en tête : on vient ici pour tourner des boutons, et
     régler sans voir ce qu'on change revient à jouer à un jeu dont le score est
     derrière soi. */
  it('garde la réponse à l’écran pendant qu’on règle', () => {
    show()
    const sticky = document.querySelector('.t-hero-fit')?.closest('.sticky')
    expect(sticky).not.toBeNull()
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

  it('double le graphique d’un tableau de paliers, derrière un repli', async () => {
    const user = userEvent.setup()
    show()
    // `<details>` garde son contenu dans le DOM : ce qui compte est qu'il ne
    // se lise pas — ni à l'œil, ni au lecteur d'écran — tant qu'il est replié.
    expect(milestones()).not.toBeVisible()

    await user.click(screen.getByText(projection.milestones))
    expect(milestones()).toBeVisible()
    // Quatre paliers plus l'en-tête.
    expect(within(milestones()).getAllByRole('row')).toHaveLength(5)
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

  it('bascule sur l’objectif, et le demande avant de répondre', async () => {
    const user = userEvent.setup()
    show()
    await user.click(screen.getByRole('radio', { name: projection.modeTarget }))
    expect(screen.getByText(projection.targetMissing)).toBeInTheDocument()

    await user.type(screen.getByLabelText(new RegExp(projection.target)), '100000')
    /* La réponse du mode inverse est un versement mensuel, pas un capital —
       et c'est bien le chiffre héros qui le porte, pas une ligne de détail. */
    expect(hero()).toMatch(new RegExp(said(tpl(projection.perMonth, ''))))
    // Et l'objectif se relit tel qu'il a été tapé, pas arrondi par le modèle.
    expect(
      screen.getByText(tpl(projection.targetHeading, '100 000 €', tpl(projection.years, 10))),
    ).toBeInTheDocument()
  })

  it('ne montre le champ de durée que sur le cinquième segment', async () => {
    const user = userEvent.setup()
    show()
    expect(screen.queryByLabelText(new RegExp(projection.durationYears))).toBeNull()
    await user.click(screen.getByRole('radio', { name: projection.durationOther }))
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

    await user.click(screen.getByRole('radio', { name: tpl(projection.durationPreset, 25) }))

    expect(localStorage.getItem(PROJECTION_STORAGE_KEY)).toContain('"years":25')
    // Rien de ce qu'on tape ici n'est un fait du foyer : le document ne bouge pas.
    expect(useStore.getState().data).toBe(before)
  })
})

/* ============================================================================
 * La fourchette — le seul mécanisme d'incertitude qui reste.
 *
 * L'écran en avait quatre : trois hypothèses libres, trois présélections, un
 * taux par compte et un second taux « comparé » par compte. Aucun ne disait
 * lequel des autres il remplaçait. Ce qui compte ici, c'est qu'il n'y en ait
 * plus qu'un, qu'il se lise dans le résultat, et qu'il se **referme** de
 * lui-même là où l'app n'a plus rien à ignorer.
 * ==========================================================================*/

describe('la fourchette de rendement', () => {
  const openRates = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
    await user.click(screen.getByRole('button', { name: new RegExp(projection.rate) }))
  }

  it('rend une fourchette et non un chiffre unique', () => {
    show()
    // « ≈ x – ≈ y » : deux montants, sur le même axe, sans qu'on ait à choisir.
    expect(hero()).toContain('–')
  })

  it('la range derrière une ligne plutôt que dans le flux', async () => {
    const user = userEvent.setup()
    show()
    expect(screen.getByLabelText(new RegExp(projection.rangeLow))).not.toBeVisible()
    await openRates(user)
    expect(screen.getByLabelText(new RegExp(projection.rangeLow))).toBeVisible()
  })

  it('affiche sur la ligne les taux qui courent', () => {
    show()
    // 2 % – 5 % par défaut, et c'est ce que la rangée dit sans qu'on l'ouvre.
    expect(screen.getByText(tpl(projection.rangeShort, '2 %', '5 %'))).toBeInTheDocument()
  })

  it('se referme quand les deux bornes coïncident', async () => {
    const user = userEvent.setup()
    show()
    await openRates(user)
    const high = screen.getByLabelText(new RegExp(projection.rangeHigh))
    await user.clear(high)
    await user.type(high, '2')

    expect(hero()).not.toContain('–')
  })

  it('signale une borne illisible plutôt que de la lire comme zéro', async () => {
    const user = userEvent.setup()
    show()
    await openRates(user)
    const high = screen.getByLabelText(new RegExp(projection.rangeHigh))
    await user.clear(high)
    await user.type(high, '450')

    expect(screen.getByText(tpl(projection.rateInvalid, 100))).toBeInTheDocument()
  })

  it('range la lecture en euros constants avec le rendement, et le signale', async () => {
    const user = userEvent.setup()
    show()
    expect(screen.queryByText(/euros d’aujourd’hui, inflation/)).toBeNull()
    await openRates(user)
    await user.click(screen.getByRole('checkbox', { name: projection.constant }))
    expect(screen.getByText(/euros d’aujourd’hui, inflation/)).toBeInTheDocument()
  })

  /* Le cœur du modèle : l'écart ne se pose pas uniformément sur un
     portefeuille, il se pose là où l'app ne sait pas. */
  it('se referme sur un compte qui porte son taux', async () => {
    const user = userEvent.setup()
    seed()
    useStore.setState({
      data: {
        ...useStore.getState().data,
        savingRates: [makeSavingRate({ id: 'tx-1', supportId: 's-1', rateBp: 250, from: '2020-01-01' })],
      },
    })
    show()

    await user.selectOptions(screen.getByLabelText(projection.source), 'support:s-1')
    expect(hero()).not.toContain('–')
  })

  it('reste ouverte sur un compte qui n’en porte aucun', async () => {
    const user = userEvent.setup()
    seed()
    show()

    await user.selectOptions(screen.getByLabelText(projection.source), 'support:s-1')
    expect(hero()).toContain('–')
  })
})

/* ============================================================================
 * Le rendement, compte par compte — dans la feuille.
 *
 * Chaque compte a **sa ligne**, préremplie de ce que sa fiche porte : projeter
 * un Livret A et un PEA sous un taux unique n'a aucun sens. Ce qu'on y tape ne
 * vaut que pour la **simulation** — rien ne redescend dans le document. Et la
 * provenance de chaque taux se dit : un compte muet ne doit pas passer pour un
 * compte renseigné.
 * ==========================================================================*/

describe('le rendement par compte', () => {
  const rateField = (label: string) => screen.getByLabelText(label, { exact: false })

  async function portfolio() {
    const user = userEvent.setup()
    seedTwo()
    show()
    await user.selectOptions(screen.getByLabelText(projection.source), 'member:m-1')
    await user.click(screen.getByRole('button', { name: new RegExp(projection.rate) }))
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

  it('dit qu’un compte sans taux prend la fourchette', async () => {
    await portfolio()
    expect(screen.getByText(projection.supportRateBorrowed)).toBeInTheDocument()
    /* L'invite porte le taux qui s'applique en bas de fourchette — 2 % par
       défaut. Le champ fait deux caractères de large : un libellé y serait
       coupé au milieu, et d'où vient le taux se lit sous lui. */
    expect(rateField('PEL')).toHaveAttribute('placeholder', expect.stringContaining('2'))
  })

  it('change l’arrivée quand on essaie un autre taux', async () => {
    const user = await portfolio()
    const before = hero()
    await user.type(rateField('Livret A'), '9')

    expect(screen.getByText(projection.supportRateSimulated)).toBeInTheDocument()
    expect(hero()).not.toBe(before)
  })

  it('rend le taux du support d’un geste', async () => {
    const user = await portfolio()
    await user.type(rateField('Livret A'), '9')
    await user.click(screen.getByRole('button', { name: projection.supportRateReset }))

    expect(rateField('Livret A')).toHaveValue('')
    expect(screen.getByText(projection.supportRateOwn)).toBeInTheDocument()
  })

  it('n’écrit rien dans le document', async () => {
    const user = await portfolio()
    const before = useStore.getState().data
    await user.type(rateField('Livret A'), '9')

    expect(useStore.getState().data).toBe(before)
  })
})

/* ============================================================================
 * « Et si je versais… » — la seule lecture actionnable de l'écran.
 * ==========================================================================*/

describe('le réglage d’effort', () => {
  const more = () =>
    screen.getByRole('button', { name: new RegExp(said(tpl(projection.effortMore, ''))) })

  it('se tait tant qu’on n’a rien bougé', () => {
    show()
    expect(screen.getByText(projection.effortHint)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: new RegExp(said(tpl(projection.effortApply, ''))) })).toBeNull()
  })

  it('dit l’écart plutôt que l’arrivée', async () => {
    const user = userEvent.setup()
    show()
    await user.click(more())
    // 100 €/mois par défaut, pas de 10 € : un cran vaut donc 110 €/mois.
    /* Deux nœuds portent « à l'arrivée » — la lecture accessible du tracé en
       parle aussi : c'est celui du réglage qu'on lit, et il porte un signe. */
    expect(
      screen.getAllByText(new RegExp(said(tpl(projection.effortGap, '')))).some((node) =>
        (node.textContent ?? '').includes('+'),
      ),
    ).toBe(true)
  })

  it('ne descend jamais sous zéro', async () => {
    const user = userEvent.setup()
    show()
    const less = screen.getByRole('button', {
      name: new RegExp(said(tpl(projection.effortLess, ''))),
    })
    for (let click = 0; click < 12; click += 1) await user.click(less)
    expect(screen.getByText(tpl(projection.perMonth, '0 €'))).toBeInTheDocument()
  })

  /* Les montants se composent avec le formateur de l'écran plutôt que d'être
     recopiés : « 110 € » porte une espace **fine** insécable, et la recherche
     par nom accessible ne normalise pas les espaces. Un littéral tapé à la
     main tomberait sur un caractère invisible. */
  const applied = (cents: number): string =>
    tpl(projection.effortApply, formatRoundedMoney(eur(cents), 'EUR'))

  it('reprend le montant essayé dans la simulation, sur un geste explicite', async () => {
    const user = userEvent.setup()
    show()
    await user.click(more())
    await user.click(screen.getByRole('button', { name: applied(11_000) }))
    expect(screen.getByLabelText(new RegExp(projection.monthly))).toHaveValue('110,00')
  })

  it('coupe le lien à l’épargne en reprenant un montant, comme « Modifier »', async () => {
    const user = userEvent.setup()
    seed()
    show()
    await user.selectOptions(screen.getByLabelText(projection.source), 'support:s-1')
    await user.click(more())
    /* 350 €/mois repris de l'épargne réelle : le pas suit l'ordre de grandeur
       du versement (`rungStep`), donc 50 € et non 10 — un cran vaut 400 €. */
    await user.click(screen.getByRole('button', { name: applied(40_000) }))

    expect(screen.getByLabelText(projection.source)).toHaveValue('free')
    expect(screen.getByLabelText(new RegExp(projection.initial))).toHaveValue('8450,00')
    expect(screen.getByLabelText(new RegExp(projection.monthly))).toHaveValue('400,00')
  })

  it('n’a rien à régler en mode inverse : le versement est la réponse', async () => {
    const user = userEvent.setup()
    show()
    await user.click(screen.getByRole('radio', { name: projection.modeTarget }))
    await user.type(screen.getByLabelText(new RegExp(projection.target)), '100000')
    expect(screen.queryByText(projection.effort)).toBeNull()
  })
})

describe('le versement libre peut reprendre la capacité restante', () => {
  function seedCapacity() {
    useStore.setState({
      filter: ALL_FILTER,
      data: makeData({
        household: { name: '', members: [makeMember({ id: 'm-1', name: 'Andrea' })] },
        families: [makeFamily({ id: 'fam-res', label: 'Ressources', kind: 'resource' })],
        categories: [
          makeCategory({ id: 'salaire', label: 'Salaire', familyId: 'fam-res', direction: 'in' }),
        ],
        entries: [
          makeEntry({
            id: 'sal',
            date: `${ymOf(today())}-01`,
            direction: 'in',
            amount: eur(150_000),
            categoryId: 'salaire',
            memberId: 'm-1',
          }),
        ],
      }),
    })
  }

  // Le même gabarit que `exact()` sur l'écran : sans centimes, comme un
  // montant qui entre dans le calcul plutôt que d'en sortir.
  const exactAmount = (cents: number): string => formatMoney(eur(cents), 'EUR', false)

  it('propose la capacité restante en simulation libre, jamais ailleurs', () => {
    seedCapacity()
    show()

    const hint = screen.getByText(/Capacité d’épargne restante/)
    expect(hint.textContent).toContain(exactAmount(150_000))
  })

  it('ne se propose pas sans capacité restante', () => {
    show()
    expect(screen.queryByText(/Capacité d’épargne restante/)).not.toBeInTheDocument()
  })

  it('pose le montant dans le champ de versement, d’un geste', async () => {
    const user = userEvent.setup()
    seedCapacity()
    show()

    await user.click(
      screen.getByRole('button', { name: tpl(projection.capacityUse, exactAmount(150_000)) }),
    )

    expect(screen.getByLabelText(new RegExp(projection.monthly))).toHaveValue('1500,00')
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
    expect(screen.getByText(projection.sourceCapital).nextElementSibling).toHaveTextContent('8 450 €')
    expect(screen.getByText(projection.sourceMonthly).nextElementSibling).toHaveTextContent(
      tpl(projection.perMonth, '350 €'),
    )
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

describe('le tableau des paliers', () => {
  it('porte le versé et les deux bornes quand il y a une fourchette', async () => {
    const user = userEvent.setup()
    show()
    await user.click(screen.getByText(projection.milestones))

    expect(
      within(milestones())
        .getAllByRole('columnheader')
        .map((cell) => said(cell.textContent ?? '')),
    ).toEqual([
      projection.milestoneWhen,
      projection.contributedArea,
      projection.rangeLowColumn,
      projection.rangeHighColumn,
    ])
  })

  it('n’en porte qu’une quand la fourchette est refermée', async () => {
    const user = userEvent.setup()
    seedTwo()
    show()
    await user.selectOptions(screen.getByLabelText(projection.source), 'support:s-1')
    await user.click(screen.getByText(projection.milestones))

    expect(
      within(milestones())
        .getAllByRole('columnheader')
        .map((cell) => said(cell.textContent ?? '')),
    ).toEqual([projection.milestoneWhen, projection.contributedArea, projection.breakdownTotal])
  })
})
