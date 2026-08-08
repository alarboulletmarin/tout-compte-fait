import 'fake-indexeddb/auto'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { t } from '@/i18n/strings'
import * as downloadModule from '@/lib/download'
import { clearDocument, closeDb, loadDocument, saveDocument } from '@/persistence/db'
import { useStore } from '@/store/store'
import { RecoveryDoor } from './RecoveryDoor'

function show(): void {
  render(
    <MemoryRouter>
      <RecoveryDoor message={t.storage.readFailed} />
    </MemoryRouter>,
  )
}

describe('RecoveryDoor', () => {
  beforeEach(async () => {
    await clearDocument()
    useStore.getState().setError({ kind: 'read', message: t.storage.readFailed })
  })

  afterEach(() => {
    useStore.getState().setError(null)
    vi.restoreAllMocks()
    closeDb()
  })

  it('dit ce qui se passe et propose l’import en premier', () => {
    show()
    expect(screen.getByRole('alert')).toHaveTextContent(t.storage.readFailed)
    expect(screen.getByRole('button', { name: t.settings.import })).toBeInTheDocument()
  })

  it('télécharge les octets bruts, sans les faire passer par les migrations', async () => {
    const download = vi.spyOn(downloadModule, 'download').mockImplementation(() => {})
    // Un document qu'aucune version de l'app ne sait ouvrir.
    await saveDocument({ schemaVersion: 99 } as never, 1)

    show()
    await userEvent.click(screen.getByRole('button', { name: t.storage.recoverRaw }))

    expect(download).toHaveBeenCalledTimes(1)
    expect(download.mock.calls[0]?.[1]).toMatch(/^tout-compte-fait-illisible-\d{4}-\d{2}-\d{2}\.json$/)
  })

  it('n’efface qu’après deux questions, et libère alors l’onboarding', async () => {
    await saveDocument({ schemaVersion: 99 } as never, 1)
    show()

    await userEvent.click(screen.getByRole('button', { name: t.storage.discard }))
    const dialog = within(screen.getByRole('dialog'))
    await userEvent.click(dialog.getByRole('button', { name: t.common.confirm }))
    // Toujours là tant que la seconde question n'a pas de réponse.
    await expect(loadDocument()).rejects.toThrow()

    await userEvent.click(dialog.getByRole('button', { name: t.storage.discard }))
    await expect(loadDocument()).resolves.toBeNull()
    expect(useStore.getState().error).toBeNull()
  })
})
