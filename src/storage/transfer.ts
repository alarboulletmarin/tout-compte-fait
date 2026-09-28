import type { AppData } from '../domain/data'
import { InvalidDataError, migrate, record, SCHEMA_VERSION, validateData } from './schema'

export const APP_ID = 'tout-compte-fait'

export interface ExportFile {
  app: typeof APP_ID
  schemaVersion: number
  exportedAt: string
  data: AppData
}

export type ParseResult = { ok: true; file: ExportFile } | { ok: false; reason: string }

export function serializeExport(data: AppData, now = new Date()): string {
  const file: ExportFile = {
    app: APP_ID,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    data,
  }
  return JSON.stringify(file, null, 2)
}

/** toutcomptefait-2026-09-28.json, à la date locale. */
export function exportFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `toutcomptefait-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`
}

/**
 * Lit et valide un fichier exporté, sans rien écrire. Le fichier rendu est
 * migré vers la version courante ; `reason` sert au débogage, pas à l'écran.
 */
export function parseExport(text: string): ParseResult {
  try {
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      throw new InvalidDataError('JSON illisible')
    }
    const file = record(json, 'fichier', ['app', 'schemaVersion', 'exportedAt', 'data'])
    if (file.app !== APP_ID) throw new InvalidDataError(`app inattendue : ${String(file.app)}`)
    if (typeof file.exportedAt !== 'string' || Number.isNaN(Date.parse(file.exportedAt))) {
      throw new InvalidDataError('exportedAt : date invalide')
    }
    const data = validateData(migrate(file.data, file.schemaVersion as number))
    return {
      ok: true,
      file: { app: APP_ID, schemaVersion: SCHEMA_VERSION, exportedAt: file.exportedAt, data },
    }
  } catch (error) {
    if (error instanceof InvalidDataError) return { ok: false, reason: error.message }
    throw error
  }
}
