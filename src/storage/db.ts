import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { AppData } from '../domain/data'
import { migrate, SCHEMA_VERSION, validateData } from './schema'
import { parseExport, type ParseResult } from './transfer'

// Un seul document : les données tiennent en quelques Ko, et un import les remplace d'un bloc.
// La version de la base ne change que si la structure des magasins change ;
// l'évolution des données passe par schemaVersion et les migrations de schema.ts.
// Le nom est celui de l'ancienne app, restée en version 2 (magasins « document » et « backups ») :
// ouvrir une version plus basse échoue (VersionError), donc on passe à 3 et on ne crée que « app ».
// Ses données restent intactes, on n'y touche pas.
const DB_NAME = 'tout-compte-fait'
const DB_VERSION = 3
const KEY = 'data'

interface Stored {
  schemaVersion: number
  data: unknown
}

interface Schema extends DBSchema {
  app: { key: string; value: Stored }
}

let db: Promise<IDBPDatabase<Schema>> | undefined

function open() {
  db ??= openDB<Schema>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('app')) database.createObjectStore('app')
    },
  })
  return db
}

/** null au premier lancement. Lève une erreur si la base est illisible. */
export async function loadData(): Promise<AppData | null> {
  const stored = await (await open()).get('app', KEY)
  if (!stored) return null
  const data = validateData(migrate(stored.data, stored.schemaVersion))
  if (stored.schemaVersion < SCHEMA_VERSION) await saveData(data)
  return data
}

export async function saveData(data: AppData): Promise<void> {
  await (await open()).put('app', { schemaVersion: SCHEMA_VERSION, data: validateData(data) }, KEY)
}

export async function clearAll(): Promise<void> {
  await (await open()).clear('app')
}

/** Remplace les données par celles du fichier, ou ne touche à rien s'il est invalide. */
export async function importFromText(text: string): Promise<ParseResult> {
  const result = parseExport(text)
  if (result.ok) await saveData(result.file.data)
  return result
}
