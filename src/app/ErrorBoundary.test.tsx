import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { t } from '@/i18n/strings'
import * as downloadModule from '@/lib/download'
import { clearDocument, closeDb, saveDocument } from '@/persistence/db'
import { useStore } from '@/store/store'
import { ErrorBoundary } from './ErrorBoundary'

function Broken(): never {
  throw new Error('rendu impossible')
}

describe('ErrorBoundary', () => {
  beforeEach(async () => {
    // React écrit la trace lui-même : elle noierait la sortie des tests.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await clearDocument()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    closeDb()
  })

  it('remplace l’écran blanc par une sortie', () => {
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(t.storage.crashTitle)
  })

  it('laisse passer ce qui se rend normalement', () => {
    render(
      <ErrorBoundary>
        <p>tout va bien</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('tout va bien')).toBeInTheDocument()
  })

  it('récupère les octets du disque, sans passer par le store', async () => {
    const download = vi.spyOn(downloadModule, 'download').mockImplementation(() => {})
    const stored = { schemaVersion: 6, household: { name: 'Chez nous' } }
    await saveDocument(stored as never, 1)
    // Le document en mémoire est différent de celui du disque : c'est bien
    // celui du disque qu'on doit retrouver dans le fichier.
    const memory = useStore.getState().data

    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    )
    await userEvent.click(screen.getByRole('button', { name: t.storage.crashExport }))

    expect(download).toHaveBeenCalledTimes(1)
    const blob = download.mock.calls[0]?.[0]
    await expect(blob?.text()).resolves.toBe(`${JSON.stringify(stored, null, 2)}\n`)
    expect(memory.household.name).not.toBe('Chez nous')
  })

  it('le dit quand il n’y a rien à récupérer', async () => {
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    )
    await userEvent.click(screen.getByRole('button', { name: t.storage.crashExport }))
    expect(await screen.findByText(t.storage.crashExportEmpty)).toBeInTheDocument()
  })
})
