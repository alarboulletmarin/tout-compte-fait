import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeData } from '@/domain/fixtures'
import { t } from '@/i18n/strings'
import * as downloadModule from '@/lib/download'
import { useStore } from '@/store/store'
import { useToasts } from '@/ui/toast'
import { StorageAlert } from './StorageAlert'

describe('StorageAlert', () => {
  const realRetry = useStore.getState().retryWrite

  afterEach(() => {
    useStore.setState({ error: null, retryWrite: realRetry })
    useToasts.setState({ toasts: [] })
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

  /* La base `blocked` n'est pas réparée par une écriture — elle n'est pas
     ouverte. Un bouton qui ne peut pas tenir sa promesse vaut moins que son
     absence (DS §6), et l'export, lui, reste possible : il part de la mémoire. */
  it('ne propose pas de réessayer ce qu’une écriture ne répare pas', () => {
    useStore.getState().setError({ kind: 'read', message: t.storage.blocked })
    render(<StorageAlert />)
    expect(screen.queryByRole('button', { name: t.storage.retry })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: t.storage.exportFirst })).toBeInTheDocument()
  })

  it('annonce l’échec d’écriture et propose l’export', async () => {
    const download = vi.spyOn(downloadModule, 'download').mockImplementation(() => {})
    useStore.getState().setError({ kind: 'write', message: t.storage.writeFailed })

    render(<StorageAlert />)
    expect(screen.getByRole('alert')).toHaveTextContent(t.storage.writeFailed)

    await userEvent.click(screen.getByRole('button', { name: t.storage.exportFirst }))
    expect(download).toHaveBeenCalledTimes(1)
  })

  /* Le geste gratuit du bandeau : rejouer l'écriture telle quelle. Ce n'est pas
     un `flush()` — l'écriture qui a échoué a déjà quitté la file du writer, et
     `flush()` seul n'aurait rien à faire. */
  it('rejoue l’écriture du document quand on réessaie', async () => {
    const retry = vi.fn(() => {
      useStore.getState().setError(null)
      return Promise.resolve()
    })
    useStore.setState({ error: { kind: 'write', message: t.storage.writeFailed }, retryWrite: retry })

    render(<StorageAlert />)
    await userEvent.click(screen.getByRole('button', { name: t.storage.retry }))

    expect(retry).toHaveBeenCalledTimes(1)
  })

  /* Le bandeau poussait autrefois son propre message rouge, parce qu'il était le
     seul endroit qui en poussait un. C'est désormais le writer qui parle, pour
     toute écriture ratée — voir `store.test.ts`. Le bouton, lui, ne doit plus
     rien ajouter : deux messages pour un clic n'en font pas un plus vrai. */
  it('n’ajoute aucun message de son côté quand on réessaie', async () => {
    useStore.setState({
      error: { kind: 'write', message: t.storage.writeFailed },
      retryWrite: () => Promise.resolve(),
    })

    render(<StorageAlert />)
    await userEvent.click(screen.getByRole('button', { name: t.storage.retry }))

    expect(useToasts.getState().toasts).toStrictEqual([])
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
    await userEvent.click(screen.getByRole('button', { name: t.storage.exportFirst }))

    const blob = download.mock.calls[0]?.[0]
    expect(blob).toBeInstanceOf(Blob)
    expect(JSON.parse(await (blob as Blob).text())).toMatchObject({
      household: { name: 'Encore là' },
    })
  })
})
