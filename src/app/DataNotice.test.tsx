/* ============================================================================
 * Un seul message à la fois, et c'est le plus grave qui parle.
 *
 * Trois bandeaux du même domaine décidaient chacun de leur côté : l'échec
 * d'écriture et le rappel d'export pouvaient s'empiler pour dire la même chose
 * à deux gravités différentes. Ces cas-là gardent l'ordre.
 * ==========================================================================*/

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { makeData } from '@/domain/fixtures'
import { money } from '@/domain/money'
import { t } from '@/i18n/strings'
import {
  DURABILITY_DISMISSED_KEY,
  type StorageHealth,
  useStorageHealth,
} from '@/persistence/health'
import { LAST_EXPORT_KEY, REMINDER_DISMISSED_KEY } from '@/persistence/transfer'
import { useStore } from '@/store/store'
import { DataNotice } from './DataNotice'
import { dataNoticeLevel } from './noticeLevel'

const fresh = (): StorageHealth => ({
  durable: 'unknown',
  probed: false,
  asked: false,
  lastWriteAt: null,
  lastFailureAt: null,
})

/** Un foyer qui a quelque chose à perdre : sans données, rien ne se dit. */
function withData(): void {
  useStore.setState({
    status: 'ready',
    data: makeData({
      recurrences: [
        {
          id: 'r1',
          label: 'Loyer',
          categoryId: 'c-logement-loyer',
          direction: 'out',
          amount: money(90_000),
          period: { unit: 'month', every: 1, anchorDay: 1 },
          startedOn: '2026-01-01',
        },
      ],
    }),
    error: null,
  })
}

function notice(focus = false) {
  return render(
    <MemoryRouter>
      <DataNotice focus={focus} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  useStorageHealth.setState(fresh())
  withData()
})

afterEach(() => {
  localStorage.clear()
  useStore.setState({ error: null })
})

describe('la priorité des messages', () => {
  it('range les quatre niveaux dans l’ordre de ce qu’ils coûtent', () => {
    expect(dataNoticeLevel({ failing: true, fragile: true, staleExport: true })).toBe('failure')
    expect(dataNoticeLevel({ failing: false, fragile: true, staleExport: true })).toBe('durability')
    expect(dataNoticeLevel({ failing: false, fragile: false, staleExport: true })).toBe('export')
    expect(dataNoticeLevel({ failing: false, fragile: false, staleExport: false })).toBeNull()
  })
})

describe('DataNotice', () => {
  it('ne dit rien quand tout va bien', () => {
    useStorageHealth.setState({ probed: true, durable: true })
    localStorage.setItem(LAST_EXPORT_KEY, new Date().toISOString().slice(0, 10))

    const { container } = notice()
    expect(container).toBeEmptyDOMElement()
  })

  it('rappelle l’export quand il n’y en a jamais eu', () => {
    useStorageHealth.setState({ probed: true, durable: true })

    notice()
    expect(screen.getByText(t.settings.reminderTitleNever)).toBeInTheDocument()
  })

  it('signale la conservation plutôt que l’export, quand les deux sont vrais', () => {
    // Rien n'a jamais été exporté : les deux conditions tiennent, une seule
    // parle, et c'est celle qui explique *pourquoi* il faut exporter.
    useStorageHealth.setState({ probed: true, durable: false })

    notice()
    expect(screen.getByText(t.storage.durabilityTitle)).toBeInTheDocument()
    expect(screen.queryByText(t.settings.reminderTitleNever)).not.toBeInTheDocument()
  })

  it('laisse l’échec d’écriture couvrir tout le reste', () => {
    useStorageHealth.setState({ probed: true, durable: false })
    useStore.getState().setError({ kind: 'write', message: t.storage.writeFailed })

    notice()
    expect(screen.getByRole('alert')).toHaveTextContent(t.storage.writeFailed)
    expect(screen.queryByText(t.storage.durabilityTitle)).not.toBeInTheDocument()
  })

  /* Une base devenue illisible après l'ouverture ne trouvera pas l'écran
     d'arrivée : la coquille est déjà montée. Elle ne disait rien du tout. */
  it('dit aussi qu’une base est devenue illisible en cours de route', () => {
    useStore.getState().setError({ kind: 'read', message: t.storage.blocked })

    notice()
    expect(screen.getByRole('alert')).toHaveTextContent(t.storage.blocked)
  })

  it('ne s’intercale pas dans une saisie, sauf pour un échec confirmé', () => {
    useStorageHealth.setState({ probed: true, durable: false })
    const { container, rerender } = notice(true)
    expect(container).toBeEmptyDOMElement()

    useStore.getState().setError({ kind: 'write', message: t.storage.writeFailed })
    rerender(
      <MemoryRouter>
        <DataNotice focus />
      </MemoryRouter>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('écarte l’avis de conservation pour un cycle, et laisse alors passer le rappel', async () => {
    useStorageHealth.setState({ probed: true, durable: false })

    const { rerender } = notice()
    await userEvent.click(screen.getByRole('button', { name: t.storage.durabilityDismiss }))

    // L'écart est écrit sur l'appareil, pas seulement dans ce rendu : le
    // composant est remonté à chaque changement d'écran.
    expect(localStorage.getItem(DURABILITY_DISMISSED_KEY)).not.toBeNull()
    rerender(
      <MemoryRouter>
        <DataNotice />
      </MemoryRouter>,
    )
    expect(screen.queryByText(t.storage.durabilityTitle)).not.toBeInTheDocument()
    // Le niveau du dessous prend la place : il n'a pas disparu, il attendait.
    expect(screen.getByText(t.settings.reminderTitleNever)).toBeInTheDocument()
  })

  it('se tait entièrement quand les deux rappels ont été écartés', async () => {
    useStorageHealth.setState({ probed: true, durable: false })

    const { container } = notice()
    await userEvent.click(screen.getByRole('button', { name: t.storage.durabilityDismiss }))
    await userEvent.click(screen.getByRole('button', { name: t.settings.reminderDismiss }))

    expect(localStorage.getItem(REMINDER_DISMISSED_KEY)).not.toBeNull()
    expect(container).toBeEmptyDOMElement()
  })

  it('ne dit rien à un foyer qui n’a encore rien à perdre', () => {
    useStorageHealth.setState({ probed: true, durable: false })
    useStore.setState({ data: makeData({ recurrences: [], entries: [] }) })

    const { container } = notice()
    expect(container).toBeEmptyDOMElement()
  })
})
