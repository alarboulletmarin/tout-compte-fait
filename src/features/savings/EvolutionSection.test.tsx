/* ============================================================================
 * L'évolution de l'épargne, support par support.
 *
 * Trois règles que le graphique seul ne dit pas.
 *
 * La **pile est légitime** parce que les supports s'additionnent : le sommet
 * *est* le patrimoine, et le tableau doit redonner exactement les mêmes
 * chiffres — le cahier §5 demande la lecture textuelle, et deux lectures qui
 * divergeraient d'un euro seraient pires qu'une seule.
 *
 * Un support **sans relevé n'y figure pas**. L'empiler à zéro ferait passer une
 * ignorance pour un compte vide, et le total serait faux en se présentant comme
 * exact (cahier §4.6 bis).
 *
 * Le **taux daté ne réécrit pas le passé** : c'est la propriété qui a fait
 * exister la v12, et c'est ici qu'elle se voit.
 * ==========================================================================*/

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { addMonthsToYm, currentYm, startOfMonth } from '@/domain/date'
import {
  eur,
  makeCategory,
  makeData,
  makeFamily,
  makeMember,
  makeSavingRate,
  makeSavingSupport,
  makeSavingValuation,
} from '@/domain/fixtures'
import { supports } from '@/i18n/supports'
import { formatMoney } from '@/i18n/format'
import { useStore } from '@/store/store'
import { EvolutionSection } from './EvolutionSection'

const initial = useStore.getState().data

/** Un jour du mois, `n` mois avant celui qu'on vit. */
const monthsAgo = (n: number): string => startOfMonth(addMonthsToYm(currentYm(), -n))

const said = (text: string): string => text.replace(/\s+/g, ' ').trim()
const euros = (amount: number): string => said(formatMoney(eur(amount), 'EUR', false))

function seed(over: Partial<ReturnType<typeof makeData>> = {}) {
  useStore.setState({
    filter: { kind: 'member', memberId: 'm-1' },
    data: makeData({
      household: { name: '', members: [makeMember({ id: 'm-1', name: 'Andrea' })] },
      families: [makeFamily({ id: 'fam-savings', label: 'Épargne', kind: 'saving' })],
      categories: [
        makeCategory({ id: 'passbook', label: 'Livrets', familyId: 'fam-savings' }),
        makeCategory({ id: 'plans', label: 'Plans', familyId: 'fam-savings' }),
      ],
      savingSupports: [
        makeSavingSupport({ id: 's-1', label: 'Livret A', memberId: 'm-1' }),
        makeSavingSupport({
          id: 's-2',
          label: 'PEL',
          memberId: 'm-1',
          categoryId: 'plans',
        }),
      ],
      savingValuations: [
        makeSavingValuation({
          id: 'v-1',
          supportId: 's-1',
          amount: eur(1_000_000),
          date: monthsAgo(11),
        }),
        makeSavingValuation({
          id: 'v-2',
          supportId: 's-2',
          amount: eur(500_000),
          date: monthsAgo(11),
        }),
      ],
      ...over,
    }),
  })
}

const show = () => render(<EvolutionSection />)

/** La dernière ligne du tableau replié — l'état d'aujourd'hui. */
async function lastRow(): Promise<HTMLElement> {
  const user = userEvent.setup()
  await user.click(screen.getByText(supports.evolutionDetail))
  const rows = within(screen.getByRole('table')).getAllByRole('row')
  const last = rows.at(-1)
  if (last === undefined) throw new Error('tableau vide')
  return last
}

afterEach(() => {
  cleanup()
  useStore.setState({ data: initial })
})

describe('la pile', () => {
  it('donne une bande par support, plus le total', () => {
    seed()
    show()
    /* Deux fois chacun : la légende du tracé et l'en-tête de sa colonne dans le
       tableau, qui est la lecture textuelle du même graphique. */
    expect(screen.getAllByText('Livret A')).toHaveLength(2)
    expect(screen.getAllByText('PEL')).toHaveLength(2)
    expect(screen.getAllByText(supports.evolutionTotal)).toHaveLength(2)
  })

  it('somme exactement au total, dans le tableau comme dans la légende', async () => {
    seed()
    show()
    const cells = within(await lastRow()).getAllByRole('cell')
    // Deux colonnes de support, puis le total : 10 000 € + 5 000 € = 15 000 €.
    expect(said(cells[0]?.textContent ?? '')).toBe(euros(1_000_000))
    expect(said(cells[1]?.textContent ?? '')).toBe(euros(500_000))
    expect(said(cells.at(-1)?.textContent ?? '')).toBe(euros(1_500_000))
  })

  it('écarte un support qu’aucun relevé ne chiffre', () => {
    /* L'empiler à zéro ferait passer une inconnue pour un compte vide, et le
       total serait faux en se présentant comme exact. */
    seed({
      savingSupports: [
        makeSavingSupport({ id: 's-1', label: 'Livret A', memberId: 'm-1' }),
        makeSavingSupport({ id: 's-3', label: 'PER jamais relevé', memberId: 'm-1' }),
      ],
    })
    show()
    expect(screen.queryByText('PER jamais relevé')).not.toBeInTheDocument()
  })

  it('s’efface quand rien n’a jamais été relevé', () => {
    seed({ savingValuations: [] })
    show()
    expect(screen.getByText(supports.evolutionEmpty)).toBeInTheDocument()
  })
})

describe('le taux', () => {
  it('ne fait rien tant qu’aucun palier n’est posé', async () => {
    seed()
    show()
    const cells = within(await lastRow()).getAllByRole('cell')
    expect(said(cells[0]?.textContent ?? '')).toBe(euros(1_000_000))
  })

  it('capitalise dès qu’un palier couvre la période', async () => {
    seed({
      savingRates: [
        makeSavingRate({ id: 'tx', supportId: 's-1', rateBp: 1_000, from: monthsAgo(24) }),
      ],
    })
    show()
    const cells = within(await lastRow()).getAllByRole('cell')
    expect(said(cells[0]?.textContent ?? '')).not.toBe(euros(1_000_000))
  })

  it('ne réécrit pas le passé quand le palier est daté dans l’avenir', async () => {
    /* La propriété qui a fait exister la v12 : poser un taux pour l'an prochain
       ne change rien à ce que la courbe montre du passé. */
    seed({
      savingRates: [
        makeSavingRate({ id: 'tx', supportId: 's-1', rateBp: 1_000, from: '2099-01-01' }),
      ],
    })
    show()
    const cells = within(await lastRow()).getAllByRole('cell')
    expect(said(cells[0]?.textContent ?? '')).toBe(euros(1_000_000))
  })
})

describe('la réserve', () => {
  it('dit que la courbe estime, et ne se replie pas', () => {
    seed()
    show()
    expect(screen.getByText(supports.evolutionMethod)).toBeInTheDocument()
  })
})
