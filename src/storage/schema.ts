import type { AppData, History, Snapshot } from '../domain/data'
import { MONTH_KEY } from '../domain/history'
import {
  MAX_MEMBERS,
  MIN_MEMBERS,
  memberAccount,
  type AccountRef,
  type Category,
  type Charge,
  type Frequency,
  type Member,
} from '../domain/types'

/** Les clés du contenu d'un mois ; les données courantes y ajoutent `history`. */
const CONTENT_KEYS = ['household', 'charges', 'categories'] as const

/** Version du format des données, stockées comme exportées. */
export const SCHEMA_VERSION = 3

/**
 * Migrations des données : MIGRATIONS[n] passe de la version n à n + 1.
 * S'appliquent aussi bien à la base locale qu'aux fichiers importés.
 */
const MIGRATIONS: Record<number, (data: unknown) => unknown> = { 1: v1ToV2, 2: v2ToV3 }

/**
 * v1 : exactement 2 membres sans id, comptes « member1 » / « member2 ».
 * v2 : N membres avec id, comptes « m:<id> ». Ne valide que ce qu'elle transforme,
 * validateData rejette le reste.
 */
function v1ToV2(input: unknown): unknown {
  const data = record(input, 'data', CONTENT_KEYS)
  const household = record(data.household, 'household', ['members'])
  const members = list(household.members, 'household.members')
  if (members.length !== 2) fail('household.members', 'exactement 2 membres attendus')
  const ids = ['member1', 'member2']
  const accounts: Record<string, string> = {
    joint: 'joint',
    member1: 'm:member1',
    member2: 'm:member2',
  }
  return {
    ...data,
    household: {
      members: members.map((m, i) => {
        return { id: ids[i], ...record(m, `household.members[${i}]`, ['name', 'income']) }
      }),
    },
    charges: list(data.charges, 'charges').map((c, i) => {
      const where = `charges[${i}]`
      if (!isObject(c)) fail(where, 'objet attendu')
      const from = c.paidFrom
      if (typeof from !== 'string' || !Object.hasOwn(accounts, from)) {
        fail(`${where}.paidFrom`, `valeur inconnue ${JSON.stringify(from)}`)
      }
      return { ...c, paidFrom: accounts[from] }
    }),
  }
}

/** v3 : l'historique mois par mois, vide au départ. */
function v2ToV3(input: unknown): unknown {
  return { ...record(input, 'data', CONTENT_KEYS), history: {} }
}

export class InvalidDataError extends Error {}

export function migrate(data: unknown, fromVersion: number): unknown {
  if (!Number.isInteger(fromVersion) || fromVersion < 1 || fromVersion > SCHEMA_VERSION) {
    throw new InvalidDataError(`schemaVersion non prise en charge : ${fromVersion}`)
  }
  for (let v = fromVersion; v < SCHEMA_VERSION; v++) {
    const step = MIGRATIONS[v]
    if (!step) throw new Error(`migration ${v} → ${v + 1} manquante`)
    data = step(data)
  }
  return data
}

const FREQUENCIES: readonly Frequency[] = ['monthly', 'quarterly', 'yearly']
/** Validation stricte : la moindre anomalie rejette tout. */
export function validateData(input: unknown): AppData {
  const data = record(input, 'data', [...CONTENT_KEYS, 'history'])
  return { ...validateContent(data, ''), history: validateHistory(data.history) }
}

/** Chaque instantané suit les mêmes règles que les données courantes, avec son propre foyer. */
function validateHistory(input: unknown): History {
  if (!isObject(input)) fail('history', 'objet attendu')
  const history: History = {}
  for (const [key, value] of Object.entries(input)) {
    if (!MONTH_KEY.test(key)) fail('history', `clé de mois invalide « ${key} »`)
    history[key] = validateSnapshot(value, `history[${key}]`)
  }
  return history
}

function validateSnapshot(input: unknown, where: string): Snapshot {
  if (!isObject(input)) fail(where, 'objet attendu')
  const { carried, ...rest } = input
  if (carried !== undefined && carried !== true) fail(`${where}.carried`, 'true attendu')
  const content = validateContent(record(rest, where, CONTENT_KEYS), `${where}.`)
  return carried ? { ...content, carried } : content
}

/** Foyer, charges et catégories : le contenu d'un mois, courant ou figé. `at` préfixe les chemins d'erreur. */
function validateContent(data: Record<string, unknown>, at: string) {
  const household = record(data.household, `${at}household`, ['members'])
  const rawMembers = list(household.members, `${at}household.members`)
  if (rawMembers.length < MIN_MEMBERS || rawMembers.length > MAX_MEMBERS) {
    fail(`${at}household.members`, `${MIN_MEMBERS} à ${MAX_MEMBERS} membres attendus`)
  }
  const members = rawMembers.map((m, i) => member(m, `${at}household.members[${i}]`))
  unique(members, `${at}household.members`)
  const accounts = new Set<string>(['joint', ...members.map((m) => memberAccount(m.id))])

  const categories = list(data.categories, `${at}categories`).map((c, i) =>
    category(c, `${at}categories[${i}]`),
  )
  unique(categories, `${at}categories`)
  const categoryIds = new Set(categories.map((c) => c.id))

  const charges = list(data.charges, `${at}charges`).map((c, i) => {
    const where = `${at}charges[${i}]`
    const ch = charge(c, where)
    if (!accounts.has(ch.paidFrom)) fail(`${where}.paidFrom`, `compte inconnu « ${ch.paidFrom} »`)
    if (ch.categoryId !== null && !categoryIds.has(ch.categoryId)) {
      fail(`${where}.categoryId`, `catégorie inconnue « ${ch.categoryId} »`)
    }
    return ch
  })
  unique(charges, `${at}charges`)

  return { household: { members }, charges, categories }
}

function member(input: unknown, where: string): Member {
  const m = record(input, where, ['id', 'name', 'income'])
  const income = m.income === null ? null : cents(m.income, `${where}.income`, 0)
  return { id: text(m.id, `${where}.id`), name: text(m.name, `${where}.name`, true), income }
}

function category(input: unknown, where: string): Category {
  const c = record(input, where, ['id', 'name'])
  return { id: text(c.id, `${where}.id`), name: text(c.name, `${where}.name`) }
}

function charge(input: unknown, where: string): Charge {
  const c = record(input, where, ['id', 'label', 'amount', 'frequency', 'paidFrom', 'categoryId'])
  return {
    id: text(c.id, `${where}.id`),
    label: text(c.label, `${where}.label`),
    amount: cents(c.amount, `${where}.amount`, 1),
    frequency: oneOf(c.frequency, FREQUENCIES, `${where}.frequency`),
    // Le compte doit exister : vérifié par validateData, qui connaît les membres
    paidFrom: text(c.paidFrom, `${where}.paidFrom`) as AccountRef,
    categoryId: c.categoryId === null ? null : text(c.categoryId, `${where}.categoryId`),
  }
}

/** Objet simple avec exactement ces clés, ni plus ni moins. */
export function record(input: unknown, where: string, keys: readonly string[]) {
  if (!isObject(input)) fail(where, 'objet attendu')
  const actual = Object.keys(input)
  const extra = actual.filter((k) => !keys.includes(k))
  const missing = keys.filter((k) => !actual.includes(k))
  if (extra.length) fail(where, `clés inattendues : ${extra.join(', ')}`)
  if (missing.length) fail(where, `clés manquantes : ${missing.join(', ')}`)
  return input
}

function isObject(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input)
}

function list(input: unknown, where: string): unknown[] {
  if (!Array.isArray(input)) fail(where, 'liste attendue')
  return input
}

function text(input: unknown, where: string, allowEmpty = false): string {
  if (typeof input !== 'string') fail(where, 'texte attendu')
  if (!allowEmpty && input.trim() === '') fail(where, 'texte vide')
  return input
}

function cents(input: unknown, where: string, min: number): number {
  if (typeof input !== 'number' || !Number.isSafeInteger(input) || input < min) {
    fail(where, `centimes entiers ≥ ${min} attendus`)
  }
  return input
}

function oneOf<T extends string>(input: unknown, values: readonly T[], where: string): T {
  if (!values.includes(input as T)) fail(where, `valeur inconnue ${JSON.stringify(input)}`)
  return input as T
}

function unique(items: readonly { id: string }[], where: string): void {
  const ids = new Set(items.map((i) => i.id))
  if (ids.size !== items.length) fail(where, 'identifiants en double')
}

function fail(where: string, why: string): never {
  throw new InvalidDataError(`${where} : ${why}`)
}
