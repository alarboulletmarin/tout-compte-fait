import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeData } from '@/domain/fixtures'
import { emptyData } from './defaults'
import { createWriter } from './writer'

describe('écriture en debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fusionne les mutations rapprochées en une seule écriture', async () => {
    const write = vi.fn().mockResolvedValue(undefined)
    const writer = createWriter(write, 400)

    writer.schedule(makeData({ household: { name: 'a', members: [] } }))
    writer.schedule(makeData({ household: { name: 'b', members: [] } }))
    writer.schedule(makeData({ household: { name: 'c', members: [] } }))
    expect(write).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(400)
    expect(write).toHaveBeenCalledTimes(1)
    expect(write.mock.calls[0]?.[0]).toMatchObject({ household: { name: 'c' } })
  })

  it('écrit immédiatement quand on vide la file', async () => {
    const write = vi.fn().mockResolvedValue(undefined)
    const writer = createWriter(write, 400)
    writer.schedule(emptyData())
    await writer.flush()
    expect(write).toHaveBeenCalledTimes(1)
  })

  it('ne réécrit pas une seconde fois après un flush', async () => {
    const write = vi.fn().mockResolvedValue(undefined)
    const writer = createWriter(write, 400)
    writer.schedule(emptyData())
    await writer.flush()
    await vi.advanceTimersByTimeAsync(1000)
    expect(write).toHaveBeenCalledTimes(1)
  })

  it('abandonne une écriture en attente', async () => {
    const write = vi.fn().mockResolvedValue(undefined)
    const writer = createWriter(write, 400)
    writer.schedule(emptyData())
    writer.cancel()
    await vi.advanceTimersByTimeAsync(1000)
    expect(write).not.toHaveBeenCalled()
  })

  it('ne fait rien quand il n’y a rien à vider', async () => {
    const write = vi.fn().mockResolvedValue(undefined)
    await createWriter(write, 400).flush()
    expect(write).not.toHaveBeenCalled()
  })

  it('sérialise deux écritures au lieu de les laisser se chevaucher', async () => {
    // La première écriture ne rend la main que quand on le décide : si la
    // seconde partait quand même, elle pourrait commettre avant la première.
    let release = (): void => {}
    const first = new Promise<void>((resolve) => {
      release = resolve
    })
    const write = vi.fn().mockReturnValueOnce(first).mockResolvedValue(undefined)
    const writer = createWriter(write, 400)

    writer.schedule(makeData({ household: { name: 'a', members: [] } }))
    await vi.advanceTimersByTimeAsync(400)
    expect(write).toHaveBeenCalledTimes(1)

    writer.schedule(makeData({ household: { name: 'b', members: [] } }))
    await vi.advanceTimersByTimeAsync(400)
    expect(write).toHaveBeenCalledTimes(1)

    release()
    await vi.advanceTimersByTimeAsync(0)
    expect(write).toHaveBeenCalledTimes(2)
  })

  it('attend toute la file, pas seulement la dernière écriture', async () => {
    const order: string[] = []
    let release = (): void => {}
    const first = new Promise<void>((resolve) => {
      release = resolve
    }).then(() => {
      order.push('première')
    })
    const write = vi
      .fn()
      .mockReturnValueOnce(first)
      .mockImplementation(() => {
        order.push('seconde')
        return Promise.resolve()
      })
    const writer = createWriter(write, 400)

    writer.schedule(emptyData())
    await vi.advanceTimersByTimeAsync(400)
    writer.schedule(emptyData())

    const flushed = writer.flush().then(() => {
      order.push('flush')
    })
    release()
    await vi.advanceTimersByTimeAsync(0)
    await flushed

    expect(order).toStrictEqual(['première', 'seconde', 'flush'])
  })

  /* La sortie de page demande « quelque chose n'a-t-il pas atteint le
     disque ? » — et la réponse doit rester vraie entre le moment où `flush()`
     consomme l'attente et celui où la transaction aboutit : c'est précisément
     dans cet interstice que la page meurt. */
  it('se dit sale de la programmation jusqu’à la fin de l’écriture', async () => {
    let release = (): void => {}
    const first = new Promise<void>((resolve) => {
      release = resolve
    })
    const write = vi.fn().mockReturnValueOnce(first).mockResolvedValue(undefined)
    const writer = createWriter(write, 400)

    expect(writer.dirty()).toBe(false)
    writer.schedule(emptyData())
    expect(writer.dirty()).toBe(true)

    const flushed = writer.flush()
    // L'attente est consommée, l'écriture court encore : toujours sale.
    expect(writer.dirty()).toBe(true)

    release()
    await flushed
    expect(writer.dirty()).toBe(false)
  })

  it('redevient propre quand on abandonne l’attente', () => {
    const write = vi.fn().mockResolvedValue(undefined)
    const writer = createWriter(write, 400)
    writer.schedule(emptyData())
    writer.cancel()
    expect(writer.dirty()).toBe(false)
  })

  it('rapporte l’échec au lieu de rejeter', async () => {
    const cause = new Error('quota dépassé')
    const write = vi.fn().mockRejectedValue(cause)
    const onFailed = vi.fn()
    const writer = createWriter(write, 400, { onFailed })

    writer.schedule(emptyData())
    await expect(writer.flush()).resolves.toBeUndefined()
    expect(onFailed).toHaveBeenCalledWith(cause)
  })

  it('n’empoisonne pas la file après un échec', async () => {
    // Une panne passagère — quota momentanément plein, base rouverte — ne doit
    // pas condamner toutes les écritures suivantes de la session.
    const write = vi
      .fn()
      .mockRejectedValueOnce(new Error('quota dépassé'))
      .mockResolvedValue(undefined)
    const onWritten = vi.fn()
    const writer = createWriter(write, 400, { onWritten })

    writer.schedule(emptyData())
    await writer.flush()
    expect(onWritten).not.toHaveBeenCalled()

    writer.schedule(emptyData())
    await writer.flush()
    expect(write).toHaveBeenCalledTimes(2)
    expect(onWritten).toHaveBeenCalledTimes(1)
  })
})
