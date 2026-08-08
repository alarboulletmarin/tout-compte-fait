import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { makeCategory, makeData, makeEntry, makeFamily, makeMember } from '@/domain/fixtures'
import { money } from '@/domain/money'
import type { Entry } from '@/domain/types'
import { history } from '@/i18n/history'
import { formatMoney, monthName, tpl } from '@/i18n/format'
import { ALL_FILTER, useStore } from '@/store/store'
import { YearCompare } from './YearCompare'

// Voir `MonthCompare.test` : les attentes sortent des formateurs, jamais d'une
// chaîne écrite à la main.
const EXACT = { normalizer: (value: string) => value.trim() }
const euros = (cents: number): string => formatMoney(money(cents), 'EUR', false)

const FAMILIES = [
  makeFamily({ id: 'fam-charge', kind: 'charge' }),
  makeFamily({ id: 'fam-income', kind: 'resource' }),
]
const CATEGORIES = [
  makeCategory({ id: 'courses', label: 'Courses', familyId: 'fam-charge' }),
  makeCategory({ id: 'paie', label: 'Paie', familyId: 'fam-income', direction: 'in' }),
]

const income = (date: string, amount: number, memberId?: string): Entry =>
  makeEntry({
    date,
    label: `paie ${date}`,
    categoryId: 'paie',
    direction: 'in',
    amount: money(amount),
    ...(memberId === undefined ? {} : { memberId }),
  })

function Harness() {
  const [pick, setPick] = useState<number | null>(null)
  return <YearCompare pick={pick} onPick={setPick} />
}

const MEMBERS = [makeMember({ id: 'm1', name: 'Alix' }), makeMember({ id: 'm2', name: 'Camille' })]

function setup(entries: Entry[], memberId?: string) {
  useStore.setState({
    ym: '2026-08',
    filter: memberId === undefined ? ALL_FILTER : { kind: 'member', memberId },
    data: makeData({
      families: FAMILIES,
      categories: CATEGORIES,
      entries,
      household: { name: 'Maison', members: MEMBERS },
    }),
  })
  return render(<Harness />)
}

describe('la comparaison de deux années', () => {
  beforeEach(() => {
    useStore.setState({ ym: '2026-08', filter: ALL_FILTER, data: makeData() })
  })

  it('le dit plutôt que de comparer quand aucune année n’est couverte', () => {
    setup([])
    expect(screen.getByText(history.yearsEmpty)).toBeInTheDocument()
  })

  /* La comparaison n'a qu'un sélecteur et se fait toujours contre l'année
     d'avant : on le dit, plutôt que de le laisser deviner au tracé. */
  it('nomme les deux années comparées à côté du sélecteur', () => {
    setup([income('2026-01-05', 100000), income('2025-01-05', 80000)])
    expect(screen.getByLabelText(history.year)).toHaveValue('2026')
    expect(screen.getByText(tpl(history.yearsVersus, 2026, 2025))).toBeInTheDocument()
  })

  /* Le défaut : huit mois d'une année en cours se lisaient contre douze mois de
     la précédente, et le mois de plus passait pour un écart. */
  it('arrête les deux années au dernier mois de celle qu’on regarde', () => {
    setup([
      income('2026-01-05', 100000),
      income('2026-02-05', 100000),
      income('2025-01-05', 80000),
      income('2025-02-05', 80000),
      income('2025-12-05', 500000),
    ])
    // 2026 s'arrête en février : 2 000 € contre 1 600 €, et non contre 6 600 €.
    expect(
      screen.getByText(
        tpl(history.srYears, 2026, 2025, monthName(2), `${euros(200000)} / ${euros(160000)}`),
        EXACT,
      ),
    ).toHaveClass('sr-only-text')
    expect(screen.getByText(tpl(history.yearsPartial, 2026, monthName(2)))).toBeInTheDocument()
  })

  it('ne prévient de rien quand l’année va jusqu’au bout', () => {
    setup([income('2026-01-05', 100000), income('2026-12-05', 100000), income('2025-06-05', 80000)])
    expect(screen.queryByText(/s’arrête à/)).not.toBeInTheDocument()
  })

  /* La synthèse demandée vit dans la lecture au-dessus du tracé, dont la
     position par défaut est justement l'horizon : à l'arrivée, ces trois
     chiffres sont le bilan de l'année. */
  it('lit l’écart entre les deux années au mois d’arrêt', () => {
    setup([income('2026-01-05', 100000), income('2025-01-05', 80000)])
    expect(screen.getByText(history.yearsDelta)).toBeInTheDocument()
    expect(screen.getByText(`+${euros(20000)}`, EXACT)).toBeInTheDocument()
  })

  /* Trois montants sous « 2026 », « 2025 » et « Écart » disaient de quelle
     année ils viennent, jamais de quelle grandeur : le solde du mois lu, ou son
     cumul depuis janvier ? Le nom du graphique le dit désormais à l'œil, et pas
     seulement dans l'`aria-label` du tracé. */
  it('nomme la grandeur que les trois chiffres portent', () => {
    setup([income('2026-01-05', 100000), income('2025-01-05', 80000)])
    expect(screen.getByText(history.cumulative)).toBeVisible()
    expect(screen.getByRole('img')).toHaveAccessibleName(history.cumulative)
  })

  it('n’a rien à comparer sans année précédente, et le dit', () => {
    setup([income('2026-01-05', 100000)])
    expect(screen.getByText(tpl(history.yearsNoPrevious, 2025))).toBeInTheDocument()
    expect(screen.queryByText(history.yearsDelta)).not.toBeInTheDocument()
  })

  /* Le contrôle lisait les entrées **non portées** pendant que le tracé lisait
     les entrées portées : sous un filtre par membre, une ligne de légende
     apparaissait sans trait. */
  it('ne pose pas de légende pour une année que la portée ne trace pas', () => {
    setup([income('2026-01-05', 100000, 'm2'), income('2025-01-05', 80000, 'm1')], 'm2')
    /* Les mois du curseur, et non les options du sélecteur d'année : les deux
       portent le rôle `option`, seul le curseur est une `listbox`. */
    const months = within(screen.getByRole('listbox')).getAllByRole('option')
    expect(months[0]?.getAttribute('aria-label')).not.toContain('2025')
    expect(screen.getByText(tpl(history.yearsNoPrevious, 2025))).toBeInTheDocument()
  })

  /* Une période sans donnée n'est pas une période à zéro (cahier §4.7). */
  it('lit un cadratin, jamais un zéro, sur une année vide pour la portée', () => {
    setup([income('2026-01-05', 100000, 'm2'), income('2025-01-05', 80000, 'm2')], 'm1')
    expect(screen.getByText(tpl(history.srYearsEmpty, 2026), EXACT)).toHaveClass('sr-only-text')
  })

  it('suit l’année qu’on choisit', async () => {
    setup([income('2026-01-05', 100000), income('2025-01-05', 80000), income('2024-01-05', 50000)])
    await userEvent.selectOptions(screen.getByLabelText(history.year), '2025')
    expect(screen.getByText(tpl(history.yearsVersus, 2025, 2024))).toBeInTheDocument()
  })
})
