/* ============================================================================
 * Ce que la projection branchée sur le document promet, et ce qu'elle refuse.
 *
 * Trois règles tiennent cet écran, et aucune ne se lit dans le code d'un
 * composant : elle part du **capital estimé** — donc du même chiffre que la
 * tuile Capital —, elle ne compte **jamais** un support sans relevé, et elle
 * n'écrit **rien** dans le document, pas même quand on essaie un autre
 * versement que celui des récurrences.
 * ==========================================================================*/

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  eur,
  makeCategory,
  makeData,
  makeEntry,
  makeFamily,
  makeMember,
  makeRecurrence,
  makeSavingSupport,
  makeSavingValuation,
} from '@/domain/fixtures'
import { formatMoney, tpl } from '@/i18n/format'
import { projection } from '@/i18n/projection'
import { t } from '@/i18n/strings'
import { ALL_FILTER, useStore } from '@/store/store'
import { ScreenTitleProvider } from '@/ui/ScreenTitleProvider'
import { freshness } from '@/features/savings/freshness'
import { ProjectionPage } from './ProjectionPage'
import { PROJECTION_STORAGE_KEY } from './model'

const initial = useStore.getState().data

const said = (text: string): string => text.replace(/\s+/g, ' ').trim()
const spoken = (cents: number): string => said(formatMoney(eur(cents), 'EUR'))

const ANDREA = makeMember({ id: 'm-1', name: 'Andrea' })
const MARIE = makeMember({ id: 'm-2', name: 'Marie', color: 'var(--member-2)' })

const STATEMENT = '2026-07-01'
const monthly = { unit: 'month' as const, every: 1, anchorDay: 1 }

/**
 * Andrea porte les trois cas d'un coup : un livret relevé **et** alimenté, un
 * PEA relevé sans règle, et une assurance-vie jamais relevée — le seul support
 * que l'app ne sait pas projeter. Marie n'en a qu'un, pour que le changement de
 * personne se voie.
 */
function seed() {
  useStore.setState({
    ym: '2026-08',
    filter: ALL_FILTER,
    data: makeData({
      household: { name: '', members: [ANDREA, MARIE] },
      families: [makeFamily({ id: 'fam-savings', label: 'Épargne', kind: 'saving' })],
      categories: [makeCategory({ id: 'passbook', label: 'Livrets', familyId: 'fam-savings' })],
      savingSupports: [
        makeSavingSupport({ id: 's-1', label: 'Livret A', memberId: 'm-1' }),
        makeSavingSupport({ id: 's-2', label: 'PEA', memberId: 'm-1' }),
        makeSavingSupport({ id: 's-3', label: 'Assurance vie', memberId: 'm-1' }),
        makeSavingSupport({ id: 's-4', label: 'Livret jeune', memberId: 'm-2' }),
      ],
      savingValuations: [
        makeSavingValuation({ id: 'v-1', supportId: 's-1', amount: eur(1_200_000), date: STATEMENT }),
        makeSavingValuation({ id: 'v-2', supportId: 's-2', amount: eur(500_000), date: STATEMENT }),
        makeSavingValuation({ id: 'v-4', supportId: 's-4', amount: eur(800_000), date: STATEMENT }),
      ],
      entries: [
        makeEntry({
          id: 'e-1',
          date: '2026-07-05',
          amount: eur(20_000),
          categoryId: 'passbook',
          memberId: 'm-1',
          savingSupportId: 's-1',
        }),
      ],
      recurrences: [
        makeRecurrence({
          id: 'r-1',
          label: 'Virement livret',
          categoryId: 'passbook',
          memberId: 'm-1',
          savingSupportId: 's-1',
          amount: eur(20_000),
          period: monthly,
        }),
      ],
    }),
  })
}

function open() {
  render(
    <MemoryRouter>
      <ScreenTitleProvider>
        <ProjectionPage />
      </ScreenTitleProvider>
    </MemoryRouter>,
  )
}

/** Le groupe de champs d'un support — quatre comptes font quatre « Taux ». */
const fieldsOf = (label: string): HTMLElement => screen.getByRole('group', { name: label })

beforeEach(() => {
  /* Le 9 août : les relevés du 1er juillet ont un mois, et le versement du 5 est
     tombé. Sans date fixe, l'âge d'un relevé changerait tous les mois. */
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 7, 9, 12))
})

afterEach(() => {
  /* Démonter avant de reposer le document : les `afterEach` se dépilent, et
     reposer le store sous un arbre encore monté ferait remonter l'écran hors
     d'`act`. */
  cleanup()
  vi.useRealTimers()
  localStorage.clear()
  useStore.setState({ data: initial, filter: ALL_FILTER })
})

describe('la projection part de ce qu’on possède', () => {
  it('ouvre cette lecture-là dès qu’un support a un relevé', () => {
    seed()
    open()
    expect(screen.getByRole('radio', { name: projection.sourceSupports })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByText(projection.supportsReads)).toBeInTheDocument()
  })

  it('reste sur le simulateur tant qu’aucun relevé n’existe', () => {
    open()
    expect(screen.getByRole('radio', { name: projection.sourceFree })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    // Il trace quelque chose dès l'arrivée, sans rien demander.
    expect(screen.getByRole('img', { name: /projection/i })).toBeInTheDocument()
  })

  it('part du capital estimé — le relevé, plus ce qui est tombé depuis', () => {
    seed()
    open()
    // 12 000 € relevés le 1er juillet, 200 € versés le 5 : le même chiffre que
    // la tuile Capital, au centime.
    expect(
      within(fieldsOf('Livret A')).getByText(
        tpl(projection.supportStart, spoken(1_220_000), freshness(STATEMENT)),
      ),
    ).toBeInTheDocument()
  })

  it('prend le versement des récurrences sans rien demander', () => {
    seed()
    open()
    const livret = fieldsOf('Livret A')
    expect(within(livret).getByText(tpl(projection.supportFromRules, spoken(20_000)))).toBeInTheDocument()
    expect(within(livret).getByLabelText(projection.monthly)).toHaveValue('200,00')
    // Le PEA n'a aucune règle : le dire vaut mieux qu'un champ à zéro muet.
    expect(within(fieldsOf('PEA')).getByText(projection.supportNoRule)).toBeInTheDocument()
  })

  it('laisse un support sans relevé dehors, et mène au geste qui manque', async () => {
    seed()
    open()
    expect(within(fieldsOf('Assurance vie')).getByText(projection.supportNoValue)).toBeInTheDocument()
    // Jamais « 0 € » : une inconnue n'est pas un zéro.
    expect(within(fieldsOf('Assurance vie')).queryByLabelText(projection.scenarioRate)).toBeNull()
    expect(screen.getByText(projection.supportsUnvaluedOne)).toBeInTheDocument()
    expect(
      await screen.findByRole('button', { name: t.savings.valuesUpdate }),
    ).toBeInTheDocument()
  })

  it('double le graphique d’un tableau : un compte par colonne, puis le total', () => {
    seed()
    open()
    const headers = within(screen.getByRole('table')).getAllByRole('columnheader')
    // La durée, le livret, le PEA, le total. L'assurance-vie n'y est pas.
    expect(headers.map((cell) => said(cell.textContent ?? ''))).toEqual([
      projection.milestoneWhen,
      'Livret A',
      'PEA',
      projection.supportsTotal,
    ])
  })

  it('n’écrit jamais un centime dans le tableau', () => {
    seed()
    open()
    for (const cell of within(screen.getByRole('table')).getAllByRole('cell')) {
      expect(said(cell.textContent ?? '')).toMatch(/^≈ /)
      expect(said(cell.textContent ?? '')).not.toMatch(/,\d\d/)
    }
  })
})

describe('elle nomme ce qu’elle laisse dehors', () => {
  it('retire un support dont le taux est illisible, sans effacer les autres', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    seed()
    open()

    const rate = within(fieldsOf('Livret A')).getByLabelText(projection.scenarioRate)
    await user.clear(rate)
    await user.type(rate, '450')

    expect(screen.getByText(tpl(projection.supportsUnreadable, 'Livret A'))).toBeInTheDocument()
    // Le PEA reste tracé : une saisie fautive retire son compte, pas l'écran.
    const headers = within(screen.getByRole('table')).getAllByRole('columnheader')
    expect(headers.map((cell) => said(cell.textContent ?? ''))).toEqual([
      projection.milestoneWhen,
      'PEA',
    ])
  })

  it('dit ce qui manque plutôt que de tracer un zéro, quand rien n’est relevé', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    seed()
    useStore.setState({
      data: { ...useStore.getState().data, savingValuations: [] },
    })
    open()

    // Sans relevé, l'écran s'ouvre sur les chiffres libres : il n'a rien de réel
    // à projeter, et refuser de servir serait pire.
    await user.click(screen.getByRole('radio', { name: projection.sourceSupports }))

    expect(screen.getByText(projection.supportsNoValue)).toBeInTheDocument()
    // Ni courbe ni tableau : personne n'a « 0 € dans dix ans ».
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByRole('button', { name: t.savings.valuesUpdate })).toBeInTheDocument()
  })
})

describe('elle se lit au nom d’une personne, et jamais du foyer', () => {
  it('pose une personne quand le filtre n’en portait aucune', () => {
    seed()
    expect(useStore.getState().filter).toEqual(ALL_FILTER)
    open()
    expect(useStore.getState().filter).toEqual({ kind: 'member', memberId: 'm-1' })
  })

  it('ne montre jamais les supports de deux personnes ensemble', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    seed()
    open()

    expect(screen.getByRole('group', { name: 'Livret A' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Livret jeune' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Marie' }))
    expect(screen.getByRole('group', { name: 'Livret jeune' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Livret A' })).toBeNull()
    // Marie n'a rien de non relevé : la phrase disparaît avec sa raison d'être.
    expect(screen.queryByText(projection.supportsUnvaluedOne)).toBeNull()
  })
})

describe('elle ne touche pas au document', () => {
  it('garde le taux et le versement hors des données', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    seed()
    const before = useStore.getState().data
    open()

    const livret = fieldsOf('Livret A')
    await user.clear(within(livret).getByLabelText(projection.scenarioRate))
    await user.type(within(livret).getByLabelText(projection.scenarioRate), '5')
    await user.clear(within(livret).getByLabelText(projection.monthly))
    await user.type(within(livret).getByLabelText(projection.monthly), '300')

    // Ni le relevé, ni la récurrence, ni quoi que ce soit d'autre.
    expect(useStore.getState().data).toBe(before)
  })

  it('signale un versement essayé, et le rend', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    seed()
    open()

    const field = within(fieldsOf('Livret A')).getByLabelText(projection.monthly)
    await user.clear(field)
    await user.type(field, '300')

    // Une simulation qui ne se distingue pas d'un fait est une simulation qui ment.
    expect(
      within(fieldsOf('Livret A')).getByText(tpl(projection.supportTried, spoken(20_000))),
    ).toBeInTheDocument()

    await user.click(within(fieldsOf('Livret A')).getByRole('button', { name: projection.supportReset }))
    expect(within(fieldsOf('Livret A')).getByLabelText(projection.monthly)).toHaveValue('200,00')
    expect(
      within(fieldsOf('Livret A')).getByText(tpl(projection.supportFromRules, spoken(20_000))),
    ).toBeInTheDocument()
  })

  it('garde le choix de la source, hors du document', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    seed()
    open()

    await user.click(screen.getByRole('radio', { name: projection.sourceFree }))
    expect(screen.getByText(projection.freeNote)).toBeInTheDocument()
    expect(localStorage.getItem(PROJECTION_STORAGE_KEY)).toContain('"source":"free"')
  })
})
