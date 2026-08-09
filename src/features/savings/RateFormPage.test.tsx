/* ============================================================================
 * Le taux d'un support, palier par palier.
 *
 * Ce fichier protège la règle qui a fait exister la v12, et qu'aucun composant
 * ne dit à lui seul : **poser un taux n'écrase pas le précédent**. Le geste
 * ajoute une ligne, l'ancienne garde la période qu'elle couvrait, et
 * l'évolution déjà tracée ne bouge pas. Corriger, en revanche, réécrit une
 * ligne et une seule.
 * ==========================================================================*/

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import {
  makeCategory,
  makeData,
  makeFamily,
  makeMember,
  makeSavingRate,
  makeSavingSupport,
} from '@/domain/fixtures'
import { RATE_ORIGIN } from '@/domain/savingRate'
import { t } from '@/i18n/strings'
import { supports } from '@/i18n/supports'
import { formatDate, tpl } from '@/i18n/format'
import { useStore } from '@/store/store'
import { RateFormPage } from './RateFormPage'
import { SupportPage } from './SupportPage'

const initial = useStore.getState().data

function seed(rates: ReturnType<typeof makeSavingRate>[] = []) {
  useStore.setState({
    data: makeData({
      household: { name: '', members: [makeMember({ id: 'm-1', name: 'Andrea' })] },
      families: [makeFamily({ id: 'fam-savings', label: 'Épargne', kind: 'saving' })],
      categories: [makeCategory({ id: 'passbook', label: 'Livrets', familyId: 'fam-savings' })],
      savingSupports: [makeSavingSupport({ id: 's-1', label: 'Livret A', memberId: 'm-1' })],
      savingRates: rates,
    }),
  })
}

const showForm = (path = '/epargne/s-1/taux') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/epargne/:id/taux" element={<RateFormPage />} />
        <Route path="/epargne/:id/taux/:rateId" element={<RateFormPage />} />
        <Route path="/epargne/:id" element={<SupportPage />} />
      </Routes>
    </MemoryRouter>,
  )

const showFiche = () =>
  render(
    <MemoryRouter initialEntries={['/epargne/s-1']}>
      <Routes>
        <Route path="/epargne/:id" element={<SupportPage />} />
      </Routes>
    </MemoryRouter>,
  )

afterEach(() => {
  cleanup()
  useStore.setState({ data: initial })
})

describe('poser un taux', () => {
  it('empile un palier sans toucher au précédent', async () => {
    const user = userEvent.setup()
    seed([makeSavingRate({ id: 'tx-1', supportId: 's-1', rateBp: 300, from: '2024-02-01' })])
    showForm()

    await user.type(screen.getByLabelText(supports.rateValue, { exact: false }), '2,4')
    await user.click(screen.getByRole('button', { name: t.common.save }))

    const rates = useStore.getState().data.savingRates
    expect(rates).toHaveLength(2)
    // Le palier d'origine est intact : c'est toute la règle de la v12.
    expect(rates.find((rate) => rate.id === 'tx-1')).toMatchObject({
      rateBp: 300,
      from: '2024-02-01',
    })
    expect(rates.at(-1)?.rateBp).toBe(240)
  })

  it('refuse un champ vide plutôt que de l’enregistrer à zéro', async () => {
    const user = userEvent.setup()
    seed()
    showForm()

    await user.click(screen.getByRole('button', { name: t.common.save }))
    expect(useStore.getState().data.savingRates).toEqual([])
  })

  it('garde zéro pour cent, qui est une réponse et non un silence', async () => {
    const user = userEvent.setup()
    seed()
    showForm()

    await user.type(screen.getByLabelText(supports.rateValue, { exact: false }), '0')
    await user.click(screen.getByRole('button', { name: t.common.save }))
    expect(useStore.getState().data.savingRates[0]?.rateBp).toBe(0)
  })
})

describe('corriger un taux', () => {
  it('réécrit une ligne, et une seule', async () => {
    const user = userEvent.setup()
    seed([
      makeSavingRate({ id: 'tx-1', supportId: 's-1', rateBp: 300, from: '2024-02-01' }),
      makeSavingRate({ id: 'tx-2', supportId: 's-1', rateBp: 240, from: '2025-02-01' }),
    ])
    showForm('/epargne/s-1/taux/tx-2')

    const field = screen.getByLabelText(supports.rateValue, { exact: false })
    await user.clear(field)
    await user.type(field, '1,7')
    await user.click(screen.getByRole('button', { name: t.common.save }))

    const rates = useStore.getState().data.savingRates
    expect(rates).toHaveLength(2)
    expect(rates.find((rate) => rate.id === 'tx-1')?.rateBp).toBe(300)
    expect(rates.find((rate) => rate.id === 'tx-2')?.rateBp).toBe(170)
  })
})

describe('la liste des taux sur la fiche', () => {
  it('dit « depuis l’origine » plutôt qu’une date de 1970', () => {
    /* Le taux converti d'un document d'avant la v12 n'avait pas de date : il
       valait pour toute l'histoire du compte, et c'est ce que la ligne doit
       dire — pas « depuis le 1er janvier 1970 ». */
    seed([makeSavingRate({ id: 'tx-1', supportId: 's-1', rateBp: 250, from: RATE_ORIGIN })])
    showFiche()
    expect(screen.getByText(supports.rateFromOrigin)).toBeInTheDocument()
  })

  it('annonce un palier à venir au futur, jamais au passé', () => {
    /* « Depuis le 1er janvier 2099 » se lirait comme une faute de saisie : un
       palier qui n'a pas encore commencé se dit « à partir du ». */
    seed([makeSavingRate({ id: 'tx-1', supportId: 's-1', rateBp: 180, from: '2099-01-01' })])
    showFiche()
    expect(screen.getByText(tpl(supports.rateAhead, formatDate('2099-01-01')))).toBeInTheDocument()
    expect(
      screen.queryByText(tpl(supports.rateFrom, formatDate('2099-01-01'))),
    ).not.toBeInTheDocument()
  })

  it('invite à poser un premier taux quand il n’y en a aucun', () => {
    seed()
    showFiche()
    expect(screen.getByText(supports.ratesEmpty)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: supports.rateFirst })).toBeInTheDocument()
  })
})
