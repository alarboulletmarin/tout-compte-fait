/* ============================================================================
 * Relever tous ses supports d'un coup.
 *
 * L'écran existe parce qu'un relevé de banque donne tous les chiffres en même
 * temps : le geste réel est « je mets tout à jour », pas « je mets à jour le
 * Livret A ». Ce fichier protège les trois règles qui en découlent et qu'aucun
 * composant ne dit à lui seul : on ne propose que les comptes de la personne
 * qu'on lit, une case vide n'enregistre rien, et le tout se défait en une fois.
 * ==========================================================================*/

import { cleanup, render, screen } from '@testing-library/react'
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
import { fr } from '@/i18n/fr'
import { formatMoney, tpl } from '@/i18n/format'
import { ALL_FILTER, useStore } from '@/store/store'
import { useToasts } from '@/ui/toast'
import { ValuationsFormPage } from './ValuationsFormPage'

const initial = useStore.getState().data
const MONTH = '2026-07'
const TODAY = new Date().toISOString().slice(0, 10)

const said = (text: string): string => text.replace(/\s+/g, ' ').trim()

function seed() {
  useStore.setState({
    ym: MONTH,
    filter: { kind: 'member', memberId: 'm-1' },
    data: makeData({
      household: {
        name: '',
        members: [
          makeMember({ id: 'm-1', name: 'Andrea' }),
          makeMember({ id: 'm-2', name: 'Marie', color: 'var(--member-2)' }),
        ],
      },
      families: [makeFamily({ id: 'fam-savings', label: 'Épargne', kind: 'saving' })],
      categories: [makeCategory({ id: 'passbook', label: 'Livrets', familyId: 'fam-savings' })],
      savingSupports: [
        makeSavingSupport({ id: 's-1', label: 'Livret A', memberId: 'm-1' }),
        makeSavingSupport({ id: 's-2', label: 'PEA', memberId: 'm-1' }),
        makeSavingSupport({ id: 's-3', label: 'Vieux livret', memberId: 'm-1', archived: true }),
        makeSavingSupport({ id: 's-4', label: 'LDDS de Marie', memberId: 'm-2' }),
      ],
      savingValuations: [
        makeSavingValuation({
          id: 'v-1',
          supportId: 's-1',
          amount: eur(1_200_000),
          date: '2026-07-01',
        }),
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
    }),
  })
}

function open() {
  render(
    <MemoryRouter>
      <ValuationsFormPage />
    </MemoryRouter>,
  )
}

const valuationsOf = (supportId: string) =>
  useStore.getState().data.savingValuations.filter((v) => v.supportId === supportId)

afterEach(() => {
  /* Démonter avant de reposer le document — voir `SavingsPage.test.tsx`. */
  cleanup()
  useStore.setState({ data: initial, filter: ALL_FILTER })
  useToasts.setState({ toasts: [] })
})

describe('relever plusieurs supports d’un coup', () => {
  /* L'épargne se lit au nom d'une personne : proposer les comptes de quelqu'un
     d'autre ici serait une autre lecture — et un compte fermé n'a plus de
     valeur à relever. */
  it('ne propose que les supports actifs de la personne qu’on lit', () => {
    seed()
    open()

    expect(screen.getByLabelText(/Livret A/)).toBeInTheDocument()
    expect(screen.getByLabelText(/PEA/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Vieux livret/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/LDDS de Marie/)).not.toBeInTheDocument()
  })

  /* La règle de l'onboarding et de la création d'un support : on ne connaît pas
     forcément tous ses chiffres le même jour, et poser un relevé faute de mieux
     vaudrait moins que ne rien poser. */
  it('n’enregistre que les cases remplies, à la date du relevé', async () => {
    seed()
    open()

    await userEvent.type(screen.getByLabelText(/PEA/), '5000')
    await userEvent.click(screen.getByRole('button', { name: fr.common.save }))

    expect(valuationsOf('s-2')).toEqual([
      expect.objectContaining({ amount: eur(500_000), date: TODAY }),
    ])
    // Le Livret A gardait son relevé du 1er : une case vide ne l'écrase pas.
    expect(valuationsOf('s-1')).toEqual([expect.objectContaining({ amount: eur(1_200_000) })])
  })

  /* Rien à enregistrer tant qu'aucun chiffre n'est saisi : le bouton le dit
     avant le clic plutôt que de l'accepter pour répondre « non ». La raison
     vit dans l'aide de l'écran, qui reste affichée une fois débloqué — un
     `disabled` ne prend pas le focus, son nom n'est jamais lu (DS §6). */
  it('n’offre pas d’enregistrer tant que rien n’est saisi', async () => {
    seed()
    open()

    const save = screen.getByRole('button', { name: fr.common.save })
    expect(save).toBeDisabled()
    expect(screen.getByText(fr.savings.valuesHint)).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(/PEA/), '5000')

    expect(screen.getByRole('button', { name: fr.common.save })).toBeEnabled()
    expect(screen.getByText(fr.savings.valuesHint)).toBeInTheDocument()
  })

  /* Vide et zéro ne sont pas la même chose : l'un ne dit rien, l'autre dit
     qu'un compte a été vidé. Le placeholder ne peut donc pas ressembler à un
     chiffre, et un « 0 » tapé volontairement doit s'enregistrer. */
  it('distingue une case vide d’un zéro saisi', async () => {
    seed()
    open()

    expect(screen.getByLabelText(/PEA/)).toHaveAttribute('placeholder', fr.savings.valueNew)

    await userEvent.type(screen.getByLabelText(/PEA/), '0')
    await userEvent.click(screen.getByRole('button', { name: fr.common.save }))

    expect(valuationsOf('s-2')).toEqual([expect.objectContaining({ amount: eur(0) })])
    // Le Livret A, laissé vide, n'a rien reçu.
    expect(valuationsOf('s-1')).toHaveLength(1)
  })

  /* Un seul geste, donc un seul retour arrière : deux relevés qu'on annulerait
     en deux fois ne seraient pas ce qu'on vient de faire. */
  it('défait tout le relevé en une fois', async () => {
    seed()
    open()

    await userEvent.type(screen.getByLabelText(/Livret A/), '12400')
    await userEvent.type(screen.getByLabelText(/PEA/), '5000')
    await userEvent.click(screen.getByRole('button', { name: fr.common.save }))

    expect(useStore.getState().data.savingValuations).toHaveLength(3)
    const { toasts } = useToasts.getState()
    expect(toasts).toHaveLength(1)
    expect(toasts[0]?.message).toBe(tpl(fr.savings.valuesAdded, 2))

    toasts[0]?.action?.onAction()

    expect(useStore.getState().data.savingValuations).toHaveLength(1)
  })

  /* Le dernier relevé et l'estimation se lisent à côté du champ : c'est le seul
     moyen de repérer un chiffre tapé de travers, et l'estimation est justement
     celle que la banque va confirmer ou corriger. */
  it('rappelle le dernier chiffre connu et ce qui a bougé depuis', () => {
    seed()
    open()

    const hint = said(screen.getByLabelText(/Livret A/).getAttribute('aria-describedby') ?? '')
    const text = said(document.getElementById(hint.split(' ')[0] ?? '')?.textContent ?? '')

    expect(text).toContain(said(formatMoney(eur(1_200_000), 'EUR')))
    expect(text).toContain(said(tpl(fr.savings.valuesDrift, formatMoney(eur(1_220_000), 'EUR'))))
  })
})
