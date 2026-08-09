import 'fake-indexeddb/auto'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { makeData } from '@/domain/fixtures'
import { t } from '@/i18n/strings'
import { backupDaily, clearBackups } from '@/persistence/backups'
import { closeDb } from '@/persistence/db'
import { useStorageHealth } from '@/persistence/health'
import { useStore } from '@/store/store'
import { StorageSection } from './StorageSection'

/** jsdom n'expose pas `navigator.storage` : on le pose et on le retire. */
function withStorage(value: Partial<StorageManager> | undefined): void {
  if (value === undefined) {
    Reflect.deleteProperty(navigator, 'storage')
    return
  }
  Object.defineProperty(navigator, 'storage', { value, configurable: true })
}

describe('StorageSection', () => {
  beforeEach(async () => {
    await clearBackups()
    useStorageHealth.setState({
      durable: 'unknown',
      probed: false,
      asked: false,
      lastWriteAt: null,
      lastFailureAt: null,
    })
  })

  afterEach(() => {
    withStorage(undefined)
    closeDb()
  })

  /* Trois états, trois phrases. Le navigateur muet ne *refuse* pas — l'écran
     l'écrivait pourtant, parce que l'absence d'API et le refus arrivaient tous
     deux sous la forme d'un `false`. */
  it('ne prête pas un refus à un navigateur qui n’a pas l’API', async () => {
    withStorage(undefined)
    render(<StorageSection />)
    expect(await screen.findByText(t.storage.persistUnknown)).toBeInTheDocument()
    expect(screen.queryByText(t.storage.notPersisted)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: t.storage.persistAsk })).toBeInTheDocument()
    expect(screen.getByText(t.storage.usageUnknown)).toBeInTheDocument()
  })

  it('dit le refus quand le navigateur a bien refusé', async () => {
    withStorage({ persisted: () => Promise.resolve(false) })
    render(<StorageSection />)
    expect(await screen.findByText(t.storage.notPersisted)).toBeInTheDocument()
  })

  it('se tait et retire le bouton quand la conservation est acquise', async () => {
    withStorage({ persisted: () => Promise.resolve(true) })
    render(<StorageSection />)
    expect(await screen.findByText(t.storage.persisted)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: t.storage.persistAsk })).not.toBeInTheDocument()
  })

  it('demande la conservation et rapporte ce qui a été répondu', async () => {
    withStorage({ persisted: () => Promise.resolve(false), persist: () => Promise.resolve(true) })
    render(<StorageSection />)

    await userEvent.click(await screen.findByRole('button', { name: t.storage.persistAsk }))
    expect(await screen.findByText(t.storage.persisted)).toBeInTheDocument()
    expect(useStorageHealth.getState()).toMatchObject({ durable: true, asked: true })
  })

  it('dit qu’il n’y a pas encore de sauvegarde plutôt que de laisser un vide', async () => {
    render(<StorageSection />)
    expect(await screen.findByText(t.storage.backupsEmpty)).toBeInTheDocument()
  })

  it('restaure une sauvegarde après deux questions', async () => {
    await backupDaily(makeData({ household: { name: 'Hier', members: [] } }), '2026-08-01')
    render(<StorageSection />)

    await userEvent.click(await screen.findByRole('button', { name: t.storage.backupRestore }))
    // La sauvegarde est relue et migrée avant que la question ne s'ouvre.
    const dialog = within(await screen.findByRole('dialog'))
    await userEvent.click(dialog.getByRole('button', { name: t.common.confirm }))
    await userEvent.click(dialog.getByRole('button', { name: t.storage.backupRestore }))

    expect(useStore.getState().data.household.name).toBe('Hier')
    expect(useStore.getState().status).toBe('ready')
  })
})
