import type { Category, Charge, Household } from './types'

/** Tout ce que l'app garde sur l'appareil. */
export interface AppData {
  household: Household
  charges: Charge[]
  categories: Category[]
}

// ponytail: noms en français ; la traduction des catégories par défaut viendra avec l'anglais (phase 6)
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

export function initialData(): AppData {
  return {
    household: {
      members: [
        { name: '', income: null },
        { name: '', income: null },
      ],
    },
    charges: [],
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
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
