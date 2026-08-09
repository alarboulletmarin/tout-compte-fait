import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { type ISODate, type YearMonth, addDays, addMonthsToYm, currentYm, startOfMonth, today } from '@/domain/date'
import { eur, makeCategory, makeData, makeEntry } from '@/domain/fixtures'
import type { Entry } from '@/domain/types'
import { t } from '@/i18n/strings'
import { de, formatMoney, formatWeekdayDate, formatYearMonth, tpl } from '@/i18n/format'
import { useStore } from '@/store/store'
import { CalendarPage } from './CalendarPage'
import { CELLS, MAX_DOTS, dayNet } from './grid'

const initial = useStore.getState().data
const initialYm = useStore.getState().ym

/**
 * Un mois affiché, et deux échéances lointaines de part et d'autre.
 *
 * Elles ne sont pas du décor : `useMonthBounds` refuse les mois qu'on ne
 * pourrait pas ouvrir, et sans données autour, les cases de débord perdraient
 * leur geste — ce qui est justement l'un des comportements testés ici.
 */
function setup(ym: YearMonth, entries: Entry[] = []): void {
  useStore.setState({
    data: makeData({
      categories: [makeCategory({ id: 'cat-1' })],
      entries: [
        makeEntry({ id: 'borne-min', date: `${addMonthsToYm(ym, -6)}-15` }),
        makeEntry({ id: 'borne-max', date: `${addMonthsToYm(ym, 6)}-15` }),
        ...entries,
      ],
    }),
    ym,
  })

  render(
    <MemoryRouter>
      <CalendarPage />
    </MemoryRouter>,
  )
}

function grid(ym: YearMonth): HTMLElement {
  return screen.getByRole('group', {
    name: tpl(t.calendar.gridLabel, de(formatYearMonth(ym))),
  })
}

/** L'unique arrêt de tabulation de la grille — l'ancre du clavier. */
function anchorOf(ym: YearMonth): HTMLElement {
  const stops = within(grid(ym))
    .getAllByRole('button')
    .filter((button) => button.tabIndex === 0)
  expect(stops).toHaveLength(1)
  return stops[0] as HTMLElement
}

function named(element: Element | null): string {
  return element?.getAttribute('aria-label') ?? ''
}

describe('CalendarPage — la grille ne change plus de hauteur', () => {
  afterEach(() => {
    useStore.setState({ data: initial, ym: initialYm })
  })

  /* Février 2027 tient en quatre semaines, juin 2026 en cinq, août 2026 en six :
     ce sont les trois hauteurs que la tuile prenait tour à tour. */
  it.each(['2027-02', '2026-06', '2026-08'])('pose quarante-deux cases sur %s', (ym) => {
    setup(ym)
    expect(grid(ym).children).toHaveLength(CELLS)
  })

  it('nomme chaque case en toutes lettres, et dit ce que la forme dit à l’œil', () => {
    setup(currentYm())
    const cells = within(grid(currentYm())).getAllByRole('button')

    expect(named(anchorOf(currentYm()))).toContain(formatWeekdayDate(today()))
    expect(named(anchorOf(currentYm()))).toContain(t.calendar.dayToday)
    expect(cells.some((cell) => named(cell).includes(t.calendar.dayOutside))).toBe(true)
  })
})

describe('CalendarPage — le clavier', () => {
  afterEach(() => {
    useStore.setState({ data: initial, ym: initialYm })
  })

  it('n’offre qu’un seul arrêt de tabulation, sur aujourd’hui', () => {
    setup(currentYm())
    expect(named(anchorOf(currentYm()))).toContain(formatWeekdayDate(today()))
  })

  it('déplace le focus d’un jour, et l’arrêt de tabulation avec lui', async () => {
    setup(currentYm())
    anchorOf(currentYm()).focus()

    await userEvent.keyboard('{ArrowRight}')

    const demain = formatWeekdayDate(addDays(today(), 1))
    expect(named(document.activeElement)).toContain(demain)
    expect(named(anchorOf(currentYm()))).toContain(demain)
  })

  /* Le test le plus utile du fichier. `MonthHeader` écoute ← et → sur la
     fenêtre pour changer de mois ; la grille les écoute aussi, pour changer de
     jour. Sans le `preventDefault` de la grille, une seule frappe ferait les
     deux et le calendrier sauterait deux mois d'un coup. */
  it('avance d’un seul mois quand une flèche sort de la fenêtre', async () => {
    const ym = addMonthsToYm(currentYm(), -3)
    setup(ym)
    anchorOf(ym).focus()

    // Origine mène au lundi qui ouvre la fenêtre ; la flèche gauche en sort.
    await userEvent.keyboard('{Home}{ArrowLeft}')

    expect(useStore.getState().ym).toBe(addMonthsToYm(ym, -1))
  })

  it('pagine d’un mois sur Page suivante', async () => {
    const ym = addMonthsToYm(currentYm(), -3)
    const suivant = addMonthsToYm(ym, 1)
    setup(ym)
    anchorOf(ym).focus()

    await userEvent.keyboard('{PageDown}')

    expect(useStore.getState().ym).toBe(suivant)
    expect(named(document.activeElement)).toContain(formatWeekdayDate(startOfMonth(suivant)))
  })

  /* Une flèche, elle, ne pagine pas : sauf quand le 1er tombe un lundi, Origine
     mène à un jour du mois précédent — et il est déjà affiché, donc la grille
     n'a aucune raison de basculer sous les doigts. */
  it('rejoint un jour déjà affiché sans changer de mois', async () => {
    const ym = addMonthsToYm(currentYm(), -3)
    setup(ym)
    anchorOf(ym).focus()

    await userEvent.keyboard('{Home}')

    expect(useStore.getState().ym).toBe(ym)
    expect(document.activeElement).toBe(within(grid(ym)).getAllByRole('button')[0])
  })
})

describe('CalendarPage — le jour ouvert', () => {
  afterEach(() => {
    useStore.setState({ data: initial, ym: initialYm })
  })

  const jour: ISODate = '2026-08-12'
  const journee = [
    makeEntry({ id: 'loyer', date: jour, label: 'Loyer', amount: eur(90_000), status: 'planned' }),
    makeEntry({ id: 'cafe', date: jour, label: 'Café', amount: eur(250) }),
    makeEntry({ id: 'salaire', date: jour, label: 'Salaire', direction: 'in', amount: eur(200_000) }),
  ]

  it('se lit dans l’ordre des pastilles, le confirmé d’abord et le plus gros en tête', async () => {
    setup('2026-08', journee)
    await userEvent.click(
      within(grid('2026-08'))
        .getAllByRole('button')
        .find((cell) => named(cell).startsWith(formatWeekdayDate(jour))) as HTMLElement,
    )

    /* Dans la feuille, et non dans la page : la légende de la grille est une
       liste elle aussi, et elle reste montée derrière le panneau. */
    const lignes = within(screen.getByRole('dialog'))
      .getAllByRole('listitem')
      .map((item) => item.textContent ?? '')
    expect(lignes[0]).toContain('Salaire')
    expect(lignes[1]).toContain('Café')
    expect(lignes[2]).toContain('Loyer')
  })

  it('annonce le net du jour, prévu compris', async () => {
    setup('2026-08', journee)
    await userEvent.click(
      within(grid('2026-08'))
        .getAllByRole('button')
        .find((cell) => named(cell).startsWith(formatWeekdayDate(jour))) as HTMLElement,
    )

    expect(screen.getByText(t.calendar.dayTotal)).toBeInTheDocument()
    /* Sans normalisation : les montants portent une espace fine insécable, que
       le normaliseur par défaut de la bibliothèque ramènerait à une espace
       ordinaire d'un seul côté de la comparaison. */
    expect(
      screen.getByText(formatMoney(dayNet(journee), 'EUR'), { normalizer: (text) => text.trim() }),
    ).toBeInTheDocument()
  })

  /* Août 2026 commence un samedi : les cinq premières cases sont de juillet. */
  it('mène à son mois quand on ouvre un jour voisin', async () => {
    setup('2026-08')
    const voisin = within(grid('2026-08')).getAllByRole('button')[0] as HTMLElement
    expect(named(voisin)).toContain(t.calendar.dayOutside)

    await userEvent.click(voisin)

    expect(useStore.getState().ym).toBe('2026-07')
    expect(
      screen.getByRole('heading', { level: 2, name: formatWeekdayDate('2026-07-27') }),
    ).toBeInTheDocument()
  })

  /* Trois échéances dont une prévue : la case montre deux pastilles pleines et
     une en pointillés, et son nom accessible dit la même chose en mots. */
  it('dit le compte des prévues dans le nom de sa case', () => {
    setup('2026-08', journee)
    const case_ = within(grid('2026-08'))
      .getAllByRole('button')
      .find((cell) => named(cell).startsWith(formatWeekdayDate(jour))) as HTMLElement

    expect(named(case_)).toContain(tpl(t.calendar.someEntries, 3))
    expect(named(case_)).toContain(t.calendar.onePlanned)
  })

  it('rend le focus à sa case en se refermant', async () => {
    setup('2026-08', journee)
    const case_ = within(grid('2026-08'))
      .getAllByRole('button')
      .find((cell) => named(cell).startsWith(formatWeekdayDate(jour))) as HTMLElement

    await userEvent.click(case_)
    await userEvent.click(screen.getByRole('button', { name: t.common.close }))

    expect(named(document.activeElement)).toContain(formatWeekdayDate(jour))
  })
})

describe('CalendarPage — la légende', () => {
  afterEach(() => {
    useStore.setState({ data: initial, ym: initialYm })
  })

  it('nomme les quatre marques que la grille montre', () => {
    setup(currentYm(), [
      makeEntry({ id: 'prevue', date: today(), status: 'planned' }),
      makeEntry({ id: 'confirmee', date: today() }),
    ])

    expect(screen.getByText(t.calendar.legendDone)).toBeInTheDocument()
    expect(screen.getByText(t.calendar.legendPlanned)).toBeInTheDocument()
    expect(screen.getByText(t.calendar.legendToday)).toBeInTheDocument()
    expect(screen.getByText(t.calendar.legendDots)).toBeInTheDocument()
    // Deux échéances tiennent dans la case : rien à expliquer du « + ».
    expect(screen.queryByText(t.calendar.legendMore, { exact: false })).not.toBeInTheDocument()
  })

  /* Cinq échéances le même jour, quatre pastilles : le « +1 » apparaît, et la
     phrase qui le nomme avec lui. */
  it('explique le « + » le jour où il y en a un', () => {
    setup(
      currentYm(),
      Array.from({ length: MAX_DOTS + 1 }, (_, index) =>
        makeEntry({ id: `e-${String(index)}`, date: today(), amount: eur(100 * (index + 1)) }),
      ),
    )

    expect(screen.getByText(t.calendar.legendMore, { exact: false })).toBeInTheDocument()
  })

  /* Une légende qui nomme des marques absentes est du bruit : elle explique ce
     qui est à l'écran, et rien d'autre. */
  it('ne dit rien d’une fenêtre sans aucune pastille', () => {
    setup(currentYm())
    expect(screen.queryByText(t.calendar.legendDots)).not.toBeInTheDocument()
  })

  it('ne nomme pas le cadre du jour sur un mois qui ne le montre pas', () => {
    const ym = addMonthsToYm(currentYm(), -3)
    setup(ym, [makeEntry({ id: 'ailleurs', date: `${ym}-15` })])

    expect(screen.getByText(t.calendar.legendDone)).toBeInTheDocument()
    expect(screen.queryByText(t.calendar.legendToday)).not.toBeInTheDocument()
  })

  /* Le bouton qui portait ce mot est parti. Il apparaissait quand l'ancre du
     clavier quittait aujourd'hui — une condition qu'aucun pixel ne montre — et
     n'ouvrait qu'une feuille sur un mois où l'on était déjà. « Ce mois-ci » du
     bandeau ramène le mois, la case ramène au jour, et la légende dit lequel. */
  it('n’a plus de bouton derrière ce mot', () => {
    const ym = addMonthsToYm(currentYm(), -3)
    setup(ym, [makeEntry({ id: 'ailleurs', date: `${ym}-15` })])

    expect(
      screen.queryByRole('button', { name: t.calendar.legendToday }),
    ).not.toBeInTheDocument()
  })
})
