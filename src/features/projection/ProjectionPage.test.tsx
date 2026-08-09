/* ============================================================================
 * Ce que l'écran des projections promet, et ce qu'il refuse.
 *
 * Les règles tenues ici ne se lisent dans le code d'aucun composant : la phrase
 * de réserve ne se replie jamais, les montants n'ont pas de centimes, le
 * graphique est doublé d'un tableau, les hypothèses sont plafonnées à trois, et
 * rien de ce qu'on tape ne touche au document.
 * ==========================================================================*/

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { projection } from '@/i18n/projection'
import { tpl } from '@/i18n/format'
import { useStore } from '@/store/store'
import { ScreenTitleProvider } from '@/ui/ScreenTitleProvider'
import { PROJECTION_STORAGE_KEY } from './model'
import { ProjectionPage } from './ProjectionPage'

const said = (text: string): string => text.replace(/\s+/g, ' ').trim()

function show() {
  return render(
    <MemoryRouter>
      <ScreenTitleProvider>
        <ProjectionPage />
      </ScreenTitleProvider>
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('l’écran des projections', () => {
  it('pose sa réserve avant le premier chiffre, et ne la replie pas', () => {
    show()
    expect(screen.getByText(projection.caveat)).toBeInTheDocument()
    // Ni `<details>`, ni bouton pour la faire disparaître.
    expect(screen.getByText(projection.caveat).closest('details')).toBeNull()
  })

  it('dit que le taux se saisit net, là où on le saisit', () => {
    show()
    expect(screen.getByText(projection.netRate)).toBeInTheDocument()
  })

  it('trace quelque chose dès l’arrivée, sans rien demander', () => {
    show()
    expect(screen.getByRole('img', { name: /projection/i })).toBeInTheDocument()
  })

  it('double le graphique d’un tableau de jalons', () => {
    show()
    const rows = within(screen.getByRole('table')).getAllByRole('row')
    // Quatre jalons plus l'en-tête.
    expect(rows).toHaveLength(5)
  })

  it('n’écrit jamais un centime dans le tableau', () => {
    show()
    for (const cell of within(screen.getByRole('table')).getAllByRole('cell')) {
      expect(said(cell.textContent ?? '')).toMatch(/^≈ /)
      expect(said(cell.textContent ?? '')).not.toMatch(/,\d\d/)
    }
  })

  it('plafonne les hypothèses à trois, puis retire le bouton', async () => {
    const user = userEvent.setup()
    show()
    await user.click(screen.getByRole('button', { name: projection.scenarioAdd }))
    await user.click(screen.getByRole('button', { name: projection.scenarioAdd }))
    expect(screen.queryByRole('button', { name: projection.scenarioAdd })).toBeNull()
    // Trois colonnes d'hypothèse, plus celle des durées.
    expect(within(screen.getByRole('table')).getAllByRole('columnheader')).toHaveLength(4)
  })

  it('sépare garanti et hypothèse par le mot, pas seulement par le trait', () => {
    show()
    expect(screen.getAllByRole('radio', { name: projection.kindGuaranteed }).length).toBeGreaterThan(
      0,
    )
    expect(screen.getByText(projection.kindAssumedHint)).toBeInTheDocument()
  })

  it('bascule sur le versement requis, et demande la cible avant de répondre', async () => {
    const user = userEvent.setup()
    show()
    await user.click(screen.getByRole('radio', { name: projection.modeTarget }))
    expect(screen.getByText(projection.targetMissing)).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()

    await user.type(screen.getByLabelText(new RegExp(projection.target)), '100000')
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('signale la lecture en euros constants dès qu’elle est active', async () => {
    const user = userEvent.setup()
    show()
    expect(screen.queryByText(/euros d’aujourd’hui, inflation/)).toBeNull()
    await user.click(screen.getByRole('checkbox', { name: projection.constant }))
    expect(screen.getByText(/euros d’aujourd’hui, inflation/)).toBeInTheDocument()
  })

  it('signale un taux illisible plutôt que de le lire comme zéro', async () => {
    const user = userEvent.setup()
    show()
    const rate = screen.getByLabelText(new RegExp(projection.scenarioRate))
    await user.clear(rate)
    await user.type(rate, '450')
    expect(screen.getByText(tpl(projection.rateInvalid, 100))).toBeInTheDocument()
  })

  it('garde les réglages pour la prochaine visite, et rien de plus', async () => {
    const user = userEvent.setup()
    const before = useStore.getState().data
    show()

    await user.click(screen.getByRole('radio', { name: tpl(projection.durationPreset, 20) }))

    expect(localStorage.getItem(PROJECTION_STORAGE_KEY)).toContain('"years":20')
    // Rien de ce qu'on tape ici n'est un fait du foyer : le document ne bouge pas.
    expect(useStore.getState().data).toBe(before)
  })
})
