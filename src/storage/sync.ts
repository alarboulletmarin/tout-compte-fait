import type { AppData } from '../domain/data'
import { SCHEMA_VERSION } from './schema'
import { buildExport, parseExport, type ExportFile } from './transfer'

/**
 * Synchronisation entre deux appareils, sans réseau : l'appareil « parent » montre un
 * code QR qui change toutes les fractions de seconde, l'appareil « enfant » le filme
 * et remplace ses données par celles du parent.
 *
 * Les données de l'export sont compressées (deflate), écrites en base 45 (le jeu de
 * caractères alphanumérique du QR, le plus dense) puis découpées en trames :
 *
 *   TCF1:<CRC-32 des octets compressés, en hexa>:<n° de trame>:<nb de trames>:<morceau>
 *
 * Le CRC identifie aussi la séance : deux trames de séances différentes ne se mélangent pas.
 * Les trames défilent en boucle ; le récepteur les accepte dans n'importe quel ordre.
 */

const PREFIX = 'TCF1'
/** Caractères de données par trame : garde le QR à une taille lisible par une caméra. */
export const CHUNK_SIZE = 260
/** Bornes contre un code hostile ou dégénéré. */
const MAX_FRAMES = 1000
const MAX_JSON_BYTES = 8 * 1024 * 1024

const FRAME = /^TCF1:([0-9A-F]{8}):(\d{1,4}):(\d{1,4}):([0-9A-Z $%*+\-./:]*)$/

/** Compression et décompression en flux : présentes dans tous les navigateurs récents. */
export const syncSupported = () =>
  typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined'

/** Toutes les trames à faire défiler pour envoyer ces données. */
export async function encodeFrames(data: AppData, now = new Date()): Promise<string[]> {
  const json = new TextEncoder().encode(JSON.stringify(buildExport(data, now)))
  const packed = await deflate(json)
  const session = crc32(packed).toString(16).toUpperCase().padStart(8, '0')
  const body = base45Encode(packed)
  const count = Math.ceil(body.length / CHUNK_SIZE)
  if (count > MAX_FRAMES) throw new Error('données trop volumineuses pour la synchronisation')
  return Array.from(
    { length: count },
    (_, i) =>
      `${PREFIX}:${session}:${i}:${count}:${body.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)}`,
  )
}

export type Received =
  | { kind: 'progress'; got: number; count: number; have: readonly boolean[] }
  | { kind: 'done'; file: ExportFile }
  /** Trame étrangère à l'app : ignorée sans bruit. */
  | { kind: 'ignored' }
  /** Séance complète mais illisible, corrompue ou écrite par une version plus récente. */
  | { kind: 'failed'; reason: 'invalid' | 'newer' }

/** Rassemble les trames d'une séance ; recommence à zéro si l'autre appareil relance un envoi. */
export class Receiver {
  private session = ''
  private chunks: (string | undefined)[] = []
  private got = 0
  private finished = false

  async accept(text: string): Promise<Received> {
    const match = FRAME.exec(text)
    if (!match) return { kind: 'ignored' }
    const [, session = '', indexText = '', countText = '', chunk = ''] = match
    const index = Number(indexText)
    const count = Number(countText)
    if (count < 1 || count > MAX_FRAMES || index >= count) return { kind: 'ignored' }

    if (session !== this.session || count !== this.chunks.length) {
      this.session = session
      this.chunks = new Array<string | undefined>(count).fill(undefined)
      this.got = 0
      this.finished = false
    }
    if (this.finished) return { kind: 'ignored' }
    if (this.chunks[index] === undefined) {
      this.chunks[index] = chunk
      this.got++
    }
    if (this.got < count) return this.progress()

    // Une séance rejetée reste rejetée : le récepteur ne se relit pas en boucle
    this.finished = true
    return this.assemble()
  }

  private progress(): Received {
    return {
      kind: 'progress',
      got: this.got,
      count: this.chunks.length,
      have: this.chunks.map((c) => c !== undefined),
    }
  }

  private async assemble(): Promise<Received> {
    try {
      const packed = base45Decode(this.chunks.join(''))
      if (crc32(packed).toString(16).toUpperCase().padStart(8, '0') !== this.session) {
        return { kind: 'failed', reason: 'invalid' }
      }
      const text = new TextDecoder('utf-8', { fatal: true }).decode(await inflate(packed))
      const version = (JSON.parse(text) as { schemaVersion?: unknown } | null)?.schemaVersion
      if (typeof version === 'number' && version > SCHEMA_VERSION) {
        return { kind: 'failed', reason: 'newer' }
      }
      const result = parseExport(text)
      return result.ok ? { kind: 'done', file: result.file } : { kind: 'failed', reason: 'invalid' }
    } catch {
      return { kind: 'failed', reason: 'invalid' }
    }
  }
}

// ---------- Compression ----------

async function deflate(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  return collect(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw')))
}

async function inflate(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  return collect(
    new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')),
    MAX_JSON_BYTES,
  )
}

async function collect(
  stream: ReadableStream<Uint8Array>,
  max = Infinity,
): Promise<Uint8Array<ArrayBuffer>> {
  const parts: Uint8Array[] = []
  let size = 0
  // Lecteur explicite : `for await` sur un ReadableStream manque à des Safari/WebKit encore courants
  const reader = stream.getReader()
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > max) throw new Error('données décompressées trop volumineuses')
      parts.push(value)
    }
  } finally {
    // Libère le flux (et l'annule si on sort sur erreur)
    await reader.cancel().catch(() => undefined)
  }
  const out = new Uint8Array(size)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

// ---------- Base 45 (RFC 9285) ----------

const B45 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:'

export function base45Encode(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 2) {
    const high = bytes[i] ?? 0
    if (i + 1 < bytes.length) {
      const n = high * 256 + (bytes[i + 1] ?? 0)
      out += char(n % 45) + char(Math.floor(n / 45) % 45) + char(Math.floor(n / 2025))
    } else {
      out += char(high % 45) + char(Math.floor(high / 45))
    }
  }
  return out
}

const char = (digit: number) => B45.charAt(digit)

export function base45Decode(text: string): Uint8Array<ArrayBuffer> {
  if (text.length % 3 === 1) throw new Error('base 45 : longueur invalide')
  const out: number[] = []
  for (let i = 0; i < text.length; i += 3) {
    const digits = [...text.slice(i, i + 3)].map((c) => B45.indexOf(c))
    if (digits.includes(-1)) throw new Error('base 45 : caractère invalide')
    const [c = 0, d = 0, e] = digits
    if (e !== undefined) {
      const n = c + d * 45 + e * 2025
      if (n > 0xffff) throw new Error('base 45 : valeur hors limites')
      out.push(n >> 8, n & 0xff)
    } else {
      const n = c + d * 45
      if (n > 0xff) throw new Error('base 45 : valeur hors limites')
      out.push(n)
    }
  }
  return Uint8Array.from(out)
}

// ---------- CRC-32 ----------

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (const b of bytes) c = (CRC_TABLE[(c ^ b) & 0xff] ?? 0) ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
