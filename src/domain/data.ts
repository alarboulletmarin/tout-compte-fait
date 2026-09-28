import type { Category, Charge, Household } from './types'

/** Tout ce que l'app garde sur l'appareil. */
export interface AppData {
  household: Household
  charges: Charge[]
  categories: Category[]
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

export function initialData(names?: Record<string, string>): AppData {
  return {
    household: {
      members: [
        { name: '', income: null },
        { name: '', income: null },
      ],
    },
    charges: [],
    categories: DEFAULT_CATEGORIES.map((c) => ({ id: c.id, name: names?.[c.id] ?? c.name })),
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
