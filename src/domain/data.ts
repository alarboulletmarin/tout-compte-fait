import { MAX_MEMBERS, MIN_MEMBERS, memberAccount } from './types'
import type { Category, Charge, Household, Member } from './types'

/** Ce qui définit un mois : le foyer, les charges et les catégories tels qu'ils étaient. */
export interface Snapshot {
  household: Household
  charges: Charge[]
  categories: Category[]
  /** Mois reconduit du précédent : l'app n'a pas été ouverte ce mois-là. */
  carried?: true
}

/** Un instantané par mois, clé « AAAA-MM ». */
export type History = Record<string, Snapshot>

/** Tout ce que l'app garde sur l'appareil. */
export interface AppData {
  household: Household
  charges: Charge[]
  categories: Category[]
  history: History
}

/** Catégories par défaut ; les noms affichés viennent de la langue au premier lancement. */
export const DEFAULT_CATEGORIES: readonly Category[] = [
  { id: 'housing', name: 'Logement' },
  { id: 'energy', name: 'Énergie' },
  { id: 'water', name: 'Eau' },
  { id: 'telecom', name: 'Internet & téléphone' },
  { id: 'insurance', name: 'Assurances' },
  { id: 'subscriptions', name: 'Abonnements' },
  { id: 'transport', name: 'Transport' },
  { id: 'misc', name: 'Divers' },
]

export const newMember = (): Member => ({ id: crypto.randomUUID(), name: '', income: null })

export function initialData(names?: Record<string, string>): AppData {
  return {
    household: { members: [newMember(), newMember()] },
    charges: [],
    categories: DEFAULT_CATEGORIES.map((c) => ({ id: c.id, name: names?.[c.id] ?? c.name })),
    history: {},
  }
}

/** Supprime la catégorie ; ses charges passent en « Sans catégorie ». */
export function deleteCategory(data: AppData, id: string): AppData {
  return {
    ...data,
    categories: data.categories.filter((c) => c.id !== id),
    charges: data.charges.map((c) => (c.categoryId === id ? { ...c, categoryId: null } : c)),
  }
}

/** Retire le membre ; les charges de son compte passent au joint. Refuse de descendre sous le minimum. */
export function removeMember(data: AppData, id: string): AppData {
  const { members } = data.household
  if (members.length <= MIN_MEMBERS || !members.some((m) => m.id === id)) {
    throw new RangeError(`removeMember : ${id} ne peut pas être retiré`)
  }
  const account = memberAccount(id)
  return {
    ...data,
    household: { members: members.filter((m) => m.id !== id) },
    charges: data.charges.map((c) => (c.paidFrom === account ? { ...c, paidFrom: 'joint' } : c)),
  }
}

/** Annule removeMember : le membre revient à sa place, avec ses charges (`chargeIds`). */
export function restoreMember(
  data: AppData,
  member: Member,
  index: number,
  chargeIds: ReadonlySet<string>,
): AppData {
  const { members } = data.household
  // Plein ou déjà revenu : rien à restaurer
  if (members.length >= MAX_MEMBERS || members.some((m) => m.id === member.id)) return data
  const account = memberAccount(member.id)
  return {
    ...data,
    household: { members: [...members.slice(0, index), member, ...members.slice(index)] },
    charges: data.charges.map((c) => (chargeIds.has(c.id) ? { ...c, paidFrom: account } : c)),
  }
}
