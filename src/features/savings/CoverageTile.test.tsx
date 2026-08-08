/* ============================================================================
 * Les trois lectures que l'écran de l'épargne est seul à pouvoir produire.
 *
 * Une banque répond mieux que cette app à « combien j'ai » : elle le sait sans
 * qu'on saisisse rien, et elle ne se trompe pas. Ce qu'elle ne sait pas, c'est
 * ce qu'est une charge chez quelqu'un — donc combien de temps ce capital tient,
 * ce qui a été mis de côté depuis janvier, et quand un relevé mérite d'être
 * redemandé. C'est ce que ce fichier protège.
 *
 * **Tout est daté par rapport au jour même**, et non sur un mois écrit en dur :
 * ces trois lectures sont ancrées sur `today()` — un patrimoine ne change pas
 * parce qu'on est allé regarder mars —, si bien qu'un mois figé dans le seed
 * sortirait de la fenêtre de lecture au bout d'un an et ferait tomber le fichier
 * sans qu'une ligne de code ait bougé.
 * ==========================================================================*/

import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { addMonthsToYm, startOfMonth, today, ymOf } from '@/domain/date'
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
import type { SavingPace } from '@/domain/types'
import { fr } from '@/i18n/fr'
import { formatDecimal, tpl } from '@/i18n/format'
import { ALL_FILTER, useStore } from '@/store/store'
import { ScreenTitleProvider } from '@/ui/ScreenTitleProvider'
import { SavingsPage } from './SavingsPage'

const initial = useStore.getState().data

const NOW = ymOf(today())
/** Le mois d'avant : c'est le dernier que la couverture accepte de compter. */
const monthsBack = (n: number): string => addMonthsToYm(NOW, -n)
const dayIn = (n: number, day = 5): string => startOfMonth(monthsBack(n)).slice(0, 8) + String(day).padStart(2, '0')

const ANDREA = makeMember({ id: 'm-1', name: 'Andrea' })

/**
 * Un foyer d'une personne, `months` mois complets derrière lui.
 *
 * Chaque mois porte un salaire, un loyer, une mensualité de crédit et un
 * versement d'épargne : les trois sorties se confondent en trésorerie, et c'est
 * exactement ce que la couverture doit savoir démêler.
 */
function seed({
  months = 4,
  capital = 1_000_000,
  pace = 'yearly',
  valuedOn = today(),
}: { months?: number; capital?: number; pace?: SavingPace; valuedOn?: string } = {}) {
  const lived = Array.from({ length: months }, (_, index) => index + 1).flatMap((back) => [
    makeEntry({ id: `sal-${String(back)}`, date: dayIn(back, 1), direction: 'in', amount: eur(250_000), categoryId: 'salaire', memberId: 'm-1' }),
    makeEntry({ id: `loy-${String(back)}`, date: dayIn(back, 5), amount: eur(80_000), categoryId: 'loyer', memberId: 'm-1' }),
    makeEntry({ id: `pret-${String(back)}`, date: dayIn(back, 10), amount: eur(20_000), categoryId: 'credit', memberId: 'm-1' }),
    makeEntry({ id: `eco-${String(back)}`, date: dayIn(back, 15), amount: eur(50_000), categoryId: 'passbook', memberId: 'm-1', savingSupportId: 's-1' }),
  ])

  useStore.setState({
    ym: NOW,
    filter: ALL_FILTER,
    data: makeData({
      household: { name: '', members: [ANDREA] },
      families: [
        makeFamily({ id: 'fam-res', label: 'Ressources', kind: 'resource' }),
        makeFamily({ id: 'fam-charges', label: 'Charges', kind: 'charge' }),
        makeFamily({ id: 'fam-credits', label: 'Crédits', kind: 'debt' }),
        makeFamily({ id: 'fam-savings', label: 'Épargne', kind: 'saving' }),
      ],
      categories: [
        makeCategory({ id: 'salaire', label: 'Salaire', familyId: 'fam-res', direction: 'in' }),
        makeCategory({ id: 'loyer', label: 'Loyer', familyId: 'fam-charges' }),
        makeCategory({ id: 'credit', label: 'Prêt auto', familyId: 'fam-credits' }),
        makeCategory({ id: 'passbook', label: 'Livrets', familyId: 'fam-savings' }),
      ],
      savingSupports: [makeSavingSupport({ id: 's-1', label: 'Livret A', memberId: 'm-1', pace })],
      savingValuations: [
        makeSavingValuation({ id: 'v-1', supportId: 's-1', amount: eur(capital), date: valuedOn }),
      ],
      entries: lived,
    }),
  })
}

function open() {
  render(
    <MemoryRouter>
      <ScreenTitleProvider>
        <SavingsPage />
      </ScreenTitleProvider>
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  useStore.setState({ data: initial, filter: ALL_FILTER })
})

describe('combien de temps le capital tient', () => {
  /* Le piège que le chiffre existe pour éviter : charges, mensualité et
     versement sortent tous les trois du compte. Comptés ensemble, le
     dénominateur ferait 1 500 € au lieu de 1 000 €, et 10 000 € de capital
     tiendraient « 6,7 mois » au lieu de 10. */
  it('divise par les charges et les crédits, jamais par les versements', () => {
    seed()
    open()

    expect(screen.getByText(tpl(fr.savings.coverageValue, formatDecimal(10)))).toBeInTheDocument()
    expect(screen.getByText(fr.savings.coverageHint)).toBeInTheDocument()
  })

  /* Un quotient sans dénominateur ne vaut pas zéro : il ne veut rien dire. On
     nomme donc ce qui manque plutôt que d'écrire « 0 mois ». */
  it('dit ce qui manque plutôt qu’un chiffre, faute d’un mois complet', () => {
    seed({ months: 0 })
    open()

    expect(screen.getByText(fr.savings.coverageNoMonth)).toBeInTheDocument()
    expect(screen.queryByText(fr.savings.coverageHint)).not.toBeInTheDocument()
  })

  /* Sans relevé, il n'y a pas de numérateur — et la tuile Capital dit déjà
     l'absence. Deux fois la même absence se lit comme deux absences. */
  it('ne s’affiche pas du tout quand aucun support n’est relevé', () => {
    seed()
    useStore.setState({
      data: { ...useStore.getState().data, savingValuations: [] },
    })
    open()

    expect(screen.queryByText(fr.savings.coverage)).not.toBeInTheDocument()
    expect(screen.getByText(fr.savings.totalNone)).toBeInTheDocument()
  })

  /* Trois mois vécus et douze ne disent pas la même chose du même chiffre :
     le taire laisserait croire à une année entière. */
  it('dit sur combien de mois la moyenne porte', () => {
    seed({ months: 3 })
    open()

    expect(screen.getByText(tpl(fr.savings.coverageOver, 3))).toBeInTheDocument()
  })
})

describe('l’écran ne réclame un relevé qu’à la cadence du support', () => {
  /* Un livret ne bouge que de ce qu'on y verse : l'app connaît son capital à
     l'euro près, et le lui redemander tous les six mois ne produirait que de la
     culpabilité. */
  it('se tait sur un livret relevé il y a six mois', () => {
    seed({ valuedOn: dayIn(6, 8) })
    open()

    expect(screen.queryByText(fr.savings.valuesDueOne)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: fr.savings.valuesUpdate })).toBeInTheDocument()
  })

  /* Le même relevé, le même jour, sur un support que le marché refait : là, il
     y a quelque chose à demander. */
  it('réclame sur un support trimestriel relevé il y a six mois', () => {
    seed({ valuedOn: dayIn(6, 8), pace: 'quarterly' })
    open()

    expect(screen.getByText(fr.savings.valuesDueOne)).toBeInTheDocument()
  })

  it('réclame un support jamais relevé', () => {
    seed()
    useStore.setState({ data: { ...useStore.getState().data, savingValuations: [] } })
    open()

    expect(screen.getByText(fr.savings.valuesDueOne)).toBeInTheDocument()
  })
})

describe('ce que l’année a accumulé', () => {
  /* Du flux pur : aucun relevé n'y entre, et la question ne se posait nulle
     part — l'app est une machine à mois, et l'épargne est la seule notion qui
     n'ait aucun sens à l'intérieur d'un mois. */
  /* La section arrive par le réseau : elle emporte les lignes cumulées, que le
     premier chargement n'a pas à porter pour un bloc qui vit sous le pli. */
  it('trace le cumul des versements, année contre année', async () => {
    seed()
    open()

    expect(await screen.findByText(fr.savings.years)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: fr.savings.yearsCumulative })).toBeInTheDocument()
  })
})
