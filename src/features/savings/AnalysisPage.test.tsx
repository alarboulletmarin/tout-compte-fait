/* ============================================================================
 * L'écran qui dit **d'où vient** le capital.
 *
 * Ce qu'il remplace disait où l'argent est — la banque le dit déjà — et combien
 * on avait versé dans l'année — du flux pur, qui ne sait pas dire ce que ces
 * versements ont produit. Ce qui se vérifie ici est donc la seule chose qui
 * justifie l'écran : que les trois nombres arrivent jusqu'à la page, et qu'ils
 * se referment sur le quatrième.
 * ==========================================================================*/

import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { addMonths, today } from '@/domain/date'
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
import { supports } from '@/i18n/supports'
import { formatRoundedMoney, formatSignedRoundedMoney, tpl } from '@/i18n/format'
import { t } from '@/i18n/strings'
import { ALL_FILTER, useStore } from '@/store/store'
import { ScreenTitleProvider } from '@/ui/ScreenTitleProvider'
import { AnalysisPage } from './AnalysisPage'

const initial = useStore.getState().data
const ANDREA = makeMember({ id: 'm-1', name: 'Andrea' })

/**
 * Un livret relevé il y a six mois à 10 000 €, puis aujourd'hui à 12 500 €, et
 * 200 € versés entre-temps.
 *
 * Aucun taux posé : ce que le compte a produit ne peut donc venir d'aucun
 * barème — c'est l'écart entre ce qu'il vaut et ce qu'on y a mis, et c'est
 * précisément la mesure que cet écran existe pour montrer.
 */
function seed() {
  const now = today()
  useStore.setState({
    filter: { kind: 'member', memberId: 'm-1' },
    data: makeData({
      household: { name: '', members: [ANDREA] },
      families: [makeFamily({ id: 'fam-savings', label: 'Épargne', kind: 'saving' })],
      categories: [makeCategory({ id: 'passbook', label: 'Livrets', familyId: 'fam-savings' })],
      savingSupports: [makeSavingSupport({ id: 's-1', label: 'Livret A', memberId: 'm-1' })],
      savingValuations: [
        makeSavingValuation({
          id: 'v-1',
          supportId: 's-1',
          amount: eur(1_000_000),
          date: addMonths(now, -6),
        }),
        makeSavingValuation({ id: 'v-2', supportId: 's-1', amount: eur(1_250_000), date: now }),
      ],
      entries: [
        makeEntry({
          id: 'e-1',
          date: addMonths(now, -3),
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
      <ScreenTitleProvider>
        <AnalysisPage />
      </ScreenTitleProvider>
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  useStore.setState({ data: initial, filter: ALL_FILTER })
})

describe('l’écran de l’analyse', () => {
  it('porte le titre, un retour et le tracé de la décomposition', () => {
    seed()
    open()

    expect(screen.getByRole('heading', { name: t.savings.analysis })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t.common.back })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: supports.growth })).toBeInTheDocument()
  })

  /* Le chiffre de la refonte : 2 300 € produits — 12 500 € aujourd'hui, moins
     10 000 € au départ, moins 200 € versés. Aucun taux ne l'aurait donné. */
  it('dit le départ, le versé et le produit, et ils se referment sur la valeur', () => {
    seed()
    open()

    /* Les montants portent des espaces insécables, que testing-library
       normalise à la lecture : l'attente doit l'être aussi. */
    const said = (text: string): string => text.replace(/\s+/g, ' ')
    const line = said(
      tpl(
        supports.growthLine,
        formatRoundedMoney(eur(1_000_000), 'EUR'),
        formatSignedRoundedMoney(eur(20_000), 'EUR'),
        formatSignedRoundedMoney(eur(230_000), 'EUR'),
      ),
    )
    expect(screen.getByText((content) => content.startsWith(line))).toBeInTheDocument()
  })

  /* La légende est un réglage, pas une image : ce qui s'éteint d'un clic doit
     s'atteindre au clavier et dire son état. */
  it('offre la légende comme réglage', () => {
    seed()
    open()

    const gain = screen.getByRole('button', { name: new RegExp(`^${supports.growthGain}`) })
    expect(gain).toHaveAttribute('aria-pressed', 'true')
  })

  /* Ce qui est estimé se dit là où on le lit, jamais dans un repli. */
  it('porte sa réserve sous le tracé', () => {
    seed()
    open()
    expect(screen.getByText(supports.growthMethod)).toBeInTheDocument()
  })

  it('se tait plutôt que de décomposer un document vide', () => {
    useStore.setState({
      filter: ALL_FILTER,
      data: makeData({ household: { name: '', members: [ANDREA] } }),
    })
    open()
    expect(screen.getByText(supports.growthEmpty)).toBeInTheDocument()
  })
})
