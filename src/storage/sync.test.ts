import jsQR from 'jsqr'
import { describe, expect, it } from 'vitest'
import { qrImages, type QrImage } from '../ui/qr'
import type { AppData } from '../domain/data'
import { carryForward, recordMonth } from '../domain/history'
import { sample } from './fixtures'
import { SCHEMA_VERSION } from './schema'
import {
  base45Decode,
  base45Encode,
  CHUNK_SIZE,
  crc32,
  encodeFrames,
  Receiver,
  type Received,
} from './sync'

const bytes = (text: string) => new TextEncoder().encode(text)

/** Résultat final : celui de la dernière trame, ou la fin de séance si elle est déjà arrivée. */
async function feed(receiver: Receiver, frames: readonly string[]): Promise<Received> {
  let last: Received = { kind: 'ignored' }
  for (const frame of frames) {
    const result = await receiver.accept(frame)
    if (result.kind === 'done' || result.kind === 'failed') return result
    last = result
  }
  return last
}

/** Six personnes, quarante charges et un an d'historique : le pire cas courant. */
function big(): AppData {
  const members = Array.from({ length: 6 }, (_, i) => ({
    id: crypto.randomUUID(),
    name: `Personne ${i + 1}`,
    income: 180000 + i * 23100,
  }))
  const categories = Array.from({ length: 8 }, (_, i) => ({ id: `c${i}`, name: `Catégorie ${i}` }))
  const charges = Array.from({ length: 40 }, (_, i) => ({
    id: crypto.randomUUID(),
    label: `Charge numéro ${i + 1}`,
    amount: 1500 + i * 3719,
    frequency: (['monthly', 'quarterly', 'yearly'] as const)[i % 3]!,
    paidFrom: i % 4 === 0 ? ('joint' as const) : (`m:${members[i % 6]!.id}` as const),
    categoryId: i % 5 === 0 ? null : `c${i % 8}`,
  }))
  let data: AppData = { household: { members }, categories, charges, history: {} }
  for (let m = 1; m <= 12; m++) {
    const month = `2025-${String(m).padStart(2, '0')}`
    // Un peu de variation d'un mois à l'autre, comme dans la vraie vie
    data = recordMonth(
      {
        ...data,
        charges: data.charges.map((c, i) => (i % 7 === m % 7 ? { ...c, amount: c.amount + m } : c)),
      },
      month,
    )
  }
  return carryForward(data, '2026-01')
}

describe('base 45', () => {
  it('reprend les exemples de la RFC 9285', () => {
    expect(base45Encode(bytes('AB'))).toBe('BB8')
    expect(base45Encode(bytes('Hello!!'))).toBe('%69 VD92EX0')
    expect(base45Encode(bytes('base-45'))).toBe('UJCLQE7W581')
    expect(base45Encode(bytes('ietf!'))).toBe('QED8WEX0')
    expect(new TextDecoder().decode(base45Decode('QED8WEX0'))).toBe('ietf!')
  })

  it('se relit à l’identique, longueur paire ou impaire', () => {
    for (const length of [0, 1, 2, 3, 100, 101]) {
      const data = Uint8Array.from({ length }, (_, i) => (i * 37 + 11) % 256)
      expect(base45Decode(base45Encode(data))).toEqual(data)
    }
  })

  it('rejette caractère inconnu, longueur impossible et valeur hors limites', () => {
    expect(() => base45Decode('bb8')).toThrow()
    expect(() => base45Decode('A')).toThrow()
    expect(() => base45Decode(':::')).toThrow()
    expect(() => base45Decode('GGW')).toThrow()
  })
})

describe('crc32', () => {
  it('donne la valeur de référence', () => {
    expect(crc32(bytes('123456789')).toString(16)).toBe('cbf43926')
  })
})

describe('trames', () => {
  it('découpent en trames de taille bornée, numérotées de 0 à n − 1', async () => {
    const frames = await encodeFrames(sample())
    expect(frames.length).toBeGreaterThan(0)
    frames.forEach((frame, i) => {
      expect(frame).toMatch(new RegExp(`^TCF1:[0-9A-F]{8}:${i}:${frames.length}:`))
      expect(frame.split(':').slice(4).join(':').length).toBeLessThanOrEqual(CHUNK_SIZE)
    })
  })

  it('redonnent les données, dans l’ordre', async () => {
    const result = await feed(new Receiver(), await encodeFrames(sample()))
    expect(result).toMatchObject({ kind: 'done', file: { schemaVersion: SCHEMA_VERSION } })
    if (result.kind === 'done') expect(result.file.data).toEqual(sample())
  })

  it('acceptent l’ordre inverse, les doublons et un départ en cours de boucle', async () => {
    const frames = await encodeFrames(big())
    const shuffled = [...frames.slice(2), ...frames, ...frames.slice(0, 1)].reverse()
    const result = await feed(new Receiver(), shuffled)
    expect(result.kind).toBe('done')
  })

  it('comptent la progression sans compter deux fois une trame', async () => {
    const frames = await encodeFrames(sample())
    expect(frames.length).toBeGreaterThan(1)
    const receiver = new Receiver()
    await receiver.accept(frames[1]!)
    const again = await receiver.accept(frames[1]!)
    expect(again).toMatchObject({ kind: 'progress', got: 1, count: frames.length })
    if (again.kind === 'progress') expect(again.have[1]).toBe(true)
  })

  it('repartent de zéro quand l’autre appareil relance avec d’autres données', async () => {
    const other = sample()
    other.household.members[0]!.name = 'Autre'
    const first = await encodeFrames(sample())
    const second = await encodeFrames(other)
    const receiver = new Receiver()
    await receiver.accept(first[0]!)
    const result = await feed(receiver, second)
    expect(result.kind).toBe('done')
    if (result.kind === 'done') expect(result.file.data.household.members[0]!.name).toBe('Autre')
  })

  it('ignorent tout ce qui n’est pas une trame', async () => {
    const receiver = new Receiver()
    for (const text of ['https://example.org', '', 'TCF1:zz:0:1:AB', 'TCF1:00000000:3:2:AB']) {
      expect(await receiver.accept(text)).toEqual({ kind: 'ignored' })
    }
    expect(await receiver.accept('TCF1:00000000:0:5000:AB')).toEqual({ kind: 'ignored' })
  })

  it('refusent une séance dont un morceau est altéré', async () => {
    const frames = await encodeFrames(sample())
    const last = frames.length - 1
    const damaged = frames.map((f, i) =>
      i === last ? f.slice(0, -1) + (f.endsWith('A') ? 'B' : 'A') : f,
    )
    expect(await feed(new Receiver(), damaged)).toEqual({ kind: 'failed', reason: 'invalid' })
  })

  it('refusent des données qui ne sont pas un export valide', async () => {
    const data = sample()
    data.charges[0]!.amount = -5
    expect(await feed(new Receiver(), await encodeFrames(data))).toEqual({
      kind: 'failed',
      reason: 'invalid',
    })
  })

  it('n’exigent pas l’itération asynchrone des flux, absente de certains Safari', async () => {
    const proto = ReadableStream.prototype
    const original = Object.getOwnPropertyDescriptor(proto, Symbol.asyncIterator)
    Reflect.deleteProperty(proto, Symbol.asyncIterator)
    try {
      const result = await feed(new Receiver(), await encodeFrames(sample()))
      expect(result.kind).toBe('done')
    } finally {
      if (original) Object.defineProperty(proto, Symbol.asyncIterator, original)
    }
  })

  it('signalent une version plus récente de l’app', async () => {
    const frames = await encodeFrames(sample())
    // Même enveloppe, schemaVersion plus grande : refabriquée à la main
    const { deflateRaw, crcOf } = await tools()
    const json = JSON.stringify({
      app: 'tout-compte-fait',
      schemaVersion: SCHEMA_VERSION + 1,
      exportedAt: new Date().toISOString(),
      data: {},
    })
    const packed = await deflateRaw(bytes(json))
    const body = base45Encode(packed)
    const forged = [`TCF1:${crcOf(packed)}:0:1:${body}`]
    expect(frames.length).toBeGreaterThan(0)
    expect(await feed(new Receiver(), forged)).toEqual({ kind: 'failed', reason: 'newer' })
  })
})

async function tools() {
  return {
    deflateRaw: async (input: Uint8Array<ArrayBuffer>) =>
      new Uint8Array(
        await new Response(
          new Blob([input]).stream().pipeThrough(new CompressionStream('deflate-raw')),
        ).arrayBuffer(),
      ),
    crcOf: (input: Uint8Array) => crc32(input).toString(16).toUpperCase().padStart(8, '0'),
  }
}

/** Rend le QR en pixels, comme le ferait un écran filmé, pour le relire avec jsQR. */
function rasterize(image: QrImage, scale: number): ImageData {
  const side = image.size * scale
  const pixels = new Uint8ClampedArray(side * side * 4).fill(255)
  // Le tracé n'est fait que de « M x y h w v1 h -w z » : on le relit tel quel
  for (const [, x, y, w] of image.path.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
    for (let py = Number(y) * scale; py < (Number(y) + 1) * scale; py++) {
      for (let px = Number(x) * scale; px < (Number(x) + Number(w)) * scale; px++) {
        pixels.fill(0, (py * side + px) * 4, (py * side + px) * 4 + 3)
      }
    }
  }
  return { data: pixels, width: side, height: side, colorSpace: 'srgb' } as ImageData
}

describe('codes QR', () => {
  it('se relisent avec un vrai décodeur, trame par trame, jusqu’aux données', async () => {
    const frames = await encodeFrames(sample())
    const images = qrImages(frames)
    expect(new Set(images.map((i) => i.size)).size).toBe(1)
    const receiver = new Receiver()
    let result: Received = { kind: 'ignored' }
    for (const [i, image] of images.entries()) {
      const { data, width, height } = rasterize(image, 4)
      const code = jsQR(data, width, height)
      expect(code?.data).toBe(frames[i])
      result = await receiver.accept(code!.data)
    }
    expect(result.kind).toBe('done')
  })

  it('restent lisibles pour un foyer de six avec quarante charges et un an d’historique', async () => {
    const data = big()
    const frames = await encodeFrames(data)
    const images = qrImages(frames)
    expect(images[0]!.size - 8).toBeLessThanOrEqual(69)
    expect(frames.length).toBeLessThanOrEqual(120)
    const result = await feed(new Receiver(), frames)
    expect(result).toMatchObject({ kind: 'done' })
    if (result.kind === 'done') expect(result.file.data).toEqual(data)
  })
})
