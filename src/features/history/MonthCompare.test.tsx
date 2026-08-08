import { useState } from 'react'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { makeCategory, makeData, makeEntry, makeFamily } from '@/domain/fixtures'
import { money } from '@/domain/money'
import type { Entry } from '@/domain/types'
import { t } from '@/i18n/strings'
import { history } from '@/i18n/history'
import { formatDelta, formatMoney, formatYearMonthShort, tpl } from '@/i18n/format'
import { ALL_FILTER, useStore } from '@/store/store'
import { MonthCompare, type MonthPick } from './MonthCompare'

/* Les attentes passent par les formateurs plutôt que par des chaînes écrites à
   la main : l'espace fine insécable et le signe moins typographique sont la
   règle de `format.ts`, qui a ses propres tests.
   `getByText` normalise les blancs — cette fine y perdrait sa forme —, d'où un
   normaliseur qui se contente des bords. Le montant se lit sur le texte
   accessible d'`Amount`, seul endroit où il tient en un nœud : le rendu visible
   est découpé en signe, entier, centimes et symbole. */
const EXACT = { normalizer: (value: string) => value.trim() }
const euros = (cents: number): string => formatMoney(money(cents), 'EUR')

const FAMILIES = [
  makeFamily({ id: 'fam-charge', kind: 'charge' }),
  makeFamily({ id: 'fam-saving', kind: 'saving' }),
]

const CATEGORIES = [
  makeCategory({ id: 'alimentation', label: 'Alimentation', familyId: 'fam-charge' }),
  makeCategory({ id: 'energie', label: 'Énergies', familyId: 'fam-charge' }),
  makeCategory({ id: 'assurance', label: 'Assurance', familyId: 'fam-charge' }),
  makeCategory({ id: 'livret', label: 'Livret A', familyId: 'fam-saving' }),
]

const out = (date: string, categoryId: string, amount: number): Entry =>
  makeEntry({ date, categoryId, label: categoryId, direction: 'out', amount: money(amount) })

/* Deux mois, quatre catégories : deux qui bougent, une qui apparaît, une qui ne
   bouge pas. C'est la forme de tous les cas que la comparaison doit
   distinguer. */
const ENTRIES: Entry[] = [
  out('2026-05-03', 'alimentation', 67000),
  out('2026-06-03', 'alimentation', 53600),
  out('2026-05-04', 'energie', 10000),
  out('2026-06-04', 'energie', 18500),
  out('2026-05-05', 'assurance', 30000),
  out('2026-06-05', 'assurance', 30000),
  out('2026-06-06', 'livret', 20000),
]

function Harness() {
  const [pick, setPick] = useState<MonthPick | null>(null)
  return <MonthCompare pick={pick} onPick={setPick} />
}

function setup(entries: Entry[] = ENTRIES) {
  useStore.setState({
    ym: '2026-06',
    filter: ALL_FILTER,
    data: makeData({ families: FAMILIES, categories: CATEGORIES, entries }),
  })
  return render(<Harness />)
}

describe('la comparaison de deux mois', () => {
  beforeEach(() => {
    useStore.setState({ ym: '2026-06', filter: ALL_FILTER, data: makeData() })
  })

  /* Le défaut que règle cette refonte : la liste montrait l'union des
     catégories des deux mois, « 0,00 € · 0 % » compris. */
  it('ne montre d’abord que les catégories qui ont changé', () => {
    setup()
    expect(screen.getByText('Alimentation')).toBeVisible()
    expect(screen.getByText('Énergies')).toBeVisible()
    expect(screen.getByText('Livret A')).toBeVisible()
    expect(screen.getByText('Assurance')).not.toBeVisible()
  })

  it('compte ce qui a changé, et dit l’écart net', () => {
    setup()
    expect(screen.getByText(tpl(history.compareChangedMany, 3))).toBeInTheDocument()
    // −134,00 + 85,00 + 200,00
    expect(screen.getByText(`+${euros(15100)}`, EXACT)).toBeInTheDocument()
  })

  /* Deux règles qui ne s'écrivaient nulle part : la liste ne compare que les
     sorties, et son signe se lit du mois de référence vers le mois comparé. */
  it('dit ce que la colonne des écarts compte, et dans quel sens', () => {
    setup()
    expect(screen.getByText(history.compareScope)).toBeVisible()
  })

  /* Les rangées repliées portent un montant et non un écart : la phrase de
     l'écart n'a rien à y faire, celle du repli dit déjà ce qu'elles montrent. */
  it('ne définit pas l’écart là où il n’y en a pas', () => {
    setup([out('2026-05-05', 'assurance', 30000), out('2026-06-05', 'assurance', 30000)])
    expect(screen.queryByText(history.compareScope)).not.toBeInTheDocument()
  })

  it('accorde le compte au singulier', () => {
    setup([out('2026-05-03', 'alimentation', 67000), out('2026-06-03', 'alimentation', 53600)])
    expect(screen.getByText(history.compareChangedOne)).toBeInTheDocument()
  })

  it('donne le montant d’abord, la proportion ensuite', () => {
    setup()
    expect(screen.getByText(euros(-13400), EXACT)).toBeInTheDocument()
    expect(screen.getByText(formatDelta(-0.2), EXACT)).toBeInTheDocument()
    expect(screen.getByText(formatDelta(0.85), EXACT)).toBeInTheDocument()
  })

  /* Le mois de référence est à zéro : il n'y a pas de proportion à écrire, et
     surtout jamais d'`Infinity` ni de `NaN`. */
  it('dit « nouvelle » plutôt qu’un pourcentage impossible', () => {
    setup()
    expect(screen.getByText(history.compareAppeared)).toBeInTheDocument()
    expect(screen.queryByText(/Infinity|NaN/)).not.toBeInTheDocument()
  })

  /* Le rouge dit « ça coûte plus » : un versement d'épargne en hausse n'est pas
     une facture qui flambe. Et il n'est jamais seul — le signe est là. */
  it('n’alarme que sur une hausse de charge', () => {
    const { container } = setup()
    const alarmed = [...container.querySelectorAll('.text-danger-text')].map((n) => n.textContent)
    expect(alarmed).toHaveLength(1)
    expect(alarmed[0]).toContain('85,00')
  })

  it('range les inchangées derrière un repli, avec leur compte', async () => {
    setup()
    const details = screen.getByRole('group')
    expect(details).not.toHaveAttribute('open')
    expect(within(details).getByText('1')).toBeInTheDocument()

    await userEvent.click(screen.getByText(history.compareUnchanged))
    expect(details).toHaveAttribute('open')
    expect(screen.getByText('Assurance')).toBeVisible()
  })

  /* Ce qu'on veut savoir d'une catégorie qui n'a pas bougé, c'est ce qu'elle
     pèse — pas qu'elle vaut zéro de plus qu'elle-même. */
  it('montre le montant commun dans le repli, jamais un zéro', async () => {
    setup()
    await userEvent.click(screen.getByText(history.compareUnchanged))
    expect(
      screen.getByText(`${t.direction.out.toLowerCase()} ${euros(30000)}`, EXACT),
    ).toBeInTheDocument()
    expect(screen.queryByText(formatDelta(0), EXACT)).not.toBeInTheDocument()
  })

  it('remplace la liste par une phrase quand rien n’a bougé', () => {
    setup([out('2026-05-05', 'assurance', 30000), out('2026-06-05', 'assurance', 30000)])
    expect(screen.getByText(history.compareNoChange)).toBeInTheDocument()
    expect(screen.queryByText(history.compareChangedOne)).not.toBeInTheDocument()
  })

  it('le dit plutôt que de comparer quand il n’y a qu’un mois', () => {
    setup([out('2026-06-03', 'alimentation', 53600)])
    expect(screen.getByText(history.compareSingleMonth)).toBeInTheDocument()
  })

  /* `addMonthsToYm('')` levait, et il levait avant le garde qui l'explique : un
     document sans aucune entrée ni aucun mois ouvert faisait tomber l'écran. */
  it('ne tombe pas sur un document sans le moindre mois', () => {
    setup([])
    expect(screen.getByText(history.compareSingleMonth)).toBeInTheDocument()
  })

  it('propose les mois en forme courte, dans deux sélecteurs distincts', () => {
    setup()
    const left = screen.getByLabelText(history.compareLeft)
    const right = screen.getByLabelText(history.compareRight)
    expect(left).toHaveValue('2026-05')
    expect(right).toHaveValue('2026-06')
    expect(within(left).getByRole('option', { name: formatYearMonthShort('2026-06') })).toBeInTheDocument()
  })

  it('suit le mois qu’on choisit', async () => {
    setup()
    await userEvent.selectOptions(screen.getByLabelText(history.compareRight), '2026-05')
    expect(screen.getByText(history.compareNoChange)).toBeInTheDocument()
  })

  /* Un import ou un jeu d'exemple remplace les données sous le composant : le
     `<select>` portait alors un mois absent de sa propre liste. */
  it('retombe sur les deux derniers mois quand les données changent sous elle', async () => {
    setup()
    await userEvent.selectOptions(screen.getByLabelText(history.compareLeft), '2026-06')

    const ailleurs = [
      out('2024-01-03', 'alimentation', 1000),
      out('2024-02-03', 'alimentation', 2000),
    ]
    act(() => {
      useStore.setState({
        data: makeData({ families: FAMILIES, categories: CATEGORIES, entries: ailleurs }),
      })
    })

    expect(screen.getByLabelText(history.compareLeft)).toHaveValue('2024-01')
    expect(screen.getByLabelText(history.compareRight)).toHaveValue('2024-02')
  })

  /* Un nom de catégorie n'a pas de plafond : c'est la ligne qui s'adapte. */
  it('tronque un libellé très long plutôt que de déborder', () => {
    const long = 'Abonnements de téléphonie mobile et accès internet du foyer'
    useStore.setState({
      ym: '2026-06',
      filter: ALL_FILTER,
      data: makeData({
        families: FAMILIES,
        categories: [makeCategory({ id: 'alimentation', label: long, familyId: 'fam-charge' })],
        entries: [
          out('2026-05-03', 'alimentation', 67000),
          out('2026-06-03', 'alimentation', 53600),
        ],
      }),
    })
    render(<Harness />)
    expect(screen.getByText(long)).toHaveClass('truncate')
  })
})
