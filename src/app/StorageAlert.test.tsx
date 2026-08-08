import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeData } from '@/domain/fixtures'
import { t } from '@/i18n/strings'
import * as downloadModule from '@/lib/download'
import { useStore } from '@/store/store'
import { StorageAlert } from './StorageAlert'

describe('StorageAlert', () => {
  afterEach(() => {
    useStore.getState().setError(null)
    vi.restoreAllMocks()
  })

  it('ne dit rien tant que les écritures passent', () => {
    const { container } = render(<StorageAlert />)
    expect(container).toBeEmptyDOMElement()
  })

  /* Il ne s'affichait pas pour un échec de lecture, au motif que celui-ci a son
     propre écran — vrai à l'hydratation, faux ensuite : une base `blocked` à la
     réouverture tombe alors que la coquille est montée, et l'écran d'arrivée ne
     viendra pas. Ce cas-là ne disait plus rien du tout. */
  it('dit aussi la base devenue illisible une fois l’app ouverte', () => {
    useStore.getState().setError({ kind: 'read', message: t.storage.blocked })
    render(<StorageAlert />)
    expect(screen.getByRole('alert')).toHaveTextContent(t.storage.blocked)
  })

  it('annonce l’échec d’écriture et propose l’export', async () => {
    const download = vi.spyOn(downloadModule, 'download').mockImplementation(() => {})
    useStore.getState().setError({ kind: 'write', message: t.storage.writeFailed })

    render(<StorageAlert />)
    expect(screen.getByRole('alert')).toHaveTextContent(t.storage.writeFailed)

    await userEvent.click(screen.getByRole('button', { name: t.storage.exportNow }))
    expect(download).toHaveBeenCalledTimes(1)
  })

  /* Le point de tout le bandeau : quand IndexedDB ne répond plus, l'export ne
     doit dépendre d'aucune relecture. Il part de la copie hydratée, qui est
     intacte — c'est le disque qui est en retard, pas l'écran. */
  it('exporte le document en mémoire, sans relire la base', async () => {
    const download = vi.spyOn(downloadModule, 'download').mockImplementation(() => {})
    useStore.setState({
      data: makeData({ household: { name: 'Encore là', members: [] } }),
      error: { kind: 'write', message: t.storage.writeFailed },
    })

    render(<StorageAlert />)
    await userEvent.click(screen.getByRole('button', { name: t.storage.exportNow }))

    const blob = download.mock.calls[0]?.[0]
    expect(blob).toBeInstanceOf(Blob)
    expect(JSON.parse(await (blob as Blob).text())).toMatchObject({
      household: { name: 'Encore là' },
    })
  })
})
