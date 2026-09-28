import type { AppData } from '../domain/data'
import type { AccountRef, Category, Charge, Frequency, Member } from '../domain/types'

/** Version du format des données, stockées comme exportées. */
export const SCHEMA_VERSION = 1

/**
 * Migrations des données : MIGRATIONS[n] passe de la version n à n + 1.
 * S'appliquent aussi bien à la base locale qu'aux fichiers importés.
 */
const MIGRATIONS: Record<number, (data: unknown) => unknown> = {}

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
const ACCOUNTS: readonly AccountRef[] = ['joint', 'member1', 'member2']

/** Validation stricte : la moindre anomalie rejette tout. */
export function validateData(input: unknown): AppData {
  const data = record(input, 'data', ['household', 'charges', 'categories'])

  const household = record(data.household, 'household', ['members'])
  const members = list(household.members, 'household.members')
  if (members.length !== 2) fail('household.members', 'exactement 2 membres attendus')
  const [m1, m2] = members.map((m, i) => member(m, `household.members[${i}]`)) as [Member, Member]

  const categories = list(data.categories, 'categories').map((c, i) =>
    category(c, `categories[${i}]`),
  )
  unique(categories, 'categories')
  const categoryIds = new Set(categories.map((c) => c.id))

  const charges = list(data.charges, 'charges').map((c, i) => {
    const where = `charges[${i}]`
    const ch = charge(c, where)
    if (ch.categoryId !== null && !categoryIds.has(ch.categoryId)) {
      fail(`${where}.categoryId`, `catégorie inconnue « ${ch.categoryId} »`)
    }
    return ch
  })
  unique(charges, 'charges')

  return { household: { members: [m1, m2] }, charges, categories }
}

function member(input: unknown, where: string): Member {
  const m = record(input, where, ['name', 'income'])
  const income = m.income === null ? null : cents(m.income, `${where}.income`, 0)
  return { name: text(m.name, `${where}.name`, true), income }
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
    paidFrom: oneOf(c.paidFrom, ACCOUNTS, `${where}.paidFrom`),
    categoryId: c.categoryId === null ? null : text(c.categoryId, `${where}.categoryId`),
  }
}

/** Objet simple avec exactement ces clés, ni plus ni moins. */
export function record(input: unknown, where: string, keys: readonly string[]) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    fail(where, 'objet attendu')
  }
  const actual = Object.keys(input)
  const extra = actual.filter((k) => !keys.includes(k))
  const missing = keys.filter((k) => !actual.includes(k))
  if (extra.length) fail(where, `clés inattendues : ${extra.join(', ')}`)
  if (missing.length) fail(where, `clés manquantes : ${missing.join(', ')}`)
  return input as Record<string, unknown>
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
